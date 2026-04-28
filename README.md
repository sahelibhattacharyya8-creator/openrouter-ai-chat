# OpenRouter AI Chat

A streaming AI chat app built with Next.js, AI SDK, AI Elements-style components, and OpenRouter.

## Models

- `openai/gpt-oss-120b:free`
- `google/gemma-4-31b-it:free`

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
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PRICE_PRO=price_your_pro_price_id
STRIPE_PRICE_TEAM=price_your_team_price_id
```

Open [http://localhost:3000](http://localhost:3000).

`DATABASE_URL` is optional for local development. When it is present, chat messages are saved to a `chat_messages` table that the app creates automatically.
`AUTH_SECRET` signs login sessions. Use a long random value in production.

## Scripts

```bash
npm run lint
npm run build
```
