<?php
require_once __DIR__ . '/../backend/services/PredictionAI.php';

$history = [
    ['date_logged' => '2026-08-01', 'weight' => 82.0],
    ['date_logged' => '2026-08-08', 'weight' => 81.4],
    ['date_logged' => '2026-08-15', 'weight' => 80.9],
    ['date_logged' => '2026-08-22', 'weight' => 80.2],
    ['date_logged' => '2026-08-29', 'weight' => 79.8],
];

$profile = [
    'steps_estimate' => 7000,
    'sleep_hours' => 7,
    'stress_level' => 'low',
    'suggested_goal_weight' => 76,
];

$ai = new PredictionAI();
$result = $ai->predictNextMonth($history, $profile);

echo json_encode([
    'success' => is_array($result) && ($result['model_type'] ?? null) === 'php_local_neural_weight_regressor',
    'message' => 'PredictionAI neural validation complete',
    'result' => $result,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
?>
