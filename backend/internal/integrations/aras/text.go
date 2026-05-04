package aras

import (
	"strings"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

// trCaser Türkçe locale ile İ/ı dönüşümünü doğru yapar.
// "şişli" → "ŞİŞLİ"  (default UpperCase: "ŞIŞLI" — yanlış)
var trCaser = cases.Upper(language.Turkish)

// UpperTR Aras'ın eşleştirdiği şehir/ilçe normalleştirmesi.
// Aras zaman zaman küçük harf gönderimleri reddediyor; UPPER'a almak güvenli.
func UpperTR(s string) string {
	return trCaser.String(strings.TrimSpace(s))
}

// SafeReceiverName Aras "Argo" içeren alıcı adlarını reddediyor (kendi marka kuralları).
// Karakteri "rgo" geçen müşteri adı varsa nokta ile bölüyoruz; pratikte çok ender.
func SafeReceiverName(s string) string {
	clean := strings.TrimSpace(s)
	// "Argo" eşleşmesini büyük/küçük harf duyarsız bul
	low := strings.ToLower(clean)
	if !strings.Contains(low, "argo") {
		return clean
	}
	// Bir nokta ekleyerek tek kelime olmaktan çıkar — Aras alfanumerik diziyi tokenize ediyor.
	return strings.ReplaceAll(clean, "argo", "a.rgo")
}
