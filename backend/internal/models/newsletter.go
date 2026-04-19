package models

import "time"

type NewsletterSubscriber struct {
	ID               uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Email            string     `gorm:"type:varchar(255);not null;uniqueIndex:uk_newsletter_email" json:"email"`
	UnsubscribeToken string     `gorm:"type:varchar(64);not null;uniqueIndex:uk_newsletter_token" json:"-"`
	IsActive         bool       `gorm:"not null;default:true" json:"is_active"`
	SubscribedAt     time.Time  `gorm:"type:timestamp;not null;default:CURRENT_TIMESTAMP" json:"subscribed_at"`
	UnsubscribedAt   *time.Time `json:"unsubscribed_at,omitempty"`
}

func (NewsletterSubscriber) TableName() string {
	return "newsletter_subscribers"
}
