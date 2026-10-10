#!/usr/bin/env bash
# Render queue: for each language (one render at a time, 8 workers):
#   align -> fit -> score -> mix -> render (JPEG frames, 60 fps) -> deliver -> qc (qc runs in the background).
#   bash video/films/tutorial/tools/queue.sh fa de es ...
# A failed render is resumed (cached segments kept) up to two more times.
set -uo pipefail
T="$(cd "$(dirname "$0")" && pwd)"
B="$T/../../../build/tutorial2"
for L in "$@"; do
  until [ -f "$B/$L/vo/.ready" ]; do sleep 20; done
  echo "[$(date +%H:%M:%S)] $L: audio"
  python "$T/align.py" --lang "$L" > "$B/$L/align.log" 2>&1 || { echo "$L: align FAILED"; continue; }
  python -I "$T/fit.py" --lang "$L" | head -1
  python -I "$T/score.py" --lang "$L" > /dev/null && python -I "$T/mix.py" --lang "$L" || { echo "$L: audio FAILED"; continue; }
  echo "[$(date +%H:%M:%S)] $L: render"
  ok=0
  for attempt in 1 2 3; do
    if [ "$attempt" = 1 ]; then fresh="--fresh"; else fresh=""; echo "[$(date +%H:%M:%S)] $L: render retry $attempt"; fi
    if node "$T/render.mjs" --lang "$L" --video --workers "${WORKERS:-6}" $fresh --format jpeg > "$B/$L/render.log" 2>&1; then ok=1; break; fi
    tail -3 "$B/$L/render.log"
    sleep 5
  done
  [ "$ok" = 1 ] || { echo "$L: render FAILED"; continue; }
  echo "[$(date +%H:%M:%S)] $L: deliver"
  ( python -I "$T/deliver.py" --lang "$L" > "$B/$L/deliver.log" 2>&1 || echo "$L: deliver FAILED"
    python "$T/qc.py" --lang "$L" > "$B/$L/qc.log" 2>&1; grep -E "^$L:|Error" "$B/$L/qc.log" ) &
done
wait
echo "queue done: $*"
