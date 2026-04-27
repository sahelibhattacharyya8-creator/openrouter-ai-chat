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

export type ConversationSummary = {
  conversationId: string;
  title: string;
  updatedAt: string;
};

export type StoredChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  model: string;
  createdAt: string;
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

    await sql`
      CREATE TABLE IF NOT EXISTS conversation_titles (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id TEXT NOT NULL,
        title TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, conversation_id)
      )
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

export async function getConversationSummaries(userId: string) {
  if (!sql) {
    return [];
  }

  await ensureSchema();

  const rows = await sql`
    WITH latest_messages AS (
      SELECT DISTINCT ON (conversation_id)
        conversation_id,
        content,
        created_at
      FROM chat_messages
      WHERE user_id = ${userId}
      ORDER BY conversation_id, created_at DESC
    )
    SELECT
      latest_messages.conversation_id AS "conversationId",
      COALESCE(conversation_titles.title, LEFT(latest_messages.content, 80)) AS title,
      GREATEST(
        latest_messages.created_at,
        COALESCE(conversation_titles.updated_at, latest_messages.created_at)
      ) AS "updatedAt"
    FROM latest_messages
    LEFT JOIN conversation_titles
      ON conversation_titles.user_id = ${userId}
      AND conversation_titles.conversation_id = latest_messages.conversation_id
  `;

  return (rows as ConversationSummary[]).sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getConversationMessages({
  userId,
  conversationId,
}: {
  userId: string;
  conversationId: string;
}) {
  if (!sql) {
    return [];
  }

  await ensureSchema();

  const rows = await sql`
    SELECT id, role, content, model, created_at AS "createdAt"
    FROM chat_messages
    WHERE user_id = ${userId}
      AND conversation_id = ${conversationId}
    ORDER BY created_at ASC, id ASC
  `;

  return rows as StoredChatMessage[];
}

export async function renameConversation({
  userId,
  conversationId,
  title,
}: {
  userId: string;
  conversationId: string;
  title: string;
}) {
  if (!sql) {
    return null;
  }

  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return null;
  }

  await ensureSchema();

  const existingRows = await sql`
    SELECT 1
    FROM chat_messages
    WHERE user_id = ${userId}
      AND conversation_id = ${conversationId}
    LIMIT 1
  `;

  if (!existingRows.length) {
    return null;
  }

  const rows = await sql`
    INSERT INTO conversation_titles (user_id, conversation_id, title, updated_at)
    VALUES (${userId}, ${conversationId}, ${trimmedTitle}, NOW())
    ON CONFLICT (user_id, conversation_id)
    DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()
    RETURNING conversation_id AS "conversationId", title, updated_at AS "updatedAt"
  `;

  return rows[0] as ConversationSummary;
}

export async function deleteConversation({
  userId,
  conversationId,
}: {
  userId: string;
  conversationId: string;
}) {
  if (!sql) {
    return 0;
  }

  await ensureSchema();

  await sql`
    DELETE FROM conversation_titles
    WHERE user_id = ${userId}
      AND conversation_id = ${conversationId}
  `;

  const rows = await sql`
    DELETE FROM chat_messages
    WHERE user_id = ${userId}
      AND conversation_id = ${conversationId}
    RETURNING id
  `;

  return rows.length;
}
