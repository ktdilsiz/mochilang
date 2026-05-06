// Package content serves the canonical course curriculum.
//
// Course JSON lives at internal/content/data/*.json — one file per course
// (zh-en, fr-en, etc). The backend embeds them, parses at startup, and
// holds them in memory; clients fetch via /api/content/courses/:id.
//
// The same JSON files get copied into apps/web/src/data/generated/ by
// cmd/genfallbacks so the web app can bundle them as offline fallbacks.
//
// We deliberately keep the in-memory shape as `json.RawMessage` per course
// rather than parsing into typed Go structs: course content evolves
// quickly (new exercise types, new section kinds in guides), and forcing
// the backend to model every variant just to re-serialize is busywork.
// The JSON shape is the contract; both ends agree on it directly.
package content

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

// Index lists the courses we ship without exposing their full content.
// Used by GET /api/content/courses for clients that want a directory.
type Index struct {
	Courses []CourseSummary `json:"courses"`
}

type CourseSummary struct {
	ID         string `json:"id"`
	TopicCount int    `json:"topicCount"`
}

// Catalog is what we return for a single course request — the entire
// payload the frontend needs to build screens. We pre-decode just enough
// to validate at startup (top-level keys, topic count) but pass the rest
// through unchanged so unknown fields propagate to the client untouched.
type Catalog struct {
	Raw json.RawMessage
}

type Loader struct {
	courses map[string]*Catalog
}

// NewLoader reads every embedded course file and validates the basic
// shape. A bad file fails-fast at process start rather than 500-ing on
// the first content request.
func NewLoader() (*Loader, error) {
	files, err := fs.ReadDir(dataFS, "data")
	if err != nil {
		return nil, fmt.Errorf("read embedded data: %w", err)
	}
	courses := make(map[string]*Catalog, len(files))
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".json") {
			continue
		}
		body, err := fs.ReadFile(dataFS, "data/"+f.Name())
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", f.Name(), err)
		}
		// Validate minimum shape so a malformed JSON file doesn't ship
		// silently. Topics may not be empty for an active course.
		var probe struct {
			ID     string `json:"id"`
			Topics []any  `json:"topics"`
		}
		if err := json.Unmarshal(body, &probe); err != nil {
			return nil, fmt.Errorf("parse %s: %w", f.Name(), err)
		}
		if probe.ID == "" {
			return nil, fmt.Errorf("%s: missing id", f.Name())
		}
		if len(probe.Topics) == 0 {
			return nil, fmt.Errorf("%s: empty topics", f.Name())
		}
		courses[probe.ID] = &Catalog{Raw: body}
	}
	return &Loader{courses: courses}, nil
}

// List returns every course id in deterministic order so paginated
// clients see stable results.
func (l *Loader) List() []CourseSummary {
	ids := make([]string, 0, len(l.courses))
	for id := range l.courses {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	out := make([]CourseSummary, 0, len(ids))
	for _, id := range ids {
		// Lazy topic count — re-decode just the headers field. Cheap,
		// and avoids holding two parsed copies in memory.
		var hdr struct {
			Topics []any `json:"topics"`
		}
		_ = json.Unmarshal(l.courses[id].Raw, &hdr)
		out = append(out, CourseSummary{ID: id, TopicCount: len(hdr.Topics)})
	}
	return out
}

// Get returns the raw course payload for direct streaming to the client.
// The second return is `false` when the id isn't shipped.
func (l *Loader) Get(id string) (json.RawMessage, bool) {
	c, ok := l.courses[id]
	if !ok {
		return nil, false
	}
	return c.Raw, true
}
