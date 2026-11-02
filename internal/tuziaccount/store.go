package tuziaccount

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"runtime"
)

const maxRecord = 64 << 10

type fileStore struct{ path string }

func (s fileStore) read() (record, *Error) {
	var r record
	fi, err := os.Lstat(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return r, nil
	}
	if err != nil || !fi.Mode().IsRegular() {
		return r, problem("secure_storage_unavailable")
	}
	dir, err := os.Lstat(filepath.Dir(s.path))
	if err != nil || !dir.IsDir() || dir.Mode()&os.ModeSymlink != 0 {
		return r, problem("secure_storage_unavailable")
	}
	if runtime.GOOS != "windows" && (fi.Mode().Perm()&0077 != 0 || dir.Mode().Perm()&0077 != 0) {
		return r, problem("secure_storage_unavailable")
	}
	f, err := os.Open(s.path)
	if err != nil {
		return r, problem("secure_storage_unavailable")
	}
	defer f.Close()
	opened, err := f.Stat()
	if err != nil || !os.SameFile(fi, opened) {
		return r, problem("secure_storage_unavailable")
	}
	b, err := io.ReadAll(io.LimitReader(f, maxRecord+1))
	if err != nil {
		return r, problem("secure_storage_unavailable")
	}
	if len(b) > maxRecord {
		return r, problem("storage_invalid")
	}
	d := json.NewDecoder(bytes.NewReader(b))
	d.DisallowUnknownFields()
	if d.Decode(&r) != nil || d.Decode(new(any)) != io.EOF || r.Version != 1 {
		return record{}, problem("storage_invalid")
	}
	return r, nil
}
func (s fileStore) write(r record) *Error {
	dir := filepath.Dir(s.path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return problem("secure_storage_failed")
	}
	fi, err := os.Lstat(dir)
	if err != nil || !fi.IsDir() || fi.Mode()&os.ModeSymlink != 0 {
		return problem("secure_storage_failed")
	}
	if err := os.Chmod(dir, 0700); err != nil {
		return problem("secure_storage_failed")
	}
	if fi, err := os.Lstat(s.path); err == nil && !fi.Mode().IsRegular() || err != nil && !errors.Is(err, os.ErrNotExist) {
		return problem("secure_storage_failed")
	}
	// An explicit reconnect may replace a damaged account file, but preserves
	// the original private bytes first so a failed read never becomes empty data.
	if old, err := os.ReadFile(s.path); err == nil {
		var prior record
		d := json.NewDecoder(bytes.NewReader(old))
		d.DisallowUnknownFields()
		if d.Decode(&prior) != nil || d.Decode(new(any)) != io.EOF || prior.Version != 1 {
			backup := s.path + ".bad-" + randomID()
			f, e := os.OpenFile(backup, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
			if e != nil {
				return problem("secure_storage_failed")
			}
			_, e = f.Write(old)
			if e == nil {
				e = f.Sync()
			}
			closeErr := f.Close()
			if e != nil || closeErr != nil {
				return problem("secure_storage_failed")
			}
		}
	}
	b, err := json.Marshal(r)
	if err != nil || len(b) > maxRecord {
		return problem("secure_storage_failed")
	}
	f, err := os.CreateTemp(dir, ".account-*")
	if err != nil {
		return problem("secure_storage_failed")
	}
	name := f.Name()
	defer os.Remove(name)
	ok := f.Chmod(0600) == nil
	if ok {
		_, err = f.Write(b)
		ok = err == nil
	}
	if ok {
		ok = f.Sync() == nil
	}
	closeErr := f.Close()
	if !ok || closeErr != nil {
		return problem("secure_storage_failed")
	}
	if err = os.Rename(name, s.path); err != nil {
		return problem("secure_storage_failed")
	}
	if runtime.GOOS != "windows" {
		d, err := os.Open(dir)
		if err != nil {
			return problem("secure_storage_failed")
		}
		err = d.Sync()
		_ = d.Close()
		if err != nil {
			return problem("secure_storage_failed")
		}
	}
	return nil
}
