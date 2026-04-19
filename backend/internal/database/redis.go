package database

import (
	"context"
	"fmt"
	"log"

	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/redis/go-redis/v9"
)

var Redis *redis.Client

func ConnectRedis(cfg *config.Config) *redis.Client {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Fatalf("Redis bağlantı hatası: %v", err)
	}

	Redis = client
	log.Println("Redis bağlantısı başarılı")
	return client
}
