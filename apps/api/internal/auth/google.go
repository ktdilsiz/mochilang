// Package auth handles Google Sign-In ID token verification and session
// management.
//
// We outsource identity entirely to Google: the frontend uses Google
// Identity Services to render a "Sign in with Google" button, gets back
// an ID token (a JWT signed by Google), and POSTs it here. We verify the
// signature using Google's published JWKS, extract the user's `sub` and
// `email`, and create a server-side session.
//
// We do not store passwords, send email, or run a password-reset flow.
package auth

import (
	"context"
	"errors"
	"fmt"

	"google.golang.org/api/idtoken"
)

// GoogleClaims is the subset of the ID token payload we care about.
// Google emits many more fields; we ignore the rest. `Sub` is Google's
// stable user ID — never reuse `Email` as a primary key, since email
// addresses can change.
type GoogleClaims struct {
	Sub           string
	Email         string
	EmailVerified bool
	Name          string
	Picture       string
}

// GoogleVerifier validates ID tokens against a known audience (the OAuth
// client ID we registered in Google Cloud Console). Audience mismatch is
// the main protection against tokens issued for *other* apps being
// replayed at our API.
type GoogleVerifier struct {
	clientID string
}

func NewGoogleVerifier(clientID string) *GoogleVerifier {
	return &GoogleVerifier{clientID: clientID}
}

// Verify parses and validates an ID token. The idtoken package handles
// signature verification using Google's JWKS (cached), expiration check,
// and audience match. We add the email-verified gate ourselves —
// unverified Google accounts shouldn't be allowed in.
func (v *GoogleVerifier) Verify(ctx context.Context, idToken string) (*GoogleClaims, error) {
	if v.clientID == "" {
		return nil, errors.New("google verifier: client_id not configured")
	}
	payload, err := idtoken.Validate(ctx, idToken, v.clientID)
	if err != nil {
		return nil, fmt.Errorf("validate id token: %w", err)
	}

	sub, _ := payload.Claims["sub"].(string)
	email, _ := payload.Claims["email"].(string)
	emailVerified, _ := payload.Claims["email_verified"].(bool)
	name, _ := payload.Claims["name"].(string)
	picture, _ := payload.Claims["picture"].(string)

	if sub == "" || email == "" {
		return nil, errors.New("id token missing sub or email")
	}
	if !emailVerified {
		return nil, errors.New("google account email not verified")
	}

	return &GoogleClaims{
		Sub:           sub,
		Email:         email,
		EmailVerified: emailVerified,
		Name:          name,
		Picture:       picture,
	}, nil
}
