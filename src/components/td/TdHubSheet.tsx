"use client";

import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function TdHubSheet({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pb-[3.35rem] md:items-center md:justify-center md:p-4 md:pb-4">
      <button
        type="button"
        aria-label="close"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[78dvh] w-full flex-col rounded-t-2xl border border-white/10 bg-[#0c0912] shadow-2xl md:max-h-[85dvh] md:max-w-lg md:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-gold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:border-white/30"
          >
            ✕
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
