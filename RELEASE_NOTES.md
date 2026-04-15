# Release 1.2.5 (2026-04-14)

## Highlights
- Added multiple blood pressure vital measurements per check-in:
  - The first vitals row keeps BP High, BP Low, Heart Rate, and Time together.
  - Additional rows can be added after the first saved BP measurement and removed with a delete button.
  - Extra vitals are persisted on the check-in record.
- Improved vitals editing:
  - Moved the check-in time from Check-in Basics into Vitals.
  - Color-coded BP and heart-rate values directly in the check-in editor.
  - Fixed the check-in editor header date formatting.
- Production polish:
  - The yellow TEST/version badge is hidden in production builds even if the test badge env flag is set.
  - Fasting now requires deliberate confirmation before starting.

## Notes
- Build validated with `npm run build`.
- Release target: Docker / Raspberry Pi production deployment.

# Release 1.2.4 (2026-04-08)

## Highlights
- Added fasting tracking across the app:
  - Check-ins now capture fasting hours.
  - Fasting flow now tracks both fasting start and first-meal times.
  - Journey achievements and the persistent header were refined around the new fasting experience.
- Fixed stale save-state issues:
  - Dashboard food edits now refresh correctly.
  - My Foods "today amount" edits now keep the latest saved state.
- Prepared the Docker/Raspberry Pi release path:
  - Production remains aligned with the Docker-based Pi deployment workflow.
  - The header keeps showing both the app version and build identifier for release verification.

## Notes
- Release target: Docker / Raspberry Pi production deployment.
- Validate with `docker compose up -d --build` for the production-like stack, or `npm run build` for the app build.

# Release 1.2.3 (2026-04-01)

## Highlights
- Improved Dashboard cards and interactions:
  - Today's Check-in weight moved to header (right-aligned) with trend arrow.
  - Removed extra "Open"/"Add steps" labels from cards.
  - Steps card now shows percentage after progress bar.
- Refined Today's Foods row layout:
  - Added dedicated Amount column before kcal.
  - Separated F/P/C labels from values and tightened alignment.
  - Set macro values to white for readability in the current theme.
  - Added serving unit under amount and removed redundant amount label.
- Milestone card polish:
  - Date and elapsed text formatting fixes.
  - Replaced broken separator encoding with ASCII separators.
- Add/Edit food flow improvements:
  - In selected food edit dialog, actions moved to top header (site icon/back + Add to Log).
  - Add-to-log amount field now auto-selects its value on open for fast overwrite.
  - In "Add to My Foods" flow, added "Today's Log" amount field (grams).
  - Saving "Add to My Foods" now logs using entered amount and returns to /add search screen.
  - Reordered form sections to place "Today's Log" before package details.

## Notes
- Build validated with `npm run build`.
- Bundle-size warning (>500 kB) remains unchanged and is non-blocking for this release.
