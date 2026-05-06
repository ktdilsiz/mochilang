package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ktdilsiz/mochilang/api/internal/auth"
)

type googleLoginRequest struct {
	IDToken string `json:"idToken" binding:"required"`
}

type meResponse struct {
	Authenticated bool          `json:"authenticated"`
	User          *meUserPayload `json:"user,omitempty"`
}

type meUserPayload struct {
	ID       string  `json:"id"`
	Email    string  `json:"email"`
	Name     *string `json:"name"`
	Picture  *string `json:"picture"`
	AvatarID string  `json:"avatarId"`
}

func (s *Server) handleGoogleLogin(c *gin.Context) {
	if s.cfg.GoogleClientID == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "google auth not configured (set MOCHILANG_GOOGLE_CLIENT_ID)",
		})
		return
	}
	var req googleLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	claims, err := s.googleVerify.Verify(c, req.IDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	user, err := s.store.UpsertGoogleUser(
		c,
		claims.Sub,
		claims.Email,
		claims.Name,
		claims.Picture,
		func() string { return uuid.New().String() },
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	cookieVal, dbID, err := auth.MintToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	expires := s.now().Add(SessionTTL)
	if err := s.store.CreateSession(c, dbID, user.ID, c.Request.UserAgent(), expires); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	s.setSessionCookie(c, cookieVal, int(SessionTTL.Seconds()))

	payload := meUserPayload{
		ID:       user.ID,
		Email:    claims.Email,
		AvatarID: user.AvatarID,
	}
	if user.Name.Valid {
		v := user.Name.String
		payload.Name = &v
	}
	if user.Picture.Valid {
		v := user.Picture.String
		payload.Picture = &v
	}
	c.JSON(http.StatusOK, meResponse{Authenticated: true, User: &payload})
}

func (s *Server) handleLogout(c *gin.Context) {
	raw, err := c.Cookie(SessionCookieName)
	if err == nil && raw != "" {
		_ = s.store.DeleteSession(c, auth.HashToken(raw))
	}
	s.clearSessionCookie(c)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// handleMe answers "is the current request authenticated?" without
// returning 401 on the no-session case. The frontend uses it as the
// gate between LoginScreen and the rest of the app.
func (s *Server) handleMe(c *gin.Context) {
	raw, err := c.Cookie(SessionCookieName)
	if err != nil || raw == "" {
		c.JSON(http.StatusOK, meResponse{Authenticated: false})
		return
	}
	sess, err := s.store.GetSession(c, auth.HashToken(raw))
	if err != nil {
		// Expired / not-found — treat as logged out and clear the cookie
		// so the client doesn't keep replaying a dead session.
		s.clearSessionCookie(c)
		c.JSON(http.StatusOK, meResponse{Authenticated: false})
		return
	}
	user, err := s.store.GetUser(c, sess.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	payload := meUserPayload{
		ID:       user.ID,
		AvatarID: user.AvatarID,
	}
	if user.Email.Valid {
		payload.Email = user.Email.String
	}
	if user.Name.Valid {
		v := user.Name.String
		payload.Name = &v
	}
	if user.Picture.Valid {
		v := user.Picture.String
		payload.Picture = &v
	}
	c.JSON(http.StatusOK, meResponse{Authenticated: true, User: &payload})
}

