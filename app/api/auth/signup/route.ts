import { hash } from "bcryptjs";
import { createUser, isDatabaseConfigured } from "@/lib/db";
import {
  createVerificationToken,
  createVerificationUrl,
  hashVerificationToken,
  sendVerificationEmail,
} from "@/lib/email-verification";

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { email, name, password } = await req.json();

  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const verificationToken = createVerificationToken();
    const verificationTokenHash =
      await hashVerificationToken(verificationToken);
    const passwordHash = await hash(password, 12);
    const user = await createUser({
      email,
      name,
      passwordHash,
      verificationTokenHash,
    });

    await sendVerificationEmail({
      user,
      verificationUrl: createVerificationUrl(verificationToken),
    });

    return Response.json({
      message: "Check your email to verify your account before logging in.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("duplicate")
    ) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    return Response.json(
      { error: "Could not create your account." },
      { status: 500 },
    );
  }
}
