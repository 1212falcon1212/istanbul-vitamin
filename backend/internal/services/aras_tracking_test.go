package services

import (
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestArasDelayedTrackingQueuesOnceWithOrderUpdate(t *testing.T) {
	for _, tc := range []struct {
		name, existing string
		failQueue      bool
	}{
		{"first number", "", false}, {"repeated refresh", "123456", false}, {"queue failure rolls back tracking", "", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			cart, m := cartDB(t)
			m.ExpectBegin()
			m.ExpectQuery("SELECT .*orders.*FOR UPDATE").WillReturnRows(sqlmock.NewRows([]string{"id", "status", "aras_integration_code", "tracking_number"}).AddRow(130, "shipped", "IV130", tc.existing))
			if tc.existing == "" {
				m.ExpectExec("UPDATE .orders. SET .*tracking_number").WillReturnResult(sqlmock.NewResult(0, 1))
				insert := m.ExpectExec("INSERT INTO .notification_events.").WithArgs("order:130:tracking_available", "tracking_available", 130, 0, false, sqlmock.AnyArg())
				if tc.failQueue {
					insert.WillReturnError(errors.New("queue unavailable"))
				} else {
					insert.WillReturnResult(sqlmock.NewResult(1, 1))
				}
			}
			if tc.failQueue {
				m.ExpectRollback()
			} else {
				m.ExpectCommit()
			}
			err := NewOrderService(cart.db).ApplyArasShipment(130, "IV130", "123456", "Aras Kargo", 1)
			if (err != nil) != tc.failQueue {
				t.Fatalf("unexpected result: %v", err)
			}
		})
	}
}
