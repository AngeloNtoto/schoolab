# Changelog - Schoolab

Toutes les modifications notables de ce projet sont documentées ici.

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
