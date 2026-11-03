// Package tuzi registers the desktop account workspace. Account credentials
// and business requests belong to the trusted native account service.
package tuzi

import "github.com/yetone/magpie/internal/pluginrt"

func init() {
	pluginrt.Register(pluginrt.Manifest{
		ID: "tuzi", API: "^1", Requires: []string{"window"}, Essential: true,
		Name: "Tuzi account", Sub: "Tuzi account",
		Parts:  []pluginrt.Part{{Slot: "nav.page", Key: "tuzi"}},
		Client: []string{"money.js", "i18n.js", "tuzi.css", "client.js"},
	})
}
