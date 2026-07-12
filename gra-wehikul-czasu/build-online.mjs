// Składa grę w jeden samodzielny plik HTML (wszystko wbudowane w środku).
// Dzięki temu grę można otworzyć z jednego pliku lub opublikować jako stronę.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

const css = read('styles.css');
const three = read('vendor/three.min.js');
const pytania = read('pytania.js');
const gra = read('gra.js');

const html = `<title>Wehikuł czasu — podróż przez dzieje Polski</title>
<style>
${css}
</style>

<canvas id="scena"></canvas>

<div id="ui">
  <div id="hud" style="display:none">
    <div id="tytul-gry">⏳ Wehikuł czasu<small>podróż przez dzieje Polski</small></div>
    <div id="druzyny-hud"></div>
    <button class="przycisk-ikona" id="btn-pomoc" title="Zasady gry">?</button>
    <button class="przycisk-ikona" id="btn-restart" title="Zagraj od nowa">↻</button>
  </div>

  <div id="panel-dolny" style="display:none">
    <div id="komunikat">Witajcie, podróżnicy w czasie!</div>
    <button class="przycisk-glowny" id="btn-kostka"><span class="kostka-emoji">🎲</span>Rzuć kostką</button>
  </div>

  <div id="podpowiedz-obrot">Przeciągnij palcem / myszą, aby obrócić planszę. Kółkiem myszy przybliżasz.</div>

  <div id="zaslona"><div class="karta" id="karta"></div></div>

  <div id="ekran-start">
    <div class="pudlo-start">
      <h1><span class="em">⏳🚀</span>Wehikuł czasu</h1>
      <div class="podtytul">Podróż przez dzieje Polski — od legend po Mikołaja Kopernika</div>
      <div class="info-start">
        Podróżujecie w drużynach przez <b>6 krain-epok</b>. Na polach losujecie karty:
        <b>pytania</b>, <b>wydarzenia</b> i <b>wyzwania</b>. Aby dotrzeć do mety,
        zbierzcie po drodze <b>3 żetony czasu</b> — inaczej wehikuł nie wyląduje w teraźniejszości!
      </div>
      <div class="pole-grupa">
        <label>Ile drużyn gra?</label>
        <div class="liczba-druzyn" id="wybor-liczby">
          <button class="chip" data-n="2">2</button>
          <button class="chip wybrany" data-n="3">3</button>
          <button class="chip" data-n="4">4</button>
        </div>
      </div>
      <div class="pole-grupa" id="wiersze-druzyn"></div>
      <button class="przycisk-glowny" id="btn-start" style="width:100%">🚀 Startujemy!</button>
    </div>
  </div>

  <div id="ekran-koniec">
    <div class="pudlo-koniec">
      <div class="puchar">🏆</div>
      <h2>Koniec podróży!</h2>
      <div class="zwyciezca" id="tekst-zwyciezca"></div>
      <p id="tekst-koniec"></p>
      <button class="przycisk-glowny" id="btn-jeszcze-raz" style="width:100%">↻ Zagrajcie jeszcze raz</button>
    </div>
  </div>
</div>

<script>
${three}
</script>
<script>
${pytania}
</script>
<script>
${gra}
</script>
`;

fs.writeFileSync(path.join(dir, 'wehikul-czasu.html'), html);
console.log('Zapisano wehikul-czasu.html (' + Math.round(html.length / 1024) + ' KB)');
