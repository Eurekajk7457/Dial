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
        // Mode IMAGE, et pas VIDEO. Le suivi temporel serait meilleur en théorie, mais
        // `detectForVideo` échoue sur certains navigateurs et la détection tombe alors à zéro.
        // Tant que ce n'est pas vérifiable sur de vraies vidéos, on reste sur ce qui marche.
        runningMode: 'IMAGE',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
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

  const frames = [];
  let detectees = 0;
  let panne = null;   // première erreur de détection, s'il y en a une

  for (let i = 0; i < total; i++) {
    const t = debut + i * pas;
    await chercher(video, t);
    ctx.drawImage(video, 0, 0, cv.width, cv.height);

    let pts = null;
    try {
      const res = det.detect(video);
      if (res?.landmarks?.length) pts = res.landmarks[0];
    } catch (err) {
      pts = null;
      if (!panne) panne = err?.message || String(err);
    }
    if (pts) detectees++;

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
