import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const adminCookie = "openrouter_admin_session";

function getSecret() {
  const secret =
    process.env.ADMIN_AUTH_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.DATABASE_URL;

  if (!secret) {
    throw new Error("Set ADMIN_AUTH_SECRET or AUTH_SECRET in your environment.");
  }

  return new TextEncoder().encode(secret);
}

export function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  };
}

export async function createAdminSession(username: string) {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(adminCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(adminCookie);
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookie)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());

    if (payload.role !== "admin" || !payload.sub) {
      return null;
    }

    return { username: payload.sub };
  } catch {
    return null;
  }
}
