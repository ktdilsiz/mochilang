// Package server wires the HTTP layer: middleware, routes, handlers.
package server

import (
	"net/http"
	"slices"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ktdilsiz/mochilang/api/internal/auth"
	"github.com/ktdilsiz/mochilang/api/internal/config"
	"github.com/ktdilsiz/mochilang/api/internal/store"
)

// SessionCookieName is what we set in /api/auth/google and read in
// requireSession. Any change here is a breaking client deploy — every
// existing session in the wild gets logged out.
const SessionCookieName = "mochilang_session"

// SessionTTL controls how long a freshly-minted session cookie lives.
const SessionTTL = 30 * 24 * time.Hour

type Server struct {
	cfg          config.Config
	store        *store.Store
	now          func() time.Time
	googleVerify *auth.GoogleVerifier
}

func New(cfg config.Config, s *store.Store) *Server {
	return &Server{
		cfg:          cfg,
		store:        s,
		now:          time.Now,
		googleVerify: auth.NewGoogleVerifier(cfg.GoogleClientID),
	}
}

func (s *Server) Engine() *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(s.requestLogger())
	r.Use(s.cors())

	r.GET("/health", s.handleHealth)
	r.GET("/api/health", s.handleHealth)

	// Auth routes are open: the client doesn't have a session yet when it
	// hits these. /api/auth/me deliberately doesn't 401 — it returns
	// {authenticated: false} so the LoginScreen can detect "not logged in"
	// without a thrown error in the console.
	r.POST("/api/auth/google", s.handleGoogleLogin)
	r.POST("/api/auth/logout", s.handleLogout)
	r.GET("/api/auth/me", s.handleMe)

	api := r.Group("/api")
	api.Use(s.requireSession())
	{
		api.GET("/profile", s.handleGetProfile)
		api.PUT("/profile", s.handleUpdateProfile)
		api.POST("/profile/reset", s.handleResetProfile)
		api.POST("/profile/dismiss-banner", s.handleDismissBanner)

		api.GET("/progress", s.handleGetProgress)
		api.POST("/progress/lessons", s.handleRecordCompletion)
		api.POST("/progress/reset", s.handleResetProgress)

		api.GET("/friends", s.handleListFriends)
		api.GET("/league", s.handleLeague)
	}

	return r
}

const userIDKey = "userId"

// requireSession reads the session cookie, looks up the row, and stashes
// the user_id into the gin context. Failed lookups → 401.
//
// Sliding expiration: every request past mid-life refreshes last_seen_at
// so an actively used session keeps living, while idle ones expire.
func (s *Server) requireSession() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, err := c.Cookie(SessionCookieName)
		if err != nil || raw == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "no session"})
			return
		}
		sess, err := s.store.GetSession(c, auth.HashToken(raw))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
			return
		}
		// Touch is best-effort; don't fail the request if it errors.
		_ = s.store.TouchSession(c, sess.ID)
		c.Set(userIDKey, sess.UserID)
		c.Next()
	}
}

func userIDFrom(c *gin.Context) string {
	v, _ := c.Get(userIDKey)
	id, _ := v.(string)
	return id
}

// setSessionCookie writes the cookie with the right SameSite/Secure mix.
// SameSite=None + Secure is required for the cross-origin localhost dev
// flow (web on :5175, api on :8181). Browsers treat localhost as a
// secure context so this works without HTTPS in dev too.
func (s *Server) setSessionCookie(c *gin.Context, value string, maxAge int) {
	sameSite := http.SameSiteNoneMode
	c.SetSameSite(sameSite)
	c.SetCookie(
		SessionCookieName,
		value,
		maxAge,
		"/",
		"", // domain — empty = current host
		s.cfg.SecureCookies,
		true, // HttpOnly
	)
}

func (s *Server) clearSessionCookie(c *gin.Context) {
	s.setSessionCookie(c, "", -1)
}

func (s *Server) requestLogger() gin.HandlerFunc {
	return gin.LoggerWithConfig(gin.LoggerConfig{
		SkipPaths: []string{"/health", "/api/health"},
	})
}

func (s *Server) cors() gin.HandlerFunc {
	allowed := s.cfg.CORSOrigins
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && slices.Contains(allowed, origin) {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Max-Age", "600")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
