# Changelog - Schoolab

Toutes les modifications notables de ce projet sont documentées ici.

---

## [2.1.8] - 2026-06-29

### ✅ Impression et WebView2 (Windows)
- **Correctif (Marges matérielles)** : L'impression à marge `0` causait la troncature du côté gauche du coupon par l'imprimante (limite matérielle d'impression sans bordure). Une marge externe de sécurité de `5mm` a été ajoutée.
- **Amélioration (Conteneur)** : Le conteneur d'impression a été redimensionné (`print:w-full print:h-[286mm]`) pour absorber parfaitement cette nouvelle marge externe sans déclencher la création d'une page blanche supplémentaire.

---

## [2.1.7] - 2026-06-29

### ✅ Ajustements Layout Impression
- **Amélioration** : Refonte de l'en-tête central pour afficher le titre "COUPON DE L'ÉLÈVE" sur la même ligne que le nom, libérant ainsi un espace vertical précieux pour l'impression de classe.
- **Correctif** : Réduction de la largeur de la colonne `Branches` (de 27% à 22%) pour éviter de déborder de l'écran lors du calcul des largeurs sous Windows WebView2.

---

## [2.1.6] - 2026-06-29

### ✅ Impression et WebView2 (Windows)
- **Correctif (Bordures)** : Forçage explicite (`border: 1px solid black !important`) des bordures du tableau pour contrer le bug de disparition sous Windows WebView2 lors de l'impression.
- **Correctif (Troncature gauche)** : Résolution du bug WebView2 qui "mangeait" la première lettre des matières (`ranches` au lieu de `Branches`) dû à `table-layout: auto`. Le tableau est désormais verrouillé avec `table-fixed` et un `<colgroup>` strict.
- **UI (Cadre global)** : L'en-tête et le tableau sont maintenant fusionnés visuellement à l'intérieur d'un seul et même grand cadre global pour un rendu plus esthétique et officiel.

---

## [2.1.5] - 2026-06-29

### ✅ Impression et bulletins
- **Correctif (UI)** : Résolution du problème d'impression groupée où une page sur deux était blanche. Le moteur d'impression maintient désormais la hauteur strictement à 296mm pour éviter les débordements invisibles.
- **Refonte** : Restructuration de la mise en page des coupons de l'élève (bordure complète, alignement central parfait de l'en-tête de l'école).
- **Lisibilité** : Ajustement dynamique et optimisé de la taille des polices et de l'interligne pour maximiser la lisibilité des coupons annuels sur papier A4.
- **Correction** : Élargissement à 20% de la colonne des branches avec ellipsis propre pour éviter la coupure moche des matières trop longues.

---

## [2.1.4] - 2026-06-28

### ✅ Impression et bulletins
- **Mise en page adaptative** : Le système de rendu PDF pour le bulletin primaire et le coupon annuel s'ajuste dynamiquement au nombre de matières (tailles de polices et espacements).
- **Correction de débordement** : Les marges fixes massives du bas de page ont été remplacées par un système intelligent pour garantir que le document tienne toujours sur une seule page A4.
- **Aperçu fidèle** : Amélioration du rendu du coupon annuel pour bien remplir l'espace imparti sans être déformé.

## [2.1.3] - 2026-06-26

### ✅ Impression et bulletins
- Maintien de la page pleine pour éviter l'impression des en-têtes web indésirables tout en restaurant l'affichage des bordures extérieures des bulletins.
- Ajout d'un espacement interne (padding) pour aérer les bulletins lors de l'impression de classe, au primaire et aux humanités.

## [2.1.2] - 2026-06-20

### ✅ Impression et bulletins
- Amélioration de la mise en page des coupons et des bulletins pour un rendu plus compact et plus lisible.
- Réduction du volume des en-têtes du coupon sans sacrifier la lisibilité.
- Uniformisation du texte de `POURCENTAGE` et `PLACE` pour une meilleure lecture sur papier.

## [2.1.1] - 2026-06-19

### ✅ Améliorations utilisateur
- Correction du rendu des bulletins pour un affichage propre et stable en impression.
- Suppression de l'onglet de paramètres d'impression obsolète pour une interface plus claire.
- Nettoyage des réglages et stabilisation de la synchronisation.

## [2.1.0] - 2026-06-19

### 📝 Bulletins Professionnels
- **Encadrement unique** : Ajout d'un cadre global de 3px autour du bulletin (Primaire et Humanités) pour un rendu officiel soigné.
- **Optimisation de l'espace** : Réduction des marges internes et des padding pour rendre le bulletin plus compact lors de l'impression et limiter la consommation de papier.
- **Règles de coloration inversées** : Les notes en échec sont désormais mises en évidence (gras/italique) pour faciliter la lecture des résultats.

### 🔄 Nouveau système de Repêchage
- **Saisie en masse** : Introduction du `BulkRepechageModal` pour une saisie fluide de la classe entière.
- **Synchronisation temps réel** : Calcule automatique bidirectionnel entre la saisie des Points et des Pourcentages (%).
- **Ergonomie** : Intégration de l'action directement dans le menu contextuel de la grille (par matière).

### 🎨 Modernisation de l'UI
- Remplacement complet des popups natifs bloquants (`window.prompt`, `window.confirm`, `window.alert`) de la grille de notes par des **modals Toast élégants** et fluides.

### 🛠️ Corrections & Cloud Sync
- **Correction d'erreur Sync** : Résolution du plantage lors du *push sync* provoqué par des données vides (`Invalid column type Null`) via une normalisation (COALESCE) en amont.

---

## [1.7.0] - 2026-06-16

### 🎨 Nouveau Design (Workbench)
- **Refonte complète de l'interface** en mode Workbench (onglets, panneaux, explorateur latéral)
- **Palette de commandes** (Ctrl+Shift+P) avec design glassmorphism et animations fluides
- **Mode sombre** unifié sur tous les composants (modales, explorateur, grilles)
- **Welcome Screen** avec raccourcis rapides au démarrage

### 📊 Grille de Notes — Actions Avancées
- **Menu contextuel sur les en-têtes de colonnes** (clic droit sur P1, P2, Ex1, etc.) :
  - Mettre la note maximum à tous les élèves
  - Attribuer une note spécifique à toute la colonne
  - Vider complètement la colonne
  - Décaler les notes vers le haut / vers le bas
- **Menu contextuel sur les noms de cours** (clic droit sur le nom de la matière) :
  - Vider toutes les notes de toutes les périodes pour ce cours
- **Sélection multiple de colonnes** avec CTRL+clic sur les en-têtes de périodes
- **Actions de masse sur sélection de cellules** (clic droit sur une sélection) :
  - Vider la sélection
  - Attribuer une note à toutes les cellules sélectionnées
  - Décaler la sélection vers le haut / vers le bas
- **Copier-coller global** (Ctrl+C / Ctrl+V) avec gestion intelligente du collage multiple
- **Raccourcis de saisie** : `T` pour tricheur (zéro), `M2` pour moitié du maximum

### 🗂️ Explorateur de Classes
- **Menu contextuel complet** : clic droit sur les dossiers (créer une classe) et sur les classes (modifier / supprimer)
- **Sélection multiple** avec CTRL+clic pour gérer plusieurs classes à la fois
- **Suppression en masse** des classes sélectionnées
- **Arborescence avancée** : regroupement par année scolaire, option et niveau

### 🖨️ Impression & Rapports
- **Bulletins scolaires** intégrés dans le workbench avec couleurs personnalisables
- **Palmarès** avec calculs de rangs et moyennes
- **Prédicteur de notes (IA)** avec filtres combinables et jauge de confiance
- **Voir Bureau** : aperçu de la disposition des places

### 🛡️ Stabilité & Corrections
- Protection contre les crashes quand les props sont absentes (Bulletin, Palmarès, ClassCoupons)
- Correction des erreurs TypeError liées à `classInfo` et aux services de base de données
- Gestion gracieuse du redémarrage d'onglets avec données perdues
- Hot-reload des panneaux sans perte de contexte

### ⚙️ Macros & Automatisation
- **Service de macros** pour créer et exécuter des actions automatisées
- Support des variables contextuelles dans les macros
- Sécurité renforcée pour les macros destructives (confirmation obligatoire)

---

## [1.4.30] - Version précédente
- Version de base de la branche editor-upgrade avant les améliorations majeures

## [1.1.3] - master
- Version stable de production sur la branche master
