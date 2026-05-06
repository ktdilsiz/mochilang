package server

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ktdilsiz/mochilang/api/internal/content"
)

// handleListCourses returns the directory of available courses.
// Mounted publicly — content is the same for everyone, no PII.
func (s *Server) handleListCourses(c *gin.Context) {
	c.JSON(http.StatusOK, content.Index{Courses: s.content.List()})
}

func (s *Server) handleGetCourse(c *gin.Context) {
	id := c.Param("id")
	body, ok := s.content.Get(id)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "course not found"})
		return
	}
	// Stream the embedded JSON straight through. We let the client
	// browser cache it briefly — content rarely changes within a session.
	c.Header("Cache-Control", "public, max-age=60")
	c.Data(http.StatusOK, "application/json; charset=utf-8", body)
}
