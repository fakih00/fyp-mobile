<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();
$db->exec("CREATE TABLE IF NOT EXISTS club_messages (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_club_messages (club_id, id),
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
echo "Community chat migration completed.\n";
