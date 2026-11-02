//go:build tuzi_fixture

package tuziaccount

import (
	"fmt"
	"net"
	"net/http"
	"net/url"
)

// NewFixture exists only in explicitly tagged local synthetic builds. Its
// origin must be literal loopback HTTP, with no credentials or path.
func NewFixture(path, origin string) (*Service, error) {
	u, e := url.Parse(origin)
	if e != nil || u.Scheme != "http" || u.User != nil || u.Path != "" || u.RawQuery != "" || u.Fragment != "" || net.ParseIP(u.Hostname()) == nil || !net.ParseIP(u.Hostname()).IsLoopback() {
		return nil, fmt.Errorf("fixture origin must be loopback HTTP")
	}
	return newService(path, origin, &http.Client{}), nil
}
