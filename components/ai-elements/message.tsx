"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Message({
  from,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  from: "user" | "assistant" | "system";
}) {
  return (
    <div
      className={cn(
        "group flex w-full",
        from === "user" ? "justify-end" : "justify-start",
        className,
      )}
      data-from={from}
      {...props}
    />
  );
}

export function MessageContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "max-w-[min(44rem,86%)] rounded-[8px] border px-4 py-3 text-[0.95rem] leading-7 shadow-sm",
        "group-data-[from=user]:border-transparent group-data-[from=user]:bg-[var(--primary)] group-data-[from=user]:text-[var(--primary-foreground)]",
        "group-data-[from=assistant]:border-[var(--border)] group-data-[from=assistant]:bg-[var(--panel)]",
        className,
      )}
      {...props}
    />
  );
}

export function MessageResponse({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "whitespace-pre-wrap break-words [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_pre]:overflow-auto",
        className,
      )}
      {...props}
    />
  );
}
