package server

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ktdilsiz/mochilang/api/internal/store"
)

// ProgressResponse mirrors the frontend's ProgressState. lastActiveDate /
// weekStart can be null until the user has played at least once.
type ProgressResponse struct {
	TotalXP        int                     `json:"totalXp"`
	Streak         int                     `json:"streak"`
	LastActiveDate *string                 `json:"lastActiveDate"`
	WeeklyXP       int                     `json:"weeklyXp"`
	WeekStart      *string                 `json:"weekStart"`
	Results        map[string]store.Result `json:"results"`
}

func toProgress(u *store.User, results map[string]store.Result) ProgressResponse {
	r := ProgressResponse{
		TotalXP:  u.TotalXP,
		Streak:   u.Streak,
		WeeklyXP: u.WeeklyXP,
		Results:  results,
	}
	if u.LastActiveDate.Valid {
		v := u.LastActiveDate.String
		r.LastActiveDate = &v
	}
	if u.WeekStart.Valid {
		v := u.WeekStart.String
		r.WeekStart = &v
	}
	if r.Results == nil {
		r.Results = map[string]store.Result{}
	}
	return r
}

func (s *Server) handleGetProgress(c *gin.Context) {
	id := userIDFrom(c)
	u, err := s.store.EnsureUser(c, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	results, err := s.store.ListResults(c, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toProgress(u, results))
}

// handleRecordCompletion accepts a completed lesson and returns the
// resulting state in one round-trip.
func (s *Server) handleRecordCompletion(c *gin.Context) {
	var in store.CompletionInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := userIDFrom(c)
	if _, err := s.store.EnsureUser(c, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	res, err := s.store.RecordCompletion(c, id, in, s.now())
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (s *Server) handleResetProgress(c *gin.Context) {
	id := userIDFrom(c)
	if _, err := s.store.EnsureUser(c, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := s.store.ResetProgress(c, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	u, err := s.store.GetUser(c, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	results, err := s.store.ListResults(c, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toProgress(u, results))
}
