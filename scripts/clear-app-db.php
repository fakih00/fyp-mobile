<?php
require_once __DIR__ . '/../backend/config/database.php';

$database = new Database();
$db = $database->getConnection();

$tables = [];
$stmt = $db->query('SHOW TABLES');
while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
    $tables[] = $row[0];
}

if (!$tables) {
    echo "No tables found.\n";
    exit(0);
}

echo "Clearing database tables...\n";
$db->exec('SET FOREIGN_KEY_CHECKS = 0');
foreach ($tables as $table) {
    $safeTable = str_replace('`', '``', $table);
    $db->exec("TRUNCATE TABLE `{$safeTable}`");
    echo "  cleared {$table}\n";
}
$db->exec('SET FOREIGN_KEY_CHECKS = 1');

echo "Reseeding base catalogs...\n";
require __DIR__ . '/../backend/seed_challenges.php';
echo "\n";
require __DIR__ . '/../backend/seed_rewards.php';
echo "\n";
require __DIR__ . '/../backend/migration_achievements.php';

echo "\nDatabase reset complete.\n";
