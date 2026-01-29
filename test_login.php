<?php
// Script de test pour vérifier les utilisateurs en base de données

// Charger Symfony
require_once __DIR__ . '/backend/config/bootstrap.php';

// Vous pouvez utiliser la console Symfony
echo "Pour tester la connexion, utilisez:\n\n";
echo "cd backend\n";
echo "php bin/console doctrine:query:sql \"SELECT id, email, matricule, nom, prenom, is_active FROM user WHERE email LIKE '%@%'\"\n\n";

echo "Ou accédez au endpoint API:\n";
echo "POST http://localhost:3000/api/auth/login\n";
echo "Content-Type: application/json\n\n";
echo '{"email":"admin@example.com","password":"password123"}\n';
?>
