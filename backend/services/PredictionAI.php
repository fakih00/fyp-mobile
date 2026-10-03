<?php
class PredictionAI {

    public function predictNextMonth($history, $profile = null) {
        // $history is array of ['date_logged' => string, 'weight' => float]
        // Sort by date just in case
        usort($history, function($a, $b) {
            return strtotime($a['date_logged']) - strtotime($b['date_logged']);
        });

        $n = count($history);
        // Validate dataset size is sufficient for local neural prediction
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
        $neural = $this->trainWeightNeuralNetwork($x, $y, $baseline);

        // Predict 30 days from now (last date)
        $lastDay = end($x);
        $futureDay = $lastDay + 30;
        $predictedWeight = $this->predictWithNeuralNetwork($neural, $futureDay);
        $currentPredictedWeight = $this->predictWithNeuralNetwork($neural, $lastDay);
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
            "model" => "PredictionAI local neural-network weight trend regressor",
            "model_type" => "php_local_neural_weight_regressor",
            "training_accuracy" => $neural['training_accuracy'],
            "validation_mae_kg" => $neural['validation_mae_kg']
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

    private function trainWeightNeuralNetwork(array $days, array $weights, array $baseline): array {
        $lastDay = max(end($days), 1);
        $futureDay = $lastDay + 30;
        $minWeight = min($weights);
        $maxWeight = max($weights);
        $range = max(1.0, $maxWeight - $minWeight);
        $hiddenSize = 4;

        $hiddenWeights = [
            [0.32, -0.18],
            [-0.27, 0.24],
            [0.14, 0.31],
            [-0.21, -0.16],
        ];
        $hiddenBias = [0.03, -0.04, 0.02, 0.01];
        $outputWeights = [0.28, -0.22, 0.19, -0.15];
        $outputBias = 0.0;
        $learningRate = 0.04;
        $samples = [];

        foreach ($days as $index => $day) {
            $baselineWeight = ($baseline['m'] * $day) + $baseline['c'];
            $samples[] = [
                [$day / $futureDay, ($baselineWeight - $minWeight) / $range],
                ($weights[$index] - $minWeight) / $range,
                $weights[$index],
            ];
        }

        $validationCount = count($samples) >= 4 ? max(1, (int)floor(count($samples) * 0.25)) : 0;
        $trainCount = count($samples) - $validationCount;
        $trainSamples = array_slice($samples, 0, $trainCount);
        $validationSamples = $validationCount ? array_slice($samples, $trainCount) : $trainSamples;

        for ($epoch = 0; $epoch < 700; $epoch++) {
            foreach ($trainSamples as $sample) {
                [$input, $label] = $sample;
                $hidden = [];
                for ($h = 0; $h < $hiddenSize; $h++) {
                    $hidden[$h] = tanh(($hiddenWeights[$h][0] * $input[0]) + ($hiddenWeights[$h][1] * $input[1]) + $hiddenBias[$h]);
                }

                $prediction = $outputBias;
                for ($h = 0; $h < $hiddenSize; $h++) {
                    $prediction += $outputWeights[$h] * $hidden[$h];
                }

                $error = $prediction - $label;
                for ($h = 0; $h < $hiddenSize; $h++) {
                    $outputWeights[$h] -= $learningRate * $error * $hidden[$h];
                }
                $outputBias -= $learningRate * $error;

                for ($h = 0; $h < $hiddenSize; $h++) {
                    $hiddenDelta = $error * $outputWeights[$h] * (1 - ($hidden[$h] * $hidden[$h]));
                    $hiddenWeights[$h][0] -= $learningRate * $hiddenDelta * $input[0];
                    $hiddenWeights[$h][1] -= $learningRate * $hiddenDelta * $input[1];
                    $hiddenBias[$h] -= $learningRate * $hiddenDelta;
                }
            }
        }

        $model = [
            'baseline' => $baseline,
            'min_weight' => $minWeight,
            'weight_range' => $range,
            'future_day' => $futureDay,
            'hidden_weights' => $hiddenWeights,
            'hidden_bias' => $hiddenBias,
            'output_weights' => $outputWeights,
            'output_bias' => $outputBias,
            'training_samples' => count($trainSamples),
            'validation_samples' => count($validationSamples),
        ];
        $trainMae = $this->neuralMaeKg($model, $trainSamples);
        $validationMae = $this->neuralMaeKg($model, $validationSamples);
        $model['training_accuracy'] = round(max(0, 100 - (($trainMae / max($range, 1.0)) * 100)));
        $model['validation_mae_kg'] = round($validationMae, 2);
        return $model;
    }

    private function predictWithNeuralNetwork(array $model, float $day): float {
        $baselineWeight = ($model['baseline']['m'] * $day) + $model['baseline']['c'];
        $input = [
            $day / $model['future_day'],
            ($baselineWeight - $model['min_weight']) / $model['weight_range'],
        ];
        $prediction = $model['output_bias'];
        for ($h = 0; $h < count($model['hidden_weights']); $h++) {
            $hidden = tanh(($model['hidden_weights'][$h][0] * $input[0]) + ($model['hidden_weights'][$h][1] * $input[1]) + $model['hidden_bias'][$h]);
            $prediction += $model['output_weights'][$h] * $hidden;
        }
        return $model['min_weight'] + ($prediction * $model['weight_range']);
    }

    private function neuralMaeKg(array $model, array $samples): float {
        if (empty($samples)) {
            return 0.0;
        }
        $total = 0.0;
        foreach ($samples as $sample) {
            $day = $sample[0][0] * $model['future_day'];
            $total += abs($this->predictWithNeuralNetwork($model, $day) - $sample[2]);
        }
        return $total / count($samples);
    }
}
?>
