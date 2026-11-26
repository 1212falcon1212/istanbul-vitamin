package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/utils"
	"github.com/redis/go-redis/v9"
	"strconv"
	"time"
)

// Each UTC day and page type has at most 1201 counters, rounded up to 100 ms.
var measuredPages = []string{"home", "category", "product"}

func lcpKey(day time.Time, page string) string {
	return "rum:lcp:v1:" + day.UTC().Format("2006-01-02") + ":" + page
}

func RecordMobileLCP(c *fiber.Ctx) error {
	var metric struct {
		Page   string `json:"page"`
		Millis int    `json:"ms"`
	}
	if len(c.Body()) > 128 || c.BodyParser(&metric) != nil || metric.Millis <= 0 || metric.Millis > 600000 {
		return c.SendStatus(400)
	}
	switch metric.Page {
	case "home", "category", "product":
	default:
		return c.SendStatus(400)
	}
	ctx := c.UserContext()
	key := lcpKey(time.Now(), metric.Page)
	bucket := min((metric.Millis+99)/100, 1201)
	pipe := database.Redis.TxPipeline()
	pipe.HIncrBy(ctx, key, strconv.Itoa(bucket), 1)
	pipe.Expire(ctx, key, 8*24*time.Hour)
	if _, err := pipe.Exec(ctx); err != nil {
		return c.SendStatus(503)
	}
	return c.SendStatus(204)
}

type lcpReport struct {
	Page    string `json:"page"`
	Samples int64  `json:"samples"`
	P75     int    `json:"p75_ms"`
}

func mobilePercentile(buckets []int64) (samples int64, p75 int) {
	for _, n := range buckets {
		samples += n
	}
	if samples == 0 {
		return
	}
	var seen int64
	for i, n := range buckets {
		seen += n
		if seen*4 >= samples*3 {
			return samples, i * 100
		}
	}
	return
}

func MobileLCPReport(c *fiber.Ctx) error {
	now := time.Now().UTC()
	reports := make([]lcpReport, 0, len(measuredPages))
	for _, page := range measuredPages {
		buckets := make([]int64, 1202)
		pipe := database.Redis.Pipeline()
		for back := 0; back < 7; back++ {
			pipe.HGetAll(c.UserContext(), lcpKey(now.AddDate(0, 0, -back), page))
		}
		results, err := pipe.Exec(c.UserContext())
		if err != nil {
			return utils.InternalError(c)
		}
		for _, result := range results {
			for raw, count := range result.(*redis.MapStringStringCmd).Val() {
				i, e := strconv.Atoi(raw)
				n, err := strconv.ParseInt(count, 10, 64)
				if e == nil && err == nil && i > 0 && i < len(buckets) {
					buckets[i] += n
				}
			}
		}
		total, p75 := mobilePercentile(buckets)
		reports = append(reports, lcpReport{page, total, p75})
	}
	return utils.SuccessResponse(c, reports)
}
