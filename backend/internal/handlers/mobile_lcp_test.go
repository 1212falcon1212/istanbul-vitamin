package handlers

import "testing"

func TestMobilePercentile(t *testing.T) {
	for _, tc := range []struct {
		buckets []int64
		n       int64
		p       int
	}{
		{nil, 0, 0}, {[]int64{0, 3, 1}, 4, 100}, {[]int64{0, 2, 2}, 4, 200}, {[]int64{0, 0, 1}, 1, 200},
	} {
		n, p := mobilePercentile(tc.buckets)
		if n != tc.n || p != tc.p {
			t.Fatalf("got %d, %d", n, p)
		}
	}
}
