<?php
require_once __DIR__ . '/../backend/config/database.php';

$database = new Database();
$db = $database->getConnection();

$rows = $db->query('SELECT id, plan_data FROM workouts')->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as $row) {
    $plan = json_decode($row['plan_data'], true);
    if (!is_array($plan)) {
        continue;
    }

    foreach ($plan as &$workout) {
        if (!is_array($workout)) {
            continue;
        }

        $workout['category'] = $workout['category'] ?? 'AI Form';
        $workout['difficulty'] = $workout['difficulty'] ?? 'Test';
        $workout['image'] = $workout['image'] ?? 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80';
        $workout['rationale'] = $workout['rationale'] ?? 'This plan uses clear movement patterns so PoseForm can test camera detection, joint tracking, form feedback, and rep counting.';
        $workout['muscles'] = $workout['muscles'] ?? ['Quads', 'Chest', 'Biceps', 'Shoulders', 'Core'];
    }

    $stmt = $db->prepare('UPDATE workouts SET plan_data = ? WHERE id = ?');
    $stmt->execute([json_encode($plan, JSON_UNESCAPED_SLASHES), $row['id']]);
}

echo 'Repaired workout fields for ' . count($rows) . " workout row(s).\n";
