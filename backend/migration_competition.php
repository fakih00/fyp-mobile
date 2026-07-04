<?php
/**
 * Migration: Create competition_plans table
 * 
 * Run once: php migration_competition.php
 */
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("❌ Error connecting to database.\n");
}

echo "✅ Database connection successful!\n";

$sql = "CREATE TABLE IF NOT EXISTS `competition_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `competition_name` VARCHAR(255) NOT NULL,
  `competition_date` DATE NOT NULL,
  `competition_type` VARCHAR(100) NOT NULL,
  `weeks_duration` INT NOT NULL,
  `specific_goal` TEXT DEFAULT NULL,
  `fitness_level` VARCHAR(50) DEFAULT NULL,
  `plan_data` LONGTEXT NOT NULL,
  `completed_milestones` TEXT DEFAULT NULL,
  `date_generated` DATE NOT NULL,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_competition_plans_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

try {
    echo "Creating competition_plans table...\n";
    $db->exec($sql);
    echo "✅ Table 'competition_plans' created successfully!\n";
} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n🎉 Migration complete. Table is ready.\n";
?>
