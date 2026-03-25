"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PhysicalPosition, cursorPosition, currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { isTauriRuntime } from "@/utils/tauri";

type PetMood = "sleeping" | "watching" | "petting" | "fed" | "playful" | "clingy";
type EffectKind = "heart" | "spark" | "snack";

interface FloatingEffect {
  id: string;
  kind: EffectKind;
  x: number;
  y: number;
  rotate: number;
}

interface WindowPosition {
  x: number;
  y: number;
}

interface WindowSize {
  width: number;
  height: number;
}

interface WorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TauriWindowHandle {
  outerSize: () => Promise<WindowSize>;
  outerPosition: () => Promise<WindowPosition>;
  setPosition: (position: PhysicalPosition) => Promise<void>;
}

interface InkCatPetProps {
  mode?: "stage" | "pet";
  mirrored?: boolean;
  opacity?: number;
  className?: string;
}

const PET_LINES: Record<PetMood, string[]> = {
  sleeping: ["呼噜...", "先睡一会。", "我在打盹。"],
  watching: ["跟着你走，双击我就停。", "你动一下，我就追一下。", "别跑太快。"],
  petting: ["这里摸得刚刚好。", "呼噜呼噜。", "再摸一下。"],
  fed: ["小鱼干收到。", "这口很满足。", "吃完更有精神了。"],
  playful: ["球呢，再来一轮。", "我还没玩够。", "继续逗我。"],
  clingy: ["你停下来了，那我来撒娇。", "别走，陪我一会。", "看看我，我就不闹。"]
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function pick<TValue>(items: TValue[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function ActionButton({
  label,
  active = false,
  onClick
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-3.5 py-2 text-xs text-slate-100 transition",
        active
          ? "border-cyan-200/80 bg-cyan-200 text-slate-950 shadow-[0_10px_30px_rgba(103,232,249,0.28)]"
          : "border-white/14 bg-slate-950/40 hover:bg-slate-950/55"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function EffectGlyph({ kind }: { kind: EffectKind }) {
  if (kind === "heart") {
    return <Heart className="h-4 w-4 fill-rose-300 text-rose-300" />;
  }

  if (kind === "spark") {
    return <Sparkles className="h-4 w-4 text-cyan-200" />;
  }

  return <div className="h-2.5 w-5 rounded-full bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.35)]" />;
}

export function InkCatPet({
  mode = "stage",
  mirrored = false,
  opacity = 100,
  className
}: InkCatPetProps) {
  const tauriRuntime = isTauriRuntime();
  const globalFollowAvailable = tauriRuntime && mode === "pet";
  const [followEnabled, setFollowEnabled] = useState(false);
  const [mood, setMood] = useState<PetMood>("sleeping");
  const [speech, setSpeech] = useState(() => pick(PET_LINES.sleeping));
  const [affection, setAffection] = useState(90);
  const [satiety, setSatiety] = useState(70);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [effects, setEffects] = useState<FloatingEffect[]>([]);

  const lastMoveAtRef = useRef(Date.now());
  const lastReactionAtRef = useRef(0);
  const reactionTimerRef = useRef<number | null>(null);
  const effectTimerRef = useRef<Map<string, number>>(new Map());

  const currentWindowRef = useRef<TauriWindowHandle | null>(null);
  const windowSizeRef = useRef<WindowSize>({ width: 420, height: 420 });
  const windowPositionRef = useRef<WindowPosition | null>(null);
  const workAreaRef = useRef<WorkArea | null>(null);
  const followTargetRef = useRef<WindowPosition | null>(null);
  const followIntervalRef = useRef<number | null>(null);
  const moveInFlightRef = useRef(false);
  const lastCursorRef = useRef<WindowPosition | null>(null);

  const setBaselineState = useCallback(
    (withSpeech = true) => {
      const nextMood: PetMood = followEnabled ? "watching" : "sleeping";
      setMood(nextMood);

      if (withSpeech) {
        setSpeech(pick(PET_LINES[nextMood]));
      }

      if (!followEnabled) {
        setGaze({ x: 0, y: 0 });
      }
    },
    [followEnabled]
  );

  const pushEffects = useCallback((kind: EffectKind, count = 2) => {
    const batch = Array.from({ length: count }, () => ({
      id: crypto.randomUUID(),
      kind,
      x: randomBetween(-78, 78),
      y: randomBetween(-34, 22),
      rotate: randomBetween(-18, 18)
    }));

    setEffects((current) => [...current, ...batch].slice(-16));

    for (const effect of batch) {
      const timeoutId = window.setTimeout(() => {
        setEffects((current) => current.filter((item) => item.id !== effect.id));
        effectTimerRef.current.delete(effect.id);
      }, 1100);

      effectTimerRef.current.set(effect.id, timeoutId);
    }
  }, []);

  const applyReaction = useCallback(
    ({
      nextMood,
      speechLine,
      effectKind,
      effectCount = 2,
      affectionDelta = 0,
      satietyDelta = 0,
      duration = 1800
    }: {
      nextMood: PetMood;
      speechLine?: string;
      effectKind?: EffectKind;
      effectCount?: number;
      affectionDelta?: number;
      satietyDelta?: number;
      duration?: number;
    }) => {
      setMood(nextMood);
      setSpeech(speechLine ?? pick(PET_LINES[nextMood]));
      setAffection((current) => clamp(current + affectionDelta, 0, 100));
      setSatiety((current) => clamp(current + satietyDelta, 0, 100));
      lastReactionAtRef.current = Date.now();

      if (effectKind) {
        pushEffects(effectKind, effectCount);
      }

      if (reactionTimerRef.current) {
        window.clearTimeout(reactionTimerRef.current);
      }

      reactionTimerRef.current = window.setTimeout(() => {
        setBaselineState();
      }, duration);
    },
    [pushEffects, setBaselineState]
  );

  const updateGaze = useCallback((ratioX: number, ratioY: number) => {
    setGaze({
      x: clamp(ratioX, -1, 1),
      y: clamp(ratioY, -1, 1)
    });
  }, []);

  const clampWindowPosition = useCallback((target: WindowPosition) => {
    const workArea = workAreaRef.current;
    const { width, height } = windowSizeRef.current;

    if (!workArea) {
      return target;
    }

    return {
      x: clamp(target.x, workArea.x, workArea.x + workArea.width - width),
      y: clamp(target.y, workArea.y, workArea.y + workArea.height - height)
    };
  }, []);

  const computeFollowTarget = useCallback(
    (cursorX: number, cursorY: number) => {
      const { width, height } = windowSizeRef.current;
      const rawTarget = {
        x: Math.round(cursorX - width * 0.36),
        y: Math.round(cursorY - height * 0.78)
      };

      return clampWindowPosition(rawTarget);
    },
    [clampWindowPosition]
  );

  const stepFollowWindow = useCallback(async () => {
    const appWindow = currentWindowRef.current;
    const currentPosition = windowPositionRef.current;
    const targetPosition = followTargetRef.current;

    if (!appWindow || !currentPosition || !targetPosition || moveInFlightRef.current) {
      return;
    }

    const dx = targetPosition.x - currentPosition.x;
    const dy = targetPosition.y - currentPosition.y;

    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
      return;
    }

    const nextPosition = {
      x: Math.round(currentPosition.x + dx * 0.18),
      y: Math.round(currentPosition.y + dy * 0.18)
    };

    moveInFlightRef.current = true;

    try {
      await appWindow.setPosition(new PhysicalPosition(nextPosition.x, nextPosition.y));
      windowPositionRef.current = nextPosition;
    } finally {
      moveInFlightRef.current = false;
    }
  }, []);

  const tickFollow = useCallback(async () => {
    if (!followEnabled || !globalFollowAvailable) {
      return;
    }

    try {
      const cursor = await cursorPosition();
      const lastCursor = lastCursorRef.current;

      if (!lastCursor || lastCursor.x !== cursor.x || lastCursor.y !== cursor.y) {
        lastCursorRef.current = { x: cursor.x, y: cursor.y };
        lastMoveAtRef.current = Date.now();
        followTargetRef.current = computeFollowTarget(cursor.x, cursor.y);

        const width = Math.max(window.screen.width, 1);
        const height = Math.max(window.screen.height, 1);
        updateGaze((cursor.x / width) * 2 - 1, (cursor.y / height) * 2 - 1);
        setMood((current) => (current === "clingy" || current === "sleeping" ? "watching" : current));
      }

      await stepFollowWindow();
    } catch {
      // Ignore transient cursor polling failures.
    }
  }, [computeFollowTarget, followEnabled, globalFollowAvailable, stepFollowWindow, updateGaze]);

  useEffect(() => {
    setBaselineState();
  }, [setBaselineState]);

  useEffect(() => {
    if (!followEnabled || !globalFollowAvailable) {
      if (followIntervalRef.current) {
        window.clearInterval(followIntervalRef.current);
        followIntervalRef.current = null;
      }

      lastCursorRef.current = null;
      followTargetRef.current = null;
      moveInFlightRef.current = false;
      return;
    }

    let disposed = false;

    const bootstrap = async () => {
      try {
        currentWindowRef.current = getCurrentWindow() as unknown as TauriWindowHandle;

        const appWindow = currentWindowRef.current;
        const [size, position, monitor, cursor] = await Promise.all([
          appWindow.outerSize(),
          appWindow.outerPosition(),
          currentMonitor(),
          cursorPosition()
        ]);

        if (disposed) {
          return;
        }

        windowSizeRef.current = { width: size.width, height: size.height };
        windowPositionRef.current = { x: position.x, y: position.y };
        workAreaRef.current = monitor
          ? {
              x: monitor.workArea.position.x,
              y: monitor.workArea.position.y,
              width: monitor.workArea.size.width,
              height: monitor.workArea.size.height
            }
          : null;
        lastCursorRef.current = { x: cursor.x, y: cursor.y };
        followTargetRef.current = computeFollowTarget(cursor.x, cursor.y);

        if (followIntervalRef.current) {
          window.clearInterval(followIntervalRef.current);
        }

        followIntervalRef.current = window.setInterval(() => {
          void tickFollow();
        }, 32);
      } catch {
        if (disposed) {
          return;
        }

        setFollowEnabled(false);
        setMood("sleeping");
        setSpeech("当前环境不支持跟随。");
        setGaze({ x: 0, y: 0 });
      }
    };

    void bootstrap();

    return () => {
      disposed = true;

      if (followIntervalRef.current) {
        window.clearInterval(followIntervalRef.current);
        followIntervalRef.current = null;
      }

      lastCursorRef.current = null;
      followTargetRef.current = null;
      moveInFlightRef.current = false;
    };
  }, [computeFollowTarget, followEnabled, globalFollowAvailable, tickFollow]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!followEnabled) {
        return;
      }

      const idleFor = Date.now() - lastMoveAtRef.current;
      const recentReaction = Date.now() - lastReactionAtRef.current < 1400;

      if (idleFor > 1500 && !recentReaction && mood !== "clingy") {
        applyReaction({
          nextMood: "clingy",
          speechLine: pick(PET_LINES.clingy),
          effectKind: "heart",
          effectCount: 2,
          affectionDelta: 1,
          duration: 2200
        });
      }
    }, 300);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [applyReaction, followEnabled, mood]);

  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) {
        window.clearTimeout(reactionTimerRef.current);
      }

      if (followIntervalRef.current) {
        window.clearInterval(followIntervalRef.current);
      }

      for (const timeoutId of effectTimerRef.current.values()) {
        window.clearTimeout(timeoutId);
      }

      effectTimerRef.current.clear();
    };
  }, []);

  const handlePet = useCallback(() => {
    applyReaction({
      nextMood: "petting",
      effectKind: "heart",
      affectionDelta: 2,
      duration: 1600
    });
  }, [applyReaction]);

  const handleFeed = useCallback(() => {
    applyReaction({
      nextMood: "fed",
      effectKind: "snack",
      effectCount: 3,
      affectionDelta: 1,
      satietyDelta: 8,
      duration: 2000
    });
  }, [applyReaction]);

  const handlePlay = useCallback(() => {
    applyReaction({
      nextMood: "playful",
      effectKind: "spark",
      effectCount: 3,
      affectionDelta: 2,
      satietyDelta: -2,
      duration: 1700
    });
  }, [applyReaction]);

  const handleFollowToggle = useCallback(() => {
    lastMoveAtRef.current = Date.now();
    lastReactionAtRef.current = Date.now();
    setFollowEnabled((current) => !current);
  }, []);

  const handleSurfaceMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!followEnabled || globalFollowAvailable) {
      return;
    }

    lastMoveAtRef.current = Date.now();

    const rect = event.currentTarget.getBoundingClientRect();
    const ratioX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ratioY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    updateGaze(ratioX, ratioY);
    setMood((current) => (current === "clingy" || current === "sleeping" ? "watching" : current));
  };

  const handleSurfaceLeave = () => {
    if (!followEnabled || !globalFollowAvailable) {
      setGaze({ x: 0, y: 0 });
    }
  };

  const pupilX = followEnabled ? gaze.x * 3 : 0;
  const pupilY = followEnabled ? gaze.y * 1.8 : 0;
  const sleeping = mood === "sleeping";
  const eyesClosed = sleeping || mood === "petting" || mood === "fed";
  const playfulFace = mood === "playful";
  const clingyFace = mood === "clingy";
  const showStatusHud = mode !== "pet";
  const hideActionDock = mode === "pet" && followEnabled;
  const headTransform = sleeping
    ? "translate(0 10) rotate(10 126 118)"
    : clingyFace
      ? "translate(0 -2) rotate(-7 126 118)"
      : playfulFace
        ? "translate(0 -5) rotate(6 126 118)"
        : "translate(0 -3) rotate(-2 126 118)";

  return (
    <section
      className={cn("relative h-full w-full overflow-hidden", className)}
      onPointerMove={handleSurfaceMove}
      onPointerLeave={handleSurfaceLeave}
    >
      {showStatusHud && (
        <div className="absolute left-4 top-4 z-20 flex gap-2">
          <div className="rounded-full border border-white/12 bg-slate-950/56 px-3 py-1 text-[11px] text-slate-100 backdrop-blur">
            亲密 {affection}
          </div>
          <div className="rounded-full border border-white/12 bg-slate-950/56 px-3 py-1 text-[11px] text-slate-100 backdrop-blur">
            饱食 {satiety}
          </div>
        </div>
      )}

      {showStatusHud && (
        <div className="absolute right-4 top-4 z-20 rounded-full border border-white/12 bg-slate-950/56 px-3 py-1 text-[11px] text-slate-100 backdrop-blur">
          {sleeping ? "睡觉中" : followEnabled ? "跟随观察" : "互动中"}
        </div>
      )}

      <div className="absolute inset-x-0 top-16 z-20 flex justify-center px-4">
        <div
          className={cn(
            "rounded-full border px-4 py-2 text-center text-sm text-slate-100 shadow-[0_14px_36px_rgba(8,15,30,0.22)] backdrop-blur",
            sleeping
              ? "max-w-[120px] border-white/10 bg-slate-950/40 text-xs"
              : "max-w-[280px] border-white/14 bg-slate-950/48",
            clingyFace && "border-rose-300/24 bg-rose-300/12"
          )}
        >
          {speech}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        {effects.map((effect) => (
          <div
            key={effect.id}
            className={cn(
              "ink-cat-effect absolute left-1/2 top-[48%]",
              effect.kind === "heart" && "ink-cat-effect-heart",
              effect.kind === "spark" && "ink-cat-effect-spark",
              effect.kind === "snack" && "ink-cat-effect-food"
            )}
            style={{
              marginLeft: `${effect.x}px`,
              marginTop: `${effect.y}px`,
              transform: `rotate(${effect.rotate}deg)`
            }}
          >
            <EffectGlyph kind={effect.kind} />
          </div>
        ))}
      </div>

      <div className="relative flex h-full items-end justify-center px-4 pb-24 pt-20">
        <button
          type="button"
          className="relative h-[308px] w-[300px] cursor-pointer"
          onPointerDown={() => {
            handlePet();
          }}
          onPointerMove={(event) => {
            if (!followEnabled || globalFollowAvailable) {
              return;
            }

            const rect = event.currentTarget.getBoundingClientRect();
            const ratioX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const ratioY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
            updateGaze(ratioX, ratioY);
          }}
          onDoubleClick={() => {
            if (!followEnabled || mode !== "pet") {
              return;
            }

            setFollowEnabled(false);
            setMood("sleeping");
            setSpeech("我停下来了。");
            setGaze({ x: 0, y: 0 });
          }}
          aria-label="Pet the desktop cat"
        >
          <svg
            viewBox="0 0 320 320"
            className={cn(
              "h-full w-full transition-transform duration-300",
              sleeping
                ? "ink-cat-figure-sleeping"
                : playfulFace
                  ? "ink-cat-figure-playful"
                  : clingyFace
                    ? "ink-cat-figure-clingy"
                    : "ink-cat-figure-idle",
              mirrored && "-scale-x-100"
            )}
            style={{ opacity: opacity / 100 }}
          >
            <ellipse cx="170" cy="286" rx="92" ry="18" fill="rgba(15, 23, 42, 0.18)" />

            <path
              className={cn(
                "ink-cat-tail",
                sleeping && "ink-cat-tail-sleeping",
                clingyFace && "ink-cat-tail-soft",
                playfulFace && "ink-cat-tail-fast"
              )}
              d="M116 240 C62 220 48 170 78 135 C99 111 133 114 154 135 C176 157 177 190 151 208 C132 221 121 228 116 240"
              fill="none"
              stroke="#111111"
              strokeLinecap="round"
              strokeWidth="28"
            />

            <ellipse cx="190" cy="216" rx="84" ry="76" fill="#171717" />
            <ellipse cx="192" cy="219" rx="38" ry="52" fill="#222222" />
            <ellipse cx="134" cy="263" rx="18" ry="26" fill="#161616" />
            <ellipse cx="248" cy="263" rx="18" ry="26" fill="#161616" />

            <g transform={headTransform}>
              <path d="M90 95 L106 43 L124 93 Z" fill="#131313" />
              <path d="M160 93 L178 43 L194 95 Z" fill="#131313" />
              <path d="M101 86 L109 61 L118 84 Z" fill="#292929" />
              <path d="M172 84 L181 61 L189 86 Z" fill="#292929" />
              <ellipse cx="142" cy="116" rx="58" ry="54" fill="#171717" />
              <ellipse cx="142" cy="123" rx="44" ry="34" fill="#191919" />

              {eyesClosed ? (
                <>
                  <path d="M118 115 Q130 108 141 115" fill="none" stroke="#f5cf6d" strokeLinecap="round" strokeWidth="4" />
                  <path d="M144 115 Q156 108 167 115" fill="none" stroke="#f5cf6d" strokeLinecap="round" strokeWidth="4" />
                </>
              ) : (
                <>
                  <ellipse cx="124" cy="114" rx="11" ry="15" fill="#f5cf6d" />
                  <ellipse cx="160" cy="114" rx="11" ry="15" fill="#f5cf6d" />
                  <ellipse cx={124 + pupilX} cy={114 + pupilY} rx="3.8" ry="7" fill="#0b0b0b" />
                  <ellipse cx={160 + pupilX} cy={114 + pupilY} rx="3.8" ry="7" fill="#0b0b0b" />
                </>
              )}

              <ellipse cx="142" cy="132" rx="4.5" ry="3" fill="#2f2f2f" />
              <path d="M137 140 Q142 146 147 140" fill="none" stroke="#f5cf6d" strokeLinecap="round" strokeWidth="3" />
              <path d="M98 135 H122" fill="none" stroke="rgba(255,255,255,0.18)" strokeLinecap="round" strokeWidth="1.5" />
              <path d="M94 141 H120" fill="none" stroke="rgba(255,255,255,0.18)" strokeLinecap="round" strokeWidth="1.5" />
              <path d="M162 135 H186" fill="none" stroke="rgba(255,255,255,0.18)" strokeLinecap="round" strokeWidth="1.5" />
              <path d="M164 141 H190" fill="none" stroke="rgba(255,255,255,0.18)" strokeLinecap="round" strokeWidth="1.5" />

              {(clingyFace || playfulFace || mood === "petting") && (
                <>
                  <circle cx="109" cy="127" r="4.5" fill="rgba(251,113,133,0.4)" />
                  <circle cx="175" cy="127" r="4.5" fill="rgba(251,113,133,0.4)" />
                </>
              )}

              {mood === "fed" && <ellipse cx="142" cy="145" rx="4" ry="6" fill="#fda4af" />}
            </g>

            {sleeping && (
              <g className="ink-cat-zzz">
                <text x="242" y="94" fill="rgba(245,245,245,0.68)" fontSize="18" fontWeight="700">
                  Z
                </text>
                <text x="256" y="72" fill="rgba(245,245,245,0.48)" fontSize="14" fontWeight="700">
                  Z
                </text>
              </g>
            )}
          </svg>
        </button>
      </div>

      {!hideActionDock && (
        <div className="absolute inset-x-0 bottom-5 z-20 flex justify-center px-4">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-[1.5rem] border border-white/12 bg-slate-950/50 px-3 py-3 shadow-[0_18px_40px_rgba(8,15,30,0.25)] backdrop-blur">
            <ActionButton label="摸摸" onClick={handlePet} />
            <ActionButton label="喂鱼" onClick={handleFeed} />
            <ActionButton label="逗球" onClick={handlePlay} />
            <ActionButton label={followEnabled ? "停止跟随" : "跟随鼠标"} active={followEnabled} onClick={handleFollowToggle} />
          </div>
        </div>
      )}
    </section>
  );
}
