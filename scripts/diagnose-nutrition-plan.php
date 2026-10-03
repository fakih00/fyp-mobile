<?php
require_once __DIR__ . '/../backend/config/database.php';

$db = (new Database())->getConnection();

foreach (['users', 'user_profiles', 'nutrition_plans', 'meal_reviews'] as $table) {
    try {
        $count = $db->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
        echo "{$table}: {$count}\n";
    } catch (Throwable $e) {
        echo "{$table}: unavailable\n";
    }
}

echo "\nUsers:\n";
$rows = $db->query("
    SELECT u.id, u.email, u.name, p.meals_per_day, p.goal
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    ORDER BY u.id
")->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $row) {
    echo "  id={$row['id']} email={$row['email']} name={$row['name']} meals_per_day={$row['meals_per_day']} goal={$row['goal']}\n";
}

echo "\nApproved review ids:\n";
$reviewRows = $db->query("SELECT meal_id, status FROM meal_reviews ORDER BY meal_id")->fetchAll(PDO::FETCH_ASSOC);
$approved = array_values(array_filter($reviewRows, fn($row) => $row['status'] === 'approved'));
echo "  approved=" . count($approved) . " total_reviews=" . count($reviewRows) . "\n";
foreach (array_slice($approved, 0, 30) as $row) {
    echo "  {$row['meal_id']}\n";
}

echo "\nLatest nutrition plans:\n";
$plans = $db->query("
    SELECT n.id, n.user_id, u.email, n.date_generated, n.meal_data
    FROM nutrition_plans n
    LEFT JOIN users u ON u.id = n.user_id
    ORDER BY n.id DESC
    LIMIT 5
")->fetchAll(PDO::FETCH_ASSOC);
foreach ($plans as $plan) {
    $meals = json_decode($plan['meal_data'], true);
    $total = is_array($meals) ? count($meals) : 0;
    $byDay = [];
    if (is_array($meals)) {
        foreach ($meals as $meal) {
            $day = $meal['day'] ?? 'Unknown';
            $byDay[$day] = ($byDay[$day] ?? 0) + 1;
        }
    }
    echo "  plan={$plan['id']} user={$plan['user_id']} email={$plan['email']} total={$total} by_day=" . json_encode($byDay) . "\n";
}
