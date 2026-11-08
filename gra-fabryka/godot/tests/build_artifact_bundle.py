"""
Składa paczkę eksportu Web do hostingu z limitem rozmiaru pliku (np. artefakt Claude, 15 MB/plik):
dzieli index.wasm na części (*.wasm), zapisuje index.pck jako index.pck.wasm, wkleja index.js do strony
i dodaje loader, który skleja części w pamięci i przekierowuje pobranie .pck.

    python tests/build_artifact_bundle.py <katalog_eksportu_web> <katalog_wyjściowy>
"""
import json
import os
import sys

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
wasm = open(os.path.join(src, "index.wasm"), "rb").read()
CH = 13 * 1024 * 1024
parts = [wasm[i:i + CH] for i in range(0, len(wasm), CH)]
for i, p in enumerate(parts):
    open(os.path.join(out, f"index.part{i}.wasm"), "wb").write(p)
for f in ["index.audio.worklet.js", "index.audio.position.worklet.js", "index.icon.png", "index.png"]:
    open(os.path.join(out, f), "wb").write(open(os.path.join(src, f), "rb").read())
# plik danych gry (.pck) dostaje rozszerzenie .wasm, bo hosting serwuje tylko znane typy plików
open(os.path.join(out, "index.pck.wasm"), "wb").write(open(os.path.join(src, "index.pck"), "rb").read())
js = open(os.path.join(src, "index.js"), encoding="utf-8").read()
cfg = {"args": [], "canvasResizePolicy": 2, "emscriptenPoolSize": 8, "ensureCrossOriginIsolationHeaders": False,
       "executable": "index", "experimentalVK": False,
       "fileSizes": {"index.pck": os.path.getsize(os.path.join(src, "index.pck")), "index.wasm": len(wasm)},
       "focusCanvas": True, "gdextensionLibs": [], "godotPoolSize": 4}
html = f'''<title>Fabryka 1892</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Układ: jeden pełnoekranowy canvas gry, nad nim ekran ładowania. */
:root {{ --bg: #15110d; --fg: #efe6d3; --muted: #b9a98c; --accent: #c98a3d; --bar: #2b231b; color-scheme: dark; }}
html, body {{ height: 100%; }}
body {{ margin: 0; background: var(--bg); color: var(--fg); overflow: hidden; touch-action: none; font-family: Georgia, "Times New Roman", serif; }}
#canvas {{ display: block; width: 100%; height: 100%; outline: none; }}
#status {{ position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: var(--bg);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); text-align: center; }}
#status h1 {{ font-size: clamp(22px, 4vw, 34px); margin: 0; font-weight: normal; letter-spacing: 0.02em; text-wrap: balance; }}
#status p {{ margin: 0; color: var(--muted); max-width: 60ch; line-height: 1.45; font-size: 15px; }}
#status-progress {{ width: min(420px, 80vw); height: 8px; appearance: none; border: 0; background: var(--bar); border-radius: 4px; overflow: hidden; }}
#status-progress::-webkit-progress-bar {{ background: var(--bar); }}
#status-progress::-webkit-progress-value {{ background: var(--accent); }}
#status-notice {{ display: none; color: #f0b7a0; white-space: pre-wrap; font-family: ui-monospace, Menlo, monospace; font-size: 13px; }}
</style>
<canvas id="canvas" tabindex="0">Przeglądarka nie obsługuje elementu canvas.</canvas>
<div id="status">
  <h1>Fabryka 1892 – Rodzina Walczaków</h1>
  <p>Wersja do podejrzenia. Ładowanie silnika (ok. 45 MB) może potrwać chwilę przy pierwszym otwarciu. Po starcie: kliknij Sima, potem przedmiot; prawy przycisk myszy obraca kamerę, kółko przybliża, Spacja pauzuje, H opuszcza ściany.</p>
  <progress id="status-progress"></progress>
  <div id="status-notice"></div>
</div>
<script>
// Silnik WebAssembly jest podzielony na części (limit rozmiaru pojedynczego pliku).
// Przed startem Godota podmieniamy fetch tak, by "index.wasm" składał się z części w pamięci.
(function () {{
  const PARTS = {len(parts)};
  const origFetch = window.fetch.bind(window);
  let wasmPromise = null;
  function assemble() {{
    if (!wasmPromise) {{
      wasmPromise = Promise.all(Array.from({{length: PARTS}}, (_, i) => origFetch('index.part' + i + '.wasm').then(r => {{
        if (!r.ok) throw new Error('Nie udało się pobrać części silnika ' + i);
        return r.arrayBuffer();
      }}))).then(bufs => new Blob(bufs, {{type: 'application/wasm'}}));
    }}
    return wasmPromise;
  }}
  window.fetch = function (input, init) {{
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (/index\\.wasm(\\?.*)?$/.test(url)) {{
      return assemble().then(blob => new Response(blob, {{status: 200, headers: {{'Content-Type': 'application/wasm', 'Content-Length': String(blob.size)}}}}));
    }}
    if (/index\\.pck(\\?.*)?$/.test(url)) {{
      return origFetch('index.pck.wasm', init);
    }}
    return origFetch(input, init);
  }};
}})();
</script>
<script>
{js}
</script>
<script>
const GODOT_CONFIG = {json.dumps(cfg)};
const GODOT_THREADS_ENABLED = false;
const engine = new Engine(GODOT_CONFIG);
(function () {{
  const statusOverlay = document.getElementById('status');
  const statusProgress = document.getElementById('status-progress');
  const statusNotice = document.getElementById('status-notice');
  function fail(err) {{
    console.error(err);
    statusNotice.style.display = 'block';
    statusNotice.textContent = (err && err.message) ? err.message : String(err);
    statusProgress.style.display = 'none';
  }}
  const missing = Engine.getMissingFeatures({{threads: GODOT_THREADS_ENABLED}});
  if (missing.length !== 0) {{ fail('Przeglądarka nie spełnia wymagań:\\n' + missing.join('\\n')); return; }}
  engine.startGame({{
    onProgress: function (current, total) {{
      if (current > 0 && total > 0) {{ statusProgress.value = current; statusProgress.max = total; }}
      else {{ statusProgress.removeAttribute('value'); statusProgress.removeAttribute('max'); }}
    }},
  }}).then(() => {{ statusOverlay.remove(); }}, fail);
}})();
</script>
'''
open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(html)
print("części:", len(parts), "html:", os.path.getsize(os.path.join(out, "index.html")))
