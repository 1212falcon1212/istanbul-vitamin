"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import type { Category } from "@/types";
import styles from "./CategoryBento.module.css";

const editorial = [
  { slug: "cilt-bakimi", description: "Cildinizin ihtiyaçlarına özel bakım ritüelleri." },
  { slug: "anne-bebek", description: "Sizin ve bebeğinizin hassas dünyası için." },
  { slug: "besin-takviyeleri", description: "Günlük yaşamınıza eşlik eden destekler." },
  { slug: "gunes-urunleri", description: "Cildinizi güneşin zararlı etkilerinden koruyun." },
  { slug: "sac-bakimi", description: "Saçlarınıza iyi gelen bakımı keşfedin." },
  { slug: "kisisel-bakim", description: "Kendinize ayırdığınız anları güzelleştirin." },
  { slug: "makyaj", description: "Güzelliğinize kendi renginizi katın." },
];

export default function CategoryBento({ categories }: { categories: Category[] }) {
  const items = editorial.flatMap((item, image) => {
    const category = categories.find((category) => category.slug === item.slug);
    return category ? [{ ...item, category, image }] : [];
  });
  const [active, setActive] = useState(() => Math.max(0, items.findIndex((item) => item.slug === "gunes-urunleri")));
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [playing, setPlaying] = useState(true);
  const reducedMotion = useReducedMotion();
  const touchX = useRef<number | null>(null);
  const current = items.length ? active % items.length : 0;
  const move = (direction: number) => setActive((value) => (value + direction + items.length) % items.length);

  useEffect(() => {
    if (items.length < 2 || reducedMotion || hovered || focused || !playing) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % items.length), 6000);
    return () => window.clearInterval(timer);
  }, [items.length, reducedMotion, hovered, focused, playing]);

  if (!items.length) return null;

  return <section className={styles.section} aria-labelledby="category-discovery-title"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className={styles.header}>
      <div>
        <p className={styles.eyebrow}>KATEGORİLER</p>
        <h2 id="category-discovery-title">Dermokozmetik dünyasını keşfet.</h2>
        <p className={styles.intro}>Cilt bakımından güneş korumasına, anne bebekten besin takviyelerine<br className={styles.desktopBreak} /> ihtiyacınız olan her kategori tek bir yerde.</p>
      </div>
      <div className={styles.trust}>
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4v6c0 4-8 8-8 8s-8-4-8-8V7l8-4Z"/><path d="m8 12 3 3 5-6"/></svg>Dermokozmetik<br/>Güvencesi</span>
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20C0 8 13 3 21 3c0 12-5 19-17 17Zm0 0L17 7"/></svg>Seçkin<br/>Markalar</span>
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/></svg>Hızlı<br/>Teslimat</span>
      </div>
    </div>
    <div className={styles.stage} role="region" aria-roledescription="karusel" aria-label="Ürün kategorileri" tabIndex={0}
      onKeyDown={(event) => { if (event.target === event.currentTarget && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}
      onTouchStart={(event) => { touchX.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => { if (touchX.current !== null) { const distance = event.changedTouches[0].clientX - touchX.current; if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1); } touchX.current = null; }}>
      {items.map((item, index) => {
        let offset = (index - current + items.length) % items.length;
        if (offset > items.length / 2) offset -= items.length;
        const distance = Math.abs(offset);
        const selected = index === current;
        const x = offset === 0 ? 0 : Math.sign(offset) * (205 + (distance - 1) * 170);
        return <article key={item.slug} className={`${styles.card} ${selected ? styles.active : ""}`} data-side={offset > 0 ? "right" : "left"} style={{ zIndex: 10 - distance, transform: `translateX(calc(-50% + ${x} * var(--category-unit))) translateY(calc(${selected ? 0 : 16 + distance * 4} * var(--category-unit))) scale(${selected ? 1 : .94 - distance * .035})` }} aria-label={item.category.name}>
          <div className={styles.photo} style={{ backgroundPosition: `${item.image / 6 * 100}% top` }} />
          <div className={styles.shade} />
          {selected && <span className={styles.featured}>✧ Öne Çıkan Kategori</span>}
          {!selected && <button tabIndex={-1} className={styles.selectCard} onClick={() => setActive(index)} aria-label={`${item.category.name} kategorisini öne getir`} />}
          <div className={styles.content}>
            <h3>{item.category.name}</h3>
            {selected && <p>{item.description}</p>}
            <Link href={`/${item.category.slug}`} tabIndex={selected ? 0 : -1} className={styles.cta}>{selected ? "Ürünleri İncele" : "Ürünleri Keşfet"} <span aria-hidden="true">→</span></Link>
          </div>
        </article>;
      })}
    </div>
    <div className={styles.controls}>
      <button onClick={() => move(-1)} aria-label="Önceki kategori" className={styles.arrow}>←</button>
      <div className={styles.dots} aria-label="Kategori seçimi">{items.map((item, index) => <button key={item.slug} aria-label={item.category.name} aria-pressed={current === index} onClick={() => setActive(index)} className={current === index ? styles.selectedDot : ""} />)}</div>
      <button onClick={() => move(1)} aria-label="Sonraki kategori" className={styles.arrow}>→</button>
      {!reducedMotion && <button className={styles.play} onClick={() => setPlaying(!playing)} aria-label={playing ? "Otomatik geçişi durdur" : "Otomatik geçişi başlat"}>{playing ? "Ⅱ" : "▷"}</button>}
    </div>
  </section>;
}
