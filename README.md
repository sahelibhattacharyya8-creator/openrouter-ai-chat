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
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run lint
npm run build
```
