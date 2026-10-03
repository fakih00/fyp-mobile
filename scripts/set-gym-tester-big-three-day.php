<?php
require_once __DIR__ . '/../backend/config/database.php';

$email = 'gym.tester@fitfix.local';
$db = (new Database())->getConnection();

$stmt = $db->prepare("
    SELECT u.id, w.id AS workout_id, w.plan_data
    FROM users u
    JOIN workouts w ON w.user_id = u.id
    WHERE u.email = ?
    ORDER BY w.id DESC
    LIMIT 1
");
$stmt->execute([$email]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    throw new RuntimeException("No workout plan found for {$email}");
}

$plan = json_decode($row['plan_data'], true);
if (!is_array($plan) || !$plan) {
    throw new RuntimeException('Workout plan JSON is invalid.');
}

$bigThreeDay = [
    ['squat', 'Back Squat', '4', '6 reps', '90s', 95, 'PoseForm test: 45 degree full-body view. Stand tall, squat below parallel if comfortable, then lock out clearly.'],
    ['benchPress', 'Bench Press', '4', '6 reps', '90s', 85, 'PoseForm test: 45 degree bench-side view. Keep elbows, shoulders, wrists, and chest visible.'],
    ['deadlift', 'Conventional Deadlift', '4', '5 reps', '120s', 110, 'PoseForm test: side or 45 degree view. Show shoulders, hips, knees, and ankles; hinge down and stand tall.'],
    ['pullup', 'Pull-Ups', '4', '4 reps', '90s', 80, 'PoseForm test: front or 45 degree upper-body view. Start from a dead hang, pull high, then return down.'],
    ['row', 'Barbell Row', '3', '8 reps', '75s', 60, 'Hinge slightly, brace the core, pull elbows back, then extend fully.'],
];

$exercises = [];
foreach ($bigThreeDay as $exercise) {
    [$key, $name, $sets, $reps, $rest, $kcal, $guide] = $exercise;
    $exercises[] = [
        'id' => 'monday-' . $key,
        'name' => $name,
        'sets' => $sets,
        'reps' => $reps,
        'rest' => $rest,
        'kcal' => $kcal,
        'guide' => $guide,
        'completed' => false,
    ];
}

$plan[0]['day'] = 'Monday';
$plan[0]['title'] = 'Big Three Strength Test';
$plan[0]['subtitle'] = 'Squat, bench, deadlift, pull-up, and row in one demo session';
$plan[0]['category'] = 'Strength';
$plan[0]['difficulty'] = 'Intermediate';
$plan[0]['rationale'] = 'This first day groups the key gym movements together so the tester can demo TrainCore and PoseForm without changing days.';
$plan[0]['muscles'] = ['Quads', 'Chest', 'Back', 'Hamstrings', 'Glutes', 'Core'];
$plan[0]['duration'] = '60 min';
$plan[0]['kcal'] = array_sum(array_map(fn($item) => (int)$item[5], $bigThreeDay));
$plan[0]['intensity'] = 5;
$plan[0]['completed'] = false;
$plan[0]['exercises'] = $exercises;

$stmt = $db->prepare('UPDATE workouts SET plan_data = ?, completed = 0 WHERE id = ?');
$stmt->execute([json_encode($plan, JSON_UNESCAPED_SLASHES), (int)$row['workout_id']]);

echo "Updated {$email} Monday with squat, bench, deadlift, pull-up, and row.\n";
