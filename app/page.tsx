"use client";

import { useEffect, useMemo, useState } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { LoaderCircle, LogOut, Send, Square, UserRound } from "lucide-react";
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

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export default function Page() {
  const [chatId] = useState(() => crypto.randomUUID());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<ChatModelId>(DEFAULT_CHAT_MODEL);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { chatId, model },
      }),
    [chatId, model],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const activeModel = CHAT_MODELS.find((item) => item.id === model);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        setUser(data.user);
      } finally {
        setIsAuthLoading(false);
      }
    }

    loadUser();
  }, []);

  function submitMessage(text = input) {
    const trimmed = text.trim();

    if (!trimmed || isBusy || !user) {
      return;
    }

    sendMessage({
      parts: [{ type: "text", text: trimmed }],
    });
    setInput("");
  }

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setIsAuthLoading(true);

    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          name: authName,
          password: authPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error ?? "Authentication failed.");
        return;
      }

      setUser(data.user);
      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
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
              {activeModel?.maker} - {activeModel?.tone}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {user ? (
              <div className="flex min-w-0 items-center gap-2 rounded-[6px] border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 text-sm">
                <UserRound aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="max-w-48 truncate">
                  {user.name || user.email}
                </span>
                <button
                  aria-label="Sign out"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] transition hover:bg-black/10"
                  onClick={logout}
                  title="Sign out"
                  type="button"
                >
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <ModelSelector disabled={isBusy} value={model} onChange={setModel} />
          </div>
        </div>
      </header>

      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <section className="flex flex-1 flex-col justify-center py-10">
              <div className="max-w-2xl">
                <p className="text-sm font-medium uppercase text-[var(--accent)]">
                  {user ? "Streaming chat" : "Private chat"}
                </p>
                <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
                  {user
                    ? "Ask, compare, draft, debug, and keep the thread moving."
                    : "Sign in to chat and save your conversations."}
                </h2>
              </div>
              {user ? (
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
              ) : (
                <form
                  className="mt-8 grid max-w-xl gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm"
                  onSubmit={submitAuth}
                >
                  <div className="flex rounded-[6px] bg-black/5 p-1">
                    <button
                      className={`flex-1 rounded-[5px] px-3 py-2 text-sm font-medium ${
                        authMode === "login" ? "bg-[var(--panel)] shadow-sm" : ""
                      }`}
                      onClick={() => setAuthMode("login")}
                      type="button"
                    >
                      Login
                    </button>
                    <button
                      className={`flex-1 rounded-[5px] px-3 py-2 text-sm font-medium ${
                        authMode === "signup"
                          ? "bg-[var(--panel)] shadow-sm"
                          : ""
                      }`}
                      onClick={() => setAuthMode("signup")}
                      type="button"
                    >
                      Sign up
                    </button>
                  </div>
                  {authMode === "signup" ? (
                    <input
                      className="rounded-[6px] border border-[var(--border)] bg-white px-3 py-2 text-sm"
                      onChange={(event) => setAuthName(event.target.value)}
                      placeholder="Name"
                      value={authName}
                    />
                  ) : null}
                  <input
                    className="rounded-[6px] border border-[var(--border)] bg-white px-3 py-2 text-sm"
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="Email"
                    required
                    type="email"
                    value={authEmail}
                  />
                  <input
                    className="rounded-[6px] border border-[var(--border)] bg-white px-3 py-2 text-sm"
                    minLength={8}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="Password"
                    required
                    type="password"
                    value={authPassword}
                  />
                  {authError ? (
                    <p className="text-sm text-red-700">{authError}</p>
                  ) : null}
                  <button
                    className="rounded-[6px] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isAuthLoading}
                    type="submit"
                  >
                    {authMode === "login" ? "Login" : "Create account"}
                  </button>
                </form>
              )}
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
            disabled={isBusy || !user}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitMessage();
              }
            }}
            placeholder={user ? "Send a message..." : "Sign in to chat..."}
            value={input}
          />
          <PromptInputFooter>
            <p className="text-xs text-[var(--muted)]">
              {user
                ? "Shift Enter for a new line."
                : "Create an account or login to start chatting."}
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
                disabled={!input.trim() || !user}
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
