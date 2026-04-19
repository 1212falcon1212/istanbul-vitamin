package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type SkinConcern struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Slug        string   `json:"slug"`
	Icon        string   `json:"icon"`
	Count       int64    `json:"count"`
	Description string   `json:"description,omitempty"`
	Keywords    []string `json:"-"`
}

// ConcernKeywords belirtilen concern slug için ürün filtresi için LIKE kalıpları döner.
func ConcernKeywords(slug string) []string {
	for _, c := range concernKeywords {
		if c.Slug == slug {
			return c.Keywords
		}
	}
	return nil
}

// ConcernBySlug slug ile statik concern kaydını döner (endpoint için).
func ConcernBySlug(slug string) *SkinConcern {
	for _, c := range concernKeywords {
		if c.Slug == slug {
			return &SkinConcern{
				ID:   c.ID,
				Name: c.Name,
				Slug: c.Slug,
				Icon: c.Icon,
			}
		}
	}
	return nil
}

type SkinConcernsHandler struct{}

func NewSkinConcernsHandler() *SkinConcernsHandler {
	return &SkinConcernsHandler{}
}

// concernKeywords maps each concern slug to the LIKE patterns used to count matching products.
var concernKeywords = []struct {
	ID       int
	Name     string
	Slug     string
	Icon     string
	Keywords []string
}{
	{
		ID:       1,
		Name:     "Akne",
		Slug:     "akne",
		Icon:     "🔬",
		Keywords: []string{"%akne%", "%sivilce%", "%porlarin%"},
	},
	{
		ID:       2,
		Name:     "Leke",
		Slug:     "leke",
		Icon:     "✨",
		Keywords: []string{"%leke%", "%hiperpigmentasyon%", "%cilt tonu%"},
	},
	{
		ID:       3,
		Name:     "Yaşlanma Karşıtı",
		Slug:     "yaslanma",
		Icon:     "⏳",
		Keywords: []string{"%yaslanma%", "%anti-aging%", "%kirisik%", "%anti aging%"},
	},
	{
		ID:       4,
		Name:     "Kuru Cilt",
		Slug:     "kuru-cilt",
		Icon:     "💧",
		Keywords: []string{"%kuru cilt%", "%nemlendirici%", "%kuruluk%"},
	},
	{
		ID:       5,
		Name:     "Hassas Cilt",
		Slug:     "hassas-cilt",
		Icon:     "🌸",
		Keywords: []string{"%hassas cilt%", "%hassas%", "%tahrisbaslik%"},
	},
	{
		ID:       6,
		Name:     "Saç Dökülmesi",
		Slug:     "sac-dokulmesi",
		Icon:     "🌿",
		Keywords: []string{"%sac dokulmesi%", "%sac dokülmesi%", "%saç dökülmesi%", "%saç güçlendirici%"},
	},
}

// List statik cilt kaygılarını gerçek ürün sayıları ile döndürür.
// GET /api/v1/skin-concerns
func (h *SkinConcernsHandler) List(c *fiber.Ctx) error {
	var concerns []SkinConcern

	for _, def := range concernKeywords {
		var count int64
		query := database.DB.Model(&models.Product{}).Where("is_active = ?", true)

		// Build OR conditions for all keywords
		orQuery := database.DB.Model(&models.Product{})
		for i, kw := range def.Keywords {
			if i == 0 {
				orQuery = orQuery.Where("name LIKE ?", kw)
			} else {
				orQuery = orQuery.Or("name LIKE ?", kw)
			}
		}
		query = query.Where(orQuery)

		if err := query.Count(&count).Error; err != nil {
			// On DB error, use 0 count but don't fail the entire endpoint
			count = 0
		}

		concerns = append(concerns, SkinConcern{
			ID:    def.ID,
			Name:  def.Name,
			Slug:  def.Slug,
			Icon:  def.Icon,
			Count: count,
		})
	}

	return utils.SuccessResponse(c, fiber.Map{
		"concerns": concerns,
	})
}

// GetBySlug tek concern kaydını döner.
// GET /api/v1/skin-concerns/:slug
func (h *SkinConcernsHandler) GetBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	concern := ConcernBySlug(slug)
	if concern == nil {
		return utils.NotFound(c, "Cilt sorunu")
	}

	// Ürün sayısı
	if kws := ConcernKeywords(slug); len(kws) > 0 {
		orQuery := database.DB.Model(&models.Product{})
		for i, kw := range kws {
			if i == 0 {
				orQuery = orQuery.Where("name LIKE ?", kw)
			} else {
				orQuery = orQuery.Or("name LIKE ?", kw)
			}
		}
		var cnt int64
		database.DB.Model(&models.Product{}).
			Where("is_active = ?", true).
			Where(orQuery).
			Count(&cnt)
		concern.Count = cnt
	}

	descriptions := map[string]string{
		"akne":          "Akne ve sivilce eğilimli ciltler için dermatoloji onaylı bakım ürünleri. Gözenekleri sıkılaştıran, yağ dengesini düzenleyen formüller.",
		"leke":          "Cilt tonu eşitsizliği, lekeler ve hiperpigmentasyon için aydınlatıcı ve onarıcı bakım ürünleri.",
		"yaslanma":      "Yaşlanma karşıtı aktiflerle zenginleştirilmiş, cildi sıkılaştıran ve ince çizgileri azaltan serumlar ve kremler.",
		"kuru-cilt":     "Kuruluk, gerginlik ve soyulma eğilimi gösteren ciltler için nemlendirici ve onarıcı ürünler.",
		"hassas-cilt":   "Kızarıklık, tahriş ve hassasiyete eğilimli ciltler için yatıştırıcı, irritasyonsuz formüller.",
		"sac-dokulmesi": "Saç dökülmesini azaltan, saç köklerini güçlendiren dermokozmetik şampuanlar ve saç serumları.",
	}
	concern.Description = descriptions[slug]

	return utils.SuccessResponse(c, fiber.Map{
		"concern": concern,
	})
}
