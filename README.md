# Sound Check

**Live music gameshow scoring system with QLab OSC integration**

**Latest Version:** v1.3.0 — Expanded QLab cue map (T1–T100) with future track slots for all rounds.

Built by [Twisted Melon](https://www.twistedmelon.io) for use in live entertainment events. Sound Check runs as a Docker container, serving a real-time web dashboard that lets operators track scores, progress through rounds, and trigger QLab audio cues — all from any device on the local network.

---

## Overview

Sound Check is a two-container Docker application:

| Container | Role |
|---|---|
| `sound-check` | Node.js/Express server — hosts the web dashboard, handles OSC input, manages game state |
| `sound-check-bridge` | Lightweight HTTP→OSC bridge — forwards cue triggers from the server to QLab on the host machine |

Game state (score, round, benchmark, activity log) is persisted to a named Docker volume so it survives container restarts.

---

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Mac or Windows)
- QLab (running on the same machine as Docker, listening on port 53000)
- Bitfocus Companion or StreamDeck (optional — for OSC control)

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/twistedmelon/sound-check.git
cd sound-check
```

### 2. Run the setup script

The setup script configures the path to your QLab audio files and starts the containers:

```bash
./setup.sh
```

When prompted, **drag and drop your audio folder** from Finder into the terminal window and press Enter. The script will:
- Validate the folder exists and count your audio files
- Update `docker-compose.yml` with the correct path
- Build and start the Docker containers

> **Warning:** Changing the audio file path after initial setup will cause the show to stop working. QLab cues will fail to find their audio files and no music will play. Only re-run the setup script if you have intentionally moved your audio files.

### 3. (Optional) Change the admin password

In `docker-compose.yml`, update:

```yaml
environment:
  - ADMIN_PASSWORD=8888
```

Then rebuild: `docker compose up -d --build`

### 4. (Alternative) Manual setup

If you prefer not to use the setup script, edit `docker-compose.yml` directly:

```yaml
volumes:
  - /YOUR/LOCAL/PATH/TO/audio:/app/qlab-audio:ro
```

Then build and start:

```bash
docker compose build --no-cache
docker compose up -d
```

### 5. Open the dashboard

Navigate to **http://localhost:3400** in any browser on the same machine.

To access from another device on the same network, replace `localhost` with the host machine's IP address:
```
http://192.168.x.x:3400
```

---

## Updating to a New Version

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

Game state is stored in the named volume `sound-check-data` and is **not affected** by rebuilds.

---

## Ports

| Port | Protocol | Purpose |
|---|---|---|
| `3400` | TCP | Web dashboard (mapped from internal 3000) |
| `53538` | UDP/TCP | OSC input — receives from StreamDeck / Bitfocus Companion |
| `3401` | TCP | Bridge — internal HTTP→OSC relay to QLab (not exposed externally) |

---

## Show Structure

Sound Check is built around 9 fixed rounds:

| # | ID | Display Name | Duration |
|---|---|---|---|
| 0 | OPENING | Opening | 3–4 min |
| 1 | SHOUT | Round 1 – Shout | 6 min |
| 2 | EVERYBODY_DANCE_NOW | Round 2 – Everybody Dance Now | 6–7 min |
| 3 | SING_IT_BACK | Round 3 – Sing It Back | 7 min |
| 4 | MID_SCORE_REVEAL | Mid Show Score Reveal | 2–3 min |
| 5 | LET_ME_ENTERTAIN_YOU | Round 4 – Let Me Entertain You | 7 min |
| 6 | DO_YOU_REMEMBER | Round 5 – Do You Remember The Time | 5–6 min |
| 7 | ONE_MORE_TIME | Final Round – One More Time | 7–8 min |
| 8 | FINAL_SCORE_REVEAL | Final Score Reveal | 3–4 min |

---

## QLab Track Cue Map

Each playable round has a reserved block of QLab cue numbers. Existing tracks are populated; future slots are pre-allocated for expansion.

| Round | QLab Cues | Slots | Existing Tracks | Future Slots |
|---|---|---|---|---|
| R1 – Shout | T1–T15 | 15 | 8 | T9–T15 |
| R2 – Everybody Dance Now | T16–T30 | 15 | 12 | T28–T30 |
| R3 – Sing It Back | T31–T45 | 15 | 5 | T36–T45 |
| R4 – Let Me Entertain You | T46–T60 | 15 | 11 | T57–T60 |
| R5 – Do You Remember | T61–T85 | 25 | 9 | T70–T85 |
| R6 – Final (One More Time) | T86–T100 | 15 | 10 | T96–T100 |

**Total: 100 cue slots** (55 existing tracks + 45 future slots)

---

## Music Packs

Music packs are defined in `src/server.js` and map audio file names to QLab cue names per round. The active pack is selected in the **Settings** page (`/settings.html`).

### Built-in packs

| Pack ID | Name |
|---|---|
| `ultimate-singalong` | Ultimate Singalong Classics |
| `80s-90s-anthems` | 80s & 90s Anthems |
| `floorfillers` | Floorfillers |

### Audio file naming convention

Files are expected to live in your mapped audio folder. The naming pattern used by the built-in packs:

```
SC_<PACK>_<ROUND>_<TRACK>.mp3

Examples:
  SC_USC_opening.mp3
  SC_USC_R1_T1.mp3
  SC_80s_R3_T2.mp3
  SC_FF_R5_T4.mp3
```

---

## Dashboard

The web dashboard (`http://localhost:3400`) provides:

- **Timeline rail** — visual progress through all 9 rounds; click any pill to jump to that round
- **Score hero** — large animated room score display
- **Benchmark bar** — progress bar showing how close the room is to the benchmark target
- **Score controls** — quick buttons (±20, ±50, ±100) plus a custom value input
- **Show status** — Live / Standby indicator in the header

### Settings page (`/settings.html`)

- Select active music pack
- Set benchmark score
- Trigger QLab audio cues per round/track
- View OSC control dictionary

---

## OSC Control (StreamDeck / Bitfocus Companion)

The server listens for OSC messages on UDP port `53538`.

See **[OSC_DICTIONARY.md](OSC_DICTIONARY.md)** for the full command reference, including score, round, track, benchmark, and show control commands.

---

## REST API

The server also exposes a REST API for integration or manual control:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/state` | Full game state JSON |
| `POST` | `/api/start` | Start the show |
| `POST` | `/api/stop` | Stop the show |
| `POST` | `/api/score/add/:points` | Add points |
| `POST` | `/api/score/subtract/:points` | Subtract points |
| `POST` | `/api/round/next` | Next round |
| `POST` | `/api/round/previous` | Previous round |
| `POST` | `/api/round/set/:n` | Set round |
| `POST` | `/api/benchmark/reveal` | Reveal benchmark |
| `POST` | `/api/score/reveal` | Reveal score |
| `POST` | `/api/reset` | Reset game |
| `GET` | `/health` | Health check |

---

## Configuration

All configuration is via environment variables in `docker-compose.yml`:

| Variable | Default | Description |
|---|---|---|
| `WEB_PORT` | `3000` | Internal web server port |
| `OSC_LISTEN_PORT` | `53538` | OSC UDP listen port |
| `BRIDGE_URL` | `http://sound-check-bridge:3401` | URL of the OSC bridge container |
| `TRACK_BASE_PATH` | `/app/qlab-audio` | Path to audio files inside the container |
| `ADMIN_PASSWORD` | `8888` | Password for sensitive admin operations |

---

## Troubleshooting

**Dashboard shows "Disconnected from server"**
- Confirm the container is running: `docker compose ps`
- Check logs: `docker compose logs sound-check`

**QLab cues aren't firing**
- Confirm QLab is running and OSC is enabled (port 53000)
- Check bridge logs: `docker compose logs sound-check-bridge`
- Verify `host.docker.internal` resolves correctly on your machine

**Pack name shows "Loading…" on the dashboard**
- Hard-refresh the browser (Cmd+Shift+R / Ctrl+Shift+R)
- Confirm the server started cleanly: `docker compose logs sound-check`

**Audio files not found**
- Check the volume mount path in `docker-compose.yml` matches your local folder
- File names must match exactly (case-sensitive)

---

## Project Structure

```
sound-check/
├── src/
│   └── server.js          # Main server — Express, Socket.IO, OSC, game logic
├── bridge/
│   ├── Dockerfile
│   └── server.js          # HTTP→OSC bridge for QLab
├── public/
│   ├── index.html         # Main dashboard
│   ├── settings.html      # Settings page
│   ├── activity.html      # Activity log viewer
│   ├── app.js             # Dashboard client JS
│   ├── settings.js        # Settings client JS
│   ├── activity.js        # Activity log client JS
│   └── styles.css         # Shared styles
├── data/                  # Persistent game state (gitignored)
├── setup.sh               # Audio path setup script (run on first install)
├── Dockerfile             # Main container build
├── docker-compose.yml     # Orchestration
├── OSC_DICTIONARY.md      # Full OSC command reference
├── CHANGELOG.md           # Version history
└── package.json
```

---

## License

© Twisted Melon. All rights reserved.
