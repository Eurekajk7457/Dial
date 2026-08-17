# Dial Tennis — analyse vidéo de ton jeu

Web app **100 % statique** (HTML/CSS/JS, aucun build, aucun serveur) : tu envoies une vidéo de toi
en train de jouer, et tu obtiens une analyse technique — ce qui fonctionne, ce qu'il faut corriger,
et des exercices concrets.

## Ce que ça fait

1. **Détection de posture image par image**, dans le navigateur (MediaPipe Pose).
   La vidéo ne quitte jamais ton appareil.
2. **Détection automatique des frappes** à partir de la vitesse du poignet dominant, puis
   classification : coup droit, revers, service, volée.
3. **Mesures biomécaniques** par frappe : hauteur d'impact, angle du coude, rotation du tronc,
   flexion des genoux, amplitude d'accompagnement, stabilité de la tête et du bassin, split-step.
4. **Moteur de règles** qui compare ces mesures à un référentiel de coaching (repères ITF / FFT / USTA)
   et produit des constats classés par priorité, chacun avec son exercice correctif.
5. **Analyse IA facultative** : les images clés + les mesures sont envoyées à Claude (API Anthropic)
   avec *ta* clé, avec recherche web activable pour appuyer les conseils sur des sources en ligne.
6. **Fiches de fondamentaux** consultables hors ligne pour chaque coup.

## Utilisation

Ouvre `index.html` — c'est tout. Pour éviter les restrictions des modules ES en `file://`,
sers le dossier :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

Ou publie-le tel quel sur GitHub Pages / Netlify / Vercel (aucune étape de build).

### Analyse IA (optionnelle)

Onglet **Conseils IA** → colle une clé API Anthropic (console.anthropic.com).
La clé reste dans ton navigateur ; elle n'est stockée que si tu coches la case.
Modèle utilisé : `claude-opus-5`, appelé directement depuis le navigateur
(en-tête `anthropic-dangerous-direct-browser-access`).

> Cette approche « clé côté client » convient à un usage personnel. Pour une app publique,
> il faut passer les appels par un petit backend qui garde la clé côté serveur.

## Comment filmer

- De côté (perpendiculaire à la ligne de fond) pour le fond de court ; de face ou 3/4 arrière pour le service.
- Joueur entier dans le cadre, avec de la marge au-dessus de la tête.
- Caméra fixe à hauteur de hanche, 5–10 m, sans zoom ni panoramique.
- 15 à 30 s, 4 à 8 frappes du même coup. 60 fps si possible.
- Un seul joueur visible : la détection ne suit qu'une personne.

## Structure

```
index.html          Interface et étapes
css/styles.css      Thème sombre, responsive
js/pose.js          Chargement MediaPipe, échantillonnage vidéo, géométrie
js/analyse.js       Séries temporelles, détection de frappes, mesures, moteur de règles
js/knowledge.js     Référentiel technique + seuils de coaching
js/ai.js            Appel API Claude (vision + recherche web)
js/app.js           Interface, rendu, squelette, onglets
```

## Limites, dites franchement

- Détection **2D** à partir d'une seule caméra : les angles sont sensibles à l'orientation de la prise
  de vue. Une frappe filmée de face donnera des mesures moins fiables que de profil.
- La **prise de raquette**, l'**effet** donné à la balle et la **trajectoire** ne sont pas mesurés :
  la raquette et la balle ne sont pas détectées.
- La classification volée / coup de fond est heuristique et peut se tromper sur des gestes courts.
- Les seuils du référentiel sont des repères pour joueur amateur à confirmé, pas des vérités absolues.
- Le premier chargement nécessite internet (modèle MediaPipe depuis un CDN) ; ensuite le navigateur le met en cache.

Ce n'est pas un substitut à un entraîneur : c'est un outil pour repérer des tendances et savoir
quoi lui montrer.
