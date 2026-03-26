"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { AppSettings, PermissionSettings, SettingsBundle } from "@my-pet/shared-types";
import { loadSettingsBundle, saveSettingsBundle } from "@/services/settings-client";
import { showAssistantWindow } from "@/services/tauri-client";

function Section({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="manager-panel rounded-[2rem] p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="mt-1 text-xs leading-5 text-slate-400">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="h-5 w-5 accent-cyan-300"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="text-sm font-medium text-white">{label}</span>
      <input
        className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="text-sm font-medium text-white">{label}</span>
      <select
        className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function SettingsPage() {
  const [bundle, setBundle] = useState<SettingsBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const nextBundle = await loadSettingsBundle();

        if (cancelled) {
          return;
        }

        setBundle(nextBundle);
        setLoadError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLoadError(String(error));
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = (updater: (current: AppSettings) => AppSettings) => {
    setBundle((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        settings: updater(current.settings)
      };
    });
  };

  const updatePermissions = (updater: (current: PermissionSettings) => PermissionSettings) => {
    setBundle((current) => {
      if (!current) {
        return current;
      }

      const nextPermissions = updater(current.permissions);

      return {
        permissions: nextPermissions,
        settings: {
          ...current.settings,
          permissions: nextPermissions
        }
      };
    });
  };

  const handleSave = async () => {
    if (!bundle) {
      return;
    }

    setIsSaving(true);

    try {
      const savedBundle = await saveSettingsBundle(bundle);
      setBundle(savedBundle);
      toast.success("设置已保存。");
    } catch (error) {
      toast.error(`保存失败：${String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = async () => {
    if (isLeaving) {
      return;
    }

    setIsLeaving(true);

    try {
      await showAssistantWindow();
    } catch (error) {
      toast.error(`返回管理台失败：${String(error)}`);
      setIsLeaving(false);
    }
  };

  if (loadError) {
    return (
      <main className="manager-shell min-h-screen px-5 py-8 text-slate-100">
        <div className="mx-auto max-w-4xl space-y-5">
          <section className="manager-panel rounded-[2rem] p-6">
            <h1 className="text-2xl font-semibold text-white">设置加载失败</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">{loadError}</p>
          </section>

          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200"
              onClick={() => {
                window.location.reload();
              }}
            >
              重新加载
            </button>
            <button
              type="button"
              className="rounded-full border border-white/16 bg-white/5 px-5 py-3 text-sm text-slate-100 transition hover:bg-white/10"
              onClick={() => {
                void handleBack();
              }}
            >
              返回管理台
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!bundle) {
    return (
      <main className="manager-shell min-h-screen px-5 py-8 text-slate-100">
        <div className="manager-panel mx-auto max-w-4xl rounded-[2rem] p-6">
          正在加载设置...
        </div>
      </main>
    );
  }

  const { settings, permissions } = bundle;

  return (
    <main className="manager-shell min-h-screen px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="manager-panel rounded-[2rem] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/75">Manager Settings</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">管理端设置</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                这里只保留管理端本身会直接使用到的设置。桌宠外观、动画和交互设置已经迁移到独立的 PyQt5 桌宠程序。
              </p>
            </div>

            <button
              type="button"
              className="rounded-full border border-white/16 bg-white/5 px-5 py-3 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLeaving}
              onClick={() => {
                void handleBack();
              }}
            >
              {isLeaving ? "返回中..." : "返回管理台"}
            </button>
          </div>
        </header>

        <Section
          title="桌宠协同"
          description="Manager 负责管理进程、保存共享配置和连接 Codex。桌宠本体由独立的 PyQt5 程序负责。"
        >
          <div className="manager-panel-soft rounded-2xl p-4 text-sm leading-6 text-slate-200">
            Manager 保存的配置仍会写回共享的 <code>settings.json</code>，桌宠程序会继续读取同一份配置。
          </div>
        </Section>

        <Section title="管理端" description="控制 Manager 自己的行为和基础交互。">
          <div className="grid gap-4 md:grid-cols-2">
            <ToggleRow
              label="系统托盘"
              description="保留系统托盘入口。关闭主窗口时不会再隐藏到后台，而是直接退出程序。"
              checked={settings.general.enableTray}
              onChange={(checked) => {
                updateSettings((current) => ({
                  ...current,
                  general: {
                    ...current.general,
                    enableTray: checked
                  }
                }));
              }}
            />

            <ToggleRow
              label="启动时注册 Codex 路由"
              description="允许 Manager 把部分请求路由给配置中的 Codex 模型。"
              checked={settings.ai.codexEnabled}
              onChange={(checked) => {
                updateSettings((current) => ({
                  ...current,
                  ai: {
                    ...current.ai,
                    codexEnabled: checked
                  }
                }));
              }}
            />

            <SelectField
              label="界面语言"
              value={settings.general.language}
              onChange={(value) => {
                updateSettings((current) => ({
                  ...current,
                  general: {
                    ...current.general,
                    language: value as AppSettings["general"]["language"]
                  }
                }));
              }}
              options={[
                { value: "zh-CN", label: "中文" },
                { value: "en-US", label: "English" }
              ]}
            />

            <TextField
              label="助手快捷键"
              value={settings.general.assistantHotkey}
              onChange={(value) => {
                updateSettings((current) => ({
                  ...current,
                  general: {
                    ...current.general,
                    assistantHotkey: value
                  }
                }));
              }}
            />
          </div>
        </Section>

        <Section title="Codex / agent-service" description="管理本地服务地址和模型连接参数。">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="API Key"
              value={settings.ai.apiKey}
              onChange={(value) => {
                updateSettings((current) => ({
                  ...current,
                  ai: {
                    ...current.ai,
                    apiKey: value
                  }
                }));
              }}
            />

            <TextField
              label="Base URL"
              value={settings.ai.baseUrl}
              onChange={(value) => {
                updateSettings((current) => ({
                  ...current,
                  ai: {
                    ...current.ai,
                    baseUrl: value
                  }
                }));
              }}
            />

            <TextField
              label="默认模型"
              value={settings.ai.defaultModel}
              onChange={(value) => {
                updateSettings((current) => ({
                  ...current,
                  ai: {
                    ...current.ai,
                    defaultModel: value
                  }
                }));
              }}
            />

            <TextField
              label="agent-service 地址"
              value={settings.ai.serviceUrl}
              onChange={(value) => {
                updateSettings((current) => ({
                  ...current,
                  ai: {
                    ...current.ai,
                    serviceUrl: value
                  }
                }));
              }}
            />

            <TextField
              label="Codex 模型"
              value={settings.ai.codexModel}
              onChange={(value) => {
                updateSettings((current) => ({
                  ...current,
                  ai: {
                    ...current.ai,
                    codexModel: value
                  }
                }));
              }}
            />
          </div>
        </Section>

        <Section title="权限确认" description="保留高风险动作确认，避免误触发。">
          <ToggleRow
            label="危险操作需要确认"
            description="建议保持开启，避免误执行高风险动作。"
            checked={permissions.dangerousActionConfirmation}
            onChange={(checked) => {
              updatePermissions((current) => ({
                ...current,
                dangerousActionConfirmation: checked
              }));
            }}
          />
        </Section>

        <div className="manager-panel flex flex-wrap items-center justify-between gap-3 rounded-[2rem] p-5">
          <div className="text-sm text-slate-300">
            {isSaving ? "正在保存..." : "保存后会立即同步到 Manager，并写回共享配置文件。"}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-full border border-white/16 bg-white/5 px-5 py-3 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLeaving}
              onClick={() => {
                void handleBack();
              }}
            >
              返回
            </button>
            <button
              type="button"
              className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-300/60"
              disabled={isSaving}
              onClick={() => {
                void handleSave();
              }}
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
