The stylesheet entry point is `../style.css`. It imports these files in cascade
order so the existing layouts and responsive refinements keep their priority.

- `foundation.css`: base layout, typography, controls, and initial breakpoints.
- `analytics-and-exam-tools.css`: analytics, exam editors, and target planning.
- `layout-and-accessibility.css`: width containment, interaction, and focus rules.
- `playlists.css`: playlist library and video layouts.
- `mock-forms-and-history.css`: mock entry, history, detail viewer, and provider UI.
- `countdown.css`: featured exam, countdown grid, and exam form.
- `shared-polish.css`: shared visual refinements and countdown urgency gradients.
- `analytics-polish.css`: analytics refinements.
- `mock-form-polish.css`: mock entry refinements.
- `history-and-detail-polish.css`: history and detail viewer refinements.
- `playlist-and-settings-polish.css`: playlist and settings refinements.
- `analytics-v22.css`: subject performance, consistency, and sectional breakdown.
- `responsive.css`: final width containment and table layout refinements.
- `theme.css`: dark/light translucent surfaces, ambient background, glass effects,
  opaque floating surfaces, transparency fallbacks, and featured exam toolbar.
- `dialogs.css`: viewport bounds, scrolling, and sticky analysis heading for the
  dialogs rendered through `ModalPortal.tsx` outside blurred component panels.

- `performance.css`: lighter scrolling shadows, filter-free chart rings, and
  history pagination layout.

- `study.css`: daily task logger, focus timer, study goals, weekly bars, and the
  compact timer indicator on other pages.

- `sidebar-controls.css`: selected exam and theme controls in the sidebar footer,
  including compact rail and mobile toolbar layouts.

- `workspace-upgrades.css`: appearance editor, stable subject/semantic colors,
  and appearance density layouts.

- `settings-layout.css`: header-free navigation spacing, Settings tabs and panels,
  backup cards, diagnostics, and compact/mobile refinements.

- `metrics-layout.css`: continuous metrics layout and shared filters,
  readable charts and tables, pinned breakdown labels, and mobile layouts.

Base theme surfaces live in `theme.css`; user-selectable colors are derived in
`app/appearance.ts` and applied at the app root. Change component layouts
in their corresponding file. Preserve import order when moving rules: the
existing refinements intentionally override earlier declarations. The split
preserves the original rule order; it does not remove legacy overrides.
