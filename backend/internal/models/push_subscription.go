package models

import "time"

// DeviceHash is an unguessable browser capability hash, never a user identifier.
type PushSubscription struct {
	AccountExpiresAt *time.Time `json:"-"`
	DeviceHash       string     `gorm:"primaryKey;size:64" json:"-"`
	UserID           *uint64    `gorm:"index" json:"-"`
	Marketing        bool       `gorm:"default:false" json:"marketing"`
	Token            string     `gorm:"type:text;not null" json:"-"`
	UpdatedAt        time.Time  `gorm:"index"`
}
