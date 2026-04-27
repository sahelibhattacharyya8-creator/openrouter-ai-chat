"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import {
  Bot,
  Code2,
  Compass,
  GraduationCap,
  Library,
  LoaderCircle,
  LogOut,
  MessageSquarePlus,
  PanelLeft,
  Search,
  Send,
  Sparkles,
  Square,
  UserRound,
  Zap,
} from "lucide-react";
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
  "How does AI work?",
  "Are black holes real?",
  'How many Rs are in the word "strawberry"?',
  "What is the meaning of life?",
];

const promptModes = [
  { label: "Create", icon: Sparkles },
  { label: "Explore", icon: Library },
  { label: "Code", icon: Code2 },
  { label: "Learn", icon: GraduationCap },
];

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export default function Page() {
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
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
  const messageScrollKey = messages
    .map((message) =>
      message.parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join(""),
    )
    .join("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const conversation = conversationRef.current;

      if (conversation) {
        conversation.scrollTop = conversation.scrollHeight;
      }

      endOfMessagesRef.current?.scrollIntoView({
        behavior: status === "streaming" ? "auto" : "smooth",
        block: "end",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [messageScrollKey, status]);

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
    <main className="flex h-dvh overflow-hidden bg-[#0f0b12] text-[var(--foreground)]">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[linear-gradient(165deg,#2a1120_0%,#171018_42%,#110d13_100%)] p-3 md:flex">
        <div className="flex h-12 items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Bot aria-hidden="true" className="h-5 w-5 text-pink-200" />
            <span className="text-lg font-semibold tracking-normal">T3.chat</span>
          </div>
          <button
            aria-label="Toggle sidebar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--muted)] hover:bg-white/5"
            title="Toggle sidebar"
            type="button"
          >
            <PanelLeft aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <button
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-pink-400/25 bg-[linear-gradient(90deg,#751442,#51203b)] px-3 text-sm font-semibold shadow-[0_0_28px_rgba(244,114,182,0.12)] hover:border-pink-300/50"
          type="button"
        >
          <MessageSquarePlus aria-hidden="true" className="h-4 w-4" />
          New Chat
        </button>

        <label className="mt-5 flex h-11 items-center gap-2 border-b border-[var(--border)] px-2 text-sm text-[var(--muted)]">
          <Search aria-hidden="true" className="h-4 w-4" />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--muted)]"
            placeholder="Search your threads..."
          />
        </label>

        <div className="mt-4 flex-1 space-y-1 overflow-hidden text-sm text-[var(--muted)]">
          {messages.length > 0 ? (
            <div className="rounded-[8px] bg-white/5 px-3 py-2 text-pink-100">
              Current conversation
            </div>
          ) : null}
        </div>

        <div className="border-t border-[var(--border)] pt-3">
          {user ? (
            <div className="flex items-center gap-2 rounded-[8px] bg-white/5 px-3 py-2 text-sm">
              <UserRound aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {user.name || user.email}
              </span>
              <button
                aria-label="Sign out"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--muted)] hover:bg-white/10"
                onClick={logout}
                title="Sign out"
                type="button"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-pink-100">
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Login
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col rounded-tl-[28px] border-l border-t border-white/5 bg-[radial-gradient(circle_at_50%_0%,rgba(82,54,96,0.4),transparent_34rem),#18131d]">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <Bot aria-hidden="true" className="h-5 w-5 text-pink-200" />
            <span className="font-semibold">T3.chat</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex min-w-0 items-center gap-2">
            {user ? (
              <div className="hidden min-w-0 items-center gap-2 rounded-[8px] border border-[var(--border)] bg-white/5 px-3 py-2 text-sm sm:flex">
                <UserRound aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="max-w-48 truncate">
                  {user.name || user.email}
                </span>
              </div>
            ) : null}
            <ModelSelector disabled={isBusy} value={model} onChange={setModel} />
          </div>
        </header>

        <Conversation ref={conversationRef} className="px-4">
          <ConversationContent className="max-w-3xl pb-36 pt-8">
          {messages.length === 0 ? (
            <section className="flex flex-1 flex-col justify-center py-10">
              <div className="mx-auto w-full max-w-2xl text-center">
                <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                  {user
                    ? "How can I help you?"
                    : "Sign in to chat and save your conversations."}
                </h1>
              </div>
              {user ? (
                <>
                <div className="mx-auto mt-7 flex flex-wrap justify-center gap-2">
                  {promptModes.map((mode) => {
                    const Icon = mode.icon;

                    return (
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-pink-100 shadow-sm hover:bg-white/[0.08]"
                        key={mode.label}
                        type="button"
                      >
                        <Icon aria-hidden="true" className="h-4 w-4" />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mx-auto mt-8 w-full max-w-2xl divide-y divide-white/7">
                  {suggestions.map((suggestion) => (
                    <button
                      className="block w-full px-3 py-4 text-left text-base font-medium text-[var(--muted)] transition hover:text-pink-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isBusy}
                      key={suggestion}
                      onClick={() => submitMessage(suggestion)}
                      type="button"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                </>
              ) : (
                <form
                  className="mx-auto mt-8 grid w-full max-w-xl gap-3 rounded-[12px] border border-[var(--border)] bg-white/[0.04] p-4 shadow-2xl"
                  onSubmit={submitAuth}
                >
                  <div className="flex rounded-[8px] bg-black/20 p-1">
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
                      className="rounded-[8px] border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-white"
                      onChange={(event) => setAuthName(event.target.value)}
                      placeholder="Name"
                      value={authName}
                    />
                  ) : null}
                  <input
                    className="rounded-[8px] border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-white"
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="Email"
                    required
                    type="email"
                    value={authEmail}
                  />
                  <input
                    className="rounded-[8px] border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-white"
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
                    className="rounded-[8px] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
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

          <div ref={endOfMessagesRef} />
        </ConversationContent>
      </Conversation>

      <footer className="shrink-0 px-4 pb-4 sm:px-6">
        <PromptInput
          className="max-w-3xl border-white/10 bg-[#251d2b]/95 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          onSubmit={(event) => {
            event.preventDefault();
            submitMessage();
          }}
        >
          <PromptInputTextarea
            className="min-h-20 text-base placeholder:text-[#8f8498]"
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
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5">
                {activeModel?.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1.5">
                <Zap aria-hidden="true" className="h-3.5 w-3.5" />
                Instant
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1.5">
                <Compass aria-hidden="true" className="h-3.5 w-3.5" />
                Search
              </span>
            </div>
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-pink-500 text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-45"
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
      </section>
    </main>
  );
}
