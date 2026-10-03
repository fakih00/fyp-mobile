<?php
require_once __DIR__ . '/../backend/config/database.php';

$database = new Database();
$pdo = $database->getConnection();

$pdo->beginTransaction();

$email = 'pose@test.com';
$passwordHash = password_hash('PoseTest123!', PASSWORD_DEFAULT);

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$userId = (int)$stmt->fetchColumn();

if ($userId) {
    $stmt = $pdo->prepare('UPDATE users SET password_hash = ?, name = ? WHERE id = ?');
    $stmt->execute([$passwordHash, 'PoseForm Tester', $userId]);
} else {
    $stmt = $pdo->prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)');
    $stmt->execute([$email, $passwordHash, 'PoseForm Tester']);
    $userId = (int)$pdo->lastInsertId();
}

$profileValues = [
    $userId, 24, 'male', 175, 75, 'gain_muscle', 'moderately_active', 24.49,
    1, 0, 250, 0, 'moderate', 'gym',
    4, 'Lebanese food, chicken, rice, eggs', 'none', 'none', 4,
    78, 8000, 7.5, 'medium', 'none', 'Emerald',
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

$days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
$baseExercises = [
    ['squat', 'Squat', '1', '4 reps', '20s', 28, 'AI test: front or 45 degree view, full body visible. Pause tall, squat slowly, pause at the bottom, then stand tall.'],
    ['pushup', 'Push-Ups', '1', '4 reps', '20s', 30, 'AI test: side or 45 degree view. Keep shoulders, hips, knees, and feet inside frame; pause at top and bottom.'],
    ['lunge', 'Walking Lunges', '1', '4 reps', '20s', 34, 'AI test: front or 45 degree view. Step far enough that both knees bend clearly, then return with control.'],
    ['plank', 'Forearm Plank', '1', '20 sec', '20s', 18, 'AI test: side view from head to ankles. Hold a straight line without walking forward or leaving frame.'],
    ['bicepCurl', 'Bicep Curl', '1', '4 reps', '20s', 20, 'AI test: front or 45 degree waist-up view. Start arms straight, curl high, then lower fully each rep.'],
    ['shoulderPress', 'Shoulder Press', '1', '4 reps', '20s', 24, 'AI test: front waist-up view. Start at shoulder height, press above head, then return to shoulders.'],
    ['tricepDip', 'Bench Dips', '1', '4 reps', '20s', 28, 'AI test: side or 45 degree view. Keep hands, elbows, shoulders, hips, and knees visible through the dip.'],
    ['deadlift', 'Conventional Deadlift', '1', '4 reps', '20s', 36, 'AI test: side or 45 degree view. Show shoulders, hips, knees, and ankles; hinge down and stand tall.'],
    ['row', 'Dumbbell Row', '1', '4 reps', '20s', 26, 'AI test: 45 degree view. Keep torso and working arm visible; extend the elbow, pull back, then extend again.'],
    ['jumpingJack', 'Jumping Jacks', '1', '6 reps', '20s', 32, 'AI test: front view, full body visible. Open arms and legs wide, touch the start position between reps.'],
    ['mountainClimber', 'Mountain Climbers', '1', '8 reps', '20s', 34, 'AI test: side or 45 degree view. Keep shoulders, hips, knees, and feet visible; drive knees clearly.'],
    ['gluteBridge', 'Glute Bridge', '1', '4 reps', '20s', 22, 'AI test: side view. Show shoulders, hips, knees, and feet; lift hips fully and lower to the floor each rep.'],
    ['calfRaise', 'Standing Calf Raises', '1', '6 reps', '20s', 18, 'AI test: side or front lower-body view. Rise onto toes, pause briefly, then lower heels fully.'],
    ['benchPress', 'Bench Press', '1', '4 reps', '20s', 38, 'AI test: 45 degree view from the bench side. Keep elbows, shoulders, wrists, and chest visible.'],
    ['latPulldown', 'Lat Pulldown', '1', '4 reps', '20s', 30, 'AI test: front upper-body view. Reach arms up fully, pull elbows down, then return to the top.'],
    ['pullup', 'Pull-Ups', '1', '3 reps', '20s', 36, 'AI test: front or 45 degree upper-body view. Start from a dead hang, pull high, then return down.'],
    ['legPress', 'Leg Press', '1', '4 reps', '20s', 40, 'AI test: 45 degree view. Show hips, knees, and feet; bend knees deeply, then press to extension.'],
    ['legExtension', 'Leg Extensions', '1', '4 reps', '20s', 24, 'AI test: side view. Show hip, knee, ankle, and machine pad; extend knee fully and lower slowly.'],
    ['legCurl', 'Hamstring Curl', '1', '4 reps', '20s', 24, 'AI test: side view. Show hip, knee, ankle, and pad; curl heel back clearly, then return.'],
    ['lateralRaise', 'Lateral Raise', '1', '4 reps', '20s', 22, 'AI test: front waist-up view. Start arms by sides, raise to shoulder height, pause, then lower.'],
    ['chestFly', 'Chest Fly', '1', '4 reps', '20s', 28, 'AI test: front or 45 degree view. Keep shoulders, elbows, and wrists visible through the full arc.'],
    ['crunch', 'Crunches', '1', '6 reps', '20s', 22, 'AI test: side view. Keep head, shoulders, hips, and knees visible; curl shoulders up and lower fully.'],
    ['burpee', 'Burpees', '1', '3 reps', '20s', 42, 'AI test: 45 degree full-body view. Show squat, floor phase, stand-up, and jump/reach in every rep.'],
    ['locomotion', 'Bear Crawls', '1', '20 sec', '20s', 35, 'AI test: side or 45 degree full-body view. Move slowly across frame and keep hands and feet visible.'],
];

$plan = [];
foreach ($days as $day) {
    $exercises = [];
    foreach ($baseExercises as $exercise) {
        [$key, $name, $sets, $reps, $rest, $kcal, $guide] = $exercise;
        $exercises[] = [
            'id' => $day . '-' . $key,
            'name' => $name,
            'sets' => $sets,
            'reps' => $reps,
            'rest' => $rest,
            'kcal' => $kcal,
            'guide' => $guide,
            'completed' => false,
        ];
    }

    $plan[] = [
        'id' => 'poseform-' . $day,
        'day' => $day,
        'title' => 'PoseForm AI Full Test Workout',
        'subtitle' => 'All supported exercises for recording analysis',
        'category' => 'AI Form',
        'difficulty' => 'Test',
        'image' => 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80',
        'rationale' => 'This plan exposes every supported recorded-video exercise so the AI module can be tested across lower body, upper body, core, floor work, and conditioning.',
        'muscles' => ['Quads', 'Chest', 'Back', 'Biceps', 'Shoulders', 'Core', 'Glutes'],
        'duration' => '45 min',
        'kcal' => 680,
        'intensity' => 5,
        'completed' => false,
        'exercises' => $exercises,
    ];
}

$stmt = $pdo->prepare('DELETE FROM workouts WHERE user_id = ?');
$stmt->execute([$userId]);

$stmt = $pdo->prepare('INSERT INTO workouts (user_id, plan_data, date_generated, completed) VALUES (?, ?, CURDATE(), 0)');
$stmt->execute([$userId, json_encode($plan, JSON_UNESCAPED_SLASHES)]);

$meals = [];
foreach ($days as $day) {
    $meals[] = [
        'id' => $day . '-breakfast',
        'day' => $day,
        'meal' => 'Breakfast',
        'name' => 'Eggs, Labneh & Whole Wheat Pita',
        'calories' => 520,
        'protein' => 34,
        'carbs' => 48,
        'fats' => 22,
        'completed' => false,
    ];
    $meals[] = [
        'id' => $day . '-lunch',
        'day' => $day,
        'meal' => 'Lunch',
        'name' => 'Chicken Rice Bowl',
        'calories' => 720,
        'protein' => 52,
        'carbs' => 82,
        'fats' => 18,
        'completed' => false,
    ];
    $meals[] = [
        'id' => $day . '-dinner',
        'day' => $day,
        'meal' => 'Dinner',
        'name' => 'Tuna Potato Salad',
        'calories' => 610,
        'protein' => 46,
        'carbs' => 58,
        'fats' => 20,
        'completed' => false,
    ];
}

$stmt = $pdo->prepare('DELETE FROM nutrition_plans WHERE user_id = ?');
$stmt->execute([$userId]);

$stmt = $pdo->prepare(
    'INSERT INTO nutrition_plans (user_id, meal_data, calories, protein, carbs, fats, is_recomp, date_generated)
     VALUES (?, ?, ?, ?, ?, ?, 0, CURDATE())'
);
$stmt->execute([$userId, json_encode($meals, JSON_UNESCAPED_SLASHES), 2200, 165, 240, 70]);

$pdo->commit();

echo "Seeded PoseForm full AI test workout for {$email} with user_id={$userId}\n";
