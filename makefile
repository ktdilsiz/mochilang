.PHONY: dev dev-web dev-web-lan dev-api dev-mobile api-build api-tidy

# Run the web client and the Go API together.
dev:
	make -j2 dev-web dev-api

dev-web:
	pnpm --filter web dev

# Same as dev-web but vite listens on 0.0.0.0 so a phone on the same
# WiFi can reach it. Use this with apps/mochilang-mobile.
dev-web-lan:
	pnpm --filter web dev -- --host

dev-api:
	cd apps/api && go run .

# Boot the Expo dev server for the WebView wrapper. Open the QR code
# from the terminal in Expo Go on a phone (same WiFi as your laptop).
dev-mobile:
	pnpm --filter mochilang-mobile start

# Build the API binary into apps/api/bin/api.
api-build:
	cd apps/api && go build -o bin/api .

api-tidy:
	cd apps/api && go mod tidy

# Generate static fallback JSON files into the web app's data tree.
# Re-run whenever apps/api/internal/seed/seed.go changes.
api-gen-fallbacks:
	cd apps/api && go run ./cmd/genfallbacks
