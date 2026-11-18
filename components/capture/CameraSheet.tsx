"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CameraOff, Loader2, SwitchCamera, X } from "lucide-react";
import { t } from "@/lib/i18n";

type Props = { title?: string; onCapture: (photo: Blob) => void; onClose: () => void };

/**
 * Full-screen live camera with a shutter button. Photos only ever come from here:
 * there is no file picker, so nobody can submit an old or edited image.
 */
export function CameraSheet({ title, onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [state, setState] = useState<"starting" | "live" | "denied" | "unsupported">("starting");
  const [flash, setFlash] = useState(false);

  // Start (or restart, when flipping) the camera.
  useEffect(() => {
    let cancelled = false;
    const stop = () => streamRef.current?.getTracks().forEach((tr) => tr.stop());
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) return setState("unsupported");
      stop();
      setState("starting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        });
        if (cancelled) return stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setState("live");
      } catch {
        if (!cancelled) setState("denied");
      }
    }
    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing]);

  // Lock page scroll and allow Esc to close while the camera is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function shoot() {
    const v = videoRef.current;
    if (!v || state !== "live" || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    setFlash(true);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        streamRef.current?.getTracks().forEach((tr) => tr.stop());
        onCapture(blob);
      },
      "image/jpeg",
      0.92,
    );
  }

  return createPortal(
    <div role="dialog" aria-modal aria-label={t("camera.title")} className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <button onClick={onClose} aria-label={t("camera.close")} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          <X aria-hidden className="size-5" />
        </button>
        {title && <p className="truncate rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium">{title}</p>}
        <span className="size-11" />
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted autoPlay className={`size-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`} />

        {state === "live" && (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-6 md:inset-x-[20%] md:inset-y-10">
              {["top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl", "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl"].map((c) => (
                <span key={c} className={`absolute size-10 border-accent ${c}`} />
              ))}
            </div>
            <p className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-black/55 px-4 py-2 text-center text-sm backdrop-blur">
              {t("camera.hint")}
            </p>
          </>
        )}

        {state === "starting" && (
          <div className="absolute inset-0 grid place-items-center">
            <Loader2 aria-label={t("camera.starting")} className="size-10 animate-spin opacity-70" />
          </div>
        )}

        {(state === "denied" || state === "unsupported") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-white/10">
              <CameraOff aria-hidden className="size-8" />
            </span>
            <p className="max-w-xs text-base">{state === "denied" ? t("camera.denied") : t("camera.unsupported")}</p>
            <button onClick={onClose} className="btn bg-white text-black">{t("camera.close")}</button>
          </div>
        )}

        {flash && <div aria-hidden className="pointer-events-none absolute inset-0 animate-[rise_200ms_ease-out_reverse] bg-white" />}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 items-center px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <span />
        <button
          onClick={shoot}
          disabled={state !== "live" || flash}
          aria-label={t("camera.shutter")}
          className="mx-auto grid size-20 place-items-center rounded-full border-4 border-white transition active:scale-90 disabled:opacity-40"
        >
          <span className="size-15 rounded-full bg-white" />
        </button>
        <button
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          disabled={state === "starting"}
          aria-label={t("camera.flip")}
          className="ml-auto grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40"
        >
          <SwitchCamera aria-hidden className="size-5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
