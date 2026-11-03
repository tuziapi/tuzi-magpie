//go:build tuzi_fixture

// Local synthetic acceptance server. Never compiled into the application.
package main

import (
	"encoding/json"
	"flag"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/yetone/magpie/internal/tuzifixture"
)

func main() {
	addr := flag.String("addr", "127.0.0.1:18341", "literal loopback address")
	report := flag.String("report", "", "native acceptance result file")
	flag.Parse()
	host, _, err := net.SplitHostPort(*addr)
	if err != nil || net.ParseIP(host) == nil || !net.ParseIP(host).IsLoopback() {
		log.Fatal("fixture requires literal loopback")
	}
	fixture := tuzifixture.New()
	mux := http.NewServeMux()
	mux.Handle("/", fixture)
	mux.HandleFunc("/__snapshot", func(w http.ResponseWriter, r *http.Request) {
		paths, calls := fixture.Snapshot()
		_ = json.NewEncoder(w).Encode(map[string]any{"paths": paths, "modelCalls": calls})
	})
	mux.HandleFunc("/__report", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			return
		}
		if r.Method != "POST" || *report == "" {
			http.Error(w, "report unavailable", 400)
			return
		}
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<10))
		if err != nil || !json.Valid(body) {
			http.Error(w, "invalid report", 400)
			return
		}
		if err := os.WriteFile(*report, body, 0600); err != nil {
			http.Error(w, "report write failed", 500)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	log.Printf("synthetic fixture listening on %s", *addr)
	log.Fatal((&http.Server{Addr: *addr, Handler: mux, ReadHeaderTimeout: 5 * time.Second}).ListenAndServe())
}
