package server

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ktdilsiz/mochilang/api/internal/store"
)

// ProfileResponse is the shape the frontend reads. Mirrors apps/web/src/profile.ts
// `ProfileState` so the client can drop it straight into useProfile state.
type ProfileResponse struct {
	Name            *string `json:"name"`            // null until first-launch setup
	AvatarID        string  `json:"avatarId"`
	LeagueTier      int     `json:"leagueTier"`
	LeagueWeekStart *string `json:"leagueWeekStart"`
	LastWeekRank    *int    `json:"lastWeekRank"`
	LastWeekChange  *string `json:"lastWeekChange"`
}

func toProfile(u *store.User) ProfileResponse {
	resp := ProfileResponse{
		AvatarID:   u.AvatarID,
		LeagueTier: u.LeagueTier,
	}
	if u.Name.Valid {
		v := u.Name.String
		resp.Name = &v
	}
	if u.LeagueWeekStart.Valid {
		v := u.LeagueWeekStart.String
		resp.LeagueWeekStart = &v
	}
	if u.LastWeekRank.Valid {
		v := int(u.LastWeekRank.Int64)
		resp.LastWeekRank = &v
	}
	if u.LastWeekChange.Valid {
		v := u.LastWeekChange.String
		resp.LastWeekChange = &v
	}
	return resp
}

func (s *Server) handleGetProfile(c *gin.Context) {
	id := userIDFrom(c)
	u, err := s.store.EnsureUser(c, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toProfile(u))
}

// updateProfileRequest is the partial-update payload. Pointer fields signal
// "leave alone if missing" — JSON null/missing both map to nil.
type updateProfileRequest struct {
	Name     *string `json:"name"`
	AvatarID *string `json:"avatarId"`
}

func (s *Server) handleUpdateProfile(c *gin.Context) {
	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := s.store.EnsureUser(c, userIDFrom(c)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	u, err := s.store.UpdateProfile(c, userIDFrom(c), store.ProfilePatch{
		Name:     req.Name,
		AvatarID: req.AvatarID,
	})
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toProfile(u))
}

func (s *Server) handleResetProfile(c *gin.Context) {
	id := userIDFrom(c)
	if _, err := s.store.EnsureUser(c, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := s.store.ResetProfile(c, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	u, err := s.store.GetUser(c, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toProfile(u))
}

// handleDismissBanner clears just the lastWeekChange flag — the user has
// acknowledged the promote/demote toast.
func (s *Server) handleDismissBanner(c *gin.Context) {
	id := userIDFrom(c)
	if err := s.store.ClearLastWeekChange(c, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	u, err := s.store.GetUser(c, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toProfile(u))
}
