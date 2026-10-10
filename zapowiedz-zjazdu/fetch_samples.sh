#!/bin/sh
# Pobiera sample orkiestrowe FluidR3_GM (licencja MIT) do katalogu samples/
set -e
cd "$(dirname "$0")"
python3 - <<'PY' > samples_list.txt
names=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
def nm(m): return f"{names[m%12]}{m//12-1}"
inst={'acoustic_grand_piano':(36,88),'string_ensemble_1':(28,88),'choir_aahs':(48,81),'brass_section':(45,84),
      'french_horn':(41,77),'timpani':(36,57),'taiko_drum':(36,62),'contrabass':(28,52),'reverse_cymbal':(60,60),
      'orchestral_harp':(50,91),'glockenspiel':(72,100)}
for i,(a,b) in inst.items():
    for m in range(a,b+1):
        print(i, nm(m), m)
PY
B=https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM
while read i n m; do
  mkdir -p "samples/$i"
  [ -s "samples/$i/$m.mp3" ] || curl -sS --retry 3 -o "samples/$i/$m.mp3" "$B/$i-mp3/$n.mp3"
done < samples_list.txt
rm -f samples_list.txt
