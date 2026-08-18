/**
 * Moteur d'analyse : transforme les points de posture en mesures biomécaniques,
 * détecte les frappes, puis applique un référentiel de coaching.
 */

import { P, angle, dist, milieu, inclinaisonBuste, lisser } from './pose.js';
import { SEUILS, SEUILS_REGULARITE, EXPLICATIONS, libelleZone } from './knowledge.js';

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
function evaluer(valeur, seuil) {
  if (!Number.isFinite(valeur)) return { niveau: 'inconnu', sens: 0 };
  const [i0, i1] = seuil.ideal;
  const [a0, a1] = seuil.acceptable;
  if (valeur >= i0 && valeur <= i1) return { niveau: 'bon', sens: 0 };
  const sens = valeur < i0 ? -1 : 1;
  if (valeur >= a0 && valeur <= a1) return { niveau: 'moyen', sens };
  return { niveau: 'mauvais', sens };
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
      buste: inclinaisonBuste(epaules, hanches),
    };
  });
}

/** Détermine la main dominante : celle dont le poignet parcourt le plus de chemin. */
export function detecterMain(series, force = 'auto') {
  if (force === 'right') return 'D';
  if (force === 'left') return 'G';
  let cheminG = 0, cheminD = 0;
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1], b = series[i];
    if (!a.ok || !b.ok) continue;
    cheminG += dist(a.poignetG, b.poignetG) / b.sw;
    cheminD += dist(a.poignetD, b.poignetD) / b.sw;
  }
  return cheminD >= cheminG ? 'D' : 'G';
}

/** Vitesse du poignet dominant, en largeurs d'épaules par seconde. */
export function vitessePoignet(series, main) {
  const cle = main === 'D' ? 'poignetD' : 'poignetG';
  const v = new Array(series.length).fill(NaN);
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1], b = series[i];
    if (!a.ok || !b.ok) continue;
    const dt = b.t - a.t;
    if (dt <= 0) continue;
    v[i] = dist(a[cle], b[cle]) / b.sw / dt;
  }
  return lisser(v, 3);
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
export const PLANCHER_STRICT = 2.2;
export const PLANCHER_SOUPLE = 1.1;

export function detecterFrappes(
  series, vitesse,
  { ecartMin = 0.55, fenetreDomination = 0.8, ratioDomination = 1.7, plancher = PLANCHER_STRICT } = {},
) {
  const valides = finis(vitesse);
  if (valides.length < 5) return [];
  const max = Math.max(...valides);
  const seuil = Math.max(max * 0.45, plancher); // largeurs d'épaules / s

  const pics = [];
  for (let i = 1; i < vitesse.length - 1; i++) {
    const v = vitesse[i];
    if (!Number.isFinite(v) || v < seuil) continue;
    if (v >= (vitesse[i - 1] ?? 0) && v > (vitesse[i + 1] ?? 0)) pics.push({ i, v, t: series[i].t });
  }

  // Un armé ou un replacement produit lui aussi un pic, mais il est toujours suivi de près
  // par la frappe, bien plus rapide. On écarte donc les pics dominés par un voisin proche.
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
  const max = valides.length ? Math.max(...valides) : 0;
  const seuilStrict = Math.max(max * 0.45, PLANCHER_STRICT);

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
    // Le poignet n'a jamais accéléré : c'est un problème de vidéo, pas de réglage de seuil.
    tropLent: max < PLANCHER_SOUPLE,
  };
}

/* ------------------------------------------------------------------ */
/* 2 bis. Orientation de la caméra                                     */
/* ------------------------------------------------------------------ */

export const LIBELLES_ANGLE = {
  cote: 'sur le côté du joueur',
  face: 'devant le joueur',
  dos: 'derrière le joueur',
  autre: 'en diagonale',
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

export function mesurerFrappe(series, pic, main, coupImpose = 'auto') {
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

  const sw = mediane(global.map((s) => s.sw));
  const poignet = contact[clePoignet];

  // Hauteur d'impact : 0 = hanche, 1 = épaule (l'axe y descend dans l'image)
  const ecartTronc = contact.hanches.y - contact.epaules.y;
  const hauteurImpact = ecartTronc > 0 ? (contact.hanches.y - poignet.y) / ecartTronc : NaN;

  // Rotation des épaules : la ligne d'épaules se raccourcit quand le buste se met de profil.
  // On compare le minimum et le maximum sur toute la frappe plutôt que « armé contre face » :
  // selon que la caméra est devant ou sur le côté, c'est l'armé ou l'impact qui paraît le plus
  // large, et seule l'amplitude du changement traduit réellement la rotation.
  const swMin = Math.min(...global.map((s) => s.sw));
  const swMax = Math.max(...global.map((s) => s.sw));
  const rotationEpaules = swMax > 0 ? swMin / swMax : NaN;

  // Flexion de genou la plus marquée pendant l'armé
  const flexionGenou = Math.min(
    ...prep.map((s) => Math.min(s.angleGenouG || 999, s.angleGenouD || 999))
  );

  // Stabilité : déplacement latéral du bassin et de la tête autour de l'impact
  const proche = fenetre(series, pic.t - 0.25, pic.t + 0.25);
  const xsBassin = proche.map((s) => s.hanches.x);
  const deplacementBassin = xsBassin.length
    ? (Math.max(...xsBassin) - Math.min(...xsBassin)) / sw : NaN;
  const deplacementTete = proche.length
    ? Math.max(...proche.map((s) => dist(s.nez, contact.nez))) / sw : NaN;

  // Accompagnement : longueur du trajet du poignet après l'impact
  let accompagnement = 0;
  for (let i = 1; i < suivi.length; i++) {
    accompagnement += dist(suivi[i - 1][clePoignet], suivi[i][clePoignet]) / sw;
  }
  const finGeste = suivi.at(-1);
  const hauteurFin = finGeste && ecartTronc > 0
    ? (finGeste.hanches.y - finGeste[clePoignet].y) / ecartTronc : NaN;

  // Armé : longueur du trajet du poignet avant l'impact
  let amplitudePrep = 0;
  for (let i = 1; i < prep.length; i++) {
    amplitudePrep += dist(prep[i - 1][clePoignet], prep[i][clePoignet]) / sw;
  }

  // Bras libre écarté du corps pendant l'armé (équilibre / repérage de balle)
  const brasLibre = mediane(prep.map((s) => dist(s[cleAutrePoignet], s.epaules) / s.sw));

  // Hauteur maximale du bras non dominant pendant l'armé (bras de lancer au service)
  const hauteurBrasLibre = ecartTronc > 0
    ? Math.max(...prep.map((s) => (s.hanches.y - s[cleAutrePoignet].y) / ecartTronc))
    : NaN;

  // Oscillation verticale du bassin avant la frappe → indice de split-step
  const oscillation = avant.length > 2
    ? (Math.max(...avant.map((s) => s.hanches.y)) - Math.min(...avant.map((s) => s.hanches.y))) / sw
    : NaN;

  // Type de coup : la déclaration du joueur prime sur la reconnaissance automatique,
  // qui reste fragile en 2D (elle dépend fortement de l'angle de prise de vue).
  const auDessusTete = poignet.y < contact.nez.y;
  let type;
  if (coupImpose && coupImpose !== 'auto') {
    type = coupImpose;
  } else if (auDessusTete && hauteurImpact > 1.6) {
    type = 'service';
  } else {
    const coteBras = Math.sign(contact[cleEpaule].x - contact.hanches.x);
    const cotePoignet = Math.sign(poignet.x - contact.hanches.x);
    const croise = coteBras !== 0 && cotePoignet !== 0 && coteBras !== cotePoignet;
    if (amplitudePrep < 0.85 && hauteurImpact > 0.1 && hauteurImpact < 1.4) {
      type = croise ? 'volee-revers' : 'volee-coup-droit';
    } else {
      type = croise ? 'revers' : 'coup-droit';
    }
  }

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
export function seuilPour(cle, type) {
  if (type === 'service' && cle === 'coudeImpact') return SEUILS.coudeService;
  if (type === 'service' && cle === 'flexionGenou') return SEUILS.flexionService;
  return { hauteurImpact: SEUILS.hauteurImpact, coudeImpact: SEUILS.coudeImpact,
    rotationEpaules: SEUILS.rotationEpaules, flexionGenou: SEUILS.flexionGenou,
    accompagnement: SEUILS.accompagnement, deplacementTete: SEUILS.stabiliteTete,
    deplacementBassin: SEUILS.stabiliteBassin }[cle] || null;
}

/**
 * Juge une frappe mesure par mesure : c'est ce qui permet de dire, frappe par frappe,
 * ce qui va et ce qui ne va pas — plutôt que d'afficher une colonne de chiffres nus.
 */
export function verdictsFrappe(frappe) {
  const type = frappe.type;
  return mesuresJugeables(type).map((cle) => {
    const def = EXPLICATIONS.find((e) => e.cle === cle);
    const seuil = seuilPour(cle, type);
    if (!def || !seuil) return null;

    const valeur = frappe[cle];
    const { niveau, sens } = evaluer(valeur, seuil);
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
function reglesGroupe(type, frappes) {
  const c = [];
  const n = frappes.length;
  const libelle = LIBELLES_COUP[type] || type;
  const med = (cle) => mediane(frappes.map((f) => f[cle]));
  const est = (cle, seuil) => evaluer(med(cle), seuil);

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
  const seuilCoude = service ? SEUILS.coudeService : SEUILS.coudeImpact;
  const co = est('coudeImpact', seuilCoude);
  const vco = med('coudeImpact');
  if (co.niveau === 'bon') {
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
  if (sb.niveau === 'bon' && st.niveau === 'bon') {
    ajouter({
      niveau: 'bon', titre: 'Bon équilibre à la frappe',
      detail: 'Tête et bassin restent stables au moment du contact : ta base est solide, le geste est reproductible.',
    });
  } else {
    if (sb.sens > 0) {
      ajouter({
        niveau: sb.niveau === 'mauvais' ? 'priorite' : 'corriger',
        titre: 'Bassin qui dérive à la frappe',
        detail: `Ton bassin se déplace de ${med('deplacementBassin').toFixed(2)} largeur d'épaules autour de l'impact. Tu frappes en déséquilibre : la régularité en souffre plus que la puissance.`,
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
    const mesures = Object.entries(SEUILS_REGULARITE).map(([cle, def]) => {
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
          `Sur ${n} frappes du même coup, ces écarts veulent dire que tu ne refais pas deux fois le même geste — c'est ce qui produit les fautes inexpliquées.`,
        exo: `Série de 10 balles lentes, même hauteur, même cible, sans chercher la puissance : l'objectif est que les 10 se ressemblent. Compte celles qui « sonnent » pareil.`,
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
        `L'angle de la caméra n'y est pour rien : il ne sert qu'à nuancer les conseils, ` +
        `jamais à repérer les frappes.`,
      exo: `À essayer, dans cet ordre : ${pistes.join(' ; ')}.`,
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

  if (camera && frappes.length) {
    const dit = {
      cote: 'sur le côté du joueur — idéal pour le coup droit et le revers',
      face: 'devant le joueur — idéal pour le service, moins fiable pour les angles de bras en fond de court',
      dos: 'derrière le joueur — bon pour le service et les appuis',
      autre: "en diagonale, ou l'orientation change trop pour trancher",
    }[camera.angle];
    c.push({
      niveau: 'info', coup: 'Prise de vue',
      titre: `Caméra détectée : ${{ cote: 'sur le côté', face: 'de face', dos: 'de dos', autre: 'en diagonale' }[camera.angle]}`,
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
    c.push({
      niveau: 'corriger', coup: 'Qualité vidéo',
      titre: 'Détection partielle du joueur',
      detail: `Le joueur n'a été détecté que sur ${Math.round(tauxDetection * 100)} % des images. Les mesures ci-dessous sont donc à prendre avec prudence.`,
      exo: 'Refilme en cadrant le joueur en entier, caméra fixe, bon éclairage, et un seul joueur dans le champ.',
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

export function analyser({ frames, largeur, hauteur, tauxDetection, fenetre = null }, profil = {}) {
  const { main = 'auto', coup = 'auto' } = profil;

  const series = construireSeries(frames, largeur, hauteur);
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
    .map((pic) => mesurerFrappe(series, pic, mainDominante, coup))
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
    constats = constats.concat(reglesGroupe(type, liste));
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
    diagnostic,
    detectionSouple,
    duree,
    tauxDetection,
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
    })),
  };
}
