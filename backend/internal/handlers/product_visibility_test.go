package handlers

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/istanbulvitamin/backend/internal/models"
)

func TestProductCostVisibility(t *testing.T) {
	cost := 42.5
	p := models.Product{ID: 1, Name: "Vitamin", CostPrice: &cost, FeedSourceID: "private-feed"}
	for _, tc := range []struct {
		name  string
		data  any
		admin bool
	}{
		{"detail", p, false}, {"list", []models.Product{p}, false},
		{"nested", map[string]any{"product": &p}, false}, {"admin", productForAdmin(&p), true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			b, err := json.Marshal(tc.data)
			if err != nil {
				t.Fatal(err)
			}
			s := string(b)
			if !strings.Contains(s, `"name":"Vitamin"`) || strings.Contains(s, `"cost_price":42.5`) != tc.admin || strings.Contains(s, "private-feed") != tc.admin {
				t.Fatal("unexpected product representation")
			}
		})
	}
}
