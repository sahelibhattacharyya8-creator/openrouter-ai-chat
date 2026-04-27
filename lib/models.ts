export const CHAT_MODELS = [
  {
    id: "openai/gpt-oss-120b:free",
    label: "GPT OSS 120B",
    maker: "OpenAI",
    tone: "High-reasoning open model",
  },
  {
    id: "google/gemma-4-31b-it:free",
    label: "Gemma 4 31B IT",
    maker: "Google",
    tone: "Instruction-tuned general chat",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "Nemotron 3 Super 120B",
    maker: "NVIDIA",
    tone: "Large open reasoning model",
  },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export const DEFAULT_CHAT_MODEL: ChatModelId = CHAT_MODELS[0].id;

export function isChatModelId(model: string): model is ChatModelId {
  return CHAT_MODELS.some((item) => item.id === model);
}
