# Repository and release configuration

The local development build retains Magpie's history, license and attribution.
By default the existing About GitHub button and release-note issue links point
to `https://github.com/yetone/magpie`; no label, layout, style, website or
community copy changes. These attribution links are separate from updates.
The unconfigured update feed and release fallback remain disabled.

`internal/product/product.go` owns `Repository`, a linker-set string. A future
release owner can build with a selected repository without editing GUI source:

```sh
go build -ldflags '-X github.com/yetone/magpie/internal/product.Repository=https://github.com/OWNER/tuzi-magpie' -o tuzi-magpie .
```

Use the approved repository's HTTPS root without credentials, query or fragment.
Empty/invalid values retain attribution links but do not activate a release
fallback. A trailing slash is normalized. `ConfiguredRepository` is used by
`update.ReleasePage`; `RepositoryURL` is sent through `/boot.js` and consumed
by the About button and the issue-link renderer in What's new. Browser fixture
pages that omit boot metadata retain the same upstream attribution fallback.
No environment variable or settings UI can silently change this build setting.

Repository configuration does not create a remote, push a branch, publish an
artifact, enable a workflow or set an update feed. Before a future release:

1. Set the intended repository build value. Keep upstream history and notices.
2. Configure the distribution's update and notes feeds separately using
   `TUZI_MAGPIE_UPDATE_FEED` / `TUZI_MAGPIE_NOTES_FEED`, and verify artifact names
   and checksums for this distribution. The default is empty and never falls
   back to the original app's update service.
3. Supply release notes belonging to the selected repository. A bare `#123`
   links to that repository's issue 123; inherited upstream release notes must
   use full upstream URLs if their issue numbers belong to upstream.
4. Review source/history credential scan results and intentionally enable only
   owned release destinations. The disabled upstream publishing workflows must
   not be restored unchanged.

The user explicitly approved the two mirror-source wording corrections on
2026-11-03 (“修正这两处来源文案”). The existing mirror subtext and tooltip now
attribute checksums/update information to the configured update feed, in all
five languages. Controls, layout and other upstream attribution are unchanged.

Verification uses synthetic repository URLs, local handlers and intercepted
browser requests. Product tests cover default/invalid/configured values; the
native handler test checks that the build setting reaches `/boot.js`; browser
tests exercise the actual About click and release-note issue root in English
and Chinese, including the unchanged default. Root owns the full integrated
suite, final native artifact and source/history scan. No remote repository or
release was created.

Validation record (2026-11-03): `go test -p 2 -tags nogui
./internal/product ./internal/gui ./internal/update -run 'TestRepository|TestTuzi'
-count=1` passed under temporary HOME and pinned caches; update-mirror browser
tests passed 7/7 in each Chromium/WebKit after the wording change; i18n guards
passed 4/4. Replacing boot repository consumption with the old upstream
constant makes the new English and Chinese cases fail on the expected fork
URL. `gofmt`, JS syntax and diff whitespace checks passed. Full logs are under
`/Users/syd08/Documents/tuzi-magpie-evidence/lines/repository-*.log`.
