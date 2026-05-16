"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Mic, Square, X } from "lucide-react";
import { toast } from "sonner";
import fixWebmDuration from "fix-webm-duration";
import { AUDIO_BITRATE_BPS, MAX_RECORDING_SECONDS } from "@/lib/constants";
import { DURATION, EASE_OUT } from "@/lib/animations";

const MIC_LAYOUT_ID_PREFIX = "audio-recorder-mic";
const layoutTransition = { duration: DURATION.slow, ease: EASE_OUT };
const fadeTransition = { duration: DURATION.fast, ease: EASE_OUT };

const PREFERRED_MIMES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

function pickSupportedMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of PREFERRED_MIMES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

function extensionFor(mime: string): string {
  if (mime.startsWith("audio/webm")) return "webm";
  if (mime.startsWith("audio/mp4")) return "m4a";
  if (mime.startsWith("audio/ogg")) return "ogg";
  if (mime.startsWith("audio/mpeg")) return "mp3";
  if (mime.startsWith("audio/wav")) return "wav";
  return "webm";
}

function normalizeMime(mime: string): string {
  return mime.split(";")[0].trim().toLowerCase();
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface AudioRecorderProps {
  onRecorded: (file: File) => void;
  disabled?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
}

export function AudioRecorder({ onRecorded, disabled, compact, fullWidth }: AudioRecorderProps) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [starting, setStarting] = useState(false);
  const reduceMotion = useReducedMotion();
  const instanceId = useId();
  const micLayoutId = `${MIC_LAYOUT_ID_PREFIX}-${instanceId}`;

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const mimeRef = useRef<string>("");
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    const mime = pickSupportedMime();
    setSupported(mime !== null && typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));
  }, []);

  const cleanup = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setElapsed(0);
    setRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  const stop = useCallback((cancel: boolean) => {
    cancelledRef.current = cancel;
    const r = recorderRef.current;
    if (r && r.state !== "inactive") {
      try {
        r.stop();
      } catch (err) {
        console.error("MediaRecorder stop failed", err);
        cleanup();
      }
    } else {
      cleanup();
    }
  }, [cleanup]);

  const start = useCallback(async () => {
    if (!supported || recording || starting || disabled) return;
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = pickSupportedMime() ?? "";
      mimeRef.current = mime;
      const options: MediaRecorderOptions = mime
        ? { mimeType: mime, audioBitsPerSecond: AUDIO_BITRATE_BPS }
        : { audioBitsPerSecond: AUDIO_BITRATE_BPS };

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (err) {
        console.error("MediaRecorder init failed, falling back", err);
        recorder = new MediaRecorder(stream);
      }
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelledRef.current = false;

      recorder.addEventListener("dataavailable", (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      });

      recorder.addEventListener("stop", () => {
        const wasCancelled = cancelledRef.current;
        const chunks = chunksRef.current.slice();
        const actualMime = recorder.mimeType || mimeRef.current || "audio/webm";
        const durationMs = startedAtRef.current
          ? Math.max(1, Math.round(performance.now() - startedAtRef.current))
          : 0;
        cleanup();
        if (wasCancelled || chunks.length === 0) return;
        const normalized = normalizeMime(actualMime);
        const ext = extensionFor(normalized);
        const name = `recording-${timestamp()}.${ext}`;

        const rawBlob = new Blob(chunks, { type: normalized });
        const finalize = (blob: Blob) => {
          const file = new File([blob], name, { type: normalized });
          onRecorded(file);
        };

        if (normalized.startsWith("audio/webm") && durationMs > 0) {
          fixWebmDuration(rawBlob, durationMs, { logger: false })
            .then((fixed) => finalize(fixed))
            .catch((err) => {
              console.warn("fixWebmDuration failed, using raw blob", err);
              finalize(rawBlob);
            });
        } else {
          finalize(rawBlob);
        }
      });

      recorder.addEventListener("error", (e) => {
        const err = (e as Event & { error?: Error }).error;
        console.error("MediaRecorder error", err);
        toast.error("Recording failed");
        stop(true);
      });

      startedAtRef.current = performance.now();
      recorder.start();
      setRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            toast.info(`Recording stopped at ${Math.floor(MAX_RECORDING_SECONDS / 60)}-minute limit`);
            stop(false);
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      const name = (err as Error)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error("Microphone access denied");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        toast.error("No microphone found");
      } else {
        const msg = err instanceof Error ? err.message : "Couldn't start recording";
        toast.error(msg);
      }
      cleanup();
    } finally {
      setStarting(false);
    }
  }, [supported, recording, starting, disabled, onRecorded, cleanup, stop]);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {!supported ? (
        <motion.button
          key="unsupported"
          type="button"
          disabled
          aria-label="Recording not supported"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fadeTransition}
          className={
            compact
              ? "flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-md bg-surface-container-low text-muted-foreground/60 ring-1 ring-ghost-border opacity-50"
              : `flex ${fullWidth ? "w-full justify-center" : "shrink-0"} cursor-not-allowed items-center gap-1.5 rounded-md bg-surface-container-low px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground/60 ring-1 ring-ghost-border opacity-50`
          }
        >
          <Mic className={compact ? "h-3.5 w-3.5" : "h-3 w-3"} />
          {!compact && <span>Unavailable</span>}
        </motion.button>
      ) : recording ? (
        <motion.div
          key="recording"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fadeTransition}
          className={`flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 ring-1 ring-destructive/30 ${fullWidth ? "w-full justify-between" : ""}`}
        >
          <div className="flex items-center gap-2">
            <motion.span
              layoutId={micLayoutId}
              transition={layoutTransition}
              aria-hidden
              className="flex h-3 w-3 items-center justify-center text-destructive"
            >
              <motion.span
                className="flex"
                animate={reduceMotion ? undefined : { opacity: [1, 0.35, 1] }}
                transition={reduceMotion ? undefined : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Mic className="h-3 w-3" />
              </motion.span>
            </motion.span>
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ ...fadeTransition, delay: 0.08 }}
              className="font-mono text-[11px] tabular-nums text-destructive"
            >
              {formatElapsed(elapsed)}
            </motion.span>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ ...layoutTransition, delay: 0.05 }}
            className="flex items-center gap-1"
          >
            <button
              type="button"
              onClick={() => stop(false)}
              aria-label="Stop recording"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-destructive transition-colors hover:bg-destructive/20"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => stop(true)}
              aria-label="Cancel recording"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        </motion.div>
      ) : (
        <motion.button
          key="idle"
          type="button"
          onClick={start}
          disabled={disabled || starting}
          aria-label="Record audio"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fadeTransition}
          className={
            compact
              ? "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-surface-container-low text-muted-foreground ring-1 ring-ghost-border transition-colors hover:bg-surface-container-high hover:text-foreground hover:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
              : `flex ${fullWidth ? "w-full justify-center" : "shrink-0"} cursor-pointer items-center gap-1.5 rounded-md bg-surface-container-low px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground ring-1 ring-ghost-border transition-colors hover:bg-surface-container-high hover:text-foreground hover:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50`
          }
        >
          <motion.span
            layoutId={micLayoutId}
            transition={layoutTransition}
            className="flex items-center justify-center"
          >
            <Mic className={compact ? "h-3.5 w-3.5" : "h-3 w-3"} />
          </motion.span>
          {!compact && (
            <motion.span
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={layoutTransition}
            >
              Record
            </motion.span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
