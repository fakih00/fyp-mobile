<?php
require_once __DIR__ . '/../backend/config/database.php';

$database = new Database();
$db = $database->getConnection();

$email = 'pose@test.com';
$stmt = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$sourceUserId = (int)$stmt->fetchColumn();

if (!$sourceUserId) {
    require __DIR__ . '/seed-poseform-test-data.php';
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $sourceUserId = (int)$stmt->fetchColumn();
}

$stmt = $db->prepare('SELECT plan_data FROM workouts WHERE user_id = ? ORDER BY id DESC LIMIT 1');
$stmt->execute([$sourceUserId]);
$plan = $stmt->fetchColumn();

$stmt = $db->prepare('SELECT meal_data FROM nutrition_plans WHERE user_id = ? ORDER BY id DESC LIMIT 1');
$stmt->execute([$sourceUserId]);
$meal = $stmt->fetchColumn();

if (!$plan || !$meal) {
    require __DIR__ . '/seed-poseform-test-data.php';

    $stmt = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $sourceUserId = (int)$stmt->fetchColumn();

    $stmt = $db->prepare('SELECT plan_data FROM workouts WHERE user_id = ? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$sourceUserId]);
    $plan = $stmt->fetchColumn();

    $stmt = $db->prepare('SELECT meal_data FROM nutrition_plans WHERE user_id = ? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$sourceUserId]);
    $meal = $stmt->fetchColumn();
}

if (!$plan || !$meal) {
    throw new RuntimeException('PoseForm test data was not found.');
}

$userIds = $db->query('SELECT id FROM users')->fetchAll(PDO::FETCH_COLUMN);

$db->beginTransaction();
foreach ($userIds as $userId) {
    $db->prepare('DELETE FROM workouts WHERE user_id = ?')->execute([$userId]);
    $db->prepare('DELETE FROM nutrition_plans WHERE user_id = ?')->execute([$userId]);

    $db->prepare('INSERT INTO workouts (user_id, plan_data, date_generated, completed) VALUES (?, ?, CURDATE(), 0)')
        ->execute([$userId, $plan]);

    $db->prepare(
        'INSERT INTO nutrition_plans (user_id, meal_data, calories, protein, carbs, fats, is_recomp, date_generated)
         VALUES (?, ?, ?, ?, ?, ?, 0, CURDATE())'
    )->execute([$userId, $meal, 2200, 165, 240, 70]);
}
$db->commit();

echo 'Applied PoseForm test workout to ' . count($userIds) . " user(s).\n";
