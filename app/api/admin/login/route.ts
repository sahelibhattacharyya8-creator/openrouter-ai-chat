import {
  createAdminSession,
  getAdminCredentials,
  validateAdminLogin,
} from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { username, password } = await req.json();
  const credentials = getAdminCredentials();

  if (!credentials.username || !credentials.password) {
    return Response.json(
      { error: "Admin credentials are not configured." },
      { status: 500 },
    );
  }

  const admin = await validateAdminLogin(username, password);

  if (!admin) {
    return Response.json(
      { error: "Invalid admin username or password." },
      { status: 401 },
    );
  }

  await createAdminSession(admin);

  return Response.json({ admin });
}
