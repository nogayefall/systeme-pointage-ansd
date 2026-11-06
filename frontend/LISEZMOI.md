# Nouveau front — Système de pointage ANSD

1. Dans ton projet front : **supprime l'ancien dossier `src/`** puis copie le `src/` de ce zip à la place.
2. Remplace `public/index.html` et `public/images/ansd-logo.png` par ceux du zip.
3. Aucune nouvelle dépendance : `npm start` suffit (React, react-router-dom v6, axios, chart.js, react-chartjs-2 déjà dans ton package.json).
4. L'API est lue dans `REACT_APP_API_URL` (par défaut `http://127.0.0.1:8000/api`).

Adresses : `/connexion` (page unique), `/admin` (tableau de bord), `/admin/pointages|conges|rapports|statistiques|utilisateurs|roles|badges`, `/securite`, `/agent`, `/agent/pointages`, `/agent/conges`. Les anciennes adresses redirigent.
