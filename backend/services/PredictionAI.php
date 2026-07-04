<?php
class PredictionAI {

    public function predictNextMonth($history, $profile = null) {
        // $history is array of ['date_logged' => string, 'weight' => float]
        // Sort by date just in case
        usort($history, function($a, $b) {
            return strtotime($a['date_logged']) - strtotime($b['date_logged']);
        });

        $n = count($history);
        // Validate dataset size is sufficient for linear regression
        if ($n < 2) {
            $msg = "Need at least 2 data points for prediction.";
            if ($profile && $profile['suggested_goal_weight']) {
                $msg .= " However, based on your " . $profile['job_type'] . " job and " . $profile['steps_estimate'] . " steps, your AI-suggested target is " . $profile['suggested_goal_weight'] . "kg.";
            }
            return $msg;
        }

        // Linear Regression: y = mx + c
        // x = time (days from start), y = weight
        
        $x = [];
        $y = [];
        $firstDate = strtotime($history[0]['date_logged']);

        foreach ($history as $record) {
            $x[] = (strtotime($record['date_logged']) - $firstDate) / (60 * 60 * 24); // Days
            $y[] = floatval($record['weight']);
        }

        // Calculate m and c
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

        // Predict 30 days from now (last date)
        $lastDay = end($x);
        $futureDay = $lastDay + 30;
        
        $predictedWeight = ($m * $futureDay) + $c;

        $ratePerWeek = round($m * 7, 2);
        
        // Generate Insight
        $insight = "You're currently " . ($m < 0 ? "shedding weight" : "gaining mass") . " at a rate of " . abs($ratePerWeek) . "kg per week. ";
        
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
            "current_trend" => ($m < 0) ? "Losing Weight" : "Gaining Weight",
            "predicted_weight_30_days" => round($predictedWeight, 2),
            "rate_per_week" => abs($ratePerWeek) . " kg/week",
            "insight_message" => $insight
        ];
    }
}
?>
