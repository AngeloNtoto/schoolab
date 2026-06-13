# Plan de transformation de Schoolab en plateforme-editeur

Date: 13 Juin 2026  
Objectif: transformer Schoolab d'une application de gestion scolaire en un vrai environnement de travail local-first, avec une experience proche d'un editeur professionnel comme VS Code, Excel ou Word.

---

## 1. Vision

Schoolab ne doit plus seulement etre une suite de pages: tableau de bord, classe, notes, parametres, impression. La plateforme doit devenir un **Workbench scolaire**.

Un Workbench Schoolab signifie:

- l'utilisateur travaille dans un espace unifie, pas dans des pages isolees;
- les classes, grilles, bulletins, palmares, notes et parametres deviennent des "documents" ouvrables;
- l'application garde l'etat local: onglets ouverts, vue active, filtres, selections, panneaux, historique;
- chaque action importante est reversible ou au minimum auditable;
- la saisie des cotes se rapproche d'Excel: selection multi-cellules, copier-coller, remplissage, navigation clavier, validations;
- l'utilisateur peut travailler vite sans peur, parce que Schoolab garde un historique clair;
- la synchro cloud devient un systeme lisible avec file d'attente, conflits et reprise;
- l'interface devient "desktop" parce qu'elle gere elle-meme les commandes, raccourcis, menus, focus, selection, drag/drop et etats persistants.

La phrase directrice:

> Schoolab doit devenir l'environnement de travail quotidien de l'ecole, pas seulement un formulaire de gestion.

---

## 2. Diagnostic actuel du code

### 2.1 Ce qui existe deja et qu'il faut proteger

Le projet a deja de bonnes fondations:

- Tauri + React + TypeScript.
- SQLite local via `tauri-plugin-sql`.
- Backend Rust avec commandes Tauri.
- Donnees locales marquees par `is_dirty` pour la synchro.
- Tables metier solides: `students`, `classes`, `subjects`, `grades`, `notes`, `repechages`, `custom_sorts`, `academic_years`.
- Triggers SQLite pour `updated_at`, `last_modified_at` et suppressions sync.
- Systeme de cache memoire via `CacheContext`.
- Hooks metier: `useStudents`, `useGrades`.
- Impression avancee: bulletins, coupons, palmares.
- Serveur mobile local pour saisie des notes via `src-tauri/src/server.rs`.
- Diffusion d'evenements locaux `db:changed`.
- Logs Tauri via `tauri-plugin-log`.
- Updater et changelog.
- Parametres deja modularises.
- `ClassDetails` recemment modularise en composants plus faciles a faire evoluer.

Conclusion: on ne doit pas repartir de zero. On doit ajouter une couche d'architecture au-dessus de l'existant.

### 2.2 Ce qui limite la sensation "desktop"

Aujourd'hui, Schoolab fonctionne encore principalement comme une application web metier:

- navigation par routes;
- sidebar simple;
- modals plein ecran pour bulletins, coupons, palmares;
- interactions avancees implementees localement dans certains composants;
- contexte global limite a theme, licence, cache et toast;
- pas de modele central de commande;
- pas de gestion centrale du focus;
- pas de selection globale;
- pas de clipboard intelligent;
- pas de menu contextuel unique;
- pas de raccourcis globaux bien declares;
- pas d'historique local d'actions;
- pas de undo/redo transversal;
- pas de documents ouverts ou onglets persistants;
- pas de layout persistant par utilisateur;
- pas de file d'operations durable entre UI, SQLite, cloud et serveur mobile.

Le resultat: meme dans une WebView, l'interface garde une sensation web. VS Code, lui, parait desktop parce qu'il reconstruit une plateforme d'editeur au-dessus de la WebView.

---

## 3. Principe central de transformation

Il faut ajouter une couche **Schoolab Workbench**.

Cette couche devient le noyau d'experience utilisateur.

Elle contient:

1. Shell d'application: onglets, panneaux, split views, sidebar, status bar.
2. Command Registry: toutes les actions declares au meme endroit.
3. Shortcut Manager: raccourcis clavier globaux et contextuels.
4. Context Menu Manager: menus contextuels coherents.
5. Focus Manager: suivi de la zone active.
6. Selection Manager: selection active par document, grille, ligne ou cellule.
7. Clipboard Manager: copier-coller intelligent.
8. Drag Manager: drag/drop custom controle par l'application.
9. Document Model: classe, grille, bulletin, palmares, note, parametres comme documents ouvrables.
10. History Engine: operations, undo/redo, checkpoints, restauration.
11. Workspace Persistence: etat local du workbench.
12. Sync Queue: operations locales envoyees ensuite au cloud.

---

## 4. Architecture cible

### 4.1 Nouvelle arborescence frontend proposee

```txt
src/renderer/
  workbench/
    WorkbenchShell.tsx
    WorkbenchProvider.tsx
    workbenchTypes.ts
    workspaceStore.ts
    documentRegistry.ts
    commandRegistry.ts
    shortcutRegistry.ts
    contextMenuRegistry.ts
    focusManager.ts
    selectionManager.ts
    clipboardManager.ts
    dragManager.ts
    statusBarStore.ts
    panelStore.ts
    tabStore.ts

  documents/
    class/
      ClassDocument.tsx
      classDocumentModel.ts
      classCommands.ts
      classShortcuts.ts
      classContextMenus.ts
    gradebook/
      GradebookDocument.tsx
      GradebookGrid.tsx
      gradebookSelection.ts
      gradebookClipboard.ts
      gradebookCommands.ts
      gradebookValidation.ts
    bulletin/
      BulletinDocument.tsx
    palmares/
      PalmaresDocument.tsx
    notes/
      NotesDocument.tsx
    settings/
      SettingsDocument.tsx

  domain/
    actions/
      studentActions.ts
      gradeActions.ts
      subjectActions.ts
      classActions.ts
      noteActions.ts
    history/
      operationTypes.ts
      historyService.ts
      undoRedoService.ts
      checkpointService.ts
      diffService.ts
    repositories/
      studentRepository.ts
      gradeRepository.ts
      subjectRepository.ts
      classRepository.ts

  components/
    desktop/
      CommandPalette.tsx
      ContextMenuLayer.tsx
      ShortcutHelp.tsx
      StatusBar.tsx
      TabBar.tsx
      SplitView.tsx
      ActivityBar.tsx
      PanelDock.tsx
```

### 4.2 Nouvelle arborescence Rust proposee

```txt
src-tauri/src/
  commands/
    mod.rs
    auth_commands.rs
    db_commands.rs
    history_commands.rs
    workspace_commands.rs
    sync_commands.rs
    export_commands.rs

  domain/
    operation_log.rs
    snapshots.rs
    sync_queue.rs
    conflict_resolution.rs

  db/
    schema.rs
    migrations.rs
    transactions.rs
    wal.rs

  app_state.rs
  errors.rs
```

Pourquoi:

- Tauri recommande de regrouper les commandes Rust dans des modules separes quand elles deviennent nombreuses.
- Schoolab va avoir beaucoup de commandes: historique, workspace, snapshots, sync, exports, import photo, etc.
- Les erreurs doivent devenir typees pour ne plus propager uniquement des strings.

---

## 5. Modele "document" Schoolab

### 5.1 Types de documents

Un document Schoolab n'est pas forcement un fichier. C'est une vue metier persistante.

Documents possibles:

- `dashboard`
- `class:{classId}`
- `gradebook:{classId}`
- `student:{studentId}`
- `bulletin:{studentId}`
- `classBulletins:{classId}`
- `coupons:{classId}`
- `palmares:{classId}`
- `notes`
- `note:{noteId}`
- `settings:{tab}`
- `network`
- `academicYears`

### 5.2 Contrat minimal d'un document

```ts
interface WorkbenchDocument {
  id: string;
  type: string;
  title: string;
  icon?: string;
  dirty?: boolean;
  closable: boolean;
  singleton?: boolean;
  restoreState?: unknown;
}
```

### 5.3 Benefices

- Ouvrir une classe ne remplace plus tout l'espace: elle ouvre un onglet.
- Le bulletin d'un eleve peut etre ouvert a cote de la grille.
- Les parametres peuvent revenir au dernier onglet actif.
- On peut restaurer la session au redemarrage.
- Chaque document expose ses commandes disponibles.

---

## 6. Shell Workbench

### 6.1 Layout cible

La structure visuelle cible:

```txt
┌────────────────────────────────────────────────────────────┐
│ Titlebar / Command Center / Quick Actions                  │
├──────────┬───────────────────────────────────────┬─────────┤
│ Activity │ TabBar                                │ Utility │
│ Bar      ├───────────────────────────────────────┤ Panel   │
│          │ Editor Area                           │         │
│          │  - split vertical/horizontal          │         │
│          │  - documents actifs                   │         │
├──────────┴───────────────────────────────────────┴─────────┤
│ Status Bar: sync, local history, active year, license       │
└────────────────────────────────────────────────────────────┘
```

### 6.2 Activity Bar

Remplacer progressivement la sidebar actuelle par une Activity Bar:

- Tableau de bord
- Classes
- Notes
- Impression
- Reseau
- Historique
- Parametres

Quand l'Activity Bar selectionne "Classes", un panneau lateral liste les classes, filtres, annees, recherches.

### 6.3 Tab Bar

Chaque document s'ouvre dans un onglet:

- `5eme Electricite`
- `Bulletin Bakambu`
- `Palmares 5eme`
- `Notes & Memos`
- `Parametres`

Interactions:

- fermer onglet;
- fermer autres;
- fermer a droite;
- epingler;
- deplacer;
- restaurer au demarrage;
- indiquer si document a des modifications non synchronisees.

### 6.4 Split Views

Capacites:

- ouvrir grille + bulletin cote a cote;
- comparer deux classes;
- voir palmares + coupons;
- garder notes/memos a droite pendant la saisie.

Implementation:

- `SplitView` maison ou petite abstraction CSS grid/flex.
- Sauvegarder les tailles dans `workspace_state`.
- Ne pas faire de nested cards; panneaux francs, denses, desktop.

### 6.5 Status Bar

Barre basse persistante:

- etat sync: local, en attente, erreur, ok;
- nombre d'operations non synchronisees;
- annee scolaire active;
- classe/document actif;
- mode de saisie: normal, corrige sur X, verrouille;
- dernier checkpoint;
- licence;
- serveur mobile: actif/inactif + IP.

---

## 7. Command System

### 7.1 Pourquoi

Aujourd'hui, chaque bouton appelle sa fonction localement. Pour une experience desktop, toute action importante doit etre une commande.

Exemples:

- `schoolab.openDashboard`
- `schoolab.openClass`
- `schoolab.openGradebook`
- `schoolab.createStudent`
- `schoolab.deleteStudent`
- `schoolab.importStudents`
- `schoolab.updateGrade`
- `schoolab.printBulletin`
- `schoolab.printCoupons`
- `schoolab.openPalmares`
- `schoolab.syncPush`
- `schoolab.syncPull`
- `schoolab.undo`
- `schoolab.redo`
- `schoolab.createCheckpoint`
- `schoolab.restoreCheckpoint`
- `schoolab.toggleFullscreenFocus`

### 7.2 Contrat

```ts
interface Command<TPayload = unknown> {
  id: string;
  title: string;
  category: string;
  icon?: React.ComponentType;
  shortcut?: string;
  when?: (ctx: WorkbenchContext) => boolean;
  run: (payload?: TPayload, ctx?: WorkbenchContext) => Promise<void> | void;
}
```

### 7.3 Command Palette

Raccourci recommande:

- `Ctrl+K` ou `Ctrl+Shift+P`.

Fonctions:

- chercher une commande;
- ouvrir une classe;
- ouvrir un eleve;
- imprimer;
- importer;
- creer une note;
- lancer sync;
- restaurer checkpoint;
- afficher raccourcis.

### 7.4 Roadmap technique

1. Creer `commandRegistry.ts`.
2. Enregistrer les commandes de navigation.
3. Remplacer les boutons de `ClassDetailsHeader` par appels `runCommand`.
4. Ajouter `CommandPalette.tsx`.
5. Ajouter historique des commandes recentes.
6. Ajouter commandes contextuelles par document.

---

## 8. Shortcut Manager

### 8.1 Problemes actuels

- Les raccourcis vivent dans les cellules ou composants.
- Pas de priorite entre modal, grille, document, application.
- Pas de page "Raccourcis".
- Pas de prevention globale des comportements navigateur indesirables.

### 8.2 Cible

Un gestionnaire avec scopes:

- `global`
- `workbench`
- `gradebook`
- `student`
- `print`
- `modal`

Priorite:

1. input actif;
2. modal actif;
3. document actif;
4. workbench;
5. global.

### 8.3 Raccourcis prioritaires

- `Ctrl+K`: palette de commandes
- `Ctrl+S`: sauvegarder/valider document actif si pertinent
- `Ctrl+Z`: undo
- `Ctrl+Y` ou `Ctrl+Shift+Z`: redo
- `Ctrl+F`: recherche dans document actif
- `Ctrl+P`: ouverture rapide ou impression selon contexte
- `Ctrl+Tab`: document suivant
- `Ctrl+W`: fermer onglet
- `F2`: renommer cellule/element
- `Delete`: supprimer selection
- `Esc`: fermer menu/palette/selection
- `Alt+1..9`: ouvrir panneau Activity Bar

### 8.4 Implementation

- `shortcutRegistry.ts`
- `useShortcut(scope, key, handler)`
- normalisation clavier AZERTY/QWERTY
- aide visuelle des raccourcis
- persistance des raccourcis personnalises plus tard

---

## 9. Context Menu Manager

### 9.1 Etat actuel

Il existe deja un composant `ContextMenu.tsx`, mais `ClassDetails` a son propre menu eleve extrait en `StudentContextMenu`.

### 9.2 Cible

Un seul gestionnaire global:

```ts
openContextMenu({
  x,
  y,
  source: 'gradeCell',
  payload: { studentId, subjectId, period },
});
```

Les menus viennent du Command Registry.

### 9.3 Menus prioritaires

Menu cellule de note:

- Modifier
- Effacer
- Copier
- Coller
- Remplir vers le bas
- Verrouiller periode
- Voir historique de cette note

Menu eleve:

- Ouvrir fiche
- Ouvrir bulletin
- Gérer repêchage
- Ajouter note/memo
- Marquer abandon
- Supprimer

Menu cours:

- Modifier cours
- Reorganiser
- Cloner vers autre classe
- Voir statistiques

Menu document/onglet:

- Fermer
- Epingler
- Dupliquer vue
- Ouvrir a droite
- Restaurer dernier etat

---

## 10. Selection Manager

### 10.1 Pourquoi

La selection multi-cellules est impossible a rendre stable si chaque cellule gere son propre etat.

### 10.2 Selection cible

Types:

- cellule unique;
- plage rectangulaire;
- lignes eleves;
- colonnes/periodes;
- cours entiers;
- documents/onglets.

Exemple:

```ts
type GradeSelection = {
  kind: 'gradeRange';
  classId: number;
  anchor: GradeCellRef;
  focus: GradeCellRef;
  cells: GradeCellRef[];
};
```

### 10.3 Interactions Excel-like

- clic: selection cellule;
- shift+clic: extension;
- clic glisse: plage;
- ctrl+clic: selection multiple plus tard;
- enter: descend;
- tab: droite;
- shift+tab: gauche;
- ctrl+c: copie TSV;
- ctrl+v: colle TSV;
- delete: efface selection;
- fill handle: remplir vers le bas ou droite.

### 10.4 Regles de securite

- Ne jamais ecrire au-dela du maximum.
- Ne jamais coller dans une periode verrouillee.
- Ne jamais coller dans examen desactive.
- Previsualiser les erreurs avant validation massive.
- Une operation de collage devient une seule action undo.

---

## 11. Clipboard Manager

### 11.1 Objectif

Copier-coller entre Schoolab, Excel, LibreOffice, Google Sheets.

### 11.2 Formats supportes

- texte simple;
- TSV;
- CSV;
- JSON interne Schoolab;
- selection de notes avec metadonnees.

### 11.3 Collage dans la grille

Flux:

1. lire clipboard;
2. parser en matrice;
3. mapper sur selection active;
4. valider chaque cellule;
5. afficher resume:
   - X notes valides;
   - Y depassent maxima;
   - Z cellules verrouillees;
6. appliquer comme transaction unique;
7. enregistrer operation dans historique.

---

## 12. Drag and Drop Manager

### 12.1 Pourquoi le drag actuel peut etre fragile

Le drag HTML5 natif est souvent capricieux dans les WebView, surtout Windows/WebView2. Pour une app desktop, il vaut mieux utiliser `pointerdown`, `pointermove`, `pointerup`, overlays et zones de drop controlees.

### 12.2 Cible

Un moteur custom:

- detection de drag apres seuil de mouvement;
- overlay de deplacement;
- drop zones visibles;
- annulation par Escape;
- auto-scroll;
- pas de selection texte parasite;
- compatibilite souris/tactile;
- callbacks metier propres.

### 12.3 Cas Schoolab

- reorganiser cours;
- reorganiser eleves dans un tri personnalise;
- deplacer onglets;
- glisser une classe vers impression;
- glisser un eleve vers une note/memo;
- glisser une plage de notes pour remplir.

---

## 13. History Engine

### 13.1 Objectif

Toute action importante devient un evenement historique.

Aujourd'hui, une note modifiee va directement en base. Demain:

1. l'UI cree une operation metier;
2. l'operation est validee;
3. l'operation est appliquee en transaction SQLite;
4. l'operation est enregistree;
5. l'UI et le mobile recoivent un evenement;
6. la synchro cloud recoit l'operation ou les donnees derivees.

### 13.2 Tables SQLite proposees

```sql
CREATE TABLE IF NOT EXISTS operation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT UNIQUE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  action_type TEXT NOT NULL,
  label TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  inverse_json TEXT,
  source TEXT NOT NULL DEFAULT 'desktop',
  scope TEXT NOT NULL DEFAULT 'global',
  class_id INTEGER,
  student_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  applied_at TEXT DEFAULT (datetime('now')),
  undone_at TEXT,
  redone_at TEXT,
  user_label TEXT DEFAULT '',
  is_checkpoint INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkpoint_id TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  scope TEXT NOT NULL,
  class_id INTEGER,
  snapshot_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workspace_state (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### 13.3 Types d'operations prioritaires

- `grade.update`
- `grade.bulkUpdate`
- `grade.delete`
- `student.create`
- `student.update`
- `student.delete`
- `student.import`
- `subject.create`
- `subject.update`
- `subject.reorder`
- `class.update`
- `repechage.update`
- `customSort.update`
- `settings.update`

### 13.4 Undo/Redo

Chaque operation doit stocker:

- `before_json`
- `after_json`
- `inverse_json`

Exemple note:

```json
{
  "action": "grade.update",
  "target": {
    "studentId": 12,
    "subjectId": 3,
    "period": "P1"
  },
  "before": null,
  "after": 8
}
```

Inverse:

```json
{
  "action": "grade.update",
  "target": {
    "studentId": 12,
    "subjectId": 3,
    "period": "P1"
  },
  "value": null
}
```

### 13.5 Regle importante

Undo/redo doit etre metier, pas SQL brut.

Cela evite:

- restaurer une note dans un cours supprime;
- recreer un eleve sans verifier sa classe;
- casser les contraintes de maxima;
- produire un etat non synchronisable.

---

## 14. Local History

### 14.1 Objectif

Offrir une sensation de securite:

- "je peux revenir en arriere";
- "je peux voir qui/quoi/quand";
- "je peux restaurer avant l'import";
- "je peux comparer".

### 14.2 Historique par document

Pour une classe:

- notes modifiees;
- eleves ajoutes/supprimes;
- cours modifies;
- imports;
- impressions;
- deliberations.

Pour un eleve:

- identite;
- classe;
- notes;
- conduite;
- repechage;
- bulletins generes.

Pour une grille:

- chaque operation de saisie;
- collages massifs;
- imports photo/manuscrit plus tard;
- verrouillages de periodes.

### 14.3 UI proposee

Panneau lateral "Historique":

- timeline;
- recherche;
- filtre par type;
- filtre par classe/eleve;
- bouton "Restaurer";
- bouton "Comparer";
- bouton "Creer checkpoint".

### 14.4 Checkpoints automatiques

Creer automatiquement un checkpoint:

- avant import d'eleves;
- avant import de notes;
- avant delibération;
- avant sync push;
- avant suppression massive;
- avant modification des maxima;
- avant restauration.

---

## 15. Gradebook 2.0

### 15.1 Objectif

La grille de notes doit devenir le premier "editeur" de Schoolab.

### 15.2 Fonctionnalites prioritaires

1. Selection multi-cellules.
2. Copier-coller Excel/LibreOffice.
3. Remplissage vers le bas.
4. Suppression multi-cellules.
5. Undo/redo de groupe.
6. Validation avant application.
7. Verrouillage visible des periodes.
8. Filtre cours/eleves.
9. Stats en footer.
10. Historique cellule par cellule.

### 15.3 Architecture composant

```txt
GradebookDocument
  GradebookToolbar
  GradebookGrid
    GradebookHeader
    GradebookBody
    GradebookFooter
    SelectionOverlay
    FillHandle
    ActiveCellEditor
  GradebookStatus
```

### 15.4 Performance

Probleme a anticiper:

- une classe de 80 eleves x 20 cours x 8 colonnes = 12 800 cellules.

Mesures:

- virtualisation lignes/colonnes si necessaire;
- memoisation cellules;
- edition en overlay unique au lieu d'un input par cellule;
- operations bulk en transaction;
- debounce pour stats couteuses;
- index en Map deja utilise, a conserver.

### 15.5 Validation

Regles:

- valeur numerique;
- valeur >= 0;
- valeur <= maximum ou `corrige sur`;
- examen desactive interdit;
- periode verrouillee interdite;
- eleve abandonne a traiter selon regle explicite;
- notes importees doivent produire un rapport.

---

## 16. Draft Mode

### 16.1 Pourquoi

Certaines actions sont dangereuses:

- import massif;
- scan de fiches manuscrites;
- deliberation;
- modification des maxima;
- suppression de cours;
- sync cloud.

Elles ne devraient pas s'appliquer instantanement sans previsualisation.

### 16.2 Tables proposees

```sql
CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  draft_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  scope TEXT NOT NULL,
  class_id INTEGER,
  payload_json TEXT NOT NULL,
  validation_json TEXT,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### 16.3 UI

Un panneau "Brouillons":

- imports en attente;
- notes detectees par photo;
- changements de maxima;
- deliberation avant validation;
- erreurs a corriger.

Actions:

- appliquer;
- corriger;
- ignorer;
- comparer;
- supprimer.

---

## 17. Sync 2.0

### 17.1 Etat actuel

Le modele `is_dirty` est simple et utile, mais limite pour:

- conflits;
- reprise apres erreur;
- audit;
- fusion;
- operations hors ligne complexes;
- historique utilisateur.

### 17.2 Cible

Ajouter une file d'operations:

```sql
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  payload_json TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  attempt_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  sent_at TEXT,
  acknowledged_at TEXT
);
```

### 17.3 Tableau de bord sync

Afficher:

- dernier push;
- dernier pull;
- operations en attente;
- erreurs;
- conflits;
- appareil courant;
- licence/ecole active;
- bouton "Reessayer";
- bouton "Exporter diagnostic".

### 17.4 Conflits

Cas:

- meme eleve modifie sur deux postes;
- meme note modifiee sur desktop et mobile;
- cours supprime alors que notes existent;
- changement de maxima apres saisie.

Resolution:

- local gagne;
- cloud gagne;
- fusion manuelle;
- garder les deux avec alerte;
- restaurer depuis checkpoint.

---

## 18. Mobile Marking Board 2.0

### 18.1 Etat actuel

Le serveur local existe via `tiny-http`, sert `dist-web`, expose des API et diffuse des changements SSE.

### 18.2 Cible

Le mobile devient un "client editeur" leger:

- connexion par QR;
- selection classe/cours/periode;
- saisie rapide;
- mode hors-ligne court;
- feedback temps reel vers desktop;
- file locale si reseau instable;
- verrouillage depuis desktop;
- affichage des erreurs de validation.

### 18.3 Securite minimale

Ajouter:

- token temporaire dans QR;
- expiration;
- autorisation par session;
- journal des appareils connectes;
- bouton "deconnecter tous".

---

## 19. Native Desktop Layer

### 19.1 Ce que Tauri peut apporter

Schoolab peut utiliser plus de capacites Tauri:

- commandes Rust typees;
- evenements frontend/backend;
- state management Rust;
- plugins;
- menus natifs;
- raccourcis globaux;
- clipboard;
- notifications;
- window state;
- single instance;
- store persistant.

### 19.2 Priorites

1. Window state: restaurer taille/fenetre.
2. Menu natif: Fichier, Edition, Affichage, Classe, Notes, Sync, Aide.
3. Raccourcis natifs pour commandes principales.
4. Clipboard plus robuste.
5. Dialogs natifs pour import/export.
6. Single instance: eviter deux Schoolab sur la meme base.
7. Export diagnostics.

---

## 20. Design System Desktop

### 20.1 Probleme actuel

Plusieurs ecrans ont leur propre style, parfois tres "web app":

- grands panneaux;
- modals plein ecran;
- spacing large;
- composants disperses;
- boutons specifiques par ecran.

### 20.2 Cible

Un design system dense, calme, professionnel:

- barres d'outils compactes;
- menus contextuels uniformes;
- panneaux dockables;
- split views;
- grilles stables;
- status bar;
- onglets;
- tooltips;
- raccourcis affiches dans menus;
- etats de focus visibles.

### 20.3 Composants a standardiser

- `ToolbarButton`
- `IconButton`
- `CommandButton`
- `MenuItem`
- `Panel`
- `Tab`
- `StatusItem`
- `SearchBox`
- `SegmentedControl`
- `DataGrid`
- `EmptyState`
- `Toast`
- `ConfirmDialog`

---

## 21. Plan de migration detaille

### Phase 0: Fondations et securisation

Duree estimee: 1 a 2 semaines.

Objectifs:

- stabiliser le code actuel;
- formaliser les conventions;
- eviter les regressions avant gros chantier.

Taches:

1. Creer `docs/architecture.md`.
2. Creer `docs/workbench-rfc.md`.
3. Lister les actions metier existantes.
4. Lister les ecrans convertibles en documents.
5. Ajouter tests minimaux sur services critiques:
   - `gradeService.updateGrade`;
   - `studentService.importStudents`;
   - calcul bulletin;
   - palmares;
   - sync push data collection si possible cote Rust.
6. Ajouter conventions:
   - tout changement metier passe par action/service;
   - pas de SQL direct dans composants;
   - pas de raccourci local non declare;
   - pas de menu contextuel local hors manager a terme.
7. Nettoyer README ou separer contenu non lie a Schoolab.

Livrables:

- docs architecture;
- liste des commandes candidates;
- baseline tests;
- decision sur version cible.

Critere d'acceptation:

- `pnpm exec tsc --noEmit` passe;
- la grille, impression et sync fonctionnent comme avant;
- aucun changement UX majeur impose.

### Phase 1: Command Registry et Palette

Duree estimee: 1 a 2 semaines.

Objectifs:

- toutes les actions importantes deviennent invocables par commande;
- une palette globale permet d'agir vite.

Taches:

1. Creer `workbench/commandRegistry.ts`.
2. Creer `WorkbenchProvider`.
3. Ajouter `CommandPalette`.
4. Enregistrer commandes:
   - navigation;
   - ouvrir classe;
   - ouvrir notes;
   - sync;
   - impression;
   - ouvrir parametres;
   - toggle theme;
   - ouvrir serveur mobile.
5. Ajouter `Ctrl+K`.
6. Remplacer boutons principaux par `runCommand`.
7. Ajouter recherche rapide de classes/eleves.

Livrables:

- palette fonctionnelle;
- commandes principales executees depuis boutons et clavier.

Critere d'acceptation:

- on peut ouvrir une classe, les notes, les parametres et lancer impression via palette.

### Phase 2: Workbench Shell

Duree estimee: 2 a 4 semaines.

Objectifs:

- remplacer progressivement la logique "route = page" par "document = onglet".

Taches:

1. Creer `WorkbenchShell`.
2. Ajouter TabBar.
3. Ajouter document registry.
4. Convertir:
   - DashboardDocument;
   - ClassDocument;
   - NotesDocument;
   - SettingsDocument;
   - NetworkDocument.
5. Garder les routes comme compatibilite initiale.
6. Persister onglets ouverts dans `workspace_state`.
7. Restaurer session au demarrage.
8. Ajouter fermeture/epinglage onglets.

Livrables:

- workbench visible;
- sidebar actuelle peut rester, mais devient panneau.

Critere d'acceptation:

- redemarrer Schoolab restaure les onglets ouverts;
- ouvrir deux classes ne remplace pas la premiere;
- la route `/class/:id` peut ouvrir un document au lieu d'un ecran isole.

### Phase 3: Layout Desktop et Split Views

Duree estimee: 2 semaines.

Objectifs:

- permettre travail cote a cote.

Taches:

1. Creer `SplitView`.
2. Ajouter commandes:
   - ouvrir a droite;
   - ouvrir en bas;
   - fermer groupe;
   - deplacer document.
3. Convertir bulletins/coupons/palmares de modals plein ecran vers documents.
4. Garder l'impression en mode document plein ecran si necessaire.
5. Persister tailles des panneaux.

Livrables:

- classe + bulletin cote a cote;
- classe + notes cote a cote;
- palmares ouvrable dans onglet.

Critere d'acceptation:

- un utilisateur peut saisir des notes et consulter un bulletin sans perdre sa grille.

### Phase 4: History Engine V1

Duree estimee: 3 a 5 semaines.

Objectifs:

- journaliser les actions metier;
- preparer undo/redo.

Taches:

1. Ajouter migrations:
   - `operation_log`;
   - `checkpoints`;
   - `workspace_state`.
2. Creer `historyService`.
3. Creer `domain/actions/gradeActions.ts`.
4. Faire passer `updateGrade` par une action metier.
5. Journaliser:
   - note creee;
   - note modifiee;
   - note supprimee;
   - collage massif plus tard.
6. Ajouter panneau "Modifications recentes".
7. Ajouter checkpoints manuels.

Livrables:

- historique des modifications de notes;
- vue recente par classe;
- checkpoint manuel.

Critere d'acceptation:

- modifier une note cree une entree lisible dans l'historique;
- on peut voir avant/apres.

### Phase 5: Undo/Redo V1

Duree estimee: 2 a 4 semaines.

Objectifs:

- annuler/refaire les modifications de notes et operations simples.

Taches:

1. Definir operations inverses.
2. Implementer undo/redo pour:
   - grade.update;
   - grade.delete;
   - grade.bulkUpdate;
   - student.update.
3. Ajouter `Ctrl+Z`, `Ctrl+Y`.
4. Ajouter boutons status bar.
5. Ajouter protection pour entites supprimees.

Livrables:

- undo/redo sur notes.

Critere d'acceptation:

- une saisie de note s'annule;
- un collage massif s'annule en une seule action;
- redo restaure proprement.

### Phase 6: Gradebook 2.0

Duree estimee: 4 a 8 semaines.

Objectifs:

- transformer la grille en experience Excel-like.

Taches:

1. Creer `gradebookSelection.ts`.
2. Ajouter selection multi-cellules.
3. Ajouter overlay de selection.
4. Ajouter copier TSV.
5. Ajouter coller TSV avec prevalidation.
6. Ajouter delete selection.
7. Ajouter fill down.
8. Ajouter historique cellule.
9. Ajouter mode "erreurs de saisie".
10. Ajouter tests unitaires de mapping selection -> operations.

Livrables:

- saisie rapide clavier;
- copier-coller Excel;
- selection fiable;
- validation visible.

Critere d'acceptation:

- copier 10x5 notes depuis Excel vers Schoolab marche;
- les depassements de maxima sont bloques avant ecriture;
- tout le collage est annulable.

### Phase 7: Context Menus et Drag Manager

Duree estimee: 2 a 4 semaines.

Objectifs:

- rendre clic droit et drag/drop coherents et fiables.

Taches:

1. Creer `ContextMenuLayer`.
2. Brancher menus sur commandes.
3. Remplacer `StudentContextMenu` par menu global.
4. Creer `dragManager.ts`.
5. Migrer reorganisation cours vers drag custom.
6. Migrer tri eleves vers drag custom.
7. Ajouter auto-scroll.
8. Desactiver selection texte parasite sur zones interactives.

Livrables:

- clic droit uniforme;
- drag/drop plus stable.

Critere d'acceptation:

- clic droit fonctionne sur eleve, cellule, cours, onglet;
- drag/drop ne selectionne pas du texte et marche sur Windows.

### Phase 8: Local History et Checkpoints

Duree estimee: 3 a 5 semaines.

Objectifs:

- restaurer et comparer.

Taches:

1. Checkpoint avant import.
2. Checkpoint avant sync push.
3. Checkpoint avant deliberation.
4. Snapshot classe:
   - students;
   - subjects;
   - grades;
   - repechages.
5. UI diff simple:
   - notes changees;
   - eleves ajoutes/supprimes;
   - cours changes.
6. Restaurer checkpoint en draft d'abord.

Livrables:

- panneau historique local;
- restauration securisee.

Critere d'acceptation:

- avant un import, Schoolab cree un checkpoint;
- l'utilisateur peut revenir a l'etat avant import.

### Phase 9: Draft Mode

Duree estimee: 3 a 6 semaines.

Objectifs:

- previsualiser les operations sensibles avant application.

Taches:

1. Ajouter table `drafts`.
2. Creer service brouillons.
3. Convertir import eleves en draft.
4. Convertir import notes en draft.
5. Preparer futur scan photo en draft.
6. Convertir deliberation en draft.
7. Ajouter panneau "Brouillons".

Livrables:

- imports validables;
- operations dangereuses verifiees.

Critere d'acceptation:

- un import peut etre annule avant application;
- un brouillon conserve les erreurs.

### Phase 10: Sync 2.0

Duree estimee: 4 a 8 semaines.

Objectifs:

- rendre la synchro transparente et rassurante.

Taches:

1. Ajouter `sync_queue`.
2. Lier `operation_log` a `sync_queue`.
3. Afficher operations en attente.
4. Ajouter retry.
5. Ajouter diagnostic exportable.
6. Ajouter detection conflits simples.
7. Ajouter UI de resolution conflits.
8. Ajouter tests de scenarios:
   - push erreur;
   - pull conflit;
   - suppression locale;
   - note modifiee deux fois.

Livrables:

- centre de sync plus fiable.

Critere d'acceptation:

- une erreur cloud ne bloque pas le travail local;
- l'utilisateur voit quoi faire.

### Phase 11: Native Desktop Layer

Duree estimee: 2 a 4 semaines.

Objectifs:

- renforcer la sensation desktop.

Taches:

1. Ajouter window state.
2. Ajouter menu natif.
3. Ajouter raccourcis natifs.
4. Ajouter single instance.
5. Ajouter clipboard natif si necessaire.
6. Ajouter dialogs natifs import/export.
7. Ajouter notifications sync.

Livrables:

- Schoolab se comporte comme une application desktop.

Critere d'acceptation:

- taille fenetre restauree;
- menu Edition contient undo/redo/copy/paste;
- ouvrir une deuxieme instance redirige vers la premiere.

### Phase 12: Automatisations et Macros

Duree estimee: 4 a 6 semaines.

Objectifs:

- automatiser les workflows repetitifs.

Taches:

1. Enregistrer commandes executees.
2. Sauvegarder macro nommee.
3. Rejouer macro.
4. Ajouter variables:
   - classe active;
   - periode active;
   - annee active.
5. Ajouter confirmations pour actions dangereuses.

Exemples:

- "Preparer fin d'annee": checkpoint -> calcul palmares -> ouvrir coupons -> imprimer.
- "Import notes": checkpoint -> importer -> valider -> afficher erreurs.
- "Saisie mobile": demarrer serveur -> afficher QR -> ouvrir tableau sync.

---

## 22. Strategie technique de migration sans casser l'existant

### 22.1 Regle d'or

Ne pas remplacer tout d'un coup.

### 22.2 Adapter Pattern

Chaque ancien ecran devient d'abord un document wrapper.

Exemple:

```tsx
function ClassDocument({ classId }: { classId: number }) {
  return <Class />;
}
```

Ensuite seulement, on extrait les modals en documents.

### 22.3 Actions metier progressives

Au debut:

- `gradeService.updateGrade` reste;
- `gradeActions.updateGrade` l'appelle et journalise;
- la grille utilise `gradeActions`;
- plus tard, le service direct devient interne.

### 22.4 UI progressive

1. Command Palette sans changer layout.
2. Workbench avec anciens ecrans dedans.
3. Onglets.
4. Split views.
5. Documents natifs.

---

## 23. Risques et mitigations

### Risque 1: trop gros chantier

Mitigation:

- livrer par phases visibles;
- chaque phase doit produire une valeur utilisateur.

### Risque 2: undo/redo casse les donnees

Mitigation:

- commencer par notes seulement;
- stocker before/after;
- appliquer en transaction;
- checkpoint avant operations massives.

### Risque 3: performance de la grille

Mitigation:

- garder Map actuelle;
- memoiser;
- edition overlay unique;
- virtualiser si necessaire.

### Risque 4: sync et historique divergent

Mitigation:

- operation_id unique;
- sync_queue liee a operation_log;
- is_dirty conserve au debut;
- transition progressive.

### Risque 5: UX trop complexe

Mitigation:

- mode simple par defaut;
- features avancees via palette/menu;
- status bar informative;
- pas de surcharge visuelle.

---

## 24. Ordre recommande pour un impact rapide

### Lot A: sensation desktop immediate

1. Command Palette.
2. Raccourcis globaux.
3. Context menu global.
4. Status bar.
5. Window state.

Impact: Schoolab commence a "sentir" editeur.

### Lot B: securite du travail

1. Operation log pour notes.
2. Undo/redo notes.
3. Checkpoints avant import.
4. Historique recent.

Impact: l'utilisateur travaille sans peur.

### Lot C: productivite cotation

1. Selection multi-cellules.
2. Copier-coller Excel.
3. Collage valide.
4. Fill down.
5. Draft import notes.

Impact: la cotation devient rapide.

### Lot D: Workbench complet

1. Onglets.
2. Split views.
3. Documents imprimables.
4. Restauration session.
5. Panneaux dockables.

Impact: Schoolab devient plateforme.

---

## 25. Premier sprint concret propose

### Sprint 1: Command Palette + commandes de base

Duree: 5 a 7 jours.

Taches:

1. Creer `src/renderer/workbench/commandRegistry.ts`.
2. Creer `src/renderer/workbench/WorkbenchProvider.tsx`.
3. Ajouter provider dans `App.tsx`.
4. Creer `CommandPalette.tsx`.
5. Ajouter raccourci `Ctrl+K`.
6. Enregistrer commandes:
   - ouvrir dashboard;
   - ouvrir reseau;
   - ouvrir notes;
   - ouvrir parametres;
   - ouvrir annees academiques;
   - sync push;
   - sync pull;
   - ouvrir classe par recherche.
7. Ajouter menu "actions rapides" si besoin dans header.

Critere final:

- depuis n'importe quel ecran, `Ctrl+K` ouvre une palette.
- chercher "5eme" ouvre une classe.
- chercher "sync" lance une action.

### Sprint 2: Operation Log notes

Duree: 5 a 10 jours.

Taches:

1. Migration `operation_log`.
2. `historyService`.
3. `gradeActions.updateGrade`.
4. Brancher `useGrades.updateGrade` dessus.
5. Panneau simple "Modifications recentes".

Critere final:

- chaque note modifiee apparait dans une timeline.

### Sprint 3: Undo/Redo notes

Duree: 5 a 10 jours.

Taches:

1. `undoRedoService`.
2. Commandes `schoolab.undo`, `schoolab.redo`.
3. Raccourcis.
4. UI status bar ou toast.
5. Tests.

Critere final:

- une note modifiee peut etre annulee et refaite.

---

## 26. Definition de "done" globale

Une phase n'est terminee que si:

- TypeScript passe.
- Les migrations n'ecrasent pas les anciennes donnees.
- Les operations critiques sont testees manuellement.
- Le changelog utilisateur est clair.
- La feature fonctionne avec clavier.
- La feature ne casse pas le serveur mobile.
- La feature garde les donnees syncables.
- Le comportement est documente dans `docs/`.

---

## 27. Sources et references techniques

References etudiees pour cadrer le plan:

- Tauri v2: commandes frontend -> Rust, evenements, commandes async et modules separes: https://v2.tauri.app/develop/calling-rust/
- Tauri v2: state management cote Rust: https://v2.tauri.app/develop/state-management/
- Tauri v2: plugins et ecosysteme desktop: https://v2.tauri.app/develop/plugins/
- SQLite Write-Ahead Logging: https://sqlite.org/wal.html
- Code Schoolab actuel:
  - `src/renderer/App.tsx`
  - `src/renderer/components/class/Class.tsx`
  - `src/renderer/components/class/ClassDetails.tsx`
  - `src/renderer/hooks/useGrades.ts`
  - `src/renderer/hooks/useStudents.ts`
  - `src/renderer/context/CacheContext.tsx`
  - `src/renderer/components/layout/Layout.tsx`
  - `src/renderer/components/layout/Sidebar.tsx`
  - `src/renderer/services/databaseService.ts`
  - `src/renderer/services/gradeService.ts`
  - `src/renderer/services/networkService.ts`
  - `src-tauri/src/db.rs`
  - `src-tauri/src/server.rs`
  - `src-tauri/src/sync.rs`

---

## 28. Decision recommandee

Je recommande de commencer par:

1. **Command Palette + Command Registry**
2. **Operation Log pour les notes**
3. **Undo/Redo pour les notes**
4. **Selection multi-cellules + copier-coller Excel**
5. **Workbench Shell avec onglets**

Pourquoi cet ordre:

- la palette donne rapidement une sensation editeur;
- l'historique donne confiance;
- undo/redo reduit la peur de saisir vite;
- la grille Excel-like apporte un gain massif au metier;
- le workbench complet devient ensuite naturel, car les commandes et documents existent deja.

Ce chemin transforme Schoolab progressivement, sans mettre en danger les bulletins, la synchro ou les donnees existantes.
