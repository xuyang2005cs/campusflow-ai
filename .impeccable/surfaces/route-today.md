---
version: 1
slug: "route-today"
primary_target: "route:/today"
related_targets: ["route:/inbox","route:/review/:id","route:/tasks","route:/completed","route:/settings"]
---

# CampusFlow application surfaces

Mode: Operate. Primary targets: `/today`, `/inbox`, `/review/:id`, `/tasks`, `/completed`, `/settings`.

## Direction contract

**THESIS** — A modern campus daybook that turns scattered notices into a readable action order. It refuses the admin-dashboard grid and the chat-assistant transcript; the task list and its time semantics are the product.

**OWN-WORLD** — Cool white and mist-green surfaces, deep ink, teal navigation and orange action emphasis. Native Chinese UI typography, thin dividers, compact course labels, 14px task radii and no decorative shadows. Inbox and Review introduce structured source blocks without changing the core world.

**STORY** — A student opens Today, understands the urgent item and daily load, completes work, then enters Inbox to paste a notice or upload a screenshot. OCR and AI reveal their progress; Review makes every candidate editable before selected items become tasks.

**FIRST VIEWPORT** — At 390 × 844, Today opens with brand and date, a horizontal seven-day strip, one sentence of workload and a single completion bar. The urgent task leads, followed by Today and Meeting sections. Bottom navigation remains visible above the safe area; no element competes with the next action.

**FORM** — Grounded direction 1, “modern campus daybook,” selected by the user after Impeccable seed `b136e031`. Inbox / Review inherit the user-approved “notice sorting desk” secondary grammar through source, extraction and confirmation blocks.

**FINISH** — unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
