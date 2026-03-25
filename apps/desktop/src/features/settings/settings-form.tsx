"use client";

import { useState } from "react";
import { ALLOWED_APPS, ALLOWED_COMMANDS, WORKSPACE_ALIAS } from "@my-pet/shared-config";
import type { AppSettings, MemoryProfile, PermissionSettings } from "@my-pet/shared-types";

type SettingsTab = "general" | "pet" | "ai" | "permissions";

interface SettingsFormProps {
  settings: AppSettings;
  permissions: PermissionSettings;
  memory: MemoryProfile;
  onChangeSettings: (settings: AppSettings) => void;
  onChangePermissions: (permissions: PermissionSettings) => void;
  onChangeMemory: (memory: MemoryProfile) => void;
  onSave: () => Promise<void>;
}

function parseLineEntries(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDirectoryEntries(value: string) {
  return value
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ensureUniqueEntries(entries: string[]) {
  return Array.from(new Set(entries));
}

function getProjectName(projectPath: string) {
  const normalized = projectPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);

  return segments.at(-1) ?? projectPath;
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
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
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="h-5 w-5 accent-sky-400"
      />
    </label>
  );
}

export function SettingsForm({
  settings,
  permissions,
  memory,
  onChangeSettings,
  onChangePermissions,
  onChangeMemory,
  onSave
}: SettingsFormProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const favoriteProjectsInPermissions = memory.favoriteProjectPaths.filter((projectPath) =>
    permissions.allowedDirectories.includes(projectPath)
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      <aside className="rounded-[2rem] border border-white/12 bg-[#0f1728]/85 p-4 backdrop-blur-xl">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.28em] text-sky-200/70">Settings</p>
          <h1 className="text-lg font-semibold text-white">配置中心</h1>
        </div>

        <div className="space-y-2">
          {[
            ["general", "通用"],
            ["pet", "角色"],
            ["ai", "AI"],
            ["permissions", "权限"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                activeTab === value ? "bg-sky-400 text-slate-950" : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
              onClick={() => {
                setActiveTab(value as SettingsTab);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="mt-5 w-full rounded-full bg-emerald-300 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-emerald-200"
          onClick={() => {
            void onSave();
          }}
        >
          保存设置
        </button>
      </aside>

      <section className="rounded-[2rem] border border-white/12 bg-[#0f1728]/85 p-6 backdrop-blur-xl">
        {activeTab === "general" && (
          <div className="space-y-4">
            <SectionTitle title="通用" description="这一页先把开机启动、托盘、语言和快捷键收进统一配置里。" />

            <ToggleRow
              label="启用托盘"
              description="桌面端继续沿用 Tauri Tray，保留显示/隐藏/打开设置/退出入口。"
              checked={settings.general.enableTray}
              onChange={(checked) => {
                onChangeSettings({
                  ...settings,
                  general: {
                    ...settings.general,
                    enableTray: checked
                  }
                });
              }}
            />

            <ToggleRow
              label="开机启动"
              description="这版先只保存设置值，后续再接系统级开机自启。"
              checked={settings.general.launchOnStartup}
              onChange={(checked) => {
                onChangeSettings({
                  ...settings,
                  general: {
                    ...settings.general,
                    launchOnStartup: checked
                  }
                });
              }}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm font-medium text-white">语言</span>
                <select
                  className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
                  value={settings.general.language}
                  onChange={(event) => {
                    onChangeSettings({
                      ...settings,
                      general: {
                        ...settings.general,
                        language: event.target.value as AppSettings["general"]["language"]
                      }
                    });
                  }}
                >
                  <option value="zh-CN">中文</option>
                  <option value="en-US">English</option>
                </select>
              </label>

              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm font-medium text-white">全局快捷键</span>
                <input
                  className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
                  value={settings.general.assistantHotkey}
                  onChange={(event) => {
                    onChangeSettings({
                      ...settings,
                      general: {
                        ...settings.general,
                        assistantHotkey: event.target.value
                      }
                    });
                  }}
                />
              </label>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">用户记忆</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    第一版先保存称呼、对话偏好和常用项目路径，让聊天规划能带一点长期上下文。
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-xs leading-5 text-sky-100">
                  昵称会直接影响回复称呼。
                  <br />
                  偏好和项目路径先走本地 JSON，后面再升级到更完整的记忆层。
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <label className="rounded-2xl border border-white/10 bg-[#0b1220] p-4">
                  <span className="text-sm font-medium text-white">你的称呼</span>
                  <input
                    className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none"
                    value={memory.nickname}
                    placeholder="例如 乱之"
                    onChange={(event) => {
                      onChangeMemory({
                        ...memory,
                        nickname: event.target.value
                      });
                    }}
                  />
                </label>

                <label className="rounded-2xl border border-white/10 bg-[#0b1220] p-4">
                  <span className="text-sm font-medium text-white">对话偏好</span>
                  <textarea
                    rows={5}
                    className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-slate-100 outline-none"
                    value={memory.preferences.join("\n")}
                    placeholder={"每行一条，例如：\n偏好中文交流\n回答先给结论"}
                    onChange={(event) => {
                      onChangeMemory({
                        ...memory,
                        preferences: parseLineEntries(event.target.value)
                      });
                    }}
                  />
                </label>
              </div>

              <label className="mt-4 block rounded-2xl border border-white/10 bg-[#0b1220] p-4">
                <span className="text-sm font-medium text-white">常用项目路径</span>
                <textarea
                  rows={4}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-slate-100 outline-none"
                  value={memory.favoriteProjectPaths.join("\n")}
                  placeholder={"每行一个路径，例如：\nE:\\Onedrive\\Desktop\\Bongo"}
                  onChange={(event) => {
                    onChangeMemory({
                      ...memory,
                      favoriteProjectPaths: parseLineEntries(event.target.value)
                    });
                  }}
                />
                <p className="mt-2 text-xs text-slate-500">先手动维护即可，后续我们再把它接到更自动的项目识别和文件操作链路里。</p>
              </label>
            </div>
          </div>
        )}

        {activeTab === "pet" && (
          <div className="space-y-4">
            <SectionTitle title="角色" description="控制桌宠展示层的状态，优先覆盖透明度、镜像、置顶和点击穿透。" />

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="text-sm font-medium text-white">透明度 {settings.pet.opacity}%</label>
              <input
                type="range"
                min={35}
                max={100}
                value={settings.pet.opacity}
                onChange={(event) => {
                  onChangeSettings({
                    ...settings,
                    pet: {
                      ...settings.pet,
                      opacity: Number(event.target.value)
                    }
                  });
                }}
                className="mt-4 w-full accent-sky-400"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ToggleRow
                label="镜像模式"
                description="翻转角色朝向。"
                checked={settings.pet.mirrorMode}
                onChange={(checked) => {
                  onChangeSettings({
                    ...settings,
                    pet: {
                      ...settings.pet,
                      mirrorMode: checked
                    }
                  });
                }}
              />

              <ToggleRow
                label="窗口置顶"
                description="桌宠保持在其他窗口上方。"
                checked={settings.pet.alwaysOnTop}
                onChange={(checked) => {
                  onChangeSettings({
                    ...settings,
                    pet: {
                      ...settings.pet,
                      alwaysOnTop: checked
                    }
                  });
                }}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ToggleRow
                label="点击穿透"
                description="适合纯展示场景，交互时建议关闭。"
                checked={settings.pet.clickThrough}
                onChange={(checked) => {
                  onChangeSettings({
                    ...settings,
                    pet: {
                      ...settings.pet,
                      clickThrough: checked
                    }
                  });
                }}
              />

              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm font-medium text-white">Live2D 模型</span>
                <select
                  className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
                  value={settings.pet.modelId}
                  onChange={(event) => {
                    onChangeSettings({
                      ...settings,
                      pet: {
                        ...settings.pet,
                        modelId: event.target.value as AppSettings["pet"]["modelId"]
                      }
                    });
                  }}
                >
                  <option value="standard">standard</option>
                  <option value="keyboard">keyboard</option>
                  <option value="naximofu_2">naximofu_2</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="space-y-4">
            <SectionTitle title="AI" description="先把普通对话模型、Codex 开关、Base URL 和本地 agent-service 地址收进来。" />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm font-medium text-white">API Key</span>
                <input
                  type="password"
                  className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
                  value={settings.ai.apiKey}
                  onChange={(event) => {
                    onChangeSettings({
                      ...settings,
                      ai: {
                        ...settings.ai,
                        apiKey: event.target.value
                      }
                    });
                  }}
                />
              </label>

              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm font-medium text-white">Base URL</span>
                <input
                  className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
                  value={settings.ai.baseUrl}
                  onChange={(event) => {
                    onChangeSettings({
                      ...settings,
                      ai: {
                        ...settings.ai,
                        baseUrl: event.target.value
                      }
                    });
                  }}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm font-medium text-white">默认聊天模型</span>
                <input
                  className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
                  value={settings.ai.defaultModel}
                  placeholder="例如 gpt-4.1-mini"
                  onChange={(event) => {
                    onChangeSettings({
                      ...settings,
                      ai: {
                        ...settings.ai,
                        defaultModel: event.target.value
                      }
                    });
                  }}
                />
              </label>

              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm font-medium text-white">本地 agent-service</span>
                <input
                  className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
                  value={settings.ai.serviceUrl}
                  onChange={(event) => {
                    onChangeSettings({
                      ...settings,
                      ai: {
                        ...settings.ai,
                        serviceUrl: event.target.value
                      }
                    });
                  }}
                />
              </label>
            </div>

            <ToggleRow
              label="启用 Codex 路由"
              description="给后续代码、脚本和项目类任务预留入口。"
              checked={settings.ai.codexEnabled}
              onChange={(checked) => {
                onChangeSettings({
                  ...settings,
                  ai: {
                    ...settings.ai,
                    codexEnabled: checked
                  }
                });
              }}
            />

            <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-sm font-medium text-white">Codex 模型</span>
              <input
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none"
                value={settings.ai.codexModel}
                placeholder="例如 codex-mini-latest"
                onChange={(event) => {
                  onChangeSettings({
                    ...settings,
                    ai: {
                      ...settings.ai,
                      codexModel: event.target.value
                    }
                  });
                }}
              />
            </label>
          </div>
        )}

        {activeTab === "permissions" && (
          <div className="space-y-4">
            <SectionTitle title="权限" description="高风险操作要明确白名单，第一版先把允许的软件、目录和命令做出来。" />

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-sm font-medium text-white">允许打开的软件</div>
              <div className="grid gap-3 md:grid-cols-3">
                {ALLOWED_APPS.map((app) => (
                  <label key={app.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b1220] px-3 py-3">
                    <input
                      type="checkbox"
                      checked={permissions.allowedApps.includes(app.id)}
                      onChange={(event) => {
                        onChangePermissions({
                          ...permissions,
                          allowedApps: event.target.checked
                            ? [...permissions.allowedApps, app.id]
                            : permissions.allowedApps.filter((item) => item !== app.id)
                        });
                      }}
                      className="accent-sky-400"
                    />
                    <span className="text-sm text-slate-100">{app.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-sm font-medium text-white">允许访问的目录别名</div>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm leading-6 text-slate-100 outline-none"
                value={permissions.allowedDirectories.join("\n")}
                onChange={(event) => {
                  onChangePermissions({
                    ...permissions,
                    allowedDirectories: ensureUniqueEntries(parseDirectoryEntries(event.target.value))
                  });
                }}
              />
              <p className="mt-2 text-xs text-slate-400">
                默认用 `workspace` 代表当前项目根目录。支持每行一条，也支持用逗号分隔多个目录。
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white">常用项目路径联动</div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    这里会读取“用户记忆”里的常用项目。勾选后，聊天规划就能直接在这些项目里搜索文件。
                  </p>
                </div>

                {memory.favoriteProjectPaths.length > 0 && (
                  <button
                    type="button"
                    className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-2 text-xs text-sky-100 transition hover:bg-sky-300/20"
                    onClick={() => {
                      onChangePermissions({
                        ...permissions,
                        allowedDirectories: ensureUniqueEntries([
                          ...permissions.allowedDirectories,
                          ...memory.favoriteProjectPaths
                        ])
                      });
                    }}
                  >
                    全部加入白名单
                  </button>
                )}
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                  已允许目录 {permissions.allowedDirectories.length} 项
                </span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                  已联动常用项目 {favoriteProjectsInPermissions.length} 项
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                  工作区别名 {permissions.allowedDirectories.includes(WORKSPACE_ALIAS) ? "已启用" : "未启用"}
                </span>
              </div>

              <div className="space-y-3">
                {memory.favoriteProjectPaths.length > 0 ? (
                  memory.favoriteProjectPaths.map((projectPath) => {
                    const isAllowed = permissions.allowedDirectories.includes(projectPath);

                    return (
                      <label
                        key={projectPath}
                        className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-4"
                      >
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={(event) => {
                            onChangePermissions({
                              ...permissions,
                              allowedDirectories: event.target.checked
                                ? ensureUniqueEntries([...permissions.allowedDirectories, projectPath])
                                : permissions.allowedDirectories.filter((item) => item !== projectPath)
                            });
                          }}
                          className="mt-1 accent-sky-400"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm text-slate-100">{getProjectName(projectPath)}</div>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                isAllowed
                                  ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                                  : "border-amber-300/20 bg-amber-300/10 text-amber-100"
                              }`}
                            >
                              {isAllowed ? "已允许" : "未允许"}
                            </span>
                          </div>
                          <div className="mt-1 break-all text-xs leading-5 text-slate-400">{projectPath}</div>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                    还没有常用项目路径。先去“通用”页的用户记忆里加几条路径，这里就会自动出现联动开关。
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-sm font-medium text-white">允许执行的白名单命令</div>
              <div className="space-y-3">
                {ALLOWED_COMMANDS.map((command) => (
                  <label key={command.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#0b1220] px-3 py-3">
                    <input
                      type="checkbox"
                      checked={permissions.allowedCommands.includes(command.id)}
                      onChange={(event) => {
                        onChangePermissions({
                          ...permissions,
                          allowedCommands: event.target.checked
                            ? [...permissions.allowedCommands, command.id]
                            : permissions.allowedCommands.filter((item) => item !== command.id)
                        });
                      }}
                      className="mt-1 accent-sky-400"
                    />
                    <div>
                      <div className="text-sm text-slate-100">{command.label}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-400">{command.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <ToggleRow
              label="危险操作必须确认"
              description="建议保留开启，让桌宠先给计划，再由你点确认。"
              checked={permissions.dangerousActionConfirmation}
              onChange={(checked) => {
                onChangePermissions({
                  ...permissions,
                  dangerousActionConfirmation: checked
                });
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
