//go:build !nogui && !tuzi_fixture

package gui

import (
	"github.com/wailsapp/wails/v3/pkg/application"
	"net/http"
)

func tuziFixtureWindow(*application.WebviewWindow) {}

func tuziFixtureAssets(next http.Handler) http.Handler { return next }
