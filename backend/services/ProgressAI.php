<?php

class ProgressAI {
    public function generateProgressAudit($userLogs, $profile, $weightHistory, $adherences) {
        $workout = round($adherences['workout'] ?? 0);
        $nutrition = round($adherences['nutrition'] ?? 0);
        $weights = array_values(array_filter(array_map(fn($row) => isset($row['weight']) ? (float)$row['weight'] : null, $weightHistory ?? [])));
        $trend = $this->weightTrend($weights);
        $status = "On Track";
        $concerns = [];

        if ($workout < 60 || $nutrition < 60) {
            $status = "Needs Attention";
            $concerns[] = "Weekly adherence is below the consistency threshold.";
        }
        if (abs($trend) < 0.1 && count($weights) >= 3) {
            $status = $status === "On Track" ? "Stalled" : $status;
            $concerns[] = "Weight trend is nearly flat across recent logs.";
        }

        $goal = str_replace('_', ' ', $profile['goal'] ?? 'general fitness');
        return [
            "summary" => "Local progress analysis shows {$workout}% workout adherence and {$nutrition}% nutrition adherence for your {$goal} goal.",
            "status" => $status,
            "accomplishments" => [
                "Progress data was logged and reviewed locally.",
                "Workout and nutrition adherence were compared against the weekly target."
            ],
            "concerns" => $concerns ?: ["No major consistency risk detected from the available logs."],
            "recommendations" => [
                $workout < 75 ? "Prioritize completing the next scheduled workout before adding extra volume." : "Keep training volume stable and focus on clean execution.",
                $nutrition < 75 ? "Improve meal logging and protein consistency for the next 3 days." : "Keep following NutriCore meals and avoid unnecessary swaps.",
                count($userLogs ?? []) < 4 ? "Log sleep, stress, steps, and weight for more accurate weekly feedback." : "Use sleep and stress trends to adjust intensity before fatigue builds."
            ],
            "model" => "Local ProgressAI Rules"
        ];
    }

    public function generateTrajectorySimulation($currentWeight, $targetWeight, $goal, $scenario) {
        $calorieDelta = (float)($scenario['calorie_delta'] ?? 0);
        $steps = (int)($scenario['steps'] ?? 7000);
        $sleep = (float)($scenario['sleep'] ?? 7);
        $workoutDays = (int)($scenario['workout_days'] ?? 3);
        $activityAdjustment = (($steps - 7000) / 3000) * 0.08 + (($workoutDays - 3) * 0.06);
        $sleepPenalty = $sleep < 6 ? 0.18 : ($sleep < 7 ? 0.08 : 0);
        $weeklyChange = (($calorieDelta * 7) / 7700) + $activityAdjustment;
        if (str_contains((string)$goal, 'lose')) {
            $weeklyChange -= $sleepPenalty;
        } else {
            $weeklyChange += max(0, $sleepPenalty * -0.25);
        }
        $predicted = round((float)$currentWeight + ($weeklyChange * 4.285), 1);
        $remaining = abs((float)$targetWeight - (float)$currentWeight);
        $daysToGoal = abs($weeklyChange) > 0.05 ? (int)ceil(($remaining / abs($weeklyChange)) * 7) : null;
        $efficiency = max(35, min(95, 70 + ($workoutDays - 3) * 5 + ($sleep >= 7 ? 8 : -8) + ($steps >= 9000 ? 7 : 0)));

        return [
            "predicted_weight" => $predicted,
            "weekly_change" => round($weeklyChange, 2),
            "days_to_goal" => $daysToGoal && $daysToGoal <= 180 ? $daysToGoal : null,
            "plateau_risk" => abs($weeklyChange) < 0.15 ? "High" : (abs($weeklyChange) < 0.35 ? "Medium" : "Low"),
            "efficiency_score" => $efficiency,
            "analysis" => "Local simulation estimates the next 30 days from calorie balance, step volume, workout frequency, and sleep quality.",
            "key_factors" => ["Calorie balance", "Daily steps", "Sleep and recovery quality"],
            "model" => "Local ProgressAI Simulation"
        ];
    }

    public function generateBioAdvisory($yesterdayLog, $profile, $weeklyStats) {
        $sleep = (float)($yesterdayLog['sleep_hours'] ?? 0);
        $steps = (int)($yesterdayLog['steps'] ?? 0);
        $stress = strtolower((string)($yesterdayLog['stress_level'] ?? 'medium'));
        $workoutAdherence = round($weeklyStats['workout_adherence'] ?? 0);
        $nutritionAdherence = round($weeklyStats['nutrition_adherence'] ?? 0);
        $status = ($sleep < 6 || $stress === 'high') ? "Recovery Mode" : (($steps >= 9000 && $workoutAdherence >= 75) ? "Prime Zone" : "Build Rhythm");
        $color = $status === "Recovery Mode" ? "yellow" : ($status === "Prime Zone" ? "green" : "blue");

        return [
            "morning_status" => $status,
            "status_color" => $color,
            "advisories" => [
                [
                    "icon" => "fitness",
                    "color" => "#10B981",
                    "category" => "TRAINING",
                    "title" => $workoutAdherence >= 75 ? "Hold The Plan" : "Protect Consistency",
                    "advice" => $workoutAdherence >= 75 ? "Keep today's session at planned intensity and avoid unnecessary extra sets." : "Complete the scheduled workout even if you need to reduce intensity."
                ],
                [
                    "icon" => "restaurant",
                    "color" => "#3B82F6",
                    "category" => "NUTRITION",
                    "title" => $nutritionAdherence >= 75 ? "Macro Control" : "Meal Logging",
                    "advice" => $nutritionAdherence >= 75 ? "Stay close to NutriCore's protein target and keep meals simple." : "Log every meal today and prioritize protein first."
                ],
                [
                    "icon" => "moon",
                    "color" => "#6366F1",
                    "category" => "RECOVERY",
                    "title" => $sleep < 7 ? "Sleep Debt" : "Recovery Stable",
                    "advice" => $sleep < 7 ? "Keep caffeine earlier, reduce late screen time, and target at least 7 hours tonight." : "Recovery looks stable; maintain hydration and normal bedtime."
                ]
            ],
            "model" => "Local ProgressAI Advisory"
        ];
    }

    private function weightTrend(array $weights): float {
        if (count($weights) < 2) {
            return 0.0;
        }
        return end($weights) - $weights[0];
    }
}
?>
