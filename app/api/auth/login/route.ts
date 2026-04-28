import { compare } from "bcryptjs";
import { createSession } from "@/lib/auth";
import { getUserByEmail } from "@/lib/db";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const user = await getUserByEmail(email);

  if (!user) {
    return Response.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const passwordMatches = await compare(password, user.passwordHash);

  if (!passwordMatches) {
    return Response.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  if (!user.emailVerified) {
    return Response.json(
      { error: "Please verify your email before logging in." },
      { status: 403 },
    );
  }

  await createSession(user);

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}
