package store

import (
	"context"
	"time"

	"github.com/ktdilsiz/mochilang/api/internal/timeutil"
)

type LessonResult struct {
	LessonID     string `db:"lesson_id" json:"-"`
	BestMistakes int    `db:"best_mistakes" json:"bestMistakes"`
	Completions  int    `db:"completions" json:"completions"`
	LastAt       int64  `db:"last_at" json:"lastAt"`
}

// CompletionInput is what the lesson screen sends after a successful run.
type CompletionInput struct {
	LessonID string `json:"lessonId" binding:"required"`
	Mistakes int    `json:"mistakes" binding:"min=0"`
	BaseXP   int    `json:"baseXp" binding:"min=0"`
}

// CompletionResult mirrors the user-state response so the frontend can update
// optimistically without a round-trip GET.
type CompletionResult struct {
	XPEarned       int               `json:"xpEarned"`
	TotalXP        int               `json:"totalXp"`
	Streak         int               `json:"streak"`
	WeeklyXP       int               `json:"weeklyXp"`
	WeekStart      string            `json:"weekStart"`
	LastActiveDate string            `json:"lastActiveDate"`
	Result         LessonResult      `json:"result"`
	Results        map[string]Result `json:"results"`
}

// Result is the JSON-shaped lesson result keyed by lessonId in the response.
type Result struct {
	BestMistakes int   `json:"bestMistakes"`
	Completions  int   `json:"completions"`
	LastAt       int64 `json:"lastAt"`
}

// RecordCompletion bumps XP, streak, and per-lesson best results inside a
// single transaction. Mirrors the frontend's `recordCompletion` so the
// resulting state is identical regardless of who computes it.
//
// Streak rules:
//   - same day → unchanged
//   - last active was yesterday → +1
//   - otherwise → reset to 1
//
// Weekly XP resets when the current Monday differs from the stored weekStart.
func (s *Store) RecordCompletion(ctx context.Context, userID string, in CompletionInput, now time.Time) (*CompletionResult, error) {
	tx, err := s.DB.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var u User
	if err := tx.GetContext(ctx, &u, `SELECT * FROM users WHERE id = ?`, userID); err != nil {
		return nil, asNotFound(err)
	}

	xpEarned := in.BaseXP
	if in.Mistakes == 0 {
		xpEarned = in.BaseXP * 2
	}

	today := timeutil.Today(now)
	yesterday := timeutil.Yesterday(now)
	thisMonday := timeutil.MondayOf(now)

	// Streak.
	streak := u.Streak
	switch {
	case u.LastActiveDate.Valid && u.LastActiveDate.String == today:
		// already counted today; leave alone
	case u.LastActiveDate.Valid && u.LastActiveDate.String == yesterday:
		streak = u.Streak + 1
	default:
		streak = 1
	}

	// Weekly XP rolls over on Monday.
	weeklyXP := xpEarned
	if u.WeekStart.Valid && u.WeekStart.String == thisMonday {
		weeklyXP = u.WeeklyXP + xpEarned
	}

	totalXP := u.TotalXP + xpEarned
	updatedAt := now.UnixMilli()

	if _, err := tx.ExecContext(ctx, `
		UPDATE users
		SET total_xp = ?,
		    streak = ?,
		    last_active_date = ?,
		    weekly_xp = ?,
		    week_start = ?,
		    updated_at = ?
		WHERE id = ?
	`, totalXP, streak, today, weeklyXP, thisMonday, updatedAt, userID); err != nil {
		return nil, err
	}

	// Upsert lesson_results: keep the lowest-ever mistake count and bump
	// the completions counter.
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO lesson_results (user_id, lesson_id, best_mistakes, completions, last_at)
		VALUES (?, ?, ?, 1, ?)
		ON CONFLICT(user_id, lesson_id) DO UPDATE SET
			best_mistakes = MIN(best_mistakes, excluded.best_mistakes),
			completions = completions + 1,
			last_at = excluded.last_at
	`, userID, in.LessonID, in.Mistakes, updatedAt); err != nil {
		return nil, err
	}

	// Pull the freshly-updated row + result for the response.
	var lr LessonResult
	if err := tx.GetContext(ctx, &lr, `
		SELECT lesson_id, best_mistakes, completions, last_at
		FROM lesson_results WHERE user_id = ? AND lesson_id = ?
	`, userID, in.LessonID); err != nil {
		return nil, err
	}

	results, err := loadResultsTx(ctx, tx, userID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &CompletionResult{
		XPEarned:       xpEarned,
		TotalXP:        totalXP,
		Streak:         streak,
		WeeklyXP:       weeklyXP,
		WeekStart:      thisMonday,
		LastActiveDate: today,
		Result:         lr,
		Results:        results,
	}, nil
}

// ListResults returns the per-lesson best results map keyed by lessonId.
// Used by GET /api/progress to reconstruct the same shape the frontend
// previously kept in localStorage.
func (s *Store) ListResults(ctx context.Context, userID string) (map[string]Result, error) {
	tx, err := s.DB.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	out, err := loadResultsTx(ctx, tx, userID)
	if err != nil {
		return nil, err
	}
	return out, tx.Commit()
}

type txQuery interface {
	SelectContext(ctx context.Context, dest any, query string, args ...any) error
}

func loadResultsTx(ctx context.Context, tx txQuery, userID string) (map[string]Result, error) {
	type row struct {
		LessonID     string `db:"lesson_id"`
		BestMistakes int    `db:"best_mistakes"`
		Completions  int    `db:"completions"`
		LastAt       int64  `db:"last_at"`
	}
	var rows []row
	if err := tx.SelectContext(ctx, &rows, `
		SELECT lesson_id, best_mistakes, completions, last_at
		FROM lesson_results WHERE user_id = ?
	`, userID); err != nil {
		return nil, err
	}
	out := make(map[string]Result, len(rows))
	for _, r := range rows {
		out[r.LessonID] = Result{
			BestMistakes: r.BestMistakes,
			Completions:  r.Completions,
			LastAt:       r.LastAt,
		}
	}
	return out, nil
}
