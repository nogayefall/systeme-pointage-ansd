# Correctifs backend – à appliquer dans ton dossier `backend/`

## 1. Copier les fichiers
Copie le contenu de ce dossier par-dessus ton projet (les chemins sont les mêmes : `config/`, `migrations/`, `src/`).

## 2. Supprimer 3 fichiers devenus inutiles
- `src/Controller/Api/RoleController.php`  (doublon de `src/Controller/RoleController.php`, mêmes routes `/api/roles`)
- `src/Command/InitPermissionsCommand.php` (remplacée par `app:init-roles`, qui utilise une seule convention de noms)
- `src/Command/CreateSecurityAgentCommand.php` (mot de passe `agent123` écrit en dur ; `app:seed-demo` crée les agents de sécurité)

## 3. Lancer, dans l'ordre (WAMP : MySQL doit être démarré)
```
php bin/console cache:clear
php bin/console doctrine:migrations:migrate
php bin/console app:init-roles
php bin/console app:seed-demo
```
- `migrate` : tables en InnoDB, clés étrangères, nettoyage des lignes orphelines, jetons hachés.
  Tous les utilisateurs sont déconnectés (anciens jetons invalidés) : c'est normal.
- `app:seed-demo` : **supprime tous les pointages, congés, badges et utilisateurs sauf les Super Administrateurs**,
  puis crée 2 RH, 3 agents de sécurité, 34 agents, ~18 demandes de congé et ~3 600 pointages sur 8 semaines.
  Options : `--password=MonMotDePasse` (défaut `Ansd@2026`), `--weeks=12`, `--yes` (sans confirmation).
  Les identifiants sont écrits dans `demo-identifiants.csv` (à la racine du backend, ne pas le publier).
  Relancer la commande plus tard fait « glisser » les dates : le tableau de bord est toujours à jour.

## 4. Vérifier
```
php bin/console doctrine:schema:validate
php bin/console debug:router | findstr /i "api"
```
Les routes ne doivent plus apparaître en double (`/api/api/...`).

## À régler aussi dans `.env.local` (jamais dans `.env`, qui est versionné)
```
APP_SECRET=<une longue chaîne aléatoire>
DATABASE_URL="mysql://pointage:<mot_de_passe>@127.0.0.1:3306/mon_projet_pointage?serverVersion=9.1&charset=utf8mb4"
```

## Ce qui a changé
- Toute l'API exige un jeton (`access_control`), seule `/api/auth/login` est publique. Avant, un visiteur sans jeton atteignait les routes non gardées, et un jeton invalide était traité comme « anonyme ».
- Jetons : stockés hachés (SHA-256), expiration 12 h, révoqués à la déconnexion et à la désactivation du compte. Un seul jeton actif par utilisateur.
- Connexion : blocage 15 min après 5 échecs (même IP + même identifiant).
- Rôles : `ROLE_SUPER_ADMIN` hérite de `ROLE_RH_ADMIN` ; les 4 rôles de base et leurs permissions sont définis une seule fois (`PermissionCatalog`).
- Utilisateurs : création/modification/suppression réservées au Super Administrateur ; mot de passe d'un agent généré au hasard (affiché une fois) au lieu d'être égal au matricule ; suppression refusée s'il y a un historique (désactiver à la place) ; impossible de se supprimer ou se désactiver soi-même.
- Pointages : type et méthode validés ; alternance entrée/sortie imposée dans la journée (409 sinon) ; `suggestedType` renvoyé par `/pointages/check/{matricule}`.
- Congés : refus des périodes passées et des chevauchements ; décision possible une seule fois ; annulation par l'agent (`POST /api/leaves/{id}/cancel`).
- Statistiques / rapports : définition unique du retard (première arrivée de la journée après 08:30) et des jours ouvrés (lundi-vendredi) dans `WorkSchedule`.

## Mise à jour du 30/10/2026

Ajouts par rapport à la première livraison (tous les fichiers de ce zip sont à jour) :

- `Api/BadgeCodeController.php` : pagination bornée (plus de division par zéro), comptage SQL.
- `PointageController.php` : `/pointages/agents` corrigé (il plantait avec le nouveau format des rôles), `limit` borné sur `/pointages/my`, filtres `q`, `type`, `dateStart`, `dateEnd` sur `/pointages`.
- `Api/UserController.php` : recherche `q`, filtre par rôle, réinitialisation du mot de passe (`PUT /api/users/{id}` avec `{"resetPassword": true}` renvoie un mot de passe généré, affiché une seule fois).
- `Api/StatisticsController.php` : `agentsOnLeave` dans les KPI.
- `RoleController.php` : un rôle système ne peut ni être renommé ni supprimé.
