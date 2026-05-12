package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	"image/png"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/utils"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
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

// faviconSize tarayıcı sekmesinde göstermek için yeterli boyut (Retina için 64×64).
const faviconSize = 64

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

	// Favicon yüklemesinde raster görselleri 64×64 PNG'ye küçültüyoruz; SVG ve
	// ICO olduğu gibi kalır çünkü vektör/ICO'yu raster pipeline'a sokmak yanlış olur.
	purpose := strings.ToLower(c.FormValue("purpose"))
	isFavicon := purpose == "favicon"
	saveExt := ext
	if isFavicon && ext != ".svg" && ext != ".ico" {
		saveExt = ".png"
	}

	filename := fmt.Sprintf("%d-%s%s", now.UnixNano(), hex.EncodeToString(random), saveExt)
	fullPath := filepath.Join(targetDir, filename)

	if isFavicon && saveExt == ".png" {
		if err := saveResizedFavicon(file, fullPath); err != nil {
			return utils.BadRequest(c, "Favicon işlenemedi: "+err.Error())
		}
	} else {
		if err := c.SaveFile(file, fullPath); err != nil {
			return utils.InternalError(c)
		}
	}

	// Diskteki gerçek dosya boyutu (favicon ise resize sonrası çok daha küçük).
	var savedSize int64 = file.Size
	if info, err := os.Stat(fullPath); err == nil {
		savedSize = info.Size()
	}

	// Tam URL döndür — frontend farklı origin'de (:3000), göreli path 404 olur.
	// c.BaseURL() scheme+host+port tam adresi verir.
	relativePath := "/uploads/" + filepath.ToSlash(filepath.Join(subDir, filename))
	publicURL := strings.TrimRight(c.BaseURL(), "/") + relativePath

	return utils.CreatedResponse(c, fiber.Map{
		"url":      publicURL,
		"path":     relativePath,
		"filename": filename,
		"size":     savedSize,
	})
}

// saveResizedFavicon yüklenen raster görseli faviconSize×faviconSize PNG olarak
// dst yoluna yazar. JPEG/PNG/GIF/WebP kaynaklarını destekler (decoder registry'ye
// import yoluyla register edildi); en-boy oranını korur, kalan alanı şeffaf bırakır.
func saveResizedFavicon(fileHeader *multipart.FileHeader, dst string) error {
	src, err := fileHeader.Open()
	if err != nil {
		return fmt.Errorf("dosya açılamadı: %w", err)
	}
	defer src.Close()

	img, _, err := image.Decode(src)
	if err != nil {
		return fmt.Errorf("görsel çözülemedi: %w", err)
	}

	srcBounds := img.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()

	// En-boy oranını koruyarak faviconSize karesine ortala.
	scale := float64(faviconSize) / float64(srcW)
	if h := float64(faviconSize) / float64(srcH); h < scale {
		scale = h
	}
	dstW := int(float64(srcW) * scale)
	dstH := int(float64(srcH) * scale)
	offX := (faviconSize - dstW) / 2
	offY := (faviconSize - dstH) / 2

	canvas := image.NewNRGBA(image.Rect(0, 0, faviconSize, faviconSize))
	draw.CatmullRom.Scale(canvas, image.Rect(offX, offY, offX+dstW, offY+dstH), img, srcBounds, draw.Over, nil)

	out, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("yazılamadı: %w", err)
	}
	defer out.Close()
	enc := png.Encoder{CompressionLevel: png.BestCompression}
	return enc.Encode(out, canvas)
}
