"use client";
import Link from "next/link";
import { Icon } from "@iconify/react/offline";
import { categoryIcon } from "@/lib/category-icons";
import type { Category } from "@/types";

export default function CategoryMenu({ categories }: { categories: Category[] }) {
  return <ul className="shop-category-list">{categories.filter(c => c.is_active).map(cat => <li key={cat.id}>
    <Link href={`/${cat.slug}`}><Icon icon={categoryIcon(cat.slug)} width={21} height={21} aria-hidden /><span>{cat.name}</span><span aria-hidden>›</span></Link>
    {!!cat.children?.length && <div className="shop-category-sub"><Link href={`/${cat.slug}`}><strong>{cat.name} — Tümünü gör</strong></Link>{cat.children.filter(c => c.is_active).map(sub => <Link key={sub.id} href={`/${cat.slug}/${sub.slug}`}>{sub.name}</Link>)}</div>}
  </li>)}</ul>;
}
