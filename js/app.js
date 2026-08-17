/**
 * Orchestration de l'interface.
 */

import { echantillonner, SQUELETTE } from './pose.js';
import {
  analyser, analyserResultats, verdictsFrappe, mesuresJugeables, seuilPour, LIBELLES_COUP,
} from './analyse.js';
import {
  FONDAMENTAUX, RESSOURCES, RESULTATS_BALLE, PRISES,
  EXPLICATIONS, CHAINES_VIDEO, videoYouTube, videoConstat, libelleZone,
} from './knowledge.js';
import { analyserAvecClaude, poserQuestion } from './ai.js';
import {
  enregistrer, lireHistorique, supprimer, toutEffacer, coupsPresents,
  serie, tracerCourbe, commenterEvolution, MESURES_SUIVIES,
  lireAnalyse, estRouvrable, actualiserResultats,
} from './historique.js';

/**
 * Le nom de l'app, à un seul endroit : le changer ici suffit — il est réinjecté
 * dans le titre de la page, l'en-tête et le nom du fichier de rapport.
 * (Les clés de stockage gardent leur ancien nom pour ne pas perdre l'historique.)
 */
const NOM_APP = 'Cadence';

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
  idHistorique: null,   // entrée d'historique correspondant à l'analyse affichée
  conversation: null,   // mémoire de l'échange avec l'entraîneur IA
};

/** Ce que le joueur a renseigné sur lui et sur la vidéo. */
function lireProfil() {
  return {
    main: $('#opt-main').value,
    coup: $('#opt-coup').value,
    revers: $('#opt-revers').value,
    prise: $('#opt-prise').value,
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
  $('#etape-resultats').hidden = false;
  majOnglets(false);
  ouvrirOnglet('fondamentaux');
  fileInput.value = '';
  etat.echantillon = null;
  etat.analyse = null;
  etat.idHistorique = null;
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

const ARTICULATIONS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

/**
 * Le squelette est tracé deux fois : un contour sombre en dessous, puis le trait
 * clair par-dessus. Ainsi il reste lisible sur un fond de court clair comme sur
 * un mur sombre, sans dépendre du thème de la page.
 */
function dessinerSquelette(ctx, pts, w, h, { epaisseur = 3, couleur = '#d8f24a' } = {}) {
  const passe = (largeur, teinte, rayon) => {
    ctx.lineWidth = largeur;
    ctx.strokeStyle = teinte;
    ctx.fillStyle = teinte;
    ctx.lineCap = 'round';
    for (const [a, b] of SQUELETTE) {
      const pa = pts[a], pb = pts[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * w, pa.y * h);
      ctx.lineTo(pb.x * w, pb.y * h);
      ctx.stroke();
    }
    for (const i of ARTICULATIONS) {
      const p = pts[i];
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, rayon, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  passe(epaisseur + 2.5, 'rgba(10, 22, 18, 0.55)', epaisseur + 1.8);
  passe(epaisseur, couleur, epaisseur + 0.5);
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

    // alimente le suivi dans le temps, avec le déroulé du geste pour pouvoir le rejouer
    etat.idHistorique = enregistrer(etat.analyse, echantillon)?.id || null;
    $('#ia-echanges').innerHTML = '';
    $('#ia-resultat').innerHTML = '';
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
  ouvrirSectionResultats(a.sansImages
    ? `Analyse du ${dateLongue(a.date)}`
    : '2. Résultats');
  majOnglets(true);
  ouvrirOnglet('synthese');
  rendreSynthese(a);
  rendreCoups(a);
  rendreMesures(a);
  rendreProgression();
  rendreFondamentaux($('#vue-fondamentaux'));
  rendreSuggestions();
  document.querySelectorAll('.menu-item').forEach((b) => b.classList.remove('actif'));
  $('#etape-resultats').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Recharge une analyse enregistrée et la réaffiche comme si elle venait d'être faite. */
function rouvrirAnalyse(id) {
  const a = lireAnalyse(id);
  if (!a) return;
  etat.analyse = a;
  etat.idHistorique = id;
  etat.echantillon = a.echantillon;   // squelettes rejouables ; les images, elles, ne sont pas gardées
  etat.conversation = null;     // nouvelle séance : on repart d'une discussion vierge
  $('#ia-echanges').innerHTML = '';
  $('#ia-resultat').innerHTML = '';
  afficherResultats(a);
}

/**
 * Lien vers une recherche YouTube. On ne pointe pas une vidéo précise : les URLs de vidéos
 * meurent, une recherche non — et elle remonte ce qui se fait de mieux au moment du clic.
 */
function lienVideo(requete, texte = 'Voir des vidéos') {
  const a = el('a', 'lien-yt', `▶ ${echapper(texte)}`);
  a.href = videoYouTube(requete);
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function carteConstat(c) {
  const classes = { bon: 'bon', corriger: 'corriger', priorite: 'priorite', info: '' };
  const node = el('div', `constat ${classes[c.niveau] ?? ''}`);
  const badge = c.coup ? `<span class="badge">${echapper(c.coup)}</span>` : '';
  node.appendChild(el('h4', null, `${echapper(c.titre)}${badge}`));
  node.appendChild(el('p', null, echapper(c.detail)));
  if (c.exo) node.appendChild(el('p', 'exo', `<strong>Exercice :</strong> ${echapper(c.exo)}`));
  // Un défaut nommé se corrige mieux en le voyant faire — mais seulement si une recherche
  // vidéo pertinente existe pour lui : mieux vaut pas de lien qu'un lien hors sujet.
  const v = videoConstat(c.titre);
  if (v) node.appendChild(lienVideo(v.requete, 'Voir des vidéos sur ce point'));
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

  // Export : de quoi montrer le rapport à un entraîneur, qui reste le meilleur juge
  const actions = el('div', 'actions export');
  const btnFichier = el('button', 'ghost', 'Télécharger le rapport');
  const btnCopier = el('button', 'ghost', 'Copier le rapport');
  btnFichier.type = btnCopier.type = 'button';
  btnFichier.addEventListener('click', () => exporterRapport(a));
  btnCopier.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(rapportTexte(a));
      btnCopier.textContent = 'Copié ✓';
      setTimeout(() => { btnCopier.textContent = 'Copier le rapport'; }, 2500);
    } catch {
      btnCopier.textContent = 'Copie refusée par le navigateur';
    }
  });
  actions.append(btnFichier, btnCopier);
  vue.appendChild(actions);
  vue.appendChild(el('p', 'note',
    "À montrer à ton entraîneur : c'est lui qui peut confirmer ou corriger ce diagnostic, " +
    "notamment sur ce que l'app ne voit pas (prise de raquette, effet, trajectoire de balle)."));

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

/** Dessine une image échantillonnée avec son squelette sur un canvas. */
/**
 * Dessine une image de la séquence. Avec la photo quand on l'a, sinon le squelette seul
 * sur fond clair — c'est le cas d'une analyse rouverte, où seul le geste a été conservé.
 */
function peindreFrame(cv, frame) {
  const ctx = cv.getContext('2d');
  const squelette = (couleur) => {
    if (frame?.pts) dessinerSquelette(ctx, frame.pts, cv.width, cv.height, { epaisseur: 2.5, couleur });
  };
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (frame?.vignette) {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, cv.width, cv.height); squelette(); };
    img.onerror = () => squelette();
    img.src = frame.vignette;
  } else {
    ctx.fillStyle = '#e9ede9';   // même gris que les surfaces creuses du thème clair
    ctx.fillRect(0, 0, cv.width, cv.height);
    squelette('#0f6b52');        // sur fond clair, le vert de marque se lit mieux que le jaune
  }
}

function rendreCoups(a) {
  const vue = $('#vue-coups');
  vue.innerHTML = '';
  if (!a.frappes.length) {
    vue.appendChild(el('p', 'note', 'Aucune frappe détectée.'));
    return;
  }

  const intro = el('div', 'coups-intro');
  intro.innerHTML = a.sansImages
    ? (etat.echantillon
      ? `<p>Analyse rouverte depuis ton historique. Le <strong>déroulé du geste</strong> est rejouable
         image par image avec les flèches — c'est le squelette qui a été enregistré, pas la vidéo :
         elle n'a jamais quitté ton téléphone.</p>`
      : `<p>Analyse rouverte depuis ton historique. Les mesures et les verdicts sont là, mais le
         déroulé du geste n'a pas été gardé pour cette séance : seules les huit analyses les plus
         récentes le conservent.</p>`)
    : `<p>Frappe par frappe : ce qui va, ce qui ne va pas, et pourquoi. Tu peux
       <strong>avancer image par image</strong> autour de l'impact avec les flèches, et
       <strong>dire où la balle est partie</strong>.</p>
       <p class="note">Dès que quatre frappes sont renseignées, dont deux réussies, je peux comparer
       tes réussites à tes fautes et te dire ce qui change concrètement dans ton geste.</p>`;
  vue.appendChild(intro);

  const barre = el('div', 'actions');
  const btnComparer = el('button', 'primary', 'Comparer mes réussites et mes fautes');
  btnComparer.type = 'button';
  barre.appendChild(btnComparer);
  vue.appendChild(barre);

  const zoneComparaison = el('div', 'comparaison');
  vue.appendChild(zoneComparaison);

  btnComparer.addEventListener('click', () => {
    zoneComparaison.innerHTML = '';
    const { constats, notees, suffisant } = analyserResultats(a.frappes);
    if (!suffisant && !constats.length) {
      zoneComparaison.appendChild(el('p', 'note',
        `Seulement ${notees} frappe(s) renseignée(s). Indique le devenir d'au moins quatre balles, ` +
        `dont deux bonnes, pour que la comparaison ait un sens.`));
      return;
    }
    zoneComparaison.appendChild(el('h3', null, 'Ce que disent tes balles'));
    constats.forEach((c) => zoneComparaison.appendChild(carteConstat(c)));
    zoneComparaison.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  const grille = el('div', 'coups-grille');
  const frames = etat.echantillon?.frames || null;

  a.frappes.forEach((f, i) => {
    const carte = el('div', 'coup-carte');
    if (f.resultat) carte.classList.add('notee');

    if (frames && Number.isFinite(f.indice)) {
      const cv = el('canvas');
      cv.width = 480;
      cv.height = Math.round(480 * (etat.echantillon.hauteur / etat.echantillon.largeur || 0.5625));
      carte.appendChild(cv);

      // Défilement image par image autour de l'impact
      let indice = f.indice;
      const nav = el('div', 'nav-images');
      const prec = el('button', 'ghost', '◀');
      const suiv = el('button', 'ghost', '▶');
      const repere = el('span', 'repere');
      prec.type = suiv.type = 'button';
      prec.title = 'Image précédente'; suiv.title = 'Image suivante';

      const rafraichir = () => {
        indice = Math.max(0, Math.min(frames.length - 1, indice));
        peindreFrame(cv, frames[indice]);
        const dt = frames[indice].t - f.t;
        repere.textContent = Math.abs(dt) < 0.001
          ? 'impact'
          : `impact ${dt > 0 ? '+' : '−'}${Math.abs(dt).toFixed(2)} s`;
        repere.classList.toggle('sur-impact', Math.abs(dt) < 0.001);
        prec.disabled = indice === 0;
        suiv.disabled = indice === frames.length - 1;
      };
      prec.addEventListener('click', () => { indice--; rafraichir(); });
      suiv.addEventListener('click', () => { indice++; rafraichir(); });
      nav.append(prec, repere, suiv);
      carte.appendChild(nav);
      rafraichir();
    }

    const infos = el('div', 'infos');
    infos.appendChild(el('h4', null, `${i + 1}. ${echapper(LIBELLES_COUP[f.type] || f.type)} — ${f.t.toFixed(1)} s`));

    // Le cœur de la carte : chaque mesure jugée, avec la raison en clair
    const verdicts = verdictsFrappe(f);
    const bilan = verdicts.filter((v) => v.niveau !== 'bon');
    infos.appendChild(el('p', 'bilan-frappe', bilan.length
      ? `<strong>${bilan.length}</strong> point${bilan.length > 1 ? 's' : ''} à corriger sur cette frappe`
      : '<strong>Rien à redire</strong> sur cette frappe'));

    const liste = el('ul', 'verdicts');
    for (const v of verdicts) {
      const cls = v.niveau === 'bon' ? 'ok' : v.niveau === 'moyen' ? 'moyen' : 'ko';
      const item = el('li', `verdict ${cls}`);
      item.innerHTML =
        `<span class="marque" aria-hidden="true">${v.niveau === 'bon' ? '✓' : '!'}</span>` +
        `<span class="v-corps"><span class="v-titre">${echapper(v.libelle)}` +
        `<span class="v-valeur">${echapper(v.texte)}</span></span>` +
        `<span class="v-message">${echapper(v.message)}</span>` +
        `<span class="v-zone">zone à viser : ${echapper(v.zone)}</span>` +
        `</span>`;
      liste.appendChild(item);
    }
    infos.appendChild(liste);

    if (Number.isFinite(f.vitesse)) {
      infos.appendChild(el('p', 'note',
        `Vitesse de la main : ${f.vitesse.toFixed(1)} — à comparer aux autres frappes, ` +
        `une valeur nettement plus basse trahit une frappe subie.`));
    }

    const choix = el('label', 'resultat', 'Cette balle est partie…');
    const select = el('select');
    select.innerHTML = RESULTATS_BALLE
      .map((r) => `<option value="${r.code}">${echapper(r.libelle)}</option>`).join('');
    select.value = f.resultat || '';
    select.addEventListener('change', () => {
      f.resultat = select.value;
      carte.classList.toggle('notee', !!select.value);
      if (etat.idHistorique) actualiserResultats(etat.idHistorique, a.frappes);
    });
    choix.appendChild(select);
    infos.appendChild(choix);

    if (frames && Number.isFinite(f.indice) && !a.sansImages) {
      const voir = el('button', 'ghost lien-video', 'Voir dans la vidéo');
      voir.type = 'button';
      voir.addEventListener('click', () => {
        video.currentTime = f.t;
        video.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      infos.appendChild(voir);
    }

    carte.appendChild(infos);
    grille.appendChild(carte);
  });

  vue.appendChild(grille);
  vue.appendChild(el('p', 'note',
    "Le détail de chaque mesure — ce qu'elle veut dire et comment la corriger — est dans l'onglet « Mesures »."));
}

/**
 * Petite jauge : la zone à viser en fond, ta valeur par-dessus.
 * Un chiffre seul ne dit pas s'il est bon ; une position sur une règle, si.
 */
function jauge(valeur, seuil, decimales, unite) {
  const [i0, i1] = seuil.ideal;
  const [a0, a1] = seuil.acceptable;
  const min = Math.min(a0, valeur, i0);
  const max = Math.max(a1, valeur, i1);
  const etendue = (max - min) || 1;
  const marge = etendue * 0.08;
  const bas = min - marge;
  const haut = max + marge;
  const pos = (v) => ((v - bas) / (haut - bas)) * 100;

  const dedans = valeur >= i0 && valeur <= i1;
  const bloc = el('div', `jauge ${dedans ? 'ok' : 'ko'}`);
  bloc.innerHTML =
    `<div class="piste">` +
    `<div class="zone" style="left:${pos(i0).toFixed(1)}%;width:${(pos(i1) - pos(i0)).toFixed(1)}%"></div>` +
    `<div class="curseur" style="left:${pos(valeur).toFixed(1)}%"></div>` +
    `</div>` +
    `<div class="jauge-legende"><span>${echapper(i0 + unite)}</span>` +
    `<span class="jauge-toi">toi : ${echapper(valeur.toFixed(decimales) + unite)}</span>` +
    `<span>${echapper(i1 + unite)}</span></div>`;
  return bloc;
}

function rendreMesures(a) {
  const vue = $('#vue-mesures');
  vue.innerHTML = '';

  if (!a.groupes.length) {
    vue.appendChild(el('p', 'note', 'Pas de mesure disponible.'));
    return;
  }

  vue.appendChild(el('p', null,
    "Chaque mesure est expliquée : ce qu'elle regarde, pourquoi ça compte pour ton tennis, " +
    "et quoi faire si tu es hors de la zone. La valeur affichée est la médiane de tes frappes."));
  vue.appendChild(el('p', 'note',
    "La « zone » est la fourchette dans laquelle se situent les joueurs qui exécutent bien ce coup " +
    "(repères de coaching ITF / FFT / USTA, du joueur de club au joueur confirmé). Y être ne veut pas " +
    "dire que c'est parfait, en sortir ne veut pas dire que c'est raté : c'est un repère, pas une note. " +
    "Elle est indiquée sur chaque mesure ; touche une mesure pour voir le détail."));

  for (const g of a.groupes) {
    vue.appendChild(el('h3', null, `${echapper(g.libelle)} — ${g.nombre} frappe(s)`));

    const jugeables = mesuresJugeables(g.type);
    for (const def of EXPLICATIONS) {
      const valeur = g.medianes[def.cle];
      if (!Number.isFinite(valeur)) continue;
      if (def.seuil && !jugeables.includes(def.cle)) continue;   // sans objet pour ce coup

      const seuil = def.seuil ? seuilPour(def.cle, g.type) : null;
      const dedans = seuil ? valeur >= seuil.ideal[0] && valeur <= seuil.ideal[1] : null;

      const carte = el('details', `mesure ${dedans === null ? '' : dedans ? 'ok' : 'ko'}`);
      const etat_ = dedans === null ? 'repère' : dedans ? 'dans la zone' : 'hors zone';
      // Sans seuil (la vitesse), annoncer une « zone à viser » n'aurait pas de sens.
      const fourchette = seuil
        ? `zone à viser : ${libelleZone(seuil, def.unite)}`
        : 'pas de zone : ce chiffre sert à comparer tes frappes entre elles';
      carte.innerHTML = `<summary>
        <span class="m-ligne">
          <span class="m-nom">${echapper(def.libelle)}</span>
          <span class="m-valeur">${echapper(valeur.toFixed(def.decimales) + def.unite)}</span>
        </span>
        <span class="m-ligne m-bas">
          <span class="m-etat">${echapper(etat_)}</span>
          <span class="m-zone">${echapper(fourchette)}</span>
        </span>
      </summary>`;

      if (seuil) carte.appendChild(jauge(valeur, seuil, def.decimales, def.unite));

      const corps = el('div', 'm-corps');
      corps.innerHTML =
        `<p><strong>Ce que ça mesure.</strong> ${echapper(def.quoi)}</p>` +
        `<p class="note">Échelle : ${echapper(def.echelle)}.</p>` +
        `<p><strong>Pourquoi ça compte.</strong> ${echapper(def.pourquoi)}</p>`;

      if (seuil && !dedans) {
        const sens = valeur < seuil.ideal[0] ? 'tropBas' : 'tropHaut';
        corps.innerHTML += `<p class="m-diagnostic"><strong>Chez toi.</strong> ${echapper(def[sens])}</p>`;
      } else if (seuil) {
        corps.innerHTML += `<p class="m-diagnostic ok"><strong>Chez toi.</strong> Tu es dans la zone visée ` +
          `(${echapper(libelleZone(seuil, def.unite))}). Rien à changer ici.</p>`;
      }
      if (def.exercice) corps.innerHTML += `<p class="exo"><strong>Exercice :</strong> ${echapper(def.exercice)}</p>`;
      corps.appendChild(lienVideo(def.requeteVideo, 'Voir des vidéos sur ce point'));
      carte.appendChild(corps);
      vue.appendChild(carte);
    }
  }

  // Le tableau brut reste accessible pour qui veut tout voir d'un coup d'œil
  const tout = el('details', 'brut');
  tout.innerHTML = '<summary>Voir tous les chiffres dans un tableau</summary>';
  const t = el('table');
  t.innerHTML = `<thead><tr><th>Mesure (médiane)</th>${
    a.groupes.map((g) => `<th class="num">${echapper(g.libelle)} (${g.nombre})</th>`).join('')
  }</tr></thead><tbody>${
    EXPLICATIONS.map((def) => `<tr><td>${echapper(def.libelle)}</td>${
      a.groupes.map((g) => {
        const v = g.medianes[def.cle];
        return `<td class="num">${Number.isFinite(v) ? v.toFixed(def.decimales) + def.unite : '—'}</td>`;
      }).join('')
    }</tr>`).join('')
  }</tbody>`;
  const cadreMesures = el('div', 'table-scroll');
  cadreMesures.appendChild(t);
  tout.appendChild(cadreMesures);
  tout.appendChild(el('p', 'note',
    "Les distances sont exprimées en largeurs d'épaules pour rester comparables d'une vidéo à l'autre, " +
    "quelle que soit la distance de la caméra."));
  vue.appendChild(tout);
}

/* ------------------------------------------------------------------ */
/* Progression dans le temps                                           */
/* ------------------------------------------------------------------ */

const dateLongue = (iso) => new Date(iso).toLocaleDateString('fr-FR',
  { day: 'numeric', month: 'long', year: 'numeric' });
const dateCompacte = (iso) => new Date(iso).toLocaleDateString('fr-FR',
  { day: '2-digit', month: '2-digit', year: '2-digit' });

function rendreProgression() {
  const vue = $('#vue-progression');
  vue.innerHTML = '';
  const liste = lireHistorique();

  if (!liste.length) {
    vue.appendChild(el('p', 'note',
      "Aucune analyse enregistrée pour l'instant. Chaque analyse que tu lances est ajoutée ici " +
      "automatiquement, et reste sur cet appareil."));
    return;
  }

  vue.appendChild(el('p', 'note',
    `${liste.length} analyse(s) enregistrée(s) sur cet appareil. ` +
    `Rien n'est envoyé sur internet : si tu changes de téléphone ou vides ton navigateur, l'historique part avec.`));

  if (liste.length < 2) {
    vue.appendChild(el('p', null,
      "Il faut au moins deux analyses pour tracer une évolution. Refilme-toi dans quelques jours " +
      "et reviens ici : tu verras si ce que tu travailles bouge vraiment."));
  } else {
    const coups = coupsPresents(liste);
    const controles = el('div', 'options');

    const selMesure = el('select');
    selMesure.innerHTML = MESURES_SUIVIES
      .map((m) => `<option value="${m.cle}">${echapper(m.libelle)}</option>`).join('');
    const lblMesure = el('label', null, 'Quelle mesure suivre');
    lblMesure.appendChild(selMesure);

    const selCoup = el('select');
    selCoup.innerHTML = coups
      .map((c) => `<option value="${echapper(c.type)}">${echapper(c.libelle)}</option>`).join('');
    const lblCoup = el('label', null, 'Sur quel coup');
    lblCoup.appendChild(selCoup);

    controles.append(lblMesure, lblCoup);
    vue.appendChild(controles);

    const zone = el('div', 'zone-courbe');
    vue.appendChild(zone);

    const dessiner = () => {
      zone.innerHTML = '';
      const mesure = selMesure.value;
      const def = MESURES_SUIVIES.find((m) => m.cle === mesure);
      selCoup.parentElement.hidden = !!def.global;

      const points = serie(mesure, selCoup.value, liste);
      if (points.length < 2) {
        zone.appendChild(el('p', 'note',
          "Pas encore deux analyses comportant cette mesure pour ce coup."));
        return;
      }
      zone.appendChild(el('h3', null, echapper(def.libelle)));
      const svg = tracerCourbe(points, mesure);
      if (svg) zone.insertAdjacentHTML('beforeend', svg);
      const lecture = commenterEvolution(points, mesure);
      if (lecture) zone.appendChild(el('p', 'lecture-courbe', echapper(lecture)));
    };
    selMesure.addEventListener('change', dessiner);
    selCoup.addEventListener('change', dessiner);
    dessiner();
  }

  // Liste des séances : c'est d'ici qu'on rouvre une analyse passée, ou qu'on l'efface
  vue.appendChild(el('h3', null, 'Tes analyses'));
  const journal = el('div', 'journal');

  for (const e of [...liste].reverse()) {
    const carte = el('div', 'seance');
    if (etat.idHistorique === e.id) carte.classList.add('ouverte');

    const coups = (e.groupes || []).map((g) => `${g.libelle} ×${g.nombre}`).join(', ') || '—';
    carte.appendChild(el('div', 'seance-tete',
      `<span class="s-date">${echapper(dateLongue(e.date))}</span>` +
      `<span class="s-score">${e.score ?? '—'}<small>/100</small></span>`));
    carte.appendChild(el('p', 'note',
      `${echapper(coups)} — ${e.nbFrappes} frappe(s) sur ${Number(e.duree || 0).toFixed(0)} s` +
      (e.profil?.objectif ? ` · objectif : « ${echapper(e.profil.objectif)} »` : '')));

    const actions = el('div', 'actions');
    if (estRouvrable(e)) {
      const ouvrir = el('button', 'primary mini', 'Ouvrir cette analyse');
      ouvrir.type = 'button';
      ouvrir.addEventListener('click', () => rouvrirAnalyse(e.id));
      actions.appendChild(ouvrir);
    } else {
      actions.appendChild(el('span', 'note', 'Analyse ancienne : seuls les chiffres du suivi ont été gardés.'));
    }
    const suppr = el('button', 'ghost mini', 'Supprimer');
    suppr.type = 'button';
    suppr.addEventListener('click', () => {
      if (!confirm('Supprimer cette analyse ?')) return;
      supprimer(e.id);
      if (etat.idHistorique === e.id) { etat.idHistorique = null; etat.analyse = null; majOnglets(false); }
      rendreProgression();
    });
    actions.appendChild(suppr);
    carte.appendChild(actions);
    journal.appendChild(carte);
  }
  vue.appendChild(journal);

  const effacer = el('button', 'ghost', 'Effacer tout mon historique');
  effacer.type = 'button';
  effacer.addEventListener('click', () => {
    if (confirm('Effacer définitivement toutes tes analyses enregistrées sur cet appareil ?')) {
      toutEffacer();
      rendreProgression();
    }
  });
  vue.appendChild(effacer);
}

/* ------------------------------------------------------------------ */
/* Export du rapport                                                   */
/* ------------------------------------------------------------------ */

function rapportTexte(a) {
  const lignes = [
    `${NOM_APP.toUpperCase()} — RAPPORT D'ANALYSE`,
    dateLongue(new Date().toISOString()),
    '',
    `Joueur : ${a.profil?.main === 'left' ? 'gaucher' : a.profil?.main === 'right' ? 'droitier' : 'main devinée'}` +
      `, revers ${a.profil?.revers === 'une' ? 'à une main' : 'à deux mains'}`,
    `Séquence : ${a.duree.toFixed(1)} s, ${a.frappes.length} frappe(s), posture détectée sur ${Math.round(a.tauxDetection * 100)} % des images`,
    a.profil?.objectif ? `Objectif du joueur : ${a.profil.objectif}` : null,
    `Score technique global : ${a.score}/100`,
    '',
    'MESURES MÉDIANES',
    ...a.groupes.map((g) => {
      const m = g.medianes;
      const n = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : 'n/d');
      return `  ${g.libelle} (${g.nombre} frappe(s)) : impact ${n(m.hauteurImpact)}, ` +
        `coude ${n(m.coudeImpact, 0)}°, rotation ${n(m.rotationEpaules)}, ` +
        `genou ${n(m.flexionGenou, 0)}°, accompagnement ${n(m.accompagnement, 1)}`;
    }),
    '',
    'CONSTATS',
    ...a.constats.map((c) => {
      const etiquette = { priorite: 'PRIORITÉ', corriger: 'À TRAVAILLER', bon: 'POINT FORT', info: 'INFO' };
      return [
        `  [${etiquette[c.niveau] || c.niveau}] ${c.coup} — ${c.titre}`,
        `    ${c.detail}`,
        c.exo ? `    Exercice : ${c.exo}` : null,
      ].filter(Boolean).join('\n');
    }),
    '',
    'Repères de lecture : hauteur d\'impact 0 = hanche, 1 = épaule. Rotation : plus bas = buste',
    'plus tourné. Distances en largeurs d\'épaules. Mesures issues d\'une détection de posture 2D,',
    'à confronter à l\'œil d\'un entraîneur — la raquette et la balle ne sont pas analysées.',
  ];
  return lignes.filter((l) => l !== null).join('\n');
}

function exporterRapport(a) {
  const texte = rapportTexte(a);
  const blob = new Blob([texte], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = `${NOM_APP.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

    if (f.videos?.length) {
      d.appendChild(el('strong', null, 'À regarder en vidéo'));
      const liens = el('div', 'liste-videos');
      for (const v of f.videos) liens.appendChild(lienVideo(v.requete, v.titre));
      d.appendChild(liens);
    }
    cible.appendChild(d);
  }

  cible.appendChild(el('h3', null, 'Des chaînes qui expliquent bien'));
  const chaines = el('ul', 'chaines');
  for (const c of CHAINES_VIDEO) {
    const li = el('li');
    li.appendChild(lienVideo(c.requete, c.nom));
    li.appendChild(el('span', 'note', ` — ${echapper(c.pourquoi)}`));
    chaines.appendChild(li);
  }
  cible.appendChild(chaines);

  cible.appendChild(el('h3', null, 'Pour aller plus loin'));
  cible.appendChild(el('ul', null,
    RESSOURCES.map((r) => `<li><a href="${echapper(r.url)}" target="_blank" rel="noopener">${echapper(r.titre)}</a></li>`).join('')));
}

/* ------------------------------------------------------------------ */
/* Onglets                                                             */
/* ------------------------------------------------------------------ */

/** Onglets qui n'ont de sens qu'une fois une vidéo analysée. */
const ONGLETS_ANALYSE = ['synthese', 'coups', 'mesures', 'ia'];

function ouvrirOnglet(nom) {
  document.querySelectorAll('.onglet').forEach((b) => b.classList.toggle('actif', b.dataset.vue === nom));
  document.querySelectorAll('.vue').forEach((v) => { v.hidden = v.id !== `vue-${nom}`; });
}

/**
 * Tous les onglets restent visibles en permanence : les cacher donnait l'impression
 * que l'app avait perdu des fonctions. Sans analyse chargée, chacun explique à la place
 * ce qu'il faut faire pour le remplir.
 */
function majOnglets(avecAnalyse) {
  document.querySelectorAll('.onglet').forEach((b) => { b.hidden = false; });
  if (avecAnalyse) return;

  for (const nom of ONGLETS_ANALYSE) {
    if (nom === 'ia') continue;   // la discussion reste utilisable sans analyse en cours
    const vue = $(`#vue-${nom}`);
    vue.innerHTML = '';
    vue.appendChild(messageSansAnalyse());
  }
}

/** Invite affichée dans les onglets qui attendent une vidéo ou une analyse rouverte. */
function messageSansAnalyse() {
  const bloc = el('div', 'vide');
  bloc.appendChild(el('p', null,
    "Rien à afficher ici pour l'instant : il faut d'abord analyser une vidéo, " +
    "ou rouvrir une analyse déjà enregistrée."));

  const actions = el('div', 'actions');
  const bVideo = el('button', 'primary', 'Analyser une vidéo');
  bVideo.type = 'button';
  bVideo.addEventListener('click', () => allerA('video'));
  actions.appendChild(bVideo);

  if (lireHistorique().some(estRouvrable)) {
    const bHisto = el('button', 'ghost', 'Rouvrir une analyse');
    bHisto.type = 'button';
    bHisto.addEventListener('click', () => allerA('analyses'));
    actions.appendChild(bHisto);
  }
  bloc.appendChild(actions);
  return bloc;
}

document.querySelectorAll('.onglet').forEach((btn) => {
  btn.addEventListener('click', () => ouvrirOnglet(btn.dataset.vue));
});

/* ------------------------------------------------------------------ */
/* Menu principal                                                      */
/* ------------------------------------------------------------------ */

/** Rend la section résultats visible et lui donne le bon titre. */
function ouvrirSectionResultats(titre) {
  $('#etape-resultats').hidden = false;
  $('#etape-resultats').querySelector('h2').textContent = titre;
}

/**
 * Point d'entrée unique du menu : quelle que soit la destination, on remet l'app
 * dans un état cohérent (bonne section visible, bon onglet ouvert, page positionnée).
 */
function allerA(destination) {
  document.querySelectorAll('.menu-item').forEach((b) => {
    b.classList.toggle('actif', b.dataset.aller === destination);
  });

  const cible = { video: '#etape-import', analyses: '#etape-resultats',
    question: '#etape-resultats', fiches: '#etape-resultats' }[destination];

  if (destination === 'video') {
    $('#etape-import').hidden = false;
  } else {
    ouvrirSectionResultats(etat.analyse ? '2. Résultats' : 'Ton espace');
    ouvrirOnglet({ analyses: 'progression', question: 'ia', fiches: 'fondamentaux' }[destination]);
    if (destination === 'analyses') rendreProgression();
    if (destination === 'fiches') rendreFondamentaux($('#vue-fondamentaux'));
  }
  $(cible)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelectorAll('.menu-item').forEach((btn) => {
  btn.addEventListener('click', () => allerA(btn.dataset.aller));
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

    $('#ia-echanges').innerHTML = '';
    rendreSuggestions();
    statut.textContent = 'Analyse terminée. Tu peux maintenant poser des questions en haut de cet onglet.';
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

/**
 * Questions toutes prêtes : sans elles, la zone de saisie reste vide et le joueur
 * ne sait pas quoi demander. On les construit à partir de ses vrais défauts.
 */
function rendreSuggestions() {
  const zone = $('#ia-suggestions');
  if (!zone) return;
  zone.innerHTML = '';
  const a = etat.analyse;
  if (!a) {
    zone.appendChild(el('p', 'note',
      "L'entraîneur a besoin de tes mesures pour répondre utilement : analyse une vidéo, " +
      "ou rouvre une analyse enregistrée depuis « Mes analyses »."));
    return;
  }

  const idees = [];
  const aCorriger = (a.constats || []).filter((c) => c.niveau === 'priorite' || c.niveau === 'corriger');
  for (const c of aCorriger.slice(0, 2)) {
    idees.push(`Explique-moi simplement « ${c.titre.toLowerCase()} » et comment le corriger.`);
  }
  if (a.profil?.objectif) idees.push(`${a.profil.objectif} — qu'est-ce que je dois changer ?`);
  idees.push('Par quoi je commence si je n\'ai que 20 minutes d\'entraînement ?');
  idees.push('Montre-moi des vidéos qui expliquent mon principal défaut.');

  zone.appendChild(el('p', 'note', 'Ou choisis une question :'));
  for (const q of idees.slice(0, 4)) {
    const puce = el('button', 'puce', echapper(q));
    puce.type = 'button';
    puce.addEventListener('click', () => {
      $('#ia-question').value = q;
      envoyerQuestion();
    });
    zone.appendChild(puce);
  }
}

async function envoyerQuestion() {
  const champ = $('#ia-question');
  const btn = $('#btn-ia-question');
  const err = $('#ia-question-erreur');
  const question = champ.value.trim();
  err.hidden = true;

  if (!question) return;
  if (!champParCle()) {
    err.textContent = "Il manque ta clé API Anthropic : ouvre « Réglages et analyse complète » juste en dessous.";
    err.hidden = false;
    $('.ia-config')?.setAttribute('open', '');
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
      analyse: etat.analyse,
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

// Le nom vient de NOM_APP : le HTML n'en garde qu'une copie de secours.
document.title = `${NOM_APP} — Analyse vidéo de ton jeu`;
$('#nom-app').textContent = NOM_APP;

$('#opt-prise').innerHTML = PRISES
  .map((p) => `<option value="${echapper(p.code)}">${echapper(p.libelle)}</option>`).join('');

rendreFondamentaux($('#vue-fondamentaux'));
rendreProgression();
rendreSuggestions();
majOnglets(false);

// Au démarrage, tous les onglets sont là. On ouvre celui qui a quelque chose à montrer :
// le suivi si des analyses existent, les fiches sinon.
ouvrirSectionResultats('Ton espace');
ouvrirOnglet(lireHistorique().length ? 'progression' : 'fondamentaux');
