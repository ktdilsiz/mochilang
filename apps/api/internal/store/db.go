// Package store is the data-access layer over SQLite.
//
// Repositories live as methods on *Store. Each one is a small wrapper around
// sqlx.DB that returns plain Go structs — no ORM, no clever query DSL. This
// keeps the path to a future Postgres migration mechanical: the SQL strings
// stay almost identical, only a few SQLite-specific bits (ON CONFLICT,
// AUTOINCREMENT) need touching up.
//
// Two SQLite files back the store:
//
//   - main.db (DB)          — identity, sessions, profile, progress, seed
//                             content, community_packs.
//   - community.db (Community) — user-generated chatter: ratings, comments,
//                                reports, moderation flags.
//
// Splitting them lets us wipe / back up / migrate UGC independently of
// canonical content and identity data. Cross-DB joins aren't possible in
// SQLite, so we join on user_id / pack_id in Go where the two need to mix.
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

//go:embed migrations_community/*.sql
var communityMigrationsFS embed.FS

// ErrNotFound is returned by repos when a row is missing. Handlers map this
// to HTTP 404.
var ErrNotFound = errors.New("store: not found")

type Store struct {
	DB        *sqlx.DB
	Community *sqlx.DB
}

// Open creates both SQLite files if needed and applies any pending migrations
// to each. Foreign keys are enabled per-connection — SQLite has them off
// by default.
func Open(mainPath, communityPath string) (*Store, error) {
	mainDB, err := openSQLite(mainPath)
	if err != nil {
		return nil, fmt.Errorf("open main: %w", err)
	}
	if err := migrate(mainDB, migrationsFS, "migrations"); err != nil {
		_ = mainDB.Close()
		return nil, fmt.Errorf("migrate main: %w", err)
	}

	commDB, err := openSQLite(communityPath)
	if err != nil {
		_ = mainDB.Close()
		return nil, fmt.Errorf("open community: %w", err)
	}
	if err := migrate(commDB, communityMigrationsFS, "migrations_community"); err != nil {
		_ = mainDB.Close()
		_ = commDB.Close()
		return nil, fmt.Errorf("migrate community: %w", err)
	}

	return &Store{DB: mainDB, Community: commDB}, nil
}

func openSQLite(path string) (*sqlx.DB, error) {
	dsn := path + "?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)"
	db, err := sqlx.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func (s *Store) Close() error {
	err1 := s.DB.Close()
	err2 := s.Community.Close()
	if err1 != nil {
		return err1
	}
	return err2
}

// migrate applies any embedded migrations whose name isn't already recorded
// in `_migrations`. Migration files are applied in lexicographic order, so
// the 4-digit prefix in their filename determines run order.
func migrate(db *sqlx.DB, migFS fs.FS, dir string) error {
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS _migrations (
			name TEXT PRIMARY KEY,
			applied_at INTEGER NOT NULL
		)`); err != nil {
		return err
	}

	applied, err := appliedMigrations(ctx, db)
	if err != nil {
		return err
	}

	files, err := fs.ReadDir(migFS, dir)
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
		body, err := fs.ReadFile(migFS, dir+"/"+name)
		if err != nil {
			return err
		}
		// Each migration runs in its own transaction. SQLite supports
		// multi-statement Exec, so we don't need to split on `;`.
		tx, err := db.BeginTx(ctx, nil)
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

func appliedMigrations(ctx context.Context, db *sqlx.DB) (map[string]struct{}, error) {
	rows, err := db.QueryContext(ctx, `SELECT name FROM _migrations`)
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
