/**
 * Base de connaissances technique — repères de coaching classiques
 * (fédérations : ITF / FFT / USTA, littérature d'entraînement courante).
 * Sert à la fois de référentiel pour le moteur de règles et de fiche de lecture.
 */

export const FONDAMENTAUX = [
  {
    id: 'coup-droit',
    titre: 'Coup droit',
    resume: "Chaîne cinétique du sol vers la balle : jambes → hanches → épaules → bras → raquette.",
    points: [
      "Préparation tôt : épaules tournées dès que la trajectoire adverse est lue (unit turn), main libre pointée vers la balle.",
      "Appuis : semi-ouvert ou ouvert en fond de court, fermé quand tu avances. Poids sur la jambe arrière puis transfert.",
      "Boucle de préparation fluide, tête de raquette au-dessus du poignet, coude devant le corps.",
      "Point d'impact devant la hanche avant, à hauteur entre hanche et épaule, bras allongé mais pas verrouillé.",
      "Séparation hanches / épaules (X-factor) : les hanches ouvrent avant les épaules, c'est là que naît la vitesse.",
      "Finition au-dessus de l'épaule opposée ou en lasso ; la raquette décélère après la balle, jamais avant.",
    ],
    erreurs: [
      "Préparation tardive → frappe en retard, balle courte au centre.",
      "Bras seul, sans rotation du tronc → puissance faible et épaule qui souffre.",
      "Impact trop près du corps ou derrière la hanche.",
      "Fin de geste coupée : la raquette s'arrête à l'impact.",
    ],
  },
  {
    id: 'revers',
    titre: 'Revers (une ou deux mains)',
    resume: "Le revers vit de la rotation du tronc et d'un appui avant solide.",
    points: [
      "Rotation d'épaules encore plus marquée qu'en coup droit : le dos doit presque se voir depuis l'autre côté du filet.",
      "Deux mains : la main non dominante tire le geste, les deux coudes restent proches du corps à la préparation.",
      "Une main : appui fermé, épaule avant qui pointe la balle, bras libre qui part vers l'arrière pour équilibrer.",
      "Impact devant, plus tôt qu'en coup droit, à hauteur de taille idéalement.",
      "Le buste reste de profil jusqu'à l'impact, puis s'ouvre dans l'accompagnement.",
      "Finition haute et longue vers la cible.",
    ],
    erreurs: [
      "Épaules qui s'ouvrent trop tôt (ouverture précoce) → balle qui part à gauche/droite.",
      "Impact trop près du corps, coudes pliés à la frappe.",
      "Buste qui recule au lieu d'avancer, poids sur la jambe arrière.",
    ],
  },
  {
    id: 'service',
    titre: 'Service',
    resume: "Le coup le plus technique : rythme, lancer, position armée, rotation, extension.",
    points: [
      "Lancer de balle constant : bras tendu, balle relâchée à hauteur maximale, légèrement devant et à droite (droitier).",
      "Position armée (trophy position) : coude à hauteur d'épaule, raquette pointée vers le haut, épaule avant plus haute.",
      "Flexion des genoux marquée puis extension explosive vers le haut, pas vers l'avant seulement.",
      "Pronation de l'avant-bras à l'impact : c'est ce qui donne la vitesse et l'effet, pas la force du poignet.",
      "Impact bras tendu, le plus haut possible, corps aligné et légèrement en avant.",
      "Retombée à l'intérieur du court sur la jambe avant, jambe arrière qui contrebalance.",
    ],
    erreurs: [
      "Lancer irrégulier ou trop bas → tout le reste s'effondre.",
      "Pas de flexion de genoux → pas d'énergie ascendante.",
      "Impact bras plié ou trop en arrière de la tête.",
      "Buste qui s'affaisse (« banane ») → douleurs lombaires et perte de puissance.",
    ],
  },
  {
    id: 'volee',
    titre: 'Volée',
    resume: "Court, ferme, devant soi : on bloque, on ne swingue pas.",
    points: [
      "Prise continentale, raquette haute devant le corps, tête de raquette au-dessus du poignet.",
      "Préparation minimale : épaules qui tournent, pas de boucle de bras.",
      "Pas croisé vers la balle, impact devant et sur le côté, bras ferme.",
      "Geste court, légèrement de haut en bas, pour donner un peu de coupe et du contrôle.",
      "Poids qui avance à travers la balle, on finit en équilibre vers le filet.",
    ],
    erreurs: [
      "Trop d'armé → balle longue ou en retard.",
      "Poignet mou à l'impact.",
      "Rester à plat sur les talons au lieu d'avancer.",
    ],
  },
  {
    id: 'jeu-de-jambes',
    titre: 'Jeu de jambes et équilibre',
    resume: "Le meilleur geste sur de mauvais appuis reste un mauvais coup.",
    points: [
      "Split-step à chaque frappe adverse : petit rebond, atterrissage sur l'avant des pieds au moment du contact adverse.",
      "Grands pas pour couvrir la distance, petits pas d'ajustement en fin de course.",
      "Centre de gravité bas, genoux fléchis, buste droit — la tête reste stable pendant la frappe.",
      "Récupération immédiate vers la position d'attente après chaque coup.",
    ],
    erreurs: [
      "Pas de split-step → départ en retard sur chaque balle.",
      "Tête qui bouge à l'impact.",
      "Rester planté après la frappe pour admirer son coup.",
    ],
  },
];

export const RESSOURCES = [
  { titre: 'ITF Academy — ressources techniques et pédagogiques', url: 'https://www.itf-academy.com/' },
  { titre: 'Fédération Française de Tennis — enseignement', url: 'https://www.fft.fr/' },
  { titre: 'USTA — Player Development, fiches techniques', url: 'https://www.usta.com/en/home/coach-organize/tennis-teaching-professionals.html' },
  { titre: 'Tennis Australia — Coaching resources', url: 'https://www.tennis.com.au/coaches' },
];

/** Repères chiffrés utilisés par le moteur de règles (valeurs indicatives, joueur amateur → confirmé). */
export const SEUILS = {
  // Flexion du genou la plus marquée pendant la préparation (angle en degrés, 180 = jambe tendue)
  flexionGenou:   { ideal: [130, 160], acceptable: [120, 168] },
  // Ratio largeur d'épaules min/max pendant le coup : plus c'est bas, plus la rotation est marquée
  rotationEpaules:{ ideal: [0, 0.72],  acceptable: [0, 0.85] },
  // Angle du coude à l'impact (fond de court)
  coudeImpact:    { ideal: [140, 172], acceptable: [125, 178] },
  // Hauteur d'impact relative : 0 = hanche, 1 = épaule (fond de court)
  hauteurImpact:  { ideal: [0.25, 0.95], acceptable: [0.05, 1.2] },
  // Déplacement latéral du bassin pendant la frappe, en largeurs d'épaules
  stabiliteBassin:{ ideal: [0, 0.35], acceptable: [0, 0.6] },
  // Déplacement de la tête pendant la frappe, en largeurs d'épaules
  stabiliteTete:  { ideal: [0, 0.28], acceptable: [0, 0.5] },
  // Amplitude d'accompagnement après l'impact, en largeurs d'épaules
  accompagnement: { ideal: [1.1, 4], acceptable: [0.75, 5] },
  // Service : angle du coude à l'impact
  coudeService:   { ideal: [160, 180], acceptable: [148, 180] },
  // Service : flexion des genoux avant l'extension
  flexionService: { ideal: [120, 150], acceptable: [110, 162] },
};

/**
 * Régularité : écart-type toléré d'une frappe à l'autre, pour un même coup.
 * Format [régulier jusqu'à, acceptable jusqu'à] — au-delà, le geste n'est pas reproductible.
 */
export const SEUILS_REGULARITE = {
  hauteurImpact:   { libelle: "hauteur du point d'impact", seuils: [0.14, 0.26], unite: '' },
  coudeImpact:     { libelle: "angle du coude à l'impact", seuils: [8, 15], unite: '°' },
  rotationEpaules: { libelle: 'rotation du buste',         seuils: [0.07, 0.13], unite: '' },
  accompagnement:  { libelle: "amplitude d'accompagnement", seuils: [0.4, 0.75], unite: '' },
};

/** Ce que le joueur peut déclarer sur le devenir de chaque balle. */
export const RESULTATS_BALLE = [
  { code: '',        libelle: '—' },
  { code: 'bonne',   libelle: 'Bonne balle' },
  { code: 'filet',   libelle: 'Dans le filet' },
  { code: 'longue',  libelle: 'Trop longue' },
  { code: 'large',   libelle: 'Large / à côté' },
  { code: 'cadre',   libelle: 'Faute de cadre' },
];

/** Prises de raquette : l'app ne peut pas les voir, mais le joueur peut les déclarer. */
export const PRISES = [
  { code: '', libelle: 'Je ne sais pas' },
  { code: 'continentale', libelle: 'Continentale (marteau)' },
  { code: 'semi-fermee', libelle: 'Semi-fermée (eastern)' },
  { code: 'fermee', libelle: 'Fermée (semi-western)' },
  { code: 'tres-fermee', libelle: 'Très fermée (western)' },
  { code: 'deux-mains', libelle: 'À deux mains' },
];
