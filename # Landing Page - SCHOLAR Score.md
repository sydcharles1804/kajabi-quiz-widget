# Landing Page - SCHOLAR Score

Source copy for `kajabi-scholar-score-landing.html` (and its `-embed` twin).
Edit this first, then sync into the HTML.

---

**HERO** *(split layout — copy and the opt-in form on the left, a single student's portrait on the right. The form is above the fold; the quiz is free, so there is nothing to sell before the ask.)*

Eyebrow: FREE · 13 QUESTIONS · GRADES 7–11

## Your child gets good grades.

# But are they truly scholarship-ready?

The students competing for serious scholarship money have good grades, too.

**First Name** — **Email Address**

#### Button: Find my child's SCHOLAR Score™

Your information is safe with us. We won't send spam, and you can unsubscribe at any time.

*Photo caption panel:* **What the quiz measures** — Seven qualities scholarship committees actually weigh, scored against your child's current grade.

---

**01 — BEYOND THE GPA**

## Good grades are only the starting point

Your child may be doing well in school, participating in activities, and checking all the boxes.

But scholarship committees are looking **beyond the GPA**.

*Right column — WHAT THEY ARE ACTUALLY ASKING:*

01. Does this student take initiative?
02. Have they made a meaningful contribution?
03. Can they demonstrate leadership?
04. Have they built relationships with people who can speak to their potential?
05. Is there a clear story connecting who they are, what they have done, and where they are going?

*Rule-topped aside:* The SCHOLAR Score™ shows you how your child measures up — before senior-year deadlines make every decision feel urgent.

---

**02 — THE SEVEN QUALITIES**

## Discover what your child's résumé cannot tell you

The SCHOLAR Score™ evaluates the seven qualities within the Capture Greatness® SCHOLAR Framework.

- **S** — Studious
- **C** — Community-Minded
- **H** — Holistically Developed
- **O** — Organized
- **L** — Leader
- **A** — And *(willing to take initiative and go beyond what is required)*
- **R** — Relationship Builder

---

**03 — WHAT COMES BACK**

## When you complete the quiz, you get a personalized result

| | |
|---|---|
| **Strengths** | Where your child is already showing scholarship potential. |
| **Gaps** | Which areas need greater attention. |
| **Next step** | What you should focus on next, based on your child's current grade and readiness. |

**The first win is not the scholarship check. It's finally knowing exactly what to do.**

---

**04 — TIMING IS THE ADVANTAGE**

## Don't wait until senior year to discover what is missing

Scholarship readiness is not built by submitting hundreds of applications at the last minute.

It develops through the choices your child makes, the experiences they pursue, the relationships they build, and the evidence they create over time.

*Rule-marked note:* The earlier you can see your child's strengths and gaps, the more time you have to help them become a stronger candidate — without piling on random activities or turning childhood into a résumé-building exercise.

---

**05 — FROM MELISSA**

## Created by a scholarship strategist with more than a decade of results

Hi, I'm **Melissa** — mom, educator, author of *Scholars Get Dollars*, and founder of Capture Greatness!®

I have helped students earn more than **$12 million in scholarships**, including four Gates Millennium Scholarships, and gain admission to universities including Yale, UPenn, Cornell, Howard, and Morehouse.

Through that work, I learned that scholarship success is rarely about finding one magical list. It begins with understanding what makes a student competitive — and intentionally developing the qualities that give colleges and scholarship organizations a reason to invest.

That is why I created the SCHOLAR Score™.

*— Melissa A. Rowe, M.Ed.*

*Overlapping stat plate:* **$12M+** — in scholarships won by our students

---

**06 — START HERE**

# Find out how scholarship-ready your child really is

You do not need to guess. And you do not need to wait until senior year to discover that good grades were never the whole strategy.

Enter your information to take the free SCHOLAR Score™ Quiz and discover where your child stands today.

Badge: FOR MOMS OF STUDENTS IN GRADES 7–11

**First Name** — **Email Address**

#### Button: Show me my child's SCHOLAR Score™

Your information is safe with us. We won't send spam, and you can unsubscribe at any time.

---

**FOOTER FINE PRINT**

SCHOLAR Score™ and SCHOLAR Prep™ are trademarks of Capture Greatness®. Results vary; no scholarship award is guaranteed.

---

## How this differs from the SCHOLAR Prep page

Both pages share the full brand system now — palette tokens, logo, nav, footer,
PT Serif + Quattrocento Sans, the film-grain overlay, and the same component
vocabulary (tinted parallax bands, a pull-quote `.statement`, the `.credibility`
strip, a `.callout` box, `.form-card`). This page went through three passes before
landing here: an asymmetric editorial layout with text/images bled off the
container edge, then an overcorrection into a fully centred narrow column, and
finally this one — which borrows Prep's actual visual system (full-bleed parallax
hero, alternating solid/tinted bands, balanced two-column grids) while keeping its
own section order and its own signature elements (the SCHOLAR acrostic, the
numbered "what they're asking" index, the editorial key/value result rows):

| | SCHOLAR Prep | SCHOLAR Score |
|---|---|---|
| Hero | Centred, full-bleed photo, CTA scrolls to a form far below | Centred, full-bleed photo, **opt-in form-card floats directly on the image** |
| Colour rhythm | Six alternating full-bleed colour bands | Eight sections, **four solid (white/cream/navy) and four parallax-tinted**, alternating |
| Two-column layouts | `.grid--60-40` / `.grid--65-35` (text-heavy) | Closer to even ratios (`1.05fr/1fr`, `.95fr/1.05fr`) — text and image/list columns read as peers |
| List treatment | Rounded navy `.matters-block` cards, green tick icons | Numbered hairline-ruled index (scorecard) + label/value hairline rows (result) |
| Signature moment | Big stat numerals + `.bezel-grid` cards | **SCHOLAR spelled across the screen** as a 7-cell acrostic over a parallax photo |
| Founder block | Text left / photo right, solid navy-deep, watermark type | Portrait left / text right, solid navy-deep, **same watermark-type treatment** |
| Closing CTA | Solid teal band, text left / form-card right | **Parallax band**, text left / form-card right (same grid mechanics, different ground) |
| Navigation aid | None | None (a fixed section-index rail existed in an earlier draft; removed on request) |

## Notes on the copy

- The original draft wrote the hero product name as "**SCHOLAR**™ **Score Quiz**", splitting the
  trademark across the term. Per the naming convention in `CLAUDE.md` the mark always follows the
  complete term, so the page renders **SCHOLAR Score™ Quiz**.
- **SCHOLAR Framework** and the seven quality names carry no trademark — only `SCHOLAR Score™`,
  `SCHOLAR Prep™` and `SCHOLAR Profile™` do.
- Headings are set in sentence case rather than Title Case; the Prep page's Title Case headings
  were the other strong visual tell shared between the two pages.
- Only **And** carries a descriptive line in the acrostic, because it is the only one the copy
  gives one for. Nothing was invented to even out the column.
- "founder of Capture Greatness!®" keeps the exclamation mark — it is part of the logo wordmark.
- The form posts to Kajabi form **2149687846 ("Quiz Access Form")**, the same form `/sgd` uses, so
  the existing thank-you-page redirect into the quiz keeps working unchanged.
