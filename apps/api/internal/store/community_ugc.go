package store

import (
	"context"
	"database/sql"
	"time"
)

// ModerationHideThreshold is the report count at which a pack is auto-
// hidden from public listings. Authors and admins still see it; everyone
// else sees a 404 from the list endpoint. Conservative starting point —
// 5 distinct reporters before content disappears.
const ModerationHideThreshold = 5

// RatingSummary aggregates pack_ratings rows for one pack.
type RatingSummary struct {
	Average float64 `json:"average"` // 0.0–5.0; 0 means "no ratings yet"
	Count   int     `json:"count"`
}

// UpsertRating writes or updates the current user's rating for a pack.
// stars must be in [1, 5]; values outside that range fail with a CHECK
// constraint at the DB level — caller should validate before calling.
func (s *Store) UpsertRating(ctx context.Context, packID, userID string, stars int) error {
	now := time.Now().UnixMilli()
	_, err := s.Community.ExecContext(ctx, `
		INSERT INTO pack_ratings (pack_id, user_id, stars, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(pack_id, user_id) DO UPDATE SET
			stars = excluded.stars,
			updated_at = excluded.updated_at
	`, packID, userID, stars, now, now)
	return err
}

// GetRatingSummary aggregates avg + count for a single pack. Cheap query
// (index on pack_id) — fine to call inline from a request handler.
func (s *Store) GetRatingSummary(ctx context.Context, packID string) (RatingSummary, error) {
	var row struct {
		Avg sql.NullFloat64 `db:"avg"`
		Cnt int             `db:"cnt"`
	}
	err := s.Community.GetContext(ctx, &row, `
		SELECT AVG(stars) AS avg, COUNT(*) AS cnt
		FROM pack_ratings WHERE pack_id = ?
	`, packID)
	if err != nil {
		return RatingSummary{}, err
	}
	summary := RatingSummary{Count: row.Cnt}
	if row.Avg.Valid {
		summary.Average = row.Avg.Float64
	}
	return summary, nil
}

// GetUserRating returns the current user's stars for a pack, or 0 if
// they haven't rated.
func (s *Store) GetUserRating(ctx context.Context, packID, userID string) (int, error) {
	var stars int
	err := s.Community.GetContext(ctx, &stars,
		`SELECT stars FROM pack_ratings WHERE pack_id = ? AND user_id = ?`,
		packID, userID)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return stars, err
}

// CommentRow is one row from pack_comments. The author display
// fields are populated by the handler after a separate users lookup
// — comments table doesn't store denormalized author info because
// users can rename themselves.
type CommentRow struct {
	ID        int64  `db:"id" json:"id"`
	PackID    string `db:"pack_id" json:"-"`
	UserID    string `db:"user_id" json:"userId"`
	Body      string `db:"body" json:"body"`
	CreatedAt int64  `db:"created_at" json:"createdAt"`
}

// AddComment appends one comment. Returns the inserted row id.
func (s *Store) AddComment(ctx context.Context, packID, userID, body string) (int64, error) {
	now := time.Now().UnixMilli()
	res, err := s.Community.ExecContext(ctx,
		`INSERT INTO pack_comments (pack_id, user_id, body, created_at) VALUES (?, ?, ?, ?)`,
		packID, userID, body, now)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// ListComments returns comments newest-first. limit caps result size;
// 0 means default (50), max 200.
func (s *Store) ListComments(ctx context.Context, packID string, limit int) ([]CommentRow, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	var rows []CommentRow
	err := s.Community.SelectContext(ctx, &rows, `
		SELECT id, pack_id, user_id, body, created_at
		FROM pack_comments
		WHERE pack_id = ?
		ORDER BY created_at DESC
		LIMIT ?
	`, packID, limit)
	return rows, err
}

// DeleteComment removes a comment only if the caller is the author.
func (s *Store) DeleteComment(ctx context.Context, commentID int64, userID string) error {
	res, err := s.Community.ExecContext(ctx,
		`DELETE FROM pack_comments WHERE id = ? AND user_id = ?`,
		commentID, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ReportReason values accepted by AddReport. Anything else is rejected
// at the handler layer before reaching the store.
var validReportReasons = map[string]struct{}{
	"spam":           {},
	"offensive":      {},
	"copied_content": {},
	"low_quality":    {},
	"incorrect":      {},
	"other":          {},
}

func IsValidReportReason(s string) bool {
	_, ok := validReportReasons[s]
	return ok
}

// AddReport files a report and, if the running total crosses the auto-
// hide threshold, flips pack_moderation.hidden = 1.
//
// Idempotent per (pack_id, reporter): a duplicate report from the same
// user returns nil without bumping the counter. This is enforced by the
// UNIQUE index on pack_reports; we sniff the conflict and treat it as
// success.
//
// Two writes (insert + upsert moderation) wrapped in a tx so we don't
// end up with a report row that didn't bump the counter on crash.
func (s *Store) AddReport(ctx context.Context, packID, reporterID, reason, notes string) error {
	tx, err := s.Community.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	now := time.Now().UnixMilli()
	var notesArg any = notes
	if notes == "" {
		notesArg = nil
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO pack_reports (pack_id, reporter_user_id, reason, notes, created_at)
		VALUES (?, ?, ?, ?, ?)
	`, packID, reporterID, reason, notesArg, now)
	if err != nil {
		if isUniqueViolation(err) {
			// Idempotent — already reported by this user. Nothing else
			// to do.
			return tx.Commit()
		}
		return err
	}

	// Bump moderation count; auto-hide if it crosses the threshold.
	_, err = tx.ExecContext(ctx, `
		INSERT INTO pack_moderation (pack_id, report_count, updated_at)
		VALUES (?, 1, ?)
		ON CONFLICT(pack_id) DO UPDATE SET
			report_count = report_count + 1,
			updated_at = excluded.updated_at,
			hidden = CASE WHEN report_count + 1 >= ? AND hidden = 0 THEN 1 ELSE hidden END,
			hidden_at = CASE WHEN report_count + 1 >= ? AND hidden = 0 THEN excluded.updated_at ELSE hidden_at END,
			hidden_reason = CASE WHEN report_count + 1 >= ? AND hidden = 0 THEN 'auto' ELSE hidden_reason END
	`, packID, now, ModerationHideThreshold, ModerationHideThreshold, ModerationHideThreshold)
	if err != nil {
		return err
	}
	return tx.Commit()
}

// ModerationState describes a pack's current visibility.
type ModerationState struct {
	PackID       string         `db:"pack_id"`
	ReportCount  int            `db:"report_count"`
	Hidden       int            `db:"hidden"`
	HiddenAt     sql.NullInt64  `db:"hidden_at"`
	HiddenReason sql.NullString `db:"hidden_reason"`
	UpdatedAt    int64          `db:"updated_at"`
}

// GetModerationState returns the row from pack_moderation, or a zero
// row (hidden=0) if no reports have been filed yet.
func (s *Store) GetModerationState(ctx context.Context, packID string) (ModerationState, error) {
	var m ModerationState
	err := s.Community.GetContext(ctx, &m,
		`SELECT * FROM pack_moderation WHERE pack_id = ?`, packID)
	if err == sql.ErrNoRows {
		return ModerationState{PackID: packID}, nil
	}
	return m, err
}

// HiddenPackIDs returns the set of pack ids currently hidden — used by
// ListPacks to filter them out of public browse results.
func (s *Store) HiddenPackIDs(ctx context.Context) (map[string]struct{}, error) {
	var ids []string
	if err := s.Community.SelectContext(ctx, &ids,
		`SELECT pack_id FROM pack_moderation WHERE hidden = 1`); err != nil {
		return nil, err
	}
	out := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		out[id] = struct{}{}
	}
	return out, nil
}
