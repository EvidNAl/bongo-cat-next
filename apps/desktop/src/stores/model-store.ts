import { create } from "zustand";
import { resolveResource } from "@tauri-apps/api/path";
import { isTauriRuntime } from "@/utils/tauri";

export type ModelMode = "standard" | "keyboard" | "handle" | "sprite" | "interactive";

export interface Model {
  id: string;
  name: string;
  path: string;
  mode: ModelMode;
  isPreset: boolean;
  modelName: string;
  previewSrc?: string;
}

export interface Motion {
  Name: string;
  File: string;
  Sound?: string;
  FadeInTime: number;
  FadeOutTime: number;
  Description?: string;
}

export type MotionGroup = Record<string, Motion[]>;

export interface Expression {
  Name: string;
  File: string;
  Description?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  path: string;
  mode: ModelMode;
  isPreset: boolean;
  modelName: string;
  previewSrc?: string;
}

export interface ModelStoreState {
  models: Record<string, Model>;
  currentModel: Model | null;
  preferredModelId: string | null;
  initializeModels: () => Promise<void>;
  setCurrentModel: (id: string) => void;
}

export const useModelStore = create<ModelStoreState>()((set, get) => ({
  models: {},
  currentModel: null,
  preferredModelId: null,
  initializeModels: async () => {
    const presetModels: Model[] = [
      {
        id: "ink_cat",
        name: "Ink Cat",
        path: "",
        mode: "interactive",
        isPreset: true,
        modelName: ""
      },
      {
        id: "standard",
        name: "鼠标模式",
        path: "assets/models/standard",
        mode: "standard",
        isPreset: true,
        modelName: "cat.model3.json"
      },
      {
        id: "keyboard",
        name: "键盘模式",
        path: "assets/models/keyboard",
        mode: "keyboard",
        isPreset: true,
        modelName: "cat.model3.json"
      },
      {
        id: "naximofu_2",
        name: "Naximofu",
        path: "",
        mode: "sprite",
        isPreset: true,
        modelName: "",
        previewSrc: "/img/naximofu_2.gif"
      }
    ];

    // Always resolve model directories from bundled resources to avoid
    // platform-specific relative path behavior differences.
    const resolvedModels = await Promise.all(
      presetModels.map(async (model) => ({
        ...model,
        path: isTauriRuntime() && model.mode !== "sprite" && model.mode !== "interactive" ? await resolveResource(model.path) : model.path
      }))
    );

    const initialModels = resolvedModels.reduce<Record<string, Model>>((acc, model) => {
      acc[model.id] = model;
      return acc;
    }, {});
    const preferredModelId = get().preferredModelId;
    const preferredModel =
      preferredModelId !== null ? resolvedModels.find((model) => model.id === preferredModelId) ?? null : null;

    set({
      models: initialModels,
      currentModel: preferredModel ?? Object.values(initialModels)[0]
    });
  },
  setCurrentModel: (id: string) => {
    const model = Object.values(get().models).find((item) => item.id === id) ?? null;
    set({
      preferredModelId: id,
      currentModel: model ?? get().currentModel
    });
  }
}));
