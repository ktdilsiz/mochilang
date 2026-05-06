package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
)

// SessionTokenBytes is the size of the random session secret we mint per
// login. 32 bytes → ~256 bits of entropy → 64 hex chars on the cookie.
const SessionTokenBytes = 32

// MintToken returns (cookieValue, dbID).
//
// `cookieValue` is the raw secret we hand to the browser. `dbID` is the
// SHA-256 of that secret, which is what we store in `sessions.id`. This
// way an attacker who reads the database can't forge a valid cookie —
// they'd have to compute a preimage of the hash.
func MintToken() (cookieValue, dbID string, err error) {
	buf := make([]byte, SessionTokenBytes)
	if _, err = rand.Read(buf); err != nil {
		return "", "", err
	}
	cookieValue = hex.EncodeToString(buf)
	dbID = HashToken(cookieValue)
	return cookieValue, dbID, nil
}

// HashToken is the one-way hash we apply before any DB lookup or insert.
// Always go cookie → HashToken → query; never store the cookie value
// itself.
func HashToken(cookieValue string) string {
	sum := sha256.Sum256([]byte(cookieValue))
	return hex.EncodeToString(sum[:])
}
