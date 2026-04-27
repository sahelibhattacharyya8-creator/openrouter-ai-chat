"use client";

import type { FormHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function PromptInput({
  className,
  ...props
}: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      className={cn(
        "mx-auto w-full max-w-4xl rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-2 shadow-lg",
        className,
      )}
      {...props}
    />
  );
}

export function PromptInputTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "max-h-44 min-h-16 w-full resize-none rounded-[10px] border-0 bg-transparent px-3 py-2 text-base leading-6 text-[var(--foreground)] placeholder:text-[var(--muted)]",
        className,
      )}
      rows={2}
      {...props}
    />
  );
}

export function PromptInputFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t border-[var(--border)] px-2 pt-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    />
  );
}
