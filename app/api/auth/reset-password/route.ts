import { hash } from "bcryptjs";
import { createSession } from "@/lib/auth";
import { isDatabaseConfigured, resetPasswordByToken } from "@/lib/db";
import { hashVerificationToken } from "@/lib/email-verification";

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { token, password } = await req.json();

  if (!token || !password) {
    return Response.json(
      { error: "Reset token and password are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const tokenHash = await hashVerificationToken(token);
  const passwordHash = await hash(password, 12);
  const user = await resetPasswordByToken({ resetTokenHash: tokenHash, passwordHash });

  if (!user) {
    return Response.json(
      { error: "Password reset link is invalid or expired." },
      { status: 400 },
    );
  }

  await createSession(user);

  return Response.json({ user });
}
