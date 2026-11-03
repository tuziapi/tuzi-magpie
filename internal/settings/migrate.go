package settings

import (
	"io"
	"os"
	"path/filepath"
)

// Migrate is retained as the startup migration hook. This independent
// distribution must not adopt dial or Magpie state automatically: those
// folders can contain another application's accounts and credentials.
func Migrate() {}

// copyTree copies src into dst, files and modes alike, when src exists and
// dst does not. Errors are not reported: the worst case is a fresh start,
// which is what a missing folder means anyway.
func copyTree(src, dst string) {
	if _, err := os.Stat(dst); err == nil {
		return
	}
	if fi, err := os.Stat(src); err != nil || !fi.IsDir() {
		return
	}
	_ = filepath.WalkDir(src, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		rel, _ := filepath.Rel(src, p)
		out := filepath.Join(dst, rel)
		info, err := d.Info()
		if err != nil {
			return nil
		}
		if d.IsDir() {
			_ = os.MkdirAll(out, info.Mode().Perm())
			return nil
		}
		if !d.Type().IsRegular() {
			return nil
		}
		in, err := os.Open(p)
		if err != nil {
			return nil
		}
		defer in.Close()
		f, err := os.OpenFile(out, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, info.Mode().Perm())
		if err != nil {
			return nil
		}
		defer f.Close()
		_, _ = io.Copy(f, in)
		return nil
	})
}
