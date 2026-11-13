package services

import (
	"errors"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/istanbulvitamin/backend/internal/config"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"testing"
)

func cartDB(t *testing.T) (*CartService, sqlmock.Sqlmock) {
	t.Helper()
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	g, err := gorm.Open(mysql.New(mysql.Config{Conn: db, SkipInitializeWithVersion: true}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Error(err)
		}
	})
	return NewCartService(g), mock
}
func TestCartQuantityGuard(t *testing.T) {
	s, _ := cartDB(t)
	for _, q := range []int{0, -1} {
		if s.AddItem(1, 1, nil, q) == nil || s.UpdateItem(1, 1, q) == nil {
			t.Fatal("invalid quantity accepted")
		}
	}
}
func TestCartAddStock(t *testing.T) {
	for _, tc := range []struct {
		name                      string
		active                    bool
		stock, existing, quantity int
		wantError                 bool
	}{{"inactive", false, 10, 0, 1, true}, {"out of stock", true, 0, 0, 1, true}, {"cumulative", true, 3, 2, 2, true}, {"available", true, 3, 0, 2, false}} {
		t.Run(tc.name, func(t *testing.T) {
			s, m := cartDB(t)
			m.ExpectQuery("SELECT .*products").WillReturnRows(sqlmock.NewRows([]string{"id", "is_active", "stock"}).AddRow(1, tc.active, tc.stock))
			if tc.active {
				rows := sqlmock.NewRows([]string{"id", "quantity"})
				if tc.existing > 0 {
					rows.AddRow(7, tc.existing)
				}
				m.ExpectQuery("SELECT .*cart_items").WillReturnRows(rows)
				if !tc.wantError {
					m.ExpectBegin()
					m.ExpectExec("INSERT INTO .*cart_items").WillReturnResult(sqlmock.NewResult(1, 1))
					m.ExpectCommit()
				}
			}
			err := s.AddItem(1, 1, nil, tc.quantity)
			if (err != nil) != tc.wantError {
				t.Fatal(err)
			}
		})
	}
}
func TestCartUpdateOwnershipAndMissingProduct(t *testing.T) {
	t.Run("other cart item", func(t *testing.T) {
		s, m := cartDB(t)
		m.ExpectQuery("SELECT .*cart_items.*id = \\? AND cart_id = \\?").WithArgs(uint64(7), uint64(2), 1).WillReturnRows(sqlmock.NewRows([]string{"id"}))
		if s.UpdateItem(7, 2, 1) == nil {
			t.Fatal("foreign cart accepted")
		}
	})
	t.Run("database failure", func(t *testing.T) {
		s, m := cartDB(t)
		m.ExpectQuery("SELECT .*cart_items").WillReturnRows(sqlmock.NewRows([]string{"id", "product_id"}).AddRow(7, 1))
		m.ExpectQuery("SELECT .*products").WillReturnError(errors.New("db unavailable"))
		if s.UpdateItem(7, 1, 1) == nil {
			t.Fatal("database failure accepted")
		}
	})
}

func TestPaymentMissingCredentialsFailsClosed(t *testing.T) {
	for _, env := range []string{"production", "development"} {
		t.Run(env, func(t *testing.T) {
			t.Setenv("PAYMENT_MOCK_ENABLED", "false")
			s, m := cartDB(t)
			m.ExpectQuery("SELECT .*orders").WillReturnRows(sqlmock.NewRows([]string{"id", "status"}).AddRow(1, "pending"))
			m.ExpectQuery("SELECT .*order_items").WillReturnRows(sqlmock.NewRows([]string{"id"}))
			payment := NewPaymentService(s.db, &config.Config{AppEnv: env})
			if _, err := payment.StartPayment(1, CardPaymentData{}); err == nil {
				t.Fatal("missing provider accepted")
			}
		})
	}
}
