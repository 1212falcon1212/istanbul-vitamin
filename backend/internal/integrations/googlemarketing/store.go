package googlemarketing

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

// Store keeps secrets encrypted at rest; the key belongs in server env/secret manager.
type Store struct {
	Path string
	Key  string
	mu   sync.Mutex
}

func (s *Store) aead() (cipher.AEAD, error) {
	key, err := base64.StdEncoding.DecodeString(s.Key)
	if err != nil || len(key) != 32 {
		return nil, errors.New("Sunucuda GOOGLE_CONFIG_KEY (base64 32 byte) gerekli")
	}
	b, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(b)
}
func (s *Store) Load() (Config, error) { s.mu.Lock(); defer s.mu.Unlock(); return s.load() }
func (s *Store) load() (Config, error) {
	var cfg Config
	data, err := os.ReadFile(s.Path)
	if os.IsNotExist(err) {
		return cfg, nil
	}
	if err != nil {
		return cfg, errors.New("Google yapılandırması okunamadı")
	}
	aead, err := s.aead()
	if err != nil {
		return cfg, err
	}
	n := aead.NonceSize()
	if len(data) < n {
		return cfg, errors.New("Google yapılandırması bozuk")
	}
	plain, err := aead.Open(nil, data[:n], data[n:], []byte("iv-google-v1"))
	if err != nil {
		return cfg, errors.New("Google yapılandırması çözülemedi")
	}
	err = json.Unmarshal(plain, &cfg)
	return cfg, err
}
func (s *Store) Save(cfg Config, clear bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := cfg.Validate(); err != nil {
		return err
	}
	aead, err := s.aead()
	if err != nil {
		return err
	}
	old, err := s.load()
	if err != nil {
		return err
	}
	if !clear {
		if cfg.ClientSecret == "" {
			cfg.ClientSecret = old.ClientSecret
		}
		if cfg.RefreshToken == "" {
			cfg.RefreshToken = old.RefreshToken
		}
		if cfg.DeveloperToken == "" {
			cfg.DeveloperToken = old.DeveloperToken
		}
	}
	plain, err := json.Marshal(cfg)
	if err != nil {
		return err
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err = rand.Read(nonce); err != nil {
		return err
	}
	data := aead.Seal(nonce, nonce, plain, []byte("iv-google-v1"))
	if err = os.MkdirAll(filepath.Dir(s.Path), 0700); err != nil {
		return err
	}
	temp, err := os.CreateTemp(filepath.Dir(s.Path), ".google-*")
	if err != nil {
		return err
	}
	defer os.Remove(temp.Name())
	if _, err = temp.Write(data); err != nil {
		temp.Close()
		return err
	}
	if err = temp.Close(); err != nil {
		return err
	}
	return os.Rename(temp.Name(), s.Path)
}
