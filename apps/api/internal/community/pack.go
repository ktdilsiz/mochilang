// Package community owns the user-authored "pack" feature: lesson bundles
// submitted by signed-in users, ratings/comments/reports against them, and
// the validation logic that gates submissions.
//
// A pack is a single Level (topics → lessons → exercises) plus envelope
// metadata. The pack body is stored verbatim as JSON; we only parse it at
// submit-time to validate the shape and again at read-time to surface
// metadata fields the mobile app needs.
package community

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strings"
)

// SchemaVersion is the wire-format version the server currently understands.
// Bump when the on-disk JSON shape gains backwards-incompatible fields.
const SchemaVersion = 1

// PackEnvelope is the full JSON shape an author submits or downloads. The
// envelope holds metadata; `Level` holds the actual learnable content in
// the same shape as canonical courses, so the mobile app can render a pack
// using the existing HomeScreen path.
type PackEnvelope struct {
	SchemaVersion int    `json:"schemaVersion"`
	Slug          string `json:"slug"`
	SourceLang    string `json:"sourceLang"`
	TargetLang    string `json:"targetLang"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	Level         Level  `json:"level"`
}

// Level mirrors packages/shared `Level`. Kept as a Go struct (not
// json.RawMessage) for strict validation at submit time.
type Level struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Topics      []Topic `json:"topics"`
}

type Topic struct {
	ID            string          `json:"id"`
	Title         string          `json:"title"`
	Description   string          `json:"description"`
	Theme         string          `json:"theme"`
	Lessons       []Lesson        `json:"lessons"`
	Guide         json.RawMessage `json:"guide,omitempty"`
	Prerequisites []string        `json:"prerequisites,omitempty"`
}

type Lesson struct {
	ID               string            `json:"id"`
	Title            string            `json:"title"`
	Description      string            `json:"description"`
	Theme            string            `json:"theme"`
	XP               int               `json:"xp"`
	Exercises        []json.RawMessage `json:"exercises"`
	WordTranslations map[string]string `json:"wordTranslations,omitempty"`
}

// Allowed values from packages/shared `LessonTheme`. Keep these in sync
// when shared adds a theme. Wrong themes fail validation rather than
// silently rendering with a fallback color.
var allowedThemes = map[string]struct{}{
	"greetings": {}, "numbers": {}, "basics": {}, "family": {}, "verbs": {},
	"food": {}, "location": {}, "time": {}, "questions": {}, "directions": {},
	"colors": {}, "weather": {}, "review": {},
}

// kebab-case, 3–48 chars. Tight enough that slugs are URL-safe and
// human-readable; permissive enough that any reasonable name works.
var slugRe = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

// ISO 639-1 two-letter code. Matches the format used elsewhere in the app
// (en, tr, zh). Three-letter codes aren't currently supported.
var langRe = regexp.MustCompile(`^[a-z]{2}$`)

// ValidationError carries a JSON-pointer-like path so submitters can
// see exactly which field is wrong.
type ValidationError struct {
	Path string
	Msg  string
}

func (e ValidationError) Error() string {
	if e.Path == "" {
		return e.Msg
	}
	return e.Path + ": " + e.Msg
}

// ValidateEnvelope parses raw submission bytes and verifies the structure
// is what we'll be able to serve back. Returns the parsed envelope on
// success. Strict (rejects unknown fields on Exercise variants) so authors
// catch typos at submit instead of silently breaking the lesson UI.
func ValidateEnvelope(body []byte) (*PackEnvelope, error) {
	var env PackEnvelope
	dec := json.NewDecoder(strings.NewReader(string(body)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&env); err != nil {
		return nil, ValidationError{Msg: "invalid JSON: " + err.Error()}
	}

	if env.SchemaVersion != SchemaVersion {
		return nil, ValidationError{
			Path: "schemaVersion",
			Msg:  fmt.Sprintf("unsupported schemaVersion %d (expected %d)", env.SchemaVersion, SchemaVersion),
		}
	}
	if !slugRe.MatchString(env.Slug) {
		return nil, ValidationError{Path: "slug", Msg: "must be kebab-case (a-z0-9, '-')"}
	}
	if len(env.Slug) < 3 || len(env.Slug) > 48 {
		return nil, ValidationError{Path: "slug", Msg: "must be 3–48 characters"}
	}
	if !langRe.MatchString(env.SourceLang) {
		return nil, ValidationError{Path: "sourceLang", Msg: "must be a 2-letter language code"}
	}
	if !langRe.MatchString(env.TargetLang) {
		return nil, ValidationError{Path: "targetLang", Msg: "must be a 2-letter language code"}
	}
	if env.SourceLang == env.TargetLang {
		return nil, ValidationError{Path: "targetLang", Msg: "must differ from sourceLang"}
	}
	if t := strings.TrimSpace(env.Title); t == "" || len(t) > 80 {
		return nil, ValidationError{Path: "title", Msg: "must be 1–80 characters"}
	}
	if len(env.Description) > 500 {
		return nil, ValidationError{Path: "description", Msg: "must be ≤500 characters"}
	}

	if err := validateLevel(&env.Level); err != nil {
		return nil, err
	}
	return &env, nil
}

func validateLevel(l *Level) error {
	if l.ID == "" {
		return ValidationError{Path: "level.id", Msg: "required"}
	}
	if l.Name == "" {
		return ValidationError{Path: "level.name", Msg: "required"}
	}
	if len(l.Topics) == 0 {
		return ValidationError{Path: "level.topics", Msg: "must contain at least one topic"}
	}
	topicIDs := map[string]struct{}{}
	for i, t := range l.Topics {
		path := fmt.Sprintf("level.topics[%d]", i)
		if err := validateTopic(&l.Topics[i], path); err != nil {
			return err
		}
		if _, dup := topicIDs[t.ID]; dup {
			return ValidationError{Path: path + ".id", Msg: "duplicate topic id within pack"}
		}
		topicIDs[t.ID] = struct{}{}
	}
	return nil
}

func validateTopic(t *Topic, path string) error {
	if t.ID == "" {
		return ValidationError{Path: path + ".id", Msg: "required"}
	}
	if t.Title == "" {
		return ValidationError{Path: path + ".title", Msg: "required"}
	}
	if _, ok := allowedThemes[t.Theme]; !ok {
		return ValidationError{Path: path + ".theme", Msg: "unknown theme " + t.Theme}
	}
	if len(t.Lessons) == 0 {
		return ValidationError{Path: path + ".lessons", Msg: "must contain at least one lesson"}
	}
	lessonIDs := map[string]struct{}{}
	for i, ls := range t.Lessons {
		lpath := fmt.Sprintf("%s.lessons[%d]", path, i)
		if err := validateLesson(&t.Lessons[i], lpath); err != nil {
			return err
		}
		if _, dup := lessonIDs[ls.ID]; dup {
			return ValidationError{Path: lpath + ".id", Msg: "duplicate lesson id within topic"}
		}
		lessonIDs[ls.ID] = struct{}{}
	}
	return nil
}

func validateLesson(l *Lesson, path string) error {
	if l.ID == "" {
		return ValidationError{Path: path + ".id", Msg: "required"}
	}
	if l.Title == "" {
		return ValidationError{Path: path + ".title", Msg: "required"}
	}
	if _, ok := allowedThemes[l.Theme]; !ok {
		return ValidationError{Path: path + ".theme", Msg: "unknown theme " + l.Theme}
	}
	if l.XP < 1 || l.XP > 100 {
		return ValidationError{Path: path + ".xp", Msg: "must be between 1 and 100"}
	}
	if len(l.Exercises) == 0 {
		return ValidationError{Path: path + ".exercises", Msg: "must contain at least one exercise"}
	}
	exIDs := map[string]struct{}{}
	for i, raw := range l.Exercises {
		epath := fmt.Sprintf("%s.exercises[%d]", path, i)
		id, err := validateExercise(raw, epath)
		if err != nil {
			return err
		}
		if _, dup := exIDs[id]; dup {
			return ValidationError{Path: epath + ".id", Msg: "duplicate exercise id within lesson"}
		}
		exIDs[id] = struct{}{}
	}
	return nil
}

// validateExercise parses one exercise into the right concrete shape based
// on its `type` discriminator and returns its id. Strict on unknown fields
// per variant — typos like "options" vs "option" should fail submit
// rather than silently render a broken exercise.
func validateExercise(raw json.RawMessage, path string) (string, error) {
	var probe struct {
		ID   string `json:"id"`
		Type string `json:"type"`
	}
	if err := json.Unmarshal(raw, &probe); err != nil {
		return "", ValidationError{Path: path, Msg: "invalid JSON: " + err.Error()}
	}
	if probe.ID == "" {
		return "", ValidationError{Path: path + ".id", Msg: "required"}
	}

	dec := json.NewDecoder(strings.NewReader(string(raw)))
	dec.DisallowUnknownFields()

	switch probe.Type {
	case "multiple_choice":
		var v struct {
			ID          string   `json:"id"`
			Type        string   `json:"type"`
			Prompt      string   `json:"prompt"`
			Options     []string `json:"options"`
			Answer      string   `json:"answer"`
			Explanation string   `json:"explanation,omitempty"`
		}
		if err := dec.Decode(&v); err != nil {
			return "", ValidationError{Path: path, Msg: err.Error()}
		}
		if v.Prompt == "" {
			return "", ValidationError{Path: path + ".prompt", Msg: "required"}
		}
		if len(v.Options) < 2 {
			return "", ValidationError{Path: path + ".options", Msg: "need ≥2 options"}
		}
		if v.Answer == "" {
			return "", ValidationError{Path: path + ".answer", Msg: "required"}
		}
		if !slices.Contains(v.Options, v.Answer) {
			return "", ValidationError{Path: path + ".answer", Msg: "answer must be one of the options"}
		}

	case "fill_blank":
		var v struct {
			ID                string   `json:"id"`
			Type              string   `json:"type"`
			Prompt            string   `json:"prompt"`
			Answer            string   `json:"answer"`
			AcceptableAnswers []string `json:"acceptableAnswers,omitempty"`
			Explanation       string   `json:"explanation,omitempty"`
		}
		if err := dec.Decode(&v); err != nil {
			return "", ValidationError{Path: path, Msg: err.Error()}
		}
		if v.Prompt == "" || v.Answer == "" {
			return "", ValidationError{Path: path, Msg: "prompt and answer are required"}
		}

	case "match_pairs":
		var v struct {
			ID     string `json:"id"`
			Type   string `json:"type"`
			Prompt string `json:"prompt"`
			Pairs  []struct {
				Left  string `json:"left"`
				Right string `json:"right"`
			} `json:"pairs"`
			Explanation string `json:"explanation,omitempty"`
		}
		if err := dec.Decode(&v); err != nil {
			return "", ValidationError{Path: path, Msg: err.Error()}
		}
		if v.Prompt == "" {
			return "", ValidationError{Path: path + ".prompt", Msg: "required"}
		}
		if len(v.Pairs) < 2 {
			return "", ValidationError{Path: path + ".pairs", Msg: "need ≥2 pairs"}
		}
		for i, p := range v.Pairs {
			if p.Left == "" || p.Right == "" {
				return "", ValidationError{
					Path: fmt.Sprintf("%s.pairs[%d]", path, i),
					Msg:  "left and right are required",
				}
			}
		}

	case "listen_and_choose":
		var v struct {
			ID          string   `json:"id"`
			Type        string   `json:"type"`
			Prompt      string   `json:"prompt"`
			SpokenText  string   `json:"spokenText"`
			Options     []string `json:"options"`
			Answer      string   `json:"answer"`
			Explanation string   `json:"explanation,omitempty"`
		}
		if err := dec.Decode(&v); err != nil {
			return "", ValidationError{Path: path, Msg: err.Error()}
		}
		if v.SpokenText == "" {
			return "", ValidationError{Path: path + ".spokenText", Msg: "required"}
		}
		if len(v.Options) < 2 {
			return "", ValidationError{Path: path + ".options", Msg: "need ≥2 options"}
		}
		if !slices.Contains(v.Options, v.Answer) {
			return "", ValidationError{Path: path + ".answer", Msg: "answer must be one of the options"}
		}

	case "tap_words_in_order":
		var v struct {
			ID          string   `json:"id"`
			Type        string   `json:"type"`
			Prompt      string   `json:"prompt"`
			Answer      string   `json:"answer"`
			Bank        []string `json:"bank"`
			Explanation string   `json:"explanation,omitempty"`
		}
		if err := dec.Decode(&v); err != nil {
			return "", ValidationError{Path: path, Msg: err.Error()}
		}
		if v.Answer == "" {
			return "", ValidationError{Path: path + ".answer", Msg: "required"}
		}
		if len(v.Bank) == 0 {
			return "", ValidationError{Path: path + ".bank", Msg: "required"}
		}
		for word := range strings.FieldsSeq(v.Answer) {
			if !slices.Contains(v.Bank, word) {
				return "", ValidationError{
					Path: path + ".bank",
					Msg:  "must contain every word from answer (missing: " + word + ")",
				}
			}
		}

	default:
		return "", ValidationError{Path: path + ".type", Msg: "unknown exercise type " + probe.Type}
	}
	return probe.ID, nil
}

// IsValidationError reports whether err originated in this package's
// schema validation (so handlers can return HTTP 400 instead of 500).
func IsValidationError(err error) bool {
	var ve ValidationError
	return errors.As(err, &ve)
}
