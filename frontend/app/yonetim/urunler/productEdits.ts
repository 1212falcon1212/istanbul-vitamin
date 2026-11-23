import type { Product } from "@/types";
import { api } from "@/lib/api";

export function values(product: Product) {
  const discounted = (product.compare_price ?? 0) > product.price;
  const money = (n: number) => n.toFixed(2).replace(".", ",");
  return {
    retail: money(discounted ? product.compare_price! : product.price),
    discount: discounted ? money(product.price) : "",
    expiry: product.expiry_date?.slice(0, 10) ?? "",
    stock: String(product.stock),
    active: product.is_active,
  };
}

export type Changes = Partial<ReturnType<typeof values>>;

export async function saveProduct(product: Product, changes: Changes) {
  const draft = { ...values(product), ...changes };
  const patch: Record<string, unknown> = {};
  const updated: Partial<Product> = {};
  if (changes.retail !== undefined || changes.discount !== undefined) {
    const retail = Number(draft.retail.replace(",", "."));
    const discount = draft.discount ? Number(draft.discount.replace(",", ".")) : null;
    if (!/^\d{1,8}([,.]\d{1,2})?$/.test(draft.retail) || (draft.discount && !/^\d{1,8}([,.]\d{1,2})?$/.test(draft.discount)) || retail <= 0 || (discount !== null && (discount <= 0 || discount >= retail))) {
      throw new Error("Perakende fiyatı pozitif, indirimli fiyat ise pozitif ve perakende fiyatından düşük olmalıdır.");
    }
    patch.pricing = { retail, discounted: discount };
    updated.price = discount ?? retail;
    updated.compare_price = discount !== null ? retail : undefined;
  }
  if (changes.expiry !== undefined) {
    if (draft.expiry && !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(draft.expiry)) throw new Error("Miat geçersiz.");
    patch.expiry_date = draft.expiry;
    updated.expiry_date = draft.expiry || undefined;
  }
  if (changes.stock !== undefined) {
    updated.stock = Number(draft.stock);
    if (!draft.stock.trim() || !Number.isInteger(updated.stock) || updated.stock < 0 || updated.stock > 2147483647) throw new Error("Geçerli bir stok miktarı girin.");
    patch.stock = updated.stock;
  }
  if (changes.active !== undefined) {
    updated.is_active = draft.active;
    patch.is_active = draft.active;
  }

  await api.patch(`/admin/products/${product.id}`, patch);
  return updated;
}
