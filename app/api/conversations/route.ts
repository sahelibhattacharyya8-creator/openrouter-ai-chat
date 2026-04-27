import { getCurrentUser } from "@/lib/auth";
import {
  deleteConversation,
  getConversationMessages,
  getConversationSummaries,
  renameConversation,
} from "@/lib/db";

export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ conversations: [], messages: [] });
  }

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");

  if (conversationId) {
    const messages = await getConversationMessages({
      userId: user.id,
      conversationId,
    });

    return Response.json({ messages });
  }

  const conversations = await getConversationSummaries(user.id);

  return Response.json({ conversations });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, title } = (await req.json()) as {
    conversationId?: string;
    title?: string;
  };

  if (!conversationId || !title?.trim()) {
    return Response.json(
      { error: "Conversation id and title are required." },
      { status: 400 },
    );
  }

  const conversation = await renameConversation({
    userId: user.id,
    conversationId,
    title,
  });

  if (!conversation) {
    return Response.json(
      { error: "Conversation was not found." },
      { status: 404 },
    );
  }

  return Response.json({ conversation });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");

  if (!conversationId) {
    return Response.json(
      { error: "Conversation id is required." },
      { status: 400 },
    );
  }

  await deleteConversation({
    userId: user.id,
    conversationId,
  });

  return Response.json({ ok: true });
}
