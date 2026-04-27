"use client";

import { BrainCircuit } from "lucide-react";
import { CHAT_MODELS, type ChatModelId } from "@/lib/models";

export function ModelSelector({
  value,
  onChange,
  disabled,
}: {
  value: ChatModelId;
  onChange: (value: ChatModelId) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)]">
      <BrainCircuit aria-hidden="true" className="h-4 w-4 shrink-0" />
      <select
        className="min-w-0 rounded-[8px] border border-[var(--border)] bg-[#120e16] px-2 py-1.5 text-sm text-[var(--foreground)] [color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value as ChatModelId)}
      >
        {CHAT_MODELS.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label}
          </option>
        ))}
      </select>
    </label>
  );
}
