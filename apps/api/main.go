// Mochilang API — local-first Go service for the language-learning app.
//
// Storage is SQLite (single file, default ./mochilang.db). The service is
// designed to evolve to Postgres without rewriting handlers — only the
// driver and the few SQLite-specific clauses (ON CONFLICT, unixepoch) need
// touching.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ktdilsiz/mochilang/api/internal/config"
	"github.com/ktdilsiz/mochilang/api/internal/content"
	"github.com/ktdilsiz/mochilang/api/internal/seed"
	"github.com/ktdilsiz/mochilang/api/internal/server"
	"github.com/ktdilsiz/mochilang/api/internal/store"
)

func main() {
	cfg := config.Load()

	s, err := store.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("store: %v", err)
	}
	defer s.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	if err := seed.Run(ctx, s); err != nil {
		cancel()
		log.Fatalf("seed: %v", err)
	}
	cancel()

	courses, err := content.NewLoader()
	if err != nil {
		log.Fatalf("content: %v", err)
	}

	srv := server.New(cfg, s, courses)
	httpServer := &http.Server{
		Addr:              cfg.Addr,
		Handler:           srv.Engine(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("mochilang api listening on %s (db: %s)", cfg.Addr, cfg.DBPath)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("listen: %v", err)
		}
	}()

	// Graceful shutdown — give in-flight requests up to 10s to finish.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	log.Println("shutting down...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}
