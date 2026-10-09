<?php
class PredictionAI {

    public function predictNextMonth($history, $profile = null) {
        // $history is array of ['date_logged' => string, 'weight' => float]
        // Sort by date just in case
        usort($history, function($a, $b) {
            return strtotime($a['date_logged']) - strtotime($b['date_logged']);
        });

        $n = count($history);
        // Validate dataset size is sufficient for linear trend estimation
        if ($n < 2) {
            $msg = "Need at least 2 data points for prediction.";
            if ($profile && $profile['suggested_goal_weight']) {
                $msg .= " However, based on your " . $profile['job_type'] . " job and " . $profile['steps_estimate'] . " steps, your AI-suggested target is " . $profile['suggested_goal_weight'] . "kg.";
            }
            return $msg;
        }

        $x = [];
        $y = [];
        $firstDate = strtotime($history[0]['date_logged']);

        foreach ($history as $record) {
            $x[] = (strtotime($record['date_logged']) - $firstDate) / (60 * 60 * 24); // Days
            $y[] = floatval($record['weight']);
        }

        $baseline = $this->linearBaseline($x, $y);
        $fitMae = $this->linearMaeKg($baseline, $x, $y);
        $meanWeight = array_sum($y) / count($y);
        $squaredError = 0.0;
        $totalVariation = 0.0;
        foreach ($x as $index => $day) {
            $squaredError += pow($y[$index] - ($baseline['m'] * $day + $baseline['c']), 2);
            $totalVariation += pow($y[$index] - $meanWeight, 2);
        }
        $rSquared = $totalVariation > 0 ? 1 - $squaredError / $totalVariation : 1.0;
        $validationMae = null;
        if (count($x) >= 4) {
            $trainCount = count($x) - max(1, (int)floor(count($x) * 0.25));
            $trainDays = array_slice($x, 0, $trainCount);
            if (max($trainDays) > min($trainDays)) {
                $heldOutModel = $this->linearBaseline($trainDays, array_slice($y, 0, $trainCount));
                $validationMae = $this->linearMaeKg($heldOutModel, array_slice($x, $trainCount), array_slice($y, $trainCount));
            }
        }

        // Predict 30 days from now (last date)
        $lastDay = end($x);
        $futureDay = $lastDay + 30;
        $predictedWeight = ($baseline['m'] * $futureDay) + $baseline['c'];
        $currentPredictedWeight = ($baseline['m'] * $lastDay) + $baseline['c'];
        $weeklyDelta = (($predictedWeight - $currentPredictedWeight) / 30) * 7;
        $ratePerWeek = round($weeklyDelta, 2);
        
        // Generate Insight
        $insight = "You're currently " . ($ratePerWeek < 0 ? "shedding weight" : "gaining mass") . " at a rate of " . abs($ratePerWeek) . "kg per week. ";
        
        if ($profile) {
            $steps = (int)$profile['steps_estimate'];
            $sleep = (float)$profile['sleep_hours'];
            $stress = $profile['stress_level'];
            
            if ($steps < 5000) $insight .= "Prioritizing more daily steps could accelerate your metabolic throughput. ";
            if ($sleep < 6) $insight .= "Your recovery (sleep) is sub-optimal, which may hinder hormonal balance. ";
            if ($stress === 'high') $insight .= "Cortisol from high stress might be causing water retention; stay hydrated. ";
            
            if ($profile['suggested_goal_weight']) {
                $insight .= "Your AI-ideal weight is " . $profile['suggested_goal_weight'] . "kg.";
            }
        }

        return [
            "current_trend" => ($ratePerWeek < 0) ? "Losing Weight" : "Gaining Weight",
            "predicted_weight_30_days" => round($predictedWeight, 2),
            "rate_per_week" => abs($ratePerWeek) . " kg/week",
            "insight_message" => $insight,
            "model" => "PredictionAI ordinary least-squares linear weight trend regressor",
            "model_type" => "php_local_linear_weight_regressor",
            "training_accuracy" => round(max(0, $rSquared) * 100),
            "validation_mae_kg" => $validationMae === null ? null : round($validationMae, 2),
            "training_mae_kg" => round($fitMae, 4),
            "r_squared" => round($rSquared, 5),
            "training_accuracy_metric" => "R-squared percentage (legacy field; not classification accuracy)",
            "validation_method" => "chronological holdout when at least four records and two distinct training dates exist",
            "slope_kg_per_day" => round($baseline['m'], 6)
        ];
    }

    private function linearBaseline(array $x, array $y): array {
        $n = count($x);
        $sumX = array_sum($x);
        $sumY = array_sum($y);
        $sumXY = 0;
        $sumXX = 0;

        for ($i = 0; $i < $n; $i++) {
            $sumXY += ($x[$i] * $y[$i]);
            $sumXX += ($x[$i] * $x[$i]);
        }

        $denom = ($n * $sumXX - $sumX * $sumX);
        if ($denom == 0) $m = 0;
        else $m = ($n * $sumXY - $sumX * $sumY) / $denom;

        $c = ($sumY - $m * $sumX) / $n;
        return ['m' => $m, 'c' => $c];
    }

    private function linearMaeKg(array $model, array $days, array $weights): float {
        $total = 0.0;
        foreach ($days as $index => $day) {
            $total += abs(($model['m'] * $day + $model['c']) - $weights[$index]);
        }
        return $total / count($days);
    }
}
