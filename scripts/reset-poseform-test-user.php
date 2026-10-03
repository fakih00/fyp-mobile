<?php
require_once __DIR__ . '/../backend/config/database.php';

$database = new Database();
$pdo = $database->getConnection();

$email = 'pose@test.com';
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$userId = (int)$stmt->fetchColumn();

if (!$userId) {
    require __DIR__ . '/seed-poseform-test-data.php';
    exit(0);
}

$stmt = $pdo->prepare('SELECT id, plan_data FROM workouts WHERE user_id = ? ORDER BY id DESC LIMIT 1');
$stmt->execute([$userId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    require __DIR__ . '/seed-poseform-test-data.php';
    exit(0);
}

$plan = json_decode($row['plan_data'], true);
if (!is_array($plan)) {
    throw new RuntimeException('PoseForm workout JSON is invalid.');
}

foreach ($plan as &$day) {
    if (!is_array($day)) continue;
    $day['completed'] = false;
    if (!empty($day['exercises']) && is_array($day['exercises'])) {
        foreach ($day['exercises'] as &$exercise) {
            if (is_array($exercise)) {
                $exercise['completed'] = false;
            }
        }
        unset($exercise);
    }
}
unset($day);

$stmt = $pdo->prepare('UPDATE workouts SET plan_data = ?, completed = 0 WHERE user_id = ?');
$stmt->execute([json_encode($plan, JSON_UNESCAPED_SLASHES), $userId]);

$stmt = $pdo->prepare('UPDATE user_profiles SET xp = 0, streak = 0 WHERE user_id = ?');
$stmt->execute([$userId]);

echo "Reset PoseForm test user {$email} workout progress for user_id={$userId}\n";
