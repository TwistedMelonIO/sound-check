const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const osc = require("osc");
const dgram = require("dgram");
const path = require("path");
const fs = require("fs");

// =============================================================================
// Configuration
// =============================================================================
const CONFIG = {
  WEB_PORT: parseInt(process.env.WEB_PORT) || 3000,
  OSC_LISTEN_PORT: parseInt(process.env.OSC_LISTEN_PORT) || 53538,
  BRIDGE_URL: process.env.BRIDGE_URL || "http://sound-check-bridge:3401",
  TRACK_BASE_PATH: process.env.TRACK_BASE_PATH || "/app/qlab-audio",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "8888",
};

console.log("=== Sound Check - Live Music Gameshow Scoring System ===");
console.log("Configuration:", JSON.stringify(CONFIG, null, 2));

// =============================================================================
// Round Definitions
// =============================================================================
const ROUNDS = [
  { id: 0, name: "OPENING", displayName: "Opening", duration: "3-4 min", maxTracks: 0 },
  { id: 1, name: "SHOUT", displayName: "Round 1 - Shout", duration: "6 min", maxTracks: 8 },
  { id: 2, name: "EVERYBODY_DANCE_NOW", displayName: "Round 2 - Everybody Dance Now", duration: "6-7 min", maxTracks: 12 },
  { id: 3, name: "SING_IT_BACK", displayName: "Round 3 - Sing It Back", duration: "7 min", maxTracks: 5 },
  { id: 4, name: "MID_SCORE_REVEAL", displayName: "Mid Show Score Reveal", duration: "2-3 min", maxTracks: 0 },
  { id: 5, name: "LET_ME_ENTERTAIN_YOU", displayName: "Round 4 - Let Me Entertain You", duration: "7 min", maxTracks: 11 },
  { id: 6, name: "DO_YOU_REMEMBER", displayName: "Round 5 - Do You Remember The Time", duration: "5-6 min", maxTracks: 9 },
  { id: 7, name: "ONE_MORE_TIME", displayName: "Final Round - One More Time", duration: "7-8 min", maxTracks: 10 },
  { id: 8, name: "FINAL_SCORE_REVEAL", displayName: "Final Score Reveal", duration: "3-4 min", maxTracks: 0 },
];

// =============================================================================
// Music Pack System
// =============================================================================
// QLab cue number offsets per round - T1-T55 sequential across all rounds
// Round 1: T1-T8, Round 2: T9-T20, Round 3: T21-T25,
// Round 5: T26-T36, Round 6: T37-T45, Round 7: T46-T55
const ROUND_CUE_OFFSETS = {
  1: 0,    // T1-T8   (8 tracks)
  2: 8,    // T9-T20  (12 tracks)
  3: 20,   // T21-T25 (5 tracks)
  5: 25,   // T26-T36 (11 tracks)
  6: 36,   // T37-T45 (9 tracks)
  7: 45,   // T46-T55 (10 tracks)
};

function getTrackCueNumber(round, trackIndex) {
  const offset = ROUND_CUE_OFFSETS[round];
  if (offset === undefined) return null;
  return `T${offset + trackIndex + 1}`;
}

// QLab cue names for arm/disarm per pack
const PACK_QLAB_CUES = {
  "ultimate-singalong": "PACK1",
  "80s-90s-anthems": "PACK2",
  floorfillers: "PACK3",
};

const MUSIC_PACKS = {
  "ultimate-singalong": {
    id: "ultimate-singalong",
    name: "Ultimate Singalong Classics",
    description: "Cross-generational anthems that bring the whole room together",
    rounds: {
      0: [],
      1: [
        { fileName: "SC Pack 1 (Round 1 - Track 1) - Beliver.wav", cueName: "SC Pack 1 (Round 1 - Track 1) - Beliver" },
        { fileName: "SC Pack 1 (Round 1 - Track 2) - Caroline.wav", cueName: "SC Pack 1 (Round 1 - Track 2) - Caroline" },
        { fileName: "SC Pack 1 (Round 1 - Track 3) - Champions.wav", cueName: "SC Pack 1 (Round 1 - Track 3) - Champions" },
        { fileName: "SC Pack 1 (Round 1 - Track 4) - Feeling.wav", cueName: "SC Pack 1 (Round 1 - Track 4) - Feeling" },
        { fileName: "SC Pack 1 (Round 1 - Track 5) - Jude.wav", cueName: "SC Pack 1 (Round 1 - Track 5) - Jude" },
        { fileName: "SC Pack 1 (Round 1 - Track 6) - Standing.wav", cueName: "SC Pack 1 (Round 1 - Track 6) - Standing" },
        { fileName: "SC Pack 1 (Round 1 - Track 7) - Survive.wav", cueName: "SC Pack 1 (Round 1 - Track 7) - Survive" },
        { fileName: "SC Pack 1 (Round 1 - Track 8) - Valarie.wav", cueName: "SC Pack 1 (Round 1 - Track 8) - Valarie" },
      ],
      2: [
        { fileName: "SC Pack 1 (Round 2 - Track 1) - Agadoo - Black Lace.wav", cueName: "SC Pack 1 (Round 2 - Track 1) - Agadoo - Black Lace" },
        { fileName: "SC Pack 1 (Round 2 - Track 2) - Blame it on the Boogie - The Jacksons.wav", cueName: "SC Pack 1 (Round 2 - Track 2) - Blame it on the Boogie - The Jacksons" },
        { fileName: "SC Pack 1 (Round 2 - Track 3) - Cha Cha Slide.wav", cueName: "SC Pack 1 (Round 2 - Track 3) - Cha Cha Slide" },
        { fileName: "SC Pack 1 (Round 2 - Track 4) - Cotten Eye Joe - Rednex.wav", cueName: "SC Pack 1 (Round 2 - Track 4) - Cotten Eye Joe - Rednex" },
        { fileName: "SC Pack 1 (Round 2 - Track 5) - Gangnam Style - PSY.wav", cueName: "SC Pack 1 (Round 2 - Track 5) - Gangnam Style - PSY" },
        { fileName: "SC Pack 1 (Round 2 - Track 6) - Saturday Night - Whigfield.wav", cueName: "SC Pack 1 (Round 2 - Track 6) - Saturday Night - Whigfield" },
        { fileName: "SC Pack 1 (Round 2 - Track 7) - The Loco-Motions - Kylie.wav", cueName: "SC Pack 1 (Round 2 - Track 7) - The Loco-Motions - Kylie" },
        { fileName: "SC Pack 1 (Round 2 - Track 8) - The Time Warp.wav", cueName: "SC Pack 1 (Round 2 - Track 8) - The Time Warp" },
        { fileName: "SC Pack 1 (Round 2 - Track 9) - Vogue - Madonna.wav", cueName: "SC Pack 1 (Round 2 - Track 9) - Vogue - Madonna" },
        { fileName: "SC Pack 1 (Round 2 - Track 10) - Walk Like an Egyptian - The Bangles.wav", cueName: "SC Pack 1 (Round 2 - Track 10) - Walk Like an Egyptian - The Bangles" },
        { fileName: "SC Pack 1 (Round 2 - Track 11) - YMCA - Village People.wav", cueName: "SC Pack 1 (Round 2 - Track 11) - YMCA - Village People" },
        { fileName: "SC Pack 1 (Round 2 - Track 12) - You Can_t Touch This - MC Hammer.wav", cueName: "SC Pack 1 (Round 2 - Track 12) - You Can_t Touch This - MC Hammer" },
      ],
      3: [
        { fileName: "SC Pack 1 (Round 3 - Track 1) - Alabama.wav", cueName: "SC Pack 1 (Round 3 - Track 1) - Alabama" },
        { fileName: "SC Pack 1 (Round 3 - Track 2) - Backstreet Boys.wav", cueName: "SC Pack 1 (Round 3 - Track 2) - Backstreet Boys" },
        { fileName: "SC Pack 1 (Round 3 - Track 3) - Barbie.wav", cueName: "SC Pack 1 (Round 3 - Track 3) - Barbie" },
        { fileName: "SC Pack 1 (Round 3 - Track 4) - Teenage Dirtbag.wav", cueName: "SC Pack 1 (Round 3 - Track 4) - Teenage Dirtbag" },
        { fileName: "SC Pack 1 (Round 3 - Track 5) - Toploader.wav", cueName: "SC Pack 1 (Round 3 - Track 5) - Toploader" },
      ],
      4: [],
      5: [
        { fileName: "SC Pack 1 (Round 4 - Track 1) - Beyoncé - Crazy In Love (feat. JAY-Z).mp3", cueName: "SC Pack 1 (Round 4 - Track 1) - Beyoncé - Crazy In Love (feat. JAY-Z)" },
        { fileName: "SC Pack 1 (Round 4 - Track 2) - Britney Spears - Baby One More Time.mp3", cueName: "SC Pack 1 (Round 4 - Track 2) - Britney Spears - Baby One More Time" },
        { fileName: "SC Pack 1 (Round 4 - Track 3) - Carly Rae Jepsen - Call Me Maybe.mp3", cueName: "SC Pack 1 (Round 4 - Track 3) - Carly Rae Jepsen - Call Me Maybe" },
        { fileName: "SC Pack 1 (Round 4 - Track 4) - Guns N_ Roses - Sweet Child O_ Mine.mp3", cueName: "SC Pack 1 (Round 4 - Track 4) - Guns N_ Roses - Sweet Child O_ Mine" },
        { fileName: "SC Pack 1 (Round 4 - Track 5) - Kings Of Leon - Sex on Fire.mp3", cueName: "SC Pack 1 (Round 4 - Track 5) - Kings Of Leon - Sex on Fire" },
        { fileName: "SC Pack 1 (Round 4 - Track 6) - Ricky Martin - Livin_ la Vida Loca.mp3", cueName: "SC Pack 1 (Round 4 - Track 6) - Ricky Martin - Livin_ la Vida Loca" },
        { fileName: "SC Pack 1 (Round 4 - Track 7) - Right Said Fred - I_m Too Sexy (2023).mp3", cueName: "SC Pack 1 (Round 4 - Track 7) - Right Said Fred - I_m Too Sexy (2023)" },
        { fileName: "SC Pack 1 (Round 4 - Track 8) - Robbie Williams - Let Me Entertain You.mp3", cueName: "SC Pack 1 (Round 4 - Track 8) - Robbie Williams - Let Me Entertain You" },
        { fileName: "SC Pack 1 (Round 4 - Track 9) - Smash Mouth - All Star.mp3", cueName: "SC Pack 1 (Round 4 - Track 9) - Smash Mouth - All Star" },
        { fileName: "SC Pack 1 (Round 4 - Track 10) - Spice Girls - Wannabe.mp3", cueName: "SC Pack 1 (Round 4 - Track 10) - Spice Girls - Wannabe" },
        { fileName: "SC Pack 1 (Round 4 - Track 11) - The Proclaimers - I_m Gonna Be (500 Miles).mp3", cueName: "SC Pack 1 (Round 4 - Track 11) - The Proclaimers - I_m Gonna Be (500 Miles)" },
      ],
      6: [
        { fileName: "SC Pack 1 (Round 5 - Track 1) - Adele - Rolling in the Deep.mp3", cueName: "SC Pack 1 (Round 5 - Track 1) - Adele - Rolling in the Deep" },
        { fileName: "SC Pack 1 (Round 5 - Track 2) - Avicii - Wake Me Up.mp3", cueName: "SC Pack 1 (Round 5 - Track 2) - Avicii - Wake Me Up" },
        { fileName: "SC Pack 1 (Round 5 - Track 3) - Ed Sheeran - Shape of You (Stormzy Remix).mp3", cueName: "SC Pack 1 (Round 5 - Track 3) - Ed Sheeran - Shape of You (Stormzy Remix)" },
        { fileName: "SC Pack 1 (Round 5 - Track 4) - Journey - Don_t Stop Believin_ (2022 Remaster).mp3", cueName: "SC Pack 1 (Round 5 - Track 4) - Journey - Don_t Stop Believin_ (2022 Remaster)" },
        { fileName: "SC Pack 1 (Round 5 - Track 5) - Katy Perry - Firework.mp3", cueName: "SC Pack 1 (Round 5 - Track 5) - Katy Perry - Firework" },
        { fileName: "SC Pack 1 (Round 5 - Track 6) - Lady Gaga - Poker Face.mp3", cueName: "SC Pack 1 (Round 5 - Track 6) - Lady Gaga - Poker Face" },
        { fileName: "SC Pack 1 (Round 5 - Track 7) - Madonna - Like a Prayer.mp3", cueName: "SC Pack 1 (Round 5 - Track 7) - Madonna - Like a Prayer" },
        { fileName: "SC Pack 1 (Round 5 - Track 8) - Oasis - Wonderwall.mp3", cueName: "SC Pack 1 (Round 5 - Track 8) - Oasis - Wonderwall" },
        { fileName: "SC Pack 1 (Round 5 - Track 9) - The Weeknd - Blinding Lights.mp3", cueName: "SC Pack 1 (Round 5 - Track 9) - The Weeknd - Blinding Lights" },
      ],
      7: [
        { fileName: "SC Pack 1 (Round 6 - Track 1) - ABBA - Dancing Queen.mp3", cueName: "SC Pack 1 (Round 6 - Track 1) - ABBA - Dancing Queen" },
        { fileName: "SC Pack 1 (Round 6 - Track 2) - Cher - Believe.mp3", cueName: "SC Pack 1 (Round 6 - Track 2) - Cher - Believe" },
        { fileName: "SC Pack 1 (Round 6 - Track 3) - Cyndi Lauper - Girls Just Want to Have Fun.mp3", cueName: "SC Pack 1 (Round 6 - Track 3) - Cyndi Lauper - Girls Just Want to Have Fun" },
        { fileName: "SC Pack 1 (Round 6 - Track 4) - Dolly Parton - 9 to 5.mp3", cueName: "SC Pack 1 (Round 6 - Track 4) - Dolly Parton - 9 to 5" },
        { fileName: "SC Pack 1 (Round 6 - Track 5) - Eurythmics - Sweet Dreams (Are Made of This) (2005 Remaster).mp3", cueName: "SC Pack 1 (Round 6 - Track 5) - Eurythmics - Sweet Dreams (Are Made of This) (2005 Remaster)" },
        { fileName: "SC Pack 1 (Round 6 - Track 6) - Imagine Dragons - Believer.mp3", cueName: "SC Pack 1 (Round 6 - Track 6) - Imagine Dragons - Believer" },
        { fileName: "SC Pack 1 (Round 6 - Track 7) - S Club - Don_t Stop Movin_.mp3", cueName: "SC Pack 1 (Round 6 - Track 7) - S Club - Don_t Stop Movin_" },
        { fileName: "SC Pack 1 (Round 6 - Track 8) - Starship - We Built This City.mp3", cueName: "SC Pack 1 (Round 6 - Track 8) - Starship - We Built This City" },
        { fileName: "SC Pack 1 (Round 6 - Track 9) - The Foundations - Build Me Up Buttercup (Stereo).mp3", cueName: "SC Pack 1 (Round 6 - Track 9) - The Foundations - Build Me Up Buttercup (Stereo)" },
        { fileName: "SC Pack 1 (Round 6 - Track 10) - Vanilla Ice - Ice Ice Baby.mp3", cueName: "SC Pack 1 (Round 6 - Track 10) - Vanilla Ice - Ice Ice Baby" },
      ],
      8: [],
    },
  },
  "80s-90s-anthems": {
    id: "80s-90s-anthems",
    name: "80s & 90s Anthems",
    description: "High-energy nostalgia from two iconic decades",
    rounds: {
      0: [],
      1: [
        { fileName: "SC Pack 2 (Round 1 - Track 1) - TBC.mp3", cueName: "SC Pack 2 (Round 1 - Track 1) - TBC" },
        { fileName: "SC Pack 2 (Round 1 - Track 2) - TBC.mp3", cueName: "SC Pack 2 (Round 1 - Track 2) - TBC" },
        { fileName: "SC Pack 2 (Round 1 - Track 3) - TBC.mp3", cueName: "SC Pack 2 (Round 1 - Track 3) - TBC" },
        { fileName: "SC Pack 2 (Round 1 - Track 4) - TBC.mp3", cueName: "SC Pack 2 (Round 1 - Track 4) - TBC" },
        { fileName: "SC Pack 2 (Round 1 - Track 5) - TBC.mp3", cueName: "SC Pack 2 (Round 1 - Track 5) - TBC" },
        { fileName: "SC Pack 2 (Round 1 - Track 6) - TBC.mp3", cueName: "SC Pack 2 (Round 1 - Track 6) - TBC" },
        { fileName: "SC Pack 2 (Round 1 - Track 7) - TBC.mp3", cueName: "SC Pack 2 (Round 1 - Track 7) - TBC" },
        { fileName: "SC Pack 2 (Round 1 - Track 8) - TBC.mp3", cueName: "SC Pack 2 (Round 1 - Track 8) - TBC" },
      ],
      2: [
        { fileName: "SC Pack 2 (Round 2 - Track 1) - TBC.mp3", cueName: "SC Pack 2 (Round 2 - Track 1) - TBC" },
        { fileName: "SC Pack 2 (Round 2 - Track 2) - TBC.mp3", cueName: "SC Pack 2 (Round 2 - Track 2) - TBC" },
        { fileName: "SC Pack 2 (Round 2 - Track 3) - TBC.mp3", cueName: "SC Pack 2 (Round 2 - Track 3) - TBC" },
        { fileName: "SC Pack 2 (Round 2 - Track 4) - TBC.mp3", cueName: "SC Pack 2 (Round 2 - Track 4) - TBC" },
        { fileName: "SC Pack 2 (Round 2 - Track 5) - TBC.mp3", cueName: "SC Pack 2 (Round 2 - Track 5) - TBC" },
        { fileName: "SC Pack 2 (Round 2 - Track 6) - TBC.mp3", cueName: "SC Pack 2 (Round 2 - Track 6) - TBC" },
        { fileName: "SC Pack 2 (Round 2 - Track 7) - TBC.mp3", cueName: "SC Pack 2 (Round 2 - Track 7) - TBC" },
        { fileName: "SC Pack 2 (Round 2 - Track 8) - TBC.mp3", cueName: "SC Pack 2 (Round 2 - Track 8) - TBC" },
        { fileName: "SC Pack 2 (Round 2 - Track 9) - TBC.mp3", cueName: "SC Pack 2 (Round 2 - Track 9) - TBC" },
        { fileName: "SC Pack 2 (Round 2 - Track 10) - TBC.mp3", cueName: "SC Pack 2 (Round 2 - Track 10) - TBC" },
        { fileName: "SC Pack 2 (Round 2 - Track 11) - TBC.mp3", cueName: "SC Pack 2 (Round 2 - Track 11) - TBC" },
        { fileName: "SC Pack 2 (Round 2 - Track 12) - TBC.mp3", cueName: "SC Pack 2 (Round 2 - Track 12) - TBC" },
      ],
      3: [
        { fileName: "SC Pack 2 (Round 3 - Track 1) - TBC.mp3", cueName: "SC Pack 2 (Round 3 - Track 1) - TBC" },
        { fileName: "SC Pack 2 (Round 3 - Track 2) - TBC.mp3", cueName: "SC Pack 2 (Round 3 - Track 2) - TBC" },
        { fileName: "SC Pack 2 (Round 3 - Track 3) - TBC.mp3", cueName: "SC Pack 2 (Round 3 - Track 3) - TBC" },
        { fileName: "SC Pack 2 (Round 3 - Track 4) - TBC.mp3", cueName: "SC Pack 2 (Round 3 - Track 4) - TBC" },
        { fileName: "SC Pack 2 (Round 3 - Track 5) - TBC.mp3", cueName: "SC Pack 2 (Round 3 - Track 5) - TBC" },
      ],
      4: [],
      5: [
        { fileName: "SC Pack 2 (Round 4 - Track 1) - TBC.mp3", cueName: "SC Pack 2 (Round 4 - Track 1) - TBC" },
        { fileName: "SC Pack 2 (Round 4 - Track 2) - TBC.mp3", cueName: "SC Pack 2 (Round 4 - Track 2) - TBC" },
        { fileName: "SC Pack 2 (Round 4 - Track 3) - TBC.mp3", cueName: "SC Pack 2 (Round 4 - Track 3) - TBC" },
        { fileName: "SC Pack 2 (Round 4 - Track 4) - TBC.mp3", cueName: "SC Pack 2 (Round 4 - Track 4) - TBC" },
        { fileName: "SC Pack 2 (Round 4 - Track 5) - TBC.mp3", cueName: "SC Pack 2 (Round 4 - Track 5) - TBC" },
        { fileName: "SC Pack 2 (Round 4 - Track 6) - TBC.mp3", cueName: "SC Pack 2 (Round 4 - Track 6) - TBC" },
        { fileName: "SC Pack 2 (Round 4 - Track 7) - TBC.mp3", cueName: "SC Pack 2 (Round 4 - Track 7) - TBC" },
        { fileName: "SC Pack 2 (Round 4 - Track 8) - TBC.mp3", cueName: "SC Pack 2 (Round 4 - Track 8) - TBC" },
        { fileName: "SC Pack 2 (Round 4 - Track 9) - TBC.mp3", cueName: "SC Pack 2 (Round 4 - Track 9) - TBC" },
        { fileName: "SC Pack 2 (Round 4 - Track 10) - TBC.mp3", cueName: "SC Pack 2 (Round 4 - Track 10) - TBC" },
        { fileName: "SC Pack 2 (Round 4 - Track 11) - TBC.mp3", cueName: "SC Pack 2 (Round 4 - Track 11) - TBC" },
      ],
      6: [
        { fileName: "SC Pack 2 (Round 5 - Track 1) - TBC.mp3", cueName: "SC Pack 2 (Round 5 - Track 1) - TBC" },
        { fileName: "SC Pack 2 (Round 5 - Track 2) - TBC.mp3", cueName: "SC Pack 2 (Round 5 - Track 2) - TBC" },
        { fileName: "SC Pack 2 (Round 5 - Track 3) - TBC.mp3", cueName: "SC Pack 2 (Round 5 - Track 3) - TBC" },
        { fileName: "SC Pack 2 (Round 5 - Track 4) - TBC.mp3", cueName: "SC Pack 2 (Round 5 - Track 4) - TBC" },
        { fileName: "SC Pack 2 (Round 5 - Track 5) - TBC.mp3", cueName: "SC Pack 2 (Round 5 - Track 5) - TBC" },
        { fileName: "SC Pack 2 (Round 5 - Track 6) - TBC.mp3", cueName: "SC Pack 2 (Round 5 - Track 6) - TBC" },
        { fileName: "SC Pack 2 (Round 5 - Track 7) - TBC.mp3", cueName: "SC Pack 2 (Round 5 - Track 7) - TBC" },
        { fileName: "SC Pack 2 (Round 5 - Track 8) - TBC.mp3", cueName: "SC Pack 2 (Round 5 - Track 8) - TBC" },
        { fileName: "SC Pack 2 (Round 5 - Track 9) - TBC.mp3", cueName: "SC Pack 2 (Round 5 - Track 9) - TBC" },
      ],
      7: [
        { fileName: "SC Pack 2 (Round 6 - Track 1) - TBC.mp3", cueName: "SC Pack 2 (Round 6 - Track 1) - TBC" },
        { fileName: "SC Pack 2 (Round 6 - Track 2) - TBC.mp3", cueName: "SC Pack 2 (Round 6 - Track 2) - TBC" },
        { fileName: "SC Pack 2 (Round 6 - Track 3) - TBC.mp3", cueName: "SC Pack 2 (Round 6 - Track 3) - TBC" },
        { fileName: "SC Pack 2 (Round 6 - Track 4) - TBC.mp3", cueName: "SC Pack 2 (Round 6 - Track 4) - TBC" },
        { fileName: "SC Pack 2 (Round 6 - Track 5) - TBC.mp3", cueName: "SC Pack 2 (Round 6 - Track 5) - TBC" },
        { fileName: "SC Pack 2 (Round 6 - Track 6) - TBC.mp3", cueName: "SC Pack 2 (Round 6 - Track 6) - TBC" },
        { fileName: "SC Pack 2 (Round 6 - Track 7) - TBC.mp3", cueName: "SC Pack 2 (Round 6 - Track 7) - TBC" },
        { fileName: "SC Pack 2 (Round 6 - Track 8) - TBC.mp3", cueName: "SC Pack 2 (Round 6 - Track 8) - TBC" },
        { fileName: "SC Pack 2 (Round 6 - Track 9) - TBC.mp3", cueName: "SC Pack 2 (Round 6 - Track 9) - TBC" },
        { fileName: "SC Pack 2 (Round 6 - Track 10) - TBC.mp3", cueName: "SC Pack 2 (Round 6 - Track 10) - TBC" },
      ],
      8: [],
    },
  },
  floorfillers: {
    id: "floorfillers",
    name: "Floorfillers",
    description: "Upbeat party tracks for maximum participation",
    rounds: {
      0: [],
      1: [
        { fileName: "SC Pack 3 (Round 1 - Track 1) - TBC.mp3", cueName: "SC Pack 3 (Round 1 - Track 1) - TBC" },
        { fileName: "SC Pack 3 (Round 1 - Track 2) - TBC.mp3", cueName: "SC Pack 3 (Round 1 - Track 2) - TBC" },
        { fileName: "SC Pack 3 (Round 1 - Track 3) - TBC.mp3", cueName: "SC Pack 3 (Round 1 - Track 3) - TBC" },
        { fileName: "SC Pack 3 (Round 1 - Track 4) - TBC.mp3", cueName: "SC Pack 3 (Round 1 - Track 4) - TBC" },
        { fileName: "SC Pack 3 (Round 1 - Track 5) - TBC.mp3", cueName: "SC Pack 3 (Round 1 - Track 5) - TBC" },
        { fileName: "SC Pack 3 (Round 1 - Track 6) - TBC.mp3", cueName: "SC Pack 3 (Round 1 - Track 6) - TBC" },
        { fileName: "SC Pack 3 (Round 1 - Track 7) - TBC.mp3", cueName: "SC Pack 3 (Round 1 - Track 7) - TBC" },
        { fileName: "SC Pack 3 (Round 1 - Track 8) - TBC.mp3", cueName: "SC Pack 3 (Round 1 - Track 8) - TBC" },
      ],
      2: [
        { fileName: "SC Pack 3 (Round 2 - Track 1) - TBC.mp3", cueName: "SC Pack 3 (Round 2 - Track 1) - TBC" },
        { fileName: "SC Pack 3 (Round 2 - Track 2) - TBC.mp3", cueName: "SC Pack 3 (Round 2 - Track 2) - TBC" },
        { fileName: "SC Pack 3 (Round 2 - Track 3) - TBC.mp3", cueName: "SC Pack 3 (Round 2 - Track 3) - TBC" },
        { fileName: "SC Pack 3 (Round 2 - Track 4) - TBC.mp3", cueName: "SC Pack 3 (Round 2 - Track 4) - TBC" },
        { fileName: "SC Pack 3 (Round 2 - Track 5) - TBC.mp3", cueName: "SC Pack 3 (Round 2 - Track 5) - TBC" },
        { fileName: "SC Pack 3 (Round 2 - Track 6) - TBC.mp3", cueName: "SC Pack 3 (Round 2 - Track 6) - TBC" },
        { fileName: "SC Pack 3 (Round 2 - Track 7) - TBC.mp3", cueName: "SC Pack 3 (Round 2 - Track 7) - TBC" },
        { fileName: "SC Pack 3 (Round 2 - Track 8) - TBC.mp3", cueName: "SC Pack 3 (Round 2 - Track 8) - TBC" },
        { fileName: "SC Pack 3 (Round 2 - Track 9) - TBC.mp3", cueName: "SC Pack 3 (Round 2 - Track 9) - TBC" },
        { fileName: "SC Pack 3 (Round 2 - Track 10) - TBC.mp3", cueName: "SC Pack 3 (Round 2 - Track 10) - TBC" },
        { fileName: "SC Pack 3 (Round 2 - Track 11) - TBC.mp3", cueName: "SC Pack 3 (Round 2 - Track 11) - TBC" },
        { fileName: "SC Pack 3 (Round 2 - Track 12) - TBC.mp3", cueName: "SC Pack 3 (Round 2 - Track 12) - TBC" },
      ],
      3: [
        { fileName: "SC Pack 3 (Round 3 - Track 1) - TBC.mp3", cueName: "SC Pack 3 (Round 3 - Track 1) - TBC" },
        { fileName: "SC Pack 3 (Round 3 - Track 2) - TBC.mp3", cueName: "SC Pack 3 (Round 3 - Track 2) - TBC" },
        { fileName: "SC Pack 3 (Round 3 - Track 3) - TBC.mp3", cueName: "SC Pack 3 (Round 3 - Track 3) - TBC" },
        { fileName: "SC Pack 3 (Round 3 - Track 4) - TBC.mp3", cueName: "SC Pack 3 (Round 3 - Track 4) - TBC" },
        { fileName: "SC Pack 3 (Round 3 - Track 5) - TBC.mp3", cueName: "SC Pack 3 (Round 3 - Track 5) - TBC" },
      ],
      4: [],
      5: [
        { fileName: "SC Pack 3 (Round 4 - Track 1) - TBC.mp3", cueName: "SC Pack 3 (Round 4 - Track 1) - TBC" },
        { fileName: "SC Pack 3 (Round 4 - Track 2) - TBC.mp3", cueName: "SC Pack 3 (Round 4 - Track 2) - TBC" },
        { fileName: "SC Pack 3 (Round 4 - Track 3) - TBC.mp3", cueName: "SC Pack 3 (Round 4 - Track 3) - TBC" },
        { fileName: "SC Pack 3 (Round 4 - Track 4) - TBC.mp3", cueName: "SC Pack 3 (Round 4 - Track 4) - TBC" },
        { fileName: "SC Pack 3 (Round 4 - Track 5) - TBC.mp3", cueName: "SC Pack 3 (Round 4 - Track 5) - TBC" },
        { fileName: "SC Pack 3 (Round 4 - Track 6) - TBC.mp3", cueName: "SC Pack 3 (Round 4 - Track 6) - TBC" },
        { fileName: "SC Pack 3 (Round 4 - Track 7) - TBC.mp3", cueName: "SC Pack 3 (Round 4 - Track 7) - TBC" },
        { fileName: "SC Pack 3 (Round 4 - Track 8) - TBC.mp3", cueName: "SC Pack 3 (Round 4 - Track 8) - TBC" },
        { fileName: "SC Pack 3 (Round 4 - Track 9) - TBC.mp3", cueName: "SC Pack 3 (Round 4 - Track 9) - TBC" },
        { fileName: "SC Pack 3 (Round 4 - Track 10) - TBC.mp3", cueName: "SC Pack 3 (Round 4 - Track 10) - TBC" },
        { fileName: "SC Pack 3 (Round 4 - Track 11) - TBC.mp3", cueName: "SC Pack 3 (Round 4 - Track 11) - TBC" },
      ],
      6: [
        { fileName: "SC Pack 3 (Round 5 - Track 1) - TBC.mp3", cueName: "SC Pack 3 (Round 5 - Track 1) - TBC" },
        { fileName: "SC Pack 3 (Round 5 - Track 2) - TBC.mp3", cueName: "SC Pack 3 (Round 5 - Track 2) - TBC" },
        { fileName: "SC Pack 3 (Round 5 - Track 3) - TBC.mp3", cueName: "SC Pack 3 (Round 5 - Track 3) - TBC" },
        { fileName: "SC Pack 3 (Round 5 - Track 4) - TBC.mp3", cueName: "SC Pack 3 (Round 5 - Track 4) - TBC" },
        { fileName: "SC Pack 3 (Round 5 - Track 5) - TBC.mp3", cueName: "SC Pack 3 (Round 5 - Track 5) - TBC" },
        { fileName: "SC Pack 3 (Round 5 - Track 6) - TBC.mp3", cueName: "SC Pack 3 (Round 5 - Track 6) - TBC" },
        { fileName: "SC Pack 3 (Round 5 - Track 7) - TBC.mp3", cueName: "SC Pack 3 (Round 5 - Track 7) - TBC" },
        { fileName: "SC Pack 3 (Round 5 - Track 8) - TBC.mp3", cueName: "SC Pack 3 (Round 5 - Track 8) - TBC" },
        { fileName: "SC Pack 3 (Round 5 - Track 9) - TBC.mp3", cueName: "SC Pack 3 (Round 5 - Track 9) - TBC" },
      ],
      7: [
        { fileName: "SC Pack 3 (Round 6 - Track 1) - TBC.mp3", cueName: "SC Pack 3 (Round 6 - Track 1) - TBC" },
        { fileName: "SC Pack 3 (Round 6 - Track 2) - TBC.mp3", cueName: "SC Pack 3 (Round 6 - Track 2) - TBC" },
        { fileName: "SC Pack 3 (Round 6 - Track 3) - TBC.mp3", cueName: "SC Pack 3 (Round 6 - Track 3) - TBC" },
        { fileName: "SC Pack 3 (Round 6 - Track 4) - TBC.mp3", cueName: "SC Pack 3 (Round 6 - Track 4) - TBC" },
        { fileName: "SC Pack 3 (Round 6 - Track 5) - TBC.mp3", cueName: "SC Pack 3 (Round 6 - Track 5) - TBC" },
        { fileName: "SC Pack 3 (Round 6 - Track 6) - TBC.mp3", cueName: "SC Pack 3 (Round 6 - Track 6) - TBC" },
        { fileName: "SC Pack 3 (Round 6 - Track 7) - TBC.mp3", cueName: "SC Pack 3 (Round 6 - Track 7) - TBC" },
        { fileName: "SC Pack 3 (Round 6 - Track 8) - TBC.mp3", cueName: "SC Pack 3 (Round 6 - Track 8) - TBC" },
        { fileName: "SC Pack 3 (Round 6 - Track 9) - TBC.mp3", cueName: "SC Pack 3 (Round 6 - Track 9) - TBC" },
        { fileName: "SC Pack 3 (Round 6 - Track 10) - TBC.mp3", cueName: "SC Pack 3 (Round 6 - Track 10) - TBC" },
      ],
      8: [],
    },
  },
};

// =============================================================================
// Activity Logging System
// =============================================================================
const ACTIVITY_LOG_FILE = path.join(__dirname, "../data/activity-log.json");
let activityLog = [];
const MAX_LOG_ENTRIES = 10000;
const LOG_RETENTION_DAYS = 60;

const dataDir = path.dirname(ACTIVITY_LOG_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadActivityLog() {
  try {
    if (fs.existsSync(ACTIVITY_LOG_FILE)) {
      const data = fs.readFileSync(ACTIVITY_LOG_FILE, "utf8");
      activityLog = JSON.parse(data);
      console.log(`[ACTIVITY] Loaded ${activityLog.length} entries from persistent storage`);
      cleanupOldEntries();
    } else {
      console.log("[ACTIVITY] No activity log file found, starting fresh");
      activityLog = [];
    }
  } catch (error) {
    console.error("[ACTIVITY] Error loading activity log:", error);
    activityLog = [];
  }
}

function saveActivityLog() {
  try {
    fs.writeFileSync(ACTIVITY_LOG_FILE, JSON.stringify(activityLog, null, 2));
  } catch (error) {
    console.error("[ACTIVITY] Error saving activity log:", error);
  }
}

loadActivityLog();

function logActivity(type, details, source = "system") {
  const entry = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    type,
    details,
    source,
    round: gameState.currentRound,
  };
  activityLog.push(entry);
  cleanupOldEntries();
  saveActivityLog();
  console.log(`[ACTIVITY] ${type.toUpperCase()} - ${details} (${source})`);
}

function cleanupOldEntries() {
  const cutoffDate = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  for (let i = activityLog.length - 1; i >= 0; i--) {
    if (new Date(activityLog[i].timestamp) < cutoffDate) {
      activityLog.splice(i, 1);
    }
  }
  if (activityLog.length > MAX_LOG_ENTRIES) {
    activityLog.splice(0, activityLog.length - MAX_LOG_ENTRIES);
  }
}

function getActivityLog(type = "all", days = 60) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return activityLog.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    if (entryDate < cutoffDate) return false;
    if (type !== "all" && entry.type !== type) return false;
    return true;
  });
}

// =============================================================================
// Game State
// =============================================================================
const GAME_STATE_FILE = path.join(__dirname, "../data/game-state.json");
const BENCHMARK_HISTORY_FILE = path.join(__dirname, "../data/benchmark-history.json");
const PACK_SETTINGS_FILE = path.join(__dirname, "../data/pack-settings.json");

function createDefaultGameState() {
  return {
    score: 0,
    currentRound: 0,
    currentTrack: 0,
    isActive: false,
    benchmark: 0,
    scoreHistory: [],
    showStartedAt: null,
    lastUpdated: null,
  };
}

let gameState = createDefaultGameState();
let benchmarkHistory = [];
let packSettings = {
  currentPack: "ultimate-singalong",
  lastChanged: null,
};

// Load/save game state
function loadGameState() {
  try {
    if (fs.existsSync(GAME_STATE_FILE)) {
      const data = fs.readFileSync(GAME_STATE_FILE, "utf8");
      gameState = { ...createDefaultGameState(), ...JSON.parse(data) };
      console.log(`[GAME] Loaded game state: score=${gameState.score}, round=${gameState.currentRound}, benchmark=${gameState.benchmark}`);
    } else {
      console.log("[GAME] No game state file found, using defaults");
    }
  } catch (error) {
    console.error("[GAME] Error loading game state:", error);
    gameState = createDefaultGameState();
  }
}

function saveGameState() {
  try {
    fs.writeFileSync(GAME_STATE_FILE, JSON.stringify(gameState, null, 2));
  } catch (error) {
    console.error("[GAME] Error saving game state:", error);
  }
}

// Load/save benchmark history
function loadBenchmarkHistory() {
  try {
    if (fs.existsSync(BENCHMARK_HISTORY_FILE)) {
      const data = fs.readFileSync(BENCHMARK_HISTORY_FILE, "utf8");
      benchmarkHistory = JSON.parse(data);
      console.log(`[BENCHMARK] Loaded ${benchmarkHistory.length} benchmark entries`);
    }
  } catch (error) {
    console.error("[BENCHMARK] Error loading benchmark history:", error);
    benchmarkHistory = [];
  }
}

function saveBenchmarkHistory() {
  try {
    fs.writeFileSync(BENCHMARK_HISTORY_FILE, JSON.stringify(benchmarkHistory, null, 2));
  } catch (error) {
    console.error("[BENCHMARK] Error saving benchmark history:", error);
  }
}

// Load/save pack settings
function loadPackSettings() {
  try {
    if (fs.existsSync(PACK_SETTINGS_FILE)) {
      const data = fs.readFileSync(PACK_SETTINGS_FILE, "utf8");
      packSettings = JSON.parse(data);
      console.log(`[PACK] Loaded pack settings: ${packSettings.currentPack}`);
    } else {
      console.log("[PACK] No settings file found, using defaults");
    }
  } catch (error) {
    console.error("[PACK] Error loading pack settings:", error);
  }
}

function savePackSettings() {
  try {
    fs.writeFileSync(PACK_SETTINGS_FILE, JSON.stringify(packSettings, null, 2));
    console.log(`[PACK] Saved pack settings: ${packSettings.currentPack}`);
  } catch (error) {
    console.error("[PACK] Error saving pack settings:", error);
  }
}

// Load all persistent data on startup
loadGameState();
loadBenchmarkHistory();
loadPackSettings();

// =============================================================================
// Game Logic Functions
// =============================================================================
function addScore(points, source = "system") {
  gameState.score += points;
  gameState.scoreHistory.push({
    points,
    timestamp: new Date().toISOString(),
    round: gameState.currentRound,
    source,
  });
  gameState.lastUpdated = new Date().toISOString();
  saveGameState();
  logActivity("score_add", `+${points} points (total: ${gameState.score})`, source);
  updateQLabScoreText(gameState.score);
  return gameState;
}

function subtractScore(points, source = "system") {
  gameState.score = Math.max(0, gameState.score - points);
  gameState.scoreHistory.push({
    points: -points,
    timestamp: new Date().toISOString(),
    round: gameState.currentRound,
    source,
  });
  gameState.lastUpdated = new Date().toISOString();
  saveGameState();
  logActivity("score_subtract", `-${points} points (total: ${gameState.score})`, source);
  updateQLabScoreText(gameState.score);
  return gameState;
}

function setScore(value, source = "system") {
  gameState.score = Math.max(0, value);
  gameState.lastUpdated = new Date().toISOString();
  saveGameState();
  logActivity("score_set", `Score set to ${value}`, source);
  updateQLabScoreText(gameState.score);
  return gameState;
}

function resetScore(source = "system") {
  gameState.score = 0;
  gameState.scoreHistory = [];
  gameState.lastUpdated = new Date().toISOString();
  saveGameState();
  logActivity("score_reset", "Score reset to 0", source);
  updateQLabScoreText(0);
  return gameState;
}

function advanceRound(source = "system") {
  if (gameState.currentRound < ROUNDS.length - 1) {
    gameState.currentRound += 1;
    gameState.currentTrack = 0;
    gameState.lastUpdated = new Date().toISOString();
    saveGameState();
    logActivity("round_advance", `Advanced to: ${ROUNDS[gameState.currentRound].displayName}`, source);
  }
  return gameState;
}

function previousRound(source = "system") {
  if (gameState.currentRound > 0) {
    gameState.currentRound -= 1;
    gameState.currentTrack = 0;
    gameState.lastUpdated = new Date().toISOString();
    saveGameState();
    logActivity("round_previous", `Back to: ${ROUNDS[gameState.currentRound].displayName}`, source);
  }
  return gameState;
}

function setRound(roundNumber, source = "system") {
  if (roundNumber >= 0 && roundNumber < ROUNDS.length) {
    gameState.currentRound = roundNumber;
    gameState.currentTrack = 0;
    gameState.lastUpdated = new Date().toISOString();
    saveGameState();
    logActivity("round_set", `Round set to: ${ROUNDS[roundNumber].displayName}`, source);
  }
  return gameState;
}

function setBenchmark(value, source = "system") {
  gameState.benchmark = Math.max(0, value);
  gameState.lastUpdated = new Date().toISOString();
  saveGameState();
  logActivity("benchmark_set", `Benchmark set to ${value}`, source);
  updateQLabBenchmarkText(gameState.benchmark);
  return gameState;
}

function startShow(source = "system") {
  gameState.isActive = true;
  gameState.showStartedAt = new Date().toISOString();
  gameState.lastUpdated = new Date().toISOString();
  saveGameState();
  logActivity("show_start", "Show started", source);
  return gameState;
}

function stopShow(source = "system") {
  gameState.isActive = false;
  gameState.lastUpdated = new Date().toISOString();
  saveGameState();
  logActivity("show_stop", "Show stopped", source);
  return gameState;
}

function resetGame(source = "system") {
  // If they beat the benchmark, record it and update
  if (gameState.score > gameState.benchmark && gameState.benchmark > 0) {
    benchmarkHistory.push({
      previousBenchmark: gameState.benchmark,
      newBenchmark: gameState.score,
      timestamp: new Date().toISOString(),
      packUsed: packSettings.currentPack,
    });
    gameState.benchmark = gameState.score;
    saveBenchmarkHistory();
    logActivity("benchmark_beaten", `New benchmark: ${gameState.score} (was ${benchmarkHistory[benchmarkHistory.length - 1].previousBenchmark})`, source);
  }

  const preservedBenchmark = gameState.benchmark;
  gameState = createDefaultGameState();
  gameState.benchmark = preservedBenchmark;
  saveGameState();
  logActivity("game_reset", "Full game reset", source);
  updateQLabScoreText(0);
  updateQLabBenchmarkText(gameState.benchmark);
  return gameState;
}

// =============================================================================
// Track Playback
// =============================================================================
function getTracksForCurrentRound() {
  const pack = MUSIC_PACKS[packSettings.currentPack];
  if (!pack) return [];
  return pack.rounds[gameState.currentRound] || [];
}

function playTrack(trackNumber, source = "system") {
  const tracks = getTracksForCurrentRound();
  const trackIndex = trackNumber - 1; // 1-indexed input
  if (trackIndex < 0 || trackIndex >= tracks.length) {
    console.log(`[TRACK] Invalid track number ${trackNumber} for round ${gameState.currentRound}`);
    return null;
  }

  const track = tracks[trackIndex];
  const fullFilePath = path.join(CONFIG.TRACK_BASE_PATH, track.fileName);
  const cueNumber = getTrackCueNumber(gameState.currentRound, trackIndex);
  if (!cueNumber) {
    console.log(`[TRACK] No cue number mapping for round ${gameState.currentRound}, track ${trackIndex}`);
    return null;
  }

  // Send file path to QLab
  console.log(`[TRACK] ${cueNumber}: File: ${fullFilePath}`);
  sendOSCToBridge(`/cue/${cueNumber}/fileTarget`, fullFilePath);

  // Set cue name
  sendOSCToBridge(`/cue/${cueNumber}/name`, track.cueName);

  // Start the cue
  sendOSCToBridge(`/cue/${cueNumber}/start`, 0);

  gameState.currentTrack = trackNumber;
  gameState.lastUpdated = new Date().toISOString();
  saveGameState();

  logActivity("track_play", `Playing track ${trackNumber}: ${track.cueName} (${cueNumber})`, source);

  return { trackNumber, cueNumber, cueName: track.cueName, fileName: track.fileName };
}

function stopTrack(source = "system") {
  // Stop all track cues for current round
  const tracks = getTracksForCurrentRound();
  tracks.forEach((_, index) => {
    const cueNumber = getTrackCueNumber(gameState.currentRound, index);
    if (cueNumber) sendOSCToBridge(`/cue/${cueNumber}/stop`, 0);
  });
  gameState.currentTrack = 0;
  gameState.lastUpdated = new Date().toISOString();
  saveGameState();
  logActivity("track_stop", "All tracks stopped", source);
  return gameState;
}

function playNextTrack(source = "system") {
  const tracks = getTracksForCurrentRound();
  const nextTrack = gameState.currentTrack + 1;
  if (nextTrack <= tracks.length) {
    return playTrack(nextTrack, source);
  }
  return null;
}

// Update ALL track cues for a pack (T1-T55) across ALL rounds
// Sends immediately on pack change - no delays, no round dependency
function updateTrackCuesForPack(packId) {
  const pack = MUSIC_PACKS[packId];
  if (!pack) {
    console.log(`[PACK] No configuration for pack: ${packId}`);
    return;
  }

  console.log(`[PACK] Updating all track cues for pack: ${packId}`);
  let totalTracks = 0;

  // Iterate ALL rounds that have tracks
  Object.keys(pack.rounds).forEach((roundKey) => {
    const round = parseInt(roundKey);
    const tracks = pack.rounds[round] || [];
    if (tracks.length === 0) return;

    tracks.forEach((trackConfig, index) => {
      const cueNumber = getTrackCueNumber(round, index);
      if (!cueNumber) return;

      const fullFilePath = path.join(CONFIG.TRACK_BASE_PATH, trackConfig.fileName);

      console.log(`[PACK]   ${cueNumber}: File: ${fullFilePath}`);
      sendOSCToBridge(`/cue/${cueNumber}/fileTarget`, fullFilePath);

      console.log(`[PACK]   ${cueNumber}: Name: ${trackConfig.cueName}`);
      sendOSCToBridge(`/cue/${cueNumber}/name`, trackConfig.cueName);

      totalTracks++;
    });
  });

  console.log(`[PACK] Sent updates for ${totalTracks} track cues (T1-T${totalTracks})`);
}

// =============================================================================
// Express + Socket.IO
// =============================================================================
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Full state
app.get("/api/state", (req, res) => {
  res.json({
    ...gameState,
    currentRoundInfo: ROUNDS[gameState.currentRound],
    currentPackInfo: MUSIC_PACKS[packSettings.currentPack]
      ? { id: packSettings.currentPack, name: MUSIC_PACKS[packSettings.currentPack].name, description: MUSIC_PACKS[packSettings.currentPack].description }
      : null,
  });
});

// Rounds
app.get("/api/rounds", (req, res) => {
  res.json(ROUNDS);
});

// --- Score endpoints ---
app.post("/api/score/add", (req, res) => {
  const points = parseInt(req.body.points) || 1;
  const state = addScore(points, "api");
  io.emit("stateUpdate", buildStatePayload());
  io.emit("scoreChanged", { score: state.score, delta: points });
  res.json({ success: true, score: state.score });
});

app.post("/api/score/subtract", (req, res) => {
  const points = parseInt(req.body.points) || 1;
  const state = subtractScore(points, "api");
  io.emit("stateUpdate", buildStatePayload());
  io.emit("scoreChanged", { score: state.score, delta: -points });
  res.json({ success: true, score: state.score });
});

app.post("/api/score/set", (req, res) => {
  const value = parseInt(req.body.value);
  if (isNaN(value)) return res.status(400).json({ success: false, message: "Invalid value" });
  const state = setScore(value, "api");
  io.emit("stateUpdate", buildStatePayload());
  io.emit("scoreChanged", { score: state.score, delta: 0 });
  res.json({ success: true, score: state.score });
});

app.post("/api/score/reset", (req, res) => {
  const state = resetScore("api");
  io.emit("stateUpdate", buildStatePayload());
  io.emit("scoreChanged", { score: 0, delta: 0 });
  res.json({ success: true, score: 0 });
});

// --- Round endpoints ---
app.post("/api/round/next", (req, res) => {
  const state = advanceRound("api");
  io.emit("stateUpdate", buildStatePayload());
  io.emit("roundChanged", { round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
  res.json({ success: true, round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
});

app.post("/api/round/previous", (req, res) => {
  const state = previousRound("api");
  io.emit("stateUpdate", buildStatePayload());
  io.emit("roundChanged", { round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
  res.json({ success: true, round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
});

app.post("/api/round/set", (req, res) => {
  const round = parseInt(req.body.round);
  if (isNaN(round) || round < 0 || round >= ROUNDS.length) {
    return res.status(400).json({ success: false, message: "Invalid round number" });
  }
  const state = setRound(round, "api");
  io.emit("stateUpdate", buildStatePayload());
  io.emit("roundChanged", { round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
  res.json({ success: true, round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
});

// --- Benchmark endpoints ---
app.post("/api/benchmark/set", (req, res) => {
  const value = parseInt(req.body.value);
  if (isNaN(value)) return res.status(400).json({ success: false, message: "Invalid value" });
  const state = setBenchmark(value, "api");
  io.emit("stateUpdate", buildStatePayload());
  res.json({ success: true, benchmark: state.benchmark });
});

app.get("/api/benchmark-history", (req, res) => {
  res.json(benchmarkHistory);
});

// --- Track endpoints ---
app.post("/api/track/play/:number", (req, res) => {
  const trackNumber = parseInt(req.params.number);
  const result = playTrack(trackNumber, "api");
  if (result) {
    io.emit("stateUpdate", buildStatePayload());
    io.emit("trackPlaying", result);
    res.json({ success: true, ...result });
  } else {
    res.status(400).json({ success: false, message: "Invalid track number" });
  }
});

app.post("/api/track/stop", (req, res) => {
  stopTrack("api");
  io.emit("stateUpdate", buildStatePayload());
  io.emit("trackStopped", {});
  res.json({ success: true });
});

app.post("/api/track/next", (req, res) => {
  const result = playNextTrack("api");
  if (result) {
    io.emit("stateUpdate", buildStatePayload());
    io.emit("trackPlaying", result);
    res.json({ success: true, ...result });
  } else {
    res.status(400).json({ success: false, message: "No more tracks in this round" });
  }
});

// --- Show control endpoints ---
app.post("/api/start", (req, res) => {
  const state = startShow("api");
  io.emit("stateUpdate", buildStatePayload());
  res.json({ success: true, isActive: state.isActive });
});

app.post("/api/stop", (req, res) => {
  const state = stopShow("api");
  io.emit("stateUpdate", buildStatePayload());
  res.json({ success: true, isActive: state.isActive });
});

app.post("/api/reset", (req, res) => {
  const state = resetGame("api");
  io.emit("stateUpdate", buildStatePayload());
  io.emit("gameReset", {});
  res.json({ success: true, state: buildStatePayload() });
});

// --- Reveal endpoints ---
app.post("/api/benchmark/reveal", (req, res) => {
  triggerQLabCue("SC_BENCHMARK");
  io.emit("benchmarkReveal", { benchmark: gameState.benchmark });
  logActivity("benchmark_reveal", `Benchmark revealed: ${gameState.benchmark}`, "api");
  res.json({ success: true, benchmark: gameState.benchmark });
});

app.post("/api/score/reveal", (req, res) => {
  triggerQLabCue("SC_SCORE");
  io.emit("scoreReveal", { score: gameState.score });
  logActivity("score_reveal", `Score revealed: ${gameState.score}`, "api");
  res.json({ success: true, score: gameState.score });
});

// --- Pack settings endpoints ---
app.get("/api/pack-settings", (req, res) => {
  res.json(packSettings);
});

app.get("/api/packs", (req, res) => {
  const packs = Object.values(MUSIC_PACKS).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }));
  res.json(packs);
});

app.post("/api/pack-settings", (req, res) => {
  const { currentPack } = req.body;
  if (!currentPack || !MUSIC_PACKS[currentPack]) {
    return res.status(400).json({ success: false, message: "Invalid pack selection" });
  }

  const oldPack = packSettings.currentPack;
  packSettings = {
    currentPack,
    lastChanged: new Date().toISOString(),
  };
  savePackSettings();
  updateTrackCuesForPack(currentPack);
  armDisarmPackCues(currentPack);
  io.emit("packChanged", { packId: currentPack, packInfo: { id: currentPack, name: MUSIC_PACKS[currentPack].name } });
  logActivity("pack_change", `Pack changed from ${oldPack} to ${currentPack}`, "api");
  res.json({ success: true, ...packSettings });
});

// --- Activity log endpoints ---
const MAX_ACTIVITY_LIMIT = 1000;

app.get("/api/activity", (req, res) => {
  const { type = "all", days = "60", limit } = req.query;
  let activities = getActivityLog(type, parseInt(days));
  if (limit) {
    const parsedLimit = Math.min(Math.max(parseInt(limit), 1), MAX_ACTIVITY_LIMIT);
    activities = activities.slice(-parsedLimit);
  }
  res.json(activities);
});

app.post("/api/activity/reset", (req, res) => {
  const { password } = req.body;
  if (password !== CONFIG.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Invalid password" });
  }
  activityLog = [];
  saveActivityLog();
  logActivity("system", "Activity log reset by administrator", "api");
  res.json({ success: true, message: "Activity log reset successfully" });
});

// Build full state payload for Socket.IO broadcasts
function buildStatePayload() {
  return {
    ...gameState,
    currentRoundInfo: ROUNDS[gameState.currentRound],
    currentPackInfo: MUSIC_PACKS[packSettings.currentPack]
      ? { id: packSettings.currentPack, name: MUSIC_PACKS[packSettings.currentPack].name, description: MUSIC_PACKS[packSettings.currentPack].description }
      : null,
  };
}

// Socket.IO connections
io.on("connection", (socket) => {
  console.log("[WEB] Dashboard client connected");
  socket.emit("stateUpdate", buildStatePayload());

  socket.on("addScore", (points) => {
    const p = parseInt(points) || 1;
    const state = addScore(p, "socket");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("scoreChanged", { score: state.score, delta: p });
  });

  socket.on("subtractScore", (points) => {
    const p = parseInt(points) || 1;
    const state = subtractScore(p, "socket");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("scoreChanged", { score: state.score, delta: -p });
  });

  socket.on("nextRound", () => {
    const state = advanceRound("socket");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("roundChanged", { round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
  });

  socket.on("previousRound", () => {
    const state = previousRound("socket");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("roundChanged", { round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
  });

  socket.on("setRound", (roundNumber) => {
    const r = parseInt(roundNumber);
    if (r >= 0 && r < ROUNDS.length) {
      const state = setRound(r, "socket");
      io.emit("stateUpdate", buildStatePayload());
      io.emit("roundChanged", { round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
    }
  });

  socket.on("reset", () => {
    const state = resetGame("socket");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("gameReset", {});
  });
});

// =============================================================================
// OSC - Receive from StreamDeck / Bitfocus Companion
// =============================================================================
function parseOscAddress(buf) {
  let end = buf.indexOf(0);
  if (end === -1) end = buf.length;
  return buf.toString("utf8", 0, end);
}

function parseOscArgs(buf) {
  // Find the type tag string after the address
  const addrEnd = buf.indexOf(0);
  if (addrEnd === -1) return [];

  // Skip past address string (padded to 4-byte boundary)
  let offset = addrEnd + 1;
  offset += (4 - (offset % 4)) % 4;

  // Read type tag string
  if (offset >= buf.length || buf[offset] !== 0x2c) return []; // ',' char
  const typeEnd = buf.indexOf(0, offset);
  if (typeEnd === -1) return [];
  const typeTag = buf.toString("utf8", offset + 1, typeEnd);

  // Skip past type tag (padded to 4-byte boundary)
  offset = typeEnd + 1;
  offset += (4 - (offset % 4)) % 4;

  const args = [];
  for (const t of typeTag) {
    if (t === "f" && offset + 4 <= buf.length) {
      args.push(buf.readFloatBE(offset));
      offset += 4;
    } else if (t === "i" && offset + 4 <= buf.length) {
      args.push(buf.readInt32BE(offset));
      offset += 4;
    } else if (t === "s") {
      const strEnd = buf.indexOf(0, offset);
      if (strEnd !== -1) {
        args.push(buf.toString("utf8", offset, strEnd));
        offset = strEnd + 1;
        offset += (4 - (offset % 4)) % 4;
      }
    }
  }
  return args;
}

const udpServer = dgram.createSocket({ type: "udp4", reuseAddr: true });

function handleOscMessage(address, args) {
  // === Score commands ===

  // Quick add: /sound-check/score/add20, /sound-check/score/add50, /sound-check/score/add100
  const quickAddMatch = address.match(/^\/sound-check\/score\/add(\d+)$/);
  if (quickAddMatch) {
    const points = parseInt(quickAddMatch[1]);
    const state = addScore(points, "osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("scoreChanged", { score: state.score, delta: points });
    return;
  }

  // Quick subtract: /sound-check/score/subtract20, /sound-check/score/subtract50, /sound-check/score/subtract100
  const quickSubMatch = address.match(/^\/sound-check\/score\/subtract(\d+)$/);
  if (quickSubMatch) {
    const points = parseInt(quickSubMatch[1]);
    const state = subtractScore(points, "osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("scoreChanged", { score: state.score, delta: -points });
    return;
  }

  // Add with path arg: /sound-check/score/add/{points}
  const scoreAddPathMatch = address.match(/^\/sound-check\/score\/add\/(\d+)$/);
  if (scoreAddPathMatch) {
    const points = parseInt(scoreAddPathMatch[1]);
    const state = addScore(points, "osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("scoreChanged", { score: state.score, delta: points });
    return;
  }

  // Subtract with path arg: /sound-check/score/subtract/{points}
  const scoreSubPathMatch = address.match(/^\/sound-check\/score\/subtract\/(\d+)$/);
  if (scoreSubPathMatch) {
    const points = parseInt(scoreSubPathMatch[1]);
    const state = subtractScore(points, "osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("scoreChanged", { score: state.score, delta: -points });
    return;
  }

  // Score add with OSC float argument
  if (address === "/sound-check/score/add") {
    const points = args && args.length > 0 ? Math.round(args[0]) : 1;
    const state = addScore(points, "osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("scoreChanged", { score: state.score, delta: points });
    return;
  }

  // Score subtract with OSC float argument
  if (address === "/sound-check/score/subtract") {
    const points = args && args.length > 0 ? Math.round(args[0]) : 1;
    const state = subtractScore(points, "osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("scoreChanged", { score: state.score, delta: -points });
    return;
  }

  // Set score: /sound-check/score/set/{value}
  const scoreSetMatch = address.match(/^\/sound-check\/score\/set\/(\d+)$/);
  if (scoreSetMatch) {
    const value = parseInt(scoreSetMatch[1]);
    const state = setScore(value, "osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("scoreChanged", { score: state.score, delta: 0 });
    return;
  }

  // Score set with OSC argument
  if (address === "/sound-check/score/set") {
    const value = args && args.length > 0 ? Math.round(args[0]) : 0;
    const state = setScore(value, "osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("scoreChanged", { score: state.score, delta: 0 });
    return;
  }

  // Score reset
  if (address === "/sound-check/score/reset") {
    const state = resetScore("osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("scoreChanged", { score: 0, delta: 0 });
    return;
  }

  // === Round commands ===
  if (address === "/sound-check/round/next") {
    const state = advanceRound("osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("roundChanged", { round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
    return;
  }

  if (address === "/sound-check/round/previous") {
    const state = previousRound("osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("roundChanged", { round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
    return;
  }

  const roundSetMatch = address.match(/^\/sound-check\/round\/set\/(\d+)$/);
  if (roundSetMatch) {
    const round = parseInt(roundSetMatch[1]);
    const state = setRound(round, "osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("roundChanged", { round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
    return;
  }

  if (address === "/sound-check/round/set") {
    const round = args && args.length > 0 ? Math.round(args[0]) : 0;
    const state = setRound(round, "osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("roundChanged", { round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
    return;
  }

  // Individual round by number: /sound-check/round/1, /sound-check/round/2, etc.
  const roundDirectMatch = address.match(/^\/sound-check\/round\/(\d+)$/);
  if (roundDirectMatch) {
    const round = parseInt(roundDirectMatch[1]);
    const state = setRound(round, "osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("roundChanged", { round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
    return;
  }

  // Individual round by name: /sound-check/round/shout, /sound-check/round/opening, etc.
  const roundByName = ROUNDS.find((r) => address === `/sound-check/round/${r.name.toLowerCase()}`);
  if (roundByName) {
    const state = setRound(roundByName.id, "osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("roundChanged", { round: state.currentRound, roundInfo: ROUNDS[state.currentRound] });
    return;
  }

  // === Track commands ===
  const trackPlayMatch = address.match(/^\/sound-check\/track\/play\/(\d+)$/);
  if (trackPlayMatch) {
    const trackNum = parseInt(trackPlayMatch[1]);
    const result = playTrack(trackNum, "osc");
    if (result) {
      io.emit("stateUpdate", buildStatePayload());
      io.emit("trackPlaying", result);
    }
    return;
  }

  if (address === "/sound-check/track/play") {
    const trackNum = args && args.length > 0 ? Math.round(args[0]) : 1;
    const result = playTrack(trackNum, "osc");
    if (result) {
      io.emit("stateUpdate", buildStatePayload());
      io.emit("trackPlaying", result);
    }
    return;
  }

  if (address === "/sound-check/track/stop") {
    stopTrack("osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("trackStopped", {});
    return;
  }

  if (address === "/sound-check/track/next") {
    const result = playNextTrack("osc");
    if (result) {
      io.emit("stateUpdate", buildStatePayload());
      io.emit("trackPlaying", result);
    }
    return;
  }

  // === Benchmark / Reveal commands ===
  if (address === "/sound-check/benchmark/reveal") {
    triggerQLabCue("SC_BENCHMARK");
    io.emit("benchmarkReveal", { benchmark: gameState.benchmark });
    logActivity("benchmark_reveal", `Benchmark revealed: ${gameState.benchmark}`, "osc");
    return;
  }

  const benchmarkSetMatch = address.match(/^\/sound-check\/benchmark\/set\/(\d+)$/);
  if (benchmarkSetMatch) {
    const value = parseInt(benchmarkSetMatch[1]);
    const state = setBenchmark(value, "osc");
    io.emit("stateUpdate", buildStatePayload());
    return;
  }

  if (address === "/sound-check/benchmark/set") {
    const value = args && args.length > 0 ? Math.round(args[0]) : 0;
    const state = setBenchmark(value, "osc");
    io.emit("stateUpdate", buildStatePayload());
    return;
  }

  if (address === "/sound-check/score/reveal") {
    triggerQLabCue("SC_SCORE");
    io.emit("scoreReveal", { score: gameState.score });
    logActivity("score_reveal", `Score revealed: ${gameState.score}`, "osc");
    return;
  }

  // === Game control commands ===
  if (address === "/sound-check/reset") {
    const state = resetGame("osc");
    io.emit("stateUpdate", buildStatePayload());
    io.emit("gameReset", {});
    return;
  }

  if (address === "/sound-check/start") {
    const state = startShow("osc");
    io.emit("stateUpdate", buildStatePayload());
    return;
  }

  if (address === "/sound-check/stop") {
    const state = stopShow("osc");
    io.emit("stateUpdate", buildStatePayload());
    return;
  }

  console.log(`[OSC] Unhandled address: ${address}`);
}

udpServer.on("message", (msg, rinfo) => {
  console.log(`[OSC RAW] Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
  try {
    const oscMsg = osc.readPacket(msg, { metadata: true });
    console.log(`[OSC IN] ${oscMsg.address}`, oscMsg.args || [], `from ${rinfo.address}:${rinfo.port}`);
    const args = oscMsg.args ? oscMsg.args.map((a) => (a.value !== undefined ? a.value : a)) : [];
    handleOscMessage(oscMsg.address.trim(), args);
  } catch (err) {
    console.log(`[OSC IN RAW] ${msg.length} bytes from ${rinfo.address}:${rinfo.port} (parse error: ${err.message})`);
    const addr = parseOscAddress(msg);
    const args = parseOscArgs(msg);
    console.log(`[OSC IN RAW] Extracted address: "${addr}", args:`, args);
    handleOscMessage(addr.trim(), args);
  }
});

udpServer.on("listening", () => {
  const addr = udpServer.address();
  console.log(`[OSC] UDP socket listening on ${addr.address}:${addr.port}`);
});

udpServer.on("error", (err) => {
  console.error("[OSC] UDP error:", err);
});

udpServer.bind(CONFIG.OSC_LISTEN_PORT, "0.0.0.0");

// =============================================================================
// OSC - Send to QLab via HTTP Bridge
// =============================================================================
console.log(`[QLAB] Will send OSC via bridge at ${CONFIG.BRIDGE_URL}`);

function sendOSCToBridge(address, value) {
  const payload = JSON.stringify({ address, value });
  const bridgeUrl = new URL("/send", CONFIG.BRIDGE_URL);
  const options = {
    hostname: bridgeUrl.hostname,
    port: bridgeUrl.port,
    path: bridgeUrl.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  const req = http.request(options, (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      console.log(`[QLAB OUT] ${address} → ${value} (bridge: ${res.statusCode})`);
    });
  });

  req.on("error", (err) => {
    console.error(`[QLAB OUT] Bridge error: ${err.message}`);
  });

  req.write(payload);
  req.end();
}

function updateQLabScoreText(score) {
  sendOSCToBridge("/cue/SCORE/text", String(score));
}

function updateQLabBenchmarkText(benchmark) {
  sendOSCToBridge("/cue/BENCHMARK/text", String(benchmark));
}

function triggerQLabCue(cueName) {
  sendOSCToBridge(`/cue/${cueName}/start`, 0);
}

function stopQLabCue(cueName) {
  sendOSCToBridge(`/cue/${cueName}/stop`, 0);
}

// Arm/disarm QLab cues based on selected pack
function armDisarmPackCues(selectedPackId) {
  const allPackIds = Object.keys(PACK_QLAB_CUES);

  allPackIds.forEach((packId) => {
    const qlabCueName = PACK_QLAB_CUES[packId];
    if (packId === selectedPackId) {
      // Arm the selected pack: armed = 1
      sendOSCToBridge(`/cue/${qlabCueName}/armed`, 1);
      console.log(`[QLAB] Armed cue: ${qlabCueName}`);
    } else {
      // Disarm the other packs: armed = 0
      sendOSCToBridge(`/cue/${qlabCueName}/armed`, 0);
      console.log(`[QLAB] Disarmed cue: ${qlabCueName}`);
    }
  });
}

// =============================================================================
// Start Server
// =============================================================================
server.listen(CONFIG.WEB_PORT, "0.0.0.0", () => {
  console.log(`[WEB] Dashboard running at http://localhost:${CONFIG.WEB_PORT}`);
  console.log(`[OSC] Listening for commands on port ${CONFIG.OSC_LISTEN_PORT}`);
  console.log(`[PACK] Current pack: ${packSettings.currentPack}`);
  console.log(`[GAME] Current score: ${gameState.score}, benchmark: ${gameState.benchmark}`);

  // Sync QLab on startup
  armDisarmPackCues(packSettings.currentPack);
  updateQLabScoreText(gameState.score);
  updateQLabBenchmarkText(gameState.benchmark);

  console.log("=== Sound Check Ready ===");
});
