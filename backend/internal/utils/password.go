package utils

import (
	"errors"
	"unicode"
)

// MinPasswordLength güçlü şifre için minimum uzunluk.
const MinPasswordLength = 8

// ValidatePasswordStrength şifrenin karmaşıklık gereksinimlerini karşılayıp
// karşılamadığını kontrol eder. İhlal varsa Türkçe hata döner.
//
// Kurallar:
//   - En az 8 karakter
//   - En az 1 büyük harf
//   - En az 1 küçük harf
//   - En az 1 rakam
func ValidatePasswordStrength(pw string) error {
	if len(pw) < MinPasswordLength {
		return errors.New("şifre en az 8 karakter olmalıdır")
	}
	var hasUpper, hasLower, hasDigit bool
	for _, r := range pw {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
	}
	if !hasUpper {
		return errors.New("şifre en az bir büyük harf içermelidir")
	}
	if !hasLower {
		return errors.New("şifre en az bir küçük harf içermelidir")
	}
	if !hasDigit {
		return errors.New("şifre en az bir rakam içermelidir")
	}
	return nil
}
