"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { AppSettings, PermissionSettings, SettingsBundle } from "@my-pet/shared-types";
import { loadSettingsBundle, saveSettingsBundle } from "@/services/settings-client";
import { isTauriRuntime } from "@/utils/tauri";

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
    <section className="rounded-[2rem] border border-white/12 bg-[#0f1728]/88 p-6 backdrop-blur-xl">
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

export default function SettingsPage() {
  const [bundle, setBundle] = useState<SettingsBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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

  const handleClose = async () => {
    if (isClosing) {
      return;
    }

    setIsClosing(true);

    try {
      if (isTauriRuntime()) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().close();
        return;
      }

      window.close();
    } catch (error) {
      toast.error(`关闭失败：${String(error)}`);
      setIsClosing(false);
    }
  };

  if (loadError) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(180deg,_#091120,_#0f1728)] px-5 py-8 text-slate-100">
        <div className="mx-auto max-w-4xl space-y-5">
          <section className="rounded-[2rem] border border-rose-300/20 bg-[#0f1728]/88 p-6 backdrop-blur-xl">
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
                void handleClose();
              }}
            >
              关闭
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!bundle) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(180deg,_#091120,_#0f1728)] px-5 py-8 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/12 bg-[#0f1728]/88 p-6 backdrop-blur-xl">
          正在加载设置...
        </div>
      </main>
    );
  }

  const { settings, permissions } = bundle;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(234,179,8,0.14),_transparent_30%),linear-gradient(180deg,_#091120,_#0f1728)] px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="rounded-[2rem] border border-white/12 bg-[#0f1728]/88 p-6 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/75">Desktop Settings</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">桌宠设置</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                这里只保留当前桌宠运行必须的设置项，避免再走原来那套重表单导致空白和卡顿。
              </p>
            </div>

            <button
              type="button"
              className="rounded-full border border-white/16 bg-white/5 px-5 py-3 text-sm text-slate-100 transition hover:bg-white/10"
              disabled={isClosing}
              onClick={() => {
                void handleClose();
              }}
            >
              {isClosing ? "关闭中..." : "关闭"}
            </button>
          </div>
        </header>

        <Section title="桌宠外观" description="控制透明度、模型和窗口交互方式。">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-sm font-medium text-white">透明度 {settings.pet.opacity}%</label>
            <input
              type="range"
              min={35}
              max={100}
              value={settings.pet.opacity}
              onChange={(event) => {
                updateSettings((current) => ({
                  ...current,
                  pet: {
                    ...current.pet,
                    opacity: Number(event.target.value)
                  }
                }));
              }}
              className="mt-4 w-full accent-cyan-300"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ToggleRow
              label="始终置顶"
              description="让桌宠保持在其他窗口上层。"
              checked={settings.pet.alwaysOnTop}
              onChange={(checked) => {
                updateSettings((current) => ({
                  ...current,
                  pet: {
                    ...current.pet,
                    alwaysOnTop: checked
                  }
                }));
              }}
            />

            <ToggleRow
              label="点击穿透"
              description="只适合纯展示状态，开启后桌宠将无法直接交互。"
              checked={settings.pet.clickThrough}
              onChange={(checked) => {
                updateSettings((current) => ({
                  ...current,
                  pet: {
                    ...current.pet,
                    clickThrough: checked
                  }
                }));
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ToggleRow
              label="镜像显示"
              description="翻转桌宠朝向。"
              checked={settings.pet.mirrorMode}
              onChange={(checked) => {
                updateSettings((current) => ({
                  ...current,
                  pet: {
                    ...current.pet,
                    mirrorMode: checked
                  }
                }));
              }}
            />

            <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-sm font-medium text-white">桌宠模型</span>
              <select
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
                value={settings.pet.modelId}
                onChange={(event) => {
                  updateSettings((current) => ({
                    ...current,
                    pet: {
                      ...current.pet,
                      modelId: event.target.value as AppSettings["pet"]["modelId"]
                    }
                  }));
                }}
              >
                <option value="ink_cat">ink_cat</option>
                <option value="standard">standard</option>
                <option value="keyboard">keyboard</option>
                <option value="naximofu_2">naximofu_2</option>
              </select>
            </label>
          </div>
        </Section>

        <Section title="通用设置" description="这里只保留会直接影响桌宠使用体验的项目。">
          <div className="grid gap-4 md:grid-cols-2">
            <ToggleRow
              label="系统托盘"
              description="保留托盘入口，方便从系统区重新打开窗口。"
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

            <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-sm font-medium text-white">语言</span>
              <select
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
                value={settings.general.language}
                onChange={(event) => {
                  updateSettings((current) => ({
                    ...current,
                    general: {
                      ...current.general,
                      language: event.target.value as AppSettings["general"]["language"]
                    }
                  }));
                }}
              >
                <option value="zh-CN">中文</option>
                <option value="en-US">English</option>
              </select>
            </label>
          </div>

          <label className="block rounded-2xl border border-white/10 bg-white/5 p-4">
            <span className="text-sm font-medium text-white">助手快捷键</span>
            <input
              className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
              value={settings.general.assistantHotkey}
              onChange={(event) => {
                updateSettings((current) => ({
                  ...current,
                  general: {
                    ...current.general,
                    assistantHotkey: event.target.value
                  }
                }));
              }}
            />
          </label>
        </Section>

        <Section title="权限确认" description="保留高风险操作确认，避免误触发。">
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-white/12 bg-[#0f1728]/88 p-5 backdrop-blur-xl">
          <div className="text-sm text-slate-300">
            {isSaving ? "正在保存..." : "保存后会立即同步到桌宠窗口。"}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-full border border-white/16 bg-white/5 px-5 py-3 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isClosing}
              onClick={() => {
                void handleClose();
              }}
            >
              返回桌宠
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
