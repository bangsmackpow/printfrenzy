# PrintFrenzy — YAGNI Cleanup Log

## Found (YAGNI Audit)

An audit of the codebase identified ~17 items totaling ~1,600 lines of unnecessary code:

| # | Category | Item | Lines | Reason |
|---|---|---|---|---|
| 1 | 🔴 Dead | `src/utils/backupUtils.ts` | 79 | Never imported anywhere |
| 2 | 🔴 Dead | `scripts/gen-hash.js`, `gen-light-hash.js`, `test-hash.js`, `fix-password.js` | 84 | Legacy bcrypt migration artifacts |
| 3 | 🟡 Redundant | `scripts/create-admin.js` | 35 | Duplicate of `seed-admin.mjs` |
| 4 | 🔴 Premature | `scripts/email-worker.ts` | 99 | No email infra exists |
| 5 | 🔴 Dead | `src/app/admin/reports/page.tsx` | 160 | API endpoints never existed |
| 6 | 🟡 Overkill | `src/app/api/user/theme/route.ts` | 40 | localStorage alone suffices |
| 7 | 🟡 Overbuilt | Polarized themes in `ThemeContext.tsx`, `globals.css`, `Sidebar.tsx` | ~120 | 2 extra themes no one needs |
| 8 | 🟡 Duplicate | `src/app/shipping/page.tsx` | ~300 | Same feature lives in order details |
| 9 | 🟢 Minor | `image_url2-4` schema columns | schema | Only used by manual orders, not Wix/CSV |
| 10 | 🟢 Minor | `ImageLightbox.tsx` feature richness | 89 | Gallery component for a print queue |
| 11 | 🟢 Minor | `wixUtils.ts` single-use export | 41 | Only imported in one place |

## Completed

| # | Action | Date |
|---|---|---|
| 1 | Deleted `src/utils/backupUtils.ts` | ✅ |
| 2 | Deleted `scripts/gen-hash.js`, `gen-light-hash.js`, `test-hash.js`, `fix-password.js` | ✅ |
| 3 | Deleted `scripts/create-admin.js` (kept `seed-admin.mjs`) | ✅ |
| 4 | Deleted `scripts/email-worker.ts` | ✅ |
| 5 | Deleted `src/app/admin/reports/page.tsx` | ✅ |
| 6 | Deleted `src/app/api/user/theme/route.ts` + removed fetch call from `ThemeContext.tsx` | ✅ |
| 8 | Deleted `src/app/shipping/page.tsx` + removed "Shipping Tool" nav link from `Sidebar.tsx` | ✅ |

All deletions pass `next build` cleanly.

## Remaining

To have me execute any remaining step, say the item number (e.g. "complete 7") or describe the task.

### 7 — Remove polarized themes (simplify to light/dark only)

**Files to edit:**
- `src/context/ThemeContext.tsx` — change `type Theme` to `'light' | 'dark'`, simplify `toggleTheme` cycle to just light↔dark
- `src/app/globals.css` — remove `[data-theme='polarized-dark']` and `[data-theme='polarized-light']` CSS blocks, remove `.polarized *` rule
- `src/components/Sidebar.tsx` — remove polarized icon (line 217 in current file), change display text from `theme.replace('-', ' ')` to just the theme name

### 9 — (Optional / Minor) Evaluate if `image_url2-4` columns are worth keeping in schema

Low priority. The columns exist in D1 and are used by manual orders. They're harmless overhead but inconsistent — Wix sync and CSV import ignore them.

### 10 — (Optional / Minor) Evaluate if `ImageLightbox.tsx` should be downgraded

It's fully functional and used — just overbuilt for its actual usage frequency.

### 11 — (Optional / Minor) Inline `wixUtils.ts` or keep as-is

`getPrinterQualityImage()` is only used in `orders/details/page.tsx`. Could inline it there and delete the file, but it's a legitimate separation of concern so low priority.
