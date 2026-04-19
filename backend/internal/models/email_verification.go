package models

import "time"

type EmailVerification struct {
	ID         uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID     uint64     `gorm:"not null;index" json:"user_id"`
	TokenHash  string     `gorm:"type:varchar(255);not null;index" json:"-"`
	ExpiresAt  time.Time  `gorm:"not null" json:"expires_at"`
	VerifiedAt *time.Time `json:"verified_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

func (EmailVerification) TableName() string {
	return "email_verifications"
}
