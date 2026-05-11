// Package i18n serves UI string dictionaries to the apps.
//
// One JSON file per supported locale lives in data/{code}.json. We
// embed them at build time so deploys don't depend on a filesystem
// layout; the client fetches GET /api/i18n/:locale and gets back the
// raw dict.
//
// English is the source of truth — when adding a key, add to en.json
// first then mirror to the other locales. Clients fall back to the
// English value if a key is missing in the requested locale, so a
// fresh string is always shown even before translators catch up.
package i18n

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"sort"
	"strings"
)

//go:embed data/*.json
var dataFS embed.FS

// Loader is a tiny in-memory cache so we don't re-decode the bundle
// on every request.
type Loader struct {
	// locale code → raw JSON payload as served to the client.
	bodies map[string]json.RawMessage
	codes  []string
}

func NewLoader() (*Loader, error) {
	entries, err := fs.ReadDir(dataFS, "data")
	if err != nil {
		return nil, fmt.Errorf("read embedded i18n data: %w", err)
	}
	bodies := make(map[string]json.RawMessage, len(entries))
	codes := make([]string, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		raw, err := fs.ReadFile(dataFS, "data/"+e.Name())
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", e.Name(), err)
		}
		// Validate JSON so a malformed file fails-fast at process
		// start rather than 500-ing on the first locale request.
		var probe map[string]string
		if err := json.Unmarshal(raw, &probe); err != nil {
			return nil, fmt.Errorf("decode %s: %w", e.Name(), err)
		}
		code := strings.TrimSuffix(e.Name(), ".json")
		bodies[code] = json.RawMessage(raw)
		codes = append(codes, code)
	}
	sort.Strings(codes)
	if len(codes) == 0 {
		return nil, fmt.Errorf("no i18n locales found under data/")
	}
	return &Loader{bodies: bodies, codes: codes}, nil
}

// List returns the supported locale codes, alphabetical.
func (l *Loader) List() []string {
	out := make([]string, len(l.codes))
	copy(out, l.codes)
	return out
}

// Get returns the raw JSON for a locale, or `false` if unknown.
func (l *Loader) Get(code string) (json.RawMessage, bool) {
	body, ok := l.bodies[code]
	return body, ok
}
