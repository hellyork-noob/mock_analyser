# Advance Analyzer v2.1 — source refinement

Includes the uploaded index.html, existing application components, PWA configuration, a React error boundary, and reduced-motion styling. Removed unused `db backup.ts` duplicate.

## Windows commands

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

The full dependency install and production build could not be completed in the preparation environment. Treat this as a review candidate.

## Fresh test data

For an empty workspace, use a separate browser profile or clear site data on your **local test origin only** (DevTools > Application > Storage). Clearing storage deletes that origin's existing records. Do not clear the live GitHub Pages site's data unless intended.

## Test checklist

Create exam with qualifying sections; set independent targets; add full and sectional mocks; test provider filters, mock details, score/time calculations, percentile, history editing, countdown, playlist, JSON backup/restore, both themes and offline PWA.
