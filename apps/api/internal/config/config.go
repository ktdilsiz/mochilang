// Package config loads environment-driven settings for the API.
package config

import (
	"os"
	"strings"
)

type Config struct {
	// Listen address, e.g. ":8080".
	Addr string
	// SQLite file path for the main DB (identity, profile, progress, canonical
	// content, community pack bodies). The Go SQLite driver creates the file
	// if it doesn't exist.
	DBPath string
	// SQLite file path for the community DB (ratings, comments, reports,
	// moderation). Kept separate so UGC chatter can be wiped or migrated
	// independently of identity/canonical data.
	CommunityDBPath string
	// CORS allowed origins. Defaults to local Vite dev servers.
	CORSOrigins []string
	// Google OAuth Client ID — also known as the "audience" the ID token
	// validator checks against. Empty means "auth is misconfigured" and
	// /api/auth/google will return 503.
	GoogleClientID string
	// SecureCookies sets the Secure flag on session cookies. Default true
	// (Chrome/Firefox treat localhost as secure context, so it works in dev
	// too). Override only if testing a non-localhost dev origin over HTTP.
	SecureCookies bool
}

func Load() Config {
	return Config{
		Addr:            getenv("MOCHILANG_API_ADDR", ":8181"),
		DBPath:          getenv("MOCHILANG_API_DB", "./mochilang.db"),
		CommunityDBPath: getenv("MOCHILANG_API_COMMUNITY_DB", "./mochilang-community.db"),
		CORSOrigins:     splitCSV(getenv("MOCHILANG_API_CORS", "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177")),
		GoogleClientID:  getenv("MOCHILANG_GOOGLE_CLIENT_ID", ""),
		SecureCookies:   getenv("MOCHILANG_SECURE_COOKIES", "true") != "false",
	}
}

func getenv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func splitCSV(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
