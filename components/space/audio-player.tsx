"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Play, Pause } from "lucide-react";
import { iconSwap, DURATION, EASE_OUT } from "@/lib/animations";

const WAVEFORM_BARS = 80;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function decodePeaks(src: string, bars: number, signal: AbortSignal): Promise<number[]> {
  const res = await fetch(src, { signal });
  if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error("AudioContext not supported");
  const ctx = new Ctx();
  try {
    const audioBuf = await ctx.decodeAudioData(buf);
    const chan = audioBuf.getChannelData(0);
    const chunk = Math.max(1, Math.floor(chan.length / bars));
    const out: number[] = [];
    let max = 0;
    for (let i = 0; i < bars; i++) {
      let peak = 0;
      const start = i * chunk;
      const end = Math.min(chan.length, start + chunk);
      for (let j = start; j < end; j++) {
        const v = Math.abs(chan[j]);
        if (v > peak) peak = v;
      }
      out.push(peak);
      if (peak > max) max = peak;
    }
    return max > 0 ? out.map((p) => Math.max(0.04, p / max)) : out;
  } finally {
    ctx.close().catch((err) => console.warn("AudioContext close failed", err));
  }
}

function Waveform({ peaks, className }: { peaks: number[]; className?: string }) {
  const slot = 100 / peaks.length;
  const barW = slot * 0.55;
  return (
    <svg
      className={className}
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      aria-hidden
    >
      {peaks.map((p, i) => {
        const h = Math.max(0.6, p * 24);
        const y = 12 - h / 2;
        const x = i * slot + (slot - barW) / 2;
        return <rect key={i} x={x} y={y} width={barW} height={h} rx="0.3" />;
      })}
    </svg>
  );
}

interface AudioPlayerProps {
  src: string;
  className?: string;
  variant?: "default" | "hero";
  caption?: string;
}

export function AudioPlayer({ src, className, variant = "default", caption }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const playedClipRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const probingDurationRef = useRef(false);

  function applyProgress(pct: number) {
    const clamped = Math.max(0, Math.min(100, pct));
    if (fillRef.current) fillRef.current.style.width = `${clamped}%`;
    if (thumbRef.current) thumbRef.current.style.left = `calc(${clamped}% - 6px)`;
    if (playedClipRef.current) {
      playedClipRef.current.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
    }
  }

  useEffect(() => {
    if (variant !== "hero") return;
    const controller = new AbortController();
    setPeaks(null);
    decodePeaks(src, WAVEFORM_BARS, controller.signal)
      .then((p) => {
        if (!controller.signal.aborted) setPeaks(p);
      })
      .catch((err) => {
        if ((err as Error)?.name !== "AbortError") {
          console.warn("Waveform decode failed", err);
        }
      });
    return () => controller.abort();
  }, [src, variant]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch((err) => {
        console.error("Audio play failed", err);
      });
    } else {
      a.pause();
    }
  }

  function seekToClientX(clientX: number) {
    const bar = barRef.current;
    const a = audioRef.current;
    if (!bar || !a || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    a.currentTime = pct * duration;
    setCurrent(a.currentTime);
    applyProgress(pct * 100);
  }

  useEffect(() => {
    if (!scrubbing) return;
    function onMove(e: PointerEvent) {
      seekToClientX(e.clientX);
    }
    function onUp() {
      setScrubbing(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [scrubbing, duration]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || duration <= 0) {
      applyProgress(0);
      return;
    }
    applyProgress((a.currentTime / duration) * 100);
  }, [duration]);

  useEffect(() => {
    if (!playing && !scrubbing) return;
    let raf = 0;
    function tick() {
      const a = audioRef.current;
      if (a && duration > 0) {
        applyProgress((a.currentTime / duration) * 100);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, scrubbing, duration]);

  function handleDurationMeta(audio: HTMLAudioElement) {
    const d = audio.duration;
    if (Number.isFinite(d) && d > 0) {
      setDuration(d);
      return;
    }
    if (probingDurationRef.current) return;
    probingDurationRef.current = true;
    const onProbeTimeUpdate = () => {
      const real = audio.duration;
      if (Number.isFinite(real) && real > 0) {
        audio.removeEventListener("timeupdate", onProbeTimeUpdate);
        audio.removeEventListener("durationchange", onProbeDurationChange);
        audio.currentTime = 0;
        setDuration(real);
        setCurrent(0);
        probingDurationRef.current = false;
      }
    };
    const onProbeDurationChange = () => {
      const real = audio.duration;
      if (Number.isFinite(real) && real > 0) {
        audio.removeEventListener("timeupdate", onProbeTimeUpdate);
        audio.removeEventListener("durationchange", onProbeDurationChange);
        audio.currentTime = 0;
        setDuration(real);
        setCurrent(0);
        probingDurationRef.current = false;
      }
    };
    audio.addEventListener("timeupdate", onProbeTimeUpdate);
    audio.addEventListener("durationchange", onProbeDurationChange);
    try {
      audio.currentTime = 1e101;
    } catch (err) {
      console.warn("Duration probe seek failed", err);
      probingDurationRef.current = false;
    }
  }

  const audioElement = (
    <audio
      ref={audioRef}
      src={src}
      preload="auto"
      onTimeUpdate={(e) => {
        if (!probingDurationRef.current) setCurrent(e.currentTarget.currentTime);
      }}
      onLoadedMetadata={(e) => handleDurationMeta(e.currentTarget)}
      onDurationChange={(e) => handleDurationMeta(e.currentTarget)}
      onEnded={() => {
        setPlaying(false);
        setCurrent(0);
      }}
      onPause={() => setPlaying(false)}
      onPlay={() => setPlaying(true)}
      onError={() => setPlaying(false)}
    />
  );

  if (variant === "hero") {
    return (
      <div
        ref={barRef}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-play-button]")) return;
          setScrubbing(true);
          seekToClientX(e.clientX);
        }}
        className={`relative flex aspect-4/3 cursor-pointer select-none items-center justify-center overflow-hidden ${className ?? ""}`}
      >
        {audioElement}
        {!peaks && (
          <div
            ref={fillRef}
            aria-hidden
            className="absolute inset-y-0 left-0 w-0 bg-primary/15"
          />
        )}
        {peaks && (
          <>
            <div className="pointer-events-none absolute inset-x-3 top-1/2 h-3/5 -translate-y-1/2">
              <Waveform peaks={peaks} className="h-full w-full fill-muted-foreground/30" />
            </div>
            <div
              ref={playedClipRef}
              aria-hidden
              className="pointer-events-none absolute inset-x-3 top-1/2 h-3/5 -translate-y-1/2"
              style={{ clipPath: "inset(0 100% 0 0)" }}
            >
              <Waveform peaks={peaks} className="h-full w-full fill-primary" />
            </div>
          </>
        )}
        <button
          type="button"
          data-play-button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          aria-label={playing ? "Pause" : "Play"}
          className="relative z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={playing ? "pause" : "play"}
              variants={iconSwap}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
              className="flex items-center justify-center"
            >
              {playing ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 translate-x-px fill-current" />
              )}
            </motion.span>
          </AnimatePresence>
        </button>
        {caption && (
          <p className="absolute bottom-2 left-3 z-10 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {caption}
          </p>
        )}
        <p className="absolute bottom-2 right-3 z-10 font-mono text-[10px] tabular-nums text-muted-foreground">
          {formatTime(current)} / {formatTime(duration)}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`@container flex items-center gap-2.5 rounded-md bg-surface-container-high px-2.5 py-2 ${className ?? ""}`}
    >
      {audioElement}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={playing ? "pause" : "play"}
            variants={iconSwap}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            className="flex items-center justify-center"
          >
            {playing ? (
              <Pause className="h-3 w-3 fill-current" />
            ) : (
              <Play className="h-3 w-3 translate-x-px fill-current" />
            )}
          </motion.span>
        </AnimatePresence>
      </button>
      <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
        {formatTime(current)}
        <span className="hidden text-muted-foreground/60 @[180px]:inline"> / {formatTime(duration)}</span>
      </span>
      <div
        ref={barRef}
        onPointerDown={(e) => {
          setScrubbing(true);
          seekToClientX(e.clientX);
        }}
        className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-surface-container"
      >
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0 w-0 rounded-full bg-primary"
        />
        <div
          ref={thumbRef}
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary opacity-0 ring-2 ring-surface-container-high transition-opacity group-hover:opacity-100"
          style={{ left: "calc(0% - 6px)" }}
        />
      </div>
    </div>
  );
}
