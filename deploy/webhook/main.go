// GitHub webhook listener for istanbul-vitamin.
//
// Listens on WEBHOOK_ADDR, verifies GitHub's X-Hub-Signature-256 using
// WEBHOOK_SECRET, and on every valid push to the watched branch runs
// DEPLOY_SCRIPT. Deploys are serialized (one at a time) and output is
// streamed to stdout so journalctl captures it.
//
// Env:
//   WEBHOOK_ADDR    listen address, default ":9000"
//   WEBHOOK_SECRET  GitHub webhook secret (required)
//   WEBHOOK_BRANCH  branch to deploy, default "main"
//   DEPLOY_SCRIPT   path to deploy.sh, default "/opt/istanbul-vitamin/deploy/deploy.sh"

package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

type pushPayload struct {
	Ref string `json:"ref"`
	After string `json:"after"`
	Repository struct {
		FullName string `json:"full_name"`
	} `json:"repository"`
	HeadCommit struct {
		Message string `json:"message"`
	} `json:"head_commit"`
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

var deployMu sync.Mutex

func main() {
	addr := env("WEBHOOK_ADDR", ":9000")
	secret := os.Getenv("WEBHOOK_SECRET")
	branch := env("WEBHOOK_BRANCH", "main")
	script := env("DEPLOY_SCRIPT", "/opt/istanbul-vitamin/deploy/deploy.sh")

	if secret == "" {
		log.Fatal("WEBHOOK_SECRET is required")
	}
	if _, err := os.Stat(script); err != nil {
		log.Fatalf("deploy script not found at %s: %v", script, err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/webhook", func(w http.ResponseWriter, r *http.Request) {
		if err := handle(r, secret, branch, script); err != nil {
			log.Printf("webhook rejected: %v", err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte("queued"))
	})

	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}
	log.Printf("webhook listening on %s (branch=%s, script=%s)", addr, branch, script)
	log.Fatal(srv.ListenAndServe())
}

func handle(r *http.Request, secret, branch, script string) error {
	if r.Method != http.MethodPost {
		return errors.New("method not allowed")
	}
	switch r.Header.Get("X-GitHub-Event") {
	case "ping":
		log.Print("received GitHub ping")
		return nil
	case "push":
		// ok
	default:
		return errors.New("unsupported event")
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 5<<20))
	if err != nil {
		return err
	}
	if err := verifySignature(r.Header.Get("X-Hub-Signature-256"), body, secret); err != nil {
		return err
	}

	var p pushPayload
	if err := json.Unmarshal(body, &p); err != nil {
		return err
	}

	want := "refs/heads/" + branch
	if p.Ref != want {
		log.Printf("skip: ref=%s (watching %s)", p.Ref, want)
		return nil
	}

	msg := strings.SplitN(p.HeadCommit.Message, "\n", 2)[0]
	log.Printf("push to %s → %.7s %q — triggering deploy", p.Ref, p.After, msg)
	go runDeploy(script)
	return nil
}

func verifySignature(header string, body []byte, secret string) error {
	if !strings.HasPrefix(header, "sha256=") {
		return errors.New("missing or malformed signature header")
	}
	sig, err := hex.DecodeString(strings.TrimPrefix(header, "sha256="))
	if err != nil {
		return errors.New("signature not hex")
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	if !hmac.Equal(sig, mac.Sum(nil)) {
		return errors.New("signature mismatch")
	}
	return nil
}

func runDeploy(script string) {
	if !deployMu.TryLock() {
		log.Print("deploy already in progress — skipping")
		return
	}
	defer deployMu.Unlock()

	cmd := exec.Command("/usr/bin/env", "bash", script)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	start := time.Now()
	if err := cmd.Run(); err != nil {
		log.Printf("deploy FAILED after %s: %v", time.Since(start).Round(time.Second), err)
		return
	}
	log.Printf("deploy OK in %s", time.Since(start).Round(time.Second))
}
