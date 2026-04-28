import type { User } from "@/lib/db";

const verificationPath = "/api/auth/verify-email";

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

export async function sendVerificationEmail({
  user,
  verificationUrl,
}: {
  user: User;
  verificationUrl: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "OpenRouter AI Chat <onboarding@resend.dev>";

  if (!resendApiKey) {
    console.warn("RESEND_API_KEY is missing. Verification link:", verificationUrl);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: user.email,
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
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Could not send verification email. ${message}`);
  }
}
