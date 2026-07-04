<?php
/**
 * Migration: Expand user_profiles.goal ENUM to include sport-specific goals
 * 
 * Safe to run on existing database — does NOT drop or truncate data.
 * Run once: php migration_goals.php
 */
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("❌ Error connecting to database.\n");
}

echo "✅ Database connection successful!\n";

// Expand goal ENUM to include new sport-specific goals
$sql = "ALTER TABLE user_profiles 
        MODIFY COLUMN goal ENUM(
            'lose_weight',
            'build_muscle',
            'gain_muscle',
            'keep_fit',
            'maintain',
            'gain_weight',
            'improve_stamina',
            'running',
            'boxing',
            'swimming',
            'cycling',
            'martial_arts',
            'yoga_flexibility'
        ) NOT NULL";

try {
    $db->exec($sql);
    echo "✅ user_profiles.goal ENUM expanded successfully!\n";
    echo "   New values: running, boxing, swimming, cycling, martial_arts, yoga_flexibility\n";
} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n🎉 Migration complete. All 10 goals are now supported.\n";
