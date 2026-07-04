<?php
/**
 * Migration: Create daily_quests table
 * 
 * Run once: php migration_quests.php
 */
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("❌ Error connecting to database.\n");
}

echo "✅ Database connection successful!\n";

$sql = "CREATE TABLE IF NOT EXISTS `daily_quests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `quest_type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `target_value` INT NOT NULL,
  `current_value` INT NOT NULL DEFAULT 0,
  `xp_reward` INT NOT NULL DEFAULT 50,
  `points_reward` INT NOT NULL DEFAULT 10,
  `completed` TINYINT(1) NOT NULL DEFAULT 0,
  `claimed` TINYINT(1) NOT NULL DEFAULT 0,
  `date_logged` DATE NOT NULL,
  UNIQUE KEY `uq_user_quest_date` (`user_id`, `quest_type`, `date_logged`),
  CONSTRAINT `fk_daily_quests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

try {
    echo "Creating daily_quests table...\n";
    $db->exec($sql);
    echo "✅ Table 'daily_quests' created successfully!\n";
} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n🎉 Migration complete. Table is ready.\n";
?>
