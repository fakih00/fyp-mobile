<?php
require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/services/NutritionAI.php';

$email = $argv[1] ?? '';
if (!$email) {
    fwrite(STDERR, "Usage: php scripts/regenerate-user-nutrition-plan.php <email>\n");
    exit(1);
}

$db = (new Database())->getConnection();
$stmt = $db->prepare("
    SELECT u.id, p.*
    FROM users u
    JOIN user_profiles p ON p.user_id = u.id
    WHERE u.email = ?
    LIMIT 1
");
$stmt->execute([$email]);
$profile = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$profile) {
    throw new RuntimeException("No profiled user found for {$email}");
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
if (!$plan) {
    throw new RuntimeException('NutriCore returned no meals.');
}

$weight = (float)$profile['weight'];
$targetWeight = (float)($profile['target_weight'] ?? $profile['suggested_goal_weight'] ?? 70);
$isRecomp = ($weight > $targetWeight) && ($profile['goal'] === 'gain_muscle');
$pRatio = $isRecomp ? 0.4 : 0.3;
$cRatio = $isRecomp ? 0.35 : 0.4;
$fRatio = $isRecomp ? 0.25 : 0.3;
$protein = round(($calories * $pRatio) / 4);
$carbs = round(($calories * $cRatio) / 4);
$fats = round(($calories * $fRatio) / 9);

$db->beginTransaction();
$db->prepare('DELETE FROM nutrition_plans WHERE user_id = ?')->execute([(int)$profile['user_id']]);
$insert = $db->prepare("
    INSERT INTO nutrition_plans (user_id, meal_data, calories, protein, carbs, fats, is_recomp, date_generated)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())
");
$insert->execute([
    (int)$profile['user_id'],
    json_encode($plan, JSON_UNESCAPED_SLASHES),
    $calories,
    $protein,
    $carbs,
    $fats,
    $isRecomp ? 1 : 0,
]);
$db->commit();

$byDay = [];
foreach ($plan as $meal) {
    $day = $meal['day'] ?? 'Unknown';
    $byDay[$day] = ($byDay[$day] ?? 0) + 1;
}

echo "Regenerated nutrition plan for {$email}\n";
echo "total_meals=" . count($plan) . " by_day=" . json_encode($byDay) . "\n";
