import { createSession } from "@/lib/auth";
import { verifyUserEmail } from "@/lib/db";
import { hashVerificationToken } from "@/lib/email-verification";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const redirectUrl = new URL("/", url.origin);

  if (!token) {
    redirectUrl.searchParams.set("verified", "missing");
    return Response.redirect(redirectUrl);
  }

  const tokenHash = await hashVerificationToken(token);
  const user = await verifyUserEmail(tokenHash);

  if (!user) {
    redirectUrl.searchParams.set("verified", "invalid");
    return Response.redirect(redirectUrl);
  }

  await createSession(user);
  redirectUrl.searchParams.set("verified", "success");
  return Response.redirect(redirectUrl);
}
