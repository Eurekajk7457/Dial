/**
 * Assemble `cadence.html` : une copie autonome de l'app, en un seul fichier,
 * pensée pour être ouverte d'un double-clic depuis l'ordinateur.
 *
 * Lancer :  node build-fichier-unique.mjs
 *
 * Le code source reste celui de css/ et js/ : ce script ne fait que le regrouper,
 * en retirant les `import` / `export` (inutilisables sans serveur web).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = dirname(fileURLToPath(import.meta.url));
const lire = (p) => readFileSync(join(racine, p), 'utf8');

// L'ordre compte : chaque fichier ne doit utiliser que ce qui précède.
const MODULES = ['js/knowledge.js', 'js/pose.js', 'js/analyse.js', 'js/historique.js', 'js/ai.js', 'js/app.js'];

const deModule = (src) => src
  .replace(/^import\s[^;]*;\s*$/gm, '')     // les imports n'ont plus lieu d'être
  .replace(/^export\s+/gm, '')              // ni les exports
  .trim();

const script = MODULES
  .map((f) => `/* ===== ${f} ===== */\n${deModule(lire(f))}`)
  .join('\n\n');

if (/^\s*(import|export)\s/m.test(script)) {
  throw new Error("Un import/export a survécu au nettoyage : le fichier unique ne fonctionnerait pas.");
}

const html = lire('index.html')
  .replace(
    '<link rel="stylesheet" href="css/styles.css">',
    `<style>\n${lire('css/styles.css').trim()}\n</style>`,
  )
  .replace(
    '<script type="module" src="js/app.js"></script>',
    `<script>\n${script}\n</script>`,
  );

if (html.includes('href="css/') || html.includes('src="js/')) {
  throw new Error('Une ressource externe est restée liée : le fichier ne serait pas autonome.');
}

writeFileSync(join(racine, 'cadence.html'), html);
console.log(`cadence.html écrit (${Math.round(html.length / 1024)} Ko)`);
