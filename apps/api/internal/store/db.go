// Package store is the data-access layer over SQLite.
//
// Repositories live as methods on *Store. Each one is a small wrapper around
// sqlx.DB that returns plain Go structs — no ORM, no clever query DSL. This
// keeps the path to a future Postgres migration mechanical: the SQL strings
// stay almost identical, only a few SQLite-specific bits (ON CONFLICT,
// AUTOINCREMENT) need touching up.
package store

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// ErrNotFound is returned by repos when a row is missing. Handlers map this
// to HTTP 404.
var ErrNotFound = errors.New("store: not found")

type Store struct {
	DB *sqlx.DB
}

// Open creates the SQLite file if needed and applies any pending migrations.
// Foreign keys are enabled per-connection — SQLite has them off by default.
func Open(path string) (*Store, error) {
	dsn := path + "?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)"
	db, err := sqlx.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}
	s := &Store{DB: db}
	if err := s.migrate(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return s, nil
}

func (s *Store) Close() error { return s.DB.Close() }

// migrate applies any embedded migrations whose name isn't already recorded
// in `_migrations`. Migration files are applied in lexicographic order, so
// the 4-digit prefix in their filename determines run order.
func (s *Store) migrate() error {
	ctx := context.Background()
	if _, err := s.DB.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS _migrations (
			name TEXT PRIMARY KEY,
			applied_at INTEGER NOT NULL
		)`); err != nil {
		return err
	}

	applied, err := s.appliedMigrations(ctx)
	if err != nil {
		return err
	}

	files, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return err
	}
	names := make([]string, 0, len(files))
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".sql") {
			continue
		}
		names = append(names, f.Name())
	}
	sort.Strings(names)

	for _, name := range names {
		if _, ok := applied[name]; ok {
			continue
		}
		body, err := fs.ReadFile(migrationsFS, "migrations/"+name)
		if err != nil {
			return err
		}
		// Each migration runs in its own transaction. SQLite supports
		// multi-statement Exec, so we don't need to split on `;`.
		tx, err := s.DB.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, string(body)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("apply %s: %w", name, err)
		}
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO _migrations(name, applied_at) VALUES(?, unixepoch('now'))`,
			name,
		); err != nil {
			_ = tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) appliedMigrations(ctx context.Context) (map[string]struct{}, error) {
	rows, err := s.DB.QueryContext(ctx, `SELECT name FROM _migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]struct{}{}
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			return nil, err
		}
		out[n] = struct{}{}
	}
	return out, rows.Err()
}

// asNotFound translates sql.ErrNoRows into ErrNotFound; returns other errors
// unchanged. Use this at the bottom of repository methods that do a
// single-row SELECT.
func asNotFound(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}
