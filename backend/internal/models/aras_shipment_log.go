package models

import "time"

// ArasShipmentLog her Aras SOAP çağrısının audit kaydı.
// Aras destek ekibi sorun olduğunda request/response XML'lerini ister.
type ArasShipmentLog struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderID     uint64    `gorm:"not null;index:idx_aras_logs_order,priority:1" json:"order_id"`
	Op          string    `gorm:"type:varchar(40);not null" json:"op"`
	RequestXML  string    `gorm:"type:mediumtext" json:"request_xml,omitempty"`
	ResponseXML string    `gorm:"type:mediumtext" json:"response_xml,omitempty"`
	StatusCode  string    `gorm:"type:varchar(16)" json:"status_code,omitempty"`
	Error       string    `gorm:"type:varchar(500)" json:"error,omitempty"`
	CreatedAt   time.Time `gorm:"index:idx_aras_logs_order,priority:2" json:"created_at"`
}

func (ArasShipmentLog) TableName() string {
	return "aras_shipment_logs"
}
