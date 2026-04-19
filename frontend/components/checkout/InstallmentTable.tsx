"use client";

import { formatPrice } from "@/lib/utils";

interface InstallmentOption {
  count: number;
  monthly_amount: number;
  total_amount: number;
}

interface InstallmentTableProps {
  options: InstallmentOption[];
  selectedCount: number;
  onSelect: (count: number) => void;
}

export default function InstallmentTable({
  options,
  selectedCount,
  onSelect,
}: InstallmentTableProps) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-text-primary">
        Taksit Secenekleri
      </h4>
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-primary">
              <th className="text-left px-4 py-2.5 text-text-secondary font-medium">
                Taksit Sayisi
              </th>
              <th className="text-right px-4 py-2.5 text-text-secondary font-medium">
                Aylik Tutar
              </th>
              <th className="text-right px-4 py-2.5 text-text-secondary font-medium">
                Toplam Tutar
              </th>
            </tr>
          </thead>
          <tbody>
            {options.map((option) => (
              <tr
                key={option.count}
                onClick={() => onSelect(option.count)}
                className={`cursor-pointer transition-colors ${
                  selectedCount === option.count
                    ? "bg-primary-soft"
                    : "hover:bg-bg-primary"
                }`}
              >
                <td className="px-4 py-3 flex items-center gap-2">
                  <input
                    type="radio"
                    name="installment"
                    checked={selectedCount === option.count}
                    onChange={() => onSelect(option.count)}
                    className="accent-primary"
                  />
                  <span className="text-text-primary">
                    {option.count === 1
                      ? "Tek Cekim"
                      : `${option.count} Taksit`}
                  </span>
                </td>
                <td className="text-right px-4 py-3 text-text-primary">
                  {formatPrice(option.monthly_amount)}
                </td>
                <td className="text-right px-4 py-3 font-medium text-text-primary">
                  {formatPrice(option.total_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
