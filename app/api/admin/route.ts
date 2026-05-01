import { getCurrentUser } from "@/lib/auth";
import { getAdminPayments, getAdminUsers, isDatabaseConfigured } from "@/lib/db";

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET() {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Please login first." }, { status: 401 });
  }

  const adminEmails = getAdminEmails();

  if (!adminEmails.includes(user.email.toLowerCase())) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  const [users, payments] = await Promise.all([
    getAdminUsers(),
    getAdminPayments(),
  ]);

  return Response.json({ users, payments });
}
