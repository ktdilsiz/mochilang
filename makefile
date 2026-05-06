.PHONY: dev dev-web dev-api api-build api-tidy

# Run the web client and the Go API together.
dev:
	make -j2 dev-web dev-api

dev-web:
	pnpm --filter web dev

dev-api:
	cd apps/api && go run .

# Build the API binary into apps/api/bin/api.
api-build:
	cd apps/api && go build -o bin/api .

api-tidy:
	cd apps/api && go mod tidy

# Generate static fallback JSON files into the web app's data tree.
# Re-run whenever apps/api/internal/seed/seed.go changes.
api-gen-fallbacks:
	cd apps/api && go run ./cmd/genfallbacks
