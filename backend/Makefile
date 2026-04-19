.PHONY: build run dev clean tidy

# Build
build:
	go build -o bin/server cmd/server/main.go

# Run production binary
run: build
	./bin/server

# Run in development mode
dev:
	go run cmd/server/main.go

# Clean build artifacts
clean:
	rm -rf bin/

# Tidy dependencies
tidy:
	go mod tidy

# Run tests
test:
	go test ./... -v

# Build for Linux (production VPS)
build-linux:
	GOOS=linux GOARCH=amd64 go build -o bin/server-linux cmd/server/main.go
