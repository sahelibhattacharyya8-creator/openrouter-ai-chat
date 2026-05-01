import {
  createAdminSession,
  getAdminCredentials,
} from "@/lib/admin-auth";

export async function POST(req: Request) {
  const { username, password } = await req.json();
  const credentials = getAdminCredentials();

  if (!credentials.username || !credentials.password) {
    return Response.json(
      { error: "Admin credentials are not configured." },
      { status: 500 },
    );
  }

  if (
    username !== credentials.username ||
    password !== credentials.password
  ) {
    return Response.json(
      { error: "Invalid admin username or password." },
      { status: 401 },
    );
  }

  await createAdminSession(username);

  return Response.json({ admin: { username } });
}
