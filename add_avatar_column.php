<?php
require_once __DIR__ . '/backend/config/database.php';

try {
    $db = (new Database())->getConnection();
    
    // Add avatar column to user_profiles
    $sql = "ALTER TABLE user_profiles ADD COLUMN avatar LONGTEXT DEFAULT NULL AFTER allergies";
    $db->exec($sql);
    
    echo "Database updated successfully: avatar column added.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column 'avatar' already exists.\n";
    } else {
        echo "Error updating database: " . $e->getMessage() . "\n";
    }
}
