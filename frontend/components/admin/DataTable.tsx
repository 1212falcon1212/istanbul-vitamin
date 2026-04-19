"use client";

import Spinner from "@/components/ui/Spinner";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = "Veri bulunamadi.",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  // Backend bazen {orders:[], pagination} şeklinde sarmalı döndürür — toleranslı ol
  const rows: T[] = Array.isArray(data)
    ? data
    : extractArray<T>(data) ?? [];

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-text-secondary text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-bg-primary border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-3 font-medium text-text-secondary whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((item, rowIdx) => (
            <tr
              key={rowIdx}
              className={`${
                rowIdx % 2 === 0 ? "bg-card-bg" : "bg-bg-primary/50"
              } hover:bg-primary-soft/30 transition-colors`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                  {col.render
                    ? col.render(item)
                    : ((item as Record<string, unknown>)[col.key] as React.ReactNode) ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function extractArray<T>(value: unknown): T[] | null {
  if (!value || typeof value !== "object") return null;
  for (const v of Object.values(value as Record<string, unknown>)) {
    if (Array.isArray(v)) return v as T[];
  }
  return null;
}
