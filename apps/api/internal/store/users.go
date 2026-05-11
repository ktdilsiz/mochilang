package store

import (
	"context"
	"database/sql"
	"time"
)

// User is the unified row for profile + progress aggregates. Splitting these
// into two tables would mean two writes per lesson completion (profile
// timestamps + progress totals); keeping them together keeps the recordCompletion
// path a single transaction.
type User struct {
	ID              string         `db:"id" json:"id"`
	Name            sql.NullString `db:"name" json:"-"`
	AvatarID        string         `db:"avatar_id" json:"avatarId"`
	Email           sql.NullString `db:"email" json:"-"`
	EmailVerified   int            `db:"email_verified" json:"-"`
	GoogleSub       sql.NullString `db:"google_sub" json:"-"`
	Picture         sql.NullString `db:"picture" json:"-"`
	Handle          sql.NullString `db:"handle" json:"-"`
	LeagueTier      int            `db:"league_tier" json:"leagueTier"`
	LeagueWeekStart sql.NullString `db:"league_week_start" json:"-"`
	LastWeekRank    sql.NullInt64  `db:"last_week_rank" json:"-"`
	LastWeekChange  sql.NullString `db:"last_week_change" json:"-"`
	TotalXP         int            `db:"total_xp" json:"totalXp"`
	Streak          int            `db:"streak" json:"streak"`
	LastActiveDate  sql.NullString `db:"last_active_date" json:"-"`
	WeeklyXP        int            `db:"weekly_xp" json:"weeklyXp"`
	WeekStart       sql.NullString `db:"week_start" json:"-"`
	CreatedAt       int64          `db:"created_at" json:"createdAt"`
	UpdatedAt       int64          `db:"updated_at" json:"updatedAt"`
}

// UpsertGoogleUser finds the user matching this Google `sub` (or creates
// one if first sight), updates the email/name/picture in case Google's
// records changed, and returns the row. The caller is expected to have
// already verified the ID token before calling this.
func (s *Store) UpsertGoogleUser(ctx context.Context, sub, email, name, picture string, generateID func() string) (*User, error) {
	now := time.Now().UnixMilli()

	var existing User
	err := s.DB.GetContext(ctx, &existing, `SELECT * FROM users WHERE google_sub = ?`, sub)
	if err == nil {
		// Refresh denormalized profile fields if Google updated them.
		_, err := s.DB.ExecContext(ctx, `
			UPDATE users
			SET email = ?, email_verified = 1, picture = ?, updated_at = ?
			WHERE id = ?
		`, email, nullIfEmpty(picture), now, existing.ID)
		if err != nil {
			return nil, err
		}
		return s.GetUser(ctx, existing.ID)
	}
	if !errIsNotFound(err) {
		return nil, err
	}

	// First sight — mint a UUID, seed name from Google if the user hadn't
	// chosen one yet.
	id := generateID()
	_, err = s.DB.ExecContext(ctx, `
		INSERT INTO users (id, name, email, email_verified, google_sub, picture, created_at, updated_at)
		VALUES (?, ?, ?, 1, ?, ?, ?, ?)
	`, id, nullIfEmpty(name), email, sub, nullIfEmpty(picture), now, now)
	if err != nil {
		return nil, err
	}
	return s.GetUser(ctx, id)
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func errIsNotFound(err error) bool {
	return err != nil && (err == sql.ErrNoRows || err.Error() == "sql: no rows in result set")
}

// EnsureUser fetches the user row, creating an empty one if this is the first
// time we've seen this id. The caller-supplied id (an opaque client UUID)
// becomes the primary key.
//
// Deprecated alongside the X-User-Id middleware. Kept around so existing
// handlers compile during the auth migration; once everything routes
// through requireSession this can be removed.
func (s *Store) EnsureUser(ctx context.Context, id string) (*User, error) {
	now := time.Now().UnixMilli()
	_, err := s.DB.ExecContext(ctx, `
		INSERT INTO users (id, created_at, updated_at)
		VALUES (?, ?, ?)
		ON CONFLICT(id) DO NOTHING
	`, id, now, now)
	if err != nil {
		return nil, err
	}
	return s.GetUser(ctx, id)
}

func (s *Store) GetUser(ctx context.Context, id string) (*User, error) {
	var u User
	err := s.DB.GetContext(ctx, &u, `SELECT * FROM users WHERE id = ?`, id)
	if err != nil {
		return nil, asNotFound(err)
	}
	return &u, nil
}

// UpdateProfile sets the user-controlled profile fields. Anything not provided
// keeps its current value. The handler decides which fields to pass through,
// so the caller doesn't accidentally clobber server-managed columns like XP.
type ProfilePatch struct {
	Name           *string
	AvatarID       *string
	LeagueTier     *int
	LastWeekRank   *int
	LastWeekChange *string
}

func (s *Store) UpdateProfile(ctx context.Context, id string, p ProfilePatch) (*User, error) {
	// Build a partial UPDATE so unspecified fields are left alone.
	sets := []string{}
	args := []any{}
	if p.Name != nil {
		sets = append(sets, "name = ?")
		args = append(args, *p.Name)
	}
	if p.AvatarID != nil {
		sets = append(sets, "avatar_id = ?")
		args = append(args, *p.AvatarID)
	}
	if p.LeagueTier != nil {
		sets = append(sets, "league_tier = ?")
		args = append(args, *p.LeagueTier)
	}
	if p.LastWeekRank != nil {
		sets = append(sets, "last_week_rank = ?")
		args = append(args, *p.LastWeekRank)
	}
	if p.LastWeekChange != nil {
		sets = append(sets, "last_week_change = ?")
		args = append(args, *p.LastWeekChange)
	}
	if len(sets) == 0 {
		return s.GetUser(ctx, id)
	}
	sets = append(sets, "updated_at = ?")
	args = append(args, time.Now().UnixMilli())
	args = append(args, id)

	q := `UPDATE users SET ` + joinComma(sets) + ` WHERE id = ?`
	if _, err := s.DB.ExecContext(ctx, q, args...); err != nil {
		return nil, err
	}
	return s.GetUser(ctx, id)
}

// SetLeagueWeek records the user's current league cohort week + the
// resolved standing from last week. Called by the league handler when it
// detects a week rollover.
func (s *Store) SetLeagueWeek(ctx context.Context, id string, weekStart string, tier int, lastRank *int, lastChange string) error {
	var rank any
	if lastRank != nil {
		rank = *lastRank
	} else {
		rank = nil
	}
	var change any = lastChange
	if lastChange == "" {
		change = nil
	}
	_, err := s.DB.ExecContext(ctx, `
		UPDATE users
		SET league_week_start = ?,
		    league_tier = ?,
		    last_week_rank = ?,
		    last_week_change = ?,
		    updated_at = ?
		WHERE id = ?
	`, weekStart, tier, rank, change, time.Now().UnixMilli(), id)
	return err
}

// ClearLastWeekChange resets the banner state ("you got promoted!") after the
// user dismisses it.
func (s *Store) ClearLastWeekChange(ctx context.Context, id string) error {
	_, err := s.DB.ExecContext(ctx, `
		UPDATE users SET last_week_change = NULL, updated_at = ? WHERE id = ?
	`, time.Now().UnixMilli(), id)
	return err
}

// ResetProfile clears the profile-side fields but keeps progress intact.
// Used by the "sign out" button which should drop identity but not XP, since
// XP belongs to the device, not the display name.
func (s *Store) ResetProfile(ctx context.Context, id string) error {
	_, err := s.DB.ExecContext(ctx, `
		UPDATE users
		SET name = NULL,
		    avatar_id = 'mochi-main',
		    league_tier = 0,
		    league_week_start = NULL,
		    last_week_rank = NULL,
		    last_week_change = NULL,
		    updated_at = ?
		WHERE id = ?
	`, time.Now().UnixMilli(), id)
	return err
}

// ResetProgress clears XP/streak and removes all lesson results.
func (s *Store) ResetProgress(ctx context.Context, id string) error {
	tx, err := s.DB.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `
		UPDATE users
		SET total_xp = 0,
		    streak = 0,
		    last_active_date = NULL,
		    weekly_xp = 0,
		    week_start = NULL,
		    updated_at = ?
		WHERE id = ?
	`, time.Now().UnixMilli(), id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM lesson_results WHERE user_id = ?`, id); err != nil {
		return err
	}
	return tx.Commit()
}

func joinComma(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += ", "
		}
		out += p
	}
	return out
}
