<?php
require_once __DIR__ . '/../backend/services/PredictionAI.php';

function checkPrediction(bool $condition, string $message): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$ai = new PredictionAI();
$history = [
    ['date_logged' => '2026-08-01', 'weight' => 82.0],
    ['date_logged' => '2026-08-08', 'weight' => 81.3],
    ['date_logged' => '2026-08-15', 'weight' => 80.6],
    ['date_logged' => '2026-08-22', 'weight' => 79.9],
    ['date_logged' => '2026-08-29', 'weight' => 79.2],
];
$result = $ai->predictNextMonth($history);
checkPrediction($result['model_type'] === 'php_local_linear_weight_regressor', 'Wrong model type');
checkPrediction(abs($result['predicted_weight_30_days'] - 76.2) < 0.001, 'Incorrect straight-line forecast');
checkPrediction($result['validation_mae_kg'] === 0.0, 'Chronological validation should match exact linear data');
checkPrediction($result['r_squared'] === 1.0, 'Exact linear fit should have R-squared 1');
checkPrediction($ai->predictNextMonth(array_reverse($history)) === $result, 'Input ordering changes predictions');

$short = $ai->predictNextMonth(array_slice($history, 0, 2));
checkPrediction($short['validation_mae_kg'] === null, 'Two observations do not support held-out validation');
checkPrediction(is_string($ai->predictNextMonth([])), 'Insufficient-history response changed');
checkPrediction(is_string($ai->predictNextMonth([$history[0]])), 'Single observation must not forecast');

$sameDate = $ai->predictNextMonth([
    ['date_logged' => '2026-08-01', 'weight' => 80.0],
    ['date_logged' => '2026-08-01', 'weight' => 82.0],
]);
checkPrediction($sameDate['predicted_weight_30_days'] === 81.0, 'Same-day readings need a zero-slope mean');

$noisy = $history;
$noisy[2]['weight'] = 81.4;
$noiseResult = $ai->predictNextMonth($noisy);
checkPrediction($noiseResult['validation_mae_kg'] > 0, 'Noisy data must report actual held-out error');

echo json_encode(['success' => true, 'message' => 'PredictionAI linear regression validation complete',
                  'checks' => 10, 'result' => $result], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
