# Deploying — how updates go live

There is **no single "publish" button for this project.** The files in this repo
end up in three different places, and each has its own way of going live. Pushing
to git updates the quiz only; the Kajabi pages are copy-paste and will silently
stay on the old version if you forget them.

## Where each file goes live

| File | Goes live via | Automatic? |
|---|---|---|
| `quiz-widget.html` | Netlify | ✅ on `git push` |
| `index.html` | Netlify | ✅ on `git push` |
| `fonts/` | Netlify | ✅ on `git push` |
| `kajabi-scholar-prep-landing-embed.html` | Paste into Kajabi | ❌ manual |
| `kajabi-landing-page-capture.html` | Paste into Kajabi (`/sgd`) | ❌ manual |
| `kajabi-thank-you-page-embed.html` | Paste into Kajabi (`/scholar-score-diagnostic`) | ❌ manual |
| `kajabi-quiz-report-delivery.n8n-workflow.json` | Re-import into n8n | ❌ manual |
| `kajabi-scholar-prep-landing.html` | **Nowhere** — local preview copy only | — |
| `CLAUDE.md`, `DEPLOYING.md`, spec `.md`/`.txt`, `Brand Assets/` | **Nowhere** — internal, deliberately not published | — |

---

## Path A — the quiz (Netlify, automatic)

**Site:** https://elaborate-narwhal-5be330.netlify.app
**Repo:** https://github.com/sydcharles1804/kajabi-quiz-widget (branch `main`)
**Build:** `node build.js` → publishes `dist/`

Pushing to `main` is the entire deploy. Netlify watches the repo, runs the build,
and swaps the site over when it succeeds. A build takes well under a minute.

### 1. Review what you're about to ship

```powershell
git status
git diff
```

`config.js` is gitignored and must never appear here. Neither should `dist/`.

### 2. Optional but recommended — run the build locally first

This catches a failing build before Netlify does. Copy the two values out of your
local `config.js`:

```powershell
$env:SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co'
$env:SUPABASE_KEY = 'sb_publishable_...'
node build.js
```

You want to see exactly this:

```
copied index.html
copied quiz-widget.html
copied fonts/

generated config.js from environment

build complete → dist/
```

### 3. Commit and push

Stage deliberately — `git add -A` would sweep in `Brand Assets/` and other
internal material.

```powershell
git add quiz-widget.html
git commit -m "Your message here"
git push
```

### 4. Watch the deploy

Netlify → **Deploys**. The newest row goes `Building` → `Published`. Open the log
if it fails; `build.js` prints the reason in plain English.

### 5. Verify it's actually live

```powershell
$r = Invoke-WebRequest 'https://elaborate-narwhal-5be330.netlify.app/quiz-widget.html' -UseBasicParsing
($r.Content | Select-String 'SCHOLAR Prep&trade;' -AllMatches).Matches.Count   # expect 18
(Invoke-WebRequest 'https://elaborate-narwhal-5be330.netlify.app/config.js' -UseBasicParsing).StatusCode  # expect 200
```

If `config.js` is not 200, the widget loads but saves nothing — check the Netlify
environment variables.

Then run the funnel end to end: submit the `/sgd` opt-in form with a real address,
finish the quiz, and confirm a new row lands in the Supabase `quiz_submissions`
table and the report email arrives.

### Rolling back

Netlify → **Deploys** → click an older successful deploy → **Publish deploy**.
That's instant and needs no git changes. Fix the code afterwards at your leisure.

### Netlify environment variables

Set under **Site configuration → Environment variables**. These are the only place
the credentials live:

- `SUPABASE_URL`
- `SUPABASE_KEY` — must be the `sb_publishable_…` key, never the service role key

`build.js` fails the build on purpose if either is missing or the key has the wrong
prefix. A silent success would publish a quiz that looks fine and saves nothing.

---

## Path B — the Kajabi snippets (manual paste)

Kajabi holds its own copy of these files. Editing them in this repo changes
**nothing** on the live site until you paste them across.

| Paste this file | Into this Kajabi page |
|---|---|
| `kajabi-scholar-prep-landing-embed.html` | The SCHOLAR Prep™ landing page |
| `kajabi-landing-page-capture.html` | The opt-in landing page, `/sgd` |
| `kajabi-thank-you-page-embed.html` | The quiz page, `/scholar-score-diagnostic` |

### Steps

1. Open the file and copy **all** of it, including the leading `<!-- … -->` comment.
2. In Kajabi, open the page → the **Custom Code** block → select all → paste over it.
3. **Save.**
4. **Publish.** Saving is not publishing — this is the step people miss.
5. Open the live page in a private window (or hard-refresh with `Ctrl+Shift+R`).

To copy a file to the clipboard without opening an editor:

```powershell
Get-Content .\kajabi-scholar-prep-landing-embed.html -Raw | Set-Clipboard
```

### Never paste `kajabi-scholar-prep-landing.html`

It is the **preview** copy — identical to the embed version except that it adds
`<!doctype html>`, `<html>`, `<head>` and `<body>`. Kajabi already supplies those,
so pasting it produces nested document tags. Open it in a browser to preview the
design; paste the `-embed` file into Kajabi.

(Both files open with the same header comment saying "paste this entire file."
That comment is wrong on the non-embed copy.)

### Rolling back a Kajabi page

Git is the backup. Recover any previous version and paste it back:

```powershell
git log --oneline -- kajabi-scholar-prep-landing-embed.html
git show <commit-sha>:kajabi-scholar-prep-landing-embed.html | Set-Clipboard
```

---

## Path C — the n8n workflow

Only if `kajabi-quiz-report-delivery.n8n-workflow.json` changes. Import it into
the n8n instance at `n8n.dexiamedia.com`, replacing the existing workflow, and
make sure the workflow is left **Active**. It needs no credentials — the Kajabi
form endpoint is unauthenticated.

---

## Things that will bite you

**A new asset must be registered in `build.js`.** Only `index.html`,
`quiz-widget.html` and `fonts/` are published. Anything else — a new image, a new
script — 404s in production until you add it to `FILES` or `DIRS` in `build.js`.
This is deliberate: it keeps `CLAUDE.md`, the content specs and `Brand Assets/`
off the public site.

**Report copy changes only affect future submissions.** `buildReportText()` runs
at the moment the visitor finishes the quiz, and the flattened HTML is stored in
the Supabase row's `report_text`. Kajabi just merge-tags whatever text arrived.
Rows already in the table — and emails already sent — keep the old wording
forever. There is no re-send.

**The GitHub Pages URL is broken by design.** `sydcharles1804.github.io/kajabi-quiz-widget/`
serves the repo with no build step, so `config.js` 404s and submissions fail
silently. Netlify is the real deployment. Ignore or disable that URL.

**The quiz runs inside an iframe.** After a Netlify deploy, refreshing the Kajabi
page is not always enough — hard-refresh (`Ctrl+Shift+R`), or open
`/quiz-widget.html` on the Netlify domain directly to confirm the new version.

**Never `git add -f config.js`.** The Netlify environment variables are the source
of truth for credentials. If the Supabase key is ever rotated, it changes in two
places only: the Supabase dashboard and the Netlify env var.

---

## Quick reference

```powershell
# Quiz → live
git status
git add quiz-widget.html
git commit -m "message"
git push
# then: Netlify → Deploys → wait for "Published"

# Kajabi page → live
Get-Content .\kajabi-scholar-prep-landing-embed.html -Raw | Set-Clipboard
# then: Kajabi → page → Custom Code → paste over → Save → Publish → hard-refresh
```
