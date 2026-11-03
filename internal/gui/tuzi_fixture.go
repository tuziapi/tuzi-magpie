//go:build tuzi_fixture

package gui

import (
	"os"
	"path/filepath"

	"github.com/yetone/magpie/internal/appdir"
	"github.com/yetone/magpie/internal/tuziaccount"
)

// Only explicitly tagged local acceptance builds accept a synthetic origin.
// NewFixture rejects everything except literal-loopback HTTP.
func init() {
	if origin := os.Getenv("TUZI_MAGPIE_FIXTURE_ORIGIN"); origin != "" {
		newTuziAccount = func() *tuziaccount.Service {
			s, err := tuziaccount.NewFixture(filepath.Join(appdir.Config(), "account-private", "account.json"), origin)
			if err != nil {
				panic(err)
			}
			return s
		}
	}
}
