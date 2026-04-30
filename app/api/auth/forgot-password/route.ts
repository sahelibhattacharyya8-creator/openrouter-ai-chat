import { getUserByEmail, isDatabaseConfigured, setPasswordResetToken } from "@/lib/db";
import {
  createPasswordResetUrl,
  createVerificationToken,
  hashVerificationToken,
  sendPasswordResetEmail,
} from "@/lib/email-verification";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { email } = await req.json();

  if (!email) {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }

  const genericMessage =
    "If an account exists for that email, a reset link has been sent.";
  const user = await getUserByEmail(email);

  if (!user) {
    return Response.json({ message: genericMessage });
  }

  const resetToken = createVerificationToken();
  const resetTokenHash = await hashVerificationToken(resetToken);
  const updatedUser =
    (await setPasswordResetToken({
      userId: user.id,
      resetTokenHash,
    })) ?? user;

  try {
    await sendPasswordResetEmail({
      user: updatedUser,
      resetUrl: createPasswordResetUrl(resetToken),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Could not send password reset email. ${detail}` },
      { status: 502 },
    );
  }

  return Response.json({ message: genericMessage });
}
