.PHONY: dev dev-web dev-api

dev:
	make -j2 dev-web dev-api

dev-web:
	pnpm --filter web dev

dev-api:
	cd apps/api && go run .