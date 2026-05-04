package aras

import (
	"strings"
)

// NormalizePhoneTR girilen telefonu Aras'ın istediği 11 hanelik (0 prefix) formata çevirir.
// Aras dokümanındaki örnek değerler "02164158766", "02165385562" — yani Türkiye sabit/cep
// için klasik 0XXX...XXX formatı.
//
// "+90 (532) 123-4567" → "05321234567"
// "0 532 123 45 67"    → "05321234567"
// "532 123 45 67"      → "05321234567"
//
// 10 hanelik çekirdek (0/+90 prefix'leri çıkarıldıktan sonra) elde edilemiyorsa hata döner.
func NormalizePhoneTR(s string) (string, error) {
	digits := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		if s[i] >= '0' && s[i] <= '9' {
			digits = append(digits, s[i])
		}
	}
	core := strings.TrimPrefix(string(digits), "90")
	core = strings.TrimPrefix(core, "0")
	if len(core) != 10 {
		return "", ErrInvalidPhone
	}
	return "0" + core, nil
}
