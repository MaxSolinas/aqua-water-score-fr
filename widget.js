/* =====================================================================
 * AQUA WATER SCORE™ FRANCE — Widget Hub'Eau pour Aqua Purify
 * v0.2.0 — MIT — © 2026 Aqua Purify S.à r.l.-S
 *
 * CHANGELOG v0.2.0 :
 *   - Affichage par défaut = dernier bulletin (aligné avec Orobnat / sante.gouv.fr)
 *   - Toggle Historique : moyenne / max / médiane / nb dépassements sur 4 ans
 *   - Microbiologie : pas de moyenne. Nb dépassements + dates listées (cliquable)
 *   - Ajout : Entérocoques, Bact. revivifiables 22°C / 36°C, Coliformes
 *   - Ajout : Calcium, Magnésium, Chlore libre/total, COT, TAC, Sodium
 *   - Calcul automatique du ratio Nitrates/50 + Nitrites/3 (limite 1)
 *   - Détail dépassements expandable (date + valeur + UDI)
 *
 * Sources :
 *   - Hub'Eau API "qualite_eau_potable" (hubeau.eaufrance.fr) — Etalab 2.0
 *   - geo.api.gouv.fr (résolution commune)
 *   - Référentiel arrêté 11/01/2007 modifié + directive UE 2020/2184
 *
 * Embed :
 *   <div id="aqua-water-score"></div>
 *   <script src="https://cdn.jsdelivr.net/gh/MaxSolinas/aqua-water-score-fr@main/widget.js"></script>
 * ===================================================================== */
(function () {
  'use strict';

  // ---------- CONFIG ----------
  var HUBEAU_BASE = 'https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable';
  var GEO_BASE   = 'https://geo.api.gouv.fr/communes';
  var CONTAINER_IDS = ['aqua-water-score', 'aqua-water-score-fr', 'wyws-france-widget'];

  // ---------- TYPE DE PARAMÈTRE ----------
  // 'L' = Limite de qualité (sanitaire, dépassement = veto)
  // 'R' = Référence de qualité (confort, dépassement = warn)
  // 'I' = Indicatif (pas de limite réglementaire, ex. dureté)
  // 'M' = Microbiologie (traitement spécial : pas de moyenne, comptage entier)

  // ---------- SEUILS RÉGLEMENTAIRES ----------
  // codes Sandre vérifiés sur sandre.eaufrance.fr et confirmés sur bulletins ARS
  var SEUILS = {
    // ====== MICROBIOLOGIE ======
    // (type M = traitement spécial dans le moteur)
    '1449': { name: "Escherichia coli", unit: "n/100mL", limit: 0, type: "M", cat: "microbio", desc: "Bactérie indicatrice de contamination fécale récente" },
    '1421': { name: "Entérocoques", unit: "n/100mL", limit: 0, type: "M", cat: "microbio", desc: "Bactéries indicatrices de contamination fécale" },
    '1451': { name: "Bactéries coliformes", unit: "n/100mL", ref: 0, type: "M", cat: "microbio", desc: "Indicateur de bon fonctionnement du réseau" },
    '1042': { name: "Bact. revivifiables à 22°C", unit: "n/mL", ref: null, type: "M", cat: "microbio", desc: "Indicateur de l'efficacité du traitement" },
    '1041': { name: "Bact. revivifiables à 36°C", unit: "n/mL", ref: null, type: "M", cat: "microbio", desc: "Indicateur de la qualité bactériologique générale" },

    // ====== CHIMIQUE SANITAIRE ======
    '1340': { name: "Nitrates", unit: "mg/L", limit: 50, type: "L", cat: "chimique", desc: "Origine agricole — risque méthémoglobinémie nourrisson" },
    '1339': { name: "Nitrites", unit: "mg/L", limit: 0.5, type: "L", cat: "chimique", desc: "Forme intermédiaire des nitrates" },
    '1369': { name: "Arsenic", unit: "µg/L", limit: 10, type: "L", cat: "chimique", desc: "Origine géologique ou industrielle" },
    '1391': { name: "Fluorures", unit: "mg/L", limit: 1.5, type: "L", cat: "chimique", desc: "Origine géologique" },
    '1763': { name: "Total trihalométhanes", unit: "µg/L", limit: 100, type: "L", cat: "chimique", desc: "Sous-produits de désinfection (THM)" },
    '1781': { name: "Bromates", unit: "µg/L", limit: 10, type: "L", cat: "chimique", desc: "Sous-produits de désinfection" },
    '1457': { name: "Chlorates", unit: "mg/L", limit: 0.7, type: "L", cat: "chimique", desc: "Sous-produits de désinfection (depuis 01/2026)" },
    '1456': { name: "Chlorites", unit: "mg/L", limit: 0.25, type: "L", cat: "chimique", desc: "Sous-produits de désinfection" },
    '1361': { name: "Uranium", unit: "µg/L", limit: 30, type: "L", cat: "chimique", desc: "Origine géologique (contrôle obligatoire depuis 01/2026)" },
    // Ratio nitrates/nitrites — calculé virtuel, code 9999 réservé
    '9999': { name: "Ratio Nitrates/50 + Nitrites/3", unit: "", limit: 1, type: "L", cat: "chimique", desc: "Indice combiné — doit rester ≤ 1", computed: true },

    // ====== MÉTAUX & PLOMBERIE ======
    '1382': { name: "Plomb", unit: "µg/L", limit: 10, futureLimit: 5, type: "L", cat: "metaux", desc: "Canalisations anciennes — limite 5 µg/L dès 2036" },
    '1388': { name: "Cadmium", unit: "µg/L", limit: 5, type: "L", cat: "metaux", desc: "Métal lourd toxique" },
    '1389': { name: "Chrome total", unit: "µg/L", limit: 50, type: "L", cat: "metaux", desc: "Métal lourd" },
    '1386': { name: "Nickel", unit: "µg/L", limit: 20, type: "L", cat: "metaux", desc: "Métal lourd — robinetterie" },
    '1392': { name: "Cuivre", unit: "mg/L", limit: 2.0, type: "L", cat: "metaux", desc: "Canalisations cuivre" },

    // ====== POLLUANTS ÉMERGENTS ======
    '2542': { name: "Bisphénol A", unit: "µg/L", limit: 2.5, type: "L", cat: "emergent", desc: "Perturbateur endocrinien — contrôle obligatoire depuis 01/2026" },
    '6276': { name: "Somme 20 PFAS", unit: "µg/L", limit: 0.1, type: "L", cat: "emergent", desc: "Polluants éternels — contrôle obligatoire depuis 01/2026" },

    // ====== CONFORT, GOÛT, INDICATEURS ======
    '1295': { name: "Turbidité", unit: "NFU", limit: 1.0, type: "L", cat: "confort", desc: "Aspect trouble de l'eau" },
    '1302': { name: "pH", unit: "unité pH", limitMin: 6.5, limitMax: 9, type: "R", cat: "confort", desc: "Acidité/basicité — référence 6,5–9" },
    '1303': { name: "Conductivité à 25°C", unit: "µS/cm", limitMin: 200, limitMax: 1100, type: "R", cat: "confort", desc: "Salinité globale — référence 200–1100" },
    '1393': { name: "Fer total", unit: "µg/L", ref: 200, type: "R", cat: "confort", desc: "Coloration rouille, dépôts" },
    '1394': { name: "Manganèse", unit: "µg/L", ref: 50, type: "R", cat: "confort", desc: "Coloration noire, dépôts" },
    '1370': { name: "Aluminium total", unit: "µg/L", ref: 200, type: "R", cat: "confort", desc: "Résidu de potabilisation" },
    '1335': { name: "Ammonium", unit: "mg/L", ref: 0.1, type: "R", cat: "confort", desc: "Indicateur de pollution organique" },
    '1337': { name: "Chlorures", unit: "mg/L", ref: 250, type: "R", cat: "confort", desc: "Goût salé, corrosion" },
    '1338': { name: "Sulfates", unit: "mg/L", ref: 250, type: "R", cat: "confort", desc: "Goût, propriétés laxatives" },
    '1375': { name: "Sodium", unit: "mg/L", ref: 200, type: "R", cat: "confort", desc: "Goût salé" },
    '1841': { name: "Carbone organique total", unit: "mg(C)/L", ref: 2.0, type: "R", cat: "confort", desc: "Matières organiques dissoutes" },
    '1842': { name: "Carbone organique total", unit: "mg(C)/L", ref: 2.0, type: "R", cat: "confort", desc: "Matières organiques dissoutes" },
    '1330': { name: "Couleur", unit: "mg/L Pt", ref: 15, type: "R", cat: "confort", desc: "Coloration apparente" },
    '1374': { name: "Calcium", unit: "mg/L", ref: null, type: "I", cat: "confort", desc: "Contribue à la dureté de l'eau" },
    '1372': { name: "Magnésium", unit: "mg/L", ref: null, type: "I", cat: "confort", desc: "Contribue à la dureté de l'eau" },
    '1345': { name: "Titre hydrotimétrique (TH)", unit: "°f", type: "I", cat: "confort", desc: "Dureté totale — non réglementé, indicatif" },
    '1347': { name: "Titre alcalimétrique complet (TAC)", unit: "°f", type: "I", cat: "confort", desc: "Indicateur de pouvoir tampon" },
    '1399': { name: "Chlore libre", unit: "mg(Cl2)/L", ref: null, type: "I", cat: "confort", desc: "Désinfection résiduelle au robinet" },
    '1398': { name: "Chlore total", unit: "mg(Cl2)/L", ref: null, type: "I", cat: "confort", desc: "Chlore libre + chlore combiné" },
    '1301': { name: "Température", unit: "°C", limitMax: 25, type: "R", cat: "confort", desc: "Référence < 25°C" },
  };

  // Pesticides : codes Sandre nombreux, on les détecte par libellé
  var CODES_PESTICIDES = ['1506', '1907', '1517', '1140', '1141', '1102', '1108', '5537', '1359', '1213'];
  var PESTICIDE_REGEX  = /pestic|atrazin|simazin|gluphosi|glyphosa|metolach|chlortolu|deseth|metalax|s-meto|alachlore|metribuzin|terbuthyl|isoproturon|diuron/i;

  // ---------- CATALOGUE PRODUITS ----------
  var PRODUITS = {
    'kinetico-q850-od': { name: "Kinetico Q850 OverDrive XP", family: "Adoucisseur", certs: ["WQA Gold Seal","NSF/ANSI 44","ACS"], desc: "Adoucisseur bi-réservoir haute capacité — foyer 5+ personnes, eau très dure." },
    'kinetico-s250-xp': { name: "Kinetico Premier S250 XP", family: "Adoucisseur", certs: ["WQA Gold Seal","NSF/ANSI 44","ACS"], desc: "Bi-réservoir OverDrive, débit 60 L/min — foyer 3-4 personnes." },
    'kinetico-s150-xp': { name: "Kinetico Premier S150 XP", family: "Adoucisseur", certs: ["WQA Gold Seal","NSF/ANSI 44","ACS"], desc: "Adoucisseur bi-réservoir — foyer 1-3 personnes." },
    'kinetico-premier-compact': { name: "Kinetico Premier Compact", family: "Adoucisseur", certs: ["WQA Gold Seal","ACS"], desc: "Compact pour espaces réduits." },
    'kinetico-k5-ro': { name: "Kinetico K5 (Osmose inverse)", family: "Osmose inverse", certs: ["NSF/ANSI 58","NSF/ANSI 372","ACS"], desc: "OI sous évier 5 étages — nitrates, plomb, PFAS, métaux lourds." },
    'viqua-ihs22-d4': { name: "Viqua IHS22-D4 Home Plus", family: "UV + filtration", certs: ["NSF/ANSI 55 Cl. A","ACS"], desc: "UV-C 254 nm intégré + pré-filtration, débit 45 L/min." },
    'viqua-d4': { name: "Viqua D4", family: "UV", certs: ["NSF/ANSI 55 Cl. A","ACS"], desc: "Désinfection UV-C résidentielle." },
    'cab-charbon': { name: "Charbon actif densifié", family: "Filtration", certs: ["NSF/ANSI 42","NSF/ANSI 53","NSF/ANSI 401"], desc: "Cartouche CAB 5 µm — pesticides, chlore, THM, goûts." }
  };

  // ---------- CSS (scoped via .aw-*) ----------
  var CSS = ''
    + '.aw-wrap{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,sans-serif;color:#0F172A;background:#fff;border:1px solid #E5E7EB;border-radius:20px;overflow:hidden;box-shadow:0 1px 2px rgba(15,23,42,.04),0 12px 40px rgba(15,23,42,.06);max-width:100%;line-height:1.5;box-sizing:border-box}'
    + '.aw-wrap *,.aw-wrap *::before,.aw-wrap *::after{box-sizing:border-box}'
    + '.aw-search{padding:24px;border-bottom:1px solid #E5E7EB;background:#FBFAF7;display:flex;flex-direction:column;gap:14px}'
    + '.aw-title{font-size:20px;font-weight:600;color:#0A1F44;display:flex;align-items:center;gap:10px;margin:0}'
    + '.aw-title svg{width:22px;height:22px;color:#06B6D4}'
    + '.aw-row{display:flex;gap:10px;flex-wrap:wrap}'
    + '.aw-iw{flex:1;min-width:220px;position:relative}'
    + '.aw-input{width:100%;padding:13px 14px 13px 42px;border:1px solid #E5E7EB;border-radius:12px;font:inherit;font-size:15px;background:#fff;color:#0F172A;transition:border-color .16s,box-shadow .16s}'
    + '.aw-input:focus{outline:none;border-color:#06B6D4;box-shadow:0 0 0 4px rgba(6,182,212,.12)}'
    + '.aw-iicon{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:18px;height:18px;color:#94A3B8;pointer-events:none}'
    + '.aw-btn{padding:13px 22px;background:#0A1F44;color:#fff;border:none;border-radius:12px;font:inherit;font-weight:600;font-size:14px;cursor:pointer;transition:background .16s,transform .16s;display:inline-flex;align-items:center;gap:8px;white-space:nowrap}'
    + '.aw-btn:hover{background:#0F2D5C;transform:translateY(-1px)}'
    + '.aw-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}'
    + '.aw-btn2{background:#fff;color:#0A1F44;border:1px solid #E5E7EB}'
    + '.aw-btn2:hover{background:#F8FAFC}'
    + '.aw-sug{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #E5E7EB;border-radius:12px;margin-top:6px;box-shadow:0 12px 40px rgba(15,23,42,.12);max-height:280px;overflow-y:auto;z-index:10;display:none}'
    + '.aw-sug.show{display:block}'
    + '.aw-sugi{padding:11px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;transition:background .12s}'
    + '.aw-sugi:hover{background:#F0FDFA}'
    + '.aw-sugi:last-child{border-bottom:none}'
    + '.aw-sugm{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#94A3B8}'
    + '.aw-quick{display:flex;flex-wrap:wrap;gap:6px;align-items:center}'
    + '.aw-quick span{font-size:11px;color:#94A3B8;letter-spacing:.04em}'
    + '.aw-qb{background:#fff;border:1px solid #E5E7EB;border-radius:999px;padding:5px 12px;font-size:12px;cursor:pointer;color:#475569;font:inherit;transition:all .14s}'
    + '.aw-qb:hover{border-color:#06B6D4;color:#0891B2}'
    + '.aw-body{padding:24px}'
    + '.aw-load{padding:60px 24px;text-align:center;color:#475569}'
    + '.aw-spin{width:32px;height:32px;border:3px solid #E5E7EB;border-top-color:#06B6D4;border-radius:50%;margin:0 auto 16px;animation:awspin 700ms linear infinite}'
    + '@keyframes awspin{to{transform:rotate(360deg)}}'
    + '.aw-empty{padding:64px 24px;text-align:center;color:#64748B;font-size:14px}'
    + '.aw-empty-i{font-size:64px;color:#06B6D4;opacity:.2;line-height:1;margin-bottom:12px;font-weight:300}'
    + '.aw-hero{display:grid;grid-template-columns:auto 1fr;gap:32px;align-items:center;padding-bottom:24px;border-bottom:1px solid #E5E7EB;margin-bottom:24px}'
    + '@media (max-width:640px){.aw-hero{grid-template-columns:1fr;gap:20px;text-align:center}.aw-gauge{margin:0 auto}}'
    + '.aw-gauge{position:relative;width:160px;height:160px}'
    + '.aw-gauge svg{width:100%;height:100%;transform:rotate(-90deg)}'
    + '.aw-gtrack{fill:none;stroke:#E5E7EB;stroke-width:10}'
    + '.aw-gfill{fill:none;stroke-width:10;stroke-linecap:round;transition:stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)}'
    + '.aw-gc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}'
    + '.aw-gn{font-size:50px;font-weight:300;letter-spacing:-.03em;line-height:1;color:#0A1F44;font-variant-numeric:tabular-nums}'
    + '.aw-gm{font-size:11px;color:#94A3B8;letter-spacing:.06em;margin-top:4px;font-family:ui-monospace,monospace}'
    + '.aw-letter{position:absolute;top:-6px;right:-6px;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;color:#fff;box-shadow:0 4px 14px rgba(15,23,42,.18)}'
    + '.aw-cn{font-size:28px;font-weight:600;letter-spacing:-.015em;line-height:1.1;color:#0A1F44;margin:0 0 6px}'
    + '.aw-cm{font-size:13px;color:#475569;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:14px}'
    + '.aw-cm span{display:inline-flex;align-items:center;gap:6px}'
    + '.aw-verdict{font-size:16px;line-height:1.5;color:#0F172A;max-width:60ch}'
    + '.aw-verdict strong{color:#0A1F44}'

    // === Mode toggle (Dernier bulletin / Historique 4 ans) ===
    + '.aw-mode{display:flex;gap:6px;background:#F1F5F9;padding:4px;border-radius:10px;margin-bottom:20px;width:fit-content;flex-wrap:wrap}'
    + '.aw-mode-btn{padding:7px 14px;background:transparent;border:none;border-radius:7px;font:inherit;font-size:12px;font-weight:600;color:#64748B;cursor:pointer;transition:all .15s}'
    + '.aw-mode-btn.active{background:#fff;color:#0A1F44;box-shadow:0 1px 3px rgba(15,23,42,.08)}'
    + '.aw-mode-hist{display:flex;gap:6px;align-items:center;margin-bottom:20px;flex-wrap:wrap}'
    + '.aw-mode-hist-lbl{font-size:11px;color:#94A3B8;font-weight:600;letter-spacing:.04em}'
    + '.aw-mode-hist-btn{padding:5px 11px;background:#fff;border:1px solid #E5E7EB;border-radius:6px;font-size:11px;font-weight:500;color:#475569;cursor:pointer;transition:all .14s}'
    + '.aw-mode-hist-btn.active{background:#0A1F44;color:#fff;border-color:#0A1F44}'

    + '.aw-subs{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:32px}'
    + '@media (max-width:880px){.aw-subs{grid-template-columns:repeat(2,1fr)}}'
    + '.aw-sub{padding:16px;border:1px solid #E5E7EB;border-radius:12px;background:#FBFAF7;transition:border-color .16s}'
    + '.aw-sub:hover{border-color:#06B6D4}'
    + '.aw-sl{font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:.08em;color:#94A3B8;margin-bottom:10px;line-height:1.3}'
    + '.aw-sv{font-size:28px;font-weight:600;letter-spacing:-.02em;margin-bottom:8px;font-variant-numeric:tabular-nums}'
    + '.aw-sb{height:4px;background:#E5E7EB;border-radius:2px;overflow:hidden}'
    + '.aw-sbf{height:100%;border-radius:2px;transition:width .8s cubic-bezier(.22,1,.36,1)}'
    + '.aw-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px}'
    + '.aw-params{border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:14px}'
    + '.aw-ph{padding:13px 18px;background:#FBFAF7;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center}'
    + '.aw-ph h3{margin:0;font-weight:600;font-size:15px;color:#0A1F44}'
    + '.aw-pc{font-family:ui-monospace,monospace;font-size:11px;color:#94A3B8}'
    + '.aw-pr{padding:12px 18px;border-bottom:1px solid #E5E7EB;transition:background .14s}'
    + '.aw-pr:hover{background:#FBFAF7}'
    + '.aw-pr:last-child{border-bottom:none}'
    + '.aw-pr-main{display:grid;grid-template-columns:24px 1fr auto auto;gap:14px;align-items:center}'
    + '.aw-pdot{width:10px;height:10px;border-radius:50%}'
    + '.aw-pn{font-weight:500;font-size:14px;color:#0F172A;margin-bottom:2px;display:flex;align-items:center;gap:8px}'
    + '.aw-pd{font-size:11px;color:#94A3B8;line-height:1.4}'
    + '.aw-pv{font-family:ui-monospace,monospace;font-size:13px;color:#0F172A;font-weight:500;text-align:right;white-space:nowrap}'
    + '.aw-pl{font-family:ui-monospace,monospace;font-size:11px;color:#94A3B8;text-align:right;white-space:nowrap}'
    + '@media (max-width:520px){.aw-pr-main{grid-template-columns:18px 1fr auto;gap:10px}.aw-pl{display:none}}'

    // === Détails expandable (dates de dépassement) ===
    + '.aw-pexp{margin-top:8px;padding:10px 12px;background:#FFF7ED;border-left:3px solid #EA580C;border-radius:4px;font-size:12px;color:#9A3412;display:none}'
    + '.aw-pexp.show{display:block}'
    + '.aw-pexp ul{margin:4px 0 0;padding-left:18px}'
    + '.aw-pexp li{margin:2px 0}'
    + '.aw-pexp-tgl{font-size:11px;color:#EA580C;cursor:pointer;text-decoration:underline;font-weight:600;background:none;border:none;padding:0;font-family:inherit}'
    + '.aw-pexp-tgl:hover{color:#C2410C}'

    + '.aw-reco{border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:10px;transition:all .2s}'
    + '.aw-reco:hover{border-color:#06B6D4;box-shadow:0 8px 24px rgba(6,182,212,.1)}'
    + '.aw-rp{height:3px}'
    + '.aw-rb{padding:18px 22px;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center}'
    + '@media (max-width:640px){.aw-rb{grid-template-columns:1fr}}'
    + '.aw-rm{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0891B2;margin-bottom:6px;display:flex;gap:12px;align-items:center}'
    + '.aw-rm strong{color:#0A1F44}'
    + '.aw-rn{font-weight:600;font-size:19px;line-height:1.2;color:#0A1F44;margin-bottom:6px}'
    + '.aw-rr{font-size:13px;color:#475569;line-height:1.5;margin-bottom:8px}'
    + '.aw-certs{display:flex;gap:6px;flex-wrap:wrap}'
    + '.aw-cert{font-family:ui-monospace,monospace;font-size:10px;padding:3px 8px;background:#FBFAF7;border:1px solid #E5E7EB;border-radius:4px;color:#475569}'
    + '.aw-lead{margin-top:24px;padding:28px;background:linear-gradient(135deg,#0A1F44 0%,#0F2D5C 100%);border-radius:12px;color:#fff;position:relative;overflow:hidden}'
    + '.aw-lead::before{content:"";position:absolute;top:-120px;right:-120px;width:280px;height:280px;background:radial-gradient(circle,rgba(6,182,212,.25) 0%,transparent 70%);border-radius:50%}'
    + '.aw-lt{font-weight:600;font-size:22px;letter-spacing:-.01em;line-height:1.2;margin:0 0 8px;position:relative}'
    + '.aw-lt em{color:#67E8F9;font-style:italic}'
    + '.aw-ls{font-size:13px;color:rgba(255,255,255,.7);margin-bottom:18px;position:relative;max-width:56ch}'
    + '.aw-lf{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;position:relative}'
    + '@media (max-width:720px){.aw-lf{grid-template-columns:1fr}}'
    + '.aw-li{padding:12px 14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:8px;color:#fff;font:inherit;font-size:14px;transition:all .16s}'
    + '.aw-li::placeholder{color:rgba(255,255,255,.4)}'
    + '.aw-li:focus{outline:none;background:rgba(255,255,255,.12);border-color:#06B6D4}'
    + '.aw-lb{padding:12px 22px;background:#06B6D4;color:#0A1F44;border:none;border-radius:8px;font:inherit;font-weight:700;font-size:14px;cursor:pointer;transition:all .16s}'
    + '.aw-lb:hover{background:#67E8F9;transform:translateY(-1px)}'
    + '.aw-success{padding:18px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:8px;color:#fff;text-align:center;font-size:14px}'
    + '.aw-disc{margin-top:14px;font-size:11px;color:rgba(255,255,255,.5);line-height:1.5;position:relative}'
    + '.aw-foot{padding:14px 22px;border-top:1px solid #E5E7EB;font-size:11px;color:#94A3B8;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;background:#FBFAF7}'
    + '.aw-foot a{color:#0891B2;text-decoration:none}'
    + '.aw-foot a:hover{text-decoration:underline}'
    + '.aw-bull-info{padding:14px 16px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;margin-bottom:20px;font-size:13px;color:#1E3A8A;line-height:1.5}'
    + '.aw-bull-info strong{color:#0A1F44}';

  // ---------- ÉTAT ----------
  var STATE = {
    config: null,
    currentScore: null,
    currentCommune: null,
    currentRawData: null,    // Toutes les analyses brutes
    currentBulletin: null,   // Dernier bulletin uniquement
    historyMode: 'avg',      // 'avg' | 'max' | 'median' | 'count'
    displayMode: 'bulletin', // 'bulletin' | 'history'
    lastSuggestions: [],
    el: {}
  };

  // ---------- UTILS ----------
  function $(id) { return document.getElementById(id); }
  function fmtNum(v, dec) {
    if (v == null || isNaN(v)) return '—';
    if (v === 0) return '0';
    if (Math.abs(v) < 0.001) return v.toExponential(1);
    if (Math.abs(v) < 1) return v.toFixed(3);
    if (Math.abs(v) < 10) return v.toFixed(dec != null ? dec : 2);
    if (Math.abs(v) < 100) return v.toFixed(1);
    return Math.round(v).toString();
  }
  function median(arr) {
    if (!arr.length) return null;
    var sorted = arr.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[m - 1] + sorted[m]) / 2 : sorted[m];
  }
  function statusColor(s) {
    return { good: '#16A34A', caution: '#CA8A04', warn: '#EA580C', danger: '#DC2626' }[s] || '#94A3B8';
  }
  function hexToRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (_) { return iso; }
  }

  // ---------- API CLIENT ----------
  function searchCommunes(query) {
    var q = query.trim();
    var isPostal = /^\d{2,5}$/.test(q);
    var param = isPostal ? 'codePostal=' + q : 'nom=' + encodeURIComponent(q) + '&boost=population';
    var url = GEO_BASE + '?' + param + '&fields=code,nom,codeDepartement,codePostal,centre,population&format=json&limit=8';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('Erreur résolution commune');
      return r.json();
    });
  }

  function fetchHubeau(path, params) {
    var qs = [];
    for (var k in params) { if (params[k] != null) qs.push(k + '=' + encodeURIComponent(params[k])); }
    var url = HUBEAU_BASE + path + '?' + qs.join('&');
    return fetch(url).then(function (r) {
      if (!r.ok && r.status !== 206) throw new Error('Hub\'Eau HTTP ' + r.status);
      return r.json();
    }).catch(function () {
      return fetchJsonp(url);
    });
  }
  function fetchJsonp(url) {
    return new Promise(function (resolve, reject) {
      var cb = 'awcb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
      var s = document.createElement('script');
      var timer = setTimeout(function () { cleanup(); reject(new Error('JSONP timeout')); }, 15000);
      function cleanup() {
        clearTimeout(timer);
        delete window[cb];
        if (s.parentNode) s.parentNode.removeChild(s);
      }
      window[cb] = function (data) { cleanup(); resolve(data); };
      s.onerror = function () { cleanup(); reject(new Error('JSONP error')); };
      s.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 'callback=' + cb;
      document.body.appendChild(s);
    });
  }

  function fetchAnalyses(codeCommune) {
    return fetchHubeau('/resultats_dis', {
      code_commune: codeCommune,
      date_min_prelevement: '2022-01-01',
      size: 5000,
      sort: 'desc'
    }).then(function (j) { return (j && j.data) || []; });
  }
  function fetchUdi(codeCommune) {
    return fetchHubeau('/communes_udi', { code_commune: codeCommune, size: 20 })
      .then(function (j) { return (j && j.data) || []; })
      .catch(function () { return []; });
  }

  // ---------- BULLETIN EXTRACTION ----------
  // Sépare les analyses par "bulletin" (un prélèvement = une date + un point/UDI)
  function extractLatestBulletin(raw) {
    if (!raw || !raw.length) return null;
    // Hub'Eau ne fournit pas d'identifiant "bulletin", on regroupe par date_prelevement + code_reseau
    var byBulletin = {};
    for (var i = 0; i < raw.length; i++) {
      var a = raw[i];
      var key = a.date_prelevement + '|' + (a.code_reseau || a.nom_reseau || '');
      if (!byBulletin[key]) byBulletin[key] = { date: a.date_prelevement, reseau: a.nom_reseau || a.code_reseau, analyses: [] };
      byBulletin[key].analyses.push(a);
    }
    // Le bulletin le plus complet (le plus de paramètres) parmi les plus récents
    var sorted = Object.keys(byBulletin)
      .map(function (k) { return byBulletin[k]; })
      .sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return b.analyses.length - a.analyses.length;
      });
    return sorted[0];
  }

  // ---------- AGRÉGATION HISTORIQUE ----------
  function aggregateHistory(raw) {
    var byParam = {};
    for (var i = 0; i < raw.length; i++) {
      var a = raw[i];
      if (!a.code_parametre) continue;
      if (!byParam[a.code_parametre]) byParam[a.code_parametre] = [];
      byParam[a.code_parametre].push(a);
    }
    return byParam;
  }

  // ---------- CONSTRUCTION DES PARAMÈTRES À AFFICHER ----------
  // Selon le mode (bulletin / historique-avg/max/median/count)
  function buildParams(bulletin, history, mode, historyMode) {
    var seuilCodes = Object.keys(SEUILS);
    var pestRecords = [];
    var params = [];

    // Collecte des pesticides détectés (depuis l'historique pour exhaustivité)
    for (var code in history) {
      var records = history[code];
      var isPest = CODES_PESTICIDES.indexOf(code) > -1 ||
        (records[0] && records[0].libelle_parametre && PESTICIDE_REGEX.test(records[0].libelle_parametre));
      if (isPest) {
        for (var pp = 0; pp < records.length; pp++) {
          if (records[pp].resultat_numerique != null) {
            pestRecords.push({
              code: code,
              nom: records[pp].libelle_parametre,
              valeur: records[pp].resultat_numerique,
              unite: records[pp].libelle_unite,
              conformite: records[pp].conformite_limites_pc_prelevement,
              date: records[pp].date_prelevement
            });
          }
        }
      }
    }

    // Pour chaque seuil connu, construire l'affichage
    for (var i = 0; i < seuilCodes.length; i++) {
      var sCode = seuilCodes[i];
      var s = SEUILS[sCode];
      if (s.computed) continue; // Sera calculé en post-traitement

      var bulletinAnalysis = null;
      if (bulletin && bulletin.analyses) {
        for (var j = 0; j < bulletin.analyses.length; j++) {
          if (bulletin.analyses[j].code_parametre === sCode) {
            bulletinAnalysis = bulletin.analyses[j];
            break;
          }
        }
      }
      var allAnalyses = history[sCode] || [];

      // Si absent partout, on saute
      if (!bulletinAnalysis && allAnalyses.length === 0) continue;

      // ====== MICROBIOLOGIE (traitement spécial) ======
      if (s.type === 'M') {
        params.push(buildMicrobioParam(s, sCode, bulletinAnalysis, allAnalyses, mode, historyMode));
        continue;
      }

      // ====== PHYSICO-CHIMIQUE ======
      params.push(buildChemParam(s, sCode, bulletinAnalysis, allAnalyses, mode, historyMode));
    }

    // ====== RATIO NITRATES/50 + NITRITES/3 (code 9999 virtuel) ======
    var noNit, noNi;
    for (var p = 0; p < params.length; p++) {
      if (params[p].code === '1340') noNit = params[p];
      if (params[p].code === '1339') noNi = params[p];
    }
    if (noNit && noNi && noNit.value != null && noNi.value != null) {
      var ratio = noNit.value / 50 + noNi.value / 3;
      var rStatus = ratio > 1 ? 'danger' : ratio > 0.75 ? 'warn' : ratio > 0.5 ? 'caution' : 'good';
      params.push({
        code: '9999',
        name: SEUILS['9999'].name,
        unit: '',
        desc: SEUILS['9999'].desc,
        cat: 'chimique',
        value: ratio,
        displayValue: ratio.toFixed(2),
        limit: 1,
        type: 'L',
        status: rStatus,
        date: noNit.date || noNi.date,
        nbAnalyses: Math.min(noNit.nbAnalyses, noNi.nbAnalyses),
        nbDepassement: 0,
        depassements: [],
        isComputed: true
      });
    }

    return { params: params, pesticides: pestRecords };
  }

  function buildMicrobioParam(s, sCode, bulletinAnalysis, allAnalyses, mode, historyMode) {
    // Microbio : pas de moyenne. On affiche soit la valeur du bulletin, soit le max sur l'historique
    var depassements = [];
    var maxVal = 0;
    var lastDate = null;

    for (var k = 0; k < allAnalyses.length; k++) {
      var a = allAnalyses[k];
      if (a.resultat_numerique != null && a.resultat_numerique > maxVal) maxVal = a.resultat_numerique;
      var lim = s.limit != null ? s.limit : (s.ref != null ? s.ref : null);
      var isDepass = (a.conformite_limites_pc_prelevement === 'N') ||
                     (lim != null && a.resultat_numerique != null && a.resultat_numerique > lim);
      if (isDepass) {
        depassements.push({
          date: a.date_prelevement,
          valeur: a.resultat_numerique != null ? a.resultat_numerique : a.resultat_alphanumerique,
          unite: a.libelle_unite || s.unit,
          udi: a.nom_reseau || a.code_reseau
        });
      }
      if (!lastDate || a.date_prelevement > lastDate) lastDate = a.date_prelevement;
    }

    // Valeur à afficher
    var val, displayVal, statusVal, dateShown;
    if (mode === 'bulletin' && bulletinAnalysis) {
      val = bulletinAnalysis.resultat_numerique;
      // Pour microbio : si 0 ou null, on affiche "<1" (convention bulletin ARS)
      if (val == null || val === 0) {
        displayVal = '<1 ' + s.unit;
      } else {
        displayVal = Math.round(val) + ' ' + s.unit;
      }
      statusVal = (bulletinAnalysis.conformite_limites_pc_prelevement === 'N' || (s.limit != null && val > s.limit)) ? 'danger' : 'good';
      dateShown = bulletinAnalysis.date_prelevement;
    } else {
      // Mode historique
      val = maxVal;
      if (historyMode === 'count') {
        displayVal = depassements.length + ' dépass. / ' + allAnalyses.length;
      } else if (historyMode === 'max') {
        displayVal = maxVal === 0 ? '<1 ' + s.unit + ' (max)' : Math.round(maxVal) + ' ' + s.unit + ' (max)';
      } else {
        // En microbio, la moyenne n'a aucun sens, on retombe sur le max
        displayVal = maxVal === 0 ? '<1 ' + s.unit + ' (max)' : Math.round(maxVal) + ' ' + s.unit + ' (max)';
      }
      statusVal = depassements.length > 0 ? 'danger' : 'good';
      dateShown = lastDate;
    }

    return {
      code: sCode,
      name: s.name,
      unit: s.unit,
      desc: s.desc,
      cat: s.cat,
      value: val,
      displayValue: displayVal,
      limit: s.limit != null ? s.limit : null,
      ref: s.ref != null ? s.ref : null,
      type: 'M',
      status: statusVal,
      date: dateShown,
      nbAnalyses: allAnalyses.length,
      nbDepassement: depassements.length,
      depassements: depassements,
      isMicrobio: true
    };
  }

  function buildChemParam(s, sCode, bulletinAnalysis, allAnalyses, mode, historyMode) {
    var values = [];
    var depassements = [];
    var lastDate = null;
    for (var k = 0; k < allAnalyses.length; k++) {
      var a = allAnalyses[k];
      if (a.resultat_numerique != null) values.push(a.resultat_numerique);
      var lim = s.limit != null ? s.limit : (s.limitMax != null ? s.limitMax : null);
      var isDepass = (a.conformite_limites_pc_prelevement === 'N') ||
                     (lim != null && a.resultat_numerique != null && a.resultat_numerique > lim) ||
                     (s.limitMin != null && a.resultat_numerique != null && a.resultat_numerique < s.limitMin);
      if (isDepass) {
        depassements.push({
          date: a.date_prelevement,
          valeur: a.resultat_numerique,
          unite: a.libelle_unite || s.unit,
          udi: a.nom_reseau || a.code_reseau
        });
      }
      if (!lastDate || a.date_prelevement > lastDate) lastDate = a.date_prelevement;
    }

    var val, displayVal, dateShown;
    if (mode === 'bulletin' && bulletinAnalysis) {
      val = bulletinAnalysis.resultat_numerique;
      var altText = bulletinAnalysis.resultat_alphanumerique;
      displayVal = altText && (val == null || val === 0) ? altText + ' ' + s.unit : (fmtNum(val) + ' ' + s.unit);
      dateShown = bulletinAnalysis.date_prelevement;
    } else {
      // Mode historique
      if (values.length === 0) {
        val = null; displayVal = '—';
      } else if (historyMode === 'max') {
        val = Math.max.apply(null, values);
        displayVal = fmtNum(val) + ' ' + s.unit + ' (max)';
      } else if (historyMode === 'median') {
        val = median(values);
        displayVal = fmtNum(val) + ' ' + s.unit + ' (médiane)';
      } else if (historyMode === 'count') {
        val = depassements.length;
        displayVal = depassements.length + ' dépass. / ' + allAnalyses.length;
      } else {
        // avg (par défaut)
        val = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
        displayVal = fmtNum(val) + ' ' + s.unit + ' (moy. ' + allAnalyses.length + 'x)';
      }
      dateShown = lastDate;
    }

    // Statut basé sur la valeur affichée
    var status = 'good';
    var seuilRef = s.limit != null ? s.limit : (s.ref != null ? s.ref : (s.limitMax != null ? s.limitMax : null));
    if (val != null && seuilRef != null) {
      if (s.type === 'L') {
        if (val > seuilRef) status = 'danger';
        else if (val > seuilRef * 0.75) status = 'warn';
        else if (val > seuilRef * 0.5) status = 'caution';
      } else {
        if (val > seuilRef * 1.2) status = 'warn';
        else if (val > seuilRef) status = 'caution';
      }
    }
    // pH (range)
    if (sCode === '1302' && val != null) {
      if (val < s.limitMin || val > s.limitMax) status = 'warn';
    }
    // Override : si bulletin actuel non conforme
    if (mode === 'bulletin' && bulletinAnalysis && bulletinAnalysis.conformite_limites_pc_prelevement === 'N') {
      status = 'danger';
    }

    return {
      code: sCode,
      name: s.name,
      unit: s.unit,
      desc: s.desc,
      cat: s.cat,
      value: val,
      displayValue: displayVal,
      limit: s.limit != null ? s.limit : null,
      ref: s.ref != null ? s.ref : null,
      limitMin: s.limitMin != null ? s.limitMin : null,
      limitMax: s.limitMax != null ? s.limitMax : null,
      type: s.type,
      status: status,
      date: dateShown,
      nbAnalyses: allAnalyses.length,
      nbDepassement: depassements.length,
      depassements: depassements
    };
  }

  // ---------- SCORING ----------
  function computeScore(paramsData) {
    var params = paramsData.params;
    var pesticides = paramsData.pesticides;

    var subs = { microbio: 100, chimique: 100, confort: 100, emergent: 100, metaux: 100 };
    var metrics = {};

    // Compteurs microbio
    var microbioDepass = 0;
    for (var i = 0; i < params.length; i++) {
      var p = params[i];
      if (p.cat === 'microbio' && p.nbDepassement > 0) microbioDepass += p.nbDepassement;
    }
    if (microbioDepass > 0) {
      subs.microbio = Math.max(0, 100 - microbioDepass * 35);
    }
    metrics.microbio_nonconforme = microbioDepass > 0;
    metrics.microbio_count = microbioDepass;

    // Pénalités par paramètre
    for (var k = 0; k < params.length; k++) {
      var p = params[k];
      if (p.cat === 'microbio') continue; // déjà traité
      var seuilRef = p.limit != null ? p.limit : (p.ref != null ? p.ref : (p.limitMax != null ? p.limitMax : null));
      if (!seuilRef || p.value == null) continue;

      if (p.type === 'L') {
        if (p.nbDepassement > 0) subs[p.cat] -= 35 + Math.min(30, (p.nbDepassement / Math.max(p.nbAnalyses, 1)) * 30);
        else if (p.value > seuilRef * 0.75) subs[p.cat] -= 12;
        else if (p.value > seuilRef * 0.5) subs[p.cat] -= 5;
      } else if (p.type === 'R') {
        var ratio = p.value / seuilRef;
        if (ratio > 1.2) subs[p.cat] -= 15;
        else if (ratio > 1.0) subs[p.cat] -= 8;
        else if (ratio > 0.85) subs[p.cat] -= 3;
      }

      // Métriques utiles pour la reco
      if (p.code === '1340') metrics.nitrates_max = p.value;
      if (p.code === '1382') metrics.plomb_max = p.value;
      if (p.code === '6276') metrics.pfas_max = p.value;
      if (p.code === '1763') metrics.thm_max = p.value;
      if (p.code === '1345') metrics.durete_moy = p.value;
      if (p.code === '1303') metrics.conductivite_moy = p.value;
    }

    // Pesticides
    if (pesticides.length > 0) {
      var pVals = []; for (var pp = 0; pp < pesticides.length; pp++) pVals.push(pesticides[pp].valeur);
      var maxIndiv = Math.max.apply(null, pVals);
      var nbDp = 0; for (var pq = 0; pq < pesticides.length; pq++) if (pesticides[pq].conformite === 'N') nbDp++;
      metrics.pesticides_max_individuel = maxIndiv;
      metrics.pesticides_nonconforme = nbDp > 0;
      if (nbDp > 0) subs.chimique -= 25 + (nbDp / pesticides.length) * 20;
      else if (maxIndiv > 0.05) subs.chimique -= 5;
    }

    for (var sk in subs) subs[sk] = Math.max(0, Math.min(100, Math.round(subs[sk])));

    var global = Math.round(
      subs.microbio * 0.30 + subs.chimique * 0.30 + subs.metaux * 0.15 +
      subs.emergent * 0.10 + subs.confort * 0.15
    );

    var letter, color, desc;
    if (global >= 90)      { letter = 'A'; color = '#16A34A'; desc = 'Excellente'; }
    else if (global >= 75) { letter = 'B'; color = '#65A30D'; desc = 'Bonne'; }
    else if (global >= 50) { letter = 'C'; color = '#CA8A04'; desc = 'Correcte avec réserves'; }
    else if (global >= 25) { letter = 'D'; color = '#EA580C'; desc = 'Médiocre'; }
    else                   { letter = 'E'; color = '#DC2626'; desc = 'Préoccupante'; }

    return {
      global: global, letter: letter, letterColor: color, letterDesc: desc,
      sub: subs, params: params, metrics: metrics, pesticides: pesticides
    };
  }

  // ---------- RECOMMANDATIONS ----------
  function buildRecos(score) {
    var m = score.metrics, seen = {};
    function add(product, priority, reason) {
      if (!seen[product] || priority < seen[product].priority) {
        seen[product] = { product: product, priority: priority, reason: reason };
      }
    }
    if (m.microbio_nonconforme) {
      add('viqua-ihs22-d4', 1, m.microbio_count + ' dépassement(s) bactériologique(s) sur l\'historique. Désinfection UV-C impérative.');
    }
    if (m.pfas_max && m.pfas_max > 0.05) {
      add('kinetico-k5-ro', 1, 'PFAS détectés (' + m.pfas_max.toFixed(3) + ' µg/L). Réglementation 01/2026 : limite 0,1 µg/L.');
    }
    if (m.plomb_max && m.plomb_max > 3) {
      add('kinetico-k5-ro', m.plomb_max > 10 ? 1 : 2,
        'Plomb mesuré à ' + m.plomb_max.toFixed(1) + ' µg/L. Osmose inverse au point de soutirage cuisine.');
    }
    if (m.nitrates_max && m.nitrates_max > 30) {
      add('kinetico-k5-ro', m.nitrates_max > 50 ? 1 : 2,
        'Nitrates à ' + m.nitrates_max.toFixed(1) + ' mg/L (limite 50). Osmose inverse pour l\'eau de boisson.');
    }
    if (m.pesticides_nonconforme || (m.pesticides_max_individuel && m.pesticides_max_individuel > 0.05)) {
      add('cab-charbon', 2, 'Pesticides détectés. Filtration charbon actif densifié certifiée NSF 53.');
    }
    var durete = m.durete_moy;
    if (!durete && m.conductivite_moy) durete = m.conductivite_moy / 40;
    if (durete) {
      if (durete > 35) add('kinetico-q850-od', 1, 'Eau très dure (' + durete.toFixed(1) + ' °f). Entartrage rapide, peau sèche.');
      else if (durete > 25) add('kinetico-s250-xp', 2, 'Eau dure (' + durete.toFixed(1) + ' °f). Adoucisseur bi-réservoir Kinetico.');
      else if (durete > 15) add('kinetico-s150-xp', 3, 'Eau moyennement dure (' + durete.toFixed(1) + ' °f).');
    }
    if (m.thm_max && m.thm_max > 30) {
      add('cab-charbon', 3, 'Sous-produits de chloration (THM ' + m.thm_max.toFixed(0) + ' µg/L). Charbon actif.');
    }
    return Object.values(seen).sort(function (a, b) { return a.priority - b.priority; });
  }

  function buildVerdict(score, commune) {
    var dangers = score.params.filter(function (p) { return p.status === 'danger'; });
    var v = '';
    if (score.global >= 90)      v = "L'eau du robinet à " + commune.nom + " est de <strong>très bonne qualité globale</strong>. ";
    else if (score.global >= 75) v = "L'eau du robinet à " + commune.nom + " est de <strong>bonne qualité</strong>, conforme aux normes sanitaires. ";
    else if (score.global >= 50) v = "L'eau du robinet à " + commune.nom + " est <strong>conforme aux limites sanitaires</strong> mais présente des paramètres de confort à surveiller. ";
    else if (score.global >= 25) v = "L'eau du robinet à " + commune.nom + " présente <strong>plusieurs points de vigilance sanitaires</strong>. ";
    else                         v = "L'eau du robinet à " + commune.nom + " présente <strong>des dépassements réglementaires significatifs</strong>. ";
    if (dangers.length > 0) {
      v += 'Dépassements : ' + dangers.slice(0, 3).map(function (d) { return d.name; }).join(', ') + '. ';
    }
    if (score.sub.microbio >= 90 && score.global >= 75) v += 'Aucune anomalie bactériologique récente.';
    if (score.sub.microbio < 90) v += '<strong style="color:#DC2626">Vigilance bactériologique requise.</strong>';
    return v;
  }

  // ---------- RENDU ----------
  function renderShell(root) {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    root.innerHTML = ''
      + '<div class="aw-wrap" id="aw-w">'
      + '  <div class="aw-search">'
      + '    <h3 class="aw-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg> Qualité de l\'eau de votre commune</h3>'
      + '    <div class="aw-row">'
      + '      <div class="aw-iw">'
      + '        <svg class="aw-iicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>'
      + '        <input id="aw-input" class="aw-input" type="text" placeholder="Nom de commune ou code postal" autocomplete="off">'
      + '        <div id="aw-sug" class="aw-sug"></div>'
      + '      </div>'
      + '      <button id="aw-go" class="aw-btn">Analyser <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg></button>'
      + '    </div>'
      + '    <div class="aw-quick">'
      + '      <span>Essais rapides :</span>'
      + '      <button class="aw-qb" data-code="54395" data-name="Nancy">Nancy</button>'
      + '      <button class="aw-qb" data-code="57463" data-name="Metz">Metz</button>'
      + '      <button class="aw-qb" data-code="57002" data-name="Aboncourt">Aboncourt</button>'
      + '      <button class="aw-qb" data-code="75056" data-name="Paris">Paris</button>'
      + '      <button class="aw-qb" data-code="13055" data-name="Marseille">Marseille</button>'
      + '    </div>'
      + '  </div>'
      + '  <div class="aw-body" id="aw-body">'
      + '    <div class="aw-empty"><div class="aw-empty-i">~</div><div>Tapez le nom d\'une commune ou un code postal,<br>ou choisissez un exemple ci-dessus.</div></div>'
      + '  </div>'
      + '  <div class="aw-foot">'
      + '    <div>Données ARS via <strong>Hub\'Eau</strong> · Min. Santé / SISE-Eaux · Licence Etalab 2.0</div>'
      + '    <div>Aqua Water Score™ v0.2 · ' + new Date().toISOString().slice(0,7).replace('-','.') + '</div>'
      + '  </div>'
      + '</div>';

    STATE.el.input = $('aw-input');
    STATE.el.go    = $('aw-go');
    STATE.el.sug   = $('aw-sug');
    STATE.el.body  = $('aw-body');
    wireSearch();
    wireQuickButtons();
  }

  function renderLoading(msg) {
    STATE.el.body.innerHTML = '<div class="aw-load"><div class="aw-spin"></div>' + (msg || 'Récupération des analyses…') + '</div>';
  }

  function renderResult() {
    var commune = STATE.currentCommune;
    var bulletin = STATE.currentBulletin;
    var history = STATE.currentRawData; // grouped
    var displayMode = STATE.displayMode;
    var historyMode = STATE.historyMode;

    var paramsData = buildParams(bulletin, history, displayMode, historyMode);
    var score = computeScore(paramsData);
    STATE.currentScore = score;

    var verdict = buildVerdict(score, commune);
    var recos = buildRecos(score);
    var udi = STATE.currentUdi || [];

    var bulletinDate = bulletin ? fmtDate(bulletin.date) : '—';
    var bulletinReseau = bulletin && bulletin.reseau ? bulletin.reseau : '—';
    var bulletinCount = bulletin ? bulletin.analyses.length : 0;

    var totalAnalyses = 0;
    for (var p in history) totalAnalyses += history[p].length;

    var circ = 2 * Math.PI * 75;
    var off  = circ * (1 - score.global / 100);

    var subList = [
      { k:'microbio', label:'Sécurité microbio.' },
      { k:'chimique', label:'Polluants chimiques' },
      { k:'metaux', label:'Métaux & plomberie' },
      { k:'emergent', label:'Polluants émergents' },
      { k:'confort', label:'Confort & goût' }
    ];

    var cats = {
      microbio: { label:'Microbiologie', params:[] },
      chimique: { label:'Substances chimiques sanitaires', params:[] },
      metaux:   { label:'Métaux & plomberie', params:[] },
      emergent: { label:'Polluants émergents (PFAS, BPA…)', params:[] },
      confort:  { label:'Confort, goût et indicateurs', params:[] }
    };
    for (var pi = 0; pi < score.params.length; pi++) {
      if (cats[score.params[pi].cat]) cats[score.params[pi].cat].params.push(score.params[pi]);
    }

    var html = '';

    // HERO
    html += '<div class="aw-hero">';
    html += '  <div class="aw-gauge">';
    html += '    <svg viewBox="0 0 168 168"><circle class="aw-gtrack" cx="84" cy="84" r="75"></circle>';
    html += '    <circle class="aw-gfill" id="aw-gfill" cx="84" cy="84" r="75" style="stroke:' + score.letterColor + ';stroke-dasharray:' + circ + ';stroke-dashoffset:' + circ + '"></circle></svg>';
    html += '    <div class="aw-gc"><div class="aw-gn" id="aw-gn">0</div><div class="aw-gm">/ 100</div></div>';
    html += '    <div class="aw-letter" style="background:' + score.letterColor + '">' + score.letter + '</div>';
    html += '  </div>';
    html += '  <div>';
    html += '    <h2 class="aw-cn">' + commune.nom + '</h2>';
    html += '    <div class="aw-cm">';
    html += '      <span>📍 ' + (commune.codeDepartement || '') + ' · ' + commune.code + '</span>';
    if (udi && udi.length) html += '<span>💧 ' + udi.length + ' UDI' + (udi.length > 1 ? 's' : '') + '</span>';
    html += '    </div>';
    html += '    <div class="aw-verdict">' + verdict + '</div>';
    html += '    <div style="margin-top:12px;font-size:13px;color:#64748B"><strong style="color:#0A1F44">' + score.letterDesc + '</strong></div>';
    html += '  </div>';
    html += '</div>';

    // INFO BULLETIN
    if (displayMode === 'bulletin') {
      html += '<div class="aw-bull-info">';
      html += '📋 <strong>Bulletin du ' + bulletinDate + '</strong> · Réseau : ' + bulletinReseau + ' · ' + bulletinCount + ' paramètres mesurés.';
      html += '<br><span style="font-size:11px;opacity:.8">Source : Min. Santé/ARS — identique à <a href="https://orobnat.sante.gouv.fr" target="_blank" style="color:#1E3A8A">orobnat.sante.gouv.fr</a></span>';
      html += '</div>';
    } else {
      var modeNames = { avg: 'Moyenne', max: 'Maximum', median: 'Médiane', count: 'Nb dépassements' };
      html += '<div class="aw-bull-info">';
      html += '📊 <strong>Historique 4 ans</strong> (depuis 01/2022) · ' + modeNames[historyMode] + ' sur ' + totalAnalyses + ' analyses · ' + Object.keys(history).length + ' paramètres suivis.';
      html += '</div>';
    }

    // Mode toggle (Bulletin / Historique)
    html += '<div class="aw-mode">';
    html += '  <button class="aw-mode-btn ' + (displayMode === 'bulletin' ? 'active' : '') + '" data-mode="bulletin">📋 Dernier bulletin</button>';
    html += '  <button class="aw-mode-btn ' + (displayMode === 'history' ? 'active' : '') + '" data-mode="history">📊 Historique 4 ans</button>';
    html += '</div>';

    // History sub-mode (visible only in history mode)
    if (displayMode === 'history') {
      html += '<div class="aw-mode-hist">';
      html += '  <span class="aw-mode-hist-lbl">AGRÉGATION :</span>';
      html += '  <button class="aw-mode-hist-btn ' + (historyMode === 'avg' ? 'active' : '') + '" data-hmode="avg">Moyenne</button>';
      html += '  <button class="aw-mode-hist-btn ' + (historyMode === 'median' ? 'active' : '') + '" data-hmode="median">Médiane</button>';
      html += '  <button class="aw-mode-hist-btn ' + (historyMode === 'max' ? 'active' : '') + '" data-hmode="max">Maximum</button>';
      html += '  <button class="aw-mode-hist-btn ' + (historyMode === 'count' ? 'active' : '') + '" data-hmode="count">Nb dépass.</button>';
      html += '</div>';
    }

    // SUB-SCORES
    html += '<div class="aw-subs">';
    for (var sb = 0; sb < subList.length; sb++) {
      var val = score.sub[subList[sb].k];
      var c = val >= 75 ? '#16A34A' : val >= 50 ? '#CA8A04' : val >= 25 ? '#EA580C' : '#DC2626';
      html += '<div class="aw-sub"><div class="aw-sl">' + subList[sb].label + '</div>';
      html += '<div class="aw-sv" style="color:' + c + '">' + val + '<span style="font-size:13px;color:#94A3B8">/100</span></div>';
      html += '<div class="aw-sb"><div class="aw-sbf" style="width:' + val + '%;background:' + c + '"></div></div></div>';
    }
    html += '</div>';

    // ACTIONS
    html += '<div class="aw-actions">';
    html += '<button class="aw-btn aw-btn2" id="aw-pdf"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg> Télécharger le rapport PDF</button>';
    html += '<button class="aw-btn aw-btn2" id="aw-share"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Partager</button>';
    html += '</div>';

    // PARAMS
    for (var ck in cats) {
      if (!cats[ck].params.length) continue;
      html += '<div class="aw-params">';
      html += '<div class="aw-ph"><h3>' + cats[ck].label + '</h3><span class="aw-pc">' + cats[ck].params.length + ' paramètre' + (cats[ck].params.length > 1 ? 's' : '') + '</span></div>';
      var sorted = cats[ck].params.sort(function (a, b) {
        var o = { danger:0, warn:1, caution:2, good:3 };
        return (o[a.status] || 9) - (o[b.status] || 9);
      });
      for (var sx = 0; sx < sorted.length; sx++) {
        var pa = sorted[sx];
        var limTxt = pa.limit != null ? 'Limite ' + fmtNum(pa.limit) :
                     (pa.ref != null ? 'Réf. ' + fmtNum(pa.ref) :
                      (pa.limitMin != null ? pa.limitMin + '–' + pa.limitMax : '—'));
        html += '<div class="aw-pr">';
        html += '<div class="aw-pr-main">';
        html += '<div class="aw-pdot" style="background:' + statusColor(pa.status) + '"></div>';
        html += '<div><div class="aw-pn">' + pa.name + '</div><div class="aw-pd">' + pa.desc;
        if (pa.nbDepassement > 0) {
          html += ' · <button class="aw-pexp-tgl" data-toggle="exp-' + pa.code + '">⚠️ ' + pa.nbDepassement + ' dépassement' + (pa.nbDepassement > 1 ? 's' : '') + ' — voir détails</button>';
        }
        html += '</div></div>';
        html += '<div class="aw-pv">' + pa.displayValue + '</div>';
        html += '<div class="aw-pl">' + limTxt + '</div>';
        html += '</div>';
        // Bloc dépassements
        if (pa.depassements && pa.depassements.length > 0) {
          html += '<div class="aw-pexp" id="exp-' + pa.code + '">';
          html += '<strong>' + pa.nbDepassement + ' dépassement' + (pa.nbDepassement > 1 ? 's' : '') + ' historique' + (pa.nbDepassement > 1 ? 's' : '') + ' :</strong>';
          html += '<ul>';
          var listD = pa.depassements.slice(0, 8);
          for (var ld = 0; ld < listD.length; ld++) {
            var d = listD[ld];
            html += '<li>' + fmtDate(d.date) + ' : ' + fmtNum(d.valeur) + ' ' + (d.unite || pa.unit);
            if (d.udi) html += ' <span style="color:#94A3B8">(' + d.udi + ')</span>';
            html += '</li>';
          }
          if (pa.depassements.length > 8) html += '<li style="color:#94A3B8">… et ' + (pa.depassements.length - 8) + ' autres</li>';
          html += '</ul></div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }

    // PESTICIDES
    if (score.pesticides.length > 0) {
      html += '<div class="aw-params">';
      html += '<div class="aw-ph"><h3>Pesticides détectés</h3><span class="aw-pc">' + score.pesticides.length + ' mesure' + (score.pesticides.length > 1 ? 's' : '') + '</span></div>';
      var pestSorted = score.pesticides.slice(0, 12);
      for (var px = 0; px < pestSorted.length; px++) {
        var pe = pestSorted[px];
        var pcl = pe.conformite === 'N' ? '#DC2626' : (pe.valeur > 0.05 ? '#CA8A04' : '#16A34A');
        html += '<div class="aw-pr"><div class="aw-pr-main">';
        html += '<div class="aw-pdot" style="background:' + pcl + '"></div>';
        html += '<div><div class="aw-pn">' + pe.nom + '</div><div class="aw-pd">' + fmtDate(pe.date) + '</div></div>';
        html += '<div class="aw-pv">' + fmtNum(pe.valeur, 3) + ' ' + pe.unite + '</div>';
        html += '<div class="aw-pl">Limite 0.1 ' + pe.unite + '</div>';
        html += '</div></div>';
      }
      html += '</div>';
    }

    // RECOS
    if (recos.length > 0) {
      html += '<h3 style="font-size:18px;font-weight:600;color:#0A1F44;margin:32px 0 14px;letter-spacing:-.01em">→ Solutions recommandées</h3>';
      var palette = ['#06B6D4', '#0EA5E9', '#6366F1'];
      for (var rx = 0; rx < recos.length; rx++) {
        var rr = recos[rx], prod = PRODUITS[rr.product];
        var pcol = palette[rx] || '#94A3B8';
        html += '<div class="aw-reco"><div class="aw-rp" style="background:' + pcol + '"></div>';
        html += '<div class="aw-rb"><div>';
        html += '<div class="aw-rm"><strong>' + prod.family + '</strong><span>· Priorité ' + rr.priority + '</span></div>';
        html += '<div class="aw-rn">' + prod.name + '</div>';
        html += '<div class="aw-rr">' + rr.reason + '</div>';
        html += '<div class="aw-certs">';
        for (var cc = 0; cc < prod.certs.length; cc++) html += '<span class="aw-cert">' + prod.certs[cc] + '</span>';
        html += '</div></div>';
        html += '<button class="aw-btn" data-scroll="lead">Demander un devis →</button>';
        html += '</div></div>';
      }
    }

    // LEAD FORM
    html += '<div class="aw-lead" id="aw-lead">';
    html += '<div class="aw-lt">Vous souhaitez <em>une analyse approfondie</em><br>par un expert Aqua Purify ?</div>';
    html += '<div class="aw-ls">Diagnostic offert à domicile · Test physique (TH, pH, fer) · Devis sous 48 h. Réseau Premier Cercle.</div>';
    html += '<form class="aw-lf" id="aw-leadform">';
    html += '<input class="aw-li" type="text" name="name" placeholder="Votre nom" required>';
    html += '<input class="aw-li" type="email" name="email" placeholder="Votre e-mail" required>';
    html += '<button class="aw-lb" type="submit">Être contacté →</button>';
    html += '</form>';
    html += '<div class="aw-disc">Les recommandations sont des suggestions techniques générées à partir des données ARS / Hub\'Eau et ne se substituent pas à un diagnostic professionnel. Données traitées conformément au RGPD.</div>';
    html += '</div>';

    STATE.el.body.innerHTML = html;

    // Animation gauge
    requestAnimationFrame(function () {
      var fill = $('aw-gfill');
      if (fill) fill.style.strokeDashoffset = off;
      animateNum($('aw-gn'), score.global, 1100);
    });

    // Listeners
    $('aw-pdf').addEventListener('click', function () { generatePDF(score, commune, displayMode, historyMode); });
    $('aw-share').addEventListener('click', function () {
      var txt = 'Score qualité de l\'eau à ' + commune.nom + ' : ' + score.global + '/100 (' + score.letter + ')';
      if (navigator.share) navigator.share({ title:'Aqua Water Score', text: txt, url: location.href });
      else { navigator.clipboard.writeText(txt + ' — ' + location.href); alert('Lien copié'); }
    });

    // Mode buttons
    var modeBtns = STATE.el.body.querySelectorAll('.aw-mode-btn');
    for (var mb = 0; mb < modeBtns.length; mb++) {
      (function (b) {
        b.addEventListener('click', function () {
          STATE.displayMode = b.dataset.mode;
          renderResult();
        });
      })(modeBtns[mb]);
    }
    var histBtns = STATE.el.body.querySelectorAll('.aw-mode-hist-btn');
    for (var hb = 0; hb < histBtns.length; hb++) {
      (function (b) {
        b.addEventListener('click', function () {
          STATE.historyMode = b.dataset.hmode;
          renderResult();
        });
      })(histBtns[hb]);
    }

    // Expand toggles
    var expBtns = STATE.el.body.querySelectorAll('.aw-pexp-tgl');
    for (var eb = 0; eb < expBtns.length; eb++) {
      (function (b) {
        b.addEventListener('click', function () {
          var target = $(b.dataset.toggle);
          if (target) target.classList.toggle('show');
        });
      })(expBtns[eb]);
    }

    // Lead CTA scroll
    var ctaBtns = STATE.el.body.querySelectorAll('[data-scroll="lead"]');
    for (var bx = 0; bx < ctaBtns.length; bx++) {
      ctaBtns[bx].addEventListener('click', function () {
        var lead = $('aw-lead'); if (lead) lead.scrollIntoView({ behavior: 'smooth' });
      });
    }
    // Lead submit
    $('aw-leadform').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var data = {
        name: f.name.value, email: f.email.value,
        commune_insee: commune.code, commune_nom: commune.nom,
        score: score.global, letter: score.letter,
        recos: recos.map(function (r) { return r.product; }),
        timestamp: new Date().toISOString(), source: 'widget-fr-v0.2'
      };
      if (STATE.config.webhook) {
        fetch(STATE.config.webhook, {
          method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(data)
        }).catch(function (err) { console.warn('Webhook error', err); });
      }
      console.log('AQUA LEAD →', data);
      f.outerHTML = '<div class="aw-success">✓ Merci ' + data.name + ', votre demande est enregistrée. Un conseiller Aqua Purify vous recontacte sous 24 h ouvrées.</div>';
    });
  }

  function animateNum(node, target, duration) {
    if (!node) return;
    var start = performance.now();
    function tick(now) {
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      node.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------- PDF ----------
  function generatePDF(score, commune, displayMode, historyMode) {
    if (typeof window.jspdf !== 'undefined') { doPdf(score, commune, displayMode, historyMode); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload = function () { doPdf(score, commune, displayMode, historyMode); };
    s.onerror = function () { alert('Impossible de charger le générateur PDF.'); };
    document.head.appendChild(s);
  }
  function doPdf(score, commune, displayMode, historyMode) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit:'mm', format:'a4' });
    var W = 210, M = 18, y = M;
    doc.setFillColor(10, 31, 68);
    doc.rect(0, 0, W, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica','bold').setFontSize(11);
    doc.text('AQUA PURIFY · RAPPORT QUALITÉ DE L\'EAU', M, 14);
    doc.setFont('helvetica','normal').setFontSize(9).setTextColor(180, 200, 220);
    var modeTxt = displayMode === 'bulletin' ? 'Dernier bulletin ARS' : 'Historique 4 ans · ' + historyMode;
    doc.text('Émis le ' + new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) + ' · ' + modeTxt + ' · Source Hub\'Eau/SISE-Eaux', M, 21);
    doc.setTextColor(103, 232, 249).setFontSize(20).setFont('helvetica','bold');
    doc.text(commune.nom, M, 32);

    y = 50;
    var rgb = hexToRgb(score.letterColor);
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.roundedRect(M, y, 50, 50, 3, 3, 'F');
    doc.setTextColor(255).setFontSize(36).setFont('helvetica','bold');
    doc.text(String(score.global), M + 25, y + 24, { align:'center' });
    doc.setFontSize(8).setFont('helvetica','normal');
    doc.text('/ 100', M + 25, y + 32, { align:'center' });
    doc.setFontSize(20).setFont('helvetica','bold');
    doc.text(score.letter, M + 25, y + 44, { align:'center' });

    doc.setTextColor(10, 31, 68).setFontSize(14).setFont('helvetica','bold');
    doc.text('Score Aqua Water™ : ' + score.letterDesc, M + 60, y + 12);
    doc.setFontSize(9).setFont('helvetica','normal').setTextColor(80, 90, 110);
    var verdict = buildVerdict(score, commune).replace(/<[^>]+>/g, '');
    doc.text(doc.splitTextToSize(verdict, W - M - 60 - M), M + 60, y + 20);

    y += 60;
    doc.setTextColor(10, 31, 68).setFontSize(11).setFont('helvetica','bold');
    doc.text('PARAMÈTRES MESURÉS', M, y); y += 7;
    doc.setFontSize(8).setTextColor(150);
    doc.text('Paramètre', M, y);
    doc.text('Valeur', M + 80, y);
    doc.text('Limite/Réf.', M + 140, y);
    doc.text('Statut', M + 170, y);
    y += 2; doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 4;

    var sorted = score.params.slice().sort(function (a, b) {
      var o = { danger:0, warn:1, caution:2, good:3 };
      return (o[a.status] || 9) - (o[b.status] || 9);
    }).slice(0, 30);

    doc.setTextColor(60);
    for (var sp = 0; sp < sorted.length; sp++) {
      if (y > 270) { doc.addPage(); y = M; }
      var pp = sorted[sp];
      doc.setFont('helvetica','normal').setFontSize(8).setTextColor(60);
      doc.text(pp.name, M, y);
      doc.text(pp.displayValue || '—', M + 80, y);
      var lt = pp.limit != null ? String(pp.limit) : (pp.ref != null ? String(pp.ref) : (pp.limitMin != null ? pp.limitMin + '-' + pp.limitMax : '—'));
      doc.text(lt, M + 140, y);
      var col2 = hexToRgb(statusColor(pp.status));
      doc.setTextColor(col2[0], col2[1], col2[2]);
      var stt = pp.status === 'good' ? 'OK' : pp.status === 'caution' ? 'À surveiller' : pp.status === 'warn' ? 'Limite' : 'Dépassement';
      doc.text(stt, M + 170, y);
      doc.setTextColor(60);
      y += 5;
    }

    doc.addPage(); y = M;
    doc.setFontSize(11).setFont('helvetica','bold').setTextColor(10, 31, 68);
    doc.text('MÉTHODOLOGIE ET LIMITES', M, y); y += 8;
    doc.setFontSize(9).setFont('helvetica','normal').setTextColor(60);
    var txt = "Le présent rapport est généré à partir des données publiques Hub'Eau (Min. Santé / SISE-Eaux, Licence Etalab 2.0), identiques à celles affichées sur orobnat.sante.gouv.fr.\n\nMode d'affichage : " + (displayMode === 'bulletin' ? 'Dernier bulletin de prélèvement ARS (une date, un point de mesure). Idéal pour aligner avec l\'affichage officiel sante.gouv.fr.' : 'Historique 4 ans avec agrégation ' + historyMode + '. Permet de détecter les tendances et anomalies.') + "\n\nMicrobiologie : les valeurs sont affichées en comptage entier (jamais de moyenne). 'Limite 0' signifie qu'aucune bactérie indicatrice ne doit être détectée. '<1' signifie absence détectée par la méthode utilisée.\n\nMéthodologie scoring : pondération limites × 3, références × 1, microbio = veto. Sous-scores : Microbio (30%), Chimique (30%), Métaux (15%), Confort (15%), Émergents (10%).\n\nDisclaimer : les recommandations produits sont des suggestions techniques basées sur les paramètres détectés et ne constituent pas un diagnostic professionnel. Aqua Purify ne saurait être tenu responsable d'une décision prise sur la seule base de cet outil. Pour un diagnostic complet incluant l'analyse de votre plomberie, votre profil d'usage et un test physico-chimique sur site, prenez rendez-vous avec un expert Aqua Purify.";
    doc.text(doc.splitTextToSize(txt, W - 2 * M), M, y);

    doc.save('aqua-water-score-' + commune.nom.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.pdf');
  }

  // ---------- INPUTS ----------
  function wireSearch() {
    var input = STATE.el.input, sug = STATE.el.sug, btn = STATE.el.go, timer = null;
    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(timer);
      if (q.length < 2) { sug.classList.remove('show'); return; }
      timer = setTimeout(function () {
        searchCommunes(q).then(function (list) {
          STATE.lastSuggestions = list;
          if (!list.length) { sug.classList.remove('show'); return; }
          var html = '';
          for (var i = 0; i < list.length; i++) {
            var c = list[i];
            var cp = (c.codePostal && c.codePostal.length) ? c.codePostal[0] + ' · ' : '';
            var pop = c.population ? c.population.toLocaleString('fr-FR') + ' hab.' : '';
            html += '<div class="aw-sugi" data-i="' + i + '"><div><div style="font-weight:500">' + c.nom + '</div><div style="font-size:11px;color:#94A3B8">' + cp + c.codeDepartement + (pop ? ' · ' + pop : '') + '</div></div><div class="aw-sugm">' + c.code + '</div></div>';
          }
          sug.innerHTML = html;
          sug.classList.add('show');
          var items = sug.querySelectorAll('.aw-sugi');
          for (var k = 0; k < items.length; k++) {
            (function (it) {
              it.addEventListener('mousedown', function () {
                var c = STATE.lastSuggestions[parseInt(it.dataset.i, 10)];
                input.value = c.nom;
                sug.classList.remove('show');
                analyze(c);
              });
            })(items[k]);
          }
        }).catch(function () {});
      }, 250);
    });
    input.addEventListener('blur', function () { setTimeout(function () { sug.classList.remove('show'); }, 200); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); btn.click(); } });
    btn.addEventListener('click', function () {
      var q = input.value.trim(); if (!q) return;
      if (STATE.lastSuggestions.length > 0) { analyze(STATE.lastSuggestions[0]); sug.classList.remove('show'); return; }
      searchCommunes(q).then(function (list) { if (list.length) analyze(list[0]); });
    });
  }

  function wireQuickButtons() {
    var btns = document.querySelectorAll('.aw-qb');
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.addEventListener('click', function () {
          var c = { code: b.dataset.code, nom: b.dataset.name, codeDepartement: b.dataset.code.slice(0, 2) };
          STATE.el.input.value = b.dataset.name;
          analyze(c);
        });
      })(btns[i]);
    }
  }

  // ---------- ANALYSE FLOW ----------
  function analyze(commune) {
    renderLoading('Récupération des analyses Hub\'Eau pour ' + commune.nom + '…');
    Promise.all([ fetchAnalyses(commune.code), fetchUdi(commune.code) ])
      .then(function (results) {
        var raw = results[0], udi = results[1];
        if (!raw || !raw.length) {
          STATE.el.body.innerHTML = '<div class="aw-empty"><div class="aw-empty-i">∅</div><div>Aucune analyse Hub\'Eau disponible pour <strong>' + commune.nom + '</strong>.</div></div>';
          return;
        }
        STATE.currentCommune = commune;
        STATE.currentBulletin = extractLatestBulletin(raw);
        STATE.currentRawData = aggregateHistory(raw);
        STATE.currentUdi = udi;
        STATE.displayMode = 'bulletin';
        STATE.historyMode = 'avg';
        renderResult();
      })
      .catch(function (err) {
        console.error('Aqua widget error:', err);
        STATE.el.body.innerHTML = '<div class="aw-empty"><div class="aw-empty-i" style="color:#DC2626">!</div><div>Erreur de récupération des données.<br><span style="font-size:12px;color:#94A3B8">' + (err.message || 'Inconnue') + '</span></div></div>';
      });
  }

  // ---------- INIT ----------
  function init() {
    var root = null;
    for (var i = 0; i < CONTAINER_IDS.length; i++) {
      root = document.getElementById(CONTAINER_IDS[i]);
      if (root) break;
    }
    if (!root) {
      console.warn('[Aqua Water Score] Conteneur introuvable.');
      return;
    }
    STATE.config = {
      commune: root.getAttribute('data-commune'),
      webhook: root.getAttribute('data-webhook') || null,
      cta: root.getAttribute('data-cta') || 'Demander un devis'
    };
    renderShell(root);
    if (STATE.config.commune) {
      var c = { code: STATE.config.commune, nom: 'Commune ' + STATE.config.commune, codeDepartement: STATE.config.commune.slice(0, 2) };
      fetch(GEO_BASE + '/' + STATE.config.commune + '?fields=code,nom,codeDepartement,population')
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.code) analyze(j); else analyze(c); })
        .catch(function () { analyze(c); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
