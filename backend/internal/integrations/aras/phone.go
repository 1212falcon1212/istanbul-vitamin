package aras

import (
	"strings"
)

// NormalizePhoneTR girilen telefonu Aras'ın istediği 10 hanelik sayısal formata çevirir.
// "+90 (532) 123-4567" → "5321234567"
// "0 532 123 45 67"   → "5321234567"
// "532 123 45 67"     → "5321234567"
//
// 10 haneye düşmüyorsa veya sıfır geliyorsa hata döner.
func NormalizePhoneTR(s string) (string, error) {
	digits := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		if s[i] >= '0' && s[i] <= '9' {
			digits = append(digits, s[i])
		}
	}
	out := strings.TrimPrefix(string(digits), "90")
	out = strings.TrimPrefix(out, "0")
	if len(out) != 10 {
		return "", ErrInvalidPhone
	}
	return out, nil
}
