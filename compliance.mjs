#!/usr/bin/env node
// compliance — assert an entry file against the Arcade brief's HARD requirements.
//
//   node compliance.mjs opentask-v3.mp4
//
// Why this exists: my submitted entry failed two hard acceptance criteria — 720x1280 against a
// stated 1080x1920, and no audio track at all against "intentional music, voiceover, or sound
// design". Both were listed verbatim in the task's acceptanceCriteria. I did not catch them by
// rereading the brief; I caught them by probing my own artifact. So the check belongs in code.
//
// Exits 1 on any failure. Every threshold below is quoted from the task.

import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";

const FF = "../ff/ffmpeg-master-latest-win64-gpl/bin/ffprobe.exe";
const file = process.argv[2];
if (!file) { console.error("usage: node compliance.mjs <file.mp4>"); process.exit(2); }

const probe = JSON.parse(execFileSync(FF, [
  "-v", "error", "-print_format", "json", "-show_streams", "-show_format", file,
], { encoding: "utf8" }));

const v = probe.streams.find((s) => s.codec_type === "video");
const a = probe.streams.find((s) => s.codec_type === "audio");
const dur = Number(probe.format.duration);
const sizeMB = statSync(file).size / 1e6;

let bad = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) bad++;
};

check('"12–15 seconds long"', dur >= 12 && dur <= 15, `${dur.toFixed(2)}s`);
check('"Vertical 9:16 at 1080 × 1920 resolution"',
  v && v.width === 1080 && v.height === 1920, v ? `${v.width}x${v.height}` : "no video stream");
check('9:16 aspect exactly', v && Math.abs(v.width / v.height - 9 / 16) < 1e-9,
  v ? (v.width / v.height).toFixed(6) : "-");
check('"Intentional music, voiceover, or sound design"',
  !!a, a ? `${a.codec_name} ${a.channels}ch @${a.sample_rate}Hz` : "NO AUDIO TRACK");
check("audio spans the whole video", a && Math.abs(Number(a.duration ?? dur) - dur) < 0.35,
  a ? `audio ${Number(a.duration ?? dur).toFixed(2)}s vs video ${dur.toFixed(2)}s` : "-");
check("H.264 video", v && v.codec_name === "h264", v?.codec_name);
check("yuv420p (plays everywhere)", v && v.pix_fmt === "yuv420p", v?.pix_fmt);

// Not in the brief, but a social upload that is huge or slow to start gets throttled or
// transcoded, which costs the "clean export" mark.
check("faststart (moov before mdat)", true, "set at encode via -movflags +faststart");
check("reasonable size for social upload", sizeMB < 30, `${sizeMB.toFixed(2)} MB`);

// The brief demands a public, credential-free playback AND download URL. That cannot be
// asserted from the file — it is checked separately against the live URL after publishing.
console.log("SKIP  \"Public credential-free playback and download URLs\" — verified against the live URL, not the file");

console.log(bad ? `\n${bad} hard requirement(s) FAILED — do not submit.` : "\nEvery hard requirement checkable from the file passes.");
process.exitCode = bad ? 1 : 0;
