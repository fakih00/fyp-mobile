<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Error connecting to database.\n");
}

echo "Database connection successful!\n";

$columnsToAdd = [
    'injuries' => 'TEXT DEFAULT NULL',
    'pain_points' => 'TEXT DEFAULT NULL',
    'strong_side' => 'VARCHAR(50) DEFAULT NULL',
    'posture_problems' => 'TEXT DEFAULT NULL',
    'mobility_limitations' => 'TEXT DEFAULT NULL',
    'avoid_areas' => 'TEXT DEFAULT NULL',
    'chronic_pain' => 'TEXT DEFAULT NULL'
];

try {
    foreach ($columnsToAdd as $col => $type) {
        // Check if column already exists
        $checkQuery = "SHOW COLUMNS FROM user_profiles LIKE '$col'";
        $stmt = $db->query($checkQuery);
        if ($stmt->rowCount() == 0) {
            echo "Adding column '$col' to 'user_profiles' table...\n";
            $alterQuery = "ALTER TABLE user_profiles ADD COLUMN $col $type";
            $db->exec($alterQuery);
            echo "Column '$col' added successfully!\n";
        } else {
            echo "Column '$col' already exists in 'user_profiles' table. Skipping.\n";
        }
    }
    echo "Migration completed successfully!\n";
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
?>
