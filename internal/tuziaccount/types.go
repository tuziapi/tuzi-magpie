// Package tuziaccount implements the desktop-only Tuzi system-token client.
// Account credentials never become model-provider or gateway credentials.
package tuziaccount

import (
	"encoding/json"
	"time"
)

const Origin = "https://api.tu-zi.com"
const ClientID = "tuzi-magpie-desktop"

type Error struct {
	Code           string `json:"code"`
	Message        string `json:"message"`
	Status         int    `json:"status,omitempty"`
	RetryAfter     int    `json:"retryAfter,omitempty"`
	OutcomeUnknown bool   `json:"outcomeUnknown"`
}

func (e *Error) Error() string   { return e.Code }
func problem(code string) *Error { return &Error{Code: code, Message: code} }

type Identity struct {
	UserID       string `json:"userId"`
	Username     string `json:"username"`
	DisplayName  string `json:"displayName"`
	ConnectionID string `json:"connectionId"`
}
type State struct {
	Status         string        `json:"status"`
	Generation     uint64        `json:"generation"`
	Revision       uint64        `json:"revision"`
	Identity       *Identity     `json:"identity"`
	Error          *Error        `json:"error"`
	LocalCleared   bool          `json:"localCleared"`
	RemoteRevoked  *bool         `json:"remoteRevoked"`
	ExpiresAt      *int64        `json:"expiresAt"`
	GrantExpiresAt *int64        `json:"grantExpiresAt"`
	PendingWrite   *PendingWrite `json:"pendingWrite,omitempty"`
}

// PendingWrite is a durable gate after a write whose result may have been lost.
// It holds no key or request body. A read-back and explicit acknowledgment are
// required before another mutation; a restart never silently retries a write.
type PendingWrite struct {
	Method    string `json:"method"`
	Path      string `json:"path"`
	StartedAt int64  `json:"startedAt"`
	ReadBack  bool   `json:"readBack"`
}
type record struct {
	Version    int           `json:"version"`
	Origin     string        `json:"origin"`
	Client     string        `json:"client"`
	Generation uint64        `json:"generation"`
	Token      string        `json:"token,omitempty"`
	Identity   *Identity     `json:"identity,omitempty"`
	Pending    *PendingWrite `json:"pending,omitempty"`
}
type Request struct {
	Method     string          `json:"method"`
	Path       string          `json:"path"`
	Query      [][2]string     `json:"query,omitempty"`
	Body       json.RawMessage `json:"body,omitempty"`
	Generation uint64          `json:"generation"`
}
type Envelope struct {
	Success bool           `json:"success"`
	Message string         `json:"message"`
	Data    any            `json:"data"`
	Meta    map[string]any `json:"meta"`
}

func envelope(data any) Envelope {
	return Envelope{true, "", data, map[string]any{"contract_version": "system-token-v1", "request_id": randomID(), "generated_at": time.Now().Unix()}}
}
