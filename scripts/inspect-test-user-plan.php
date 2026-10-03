<?php
require_once __DIR__ . '/../backend/config/database.php';

$email = $argv[1] ?? '';
$db = (new Database())->getConnection();

$stmt = $db->prepare("
    SELECT u.id, u.email, u.name, w.plan_data, n.meal_data
    FROM users u
    LEFT JOIN workouts w ON w.user_id = u.id
    LEFT JOIN nutrition_plans n ON n.user_id = u.id
    WHERE u.email = ?
    ORDER BY w.id DESC, n.id DESC
    LIMIT 1
");
$stmt->execute([$email]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    echo "No user found.\n";
    exit(0);
}

$plan = json_decode($row['plan_data'] ?: '[]', true);
$meals = json_decode($row['meal_data'] ?: '[]', true);
$firstDay = $plan[0] ?? [];

echo "id={$row['id']} email={$row['email']} name={$row['name']}\n";
echo "workout_days=" . count($plan) . "\n";
echo "first_day=" . ($firstDay['day'] ?? 'none') . "\n";
foreach ($plan as $day) {
    $exerciseNames = array_map(fn($item) => $item['name'] ?? 'Unknown', $day['exercises'] ?? []);
    echo ($day['day'] ?? 'Unknown') . "=" . implode(', ', $exerciseNames) . "\n";
}
echo "meal_count=" . count($meals) . "\n";
