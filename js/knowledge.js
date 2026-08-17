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
    videos: [
      { titre: "Le coup droit, les bases", requete: "coup droit tennis technique de base" },
      { titre: "Préparer tôt : tourner les épaules", requete: "préparation coup droit tennis rotation épaules" },
      { titre: "Où frapper la balle : le point d'impact", requete: "point d'impact coup droit tennis" },
      { titre: "Finir son geste", requete: "finir son geste tennis coup droit" },
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
    videos: [
      { titre: "Revers à deux mains, les bases", requete: "revers deux mains tennis technique" },
      { titre: "Revers à une main, les bases", requete: "revers une main tennis technique" },
      { titre: "Quand le revers part dans le filet", requete: "revers tennis dans le filet correction" },
      { titre: "Garder les épaules fermées", requete: "rotation des épaules revers tennis" },
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
    videos: [
      { titre: "Le service, les bases", requete: "service tennis technique de base" },
      { titre: "Un lancer de balle régulier", requete: "lancer de balle service tennis" },
      { titre: "La position armée", requete: "position armée service tennis" },
      { titre: "La pronation du bras", requete: "pronation service tennis" },
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
    videos: [
      { titre: "La volée, les bases", requete: "volée tennis technique" },
      { titre: "La volée basse", requete: "volée basse tennis" },
      { titre: "Le jeu de jambes de la volée", requete: "appuis et déplacements volée tennis" },
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
    videos: [
      { titre: "Le split-step", requete: "split step tennis" },
      { titre: "Les appuis en fond de court", requete: "jeu de jambes tennis fond de court" },
      { titre: "Se replacer après la frappe", requete: "replacement après la frappe tennis" },
    ],
  },
];

/**
 * Vidéos : on renvoie vers une recherche YouTube plutôt que vers une vidéo précise.
 * Une URL de vidéo finit toujours par mourir (chaîne fermée, vidéo privée) ; une recherche,
 * elle, reste valable et remonte ce qui se fait de mieux au moment où l'on clique.
 */
const RECHERCHE_YT = 'https://www.youtube.com/results?search_query=';
export const videoYouTube = (requete) => RECHERCHE_YT + encodeURIComponent(requete);

/**
 * Une requête choisie à la main pour chaque défaut que le moteur sait nommer.
 * Fabriquer la recherche en collant le titre du constat donnait des résultats hors sujet :
 * une recherche utile est courte et formulée comme un joueur la taperait.
 * Les constats qui ne parlent pas de technique (main mal déclarée, détection partielle…)
 * ne sont volontairement pas dans cette table : aucune vidéo n'y répondrait.
 */
const VIDEOS_CONSTAT = {
  'Bras de lancer qui retombe trop tôt': 'bras de lancer service tennis',
  'Rotation du tronc insuffisante': 'rotation des épaules tennis préparation',
  'Jambes trop tendues': 'flexion des jambes tennis coup droit',
  'Flexion excessive / position trop basse': "position d'attente tennis équilibre",
  'Impact trop bas': 'prendre la balle tôt tennis',
  'Impact très haut': 'jouer les balles hautes tennis',
  'Impact trop près du corps': 'distance corps balle tennis coup droit',
  'Service frappé bras plié': 'service tennis bras tendu point haut',
  'Bras trop verrouillé': 'relâchement du bras tennis',
  'Geste coupé après la frappe': 'finir son geste tennis coup droit',
  'Volée trop swinguée': 'volée tennis geste court',
  'Bassin qui dérive à la frappe': 'ancrage des appuis à la frappe tennis',
  "Tête qui bouge à l'impact": "regarder la balle à l'impact tennis",
  'Pas de split-step visible': 'split step tennis',
  'Frappes trop irrégulières': 'régularité au tennis exercice',
  'Bras libre collé au corps': 'bras libre tennis équilibre coup droit',
};

/**
 * Formule la fourchette visée en français. Quand la borne basse vaut zéro, la mesure est
 * un défaut à minimiser (rotation, stabilité) : « 0 à 0,28 » se lit mal, « 0,28 ou moins » se lit.
 */
export function libelleZone(seuil, unite = '') {
  if (!seuil) return null;
  const [bas, haut] = seuil.ideal;
  const n = (v) => String(v).replace('.', ',') + unite;
  return bas === 0 ? `${n(haut)} ou moins` : `${n(bas)} à ${n(haut)}`;
}

/** Requête vidéo pour un défaut, ou null s'il n'y a rien de pertinent à montrer. */
export function videoConstat(titre) {
  const req = VIDEOS_CONSTAT[titre];
  return req ? { requete: req } : null;
}

/** Chaînes d'enseignement reconnues, à parcourir quand on veut creuser un thème. */
export const CHAINES_VIDEO = [
  { nom: 'Tuto Tennis Technique — FFT', pourquoi: "La série officielle de la Fédération Française de Tennis, avec Paul-Henri Mathieu. En français.", requete: 'Tuto Tennis Technique FFT Paul-Henri Mathieu' },
  { nom: 'Intuitive Tennis', pourquoi: 'Technique décortiquée au ralenti, très pédagogique (anglais).', requete: 'Intuitive Tennis' },
  { nom: 'Top Tennis Training', pourquoi: 'Analyses des pros image par image et exercices concrets (anglais).', requete: 'Top Tennis Training' },
  { nom: 'Essential Tennis', pourquoi: 'Corrections de défauts fréquents chez le joueur de club (anglais).', requete: 'Essential Tennis' },
  { nom: 'Feel Tennis Instruction', pourquoi: 'Approche par les sensations, utile quand le geste est crispé (anglais).', requete: 'Feel Tennis Instruction' },
  { nom: 'Cours de tennis en français', pourquoi: "Les chaînes francophones d'enseignement, du débutant au joueur classé.", requete: 'cours de tennis technique français' },
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
 * Ce que chaque chiffre veut dire, en français. Un nombre seul n'apprend rien :
 * il faut savoir ce qu'il mesure, pourquoi ça compte, et quoi faire s'il sort de la zone.
 * `seuil` renvoie vers SEUILS ; `basEstMieux` inverse la lecture (0 = parfait).
 */
export const EXPLICATIONS = [
  {
    cle: 'hauteurImpact', seuil: 'hauteurImpact', decimales: 2, unite: '',
    bref: { bon: "Tu frappes dans la bonne zone, entre hanche et épaule.", bas: "Contact trop bas : tu subis le rebond.", haut: "Contact très haut : le bras travaille seul." },
    libelle: "Hauteur du point d'impact",
    echelle: '0 = au niveau de la hanche, 1 = au niveau de l\'épaule',
    quoi: "À quelle hauteur ta main rencontre la balle, par rapport à ton corps.",
    pourquoi: "C'est la zone où tu contrôles le mieux : trop bas tu dois lever la balle et elle sort courte, " +
      "trop haut tu perds la poussée des jambes et tu frappes avec le bras seul.",
    tropBas: "Tu frappes sous la hanche : tes jambes ne descendent pas assez tôt et tu prends la balle en retard. " +
      "Recule d'un pas et fléchis davantage pour remonter le contact.",
    tropHaut: "Tu prends la balle très haut, presque au-dessus de l'épaule : le geste devient un bras seul. " +
      "Avance d'un pas pour prendre la balle plus tôt, avant qu'elle ne redescende trop haut.",
    exercice: "Poser un plot ou un sac à hauteur de hanche et frapper 20 balles en visant ce niveau au contact.",
    requeteVideo: "point d'impact tennis coup droit hauteur",
  },
  {
    cle: 'coudeImpact', seuil: 'coudeImpact', decimales: 0, unite: '°',
    bref: { bon: "Bras bien allongé, bonne distance à la balle.", bas: "Bras trop plié : la balle est dans tes pieds.", haut: "Bras verrouillé : l'épaule encaisse tout." },
    libelle: "Angle du coude à l'impact",
    echelle: '180° = bras complètement tendu, 90° = bras plié à angle droit',
    quoi: "À quel point ton bras est déplié au moment où tu touches la balle.",
    pourquoi: "Un bras long au contact éloigne la raquette du corps et allonge le levier : plus de vitesse " +
      "pour le même effort. Un bras replié colle la balle au corps et bride le geste.",
    tropBas: "Ton coude reste très plié : tu frappes trop près de toi. Laisse la balle venir et frappe plus loin du corps.",
    tropHaut: "Ton bras est complètement verrouillé : le coude ne peut plus absorber le choc, l'épaule prend tout. " +
      "Garde un léger pli au contact.",
    exercice: "Frapper 15 balles en gardant une balle de mousse coincée entre le bras et le buste : elle doit tomber au contact, pas avant.",
    requeteVideo: "distance corps balle tennis coup droit",
  },
  {
    cle: 'rotationEpaules', seuil: 'rotationEpaules', decimales: 2, unite: '', basEstMieux: true,
    bref: { bon: "Buste bien tourné avant la frappe.", bas: "", haut: "Buste resté de face : tu joues du bras." },
    libelle: "Rotation du buste",
    echelle: '0 = buste complètement de profil, 1 = buste toujours de face',
    quoi: "À quel point ton buste se tourne pendant le coup. On compare la largeur de tes épaules vue par la " +
      "caméra au moment le plus tourné et au moment le plus ouvert.",
    pourquoi: "C'est la source principale de la puissance : le buste se charge comme un ressort à la préparation " +
      "et se déroule dans la frappe. Sans rotation, seul le bras travaille — moins de vitesse, plus de risque à l'épaule.",
    tropHaut: "Ton buste reste trop de face : tu joues avec le bras. Tourne les épaules dès que tu vois la balle arriver, " +
      "en pointant ta main libre vers elle.",
    tropBas: "Rien à corriger : plus le chiffre est bas, plus la rotation est marquée.",
    exercice: "Sans balle : tourner les épaules jusqu'à voir le fond de court derrière soi, puis dérouler. 3 séries de 10.",
    requeteVideo: "rotation des épaules tennis préparation",
  },
  {
    cle: 'flexionGenou', seuil: 'flexionGenou', decimales: 0, unite: '°',
    bref: { bon: "Jambes bien engagées.", bas: "Position très basse, coûteuse en énergie.", haut: "Jambes trop tendues : pas de poussée du sol." },
    libelle: "Flexion des jambes",
    echelle: '180° = jambe tendue, 130° = flexion franche',
    quoi: "L'angle du genou le plus fléchi juste avant la frappe.",
    pourquoi: "La puissance part du sol : les jambes descendent puis poussent, et cette énergie remonte jusqu'à la " +
      "raquette. Jambes tendues, tu perds cette source et tu es en retard sur les balles basses.",
    tropHaut: "Tu restes debout sur tes jambes : la puissance vient du bras seul et l'équilibre est fragile. " +
      "Descends franchement avant chaque frappe.",
    tropBas: "Tu descends très bas : c'est rarement un défaut, sauf si tu n'arrives plus à remonter à temps.",
    exercice: "Échanges avec consigne « toucher le genou du sol du regard » : à chaque frappe, fléchir jusqu'à sentir la cuisse travailler.",
    requeteVideo: "flexion des jambes tennis coup droit",
  },
  {
    cle: 'accompagnement', seuil: 'accompagnement', decimales: 1, unite: '',
    bref: { bon: "Geste terminé, la raquette accélère à travers la balle.", bas: "Geste coupé au contact : tu freines avant la balle.", haut: "Geste très ample." },
    libelle: "Amplitude du geste après la balle",
    echelle: 'exprimée en largeurs d\'épaules : 1 = ta main parcourt une largeur d\'épaules après le contact',
    quoi: "La distance parcourue par ta main après avoir touché la balle.",
    pourquoi: "La raquette doit accélérer à travers la balle et ne ralentir qu'après. Un geste coupé au contact " +
      "veut dire que tu as freiné avant : la balle perd de la vitesse et du contrôle.",
    tropBas: "Ton geste s'arrête au contact. Termine chaque frappe au-dessus de l'épaule opposée, même à l'échauffement.",
    tropHaut: "Geste très ample : bien pour la puissance, à surveiller seulement si tu es souvent en retard sur la balle suivante.",
    exercice: "Frapper 20 balles en tenant la fin de geste 2 secondes avant de revenir en position d'attente.",
    requeteVideo: "finir son geste tennis coup droit",
  },
  {
    cle: 'deplacementTete', seuil: 'stabiliteTete', decimales: 2, unite: '', basEstMieux: true,
    bref: { bon: "Tête stable : le regard reste sur la balle.", bas: "", haut: "Tête qui part avec le geste : le regard lâche la balle." },
    libelle: "Stabilité de la tête",
    echelle: 'distance parcourue par la tête pendant la frappe, en largeurs d\'épaules',
    quoi: "De combien ta tête bouge entre la préparation et la fin du geste.",
    pourquoi: "Les yeux pilotent le contact. Une tête qui part avec le geste, c'est un regard qui quitte la balle " +
      "trop tôt — d'où les fautes de cadre et les balles décentrées.",
    tropHaut: "Ta tête suit le geste : garde le regard sur le point de contact une fraction de seconde après la frappe.",
    tropBas: "Rien à corriger : plus le chiffre est bas, plus la tête est stable.",
    exercice: "Frapper 15 balles en gardant le menton pointé vers le point de contact jusqu'à la fin du geste.",
    requeteVideo: "regarder la balle à l'impact tennis",
  },
  {
    cle: 'deplacementBassin', seuil: 'stabiliteBassin', decimales: 2, unite: '', basEstMieux: true,
    bref: { bon: "Base stable, appui posé avant la frappe.", bas: "", haut: "Tu frappes encore en mouvement, en déséquilibre." },
    libelle: "Stabilité du bassin",
    echelle: 'distance parcourue par le bassin pendant la frappe, en largeurs d\'épaules',
    quoi: "De combien ton centre de gravité se déplace pendant la frappe.",
    pourquoi: "Un bassin qui glisse latéralement pendant la frappe, c'est un appui qui n'est pas posé : " +
      "tu frappes en déséquilibre et la balle part au hasard.",
    tropHaut: "Tu frappes encore en mouvement. Pose ton appui avant de déclencher le geste, quitte à jouer plus court.",
    tropBas: "Rien à corriger : c'est le signe d'une base stable.",
    exercice: "Échanges lents avec consigne : arrêter complètement les pieds avant de lancer le geste.",
    requeteVideo: "ancrage des appuis à la frappe tennis",
  },
  {
    cle: 'vitesse', seuil: null, decimales: 1, unite: '',
    libelle: "Vitesse de la main au moment fort",
    echelle: 'en largeurs d\'épaules par seconde — un repère relatif, pas des km/h',
    quoi: "La vitesse maximale de ton poignet pendant le coup.",
    pourquoi: "Elle sert surtout à comparer tes frappes entre elles : une frappe nettement plus lente que les " +
      "autres est souvent une frappe subie, en retard. Il n'y a pas de bonne valeur absolue.",
    exercice: "Compare cette valeur d'une frappe à l'autre dans l'onglet « Coups détectés » plutôt qu'à une référence.",
    requeteVideo: "vitesse de raquette tennis accélération",
  },
];

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
