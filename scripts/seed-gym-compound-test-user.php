<?php
require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/services/NutritionAI.php';

$database = new Database();
$pdo = $database->getConnection();

$email = 'gym.tester@fitfix.local';
$password = 'GymTest123!';
$name = 'Gym Tester';
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$pdo->beginTransaction();

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$userId = (int)$stmt->fetchColumn();

if ($userId) {
    $stmt = $pdo->prepare('UPDATE users SET password_hash = ?, name = ? WHERE id = ?');
    $stmt->execute([$passwordHash, $name, $userId]);
} else {
    $stmt = $pdo->prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)');
    $stmt->execute([$email, $passwordHash, $name]);
    $userId = (int)$pdo->lastInsertId();
}

$profileValues = [
    $userId, 24, 'male', 178, 78, 'gain_muscle', 'moderately_active', 24.62,
    1, 0, 300, 0, 'heavy', 'gym',
    4, 'chicken, rice, eggs, labneh, Lebanese food', 'none', 'none', 4,
    82, 9000, 7.5, 'medium', 'none', 'Emerald',
];

$stmt = $pdo->prepare('SELECT user_id FROM user_profiles WHERE user_id = ? LIMIT 1');
$stmt->execute([$userId]);
$profileId = (int)$stmt->fetchColumn();

if ($profileId) {
    $stmt = $pdo->prepare(
        'UPDATE user_profiles SET
            age = ?, gender = ?, height = ?, weight = ?, goal = ?, activity_level = ?, bmi = ?,
            level = ?, xp = ?, points = ?, streak = ?, training_intensity = ?, training_location = ?,
            training_days_per_week = ?, likes = ?, dislikes = ?, allergies = ?, meals_per_day = ?,
            target_weight = ?, steps_estimate = ?, sleep_hours = ?, stress_level = ?, injuries = ?, theme = ?
         WHERE user_id = ?'
    );
    $stmt->execute(array_merge(array_slice($profileValues, 1), [$userId]));
} else {
    $stmt = $pdo->prepare(
        'INSERT INTO user_profiles (
            user_id, age, gender, height, weight, goal, activity_level, bmi,
            level, xp, points, streak, training_intensity, training_location,
            training_days_per_week, likes, dislikes, allergies, meals_per_day,
            target_weight, steps_estimate, sleep_hours, stress_level, injuries, theme
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute($profileValues);
}

$weeklySplit = [
    'Monday' => [
        ['squat', 'Back Squat', '4', '6 reps', '90s', 95, 'PoseForm test: 45 degree full-body view. Stand tall, squat below parallel if comfortable, then lock out clearly.'],
        ['benchPress', 'Bench Press', '4', '6 reps', '90s', 85, 'PoseForm test: 45 degree bench-side view. Keep elbows, shoulders, wrists, and chest visible.'],
        ['row', 'Barbell Row', '3', '8 reps', '75s', 60, 'Hinge slightly, brace the core, pull elbows back, then extend fully.'],
        ['plank', 'Forearm Plank', '3', '30 sec', '45s', 35, 'Side view from head to ankles. Keep hips level and ribs down.'],
    ],
    'Tuesday' => [
        ['deadlift', 'Conventional Deadlift', '4', '5 reps', '120s', 110, 'PoseForm test: side or 45 degree view. Show shoulders, hips, knees, and ankles; hinge down and stand tall.'],
        ['pullup', 'Pull-Ups', '4', '4 reps', '90s', 80, 'PoseForm test: front or 45 degree upper-body view. Start from a dead hang, pull high, then return down.'],
        ['latPulldown', 'Lat Pulldown', '3', '10 reps', '75s', 55, 'Reach arms up fully, pull elbows down, then return to the top.'],
        ['bicepCurl', 'Dumbbell Curl', '3', '10 reps', '60s', 35, 'Waist-up view. Start arms straight, curl high, then lower fully.'],
    ],
    'Wednesday' => [
        ['squat', 'Front Squat', '3', '6 reps', '90s', 85, 'PoseForm test: front or 45 degree full-body view. Keep torso upright and knees tracking over toes.'],
        ['legPress', 'Leg Press', '3', '10 reps', '75s', 75, '45 degree view. Bend knees deeply, then press to extension.'],
        ['legCurl', 'Hamstring Curl', '3', '10 reps', '60s', 45, 'Side view. Curl heel back clearly, then return.'],
        ['calfRaise', 'Standing Calf Raises', '3', '12 reps', '45s', 30, 'Rise onto toes, pause, then lower heels fully.'],
    ],
    'Thursday' => [
        ['benchPress', 'Incline Bench Press', '4', '6 reps', '90s', 80, 'PoseForm test: 45 degree bench-side view. Lower under control and press to straight arms.'],
        ['shoulderPress', 'Shoulder Press', '3', '8 reps', '75s', 55, 'Front waist-up view. Start at shoulder height, press above head, then return.'],
        ['chestFly', 'Chest Fly', '3', '10 reps', '60s', 45, 'Keep shoulders, elbows, and wrists visible through the full arc.'],
        ['tricepDip', 'Bench Dips', '3', '8 reps', '60s', 45, 'Side or 45 degree view. Keep hands, elbows, shoulders, hips, and knees visible.'],
    ],
    'Friday' => [
        ['deadlift', 'Romanian Deadlift', '3', '8 reps', '90s', 85, 'PoseForm test: side view. Hinge hips back, keep spine neutral, then stand tall.'],
        ['pullup', 'Pull-Ups', '4', '4 reps', '90s', 80, 'PoseForm test: front or 45 degree upper-body view. Use controlled full range.'],
        ['row', 'Dumbbell Row', '3', '10 reps', '75s', 55, 'Keep torso and working arm visible; extend, pull back, then extend again.'],
        ['lateralRaise', 'Lateral Raise', '3', '12 reps', '45s', 35, 'Front waist-up view. Raise to shoulder height, pause, then lower.'],
    ],
    'Saturday' => [
        ['squat', 'Goblet Squat', '3', '10 reps', '75s', 70, 'PoseForm test: front or 45 degree full-body view. Sit between the knees and stand tall.'],
        ['pushup', 'Push-Ups', '3', '10 reps', '60s', 55, 'Side view. Keep shoulders, hips, knees, and feet inside frame.'],
        ['gluteBridge', 'Glute Bridge', '3', '10 reps', '45s', 40, 'Side view. Lift hips fully and lower to the floor each rep.'],
        ['crunch', 'Crunches', '3', '12 reps', '45s', 35, 'Side view. Curl shoulders up and lower fully.'],
    ],
    'Sunday' => [
        ['plank', 'Core Reset Plank', '3', '30 sec', '45s', 35, 'Hold a straight line and breathe slowly.'],
        ['lunge', 'Walking Lunges', '3', '8 reps', '60s', 65, 'Front or 45 degree view. Step far enough that both knees bend clearly.'],
        ['jumpingJack', 'Jumping Jacks', '3', '15 reps', '45s', 45, 'Front full-body view. Open arms and legs wide, then close fully.'],
        ['calfRaise', 'Calf Raises', '3', '12 reps', '45s', 30, 'Rise onto toes, pause briefly, then lower heels fully.'],
    ],
];

$plan = [];
foreach ($weeklySplit as $day => $exercises) {
    $items = [];
    foreach ($exercises as $exercise) {
        [$key, $exerciseName, $sets, $reps, $rest, $kcal, $guide] = $exercise;
        $items[] = [
            'id' => strtolower($day) . '-' . $key,
            'name' => $exerciseName,
            'sets' => $sets,
            'reps' => $reps,
            'rest' => $rest,
            'kcal' => $kcal,
            'guide' => $guide,
            'completed' => false,
        ];
    }

    $plan[] = [
        'id' => 'gym-compound-' . strtolower($day),
        'day' => $day,
        'title' => in_array($day, ['Monday', 'Thursday'], true) ? 'Compound Push Strength' : (in_array($day, ['Tuesday', 'Friday'], true) ? 'Deadlift & Pull Strength' : 'Gym Technique Day'),
        'subtitle' => 'Advisor demo plan focused on squat, bench, deadlift, and pull-up',
        'category' => 'Strength',
        'difficulty' => 'Intermediate',
        'image' => 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80',
        'rationale' => 'This test plan focuses on classic gym compounds so TrainCore and PoseForm can be demonstrated with realistic strength exercises.',
        'muscles' => ['Quads', 'Chest', 'Back', 'Hamstrings', 'Shoulders', 'Core'],
        'duration' => '50 min',
        'kcal' => array_sum(array_map(fn($item) => (int)$item[5], $exercises)),
        'intensity' => 5,
        'completed' => false,
        'exercises' => $items,
    ];
}

$pdo->prepare('DELETE FROM workouts WHERE user_id = ?')->execute([$userId]);
$stmt = $pdo->prepare('INSERT INTO workouts (user_id, plan_data, date_generated, completed) VALUES (?, ?, CURDATE(), 0)');
$stmt->execute([$userId, json_encode($plan, JSON_UNESCAPED_SLASHES)]);

$reviews = [];
try {
    $rows = $pdo->query("SELECT meal_id, status, notes, reviewed_by, updated_at FROM meal_reviews")->fetchAll(PDO::FETCH_ASSOC);
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

$profile = [
    'user_id' => $userId,
    'age' => 24,
    'gender' => 'male',
    'height' => 178,
    'weight' => 78,
    'goal' => 'gain_muscle',
    'activity_level' => 'moderately_active',
    'training_intensity' => 'heavy',
    'training_location' => 'gym',
    'training_days_per_week' => 4,
    'likes' => 'chicken, rice, eggs, labneh, Lebanese food',
    'dislikes' => 'none',
    'allergies' => 'none',
    'meals_per_day' => 4,
    'target_weight' => 82,
];

$nutrition = new NutritionAI();
$calories = $nutrition->calculateCalories($profile);
$meals = $nutrition->generateMealPlan($calories, $profile, [], $reviews);

if (!$meals) {
    $mealTemplate = [
        ['Breakfast', 'Eggs, Labneh & Whole Wheat Pita', 560, 36, 50, 24],
        ['Lunch', 'Chicken Rice Bowl', 760, 54, 88, 18],
        ['Snack', 'Greek Yogurt Banana Bowl', 360, 28, 46, 8],
        ['Dinner', 'Beef Potato & Salad Plate', 680, 48, 62, 24],
    ];
    $meals = [];
    foreach (array_keys($weeklySplit) as $day) {
        foreach ($mealTemplate as $index => $meal) {
            [$type, $mealName, $mealCalories, $proteinValue, $carbValue, $fatValue] = $meal;
            $meals[] = [
                'id' => strtolower($day) . '-meal-' . ($index + 1),
                'day' => $day,
                'type' => $type,
                'meal' => $type,
                'name' => $mealName,
                'calories' => $mealCalories,
                'protein' => $proteinValue,
                'carbs' => $carbValue,
                'fats' => $fatValue,
                'ingredients' => ['eggs', 'labneh', 'chicken', 'rice', 'yogurt', 'beef', 'potato'],
                'instructions' => 'Prepare as a simple high-protein gym demo meal.',
                'approval' => ['status' => 'approved', 'manual' => true],
                'model_approved' => true,
                'expert_approved' => true,
                'source' => 'NutriCore demo seed plan',
                'ai_model' => 'NutriCore AI',
                'model_type' => 'seeded_approved_demo_plan',
                'completed' => false,
            ];
        }
    }
}

$pdo->prepare('DELETE FROM nutrition_plans WHERE user_id = ?')->execute([$userId]);
if ($meals) {
    $protein = round(($calories * 0.3) / 4);
    $carbs = round(($calories * 0.4) / 4);
    $fats = round(($calories * 0.3) / 9);
    $stmt = $pdo->prepare(
        'INSERT INTO nutrition_plans (user_id, meal_data, calories, protein, carbs, fats, is_recomp, date_generated)
         VALUES (?, ?, ?, ?, ?, ?, 0, CURDATE())'
    );
    $stmt->execute([$userId, json_encode($meals, JSON_UNESCAPED_SLASHES), $calories, $protein, $carbs, $fats]);
}

$pdo->commit();

echo "Seeded gym compound test user\n";
echo "email={$email}\n";
echo "password={$password}\n";
echo "user_id={$userId}\n";
echo "workout_days=" . count($plan) . "\n";
echo "meals=" . count($meals) . "\n";
