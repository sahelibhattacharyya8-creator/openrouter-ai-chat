import { createHmac, timingSafeEqual } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { updatePaymentRecord } from "@/lib/db";
import { sendPaymentSuccessEmail } from "@/lib/email-verification";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Please login first." }, { status: 401 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    return Response.json(
      { error: "Missing Razorpay secret key." },
      { status: 500 },
    );
  }

  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = (await req.json()) as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  if (!orderId || !paymentId || !signature) {
    return Response.json(
      { error: "Missing Razorpay payment details." },
      { status: 400 },
    );
  }

  const expectedSignature = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const isValid =
    expectedSignature.length === signature.length &&
    timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

  if (!isValid) {
    await updatePaymentRecord({
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      status: "failed",
    });

    return Response.json(
      { error: "Payment verification failed." },
      { status: 400 },
    );
  }

  const payment = await updatePaymentRecord({
    providerOrderId: orderId,
    providerPaymentId: paymentId,
    status: "paid",
  });

  if (payment) {
    try {
      await sendPaymentSuccessEmail({
        user,
        plan: payment.plan,
        amount: payment.amount,
        currency: payment.currency,
        paymentId,
      });
    } catch (error) {
      console.error("Failed to send payment success email", error);
    }
  }

  return Response.json({ ok: true, payment });
}
