<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();
$stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_profiles' AND COLUMN_NAME='notification_preferences'");
$stmt->execute();
if (!(int)$stmt->fetchColumn()) $db->exec('ALTER TABLE user_profiles ADD COLUMN notification_preferences TEXT NULL');
echo "Profile settings migration completed.\n";
