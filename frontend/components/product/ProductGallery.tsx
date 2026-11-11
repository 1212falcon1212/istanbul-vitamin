"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/types";
import { resolveImageUrl } from "@/lib/utils";
import DetailIcon from "./DetailIcon";

export default function ProductGallery({ images, productName = "", discount = 0 }: { images: ProductImage[]; productName?: string; discount?: number }) {
  const [failed, setFailed] = useState<number[]>([]);
  const [expanded, setExpanded] = useState(false);
  const sorted = images.filter(image => !failed.includes(image.id)).sort((a,b) => Number(b.is_primary)-Number(a.is_primary) || a.sort_order-b.sort_order);
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const selectedIndex = Math.min(selected, Math.max(0, sorted.length-1));
  const current = sorted[selectedIndex];
  function fail(id: number) { setFailed(ids => ids.includes(id) ? ids : [...ids,id]); }
  function expand() { setExpanded(true); dialog.current?.showModal(); }
  function move(direction: number) { setSelected((selectedIndex + direction + sorted.length) % sorted.length); }
  if (!current) return <div className="pdp-gallery-empty">Ürün görseli hazırlanıyor.</div>;
  return <div className="pdp-gallery" aria-label="Ürün görselleri">
    <div className="pdp-gallery-main">
      <button type="button" className="pdp-image-open" onClick={expand} aria-label="Ürün görselini büyüt">
        <Image src={resolveImageUrl(current.image_url)} alt={current.alt_text || productName} fill priority loading="eager" sizes="(min-width:1440px) 660px, (min-width:768px) 48vw, 100vw" className="pdp-main-image" onError={() => fail(current.id)} unoptimized={current.image_url.includes("/uploads/")} />
      </button>
      {discount > 0 && <span className="pdp-gallery-discount">%{discount}</span>}
      <button type="button" className="pdp-expand" onClick={expand} aria-label="Tam ekran görsel"><DetailIcon name="expand"/></button>
      {sorted.length > 1 && <><button type="button" className="pdp-gallery-arrow pdp-gallery-prev" aria-label="Önceki görsel" onClick={() => move(-1)}><DetailIcon name="left"/></button><button type="button" className="pdp-gallery-arrow pdp-gallery-next" aria-label="Sonraki görsel" onClick={() => move(1)}><DetailIcon name="right"/></button></>}
    </div>
    <div className="pdp-thumbnails" aria-label="Görsel seçimi">
      {sorted.map((image,index) => <button type="button" key={image.id} aria-label={`${index+1}. ürün görseli`} aria-pressed={index === selectedIndex} onClick={() => setSelected(index)}>
        <Image src={resolveImageUrl(image.image_url)} alt="" fill loading="eager" onError={() => fail(image.id)} sizes="66px" className="object-contain" unoptimized={image.image_url.includes("/uploads/")}/>
      </button>)}
    </div>
    <dialog ref={dialog} className="pdp-lightbox" onClose={() => setExpanded(false)} aria-label={`${productName} — büyütülmüş görsel`} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }} onKeyDown={e => { if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); } if (e.key === "ArrowRight") { e.preventDefault(); move(1); } }}>
      <button type="button" autoFocus className="pdp-lightbox-close" aria-label="Görseli kapat" onClick={() => dialog.current?.close()}><DetailIcon name="close"/></button>
      <div className="pdp-lightbox-image">{expanded && <Image src={resolveImageUrl(current.image_url)} alt={current.alt_text || productName} fill sizes="90vw" loading="eager" onError={() => fail(current.id)} className="object-contain" unoptimized={current.image_url.includes("/uploads/")}/>}</div>
      {sorted.length > 1 && <div className="pdp-lightbox-controls"><button type="button" onClick={() => move(-1)} aria-label="Büyütülmüş önceki görsel"><DetailIcon name="left"/></button><span>{selectedIndex+1} / {sorted.length}</span><button type="button" onClick={() => move(1)} aria-label="Büyütülmüş sonraki görsel"><DetailIcon name="right"/></button></div>}
    </dialog>
  </div>;
}
