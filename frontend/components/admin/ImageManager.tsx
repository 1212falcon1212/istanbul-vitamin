"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ImageItem {
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}

interface ImageManagerProps {
  images: ImageItem[];
  onAdd: () => void;
  onUpdate: (idx: number, field: string, value: string | boolean) => void;
  onRemove: (idx: number) => void;
  /** Dosya yüklendikten sonra dönen URL'i yeni bir image olarak listeye ekler. */
  onAddUrl: (url: string) => void;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

function resolveImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  // Göreli path (ör. /uploads/2026/04/xxx.jpg) — backend origin'ine bağla.
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return origin + (url.startsWith("/") ? url : "/" + url);
}

export default function ImageManager({
  images,
  onAdd,
  onUpdate,
  onRemove,
  onAddUrl,
}: ImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function uploadFiles(files: FileList | File[]) {
    setUploadError("");
    setUploading(true);
    try {
      const token = localStorage.getItem("admin_token") ?? "";
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${API_BASE_URL}/admin/uploads/image`, {
          method: "POST",
          body: fd,
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Yükleme başarısız");
        }
        const url: string | undefined = json.data?.url;
        if (url) onAddUrl(url);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Yükleme başarısız");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-3">
      {/* Görsel grid'i */}
      {images.map((img, idx) => (
        <div
          key={idx}
          className="flex items-start gap-3 p-3 rounded-lg border border-border bg-bg-primary/30"
        >
          {/* Preview */}
          <div className="w-20 h-20 rounded-lg bg-white border border-border shrink-0 overflow-hidden flex items-center justify-center text-text-secondary">
            {img.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveImageUrl(img.image_url)}
                alt={img.alt_text || "Önizleme"}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.4}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 003.75 21z"
                />
              </svg>
            )}
          </div>

          {/* Inputs */}
          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Görsel URL'si veya yüklediğiniz yol"
              value={img.image_url}
              onChange={(e) => onUpdate(idx, "image_url", e.target.value)}
              className={`${inputClass} font-mono text-xs`}
            />
            <input
              type="text"
              placeholder="Alt metin (SEO için)"
              value={img.alt_text}
              onChange={(e) => onUpdate(idx, "alt_text", e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Primary + remove */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <label className="flex items-center gap-1 text-xs text-text-secondary cursor-pointer">
              <input
                type="radio"
                name="primary_image"
                checked={img.is_primary}
                onChange={() => {
                  images.forEach((_, i) => onUpdate(i, "is_primary", i === idx));
                }}
              />
              Ana
            </label>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="text-red-500 hover:text-red-700 text-xs"
              aria-label="Görseli sil"
            >
              Sil
            </button>
          </div>
        </div>
      ))}

      {/* Upload + URL ekle */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-lg border-2 border-dashed p-4 transition-colors",
          dragOver
            ? "border-primary bg-primary-soft/30"
            : "border-border bg-bg-primary/20"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <p className="text-sm text-text-primary font-medium">
            {uploading ? "Yükleniyor..." : "Görselleri buraya bırak veya tıkla"}
          </p>
          <p className="text-[11px] text-text-secondary">
            JPG, PNG, WEBP, GIF, SVG — her biri maksimum 10 MB
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-4 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              Dosya Seç
            </button>
            <button
              type="button"
              onClick={onAdd}
              className="h-9 px-4 border border-border rounded-lg text-xs font-medium text-text-primary hover:border-primary hover:text-primary transition-colors"
            >
              URL ile Ekle
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2">
            {uploadError}
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full h-10 px-3 rounded-lg border border-border bg-white text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";
