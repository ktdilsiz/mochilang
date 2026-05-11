package community

import (
	"encoding/json"
	"strings"
	"testing"
)

// starterTemplate must stay byte-identical (modulo leading whitespace)
// with apps/mochilang-mobile/src/screens/CommunitySubmitScreen.tsx's
// STARTER_TEMPLATE. The test guarantees the template the mobile app
// hands users will pass server-side validation. If you change one,
// update the other.
const starterTemplate = `{
  "schemaVersion": 1,
  "slug": "rename-me-before-publishing",
  "sourceLang": "en",
  "targetLang": "tr",
  "title": "Exercise Types Demo",
  "description": "Reference pack showing every exercise variant Mochilang supports. Rename the slug and title before publishing.",
  "level": {
    "id": "demo",
    "name": "Exercise Showcase",
    "description": "One lesson per exercise type — copy the JSON shape you need into your own pack.",
    "topics": [
      {
        "id": "showcase",
        "title": "Exercise Types",
        "description": "Each lesson uses a different exercise variant",
        "theme": "basics",
        "lessons": [
          {
            "id": "multiple-choice",
            "title": "Multiple choice",
            "description": "Pick the right translation",
            "theme": "greetings",
            "xp": 10,
            "exercises": [
              {
                "id": "ex1",
                "type": "multiple_choice",
                "prompt": "What does 'Merhaba' mean?",
                "options": ["Hello", "Goodbye", "Thanks", "Sorry"],
                "answer": "Hello",
                "explanation": "Merhaba is the most common Turkish greeting."
              }
            ]
          },
          {
            "id": "fill-blank",
            "title": "Fill in the blank",
            "description": "Type the missing word",
            "theme": "basics",
            "xp": 10,
            "exercises": [
              {
                "id": "ex1",
                "type": "fill_blank",
                "prompt": "Type the Turkish word for 'cat': ___",
                "answer": "kedi",
                "acceptableAnswers": ["Kedi"]
              }
            ]
          },
          {
            "id": "match-pairs",
            "title": "Match pairs",
            "description": "Connect each English word with its Turkish translation",
            "theme": "food",
            "xp": 10,
            "exercises": [
              {
                "id": "ex1",
                "type": "match_pairs",
                "prompt": "Match each food word with its Turkish translation",
                "pairs": [
                  { "left": "bread", "right": "ekmek" },
                  { "left": "water", "right": "su" },
                  { "left": "apple", "right": "elma" }
                ]
              }
            ]
          },
          {
            "id": "listen-and-choose",
            "title": "Listen and choose",
            "description": "Tap the word you hear",
            "theme": "numbers",
            "xp": 10,
            "exercises": [
              {
                "id": "ex1",
                "type": "listen_and_choose",
                "prompt": "Which number did you hear?",
                "spokenText": "üç",
                "options": ["bir", "iki", "üç", "dört"],
                "answer": "üç",
                "explanation": "üç means three."
              }
            ]
          },
          {
            "id": "tap-words-in-order",
            "title": "Tap words in order",
            "description": "Build the sentence by tapping the words in the right order",
            "theme": "questions",
            "xp": 10,
            "exercises": [
              {
                "id": "ex1",
                "type": "tap_words_in_order",
                "prompt": "Translate: 'I am good'",
                "answer": "Ben iyiyim",
                "bank": ["Ben", "iyiyim", "kötüyüm", "sen"]
              }
            ]
          }
        ]
      }
    ]
  }
}
`

func TestStarterTemplateValidates(t *testing.T) {
	env, err := ValidateEnvelope([]byte(starterTemplate))
	if err != nil {
		t.Fatalf("starter template should validate: %v", err)
	}
	if env.Slug != "rename-me-before-publishing" {
		t.Errorf("slug = %q", env.Slug)
	}
	if len(env.Level.Topics) != 1 {
		t.Fatalf("expected 1 topic, got %d", len(env.Level.Topics))
	}
	if len(env.Level.Topics[0].Lessons) != 5 {
		t.Fatalf("expected 5 lessons (one per exercise type), got %d",
			len(env.Level.Topics[0].Lessons))
	}
	wantTypes := []string{
		"multiple_choice", "fill_blank", "match_pairs",
		"listen_and_choose", "tap_words_in_order",
	}
	for i, lesson := range env.Level.Topics[0].Lessons {
		if len(lesson.Exercises) == 0 {
			t.Fatalf("lesson %d has no exercises", i)
		}
		// Probe the type field from the raw exercise.
		var probe struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(lesson.Exercises[0], &probe); err != nil {
			t.Fatalf("lesson %d exercise: %v", i, err)
		}
		if probe.Type != wantTypes[i] {
			t.Errorf("lesson %d: type = %q, want %q", i, probe.Type, wantTypes[i])
		}
	}
}

// Negative cases — each minimal envelope should fail at the field the
// test name calls out. Catches regressions where the validator becomes
// too lenient.
func TestValidateEnvelopeRejects(t *testing.T) {
	cases := []struct {
		name       string
		body       string
		wantInPath string // substring expected in the error path
	}{
		{
			name:       "bad_slug_chars",
			body:       envelope(`"slug": "Bad Slug!"`),
			wantInPath: "slug",
		},
		{
			name:       "missing_source_lang",
			body:       envelope(`"sourceLang": ""`),
			wantInPath: "sourceLang",
		},
		{
			name:       "source_equals_target",
			body:       envelope(`"sourceLang": "tr"`),
			wantInPath: "targetLang",
		},
		{
			name:       "mc_answer_not_in_options",
			body:       mcEnvelope(`"answer": "Not There"`),
			wantInPath: "exercises[0].answer",
		},
		{
			name:       "mc_only_one_option",
			body:       mcEnvelope(`"options": ["Only one"]`, `"answer": "Only one"`),
			wantInPath: "exercises[0].options",
		},
		{
			name:       "unknown_theme",
			body:       envelope(`"theme": "underwater-basket-weaving"`),
			wantInPath: "theme",
		},
		{
			name:       "xp_out_of_range",
			body:       envelope(`"xp": 9999`),
			wantInPath: "xp",
		},
		{
			name:       "unknown_exercise_type",
			body:       envelope(`"type": "made_up_type"`),
			wantInPath: "exercises[0].type",
		},
		{
			name:       "schema_version_mismatch",
			body:       envelope(`"schemaVersion": 9001`),
			wantInPath: "schemaVersion",
		},
		{
			name:       "tap_words_bank_missing_word",
			body:       tapEnvelope(`"answer": "Ben iyiyim"`, `"bank": ["Ben", "kötüyüm"]`),
			wantInPath: "exercises[0].bank",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ValidateEnvelope([]byte(tc.body))
			if err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !IsValidationError(err) {
				t.Fatalf("expected ValidationError, got %T: %v", err, err)
			}
			if !strings.Contains(err.Error(), tc.wantInPath) {
				t.Errorf("error %q missing expected path fragment %q", err.Error(), tc.wantInPath)
			}
		})
	}
}

// envelope renders a minimal valid-ish envelope with the given overrides
// applied (each override is a "field: value" fragment that replaces the
// matching default field). Used to write one-line negative cases.
func envelope(overrides ...string) string {
	body := `{
  "schemaVersion": 1,
  "slug": "demo-pack",
  "sourceLang": "en",
  "targetLang": "tr",
  "title": "Demo",
  "description": "",
  "level": {
    "id": "lvl",
    "name": "L1",
    "description": "",
    "topics": [{
      "id": "t1",
      "title": "T1",
      "description": "",
      "theme": "greetings",
      "lessons": [{
        "id": "l1",
        "title": "L1",
        "description": "",
        "theme": "greetings",
        "xp": 10,
        "exercises": [{
          "id": "ex1",
          "type": "multiple_choice",
          "prompt": "Q?",
          "options": ["a", "b"],
          "answer": "a"
        }]
      }]
    }]
  }
}`
	for _, o := range overrides {
		// Each override is "field": value — patch by finding the field name.
		key := strings.TrimSpace(strings.SplitN(o, ":", 2)[0])
		body = replaceFirstFieldValue(body, key, o)
	}
	return body
}

func mcEnvelope(overrides ...string) string { return envelope(overrides...) }

// tapEnvelope swaps in a tap_words_in_order exercise so we can exercise
// that variant's bank/answer relationship.
func tapEnvelope(overrides ...string) string {
	body := envelope(
		`"type": "tap_words_in_order"`,
		`"prompt": "translate me"`,
	)
	// Drop the multiple-choice-only fields by replacing the exercise.
	body = strings.Replace(body,
		`{
          "id": "ex1",
          "type": "tap_words_in_order",
          "prompt": "translate me",
          "options": ["a", "b"],
          "answer": "a"
        }`,
		`{
          "id": "ex1",
          "type": "tap_words_in_order",
          "prompt": "translate me",
          "answer": "REPLACE_ANSWER",
          "bank": ["REPLACE_BANK"]
        }`, 1)
	for _, o := range overrides {
		key := strings.TrimSpace(strings.SplitN(o, ":", 2)[0])
		body = replaceFirstFieldValue(body, key, o)
	}
	return body
}

// replaceFirstFieldValue finds `"<key>": <oldValue>` and replaces the
// whole line up to the comma/closing brace with `newFragment`. Used by
// the test envelope builder so cases stay readable.
func replaceFirstFieldValue(body, key, newFragment string) string {
	needle := key + ":"
	idx := strings.Index(body, needle)
	if idx == -1 {
		return body
	}
	// Walk forward until we hit a comma or closing brace at the same
	// nesting level — good enough for the simple shapes used in tests.
	depth := 0
	end := idx + len(needle)
	for ; end < len(body); end++ {
		c := body[end]
		if c == '[' || c == '{' {
			depth++
		} else if c == ']' || c == '}' {
			if depth == 0 {
				break
			}
			depth--
		} else if (c == ',' || c == '\n') && depth == 0 {
			break
		}
	}
	return body[:idx] + newFragment + body[end:]
}

