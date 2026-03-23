<?php

class GoalAI {
    
    public function suggestGoalWeight($profile) {
        $weight = (float)$profile['weight'];
        $height = (float)$profile['height']; // cm
        $gender = $profile['gender']; // 'male' or 'female'
        $age = (int)$profile['age'];
        $bodyFat = isset($profile['body_fat']) ? (float)$profile['body_fat'] : null;
        $waist = isset($profile['waist_size']) ? (float)$profile['waist_size'] : null;
        $goal = $profile['goal']; // 'lose_weight', 'build_muscle'
        
        // 1. Estimate Body Fat if not provided
        if ($bodyFat === null && $waist !== null) {
            // Navy-adjacent heuristic for BF% estimation without neck/hips
            if ($gender === 'male') {
                $bodyFat = ($waist / ($height * 0.45)) * 10; // Rough Heuristic
            } else {
                $bodyFat = ($waist / ($height * 0.4)) * 12; // Rough Heuristic
            }
        }
        
        // fallback if still null
        if ($bodyFat === null) $bodyFat = ($gender === 'male') ? 25 : 32;

        // 2. Calculate Lean Body Mass (LBM)
        $lbm = $weight * (1 - ($bodyFat / 100));
        
        // 3. Define Target Body Fat % based on goal
        $targetBF = 15; // default male athletic
        if ($gender === 'male') {
            if ($goal === 'lose_weight') $targetBF = 12;
            else if ($goal === 'build_muscle') $targetBF = 18; // Bulk target
            else $targetBF = 15;
        } else {
            if ($goal === 'lose_weight') $targetBF = 20;
            else if ($goal === 'build_muscle') $targetBF = 25;
            else $targetBF = 22;
        }
        
        // 4. Calculate Suggested Weight for that Target BF
        $suggestedWeight = $lbm / (1 - ($targetBF / 100));
        
        // 5. Adjust based on metabolic/environmental factors
        $jobType = $profile['job_type']; // 'desk', 'active'
        $sleep = (float)$profile['sleep_hours'];
        $stress = $profile['stress_level']; // 'low', 'medium', 'high'
        $steps = (int)$profile['steps_estimate'];
        
        $adjustment = 1.0;
        
        // Active people can sustain higher muscle mass/weight
        if ($jobType === 'active') $adjustment += 0.02;
        if ($steps > 10000) $adjustment += 0.02;
        
        // Recovery factors
        if ($sleep < 6) $adjustment -= 0.01; // Slower progress/lower potential
        if ($stress === 'high') $adjustment -= 0.01;
        
        $finalSuggested = $suggestedWeight * $adjustment;
        
        // Sanity Check: BMI shouldn't be extreme
        $heightM = $height / 100;
        $suggestedBMI = $finalSuggested / ($heightM * $heightM);
        
        if ($suggestedBMI < 18.5) {
            $finalSuggested = 18.5 * ($heightM * $heightM);
        } else if ($suggestedBMI > 30 && $goal === 'lose_weight') {
            // If they are very heavy, don't suggest 30 BMI immediately, but a 10% reduction
            $finalSuggested = min($finalSuggested, $weight * 0.9);
        }

        return [
            "suggested_weight" => round($finalSuggested, 1),
            "estimated_current_bf" => round($bodyFat, 1),
            "target_bf" => $targetBF,
            "lbm" => round($lbm, 1),
            "analysis" => $this->generateAnalysis($profile, $bodyFat, $targetBF)
        ];
    }
    
    private function generateAnalysis($profile, $currentBF, $targetBF) {
        $goal = $profile['goal'];
        $job = $profile['job_type'];
        $stress = $profile['stress_level'];
        
        $msg = "Based on your lean mass of " . round($profile['weight'] * (1 - ($currentBF/100)), 1) . "kg, ";
        
        if ($goal === 'lose_weight') {
            $msg .= "a target of {$targetBF}% body fat is optimal for metabolic health. ";
        } else {
            $msg .= "we recommend a controlled surplus to reach {$targetBF}% body fat while maximizing hypertrophy. ";
        }
        
        if ($job === 'desk' && $profile['steps_estimate'] < 5000) {
            $msg .= "Note: Your sedentary lifestyle may slow metabolic rate; prioritize daily movement.";
        }
        
        if ($stress === 'high' || $profile['sleep_hours'] < 7) {
            $msg .= " High stress/low sleep detected—cortisol management is critical for this goal.";
        }
        
        return $msg;
    }
}
?>
