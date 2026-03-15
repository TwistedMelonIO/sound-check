# Sound Check — OSC Dictionary

**Listen port:** `53538` UDP
**QLab target:** `53000` (via bridge on `3401`)

---

## Score Commands

| OSC Address | Action |
|---|---|
| `/sound-check/score/add20` | Add 20 points |
| `/sound-check/score/add50` | Add 50 points |
| `/sound-check/score/add100` | Add 100 points |
| `/sound-check/score/subtract20` | Subtract 20 points |
| `/sound-check/score/subtract50` | Subtract 50 points |
| `/sound-check/score/subtract100` | Subtract 100 points |
| `/sound-check/score/addN` | Add N points (any integer, e.g. `add75`) |
| `/sound-check/score/subtractN` | Subtract N points (any integer) |
| `/sound-check/score/add/{N}` | Add N points (path style) |
| `/sound-check/score/subtract/{N}` | Subtract N points (path style) |
| `/sound-check/score/add` + float arg | Add float arg points |
| `/sound-check/score/subtract` + float arg | Subtract float arg points |
| `/sound-check/score/set/{N}` | Set score to N |
| `/sound-check/score/set` + float arg | Set score to float arg |
| `/sound-check/score/reset` | Reset score to 0 |
| `/sound-check/score/reveal` | Trigger score reveal in QLab (`SC_SCORE`) |

---

## Round Commands

| OSC Address | Action |
|---|---|
| `/sound-check/round/next` | Advance to next round |
| `/sound-check/round/previous` | Go back one round |
| `/sound-check/round/set/{N}` | Jump to round N (0–8) |
| `/sound-check/round/set` + float arg | Jump to round by array index (float arg) |
| `/sound-check/round/{N}` | Jump to round by index — see table below |
| **Short name commands (recommended for StreamDeck/Companion)** | |
| `/sound-check/round/r0` | Jump to R0 – Opening |
| `/sound-check/round/r1` | Jump to R1 – Shout |
| `/sound-check/round/r2` | Jump to R2 – Everybody Dance Now |
| `/sound-check/round/r3` | Jump to R3 – Sing It Back |
| `/sound-check/round/mid` | Jump to Mid Show Score Reveal |
| `/sound-check/round/r4` | Jump to R4 – Let Me Entertain You |
| `/sound-check/round/r5` | Jump to R5 – Do You Remember The Time |
| `/sound-check/round/r6` | Jump to R6 |
| `/sound-check/round/final` | Jump to Final Round – One More Time |
| `/sound-check/round/end` | Jump to Final Score Reveal |
| **Full name commands** | |
| `/sound-check/round/opening` | Jump to R0 – Opening |
| `/sound-check/round/shout` | Jump to R1 – Shout |
| `/sound-check/round/everybody_dance_now` | Jump to R2 – Everybody Dance Now |
| `/sound-check/round/sing_it_back` | Jump to R3 – Sing It Back |
| `/sound-check/round/mid_score_reveal` | Jump to Mid Show Score Reveal |
| `/sound-check/round/let_me_entertain_you` | Jump to R4 – Let Me Entertain You |
| `/sound-check/round/do_you_remember` | Jump to R5 – Do You Remember The Time |
| `/sound-check/round/one_more_time` | Jump to Final Round – One More Time |
| `/sound-check/round/final_score_reveal` | Jump to Final Score Reveal |

---

## Track Commands

| OSC Address | Action |
|---|---|
| `/sound-check/track/play/{N}` | Play track N in the current round |
| `/sound-check/track/play` + float arg | Play track float arg |
| `/sound-check/track/stop` | Stop all tracks in the current round |
| `/sound-check/track/next` | Play the next track in the current round |

---

## Benchmark & Reveal

| OSC Address | Action |
|---|---|
| `/sound-check/benchmark/set/{N}` | Set benchmark to N |
| `/sound-check/benchmark/set` + float arg | Set benchmark to float arg |
| `/sound-check/benchmark/reveal` | Trigger benchmark reveal in QLab (`SC_BENCHMARK`) |

---

## Show Control

| OSC Address | Action |
|---|---|
| `/sound-check/start` | Start the show (sets isActive = true) |
| `/sound-check/stop` | Stop the show (sets isActive = false) |
| `/sound-check/reset` | Full game reset (preserves benchmark) |
| `/sound-check/pack/sync` | Re-send pack arm/disarm cues to QLab — use this after a QLab restart or reset to ensure only the active pack is armed |

---

## Automatic QLab Outcomes

These are sent **automatically by the server** — you do not trigger them manually.

| Trigger | QLab cue armed | Condition |
|---|---|---|
| Any OSC command that enters the Final round | `WIN` armed, `LOOSE` disarmed | `score >= benchmark` |
| Any OSC command that enters the Final round | `LOOSE` armed, `WIN` disarmed | `score < benchmark` |

> The server evaluates the score vs benchmark the moment `/sound-check/round/final`, `/sound-check/round/8`, or `/sound-check/round/one_more_time` is received and immediately arms the correct cue in QLab.

---

## Round Reference

| OSC Index | Pill | Display Name |
|---|---|---|
| `/sound-check/round/0` | R0 | Opening |
| `/sound-check/round/1` | R1 | Round 1 – Shout |
| `/sound-check/round/2` | R2 | Round 2 – Everybody Dance Now |
| `/sound-check/round/3` | R3 | Round 3 – Sing It Back |
| `/sound-check/round/4` | Mid | Mid Show Score Reveal |
| `/sound-check/round/5` | R4 | Round 4 – Let Me Entertain You |
| `/sound-check/round/6` | R5 | Round 5 – Do You Remember The Time |
| `/sound-check/round/7` | R6 | Round 6 |
| `/sound-check/round/8` | Final | Final Round – One More Time |
| `/sound-check/round/9` | End | Final Score Reveal |
