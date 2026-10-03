<?php
require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/services/NutritionAI.php';

$email = $argv[1] ?? null;

$db = (new Database())->getConnection();
if ($email) {
    $stmt = $db->prepare("
        SELECT p.*
        FROM user_profiles p
        JOIN users u ON u.id = p.user_id
        WHERE u.email = ?
        LIMIT 1
    ");
    $stmt->execute([$email]);
} else {
    $stmt = $db->query("SELECT * FROM user_profiles ORDER BY user_id DESC LIMIT 1");
}
$profile = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$profile) {
    throw new RuntimeException('No user profile found.');
}

$reviews = [];
try {
    $rows = $db->query("SELECT meal_id, status, notes, reviewed_by, updated_at FROM meal_reviews")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        $reviews[$row['meal_id']] = [
            'status' => $row['status'],
            'notes' => $row['notes'],
            'reviewed_by' => $row['reviewed_by'],
            'updated_at' => $row['updated_at'],
            'manual' => true,
        ];
    }
} catch (Throwable $e) {
    $reviews = [];
}

$ai = new NutritionAI();
$calories = $ai->calculateCalories($profile);
$plan = $ai->generateMealPlan($calories, $profile, [], $reviews);
$byDay = [];
$byType = [];
foreach ($plan as $meal) {
    $day = $meal['day'] ?? 'Unknown';
    $type = $meal['type'] ?? 'Unknown';
    $byDay[$day] = ($byDay[$day] ?? 0) + 1;
    $byType[$type] = ($byType[$type] ?? 0) + 1;
}

echo "profile_user_id={$profile['user_id']} meals_per_day={$profile['meals_per_day']} calories={$calories}\n";
echo "total_meals=" . count($plan) . "\n";
echo "by_day=" . json_encode($byDay) . "\n";
echo "by_type=" . json_encode($byType) . "\n";
