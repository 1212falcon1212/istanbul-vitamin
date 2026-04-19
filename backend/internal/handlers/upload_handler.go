package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type UploadHandler struct {
	cfg *config.Config
}

func NewUploadHandler(cfg *config.Config) *UploadHandler {
	return &UploadHandler{cfg: cfg}
}

// İzinli görsel uzantıları — güvenlik için whitelist.
var allowedImageExt = map[string]struct{}{
	".jpg":  {},
	".jpeg": {},
	".png":  {},
	".webp": {},
	".gif":  {},
	".svg":  {},
}

// maxUploadBytes yüklenebilir dosya boyutu limiti (10 MB).
const maxUploadBytes = 10 * 1024 * 1024

// UploadImage multipart/form-data ile gelen "file" alanını diske yazar,
// sonra public URL'i döndürür. Admin paneli tarafından kullanılır.
func (h *UploadHandler) UploadImage(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return utils.BadRequest(c, "Dosya alınamadı: "+err.Error())
	}

	if file.Size > maxUploadBytes {
		return utils.BadRequest(c, fmt.Sprintf("Dosya boyutu en fazla %d MB olmalı", maxUploadBytes/(1024*1024)))
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if _, ok := allowedImageExt[ext]; !ok {
		return utils.BadRequest(c, "Yalnızca görsel dosyaları yüklenebilir (jpg, png, webp, gif, svg)")
	}

	// Tarih bazlı alt klasör (uploads/2026/04/) + rastgele dosya adı
	now := time.Now()
	subDir := filepath.Join(
		fmt.Sprintf("%04d", now.Year()),
		fmt.Sprintf("%02d", now.Month()),
	)
	targetDir := filepath.Join(h.cfg.UploadDir, subDir)
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return utils.InternalError(c)
	}

	random := make([]byte, 8)
	if _, err := rand.Read(random); err != nil {
		return utils.InternalError(c)
	}
	filename := fmt.Sprintf("%d-%s%s", now.UnixNano(), hex.EncodeToString(random), ext)
	fullPath := filepath.Join(targetDir, filename)

	if err := c.SaveFile(file, fullPath); err != nil {
		return utils.InternalError(c)
	}

	// Tam URL döndür — frontend farklı origin'de (:3000), göreli path 404 olur.
	// c.BaseURL() scheme+host+port tam adresi verir.
	relativePath := "/uploads/" + filepath.ToSlash(filepath.Join(subDir, filename))
	publicURL := strings.TrimRight(c.BaseURL(), "/") + relativePath

	return utils.CreatedResponse(c, fiber.Map{
		"url":      publicURL,
		"path":     relativePath,
		"filename": filename,
		"size":     file.Size,
	})
}
