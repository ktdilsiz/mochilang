// Package seed loads the canonical seed data and upserts it into the DB.
//
// The data lives in `data/*.json` — those are the single source of truth
// for the bot/friend rosters that ship with the app. Both halves of the
// system consume the same files:
//
//   - The backend embeds them and seeds SQLite at startup (here).
//   - The frontend bundles them as offline fallbacks (cmd/genfallbacks
//     copies them across).
//
// To change a roster entry, edit the JSON. Restart the API and the row is
// upserted; run `make api-gen-fallbacks` to publish the change to the web
// client.
package seed

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/ktdilsiz/mochilang/api/internal/store"
)

//go:embed data/*.json
var dataFS embed.FS

// Friend / Competitor are the JSON-canonical shapes. They differ from the
// store types in two places:
//   - Languages is []string here (joined with ',' before SQL insert).
//   - There's no SortOrder; the slice's index is the implicit sort key.
type Friend struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Handle    string   `json:"handle"`
	Avatar    string   `json:"avatar"`
	Flag      string   `json:"flag"`
	TotalXP   int      `json:"totalXp"`
	Streak    int      `json:"streak"`
	Languages []string `json:"languages"`
	Weekly    int      `json:"weekly"`
}

type Competitor struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
	Flag   string `json:"flag"`
	Rate   int    `json:"rate"`
}

// Friends and Competitors are populated at package init from the embedded
// JSON. Exported so cmd/genfallbacks can publish them to the frontend
// without duplicating the parse logic.
var (
	Friends     []Friend
	Competitors []Competitor
)

func init() {
	type friendsEnv struct{ Friends []Friend `json:"friends"` }
	type competitorsEnv struct{ Competitors []Competitor `json:"competitors"` }

	var fenv friendsEnv
	if err := readJSON("data/friends.json", &fenv); err != nil {
		panic(fmt.Errorf("seed: read friends.json: %w", err))
	}
	Friends = fenv.Friends

	var cenv competitorsEnv
	if err := readJSON("data/competitors.json", &cenv); err != nil {
		panic(fmt.Errorf("seed: read competitors.json: %w", err))
	}
	Competitors = cenv.Competitors
}

func readJSON(path string, dest any) error {
	body, err := dataFS.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, dest)
}

// Run upserts every seed row. Called once at startup after migrations.
//
// Languages get joined with ',' here at the SQL boundary so the wire/JSON
// shape stays a clean array everywhere upstream.
func Run(ctx context.Context, s *store.Store) error {
	for _, c := range Competitors {
		if err := s.UpsertCompetitor(ctx, store.Competitor{
			ID:     c.ID,
			Name:   c.Name,
			Avatar: c.Avatar,
			Flag:   c.Flag,
			Rate:   c.Rate,
		}); err != nil {
			return err
		}
	}
	for i, f := range Friends {
		if err := s.UpsertFriend(ctx, store.Friend{
			ID:        f.ID,
			Name:      f.Name,
			Handle:    f.Handle,
			Avatar:    f.Avatar,
			Flag:      f.Flag,
			TotalXP:   f.TotalXP,
			Streak:    f.Streak,
			Languages: strings.Join(f.Languages, ","),
			Weekly:    f.Weekly,
			SortOrder: i + 1, // implicit sort by JSON array order
		}); err != nil {
			return err
		}
	}
	return nil
}
