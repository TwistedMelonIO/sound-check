# Changelog

All notable changes to Sound Check are documented here.

---

## [1.3.0] — 2026-03-15

### Added
- **Dynamic version display** — version number from `package.json` now shown in the dashboard and settings page footers via the server API

### Changed
- **Expanded QLab cue map** — track cue numbering expanded from T1–T55 to T1–T100, pre-allocating future track slots for all rounds
- Round cue offsets updated: R1→0, R2→15, R3→30, R4→45, R5→60, R6→85 (previously R1→0, R2→8, R3→20, R4→25, R5→36, R6→45)
- Target track counts per round: R1=15, R2=15, R3=15, R4=15, R5=25, R6=15
- `/api/state` endpoint now uses shared `buildStatePayload()` for consistent responses
- OSC Dictionary updated with QLab Track Cue Map reference table
- README updated with full cue map including future slot ranges

---

## [1.2.0] — 2026-03-15

### Added
- **Setup script** (`setup.sh`) — drag-and-drop audio path configuration with terminal warnings, file validation, and automatic Docker rebuild
- **Activity log page** (`/activity.html`) — filterable, exportable log of all game actions with type filtering (score, round, track, system) and CSV export
- **Round 6** — new round slot (index 7) added between Round 5 and Final Round, expanding show to 10 segments
- **Short-name OSC commands** — `/sound-check/round/r0` through `/sound-check/round/r6`, plus `/sound-check/round/mid`, `/sound-check/round/final`, `/sound-check/round/end`
- **Pack sync OSC command** — `/sound-check/pack/sync` re-sends arm/disarm cues to QLab after a QLab restart
- **Win/Lose automation** — entering the Final Round via OSC automatically arms `WIN` or `LOOSE` cue in QLab based on score vs benchmark
- Round `shortName` property for cleaner timeline labels and OSC routing

### Changed
- Docker Compose audio volume mount now uses a placeholder path (`/PATH/TO/YOUR/QLAB/AUDIO/FOLDER`) — configured via `setup.sh`
- ROUNDS array shifted: Final Round moved from index 7 to index 8, Final Score Reveal from index 8 to index 9
- Music pack round mappings updated to match new round indices
- Round cue offsets updated (`ROUND_CUE_OFFSETS[8]` replaces former `[7]`)
- Settings page UI refactored and simplified
- OSC dictionary updated with short-name commands and pack sync

### Fixed
- Win/Lose cue arming now triggers on all round-entry paths (by index, by name, by short name)

---

## [1.1.0] — 2026-03-12

### Changed
- Score quick-buttons updated from ±1/±5/±10 to **±20/±50/±100** to better suit live show scoring pace
- Layout of score controls bar reordered: subtract buttons on the left, custom input (− value +) in the centre, add buttons on the right
- OSC dictionary updated to reflect new score values (add20/add50/add100, subtract20/subtract50/subtract100)

### Removed
- Previous/Next round navigation buttons and round name/description/duration display below the timeline rail (timeline pills remain fully clickable)
- "Reveal Benchmark", "Reveal Score", "Start Show", and "Reset Game" quick-control buttons from the main dashboard (these actions remain available via REST API and OSC)
- "Connected" status indicator from the header (connection status retained in the footer)

### Fixed
- Dashboard pack name stuck on "Loading…" — resolved cascading JS null-reference errors caused by `updateRoundPanel` and `updateShowStatus` referencing DOM elements that had been removed
- "Connecting to server…" persisting at the bottom of the page even when connected — removed stale references to removed header connection elements in `updateConnectionStatus`
- Custom score input placeholder text vertical alignment on WebKit browsers — resolved with explicit `height`, `line-height`, and spin-button suppression

### Added
- Twisted Melon logo in the footer linked to [twistedmelon.io](https://www.twistedmelon.io)

---

## [1.0.0] — Initial release

- Real-time web dashboard with Socket.IO
- 9-round show structure with clickable timeline rail
- Score hero with animated counter and benchmark bar
- Music pack system (Ultimate Singalong Classics, 80s & 90s Anthems, Floorfillers)
- QLab OSC integration via HTTP bridge container
- OSC input on port 53538 for StreamDeck / Bitfocus Companion
- REST API for all game actions
- Docker Compose multi-container deployment
- Named volume persistence for game state across restarts
- Settings page: pack selection, benchmark control, cue triggers
