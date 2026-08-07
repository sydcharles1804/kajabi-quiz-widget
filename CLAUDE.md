# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single embeddable HTML widget: a 13-question "Scholarship Readiness" quiz meant to be dropped into a Kajabi storefront page (likely via iframe, given the `postMessage` resize protocol). There is no build system, package manager, or test suite — everything is plain HTML/CSS/vanilla JS in self-contained files.

## Running / testing changes

No build/lint/test commands exist. To check a change:
- Open `quiz-widget.html` directly in a browser, or serve the directory with any static file server (e.g. `python -m http.server`) if testing the iframe `postMessage` auto-height behavior against a parent page.
- The widget expects `?email=...&name=...` on its own URL (normally supplied by the Kajabi landing page redirect — see below). When testing locally, append those params yourself, e.g. `quiz-widget.html?email=jane@example.com&name=Jane`.
- There is no automated test coverage — verify quiz flow (question → question → score → brief on-screen summary → Supabase insert) manually in-browser after any script changes.

## File architecture

- **`quiz-widget.html`** — the live, working widget. Self-contained: inlined CSS, local `@font-face` fonts loaded from `fonts/`, and the full quiz logic in one `<script>` block. Contains the **live Supabase project URL and anon key**. This is the file that actually gets deployed/embedded.
- **`quiz-widget.template.html`** — a sanitized, shareable starting-point copy of the same widget, with placeholder credentials (`YOUR_SUPABASE_URL` / `YOUR_SUPABASE_ANON_KEY`) and no local font-face rules. Not the deployed file — don't confuse the two when making content/styling changes; changes usually need to land in `quiz-widget.html`, and should generally be mirrored into the template if they're structural (not credential-related).
- **`index.html`** — a bare meta-refresh redirect to `quiz-widget.html`, for a plain top-level hosting path.
- **`REQUIRED QUESTION (FIRST).md`** and **`.txt`** — identical copies of the source content spec (question bank, scoring rubric per answer, and the grade × score-tier result copy). This is the spec that `quiz-widget.html`'s `QUESTIONS` and `RESULTS` JS objects were transcribed from — if the quiz copy or scoring changes, treat this as the source of truth to update first, then sync into the widget's JS objects.
- **`fonts/`** — local `.ttf` files (BricolageGrotesque, WorkSans, IBMPlexMono) referenced by `@font-face` in `quiz-widget.html` only.
- **`.firecrawl/capturegreatness.html`** — a scraped snapshot of the "Capture Greatness" Kajabi storefront page (via the firecrawl skill), kept as reference for the site this widget is embedded into. Not part of the widget itself.
- **`kajabi-quiz-report-delivery.n8n-workflow.json`** — an importable n8n workflow (Webhook trigger → HTTP Request to Kajabi's `POST /v1/forms/{id}/submit`) implementing the "Report delivery" pipeline below. Has two placeholders that must be filled in after import: the Kajabi Form ID in the request URL, and an n8n OAuth2 credential for Kajabi's API (client-credentials grant) — no secrets are stored in this file. Not consumed by `quiz-widget.html` or anything else in this repo; it's config for the separate n8n instance.

## Widget internals (`quiz-widget.html`)

- **Identity comes from the URL, not a form.** On load, `contactEmail`/`contactName` are read via `URLSearchParams(window.location.search)` (`?email=...&name=...`). The widget never prompts for these — the quiz is gated behind a Kajabi opt-in landing page that captures email first, with "Send the contact to a custom thank you page" + "Pass submission data to the thank you page" enabled, redirecting here with those params already attached (Kajabi's own documented autofill mechanism). Because email is expected to always be present by the time this page loads, `deliverReport()` does not special-case a missing email — it always shows the same "Check your email for your personalized next steps." notice and always attempts the Supabase insert (with `email: null` in the unexpected case it's absent, visible in the row for debugging rather than surfaced to the user).
- **Iframe resize protocol**: a `ResizeObserver` on `#widget` calls `sendHeight()`, which posts `{type: 'quizHeight', height}` to `window.parent` on every layout change. The parent Kajabi page is expected to listen for this to resize the iframe.
- **Screen state machine**: two top-level divs toggled via the `.hidden` class — `#screen-q` (questions) → `#screen-result` (brief summary + "check your email" notice). There is no separate thank-you screen or contact-form step; `showResult()` renders the summary and immediately triggers delivery itself.
- **`QUESTIONS` array** drives question rendering — each entry has `id`, `scored`, `section`, `text`, `options[]`. The grade question is flagged `isGrade: true` and is unscored; its answer sets the `grade` variable (`'7th-8th' | '9th-10th' | '11th'`) instead of contributing to `totalScore`. `q13` is the only other unscored question (final reflection, stored but not counted).
- **Scoring**: 12 scored questions × values 1–5 sum into `totalScore` (range 12–60). `getTier(score)` buckets into `low` (≤24) / `mid` (≤42) / `high` (>42).
- **`RESULTS` object**: nested `grade → tier → { label, heading, summary, emailSubject, introParas, introBullets, nextSteps, whatThisMeans, offer }` — 9 personalized variants total, transcribed from `Quiz Scoring & Next Steps.md`. This is the **single source of truth** for report content. `showResult()` shows `heading` + the full `summary` array on-screen (this is "Segment One" from the source doc — the complete immediate result, not just a one-line teaser). `buildReportText()` flattens `summary` plus the Segment Two fields (`introParas`/`introBullets`, `nextSteps`, `whatThisMeans`, `offer`) into one plain-text block, `---`-separated by section, for the emailed report. Keep it in sync with `Quiz Scoring & Next Steps.md` if that copy changes — there is intentionally no duplicate copy of this content anywhere else (see Report delivery below).
- **Delivery**: `deliverReport(result)` runs automatically from `showResult()` (no button, no gate). It inserts one row into the Supabase `quiz_submissions` table — `name`, `email`, `grade`, `total_score`, `result_category`, `result_label`, `report_subject`, `report_text` (the full flattened report), `q13_answer`, full `answers` JSON — using the `@supabase/supabase-js` UMD build loaded from jsdelivr and the inline anon-key client (a modern `sb_publishable_...` key, not the legacy JWT-style anon key). RLS on that table permits `anon` to `INSERT` only — no `SELECT`, so the public key can never read back other families' submissions. That also means any test query against this table that asks for the row back (`RETURNING`, `.select()`, `Prefer: return=representation`) will fail RLS even though a plain insert succeeds — that's expected, not a bug, if you're ever debugging this table directly.

## Report delivery (downstream of this repo)

The "full report" promised by the on-screen "check your email" notice is **not** sent by this widget — none of the pipeline below lives in this repo; it's Supabase dashboard config + an n8n workflow + Kajabi config, documented here only for reference.

```
Supabase Database Webhook (on INSERT into quiz_submissions)
        ▼
n8n: Webhook trigger node → HTTP Request node
        ▼  POST https://api.kajabi.com/v1/forms/{form_id}/submit
        ▼  (OAuth2 client-credentials auth — see below)
Kajabi Form submission (custom_1/2/3 = report_text/grade/result_category)
        ▼
Kajabi Automation on that Form: "when submitted → send email"
        (one static-subject transactional template, merge-tagging
        the custom field holding report_text)
```

Design decisions, so future changes don't accidentally re-open settled questions:
- **One generic Kajabi email template, not nine.** The 9 grade×tier variants of report copy live in exactly one place — `RESULTS` in `quiz-widget.html` — flattened by `buildReportText()` into the row's `report_text` column. Kajabi never re-implements the copy/branching logic; it just merge-tags in whatever text arrives. (This was an explicit choice over building 9 separate Kajabi templates + tag-triggered automations, to avoid the content drifting out of sync between two places.)
- **Kajabi's Public API requires real OAuth2**, not just an API key in the header: `POST https://api.kajabi.com/v1/oauth/token` with `client_id`/`client_secret`/`grant_type=client_credentials` (credentials from Kajabi Settings → Account Details → API Key/Secret). In n8n this is an OAuth2 credential on the HTTP Request node, not a plain header.
- **Kajabi form submissions only carry 3 generic custom field slots** (`custom_1`/`custom_2`/`custom_3`) via the API, regardless of how many custom fields the Form has. `report_subject` was deliberately dropped from this pipeline for that reason — the email template uses one static subject line instead of a per-tier dynamic one. The 3 slots carry `report_text`, `grade`, `result_category`, in the order the custom fields were added to the Kajabi Form — **this mapping needs a live test submission to confirm**; if `custom_1` doesn't land as `report_text`, fix the mapping in the n8n HTTP Request body, not by reordering the Kajabi Form fields.

## Credentials note

`quiz-widget.html` embeds a live Supabase URL and anon key and is **not tracked by git** — it's excluded via `.gitignore` and has never been committed (only `quiz-widget.template.html`, with placeholder credentials, is in history). Keep it that way: never `git add -f` it, and don't paste the live key into `quiz-widget.template.html` or any other tracked file.
