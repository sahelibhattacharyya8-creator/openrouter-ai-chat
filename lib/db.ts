import { neon } from "@neondatabase/serverless";

type ChatMessageInput = {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  model: string;
};

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;

let schemaPromise: Promise<void> | null = null;

async function ensureSchema() {
  if (!sql) {
    return;
  }

  schemaPromise ??= sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.then(() => undefined);

  await schemaPromise;
}

export async function saveChatMessage(message: ChatMessageInput) {
  if (!sql || !message.content.trim()) {
    return;
  }

  try {
    await ensureSchema();
    await sql`
      INSERT INTO chat_messages (conversation_id, role, content, model)
      VALUES (
        ${message.conversationId},
        ${message.role},
        ${message.content},
        ${message.model}
      )
    `;
  } catch (error) {
    console.error("Failed to save chat message", error);
  }
}
