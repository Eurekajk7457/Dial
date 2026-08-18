/**
 * Détection de posture image par image, dans le navigateur (MediaPipe Tasks Vision).
 * Aucune vidéo ne quitte l'appareil.
 */

const VERSION = '0.10.14';

/** Sources possibles pour la bibliothèque, essayées dans l'ordre. */
const SOURCES = [
  { module: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`,
    wasm:   `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm` },
  { module: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`,
    wasm:   `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm` },
  { module: `https://unpkg.com/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`,
    wasm:   `https://unpkg.com/@mediapipe/tasks-vision@${VERSION}/wasm` },
];

const MODELE = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

/** Indices des points MediaPipe Pose utilisés ici. */
export const P = {
  nez: 0,
  epauleG: 11, epauleD: 12,
  coudeG: 13, coudeD: 14,
  poignetG: 15, poignetD: 16,
  hancheG: 23, hancheD: 24,
  genouG: 25, genouD: 26,
  chevilleG: 27, chevilleD: 28,
  piedG: 31, piedD: 32,
};

/** Segments dessinés pour le squelette. */
export const SQUELETTE = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 31], [28, 32],
];

let detecteur = null;

/** Charge le modèle une seule fois, en essayant les sources l'une après l'autre. */
export async function chargerDetecteur(onStatut = () => {}) {
  if (detecteur) return detecteur;
  onStatut('Chargement du modèle de détection de posture…');

  const echecs = [];
  for (const source of SOURCES) {
    try {
      const { PoseLandmarker, FilesetResolver } = await import(/* @vite-ignore */ source.module);
      const vision = await FilesetResolver.forVisionTasks(source.wasm);
      detecteur = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODELE, delegate: 'GPU' },
        // Mode VIDEO : le modèle suit le joueur d'une image à l'autre au lieu de le
        // rechercher à zéro chaque fois — c'est ce qu'il faut pour quelqu'un qui court.
        // Si le navigateur le refuse, `detecter()` bascule seul en mode IMAGE.
        runningMode: 'VIDEO',
        numPoses: 1,
        // Un joueur en mouvement est flou : exiger 0,5 de confiance revient à le perdre
        // dès qu'il accélère, c'est-à-dire précisément au moment de la frappe.
        minPoseDetectionConfidence: 0.3,
        minPosePresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });
      return detecteur;
    } catch (err) {
      echecs.push(`${source.module} → ${err?.message || err}`);
    }
  }

  throw new Error(
    "Impossible de charger le modèle de détection de posture. Une connexion internet est nécessaire " +
    "au premier chargement (le navigateur le met ensuite en cache), et certains réseaux d'entreprise " +
    "ou bloqueurs empêchent l'accès aux CDN. Détail :\n" + echecs.join('\n')
  );
}

function chercher(video, t) {
  return new Promise((resolve, reject) => {
    const ok = () => { nettoyer(); resolve(); };
    const ko = () => { nettoyer(); reject(new Error('Lecture vidéo impossible à ' + t.toFixed(2) + ' s')); };
    const nettoyer = () => {
      video.removeEventListener('seeked', ok);
      video.removeEventListener('error', ko);
    };
    video.addEventListener('seeked', ok, { once: true });
    video.addEventListener('error', ko, { once: true });
    video.currentTime = Math.min(t, Math.max(0, video.duration - 0.02));
  });
}

/**
 * Échantillonne la vidéo et renvoie, pour chaque image : temps, points détectés et vignette JPEG.
 * @returns {Promise<{frames: Array, largeur: number, hauteur: number, tauxDetection: number}>}
 */
/**
 * État du détecteur, partagé entre les analyses successives.
 *
 * L'horodatage ne redémarre jamais à zéro : MediaPipe exige, en mode VIDEO, des horodatages
 * strictement croissants d'un appel à l'autre. Comme le détecteur est gardé en mémoire d'une
 * analyse à la suivante, repartir du temps de la vidéo faisait échouer TOUTES les images dès
 * la deuxième analyse. Le modèle se moque de la valeur : elle doit seulement monter.
 */
export const ETAT_DETECTEUR = { mode: 'VIDEO', horodatage: 0, bascule: null };
const PAS_HORODATAGE = 40;   // ms fictives entre deux appels

/**
 * Détecte une posture, en préférant le mode VIDEO — qui suit le joueur d'une image à
 * l'autre et convient bien mieux à quelqu'un qui se déplace — mais en basculant
 * définitivement en mode IMAGE si le navigateur le refuse. Jamais zéro détection à cause
 * d'un mode indisponible : c'est exactement ce qui s'était produit.
 */
export function detecter(det, source, indice) {
  if (ETAT_DETECTEUR.mode === 'VIDEO') {
    try {
      ETAT_DETECTEUR.horodatage += PAS_HORODATAGE;
      const res = det.detectForVideo(source, ETAT_DETECTEUR.horodatage);
      return { pts: res?.landmarks?.length ? res.landmarks[0] : null, erreur: null };
    } catch (err) {
      ETAT_DETECTEUR.mode = 'IMAGE';
      ETAT_DETECTEUR.bascule = `image ${indice} : ${err?.message || err}`;
      try { det.setOptions({ runningMode: 'IMAGE' }); } catch { /* on tente quand même */ }
    }
  }
  try {
    const res = det.detect(source);
    return { pts: res?.landmarks?.length ? res.landmarks[0] : null, erreur: null };
  } catch (err) {
    return { pts: null, erreur: err?.message || String(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Suivi du joueur : on détecte dans une fenêtre qui le suit           */
/* ------------------------------------------------------------------ */

/**
 * MediaPipe travaille sur une image redimensionnée en petit. Un joueur qui n'occupe qu'un
 * dixième de la largeur d'un plan large se retrouve donc haut comme quelques dizaines de
 * pixels : le modèle ne le voit plus. D'où les taux de détection à 25 %.
 *
 * La parade : une fois le joueur repéré, on ne donne plus au modèle l'image entière mais
 * une fenêtre recadrée autour de lui, agrandie à une taille confortable. Le joueur y occupe
 * la quasi-totalité du cadre, et il est retrouvé bien plus souvent. La fenêtre se déplace
 * avec lui d'une image à l'autre — c'est ce qui permet de suivre quelqu'un qui court.
 */
const MARGE_FENETRE = 0.9;    // on élargit la boîte du joueur de 90 % pour absorber son déplacement
const LISSAGE_FENETRE = 0.5;  // la fenêtre suit le joueur sans sauter à chaque image
const COTE_DETECTION = 512;   // taille du carré envoyé au modèle

/** Boîte englobante des points visibles, en coordonnées normalisées de la vidéo. */
export function boiteJoueur(pts) {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0, n = 0;
  for (const p of pts) {
    if (!p || (p.visibility ?? 1) < 0.3) continue;
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    n++;
  }
  if (n < 6 || x1 <= x0 || y1 <= y0) return null;
  return { x0, y0, x1, y1 };
}

/**
 * Élargit la boîte et la rend carrée : le modèle attend une image carrée, et déformer
 * le joueur fausserait tous les angles. Le résultat est borné à l'image.
 */
export function fenetreDeDetection(boite, largeurVideo, hauteurVideo) {
  const cx = (boite.x0 + boite.x1) / 2;
  const cy = (boite.y0 + boite.y1) / 2;
  // Côté exprimé en pixels, pour rester carré malgré le format de l'image
  const cote = Math.max((boite.x1 - boite.x0) * largeurVideo,
                        (boite.y1 - boite.y0) * hauteurVideo) * (1 + MARGE_FENETRE);
  const demi = Math.min(cote, Math.min(largeurVideo, hauteurVideo)) / 2;

  let px = cx * largeurVideo, py = cy * hauteurVideo;
  px = Math.min(largeurVideo - demi, Math.max(demi, px));
  py = Math.min(hauteurVideo - demi, Math.max(demi, py));
  return { x: px - demi, y: py - demi, cote: demi * 2 };
}

/** Ramène un point détecté dans la fenêtre vers les coordonnées de l'image entière. */
export function versImageEntiere(p, fenetre, largeurVideo, hauteurVideo) {
  return {
    ...p,
    x: (fenetre.x + p.x * fenetre.cote) / largeurVideo,
    y: (fenetre.y + p.y * fenetre.cote) / hauteurVideo,
  };
}

/** Moyenne pondérée de deux fenêtres, pour que le cadre ne sursaute pas. */
function lisserFenetre(precedente, nouvelle) {
  if (!precedente) return nouvelle;
  const m = (a, b) => a * LISSAGE_FENETRE + b * (1 - LISSAGE_FENETRE);
  return {
    x: m(precedente.x, nouvelle.x),
    y: m(precedente.y, nouvelle.y),
    cote: m(precedente.cote, nouvelle.cote),
  };
}

export async function echantillonner(video, { debut = 0, duree = 30, fps = 12, onProgres = () => {} } = {}) {
  const det = await chargerDetecteur((m) => onProgres(0, m));

  const fin = Math.min(video.duration, debut + duree);
  const pas = 1 / fps;
  const total = Math.max(1, Math.floor((fin - debut) / pas));

  const largeurVignette = 480;
  const ratio = video.videoHeight / video.videoWidth || 0.5625;
  const cv = document.createElement('canvas');
  cv.width = largeurVignette;
  cv.height = Math.round(largeurVignette * ratio);
  const ctx = cv.getContext('2d', { willReadFrequently: true });

  // Toile carrée où l'on recopie la fenêtre suivant le joueur, agrandie.
  const cvDet = document.createElement('canvas');
  cvDet.width = cvDet.height = COTE_DETECTION;
  const ctxDet = cvDet.getContext('2d', { willReadFrequently: true });

  const frames = [];
  let detectees = 0;
  let recadrees = 0;
  let panne = null;        // première erreur de détection, s'il y en a une
  let fenetre = null;      // fenêtre de suivi, nulle tant que le joueur n'a pas été trouvé

  for (let i = 0; i < total; i++) {
    const t = debut + i * pas;
    await chercher(video, t);
    ctx.drawImage(video, 0, 0, cv.width, cv.height);

    let pts = null;

    // 1) D'abord dans la fenêtre qui suit le joueur : c'est là qu'il est le plus grand,
    //    donc le plus facile à reconnaître.
    if (fenetre) {
      ctxDet.drawImage(video, fenetre.x, fenetre.y, fenetre.cote, fenetre.cote,
        0, 0, COTE_DETECTION, COTE_DETECTION);
      const brut = detecter(det, cvDet, i);
      if (brut.erreur && !panne) panne = brut.erreur;
      if (brut.pts) {
        pts = brut.pts.map((p) => versImageEntiere(p, fenetre, video.videoWidth, video.videoHeight));
        recadrees++;
      }
    }

    // 2) Sinon (ou si le joueur est sorti de la fenêtre) : sur l'image entière.
    if (!pts) {
      const brut = detecter(det, video, i);
      if (brut.erreur && !panne) panne = brut.erreur;
      pts = brut.pts;
      fenetre = null;
    }

    // La fenêtre se recale sur la position réelle du joueur, en douceur.
    if (pts) {
      const boite = boiteJoueur(pts);
      if (boite) {
        fenetre = lisserFenetre(fenetre,
          fenetreDeDetection(boite, video.videoWidth, video.videoHeight));
      }
      detectees++;
    }

    // Si le détecteur échoue sur les premières images, il échouera sur les 500 suivantes :
    // inutile de faire chauffer le téléphone pendant une minute pour rien.
    if (panne && i >= 4 && detectees === 0) {
      throw new Error(
        "Le détecteur de posture a refusé de fonctionner sur cette vidéo — ce n'est pas un " +
        "problème de cadrage ni de réglage de ta part. Recharge la page et réessaie ; " +
        "si ça persiste, essaie un autre navigateur. Détail technique : " + panne);
    }

    // En local (fichier ouvert directement), certains navigateurs interdisent de relire
    // les pixels d'une vidéo : on continue sans vignette plutôt que d'interrompre l'analyse.
    let vignette = null;
    try {
      vignette = cv.toDataURL('image/jpeg', 0.6);
    } catch {
      vignette = null;
    }

    frames.push({ t, pts, vignette });

    if (i % 3 === 0 || i === total - 1) {
      onProgres((i + 1) / total, `Analyse des images : ${i + 1} / ${total}`);
      await new Promise((r) => setTimeout(r, 0)); // laisse respirer l'UI
    }
  }

  return {
    frames,
    largeur: video.videoWidth,
    hauteur: video.videoHeight,
    tauxDetection: frames.length ? detectees / frames.length : 0,
    // Part des détections obtenues grâce au suivi recadré, utile pour juger l'apport du suivi
    tauxRecadrage: detectees ? recadrees / detectees : 0,
    modeDetection: ETAT_DETECTEUR.mode,
    panne,
    // La fenêtre réellement regardée : sans elle, impossible de dire au joueur que le
    // jeu se trouve peut-être plus loin dans sa vidéo que l'extrait analysé.
    fenetre: { debut, fin, dureeVideo: video.duration || 0, fps },
  };
}

/* ------------------------------------------------------------------ */
/* Géométrie                                                           */
/* ------------------------------------------------------------------ */

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const milieu = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Angle en degrés au sommet b, formé par a-b-c. */
export function angle(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const n1 = Math.hypot(v1.x, v1.y), n2 = Math.hypot(v2.x, v2.y);
  if (!n1 || !n2) return NaN;
  const cos = Math.min(1, Math.max(-1, (v1.x * v2.x + v1.y * v2.y) / (n1 * n2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Inclinaison du buste par rapport à la verticale, en degrés (0 = droit). */
export function inclinaisonBuste(epaules, hanches) {
  const dx = epaules.x - hanches.x;
  const dy = hanches.y - epaules.y; // y descend dans l'image
  if (!dy) return 90;
  return Math.abs((Math.atan2(dx, dy) * 180) / Math.PI);
}

/** Lissage par moyenne glissante, en ignorant les NaN. */
export function lisser(serie, fenetre = 3) {
  const n = serie.length;
  const out = new Array(n);
  const demi = Math.floor(fenetre / 2);
  for (let i = 0; i < n; i++) {
    let somme = 0, compte = 0;
    for (let j = Math.max(0, i - demi); j <= Math.min(n - 1, i + demi); j++) {
      if (Number.isFinite(serie[j])) { somme += serie[j]; compte++; }
    }
    out[i] = compte ? somme / compte : NaN;
  }
  return out;
}
