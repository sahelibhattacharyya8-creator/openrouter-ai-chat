import Stripe from "stripe";
import { getCurrentUser } from "@/lib/auth";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const planPriceEnv = {
  pro: "STRIPE_PRICE_PRO",
  team: "STRIPE_PRICE_TEAM",
} as const;

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Please login first." }, { status: 401 });
  }

  if (!stripeSecretKey) {
    return Response.json(
      { error: "Missing STRIPE_SECRET_KEY." },
      { status: 500 },
    );
  }

  const { plan } = (await req.json()) as {
    plan?: keyof typeof planPriceEnv;
  };

  if (!plan || !planPriceEnv[plan]) {
    return Response.json({ error: "Invalid billing plan." }, { status: 400 });
  }

  const priceId = process.env[planPriceEnv[plan]];

  if (!priceId) {
    return Response.json(
      { error: `Missing ${planPriceEnv[plan]}.` },
      { status: 500 },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.OPENROUTER_SITE_URL ??
    new URL(req.url).origin;
  const stripe = new Stripe(stripeSecretKey);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      plan,
    },
    success_url: `${origin}?checkout=success`,
    cancel_url: `${origin}?checkout=cancelled`,
  });

  return Response.json({ url: session.url });
}
