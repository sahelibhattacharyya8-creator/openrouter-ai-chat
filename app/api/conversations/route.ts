import { getCurrentUser } from "@/lib/auth";
import {
  getConversationMessages,
  getConversationSummaries,
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
