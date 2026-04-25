"use client";

import { useMemo, useState } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { LoaderCircle, Send, Square } from "lucide-react";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { ModelSelector } from "@/components/model-selector";
import { CHAT_MODELS, DEFAULT_CHAT_MODEL, type ChatModelId } from "@/lib/models";

const suggestions = [
  "Compare these two models for coding help.",
  "Draft a weekly planning ritual for a small team.",
  "Explain streaming AI responses in plain English.",
];

export default function Page() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<ChatModelId>(DEFAULT_CHAT_MODEL);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { model },
      }),
    [model],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const activeModel = CHAT_MODELS.find((item) => item.id === model);

  function submitMessage(text = input) {
    const trimmed = text.trim();

    if (!trimmed || isBusy) {
      return;
    }

    sendMessage({
      parts: [{ type: "text", text: trimmed }],
    });
    setInput("");
  }

  return (
    <main className="flex h-dvh flex-col">
      <header className="border-b border-[var(--border)] bg-[rgba(255,253,248,0.78)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-normal">
              OpenRouter AI Chat
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {activeModel?.maker} · {activeModel?.tone}
            </p>
          </div>
          <ModelSelector disabled={isBusy} value={model} onChange={setModel} />
        </div>
      </header>

      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <section className="flex flex-1 flex-col justify-center py-10">
              <div className="max-w-2xl">
                <p className="text-sm font-medium uppercase text-[var(--accent)]">
                  Streaming chat
                </p>
                <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
                  Ask, compare, draft, debug, and keep the thread moving.
                </h2>
              </div>
              <div className="mt-8 grid gap-2 sm:grid-cols-3">
                {suggestions.map((suggestion) => (
                  <button
                    className="rounded-[8px] border border-[var(--border)] bg-[var(--panel)] p-3 text-left text-sm leading-6 shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--panel-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isBusy}
                    key={suggestion}
                    onClick={() => submitMessage(suggestion)}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) => {
                    if (part.type !== "text") {
                      return null;
                    }

                    return (
                      <MessageResponse key={`${message.id}-${index}`}>
                        {part.text}
                      </MessageResponse>
                    );
                  })}
                </MessageContent>
              </Message>
            ))
          )}

          {isBusy ? (
            <div className="flex items-center gap-2 px-1 text-sm text-[var(--muted)]">
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              Streaming from {activeModel?.label}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error.message}
            </div>
          ) : null}
        </ConversationContent>
      </Conversation>

      <footer className="border-t border-[var(--border)] bg-[rgba(247,245,239,0.82)] px-4 py-4 backdrop-blur sm:px-6">
        <PromptInput
          onSubmit={(event) => {
            event.preventDefault();
            submitMessage();
          }}
        >
          <PromptInputTextarea
            disabled={isBusy}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitMessage();
              }
            }}
            placeholder="Send a message..."
            value={input}
          />
          <PromptInputFooter>
            <p className="text-xs text-[var(--muted)]">
              Shift Enter for a new line.
            </p>
            {isBusy ? (
              <button
                aria-label="Stop response"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[6px] bg-[var(--foreground)] text-white transition hover:opacity-90"
                onClick={stop}
                title="Stop response"
                type="button"
              >
                <Square aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : (
              <button
                aria-label="Send message"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[6px] bg-[var(--primary)] text-[var(--primary-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!input.trim()}
                title="Send message"
                type="submit"
              >
                <Send aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </PromptInputFooter>
        </PromptInput>
      </footer>
    </main>
  );
}
