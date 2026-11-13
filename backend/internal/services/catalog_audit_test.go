package services

import (
	"encoding/json"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/istanbulvitamin/backend/internal/models"
	"strings"
	"testing"
)

func TestCategoryTreeKeepsDeepChildrenRegardlessOfOrder(t *testing.T) {
	root, child := uint64(1), uint64(2)
	for _, cats := range [][]models.Category{
		{{ID: 1}, {ID: 2, ParentID: &root}, {ID: 3, ParentID: &child}},
		{{ID: 3, ParentID: &child}, {ID: 2, ParentID: &root}, {ID: 1}},
	} {
		tree := buildCategoryTree(cats)
		if len(tree) != 1 || len(tree[0].Children) != 1 || len(tree[0].Children[0].Children) != 1 {
			t.Fatalf("lost nested category: %+v", tree)
		}
	}
}
func TestProductFiltersApplyToCountAndRows(t *testing.T) {
	c, m := cartDB(t)
	s := NewProductService(c.db)
	active := true
	predicate := `products.is_active = \? AND products.brand_id IN \(\?,\?\) AND products.stock > 0 AND products.is_featured = \?`
	m.ExpectQuery(`SELECT count\(\*\).*WHERE `+predicate).WithArgs(true, 2, 3, true).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))
	m.ExpectQuery(`SELECT .*WHERE `+predicate+` ORDER BY products.created_at DESC,products.id DESC LIMIT \?`).WithArgs(true, 2, 3, true, 24).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	_, total, err := s.List(ProductListParams{Page: 1, PerPage: 24, IsActive: &active, BrandIDs: []uint64{2, 3}, InStock: true, SortBy: "featured"})
	if err != nil || total != 0 {
		t.Fatalf("%d %v", total, err)
	}
}
func TestEmptyReviewsEncodeAsArray(t *testing.T) {
	c, m := cartDB(t)
	s := NewReviewService(c.db)
	m.ExpectQuery(`SELECT count`).WithArgs(1, true).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))
	m.ExpectQuery(`SELECT .*reviews`).WithArgs(1, true, 5).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	reviews, _, err := s.List(1, 1, 5)
	if err != nil {
		t.Fatal(err)
	}
	b, _ := json.Marshal(reviews)
	if string(b) != "[]" {
		t.Fatalf("empty reviews: %s", b)
	}
}
func TestReviewLengthBounds(t *testing.T) {
	s := NewReviewService(nil)
	for _, v := range []struct{ title, body string }{{strings.Repeat("x", 201), "valid review body"}, {"", strings.Repeat("x", 5001)}} {
		if _, err := s.Create(1, 1, 5, v.title, v.body); err == nil {
			t.Fatal("oversized review accepted")
		}
	}
}
