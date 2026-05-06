package server

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ktdilsiz/mochilang/api/internal/league"
	"github.com/ktdilsiz/mochilang/api/internal/timeutil"
)

type friendResponse struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Handle    string   `json:"handle"`
	Avatar    string   `json:"avatar"`
	Flag      string   `json:"flag"`
	TotalXP   int      `json:"totalXp"`
	Streak    int      `json:"streak"`
	Languages []string `json:"languages"`
	Weekly    int      `json:"weekly"` // baseline weekly XP
	ThisWeek  int      `json:"thisWeek"` // computed weekly XP up to today
	Daily     []int    `json:"daily"`   // 7 entries; future days are 0
}

// friendDailyXP mirrors apps/web/src/data/friends.ts:friendDailyXp.
// Same xmur3 hash + same distribution so the sparkline matches.
func friendDailyXP(id string, weekly int, weekStart string, dayOffset int) int {
	rng := league.SeededRng(id + "|" + weekStart + "|d" + itoaSmall(dayOffset))
	r := rng()
	base := float64(weekly) / 7.0
	if r < 0.18 {
		return league.RoundJS(base * 0.15)
	}
	return league.RoundJS(base * (0.7 + r*0.7))
}

func (s *Server) handleListFriends(c *gin.Context) {
	rows, err := s.store.ListFriends(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	now := s.now()
	weekStart := timeutil.MondayOf(now)
	dayIdx := timeutil.DaysSinceMonday(now)

	out := make([]friendResponse, 0, len(rows))
	for _, f := range rows {
		daily := make([]int, 7)
		thisWeek := 0
		for d := 0; d <= dayIdx && d < 7; d++ {
			daily[d] = friendDailyXP(f.ID, f.Weekly, weekStart, d)
			thisWeek += daily[d]
		}
		out = append(out, friendResponse{
			ID:        f.ID,
			Name:      f.Name,
			Handle:    f.Handle,
			Avatar:    f.Avatar,
			Flag:      f.Flag,
			TotalXP:   f.TotalXP,
			Streak:    f.Streak,
			Languages: f.LanguageList(),
			Weekly:    f.Weekly,
			ThisWeek:  thisWeek,
			Daily:     daily,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"weekStart":     weekStart,
		"daysIntoWeek":  dayIdx,
		"friends":       out,
		"asOf":          now.UTC().Format(time.RFC3339),
	})
}

// itoaSmall is a tiny digit→string for 0..9 hot path. Avoids strconv import
// in this hot helper, since dayOffset is always single-digit.
func itoaSmall(n int) string {
	if n >= 0 && n < 10 {
		return string(rune('0' + n))
	}
	// fallback for unexpected values
	digits := "0123456789"
	if n < 0 {
		return "-" + itoaSmall(-n)
	}
	if n < 100 {
		return string(digits[n/10]) + string(digits[n%10])
	}
	return string(digits[n%10]) // good enough; we never go past 6
}
