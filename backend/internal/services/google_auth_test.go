package services

import (
	"context"
	"testing"
)

func TestGoogleLoginRejectsInvalidCredentialsBeforeDatabase(t *testing.T) {
	s := &AuthService{}
	for _, tc := range []struct{ token, audience string }{{"", "client"}, {"token", ""}, {"not-a-jwt", "client.apps.googleusercontent.com"}} {
		token, user, err := s.GoogleLogin(context.Background(), tc.token, tc.audience)
		if err == nil || token != "" || user != nil {
			t.Fatal("invalid credentials accepted")
		}
	}
}
