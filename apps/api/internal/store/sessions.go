package store

import (
	"context"
	"database/sql"
	"time"
)

type Session struct {
	ID         string         `db:"id"`
	UserID     string         `db:"user_id"`
	CreatedAt  int64          `db:"created_at"`
	ExpiresAt  int64          `db:"expires_at"`
	LastSeenAt int64          `db:"last_seen_at"`
	UserAgent  sql.NullString `db:"user_agent"`
}

// CreateSession inserts a session row. `id` should already be the hashed
// form of the cookie token — never store the raw secret.
func (s *Store) CreateSession(ctx context.Context, id, userID, userAgent string, expiresAt time.Time) error {
	now := time.Now().UnixMilli()
	var ua any = userAgent
	if userAgent == "" {
		ua = nil
	}
	_, err := s.DB.ExecContext(ctx, `
		INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at, user_agent)
		VALUES (?, ?, ?, ?, ?, ?)
	`, id, userID, now, expiresAt.UnixMilli(), now, ua)
	return err
}

// GetSession returns the session by hashed id; ErrNotFound for missing,
// expired sessions are also treated as not-found (and lazily deleted).
func (s *Store) GetSession(ctx context.Context, id string) (*Session, error) {
	var sess Session
	err := s.DB.GetContext(ctx, &sess, `SELECT * FROM sessions WHERE id = ?`, id)
	if err != nil {
		return nil, asNotFound(err)
	}
	if time.Now().UnixMilli() >= sess.ExpiresAt {
		// Best-effort cleanup; don't fail the request if delete errs.
		_, _ = s.DB.ExecContext(ctx, `DELETE FROM sessions WHERE id = ?`, id)
		return nil, ErrNotFound
	}
	return &sess, nil
}

// TouchSession updates last_seen_at to keep "active session" telemetry
// useful. Called on every authenticated request.
func (s *Store) TouchSession(ctx context.Context, id string) error {
	_, err := s.DB.ExecContext(ctx,
		`UPDATE sessions SET last_seen_at = ? WHERE id = ?`,
		time.Now().UnixMilli(), id)
	return err
}

func (s *Store) DeleteSession(ctx context.Context, id string) error {
	_, err := s.DB.ExecContext(ctx, `DELETE FROM sessions WHERE id = ?`, id)
	return err
}

// PurgeExpiredSessions removes any session whose expires_at has passed.
// Cheap to call on startup; we don't bother with a periodic ticker yet.
func (s *Store) PurgeExpiredSessions(ctx context.Context) error {
	_, err := s.DB.ExecContext(ctx,
		`DELETE FROM sessions WHERE expires_at < ?`,
		time.Now().UnixMilli())
	return err
}
