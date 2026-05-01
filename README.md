# OpenRouter AI Chat

A streaming AI chat app built with Next.js, AI SDK, AI Elements-style components, and OpenRouter.

## Models

- `openai/gpt-oss-120b:free`
- `google/gemma-4-31b-it:free`
- `nvidia/nemotron-3-super-120b-a12b:free`

## Local Setup

```bash
npm install
npm run dev
```

Create `.env.local` with:

```env
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=OpenRouter AI Chat
DATABASE_URL=your_neon_postgres_url
AUTH_SECRET=replace-with-a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-admin-password
ADMIN_AUTH_SECRET=replace-with-a-long-random-admin-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
GMAIL_USER=your-gmail-address@gmail.com
GMAIL_APP_PASSWORD=your-16-character-gmail-app-password
EMAIL_FROM=OpenRouter AI Chat <your-gmail-address@gmail.com>
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_PRO_AMOUNT=49900
RAZORPAY_CURRENCY=INR
```

Open [http://localhost:3000](http://localhost:3000).

`DATABASE_URL` is optional for local development. When it is present, chat messages are saved to a `chat_messages` table that the app creates automatically.
`AUTH_SECRET` signs login sessions. Use a long random value in production.
`ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_AUTH_SECRET` protect the separate `/admin` console. These admin credentials are separate from customer accounts.
`GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `EMAIL_FROM` send signup verification emails through Gmail SMTP. Use a Gmail App Password, not your normal Gmail password.
Razorpay should be configured with test-mode keys while you are trying sandbox payments. `RAZORPAY_PRO_AMOUNT` is in paise, so `49900` means ₹499.

## Scripts

```bash
npm run lint
npm run build
```
