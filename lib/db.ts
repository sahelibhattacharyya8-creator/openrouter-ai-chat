import { neon } from "@neondatabase/serverless";

type ChatMessageInput = {
  userId?: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  model: string;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
};

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;

let schemaPromise: Promise<void> | null = null;

async function ensureSchema() {
  if (!sql) {
    return;
  }

  schemaPromise ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      ALTER TABLE chat_messages
      ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL
    `;
  })();

  await schemaPromise;
}

export function isDatabaseConfigured() {
  return Boolean(sql);
}

export async function createUser({
  email,
  name,
  passwordHash,
}: {
  email: string;
  name?: string;
  passwordHash: string;
}) {
  if (!sql) {
    throw new Error("Database is not configured.");
  }

  await ensureSchema();

  const id = crypto.randomUUID();
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await sql`
    INSERT INTO users (id, email, name, password_hash)
    VALUES (${id}, ${normalizedEmail}, ${name?.trim() || null}, ${passwordHash})
    RETURNING id, email, name
  `;

  return rows[0] as User;
}

export async function getUserByEmail(email: string) {
  if (!sql) {
    return null;
  }

  await ensureSchema();

  const rows = await sql`
    SELECT id, email, name, password_hash AS "passwordHash"
    FROM users
    WHERE email = ${email.trim().toLowerCase()}
    LIMIT 1
  `;

  return (
    (rows[0] as (User & { passwordHash: string }) | undefined) ?? null
  );
}

export async function getUserById(id: string) {
  if (!sql) {
    return null;
  }

  await ensureSchema();

  const rows = await sql`
    SELECT id, email, name
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;

  return (rows[0] as User | undefined) ?? null;
}

export async function saveChatMessage(message: ChatMessageInput) {
  if (!sql || !message.content.trim()) {
    return;
  }

  try {
    await ensureSchema();
    await sql`
      INSERT INTO chat_messages (user_id, conversation_id, role, content, model)
      VALUES (
        ${message.userId ?? null},
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
