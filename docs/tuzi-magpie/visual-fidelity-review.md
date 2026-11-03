# Original-page fidelity review — 2026-11-03

The reviewed integrated assets preserve the original content and controls in
all 64 captured page conditions and all 8 captured provider-editor conditions.
No unapproved content-area visual or workflow difference was found in these
conditions. This is a synthetic browser comparison, not a claim that all
application behavior or native platform acceptance has passed.

## Inputs and method

- Baseline: `/Users/syd08/Documents/tuzi-magpie-baseline`, original Magpie
  `2251ca1ce93a837aa31df1158fa9d58437268a71`.
- Integrated source: `/Users/syd08/Documents/tuzi-magpie-local`, HEAD
  `ca96704b2b3a93932d97351b5c865c4024868b6d` plus its working-tree integration
  changes at capture time. These changes were not represented by HEAD alone.
- Every asset was copied read-only to an evidence snapshot before either run;
  `source-manifest.json` records original repository status and per-file SHA256
  for both snapshots. No business files were edited during this review.
- Both runs used Playwright 1.56.1 and pinned Chromium revision 1194,
  `141.0.7390.37`, not system Chrome. Browser runs were serialized and coordinated
  with the website reviewer. Each browser/context closed after its run.
- Eight original pages: Agents, Providers, Routing, Library, Usage, Sessions,
  Plugins, Settings. English and Simplified Chinese, light and dark,
  1100×800 and 440×800: 64 page conditions per tree.
- The synthetic fixture and capture route are derived from root's
  `scripts/tuzi-magpie/visual-baseline.cjs`. External hosts are rejected.
  The fixture uses an unchanged generic provider, no account credentials,
  no live application config, and no paid inference.
- Font readiness and initial transitions settled before capture; screenshots
  disabled animations. Visible controls were recorded with text, values,
  disabled state, bounding rectangle, font, color, background, padding and
  margin. HTTP method/path/body and original navigation clicks were recorded.

## Results

| Check | Result |
| --- | --- |
| Main content screenshots | 64/64 pixel-identical inside the original view rectangle |
| Original content controls | 64/64 identical text, values, states, coordinates and computed styles |
| Existing navigation buttons | 64/64 identical positions and text |
| Original-page HTTP calls | 64/64 identical method/path/body multisets; no added Tuzi account requests |
| Navigation behavior | 64/64 per tree: actual click from each captured page to Agents, or Agents to Providers, reached the expected visible page |
| Page script errors | 0 in both trees |
| Generic provider editor | 8/8 pixel-identical inside the editor, 8/8 identical controls/layout |
| Provider editor workflow | 8/8 per tree: click existing provider → editor opens → Escape cancels → original Agents navigation succeeds |

Full-window screenshots differ in the approved product identity and new
account navigation entry. With those two rectangles excluded, 62/64 main
screenshots are bit-identical. The two English wide Plugins screenshots have
only two extra differing pixels at `(1053,35)` and `(1051,37)`, with RGB
channels differing by one. Those pixels lie in the original upper-right
refresh icon; no content/control geometry differs. This is residual icon
animation/rasterization variation, not an observed layout or text change.

The longer approved name `tuzi-magpie` wraps into two lines within the original
wide-screen brand region. The original bird artwork and all existing navigation
positions remain unchanged; no corrective layout/style change was made.

For the wide provider-editor screenshots, the existing backdrop blur spreads
pixels from the newly added account navigation entry beyond the entry's exact
rectangle. The changed region stays behind the modal and the editor itself is
pixel-identical. Narrow provider-editor screenshots are identical outside the
approved shell regions as well. Heatmap review verified these difference
locations rather than classifying them only by changed-pixel counts.

## Evidence

All raw evidence is in
`/Users/syd08/Documents/tuzi-magpie-evidence/visual-compare/`:

- `source-manifest.json`: base/head, dirty status, complete asset hashes.
- `baseline/`, `final/`: 64 PNGs and matching DOM/request records each, plus
  browser-version/result manifests.
- `comparison.json`, `summary.json`, `request-comparison.json`, `diff/`:
  pixel/layout/navigation/request comparison and full-window heatmaps.
- `editor-baseline/`, `editor-final/`, `editor-comparison.json`,
  `editor-summary.json`, `editor-diff/`: provider editor comparison.
- `capture.cjs`, `capture-editor.cjs`, `compare.py`, `compare-editor.py`:
  exact evidence-generation scripts; scripts are evidence only, not app code.
- `baseline.log`, `final.log`, `editor-baseline.log`, `editor-final.log`:
  successful captures (64, 64, 8, 8).

The reviewer visually inspected the wide Chinese provider page/heatmap and the
wide English provider editor/heatmap, in addition to all-condition numerical
comparison. The new account page's own author screenshots are separate evidence;
this review examines root's shared-shell integration as a non-author.

## Limits and follow-up

These are deterministic synthetic empty/list states and one existing generic
provider's unchanged editor. They do not cover every expanded Settings panel,
all native OS rendering, real account/model traffic, or a complete GUI suite.
The full suite and actual isolated native desktop acceptance remain separate
root tasks.

Root reported that two update-source wording changes have explicit user
approval and were not yet integrated when these assets were frozen. Recapture
Settings under the same conditions after that commit; record those authorized
wording differences without treating this earlier snapshot as the final binary.
