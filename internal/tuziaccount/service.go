package tuziaccount

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/yetone/magpie/internal/appdir"
)

// Service owns one active account and its generation. Network work never holds
// mu. Changing accounts cancels old requests and fences their eventual replies.
type Service struct {
	mu                sync.Mutex
	writeMu           sync.Mutex
	store             fileStore
	origin            string
	http              *http.Client
	loaded            bool
	record            record
	state             State
	epoch             context.Context
	cancel            context.CancelFunc
	prefillUntil      time.Time
	prefillGeneration uint64
}

func New() *Service {
	return newService(filepath.Join(appdir.Config(), "account-private", "account.json"), Origin, nil)
}
func newService(path, origin string, client *http.Client) *Service {
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	} else {
		copy := *client
		client = &copy
	}
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	client.Jar = nil
	ctx, cancel := context.WithCancel(context.Background())
	return &Service{store: fileStore{path}, origin: origin, http: client, state: State{Status: "disconnected", LocalCleared: true}, epoch: ctx, cancel: cancel}
}
func randomID() string {
	var b [16]byte
	if _, e := rand.Read(b[:]); e != nil {
		panic(e)
	}
	return hex.EncodeToString(b[:])
}
func (s *Service) loadLocked() {
	if s.loaded {
		return
	}
	s.loaded = true
	r, e := s.store.read()
	if e != nil {
		s.state.Status = "error"
		s.state.Error = e
		s.state.LocalCleared = false
		return
	}
	if r.Version == 0 && r.Origin == "" {
		return
	}
	if r.Version != 1 || r.Origin != s.origin || r.Client != ClientID || (r.Token != "" && (r.Identity == nil || r.Identity.UserID == "" || r.Identity.ConnectionID == "")) {
		s.state.Status = "error"
		s.state.Error = problem("storage_invalid")
		s.state.LocalCleared = false
		return
	}
	s.record = r
	s.state.Generation = r.Generation
	s.state.PendingWrite = r.Pending
	if r.Token != "" {
		s.state.Status = "offline"
		s.state.Identity = r.Identity
		s.state.LocalCleared = false
	}
}
func (s *Service) stateLocked() State {
	out := s.state
	if out.Identity != nil {
		v := *out.Identity
		out.Identity = &v
	}
	if out.Error != nil {
		v := *out.Error
		out.Error = &v
	}
	if out.PendingWrite != nil {
		v := *out.PendingWrite
		out.PendingWrite = &v
	}
	return out
}
func (s *Service) State() State {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.loadLocked()
	return s.stateLocked()
}
func (s *Service) advanceLocked(r record, status string) {
	s.cancel()
	s.epoch, s.cancel = context.WithCancel(context.Background())
	s.record = r
	s.state = State{Status: status, Generation: r.Generation, Revision: s.state.Revision + 1, Identity: r.Identity, LocalCleared: r.Token == "", PendingWrite: r.Pending}
}
func (s *Service) fail(g uint64, e *Error) State {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.state.Generation == g {
		s.state.Error = e
		s.state.Revision++
		switch e.Code {
		case "invalid_token", "identity_mismatch", "account_disabled":
			s.state.Status = "invalid"
			s.state.Identity = nil
		case "network_uncertain", "dependency_unavailable":
			s.state.Status = "offline"
		default:
			s.state.Status = "error"
		}
	}
	return s.stateLocked()
}
func (s *Service) Connect(ctx context.Context, token string) State {
	token = strings.TrimSpace(token)
	s.mu.Lock()
	s.loadLocked()
	g := s.state.Generation + 1
	r := record{Version: 1, Origin: s.origin, Client: ClientID, Generation: g}
	// Clear the preceding account durably before accepting a different identity.
	if e := s.store.write(r); e != nil {
		old := s.state.Generation
		s.mu.Unlock()
		return s.fail(old, e)
	}
	s.advanceLocked(r, "verifying")
	s.mu.Unlock()
	if token == "" || len(token) > 4096 || strings.IndexFunc(token, func(r rune) bool { return unicode.IsSpace(r) || unicode.IsControl(r) }) >= 0 {
		return s.fail(g, problem("invalid_token"))
	}
	ctx, done := s.requestContext(ctx, g)
	defer done()
	id, e := s.identity(ctx, token, "")
	if e != nil {
		return s.fail(g, e)
	}
	id.ConnectionID = randomID()
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.state.Generation != g {
		return s.stateLocked()
	}
	r.Token = token
	r.Identity = id
	if e := s.store.write(r); e != nil {
		s.state.Status = "error"
		s.state.Error = e
		s.state.Revision++
		return s.stateLocked()
	}
	s.record = r
	s.state.Status = "connected"
	s.state.Identity = id
	s.state.LocalCleared = false
	s.state.Error = nil
	s.state.Revision++
	return s.stateLocked()
}
func (s *Service) Check(ctx context.Context) State {
	s.mu.Lock()
	s.loadLocked()
	r := s.record
	if r.Token == "" {
		out := s.stateLocked()
		s.mu.Unlock()
		return out
	}
	s.mu.Unlock()
	ctx, done := s.requestContext(ctx, r.Generation)
	defer done()
	id, e := s.identity(ctx, r.Token, r.Identity.UserID)
	if e != nil {
		return s.fail(r.Generation, e)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.state.Generation == r.Generation {
		id.ConnectionID = r.Identity.ConnectionID
		s.state.Identity = id
		s.state.Status = "connected"
		s.state.Error = nil
		s.state.Revision++
	}
	return s.stateLocked()
}
func (s *Service) Disconnect() State {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.loadLocked()
	r := record{Version: 1, Origin: s.origin, Client: ClientID, Generation: s.state.Generation + 1}
	err := s.store.write(r)
	s.advanceLocked(r, "disconnected")
	if err != nil {
		s.state.Status = "error"
		s.state.Error = err
		s.state.LocalCleared = false
	}
	return s.stateLocked()
}
func (s *Service) requestContext(parent context.Context, g uint64) (context.Context, func()) {
	s.mu.Lock()
	epoch := s.epoch
	valid := s.state.Generation == g
	s.mu.Unlock()
	ctx, cancel := context.WithCancel(parent)
	stop := context.AfterFunc(epoch, cancel)
	if !valid {
		cancel()
	}
	return ctx, func() { stop(); cancel() }
}
func (s *Service) credentials(g uint64) (record, *Error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.loadLocked()
	if s.state.Generation != g {
		return record{}, problem("stale_generation")
	}
	if s.record.Token == "" || s.state.Status == "invalid" || s.state.Status == "verifying" {
		return record{}, problem("not_connected")
	}
	return s.record, nil
}
func (s *Service) identity(ctx context.Context, token, user string) (*Identity, *Error) {
	raw, e := s.fetch(ctx, "GET", "/api/user/self/bootstrap", nil, nil, token, user, false)
	if e != nil {
		return nil, e
	}
	d := object(raw["data"])
	id, e := decimal(d["id"])
	if e != nil || id == "0" || strings.HasPrefix(id, "-") {
		return nil, problem("invalid_response")
	}
	if user != "" && user != id {
		return nil, problem("identity_mismatch")
	}
	if n, ok := integer(d["status"]); ok && n != 1 {
		return nil, problem("account_disabled")
	}
	return &Identity{UserID: id, Username: str(d["username"]), DisplayName: str(d["display_name"])}, nil
}
