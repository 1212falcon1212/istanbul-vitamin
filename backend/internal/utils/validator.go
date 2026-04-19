package utils

import (
	"net/mail"
	"regexp"
	"strings"
)

var phoneRegex = regexp.MustCompile(`^\+?[0-9\s\-()]{10,20}$`)

func IsValidEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

func IsValidPhone(phone string) bool {
	return phoneRegex.MatchString(phone)
}

func IsValidPassword(password string) bool {
	return len(password) >= 6
}

func SanitizeString(s string) string {
	return strings.TrimSpace(s)
}
