/**
 * Moteur d'analyse : transforme les points de posture en mesures biomécaniques,
 * détecte les frappes, puis applique un référentiel de coaching.
 */

import { P, angle, dist, milieu, inclinaisonBuste, lisser } from './pose.js';
import { SEUILS, SEUILS_REGULARITE, EXPLICATIONS, libelleZone, INCERTITUDE_MESURE } from './knowledge.js';

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

const finis = (arr) => arr.filter(Number.isFinite);

export function mediane(arr) {
  const v = finis(arr).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

const borne = (v, min, max) => Math.min(max, Math.max(min, v));

/** Écart-type d'une série, en ignorant les valeurs manquantes. */
export function ecartType(arr) {
  const v = finis(arr);
  if (v.length < 2) return NaN;
  const moy = v.reduce((s, x) => s + x, 0) / v.length;
  return Math.sqrt(v.reduce((s, x) => s + (x - moy) ** 2, 0) / v.length);
}

/** Compare une valeur à un seuil : 'bon' | 'moyen' | 'mauvais', + sens de l'écart. */
function evaluer(valeur, seuil, incertitude = 0) {
  if (!Number.isFinite(valeur)) return { niveau: 'inconnu', sens: 0 };
  const [i0, i1] = seuil.ideal;
  const [a0, a1] = seuil.acceptable;

  // Une différence plus petite que l'erreur de la mesure n'est pas une différence. Dire
  // « 148° au lieu de 140, à corriger » quand la mesure vaut à ±10° près, c'est commenter le
  // bruit. Au bord d'une zone, on se tait — dans les deux sens : on ne décrète pas non plus
  // « point fort » un chiffre qu'on ne sait pas distinguer d'un chiffre hors zone.
  // Une borne à 0 est un plancher physique, pas une frontière : elle ne reçoit pas de marge.
  if (incertitude > 0
      && ((i0 > 0 && Math.abs(valeur - i0) <= incertitude)
        || Math.abs(valeur - i1) <= incertitude)) {
    return { niveau: 'inconnu', sens: 0, raison: 'incertitude' };
  }

  if (valeur >= i0 && valeur <= i1) return { niveau: 'bon', sens: 0 };
  const sens = valeur < i0 ? -1 : 1;
  if (valeur >= a0 && valeur <= a1) return { niveau: 'moyen', sens };
  return { niveau: 'mauvais', sens };
}

/**
 * Erreur de mesure applicable à une médiane de `n` frappes.
 *
 * La part aléatoire de l'erreur de posture se compense quand on moyenne plusieurs frappes,
 * en racine de n. La part systématique — angle de caméra, morphologie, modèle de posture —
 * ne se compense jamais : on ne descend donc pas sous la moitié de l'erreur d'une frappe
 * seule, quel que soit le nombre de frappes.
 */
export function incertitudePour(cle, n = 1) {
  const inc = INCERTITUDE_MESURE[cle];
  if (!inc) return 0;
  const k = Math.max(1, n);
  return Math.max(inc / 2, inc / Math.sqrt(k));
}

/* ------------------------------------------------------------------ */
/* 1. Séries temporelles                                               */
/* ------------------------------------------------------------------ */

/**
 * Construit les séries image par image. Les x sont remis à l'échelle par le rapport
 * largeur/hauteur pour que les distances restent comparables dans les deux axes.
 */
export function construireSeries(frames, largeur, hauteur) {
  const aspect = largeur && hauteur ? largeur / hauteur : 16 / 9;

  return frames.map((f) => {
    if (!f.pts) return { t: f.t, ok: false };
    const p = (i) => ({ x: f.pts[i].x * aspect, y: f.pts[i].y, v: f.pts[i].visibility ?? 1 });

    const epauleG = p(P.epauleG), epauleD = p(P.epauleD);
    const hancheG = p(P.hancheG), hancheD = p(P.hancheD);
    const epaules = milieu(epauleG, epauleD);
    const hanches = milieu(hancheG, hancheD);
    const sw = dist(epauleG, epauleD);

    if (!(sw > 0.01)) return { t: f.t, ok: false };

    return {
      t: f.t,
      ok: true,
      sw,
      nez: p(P.nez),
      epauleG, epauleD, epaules,
      hancheG, hancheD, hanches,
      poignetG: p(P.poignetG), poignetD: p(P.poignetD),
      coudeG: p(P.coudeG), coudeD: p(P.coudeD),
      chevilleG: p(P.chevilleG), chevilleD: p(P.chevilleD),
      angleCoudeG: angle(p(P.epauleG), p(P.coudeG), p(P.poignetG)),
      angleCoudeD: angle(p(P.epauleD), p(P.coudeD), p(P.poignetD)),
      angleGenouG: angle(hancheG, p(P.genouG), p(P.chevilleG)),
      angleGenouD: angle(hancheD, p(P.genouD), p(P.chevilleD)),
      // Longueur du tronc : contrairement à la largeur d'épaules, elle ne change pas
      // quand le joueur pivote sur lui-même. C'est ce qui en fait une bonne référence.
      tronc: dist(epaules, hanches),
      buste: inclinaisonBuste(epaules, hanches),
    };
  });
}

/**
 * Échelle corporelle : l'unité dans laquelle toutes les distances sont exprimées.
 *
 * Elle valait jusqu'ici la largeur d'épaules mesurée à l'image. Mauvaise idée : quand le
 * joueur se met de profil pour préparer, ses épaules se superposent et cette largeur tend
 * vers zéro. Diviser par un nombre proche de zéro faisait exploser tous les déplacements —
 * si bien que mieux le joueur tournait, plus son bassin paraissait dériver. La mesure
 * fabriquait le défaut qu'elle prétendait constater.
 *
 * On garde l'unité « largeur d'épaules », familière et compatible avec les seuils existants,
 * mais on la reconstruit à partir du tronc, que la rotation ne raccourcit pas :
 *   - on repère les images où le joueur est le plus de face (largeur d'épaules maximale) ;
 *   - on y mesure le rapport largeur d'épaules / tronc, propre à ce joueur et à cette vidéo ;
 *   - on applique ce rapport au tronc de chaque image.
 *
 * L'échelle suit donc les changements de distance à la caméra, sans suivre les rotations.
 */
export function calibrerEchelle(series) {
  const ok = series.filter((s) => s.ok && s.tronc > 0.01);
  // Trop peu d'images pour calibrer : on retombe sur la largeur d'épaules. Sans cette
  // ligne, `echelle` restait indéfini et toutes les distances devenaient NaN en silence.
  if (ok.length < 5) {
    for (const s of series) if (s.ok) s.echelle = s.sw;
    return series;
  }

  // Le joueur est le plus de face là où ses épaules paraissent les plus larges.
  const swTriees = [...ok.map((s) => s.sw)].sort((a, b) => a - b);
  const swReference = swTriees[Math.min(swTriees.length - 1, Math.round((swTriees.length - 1) * 0.9))];
  const deFace = ok.filter((s) => s.sw >= swReference * 0.85);
  const rapport = mediane((deFace.length ? deFace : ok).map((s) => s.sw / s.tronc));

  // Rapport implausible (détection bancale) : on retombe sur l'ancienne référence.
  const k = Number.isFinite(rapport) && rapport > 0.3 && rapport < 2.5 ? rapport : null;

  for (const s of series) {
    if (!s.ok) continue;
    s.echelle = (k && s.tronc > 0.01) ? s.tronc * k : s.sw;
  }
  return series;
}

/** Détermine la main dominante : celle dont le poignet parcourt le plus de chemin. */
export function detecterMain(series, force = 'auto') {
  if (force === 'right') return 'D';
  if (force === 'left') return 'G';
  let cheminG = 0, cheminD = 0;
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1], b = series[i];
    if (!a.ok || !b.ok) continue;
    cheminG += dist(a.poignetG, b.poignetG) / b.echelle;
    cheminD += dist(a.poignetD, b.poignetD) / b.echelle;
  }
  return cheminD >= cheminG ? 'D' : 'G';
}

/**
 * Limites au-delà desquelles ce n'est plus un geste humain, mais la détection qui a sauté
 * d'une personne à l'autre.
 *
 * Elles s'expriment en largeurs d'épaules par SECONDE, jamais par image : un sprint de 5 m/s
 * représente 0,6 largeur par image à 20 i/s mais 1,0 à 12 i/s. Un seuil par image accusait donc
 * de « saut de détection » un joueur qui court simplement vers la balle — d'autant plus que si
 * la détection décroche, deux images exploitables peuvent être séparées de plusieurs dixièmes
 * de seconde, pendant lesquelles un joueur parcourt réellement plusieurs largeurs d'épaules.
 *
 * Repères : un sprint de haut niveau (7 m/s) vaut environ 17 largeurs/s. Un basculement d'un
 * joueur à l'autre en dépasse couramment 70.
 */
const VITESSE_CORPS_MAX = 25;         // largeurs d'épaules / s — au-delà, aucun humain ne court
const VITESSE_INVRAISEMBLABLE = 60;   // idem pour le poignet, sprint et frappe cumulés

/**
 * Écart maximal toléré entre deux images exploitables, en multiples de la cadence
 * d'échantillonnage. Au-delà, la détection a décroché : on ne sait pas ce qui s'est passé
 * entre les deux, donc on s'abstient de conclure — ni vitesse, ni accusation de saut.
 */
const ECARTS_TOLERES = 3;

/** Cadence réelle d'échantillonnage, déduite des horodatages. */
function periodeEchantillonnage(series) {
  const ecarts = [];
  for (let i = 1; i < series.length; i++) {
    const dt = series[i].t - series[i - 1].t;
    if (dt > 0) ecarts.push(dt);
  }
  return ecarts.length ? mediane(ecarts) : 1 / 12;
}

/**
 * Vitesse du poignet dominant, en largeurs d'épaules par seconde.
 *
 * Les sauts de détection sont écartés plutôt que lissés : quand le détecteur passe d'un
 * joueur à l'autre, le poignet paraît franchir la moitié de l'écran en une image. Une seule
 * de ces valeurs suffisait à fausser tout le seuil de détection, donc à ne plus rien trouver.
 */
export function vitessePoignet(series, main) {
  const cle = main === 'D' ? 'poignetD' : 'poignetG';
  const ecartMax = periodeEchantillonnage(series) * ECARTS_TOLERES;
  const v = new Array(series.length).fill(NaN);

  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1], b = series[i];
    if (!a.ok || !b.ok) continue;
    const dt = b.t - a.t;
    if (dt <= 0 || dt > ecartMax) continue;   // trou dans la détection : on ne conclut pas

    // Un corps qui se déplace plus vite qu'un sprint humain n'a pas couru : le squelette
    // a changé de personne. La comparaison se fait bien en vitesse, pas en distance.
    if (dist(a.hanches, b.hanches) / b.echelle / dt > VITESSE_CORPS_MAX) continue;

    // Vitesse du poignet RELATIVEMENT au bassin, et non par rapport à l'image.
    // Un joueur qui sprinte emmène son bras avec lui : mesurée dans l'absolu, sa course
    // ressemble à une frappe. Rapportée au corps, elle ne ressemble plus à rien — seul un
    // geste où la main part toute seule ressort. Sur banc d'essai, ce seul changement fait
    // passer la précision de 36 % à 100 % sur un sprint à 7 m/s.
    const relA = { x: a[cle].x - a.hanches.x, y: a[cle].y - a.hanches.y };
    const relB = { x: b[cle].x - b.hanches.x, y: b[cle].y - b.hanches.y };
    const vitesse = dist(relA, relB) / b.echelle / dt;
    if (vitesse > VITESSE_INVRAISEMBLABLE) continue;
    v[i] = vitesse;
  }
  return lisser(v, 3);
}

/**
 * Combien de fois le squelette a changé de place d'un coup, en proportion des transitions
 * exploitables. Au-delà de quelques pour cent, il y a plusieurs personnes dans le champ
 * ou la détection décroche sans arrêt — et aucun réglage de seuil n'y changera rien.
 */
export function tauxSautsDetection(series) {
  const ecartMax = periodeEchantillonnage(series) * ECARTS_TOLERES;
  let transitions = 0, sauts = 0;
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1], b = series[i];
    if (!a.ok || !b.ok) continue;
    const dt = b.t - a.t;
    // Un trou dans la détection n'est pas un saut : on ignore la transition au lieu de
    // l'imputer au joueur, qui a très bien pu courir pendant ce temps.
    if (dt <= 0 || dt > ecartMax) continue;
    transitions++;
    if (dist(a.hanches, b.hanches) / b.echelle / dt > VITESSE_CORPS_MAX) sauts++;
  }
  return transitions ? sauts / transitions : 0;
}

/**
 * Quantile d'une série. Sert de « maximum robuste » : un seul pic aberrant ne doit pas
 * décider du seuil de détection de toute la vidéo.
 */
function quantile(triee, q) {
  if (!triee.length) return NaN;
  const rang = borne(Math.round((triee.length - 1) * q), 0, triee.length - 1);
  return triee[rang];
}

/* ------------------------------------------------------------------ */
/* 2. Détection des frappes                                            */
/* ------------------------------------------------------------------ */

/**
 * Plancher absolu de vitesse, en largeurs d'épaules par seconde. Il évite de prendre un
 * replacement tranquille pour une frappe. Mais filmé de loin, ou à faible cadence, une vraie
 * frappe peut passer dessous : on garde donc un plancher de repli, essayé seulement quand
 * le premier ne trouve rien du tout.
 */
/**
 * En dessous de ce taux de détection, l'app cesse d'énoncer des verdicts techniques.
 * Les mesures restent visibles pour qui veut regarder, mais on ne dit plus « ton coude
 * est trop plié » à partir d'un squelette absent une image sur trois : le chiffre ne
 * décrirait pas le joueur.
 */
export const DETECTION_MINI_VERDICT = 0.7;

/**
 * Écart entre les deux poignets, en longueurs de tronc, sous lequel les deux mains tiennent
 * le manche. Un revers à deux mains reste bien en dessous ; un coup droit, bras libre
 * écarté, bien au-dessus.
 */
export const MAINS_JOINTES = 0.6;

/** Visibilité en dessous de laquelle un point est placé au jugé, pas vu. */
export const VISIBILITE_MINI = 0.5;

/** Nombre d'images du geste où les deux poignets doivent être vus pour trancher. */
export const IMAGES_MINI_ECART = 3;

export const PLANCHER_STRICT = 2.2;
export const PLANCHER_SOUPLE = 1.1;

export function detecterFrappes(
  series, vitesse,
  { ecartMin = 0.55, fenetreDomination = 1.0, ratioDomination = 1.25, plancher = PLANCHER_STRICT } = {},
) {
  const valides = finis(vitesse);
  if (valides.length < 5) return [];
  // 98e centile plutôt que le maximum : identique sur une vidéo propre, insensible aux
  // quelques images où la détection déraille.
  const reference = quantile([...valides].sort((a, b) => a - b), 0.98);
  const seuil = Math.max(reference * 0.45, plancher); // largeurs d'épaules / s

  const pics = [];
  for (let i = 1; i < vitesse.length - 1; i++) {
    const v = vitesse[i];
    if (!Number.isFinite(v) || v < seuil) continue;
    if (v >= (vitesse[i - 1] ?? 0) && v > (vitesse[i + 1] ?? 0)) pics.push({ i, v, t: series[i].t });
  }

  // Un armé ou un replacement produit lui aussi un pic. On écarte donc les pics dominés par
  // un voisin proche. Le voisinage vaut 1 seconde et la domination 1,25× : avec 0,8 s et
  // 1,7×, le replacement qui suit la frappe passait au travers et comptait comme une
  // deuxième balle, ce qui polluait les médianes et fabriquait de la fausse irrégularité.
  // Mesuré sur neuf situations types : 6 justes avant, 8 après. Le cas qui résiste est le
  // replacement à 85 % de la vitesse de frappe — à ce niveau, la vitesse du poignet seule
  // ne distingue plus les deux, et resserrer davantage fusionnerait deux vraies volées
  // jouées coup sur coup.
  const retenus = pics.filter((p) => !pics.some(
    (q) => q !== p && Math.abs(q.t - p.t) <= fenetreDomination && q.v > p.v * ratioDomination
  ));

  // Puis on garde les plus forts en respectant un écart minimal entre deux frappes.
  retenus.sort((a, b) => b.v - a.v);
  const gardes = [];
  for (const pic of retenus) {
    if (gardes.every((g) => Math.abs(g.t - pic.t) >= ecartMin)) gardes.push(pic);
  }
  return gardes.sort((a, b) => a.t - b.t);
}

/**
 * Pourquoi la détection n'a rien donné. Sans ces chiffres, « aucune frappe détectée »
 * laisse le joueur deviner — et il finit par changer des réglages sans rapport.
 */
export function diagnostiquerFrappes(series, vitesse) {
  const valides = finis(vitesse);
  const imagesOk = series.filter((s) => s.ok).length;
  const triee = [...valides].sort((a, b) => a - b);
  const max = valides.length ? quantile(triee, 0.98) : 0;
  const seuilStrict = Math.max(max * 0.45, PLANCHER_STRICT);
  const sauts = tauxSautsDetection(series);

  const pics = valides.length
    ? vitesse.filter((v, i) =>
      Number.isFinite(v) && i > 0 && i < vitesse.length - 1
      && v >= (vitesse[i - 1] ?? 0) && v > (vitesse[i + 1] ?? 0)).length
    : 0;

  return {
    images: series.length,
    imagesOk,
    vitesseMax: max,
    seuilStrict,
    picsBruts: pics,
    sauts,
    // Au-delà de 8 %, le squelette change de personne trop souvent pour qu'on mesure quoi que ce soit.
    detectionInstable: sauts > 0.08,
    // Le poignet n'a jamais accéléré : c'est un problème de vidéo, pas de réglage de seuil.
    tropLent: max < PLANCHER_SOUPLE,
  };
}

/* ------------------------------------------------------------------ */
/* 2 bis. Orientation de la caméra                                     */
/* ------------------------------------------------------------------ */

export const LIBELLES_ANGLE = {
  cote: 'sur le côté',
  face: 'de face',
  dos: 'de dos',
  autre: 'en diagonale',
};

/** Ce que chaque position de caméra permet — et ne permet pas — de mesurer. */
export const APPORT_ANGLE = {
  cote: 'idéal pour le coup droit et le revers',
  face: 'idéal pour le service, moins fiable pour les angles de bras en fond de court',
  dos: 'bon pour le service et les appuis',
  autre: "l'orientation change trop pour trancher",
};

/**
 * Déduit d'où la vidéo a été filmée, au lieu de le demander au joueur.
 *
 * Deux signaux suffisent, tous deux lisibles sur la posture :
 *
 * 1. La largeur d'épaules rapportée à la hauteur du tronc. De face ou de dos, les épaules
 *    occupent une large fraction du tronc ; de profil, elles se réduisent fortement.
 * 2. L'ordre des épaules à l'écran. MediaPipe nomme les points selon l'anatomie : quand le
 *    joueur nous fait face, son épaule droite apparaît à gauche de l'image (x plus petit) ;
 *    filmé de dos, l'ordre s'inverse. Le signe de la différence tranche donc face / dos.
 *
 * On prend la médiane sur toute la séquence : un joueur pivote sans arrêt, seule la
 * tendance d'ensemble décrit la caméra.
 */
export function detecterAngle(series) {
  const ok = series.filter((s) => s.ok);
  if (ok.length < 8) return { angle: 'autre', confiance: 0, largeurRelative: NaN, orientation: NaN };

  // Hauteur du tronc : épaules → hanches, dans la même unité que sw (x déjà mis à l'échelle).
  const largeurs = [];
  const orientations = [];
  for (const s of ok) {
    const tronc = Math.abs(s.hanches.y - s.epaules.y);
    if (tronc > 0.02) largeurs.push(s.sw / tronc);
    orientations.push(s.epauleD.x - s.epauleG.x);
  }
  if (!largeurs.length) return { angle: 'autre', confiance: 0, largeurRelative: NaN, orientation: NaN };

  const largeurRelative = mediane(largeurs);
  const orientation = mediane(orientations);

  // De profil, les épaules se superposent : la largeur relative s'effondre.
  const DE_PROFIL = 0.55;
  const DE_FACE = 0.80;

  let angle, confiance;
  if (largeurRelative < DE_PROFIL) {
    angle = 'cote';
    confiance = borne((DE_PROFIL - largeurRelative) / 0.25, 0.3, 1);
  } else if (largeurRelative >= DE_FACE) {
    angle = orientation < 0 ? 'face' : 'dos';
    confiance = borne((largeurRelative - DE_FACE) / 0.3 + 0.5, 0.4, 1);
  } else {
    // Entre les deux : trois quarts. On tranche vers le plus probable sans prétendre être sûr.
    angle = 'autre';
    confiance = 0.35;
  }

  return { angle, confiance, largeurRelative, orientation };
}

/* ------------------------------------------------------------------ */
/* 3. Mesures par frappe                                               */
/* ------------------------------------------------------------------ */

const fenetre = (series, t0, t1) =>
  series.filter((s) => s.ok && s.t >= t0 && s.t <= t1);

export function mesurerFrappe(series, pic, main, coupImpose = 'auto', revers = 'deux') {
  const contact = series[pic.i];
  if (!contact?.ok) return null;

  const clePoignet = main === 'D' ? 'poignetD' : 'poignetG';
  const cleCoude = main === 'D' ? 'angleCoudeD' : 'angleCoudeG';
  const cleEpaule = main === 'D' ? 'epauleD' : 'epauleG';
  const cleAutrePoignet = main === 'D' ? 'poignetG' : 'poignetD';

  const prep = fenetre(series, pic.t - 0.70, pic.t - 0.08);
  const suivi = fenetre(series, pic.t + 0.04, pic.t + 0.60);
  const global = fenetre(series, pic.t - 0.7, pic.t + 0.7);
  const avant = fenetre(series, pic.t - 1.1, pic.t - 0.45);
  if (!prep.length || !global.length) return null;

  // Unité de mesure : l'échelle corporelle, stable quand le joueur pivote (voir calibrerEchelle).
  // Elle s'exprime en largeurs d'épaules mais se calcule sur le tronc — d'où le nom explicite,
  // pour qu'on ne croie plus, en relisant, que c'est la largeur d'épaules brute.
  const echelle = mediane(global.map((s) => s.echelle));
  const poignet = contact[clePoignet];

  // Hauteur d'impact : 0 = hanche, 1 = épaule (l'axe y descend dans l'image)
  const ecartTronc = contact.hanches.y - contact.epaules.y;
  const hauteurImpact = ecartTronc > 0 ? (contact.hanches.y - poignet.y) / ecartTronc : NaN;

  // Rotation des épaules : la ligne d'épaules se raccourcit quand le buste se met de profil.
  // On compare le minimum et le maximum sur toute la frappe plutôt que « armé contre face » :
  // selon que la caméra est devant ou sur le côté, c'est l'armé ou l'impact qui paraît le plus
  // large, et seule l'amplitude du changement traduit réellement la rotation.
  // Ici, et ici seulement, on garde la largeur d'épaules brute : son effondrement EST
  // le signal de rotation. Le rapport min/max reste sans unité, donc insensible à l'échelle.
  const swMin = Math.min(...global.map((s) => s.sw));
  const swMax = Math.max(...global.map((s) => s.sw));
  const rotationEpaules = swMax > 0 ? swMin / swMax : NaN;

  // Flexion de genou la plus marquée pendant l'armé
  const flexionGenou = Math.min(
    ...prep.map((s) => Math.min(s.angleGenouG || 999, s.angleGenouD || 999))
  );

  // Stabilité : fenêtre resserrée autour du contact. Sur ± 0,25 s, un joueur qui court
  // chercher la balle parcourait naturellement plus d'une largeur d'épaules, et se voyait
  // reprocher un « déséquilibre » qui n'était que du déplacement. Sur ± 0,12 s, on mesure
  // ce qui compte : l'appui est-il posé au moment de frapper.
  const proche = fenetre(series, pic.t - 0.12, pic.t + 0.12);
  const xsBassin = proche.map((s) => s.hanches.x);
  const deplacementBassin = xsBassin.length
    ? (Math.max(...xsBassin) - Math.min(...xsBassin)) / echelle : NaN;
  // La tête se mesure PAR RAPPORT AU BASSIN. Mesurée dans l'image, elle comptait comme
  // défaut le simple fait de se déplacer vers la balle — or courir avec la tête au-dessus
  // du corps est du bon tennis. Seule la tête qui part indépendamment du tronc est un défaut.
  const teteSurCorps = (s) => ({ x: s.nez.x - s.hanches.x, y: s.nez.y - s.hanches.y });
  const teteReference = teteSurCorps(contact);
  const deplacementTete = proche.length
    ? Math.max(...proche.map((s) => dist(teteSurCorps(s), teteReference))) / echelle : NaN;

  // Accompagnement : longueur du trajet du poignet après l'impact
  let accompagnement = 0;
  for (let i = 1; i < suivi.length; i++) {
    accompagnement += dist(suivi[i - 1][clePoignet], suivi[i][clePoignet]) / echelle;
  }
  const finGeste = suivi.at(-1);
  const hauteurFin = finGeste && ecartTronc > 0
    ? (finGeste.hanches.y - finGeste[clePoignet].y) / ecartTronc : NaN;

  // Armé : longueur du trajet du poignet avant l'impact
  let amplitudePrep = 0;
  for (let i = 1; i < prep.length; i++) {
    amplitudePrep += dist(prep[i - 1][clePoignet], prep[i][clePoignet]) / echelle;
  }

  // Bras libre écarté du corps pendant l'armé (équilibre / repérage de balle)
  const brasLibre = mediane(prep.map((s) => dist(s[cleAutrePoignet], s.epaules) / s.sw));

  // Hauteur maximale du bras non dominant pendant l'armé (bras de lancer au service)
  const hauteurBrasLibre = ecartTronc > 0
    ? Math.max(...prep.map((s) => (s.hanches.y - s[cleAutrePoignet].y) / ecartTronc))
    : NaN;

  // Oscillation verticale du bassin avant la frappe → indice de split-step
  const oscillation = avant.length > 2
    ? (Math.max(...avant.map((s) => s.hanches.y)) - Math.min(...avant.map((s) => s.hanches.y))) / echelle
    : NaN;

  // Incertitude sur l'angle du coude, imposée par la cadence d'échantillonnage.
  // Le coude balaie plusieurs dizaines de degrés entre deux images au moment du swing :
  // l'angle relevé « à l'impact » dépend alors surtout de l'image sur laquelle on est tombé.
  // On mesure cette incertitude au lieu de faire comme si elle n'existait pas.
  const swing = fenetre(series, pic.t - 0.15, pic.t + 0.15);
  const ecartsCoude = [];
  for (let i = 1; i < swing.length; i++) {
    const a = swing[i - 1][cleCoude], b = swing[i][cleCoude];
    if (Number.isFinite(a) && Number.isFinite(b)) ecartsCoude.push(Math.abs(b - a));
  }
  // L'impact réel tombe entre deux images : l'erreur vaut au plus la moitié de l'écart.
  const incertitudeCoude = ecartsCoude.length ? mediane(ecartsCoude) / 2 : NaN;

  // Type de coup : la déclaration du joueur prime sur la reconnaissance automatique,
  // qui reste fragile en 2D (elle dépend fortement de l'angle de prise de vue).
  // La reconnaissance automatique tourne TOUJOURS, même quand le joueur a déclaré son coup.
  // Auparavant la déclaration court-circuitait tout : sur une séquence contenant des coups
  // droits et des revers, l'app recopiait le menu déroulant et étiquetait tout pareil.
  // Le type déclaré reste celui qui fait foi — la reconnaissance 2D est fragile — mais un
  // désaccord fréquent est désormais signalé au joueur.
  // Écart entre les deux poignets, en longueurs de tronc. Sur un revers à deux mains les
  // deux mains tiennent le manche ; sur un coup droit le bras libre est écarté. Cette
  // distance est la seule information de classement qui ne dépende ni de la main dominante,
  // ni du côté d'où filme la caméra, ni du sens dans lequel le joueur est tourné — et elle
  // survit à la confusion épaule gauche / épaule droite, qui est systématique quand le
  // joueur est de profil : intervertir deux points ne change pas la distance entre eux.
  // Le critère n'a de sens que si les deux poignets sont réellement vus : un poignet libre
  // masqué par le corps est placé au jugé par le modèle de posture, souvent au milieu du
  // tronc, ce qui simulerait un coup droit sur n'importe quel geste.
  // Mesuré sur tout le geste, et non sur la seule image du contact : filmée de côté, la main
  // libre passe derrière le corps une bonne partie du temps, et le modèle de posture ne la
  // voit alors pas franchement. En ne regardant qu'une image, le critère ne s'appliquait qu'à
  // 15 % des frappes d'une vidéo réelle — le reste retombait sur le repère fragile, celui-là
  // même qu'il devait remplacer. On garde donc la même exigence de visibilité, mais on la
  // cherche sur toutes les images du geste au lieu d'une seule.
  const autourDuGeste = fenetre(series, pic.t - 0.35, pic.t + 0.35);
  const ecarts = autourDuGeste
    .filter((f) => f.tronc > 0.01
      && (f.poignetG.v ?? 1) >= VISIBILITE_MINI && (f.poignetD.v ?? 1) >= VISIBILITE_MINI)
    .map((f) => dist(f.poignetG, f.poignetD) / f.tronc);
  const ecartMains = ecarts.length >= IMAGES_MINI_ECART ? mediane(ecarts) : NaN;

  // Ce qui a empêché, ou permis, de trancher : sans ces deux chiffres, on ne peut que
  // supposer pourquoi le critère fiable s'applique si rarement sur une vidéo réelle.
  const clePoignetLibre = main === 'D' ? 'poignetG' : 'poignetD';
  const visibiliteMainLibre = mediane(autourDuGeste.map((f) => f[clePoignetLibre]?.v ?? 1));
  const imagesEcart = ecarts.length;

  const auDessusTete = poignet.y < contact.nez.y;
  let typeDetecte, fiabiliteType;
  if (auDessusTete && hauteurImpact > 1.6) {
    typeDetecte = 'service';
    fiabiliteType = 'haute';
  } else {
    // Repère de secours, connu pour être fragile : de profil, le modèle de posture
    // intervertit régulièrement les deux épaules et le côté du bras s'inverse avec elles.
    const coteBras = Math.sign(contact[cleEpaule].x - contact.hanches.x);
    const cotePoignet = Math.sign(poignet.x - contact.hanches.x);
    let croise = coteBras !== 0 && cotePoignet !== 0 && coteBras !== cotePoignet;
    fiabiliteType = 'basse';

    // Quand le joueur joue son revers à deux mains, l'écart entre les mains tranche seul.
    if (revers === 'deux' && Number.isFinite(ecartMains)) {
      croise = ecartMains < MAINS_JOINTES;
      fiabiliteType = 'haute';
    }

    if (amplitudePrep < 0.85 && hauteurImpact > 0.1 && hauteurImpact < 1.4) {
      typeDetecte = croise ? 'volee-revers' : 'volee-coup-droit';
    } else {
      typeDetecte = croise ? 'revers' : 'coup-droit';
    }
  }
  const type = (coupImpose && coupImpose !== 'auto') ? coupImpose : typeDetecte;

  return {
    t: pic.t,
    indice: pic.i,
    type,
    vitesse: pic.v,
    hauteurImpact,
    coudeImpact: contact[cleCoude],
    rotationEpaules,
    flexionGenou: Number.isFinite(flexionGenou) && flexionGenou < 900 ? flexionGenou : NaN,
    deplacementBassin,
    deplacementTete,
    accompagnement,
    hauteurFin,
    amplitudePrep,
    brasLibre,
    hauteurBrasLibre,
    oscillation,
    typeDetecte,
    fiabiliteType,
    ecartMains,
    visibiliteMainLibre,
    imagesEcart,
    incertitudeCoude,
    busteImpact: contact.buste,
  };
}

export const LIBELLES_COUP = {
  'coup-droit': 'Coup droit',
  'revers': 'Revers',
  'service': 'Service',
  'volee-coup-droit': 'Volée de coup droit',
  'volee-revers': 'Volée de revers',
};

/**
 * Quelles mesures ont un sens pour quel coup. Le service n'a pas de « hauteur d'impact »
 * comparable au fond de court, et la rotation du tronc ne veut rien dire sur une volée.
 */
export function mesuresJugeables(type) {
  const service = type === 'service';
  const volee = String(type).startsWith('volee');
  const liste = ['flexionGenou', 'coudeImpact', 'accompagnement', 'deplacementTete', 'deplacementBassin'];
  if (!service) liste.unshift('hauteurImpact');
  if (!service && !volee) liste.splice(1, 0, 'rotationEpaules');
  return liste;
}

/** Le seuil à appliquer dépend du coup : un service se juge autrement qu'un coup droit. */
/**
 * Nom de la zone qui s'applique à une mesure, pour un coup donné.
 *
 * Nommer la zone et la lire sont deux besoins distincts : l'affichage doit pouvoir dire d'où
 * vient la zone employée, sans réécrire ces règles pour son compte — c'est ainsi qu'on se
 * retrouve avec trois versions de la même correspondance, dont deux périmées.
 */
export function cleSeuilPour(cle, type, revers = 'deux') {
  if (type === 'service' && cle === 'coudeImpact') return 'coudeService';
  if (type === 'service' && cle === 'flexionGenou') return 'flexionService';
  // Un revers à deux mains se joue coudes fléchis : lui appliquer la référence du coup
  // droit revenait à lui reprocher systématiquement un « bras trop plié ».
  if (cle === 'coudeImpact' && type === 'revers' && revers === 'deux') return 'coudeRevers2M';
  return { hauteurImpact: 'hauteurImpact', coudeImpact: 'coudeImpact',
    rotationEpaules: 'rotationEpaules', flexionGenou: 'flexionGenou',
    accompagnement: 'accompagnement', deplacementTete: 'stabiliteTete',
    deplacementBassin: 'stabiliteBassin' }[cle] || null;
}

export function seuilPour(cle, type, revers = 'deux') {
  const nom = cleSeuilPour(cle, type, revers);
  return nom ? SEUILS[nom] || null : null;
}

/**
 * Une médiane mérite-t-elle un verdict ?
 *
 * Citer « coude à 126° » comme point fort tout en signalant « ± 48° d'irrégularité »
 * est contradictoire : c'est la même mesure, et une médiane entourée d'un tel nuage ne
 * caractérise plus rien. On exige donc que la dispersion entre frappes reste inférieure
 * à la largeur de la zone visée ; au-delà, on décrit la variabilité au lieu de juger la
 * valeur centrale.
 */
export function medianeCaracteristique(valeurs, seuil) {
  const v = finis(valeurs);
  if (!seuil || v.length < 3) return { significative: true, ecart: NaN };
  const ecart = ecartType(v);
  const largeurZone = seuil.ideal[1] - seuil.ideal[0];
  return { significative: !Number.isFinite(ecart) || ecart <= largeurZone, ecart };
}

/**
 * L'angle du coude est-il mesurable à cette cadence ?
 *
 * Au moment du swing, le coude balaie plusieurs dizaines de degrés entre deux images.
 * L'angle relevé « à l'impact » dépend alors de l'image sur laquelle on est tombé, pas du
 * joueur. On compare donc l'incertitude d'échantillonnage à la largeur de la zone visée :
 * si elle en dépasse le tiers, le verdict ne mesurerait que le hasard.
 */
/**
 * Mesures dont le nuage est plus large que la zone à juger : leur médiane ne caractérise
 * rien. Ni reproche, ni point fort, ni chiffre affiché comme s'il était net — et surtout pas
 * de constat d'irrégularité fondé sur cette même dispersion, ce qui reviendrait à affirmer
 * et à suspendre la même chose dans le même rapport.
 */
export function mesuresNonCaracterisables(frappes, type, revers = 'deux') {
  return Object.keys(SEUILS_REGULARITE).filter((cle) => {
    const seuil = seuilPour(cle, type, revers);
    return seuil && !medianeCaracteristique(frappes.map((f) => f[cle]), seuil).significative;
  });
}

export function coudeMesurable(incertitude, seuil) {
  if (!Number.isFinite(incertitude) || !seuil) return true;
  const largeurZone = seuil.ideal[1] - seuil.ideal[0];
  return incertitude <= largeurZone / 3;
}

/**
 * Juge une frappe mesure par mesure : c'est ce qui permet de dire, frappe par frappe,
 * ce qui va et ce qui ne va pas — plutôt que d'afficher une colonne de chiffres nus.
 */
export function verdictsFrappe(frappe, revers = 'deux', nonCaracterisables = []) {
  const type = frappe.type;
  return mesuresJugeables(type).map((cle) => {
    const def = EXPLICATIONS.find((e) => e.cle === cle);
    const seuil = seuilPour(cle, type, revers);
    // Mesure que la cadence d'échantillonnage ne permet pas de trancher : on se tait.
    if (cle === 'coudeImpact' && !coudeMesurable(frappe.incertitudeCoude, seuil)) return null;
    // Mesure dont le nuage, sur l'ensemble des frappes, dépasse la zone à juger : le rapport
    // ne peut pas la déclarer incaractérisable d'un côté et la noter frappe par frappe de
    // l'autre. Le doute vaut pour tout le rapport, pas seulement pour la page des mesures.
    if (nonCaracterisables.includes(cle)) return null;
    if (!def || !seuil) return null;

    const valeur = frappe[cle];
    const { niveau, sens } = evaluer(valeur, seuil, incertitudePour(cle));
    if (niveau === 'inconnu') return null;

    const message = niveau === 'bon'
      ? def.bref.bon
      : (sens < 0 ? def.bref.bas : def.bref.haut) || def.bref.bon;

    return {
      cle,
      libelle: def.libelle,
      valeur,
      texte: valeur.toFixed(def.decimales) + def.unite,
      niveau,               // bon / moyen / mauvais
      sens,                 // -1 sous la zone, +1 au-dessus
      message,
      zone: libelleZone(seuil, def.unite),
      requeteVideo: def.requeteVideo,
    };
  }).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* 4. Règles de coaching                                               */
/* ------------------------------------------------------------------ */

/** Génère les constats pour un groupe de frappes du même type. */
function reglesGroupe(type, frappes, profil = {}) {
  const c = [];
  const revers = profil.revers === 'une' ? 'une' : 'deux';
  // Incertitude médiane sur l'angle du coude, imposée par la cadence d'échantillonnage.
  const incertitudeCoude = mediane(frappes.map((f) => f.incertitudeCoude));
  const n = frappes.length;
  const libelle = LIBELLES_COUP[type] || type;
  const med = (cle) => mediane(frappes.map((f) => f[cle]));

  // Une médiane ne vaut que si elle caractérise le nuage. Quand la dispersion dépasse la
  // largeur de la zone à juger, la médiane ne désigne plus rien : ni reproche, ni point fort.
  // Ce contrôle ne s'appliquait qu'au coude — les autres mesures subissent pourtant
  // exactement le même échantillonnage, et étaient livrées sans aucune réserve.
  const nonCaracterisables = new Set(mesuresNonCaracterisables(frappes, type, revers));

  const est = (cle, seuil) => (nonCaracterisables.has(cle)
    ? { niveau: 'inconnu', sens: 0, raison: 'dispersion' }
    : evaluer(med(cle), seuil, incertitudePour(cle, n)));

  const service = type === 'service';
  const volee = type.startsWith('volee');

  const ajouter = (o) => c.push({ coup: libelle, occurrences: n, ...o });

  /* --- Bras de lancer (service) --- */
  if (service) {
    const hbl = med('hauteurBrasLibre');
    if (Number.isFinite(hbl)) {
      if (hbl >= 1.15) {
        ajouter({
          niveau: 'bon', titre: 'Bras de lancer bien tendu',
          detail: "Ton bras non dominant monte haut et reste en l'air pendant l'armé : c'est ce qui garde le buste ouvert et le lancer régulier.",
        });
      } else {
        ajouter({
          niveau: hbl < 0.85 ? 'priorite' : 'corriger',
          titre: 'Bras de lancer qui retombe trop tôt',
          detail: `Ton bras de lancer redescend avant la frappe (hauteur ${hbl.toFixed(2)}, l'épaule vaut 1). Le buste s'affaisse, le point d'impact baisse et le lancer devient irrégulier.`,
          exo: "Lancers seuls, sans frapper : lance la balle et garde le bras tendu vers elle jusqu'à ce qu'elle redescende à hauteur de tête. 15 répétitions, puis 10 services complets avec la même sensation.",
        });
      }
    }
  }

  /* --- Rotation du tronc (coups de fond uniquement) --- */
  if (!volee && !service) {
    const r = est('rotationEpaules', SEUILS.rotationEpaules);
    const v = med('rotationEpaules');
    if (r.niveau === 'bon') {
      ajouter({
        niveau: 'bon', titre: 'Bonne rotation du tronc à la préparation',
        detail: `Tes épaules se mettent nettement de profil avant la frappe (indice ${v.toFixed(2)}, plus c'est bas mieux c'est). C'est la source principale de la vitesse de balle.`,
      });
    } else if (r.niveau !== 'inconnu') {
      ajouter({
        niveau: r.niveau === 'mauvais' ? 'priorite' : 'corriger',
        titre: 'Rotation du tronc insuffisante',
        detail: `Tu prépares surtout avec le bras : la ligne d'épaules reste presque de face à l'armé (indice ${v.toFixed(2)}). Tu perds la chaîne cinétique jambes → hanches → épaules, donc de la vitesse gratuite, et tu sollicites davantage l'épaule.`,
        exo: "Frappes sans balle : main libre posée sur le cadre, tourne les épaules jusqu'à voir ton dos de l'autre côté du filet avant de lâcher le geste. 3 séries de 10, puis 10 balles au panier en gardant la même sensation.",
      });
    }
  }

  /* --- Flexion des jambes --- */
  const seuilGenou = service ? SEUILS.flexionService : SEUILS.flexionGenou;
  const g = est('flexionGenou', seuilGenou);
  const vg = med('flexionGenou');
  if (g.niveau === 'bon') {
    ajouter({
      niveau: 'bon', titre: 'Bon engagement des jambes',
      detail: `Genou le plus fléchi à ${Math.round(vg)}° pendant l'armé : tu charges bien tes appuis avant de frapper.`,
    });
  } else if (g.sens > 0) {
    ajouter({
      niveau: service ? 'priorite' : 'corriger',
      titre: 'Jambes trop tendues',
      detail: `Ton genou ne descend qu'à ${Math.round(vg)}° (référence ${seuilGenou.ideal[0]}–${seuilGenou.ideal[1]}°). ${service ? "Sans flexion, il n'y a pas d'extension explosive : le service reste un geste de bras." : "Tu frappes debout : la puissance vient alors du bras seul et l'équilibre est fragile sur les balles basses."}`,
      exo: service
        ? "Services au ralenti en marquant 1 seconde d'arrêt en position armée genoux fléchis, puis extension. 2 séries de 8, puis à vitesse normale."
        : "Échanges avec consigne « toucher le genou du sol du regard » : sur chaque frappe, fléchis jusqu'à sentir la cuisse travailler avant de pousser.",
    });
  } else if (g.sens < 0 && g.niveau === 'mauvais') {
    ajouter({
      niveau: 'corriger', titre: 'Flexion excessive / position trop basse',
      detail: `Genou à ${Math.round(vg)}° : tu t'accroupis plus que nécessaire, ce qui coûte de l'énergie et ralentit la récupération entre deux balles.`,
      exo: "Travail de position d'attente : fléchis juste assez pour sentir le poids sur l'avant des pieds, puis enchaîne 10 déplacements latéraux.",
    });
  }

  /* --- Hauteur et distance d'impact --- */
  if (!service) {
    const h = est('hauteurImpact', SEUILS.hauteurImpact);
    const vh = med('hauteurImpact');
    if (h.niveau === 'bon') {
      ajouter({
        niveau: 'bon', titre: "Bonne hauteur d'impact",
        detail: `Tu frappes entre la hanche et l'épaule (indice ${vh.toFixed(2)}) : c'est la zone où tu contrôles le mieux la balle.`,
      });
    } else if (h.sens < 0) {
      ajouter({
        niveau: 'corriger', titre: 'Impact trop bas',
        detail: `La balle est frappée sous la hanche (indice ${vh.toFixed(2)}). Souvent le signe d'une prise de balle en retard ou d'un manque de flexion : tu subis le rebond au lieu de le prendre montant.`,
        exo: "Prise de balle en montée : place-toi un mètre à l'intérieur de la ligne de fond et frappe la balle avant qu'elle ne redescende. 20 répétitions au panier.",
      });
    } else if (h.sens > 0) {
      ajouter({
        niveau: 'corriger', titre: 'Impact très haut',
        detail: `Impact au-dessus de l'épaule (indice ${vh.toFixed(2)}). Sur balle haute c'est normal ponctuellement, mais si ça se répète, recule d'un pas ou travaille la prise de balle plus tôt.`,
        exo: "Alterne : 5 balles prises en montée juste après le rebond, 5 balles reculées et prises à la descente. Sens la différence de contrôle.",
      });
    }
  }

  /* --- Bras à l'impact --- */
  const seuilCoude = seuilPour('coudeImpact', type, revers);
  const co = est('coudeImpact', seuilCoude);
  const vco = med('coudeImpact');
  const dispersionCoude = medianeCaracteristique(frappes.map((f) => f.coudeImpact), seuilCoude);
  if (!dispersionCoude.significative) {
    // On ne peut pas à la fois louer une médiane et dénoncer sa dispersion : c'est la même
    // mesure. Quand le nuage dépasse la zone à juger, seule la variabilité a un sens.
    ajouter({
      niveau: 'corriger', coup: 'Mesure',
      titre: "Angle du coude trop variable pour être caractérisé",
      detail: `D'une frappe à l'autre, ton coude à l'impact varie de ± ${Math.round(dispersionCoude.ecart)}°, ` +
        `soit plus que la largeur de la zone à viser (${seuilCoude.ideal[0]}–${seuilCoude.ideal[1]}°). ` +
        `Annoncer une valeur moyenne n'aurait pas de sens : ce n'est pas un angle, c'est un nuage. ` +
        `Cet écart peut venir de ton geste comme de la cadence d'analyse — à 20 images/seconde, ` +
        `le coude bouge beaucoup entre deux images.`,
      exo: "Refilme la même séquence en ralenti (mode 120 ou 240 images/seconde de ton téléphone), " +
        "puis relance l'analyse à la cadence la plus haute proposée. Passer à 30 images/seconde ne " +
        "suffit pas : l'écart y baisserait d'environ un tiers, assez peu pour te faire conclure à tort " +
        "« ça persiste, c'est donc mon geste ». À 120 images/seconde, si l'écart s'effondre il venait " +
        "de la mesure ; s'il tient, c'est ton geste, et c'est alors la régularité qu'il faut travailler.",
    });
  } else if (!coudeMesurable(incertitudeCoude, seuilCoude)) {
    // Se taire vaut mieux que trancher au hasard : à cette cadence, l'angle relevé à
    // l'impact varie plus d'une image à l'autre que la largeur de la zone à juger.
    ajouter({
      niveau: 'info', coup: 'Mesure',
      titre: "Angle du coude non mesurable à cette cadence",
      detail: `Entre deux images, ton coude bouge d'environ ${(incertitudeCoude * 2).toFixed(0)}°. ` +
        `L'angle relevé au moment de l'impact dépendrait donc surtout de l'image sur laquelle ` +
        `on est tombé, pas de ton geste : aucun verdict n'est donné sur ce point, ni sur sa régularité. ` +
        `Il faudrait filmer et analyser à cadence nettement plus élevée pour trancher.`,
    });
  } else if (co.niveau === 'bon') {
    ajouter({
      niveau: 'bon', titre: service ? 'Bonne extension au service' : 'Bonne distance à la balle',
      detail: `Coude à ${Math.round(vco)}° à l'impact : ${service ? "tu frappes bras tendu, au point le plus haut." : "le bras est allongé sans être verrouillé, tu frappes à bonne distance du corps."}`,
    });
  } else if (co.sens < 0) {
    ajouter({
      niveau: co.niveau === 'mauvais' ? 'priorite' : 'corriger',
      titre: service ? 'Service frappé bras plié' : 'Impact trop près du corps',
      detail: `Coude à ${Math.round(vco)}° à l'impact (référence ${seuilCoude.ideal[0]}–${seuilCoude.ideal[1]}°). ${service ? "Tu perds beaucoup de hauteur d'impact, donc d'angle et de marge au-dessus du filet." : "Tu es coincé : la balle arrive dans les pieds et le geste se raccourcit."}`,
      exo: service
        ? "Service « pièce sur la raquette » : lance et frappe en cherchant à toucher le point le plus haut possible, sans forcer. Filme-toi de profil pour vérifier le bras tendu."
        : "Consigne d'espacement : sur 15 balles, oblige-toi à faire un dernier petit pas d'ajustement pour frapper bras long, quitte à jouer plus lentement.",
    });
  } else if (co.sens > 0 && !service) {
    ajouter({
      niveau: 'corriger', titre: 'Bras trop verrouillé',
      detail: `Coude quasiment bloqué à ${Math.round(vco)}° : le geste devient rigide, la tête de raquette accélère moins bien.`,
      exo: "Travail de relâchement : frappe 10 balles à 60 % en cherchant à sentir la raquette « tomber » puis fouetter, coude légèrement souple.",
    });
  }

  /* --- Accompagnement --- */
  if (!volee) {
    const a = est('accompagnement', SEUILS.accompagnement);
    const va = med('accompagnement');
    if (a.niveau === 'bon') {
      ajouter({
        niveau: 'bon', titre: 'Accompagnement complet',
        detail: `Ton geste continue nettement après l'impact (amplitude ${va.toFixed(1)} largeurs d'épaules) : la raquette accélère à travers la balle.`,
      });
    } else if (a.sens < 0) {
      ajouter({
        niveau: 'priorite', titre: 'Geste coupé après la frappe',
        detail: `L'accompagnement s'arrête très vite (${va.toFixed(1)} largeurs d'épaules). Quand on freine à l'impact, on décélère en réalité *avant* l'impact : perte de vitesse et de longueur de balle.`,
        exo: "Finis systématiquement au-dessus de l'épaule opposée et garde la position 1 seconde. 20 balles avec ce seul objectif, sans regarder où va la balle.",
      });
    }
  } else {
    const va = med('accompagnement');
    if (Number.isFinite(va) && va > 2.2) {
      ajouter({
        niveau: 'corriger', titre: 'Volée trop swinguée',
        detail: `Ton geste de volée est long (${va.toFixed(1)} largeurs d'épaules). À la volée on bloque : geste court, poignet ferme, c'est l'avancée du corps qui donne la profondeur.`,
        exo: "Volées contre un mur ou en demi-court, raquette qui ne dépasse jamais la ligne des épaules. 30 répétitions.",
      });
    }
  }

  /* --- Stabilité --- */
  const sb = est('deplacementBassin', SEUILS.stabiliteBassin);
  const st = est('deplacementTete', SEUILS.stabiliteTete);
  // Chaque appui a droit à son constat, en bien comme en mal. Auparavant, un bassin
  // parfaitement stable ne valait aucun crédit dès lors que la tête bougeait : la mesure
  // ne pouvait alors produire qu'un reproche, jamais un encouragement.
  if (sb.niveau === 'bon' && st.niveau === 'bon') {
    ajouter({
      niveau: 'bon', titre: 'Bon équilibre à la frappe',
      detail: 'Tête et bassin restent stables au moment du contact : ta base est solide, le geste est reproductible.',
    });
  } else {
    if (sb.niveau === 'bon') {
      ajouter({
        niveau: 'bon', titre: 'Bassin stable à la frappe',
        detail: `Ton bassin ne bouge que de ${med('deplacementBassin').toFixed(2)} largeur d'épaules autour de l'impact : ton appui est posé avant le geste, c'est une base saine.`,
      });
    }
    if (st.niveau === 'bon') {
      ajouter({
        niveau: 'bon', titre: 'Tête stable au contact',
        detail: `Ta tête ne bouge que de ${med('deplacementTete').toFixed(2)} largeur d'épaules autour du contact : ton regard reste sur la balle.`,
      });
    }
    if (sb.sens > 0) {
      ajouter({
        // Jamais « priorité » : depuis une seule caméra, on ne sait pas distinguer un
        // déséquilibre d'une frappe en course, qui est un coup légitime.
        niveau: 'corriger',
        titre: 'Bassin encore lancé au moment du contact',
        detail: `Autour du contact, ton bassin parcourt ${med('deplacementBassin').toFixed(2)} largeur d'épaules ` +
          `en un quart de seconde. Sur une balle courue, c'est normal ; si ça se répète sur des balles ` +
          `confortables, l'appui n'est pas posé au moment de frapper et la régularité en souffre.`,
        exo: "Frappes en fente : pose l'appui avant et interdis-toi de le décoller avant la fin du geste. 15 balles de chaque côté.",
      });
    }
    if (st.sens > 0) {
      ajouter({
        niveau: st.niveau === 'mauvais' ? 'priorite' : 'corriger',
        titre: 'Tête qui bouge à l\'impact',
        detail: `Ta tête se déplace de ${med('deplacementTete').toFixed(2)} largeur d'épaules autour du contact. C'est la cause n°1 des fautes de centrage.`,
        exo: "Consigne « regarder le point d'impact » : garde le regard sur la zone de contact jusqu'à la fin de l'accompagnement, ne suis pas la balle des yeux. 20 balles.",
      });
    }
  }

  /* --- Split-step --- */
  const osc = med('oscillation');
  if (Number.isFinite(osc) && !service) {
    if (osc < 0.05) {
      ajouter({
        niveau: 'corriger', titre: 'Pas de split-step visible',
        detail: `Le bassin ne monte quasiment pas avant la frappe (${osc.toFixed(3)}). Sans ce petit rebond au moment où l'adversaire frappe, tu pars systématiquement en retard sur la balle.`,
        exo: "Exercice au panier : le coach annonce « hop » à chaque lancer, tu sautes légèrement et atterris sur l'avant des pieds juste avant de partir. 3 séries de 10.",
      });
    } else if (osc > 0.09) {
      ajouter({
        niveau: 'bon', titre: 'Reprise d\'appuis présente',
        detail: "On voit un rebond du bassin avant les frappes : ton split-step est là, tu démarres avec les appuis dynamiques.",
      });
    }
  }

  /* --- Régularité d'une frappe à l'autre --- */
  if (n >= 3) {
    const ecartes = [];
    const mesures = Object.entries(SEUILS_REGULARITE).map(([cle, def]) => {
      // Une irrégularité inférieure à l'erreur de mesure ne mesure pas le joueur.
      // Le coude balaie des dizaines de degrés entre deux images : à cette cadence,
      // annoncer « ± 36° d'irrégularité » reviendrait à chiffrer le hasard.
      if (cle === 'coudeImpact' && !coudeMesurable(incertitudeCoude, seuilCoude)) {
        return { cle, ...def, et: NaN, etat: 'inconnu', exces: NaN };
      }
      // Contradiction à éviter : on ne peut pas déclarer une mesure « trop dispersée pour
      // être caractérisée », puis se servir de cette même dispersion pour affirmer que le
      // joueur ne refait pas deux fois le même geste. Le premier constat dit qu'on ne sait
      // pas encore ; le second trancherait. C'est le premier qui a raison.
      if (nonCaracterisables.has(cle)) {
        ecartes.push(def.libelle);
        return { cle, ...def, et: NaN, etat: 'inconnu', exces: NaN };
      }
      const et = ecartType(frappes.map((f) => f[cle]));
      const [bon, acceptable] = def.seuils;
      return {
        cle, ...def, et,
        etat: !Number.isFinite(et) ? 'inconnu' : et <= bon ? 'bon' : et <= acceptable ? 'moyen' : 'mauvais',
        exces: Number.isFinite(et) ? et / bon : NaN,
      };
    }).filter((m) => m.etat !== 'inconnu');

    const pires = mesures.filter((m) => m.etat !== 'bon').sort((a, b) => b.exces - a.exces);
    const format = (m) => `${m.libelle} (± ${m.et < 1 ? m.et.toFixed(2) : Math.round(m.et)}${m.unite})`;

    if (mesures.length && !pires.length) {
      ajouter({
        niveau: 'bon', titre: 'Geste reproductible',
        detail: `Tes ${n} frappes se ressemblent beaucoup : point d'impact, bras et amplitude varient peu d'une balle à l'autre. C'est le vrai marqueur du niveau — un bon geste répété bat un geste parfait une fois sur cinq.`,
      });
    } else if (pires.length) {
      const grave = pires.some((m) => m.etat === 'mauvais');
      ajouter({
        niveau: grave ? 'priorite' : 'corriger',
        titre: 'Frappes trop irrégulières',
        detail: `D'une frappe à l'autre, ce qui bouge le plus : ${pires.slice(0, 2).map(format).join(', ')}. ` +
          `Sur ${n} frappes du même coup, ces écarts veulent dire que tu ne refais pas deux fois le même geste — c'est ce qui produit les fautes inexpliquées.`
          + (ecartes.length ? ` À noter : ${ecartes.join(' et ')} n'entre(nt) pas dans ce calcul — la dispersion y est trop forte pour qu'on sache encore si elle vient du geste ou de la mesure.` : ''),
        exo: `Série de 10 balles lentes, même hauteur, même cible, sans chercher la puissance : l'objectif est que les 10 se ressemblent. Compte celles qui « sonnent » pareil.`,
      });
    } else if (ecartes.length) {
      // Toutes les mesures de régularité ont été écartées : on ne conclut rien, et on le dit.
      ajouter({
        niveau: 'info', coup: 'Mesure',
        titre: 'Régularité du geste encore indéterminée',
        detail: `La régularité ne peut pas être jugée sur ce coup : ${ecartes.join(' et ')} `
          + `varie(nt) trop d'une frappe à l'autre pour qu'on sache si c'est ton geste ou la cadence `
          + `d'analyse. Aucune conclusion sur la régularité tant que le test en ralenti n'a pas tranché.`,
      });
    }
  }

  /* --- Bras libre (coups de fond) --- */
  if (!service && !volee) {
    const bl = med('brasLibre');
    if (Number.isFinite(bl) && bl < 0.55) {
      ajouter({
        niveau: 'corriger', titre: 'Bras libre collé au corps',
        detail: `Ton bras non dominant reste près du buste pendant l'armé (${bl.toFixed(2)}). Il sert pourtant à mesurer la distance à la balle et à équilibrer la rotation.`,
        exo: "Coup droit : pointe la balle du doigt avec la main libre pendant toute la préparation, puis ramène-la contre le buste au moment de la frappe. 20 répétitions.",
      });
    }
  }

  return c;
}

/** Règles globales, indépendantes du type de coup. */
function reglesGlobales(frappes, duree, tauxDetection, profil = {}, mainSuspecte = false, contexte = {}) {
  const c = [];
  const { diagnostic, detectionSouple, fenetre, camera } = contexte;

  // Aucune frappe : dire précisément ce qui a été vu, sinon le joueur change des réglages au hasard.
  if (!frappes.length && diagnostic && !mainSuspecte) {
    const pistes = [];

    // Zéro image reconnue n'est pas un problème de cadrage : c'est une panne. Le dire,
    // au lieu d'envoyer le joueur refilmer pour rien.
    if (diagnostic.imagesOk === 0) {
      c.push({
        niveau: 'priorite', coup: 'Détection',
        titre: 'La détection de posture n\'a pas fonctionné',
        detail: `Le joueur n'a été reconnu sur aucune des ${diagnostic.images} images. Ce n'est pas ` +
          `ton cadrage : quand la détection fonctionne, elle trouve toujours quelque chose, même ` +
          `mal. Zéro sur toute la séquence veut dire que le détecteur lui-même n'a pas tourné.`,
        exo: 'Recharge complètement la page (tire l\'écran vers le bas) et relance l\'analyse. ' +
          'Si le problème persiste, essaie depuis un autre navigateur et signale-le.',
      });
      return c;
    }

    // Cause la plus fréquente et la plus déroutante : le squelette saute d'une personne
    // à l'autre. Elle passe avant tout le reste, car aucun réglage ne la compense.
    if (diagnostic.detectionInstable) {
      pistes.push("le squelette saute d'une personne à l'autre sur " +
        `${Math.round(diagnostic.sauts * 100)} % des images : filme un seul joueur dans le champ, ` +
        "ou recadre pour que l'adversaire et les joueurs du court voisin sortent de l'image");
    }
    if (tauxDetection < 0.5) {
      pistes.push("le joueur n'est reconnu que sur une minorité d'images : cadre-le en entier, " +
        "des pieds à la raquette levée, avec un seul joueur dans le champ");
    }
    if (diagnostic.tropLent) {
      pistes.push("le poignet ne va jamais vite : soit la séquence ne contient pas de frappe, " +
        "soit le joueur est trop loin ou trop petit dans l'image — rapproche la caméra à 5–10 m");
    }
    if (fenetre && fenetre.dureeVideo - fenetre.fin > 1) {
      pistes.push(`seules les secondes ${Math.round(fenetre.debut)} à ${Math.round(fenetre.fin)} ` +
        `ont été regardées, alors que ta vidéo dure ${Math.round(fenetre.dureeVideo)} s — ` +
        `si tu joues plus tard, augmente « Durée analysée » ou décale « Début » dans les réglages avancés`);
    }
    if (fenetre && fenetre.fps <= 8) {
      pistes.push("à 8 images par seconde, une frappe rapide peut passer entre deux images : " +
        "monte à 12 ou 20 dans les réglages avancés");
    }
    if (!pistes.length) {
      pistes.push("la vidéo a bien été lue, mais aucun mouvement n'a le profil d'une frappe " +
        "— vérifie que la séquence contient bien des balles jouées");
    }

    c.push({
      niveau: 'priorite', coup: 'Détection',
      titre: 'Aucune frappe trouvée dans cet extrait',
      detail: `Sur ${diagnostic.images} images, le joueur a été reconnu sur ${diagnostic.imagesOk} ` +
        `(${Math.round(tauxDetection * 100)} %). Vitesse maximale du poignet : ` +
        `${diagnostic.vitesseMax.toFixed(1)} largeurs d'épaules par seconde, alors qu'une frappe ` +
        `en demande au moins ${diagnostic.seuilStrict.toFixed(1)}. ` +
        (diagnostic.detectionInstable
          ? `Surtout, le squelette change de personne sur ${Math.round(diagnostic.sauts * 100)} % ` +
            `des images : tant que ça saute autant, aucune mesure n'est fiable. `
          : '') +
        `L'angle de la caméra n'y est pour rien : il ne sert qu'à nuancer les conseils, ` +
        `jamais à repérer les frappes.`,
      exo: `À essayer, dans cet ordre : ${pistes.join(' ; ')}.`,
    });
  }

  if (diagnostic?.detectionInstable && frappes.length) {
    c.push({
      niveau: 'priorite', coup: 'Qualité vidéo',
      titre: 'Le squelette saute d\'une personne à l\'autre',
      detail: `Sur ${Math.round(diagnostic.sauts * 100)} % des images, le corps détecté se déplace ` +
        `d'un bond : la détection change de personne. Les mesures ci-dessous mélangent donc ` +
        `probablement plusieurs joueurs et sont à prendre avec beaucoup de recul.`,
      exo: "Refilme avec un seul joueur visible : recadre pour sortir l'adversaire et le court voisin, " +
        "ou rapproche-toi pour que ton joueur occupe la plus grande partie de l'image.",
    });
  }

  if (detectionSouple && frappes.length) {
    c.push({
      niveau: 'corriger', coup: 'Détection',
      titre: 'Frappes repérées de justesse',
      detail: "Aucun mouvement n'atteignait le seuil habituel : l'app a abaissé son exigence pour " +
        "ne pas te renvoyer une page vide. Les frappes ci-dessous sont probablement les bonnes, " +
        "mais un geste de replacement a pu s'y glisser.",
      exo: 'Filme de plus près (5 à 10 m, joueur en entier) pour une détection franche.',
    });
  }

  // On ne compare que la FAMILLE du coup — coup droit, revers, service — en ignorant la
  // distinction volée / fond de court, trop fragile en 2D pour fonder une alerte. Sans ce
  // regroupement, une séquence de revers pouvait déclencher « ça ressemble à des volées de
  // coup droit » : un faux signalement plus déroutant qu'utile.
  // Le coup déclaré fait foi, mais s'il contredit souvent ce qui est reconnu, le dire :
  // sur un échange contenant coups droits et revers, tout étiqueter pareil serait faux.
  if (frappes.length >= 4 && profil.coup && profil.coup !== 'auto') {
    const famille = (t) => String(t).replace(/^volee-/, '');
    // On ne signale un mélange que si le classement repose sur le critère fiable — l'écart
    // entre les deux mains. Le repère de secours, fondé sur le côté du bras, s'inverse quand
    // le joueur est de profil : il a produit « 8 frappes sur 10 ressemblent à des coups
    // droits » sur une série qui n'était que des revers. Une alerte fausse est pire que pas
    // d'alerte : elle apprend à ignorer les alertes.
    const fiables = frappes.filter((f) => f.fiabiliteType === 'haute');
    const desaccords = fiables.filter((f) => f.typeDetecte && famille(f.typeDetecte) !== famille(f.type));
    const part = fiables.length >= 4 ? desaccords.length / fiables.length : 0;
    if (part >= 0.35) {
      const compte = new Map();
      for (const f of desaccords) {
        const fam = famille(f.typeDetecte);
        compte.set(fam, (compte.get(fam) || 0) + 1);
      }
      const autre = [...compte.entries()].sort((a, b) => b[1] - a[1])[0];
      c.push({
        // Tant que le coup analysé est peut-être le mauvais, tout le reste du rapport est un
        // commentaire sur le mauvais geste. C'est donc la priorité, avant toute technique.
        niveau: 'priorite', coup: 'Réglage',
        titre: 'La séquence ne contient sans doute pas que ce coup',
        detail: `Tu as déclaré « ${LIBELLES_COUP[profil.coup] || profil.coup} », et toutes les frappes ` +
          `sont analysées comme telles. Or ${desaccords.length} frappe(s) sur ${fiables.length} ressemblent ` +
          `plutôt à « ${LIBELLES_COUP[autre[0]] || autre[0]} ». Les repères techniques diffèrent d'un coup ` +
          `à l'autre : mélangés, les constats perdent de leur sens. Tant que ce point n'est pas réglé, ` +
          `lis le reste du rapport avec réserve : il peut porter sur un autre coup que celui que tu crois.`,
        exo: "Découpe ta vidéo pour n'analyser qu'un seul type de coup à la fois (réglages avancés : " +
          "début et durée), ou choisis « Un peu de tout, devine » pour laisser l'app classer chaque frappe.",
      });
    }
  }

  if (camera && frappes.length) {
    const dit = LIBELLES_ANGLE[camera.angle]
      ? `${LIBELLES_ANGLE[camera.angle]} — ${APPORT_ANGLE[camera.angle]}`
      : undefined;
    c.push({
      niveau: 'info', coup: 'Prise de vue',
      titre: `Caméra détectée : ${LIBELLES_ANGLE[camera.angle] || 'position indéterminée'}`,
      detail: `La position de la caméra est déduite de ta posture, tu n'as rien à renseigner : ${dit}.` +
        (camera.confiance < 0.5 ? " Détection peu sûre sur cette vidéo." : ''),
    });
  }

  if (mainSuspecte) {
    c.push({
      niveau: 'priorite', coup: 'Réglage',
      titre: 'La main déclarée est probablement la mauvaise',
      detail: `Aucune frappe n'a été trouvée du côté ${profil.main === 'right' ? 'droit' : 'gauche'}, ` +
        `alors que l'autre bras, lui, frappe nettement. Il s'agit presque toujours d'une inversion ` +
        `dans le formulaire — ou d'une vidéo vue en miroir (certaines caméras frontales retournent l'image).`,
      exo: `Change « Tu joues de quelle main ? » en « ${profil.main === 'right' ? 'Gaucher' : 'Droitier'} » et relance l'analyse.`,
    });
  }
  if (profil.main === 'auto') {
    c.push({
      niveau: 'corriger', coup: 'Réglage',
      titre: 'Main dominante devinée, pas déclarée',
      detail: "La main qui tient la raquette a été détectée automatiquement, ce qui est peu fiable — surtout sur un revers à deux mains, où les deux bras bougent autant. Si elle est fausse, l'app mesure le mauvais bras et confond coup droit et revers.",
      exo: "Renseigne « Droitier » ou « Gaucher » dans le formulaire avant de relancer l'analyse.",
    });
  }
  if (tauxDetection < 0.7) {
    // C'est le facteur numéro un : sur banc d'essai, passer de 100 % à 60 % de détection
    // fait chuter le nombre de frappes retrouvées de 100 % à 58 % (à 20 images/s), et à 8 %
    // seulement si la vidéo n'est échantillonnée qu'à 12 images/s. Autant le dire.
    const basseCadence = fenetre && fenetre.fps < 20;
    c.push({
      niveau: tauxDetection < 0.5 ? 'priorite' : 'corriger',
      coup: 'Qualité vidéo',
      titre: 'Détection partielle du joueur',
      detail: `Le joueur n'a été reconnu que sur ${Math.round(tauxDetection * 100)} % des images. ` +
        `C'est le principal facteur de fiabilité de toute l'analyse : le moment le plus rapide de ` +
        `la frappe dure environ deux dixièmes de seconde, et s'il tombe dans un trou de détection, ` +
        `la frappe est perdue. En dessous de 70 %, des frappes manquent forcément.`,
      exo: (basseCadence
        ? `Relance d'abord à 20 images/seconde (réglages avancés, en haut) : c'est ce qui rattrape ` +
          `le plus quand la détection est imparfaite. Puis, si besoin : `
        : 'À essayer : ') +
        `cadre le joueur en entier et le plus grand possible dans l'image, caméra fixe, ` +
        `bon éclairage, et un seul joueur visible.`,
    });
  }
  if (frappes.length && duree > 0) {
    const cadence = (frappes.length / duree) * 60;
    c.push({
      niveau: 'info', coup: 'Général',
      titre: `${frappes.length} frappe${frappes.length > 1 ? 's' : ''} détectée${frappes.length > 1 ? 's' : ''}`,
      detail: `Soit environ ${Math.round(cadence)} frappes par minute sur la séquence analysée.`,
    });
  }
  return c;
}

/* ------------------------------------------------------------------ */
/* 5. Corrélation avec le devenir de la balle                          */
/* ------------------------------------------------------------------ */

const LIBELLES_RESULTAT = {
  bonne: 'bonnes balles', filet: 'balles au filet', longue: 'balles trop longues',
  large: 'balles larges', cadre: 'fautes de cadre',
};

/** Mesures comparables entre balles réussies et balles ratées. */
const MESURES_COMPAREES = [
  { cle: 'hauteurImpact', libelle: "le point d'impact", ecartMin: 0.18,
    plus: 'plus haut', moins: 'plus bas', decimales: 2 },
  { cle: 'coudeImpact', libelle: 'le bras', ecartMin: 9,
    plus: 'plus tendu', moins: 'plus plié', decimales: 0, unite: '°' },
  { cle: 'rotationEpaules', libelle: 'la rotation du buste', ecartMin: 0.09,
    plus: 'plus faible', moins: 'plus marquée', decimales: 2 },
  { cle: 'accompagnement', libelle: "l'accompagnement", ecartMin: 0.5,
    plus: 'plus long', moins: 'plus court', decimales: 1 },
  { cle: 'flexionGenou', libelle: 'les jambes', ecartMin: 10,
    plus: 'plus tendues', moins: 'plus fléchies', decimales: 0, unite: '°' },
  { cle: 'deplacementTete', libelle: 'la tête', ecartMin: 0.12,
    plus: 'plus mobile', moins: 'plus stable', decimales: 2 },
];

/**
 * Compare les frappes réussies aux frappes ratées, par type de faute.
 * Ne conclut que sur des écarts nets et sur des effectifs suffisants : avec deux balles
 * de chaque côté, n'importe quelle différence peut être du hasard.
 * @param {Array} frappes frappes portant un champ `resultat`
 */
export function analyserResultats(frappes) {
  const constats = [];
  const notees = frappes.filter((f) => f.resultat);
  const bonnes = notees.filter((f) => f.resultat === 'bonne');

  if (notees.length < 4) {
    return { constats, notees: notees.length, suffisant: false };
  }
  if (bonnes.length < 2) {
    constats.push({
      niveau: 'info', coup: 'Balles',
      titre: 'Il manque des balles réussies pour comparer',
      detail: `Tu as noté ${notees.length} frappe(s), dont ${bonnes.length} bonne(s). Pour repérer ce qui distingue une balle réussie d'une balle ratée, il en faut au moins deux de chaque.`,
    });
    return { constats, notees: notees.length, suffisant: false };
  }

  const parFaute = new Map();
  for (const f of notees) {
    if (f.resultat === 'bonne') continue;
    if (!parFaute.has(f.resultat)) parFaute.set(f.resultat, []);
    parFaute.get(f.resultat).push(f);
  }

  for (const [faute, liste] of parFaute) {
    if (liste.length < 2) continue;

    const differences = [];
    for (const m of MESURES_COMPAREES) {
      const medRate = mediane(liste.map((f) => f[m.cle]));
      const medBonne = mediane(bonnes.map((f) => f[m.cle]));
      if (!Number.isFinite(medRate) || !Number.isFinite(medBonne)) continue;
      const ecart = medRate - medBonne;
      if (Math.abs(ecart) < m.ecartMin) continue;
      differences.push({
        m, ecart,
        texte: `${m.libelle} est ${ecart > 0 ? m.plus : m.moins} ` +
          `(${medRate.toFixed(m.decimales)}${m.unite || ''} contre ${medBonne.toFixed(m.decimales)}${m.unite || ''} sur tes bonnes balles)`,
      });
    }

    const nom = LIBELLES_RESULTAT[faute] || faute;
    if (differences.length) {
      differences.sort((a, b) => Math.abs(b.ecart / b.m.ecartMin) - Math.abs(a.ecart / a.m.ecartMin));
      constats.push({
        niveau: 'priorite', coup: 'Balles',
        titre: `Ce qui change sur tes ${nom}`,
        detail: `Sur tes ${liste.length} ${nom}, comparées à tes ${bonnes.length} bonnes balles : ` +
          differences.slice(0, 3).map((d) => d.texte).join(' ; ') + '.',
        exo: `Refais une série en te concentrant uniquement sur ${differences[0].m.libelle} : ` +
          `c'est le plus gros écart entre tes réussites et tes fautes.`,
      });
    } else {
      constats.push({
        niveau: 'info', coup: 'Balles',
        titre: `Rien de mesurable ne distingue tes ${nom}`,
        detail: `Tes ${liste.length} ${nom} ont un geste très proche de tes bonnes balles. La cause est donc ailleurs que dans ce que l'app sait voir : très probablement la prise de raquette, l'orientation du tampon à l'impact, ou le timing par rapport au rebond.`,
      });
    }
  }

  return { constats, notees: notees.length, suffisant: true };
}

/* ------------------------------------------------------------------ */
/* 6. Point d'entrée                                                   */
/* ------------------------------------------------------------------ */

export function analyser({ frames, largeur, hauteur, tauxDetection, fenetre = null,
  empreinteMesures = null }, profil = {}) {
  const { main = 'auto', coup = 'auto' } = profil;

  const series = calibrerEchelle(construireSeries(frames, largeur, hauteur));
  const mainDominante = detecterMain(series, main);
  const vitesse = vitessePoignet(series, mainDominante);
  const camera = detecterAngle(series);

  // Deux passes : la stricte évite de confondre un replacement avec une frappe ; la souple
  // ne sert que si la stricte ne trouve rien — mieux vaut une détection prudente que rien.
  let pics = detecterFrappes(series, vitesse);
  let detectionSouple = false;
  if (!pics.length) {
    pics = detecterFrappes(series, vitesse, { plancher: PLANCHER_SOUPLE });
    detectionSouple = pics.length > 0;
  }
  const diagnostic = diagnostiquerFrappes(series, vitesse);

  const frappes = pics
    .map((pic) => mesurerFrappe(series, pic, mainDominante, coup, profil.revers === 'une' ? 'une' : 'deux'))
    .filter(Boolean);

  // Filet de sécurité : si la main déclarée ne donne rien alors que l'autre bras frappe
  // visiblement, c'est presque toujours une erreur de saisie — on le dit plutôt que
  // d'afficher un résultat vide et inexplicable.
  let mainSuspecte = false;
  if (!frappes.length && (main === 'right' || main === 'left')) {
    const autre = mainDominante === 'D' ? 'G' : 'D';
    mainSuspecte = detecterFrappes(series, vitessePoignet(series, autre)).length > 0;
  }

  const duree = series.length ? series.at(-1).t - series[0].t : 0;

  // Groupement par type, en fusionnant les volées avec leur coup de fond si trop peu nombreuses
  const groupes = new Map();
  for (const f of frappes) {
    if (!groupes.has(f.type)) groupes.set(f.type, []);
    groupes.get(f.type).push(f);
  }

  let constats = [];
  for (const [type, liste] of groupes) {
    if (liste.length === 0) continue;
    constats = constats.concat(reglesGroupe(type, liste, profil));
  }
  constats = constats.concat(reglesGlobales(frappes, duree, tauxDetection, profil, mainSuspecte,
    { diagnostic, detectionSouple, fenetre, camera }));

  // Score : on part de 100 et on retire selon la gravité des constats
  const penalites = { priorite: 15, corriger: 8, bon: 0, info: 0 };
  const brut = constats.reduce((s, c) => s - (penalites[c.niveau] || 0), 100);
  const bonus = Math.min(10, constats.filter((c) => c.niveau === 'bon').length * 2);
  let score = borne(brut + bonus, 25, 100);
  // Un point fort ne doit jamais effacer un défaut : on plafonne selon la gravité restante.
  if (constats.some((c) => c.niveau === 'priorite')) score = Math.min(score, 82);
  else if (constats.some((c) => c.niveau === 'corriger')) score = Math.min(score, 92);
  score = frappes.length ? Math.round(score) : null;

  // Sous le seuil de fiabilité, les verdicts techniques sont retirés : ils décriraient
  // le bruit de détection, pas le joueur. Les constats de qualité vidéo, eux, restent —
  // ce sont précisément ceux qui expliquent pourquoi.
  if (frappes.length && tauxDetection < DETECTION_MINI_VERDICT) {
    const garde = ['Réglage', 'Qualité vidéo', 'Détection', 'Prise de vue', 'Mesure', 'Général'];
    constats = constats.filter((x) => garde.includes(x.coup));
    constats.push({
      niveau: 'priorite', coup: 'Qualité vidéo',
      titre: 'Verdicts techniques suspendus',
      detail: `Le joueur n'est reconnu que sur ${Math.round(tauxDetection * 100)} % des images, ` +
        `en dessous des ${Math.round(DETECTION_MINI_VERDICT * 100)} % nécessaires pour juger un geste. ` +
        `Les mesures restent affichées dans l'onglet « Mesures » si tu veux les regarder, mais aucun ` +
        `constat technique n'est énoncé : il décrirait les trous de détection, pas ton tennis.`,
      exo: 'Refilme le joueur plus grand dans le cadre, seul dans le champ, et relance : ' +
        "au-dessus de 70 % de détection, l'analyse reprend d'elle-même.",
    });
  }

  const ordre = { priorite: 0, corriger: 1, bon: 2, info: 3 };
  constats.sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);

  return {
    series,
    vitesse,
    frappes,
    constats,
    score,
    mainDominante,
    profil: { ...profil, angle: camera.angle },
    camera,
    // Conditions de prise de vue : ce qui doit rester constant d'une séance à l'autre
    // pour que deux analyses soient comparables (voir js/protocole.js).
    conditions: {
      angleCamera: camera.angle,
      confianceAngle: camera.confiance,
      tailleJoueur: mediane(series.filter((s) => s.ok).map((s) => s.tronc)),
      tauxDetection,
      fps: fenetre?.fps ?? null,
      duree: fenetre ? Math.round(fenetre.fin - fenetre.debut) : null,
      coup: profil.coup || 'auto',
      nbFrappes: frappes.length,
    },
    diagnostic,
    detectionSouple,
    duree,
    tauxDetection,
    empreinteMesures,
    groupes: [...groupes.entries()].map(([type, liste]) => ({
      type,
      libelle: LIBELLES_COUP[type] || type,
      nombre: liste.length,
      medianes: {
        hauteurImpact: mediane(liste.map((f) => f.hauteurImpact)),
        coudeImpact: mediane(liste.map((f) => f.coudeImpact)),
        rotationEpaules: mediane(liste.map((f) => f.rotationEpaules)),
        flexionGenou: mediane(liste.map((f) => f.flexionGenou)),
        accompagnement: mediane(liste.map((f) => f.accompagnement)),
        deplacementTete: mediane(liste.map((f) => f.deplacementTete)),
        deplacementBassin: mediane(liste.map((f) => f.deplacementBassin)),
        vitesse: mediane(liste.map((f) => f.vitesse)),
      },
      // Mesures dont le nuage dépasse la zone à juger : leur médiane ne caractérise rien et
      // ne doit pas être affichée comme un chiffre net. Sans ce report jusqu'à l'affichage,
      // l'app annonçait « coude incaractérisable » dans les constats et « coude 141° » deux
      // écrans plus haut.
      nonCaracterisables: mesuresNonCaracterisables(liste, type, profil.revers === 'une' ? 'une' : 'deux'),
      // Dispersion de chaque mesure : conservée d'une séance à l'autre, elle permet de
      // distinguer un geste qui varie d'une mesure qui bruite. Un geste ne devient pas plus
      // irrégulier pendant que la détection s'améliore.
      dispersions: Object.fromEntries(Object.keys(SEUILS_REGULARITE)
        .map((cle) => [cle, ecartType(liste.map((f) => f[cle]))])
        .filter(([, v]) => Number.isFinite(v))),
    })),
  };
}
