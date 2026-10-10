#!/usr/bin/env bash
# Rebuild audio + picture + delivery for the given languages, sequentially (one render at a time, 8 workers).
#   bash video/films/demo/tools/build_all.sh en fa ru ...
cd "$(dirname "$0")/../../../.."   # repository root
for L in "$@"; do
  LOG=video/build/demo/$L/build.log; mkdir -p video/build/demo/$L
  {
    echo "== $L $(date +%T) audio"
    python -I video/films/demo/tools/score.py --lang $L && python -I video/films/demo/tools/mix.py --lang $L || { echo "AUDIO FAILED"; continue; }
    echo "== $L $(date +%T) picture"
    node video/films/demo/tools/render.mjs --lang $L --video --workers 8 --fresh || { echo "RENDER FAILED"; continue; }
    node video/films/demo/tools/render.mjs --lang $L --mux || { echo "MUX FAILED"; continue; }
    echo "== $L $(date +%T) done"
  } > $LOG 2>&1
  grep -E "^==|FAILED|mix.wav|web " $LOG | tail -4
done
