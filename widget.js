/* =====================================================================
 * WHAT'S YOUR WATER SCORE?™ FRANCE — Widget Hub'Eau pour Aqua Purify
 * Conforme aux directives Kinetico NA Digital & Water Score Guidelines
 * ===================================================================== */
(function () {
  'use strict';

  // ---------- CONFIG ----------
  var HUBEAU_BASE = 'https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable';
  var GEO_BASE   = 'https://geo.api.gouv.fr/communes';
  var CONTAINER_IDS = ['aqua-water-score', 'aqua-water-score-fr', 'wyws-france-widget'];

  // Palette Kinetico
  var K_DARK_BLUE = '#003594';
  var K_LIGHT_BLUE = '#298FC2';
  var K_MAGENTA = '#E6007E';
  var K_SLATE = '#63666A';
  var K_GRAY = '#727d84';
  
  // Couleurs Water Score Slider (30 à 100) basées sur guidelines
  var WS_COLORS = {
    30: '#F37021', 40: '#FDB913', 50: '#ED145B', 60: '#E6007E',
    70: '#9E1B81', 80: '#662D91', 90: '#298FC2', 100: '#00A9E0'
  };

  // ---------- SEUILS RÉGLEMENTAIRES ----------
  var SEUILS = {
    '1449': { name: "E. coli", unit: "/100mL", limit: 0, type: "L", cat: "microbio", desc: "Bactérie indicatrice" },
    '1421': { name: "Entérocoques", unit: "/100mL", limit: 0, type: "L", cat: "microbio", desc: "Bactéries indicatrices" },
    '1451': { name: "Coliformes totaux", unit: "/100mL", ref: 0, type: "R", cat: "microbio", desc: "Indicateur réseau" },
    '1340': { name: "Nitrates", unit: "mg/L", limit: 50, type: "L", cat: "chimique", desc: "Origine agricole" },
    '1382': { name: "Plomb", unit: "µg/L", limit: 10, type: "L", cat: "metaux", desc: "Canalisations anciennes" },
    '6276': { name: "Somme 20 PFAS", unit: "µg/L", limit: 0.1, type: "L", cat: "emergent", desc: "Polluants éternels" },
    '1295': { name: "Turbidité", unit: "NFU", limit: 1.0, type: "L", cat: "confort", desc: "Aspect trouble" },
    '1345': { name: "Dureté (TH)", unit: "°f", type: "I", cat: "confort", desc: "Calcaire" }
  };
  var CODES_PESTICIDES = ['1506', '1907', '1517', '1140', '1141', '1102', '1108', '5537'];
  var PESTICIDE_REGEX  = /pestic|atrazin|simazin|gluphosi|glyphosa|metolach|chlortolu|deseth|metalax|s-meto/i;

  // ---------- CATALOGUE PRODUITS ----------
  var PRODUITS = {
    'kinetico-q850-od': { name: "Kinetico Q850 OverDrive XP", family: "Adoucisseur", certs: ["WQA","NSF","ACS"], desc: "Adoucisseur bi-réservoir haute capacité." },
    'kinetico-s250-xp': { name: "Kinetico Premier S250 XP", family: "Adoucisseur", certs: ["WQA","NSF","ACS"], desc: "Bi-réservoir OverDrive." },
    'kinetico-k5-ro': { name: "Kinetico K5 Drinking Water Station", family: "Osmose inverse", certs: ["NSF","ACS"], desc: "OI sous évier 5 étages avec VOC Guard." },
    'cab-charbon': { name: "Filtre Charbon Actif", family: "Filtration", certs: ["NSF"], desc: "Cartouche CAB 5 µm." }
  };

  // ---------- STYLES ----------
  var CSS = ''
    + '.aw-wrap{font-family:"Montserrat",sans-serif;color:#63666A;background:#fff;border:1px solid #c8d0e2;border-radius:0px;overflow:hidden;box-shadow:0 12px 40px rgba(0,53,148,.08);max-width:100%;line-height:1.5;box-sizing:border-box}'
    + '.aw-wrap *{box-sizing:border-box}'
    + '.aw-search{padding:24px;border-bottom:1px solid #c8d0e2;background:#f9fbfd;display:flex;flex-direction:column;gap:14px}'
    + '.aw-title{font-size:18px;font-weight:800;color:#003594;margin:0;text-transform:uppercase;}'
    + '.aw-row{display:flex;gap:10px;flex-wrap:wrap}'
    + '.aw-iw{flex:1;min-width:220px;position:relative}'
    + '.aw-input{width:100%;padding:13px 14px;border:1px solid #727d84;font-family:"Montserrat";font-size:15px;background:#fff;color:#63666A;}'
    + '.aw-input:focus{outline:none;border-color:#298FC2;box-shadow:0 0 0 3px rgba(41,143,194,.15)}'
    + '.aw-btn{padding:13px 22px;background:#003594;color:#fff;border:none;font-family:"Montserrat";font-weight:700;font-size:14px;cursor:pointer;transition:background .2s;text-transform:uppercase;letter-spacing:0.05em}'
    + '.aw-btn:hover{background:#298FC2;}'
    + '.aw-btn-mag{background:#E6007E; margin-top: 16px; width: 100%;}'
    + '.aw-btn-mag:hover{background:#c4006b;}'
    + '.aw-body{padding:32px 24px}'
    
    /* Water Score Slider Styles */
    + '.ws-slider-container{margin:32px 0 40px;text-align:center;}'
    + '.ws-score-display{font-size:64px;font-weight:800;line-height:1;margin-bottom:16px;}'
    + '.ws-track{display:flex;height:48px;overflow:hidden;margin-bottom:12px;}'
    + '.ws-block{flex:1;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;border-right:2px solid #fff;transition:opacity 0.3s}'
    + '.ws-block:last-child{border-right:none;}'
    + '.ws-desc{font-size:13px;color:#727d84;font-weight:500;max-width:80%;margin:0 auto;}'
    
    + '.aw-reco{border-left:6px solid #E6007E;padding:20px;background:#f9fbfd;margin-bottom:16px;}'
    + '.aw-rn{font-weight:800;font-size:18px;color:#003594;margin-bottom:4px;text-transform:uppercase}'
    + '.aw-lead{margin-top:32px;padding:24px;background:#003594;color:#fff;}'
    + '.aw-lt{font-weight:800;font-size:22px;margin:0 0 8px;text-transform:uppercase}'
    + '.aw-li{width:100%;padding:12px;margin-bottom:12px;border:none;font-family:"Montserrat";font-size:14px;}'
    + '.aw-sug{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #c8d0e2;z-index:10;display:none}'
    + '.aw-sug.show{display:block}'
    + '.aw-sugi{padding:12px;cursor:pointer;font-size:14px;border-bottom:1px solid #f1f5f9;}'
    + '.aw-sugi:hover{background:#f9fbfd;}'
    + '.aw-load{text-align:center;padding:40px;color:#003594;font-weight:600;}';

  var STATE = { config: null, lastSuggestions: [], el: {} };

  function $(id) { return document.getElementById(id); }

  // ---------- API CLIENT ----------
  function searchCommunes(query) {
    var q = query.trim();
    var param = /^\d{2,5}$/.test(q) ? 'codePostal=' + q : 'nom=' + encodeURIComponent(q) + '&boost=population';
    return fetch(GEO_BASE + '?' + param + '&fields=code,nom,codeDepartement,codePostal&format=json&limit=5')
      .then(function (r) { return r.json(); });
  }

  function fetchAnalyses(codeCommune) {
    return fetch(HUBEAU_BASE + '/resultats_dis?code_commune=' + codeCommune + '&date_min_prelevement=2022-01-01&size=1000&sort=desc')
      .then(function(r) { return r.json(); })
      .then(function(j) { return j.data || []; });
  }

  // ---------- SCORING (30 - 100) ----------
  function aggregate(raw) {
    var microbioNC = 0, microbioCount = 0;
    for (var i = 0; i < raw.length; i++) {
      var code = raw[i].code_parametre;
      if (code === '1449' || code === '1421') {
        microbioCount++;
        if (raw[i].conformite_limites_pc_prelevement === 'N') microbioNC++;
      }
    }
    return { microbioNC: microbioNC };
  }

  function computeScore(agg) {
    // Calcul simplifié pour l'exemple (à lier avec votre algorithme complet)
    var global = 100;
    if (agg.microbioNC > 0) global -= 40; 
    
    // Plancher strict à 30 selon les directives
    global = Math.max(30, global);

    var scoreLevel = Math.round(global / 10) * 10;
    if (scoreLevel < 30) scoreLevel = 30;
    if (scoreLevel > 100) scoreLevel = 100;
    var wsColor = WS_COLORS[scoreLevel];

    return { global: global, color: wsColor, level: scoreLevel };
  }

  // ---------- RENDU UI ----------
  function renderShell(root) {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    root.innerHTML = ''
      + '<div class="aw-wrap" id="aw-w">'
      + '  <div class="aw-search">'
      + '    <h3 class="aw-title">Vérifiez votre qualité d\'eau</h3>'
      + '    <div class="aw-row">'
      + '      <div class="aw-iw">'
      + '        <input id="aw-input" class="aw-input" type="text" placeholder="Code postal ou ville" autocomplete="off">'
      + '        <div id="aw-sug" class="aw-sug"></div>'
      + '      </div>'
      + '      <button id="aw-go" class="aw-btn">Analyser</button>'
      + '    </div>'
      + '  </div>'
      + '  <div class="aw-body" id="aw-body">'
      + '    <div style="text-align:center;color:#727d84;">Recherchez une commune pour obtenir son Water Score.</div>'
      + '  </div>'
      + '</div>';

    STATE.el.input = $('aw-input');
    STATE.el.go    = $('aw-go');
    STATE.el.sug   = $('aw-sug');
    STATE.el.body  = $('aw-body');

    wireSearch();
  }

  function renderResult(score, commune) {
    var html = '';

    html += '<div style="text-align:center;">';
    html += '<div style="font-size:12px;color:#727d84;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Résultats pour</div>';
    html += '<h2 style="margin:4px 0 0;font-size:28px;color:#003594;font-weight:800;text-transform:uppercase;">' + commune.nom + '</h2>';
    html += '</div>';

    // WATER SCORE SLIDER
    html += '<div class="ws-slider-container">';
    html += '<div class="ws-score-display" style="color:' + score.color + '">' + score.global + '</div>';
    html += '<div class="ws-track">';
    var keys = [30, 40, 50, 60, 70, 80, 90, 100];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      // Mise en évidence du bloc correspondant au score
      var op = (score.level === k) ? '1' : '0.3';
      html += '<div class="ws-block" style="background:' + WS_COLORS[k] + '; opacity:' + op + ';">' + k + '</div>';
    }
    html += '</div>';
    html += '<p class="ws-desc">Votre Water Score indique la qualité de votre eau. Plus il est élevé, meilleure elle est.</p>';
    html += '</div>';

    // RECOMMANDATIONS
    html += '<h3 style="color:#003594;font-size:20px;font-weight:800;text-transform:uppercase;">Élevez votre Water Score</h3>';
    
    html += '<div class="aw-reco">';
    html += '<div class="aw-rn">' + PRODUITS['kinetico-k5-ro'].name + '</div>';
    html += '<p style="margin:0;color:#63666A;">' + PRODUITS['kinetico-k5-ro'].desc + '</p>';
    html += '</div>';

    html += '<div class="aw-reco">';
    html += '<div class="aw-rn">' + PRODUITS['kinetico-s250-xp'].name + '</div>';
    html += '<p style="margin:0;color:#63666A;">' + PRODUITS['kinetico-s250-xp'].desc + '</p>';
    html += '</div>';

    // LEAD FORM
    html += '<div class="aw-lead">';
    html += '<div class="aw-lt">Améliorez votre eau dès aujourd\'hui !</div>';
    html += '<p style="margin-top:0;font-size:14px;">Prenez rendez-vous avec un expert Kinetico pour un test d\'eau gratuit à domicile.</p>';
    html += '<form id="aw-leadform">';
    html += '<input class="aw-li" type="text" placeholder="Nom complet" required>';
    html += '<input class="aw-li" type="email" placeholder="Adresse e-mail" required>';
    html += '<button type="submit" class="aw-btn aw-btn-mag">Obtenir une analyse gratuite</button>';
    html += '</form>';
    html += '</div>';

    STATE.el.body.innerHTML = html;

    $('aw-leadform').addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Demande envoyée ! Un représentant Kinetico vous contactera sous peu.');
    });
  }

  // ---------- LOGIQUE DE RECHERCHE ----------
  function wireSearch() {
    var input = STATE.el.input, sug = STATE.el.sug, btn = STATE.el.go, timer = null;
    
    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(timer);
      if (q.length < 2) { sug.classList.remove('show'); return; }
      
      timer = setTimeout(function () {
        searchCommunes(q).then(function (list) {
          STATE.lastSuggestions = list;
          if (!list.length) return;
          var html = '';
          for (var i = 0; i < list.length; i++) {
            html += '<div class="aw-sugi" data-i="' + i + '"><strong>' + list[i].nom + '</strong> (' + list[i].codeDepartement + ')</div>';
          }
          sug.innerHTML = html;
          sug.classList.add('show');
          
          var items = sug.querySelectorAll('.aw-sugi');
          for (var k = 0; k < items.length; k++) {
            items[k].addEventListener('mousedown', function () {
              var c = STATE.lastSuggestions[parseInt(this.dataset.i, 10)];
              input.value = c.nom;
              sug.classList.remove('show');
              analyze(c);
            });
          }
        });
      }, 300);
    });
    
    input.addEventListener('blur', function () { setTimeout(function () { sug.classList.remove('show'); }, 200); });
    
    btn.addEventListener('click', function () {
      if (STATE.lastSuggestions.length > 0) analyze(STATE.lastSuggestions[0]);
    });
  }

  function analyze(commune) {
    STATE.el.body.innerHTML = '<div class="aw-load">Analyse en cours...</div>';
    fetchAnalyses(commune.code).then(function (raw) {
      var agg = aggregate(raw);
      var score = computeScore(agg);
      renderResult(score, commune);
    }).catch(function () {
      STATE.el.body.innerHTML = '<div style="text-align:center;color:#E6007E;padding:24px;">Erreur de connexion Hub\'Eau.</div>';
    });
  }

  // ---------- INIT ----------
  function init() {
    var root = document.getElementById(CONTAINER_IDS[0]);
    if (root) renderShell(root);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
