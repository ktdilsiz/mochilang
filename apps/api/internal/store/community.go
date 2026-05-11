package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

// ErrSlugTaken is returned when the same author tries to publish two packs
// with the same slug. Handlers map this to HTTP 409 so the client can
// show "pick a different slug".
var ErrSlugTaken = errors.New("store: slug taken")

// ErrHandleTaken is returned when a user picks a handle already in use
// by another account.
var ErrHandleTaken = errors.New("store: handle taken")

// PackRow is the persisted form of a community pack. body_json is the
// serialized PackEnvelope — opaque to the store, validated by the
// community package before insert.
type PackRow struct {
	ID            string `db:"id"`
	AuthorUserID  string `db:"author_user_id"`
	Slug          string `db:"slug"`
	SourceLang    string `db:"source_lang"`
	TargetLang    string `db:"target_lang"`
	Title         string `db:"title"`
	Description   string `db:"description"`
	BodyJSON      string `db:"body_json"`
	Version       int    `db:"version"`
	CreatedAt     int64  `db:"created_at"`
	UpdatedAt     int64  `db:"updated_at"`
}

// PackFilter narrows the ListPacks result set. All fields are optional.
type PackFilter struct {
	SourceLang string // exact match
	TargetLang string // exact match
	AuthorID   string // exact match
	Sort       string // "recent" (default) | "rating"
	Limit      int    // default 50, cap 100
}

// CreatePack inserts a new pack row. Returns ErrSlugTaken on the
// (author_user_id, slug) UNIQUE collision so handlers can suggest a new
// slug instead of 500-ing.
func (s *Store) CreatePack(ctx context.Context, row PackRow) error {
	now := time.Now().UnixMilli()
	if row.CreatedAt == 0 {
		row.CreatedAt = now
	}
	row.UpdatedAt = now
	if row.Version == 0 {
		row.Version = 1
	}
	_, err := s.DB.ExecContext(ctx, `
		INSERT INTO community_packs (
			id, author_user_id, slug, source_lang, target_lang,
			title, description, body_json, version, created_at, updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		row.ID, row.AuthorUserID, row.Slug, row.SourceLang, row.TargetLang,
		row.Title, row.Description, row.BodyJSON, row.Version,
		row.CreatedAt, row.UpdatedAt,
	)
	if err != nil && isUniqueViolation(err) {
		return ErrSlugTaken
	}
	return err
}

func (s *Store) GetPack(ctx context.Context, id string) (*PackRow, error) {
	var p PackRow
	if err := s.DB.GetContext(ctx, &p, `SELECT * FROM community_packs WHERE id = ?`, id); err != nil {
		return nil, asNotFound(err)
	}
	return &p, nil
}

// GetPackByHandleAndSlug supports the public /c/{handle}/{slug} URL
// without needing the opaque pack id.
func (s *Store) GetPackByHandleAndSlug(ctx context.Context, handle, slug string) (*PackRow, error) {
	var p PackRow
	err := s.DB.GetContext(ctx, &p, `
		SELECT cp.*
		FROM community_packs cp
		JOIN users u ON u.id = cp.author_user_id
		WHERE u.handle = ? AND cp.slug = ?
	`, handle, slug)
	if err != nil {
		return nil, asNotFound(err)
	}
	return &p, nil
}

// ListPacks returns pack rows matching the filter, newest first by
// default. The body_json column is intentionally excluded — list rows
// don't need the (potentially large) lesson body, just the metadata
// summary the browse screen renders.
func (s *Store) ListPacks(ctx context.Context, f PackFilter) ([]PackRow, error) {
	q := `
		SELECT id, author_user_id, slug, source_lang, target_lang,
		       title, description, '' AS body_json, version, created_at, updated_at
		FROM community_packs
		WHERE 1=1
	`
	args := []any{}
	if f.SourceLang != "" {
		q += " AND source_lang = ?"
		args = append(args, f.SourceLang)
	}
	if f.TargetLang != "" {
		q += " AND target_lang = ?"
		args = append(args, f.TargetLang)
	}
	if f.AuthorID != "" {
		q += " AND author_user_id = ?"
		args = append(args, f.AuthorID)
	}
	q += " ORDER BY created_at DESC"
	limit := f.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	q += " LIMIT ?"
	args = append(args, limit)

	var rows []PackRow
	if err := s.DB.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, err
	}
	return rows, nil
}

// DeletePack removes the pack only if the caller is the author. Callers
// that need an admin override can DELETE directly on the table.
func (s *Store) DeletePack(ctx context.Context, id, authorID string) error {
	res, err := s.DB.ExecContext(ctx,
		`DELETE FROM community_packs WHERE id = ? AND author_user_id = ?`,
		id, authorID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// SetUserHandle assigns a (globally-unique) public handle for community
// publishing. First publish triggers this; subsequent edits are no-ops
// once a handle is set. Returns ErrHandleTaken if another user already
// claimed it.
func (s *Store) SetUserHandle(ctx context.Context, userID, handle string) error {
	_, err := s.DB.ExecContext(ctx, `
		UPDATE users SET handle = ?, updated_at = ?
		WHERE id = ? AND handle IS NULL
	`, handle, time.Now().UnixMilli(), userID)
	if err != nil && isUniqueViolation(err) {
		return ErrHandleTaken
	}
	return err
}

// GetUserHandle returns the user's current handle, or empty string if
// they haven't picked one yet.
func (s *Store) GetUserHandle(ctx context.Context, userID string) (string, error) {
	var h sql.NullString
	err := s.DB.GetContext(ctx, &h, `SELECT handle FROM users WHERE id = ?`, userID)
	if err != nil {
		return "", asNotFound(err)
	}
	if !h.Valid {
		return "", nil
	}
	return h.String, nil
}

// HandleExists reports whether any user has claimed this handle. Used
// in the "is this available?" check on the publish form before the
// actual UPDATE.
func (s *Store) HandleExists(ctx context.Context, handle string) (bool, error) {
	var n int
	err := s.DB.GetContext(ctx, &n,
		`SELECT COUNT(*) FROM users WHERE handle = ?`, handle)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

// HydrateAuthors annotates a list of pack rows with author metadata
// (handle + display name). One query regardless of list length. Returns
// a map keyed by user id; missing keys mean the user row was deleted
// since the pack was created (orphan — rare; we just leave the pack
// authorless in the response).
type AuthorInfo struct {
	ID     string         `db:"id"`
	Name   sql.NullString `db:"name"`
	Handle sql.NullString `db:"handle"`
}

func (s *Store) GetAuthors(ctx context.Context, userIDs []string) (map[string]AuthorInfo, error) {
	if len(userIDs) == 0 {
		return map[string]AuthorInfo{}, nil
	}
	// dedupe
	seen := map[string]struct{}{}
	ids := make([]string, 0, len(userIDs))
	for _, id := range userIDs {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	placeholders := strings.Repeat("?,", len(ids))
	placeholders = placeholders[:len(placeholders)-1]
	q := `SELECT id, name, handle FROM users WHERE id IN (` + placeholders + `)`
	args := make([]any, 0, len(ids))
	for _, id := range ids {
		args = append(args, id)
	}
	var rows []AuthorInfo
	if err := s.DB.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, err
	}
	out := make(map[string]AuthorInfo, len(rows))
	for _, r := range rows {
		out[r.ID] = r
	}
	return out, nil
}

// isUniqueViolation: modernc.org/sqlite surfaces UNIQUE failures with
// "UNIQUE constraint failed" in the message. Sniff the string rather
// than chase a typed error — the driver doesn't export a stable code.
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "UNIQUE constraint failed")
}
