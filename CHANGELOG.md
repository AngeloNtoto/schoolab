# Changelog - Schoolab

Toutes les modifications notables de ce projet sont documentées ici.

---

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
