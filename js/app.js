/**
 * Orchestration de l'interface.
 */

import { echantillonner, SQUELETTE } from './pose.js';
import { analyser, LIBELLES_COUP } from './analyse.js';
import { FONDAMENTAUX, RESSOURCES } from './knowledge.js';
import { analyserAvecClaude, poserQuestion } from './ai.js';

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};
const echapper = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const etat = {
  fichier: null,
  echantillon: null,
  analyse: null,
  conversation: null,   // mémoire de l'échange avec l'entraîneur IA
};

/** Ce que le joueur a renseigné sur lui et sur la vidéo. */
function lireProfil() {
  return {
    main: $('#opt-main').value,
    coup: $('#opt-coup').value,
    revers: $('#opt-revers').value,
    angle: $('#opt-angle').value,
    niveau: $('#opt-niveau').value,
    anciennete: $('#opt-anciennete').value,
    objectif: $('#opt-objectif').value.trim(),
  };
}

/* ------------------------------------------------------------------ */
/* Import de la vidéo                                                  */
/* ------------------------------------------------------------------ */

const dropzone = $('#dropzone');
const fileInput = $('#file-input');
const video = $('#video');
const overlay = $('#overlay');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
['dragenter', 'dragover'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('survol'); }));
['dragleave', 'drop'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('survol'); }));
dropzone.addEventListener('drop', (e) => {
  const f = e.dataTransfer?.files?.[0];
  if (f) chargerVideo(f);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files?.[0]) chargerVideo(fileInput.files[0]);
});

function erreurImport(msg) {
  const p = $('#import-erreur');
  p.textContent = msg;
  p.hidden = !msg;
}

function chargerVideo(fichier) {
  if (!fichier.type.startsWith('video/')) {
    erreurImport("Ce fichier n'est pas une vidéo.");
    return;
  }
  erreurImport('');
  etat.fichier = fichier;
  if (video.src) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(fichier);

  video.addEventListener('loadedmetadata', () => {
    dropzone.hidden = true;
    $('#video-zone').hidden = false;
    const duree = video.duration;
    const champDuree = $('#opt-duree');
    champDuree.max = Math.ceil(duree);
    champDuree.value = Math.min(30, Math.max(3, Math.floor(duree)));
    $('#opt-debut').max = Math.max(0, Math.floor(duree - 2));
    dimensionnerOverlay();
  }, { once: true });
}

$('#btn-reset').addEventListener('click', () => {
  dropzone.hidden = false;
  $('#video-zone').hidden = true;
  $('#etape-resultats').hidden = true;
  $('#etape-biblio').hidden = false;
  fileInput.value = '';
  etat.echantillon = null;
  etat.analyse = null;
});

$('#btn-aide').addEventListener('click', () => $('#dlg-aide').showModal());

/* ------------------------------------------------------------------ */
/* Squelette sur la vidéo                                              */
/* ------------------------------------------------------------------ */

function dimensionnerOverlay() {
  overlay.width = video.clientWidth;
  overlay.height = video.clientHeight;
}
window.addEventListener('resize', dimensionnerOverlay);

function dessinerSquelette(ctx, pts, w, h, { epaisseur = 3, couleur = '#d8f24a' } = {}) {
  ctx.lineWidth = epaisseur;
  ctx.strokeStyle = couleur;
  ctx.fillStyle = couleur;
  for (const [a, b] of SQUELETTE) {
    const pa = pts[a], pb = pts[b];
    if (!pa || !pb) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    ctx.stroke();
  }
  for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    const p = pts[i];
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, epaisseur + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function rafraichirOverlay() {
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  const frames = etat.echantillon?.frames;
  if (!frames?.length || !video.videoWidth) return;

  const t = video.currentTime;
  let best = null, d = Infinity;
  for (const f of frames) {
    const dd = Math.abs(f.t - t);
    if (dd < d) { d = dd; best = f; }
  }
  if (!best?.pts || d >= 0.2) return;

  // La vidéo est affichée en « contain » : on retrouve le rectangle réellement dessiné.
  const ratio = video.videoWidth / video.videoHeight;
  let w = overlay.width, h = overlay.width / ratio;
  if (h > overlay.height) { h = overlay.height; w = overlay.height * ratio; }
  ctx.save();
  ctx.translate((overlay.width - w) / 2, (overlay.height - h) / 2);
  dessinerSquelette(ctx, best.pts, w, h);
  ctx.restore();
}
video.addEventListener('timeupdate', rafraichirOverlay);
video.addEventListener('seeked', rafraichirOverlay);
video.addEventListener('loadeddata', dimensionnerOverlay);

/* ------------------------------------------------------------------ */
/* Analyse                                                             */
/* ------------------------------------------------------------------ */

const btnAnalyser = $('#btn-analyser');

function progres(p, label) {
  $('#progress').hidden = false;
  $('#progress-fill').style.width = `${Math.round(p * 100)}%`;
  $('#progress-label').textContent = label;
}

btnAnalyser.addEventListener('click', async () => {
  erreurImport('');

  const profil = lireProfil();
  if (!profil.main || !profil.coup) {
    const manquant = !profil.main ? '#opt-main' : '#opt-coup';
    erreurImport("Réponds d'abord aux deux questions marquées d'une étoile : sans elles, l'analyse " +
      'se trompe de bras et confond coup droit et revers.');
    $(manquant).focus();
    $(manquant).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  btnAnalyser.disabled = true;
  video.pause();

  try {
    progres(0, 'Préparation…');
    const echantillon = await echantillonner(video, {
      debut: Number($('#opt-debut').value) || 0,
      duree: Number($('#opt-duree').value) || 30,
      fps: Number($('#opt-fps').value) || 12,
      onProgres: (p, m) => progres(p * 0.95, m),
    });
    etat.echantillon = echantillon;

    progres(0.97, 'Calcul des mesures…');
    etat.analyse = analyser(echantillon, profil);
    etat.conversation = null;   // nouvelle vidéo : on repart d'une discussion vierge

    progres(1, 'Terminé.');
    setTimeout(() => { $('#progress').hidden = true; }, 800);

    afficherResultats(etat.analyse);
    rafraichirOverlay();
  } catch (err) {
    $('#progress').hidden = true;
    erreurImport(err.message || String(err));
  } finally {
    btnAnalyser.disabled = false;
  }
});

/* ------------------------------------------------------------------ */
/* Rendu des résultats                                                 */
/* ------------------------------------------------------------------ */

function afficherResultats(a) {
  $('#etape-resultats').hidden = false;
  $('#etape-biblio').hidden = true;
  rendreSynthese(a);
  rendreCoups(a);
  rendreMesures(a);
  rendreFondamentaux($('#vue-fondamentaux'));
  $('#etape-resultats').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function carteConstat(c) {
  const classes = { bon: 'bon', corriger: 'corriger', priorite: 'priorite', info: '' };
  const node = el('div', `constat ${classes[c.niveau] ?? ''}`);
  const badge = c.coup ? `<span class="badge">${echapper(c.coup)}</span>` : '';
  node.appendChild(el('h4', null, `${echapper(c.titre)}${badge}`));
  node.appendChild(el('p', null, echapper(c.detail)));
  if (c.exo) node.appendChild(el('p', 'exo', `<strong>Exercice :</strong> ${echapper(c.exo)}`));
  return node;
}

function rendreSynthese(a) {
  const vue = $('#vue-synthese');
  vue.innerHTML = '';

  if (!a.frappes.length) {
    vue.appendChild(el('p', 'erreur',
      "Aucune frappe n'a été détectée sur cette séquence. Vérifie que le joueur est entier dans le cadre, " +
      "que la caméra est fixe, et augmente la durée analysée ou le nombre d'images par seconde."));
    a.constats.forEach((c) => vue.appendChild(carteConstat(c)));
    return;
  }

  const bloc = el('div', 'score-bloc');
  const cercle = el('div', 'score-cercle', `<span>${a.score}</span>`);
  cercle.style.setProperty('--pct', `${a.score}%`);
  bloc.appendChild(cercle);

  const resume = el('div');
  const types = a.groupes.map((g) => `${g.nombre} ${g.libelle.toLowerCase()}`).join(', ');
  resume.appendChild(el('h3', null, `Score technique global : ${a.score}/100`));
  resume.appendChild(el('p', 'note',
    `${a.frappes.length} frappe(s) analysée(s) sur ${a.duree.toFixed(1)} s — ${echapper(types)}. ` +
    `Joueur ${a.mainDominante === 'D' ? 'droitier' : 'gaucher'}. ` +
    `Posture détectée sur ${Math.round(a.tauxDetection * 100)} % des images.`));
  bloc.appendChild(resume);
  vue.appendChild(bloc);

  const sections = [
    ['priorite', 'À corriger en priorité'],
    ['corriger', 'À travailler'],
    ['bon', 'Ce qui fonctionne'],
    ['info', 'Informations'],
  ];
  for (const [niveau, titre] of sections) {
    const liste = a.constats.filter((c) => c.niveau === niveau);
    if (!liste.length) continue;
    vue.appendChild(el('h3', null, echapper(titre)));
    liste.forEach((c) => vue.appendChild(carteConstat(c)));
  }

  vue.appendChild(el('p', 'note',
    "Rappel : ces mesures sont estimées à partir d'une détection de posture 2D. Elles repèrent bien " +
    "les tendances (rotation, équilibre, amplitude) mais ne remplacent pas l'œil d'un entraîneur, " +
    "notamment sur la prise de raquette et l'effet donné à la balle."));
}

function rendreCoups(a) {
  const vue = $('#vue-coups');
  vue.innerHTML = '';
  if (!a.frappes.length) {
    vue.appendChild(el('p', 'note', 'Aucune frappe détectée.'));
    return;
  }

  const grille = el('div', 'coups-grille');
  a.frappes.forEach((f, i) => {
    const frame = etat.echantillon.frames[f.indice];
    const carte = el('div', 'coup-carte');

    const cv = el('canvas');
    cv.width = 480;
    cv.height = Math.round(480 * (etat.echantillon.hauteur / etat.echantillon.largeur || 0.5625));
    const ctx = cv.getContext('2d');
    const dessiner = () => {
      if (frame.pts) dessinerSquelette(ctx, frame.pts, cv.width, cv.height, { epaisseur: 2.5 });
    };
    if (frame.vignette) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, cv.width, cv.height); dessiner(); };
      img.onerror = dessiner;
      img.src = frame.vignette;
    } else {
      ctx.fillStyle = '#11151c';
      ctx.fillRect(0, 0, cv.width, cv.height);
      dessiner();
    }
    carte.appendChild(cv);

    const num = (v, d = 2, u = '') => (Number.isFinite(v) ? v.toFixed(d) + u : '—');
    const infos = el('div', 'infos');
    infos.appendChild(el('h4', null, `${i + 1}. ${echapper(LIBELLES_COUP[f.type] || f.type)} — ${f.t.toFixed(1)} s`));
    infos.appendChild(el('dl', null, `
      <dt>Hauteur d'impact</dt><dd>${num(f.hauteurImpact)}</dd>
      <dt>Coude à l'impact</dt><dd>${num(f.coudeImpact, 0, '°')}</dd>
      <dt>Rotation d'épaules</dt><dd>${num(f.rotationEpaules)}</dd>
      <dt>Genou fléchi</dt><dd>${num(f.flexionGenou, 0, '°')}</dd>
      <dt>Accompagnement</dt><dd>${num(f.accompagnement, 1)}</dd>
      <dt>Vitesse poignet</dt><dd>${num(f.vitesse, 1)}</dd>
    `));
    carte.appendChild(infos);

    carte.style.cursor = 'pointer';
    carte.title = 'Cliquer pour placer la vidéo sur cet instant';
    carte.addEventListener('click', () => {
      video.currentTime = f.t;
      video.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    grille.appendChild(carte);
  });
  vue.appendChild(grille);
}

function rendreMesures(a) {
  const vue = $('#vue-mesures');
  vue.innerHTML = '';

  const lignes = [
    ['Hauteur d\'impact (0 = hanche, 1 = épaule)', 'hauteurImpact', 2],
    ['Angle du coude à l\'impact (°)', 'coudeImpact', 0],
    ['Indice de rotation d\'épaules (bas = mieux)', 'rotationEpaules', 2],
    ['Genou le plus fléchi à l\'armé (°)', 'flexionGenou', 0],
    ['Accompagnement (largeurs d\'épaules)', 'accompagnement', 1],
    ['Déplacement de la tête à l\'impact', 'deplacementTete', 2],
    ['Déplacement du bassin à l\'impact', 'deplacementBassin', 2],
    ['Vitesse de poignet au pic (l.é./s)', 'vitesse', 1],
  ];

  if (!a.groupes.length) {
    vue.appendChild(el('p', 'note', 'Pas de mesure disponible.'));
    return;
  }

  const t = el('table');
  t.innerHTML = `<thead><tr><th>Mesure (médiane)</th>${
    a.groupes.map((g) => `<th class="num">${echapper(g.libelle)} (${g.nombre})</th>`).join('')
  }</tr></thead><tbody>${
    lignes.map(([lbl, cle, dec]) => `<tr><td>${echapper(lbl)}</td>${
      a.groupes.map((g) => {
        const v = g.medianes[cle];
        return `<td class="num">${Number.isFinite(v) ? v.toFixed(dec) : '—'}</td>`;
      }).join('')
    }</tr>`).join('')
  }</tbody>`;
  vue.appendChild(t);

  vue.appendChild(el('p', 'note',
    "Les distances sont exprimées en largeurs d'épaules pour rester comparables d'une vidéo à l'autre, " +
    "quelle que soit la distance de la caméra. L'indice de rotation compare la largeur d'épaules à l'armé " +
    "et de face : plus il est bas, plus le buste est de profil."));
}

function rendreFondamentaux(cible) {
  cible.innerHTML = '';
  for (const f of FONDAMENTAUX) {
    const d = el('details', 'fond');
    d.innerHTML = `
      <summary>${echapper(f.titre)}</summary>
      <p class="note">${echapper(f.resume)}</p>
      <strong>Points clés</strong>
      <ul>${f.points.map((p) => `<li>${echapper(p)}</li>`).join('')}</ul>
      <strong>Erreurs fréquentes</strong>
      <ul>${f.erreurs.map((p) => `<li>${echapper(p)}</li>`).join('')}</ul>`;
    cible.appendChild(d);
  }
  cible.appendChild(el('h3', null, 'Pour aller plus loin'));
  cible.appendChild(el('ul', null,
    RESSOURCES.map((r) => `<li><a href="${echapper(r.url)}" target="_blank" rel="noopener">${echapper(r.titre)}</a></li>`).join('')));
}

/* ------------------------------------------------------------------ */
/* Onglets                                                             */
/* ------------------------------------------------------------------ */

document.querySelectorAll('.onglet').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.onglet').forEach((b) => b.classList.remove('actif'));
    btn.classList.add('actif');
    document.querySelectorAll('.vue').forEach((v) => { v.hidden = true; });
    $(`#vue-${btn.dataset.vue}`).hidden = false;
  });
});

/* ------------------------------------------------------------------ */
/* Analyse IA                                                          */
/* ------------------------------------------------------------------ */

const CLE_STOCKAGE = 'dial-tennis-cle-api';
const champCle = $('#ia-cle');
const caseMemoriser = $('#ia-memoriser');

const cleEnregistree = localStorage.getItem(CLE_STOCKAGE);
if (cleEnregistree) { champCle.value = cleEnregistree; caseMemoriser.checked = true; }
caseMemoriser.addEventListener('change', () => {
  if (caseMemoriser.checked && champCle.value) localStorage.setItem(CLE_STOCKAGE, champCle.value);
  else localStorage.removeItem(CLE_STOCKAGE);
});

/** Sélectionne au plus 8 images clés : impact et accompagnement des frappes principales. */
function imagesClefs(a, max = 8) {
  const frames = etat.echantillon.frames;
  const choisies = [];
  const parType = new Map();
  for (const f of a.frappes) {
    const liste = parType.get(f.type) || [];
    liste.push(f);
    parType.set(f.type, liste);
  }
  // Deux frappes par type au maximum, en privilégiant les plus rapides
  const retenues = [];
  for (const [, liste] of parType) {
    liste.sort((x, y) => y.vitesse - x.vitesse);
    retenues.push(...liste.slice(0, 2));
  }
  retenues.sort((x, y) => x.t - y.t);

  for (const f of retenues) {
    if (choisies.length >= max) break;
    const libelle = LIBELLES_COUP[f.type] || f.type;
    const impact = frames[f.indice];
    if (impact?.vignette) {
      choisies.push({ b64: impact.vignette, legende: `${libelle}, instant d'impact (${f.t.toFixed(1)} s)` });
    }
    const suivi = frames[Math.min(frames.length - 1, f.indice + 4)];
    if (suivi?.vignette && choisies.length < max) {
      choisies.push({ b64: suivi.vignette, legende: `${libelle}, accompagnement (${suivi.t.toFixed(1)} s)` });
    }
  }
  return choisies;
}

/** Rendu Markdown minimal et sûr (le texte est échappé avant tout balisage). */
function markdown(src) {
  const enligne = (s) => echapper(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const out = [];
  let liste = null;
  for (const brute of src.split('\n')) {
    const ligne = brute.trimEnd();
    const puce = ligne.match(/^\s*[-*]\s+(.*)$/);
    const num = ligne.match(/^\s*\d+[.)]\s+(.*)$/);
    const titre = ligne.match(/^(#{1,4})\s+(.*)$/);

    if (puce || num) {
      const balise = puce ? 'ul' : 'ol';
      if (liste !== balise) { if (liste) out.push(`</${liste}>`); out.push(`<${balise}>`); liste = balise; }
      out.push(`<li>${enligne((puce || num)[1])}</li>`);
      continue;
    }
    if (liste) { out.push(`</${liste}>`); liste = null; }

    if (titre) {
      const n = Math.min(4, titre[1].length + 1);
      out.push(`<h${n}>${enligne(titre[2])}</h${n}>`);
    } else if (ligne.trim()) {
      out.push(`<p>${enligne(ligne)}</p>`);
    }
  }
  if (liste) out.push(`</${liste}>`);
  return out.join('\n');
}

$('#btn-ia').addEventListener('click', async () => {
  const btn = $('#btn-ia');
  const statut = $('#ia-statut');
  const err = $('#ia-erreur');
  const sortie = $('#ia-resultat');
  err.hidden = true;
  sortie.innerHTML = '';

  if (!etat.analyse?.frappes.length) {
    err.textContent = "Lance d'abord l'analyse technique de la vidéo.";
    err.hidden = false;
    return;
  }
  const cle = champCle.value.trim();
  if (!cle) {
    err.textContent = 'Renseigne ta clé API Anthropic (console.anthropic.com).';
    err.hidden = false;
    return;
  }
  if (caseMemoriser.checked) localStorage.setItem(CLE_STOCKAGE, cle);

  btn.disabled = true;
  statut.hidden = false;
  statut.textContent = 'Préparation des images clés…';

  try {
    const { texte, sources, conversation } = await analyserAvecClaude({
      apiKey: cle,
      analyse: etat.analyse,
      images: imagesClefs(etat.analyse),
      avecWeb: $('#ia-web').checked,
      onStatut: (m) => { statut.textContent = m; },
    });

    etat.conversation = conversation;
    sortie.innerHTML = markdown(texte);
    if (sources.length) sortie.appendChild(blocSources(sources));

    $('#ia-discussion').hidden = false;
    $('#ia-echanges').innerHTML = '';
    statut.textContent = 'Analyse terminée. Tu peux maintenant poser des questions ci-dessous.';
  } catch (e) {
    const msg = e.message || String(e);
    err.textContent = /Failed to fetch|NetworkError/i.test(msg)
      ? "Appel bloqué par le navigateur ou le réseau. Vérifie ta connexion ; certains bloqueurs empêchent l'appel direct à api.anthropic.com."
      : msg;
    err.hidden = false;
    statut.hidden = true;
  } finally {
    btn.disabled = false;
  }
});

/* ------------------------------------------------------------------ */
/* Discussion de suivi avec l'entraîneur IA                            */
/* ------------------------------------------------------------------ */

function blocSources(sources) {
  const bloc = el('div', 'sources');
  bloc.innerHTML = '<strong>Sources consultées :</strong><ul>' +
    sources.map((s) => `<li><a href="${echapper(s.url)}" target="_blank" rel="noopener">${echapper(s.titre)}</a></li>`).join('') +
    '</ul>';
  return bloc;
}

function ajouterEchange(role, contenuHTML) {
  const bloc = el('div', `echange ${role}`);
  bloc.appendChild(el('div', 'qui', role === 'moi' ? 'Toi' : 'Entraîneur'));
  const corps = el('div', 'texte');
  corps.innerHTML = contenuHTML;
  bloc.appendChild(corps);
  $('#ia-echanges').appendChild(bloc);
  bloc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return bloc;
}

async function envoyerQuestion() {
  const champ = $('#ia-question');
  const btn = $('#btn-ia-question');
  const err = $('#ia-question-erreur');
  const question = champ.value.trim();
  err.hidden = true;

  if (!question) return;
  if (!etat.conversation) {
    err.textContent = "Lance d'abord l'analyse IA au-dessus.";
    err.hidden = false;
    return;
  }

  champ.value = '';
  btn.disabled = true;
  champ.disabled = true;
  ajouterEchange('moi', echapper(question));
  const attente = ajouterEchange('coach', '<em>réflexion en cours…</em>');

  try {
    const { texte, sources, conversation } = await poserQuestion({
      apiKey: champParCle(),
      conversation: etat.conversation,
      question,
      avecWeb: $('#ia-web').checked,
    });
    etat.conversation = conversation;
    attente.querySelector('.texte').innerHTML = markdown(texte);
    if (sources.length) attente.appendChild(blocSources(sources));
  } catch (e) {
    attente.remove();
    err.textContent = e.message || String(e);
    err.hidden = false;
    champ.value = question;   // on rend la question pour qu'elle ne soit pas perdue
  } finally {
    btn.disabled = false;
    champ.disabled = false;
    champ.focus();
  }
}

const champParCle = () => champCle.value.trim();

$('#btn-ia-question').addEventListener('click', envoyerQuestion);
$('#ia-question').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); envoyerQuestion(); }
});

/* ------------------------------------------------------------------ */
/* Démarrage                                                           */
/* ------------------------------------------------------------------ */

rendreFondamentaux($('#biblio'));
