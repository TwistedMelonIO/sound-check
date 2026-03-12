# Changelog

All notable changes to Sound Check are documented here.

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
