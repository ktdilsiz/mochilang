// Package league computes the weekly leaderboard.
//
// The bots' XP is generated deterministically from (botID, weekStart, day)
// using the same xmur3-derived RNG the frontend uses. Both sides must agree
// on the algorithm bit-for-bit so the leaderboard looks identical regardless
// of who renders it.
package league

import (
	"fmt"
	"sort"
)

// Tier represents a rung on the league ladder. Lower index = lower tier.
type Tier struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Emoji string `json:"emoji"`
}

var Tiers = []Tier{
	{"bronze", "Bronze", "🥉"},
	{"silver", "Silver", "🥈"},
	{"gold", "Gold", "🥇"},
	{"sapphire", "Sapphire", "🔷"},
	{"ruby", "Ruby", "🔴"},
	{"diamond", "Diamond", "💎"},
}

const (
	PromoteRank = 7  // top 7 promote
	DemoteRank  = 26 // ranks 26..31 demote
	CohortSize  = 31 // 30 bots + the user
)

// ApplyTierChange returns the user's new tier index based on last week's
// 1-indexed rank in their cohort.
func ApplyTierChange(currentTier, rank int) int {
	if rank <= PromoteRank {
		next := currentTier + 1
		if next >= len(Tiers) {
			return len(Tiers) - 1
		}
		return next
	}
	if rank >= DemoteRank {
		if currentTier <= 0 {
			return 0
		}
		return currentTier - 1
	}
	return currentTier
}

// xmur3 is the same hash function used in apps/web/src/lib/dates.ts.
// Operations are performed on uint32 so wrap-around matches JS semantics
// (Math.imul does signed 32-bit multiplication, but the bit pattern is the
// same as unsigned 32-bit multiplication).
func SeededRng(seed string) func() float64 {
	var h uint32 = 1779033703 ^ uint32(len(seed))
	for i := 0; i < len(seed); i++ {
		h = (h ^ uint32(seed[i])) * 3432918353
		h = (h << 13) | (h >> 19)
	}
	return func() float64 {
		h = (h ^ (h >> 16)) * 2246822507
		h = (h ^ (h >> 13)) * 3266489909
		h ^= h >> 16
		return float64(h) / 4294967296.0
	}
}

// roundJS mirrors JavaScript's Math.round half-up-toward-positive behavior.
// math.Round in Go rounds half-away-from-zero, which matches for positive
// values — we don't need a custom rounder, but this comment documents the
// intentional alignment with the frontend.
func RoundJS(x float64) int {
	if x >= 0 {
		return int(x + 0.5)
	}
	return -int(-x + 0.5)
}

// DailyXP returns a single bot's XP for `dayOffset` of `weekStart`.
//
// The distribution mixes ~25% rest days, ~10% binge days, and ~65% normal
// days — same shape as the JS implementation in data/competitors.ts.
func DailyXP(botID, weekStart string, dayOffset int, rate int) int {
	rng := SeededRng(fmt.Sprintf("%s|%s|d%d", botID, weekStart, dayOffset))
	a := rng()
	b := rng()
	var mult float64
	switch {
	case a < 0.25:
		mult = 0.1 + b*0.3
	case a < 0.35:
		mult = 1.4 + b*0.4
	default:
		mult = 0.6 + b*0.7
	}
	return RoundJS(float64(rate) * mult)
}

// WeeklyXP sums DailyXP from Monday through `daysIntoWeek` inclusive (0..6).
func WeeklyXP(botID, weekStart string, daysIntoWeek, rate int) int {
	if daysIntoWeek < 0 {
		daysIntoWeek = 0
	}
	if daysIntoWeek > 6 {
		daysIntoWeek = 6
	}
	total := 0
	for d := 0; d <= daysIntoWeek; d++ {
		total += DailyXP(botID, weekStart, d, rate)
	}
	return total
}

// Row is one entry on the leaderboard.
type Row struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Avatar   string `json:"avatar"` // emoji ("user" sentinel if isUser)
	Flag     string `json:"flag,omitempty"`
	WeeklyXP int    `json:"weeklyXp"`
	IsUser   bool   `json:"isUser"`
}

// Rank returns the rows sorted by descending weeklyXp; deterministic ties
// broken by id.
func Rank(rows []Row) []Row {
	out := make([]Row, len(rows))
	copy(out, rows)
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].WeeklyXP != out[j].WeeklyXP {
			return out[i].WeeklyXP > out[j].WeeklyXP
		}
		return out[i].ID < out[j].ID
	})
	return out
}

// FindRank returns the 1-indexed position of `id` in `rows`, or 0 if absent.
func FindRank(rows []Row, id string) int {
	for i, r := range rows {
		if r.ID == id {
			return i + 1
		}
	}
	return 0
}
