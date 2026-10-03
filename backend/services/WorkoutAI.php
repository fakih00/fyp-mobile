<?php

class WorkoutAI {
    public const MODEL_NAME = 'TrainCore AI';
    public const MODEL_VERSION = '1.1.0';

    public function getModelCard(): array {
        return [
            "name" => self::MODEL_NAME,
            "version" => self::MODEL_VERSION,
            "type" => "Python local neural-network workout recommendation model",
            "primary_inputs" => [
                "goal",
                "training_days_per_week",
                "training_location",
                "training_intensity",
                "injuries",
                "pain_points",
                "posture_problems",
                "mobility_limitations",
                "target_weight",
                "current_weight",
            ],
            "weights" => [
                "goal_fit" => 32,
                "focus_fit" => 26,
                "location_fit" => 18,
                "safety_fit" => 20,
                "intensity_fit" => 14,
                "expert_score" => 10,
                "variety" => 4,
            ],
            "training_method" => "Feed-forward neural network trained locally from expert-rule labels over profile/exercise pairs, with hard injury and location filters kept outside the model for safety",
            "external_generation_api" => false,
            "php_generation" => false,
        ];
    }

    public function generatePlan($profile) {
        $pythonPlan = $this->generateWithPython($profile);
        if ($this->isValidPlan($pythonPlan)) {
            return $pythonPlan;
        }

        error_log("WorkoutAI: Python TrainCore generation failed.");
        return [];
    }

    private function generateWithPython($profile): ?array {
        $script = realpath(__DIR__ . '/../../ml/workout_ai/traincore_model.py');
        if (!$script) {
            error_log("WorkoutAI: Python TrainCore script not found.");
            return null;
        }

        $python = getenv('PYTHON_BIN') ?: 'python';
        $profileJson = json_encode($profile, JSON_UNESCAPED_SLASHES);
        if ($profileJson === false) {
            return null;
        }

        $command = escapeshellarg($python)
            . ' ' . escapeshellarg($script)
            . ' --profile-b64 ' . escapeshellarg(base64_encode($profileJson));

        $output = [];
        $exitCode = 0;
        exec($command . ' 2>&1', $output, $exitCode);

        $payload = null;
        foreach ($output as $line) {
            $line = trim($line);
            if ($line !== '' && str_starts_with($line, '{')) {
                $decoded = json_decode($line, true);
                if (is_array($decoded)) {
                    $payload = $decoded;
                    break;
                }
            }
        }

        if ($exitCode !== 0 || !is_array($payload) || empty($payload['success']) || empty($payload['plan'])) {
            error_log("WorkoutAI: Python TrainCore invalid response: " . trim(implode("\n", $output)));
            return null;
        }

        return $payload['plan'];
    }

    private function isValidPlan($plan): bool {
        if (!is_array($plan) || count($plan) === 0) {
            return false;
        }

        foreach ($plan as $day) {
            if (!is_array($day) || empty($day['day']) || empty($day['title'])) {
                return false;
            }
            if (empty($day['exercises']) || !is_array($day['exercises'])) {
                return false;
            }
            foreach ($day['exercises'] as $exercise) {
                if (!is_array($exercise) || empty($exercise['name'])) {
                    return false;
                }
            }
        }

        return true;
    }
}
?>
