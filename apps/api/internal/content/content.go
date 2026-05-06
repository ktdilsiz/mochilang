// Package content serves the canonical course curriculum.
//
// Each course is a directory under data/. Inside, every *.json file is
// one fluency level (CEFR-style: a1.json, a2.json, b1.json …). The
// directory name is the course id, the level files are sorted by name
// to give a deterministic ordering on the wire.
//
//	data/
//	├── zh-en/
//	│   ├── a1.json
//	│   └── a2.json   (future)
//	└── fr-en/        (future)
//
// Splitting by level keeps individual files small enough to edit by hand
// (no more 3000-line monoliths) and makes "ship A2 next" a one-file PR.
//
// We deliberately keep the in-memory shape as `json.RawMessage` per
// level rather than parsing into typed Go structs: course content
// evolves quickly (new exercise types, new section kinds in guides),
// and forcing the backend to model every variant just to re-serialize
// is busywork. The JSON shape is the contract; both ends agree on it.
package content

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"sort"
	"strings"
)

//go:embed data/*/*.json
var dataFS embed.FS

// Index lists the courses we ship without exposing their full content.
// Used by GET /api/content/courses for clients that want a directory.
type Index struct {
	Courses []CourseSummary `json:"courses"`
}

type CourseSummary struct {
	ID         string   `json:"id"`
	Levels     []string `json:"levels"`
	TopicCount int      `json:"topicCount"`
}

// course holds the assembled payload (already JSON-marshalled) plus a
// quick summary, so cold-path List() doesn't re-parse on every call.
type course struct {
	id         string
	levels     []string
	topicCount int
	body       json.RawMessage
}

type Loader struct {
	courses map[string]*course
}

// NewLoader walks every embedded course directory, parses each level
// file, validates the basic shape, and assembles a single payload per
// course in the wire format clients expect.
//
// Bad files fail-fast at process start rather than 500-ing on the first
// content request.
func NewLoader() (*Loader, error) {
	dirs, err := fs.ReadDir(dataFS, "data")
	if err != nil {
		return nil, fmt.Errorf("read embedded data: %w", err)
	}
	courses := make(map[string]*course, len(dirs))
	for _, d := range dirs {
		if !d.IsDir() {
			continue
		}
		c, err := loadCourse(d.Name())
		if err != nil {
			return nil, fmt.Errorf("course %s: %w", d.Name(), err)
		}
		courses[c.id] = c
	}
	if len(courses) == 0 {
		return nil, fmt.Errorf("no courses found under data/")
	}
	return &Loader{courses: courses}, nil
}

func loadCourse(id string) (*course, error) {
	files, err := fs.ReadDir(dataFS, "data/"+id)
	if err != nil {
		return nil, err
	}
	type levelEnvelope struct {
		ID          string          `json:"id"`
		Name        string          `json:"name"`
		Description string          `json:"description"`
		Topics      []json.RawMessage `json:"topics"`
	}
	type wireLevel struct {
		ID          string            `json:"id"`
		Name        string            `json:"name"`
		Description string            `json:"description"`
		Topics      []json.RawMessage `json:"topics"`
	}

	names := make([]string, 0, len(files))
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".json") {
			continue
		}
		names = append(names, f.Name())
	}
	if len(names) == 0 {
		return nil, fmt.Errorf("no level files in data/%s", id)
	}
	sort.Strings(names) // a1, a2, b1, b2 — lexical = pedagogical here

	levelIDs := make([]string, 0, len(names))
	wireLevels := make([]wireLevel, 0, len(names))
	totalTopics := 0
	for _, name := range names {
		body, err := fs.ReadFile(dataFS, "data/"+id+"/"+name)
		if err != nil {
			return nil, err
		}
		var env levelEnvelope
		if err := json.Unmarshal(body, &env); err != nil {
			return nil, fmt.Errorf("parse %s: %w", name, err)
		}
		if env.ID == "" {
			return nil, fmt.Errorf("%s: missing level id", name)
		}
		if len(env.Topics) == 0 {
			return nil, fmt.Errorf("%s: empty topics", name)
		}
		// Filename should match level id so authors can find files quickly.
		expected := env.ID + ".json"
		if name != expected {
			return nil, fmt.Errorf("%s: filename should be %s", name, expected)
		}
		levelIDs = append(levelIDs, env.ID)
		wireLevels = append(wireLevels, wireLevel{
			ID:          env.ID,
			Name:        env.Name,
			Description: env.Description,
			Topics:      env.Topics,
		})
		totalTopics += len(env.Topics)
	}

	// Marshal once at startup so request handlers can stream the bytes.
	wire := struct {
		ID     string      `json:"id"`
		Levels []wireLevel `json:"levels"`
	}{ID: id, Levels: wireLevels}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetIndent("", "  ")
	enc.SetEscapeHTML(false)
	if err := enc.Encode(wire); err != nil {
		return nil, err
	}

	return &course{
		id:         id,
		levels:     levelIDs,
		topicCount: totalTopics,
		body:       buf.Bytes(),
	}, nil
}

// List returns every course id in deterministic order.
func (l *Loader) List() []CourseSummary {
	ids := make([]string, 0, len(l.courses))
	for id := range l.courses {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	out := make([]CourseSummary, 0, len(ids))
	for _, id := range ids {
		c := l.courses[id]
		out = append(out, CourseSummary{
			ID:         c.id,
			Levels:     c.levels,
			TopicCount: c.topicCount,
		})
	}
	return out
}

// Get returns the assembled course payload — already in wire format —
// for direct streaming to the client. The second return is `false`
// when the id isn't shipped.
func (l *Loader) Get(id string) (json.RawMessage, bool) {
	c, ok := l.courses[id]
	if !ok {
		return nil, false
	}
	return c.body, true
}
