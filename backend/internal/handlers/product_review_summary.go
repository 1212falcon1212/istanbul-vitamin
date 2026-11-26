package handlers

import (
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/models"
)

func attachProductReviews(products []models.Product) {
	refs := make([]*models.Product, len(products))
	for i := range products {
		refs[i] = &products[i]
	}
	attachReviewSummaries(refs)
}

func attachReviewSummaries(products []*models.Product) {
	if len(products) == 0 {
		return
	}
	ids := make([]uint64, len(products))
	for i, p := range products {
		ids[i] = p.ID
	}
	var rows []struct {
		ProductID     uint64
		AverageRating float64
		TotalCount    int
	}
	err := database.DB.Model(&models.Review{}).Select("product_id, AVG(rating) AS average_rating, COUNT(*) AS total_count").
		Where("product_id IN ? AND is_approved = ?", ids, true).Group("product_id").Scan(&rows).Error
	if err != nil {
		return
	}
	summaries := make(map[uint64]models.ReviewSummary, len(rows))
	for _, r := range rows {
		summaries[r.ProductID] = models.ReviewSummary{AverageRating: r.AverageRating, TotalCount: r.TotalCount}
	}
	for _, p := range products {
		stats := summaries[p.ID]
		p.ReviewStats = &stats
	}
}
