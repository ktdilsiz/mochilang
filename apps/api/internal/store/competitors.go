package store

import "context"

type Competitor struct {
	ID     string `db:"id" json:"id"`
	Name   string `db:"name" json:"name"`
	Avatar string `db:"avatar" json:"avatar"`
	Flag   string `db:"flag" json:"flag"`
	Rate   int    `db:"rate" json:"rate"`
}

func (s *Store) ListCompetitors(ctx context.Context) ([]Competitor, error) {
	var rows []Competitor
	if err := s.DB.SelectContext(ctx, &rows, `
		SELECT id, name, avatar, flag, rate FROM competitors ORDER BY id ASC
	`); err != nil {
		return nil, err
	}
	return rows, nil
}

func (s *Store) UpsertCompetitor(ctx context.Context, c Competitor) error {
	_, err := s.DB.ExecContext(ctx, `
		INSERT INTO competitors (id, name, avatar, flag, rate)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			avatar = excluded.avatar,
			flag = excluded.flag,
			rate = excluded.rate
	`, c.ID, c.Name, c.Avatar, c.Flag, c.Rate)
	return err
}
