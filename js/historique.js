/**
 * Suivi dans le temps : conserve un résumé de chaque analyse dans le navigateur
 * et trace l'évolution d'une mesure d'une séance à l'autre.
 *
 * Rien ne part sur internet : tout vit dans le localStorage de l'appareil.
 */

import { SEUILS } from './knowledge.js';
import { LIBELLES_COUP } from './analyse.js';

const CLE = 'dial-tennis-historique';
const MAX_ENTREES = 100;

/**
 * Mesures suivies. `bande` est l'intervalle visé : on le dessine en fond, ce qui évite
 * de faire croire qu'une courbe qui monte est forcément un progrès.
 */
export const MESURES_SUIVIES = [
  { cle: 'score', libelle: 'Score technique global', bande: null, decimales: 0, unite: '/100', global: true },
  { cle: 'hauteurImpact', libelle: "Hauteur du point d'impact", bande: SEUILS.hauteurImpact.ideal, decimales: 2, unite: '' },
  { cle: 'flexionGenou', libelle: 'Flexion des jambes', bande: SEUILS.flexionGenou.ideal, decimales: 0, unite: '°' },
  { cle: 'rotationEpaules', libelle: 'Rotation du buste (bas = mieux)', bande: SEUILS.rotationEpaules.ideal, decimales: 2, unite: '' },
  { cle: 'coudeImpact', libelle: "Angle du coude à l'impact", bande: SEUILS.coudeImpact.ideal, decimales: 0, unite: '°' },
  { cle: 'accompagnement', libelle: 'Amplitude du geste après la balle', bande: SEUILS.accompagnement.ideal, decimales: 1, unite: '' },
  { cle: 'deplacementTete', libelle: "Stabilité de la tête (bas = mieux)", bande: SEUILS.stabiliteTete.ideal, decimales: 2, unite: '' },
];

/* ------------------------------------------------------------------ */
/* Stockage                                                            */
/* ------------------------------------------------------------------ */

export function lireHistorique() {
  try {
    const brut = localStorage.getItem(CLE);
    const liste = brut ? JSON.parse(brut) : [];
    return Array.isArray(liste) ? liste : [];
  } catch {
    return [];   // stockage indisponible (navigation privée) ou données corrompues
  }
}

/**
 * Écrit la liste. Si le navigateur refuse (quota plein), on allège : d'abord en jetant
 * le détail des analyses les plus anciennes — le résumé, lui, alimente la courbe et
 * ne doit jamais disparaître — puis en supprimant les plus vieilles entrées.
 */
function ecrire(liste) {
  // Le déroulé du geste est ce qui pèse le plus : seules les analyses récentes le gardent.
  const garder = liste.slice(-MAX_ENTREES).map((e, i, tab) =>
    (i < tab.length - MAX_SEQUENCES && e.detail?.sequence)
      ? { ...e, detail: { ...e.detail, sequence: null } }
      : e);

  for (let allegees = 0; allegees <= garder.length; allegees++) {
    const essai = garder.map((e, i) => (i < allegees ? { ...e, detail: undefined } : e));
    try {
      localStorage.setItem(CLE, JSON.stringify(essai));
      return true;
    } catch { /* on retente en allégeant davantage */ }
  }
  // Toujours refusé : on ne garde que les vingt dernières, sans détail.
  try {
    localStorage.setItem(CLE, JSON.stringify(
      garder.slice(-20).map((e) => ({ ...e, detail: undefined }))));
    return true;
  } catch {
    return false;
  }
}

/**
 * Nombre d'analyses qui gardent le déroulé du geste image par image.
 * Les images de la vidéo ne sont jamais conservées (trop lourdes, et la vidéo doit rester
 * sur l'appareil) : on garde le squelette, qui pèse mille fois moins et montre le mouvement.
 */
const MAX_SEQUENCES = 8;
const FENETRE_SEQUENCE = 0.8;   // secondes conservées de part et d'autre de chaque frappe

/** Comprime les points d'une image en une simple liste de nombres à trois décimales. */
const comprimerPoints = (pts) => {
  const plat = [];
  for (const p of pts) { plat.push(Math.round(p.x * 1000) / 1000, Math.round(p.y * 1000) / 1000); }
  return plat;
};

const decomprimerPoints = (plat) => {
  const pts = [];
  for (let i = 0; i < plat.length; i += 2) pts.push({ x: plat[i], y: plat[i + 1] });
  return pts;
};

/**
 * Extrait le déroulé du geste : les images situées autour de chaque frappe, sans doublon.
 * Chaque frappe reçoit son indice dans cette liste pour retrouver son instant d'impact.
 */
function construireSequence(analyse, echantillon) {
  const source = echantillon?.frames;
  if (!source?.length) return null;

  const gardees = new Set();
  for (const f of analyse.frappes) {
    source.forEach((img, i) => {
      if (img.pts && Math.abs(img.t - f.t) <= FENETRE_SEQUENCE) gardees.add(i);
    });
  }
  if (!gardees.size) return null;

  const indices = [...gardees].sort((a, b) => a - b);
  const position = new Map(indices.map((src, dest) => [src, dest]));

  return {
    largeur: echantillon.largeur,
    hauteur: echantillon.hauteur,
    frames: indices.map((i) => ({ t: Math.round(source[i].t * 1000) / 1000, p: comprimerPoints(source[i].pts) })),
    // Indice de l'image d'impact de chaque frappe, dans la nouvelle liste
    impacts: analyse.frappes.map((f) => position.get(f.indice) ?? null),
  };
}

/** Mesures conservées frappe par frappe, pour pouvoir rouvrir une analyse plus tard. */
const MESURES_FRAPPE = [
  'hauteurImpact', 'coudeImpact', 'rotationEpaules', 'flexionGenou', 'accompagnement',
  'deplacementTete', 'deplacementBassin', 'vitesse', 'hauteurBrasLibre', 'oscillation',
];

/**
 * Résumé compact d'une analyse, plus le détail nécessaire pour la rouvrir telle quelle.
 * Ce qui n'est pas gardé : les images (trop lourdes) et les points de posture image par image.
 */
export function enregistrer(analyse, echantillon = null, empreinte = null) {
  if (!analyse?.frappes?.length) return null;

  const detail = {
    tauxDetection: analyse.tauxDetection,
    mainDominante: analyse.mainDominante,
    duree: analyse.duree,
    sequence: construireSequence(analyse, echantillon),
    constats: analyse.constats || [],
    frappes: analyse.frappes.map((f) => {
      const garde = { t: f.t, type: f.type, resultat: f.resultat || '' };
      for (const m of MESURES_FRAPPE) if (Number.isFinite(f[m])) garde[m] = f[m];
      return garde;
    }),
  };

  const entree = {
    detail,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
    empreinte,                       // permet de reconnaître la même vidéo plus tard
    reglages: analyse.reglages || null,
    score: analyse.score,
    nbFrappes: analyse.frappes.length,
    duree: Math.round(analyse.duree * 10) / 10,
    profil: {
      main: analyse.profil?.main || 'auto',
      coup: analyse.profil?.coup || 'auto',
      niveau: analyse.profil?.niveau || '',
      objectif: (analyse.profil?.objectif || '').slice(0, 200),
    },
    groupes: analyse.groupes.map((g) => ({
      type: g.type, libelle: g.libelle, nombre: g.nombre, medianes: g.medianes,
    })),
  };

  const liste = lireHistorique();
  liste.push(entree);
  return ecrire(liste) ? entree : null;
}

/**
 * Réenregistre le devenir des balles renseigné après coup : sans ça, une analyse rouverte
 * aurait perdu les balles que le joueur avait pris la peine de noter.
 */
export function actualiserResultats(id, frappes) {
  const liste = lireHistorique();
  const e = liste.find((x) => x.id === id);
  if (!e?.detail?.frappes) return;
  e.detail.frappes.forEach((f, i) => { f.resultat = frappes[i]?.resultat || ''; });
  ecrire(liste);
}

/**
 * Reconstruit une analyse enregistrée pour la réafficher dans tous les onglets.
 * `sansImages` prévient l'interface : le défilement image par image n'est plus possible,
 * la vidéo d'origine n'ayant jamais quitté l'appareil ni été conservée.
 */
export function lireAnalyse(id) {
  const e = lireHistorique().find((x) => x.id === id);
  if (!e?.detail) return null;

  const seq = e.detail.sequence;
  const frappes = (e.detail.frappes || []).map((f, i) => ({
    ...f,
    indice: seq?.impacts?.[i] ?? null,
  }));

  return {
    id: e.id,
    date: e.date,
    sansImages: true,
    // Le déroulé du geste rejoué à partir des squelettes enregistrés, quand on l'a encore
    echantillon: seq ? {
      largeur: seq.largeur,
      hauteur: seq.hauteur,
      frames: seq.frames.map((img) => ({ t: img.t, pts: decomprimerPoints(img.p), vignette: null })),
    } : null,
    score: e.score,
    duree: e.detail.duree ?? e.duree,
    tauxDetection: e.detail.tauxDetection ?? 0,
    mainDominante: e.detail.mainDominante || 'D',
    profil: e.profil || {},
    constats: e.detail.constats || [],
    frappes,
    groupes: e.groupes || [],
  };
}

/** Une analyse rouvrable garde son détail ; les plus anciennes peuvent l'avoir perdu. */
export function estRouvrable(entree) {
  return !!entree?.detail?.frappes?.length;
}

export function supprimer(id) {
  ecrire(lireHistorique().filter((e) => e.id !== id));
}

export function toutEffacer() {
  try { localStorage.removeItem(CLE); } catch { /* rien à faire */ }
}

/** Types de coups présents dans l'historique, pour proposer un filtre. */
export function coupsPresents(liste = lireHistorique()) {
  const vus = new Map();
  for (const e of liste) for (const g of e.groupes || []) vus.set(g.type, g.libelle);
  return [...vus].map(([type, libelle]) => ({ type, libelle: libelle || LIBELLES_COUP[type] || type }));
}

/** Points d'une mesure pour un type de coup donné, du plus ancien au plus récent. */
export function serie(mesure, typeCoup, liste = lireHistorique()) {
  const def = MESURES_SUIVIES.find((m) => m.cle === mesure);
  if (!def) return [];

  return liste.map((e) => {
    const valeur = def.global
      ? e.score
      : (e.groupes || []).find((g) => g.type === typeCoup)?.medianes?.[mesure];
    return Number.isFinite(valeur) ? { date: e.date, valeur, entree: e } : null;
  }).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Graphique                                                           */
/* ------------------------------------------------------------------ */

const dateCourte = (iso) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/**
 * Courbe d'évolution en SVG : une seule série, la zone visée en fond,
 * valeur affichée uniquement au premier et au dernier point.
 */
export function tracerCourbe(points, mesure, { largeur = 640, hauteur = 240 } = {}) {
  const def = MESURES_SUIVIES.find((m) => m.cle === mesure);
  if (!def || points.length < 2) return null;

  const marge = { haut: 18, droite: 54, bas: 30, gauche: 46 };
  const l = largeur - marge.gauche - marge.droite;
  const h = hauteur - marge.haut - marge.bas;

  const valeurs = points.map((p) => p.valeur);
  const bande = def.bande;
  let min = Math.min(...valeurs, ...(bande ? [bande[0]] : []));
  let max = Math.max(...valeurs, ...(bande ? [bande[1]] : []));
  if (min === max) { min -= 1; max += 1; }
  const marge_y = (max - min) * 0.12;
  min -= marge_y; max += marge_y;

  const x = (i) => marge.gauche + (points.length === 1 ? l / 2 : (i * l) / (points.length - 1));
  const y = (v) => marge.haut + h - ((v - min) / (max - min)) * h;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v) => v.toFixed(def.decimales) + def.unite;

  const morceaux = [];

  // Zone visée, dessinée en premier pour rester en arrière-plan
  if (bande) {
    const hautBande = y(Math.min(bande[1], max));
    const basBande = y(Math.max(bande[0], min));
    morceaux.push(
      `<rect x="${marge.gauche}" y="${hautBande.toFixed(1)}" width="${l}" ` +
      `height="${Math.max(0, basBande - hautBande).toFixed(1)}" fill="#1f7a4d" opacity="0.13"/>`,
      `<text x="${marge.gauche + l - 4}" y="${(hautBande + 12).toFixed(1)}" text-anchor="end" ` +
      `class="c-zone">zone visée</text>`,
    );
  }

  // Grille horizontale discrète + graduations
  for (let i = 0; i <= 2; i++) {
    const v = min + ((max - min) * i) / 2;
    const yy = y(v).toFixed(1);
    morceaux.push(
      `<line x1="${marge.gauche}" y1="${yy}" x2="${marge.gauche + l}" y2="${yy}" class="c-grille"/>`,
      `<text x="${marge.gauche - 8}" y="${yy}" dy="0.32em" text-anchor="end" class="c-axe">${esc(fmt(v))}</text>`,
    );
  }

  // Ligne
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valeur).toFixed(1)}`).join(' ');
  morceaux.push(`<path d="${d}" fill="none" stroke="#0f6b52" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`);

  // Points, avec un liseré de la couleur du fond pour rester lisibles quand ils se chevauchent
  points.forEach((p, i) => {
    morceaux.push(
      `<circle cx="${x(i).toFixed(1)}" cy="${y(p.valeur).toFixed(1)}" r="4.5" ` +
      `fill="#0f6b52" stroke="#ffffff" stroke-width="2"><title>${esc(dateCourte(p.date))} — ${esc(fmt(p.valeur))}</title></circle>`,
    );
  });

  // Valeurs annotées seulement aux extrémités : une étiquette par point serait illisible
  const annoter = (i, ancre, dx) => {
    const p = points[i];
    morceaux.push(
      `<text x="${(x(i) + dx).toFixed(1)}" y="${(y(p.valeur) - 10).toFixed(1)}" ` +
      `text-anchor="${ancre}" class="c-valeur">${esc(fmt(p.valeur))}</text>`,
    );
  };
  annoter(0, 'start', -2);
  if (points.length > 1) annoter(points.length - 1, 'end', 2);

  // Dates aux extrémités
  morceaux.push(
    `<text x="${marge.gauche}" y="${hauteur - 8}" class="c-axe">${esc(dateCourte(points[0].date))}</text>`,
    `<text x="${marge.gauche + l}" y="${hauteur - 8}" text-anchor="end" class="c-axe">${esc(dateCourte(points.at(-1).date))}</text>`,
  );

  return `<svg viewBox="0 0 ${largeur} ${hauteur}" class="courbe" role="img" ` +
    `aria-label="Évolution de ${esc(def.libelle)} sur ${points.length} analyses">${morceaux.join('')}</svg>`;
}

/**
 * Lecture en clair de l'évolution : on parle en termes d'entrée dans la zone visée
 * plutôt que de hausse ou de baisse, qui ne veulent rien dire seules.
 */
export function commenterEvolution(points, mesure) {
  const def = MESURES_SUIVIES.find((m) => m.cle === mesure);
  if (!def || points.length < 2) return null;

  const premier = points[0].valeur;
  const dernier = points.at(-1).valeur;
  const fmt = (v) => v.toFixed(def.decimales) + def.unite;

  if (!def.bande) {
    const delta = dernier - premier;
    if (Math.abs(delta) < 3) return `Score stable (${fmt(premier)} → ${fmt(dernier)}).`;
    return delta > 0
      ? `Score en hausse : ${fmt(premier)} → ${fmt(dernier)}.`
      : `Score en baisse : ${fmt(premier)} → ${fmt(dernier)}.`;
  }

  const dans = (v) => v >= def.bande[0] && v <= def.bande[1];
  const ecart = (v) => dans(v) ? 0 : Math.min(Math.abs(v - def.bande[0]), Math.abs(v - def.bande[1]));

  if (dans(dernier) && !dans(premier)) return `Tu es entré dans la zone visée : ${fmt(premier)} → ${fmt(dernier)}. C'est un vrai progrès.`;
  if (dans(dernier) && dans(premier)) return `Tu restes dans la zone visée (${fmt(premier)} → ${fmt(dernier)}).`;
  if (!dans(dernier) && dans(premier)) return `Tu es sorti de la zone visée : ${fmt(premier)} → ${fmt(dernier)}.`;
  const progres = ecart(premier) - ecart(dernier);
  if (Math.abs(progres) < (def.bande[1] - def.bande[0]) * 0.1) return `Pas de changement net : ${fmt(premier)} → ${fmt(dernier)}, toujours hors de la zone visée.`;
  return progres > 0
    ? `Tu te rapproches de la zone visée : ${fmt(premier)} → ${fmt(dernier)}.`
    : `Tu t'en éloignes : ${fmt(premier)} → ${fmt(dernier)}.`;
}

/* ------------------------------------------------------------------ */
/* Bilan : ce que disent toutes les séances mises bout à bout          */
/* ------------------------------------------------------------------ */

/** Un même défaut d'une séance à l'autre, c'est le même coup et le même titre. */
const cleConstat = (c) => `${c.coup || ''}|${c.titre}`;

/**
 * Croise les constats de toutes les analyses enregistrées.
 *
 * L'intérêt n'est pas de rejouer chaque séance mais de répondre à une question que ne
 * répond aucun onglet existant : qu'est-ce qui revient ? Un défaut vu cinq fois sur cinq
 * n'a rien à voir avec un défaut vu une fois — et un point fort qui disparaît est une
 * information au moins aussi utile qu'un défaut qui apparaît.
 *
 * Les analyses trop anciennes pour avoir gardé leur détail sont ignorées : on le dit
 * plutôt que de laisser croire que le bilan porte sur tout l'historique.
 */
export function bilanConstats(liste = lireHistorique()) {
  const seances = liste.filter((e) => e.detail?.constats?.length);
  const ignorees = liste.length - seances.length;
  if (!seances.length) return { seances: 0, ignorees, dates: [], items: [] };

  const dates = seances.map((e) => e.date);
  const derniere = dates.at(-1);
  const groupes = new Map();

  seances.forEach((e) => {
    for (const c of e.detail.constats) {
      if (c.niveau === 'info') continue;         // les informations de détection ne se cumulent pas
      const cle = cleConstat(c);
      const g = groupes.get(cle) || {
        titre: c.titre, coup: c.coup, dates: [], niveaux: [], dernierDetail: '', exo: '',
      };
      g.dates.push(e.date);
      g.niveaux.push(c.niveau);
      g.dernierDetail = c.detail || g.dernierDetail;
      g.exo = c.exo || g.exo;
      groupes.set(cle, g);
    }
  });

  const items = [...groupes.values()].map((g) => {
    const bon = g.niveaux.at(-1) === 'bon';
    const presentDerniere = g.dates.at(-1) === derniere;
    const occurrences = g.dates.length;

    let statut;
    if (bon) {
      if (!presentDerniere) statut = 'perdu';
      else statut = occurrences >= 2 ? 'acquis' : 'nouveau-fort';
    } else if (!presentDerniere) {
      statut = 'regle';
    } else {
      statut = occurrences >= 2 ? 'recurrent' : 'nouveau';
    }

    return {
      titre: g.titre,
      coup: g.coup,
      detail: g.dernierDetail,
      exo: g.exo,
      // Le pire niveau atteint : un défaut passé en priorité une fois mérite d'être vu comme tel
      niveau: g.niveaux.includes('priorite') ? 'priorite' : g.niveaux.at(-1),
      bon,
      statut,
      occurrences,
      dates: g.dates,
      presence: dates.map((d) => g.dates.includes(d)),
      premiere: g.dates[0],
      derniereVue: g.dates.at(-1),
    };
  });

  // Du plus tenace au plus anecdotique : c'est l'ordre dans lequel on veut travailler.
  const rang = { recurrent: 0, nouveau: 1, regle: 2, perdu: 3, acquis: 4, 'nouveau-fort': 5 };
  items.sort((a, b) =>
    (rang[a.statut] - rang[b.statut])
    || (b.occurrences - a.occurrences)
    || (a.niveau === 'priorite' ? -1 : b.niveau === 'priorite' ? 1 : 0)
    || a.titre.localeCompare(b.titre));

  return { seances: seances.length, ignorees, dates, items };
}

/* ------------------------------------------------------------------ */
/* Reconnaître une vidéo déjà analysée                                 */
/* ------------------------------------------------------------------ */

/**
 * Empreinte d'un fichier vidéo, pour reconnaître une vidéo déjà analysée sans
 * la relire entièrement : on hache sa taille et trois tranches (début, milieu, fin).
 * Deux vidéos différentes ne peuvent pas donner la même empreinte, et renommer un
 * fichier n'en change pas l'empreinte — ce que ferait un simple « nom + taille ».
 *
 * `crypto.subtle` n'existe qu'en contexte sécurisé ; ouvert d'un double-clic en
 * `file://`, on retombe sur nom + taille + date, moins fin mais suffisant.
 */
export async function empreinteFichier(fichier) {
  const secours = `n:${fichier.name}|${fichier.size}|${fichier.lastModified}`;
  if (!globalThis.crypto?.subtle) return secours;

  try {
    const TRANCHE = 256 * 1024;
    const milieu = Math.max(0, Math.floor(fichier.size / 2) - TRANCHE / 2);
    const morceaux = await Promise.all([
      fichier.slice(0, TRANCHE).arrayBuffer(),
      fichier.slice(milieu, milieu + TRANCHE).arrayBuffer(),
      fichier.slice(Math.max(0, fichier.size - TRANCHE)).arrayBuffer(),
    ]);

    const entete = new TextEncoder().encode(`${fichier.size}|`);
    const total = entete.byteLength + morceaux.reduce((n, m) => n + m.byteLength, 0);
    const tampon = new Uint8Array(total);
    let pos = 0;
    tampon.set(entete, pos); pos += entete.byteLength;
    for (const m of morceaux) { tampon.set(new Uint8Array(m), pos); pos += m.byteLength; }

    const hache = await crypto.subtle.digest('SHA-256', tampon);
    return [...new Uint8Array(hache)].map((o) => o.toString(16).padStart(2, '0')).join('').slice(0, 32);
  } catch {
    return secours;
  }
}

/** La dernière analyse faite à partir de cette vidéo, s'il y en a une. */
export function trouverParEmpreinte(empreinte, liste = lireHistorique()) {
  if (!empreinte) return null;
  return [...liste].reverse().find((e) => e.empreinte === empreinte) || null;
}
