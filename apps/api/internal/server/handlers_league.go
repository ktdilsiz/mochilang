package server

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ktdilsiz/mochilang/api/internal/league"
	"github.com/ktdilsiz/mochilang/api/internal/timeutil"
)

type leagueResponse struct {
	WeekStart      string         `json:"weekStart"`
	DaysIntoWeek   int            `json:"daysIntoWeek"`
	UserRank       int            `json:"userRank"`
	UserTier       int            `json:"userTier"`
	Tier           league.Tier    `json:"tier"`
	NextTier       *league.Tier   `json:"nextTier"`
	PromoteRank    int            `json:"promoteRank"`
	DemoteRank     int            `json:"demoteRank"`
	LastWeekRank   *int           `json:"lastWeekRank"`
	LastWeekChange *string        `json:"lastWeekChange"`
	Rows           []league.Row   `json:"rows"`
}

func (s *Server) handleLeague(c *gin.Context) {
	id := userIDFrom(c)
	user, err := s.store.EnsureUser(c, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	now := s.now()
	thisWeek := timeutil.MondayOf(now)
	dayIdx := timeutil.DaysSinceMonday(now)

	// Step 1 — resolve any week rollover. If the user's `league_week_start`
	// doesn't match this week, score the previous cohort and apply the tier
	// change. We score even if the user's stored weekStart is from a few
	// weeks ago (they took a break) — they're treated as having scored 0.
	if !user.LeagueWeekStart.Valid {
		// First time hitting the league screen — just lock in the current week.
		if err := s.store.SetLeagueWeek(c, id, thisWeek, user.LeagueTier, nil, ""); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		user.LeagueWeekStart.Valid = true
		user.LeagueWeekStart.String = thisWeek
	} else if user.LeagueWeekStart.String != thisWeek {
		oldWeek := user.LeagueWeekStart.String
		userOldXP := 0
		if user.WeekStart.Valid && user.WeekStart.String == oldWeek {
			userOldXP = user.WeeklyXP
		}
		oldRows, err := s.buildLeaderboard(c, oldWeek, 6, id, userOldXP, user.AvatarID, user.Name.String)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		ranked := league.Rank(oldRows)
		userRank := league.FindRank(ranked, id)
		newTier := league.ApplyTierChange(user.LeagueTier, userRank)
		change := "held"
		switch {
		case newTier > user.LeagueTier:
			change = "promoted"
		case newTier < user.LeagueTier:
			change = "demoted"
		}
		if err := s.store.SetLeagueWeek(c, id, thisWeek, newTier, &userRank, change); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		user.LeagueTier = newTier
		user.LastWeekRank.Valid = true
		user.LastWeekRank.Int64 = int64(userRank)
		user.LastWeekChange.Valid = true
		user.LastWeekChange.String = change
		user.LeagueWeekStart.String = thisWeek
	}

	// Step 2 — current week's leaderboard.
	userThisXP := 0
	if user.WeekStart.Valid && user.WeekStart.String == thisWeek {
		userThisXP = user.WeeklyXP
	}
	rows, err := s.buildLeaderboard(c, thisWeek, dayIdx, id, userThisXP, user.AvatarID, user.Name.String)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ranked := league.Rank(rows)
	userRank := league.FindRank(ranked, id)

	tier := league.Tiers[user.LeagueTier]
	var nextTier *league.Tier
	if user.LeagueTier+1 < len(league.Tiers) {
		nt := league.Tiers[user.LeagueTier+1]
		nextTier = &nt
	}

	resp := leagueResponse{
		WeekStart:    thisWeek,
		DaysIntoWeek: dayIdx,
		UserRank:     userRank,
		UserTier:     user.LeagueTier,
		Tier:         tier,
		NextTier:     nextTier,
		PromoteRank:  league.PromoteRank,
		DemoteRank:   league.DemoteRank,
		Rows:         ranked,
	}
	if user.LastWeekRank.Valid {
		v := int(user.LastWeekRank.Int64)
		resp.LastWeekRank = &v
	}
	if user.LastWeekChange.Valid {
		v := user.LastWeekChange.String
		resp.LastWeekChange = &v
	}
	c.JSON(http.StatusOK, resp)
}

// buildLeaderboard pulls the bot roster from the DB and stitches the user's
// row in. `daysIntoWeek` clamps how much of the week to score (6 = full
// week, used for last-week scoring; today's index for the live board).
func (s *Server) buildLeaderboard(
	c *gin.Context,
	weekStart string,
	daysIntoWeek int,
	userID string,
	userXP int,
	userAvatarID string,
	userName string,
) ([]league.Row, error) {
	bots, err := s.store.ListCompetitors(c)
	if err != nil {
		return nil, err
	}
	rows := make([]league.Row, 0, len(bots)+1)
	for _, b := range bots {
		rows = append(rows, league.Row{
			ID:       b.ID,
			Name:     b.Name,
			Avatar:   b.Avatar,
			Flag:     b.Flag,
			WeeklyXP: league.WeeklyXP(b.ID, weekStart, daysIntoWeek, b.Rate),
			IsUser:   false,
		})
	}
	displayName := userName
	if displayName == "" {
		displayName = "You"
	}
	rows = append(rows, league.Row{
		ID:       userID,
		Name:     displayName,
		Avatar:   "user", // sentinel — frontend swaps in the user's mochi PNG
		Flag:     "",
		WeeklyXP: userXP,
		IsUser:   true,
	})
	_ = userAvatarID // currently unused; reserved for when the API also
	// emits the avatar PNG path. Kept as a parameter so callers don't have
	// to rewire when that lands.
	return rows, nil
}
