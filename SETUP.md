# Système de Pointage Informatisé - Guide de Démarrage

##  Prérequis

- PHP >= 8.4
- Composer
- Node.js >= 14
- npm ou yarn
- MySQL >= 8.0

##  Installation et Configuration

### 1. Backend (Symfony)

#### Installation des dépendances

```bash
cd backend
composer install
```

#### Configuration de la base de données

Assurez-vous que MySQL est en cours d'exécution et configurez localement `backend/.env.local` si nécessaire. Les fichiers `.env` contenant une configuration réelle ne doivent pas être versionnés :

```bash
cd backend
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
```

#### Générer les clés JWT

```bash
mkdir -p config/jwt
openssl genrsa -out config/jwt/private.pem 4096
openssl rsa -pubout -in config/jwt/private.pem -out config/jwt/public.pem
```

**Sous Windows (PowerShell)**, si OpenSSL n'est pas disponible, utilisez WSL ou installez Git Bash.

#### Initialiser les rôles et permissions

```bash
php bin/console app:init-roles
```

#### Créer un compte Super Admin

```bash
php bin/console app:create-super-admin
```

Entrez les informations demandées :
- Email : `admin@exemple.com`
- Mot de passe : `votre_mot_de_passe`
- Matricule : `ADM001`
- Nom : `Admin`
- Prénom : `Super`

#### Démarrer le serveur

```bash
php bin/console server:run
```

Le backend sera accessible à : **http://localhost:8000**

### 2. Frontend (React)

#### Installation des dépendances

```bash
cd frontend
npm install
```

#### Démarrer l'application

```bash
npm start
```

L'application sera accessible à : **http://localhost:3000**

##  Première Connexion

1. Ouvrez http://localhost:3000 dans votre navigateur
2. Vous serez redirigé vers la page de connexion
3. Entrez vos identifiants de Super Admin :
   - Email : `admin@exemple.com`
   - Mot de passe : `votre_mot_de_passe`
4. Après connexion, vous accédez au Dashboard Super Admin
   

##  Endpoints API Disponibles

### Authentification

- **POST** `/api/auth/login` - Connexion
- **GET** `/api/auth/me` - Récupérer l'utilisateur courant
- **POST** `/api/auth/refresh-token` - Renouveler le token
- **POST** `/api/auth/logout` - Déconnexion

### Utilisateurs (Super Admin uniquement)

- **GET** `/api/users` - Liste des utilisateurs
- **GET** `/api/users/{id}` - Détail d'un utilisateur
- **POST** `/api/users` - Créer un utilisateur
- **PUT** `/api/users/{id}` - Modifier un utilisateur
- **DELETE** `/api/users/{id}` - Supprimer un utilisateur

### Rôles (Super Admin uniquement)

- **GET** `/api/roles` - Liste des rôles
- **POST** `/api/roles` - Créer un rôle

##  Prochaines Étapes

1.  Authentification et Dashboard Super Admin
2. Interface de pointage (Agent de Sécurité)
3. Dashboard RH
4. Rapports et statistiques
5. Gestion des pointages manuels
6. Synchronisation temps réel

##  Dépannage

### Erreur de connexion à la base de données

```bash
cd backend
php bin/console doctrine:database:drop --force
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
```

### CORS errors

Vérifiez que `nelmio_cors` est configuré dans `config/packages/nelmio_cors.yaml` et que `symfony/cors` est installé.

### Token JWT invalide

Régénérez les clés JWT :

```bash
rm config/jwt/*
openssl genrsa -out config/jwt/private.pem 4096
openssl rsa -pubout -in config/jwt/private.pem -out config/jwt/public.pem
```

## Support

Pour toute question ou problème, consultez la documentation Symfony et React officielle.

---

**Projet Système de Pointage © 2026**
