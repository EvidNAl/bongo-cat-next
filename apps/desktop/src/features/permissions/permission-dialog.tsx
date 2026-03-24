"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { PlannedToolCall } from "@my-pet/shared-types";

interface PermissionDialogProps {
  action: PlannedToolCall | null;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function PermissionDialog({ action, isOpen, onCancel, onConfirm }: PermissionDialogProps) {
  if (!isOpen || !action) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/15 bg-[#0d1526] p-6 shadow-[0_24px_100px_rgba(3,7,18,0.72)]">
        <div className="flex items-start gap-4">
          <div className="rounded-full border border-amber-300/20 bg-amber-300/10 p-3 text-amber-100">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.28em] text-amber-200/70">Permission Check</p>
            <h3 className="mt-1 text-xl font-semibold text-white">{action.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{action.rationale}</p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
              <div className="flex items-center gap-2 text-slate-100">
                <ShieldCheck className="h-4 w-4" />
                风险级别：{action.risk}
              </div>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-slate-400">
                {JSON.stringify(action.payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-200"
            onClick={() => {
              void onConfirm();
            }}
          >
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
}
