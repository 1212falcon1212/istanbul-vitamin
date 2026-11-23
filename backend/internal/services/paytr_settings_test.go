package services

import (
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/istanbulvitamin/backend/internal/config"
	"testing"
)

func TestPayTRAdminCredentials(t *testing.T) {
	db, m := cartDB(t)
	svc := NewPaymentService(db.db, &config.Config{PayTRMerchantID: "old"})
	m.ExpectQuery("SELECT .*settings").WillReturnRows(sqlmock.NewRows([]string{"key", "value"}))
	id, _, _, err := svc.payTRCredentials()
	if err != nil || id != "old" {
		t.Fatal("environment fallback failed")
	}
	m.ExpectQuery("SELECT .*settings").WillReturnRows(sqlmock.NewRows([]string{"key", "value"}).AddRow("paytr.merchant_id", "123").AddRow("paytr.merchant_key", "fixture-key").AddRow("paytr.merchant_salt", "fixture-salt"))
	id, key, salt, err := svc.payTRCredentials()
	if err != nil || id != "123" || key != "fixture-key" || salt != "fixture-salt" {
		t.Fatal("admin settings not loaded")
	}
	if !IsSecretSetting("paytr.merchant_key") || !IsSecretSetting("paytr.merchant_salt") {
		t.Fatal("PayTR secrets must be masked")
	}
}
