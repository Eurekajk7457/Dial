/**
 * Analyse approfondie facultative via l'API Claude (Anthropic), appelée directement
 * depuis le navigateur avec la clé de l'utilisateur (BYOK).
 */

const URL_API = 'https://api.anthropic.com/v1/messages';
const MODELE = 'claude-opus-5';

const SYSTEME = `Tu es entraîneur de tennis diplômé (niveau DE / ITF Level 2). Tu analyses des images clés
extraites d'une vidéo d'un joueur amateur, accompagnées de mesures biomécaniques calculées automatiquement
par détection de posture (elles sont indicatives et peuvent contenir des erreurs de détection : si une image
contredit une mesure, fais confiance à l'image et dis-le).

Réponds en français, en Markdown, avec exactement ces sections :

## Ce qui fonctionne
2 à 4 points précis, ancrés dans ce que tu vois réellement sur les images.

## À corriger en priorité
Les 2 ou 3 défauts qui coûtent le plus, classés du plus important au moins important. Pour chacun :
le constat, la conséquence concrète sur la balle ou sur le corps, et la correction technique.

## Exercices pour la semaine
3 exercices concrets et réalisables seul ou avec un partenaire : nom, déroulé, nombre de répétitions,
et le point de contrôle qui indique que c'est réussi.

## À vérifier sur une prochaine vidéo
Ce que l'angle de caméra actuel ne permet pas de juger (prise de raquette, effet, trajectoire de balle...).

Règles : sois direct et concret, pas de flatterie ni de généralités. Ne prétends pas voir ce que les images
ne montrent pas. Si la qualité de détection est faible, dis-le d'entrée.`;

function nettoyerBase64(dataURL) {
  const i = dataURL.indexOf(',');
  return i >= 0 ? dataURL.slice(i + 1) : dataURL;
}

function construirePrompt({ analyse, niveau, objectif, avecWeb }) {
  const niveaux = {
    debutant: 'débutant (moins de 2 ans de pratique)',
    intermediaire: 'intermédiaire, joueur de club',
    avance: 'avancé, joueur de compétition',
  };

  const groupes = analyse.groupes.map((g) => {
    const m = g.medianes;
    const n = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : 'n/d');
    return `- ${g.libelle} (${g.nombre} frappe(s)) : ` + [
      `hauteur d'impact ${n(m.hauteurImpact)} (0 = hanche, 1 = épaule)`,
      `angle du coude à l'impact ${n(m.coudeImpact, 0)}°`,
      `indice de rotation d'épaules ${n(m.rotationEpaules)} (plus bas = plus de rotation)`,
      `genou le plus fléchi ${n(m.flexionGenou, 0)}°`,
      `amplitude d'accompagnement ${n(m.accompagnement, 1)} largeurs d'épaules`,
      `déplacement de la tête à l'impact ${n(m.deplacementTete)}`,
      `déplacement du bassin à l'impact ${n(m.deplacementBassin)}`,
      `vitesse de poignet au pic ${n(m.vitesse, 1)} largeurs d'épaules/s`,
    ].join(', ');
  }).join('\n');

  const constats = analyse.constats
    .filter((c) => c.niveau === 'priorite' || c.niveau === 'corriger')
    .map((c) => `- [${c.coup}] ${c.titre} — ${c.detail}`)
    .join('\n') || '- (aucun défaut majeur détecté automatiquement)';

  return [
    `Joueur ${niveaux[niveau] || niveaux.intermediaire}, ${analyse.mainDominante === 'D' ? 'droitier' : 'gaucher'} (détecté).`,
    objectif ? `Objectif annoncé par le joueur : ${objectif}` : null,
    ``,
    `Séquence analysée : ${analyse.duree.toFixed(1)} s, ${analyse.frappes.length} frappe(s) détectée(s).`,
    `Qualité de détection de posture : ${Math.round(analyse.tauxDetection * 100)} % des images.`,
    ``,
    `Mesures automatiques (médianes par type de coup) :`,
    groupes || '- (aucun coup identifié)',
    ``,
    `Défauts relevés par le moteur de règles :`,
    constats,
    ``,
    `Les images fournies sont les instants d'impact et d'accompagnement des frappes détectées, dans l'ordre chronologique.`,
    avecWeb
      ? `Tu peux utiliser la recherche web pour appuyer un point technique sur une source fiable (fédération, entraîneur reconnu, étude biomécanique) ou pour proposer un exercice éprouvé. Cite les sources utilisées à la fin, sous « ## Sources ». N'utilise la recherche que si elle apporte vraiment quelque chose.`
      : null,
  ].filter((l) => l !== null).join('\n');
}

async function appeler({ apiKey, corps }) {
  const res = await fetch(URL_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(corps),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.error?.message || JSON.stringify(j);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`API Anthropic ${res.status} : ${detail || res.statusText}`);
  }
  return res.json();
}

/**
 * @param {{apiKey: string, analyse: object, images: Array<{b64: string, legende: string}>,
 *          niveau: string, objectif: string, avecWeb: boolean, onStatut: Function}} opts
 * @returns {Promise<{texte: string, sources: Array, usage: object}>}
 */
export async function analyserAvecClaude({
  apiKey, analyse, images, niveau = 'intermediaire', objectif = '',
  avecWeb = true, onStatut = () => {},
}) {
  if (!apiKey) throw new Error('Clé API manquante.');

  const contenu = [];
  images.forEach((img, i) => {
    contenu.push({ type: 'text', text: `Image ${i + 1} — ${img.legende}` });
    contenu.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: nettoyerBase64(img.b64) },
    });
  });
  contenu.push({ type: 'text', text: construirePrompt({ analyse, niveau, objectif, avecWeb }) });

  const messages = [{ role: 'user', content: contenu }];
  const base = {
    model: MODELE,
    max_tokens: 8000,
    system: SYSTEME,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
  };
  if (avecWeb) {
    base.tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }];
  }

  onStatut('Envoi des images clés à Claude…');

  let reponse = null;
  for (let tour = 0; tour < 6; tour++) {
    reponse = await appeler({ apiKey, corps: { ...base, messages } });

    if (reponse.stop_reason === 'pause_turn') {
      // Un outil serveur (recherche web) a atteint sa limite d'itérations : on relance.
      messages.push({ role: 'assistant', content: reponse.content });
      onStatut('Recherche de références en ligne…');
      continue;
    }
    break;
  }

  if (reponse?.stop_reason === 'refusal') {
    throw new Error("Claude a décliné cette requête. Réessaie avec une autre séquence ou sans recherche web.");
  }

  const texte = (reponse?.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  const sources = [];
  for (const bloc of reponse?.content || []) {
    if (bloc.type === 'web_search_tool_result' && Array.isArray(bloc.content)) {
      for (const r of bloc.content) {
        if (r.url && !sources.some((s) => s.url === r.url)) {
          sources.push({ url: r.url, titre: r.title || r.url });
        }
      }
    }
  }

  if (!texte) throw new Error("Réponse vide de l'API.");
  return { texte, sources, usage: reponse.usage };
}
