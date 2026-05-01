import { hash } from "bcryptjs";
import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  createAdminAccount,
  getAdminAccounts,
  getAdminAccountByUsername,
  getAdminPayments,
  getAdminUsers,
  isDatabaseConfigured,
} from "@/lib/db";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  const [users, payments, admins] = await Promise.all([
    getAdminUsers(),
    getAdminPayments(),
    getAdminAccounts(),
  ]);

  return Response.json({ admin, users, payments, admins });
}

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  const { username, name, password } = await req.json();

  if (!username || !password) {
    return Response.json(
      { error: "Admin username and password are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return Response.json(
      { error: "Admin password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const existingAdmin = await getAdminAccountByUsername(username);

  if (existingAdmin) {
    return Response.json(
      { error: "An admin with this username already exists." },
      { status: 409 },
    );
  }

  try {
    const passwordHash = await hash(password, 12);
    const admin = await createAdminAccount({ username, name, passwordHash });

    return Response.json({ admin }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Could not create admin user." },
      { status: 500 },
    );
  }
}
