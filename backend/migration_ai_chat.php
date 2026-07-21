<?php
/**
 * migration_ai_chat.php
 * 
 * Creates the ai_chat_history table to persist AI Coach conversations per user.
 * Run this once: php migration_ai_chat.php
 */

require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

$sql = "
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    role        ENUM('user', 'model') NOT NULL,
    message     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

try {
    $db->exec($sql);
    echo "✅ ai_chat_history table created successfully.\n";
} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
}
