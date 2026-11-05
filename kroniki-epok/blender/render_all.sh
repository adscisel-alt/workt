#!/usr/bin/env bash
# Pełny potok: modele zastępcze -> render sprite'ów -> (opcjonalnie) paleta AoE2.
# Użycie:
#   ./render_all.sh                 # Blender z PATH (polecenie `blender`)
#   BLENDER=/opt/blender/blender ./render_all.sh
#   PY_BPY=python ./render_all.sh   # Python z modułem bpy (pip install bpy)
#   ENGINE=eevee SAMPLES=16 ./render_all.sh   # szybki podgląd
set -euo pipefail
cd "$(dirname "$0")"
ENGINE="${ENGINE:-cycles}"
SAMPLES="${SAMPLES:-32}"
OUT="${OUT:-../godot/assets/sprites}"
MODELS="${MODELS:-osadnik milicja dom centrum koszary mlyn tartak kopalnia farma drzewo krzaki zloto kamien}"

run() {  # run skrypt.py argumenty...
  if [ -n "${PY_BPY:-}" ]; then
    "$PY_BPY" "$@"
  else
    "${BLENDER:-blender}" -b -P "$1" -- "${@:2}"
  fi
}

echo ">> modele zastępcze"
run build_placeholders.py --out models --only $MODELS
echo ">> render ($ENGINE, $SAMPLES próbek)"
for m in $MODELS; do
  run render_sprites.py --model "models/$m.blend" --out "$OUT" --engine "$ENGINE" --samples "$SAMPLES"
done
if [ "${PALETTE:-0}" = "1" ]; then
  echo ">> paleta AoE2"
  python3 palette_aoe.py "$OUT" ${OUTLINE:+--outline}
fi
echo ">> gotowe: $OUT"
