"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import {
  Bot,
  Check,
  Code2,
  Compass,
  CreditCard,
  Eye,
  EyeOff,
  GraduationCap,
  Library,
  LoaderCircle,
  LogOut,
  MessageSquarePlus,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  UserRound,
  X,
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

const pricingPlans = [
  {
    name: "Standard",
    price: "₹0",
    description: "Single-user access to AI features",
    features: ["Access to AI core features", "Basic support", "Limited usage"],
    cta: "Start free",
  },
  {
    name: "Pro",
    price: "₹499",
    description: "Mobile and desktop compatibility",
    features: ["Everything in Basic", "Advanced AI capabilities", "Priority support"],
    cta: "Join pro",
  },
];

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name?: string;
    email?: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayCheckoutResponse) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
    };
  }
}

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

type ConversationSummary = {
  conversationId: string;
  title: string;
  updatedAt: string;
};

type StoredChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: string;
};

type AdminPayment = {
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
  status: "created" | "paid" | "failed";
  createdAt: string;
  updatedAt: string;
};

type AdminData = {
  users: AdminUser[];
  payments: AdminPayment[];
};

export default function Page() {
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const [chatId, setChatId] = useState(() => crypto.randomUUID());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<
    "login" | "signup" | "forgot" | "reset"
  >("login");
  const [authFirstName, setAuthFirstName] = useState("");
  const [authLastName, setAuthLastName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordResetToken, setPasswordResetToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState(chatId);
  const [conversationSearch, setConversationSearch] = useState("");
  const [billingError, setBillingError] = useState("");
  const [billingSuccess, setBillingSuccess] = useState("");
  const [billingPlan, setBillingPlan] = useState<string | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [adminError, setAdminError] = useState("");
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<ChatModelId>(DEFAULT_CHAT_MODEL);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openConversationMenuId, setOpenConversationMenuId] = useState<
    string | null
  >(null);
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editingConversationTitle, setEditingConversationTitle] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { chatId: activeConversationId, model },
      }),
    [activeConversationId, model],
  );

  const { messages, setMessages, sendMessage, status, stop, error } = useChat({
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const activeModel = CHAT_MODELS.find((item) => item.id === model);
  const filteredConversations = conversations.filter((conversation) =>
    (conversation.title || "Untitled conversation")
      .toLowerCase()
      .includes(conversationSearch.trim().toLowerCase()),
  );
  const messageScrollKey = messages
    .map((message) =>
      message.parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join(""),
    )
    .join("");
  const totalPaidAmount =
    adminData?.payments.reduce(
      (total, payment) =>
        payment.status === "paid" ? total + payment.amount : total,
      0,
    ) ?? 0;

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
    const verified = new URLSearchParams(window.location.search).get(
      "verified",
    );
    const resetToken = new URLSearchParams(window.location.search).get(
      "resetToken",
    );

    if (verified === "success") {
      setAuthSuccess("Email verified. You are logged in now.");
      window.history.replaceState(null, "", window.location.pathname);
    } else if (verified === "invalid") {
      setAuthError("Verification link is invalid or expired.");
      window.history.replaceState(null, "", window.location.pathname);
    } else if (verified === "missing") {
      setAuthError("Verification link is missing a token.");
      window.history.replaceState(null, "", window.location.pathname);
    }

    if (resetToken) {
      setPasswordResetToken(resetToken);
      setAuthMode("reset");
      setAuthSuccess("Enter a new password for your account.");
      setAuthPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowAuthPassword(false);
      setShowNewPassword(false);
      window.history.replaceState(null, "", window.location.pathname);

      window.setTimeout(() => {
        setAuthPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }, 100);
    }

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

  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    loadConversations();
  }, [user]);

  async function loadConversations() {
    const response = await fetch("/api/conversations");
    const data = await response.json();
    setConversations(data.conversations ?? []);
  }

  function submitMessage(text = input) {
    const trimmed = text.trim();

    if (!trimmed || isBusy || !user || isAdminPanelOpen) {
      return;
    }

    sendMessage({
      parts: [{ type: "text", text: trimmed }],
    });
    setInput("");
    window.setTimeout(loadConversations, 1500);
  }

  async function openConversation(conversationId: string) {
    if (editingConversationId) {
      return;
    }

    const response = await fetch(
      `/api/conversations?conversationId=${encodeURIComponent(conversationId)}`,
    );
    const data: { messages?: StoredChatMessage[] } = await response.json();

    setActiveConversationId(conversationId);
    setIsAdminPanelOpen(false);
    setIsSidebarOpen(false);
    setMessages(
      (data.messages ?? []).map((message) => ({
        id: String(message.id),
        role: message.role,
        parts: [{ type: "text", text: message.content }],
      })),
    );
  }

  function startNewChat() {
    const newChatId = crypto.randomUUID();
    setChatId(newChatId);
    setActiveConversationId(newChatId);
    setMessages([]);
    setInput("");
    setOpenConversationMenuId(null);
    setEditingConversationId(null);
    setEditingConversationTitle("");
    setIsAdminPanelOpen(false);
    setIsSidebarOpen(false);
  }

  async function openAdminPanel() {
    setIsAdminPanelOpen(true);
    setIsSidebarOpen(false);
    setAdminError("");
    setIsAdminLoading(true);

    try {
      const response = await fetch("/api/admin");
      const data = await response.json();

      if (!response.ok) {
        setAdminError(data.error ?? "Could not load admin panel.");
        setAdminData(null);
        return;
      }

      setAdminData(data);
    } catch {
      setAdminError("Could not load admin panel.");
      setAdminData(null);
    } finally {
      setIsAdminLoading(false);
    }
  }

  function formatMoney(amount: number, currency: string) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(amount / 100);
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function startRenamingConversation(conversation: ConversationSummary) {
    setOpenConversationMenuId(null);
    setEditingConversationId(conversation.conversationId);
    setEditingConversationTitle(conversation.title || "Untitled conversation");
  }

  async function renameActiveConversation(
    event: React.FormEvent<HTMLFormElement>,
    conversationId: string,
  ) {
    event.preventDefault();

    const title = editingConversationTitle.trim();

    if (!title) {
      return;
    }

    setConversations((current) =>
      current.map((conversation) =>
        conversation.conversationId === conversationId
          ? { ...conversation, title }
          : conversation,
      ),
    );
    setEditingConversationId(null);
    setEditingConversationTitle("");

    const response = await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, title }),
    });

    if (!response.ok) {
      await loadConversations();
      return;
    }

    const data: { conversation?: ConversationSummary } = await response.json();

    if (data.conversation) {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.conversationId === conversationId
            ? { ...conversation, title: data.conversation!.title }
            : conversation,
        ),
      );
    }
  }

  async function deleteSavedConversation(conversationId: string) {
    setOpenConversationMenuId(null);

    const shouldDelete = window.confirm("Delete this chat?");

    if (!shouldDelete) {
      return;
    }

    const response = await fetch(
      `/api/conversations?conversationId=${encodeURIComponent(conversationId)}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      return;
    }

    setConversations((current) =>
      current.filter(
        (conversation) => conversation.conversationId !== conversationId,
      ),
    );

    if (activeConversationId === conversationId) {
      startNewChat();
    }
  }

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setIsAuthLoading(true);

    if (authMode === "reset" && newPassword !== confirmNewPassword) {
      setAuthError("New password and confirm password do not match.");
      setIsAuthLoading(false);
      return;
    }

    try {
      const authEndpoint =
        authMode === "forgot"
          ? "forgot-password"
          : authMode === "reset"
            ? "reset-password"
            : authMode;
      const requestBody =
        authMode === "forgot"
          ? { email: authEmail }
          : authMode === "reset"
            ? {
                token: passwordResetToken,
                password: newPassword,
                confirmPassword: confirmNewPassword,
              }
            : {
                email: authEmail,
                name: `${authFirstName.trim()} ${authLastName.trim()}`.trim(),
                password: authPassword,
              };

      const response = await fetch(`/api/auth/${authEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error ?? "Authentication failed.");
        return;
      }

      if (authMode === "signup") {
        setAuthSuccess(
          [data.message, data.warning].filter(Boolean).join(" ") ??
            "Check your email to verify your account.",
        );
        setAuthMode("login");
        setAuthFirstName("");
        setAuthLastName("");
        setAuthEmail("");
        setAuthPassword("");
        return;
      }

      if (authMode === "forgot") {
        setAuthSuccess(data.message ?? "Check your email for a reset link.");
        setAuthMode("login");
        setAuthEmail("");
        return;
      }

      if (authMode === "reset") {
        setUser(data.user);
        setPasswordResetToken("");
        setAuthPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        return;
      }

      setUser(data.user);
      setAuthFirstName("");
      setAuthLastName("");
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

  async function loadRazorpayCheckout() {
    if (window.Razorpay) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
      );

      if (existingScript) {
        window.setTimeout(() => resolve(Boolean(window.Razorpay)), 3000);
        return;
      }

      const script = document.createElement("script");
      const timeout = window.setTimeout(() => resolve(false), 8000);
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        window.clearTimeout(timeout);
        resolve(true);
      };
      script.onerror = () => {
        window.clearTimeout(timeout);
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = 15000,
  ) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function startCheckout(plan: "pro") {
    setBillingError("");
    setBillingSuccess("");
    setBillingPlan(plan);

    try {
      const isLoaded = await loadRazorpayCheckout();

      if (!isLoaded || !window.Razorpay) {
        setBillingError("Could not load Razorpay Checkout.");
        return;
      }

      const response = await fetchWithTimeout(
        "/api/billing/razorpay/order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setBillingError(data.error ?? "Could not start checkout.");
        return;
      }

      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "OpenRouter AI Chat",
        description: `${plan.toUpperCase()} plan`,
        order_id: data.orderId,
        prefill: {
          name: data.name,
          email: data.email,
        },
        theme: {
          color: "#c21872",
        },
        handler: async (paymentResponse) => {
          setBillingPlan(plan);
          setBillingError("");

          try {
            const verifyResponse = await fetchWithTimeout(
              "/api/billing/razorpay/verify",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paymentResponse),
              },
            );
            const verifyData = await verifyResponse.json().catch(() => ({}));

            if (!verifyResponse.ok) {
              setBillingError(
                verifyData.error ?? "Payment verification failed.",
              );
              return;
            }

            setBillingSuccess(
              "Payment verified. Your Pro test payment is saved.",
            );
          } catch {
            setBillingError("Payment verification timed out. Please try again.");
          } finally {
            setBillingPlan(null);
          }
        },
      });

      checkout.open();
    } catch {
      setBillingError(
        "Razorpay is taking too long to respond. Check your test keys and try again.",
      );
    } finally {
      setBillingPlan(null);
    }
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-[#0f0b12] text-[var(--foreground)]">
      {isSidebarOpen ? (
        <button
          aria-label="Close chat history"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-[var(--border)] bg-[linear-gradient(165deg,#2a1120_0%,#171018_42%,#110d13_100%)] p-3 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-12 items-center justify-between px-2">
          <div className="flex min-w-0 items-center gap-2">
            <Bot aria-hidden="true" className="h-5 w-5 text-pink-200" />
            <span className="min-w-0 text-base font-semibold leading-tight tracking-normal">
              OpenRouter AI Chat
            </span>
          </div>
          <button
            aria-label="Toggle sidebar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--muted)] hover:bg-white/5"
            onClick={() => setIsSidebarOpen(false)}
            title="Toggle sidebar"
            type="button"
          >
            <PanelLeft aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <button
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#ff4fb3]/35 bg-[linear-gradient(90deg,#c21872,#7b164b)] px-3 text-sm font-semibold shadow-[0_0_28px_rgba(255,79,179,0.16)] hover:border-[#ff8dcc]/60"
          onClick={startNewChat}
          type="button"
        >
          <MessageSquarePlus aria-hidden="true" className="h-4 w-4" />
          New Chat
        </button>

        {user ? (
          <button
            className={`mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-3 text-sm font-semibold transition ${
              isAdminPanelOpen
                ? "border-pink-300/45 bg-white/10 text-pink-100"
                : "border-white/10 bg-white/[0.04] text-[var(--muted)] hover:border-pink-300/35 hover:text-pink-100"
            }`}
            onClick={openAdminPanel}
            type="button"
          >
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Admin Panel
          </button>
        ) : null}

        <label className="mt-5 flex h-11 items-center gap-2 border-b border-[var(--border)] px-2 text-sm text-[var(--muted)]">
          <Search aria-hidden="true" className="h-4 w-4" />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--muted)]"
            onChange={(event) => setConversationSearch(event.target.value)}
            placeholder="Search your threads..."
            value={conversationSearch}
          />
        </label>

        <div className="mt-4 flex-1 space-y-1 overflow-y-auto text-sm text-[var(--muted)]">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => {
              const isActive =
                activeConversationId === conversation.conversationId;
              const isEditing =
                editingConversationId === conversation.conversationId;
              const title = conversation.title || "Untitled conversation";

              return (
                <div
                  className={`group relative rounded-[8px] transition hover:bg-white/5 hover:text-pink-100 ${
                    isActive ? "bg-white/8 text-pink-100" : ""
                  }`}
                  key={conversation.conversationId}
                >
                  {isEditing ? (
                    <form
                      className="flex items-center gap-1 px-2 py-1.5"
                      onSubmit={(event) =>
                        renameActiveConversation(
                          event,
                          conversation.conversationId,
                        )
                      }
                    >
                      <input
                        autoFocus
                        className="min-w-0 flex-1 rounded-[6px] border border-pink-300/35 bg-[#120e16] px-2 py-1 text-sm text-pink-50 outline-none"
                        onChange={(event) =>
                          setEditingConversationTitle(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setEditingConversationId(null);
                            setEditingConversationTitle("");
                          }
                        }}
                        value={editingConversationTitle}
                      />
                      <button
                        aria-label="Save chat name"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-pink-100 hover:bg-white/10"
                        title="Save"
                        type="submit"
                      >
                        <Check aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="Cancel rename"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[var(--muted)] hover:bg-white/10 hover:text-pink-100"
                        onClick={() => {
                          setEditingConversationId(null);
                          setEditingConversationTitle("");
                        }}
                        title="Cancel"
                        type="button"
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center">
                      <button
                        className="min-w-0 flex-1 truncate rounded-[8px] px-3 py-2 pr-1 text-left transition"
                        onClick={() =>
                          openConversation(conversation.conversationId)
                        }
                        title={title}
                        type="button"
                      >
                        {title}
                      </button>
                      <button
                        aria-label={`Open options for ${title}`}
                        aria-expanded={
                          openConversationMenuId === conversation.conversationId
                        }
                        className={`mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] transition hover:bg-white/10 hover:text-pink-100 ${
                          openConversationMenuId === conversation.conversationId
                            ? "bg-white/10 text-pink-100"
                            : "text-[var(--muted)]"
                        }`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenConversationMenuId((current) =>
                            current === conversation.conversationId
                              ? null
                              : conversation.conversationId,
                          );
                        }}
                        title="Chat options"
                        type="button"
                      >
                        <MoreHorizontal
                          aria-hidden="true"
                          className="h-4 w-4"
                        />
                      </button>
                    </div>
                  )}

                  {openConversationMenuId === conversation.conversationId ? (
                    <div className="absolute right-1 top-9 z-20 w-36 rounded-[8px] border border-white/10 bg-[#211927] p-1 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
                      <button
                        className="flex w-full items-center gap-2 rounded-[6px] px-2 py-2 text-left text-sm text-pink-50 hover:bg-white/8"
                        onClick={() => startRenamingConversation(conversation)}
                        type="button"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                        Rename
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded-[6px] px-2 py-2 text-left text-sm text-red-200 hover:bg-red-400/10"
                        onClick={() =>
                          deleteSavedConversation(conversation.conversationId)
                        }
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="px-3 py-2 text-xs leading-5 text-[var(--muted)]">
              {conversationSearch
                ? "No conversations match your search."
                : "Saved conversations will appear here."}
            </p>
          )}
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
            <button
              aria-label="Open chat history"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] text-[var(--muted)] hover:bg-white/5"
              onClick={() => setIsSidebarOpen(true)}
              title="Open chat history"
              type="button"
            >
              <PanelLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <Bot aria-hidden="true" className="h-5 w-5 text-pink-200" />
            <span className="font-semibold">OpenRouter AI Chat</span>
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

        {isAdminPanelOpen ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 sm:px-6">
            <div className="mx-auto max-w-6xl py-8">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-pink-300">
                    Admin
                  </p>
                  <h1 className="mt-1 text-3xl font-semibold text-pink-50">
                    Admin panel
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    View registered users and Razorpay payment records.
                  </p>
                </div>
                <button
                  className="h-10 rounded-full border border-pink-300/25 bg-white/[0.04] px-5 text-sm font-semibold text-pink-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isAdminLoading}
                  onClick={openAdminPanel}
                  type="button"
                >
                  {isAdminLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {adminError ? (
                <div className="rounded-[14px] border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {adminError}
                </div>
              ) : null}

              {isAdminLoading ? (
                <div className="flex items-center gap-2 rounded-[14px] border border-white/10 bg-[#211927]/80 px-4 py-3 text-sm text-[var(--muted)]">
                  <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Loading admin data...
                </div>
              ) : null}

              {adminData ? (
                <div className="grid gap-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[16px] border border-white/10 bg-[#211927]/80 p-4">
                      <div className="text-sm text-[var(--muted)]">Users</div>
                      <div className="mt-2 text-3xl font-semibold">
                        {adminData.users.length}
                      </div>
                    </div>
                    <div className="rounded-[16px] border border-white/10 bg-[#211927]/80 p-4">
                      <div className="text-sm text-[var(--muted)]">Payments</div>
                      <div className="mt-2 text-3xl font-semibold">
                        {adminData.payments.length}
                      </div>
                    </div>
                    <div className="rounded-[16px] border border-white/10 bg-[#211927]/80 p-4">
                      <div className="text-sm text-[var(--muted)]">Paid amount</div>
                      <div className="mt-2 text-3xl font-semibold">
                        {formatMoney(totalPaidAmount, "INR")}
                      </div>
                    </div>
                  </div>

                  <section className="rounded-[16px] border border-white/10 bg-[#211927]/80 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <UserRound aria-hidden="true" className="h-4 w-4 text-pink-200" />
                      <h2 className="text-lg font-semibold">Users</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="border-b border-white/10 text-xs uppercase text-[var(--muted)]">
                          <tr>
                            <th className="py-3 pr-4 font-semibold">Name</th>
                            <th className="py-3 pr-4 font-semibold">Email</th>
                            <th className="py-3 pr-4 font-semibold">Verified</th>
                            <th className="py-3 pr-4 font-semibold">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/7">
                          {adminData.users.map((adminUser) => (
                            <tr key={adminUser.id}>
                              <td className="py-3 pr-4 text-pink-50">
                                {adminUser.name || "No name"}
                              </td>
                              <td className="py-3 pr-4 text-[var(--muted)]">
                                {adminUser.email}
                              </td>
                              <td className="py-3 pr-4">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    adminUser.emailVerified
                                      ? "bg-emerald-500/12 text-emerald-200"
                                      : "bg-yellow-500/12 text-yellow-100"
                                  }`}
                                >
                                  {adminUser.emailVerified ? "Yes" : "No"}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-[var(--muted)]">
                                {formatDate(adminUser.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="rounded-[16px] border border-white/10 bg-[#211927]/80 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <CreditCard aria-hidden="true" className="h-4 w-4 text-pink-200" />
                      <h2 className="text-lg font-semibold">Payments</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px] text-left text-sm">
                        <thead className="border-b border-white/10 text-xs uppercase text-[var(--muted)]">
                          <tr>
                            <th className="py-3 pr-4 font-semibold">User</th>
                            <th className="py-3 pr-4 font-semibold">Plan</th>
                            <th className="py-3 pr-4 font-semibold">Amount</th>
                            <th className="py-3 pr-4 font-semibold">Status</th>
                            <th className="py-3 pr-4 font-semibold">Payment ID</th>
                            <th className="py-3 pr-4 font-semibold">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/7">
                          {adminData.payments.map((payment) => (
                            <tr key={payment.id}>
                              <td className="py-3 pr-4">
                                <div className="text-pink-50">
                                  {payment.userName || "No name"}
                                </div>
                                <div className="text-xs text-[var(--muted)]">
                                  {payment.userEmail || payment.userId}
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-pink-50">
                                {payment.plan}
                              </td>
                              <td className="py-3 pr-4 text-pink-50">
                                {formatMoney(payment.amount, payment.currency)}
                              </td>
                              <td className="py-3 pr-4">
                                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-pink-100">
                                  {payment.status}
                                </span>
                              </td>
                              <td className="max-w-48 truncate py-3 pr-4 text-[var(--muted)]">
                                {payment.providerPaymentId || payment.providerOrderId}
                              </td>
                              <td className="py-3 pr-4 text-[var(--muted)]">
                                {formatDate(payment.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <>
        <Conversation ref={conversationRef} className="px-4">
          <ConversationContent className="max-w-3xl pb-36 pt-8">
          {messages.length === 0 ? (
            <section className="flex flex-1 flex-col justify-center py-10">
              <div className="mx-auto w-full max-w-2xl text-center">
                <h1 className="text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
                  {user
                    ? "How can I help you?"
                    : "Welcome back."}
                </h1>
                {!user ? (
                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
                    Login or create an account to save your OpenRouter chats,
                    models, and conversation history.
                  </p>
                ) : null}
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
                <div className="mx-auto mt-8 w-full max-w-2xl rounded-[22px] border border-pink-300/20 bg-[linear-gradient(180deg,#281d30_0%,#1a1420_100%)] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-pink-300">
                        Pricing
                      </p>
                      <h2 className="mt-1 text-2xl font-semibold text-pink-50">
                        Upgrade to Pro
                      </h2>
                      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                        Test Razorpay checkout in sandbox mode and save the
                        payment result to your database.
                      </p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <div className="text-3xl font-semibold text-white">
                        ₹499
                      </div>
                      <button
                        className="mt-3 h-11 rounded-full bg-[linear-gradient(90deg,#c21872,#ff4fb3)] px-8 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(255,79,179,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={billingPlan === "pro"}
                        onClick={() => startCheckout("pro")}
                        type="button"
                      >
                        {billingPlan === "pro" ? "Opening..." : "Join pro"}
                      </button>
                    </div>
                  </div>
                  {billingError ? (
                    <p className="mt-4 rounded-[10px] border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                      {billingError}
                    </p>
                  ) : null}
                  {billingSuccess ? (
                    <p className="mt-4 rounded-[10px] border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                      {billingSuccess}
                    </p>
                  ) : null}
                </div>
                </>
              ) : (
                <div className="mx-auto mt-8 grid w-full max-w-4xl gap-6">
                  <form
                    autoComplete={authMode === "reset" ? "off" : "on"}
                    className="mx-auto grid w-full max-w-md gap-3 rounded-[24px] border border-white/10 bg-[#1d1722]/95 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
                    onSubmit={submitAuth}
                  >
                    <div className="flex rounded-full bg-black/20 p-1">
                      <button
                        className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                          authMode === "login"
                            ? "bg-[#2a2130] text-pink-50 shadow-sm"
                            : "text-[var(--muted)] hover:text-pink-100"
                        }`}
                        onClick={() => setAuthMode("login")}
                        type="button"
                      >
                        Login
                      </button>
                      <button
                        className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                          authMode === "signup"
                            ? "bg-[#2a2130] text-pink-50 shadow-sm"
                            : "text-[var(--muted)] hover:text-pink-100"
                        }`}
                        onClick={() => setAuthMode("signup")}
                        type="button"
                      >
                        Sign up
                      </button>
                    </div>
                    {authMode === "forgot" ? (
                      <div className="rounded-[16px] border border-pink-300/15 bg-[#120e16]/70 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                        Enter your email and we will send a password reset link.
                      </div>
                    ) : null}
                    {authMode === "reset" ? (
                      <div className="rounded-[16px] border border-pink-300/15 bg-[#120e16]/70 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                        Create a new password and confirm it below.
                      </div>
                    ) : null}
                    {authMode === "signup" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          className="h-11 rounded-full border border-white/10 bg-[#120e16] px-4 text-sm text-white outline-none placeholder:text-[#7f7388] focus:border-pink-300/40"
                          onChange={(event) =>
                            setAuthFirstName(event.target.value)
                          }
                          placeholder="First name"
                          required
                          value={authFirstName}
                        />
                        <input
                          className="h-11 rounded-full border border-white/10 bg-[#120e16] px-4 text-sm text-white outline-none placeholder:text-[#7f7388] focus:border-pink-300/40"
                          onChange={(event) =>
                            setAuthLastName(event.target.value)
                          }
                          placeholder="Last name"
                          required
                          value={authLastName}
                        />
                      </div>
                    ) : null}
                    {authMode !== "reset" ? (
                      <input
                        className="h-11 rounded-full border border-white/10 bg-[#120e16] px-4 text-sm text-white outline-none placeholder:text-[#7f7388] focus:border-pink-300/40"
                        autoComplete="email"
                        name="email"
                        onChange={(event) => setAuthEmail(event.target.value)}
                        placeholder="Email"
                        required
                        type="email"
                        value={authEmail}
                      />
                    ) : null}
                    {authMode === "reset" ? (
                      <>
                        <div className="relative">
                          <input
                            autoComplete="new-password"
                            className="h-11 w-full rounded-full border border-white/10 bg-[#120e16] px-4 pr-12 text-sm text-white outline-none placeholder:text-[#7f7388] focus:border-pink-300/40"
                            minLength={8}
                            name={`new-password-${passwordResetToken.slice(0, 8)}`}
                            onChange={(event) =>
                              setNewPassword(event.target.value)
                            }
                            placeholder="New password"
                            required
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                          />
                          <button
                            aria-label={
                              showNewPassword
                                ? "Hide new password"
                                : "Show new password"
                            }
                            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#9d8da8] transition hover:bg-white/8 hover:text-pink-100"
                            onClick={() =>
                              setShowNewPassword((current) => !current)
                            }
                            title={
                              showNewPassword
                                ? "Hide new password"
                                : "Show new password"
                            }
                            type="button"
                          >
                            {showNewPassword ? (
                              <EyeOff aria-hidden="true" className="h-4 w-4" />
                            ) : (
                              <Eye aria-hidden="true" className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            autoComplete="new-password"
                            className="h-11 w-full rounded-full border border-white/10 bg-[#120e16] px-4 pr-12 text-sm text-white outline-none placeholder:text-[#7f7388] focus:border-pink-300/40"
                            minLength={8}
                            name={`confirm-password-${passwordResetToken.slice(0, 8)}`}
                            onChange={(event) =>
                              setConfirmNewPassword(event.target.value)
                            }
                            placeholder="Confirm new password"
                            required
                            type={showNewPassword ? "text" : "password"}
                            value={confirmNewPassword}
                          />
                        </div>
                      </>
                    ) : authMode !== "forgot" ? (
                      <div className="relative">
                        <input
                          autoComplete={
                            authMode === "login"
                              ? "current-password"
                              : "new-password"
                          }
                          className="h-11 w-full rounded-full border border-white/10 bg-[#120e16] px-4 pr-12 text-sm text-white outline-none placeholder:text-[#7f7388] focus:border-pink-300/40"
                          minLength={8}
                          name={
                            authMode === "login"
                              ? "current-password"
                              : "signup-password"
                          }
                          onChange={(event) =>
                            setAuthPassword(event.target.value)
                          }
                          placeholder="Password"
                          required
                          type={showAuthPassword ? "text" : "password"}
                          value={authPassword}
                        />
                        <button
                          aria-label={
                            showAuthPassword
                              ? "Hide password"
                              : "Show password"
                          }
                          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#9d8da8] transition hover:bg-white/8 hover:text-pink-100"
                          onClick={() =>
                            setShowAuthPassword((current) => !current)
                          }
                          title={
                            showAuthPassword
                              ? "Hide password"
                              : "Show password"
                          }
                          type="button"
                        >
                          {showAuthPassword ? (
                            <EyeOff aria-hidden="true" className="h-4 w-4" />
                          ) : (
                            <Eye aria-hidden="true" className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ) : null}
                    {authError ? (
                      <p className="text-sm text-red-300">{authError}</p>
                    ) : null}
                    {authSuccess ? (
                      <p className="rounded-[12px] border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                        {authSuccess}
                      </p>
                    ) : null}
                    <button
                    className="h-11 rounded-full bg-[#c21872] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[#df2a8c] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isAuthLoading}
                      type="submit"
                    >
                      {authMode === "login"
                        ? "Login"
                        : authMode === "signup"
                          ? "Create account"
                          : authMode === "forgot"
                            ? "Send reset email"
                            : "Reset password"}
                    </button>
                    {authMode === "login" ? (
                      <button
                        className="text-sm font-medium text-pink-200 transition hover:text-pink-100"
                        onClick={() => {
                          setAuthError("");
                          setAuthSuccess("");
                          setAuthMode("forgot");
                        }}
                        type="button"
                      >
                        Forgot password?
                      </button>
                    ) : authMode === "forgot" || authMode === "reset" ? (
                      <button
                        className="text-sm font-medium text-pink-200 transition hover:text-pink-100"
                        onClick={() => {
                          setAuthError("");
                          setAuthSuccess("");
                          setAuthPassword("");
                          setNewPassword("");
                          setConfirmNewPassword("");
                          setShowAuthPassword(false);
                          setShowNewPassword(false);
                          setPasswordResetToken("");
                          setAuthMode("login");
                        }}
                        type="button"
                      >
                        Back to login
                      </button>
                    ) : null}
                  </form>

                  <div className="rounded-[18px] border border-white/10 bg-[#211927]/80 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="text-left">
                        <p className="text-xs font-semibold uppercase text-pink-300">
                          Pricing
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold">
                          Choose your chat plan
                        </h2>
                        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                          Start with saved chats for free. Upgrade options are
                          ready for when you want to add billing.
                        </p>
                      </div>
                      <div className="flex h-11 w-full max-w-xs items-center rounded-full bg-[#120e16] p-1 text-sm font-semibold text-pink-100 shadow-inner">
                        <button
                          className="h-full flex-1 rounded-full text-[var(--muted)]"
                          type="button"
                        >
                        Monthly
                      </button>
                      <button
                        className="h-full flex-1 rounded-full bg-[linear-gradient(90deg,#c21872,#ff4fb3)] text-white shadow-[0_10px_25px_rgba(255,79,179,0.35)]"
                        type="button"
                      >
                        Yearly
                      </button>
                    </div>
                    </div>
                    {billingError ? (
                      <p className="mb-3 rounded-[10px] border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {billingError}
                      </p>
                    ) : null}
                    {billingSuccess ? (
                      <p className="mb-3 rounded-[10px] border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                        {billingSuccess}
                      </p>
                    ) : null}
                  <div className="grid gap-4 md:grid-cols-2">
                    {pricingPlans.map((plan) => {
                      const planKey =
                        plan.name === "Pro"
                          ? "pro"
                          : null;

                      return (
                      <section
                        className="flex min-h-72 flex-col rounded-[16px] border border-pink-300/20 bg-[linear-gradient(180deg,#2b2032_0%,#1b1421_100%)] p-5 text-left text-pink-50 shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
                        key={plan.name}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold">
                              {plan.name}
                            </h3>
                          </div>
                          <div className="text-right">
                            <span className="text-3xl font-semibold tracking-normal">
                              {plan.price}
                            </span>
                          </div>
                        </div>
                        <div className="my-4 h-px bg-white/10" />
                        <p className="max-w-52 text-sm font-medium leading-5 text-[var(--muted)]">
                          {plan.description}
                        </p>
                        <ul className="mt-8 flex-1 space-y-3 text-sm font-medium">
                          {plan.features.map((feature) => (
                            <li className="flex gap-2" key={feature}>
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-300" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <button
                          className="mt-5 h-11 w-full rounded-full bg-[linear-gradient(90deg,#c21872,#ff4fb3)] text-xs font-semibold text-white shadow-[0_12px_30px_rgba(255,79,179,0.28)] transition hover:brightness-110"
                          disabled={!planKey || billingPlan === planKey}
                          onClick={() => {
                            if (planKey) {
                              startCheckout(planKey);
                            }
                          }}
                          type="button"
                        >
                          {billingPlan === planKey ? "Opening..." : plan.cta}
                        </button>
                      </section>
                    )})}
                  </div>
                  </div>
                </div>
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
          className={`max-w-3xl border-white/10 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${
            user ? "bg-[#251d2b]/95" : "bg-[#201824]/55 opacity-80"
          }`}
          onSubmit={(event) => {
            event.preventDefault();
            submitMessage();
          }}
        >
          <PromptInputTextarea
            className="min-h-20 text-base placeholder:text-[#8f8498] disabled:cursor-not-allowed"
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#c21872] text-white transition hover:bg-[#df2a8c] disabled:cursor-not-allowed disabled:opacity-45"
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
          </>
        )}
      </section>
    </main>
  );
}
