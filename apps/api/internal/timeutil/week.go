// Package timeutil provides date helpers shared across features.
//
// "Local day" keys are rendered as YYYY-MM-DD in the server's local timezone.
// Week boundaries land on Monday so they line up with the frontend's
// `mondayOf()` helper — the league/leaderboard depends on both sides
// agreeing on which Monday the current "league week" started.
package timeutil

import (
	"fmt"
	"time"
)

// Ymd renders a date as YYYY-MM-DD in the local timezone.
func Ymd(t time.Time) string {
	return t.Format("2006-01-02")
}

// MondayOf returns the YYYY-MM-DD of the Monday that begins t's week.
func MondayOf(t time.Time) string {
	d := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
	// time.Weekday: Sunday=0..Saturday=6. Mondays should be index 0.
	offset := (int(d.Weekday()) + 6) % 7
	return Ymd(d.AddDate(0, 0, -offset))
}

// DaysSinceMonday returns 0..6 for Monday..Sunday in t's week.
func DaysSinceMonday(t time.Time) int {
	return (int(t.Weekday()) + 6) % 7
}

// Today returns YYYY-MM-DD for the local date of t.
func Today(t time.Time) string {
	return Ymd(t)
}

// Yesterday returns YYYY-MM-DD for the day before t (local).
func Yesterday(t time.Time) string {
	return Ymd(t.AddDate(0, 0, -1))
}

// MustParseDate panics on invalid input — for use with values we control
// (DB columns, request bodies that have already been validated).
func MustParseDate(s string) time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		panic(fmt.Errorf("timeutil: bad date %q: %w", s, err))
	}
	return t
}
