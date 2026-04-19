#!/usr/bin/env python3
"""
Kozvit JSON -> MySQL importer
5201 ürün, markalar, kategoriler, görseller toplu import
"""

import json
import re
import mysql.connector
from datetime import datetime

JSON_PATH = "/Users/sahinyildiz/Desktop/Siteler/site-bot/kozvit_products.json"

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "ecommerce",
    "unix_socket": "/usr/local/var/mysql/mysql.sock",
    "charset": "utf8mb4",
}

# Turkish slug helper
TURKISH_MAP = str.maketrans({
    'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u',
})

def slugify(text):
    text = text.lower().translate(TURKISH_MAP)
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def ensure_unique_slug(slug, existing_slugs):
    if slug not in existing_slugs:
        existing_slugs.add(slug)
        return slug
    i = 2
    while f"{slug}-{i}" in existing_slugs:
        i += 1
    unique = f"{slug}-{i}"
    existing_slugs.add(unique)
    return unique

def main():
    print("JSON dosyası okunuyor...")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    products = data["products"]
    print(f"Toplam ürün: {len(products)}")

    # Connect
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ========== MARKALAR ==========
    print("\nMarkalar ekleniyor...")
    brand_names = sorted(set(p["brand"] for p in products if p.get("brand")))
    brand_slugs = set()
    brand_id_map = {}  # name -> id

    for i, name in enumerate(brand_names, 1):
        slug = ensure_unique_slug(slugify(name), brand_slugs)
        cursor.execute(
            "INSERT INTO brands (name, slug, is_active, sort_order, created_at, updated_at) VALUES (%s, %s, 1, %s, %s, %s)",
            (name, slug, i, now, now)
        )
        brand_id_map[name] = cursor.lastrowid

    conn.commit()
    print(f"  {len(brand_names)} marka eklendi")

    # ========== KATEGORİLER ==========
    print("\nKategoriler ekleniyor...")

    # Ana kategoriler
    main_cats = sorted(set(p["main_category"] for p in products if p.get("main_category")))
    cat_slugs = set()
    main_cat_id_map = {}  # name -> id

    for i, name in enumerate(main_cats, 1):
        slug = ensure_unique_slug(slugify(name), cat_slugs)
        cursor.execute(
            "INSERT INTO categories (name, slug, is_active, depth, path, sort_order, created_at, updated_at) VALUES (%s, %s, 1, 0, '', %s, %s, %s)",
            (name, slug, i, now, now)
        )
        cid = cursor.lastrowid
        main_cat_id_map[name] = cid
        # Update path with own id
        cursor.execute("UPDATE categories SET path = %s WHERE id = %s", (str(cid), cid))

    conn.commit()
    print(f"  {len(main_cats)} ana kategori eklendi")

    # Alt kategoriler
    sub_cats = sorted(set(
        (p["main_category"], p["sub_category"])
        for p in products
        if p.get("sub_category") and p.get("main_category")
    ))
    sub_cat_id_map = {}  # (main, sub) -> id

    for i, (main_name, sub_name) in enumerate(sub_cats, 1):
        parent_id = main_cat_id_map.get(main_name)
        if not parent_id:
            continue
        slug = ensure_unique_slug(slugify(sub_name), cat_slugs)
        cursor.execute(
            "INSERT INTO categories (parent_id, name, slug, is_active, depth, path, sort_order, created_at, updated_at) VALUES (%s, %s, %s, 1, 1, '', %s, %s, %s)",
            (parent_id, sub_name, slug, i, now, now)
        )
        cid = cursor.lastrowid
        sub_cat_id_map[(main_name, sub_name)] = cid
        path = f"{parent_id}/{cid}"
        cursor.execute("UPDATE categories SET path = %s WHERE id = %s", (path, cid))

    conn.commit()
    print(f"  {len(sub_cats)} alt kategori eklendi")

    # ========== ÜRÜNLER ==========
    print("\nÜrünler ekleniyor...")
    product_slugs = set()
    used_skus = set()
    batch_size = 500
    inserted = 0
    skipped = 0

    for i, p in enumerate(products):
        name = p.get("name", "").strip()
        if not name:
            skipped += 1
            continue

        sku = p.get("sku", "").strip()
        if not sku:
            sku = f"KZV-{i+1:05d}"

        # Ensure unique SKU
        if sku in used_skus:
            j = 2
            while f"{sku}-{j}" in used_skus:
                j += 1
            sku = f"{sku}-{j}"
        used_skus.add(sku)

        barcode = p.get("barcode", "").strip()
        brand_name = p.get("brand", "").strip()
        brand_id = brand_id_map.get(brand_name)

        try:
            price = float(p.get("price", 0))
        except (ValueError, TypeError):
            price = 0.0

        if price <= 0:
            skipped += 1
            continue

        slug = ensure_unique_slug(slugify(name), product_slugs)
        description = p.get("description", "").strip()
        image_url = p.get("image_url", "").strip()
        main_cat = p.get("main_category", "").strip()
        sub_cat = p.get("sub_category", "").strip()
        feed_source_id = p.get("url", "").strip()

        # Insert product
        cursor.execute("""
            INSERT INTO products
            (brand_id, sku, barcode, name, slug, short_description, description,
             price, stock, is_active, is_featured, tax_rate, feed_source_id,
             created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1, 0, 20, %s, %s, %s)
        """, (
            brand_id, sku, barcode or None, name, slug,
            description[:500] if description else None,
            description,
            price, 100,  # default stock 100
            feed_source_id or None,
            now, now
        ))
        product_id = cursor.lastrowid

        # Product image
        if image_url:
            cursor.execute(
                "INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary, created_at) VALUES (%s, %s, %s, 0, 1, %s)",
                (product_id, image_url, name[:255], now)
            )

        # Product-Category relations
        # Main category
        main_cat_id = main_cat_id_map.get(main_cat)
        sub_cat_id = sub_cat_id_map.get((main_cat, sub_cat))

        if sub_cat_id:
            cursor.execute(
                "INSERT INTO product_categories (product_id, category_id, is_primary) VALUES (%s, %s, 1)",
                (product_id, sub_cat_id)
            )
            # Also link to parent
            if main_cat_id:
                cursor.execute(
                    "INSERT INTO product_categories (product_id, category_id, is_primary) VALUES (%s, %s, 0)",
                    (product_id, main_cat_id)
                )
        elif main_cat_id:
            cursor.execute(
                "INSERT INTO product_categories (product_id, category_id, is_primary) VALUES (%s, %s, 1)",
                (product_id, main_cat_id)
            )

        inserted += 1

        # Commit every batch
        if inserted % batch_size == 0:
            conn.commit()
            print(f"  {inserted} ürün eklendi...")

    conn.commit()
    print(f"\n  Toplam: {inserted} ürün eklendi, {skipped} atlandı")

    # ========== İSTATİSTİKLER ==========
    print("\n===== IMPORT TAMAMLANDI =====")
    cursor.execute("SELECT COUNT(*) FROM brands")
    print(f"  Markalar: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM categories WHERE depth = 0")
    print(f"  Ana kategoriler: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM categories WHERE depth = 1")
    print(f"  Alt kategoriler: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM products")
    print(f"  Ürünler: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM product_images")
    print(f"  Ürün görselleri: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM product_categories")
    print(f"  Ürün-kategori ilişkileri: {cursor.fetchone()[0]}")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
