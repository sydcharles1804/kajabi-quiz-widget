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

- **`quiz-widget.html`** — the live, working widget and the file that gets deployed/embedded. Inlined CSS, local `@font-face` fonts from `fonts/`, and the full quiz logic in one `<script>` block. Holds **no credentials** — it reads them from `window.QUIZ_CONFIG`, so it is safe to track.
- **`config.js`** — the only file holding live credentials, and the only one gitignored. Created by copying `config.example.js`. A fresh clone will not have it, and the widget logs a clear console error and skips submission (rather than crashing) when it's missing.
- **`config.example.js`** — tracked placeholder version of the above; the setup instructions live in its header comment.
There is deliberately **no second "template" copy of the widget**. One used to exist (`quiz-widget.template.html`) purely to provide a credential-free version back when `quiz-widget.html` was gitignored; it silently drifted a full session behind and was deleted once credentials moved to `config.js`. Don't reintroduce that pattern — `quiz-widget.html` is the single source of truth, and credentials are separated by config, not by duplicating the file.
- **`index.html`** — a bare meta-refresh redirect to `quiz-widget.html`, for a plain top-level hosting path.
- **`REQUIRED QUESTION (FIRST).md`** and **`.txt`** — identical copies of the source content spec (question bank, scoring rubric per answer, and the grade × score-tier result copy). This is the spec that `quiz-widget.html`'s `QUESTIONS` and `RESULTS` JS objects were transcribed from — if the quiz copy or scoring changes, treat this as the source of truth to update first, then sync into the widget's JS objects.
- **`fonts/`** — local `.ttf` files (BricolageGrotesque, WorkSans, IBMPlexMono) referenced by `@font-face` in `quiz-widget.html` only.
- **`.firecrawl/capturegreatness.html`** — a scraped snapshot of the "Capture Greatness" Kajabi storefront page (via the firecrawl skill), kept as reference for the site this widget is embedded into. Not part of the widget itself.
- **`kajabi-landing-page-capture.html`** and **`kajabi-thank-you-page-embed.html`** — the two Custom Code snippets that form the front door, pasted into the Kajabi landing page (`/sgd`) and the quiz page (`/scholar-score-diagnostic`) respectively. Neither is used by anything in this repo; they live in Kajabi. The embed snippet is the bridge — Kajabi's "custom thank you page" setting only accepts a Kajabi page from a dropdown (never an external URL), so contact details land there first and this forwards them into the Netlify-hosted quiz in an iframe, then listens for the widget's `quizHeight` messages to resize it. **Kajabi's redirect cannot be relied on to carry `?email=`** — see below — so the capture snippet stashes the address in `localStorage` on submit and the embed snippet falls back to it.
- **`kajabi-quiz-report-delivery.n8n-workflow.json`** — an importable n8n workflow (Webhook trigger → HTTP Request posting to Kajabi's public form-submission endpoint) implementing the "Report delivery" pipeline below. Needs no credentials or placeholders — the endpoint is unauthenticated. Not consumed by `quiz-widget.html` or anything else in this repo; it's config for the separate n8n instance.

## Widget internals (`quiz-widget.html`)

- **Identity comes from the URL, not a form.** On load, `contactEmail`/`contactName` are read via `URLSearchParams(window.location.search)` (`?email=...&name=...`). The widget never prompts for these — the quiz is gated behind a Kajabi opt-in landing page that captures email first, with "Send the contact to a custom thank you page" + "Pass submission data to the thank you page" enabled. Both settings are required; without the second, Kajabi appends nothing and no report can be delivered. Because that redirect can only target a Kajabi page, the params arrive there and are relayed into the quiz iframe by `kajabi-thank-you-page-embed.html`. Because email is expected to always be present by the time this page loads, `deliverReport()` does not special-case a missing email — it always shows the same "Check your email for your personalized next steps." notice and always attempts the Supabase insert (with `email: null` in the unexpected case it's absent, visible in the row for debugging rather than surfaced to the user).
- **Iframe resize protocol**: a `ResizeObserver` on `#widget` calls `sendHeight()`, which posts `{type: 'quizHeight', height}` to `window.parent` on every layout change. The parent Kajabi page is expected to listen for this to resize the iframe.
- **Screen state machine**: two top-level divs toggled via the `.hidden` class — `#screen-q` (questions) → `#screen-result` (brief summary + "check your email" notice). There is no separate thank-you screen or contact-form step; `showResult()` renders the summary and immediately triggers delivery itself.
- **`QUESTIONS` array** drives question rendering — each entry has `id`, `scored`, `section`, `text`, `options[]`. The grade question is flagged `isGrade: true` and is unscored; its answer sets the `grade` variable (`'7th-8th' | '9th-10th' | '11th'`) instead of contributing to `totalScore`. `q13` is the only other unscored question (final reflection, stored but not counted).
- **Scoring**: 12 scored questions × values 1–5 sum into `totalScore` (range 12–60). `getTier(score)` buckets into `low` (≤24) / `mid` (≤42) / `high` (>42).
- **`RESULTS` object**: nested `grade → tier → { label, heading, summary, emailSubject, introParas, introBullets, nextSteps, whatThisMeans, offer }` — 9 personalized variants total, transcribed from `Quiz Scoring & Next Steps.md`. This is the **single source of truth** for report content. `showResult()` shows `heading` + the full `summary` array on-screen (this is "Segment One" from the source doc — the complete immediate result, not just a one-line teaser). `buildReportText()` renders `summary` plus the Segment Two fields (`introParas`/`introBullets`, `nextSteps`, `whatThisMeans`, `offer`) into a single **HTML fragment** for the emailed report — despite the name, it has not returned plain text since the first live test showed email clients collapsing newlines into one unreadable block. It reads the module-level `totalScore` and `grade` directly, so it takes no extra arguments. The closing call-to-action picks a URL from `OFFER_URLS` by matching the offer heading; a `null` entry falls back to `SITE_URL` so a report can never link to a 404. **`scholarPrep` is currently `null` because that page doesn't exist yet — and it is the offer in 6 of the 9 variants (all of 9th–10th and 11th grade), so those reports currently send readers to the site root.** Set it as soon as the page is live.

Constraints that shaped the email markup, worth knowing before editing it:
- **Inline styles only, tables for layout.** Email clients strip `<style>` blocks and external CSS, and Outlook's Word rendering engine ignores flexbox/grid and drops padding on inline elements — hence the table-wrapped CTA button and the table-based bullet and numbered-step rows rather than `<ul>`/`<li>` with padding.
- **No media queries.** The report is a *fragment* merged into Kajabi's own email template, so there's no `<head>` to put them in. Responsiveness is therefore structural: a single column throughout, `width="100%"` with `max-width:640px`, and the logo capped at `max-width:60%` so it scales on narrow screens. Don't add breakpoint-dependent layout — it will silently fail on mobile.
- **Web-safe fonts only.** The widget's brand faces (Bricolage Grotesque, Work Sans) don't load in email, so the report uses a Helvetica/Arial stack.
- **Brand palette lives in the `BRAND` constant**, taken from `Brand Assets/CG Color Palette.png`: navy `#2A5265` (score band, offer card), teal `#18919F` (eyebrows, step numbers, accent rule), berry `#9B3157` (the CTA button — deliberately the only place that color is used), plus panel/line neutrals. The logo is loaded from `LOGO_URL`, which points at the copy already hosted on Kajabi's CDN — it must stay a public URL, since email cannot reference local files, and it needs a light backdrop because the wordmark is dark navy. Keep it in sync with `Quiz Scoring & Next Steps.md` if that copy changes — there is intentionally no duplicate copy of this content anywhere else (see Report delivery below).
- **Delivery**: `deliverReport(result)` runs automatically from `showResult()` (no button, no gate). It inserts one row into the Supabase `quiz_submissions` table — `name`, `email`, `grade`, `total_score`, `result_category`, `result_label`, `report_subject`, `report_text` (the full flattened report), `q13_answer`, full `answers` JSON — using the `@supabase/supabase-js` UMD build loaded from jsdelivr and the inline anon-key client (a modern `sb_publishable_...` key, not the legacy JWT-style anon key). RLS on that table permits `anon` to `INSERT` only — no `SELECT`, so the public key can never read back other families' submissions. That also means any test query against this table that asks for the row back (`RETURNING`, `.select()`, `Prefer: return=representation`) will fail RLS even though a plain insert succeeds — that's expected, not a bug, if you're ever debugging this table directly.

## Report delivery (downstream of this repo)

The "full report" promised by the on-screen "check your email" notice is **not** sent by this widget — none of the pipeline below lives in this repo; it's Supabase dashboard config + an n8n workflow + Kajabi config, documented here only for reference.

```
Supabase trigger on_quiz_submission_created (AFTER INSERT on quiz_submissions)
        ▼  net.http_post → https://n8n.dexiamedia.com/webhook/kajabi-quiz-report
        ▼  body: {type, table, record:{...the full row...}}
n8n: Webhook trigger node → HTTP Request node
        ▼  POST https://www.capturegreatness.org/forms/2149687265/form_submissions
        ▼  (form-urlencoded, NO authentication of any kind)
Kajabi Form submission (custom_3/4/5 = report_text/grade/result_category)
        ▼
Kajabi Automation on that Form: "when submitted → send email"
        (one static-subject transactional template, merge-tagging
        the custom field holding report_text)
```

Design decisions, so future changes don't accidentally re-open settled questions:

- **Do NOT use Kajabi's Public API (`api.kajabi.com/v1`) for this.** It requires the Pro plan (or a $25/mo add-on on Basic/Growth), which this account does not have — `app.kajabi.com/admin/settings/public_api` just redirects to general account settings. An earlier version of this pipeline was fully built against `POST /v1/forms/{id}/submit` with OAuth2 client-credentials and had to be abandoned. The "API Key / API Secret" under Settings → Account Details is for the **legacy Zapier integration only** and is rejected by `/v1/oauth/token` with `Invalid client credentials` — it is not a Public API credential.
- **Use the public form-submission endpoint instead.** Every Kajabi Form has an unauthenticated POST endpoint at `https://<site-domain>/forms/<form_id>/form_submissions`, the same one its public embed posts to. Verified working with no `authenticity_token`, no session cookie, and no auth headers — a bare `application/x-www-form-urlencoded` POST returns `302` to `/thank_you` on success. This works on any plan, since it's the same path a real visitor's browser uses.
- **Discover a form's real field names from its public embed**, don't guess: `curl https://<site-domain>/forms/<form_id>/embed.js` returns the rendered form markup with exact `name="form_submission[...]"` attributes. For form `2149687265` those are `form_submission[email]`, `form_submission[custom_3]` (Report Text), `form_submission[custom_4]` (Grade), `form_submission[custom_5]` (Tier).
- **Custom field slots are per-site IDs, not a 3-slot cap.** The Public API reference showing `custom_1`/`custom_2`/`custom_3` is illustrative only — real numbering reflects site-wide custom field IDs (hence this form starting at `custom_3`), and Kajabi allows up to 50 custom fields per site. If more fields are ever needed (e.g. restoring `report_subject` for a per-tier dynamic subject line), add them to the Form and read the new names from `embed.js`.
- **One generic Kajabi email template, not nine.** The 9 grade×tier variants of report copy live in exactly one place — `RESULTS` in `quiz-widget.html` — flattened by `buildReportText()` into the row's `report_text` column. Kajabi never re-implements the copy/branching logic; it just merge-tags in whatever text arrives. (This was an explicit choice over building 9 separate Kajabi templates + tag-triggered automations, to avoid the content drifting out of sync between two places.)
- **Form `2149687265` currently has no Name field**, so `contactName` is not passed through. Add a Name field to the Form (and a matching `form_submission[name]` parameter in the n8n node) if the email template needs to greet the parent by name.
- **Kajabi's redirect drops `?email=` in real browsers — don't trust it alone.** Diagnosed 2026-08-07 against form `2149687846` on `/sgd`. Established by testing: `/forms/<id>/thank_you` only *forwards* a query string, it never *injects* one (`thank_you?email=x` → `/scholar-score-diagnostic?email=x`, but `thank_you` bare → `/scholar-score-diagnostic` bare). Server-side the parameter is present at every hop, yet a real browser lands on the quiz page with no query string at all, so the loss happens somewhere in Kajabi's Turbolinks submit path and is not reproducible with curl. The fix is the `localStorage` fallback described above, not more Kajabi configuration — the settings were verified correct. Note also that a **template update silently replaces the form on a page with a brand-new, unconfigured form object** (the old form here was `2149185801`); if the funnel breaks after a template change, check the form ID in the page's HTML before assuming a settings problem.
- **The Supabase → n8n hop is a plain SQL trigger, not a dashboard "Database Webhook."** `public.notify_quiz_submission()` (SECURITY DEFINER, `search_path = ''`) calls `net.http_post` from the `pg_net` extension, fired by the `on_quiz_submission_created` AFTER INSERT trigger. It was created via migration `add_quiz_submission_webhook_trigger`, so it lives in Supabase's migration history rather than only in dashboard config. `pg_net` is async and fire-and-forget: a failing n8n endpoint will **not** fail or roll back the insert, so the row is always saved even if delivery breaks. To debug delivery, query `net._http_response` (most recent first) — it records the status code and body n8n returned. The n8n webhook node replies `200 {"message":"Workflow was started"}` immediately on receipt, so a 200 there confirms only that n8n *accepted* the call, not that the Kajabi submission downstream succeeded.

## Credentials note

All secrets live in **`config.js` and nowhere else**. It is the single gitignored file; everything else in the repo is safe to commit. Never paste live values into `quiz-widget.html`, `config.example.js`, or any other tracked file, and never `git add -f config.js`.

Two things worth being clear about:

- **This protects git history, not the browser.** The Supabase publishable key is served to every visitor and is readable in devtools — that is inherent to any client-side key, not a flaw in this setup. What actually constrains it is the RLS policy on `quiz_submissions` (INSERT only, no SELECT), so a leaked key can add rows but never read anyone's submissions. If the key ever needs rotating, that's a dashboard action plus a one-line edit to `config.js`.
- **Use the publishable key (`sb_publishable_…`), never the service role key.** The service role key bypasses RLS entirely and would expose every submission if it reached the browser.

**Deployment implication:** the widget is no longer a single self-contained file — it loads `./config.js` relative to itself. Wherever it's hosted, that file must sit alongside it, and it will not work if the HTML is pasted somewhere without it.

## Deploying (Netlify)

`build.js` + `netlify.toml` handle this: the build assembles `dist/` from the tracked sources and writes `dist/config.js` from the `SUPABASE_URL` and `SUPABASE_KEY` environment variables set in Netlify. Credentials therefore live in Netlify's encrypted env settings and never enter git.

- **Only `index.html`, `quiz-widget.html`, and `fonts/` are published.** `CLAUDE.md`, the report-copy source docs, the n8n workflow, and `Brand Assets/` are deliberately excluded so internal material isn't served publicly. If the widget ever needs a new asset, add it to `FILES`/`DIRS` in `build.js` or it will 404 in production.
- **The build fails loudly** when the env vars are missing, or when `SUPABASE_KEY` isn't a `sb_publishable_…` key. That's intentional: a silent success would publish a quiz that appears to work but saves nothing, and a service-role key would bypass RLS entirely.
- **`dist/` is gitignored** — it's generated output, never committed.

**GitHub Pages also serves this repo** at `sydcharles1804.github.io/kajabi-quiz-widget/`, but it has no build step, so `config.js` 404s there and submissions silently fail. Either disable Pages or ignore that URL — Netlify is the real deployment.
