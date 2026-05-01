"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";

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
  admin?: { username: string };
  users: AdminUser[];
  payments: AdminPayment[];
};

export default function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const paidAmount = useMemo(
    () =>
      data?.payments.reduce(
        (total, payment) =>
          payment.status === "paid" ? total + payment.amount : total,
        0,
      ) ?? 0,
    [data],
  );

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin");
      const result = await response.json();

      if (!response.ok) {
        setData(null);
        if (response.status !== 403) {
          setError(result.error ?? "Could not load admin data.");
        }
        return;
      }

      setData(result);
    } catch {
      setError("Could not load admin data.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoggingIn(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Admin login failed.");
        return;
      }

      setPassword("");
      await loadAdminData();
    } catch {
      setError("Admin login failed.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setData(null);
    setUsername("");
    setPassword("");
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

  return (
    <main className="min-h-dvh bg-[#0f0b12] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase text-pink-300">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Admin
            </div>
            <h1 className="mt-2 text-3xl font-semibold">OpenRouter AI Chat Admin</h1>
            <p className="mt-2 text-sm text-[#b7a9c0]">
              Separate admin console for customer users and payments.
            </p>
          </div>
          {data?.admin ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-pink-100 transition hover:bg-white/[0.08]"
              onClick={logout}
              type="button"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Logout
            </button>
          ) : null}
        </div>

        {!data ? (
          <section className="mx-auto max-w-md rounded-[18px] border border-white/10 bg-[#211927]/85 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
            <h2 className="text-xl font-semibold">Admin login</h2>
            <p className="mt-2 text-sm leading-6 text-[#b7a9c0]">
              Use the admin username and password configured in Vercel.
            </p>
            <form className="mt-5 grid gap-3" onSubmit={login}>
              <input
                autoComplete="username"
                className="h-11 rounded-full border border-white/10 bg-[#120e16] px-4 text-sm text-white outline-none placeholder:text-[#7f7388] focus:border-pink-300/40"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Admin username"
                required
                value={username}
              />
              <input
                autoComplete="current-password"
                className="h-11 rounded-full border border-white/10 bg-[#120e16] px-4 text-sm text-white outline-none placeholder:text-[#7f7388] focus:border-pink-300/40"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Admin password"
                required
                type="password"
                value={password}
              />
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              <button
                className="h-11 rounded-full bg-[#c21872] px-4 text-sm font-semibold text-white transition hover:bg-[#df2a8c] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoggingIn}
                type="submit"
              >
                {isLoggingIn ? "Logging in..." : "Login"}
              </button>
            </form>
          </section>
        ) : (
          <div className="grid gap-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#b7a9c0]">
                Logged in as <span className="text-pink-100">{data.admin?.username}</span>
              </p>
              <button
                className="h-10 rounded-full border border-pink-300/25 bg-white/[0.04] px-5 text-sm font-semibold text-pink-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                onClick={loadAdminData}
                type="button"
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[16px] border border-white/10 bg-[#211927]/80 p-4">
                <div className="text-sm text-[#b7a9c0]">Users</div>
                <div className="mt-2 text-3xl font-semibold">{data.users.length}</div>
              </div>
              <div className="rounded-[16px] border border-white/10 bg-[#211927]/80 p-4">
                <div className="text-sm text-[#b7a9c0]">Payments</div>
                <div className="mt-2 text-3xl font-semibold">{data.payments.length}</div>
              </div>
              <div className="rounded-[16px] border border-white/10 bg-[#211927]/80 p-4">
                <div className="text-sm text-[#b7a9c0]">Paid amount</div>
                <div className="mt-2 text-3xl font-semibold">
                  {formatMoney(paidAmount, "INR")}
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
                  <thead className="border-b border-white/10 text-xs uppercase text-[#b7a9c0]">
                    <tr>
                      <th className="py-3 pr-4 font-semibold">Name</th>
                      <th className="py-3 pr-4 font-semibold">Email</th>
                      <th className="py-3 pr-4 font-semibold">Verified</th>
                      <th className="py-3 pr-4 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/7">
                    {data.users.map((user) => (
                      <tr key={user.id}>
                        <td className="py-3 pr-4 text-pink-50">{user.name || "No name"}</td>
                        <td className="py-3 pr-4 text-[#b7a9c0]">{user.email}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              user.emailVerified
                                ? "bg-emerald-500/12 text-emerald-200"
                                : "bg-yellow-500/12 text-yellow-100"
                            }`}
                          >
                            {user.emailVerified ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-[#b7a9c0]">
                          {formatDate(user.createdAt)}
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
                  <thead className="border-b border-white/10 text-xs uppercase text-[#b7a9c0]">
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
                    {data.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="py-3 pr-4">
                          <div className="text-pink-50">{payment.userName || "No name"}</div>
                          <div className="text-xs text-[#b7a9c0]">
                            {payment.userEmail || payment.userId}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-pink-50">{payment.plan}</td>
                        <td className="py-3 pr-4 text-pink-50">
                          {formatMoney(payment.amount, payment.currency)}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-pink-100">
                            {payment.status}
                          </span>
                        </td>
                        <td className="max-w-48 truncate py-3 pr-4 text-[#b7a9c0]">
                          {payment.providerPaymentId || payment.providerOrderId}
                        </td>
                        <td className="py-3 pr-4 text-[#b7a9c0]">
                          {formatDate(payment.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {isLoading && !data ? (
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-[#b7a9c0]">
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            Checking admin session...
          </div>
        ) : null}
      </div>
    </main>
  );
}
