import { getCurrentAdmin } from "@/lib/admin-auth";
import { getAdminPayments, getAdminUsers, isDatabaseConfigured } from "@/lib/db";

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

  const [users, payments] = await Promise.all([
    getAdminUsers(),
    getAdminPayments(),
  ]);

  return Response.json({ admin, users, payments });
}
