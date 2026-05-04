package aras

import (
	"fmt"

	"github.com/istanbulvitamin/backend/internal/models"
)

// CalculateParcelCount sipariş kalemlerinden toplam ağırlığı çıkarıp
// kgLimit'e (varsayılan 30) bölerek parça sayısını döndürür.
//
// Kurallar:
//   - Toplam ağırlık ≤ kgLimit                → 1 parça
//   - kgLimit < total ≤ 2*kgLimit            → 2 parça
//   - ...
//   - Maks 20 parça (Aras PieceDetails limiti)
//   - Herhangi bir item.Product.Weight nil ise garantili sayım yapamayız → 1 parça döner.
func CalculateParcelCount(items []models.OrderItem, kgLimit float64) int {
	if kgLimit <= 0 {
		kgLimit = 30
	}
	if len(items) == 0 {
		return 1
	}
	total := 0.0
	for _, it := range items {
		if it.Product == nil || it.Product.Weight == nil || *it.Product.Weight <= 0 {
			// Bilinmeyen ağırlık varsa fallback: tek parça.
			return 1
		}
		total += *it.Product.Weight * float64(it.Quantity)
	}
	count := int(total / kgLimit)
	if total > float64(count)*kgLimit {
		count++
	}
	if count < 1 {
		count = 1
	}
	if count > 20 {
		count = 20
	}
	return count
}

// BarcodesFromIntegrationCode integration_code + parça sayısı → her parça için
// "<integration_code>-<n>/<N>" formatında barkod üretir.
//
// Aras BarcodeNumber'ı 64 hanede sınırlıyor; bizim integration_code (örn "ORD-2025-12345")
// rahatlıkla sığar.
func BarcodesFromIntegrationCode(integrationCode string, parcelCount int) []ParcelBarcode {
	if parcelCount <= 0 {
		parcelCount = 1
	}
	out := make([]ParcelBarcode, parcelCount)
	for i := 0; i < parcelCount; i++ {
		out[i] = ParcelBarcode{
			BarcodeNumber: fmt.Sprintf("%s-%d", integrationCode, i+1),
			Sequence:      i + 1,
			Total:         parcelCount,
		}
	}
	return out
}
