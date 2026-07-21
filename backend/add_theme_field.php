<?php
require_once __DIR__ . '/config/database.php';

try {
    $dbClass = new Database();
    $db = $dbClass->getConnection();
    
    // Check if theme column exists in user_profiles
    $result = $db->query("SHOW COLUMNS FROM `user_profiles` LIKE 'theme'");
    $exists = $result->rowCount() > 0;
    
    if (!$exists) {
        $db->exec("ALTER TABLE `user_profiles` ADD COLUMN `theme` VARCHAR(50) DEFAULT 'Emerald'");
        echo "Column 'theme' successfully added to 'user_profiles' table.\n";
    } else {
        echo "Column 'theme' already exists in 'user_profiles' table.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
