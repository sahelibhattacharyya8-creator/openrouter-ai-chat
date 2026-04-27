import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { saveChatMessage } from "@/lib/db";
import { DEFAULT_CHAT_MODEL, isChatModelId } from "@/lib/models";

export const maxDuration = 60;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer":
      process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_APP_NAME ?? "OpenRouter AI Chat",
  },
});

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json(
      { error: "Missing OPENROUTER_API_KEY in your environment." },
      { status: 500 },
    );
  }

  const {
    messages,
    chatId,
    model = DEFAULT_CHAT_MODEL,
  }: {
    messages: UIMessage[];
    chatId?: string;
    model?: string;
  } = await req.json();

  const modelId = isChatModelId(model) ? model : DEFAULT_CHAT_MODEL;
  const conversationId = chatId || crypto.randomUUID();
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const latestUserText =
    latestUserMessage?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim() ?? "";

  await saveChatMessage({
    conversationId,
    role: "user",
    content: latestUserText,
    model: modelId,
  });

  const result = streamText({
    model: openrouter.chat(modelId),
    system:
      "You are a clear, practical AI chat assistant. Be concise when the user asks simple questions and thorough when the work is complex.",
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      await saveChatMessage({
        conversationId,
        role: "assistant",
        content: text,
        model: modelId,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
