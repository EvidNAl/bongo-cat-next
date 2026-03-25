import { convertFileSrc } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import type { Cubism4InternalModel, CubismSpec } from "pixi-live2d-display";
import { Cubism4ModelSettings, Live2DModel } from "pixi-live2d-display";
import { Application, Ticker } from "pixi.js";
import "@/types/live2d";
import { join } from "./path";

Live2DModel.registerTicker(Ticker);

class Live2d {
  private app: Application | null = null;
  public model: Live2DModel | null = null;
  private currentLowPowerMode = false;

  private mount(view: HTMLCanvasElement, lowPowerMode: boolean) {
    this.currentLowPowerMode = lowPowerMode;
    this.app = new Application({
      view,
      resizeTo: window,
      backgroundAlpha: 0,
      autoDensity: true,
      resolution: lowPowerMode ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
    });
  }

  public async load(
    path: string,
    modelName: string,
    canvas: HTMLCanvasElement,
    options?: { lowPower?: boolean }
  ) {
    const lowPowerMode = options?.lowPower ?? false;

    if (!this.app || this.currentLowPowerMode !== lowPowerMode) {
      this.destroy(true);
      this.mount(canvas, lowPowerMode);
    }

    if (this.model) {
      this.model.destroy();
      this.model = null;
    }

    if (this.app) {
      this.app.stage.removeChildren();
    }

    const modelPath = join(path, modelName);
    const modelJSON = JSON.parse(await readTextFile(modelPath)) as CubismSpec.ModelJSON;

    const modelSettings = new Cubism4ModelSettings({
      ...modelJSON,
      url: convertFileSrc(modelPath)
    });

    modelSettings.replaceFiles((file: string) => convertFileSrc(join(path, file)));

    this.model = await Live2DModel.from(modelSettings);
    this.model.anchor.set(0.5, 0.5);

    this.app?.stage.addChild(this.model);

    const { motions, expressions } = modelSettings;
    return {
      motions,
      expressions
    };
  }

  public resize() {
    if (!this.app || !this.model) {
      return;
    }

    this.app.resize();
  }

  public destroy(destroyApp: boolean = true) {
    if (this.model) {
      this.model.destroy();
      this.model = null;
    }

    if (destroyApp && this.app) {
      this.app.destroy(true);
      this.app = null;
    }
  }

  public playMotion(group: string, index?: number) {
    return this.model?.motion(group, index);
  }

  public playExpression(index: number) {
    return this.model?.expression(index);
  }

  public getCoreModel() {
    if (!this.model) {
      return null;
    }

    const internalModel = this.model.internalModel as Cubism4InternalModel;
    return internalModel.coreModel;
  }

  public getParameterRange(id: string) {
    const coreModel = this.getCoreModel();
    if (!coreModel) {
      return { min: undefined, max: undefined };
    }

    const index = coreModel.getParameterIndex(id);
    return {
      min: coreModel.getParameterMinimumValue(index),
      max: coreModel.getParameterMaximumValue(index)
    };
  }

  public setParameterValue(id: string, value: number) {
    const coreModel = this.getCoreModel();
    if (!coreModel) {
      return;
    }

    coreModel.setParameterValueById(id, Number(value));
  }
}

const live2d = new Live2d();

export default live2d;
