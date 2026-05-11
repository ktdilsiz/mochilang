package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// handleListLocales returns the codes of every supported UI locale.
// Clients use this to populate a language picker. Public — same for
// every account.
func (s *Server) handleListLocales(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"locales": s.i18n.List()})
}

// handleGetLocale streams the raw JSON dict for the requested locale.
// 404 on unknown codes so the client can fall back to its bundled
// English dictionary without retrying.
func (s *Server) handleGetLocale(c *gin.Context) {
	code := c.Param("locale")
	body, ok := s.i18n.Get(code)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "locale not found"})
		return
	}
	// UI strings change rarely within a session; let the client cache.
	c.Header("Cache-Control", "public, max-age=300")
	c.Data(http.StatusOK, "application/json; charset=utf-8", body)
}
