<?php
require_once __DIR__ . '/../backend/services/WorkoutAI.php';
require_once __DIR__ . '/../backend/services/NutritionAI.php';

function checkRecommendation(bool $condition, string $message): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$profile = [
    'goal' => 'build_muscle', 'training_location' => 'home',
    'training_days_per_week' => 3, 'training_intensity' => 'moderate',
    'injuries' => 'none', 'meals_per_day' => 4, 'weight' => 75,
    'allergies' => 'dairy,nuts', 'dislikes' => 'fish', 'likes' => 'rice',
];
$dataset = json_decode(file_get_contents(__DIR__ . '/../ml/nutrition_ai/processed_data/usda_meal_training_dataset.json'), true);
$reviews = [];
foreach ($dataset['meals'] as $meal) {
    $reviews[$meal['id']] = ['status' => 'approved'];
}

$workout = (new WorkoutAI())->generatePlan($profile);
checkRecommendation(count($workout) === 3, 'PHP workout bridge did not return three sessions');
checkRecommendation($workout[0]['model_type'] === 'python_local_random_forest_exercise_ranker', 'Workout bridge did not use Random Forest');

$nutrition = new NutritionAI();
$meals = $nutrition->generateMealPlan(2200, $profile, ['chicken', 'rice', 'broccoli'], $reviews);
checkRecommendation(count($meals) === 28, 'PHP nutrition bridge did not return a complete weekly plan');
checkRecommendation($meals[0]['model_type'] === 'python_local_random_forest_meal_ranker', 'Nutrition bridge did not use Random Forest');
$swaps = $nutrition->recommendSwaps($profile, 2200, ['chicken', 'rice'], [], $reviews, 5);
checkRecommendation(count($swaps['recommendations']) > 0, 'PHP swap bridge returned no approved suggestions');
$target = current(array_filter($meals, fn($meal) => $meal['type'] === 'Lunch'));
$replacement = $nutrition->replaceMealWithHint($target, 'use fridge ingredients', $profile, null, ['chicken', 'rice'], $reviews);
checkRecommendation(is_array($replacement) && $replacement['expert_approved'], 'PHP replacement bridge lost approval status');

echo json_encode(['success' => true, 'workout_sessions' => count($workout),
                  'meal_slots' => count($meals), 'swap_suggestions' => count($swaps['recommendations']),
                  'approved_replacement' => true]) . PHP_EOL;
