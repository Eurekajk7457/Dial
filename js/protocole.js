/**
 * Protocole de suivi : rendre deux séances réellement comparables.
 *
 * Une caméra déplacée suffit à changer les mesures : sur un même geste filmé de face
 * puis de côté, l'amplitude d'accompagnement varie du tout au tout, la rotation du buste
 * du simple au double. Sans conditions constantes, une courbe de progression mesure donc
 * autant le trépied que le joueur.
 *
 * D'où ce protocole : mêmes conditions, une fois par mois. La première séance devient la
 * référence ; les suivantes sont comparées à elle, et l'app dit franchement lesquelles
 * sont comparables et lesquelles ne le sont pas.
 */

import { LIBELLES_ANGLE } from './analyse.js';

const CLE_REFERENCE = 'dial-tennis-protocole';

/** La marche à suivre, volontairement courte : un protocole qu'on ne suit pas ne sert à rien. */
export const PROTOCOLE = [
  { titre: 'Le même endroit', detail: "Le même court, le même côté, le même fond derrière toi." },
  { titre: 'La même position de caméra', detail: "Repère un point fixe (un poteau, une ligne) et pose le téléphone au même endroit, à la même hauteur — hauteur de hanche — et à la même distance, 5 à 8 m. Prends une photo de l'installation la première fois : tu la refais en dix secondes les fois suivantes." },
  { titre: 'Le même exercice', detail: "Le même coup, alimenté de la même façon (panier, mur, partenaire), à intensité normale — pas à fond." },
  { titre: 'Trois minutes', detail: "Assez pour 15 à 20 frappes exploitables, assez court pour le refaire sans y penser." },
  { titre: 'Une fois par mois', detail: "Plus souvent, tu mesures la forme du jour ; moins souvent, tu perds le fil." },
];

/** Ce qui doit rester constant, et l'écart au-delà duquel la comparaison ne tient plus. */
const CRITERES = [
  {
    cle: 'angleCamera', libelle: 'Position de la caméra', bloquant: true,
    egal: (a, b) => a === b,
    dire: (ref, cur) => `caméra ${LIBELLES_ANGLE[cur] || cur} cette fois, ${LIBELLES_ANGLE[ref] || ref} pour la référence`,
  },
  {
    cle: 'coup', libelle: 'Coup filmé', bloquant: true,
    egal: (a, b) => a === b,
    dire: (ref, cur) => `« ${cur} » cette fois, « ${ref} » pour la référence`,
  },
  {
    // La taille apparente traduit la distance caméra–joueur : elle change les mesures d'angle.
    cle: 'tailleJoueur', libelle: 'Distance de la caméra', bloquant: false,
    egal: (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) / a <= 0.25,
    dire: (ref, cur) => `le joueur apparaît ${cur > ref ? 'plus grand' : 'plus petit'} qu'à la référence ` +
      `(${Math.round(Math.abs(cur - ref) / ref * 100)} % d'écart) — la caméra a bougé en distance`,
  },
  {
    cle: 'fps', libelle: 'Cadence d\'analyse', bloquant: false,
    egal: (a, b) => a === b,
    dire: (ref, cur) => `${cur} images/seconde cette fois, ${ref} pour la référence`,
  },
];


export function lireReference() {
  try {
    const brut = localStorage.getItem(CLE_REFERENCE);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

export function definirReference(entree) {
  if (!entree?.conditions) return null;
  const ref = { id: entree.id, date: entree.date, conditions: entree.conditions };
  try { localStorage.setItem(CLE_REFERENCE, JSON.stringify(ref)); } catch { return null; }
  return ref;
}

export function effacerReference() {
  try { localStorage.removeItem(CLE_REFERENCE); } catch { /* rien à faire */ }
}

/**
 * Compare les conditions d'une séance à celles de la référence.
 * `comparable` est faux dès qu'un critère bloquant diffère : dans ce cas, mettre les deux
 * séances sur la même courbe induirait en erreur, mieux vaut le dire que le masquer.
 */
export function comparerConditions(conditions, reference = lireReference()) {
  if (!reference?.conditions) return { statut: 'sans-reference', comparable: true, ecarts: [] };
  if (!conditions) return { statut: 'inconnu', comparable: false, ecarts: [] };

  const ecarts = [];
  for (const critere of CRITERES) {
    const ref = reference.conditions[critere.cle];
    const cur = conditions[critere.cle];
    if (ref === undefined || ref === null || cur === undefined || cur === null) continue;
    if (!critere.egal(ref, cur)) {
      ecarts.push({ cle: critere.cle, libelle: critere.libelle, bloquant: critere.bloquant,
        texte: critere.dire(ref, cur) });
    }
  }

  const bloquants = ecarts.filter((e) => e.bloquant);
  return {
    statut: !ecarts.length ? 'conforme' : bloquants.length ? 'incomparable' : 'ecart-mineur',
    comparable: !bloquants.length,
    ecarts,
  };
}

/** Résumé lisible d'une comparaison, pour l'afficher sans reformuler à chaque endroit. */
export function resumerConformite(bilan) {
  return {
    'sans-reference': "Aucune séance de référence définie : les comparaisons dans le temps ne sont pas garanties.",
    conforme: "Conditions identiques à ta séance de référence : cette analyse est comparable aux autres.",
    'ecart-mineur': "Conditions proches de la référence, avec des écarts mineurs : à lire avec un peu de recul.",
    incomparable: "Conditions différentes de ta séance de référence : les chiffres ne sont pas comparables aux autres séances.",
    inconnu: "Séance enregistrée avant la mise en place du protocole : conditions inconnues.",
  }[bilan.statut];
}
