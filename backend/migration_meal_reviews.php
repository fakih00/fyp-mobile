<?php
require_once __DIR__ . '/config/database.php';

$db = (new Database())->getConnection();
$db->exec("
    CREATE TABLE IF NOT EXISTS meal_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        meal_id VARCHAR(100) NOT NULL UNIQUE,
        status ENUM('approved','pending','needs_adjustment','rejected') NOT NULL DEFAULT 'pending',
        notes TEXT NULL,
        reviewed_by VARCHAR(100) NOT NULL DEFAULT 'Reviewer',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_meal_reviews_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

echo "meal_reviews ready\n";
