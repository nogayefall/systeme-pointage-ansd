# Système de Pointage Informatisé

Un système complet de gestion des pointages pour une organisation, avec contrôle par code-barres et interface dédiée pour les agents de sécurité.

## Structure du projet

```
mon_projet_pointage/
├── backend/              # API Symfony
│   ├── src/
│   ├── config/
│   ├── templates/
│   ├── public/
│   ├── composer.json
│   └── ...
├── frontend/             # Application React
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── .editorconfig
└── .gitignore
```

## Installation

### Backend (Symfony)

```bash
cd backend
composer install
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
php bin/console server:run
```

L'API sera disponible à : `http://localhost:8000`

### Frontend (React)

```bash
cd frontend
npm install
npm start
```

L'application sera disponible à : `http://localhost:3000`

## Technologies

- **Backend** : Symfony 8.0
- **Frontend** : React 18
- **Base de données** : MySQL
- **Authentification** : JWT (à implémenter)

## Fonctionnalités principales

- Gestion des utilisateurs (Super Admin, RH, Sécurité, Agents)
- Pointage par code-barres
- Pointage manuel en cas d'incident
- Dashboard administrateur
- Historique et statistiques des pointages
- Gestion des rôles et permissions

---

**Prêt à commencer le développement!** 🚀
