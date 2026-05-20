<?php
require_once __DIR__ . '/config/database.php';
$db = new Database();
$conn = $db->getConnection();
if ($conn) {
    echo "Database connection successful!\n";
} else {
    echo "Database connection failed.\n";
}
?>
