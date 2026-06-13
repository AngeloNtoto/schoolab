# Request For Comments (RFC) : Schoolab Workbench

**Date:** 13 Juin 2026
**Sujet:** Évolution de l'interface Schoolab vers un modèle "Workbench"
**Statut:** Approuvé (En cours d'implémentation)

## 1. Contexte

Actuellement, Schoolab fonctionne comme une Web App classique encapsulée dans Tauri. Les interactions se font via des clics sur des boutons qui déclenchent des requêtes SQL locales. Le problème est que cela manque de fluidité pour les tâches de saisie massive de notes, et n'offre aucune sécurité d'annulation (Undo/Redo) en cas d'erreur.

## 2. Solution proposée

Transformer l'interface en un **Workbench** semblable à des éditeurs de code (VS Code) ou des tableurs (Excel).

Les piliers de cette transformation sont :
1.  **Palette de Commandes (Ctrl+K) :** Permettre un accès rapide à n'importe quelle action (navigation, outils) via le clavier.
2.  **Onglets et Split Views :** Ouvrir plusieurs classes, bulletins, ou paramètres dans des onglets, plutôt que d'écraser la vue actuelle par une route.
3.  **Undo/Redo et Historique Local :** Remplacer les mutations directes de base de données par un système de "Commandes" enregistrées dans un journal (`operation_log`), permettant d'annuler les erreurs de saisie.
4.  **Grille de notes (Gradebook) Excel-like :** Support de la sélection multiple, du copier-coller depuis Excel, et de l'étirement (fill down).

## 3. Liste des actions métier à migrer

Les actions suivantes doivent progressivement ne plus être appelées directement depuis l'UI, mais encapsulées dans des commandes enregistrables :

*   **Notes (Grades) :** `updateGrade`, `deleteGrade`, `bulkUpdateGrades`
*   **Élèves (Students) :** `createStudent`, `updateStudent`, `deleteStudent`, `importStudents`
*   **Cours (Subjects) :** `createSubject`, `updateSubject`, `reorderSubject`, `deleteSubject`
*   **Classes :** `updateClass`
*   **Divers :** `updateSettings`, `createCheckpoint`

## 4. Écrans convertibles en Documents (Onglets)

Les "pages" existantes suivantes deviendront des `Documents` manipulés par le Shell du Workbench :
*   Le Tableau de Bord
*   La vue détaillée d'une Classe
*   La grille de notes d'une classe
*   Les paramètres
*   Le Dashboard réseau (Serveur mobile)
*   Les Bulletins
*   Le Palmarès

## 5. Stratégie d'implémentation et Conventions

*   **Règle n°1 :** Ne pas casser l'existant. Utiliser le *Pattern Adapter* en entourant les écrans actuels d'un `DocumentWrapper` avant de les refondre.
*   **Règle n°2 :** Aucun SQL brut dans les composants React. Tout passe par un service, qui sera bientôt piloté par une "Action/Commande" pour garantir le suivi dans l'historique.
*   **Tests minimaux :** Les services critiques (calcul de moyennes, imports massifs) devront être garantis par des tests automatisés (`vitest` ou `jest`) avant de muter leur logique interne.
