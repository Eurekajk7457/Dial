/**
 * Base de connaissances technique — repères de coaching classiques
 * (fédérations : ITF / FFT / USTA, littérature d'entraînement courante).
 * Sert à la fois de référentiel pour le moteur de règles et de fiche de lecture.
 */

export const FONDAMENTAUX = [
  {
    id: 'coup-droit',
    gaucher: [
      "Ton coup droit croisé arrive dans le revers d'un droitier : c'est le schéma gagnant du gaucher, à jouer en priorité.",
      "L'angle croisé dont tu disposes est plus ouvert que celui d'un droitier : sers-t'en pour sortir l'adversaire du court, pas seulement pour frapper fort.",
      "Attention au piège symétrique : ton coup droit long de ligne arrive dans le coup droit adverse, souvent son meilleur coup.",
    ],
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
    gaucher: [
      "Face à un droitier, son coup droit croisé arrive sur ton revers : c'est le coup que tu subiras le plus souvent, donc celui à solidifier en premier.",
      "Ton revers long de ligne ressort dans son revers : c'est ta porte de sortie quand tu es acculé.",
    ],
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
    gaucher: [
      "Ton service extérieur côté avantage (à gauche du carré) sort le droitier du court sur son revers : c'est l'arme n°1 du gaucher, et c'est le côté des balles de break.",
      "L'effet slice d'un gaucher fait dévier la balle dans l'autre sens que celui auquel l'adversaire est habitué : même à vitesse modeste, il gêne.",
      "Travaille aussi le service au corps côté égalité, sinon l'adversaire s'installe sur ton extérieur.",
    ],
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
    gaucher: [
      "Ta volée de coup droit couvre le côté où le droitier passe le plus naturellement : place-toi en conséquence, légèrement décalé.",
    ],
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

/** Les recherches sont rédigées pour le coup droit, le coup le plus documenté. Proposer une
 *  vidéo de coup droit à quelqu'un dont le défaut porte sur son revers est hors sujet : on
 *  remplace donc le nom du coup par celui réellement concerné. Les requêtes qui ne nomment
 *  aucun coup sont déjà valables partout et restent intactes. */
export function adapterRequete(requete, coup, main) {
  if (!requete) return requete;
  let r = requete;
  const c = String(coup || '').toLowerCase();
  if (r.includes('coup droit') && c && !c.startsWith('g')) {   // « Général » : pas de coup visé
    const volee = c.includes('volée') || c.includes('volee');
    const cible = c.includes('service') ? 'service'
      : volee ? (c.includes('revers') ? 'volée de revers' : 'volée de coup droit')
        : c.includes('revers') ? 'revers' : 'coup droit';
    if (cible !== 'coup droit') r = r.replace('coup droit', cible);
  }
  // Un gaucher qui regarde un droitier doit inverser mentalement chaque appui et chaque
  // rotation. Chercher explicitement un gaucher lui évite ce travail de traduction.
  if (main === 'left' && !r.includes('gaucher')) r += ' gaucher';
  return r;
}

/** Requête vidéo pour un défaut, ou null s'il n'y a rien de pertinent à montrer.
 *  `coup` est le libellé du coup concerné (« Revers », « Service », « Général »…). */
export function videoConstat(titre, coup, main) {
  const req = VIDEOS_CONSTAT[titre];
  return req ? { requete: adapterRequete(req, coup, main) } : null;
}


/**
 * Joueurs de référence, classés par main et par type de revers.
 *
 * Pourquoi une liste aussi longue : un gaucher qui regarde un droitier doit tout inverser
 * mentalement, et un revers à une main ne s'apprend pas en regardant un revers à deux mains.
 * Proposer « un ou deux » modèles revient donc, pour la plupart des joueurs, à n'en proposer
 * aucun qui leur corresponde. Chaque profil doit trouver ici plusieurs modèles, d'époques et
 * de styles différents, sans quoi le conseil « regarde untel » ne vaut rien.
 *
 * Ce qui est stocké ne se périme pas : main, type de revers, style de jeu. Aucun classement
 * ni palmarès, qui seraient faux dans six mois.
 */
export const MODELES = [
  /* --- Gauchers, revers à deux mains ------------------------------------------------- */
  { nom: 'Rafael Nadal', main: 'left', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Coup droit très lifté, finition en lasso au-dessus de la tête.",
    regarder: "Comment la main remonte bien au-dessus de l'épaule après la balle : c'est le lift qui fait plonger la balle dans le court." },
  { nom: 'Jack Draper', main: 'left', revers: 'deux', sexe: 'h', epoque: 'actuel',
    style: "Service gaucher très lourd, coup droit long à armer.",
    regarder: "L'angle du service extérieur côté avantage : la balle sort du court avant de rebondir." },
  { nom: 'Ben Shelton', main: 'left', revers: 'deux', sexe: 'h', epoque: 'actuel',
    style: "Jeu explosif, appuis très dynamiques.",
    regarder: "La poussée des jambes au service : tout part du sol, le bras ne fait que suivre." },
  { nom: 'Ugo Humbert', main: 'left', revers: 'deux', sexe: 'h', epoque: 'actuel',
    style: "Frappe précoce, prise de balle très tôt après le rebond.",
    regarder: "Le point d'impact, toujours devant le corps : il ne recule jamais pour frapper." },
  { nom: 'Adrian Mannarino', main: 'left', revers: 'deux', sexe: 'h', epoque: 'actuel',
    style: "Balles plates et tendues, gestes très courts.",
    regarder: "L'économie du geste : presque pas de préparation, tout est dans le timing." },
  { nom: 'Corentin Moutet', main: 'left', revers: 'deux', sexe: 'h', epoque: 'actuel',
    style: "Main très fine, varie sans arrêt les effets et les hauteurs.",
    regarder: "Comment il change de rythme sans changer de geste apparent." },
  { nom: 'Cameron Norrie', main: 'left', revers: 'deux', sexe: 'h', epoque: 'actuel',
    style: "Coup droit très atypique, poignet bloqué, régularité extrême.",
    regarder: "La preuve qu'un geste peu académique peut fonctionner s'il est parfaitement répété." },
  { nom: 'Fernando Verdasco', main: 'left', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Un des coups droits gauchers les plus puissants du circuit.",
    regarder: "La rotation du buste : les épaules partent bien avant le bras." },
  { nom: 'Jimmy Connors', main: 'left', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Balles plates, prise de balle très tôt, agressivité permanente.",
    regarder: "Le retour de service pris dans le court, presque sur la ligne." },
  { nom: 'Goran Ivanišević', main: 'left', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Le service gaucher de référence.",
    regarder: "Le lancer de balle, très constant, légèrement sur la gauche pour ouvrir l'angle extérieur." },
  { nom: 'Marcelo Ríos', main: 'left', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Fluidité et toucher, aucun effort apparent.",
    regarder: "Le relâchement du bras : la raquette accélère seule à la fin du geste." },
  { nom: 'Petr Korda', main: 'left', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Grande amplitude, revers à deux mains très pur.",
    regarder: "Le buste qui reste de profil jusqu'à l'impact sur le revers." },
  { nom: 'Thomas Muster', main: 'left', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Coup droit très lifté, jeu de fond de court sur terre battue.",
    regarder: "La flexion des jambes avant chaque frappe : il frappe toujours de bas en haut." },

  /* --- Gauchers, revers à une main (le profil le plus rare) --------------------------- */
  { nom: 'Denis Shapovalov', main: 'left', revers: 'une', sexe: 'h', epoque: 'actuel',
    style: "Le seul revers à une main gaucher du haut niveau actuel.",
    regarder: "Le bras libre qui part vers l'arrière pour équilibrer : sans lui, le buste s'ouvre trop tôt." },
  { nom: 'Feliciano López', main: 'left', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Service-volée gaucher, revers à une main coupé et attaqué.",
    regarder: "Le slice de revers en approche : geste haut vers bas, la balle reste basse." },
  { nom: 'Rod Laver', main: 'left', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Le modèle historique du gaucher complet.",
    regarder: "Le poignet très actif dans le lift, rare pour l'époque." },
  { nom: 'John McEnroe', main: 'left', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Service très fermé de profil, toucher de volée exceptionnel.",
    regarder: "La position de départ au service, dos presque tourné au filet." },
  { nom: 'Guillermo Vilas', main: 'left', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Revers à une main très lifté, endurance de fond de court.",
    regarder: "La finition du revers, très haute, qui donne le lift." },
  { nom: 'Henri Leconte', main: 'left', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Jeu instinctif, main gauche très douce.",
    regarder: "La volée de revers à une main, prise très tôt devant le corps." },

  /* --- Gauchères ---------------------------------------------------------------------- */
  { nom: 'Martina Navratilova', main: 'left', revers: 'une', sexe: 'f', epoque: 'legende',
    style: "Service-volée gauchère, revers à une main.",
    regarder: "L'enchaînement service puis montée : le premier pas part avant la fin du geste." },
  { nom: 'Monica Seles', main: 'left', revers: 'deux', sexe: 'f', epoque: 'legende',
    style: "Deux mains des deux côtés, prise de balle très tôt.",
    regarder: "La frappe montante, systématiquement dans la ligne montante du rebond." },
  { nom: 'Petra Kvitová', main: 'left', revers: 'deux', sexe: 'f', epoque: 'legende',
    style: "Frappe plate et très puissante des deux côtés.",
    regarder: "La simplicité de la préparation : courte, directe, sans boucle inutile." },
  { nom: 'Angelique Kerber', main: 'left', revers: 'deux', sexe: 'f', epoque: 'legende',
    style: "Défense, déplacement latéral, contre-attaque.",
    regarder: "Le déplacement : elle frappe presque toujours en équilibre, même en course." },
  { nom: 'Markéta Vondroušová', main: 'left', revers: 'deux', sexe: 'f', epoque: 'actuel',
    style: "Variation permanente : lift, slice, amorties.",
    regarder: "Le slice de revers gaucher, qui glisse vers l'extérieur d'une droitière." },
  { nom: 'Alexandra Eala', main: 'left', revers: 'deux', sexe: 'f', epoque: 'actuel',
    style: "Jeu d'attaque gaucher, coup droit croisé très ouvert.",
    regarder: "L'angle du coup droit croisé : le gaucher ouvre un angle qu'un droitier n'a pas." },
  { nom: 'Lucie Šafářová', main: 'left', revers: 'deux', sexe: 'f', epoque: 'legende',
    style: "Revers à deux mains gaucher très tendu.",
    regarder: "La main non dominante qui tire le geste jusqu'au bout." },

  /* --- Droitiers, revers à une main ---------------------------------------------------- */
  { nom: 'Roger Federer', main: 'right', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "La référence technique du revers à une main moderne.",
    regarder: "L'épaule avant qui pointe la balle jusqu'au dernier instant, puis l'ouverture du buste." },
  { nom: 'Stan Wawrinka', main: 'right', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Le revers à une main le plus puissant du circuit moderne.",
    regarder: "La flexion de la jambe avant : il descend sous la balle avant de monter dedans." },
  { nom: 'Richard Gasquet', main: 'right', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Amplitude de préparation exceptionnelle sur le revers.",
    regarder: "La boucle de préparation, très haute derrière l'épaule." },
  { nom: 'Stefanos Tsitsipas', main: 'right', revers: 'une', sexe: 'h', epoque: 'actuel',
    style: "Revers à une main de grande taille, appuis très fermés.",
    regarder: "Le pied avant qui se plante avant la frappe : sans cet appui, le geste part en vrille." },
  { nom: 'Grigor Dimitrov', main: 'right', revers: 'une', sexe: 'h', epoque: 'actuel',
    style: "Gestes très fluides, proches de ceux de Federer.",
    regarder: "Le relâchement du poignet à l'impact, sans crispation." },
  { nom: 'Lorenzo Musetti', main: 'right', revers: 'une', sexe: 'h', epoque: 'actuel',
    style: "Le revers à une main le mieux classé du circuit actuel, très varié.",
    regarder: "Le passage du lift au slice sans changer de préparation." },
  { nom: 'Dominic Thiem', main: 'right', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Revers à une main très lifté, frappé de loin derrière la ligne.",
    regarder: "L'amplitude complète du geste, du bas du dos jusqu'au-dessus de la tête." },
  { nom: 'Gustavo Kuerten', main: 'right', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Revers à une main lifté sur terre battue.",
    regarder: "La rotation complète des épaules à la préparation : on voit son dos de l'autre côté." },
  { nom: 'Pete Sampras', main: 'right', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Service-volée, revers à une main coupé ou attaqué.",
    regarder: "L'extension au service, corps entièrement déployé vers la balle." },
  { nom: 'Stefan Edberg', main: 'right', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Le modèle du service-volée et de la volée de revers.",
    regarder: "La volée : geste court, la raquette ne passe jamais derrière l'épaule." },
  { nom: 'Ivan Lendl', main: 'right', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Coup droit très lifté, jeu construit depuis le fond.",
    regarder: "La régularité du point d'impact, toujours à la même hauteur." },
  { nom: 'Ken Rosewall', main: 'right', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Le revers slice de référence.",
    regarder: "Le plan de frappe : la raquette descend très peu, elle traverse la balle." },
  { nom: 'Fabio Fognini', main: 'right', revers: 'une', sexe: 'h', epoque: 'legende',
    style: "Revers à une main pris très tôt, main très fine.",
    regarder: "La prise de balle montante en revers, rare à une main." },
  { nom: 'Dušan Lajović', main: 'right', revers: 'une', sexe: 'h', epoque: 'actuel',
    style: "Revers à une main classique, jeu de terre battue.",
    regarder: "Le transfert du poids sur la jambe avant, très visible de profil." },

  /* --- Droitières, revers à une main ---------------------------------------------------- */
  { nom: 'Justine Henin', main: 'right', revers: 'une', sexe: 'f', epoque: 'legende',
    style: "Le plus beau revers à une main du tennis féminin.",
    regarder: "Le bras libre tendu vers l'arrière, exactement à l'opposé de la raquette." },
  { nom: 'Amélie Mauresmo', main: 'right', revers: 'une', sexe: 'f', epoque: 'legende',
    style: "Revers à une main puissant, jeu d'attaque et de montée au filet.",
    regarder: "L'enchaînement revers long de ligne puis montée." },
  { nom: 'Francesca Schiavone', main: 'right', revers: 'une', sexe: 'f', epoque: 'legende',
    style: "Revers à une main très varié, beaucoup de slice.",
    regarder: "Le slice défensif qui reste bas et casse le rythme de l'adversaire." },
  { nom: 'Carla Suárez Navarro', main: 'right', revers: 'une', sexe: 'f', epoque: 'legende',
    style: "Revers à une main de petite taille, timing parfait.",
    regarder: "La preuve qu'un revers à une main ne demande pas de force, mais du timing." },
  { nom: 'Tatjana Maria', main: 'right', revers: 'une', sexe: 'f', epoque: 'actuel',
    style: "Slice des deux côtés, jeu très inhabituel.",
    regarder: "Le slice de coup droit, quasiment disparu du jeu moderne." },
  { nom: 'Lilli Tagger', main: 'right', revers: 'une', sexe: 'f', epoque: 'actuel',
    style: "Jeune joueuse au revers à une main très ample.",
    regarder: "La préparation haute et la finition très longue vers la cible." },
  { nom: 'Steffi Graf', main: 'right', revers: 'une', sexe: 'f', epoque: 'legende',
    style: "Coup droit dévastateur, revers presque toujours coupé.",
    regarder: "Le déplacement autour de la balle pour jouer le coup droit à la place du revers." },

  /* --- Droitiers, revers à deux mains --------------------------------------------------- */
  { nom: 'Novak Djokovic', main: 'right', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Le revers à deux mains de référence, souplesse extrême.",
    regarder: "L'équilibre : le buste reste vertical même en glissade." },
  { nom: 'Carlos Alcaraz', main: 'right', revers: 'deux', sexe: 'h', epoque: 'actuel',
    style: "Jeu complet, coup droit très lifté, amorties fréquentes.",
    regarder: "L'accélération du bras sur les derniers centimètres avant la balle." },
  { nom: 'Jannik Sinner', main: 'right', revers: 'deux', sexe: 'h', epoque: 'actuel',
    style: "Frappe très propre des deux côtés, prise de balle précoce.",
    regarder: "La constance du geste : deux frappes de suite sont pratiquement superposables." },
  { nom: 'Daniil Medvedev', main: 'right', revers: 'deux', sexe: 'h', epoque: 'actuel',
    style: "Position très reculée, bras tendu, geste plat.",
    regarder: "Un exemple de technique non conforme qui fonctionne par la régularité." },
  { nom: 'Andy Murray', main: 'right', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Revers à deux mains long de ligne, jeu de contre.",
    regarder: "La rotation d'épaules à la préparation du revers, très marquée." },
  { nom: 'Andre Agassi', main: 'right', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Prise de balle la plus tôt de son époque.",
    regarder: "Le retour de service pris dans la ligne montante, à l'intérieur du court." },
  { nom: 'Björn Borg', main: 'right', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Lift des deux côtés, régularité absolue.",
    regarder: "La finition très haute, qui donne la marge au-dessus du filet." },
  { nom: 'Juan Martín del Potro', main: 'right', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Coup droit parmi les plus puissants jamais vus.",
    regarder: "La ligne d'épaules à l'impact : parfaitement perpendiculaire au filet." },
  { nom: 'Gaël Monfils', main: 'right', revers: 'deux', sexe: 'h', epoque: 'actuel',
    style: "Athlétisme, défense, frappes en déséquilibre.",
    regarder: "Comment il retrouve un appui après chaque course : le pas d'arrêt." },
  { nom: 'Jo-Wilfried Tsonga', main: 'right', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Service puissant, coup droit d'attaque, jeu vers l'avant.",
    regarder: "L'enchaînement coup droit puis montée au filet." },
  { nom: 'David Ferrer', main: 'right', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Jeu de jambes et régularité, sans coup exceptionnel.",
    regarder: "Le nombre de petits pas d'ajustement avant chaque frappe." },
  { nom: 'Alex de Minaur', main: 'right', revers: 'deux', sexe: 'h', epoque: 'actuel',
    style: "Vitesse de déplacement, contre-attaque.",
    regarder: "Le split-step, systématique et parfaitement synchronisé avec la frappe adverse." },
  { nom: 'Casper Ruud', main: 'right', revers: 'deux', sexe: 'h', epoque: 'actuel',
    style: "Coup droit très lifté, jeu de fond de court sur terre battue.",
    regarder: "La trajectoire haute au-dessus du filet, qui retombe court dans le carré." },
  { nom: 'Lleyton Hewitt', main: 'right', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Passing-shots, défense transformée en attaque.",
    regarder: "Le passing de revers croisé, frappé en pleine course." },
  { nom: 'Marat Safin', main: 'right', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Frappe plate et lourde des deux côtés.",
    regarder: "L'amplitude du revers à deux mains, geste très long." },
  { nom: 'Michael Chang', main: 'right', revers: 'deux', sexe: 'h', epoque: 'legende',
    style: "Petit gabarit, endurance, jeu de jambes.",
    regarder: "Comment il compense la taille par la vitesse de placement." },

  /* --- Droitières, revers à deux mains --------------------------------------------------- */
  { nom: 'Serena Williams', main: 'right', revers: 'deux', sexe: 'f', epoque: 'legende',
    style: "Service et coup droit les plus puissants du tennis féminin.",
    regarder: "La poussée de jambes au service, et le temps d'armé très court." },
  { nom: 'Venus Williams', main: 'right', revers: 'deux', sexe: 'f', epoque: 'legende',
    style: "Grande taille, allonge, frappe très plate.",
    regarder: "L'extension complète du bras à l'impact." },
  { nom: 'Iga Świątek', main: 'right', revers: 'deux', sexe: 'f', epoque: 'actuel',
    style: "Coup droit très lifté, jeu de fond de court très mobile.",
    regarder: "La rotation des hanches avant celle des épaules sur le coup droit." },
  { nom: 'Aryna Sabalenka', main: 'right', revers: 'deux', sexe: 'f', epoque: 'actuel',
    style: "Frappe plate et très puissante des deux côtés.",
    regarder: "Le transfert du poids vers l'avant, très net sur le coup droit." },
  { nom: 'Coco Gauff', main: 'right', revers: 'deux', sexe: 'f', epoque: 'actuel',
    style: "Revers à deux mains très solide, vitesse de déplacement.",
    regarder: "Le revers croisé court, joué avec un angle très fermé." },
  { nom: 'Simona Halep', main: 'right', revers: 'deux', sexe: 'f', epoque: 'legende',
    style: "Prise de balle tôt, régularité, petit gabarit.",
    regarder: "La position sur la ligne de fond, jamais reculée." },
  { nom: 'Maria Sharapova', main: 'right', revers: 'deux', sexe: 'f', epoque: 'legende',
    style: "Frappe plate et longue, jeu d'agression permanente.",
    regarder: "La longueur du geste d'accompagnement, très marquée." },
  { nom: 'Kim Clijsters', main: 'right', revers: 'deux', sexe: 'f', epoque: 'legende',
    style: "Défense en glissade, souplesse exceptionnelle.",
    regarder: "La glissade en défense, y compris sur surface dure." },
  { nom: 'Naomi Osaka', main: 'right', revers: 'deux', sexe: 'f', epoque: 'actuel',
    style: "Service puissant, frappe plate depuis le fond.",
    regarder: "Le lancer de balle au service, remarquablement constant." },
  { nom: 'Elena Rybakina', main: 'right', revers: 'deux', sexe: 'f', epoque: 'actuel',
    style: "Service et frappe très purs, économie de mouvement.",
    regarder: "Le geste de service, court et sans temps mort." },
  { nom: 'Mirra Andreeva', main: 'right', revers: 'deux', sexe: 'f', epoque: 'actuel',
    style: "Jeune joueuse très complète, bonne lecture du jeu.",
    regarder: "L'anticipation : elle est en mouvement avant la frappe adverse." },
];

/**
 * Sélection des modèles correspondant à un profil, du plus proche au plus lointain.
 * On ne se contente pas de filtrer : à l'intérieur d'un même niveau de correspondance, on
 * alterne joueurs d'aujourd'hui et joueurs historiques, hommes et femmes. Sans cet
 * entrelacement, les douze premiers noms d'un droitier à deux mains seraient douze hommes
 * des années 2000 — une liste longue mais pauvre.
 */
export function modelesPour({ main, revers } = {}, max = 12) {
  const m = (main === 'left' || main === 'right') ? main : null;
  const r = (revers === 'une' || revers === 'deux') ? revers : null;
  const rang = (j) => {
    if (m && r) return (j.main === m && j.revers === r) ? 0 : j.main === m ? 1 : j.revers === r ? 2 : 3;
    if (m) return j.main === m ? 0 : 2;
    if (r) return j.revers === r ? 0 : 2;
    return 0;
  };

  // Un panier par (rang, sexe, époque). Les rangs sont épuisés dans l'ordre : on ne propose
  // un profil moins ressemblant qu'une fois tous les modèles exacts déjà donnés.
  const paniers = new Map();
  MODELES.forEach((j, i) => {
    const rg = rang(j);
    const cle = `${rg}|${j.sexe}|${j.epoque}`;
    if (!paniers.has(cle)) paniers.set(cle, []);
    paniers.get(cle).push({ ...j, correspondance: rg, ordre: i });
  });

  const sortie = [];
  for (let rg = 0; rg <= 3 && sortie.length < max; rg++) {
    const duRang = [...paniers.entries()]
      .filter(([cle]) => Number(cle.split('|')[0]) === rg)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v);
    // Tour de table entre hommes / femmes et actuels / historiques du même rang.
    for (let tour = 0; sortie.length < max; tour++) {
      let servi = false;
      for (const panier of duRang) {
        if (tour >= panier.length) continue;
        sortie.push(panier[tour]);
        servi = true;
        if (sortie.length >= max) break;
      }
      if (!servi) break;
    }
  }
  return sortie.sort((a, b) => a.correspondance - b.correspondance || a.ordre - b.ordre);
}

/** Recherche vidéo ciblée sur un joueur et, si on le connaît, sur le coup travaillé. */
export function requeteModele(joueur, coup) {
  const nom = typeof joueur === 'string' ? joueur : joueur.nom;
  const c = String(coup || '').toLowerCase();
  const geste = c.includes('service') ? 'service'
    : c.includes('volée') || c.includes('volee') ? 'volée'
      : c.includes('revers') ? 'revers'
        : c.includes('coup droit') ? 'coup droit' : '';
  return `${nom} ${geste} ralenti technique`.replace('  ', ' ');
}

export const LIBELLE_MAIN = { left: 'gaucher', right: 'droitier' };
export const LIBELLE_REVERS = { une: 'revers à une main', deux: 'revers à deux mains' };

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
  // Angle du coude à l'impact (fond de court, bras dominant tendu)
  coudeImpact:    { ideal: [140, 172], acceptable: [125, 178] },
  // Revers à deux mains : les deux coudes restent nettement plus fléchis, le bras dominant
  // ne se tend jamais comme en coup droit. Appliquer la même référence était une erreur.
  coudeRevers2M:  { ideal: [105, 150], acceptable: [92, 162] },
  // Hauteur d'impact relative : 0 = hanche, 1 = épaule (fond de court)
  hauteurImpact:  { ideal: [0.25, 0.95], acceptable: [0.05, 1.2] },
  // Déplacement latéral du bassin pendant la frappe, en largeurs d'épaules
  stabiliteBassin:{ ideal: [0, 0.45], acceptable: [0, 0.9] },
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
    pourquoi: "Un bassin encore lancé au moment précis du contact, c'est un appui qui n'est pas posé. " +
      "Attention : se déplacer pour aller chercher la balle est normal et souhaitable — seul compte " +
      "l'instant de la frappe, mesuré sur un douzième de seconde de part et d'autre du contact.",
    tropHaut: "Ton bassin est encore lancé à l'instant du contact. Sur une balle que tu dois courir chercher, " +
      "c'est parfois inévitable ; si ça arrive aussi sur des balles confortables, pose ton appui avant de " +
      "déclencher le geste, quitte à jouer plus court.",
    tropBas: "Rien à corriger : c'est le signe d'une base stable.",
    exercice: "Échanges lents avec consigne : arrêter complètement les pieds avant de lancer le geste.",
    requeteVideo: "ancrage des appuis à la frappe tennis",
  },
  {
    cle: 'vitesse', seuil: null, decimales: 1, unite: '',
    libelle: "Vitesse de la main par rapport au corps",
    echelle: "en largeurs d'épaules par seconde, main mesurée par rapport au bassin — un repère relatif, pas des km/h",
    quoi: "La vitesse maximale de ton poignet pendant le coup, mesurée par rapport à ton bassin — ce qui compte, c'est que la main parte toute seule, pas que tout le corps avance.",
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
