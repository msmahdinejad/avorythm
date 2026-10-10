#!/usr/bin/env bash
# Narration (already generated) -> tempo -> VO edit -> word alignment -> fitted timeline -> score/foley -> mix.
#   bash video/films/tutorial/tools/build_audio.sh de [fixed-tempo]
set -euo pipefail
L="$1"
T="$(cd "$(dirname "$0")" && pwd)"
B="$T/../../../build/tutorial2/$L"
if [ "${2:-}" != "" ]; then echo "{\"*\": $2}" > "$B/tempo.json"; else python -I "$T/autotempo.py" --lang "$L"; fi
python -I "$T/prep.py" --lang "$L" | tail -1
python "$T/align.py" --lang "$L" 2>&1 | grep -E "^  l|align.json"
python -I "$T/fit.py" --lang "$L"
python -I "$T/score.py" --lang "$L"
python -I "$T/mix.py" --lang "$L"
