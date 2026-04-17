# Morning Brief Editorial Readability Design

**Date:** 2026-04-16
**Status:** User-approved direction
**Scope:** Improve readability of Morning Brief analysis content for Vietnamese text while keeping the overall dashboard visual identity.

---

## Problem

The Morning Brief content is hard to read because the current typography treats long-form Vietnamese analysis like a poster headline:

- summary text uses uppercase
- text weight is too heavy (`font-black`)
- letter spacing is too tight for Vietnamese diacritics
- body-sized analytical copy is too small and visually dense
- takeaway labels use mono styling that suits metadata more than reading

This creates poor scanning, poor rhythm, and worse legibility for accented Vietnamese text.

---

## Goal

Make Morning Brief feel like an editorial briefing:

- easy to read at a glance
- comfortable for multi-line Vietnamese text
- still premium and dashboard-like
- stronger hierarchy between title, label, summary, and takeaway body copy

---

## Chosen Approach

Use **editorial typography for content** and keep **stronger styling only for title and compact labels**.

### Summary text
At `src/app/dashboard/page.tsx`:
- remove `uppercase`
- change `font-black` to `font-medium`
- remove `tracking-tight`
- increase size from `text-[16px]` to `text-lg`
- keep relaxed line height
- slightly increase opacity for clearer reading contrast

### Takeaway body text
At `src/app/dashboard/page.tsx`:
- remove `uppercase`
- change `font-black` to `font-medium`
- remove `tracking-tight`
- keep `leading-relaxed`
- increase contrast slightly

### Asset label
At `src/app/dashboard/page.tsx`:
- remove `font-mono`
- keep label treatment compact and premium
- use `font-semibold`
- reduce tracking from very wide to light uppercase label spacing
- keep accent color

### Section title and date
- keep section title strong and recognizable
- keep date compact and metadata-like
- no major structural changes

---

## Why this approach

This preserves the visual identity of the dashboard without forcing long Vietnamese content into display typography. The content becomes readable first, while headers and small metadata still carry the sharper brand tone.

---

## Files

- `src/app/dashboard/page.tsx` — Morning Brief summary and takeaway typography

---

## Testing

Verify directly in the UI that:
- summary paragraph is easier to read in Vietnamese
- words with diacritics no longer feel cramped or visually uneven
- takeaways scan cleanly on both desktop and mobile
- Morning Brief still feels visually premium inside the dashboard card

---

## Out of scope

- changing site-wide typography
- changing global font family
- redesigning Morning Brief layout structure
- modifying API payloads or Morning Brief data generation
