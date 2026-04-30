import type { User } from "@/lib/db";
import nodemailer from "nodemailer";

const verificationPath = "/api/auth/verify-email";
const passwordResetPath = "/";

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.OPENROUTER_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function toBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

export function createVerificationToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function hashVerificationToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );

  return toBase64Url(new Uint8Array(digest));
}

export function createVerificationUrl(token: string) {
  const url = new URL(verificationPath, getAppUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

export function createPasswordResetUrl(token: string) {
  const url = new URL(passwordResetPath, getAppUrl());
  url.searchParams.set("resetToken", token);
  return url.toString();
}

async function sendAuthEmail({
  user,
  subject,
  html,
  text,
}: {
  user: User;
  subject: string;
  html: string;
  text: string;
}) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const from =
    process.env.EMAIL_FROM ??
    (gmailUser ? `OpenRouter AI Chat <${gmailUser}>` : undefined);

  if (!gmailUser || !gmailAppPassword) {
    console.warn(
      "GMAIL_USER or GMAIL_APP_PASSWORD is missing. Email text:",
      text,
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  try {
    await transporter.sendMail({
      from: from ?? gmailUser,
      to: user.email,
      subject,
      html,
      text,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not send auth email with Gmail from ${gmailUser}. ${detail}`,
    );
  }
}

export async function sendVerificationEmail({
  user,
  verificationUrl,
}: {
  user: User;
  verificationUrl: string;
}) {
  await sendAuthEmail({
    user,
    subject: "Verify your OpenRouter AI Chat account",
    html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#211927">
          <h1 style="font-size:22px">Verify your email</h1>
          <p>Hi ${user.name || "there"},</p>
          <p>Click the button below to verify your OpenRouter AI Chat account.</p>
          <p>
            <a href="${verificationUrl}" style="display:inline-block;background:#c21872;color:white;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">
              Verify email
            </a>
          </p>
          <p>This link expires in 24 hours.</p>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        </div>
      `,
    text: `Verify your OpenRouter AI Chat account: ${verificationUrl}`,
  });
}

export async function sendPasswordResetEmail({
  user,
  resetUrl,
}: {
  user: User;
  resetUrl: string;
}) {
  await sendAuthEmail({
    user,
    subject: "Reset your OpenRouter AI Chat password",
    html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#211927">
          <h1 style="font-size:22px">Reset your password</h1>
          <p>Hi ${user.name || "there"},</p>
          <p>Click the button below to set a new OpenRouter AI Chat password.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;background:#c21872;color:white;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">
              Reset password
            </a>
          </p>
          <p>This link expires in 1 hour.</p>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
        </div>
      `,
    text: `Reset your OpenRouter AI Chat password: ${resetUrl}`,
  });
}
