package utils

import (
	"regexp"
	"strings"
)

var turkishReplacer = strings.NewReplacer(
	"ç", "c", "Ç", "c",
	"ğ", "g", "Ğ", "g",
	"ı", "i", "İ", "i",
	"ö", "o", "Ö", "o",
	"ş", "s", "Ş", "s",
	"ü", "u", "Ü", "u",
)

var nonAlphanumeric = regexp.MustCompile(`[^a-z0-9]+`)
var leadingTrailingDash = regexp.MustCompile(`^-+|-+$`)

func Slugify(text string) string {
	slug := strings.ToLower(text)
	slug = turkishReplacer.Replace(slug)
	slug = nonAlphanumeric.ReplaceAllString(slug, "-")
	slug = leadingTrailingDash.ReplaceAllString(slug, "")
	return slug
}
