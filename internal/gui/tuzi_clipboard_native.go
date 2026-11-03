//go:build !nogui

package gui

import "github.com/wailsapp/wails/v3/pkg/application"

// TuziClipboardText is used only after the account backend grants a one-shot
// prefill attempt for an explicit token-page open. It never stores the text.
func (h *host) TuziClipboardText() (string, bool) {
	type result struct {
		text string
		ok   bool
	}
	r := application.InvokeSyncWithResult(func() result {
		text, ok := h.app.Clipboard.Text()
		return result{text, ok}
	})
	return r.text, r.ok
}
