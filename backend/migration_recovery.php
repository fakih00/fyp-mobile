<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Error connecting to database.\n");
}

echo "Database connection successful!\n";

$sql = "CREATE TABLE IF NOT EXISTS `recovery_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `plan_data` LONGTEXT NOT NULL,
  `completed_items` TEXT DEFAULT NULL,
  `body_parts_status` TEXT DEFAULT NULL,
  `date_generated` DATE NOT NULL,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_recovery_plans_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

try {
    echo "Creating recovery_plans table...\n";
    $db->exec($sql);
    echo "Table 'recovery_plans' created successfully!\n";
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
?>
