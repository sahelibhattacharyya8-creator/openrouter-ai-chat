import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { getUserById, type User } from "@/lib/db";

const sessionCookie = "openrouter_chat_session";

function getSecret() {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.OPENROUTER_API_KEY ??
    process.env.DATABASE_URL;

  if (!secret) {
    throw new Error("Set AUTH_SECRET in your environment.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(user: User) {
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  const cookieStore = await cookies();

  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookie);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub;

    if (!userId) {
      return null;
    }

    return await getUserById(userId);
  } catch {
    return null;
  }
}
