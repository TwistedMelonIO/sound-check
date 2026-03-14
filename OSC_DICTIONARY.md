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
| `/sound-check/round/set` + float arg | Jump to round float arg |
| `/sound-check/round/{N}` | Jump to round N directly (shorthand) |
| `/sound-check/round/opening` | Jump to Opening (round 0) |
| `/sound-check/round/shout` | Jump to Round 1 – Shout |
| `/sound-check/round/everybody_dance_now` | Jump to Round 2 – Everybody Dance Now |
| `/sound-check/round/sing_it_back` | Jump to Round 3 – Sing It Back |
| `/sound-check/round/mid_score_reveal` | Jump to Mid Show Score Reveal (round 4) |
| `/sound-check/round/let_me_entertain_you` | Jump to Round 4 – Let Me Entertain You |
| `/sound-check/round/do_you_remember` | Jump to Round 5 – Do You Remember The Time |
| `/sound-check/round/one_more_time` | Jump to Final Round – One More Time |
| `/sound-check/round/final_score_reveal` | Jump to Final Score Reveal (round 8) |

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

---

## Round Reference

| Round # | ID | Display Name |
|---|---|---|
| 0 | OPENING | Opening |
| 1 | SHOUT | Round 1 – Shout |
| 2 | EVERYBODY_DANCE_NOW | Round 2 – Everybody Dance Now |
| 3 | SING_IT_BACK | Round 3 – Sing It Back |
| 4 | MID_SCORE_REVEAL | Mid Show Score Reveal |
| 5 | LET_ME_ENTERTAIN_YOU | Round 4 – Let Me Entertain You |
| 6 | DO_YOU_REMEMBER | Round 5 – Do You Remember The Time |
| 7 | ONE_MORE_TIME | Final Round – One More Time |
| 8 | FINAL_SCORE_REVEAL | Final Score Reveal |
