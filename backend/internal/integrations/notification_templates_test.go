package integrations

import (
	"strings"
	"testing"
)

func TestLifecycleTemplatesEscapeAndSeparateRefund(t *testing.T) {
	kinds := []string{"order_received", "payment_confirmed", "shipped", "delivered", "cancelled", "refunded", "refund_completed", "return_requested", "return_approved", "return_rejected", "return_completed", "cancel_requested", "cancel_approved", "cancel_rejected", "cancel_completed"}
	for _, kind := range kinds {
		subject, body := OrderEventEmail(kind, OrderMail{Number: "IV-1", Name: "<script>alert(1)</script>", Tracking: "<img>", Company: "A&B", URL: "https://example.test/hesabim", Total: 12.5})
		if subject == "" || !strings.Contains(body, "Sipariş") || strings.Contains(body, "<script>") || strings.Contains(body, "<img>") {
			t.Fatalf("invalid %s", kind)
		}
	}
	_, body := OrderEventEmail("refunded", OrderMail{})
	if !strings.Contains(body, "anlamına gelmez") {
		t.Fatal("return must not assert money received")
	}
	_, body = CampaignEmail("<script>", "<img>", "https://example.test", "https://example.test/unsubscribe")
	if strings.Contains(body, "<script>") || strings.Contains(body, "<img>") || !strings.Contains(body, "Abonelikten çık") {
		t.Fatal("unsafe campaign")
	}
}
