"use client";

import { useState } from "react";
import { Bot, CornerDownLeft, LoaderCircle, Settings2, Sparkles, User2 } from "lucide-react";
import type { ChatMessage, PlannedToolCall } from "@my-pet/shared-types";

interface ChatPanelProps {
  messages: ChatMessage[];
  isSending: boolean;
  serviceReachable: boolean;
  onSend: (message: string) => Promise<void>;
  onExecuteAction: (action: PlannedToolCall) => void;
  onOpenSettings: () => void;
}

function formatMessageTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getMessageMeta(message: ChatMessage) {
  if (message.id === "welcome") {
    return "系统消息";
  }

  return formatMessageTime(message.createdAt);
}

export function ChatPanel({ messages, isSending, serviceReachable, onSend, onExecuteAction, onOpenSettings }: ChatPanelProps) {
  const [draft, setDraft] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextValue = draft.trim();
    if (!nextValue || isSending) {
      return;
    }

    setDraft("");
    await onSend(nextValue);
  };

  return (
    <section className="flex min-h-[420px] flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-[#0e1627]/85 shadow-[0_20px_70px_rgba(7,10,23,0.42)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/65">Assistant</p>
          <h2 className="text-lg font-semibold text-white">聊天与任务编排</h2>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs ${
              serviceReachable
                ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                : "border-amber-300/20 bg-amber-300/10 text-amber-100"
            }`}
          >
            {serviceReachable ? "agent-service 在线" : "agent-service 离线"}
          </span>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/12"
            onClick={onOpenSettings}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`rounded-3xl border p-4 ${
              message.role === "user"
                ? "ml-8 border-sky-300/20 bg-sky-400/10 text-sky-50"
                : "mr-8 border-white/10 bg-white/6 text-slate-100"
            }`}
          >
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-300/75">
              {message.role === "user" ? <User2 className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              <span>{message.role === "user" ? "You" : "Pet Assistant"}</span>
              <span>{getMessageMeta(message)}</span>
            </div>

            <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>

            {message.actions && message.actions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {message.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-50 transition hover:bg-cyan-300/18"
                    onClick={() => {
                      onExecuteAction(action);
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    {action.title}
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}

        {isSending && (
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            正在整理计划...
          </div>
        )}
      </div>

      <form
        className="border-t border-white/10 px-5 py-4"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-3">
          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            rows={3}
            placeholder='例如：打开 VS Code；打开 https://platform.openai.com；执行 git status；在 "workspace" 搜索 README'
            className="w-full resize-none bg-transparent text-sm leading-6 text-slate-50 outline-none placeholder:text-slate-400"
          />

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-400">桌宠先给计划，再由你确认关键动作。</p>
            <button
              type="submit"
              disabled={!draft.trim() || isSending}
              className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CornerDownLeft className="h-4 w-4" />
              发送
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
