package services

import (
	"context"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/models"
	"testing"
)

func TestMarketingEmailRechecksUnsubscribe(t *testing.T) {
	c, m := cartDB(t)
	m.ExpectQuery("SELECT count.*newsletter_subscribers.*email = .*is_active").WithArgs("test@example.test", true).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))
	s := NotificationService{DB: c.db, Config: &config.Config{}}
	err, skip := s.deliver(context.Background(), models.NotificationDelivery{Channel: "email", Marketing: true, Recipient: "test@example.test"})
	if err != nil || !skip {
		t.Fatal("unsubscribed recipient must be skipped")
	}
}
func TestPushRechecksAccountOwnership(t *testing.T) {
	c, m := cartDB(t)
	id := uint64(7)
	m.ExpectQuery("SELECT .*push_subscriptions.*device_hash = .*updated_at > .*user_id = ").WillReturnRows(sqlmock.NewRows([]string{"device_hash"}))
	s := NotificationService{DB: c.db}
	err, skip := s.deliver(context.Background(), models.NotificationDelivery{Channel: "push", Recipient: "device", UserID: &id})
	if err != nil || !skip {
		t.Fatal("detached device must not receive order push")
	}
}
func TestDisabledWorkerDoesNotReadOrSend(t *testing.T) {
	c, _ := cartDB(t)
	t.Setenv("NOTIFICATION_WORKER_ENABLED", "false")
	s := NotificationService{DB: c.db}
	s.Tick(context.Background())
}
func TestExpandedEventIsNotExpandedTwice(t *testing.T) {
	c, m := cartDB(t)
	m.ExpectBegin()
	m.ExpectQuery("SELECT .*notification_events.*FOR UPDATE").WithArgs(uint64(1), 1).WillReturnRows(sqlmock.NewRows([]string{"id", "expanded"}).AddRow(1, true))
	m.ExpectCommit()
	s := NotificationService{DB: c.db}
	if err := s.expand(models.NotificationEvent{ID: 1}); err != nil {
		t.Fatal(err)
	}
}
