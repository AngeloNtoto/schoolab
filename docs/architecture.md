# Architecture Actuelle de Schoolab

Ce document décrit l'architecture globale du projet Schoolab en vue de la transition vers le modèle Workbench.

## Pile Technologique

*   **Frontend :** React 18, TypeScript, Tailwind CSS, React Router (HashRouter)
*   **Backend / Conteneur :** Tauri (Rust)
*   **Base de données :** SQLite (via le plugin `tauri-plugin-sql`)
*   **Communication :** IPC (Inter-Process Communication) via les commandes de `@tauri-apps/api/core`
*   **Serveur Mobile :** Un serveur HTTP léger en Rust (tiny-http) qui sert une application web pour smartphone (`src/web-ui`) permettant aux professeurs de saisir des notes à distance.

## Structure du projet

*   `src-tauri/` : Code backend en Rust, incluant :
    *   Le setup de la base de données SQLite.
    *   Le serveur local (pour les appareils mobiles).
    *   Les commandes (handlers) pour authentification, système de fichiers, etc.
*   `src/renderer/` : Code de l'application Desktop (Frontend).
    *   `App.tsx` : Point d'entrée principal (Routing et Providers).
    *   `components/` : Composants UI (Dashboard, Class, Settings...).
    *   `services/` : Interfaces avec la BDD (`databaseService.ts`, `gradeService.ts`, `studentService.ts`).
*   `src/web-ui/` : Code du client web léger pour les smartphones.

## Modèle de Données (SQLite)

Les principales entités gérées :
*   `students` (Élèves)
*   `classes` (Classes)
*   `subjects` (Cours/Matières)
*   `grades` (Notes)
*   `notes` (Mémos)
*   `repechages` (Repêchages)

## Architecture "Workbench" (Cible)

L'application va évoluer d'un modèle "Navigateur Web" (routes) vers un modèle "Éditeur Desktop" (onglets, commandes, espaces de travail persistants).
L'architecture cible nécessitera l'ajout des couches suivantes :

1.  **Command Registry :** Centralisation des actions sous forme de Commandes.
2.  **History Engine :** Capture de toutes les opérations via une table `operation_log` pour permettre le Undo/Redo.
3.  **Sync Queue :** Gestion de la synchronisation asynchrone avec un serveur Cloud (résolution de conflits locale).
4.  **Document Model :** Remplacement des Routes par des "Documents" s'ouvrant dans des onglets.
