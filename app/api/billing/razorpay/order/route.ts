import Razorpay from "razorpay";
import { getCurrentUser } from "@/lib/auth";
import { createPaymentRecord, isDatabaseConfigured } from "@/lib/db";

const planAmounts = {
  pro: Number(process.env.RAZORPAY_PRO_AMOUNT ?? 49900),
} as const;

const currency = process.env.RAZORPAY_CURRENCY ?? "INR";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Please login first." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: "Database is required before accepting payments." },
      { status: 500 },
    );
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return Response.json(
      { error: "Missing Razorpay test keys." },
      { status: 500 },
    );
  }

  const { plan } = (await req.json()) as { plan?: keyof typeof planAmounts };

  if (!plan || !planAmounts[plan]) {
    return Response.json({ error: "Invalid billing plan." }, { status: 400 });
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  const amount = planAmounts[plan];
  const receipt = `openrouter-${plan}-${Date.now()}`;
  const order = await razorpay.orders.create({
    amount,
    currency,
    receipt,
    notes: {
      userId: user.id,
      plan,
    },
  });

  await createPaymentRecord({
    userId: user.id,
    plan,
    providerOrderId: order.id,
    amount,
    currency,
    status: "created",
  });

  return Response.json({
    orderId: order.id,
    amount,
    currency,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? keyId,
    name: user.name ?? "OpenRouter AI Chat",
    email: user.email,
    plan,
  });
}
