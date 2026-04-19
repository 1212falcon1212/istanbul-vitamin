package models

import (
	"time"
)

type User struct {
	ID                uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Email             string     `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash      string     `gorm:"type:varchar(255);not null" json:"-"`
	PasswordChangedAt *time.Time `json:"-"`
	FirstName         string     `gorm:"type:varchar(100);not null" json:"first_name"`
	LastName          string     `gorm:"type:varchar(100);not null" json:"last_name"`
	Phone             string     `gorm:"type:varchar(20)" json:"phone"`
	IsActive          bool       `gorm:"default:true" json:"is_active"`
	EmailVerifiedAt   *time.Time `json:"email_verified_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`

	// Relations
	Addresses  []Address   `gorm:"foreignKey:UserID" json:"addresses,omitempty"`
	SavedCards []SavedCard `gorm:"foreignKey:UserID" json:"saved_cards,omitempty"`
	Orders     []Order     `gorm:"foreignKey:UserID" json:"orders,omitempty"`
	Favorites  []Favorite  `gorm:"foreignKey:UserID" json:"favorites,omitempty"`
}

func (User) TableName() string {
	return "users"
}

type Admin struct {
	ID                uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Email             string     `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash      string     `gorm:"type:varchar(255);not null" json:"-"`
	PasswordChangedAt *time.Time `json:"-"`
	FullName          string     `gorm:"type:varchar(200);not null" json:"full_name"`
	Role              string     `gorm:"type:enum('super_admin','admin','editor');default:'editor'" json:"role"`
	IsActive          bool       `gorm:"default:true" json:"is_active"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func (Admin) TableName() string {
	return "admins"
}
