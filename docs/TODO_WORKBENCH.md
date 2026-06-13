# To-Do List : Transformation de Schoolab en Workbench

Ce document suit les étapes du `plan-transformation-workbench.md` pour transformer Schoolab en un véritable éditeur Desktop.

## Phase 0 : Fondations et sécurisation
- [x] Créer `docs/architecture.md`
- [x] Créer `docs/workbench-rfc.md`
- [x] Lister les actions métier existantes
- [x] Lister les écrans convertibles en documents (onglets)
- [x] Ajouter des tests minimaux sur les services critiques (ex: `gradeService.updateGrade`, `studentService.importStudents`, etc.)
- [x] Implémenter les conventions (tout changement passe par une action, pas de SQL direct dans les composants)
- [x] Nettoyer le `README` (ou séparer le contenu non lié à Schoolab)

## Phase 1 : Command Registry et Palette (Sprint 1)
- [x] Créer le fichier `src/renderer/workbench/commandRegistry.ts`
- [x] Créer `WorkbenchProvider.tsx` et l'ajouter dans `App.tsx`
- [x] Créer le composant `CommandPalette.tsx`
- [x] Ajouter le raccourci global `Ctrl+K` pour ouvrir la palette
- [x] Enregistrer les commandes de base (ouvrir le dashboard, les notes, les paramètres, etc.)
- [x] Remplacer les boutons d'actions principaux dans l'UI par des appels à `runCommand`
- [x] Implémenter la recherche rapide de classes et d'élèves dans la palette

## Phase 2 : Workbench Shell
- [x] Créer le composant global `WorkbenchShell.tsx`
- [x] Ajouter la barre d'onglets (`TabBar.tsx`)
- [x] Créer le gestionnaire de documents (Document Registry)
- [x] Convertir les pages actuelles en "Documents" ouvrables dans des onglets (`ClassDocument`, `NotesDocument`, `SettingsDocument`, etc.)
- [x] Conserver temporairement le routage existant pour assurer la compatibilité initiale
- [x] Sauvegarder les onglets ouverts dans `workspace_state` (persistance locale)
- [x] Restaurer les onglets ouverts au démarrage de l'application
- [x] Gérer la fermeture et l'épinglage des onglets

## Phase 3 : Layout Desktop et Split Views
- [x] Créer un composant `SplitView.tsx` pour diviser l'écran
- [x] Ajouter les commandes de fenêtrage (ouvrir à droite, ouvrir en bas, fermer un groupe)
- [x] Convertir les modales pleines (Bulletins, Palmarès, Coupons) en documents ouvrables dans un panneau
- [x] Sauvegarder et restaurer les tailles des différents panneaux du Workbench

## Phase 4 : History Engine V1 (Historique)
- [x] Ajouter les migrations SQLite pour `operation_log`, `checkpoints` et `workspace_state`
- [x] Créer le service `historyService.ts`
- [x] Créer le fichier `gradeActions.ts` (actions métier pour les notes)
- [x] Brancher l'action `updateGrade` sur le système d'historique (Journaliser chaque création, modification ou suppression de note)
- [x] Créer un panneau latéral "Modifications récentes"
- [x] Ajouter la fonctionnalité de création de "Checkpoints" manuels

## Phase 5 : Undo / Redo V1
- [ ] Créer le service `undoRedoService.ts`
- [ ] Définir les "opérations inverses" pour les modifications de notes
- [ ] Implémenter le Undo/Redo pour les actions : `grade.update`, `grade.delete`, `grade.bulkUpdate`, et `student.update`
- [ ] Ajouter les raccourcis globaux `Ctrl+Z` (Undo) et `Ctrl+Y` (Redo)
- [ ] Ajouter des indicateurs visuels (Status bar ou Toast) pour l'état du Undo/Redo
- [ ] Ajouter des sécurités pour empêcher de restaurer une entité supprimée (ex: un cours effacé)

## Phase 6 : Gradebook 2.0 (Grille type Excel)
- [ ] Créer la logique de sélection `gradebookSelection.ts`
- [ ] Ajouter la sélection multi-cellules (plages rectangulaires, lignes, colonnes)
- [ ] Ajouter une surcouche (overlay) visuelle pour la sélection
- [ ] Implémenter le raccourci `Ctrl+C` (Copier en format TSV)
- [ ] Implémenter le raccourci `Ctrl+V` (Coller en format TSV depuis Excel avec pré-validation des données)
- [ ] Ajouter la suppression multiple (`Delete` sur la sélection)
- [ ] Ajouter la poignée de recopie vers le bas (Fill down)
- [ ] Implémenter l'historique détaillé par cellule
- [ ] Ajouter un mode visuel "erreurs de saisie"

## Phase 7 : Menus Contextuels et Drag & Drop
- [ ] Créer un composant global `ContextMenuLayer.tsx`
- [ ] Brancher les menus contextuels sur les commandes du `commandRegistry`
- [ ] Remplacer les menus contextuels locaux (ex: `StudentContextMenu`) par le menu global
- [ ] Créer le moteur personnalisé `dragManager.ts` pour gérer les glisser-déposer sans passer par l'API HTML5 standard (souvent capricieuse sur Windows/Webview)
- [ ] Migrer la réorganisation des cours sur le nouveau Drag & Drop
- [ ] Migrer le tri personnalisé des élèves
- [ ] Désactiver les sélections de texte parasites lors des glisser-déposer

## Phase 8 : Local History et Checkpoints (Restauration)
- [ ] Créer un Checkpoint automatique avant chaque import massif
- [ ] Créer un Checkpoint automatique avant chaque "Sync Push" vers le cloud
- [ ] Créer un Checkpoint automatique avant les délibérations
- [ ] Permettre la création d'un "Snapshot" complet de l'état d'une classe (élèves, cours, notes)
- [ ] Créer une interface utilisateur pour visualiser les différences (diff) avant restauration
- [ ] Implémenter la restauration d'un checkpoint (en mode "Brouillon" dans un premier temps)

## Phase 9 : Draft Mode (Mode Brouillon)
- [ ] Ajouter la table SQLite `drafts`
- [ ] Créer le service des brouillons
- [ ] Convertir la fonction d'importation des élèves en brouillon
- [ ] Convertir la fonction d'importation des notes en brouillon
- [ ] Convertir le processus de délibération en brouillon validable
- [ ] Ajouter un panneau "Brouillons" pour lister et valider les actions en attente

## Phase 10 : Sync 2.0
- [ ] Ajouter la table SQLite `sync_queue` (File d'attente de synchronisation)
- [ ] Lier la table `operation_log` (historique) à `sync_queue`
- [ ] Afficher la liste des opérations en attente dans l'interface
- [ ] Ajouter une logique de réessai automatique (Retry) en cas d'erreur de réseau
- [ ] Ajouter l'exportation d'un diagnostic système (Export diagnostic)
- [ ] Implémenter la détection de conflits simples entre le client local et le serveur
- [ ] Créer une interface pour la résolution manuelle des conflits

## Phase 11 : Native Desktop Layer (Optimisation Tauri)
- [ ] Implémenter la sauvegarde et restauration de l'état de la fenêtre (Window state)
- [ ] Ajouter un menu natif à l'application via Tauri (Fichier, Édition, Affichage, Aide, etc.)
- [ ] Configurer les raccourcis globaux natifs
- [ ] Activer le mode "Single instance" (empêcher d'ouvrir Schoolab plusieurs fois en même temps)
- [ ] Brancher les notifications natives de synchronisation
- [ ] Utiliser les fenêtres de dialogue (Dialogs) natives pour les imports/exports de fichiers

## Phase 12 : Automatisations et Macros
- [ ] Permettre l'enregistrement d'une suite de commandes exécutées
- [ ] Créer une fonctionnalité de sauvegarde sous forme de "Macro" nommée
- [ ] Pouvoir rejouer des Macros pour automatiser des tâches redondantes (ex: Macro "Préparer fin d'année")
- [ ] Intégrer des variables contextuelles dans les macros (classe active, période active, etc.)
- [ ] Ajouter des fenêtres de confirmation de sécurité pour les macros impliquant des actions destructives
