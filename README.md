# Aqua Water Score™ France — Widget Hub'Eau

Widget JavaScript embarquable pour Aqua Purify : interroge l'API **Hub'Eau** (Ministère de la Santé, SISE-Eaux), calcule un score de qualité vulgarisé pour n'importe quelle commune française, et recommande la solution **Kinetico** ou **Viqua** adaptée.

📍 Couverture : ~35 000 communes France métropolitaine et DOM
📊 Paramètres : nitrates, plomb, pesticides, PFAS, bisphénol A, dureté, microbiologie, métaux lourds, et plus
📜 Réglementation : arrêté 11/01/2007 modifié + directive UE 2020/2184 (transposition janvier 2026)

---

## 🚀 Intégration rapide

### Option 1 — Script tag via jsDelivr (recommandé)

```html
<div id="aqua-water-score"></div>
<script src="https://cdn.jsdelivr.net/gh/MaxSolinas/aqua-water-score-fr@main/widget.js" defer></script>
```

### Option 2 — Pré-rempli avec commune INSEE

```html
<div id="aqua-water-score"
     data-commune="54395"
     data-webhook="https://n8n.pax-solinas.com/webhook/aqua-lead"></div>
<script src="https://cdn.jsdelivr.net/gh/MaxSolinas/aqua-water-score-fr@main/widget.js" defer></script>
```

### Option 3 — iframe (pour partenaires Premier Cercle)

```html
<iframe src="https://maxsolinas.github.io/aqua-water-score-fr/?c=54395"
        width="100%" height="900" frameborder="0"></iframe>
```

---

## 📦 Déploiement sur GitHub + jsDelivr

### 1. Créer le repo

```bash
cd ~/path/to/projects
git init aqua-water-score-fr
cd aqua-water-score-fr
# Copier widget.js, demo.html, index.html, README.md
git add .
git commit -m "feat: initial widget v0.1.0"
git branch -M main
git remote add origin https://github.com/MaxSolinas/aqua-water-score-fr.git
git push -u origin main
```

### 2. Activer GitHub Pages (pour l'iframe)

Settings → Pages → Branch : `main`, Folder : `/ (root)` → Save.
URL : `https://maxsolinas.github.io/aqua-water-score-fr/`

### 3. jsDelivr (automatique)

Aucune action nécessaire. Quelques minutes après le push :
```
https://cdn.jsdelivr.net/gh/MaxSolinas/aqua-water-score-fr@main/widget.js
```

### 4. Tag de version (recommandé en production)

```bash
git tag v0.1.0
git push origin v0.1.0
```

Puis utiliser :
```html
<script src="https://cdn.jsdelivr.net/gh/MaxSolinas/aqua-water-score-fr@v0.1.0/widget.js"></script>
```

### 5. Purger le cache jsDelivr après un update

```
https://purge.jsdelivr.net/gh/MaxSolinas/aqua-water-score-fr@main/widget.js
```

---

## ⚙️ Attributs `data-*`

| Attribut | Description | Exemple |
|---|---|---|
| `data-commune` | Code INSEE pour pré-remplir | `data-commune="54395"` |
| `data-webhook` | Endpoint n8n pour capture lead | `data-webhook="https://n8n.../webhook/lead"` |
| `data-cta` | Texte du bouton principal | `data-cta="Obtenir un devis"` |

---

## 🔌 Intégration n8n (lead capture)

Le widget POST le JSON suivant sur le webhook configuré :

```json
{
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "commune_insee": "54395",
  "commune_nom": "Nancy",
  "score": 78,
  "letter": "B",
  "recos": ["kinetico-s250-xp", "cab-charbon"],
  "timestamp": "2026-05-22T10:30:00.000Z",
  "source": "widget-fr-v0.1"
}
```

Workflow n8n suggéré :
```
[Webhook] → [Enrichir : geo.api.gouv.fr] → [Odoo crm.lead.create]
         → [Send Email Brevo] → [Slack notif #leads-fr]
```

---

## 🧪 Test local

```bash
# Servir le repo en local (Python)
python3 -m http.server 8080
# Ouvrir http://localhost:8080/demo.html
```

Ou avec Node :
```bash
npx serve .
```

---

## 📂 Structure du repo

```
aqua-water-score-fr/
├── widget.js        # Le widget complet (55 KB, vanilla JS)
├── index.html       # Page de production pour iframe (root /)
├── demo.html        # Page de démo avec contexte marketing
└── README.md        # Ce fichier
```

---

## 🔬 Méthodologie de scoring

- **Score global 0–100** + lettre A–E (A:90+, B:75-89, C:50-74, D:25-49, E:<25)
- **5 sous-scores** : Microbiologie · Chimique · Métaux & plomberie · Polluants émergents · Confort & goût
- **Pondération** :
  - Limite × 3 (sanitaire) — pénalité forte sur dépassement
  - Référence × 1 (confort) — pénalité douce
  - Microbio = **veto** : tout dépassement plombe le score
- **Profondeur** : analyses depuis le 1er janvier 2022 (≤ 5 000 enregistrements)

---

## ⚠️ Limites connues

1. **Plafond Hub'Eau 20 000 enregistrements** : pour Paris/Lyon/Marseille sur longues périodes, l'API se limite. Pas bloquant pour le score grand public.
2. **Délai MAJ Hub'Eau** : 30 à 60 jours entre prélèvement et publication.
3. **Communes sans données** : petites communes ou MAJ récente → message "Aucune analyse disponible".
4. **Recommandations** : suggestions techniques, **ne remplacent pas un diagnostic professionnel** (disclaimer dans le PDF généré).

---

## 📋 Conformité

- **RGPD** : aucun cookie, lead transmis uniquement sur consentement explicite via le formulaire.
- **Licence données** : Etalab Open License 2.0 (mention obligatoire affichée en footer du widget).
- **ACS** : seuls les produits avec ACS valide France sont recommandés. Migration vers certificat européen au 31/12/2026 (décret 2026-80).

---

## 🛣️ Roadmap

- [x] **v0.1** — MVP : widget vanilla JS, Hub'Eau, scoring 5 axes, recommandation Kinetico/Viqua, PDF, lead capture
- [ ] **v0.2** — Cache Cloudflare Worker pour limiter les appels Hub'Eau
- [ ] **v0.3** — Carte de qualité environnante (Leaflet)
- [ ] **v0.4** — Comparatif avec communes voisines / moyenne départementale
- [ ] **v0.5** — Mode dealer (login Premier Cercle, devis terrain)
- [ ] **v1.0** — App mobile React Native (lead capture + outil terrain)

---

## 📝 Licence

MIT — utilisation libre y compris commerciale.
Code © 2026 Aqua Purify S.à r.l.-S.
Données © Ministère de la Santé / SISE-Eaux — Licence Ouverte Etalab 2.0.

---

## 🆘 Support

- **Bug / feature** : ouvrir une issue sur GitHub
- **Intégration partenaire** : contact@aquapurify.lu
- **Données erronées** : signaler à l'ARS de la commune concernée (Hub'Eau est un miroir des bulletins ARS officiels)
