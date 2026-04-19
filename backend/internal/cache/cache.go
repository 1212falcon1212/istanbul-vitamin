package cache

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/istanbulvitamin/backend/internal/database"
)

// Get T tipinde JSON cache'den okur. Yoksa (miss) veya hata durumunda
// zero value ve found=false döner. Redis error veya unmarshal error
// durumunda da sessizce (zero, false) dönülür — cache opsiyoneldir.
func Get[T any](ctx context.Context, key string) (T, bool) {
	var zero T
	if database.Redis == nil {
		return zero, false
	}
	if ctx == nil {
		ctx = context.Background()
	}

	raw, err := database.Redis.Get(ctx, key).Bytes()
	if err != nil {
		// redis.Nil miss anlamına gelir — sessizce atla.
		// Diğer hataları da sessiz tutuyoruz; cache opsiyonel.
		return zero, false
	}

	var value T
	if err := json.Unmarshal(raw, &value); err != nil {
		// Bozuk veri: log'la ama hata dönme, DB fallback devreye girsin.
		log.Printf("cache: unmarshal hatası key=%s err=%v", key, err)
		return zero, false
	}
	return value, true
}

// Set TTL ile yazar. Hata log'lanır ama bubble etmez.
func Set[T any](ctx context.Context, key string, value T, ttl time.Duration) {
	if database.Redis == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	data, err := json.Marshal(value)
	if err != nil {
		log.Printf("cache: marshal hatası key=%s err=%v", key, err)
		return
	}

	if err := database.Redis.Set(ctx, key, data, ttl).Err(); err != nil {
		log.Printf("cache: set hatası key=%s err=%v", key, err)
	}
}

// Del bir veya daha çok key siler. Hata log'lanır ama bubble etmez.
func Del(ctx context.Context, keys ...string) {
	if database.Redis == nil || len(keys) == 0 {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	if err := database.Redis.Del(ctx, keys...).Err(); err != nil {
		log.Printf("cache: del hatası keys=%v err=%v", keys, err)
	}
}

// DelPrefix verilen prefix ile başlayan tüm key'leri siler. SCAN kullanır,
// prod'da KEYS'ten daha güvenlidir.
func DelPrefix(ctx context.Context, prefix string) {
	if database.Redis == nil || prefix == "" {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	pattern := prefix + "*"
	var cursor uint64
	for {
		keys, next, err := database.Redis.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			log.Printf("cache: scan hatası pattern=%s err=%v", pattern, err)
			return
		}
		if len(keys) > 0 {
			if err := database.Redis.Del(ctx, keys...).Err(); err != nil {
				log.Printf("cache: del hatası (prefix) keys=%v err=%v", keys, err)
			}
		}
		if next == 0 {
			break
		}
		cursor = next
	}
}

// Remember cache-through: key varsa cache'den döner, yoksa fn() çağırır
// ve başarılı sonucu TTL ile cache'ler. fn() hata dönerse cache'lenmez
// ve hata yukarı çıkar.
func Remember[T any](ctx context.Context, key string, ttl time.Duration, fn func() (T, error)) (T, error) {
	if v, ok := Get[T](ctx, key); ok {
		return v, nil
	}

	v, err := fn()
	if err != nil {
		return v, err
	}

	Set(ctx, key, v, ttl)
	return v, nil
}

