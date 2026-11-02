package provider

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"sync"

	"github.com/yetone/magpie/internal/catalog"
	"github.com/yetone/magpie/internal/lastgood"
)

// TuziSource is non-secret provenance for one account Key. Backups may carry
// it, but it never authorizes an account request or restores a system token.
type TuziSource struct {
	Origin  string `json:"origin"`
	UserID  string `json:"userId"`
	TokenID string `json:"tokenId"`
}

var tuziSourceMu sync.Mutex
var errTuziConflict = errors.New("providers changed while adding the account key; retry")

// AddTuziSource adds exactly one Provider per stable source. It never rewrites
// an existing match, even when its name, key, endpoints or model list changed.
// Unknown existing JSON fields survive. A changed or broken file is refused.
// The final byte comparison detects edits made during preparation; unrelated
// writers do not participate in this mutex, so this is not a global transaction.
func AddTuziSource(p Provider) (string, bool, error) { return addTuziSource(p, nil) }
func addTuziSource(p Provider, beforeCommit func()) (string, bool, error) {
	tuziSourceMu.Lock()
	defer tuziSourceMu.Unlock()
	src := p.TuziSource
	if src == nil || src.Origin == "" || src.UserID == "" || src.TokenID == "" || p.Key == "" || len(p.Models) == 0 || !hasEndpoint(p) {
		return "", false, errors.New("incomplete account key provider")
	}
	original, err := os.ReadFile(Path())
	missing := errors.Is(err, os.ErrNotExist)
	if err != nil && !missing {
		return "", false, err
	}
	root := map[string]json.RawMessage{}
	if !missing {
		if err = json.Unmarshal(bytes.TrimPrefix(original, utf8BOM), &root); err != nil || root == nil {
			return "", false, ErrUnreadable
		}
	}
	var rows []json.RawMessage
	if data, ok := root["providers"]; ok {
		if err = json.Unmarshal(data, &rows); err != nil {
			return "", false, ErrUnreadable
		}
	}
	for _, row := range rows {
		var old Provider
		if err = json.Unmarshal(row, &old); err != nil {
			return "", false, ErrUnreadable
		}
		if old.TuziSource != nil && *old.TuziSource == *src {
			return old.ID, true, nil
		}
	}
	var nonce [12]byte
	if _, err = rand.Read(nonce[:]); err != nil {
		return "", false, err
	}
	p.ID = "tuzi-" + hex.EncodeToString(nonce[:])
	p.Name = strings.TrimSpace(p.Name)
	if p.Name == "" {
		p.Name = "Tuzi API"
	}
	p = normalize(p)
	data, err := json.Marshal(p)
	if err != nil {
		return "", false, err
	}
	rows = append(rows, data)
	root["providers"], err = json.Marshal(rows)
	if err != nil {
		return "", false, err
	}
	data, err = json.MarshalIndent(root, "", "  ")
	if err != nil {
		return "", false, err
	}
	if beforeCommit != nil {
		beforeCommit()
	}
	current, err := os.ReadFile(Path())
	if missing {
		if !errors.Is(err, os.ErrNotExist) {
			return "", false, errTuziConflict
		}
	} else if err != nil || !bytes.Equal(current, original) {
		return "", false, errTuziConflict
	}
	if !missing {
		if err = lastgood.Keep(Path(), validProviders, 0600); err != nil {
			return "", false, err
		}
	}
	if err = writePrivate(Path(), append(data, '\n')); err != nil {
		return "", false, err
	}
	catalog.Touched()
	return p.ID, false, nil
}
