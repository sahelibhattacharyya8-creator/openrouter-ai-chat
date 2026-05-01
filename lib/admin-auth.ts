import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import {
  createAdminAccount,
  getAdminAccountById,
  getAdminAccountByUsername,
} from "@/lib/db";

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

export async function ensureConfiguredAdminAccount() {
  const credentials = getAdminCredentials();

  if (!credentials.username || !credentials.password) {
    return null;
  }

  const existingAdmin = await getAdminAccountByUsername(credentials.username);

  if (existingAdmin) {
    return existingAdmin;
  }

  const passwordHash = await hash(credentials.password, 12);

  return createAdminAccount({
    username: credentials.username,
    name: "Primary admin",
    passwordHash,
  });
}

export async function validateAdminLogin(username: string, password: string) {
  await ensureConfiguredAdminAccount();
  const admin = await getAdminAccountByUsername(username);

  if (!admin) {
    return null;
  }

  const passwordMatches = await compare(password, admin.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  return {
    id: admin.id,
    username: admin.username,
    name: admin.name,
    createdAt: admin.createdAt,
  };
}

export async function createAdminSession(admin: { id: string; username: string }) {
  const token = await new SignJWT({ role: "admin", username: admin.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
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

    return await getAdminAccountById(payload.sub);
  } catch {
    return null;
  }
}
