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

function ecrire(liste) {
  try {
    localStorage.setItem(CLE, JSON.stringify(liste.slice(-MAX_ENTREES)));
    return true;
  } catch {
    return false;
  }
}

/** Résumé compact d'une analyse — pas d'images, pas de points, juste les chiffres. */
export function enregistrer(analyse) {
  if (!analyse?.frappes?.length) return null;

  const entree = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
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
