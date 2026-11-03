package agent

import (
	"crypto/sha256"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"github.com/yetone/magpie/internal/filememo"
	"github.com/yetone/magpie/internal/provider"
)

// managedAgent requires evidence in this distribution's data directory.
// A shared protocol name or loopback address in an agent's own files is
// not evidence: another Magpie installation may own those files. Read the
// records afresh and reject the whole record on malformed JSON.
func managedAgent(id string) bool {
	if r := appliedOf(id); r.Kept || !r.At.IsZero() && len(r.Fields) > 0 {
		return true
	}
	saved := stashRead(filememo.ReadNow[map[string]string])
	for _, suffix := range []string{".tuzi-managed", ".connect.was", ".wired_at", ".model", ".provider", ".catalog", ".joined", ".beside", ".base_url", ".reconnect", disconnectedKey} {
		if saved[id+suffix] != "" {
			return true
		}
	}
	return false
}

var originalMu sync.Mutex

// keepOriginal preserves the first explicitly adopted config verbatim.
// This backup is separate from field-level Disconnect restoration: a
// shared provider name can already belong to original Magpie. Keeping the
// original file also avoids guessing when that installation is restored.
func (a *Agent) keepOriginal() error {
	originalMu.Lock()
	defer originalMu.Unlock()
	if managedAgent(a.ID) || a.Path == "" {
		return nil
	}
	b, err := os.ReadFile(a.Path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	// IDs can name WSL instances; no ID may escape the private backup dir.
	name := strings.NewReplacer("/", "_", "\\", "_", ":", "_").Replace(a.ID)
	if name != a.ID {
		sum := sha256.Sum256([]byte(a.ID))
		name = fmt.Sprintf("%s-%x", name, sum[:8])
	}
	dir := filepath.Join(filepath.Dir(provider.Path()), "agent-originals")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	path := filepath.Join(dir, name+".config")
	// Publish only a complete, flushed file. A crash while writing the
	// temporary file must never leave a partial backup that a later Apply
	// mistakes for a valid restore point. Link refuses to replace an existing
	// first-adoption backup, including one another process just published.
	f, err := os.CreateTemp(dir, ".original-*")
	if err != nil {
		return err
	}
	tmp := f.Name()
	defer os.Remove(tmp)
	_, writeErr := f.Write(b)
	if writeErr == nil {
		writeErr = f.Sync()
	}
	closeErr := f.Close()
	if writeErr != nil {
		return writeErr
	}
	if closeErr != nil {
		return closeErr
	}
	if err := os.Link(tmp, path); err != nil {
		if !os.IsExist(err) {
			return err
		}
		info, statErr := os.Lstat(path)
		if statErr != nil {
			return statErr
		}
		if !info.Mode().IsRegular() || runtime.GOOS != "windows" && info.Mode().Perm()&0077 != 0 {
			return fmt.Errorf("original config backup must be a private regular file: %s", path)
		}
		_, err := os.ReadFile(path)
		return err
	}
	return nil
}

// syncExplicit is a dependent agent configured by an explicit Connect/Apply
// workflow (Claude Desktop's Code environment). It keeps that workflow
// available while preserving the same recovery and ownership boundary.
func (a *Agent) syncExplicit() error {
	if err := a.keepOriginal(); err != nil {
		return err
	}
	if a.Sync == nil {
		return nil
	}
	if err := a.Sync(); err != nil {
		return err
	}
	stash(map[string]string{a.ID + ".tuzi-managed": "1"})
	return nil
}
