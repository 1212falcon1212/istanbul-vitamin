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

func TestOrderDetailsAndSafeImages(t *testing.T) {
	_, body := OrderEventEmail("order_received", OrderMail{Number: "TEST", Total: 100, Subtotal: 90, Tax: 10, PaymentMethod: "bank_transfer", PaymentStatus: "review", Address: "<script>address</script>", Items: []OrderMailItem{{Name: "<script>product</script>", Image: "javascript:alert(1)", Quantity: 2, UnitPrice: 45, Total: 90}}})
	for _, want := range []string{"Siparişinizdeki ürünler", "2 adet × 45,00 TL", "90,00 TL", "100,00 TL", "Havale / EFT", "Dekont alındı, kontrol bekliyor", "Teslimat adresi", "&lt;script&gt;product"} {
		if !strings.Contains(body, want) {
			t.Fatalf("missing %s", want)
		}
	}
	for _, bad := range []string{"javascript:", "<script>", "Ödeme onaylandı"} {
		if strings.Contains(body, bad) {
			t.Fatalf("unsafe or false content: %s", bad)
		}
	}
	if got := mailImageURL("/uploads/product.jpg", "http://localhost:3000"); got != "https://istanbulvitamin.com/uploads/product.jpg" {
		t.Fatal(got)
	}
	for _, raw := range []string{"http://localhost:3000/a.png", "https://127.0.0.1/a.png", "data:image/png;base64,abc", "javascript:alert(1)"} {
		if mailImageURL(raw, "") != "" {
			t.Fatalf("unsafe image %s", raw)
		}
	}
}
