import { compare, hash } from "bcryptjs";
import {
  createUser,
  getUserByEmail,
  isDatabaseConfigured,
  setEmailVerificationToken,
  type User,
} from "@/lib/db";
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

  async function sendVerification(user: User) {
    const verificationToken = createVerificationToken();
    const verificationTokenHash =
      await hashVerificationToken(verificationToken);
    const updatedUser =
      (await setEmailVerificationToken({
        userId: user.id,
        verificationTokenHash,
      })) ?? user;

    await sendVerificationEmail({
      user: updatedUser,
      verificationUrl: createVerificationUrl(verificationToken),
    });
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
    const existingUser = await getUserByEmail(email);

    if (existingUser && !existingUser.emailVerified) {
      const passwordMatches = await compare(password, existingUser.passwordHash);

      if (!passwordMatches) {
        return Response.json(
          { error: "An account with this email already exists." },
          { status: 409 },
        );
      }

      try {
        await sendVerification(existingUser);

        return Response.json({
          message: "We sent a new verification email. Check your inbox.",
        });
      } catch (sendError) {
        const detail =
          sendError instanceof Error
            ? sendError.message
            : "Could not send verification email.";

        return Response.json(
          {
            error:
              "Account exists, but the verification email could not be sent. " +
              detail,
          },
          { status: 502 },
        );
      }
    }

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
