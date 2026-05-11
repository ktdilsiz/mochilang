package server

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ktdilsiz/mochilang/api/internal/community"
	"github.com/ktdilsiz/mochilang/api/internal/store"
)

// packResponse is the JSON the mobile app reads from GET /api/community/packs/:id.
// Wraps the original pack body (Level-shaped) with denormalized metadata
// the browse and detail screens need.
type packResponse struct {
	ID          string             `json:"id"`
	Slug        string             `json:"slug"`
	SourceLang  string             `json:"sourceLang"`
	TargetLang  string             `json:"targetLang"`
	Title       string             `json:"title"`
	Description string             `json:"description"`
	Author      authorResponse     `json:"author"`
	Rating      store.RatingSummary `json:"rating"`
	UserRating  int                `json:"userRating,omitempty"` // 0 when not signed in
	CommentCount int               `json:"commentCount"`
	Hidden      bool               `json:"hidden,omitempty"`
	CreatedAt   int64              `json:"createdAt"`
	UpdatedAt   int64              `json:"updatedAt"`
	// Level holds the actual lesson content as JSON — same shape as
	// canonical course levels, so the mobile app can render it through
	// the existing HomeScreen path.
	Level json.RawMessage `json:"level"`
}

type packSummaryResponse struct {
	ID          string              `json:"id"`
	Slug        string              `json:"slug"`
	SourceLang  string              `json:"sourceLang"`
	TargetLang  string              `json:"targetLang"`
	Title       string              `json:"title"`
	Description string              `json:"description"`
	Author      authorResponse      `json:"author"`
	Rating      store.RatingSummary `json:"rating"`
	CreatedAt   int64               `json:"createdAt"`
}

type authorResponse struct {
	ID     string `json:"id"`
	Name   string `json:"name"`   // may be empty if user hasn't set one
	Handle string `json:"handle"` // may be empty if user hasn't published before
}

func authorFromInfo(info store.AuthorInfo) authorResponse {
	a := authorResponse{ID: info.ID}
	if info.Name.Valid {
		a.Name = info.Name.String
	}
	if info.Handle.Valid {
		a.Handle = info.Handle.String
	}
	return a
}

// handleListCommunityPacks returns the browse directory. Hidden packs
// (auto-hidden or admin-hidden) are filtered out for everyone except the
// author — public consumers can't see them at all. Query params: source,
// target, sort, limit.
func (s *Server) handleListCommunityPacks(c *gin.Context) {
	filter := store.PackFilter{
		SourceLang: c.Query("source"),
		TargetLang: c.Query("target"),
	}
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			filter.Limit = n
		}
	}
	rows, err := s.store.ListPacks(c, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	hidden, err := s.store.HiddenPackIDs(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	authorIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		authorIDs = append(authorIDs, r.AuthorUserID)
	}
	authors, err := s.store.GetAuthors(c, authorIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	out := make([]packSummaryResponse, 0, len(rows))
	for _, r := range rows {
		if _, isHidden := hidden[r.ID]; isHidden {
			continue
		}
		rating, _ := s.store.GetRatingSummary(c, r.ID)
		out = append(out, packSummaryResponse{
			ID:          r.ID,
			Slug:        r.Slug,
			SourceLang:  r.SourceLang,
			TargetLang:  r.TargetLang,
			Title:       r.Title,
			Description: r.Description,
			Author:      authorFromInfo(authors[r.AuthorUserID]),
			Rating:      rating,
			CreatedAt:   r.CreatedAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"packs": out})
}

// handleGetCommunityPack returns a single pack with full body. Authors
// see their own packs even when hidden; everyone else gets 404.
func (s *Server) handleGetCommunityPack(c *gin.Context) {
	id := c.Param("id")
	row, err := s.store.GetPack(c, id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "pack not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	viewerID := optionalUserIDFrom(c)
	mod, err := s.store.GetModerationState(c, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if mod.Hidden == 1 && row.AuthorUserID != viewerID {
		c.JSON(http.StatusNotFound, gin.H{"error": "pack not found"})
		return
	}

	authors, err := s.store.GetAuthors(c, []string{row.AuthorUserID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	rating, err := s.store.GetRatingSummary(c, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var userRating int
	if viewerID != "" {
		userRating, _ = s.store.GetUserRating(c, id, viewerID)
	}
	comments, err := s.store.ListComments(c, id, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// The pack body is the full envelope JSON — pull out just the
	// `level` field for the response so the mobile app doesn't have
	// to re-derive metadata it already has from the response wrapper.
	var env struct {
		Level json.RawMessage `json:"level"`
	}
	if err := json.Unmarshal([]byte(row.BodyJSON), &env); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "corrupt pack body"})
		return
	}

	resp := packResponse{
		ID:           row.ID,
		Slug:         row.Slug,
		SourceLang:   row.SourceLang,
		TargetLang:   row.TargetLang,
		Title:        row.Title,
		Description:  row.Description,
		Author:       authorFromInfo(authors[row.AuthorUserID]),
		Rating:       rating,
		UserRating:   userRating,
		CommentCount: len(comments),
		Hidden:       mod.Hidden == 1,
		CreatedAt:    row.CreatedAt,
		UpdatedAt:    row.UpdatedAt,
		Level:        env.Level,
	}
	c.JSON(http.StatusOK, resp)
}

// handleSubmitCommunityPack accepts a pack envelope from the in-app
// paste-JSON or upload-file flow. Re-validates server-side rather than
// trusting client parsing.
func (s *Server) handleSubmitCommunityPack(c *gin.Context) {
	// Accept either {"body": {...envelope...}} OR the envelope at the
	// top level — the in-app paste flow sends the latter (whatever
	// JSON the author copied), so be friendly to both shapes.
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "could not read body"})
		return
	}
	rawEnvelope := bodyBytes
	var wrapper struct {
		Body json.RawMessage `json:"body"`
	}
	if err := json.Unmarshal(bodyBytes, &wrapper); err == nil && len(wrapper.Body) > 0 {
		rawEnvelope = wrapper.Body
	}

	env, err := community.ValidateEnvelope(rawEnvelope)
	if err != nil {
		if community.IsValidationError(err) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	authorID := userIDFrom(c)
	// First-publish: require a handle on file. Frontend should have
	// already POSTed /api/community/handle before reaching here.
	handle, err := s.store.GetUserHandle(c, authorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if handle == "" {
		c.JSON(http.StatusConflict, gin.H{"error": "handle required", "code": "handle_required"})
		return
	}

	row := store.PackRow{
		ID:           uuid.NewString(),
		AuthorUserID: authorID,
		Slug:         env.Slug,
		SourceLang:   env.SourceLang,
		TargetLang:   env.TargetLang,
		Title:        strings.TrimSpace(env.Title),
		Description:  env.Description,
		BodyJSON:     string(rawEnvelope),
		Version:      1,
		CreatedAt:    time.Now().UnixMilli(),
	}
	if err := s.store.CreatePack(c, row); err != nil {
		if errors.Is(err, store.ErrSlugTaken) {
			c.JSON(http.StatusConflict, gin.H{"error": "slug already used by this author", "code": "slug_taken"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":   row.ID,
		"slug": row.Slug,
		"url":  "/c/" + handle + "/" + row.Slug,
	})
}

func (s *Server) handleDeleteCommunityPack(c *gin.Context) {
	authorID := userIDFrom(c)
	if err := s.store.DeletePack(c, c.Param("id"), authorID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "pack not found or not yours"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// kebab-case, 2–24 chars. Stricter than slugs because handles end up in
// public URLs and we don't want collisions with reserved paths.
var handleRe = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

var reservedHandles = map[string]struct{}{
	"admin": {}, "api": {}, "app": {}, "community": {},
	"mochilang": {}, "support": {}, "help": {}, "settings": {},
	"about": {}, "login": {}, "logout": {}, "signup": {}, "me": {},
}

type handleRequest struct {
	Handle string `json:"handle" binding:"required"`
}

// handleSetCommunityHandle assigns the caller's public handle. Idempotent
// only insofar as re-claiming the same handle is fine; switching to a
// different handle is blocked — once chosen, it sticks (matches the
// public-URL stability story).
func (s *Server) handleSetCommunityHandle(c *gin.Context) {
	var req handleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h := strings.ToLower(strings.TrimSpace(req.Handle))
	if !handleRe.MatchString(h) || len(h) < 2 || len(h) > 24 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "handle must be 2–24 chars, kebab-case"})
		return
	}
	if _, reserved := reservedHandles[h]; reserved {
		c.JSON(http.StatusConflict, gin.H{"error": "handle reserved"})
		return
	}

	userID := userIDFrom(c)
	existing, err := s.store.GetUserHandle(c, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if existing != "" {
		if existing == h {
			c.JSON(http.StatusOK, gin.H{"handle": existing})
			return
		}
		c.JSON(http.StatusConflict, gin.H{"error": "handle already set; cannot change"})
		return
	}
	if err := s.store.SetUserHandle(c, userID, h); err != nil {
		if errors.Is(err, store.ErrHandleTaken) {
			c.JSON(http.StatusConflict, gin.H{"error": "handle taken"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"handle": h})
}

type rateRequest struct {
	Stars int `json:"stars" binding:"required,min=1,max=5"`
}

func (s *Server) handleRatePack(c *gin.Context) {
	var req rateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	packID := c.Param("id")
	if _, err := s.store.GetPack(c, packID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "pack not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := s.store.UpsertRating(c, packID, userIDFrom(c), req.Stars); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	summary, _ := s.store.GetRatingSummary(c, packID)
	c.JSON(http.StatusOK, gin.H{"rating": summary, "userRating": req.Stars})
}

type commentRequest struct {
	Body string `json:"body" binding:"required"`
}

func (s *Server) handleCommentOnPack(c *gin.Context) {
	var req commentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body := strings.TrimSpace(req.Body)
	if body == "" || len(body) > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "comment must be 1–1000 characters"})
		return
	}
	packID := c.Param("id")
	if _, err := s.store.GetPack(c, packID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "pack not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	id, err := s.store.AddComment(c, packID, userIDFrom(c), body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

// handleListPackComments returns comments newest-first along with author
// metadata (handle, name) for display in the comment list.
func (s *Server) handleListPackComments(c *gin.Context) {
	packID := c.Param("id")
	if _, err := s.store.GetPack(c, packID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "pack not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	rows, err := s.store.ListComments(c, packID, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	authorIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		authorIDs = append(authorIDs, r.UserID)
	}
	authors, err := s.store.GetAuthors(c, authorIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	type commentOut struct {
		ID        int64          `json:"id"`
		Body      string         `json:"body"`
		Author    authorResponse `json:"author"`
		CreatedAt int64          `json:"createdAt"`
	}
	out := make([]commentOut, 0, len(rows))
	for _, r := range rows {
		out = append(out, commentOut{
			ID:        r.ID,
			Body:      r.Body,
			Author:    authorFromInfo(authors[r.UserID]),
			CreatedAt: r.CreatedAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"comments": out})
}

type reportRequest struct {
	Reason string `json:"reason" binding:"required"`
	Notes  string `json:"notes,omitempty"`
}

func (s *Server) handleReportPack(c *gin.Context) {
	var req reportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !store.IsValidReportReason(req.Reason) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown reason"})
		return
	}
	if len(req.Notes) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "notes too long (max 500)"})
		return
	}
	packID := c.Param("id")
	if _, err := s.store.GetPack(c, packID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "pack not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := s.store.AddReport(c, packID, userIDFrom(c), req.Reason, req.Notes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// optionalUserIDFrom returns the session user id populated by the
// optionalSession middleware, or "" if the request was unauthenticated.
// Used by public endpoints that surface viewer-specific bits (own rating,
// "is this hidden for everyone else?") when signed in.
func optionalUserIDFrom(c *gin.Context) string {
	if v, ok := c.Get(userIDKey); ok {
		if id, ok := v.(string); ok {
			return id
		}
	}
	return ""
}
