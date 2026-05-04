package aras

import "errors"

// Aras servisinden dönen tipik hata durumları.
var (
	ErrConfigDisabled = errors.New("aras kargo entegrasyonu kapalı")
	ErrConfigMissing  = errors.New("aras kargo kimlik bilgileri eksik")
	ErrInvalidPhone   = errors.New("telefon numarası geçersiz (TR formatı: 11 hane veya +90 prefix'li 12 hane)")
	ErrAlreadyShipped = errors.New("sipariş zaten kargoya verilmiş")
	ErrCannotCancel   = errors.New("kargo zaten irsaliye kesildiği için iptal edilemiyor")
	ErrNoTracking     = errors.New("kargo takip numarası henüz oluşmadı")
	ErrSenderAddrUnregistered = errors.New("gönderici adresi henüz Aras'a kaydedilmedi (Ayarlar → Kargo)")
)
