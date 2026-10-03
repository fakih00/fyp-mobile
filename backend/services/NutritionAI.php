<?php

class NutritionAI {
    private $lastError = null;

    public function getLastError(): ?string {
        return $this->lastError;
    }

    // =========================================================================
    // CALORIE CALCULATION — stays local (math-based, no AI needed)
    // =========================================================================
    public function calculateCalories($profile) {
        // Mifflin-St Jeor Equation
        $weight = $profile['weight']; // kg
        $height = $profile['height']; // cm
        $age = $profile['age'];
        $gender = $profile['gender'];
        $activity = $profile['activity_level'];
        $goal = $profile['goal'];

        $bmr = (10 * $weight) + (6.25 * $height) - (5 * $age);
        if ($gender === 'male') { $bmr += 5; } else { $bmr -= 161; }

        $multiplier = 1.2;
        switch($activity) {
             case 'lightly_active': $multiplier = 1.375; break;
             case 'moderately_active': $multiplier = 1.55; break;
             case 'very_active': $multiplier = 1.725; break;
             case 'super_active': $multiplier = 1.9; break;
        }

        $tdee = $bmr * $multiplier;

        $targetWeight = $profile['target_weight'] ?? $profile['suggested_goal_weight'] ?? 70;
        $shouldLose = $weight > $targetWeight;
        $isRecomp = $shouldLose && ($goal === 'gain_muscle');

        if ($isRecomp) return round($tdee - 250);
        if ($goal === 'lose_weight') return round($tdee - 500);
        if ($goal === 'gain_muscle' || $goal === 'gain_weight') return round($tdee + 250);

        // Sport-specific calorie adjustments
        if (in_array($goal, ['running', 'cycling', 'swimming'])) {
            return round($tdee + 350);
        }
        if (in_array($goal, ['boxing', 'martial_arts'])) {
            return round($tdee + 250);
        }
        if ($goal === 'yoga_flexibility') {
            return round($tdee - 100);
        }

        return round($tdee);
    }

    // =========================================================================
    // MEAL PLAN GENERATION — Always use the local nutrition module.
    // =========================================================================
    public function generateMealPlan($calories, $profile, array $fridgeIngredients = [], array $approvalReviews = []) {
        $pythonPlan = $this->generateWithPython($calories, $profile, $fridgeIngredients, $approvalReviews);
        if (is_array($pythonPlan) && count($pythonPlan) > 0) {
            return $pythonPlan;
        }

        error_log('NutriCore AI Python generation failed.');
        return [];
    }

    private function generateWithPython($calories, $profile, array $fridgeIngredients = [], array $approvalReviews = []): ?array {
        $script = realpath(__DIR__ . '/../../ml/nutrition_ai/nutricore_model.py');
        if (!$script) {
            error_log('NutriCore AI Python model not found.');
            return null;
        }

        $payload = [
            'calories' => (int)$calories,
            'profile' => $profile,
            'fridge_ingredients' => array_values($fridgeIngredients),
            'approval_reviews' => $approvalReviews,
        ];
        $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES);
        if ($payloadJson === false) {
            return null;
        }

        [$exitCode, $raw, $payload] = $this->runPythonJson($script, '--payload-file', $payloadJson);

        if ($exitCode !== 0 || !is_array($payload) || empty($payload['success']) || empty($payload['plan']) || !is_array($payload['plan'])) {
            error_log('NutriCore AI Python generation failed: ' . $raw);
            return null;
        }

        return $payload['plan'];
    }

    public function replaceMealWithHint($mealToReplace, $hint, array $profile = [], $replacement = null, array $fridgeIngredients = []) {
        $this->lastError = null;
        $pythonMeal = $this->replaceWithPython($mealToReplace, $hint, $profile, $replacement, $fridgeIngredients);
        if (is_array($pythonMeal) && !empty($pythonMeal['name'])) {
            return $pythonMeal;
        }

        if (!$this->lastError) {
            $this->lastError = 'NutriCore could not find a safe replacement for this meal slot.';
        }
        error_log('NutriCore AI Python swap replacement failed. ' . $this->lastError);
        return null;
    }

    private function replaceWithPython($mealToReplace, $hint, array $profile = [], $replacement = null, array $fridgeIngredients = []): ?array {
        $script = realpath(__DIR__ . '/../../ml/nutrition_ai/nutricore_model.py');
        if (!$script) {
            error_log('NutriCore AI Python swap model not found.');
            return null;
        }

        if (is_object($replacement)) {
            $replacement = (array)$replacement;
        }

        $payload = [
            'target_meal' => $mealToReplace,
            'hint' => (string)$hint,
            'profile' => $profile,
            'fridge_ingredients' => array_values($fridgeIngredients),
            'replacement' => is_array($replacement) ? $replacement : null,
        ];
        $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES);
        if ($payloadJson === false) {
            return null;
        }

        [$exitCode, $raw, $payload] = $this->runPythonJson($script, '--replace-file', $payloadJson);

        if ($exitCode !== 0 || !is_array($payload) || empty($payload['success']) || empty($payload['replacement']) || !is_array($payload['replacement'])) {
            if (is_array($payload) && !empty($payload['error'])) {
                $this->lastError = (string)$payload['error'];
            } else {
                $this->lastError = 'NutriCore Python swap failed to return a valid replacement.';
            }
            error_log('NutriCore AI Python swap failed: ' . $raw);
            return null;
        }

        return $payload['replacement'];
    }

    public function recommendSwaps(array $profile, int $calories, array $fridgeIngredients = [], array $feedback = [], array $approvalReviews = [], int $maxResults = 50): array {
        $script = realpath(__DIR__ . '/../../ml/nutrition_ai/nutricore_model.py');
        if (!$script) {
            error_log('NutriCore AI Python swap recommender not found.');
            return [
                "targets" => ["targetCalories" => $calories],
                "recommendations" => [],
                "model" => ["name" => "NutriCore AI", "error" => "Python model not found"],
            ];
        }

        $payload = [
            'profile' => $profile,
            'calories' => $calories,
            'fridge_ingredients' => array_values($fridgeIngredients),
            'feedback' => array_values($feedback),
            'approval_reviews' => $approvalReviews,
            'max_results' => $maxResults,
        ];
        $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES);
        if ($payloadJson === false) {
            return ["targets" => ["targetCalories" => $calories], "recommendations" => [], "model" => ["name" => "NutriCore AI"]];
        }

        [$exitCode, $raw, $payload] = $this->runPythonJson($script, '--swaps-file', $payloadJson);

        if ($exitCode !== 0 || !is_array($payload) || empty($payload['success'])) {
            error_log('NutriCore AI Python swap recommendations failed: ' . $raw);
            return ["targets" => ["targetCalories" => $calories], "recommendations" => [], "model" => ["name" => "NutriCore AI"]];
        }

        return $payload;
    }

    private function runPythonJson(string $script, string $payloadFlag, string $payloadJson): array {
        $payloadFile = tempnam(sys_get_temp_dir(), 'nutricore_');
        if ($payloadFile === false || file_put_contents($payloadFile, $payloadJson) === false) {
            return [1, 'Could not write NutriCore payload file.', null];
        }

        $python = getenv('PYTHON_BIN') ?: 'python';
        $command = escapeshellcmd($python) . ' ' .
            escapeshellarg($script) . ' ' .
            $payloadFlag . ' ' .
            escapeshellarg($payloadFile);

        $output = [];
        $exitCode = 0;
        exec($command . ' 2>&1', $output, $exitCode);
        @unlink($payloadFile);

        $raw = trim(implode("\n", $output));
        return [$exitCode, $raw, json_decode($raw, true)];
    }

}
?>
