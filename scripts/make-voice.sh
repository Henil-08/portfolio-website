#!/usr/bin/env bash
# Renders the team-radio voice lines into public/sfx.
# Uses Groq's Orpheus TTS when GROQ_API_KEY is set and the model terms are accepted,
# otherwise falls back to the macOS "Daniel" voice. Every line goes through the same
# radio chain: band-limited, compressed, a touch of overdrive and a static bed.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/sfx
TMP=$(mktemp -d)
[ -f .env.local ] && export $(grep -E '^GROQ_API_KEY=' .env.local | xargs)

line() { # name, text
  local name=$1 text=$2 raw="$TMP/$1.wav"
  if [ -n "${GROQ_API_KEY:-}" ] && curl -sf -m 60 -o "$raw" https://api.groq.com/openai/v1/audio/speech \
      -H "authorization: Bearer $GROQ_API_KEY" -H 'content-type: application/json' \
      -d "{\"model\":\"canopylabs/orpheus-v1-english\",\"voice\":\"${VOICE:-troy}\",\"input\":\"$text\",\"response_format\":\"wav\"}"; then
    echo "$name: orpheus"
  else
    say -v Daniel -r 182 -o "$TMP/$name.aiff" "$text"
    ffmpeg -loglevel error -y -i "$TMP/$name.aiff" "$raw"
    echo "$name: macOS Daniel"
  fi
  ffmpeg -loglevel error -y -i "$raw" -f lavfi -i "anoisesrc=color=pink:amplitude=0.035:sample_rate=22050" -filter_complex \
    "[0:a]aresample=22050,highpass=f=380,lowpass=f=3300,acompressor=threshold=-20dB:ratio=7:attack=4:release=80,volume=2.4,asoftclip=type=atan,apad=pad_dur=0.25[v];\
     [1:a]highpass=f=500,lowpass=f=4000[n];[v][n]amix=inputs=2:duration=first:weights=1 0.5,volume=1.6" \
    -ac 1 -b:a 64k "$OUT/$name.mp3"
}

line ask "Radio check. Hey Claude... who's Henil?"
line go "Copy that. Lights out, whenever you're ready."
rm -rf "$TMP"
