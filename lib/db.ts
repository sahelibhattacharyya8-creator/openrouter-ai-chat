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
  emailVerified: boolean;
};

export type UserWithPassword = User & { passwordHash: string };

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

export type PaymentStatus = "created" | "paid" | "failed";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: string;
};

export type AdminPayment = {
  id: number;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  provider: string;
  plan: string;
  providerOrderId: string;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
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
        email_verified_at TIMESTAMPTZ,
        email_verification_token_hash TEXT,
        email_verification_expires_at TIMESTAMPTZ,
        password_reset_token_hash TEXT,
        password_reset_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ
    `;

    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT
    `;

    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ
    `;

    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT
    `;

    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ
    `;

    await sql`
      UPDATE users
      SET email_verified_at = created_at
      WHERE email_verified_at IS NULL
        AND email_verification_token_hash IS NULL
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

    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        plan TEXT NOT NULL,
        provider_order_id TEXT NOT NULL UNIQUE,
        provider_payment_id TEXT,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  verificationTokenHash,
}: {
  email: string;
  name?: string;
  passwordHash: string;
  verificationTokenHash: string;
}) {
  if (!sql) {
    throw new Error("Database is not configured.");
  }

  await ensureSchema();

  const id = crypto.randomUUID();
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await sql`
    INSERT INTO users (
      id,
      email,
      name,
      password_hash,
      email_verification_token_hash,
      email_verification_expires_at
    )
    VALUES (
      ${id},
      ${normalizedEmail},
      ${name?.trim() || null},
      ${passwordHash},
      ${verificationTokenHash},
      NOW() + INTERVAL '24 hours'
    )
    RETURNING
      id,
      email,
      name,
      email_verified_at IS NOT NULL AS "emailVerified"
  `;

  return rows[0] as User;
}

export async function setEmailVerificationToken({
  userId,
  verificationTokenHash,
}: {
  userId: string;
  verificationTokenHash: string;
}) {
  if (!sql) {
    return null;
  }

  await ensureSchema();

  const rows = await sql`
    UPDATE users
    SET
      email_verification_token_hash = ${verificationTokenHash},
      email_verification_expires_at = NOW() + INTERVAL '24 hours'
    WHERE id = ${userId}
    RETURNING id, email, name, email_verified_at IS NOT NULL AS "emailVerified"
  `;

  return (rows[0] as User | undefined) ?? null;
}

export async function verifyUserEmail(verificationTokenHash: string) {
  if (!sql) {
    return null;
  }

  await ensureSchema();

  const rows = await sql`
    UPDATE users
    SET
      email_verified_at = NOW(),
      email_verification_token_hash = NULL,
      email_verification_expires_at = NULL
    WHERE email_verification_token_hash = ${verificationTokenHash}
      AND email_verification_expires_at > NOW()
    RETURNING id, email, name, TRUE AS "emailVerified"
  `;

  return (rows[0] as User | undefined) ?? null;
}

export async function setPasswordResetToken({
  userId,
  resetTokenHash,
}: {
  userId: string;
  resetTokenHash: string;
}) {
  if (!sql) {
    return null;
  }

  await ensureSchema();

  const rows = await sql`
    UPDATE users
    SET
      password_reset_token_hash = ${resetTokenHash},
      password_reset_expires_at = NOW() + INTERVAL '1 hour'
    WHERE id = ${userId}
    RETURNING id, email, name, email_verified_at IS NOT NULL AS "emailVerified"
  `;

  return (rows[0] as User | undefined) ?? null;
}

export async function resetPasswordByToken({
  resetTokenHash,
  passwordHash,
}: {
  resetTokenHash: string;
  passwordHash: string;
}) {
  if (!sql) {
    return null;
  }

  await ensureSchema();

  const rows = await sql`
    UPDATE users
    SET
      password_hash = ${passwordHash},
      password_reset_token_hash = NULL,
      password_reset_expires_at = NULL
    WHERE password_reset_token_hash = ${resetTokenHash}
      AND password_reset_expires_at > NOW()
    RETURNING id, email, name, email_verified_at IS NOT NULL AS "emailVerified"
  `;

  return (rows[0] as User | undefined) ?? null;
}

export async function getUserByEmail(email: string) {
  if (!sql) {
    return null;
  }

  await ensureSchema();

  const rows = await sql`
    SELECT
      id,
      email,
      name,
      password_hash AS "passwordHash",
      email_verified_at IS NOT NULL AS "emailVerified"
    FROM users
    WHERE email = ${email.trim().toLowerCase()}
    LIMIT 1
  `;

  return (rows[0] as UserWithPassword | undefined) ?? null;
}

export async function getUserById(id: string) {
  if (!sql) {
    return null;
  }

  await ensureSchema();

  const rows = await sql`
    SELECT id, email, name, email_verified_at IS NOT NULL AS "emailVerified"
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

export async function createPaymentRecord({
  userId,
  plan,
  providerOrderId,
  amount,
  currency,
  status,
}: {
  userId: string;
  plan: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}) {
  if (!sql) {
    return null;
  }

  await ensureSchema();

  const rows = await sql`
    INSERT INTO payments (
      user_id,
      provider,
      plan,
      provider_order_id,
      amount,
      currency,
      status
    )
    VALUES (
      ${userId},
      'razorpay',
      ${plan},
      ${providerOrderId},
      ${amount},
      ${currency},
      ${status}
    )
    ON CONFLICT (provider_order_id)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      plan = EXCLUDED.plan,
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING id
  `;

  return rows[0] as { id: number };
}

export async function updatePaymentRecord({
  providerOrderId,
  providerPaymentId,
  status,
}: {
  providerOrderId: string;
  providerPaymentId?: string;
  status: PaymentStatus;
}) {
  if (!sql) {
    return null;
  }

  await ensureSchema();

  const rows = await sql`
    UPDATE payments
    SET
      provider_payment_id = ${providerPaymentId ?? null},
      status = ${status},
      updated_at = NOW()
    WHERE provider_order_id = ${providerOrderId}
    RETURNING id, plan, status, amount, currency
  `;

  return (
    (rows[0] as
      | {
          id: number;
          plan: string;
          status: string;
          amount: number;
          currency: string;
        }
      | undefined) ?? null
  );
}

export async function getAdminUsers() {
  if (!sql) {
    return [];
  }

  await ensureSchema();

  const rows = await sql`
    SELECT
      id,
      email,
      name,
      email_verified_at IS NOT NULL AS "emailVerified",
      created_at AS "createdAt"
    FROM users
    ORDER BY created_at DESC
  `;

  return rows as AdminUser[];
}

export async function getAdminPayments() {
  if (!sql) {
    return [];
  }

  await ensureSchema();

  const rows = await sql`
    SELECT
      payments.id,
      payments.user_id AS "userId",
      users.email AS "userEmail",
      users.name AS "userName",
      payments.provider,
      payments.plan,
      payments.provider_order_id AS "providerOrderId",
      payments.provider_payment_id AS "providerPaymentId",
      payments.amount,
      payments.currency,
      payments.status,
      payments.created_at AS "createdAt",
      payments.updated_at AS "updatedAt"
    FROM payments
    LEFT JOIN users ON users.id = payments.user_id
    ORDER BY payments.created_at DESC
  `;

  return rows as AdminPayment[];
}
