package usage

import (
	"fmt"
	"runtime"
	"testing"
	"time"
)

// benchChunks are n packed chunks of size rows each, every row with ids of
// its own, as a long history's session chunks are.
func benchChunks(b testing.TB, n, size int) []*rowChunk {
	b.Helper()
	at := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	var chunks []*rowChunk
	for k := range n {
		c := &rowChunk{}
		for i := range size {
			at = at.Add(time.Second)
			c.add(Row{Record: Record{Time: at, Agent: "codex", Provider: "openai", Model: "gpt-5", Input: i, Session: fmt.Sprint("s", k), RequestID: fmt.Sprint("req-", k, "-", i)}}, fmt.Sprint("resp-", k, "-", i), int64(i), false)
		}
		packed := c.pack()
		if len(packed.Archive) == 0 {
			b.Fatal("not packed")
		}
		chunks = append(chunks, packed)
	}
	return chunks
}

// BenchmarkChunkRowsPass is one pass over a history's chunks, as a page's
// pass reads them: with its strings copied (visitBlocks) and lent.
func BenchmarkChunkRowsPass(b *testing.B) {
	chunks := benchChunks(b, 40, 3000)
	b.Run("copied", func(b *testing.B) {
		b.ReportAllocs()
		for range b.N {
			n := 0
			visitBlocks(chunks, time.Time{}, func(Record) { n++ })
			if n != 40*3000 {
				b.Fatal(n)
			}
		}
	})
	// a collection between passes, as polls while an agent works see:
	// what a pass keeps in a sync.Pool is gone by the next
	b.Run("copied after a collection", func(b *testing.B) {
		b.ReportAllocs()
		for range b.N {
			b.StopTimer()
			runtime.GC()
			runtime.GC()
			b.StartTimer()
			n := 0
			visitBlocks(chunks, time.Time{}, func(Record) { n++ })
			if n != 40*3000 {
				b.Fatal(n)
			}
		}
	})
	b.Run("lent", func(b *testing.B) {
		b.ReportAllocs()
		for range b.N {
			rows := lentRows()
			n := 0
			for _, c := range chunks {
				n += len(rows.of(c).Rows)
			}
			rows.release()
			if n != 40*3000 {
				b.Fatal(n)
			}
		}
	})
}

// A pass that copies its strings decodes into the buffer passes keep, not
// a sync.Pool's, which each collection empties: after one, the pass made
// its decode buffer again, and grew it to the largest block (#4372). What
// it allocates is each block's strings, one copy a block. Check the retained
// storage directly: AllocsPerRun counts process-wide runtime/GC allocations
// too, so collecting inside its callback can fail even with the buffer kept.
// BenchmarkChunkRowsPass continues to report the pass's allocation cost.
func TestCopiedPassKeepsItsDecodeBuffer(t *testing.T) {
	ReleaseScratch()
	t.Cleanup(ReleaseScratch)
	chunks := benchChunks(t, 4, 2000)
	pass := func() *rowBuffer {
		t.Helper()
		n := 0
		visitBlocks(chunks, time.Time{}, func(r Record) {
			if r.Input != n%2000 {
				t.Fatalf("row %d read input %d", n, r.Input)
			}
			n++
		})
		if n != 8000 {
			t.Fatalf("read %d rows, want 8000", n)
		}
		for i := range keptRows {
			if b := keptRows[i].Load(); b != nil {
				return b
			}
		}
		t.Fatal("the pass kept no decode buffer")
		return nil
	}
	buffer := pass()
	if len(buffer.decoded) == 0 {
		t.Fatal("the copied pass did not keep its decoded bytes")
	}
	first := &buffer.decoded[0]
	for range 5 {
		runtime.GC()
		runtime.GC()
		if next := pass(); next != buffer || len(next.decoded) == 0 || &next.decoded[0] != first {
			t.Fatal("a copied pass replaced its decode buffer after a collection")
		}
	}
}
