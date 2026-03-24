"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AppSettings, PermissionSettings } from "@my-pet/shared-types";
import { SettingsForm } from "@/features/settings/settings-form";
import { loadSettingsBundle, saveSettingsBundle } from "@/services/settings-client";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [permissions, setPermissions] = useState<PermissionSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const bundle = await loadSettingsBundle();
      setSettings(bundle.settings);
      setPermissions(bundle.permissions);
    };

    void bootstrap();
  }, []);

  if (!settings || !permissions) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(180deg,_#091120,_#0f1728)] px-5 py-8 text-slate-100">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/12 bg-[#0f1728]/85 p-8 backdrop-blur-xl">
          正在加载设置...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(234,179,8,0.14),_transparent_30%),linear-gradient(180deg,_#091120,_#0f1728)] px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.28em] text-sky-200/70">Desktop Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">My Pet Assistant 配置页</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            这一版优先把通用、角色、AI、权限四个页签打通，确保桌宠壳、agent-service 和本地权限策略能共享同一份配置。
          </p>
        </div>

        <SettingsForm
          settings={settings}
          permissions={permissions}
          onChangeSettings={setSettings}
          onChangePermissions={setPermissions}
          onSave={async () => {
            setIsSaving(true);
            try {
              await saveSettingsBundle({
                settings: {
                  ...settings,
                  permissions
                },
                permissions
              });
              toast.success("设置已保存");
            } catch (error) {
              toast.error(`保存失败: ${String(error)}`);
            } finally {
              setIsSaving(false);
            }
          }}
        />

        {isSaving && <div className="mt-4 text-sm text-slate-400">正在写入配置...</div>}
      </div>
    </main>
  );
}
