"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import { api, APIError } from "@/lib/api";

function reader() {
  return new BrowserMultiFormatReader(new Map([[DecodeHintType.TRY_HARDER, true]]));
}

export default function BarcodeScanner({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const scanPhoto = useRef<(file: File) => Promise<void>>(async () => {});
  const controls = useRef<IScannerControls | null>(null);
  const [torch, setTorch] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const modal = dialog.current!;
    modal.showModal();
    return () => modal.close();
  }, []);

  useEffect(() => {
    let active = true;
    let found = false;
    let stream: MediaStream | undefined;
    let frameTimer: ReturnType<typeof setTimeout> | undefined;
    function stopCamera() {
      clearTimeout(frameTimer);
      controls.current?.stop();
      controls.current = null;
      stream?.getTracks().forEach(track => track.stop());
    }

    async function resolve(code: string) {
      if (!active || found) return;
      found = true;
      stopCamera();
      setTorch(null);
      setBusy(true);
      setMessage("Ürün açılıyor…");
      try {
        const { data } = await api.get<{slug: string}>(`/products/lookup/barcode?code=${encodeURIComponent(code)}`);
        if (!data?.slug) throw new Error("Ürün bilgisi eksik");
        if (active) {
          router.push(`/urun/${encodeURIComponent(data.slug)}`);
          closeRef.current();
        }
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof APIError && error.status === 404 ? "Bu barkoda kayıtlı ürün bulunamadı."
          : error instanceof APIError && error.status === 409 ? error.message : "Ürün sorgulanamadı. Tekrar deneyin.");
        setRetry(true);
        setBusy(false);
      }
    }

    scanPhoto.current = async file => {
      const url = URL.createObjectURL(file);
      setBusy(true);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        let code: string | undefined;
        try {
          code = (await reader().decodeFromImageElement(image)).getText();
        } catch {
          const { readPackageBarcode } = await import("@/lib/package-barcode");
          code = await readPackageBarcode(image);
        }
        if (!code) throw new Error("Okunamadı");
        await resolve(code);
      } catch {
        if (active && !found) setMessage("Barkod okunamadı. Daha net bir fotoğraf deneyin.");
      } finally {
        URL.revokeObjectURL(url);
        if (active && !found) setBusy(false);
      }
    };

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (!active || found) { stream.getTracks().forEach(track => track.stop()); return; }
        const scanner = await reader().decodeFromStream(stream, video.current!, result => {
          if (result) void resolve(result.getText());
        });
        if (!active || found) { scanner.stop(); return; }
        controls.current = scanner;
        if (scanner.switchTorch) setTorch(false);

        const scanFrame = async () => {
          if (!active || found || !video.current) return;
          try {
            const { readPackageBarcode } = await import("@/lib/package-barcode");
            const code = await readPackageBarcode(video.current);
            if (code) await resolve(code);
          } catch {
            // The primary reader continues if WebAssembly is unavailable.
            return;
          }
          if (active && !found) frameTimer = setTimeout(scanFrame, 600);
        };
        frameTimer = setTimeout(scanFrame, 500);
      } catch {
        if (active && !found) {
          stopCamera();
          setMessage("Kamera açılamadı. Kamera iznini kontrol edin veya fotoğraf seçin.");
        }
      }
    }
    void start();
    return () => { active = false; stopCamera(); };
  }, [attempt, router]);

  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  return <dialog ref={dialog} onCancel={onClose} aria-label="Ürün barkodu okut" className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 text-white backdrop:bg-black">
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-4">
      <button type="button" autoFocus onClick={onClose} className="absolute right-4 top-4 rounded-lg bg-white/15 px-4 py-2">Kapat</button>
      <div className="relative aspect-[4/3] w-full max-w-xl overflow-hidden">
        <video ref={video} muted playsInline autoPlay className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-x-[8%] inset-y-[32%] flex items-center rounded-lg border-2 border-white">
          <div className="h-0.5 w-full bg-red-500" />
        </div>
      </div>
      <p role="status" className="text-center">{message || "Ürünün barkodunu kırmızı çizgiye hizalayın."}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {retry ? <button type="button" onClick={() => { setRetry(false); setMessage(""); setAttempt(n => n + 1); }}
          className="rounded-full bg-white px-4 py-2 text-black">Tekrar okut</button> :
          [true, false].map(capture => <label key={String(capture)} className="relative cursor-pointer rounded-full border border-white px-4 py-2 focus-within:outline">
            {capture ? "Fotoğraf çek" : "Galeriden seç"}
            <input type="file" accept="image/*" capture={capture ? "environment" : undefined} disabled={busy}
              aria-label={capture ? "Fotoğraf çek" : "Galeriden seç"} className="absolute inset-0 w-full cursor-pointer opacity-0"
              onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void scanPhoto.current(file); }} />
          </label>)}
        {torch !== null && <button type="button" className="rounded-full border px-4 py-2" onClick={async () => {
          try { await controls.current?.switchTorch?.(!torch); setTorch(!torch); }
          catch { setMessage("Flaş ayarlanamadı."); }
        }}>{torch ? "Flaşı kapat" : "Flaşı aç"}</button>}
      </div>
    </div>
  </dialog>;
}
