# Cadence — analyse vidéo de ton jeu

Web app **100 % statique** (HTML/CSS/JS, aucun build, aucun serveur) : tu envoies une vidéo de toi
en train de jouer, et tu obtiens une analyse technique — ce qui fonctionne, ce qu'il faut corriger,
et des exercices concrets.

**En ligne : https://eurekajk7457.github.io/Dial/** — publié depuis la branche
`claude/tennis-video-analysis-app-514378` via GitHub Pages. Fonctionne aussi bien sur téléphone
que sur ordinateur ; sur mobile, « Ajouter à l'écran d'accueil » donne une icône d'application.

## Ce que ça fait

1. Tu réponds à quelques questions (main dominante et coup filmé sont obligatoires).
   L'angle de la caméra, lui, est **déduit de la posture** : plus rien à renseigner.
2. La posture est détectée image par image, **dans ton navigateur**.
3. Tu obtiens un score, des constats classés par priorité, un exercice pour chacun.
4. **Frappe par frappe**, chaque mesure est jugée : ce qui va, ce qui ne va pas, et pourquoi.
5. Chaque mesure est **expliquée** : ce qu'elle regarde, pourquoi ça compte, quoi faire si tu es hors zone.
6. Tu peux dire où chaque balle est partie : l'app compare alors tes réussites à tes fautes.
7. L'onglet **Bilan** croise toutes tes séances : ce qui revient à chaque fois, ce que tu as réglé,
   ce sur quoi tu peux compter — et la liste de tes analyses, rouvrables dans tous leurs onglets.
8. Un **entraîneur IA** répond à tes questions en connaissant tes mesures, sans avoir à lancer
   l'analyse complète au préalable.

## En détail

1. **Détection de posture** dans le navigateur (MediaPipe Pose) ; la vidéo ne quitte jamais
   l'appareil. Trois mécanismes servent le cas qui compte — un joueur qui se déplace :
   - **Fenêtre de détection qui suit le joueur.** MediaPipe réduit l'image à ~256 px avant de
     l'analyser : un joueur occupant 10 % de la hauteur d'un plan large n'y fait plus que 26 px,
     et devient invisible pour le modèle. Une fois repéré, on ne lui donne plus l'image entière
     mais un carré recadré autour du joueur, agrandi à 512 px — il y fait alors 135 px, soit
     **5,3× plus grand**. La fenêtre se déplace avec lui ; s'il en sort, on repasse sur l'image
     entière et on la recale. Gain nul mais coût nul quand le joueur est déjà grand.
   - **Mode `VIDEO`** (suivi temporel) plutôt que `IMAGE`, avec **bascule automatique** vers
     `IMAGE` si le navigateur le refuse : plus jamais zéro détection à cause d'un mode
     indisponible. L'horodatage envoyé au modèle est un compteur monotone qui ne repart jamais
     à zéro — le détecteur étant gardé en mémoire entre deux analyses, repartir du temps de la
     vidéo faisait échouer *toutes* les images dès la deuxième analyse.
   - **Seuils de confiance à 0,3** : un joueur en mouvement est flou, exiger 0,5 revient à le
     perdre au moment précis de la frappe.

   Une erreur du détecteur n'est jamais avalée — l'échantillonnage s'interrompt au bout de
   quelques images infructueuses et remonte le message technique, pour qu'une panne ne se
   déguise jamais en « mauvais cadrage ».
2. **Détection automatique des frappes** à partir de la vitesse du poignet dominant, puis
   classification : coup droit, revers, service, volée.
3. **Mesures biomécaniques** par frappe : hauteur d'impact, angle du coude, rotation du tronc,
   flexion des genoux, amplitude d'accompagnement, stabilité de la tête et du bassin, split-step.
   Toutes les distances sont exprimées en **largeurs d'épaules**, mais cette unité n'est PAS la
   largeur d'épaules mesurée à l'image : celle-ci s'effondre vers zéro quand le joueur se met de
   profil, et diviser par un nombre proche de zéro faisait exploser tous les déplacements —
   au point que mieux le joueur tournait, plus son bassin paraissait dériver (jusqu'à **2,6× de
   gonflement** sur un bassin rigoureusement immobile). L'unité est donc reconstruite à partir du
   **tronc**, que la rotation ne raccourcit pas : on mesure le rapport épaules/tronc sur les images
   où le joueur est le plus de face, puis on l'applique au tronc de chaque image (`calibrerEchelle`).
   L'échelle suit ainsi les changements de distance à la caméra sans suivre les rotations. Seul
   l'indice de rotation continue de se lire sur la largeur d'épaules brute : son effondrement
   *est* son signal, et c'est un rapport sans unité.
4. **Moteur de règles** qui compare ces mesures à un référentiel de coaching (repères ITF / FFT / USTA)
   et produit des constats classés par priorité, chacun avec son exercice correctif.
5. **Analyse IA facultative** : les images clés + les mesures sont envoyées à Claude (API Anthropic)
   avec *ta* clé, avec recherche web activable pour appuyer les conseils sur des sources en ligne.
6. **Fiches de fondamentaux** consultables hors ligne pour chaque coup.
7. **Devenir des balles** : le joueur note chaque frappe (bonne / filet / longue / large / cadre) ;
   l'app compare les médianes des réussites et des fautes et ne conclut qu'au-delà d'un écart net,
   avec au moins deux frappes de chaque côté.
8. **Régularité** : écart-type des mesures d'une frappe à l'autre — un geste reproductible compte
   davantage qu'un geste parfait une fois sur cinq.
9. **Suivi dans le temps** : chaque analyse est résumée dans le `localStorage` (donc propre à un
   appareil, transférable par fichier) ; la vue Progression
   trace une mesure au fil des séances, avec la zone visée en fond plutôt qu'une flèche « ça monte ».
10. **Ralenti** image par image autour de chaque impact, et **export du rapport** en texte, à montrer
    à un entraîneur.
11. **Verdicts par frappe** : chaque mesure comparée à sa zone cible, avec la raison en clair
    (« geste coupé au contact : tu freines avant la balle ») et la fourchette visée, toujours affichée.
    Quand la borne basse vaut zéro (rotation, stabilité), elle se lit « 0,28 ou moins » plutôt que
    « 0 à 0,28 » : ces mesures se minimisent, elles ne s'encadrent pas.
12. **Mesures expliquées** : une fiche dépliable par mesure — ce que ça mesure, l'échelle, pourquoi
    ça compte, le diagnostic personnel, un exercice, une jauge situant ta valeur dans la zone visée.
13. **Vidéos** : chaque fiche technique, chaque mesure et chaque défaut relevé renvoie vers une
    recherche YouTube **écrite à la main**, en français, formulée comme un joueur la taperait
    (`VIDEOS_CONSTAT` dans `js/knowledge.js`). Les défauts qui n'ont pas de contrepartie vidéo utile
    — main mal déclarée, détection partielle — n'ont volontairement pas de lien. On ne pointe jamais
    une URL de vidéo précise : elle finit toujours par mourir, alors qu'une recherche reste valable
    et remonte ce qui se fait de mieux au moment du clic.
14. **Menu** en quatre entrées (Analyser / Mes analyses / Questions / Apprendre), visibles sans
    défilement même sur un petit écran.
15. **Vidéo déjà analysée** : chaque fichier reçoit une empreinte (SHA-256 de sa taille et de trois
    tranches — début, milieu, fin), calculée sans relire tout le fichier. Recharger la même vidéo
    affiche aussitôt « tu as déjà analysé cette vidéo », avec sa date, son score, et le choix entre
    rouvrir l'analyse existante ou refaire quand même. Renommer le fichier ne trompe pas la
    détection ; changer les réglages (début, durée, images/seconde) relance normalement, puisque
    c'est un autre extrait. En `file://`, sans `crypto.subtle`, l'empreinte retombe sur
    nom + taille + date.
16. **Angle de caméra détecté**, plus demandé. Deux signaux suffisent : la largeur d'épaules
    rapportée à la hauteur du tronc (elle s'effondre de profil) et l'ordre des épaules à l'écran
    (MediaPipe nomme les points selon l'anatomie, donc leur ordre s'inverse entre face et dos).
    La médiane sur toute la séquence décrit la caméra, pas les pivots du joueur. Le résultat est
    affiché en Synthèse, avec sa confiance.
17. **Sauts de détection écartés**. Quand plusieurs personnes sont dans le champ, MediaPipe passe
    de l'une à l'autre : le poignet paraît alors franchir l'écran en une image, à des vitesses
    physiquement impossibles. Le seuil de détection se calant sur le maximum observé, **un seul**
    de ces pics le rendait inatteignable et rejetait toutes les vraies frappes. Deux garde-fous :
    les transitions où le bassin se déplace de plus de 0,6 largeur d'épaules d'une image à l'autre
    sont ignorées (le bassin reste posé pendant une frappe), tout comme les vitesses au-delà de
    60 largeurs/s ; et le seuil se cale désormais sur le 98e centile plutôt que sur le maximum —
    identique sur une vidéo propre, insensible à quelques images aberrantes. Le taux de sauts est
    mesuré et signalé au joueur : au-delà de 8 %, aucun réglage ne compense, il faut recadrer.
18. **Détection de frappes en deux passes** et diagnostic d'échec. La passe stricte (plancher
    2,2 largeurs d'épaules/s) évite de confondre un replacement avec une frappe ; si elle ne trouve
    rien, une passe souple (plancher 1,1) reprend la main et le dit dans les constats. Quand rien
    n'est trouvé, l'app annonce les chiffres réels — images lues, taux de reconnaissance, vitesse
    maximale du poignet contre le seuil requis — et les pistes classées : cadrage, distance, fenêtre
    analysée plus courte que la vidéo, images par seconde trop basses.
19. **Transfert d'un téléphone à l'autre** : export de tout l'historique en un fichier JSON,
    import fusionnant sur l'autre appareil. La fusion se fait par identifiant d'analyse, donc
    deux téléphones qui s'échangent leurs fichiers convergent sans que l'un écrase l'autre, et
    réimporter le même fichier n'ajoute rien. Sert aussi de sauvegarde — vider son navigateur
    efface le `localStorage`, et personne ne s'y attend. Il n'y a **pas** de synchronisation
    automatique : elle demanderait un compte et un serveur, que cette app n'a pas.
20. **Bilan sur toutes les séances** : les constats sont regroupés par titre et par coup, puis classés
    en *récurrent* (présent sur la dernière séance et vu au moins deux fois), *nouveau*, *réglé*
    (présent avant, absent de la dernière), *point fort acquis* et *point fort perdu de vue*. Chaque
    entrée porte une frise d'une pastille par séance, un compteur « vu sur N séances sur M », et les
    trois chantiers les plus tenaces sont repris en plan de travail. Ce même historique est transmis
    à l'entraîneur IA : un défaut persistant malgré le travail n'appelle pas le conseil habituel.

## Utilisation

**Le plus simple : télécharge `cadence.html` et ouvre-le d'un double-clic.** Ce fichier
contient toute l'app ; il a juste besoin d'une connexion internet au premier lancement pour
récupérer le modèle de détection de posture.

Pour la version en dossier (celle qu'on modifie), sers-la localement — les modules ES ne
se chargent pas en `file://` :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

Ou publie le dossier tel quel sur GitHub Pages / Netlify / Vercel (aucune étape de build).
C'est la seule façon de l'utiliser depuis un téléphone.

### Régénérer le fichier unique

`cadence.html` est produit à partir de `index.html`, `css/` et `js/`. Après toute
modification :

```bash
node build-fichier-unique.mjs
```

### Changer le nom de l'app

Le nom vit dans une seule constante, `NOM_APP`, en haut de `js/app.js` : elle alimente le titre
de la page, l'en-tête et le nom du fichier de rapport exporté. Les clés de `localStorage` gardent
volontairement leur ancien préfixe pour ne pas effacer l'historique déjà enregistré chez les
utilisateurs.

### Analyse IA (optionnelle)

Onglet **Conseils IA** → colle une clé API Anthropic (console.anthropic.com).
La clé reste dans ton navigateur ; elle n'est stockée que si tu coches la case.
Modèle utilisé : `claude-opus-5`, appelé directement depuis le navigateur
(en-tête `anthropic-dangerous-direct-browser-access`).

> Cette approche « clé côté client » convient à un usage personnel. Pour une app publique,
> il faut passer les appels par un petit backend qui garde la clé côté serveur.

La première question posée à l'entraîneur amorce elle-même la conversation avec le profil et les
mesures : pas besoin de lancer l'analyse complète (avec images) avant de discuter.

## Comment filmer

- De côté (perpendiculaire à la ligne de fond) pour le fond de court ; de face ou 3/4 arrière pour le service.
- Joueur entier dans le cadre, avec de la marge au-dessus de la tête.
- Caméra fixe à hauteur de hanche, 5–10 m, sans zoom ni panoramique.
- 15 à 30 s, 4 à 8 frappes du même coup. 60 fps si possible.
- Un seul joueur visible : la détection ne suit qu'une personne.

## Structure

```
index.html          Interface, menu et onglets
cadence.html        Copie autonome en un seul fichier (générée, ne pas éditer à la main)
build-fichier-unique.mjs  Génère cadence.html depuis les sources
css/styles.css      Thème clair, contrastes AA, responsive
js/pose.js          Chargement MediaPipe, échantillonnage vidéo, géométrie
js/analyse.js       Séries temporelles, détection de frappes, mesures, moteur de règles
js/knowledge.js     Référentiel technique, seuils de coaching, explications des mesures, vidéos
js/historique.js    Suivi dans le temps (localStorage), réouverture d'une analyse, courbe, bilan croisé
js/ai.js            Appel API Claude (vision + recherche web)
js/app.js           Interface, menu, rendu, verdicts, squelette, onglets
```

## Précision mesurée

Banc d'essai sur des séquences dont la vérité est connue (nombre et instant des frappes
simulés), joueur courant à 4 m/s entre les frappes, 12 images/seconde :

| Situation | Frappes retrouvées | Précision |
|---|---|---|
| Détection de posture à 100 % | 92 % | 100 % |
| Joueur qui sprinte à 7 m/s | 92 % | 100 % |
| Joueur deux fois plus petit dans l'image | 92 % | 100 % |
| Deux joueurs, détecteur qui bascule | 92 % | 100 % (+ alerte) |
| **Détection de posture à 60 %** | **8 %** | 100 % |
| **Détection de posture à 24 %** | **0 %** | — |

Lecture : quand le joueur est bien détecté, la détection de frappes est fiable et ne produit
pas de fausses frappes. Le **taux de détection de posture est le facteur décisif**, très loin
devant tout le reste — c'est pourquoi l'app l'affiche et alerte en dessous de 70 %. La cadence
d'échantillonnage compte aussi beaucoup dès que la détection est imparfaite : à 60 % de
détection, on retrouve 58 % des frappes à 20 images/seconde contre 8 % à 12.

## Limites, dites franchement

- Détection **2D** à partir d'une seule caméra : les angles sont sensibles à l'orientation de la prise
  de vue. Une frappe filmée de face donnera des mesures moins fiables que de profil.
- La **prise de raquette**, l'**effet** donné à la balle et la **trajectoire** ne sont pas mesurés :
  la raquette et la balle ne sont pas détectées.
- La classification volée / coup de fond est heuristique et peut se tromper sur des gestes courts.
- En dessous de **70 % de détection de posture**, des frappes manquent forcément ; en dessous de
  40 %, l'analyse ne trouve plus rien du tout. Ce n'est pas un réglage à forcer, c'est la vidéo
  qu'il faut refaire : joueur grand dans le cadre, un seul joueur visible, caméra fixe.
- Les seuils du référentiel sont des repères pour joueur amateur à confirmé, pas des vérités absolues.
- Le premier chargement nécessite internet (modèle MediaPipe depuis un CDN) ; ensuite le navigateur le met en cache.
- Les analyses rouvertes n'ont **pas les images de la vidéo** — elle n'a jamais quitté l'appareil.
  En revanche le **squelette** est conservé autour de chaque frappe (±0,8 s), donc le déroulé du geste
  reste rejouable image par image. Compter environ 9 Ko par analyse, 30 à 40 Ko avec le déroulé ; ce
  dernier n'est gardé que pour les **huit analyses les plus récentes**, et l'écriture s'allège toute
  seule si le navigateur refuse (déroulés d'abord, puis détail des plus anciennes).

Ce n'est pas un substitut à un entraîneur : c'est un outil pour repérer des tendances et savoir
quoi lui montrer.
