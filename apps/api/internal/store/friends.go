package store

import (
	"context"
	"strings"
)

type Friend struct {
	ID        string `db:"id" json:"id"`
	Name      string `db:"name" json:"name"`
	Handle    string `db:"handle" json:"handle"`
	Avatar    string `db:"avatar" json:"avatar"`
	Flag      string `db:"flag" json:"flag"`
	TotalXP   int    `db:"total_xp" json:"totalXp"`
	Streak    int    `db:"streak" json:"streak"`
	Languages string `db:"languages" json:"-"` // serialized to []string in API responses
	Weekly    int    `db:"weekly" json:"weekly"`
	SortOrder int    `db:"sort_order" json:"-"`
}

// LanguageList parses the comma-joined "ja,zh" stored column into a slice.
func (f Friend) LanguageList() []string {
	if f.Languages == "" {
		return nil
	}
	parts := strings.Split(f.Languages, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func (s *Store) ListFriends(ctx context.Context) ([]Friend, error) {
	var rows []Friend
	if err := s.DB.SelectContext(ctx, &rows, `
		SELECT id, name, handle, avatar, flag, total_xp, streak, languages, weekly, sort_order
		FROM friends ORDER BY sort_order ASC, name ASC
	`); err != nil {
		return nil, err
	}
	return rows, nil
}

// UpsertFriend is used by the seeder. It overwrites every column so changes
// in the seed source land on next startup, but the row's id stays stable.
func (s *Store) UpsertFriend(ctx context.Context, f Friend) error {
	_, err := s.DB.ExecContext(ctx, `
		INSERT INTO friends (id, name, handle, avatar, flag, total_xp, streak, languages, weekly, sort_order)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			handle = excluded.handle,
			avatar = excluded.avatar,
			flag = excluded.flag,
			total_xp = excluded.total_xp,
			streak = excluded.streak,
			languages = excluded.languages,
			weekly = excluded.weekly,
			sort_order = excluded.sort_order
	`, f.ID, f.Name, f.Handle, f.Avatar, f.Flag, f.TotalXP, f.Streak, f.Languages, f.Weekly, f.SortOrder)
	return err
}
