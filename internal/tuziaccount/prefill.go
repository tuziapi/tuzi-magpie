package tuziaccount

import (
	"strings"
	"time"
)

// WebURL is a fixed navigation choice. URLs never contain credentials or IDs.
func WebURL(target string) (string, bool) {
	switch target {
	case "token":
		return Origin + "/console/personal?source=tuzi-magpie#system-token", true
	case "topup", "redemption":
		return Origin + "/console/topup", true
	case "personal":
		return Origin + "/console/personal", true
	case "coding":
		return "https://coding.tu-zi.com/reseller/", true
	case "gaccode":
		return "https://gaccode.com/subscriptions", true
	}
	return "", false
}

// ArmPrefill records the user's explicit token-page request. Navigation back
// alone never permits clipboard access, including after a cold start.
func (s *Service) ArmPrefill() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.loadLocked()
	s.prefillUntil = time.Now().Add(5 * time.Minute)
	s.prefillGeneration = s.state.Generation
}

// Prefill consumes intent before reading: even a failed read is one attempt.
func (s *Service) Prefill(read func() (string, bool)) string {
	s.mu.Lock()
	s.loadLocked()
	allowed := !s.prefillUntil.IsZero() && time.Now().Before(s.prefillUntil) && s.prefillGeneration == s.state.Generation && s.state.Identity == nil && s.state.Status != "verifying"
	s.prefillUntil = time.Time{}
	g := s.state.Generation
	s.mu.Unlock()
	if !allowed || read == nil {
		return ""
	}
	text, ok := read()
	if !ok {
		return ""
	}
	text = strings.TrimSpace(text)
	if len(text) < 29 || len(text) > 32 || strings.IndexFunc(text, func(r rune) bool { return !(r >= 'A' && r <= 'Z' || r >= 'a' && r <= 'z' || r >= '0' && r <= '9') }) >= 0 {
		return ""
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.state.Generation != g || s.state.Identity != nil {
		return ""
	}
	return text
}
