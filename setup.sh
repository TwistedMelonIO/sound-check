#!/bin/bash
# ============================================================================
# Sound Check — Audio Path Setup Script
# © Twisted Melon. All rights reserved.
# ============================================================================
# This script configures the path to your QLab audio files.
# It updates docker-compose.yml so the container can access your audio folder.
# ============================================================================

set -e

COMPOSE_FILE="$(cd "$(dirname "$0")" && pwd)/docker-compose.yml"

# ── Colours ──────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No colour

clear
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║${BOLD}           SOUND CHECK — Audio Path Setup${NC}${CYAN}                     ║${NC}"
echo -e "${CYAN}║                      by Twisted Melon                        ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Warning ──────────────────────────────────────────────
echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║${NC}  ${YELLOW}${BOLD}⚠  WARNING${NC}                                                  ${RED}║${NC}"
echo -e "${RED}║${NC}                                                              ${RED}║${NC}"
echo -e "${RED}║${NC}  Changing the audio file path after setup will cause the      ${RED}║${NC}"
echo -e "${RED}║${NC}  show to ${BOLD}STOP WORKING${NC}. QLab cues will fail to find their      ${RED}║${NC}"
echo -e "${RED}║${NC}  audio files and no music will play during the show.          ${RED}║${NC}"
echo -e "${RED}║${NC}                                                              ${RED}║${NC}"
echo -e "${RED}║${NC}  Only run this script:                                        ${RED}║${NC}"
echo -e "${RED}║${NC}    • During initial setup on a new machine                    ${RED}║${NC}"
echo -e "${RED}║${NC}    • If you have intentionally moved your audio files         ${RED}║${NC}"
echo -e "${RED}║${NC}                                                              ${RED}║${NC}"
echo -e "${RED}║${NC}  ${BOLD}DO NOT${NC} run this during a live show or rehearsal.             ${RED}║${NC}"
echo -e "${RED}║${NC}                                                              ${RED}║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Check docker-compose.yml exists ─────────────────────
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}ERROR:${NC} docker-compose.yml not found at:"
    echo "  $COMPOSE_FILE"
    echo ""
    echo "Make sure you run this script from the sound-check project directory."
    exit 1
fi

# ── Show current path (if set) ───────────────────────────
CURRENT_PATH=$(grep -A1 "# Host QLab audio folder" "$COMPOSE_FILE" | tail -1 | sed 's/.*- //' | sed 's/:\/app\/qlab-audio.*//')
if [ -n "$CURRENT_PATH" ] && [ "$CURRENT_PATH" != "/PATH/TO/YOUR/QLAB/AUDIO/FOLDER" ]; then
    echo -e "${CYAN}Current audio path:${NC}"
    echo -e "  ${BOLD}$CURRENT_PATH${NC}"
    echo ""
fi

# ── Prompt for path ──────────────────────────────────────
echo -e "${GREEN}${BOLD}Drag and drop your QLab audio folder into this terminal window,${NC}"
echo -e "${GREEN}${BOLD}then press Enter:${NC}"
echo ""
echo -e "  (This is the folder containing your Sound Check .mp3 files)"
echo ""
read -r -p "  Audio folder path: " RAW_PATH

# ── Clean the path ───────────────────────────────────────
# Remove surrounding quotes (single or double) that macOS Finder adds
AUDIO_PATH=$(echo "$RAW_PATH" | sed "s/^['\"]//;s/['\"]$//" | sed 's/[[:space:]]*$//' | sed 's/\\ / /g')

# ── Validate ─────────────────────────────────────────────
if [ -z "$AUDIO_PATH" ]; then
    echo ""
    echo -e "${RED}ERROR:${NC} No path provided. Exiting."
    exit 1
fi

if [ ! -d "$AUDIO_PATH" ]; then
    echo ""
    echo -e "${RED}ERROR:${NC} Directory not found:"
    echo "  $AUDIO_PATH"
    echo ""
    echo "Make sure the folder exists and try again."
    exit 1
fi

# ── Count audio files ────────────────────────────────────
MP3_COUNT=$(find "$AUDIO_PATH" -maxdepth 1 -name "*.mp3" 2>/dev/null | wc -l | tr -d ' ')
WAV_COUNT=$(find "$AUDIO_PATH" -maxdepth 1 -name "*.wav" 2>/dev/null | wc -l | tr -d ' ')
TOTAL_AUDIO=$((MP3_COUNT + WAV_COUNT))

echo ""
if [ "$TOTAL_AUDIO" -eq 0 ]; then
    echo -e "${YELLOW}⚠  No .mp3 or .wav files found in that folder.${NC}"
    echo "   Make sure your Sound Check audio files are in this directory."
    echo ""
    read -r -p "   Continue anyway? (y/N): " CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "Exiting."
        exit 0
    fi
else
    echo -e "${GREEN}Found ${BOLD}$TOTAL_AUDIO${NC}${GREEN} audio files ($MP3_COUNT mp3, $WAV_COUNT wav)${NC}"
fi

# ── Escape path for sed ──────────────────────────────────
# The path may contain spaces, slashes, etc. Use | as sed delimiter.
ESCAPED_PATH=$(printf '%s' "$AUDIO_PATH" | sed 's/[&/\]/\\&/g')

# ── Update docker-compose.yml ────────────────────────────
echo ""
echo -e "${CYAN}Updating docker-compose.yml...${NC}"

# Use Python for reliable YAML-safe replacement (handles spaces and special chars)
python3 -c "
import re, sys

compose_path = '$COMPOSE_FILE'
new_audio_path = '''$AUDIO_PATH'''

with open(compose_path, 'r') as f:
    content = f.read()

# Match the volume line that maps to /app/qlab-audio
pattern = r'(- ).+(:\/app\/qlab-audio:ro)'
replacement = r'\g<1>' + new_audio_path + r'\g<2>'
new_content = re.sub(pattern, replacement, content)

if new_content == content:
    print('WARNING: Could not find the audio volume mount line in docker-compose.yml')
    print('You may need to update it manually.')
    sys.exit(1)

with open(compose_path, 'w') as f:
    f.write(new_content)
"

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to update docker-compose.yml${NC}"
    exit 1
fi

echo -e "${GREEN}✓ docker-compose.yml updated${NC}"

# ── Rebuild containers ───────────────────────────────────
echo ""
echo -e "${CYAN}Rebuilding Docker containers...${NC}"
echo ""

cd "$(dirname "$COMPOSE_FILE")"
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ${BOLD}✓  Setup complete!${NC}                                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Audio path: ${BOLD}$(echo "$AUDIO_PATH" | head -c 42)${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Dashboard:  ${BOLD}http://localhost:3400${NC}                             ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Settings:   ${BOLD}http://localhost:3400/settings.html${NC}               ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Remember: Do not change the audio folder location after setup.${NC}"
echo -e "${YELLOW}If you move your files, re-run this script to update the path.${NC}"
echo ""
