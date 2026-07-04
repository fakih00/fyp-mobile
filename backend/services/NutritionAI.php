<?php
require_once __DIR__ . '/GeminiService.php';

class NutritionAI {

    private GeminiService $gemini;

    public function __construct() {
        $this->gemini = new GeminiService();
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
    // MEAL PLAN GENERATION — Try Gemini first, fallback to local library
    // =========================================================================
    public function generateMealPlan($calories, $profile) {
        if ($this->gemini->isAvailable()) {
            $plan = $this->generateWithGemini($calories, $profile);
            if ($plan !== null) {
                return $plan;
            }
            error_log("NutritionAI: Gemini failed, falling back to local logic.");
        }

        return $this->generateLocal($calories, $profile);
    }

    // =========================================================================
    // GEMINI MEAL PLAN
    // =========================================================================
    private function generateWithGemini($calories, $profile): ?array {
        $goal        = $profile['goal'] ?? 'general_fitness';
        $gender      = $profile['gender'] ?? 'male';
        $weight      = $profile['weight'] ?? 70;
        $height      = $profile['height'] ?? 170;
        $age         = $profile['age'] ?? 25;
        $targetWeight= $profile['target_weight'] ?? $profile['suggested_goal_weight'] ?? $weight;
        $mealCount   = (int)($profile['meals_per_day'] ?? 4);
        $dislikes    = $profile['dislikes'] ?? 'none';
        $allergies   = $profile['allergies'] ?? 'none';
        $goalLabel   = str_replace('_', ' ', $goal);

        // Calculate macro targets locally (reliable math)
        $isRecomp = ($weight > $targetWeight) && ($goal === 'gain_muscle');
        
        // Define macro ratios based on goals
        if ($isRecomp) {
            $p_ratio  = 0.40;
            $c_ratio  = 0.35;
            $f_ratio  = 0.25;
        } elseif (in_array($goal, ['running', 'cycling', 'swimming'])) {
            // Endurance sports: high carb, moderate protein, low-moderate fat
            $p_ratio  = 0.25;
            $c_ratio  = 0.55;
            $f_ratio  = 0.20;
        } elseif (in_array($goal, ['boxing', 'martial_arts'])) {
            // Combat sports: higher protein and carbs for energy/muscle maintenance
            $p_ratio  = 0.40;
            $c_ratio  = 0.40;
            $f_ratio  = 0.20;
        } elseif ($goal === 'yoga_flexibility') {
            // Mind-body flexibility: balanced/clean macros
            $p_ratio  = 0.30;
            $c_ratio  = 0.40;
            $f_ratio  = 0.30;
        } else {
            // General / default macro ratios
            $p_ratio  = 0.30;
            $c_ratio  = 0.40;
            $f_ratio  = 0.30;
        }

        $p_total  = round(($calories * $p_ratio) / 4);
        $c_total  = round(($calories * $c_ratio) / 4);
        $f_total  = round(($calories * $f_ratio) / 9);

        $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $mealTypes = $this->getMealStructure($mealCount);

        // Build per-meal macro breakdown for the prompt
        $mealTargets = '';
        foreach ($mealTypes as $m) {
            $mp = round($p_total * $m['weight']);
            $mc = round($c_total * $m['weight']);
            $mf = round($f_total * $m['weight']);
            $mk = ($mp * 4) + ($mc * 4) + ($mf * 9);
            $mealTargets .= "  - {$m['type']}: ~{$mk} kcal | Protein {$mp}g | Carbs {$mc}g | Fats {$mf}g\n";
        }

        $prompt = "You're a nutritionist. 3-day meal plan.\n"
            . "User: {$goalLabel}, target: {$calories} kcal\n"
            . "Target macro per meal type:\n{$mealTargets}"
            . "Rules:\n"
            . "1. ONLY RAW JSON array.\n"
            . "2. Use shorthand keys: d=day, m=meals, t=type, n=name, i=ingredients (minimized).\n"
            . "3. Format: [{\"d\":\"1\",\"m\":[{\"t\":\"Breakfast\",\"n\":\"Oats\",\"i\":[\"80g oats\",\"30g whey\"]}]}]";

        $geminiSuggestions = $this->gemini->askForJson($prompt);

        if (!is_array($geminiSuggestions) || count($geminiSuggestions) === 0) {
            return null;
        }

        // Flatten into meal records
        $allMeals = [];
        $mealCounter = 1;

        foreach ($days as $idx => $realDayName) {
            $daySuggestion = $geminiSuggestions[$idx % count($geminiSuggestions)];
            $dayName   = $realDayName;
            $dayMeals  = $daySuggestion['m'] ?? ($daySuggestion['meals'] ?? []);

            foreach ($dayMeals as $i => $meal) {
                $mealConfig = $mealTypes[$i] ?? ['type' => 'Meal', 'weight' => 1 / $mealCount];
                $w = $mealConfig['weight'];

                // Use AI-provided macros if available, else calculate from ratios
                $m_protein  = isset($meal['protein'])  ? (int)$meal['protein']  : round($p_total * $w);
                $m_carbs    = isset($meal['carbs'])    ? (int)$meal['carbs']    : round($c_total * $w);
                $m_fats     = isset($meal['fats'])     ? (int)$meal['fats']     : round($f_total * $w);
                $m_calories = isset($meal['kcal'])     ? (int)$meal['kcal']     : ($m_protein * 4) + ($m_carbs * 4) + ($m_fats * 9);

                $ingredients = $meal['i'] ?? ($meal['ing'] ?? ($meal['ingredients'] ?? ["See recipe for " . ($meal['n'] ?? 'this meal')]));
                if (!is_array($ingredients)) {
                    $ingredients = [$ingredients];
                }

                $allMeals[] = [
                    "id"           => "m" . $mealCounter++,
                    "day"          => $dayName,
                    "type"         => $meal['t'] ?? $mealConfig['type'],
                    "name"         => $meal['n'] ?? ($meal['name'] ?? "Balanced Meal"),
                    "calories"     => $m_calories,
                    "protein"      => $m_protein,
                    "carbs"        => $m_carbs,
                    "fats"         => $m_fats,
                    "ingredients"  => $ingredients,
                    "instructions" => $meal['instructions'] ?? "Follow standard healthy preparation methods for this meal.",
                    "image"        => "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80&sig=" . md5($meal['name'] ?? $dayName . $i),
                    "completed"    => false,
                ];
            }
        }

        return count($allMeals) > 0 ? $allMeals : null;
    }

    public function replaceMealWithHint($mealToReplace, $hint) {
        if (!$this->gemini->isAvailable()) {
            return null;
        }

        $cals = $mealToReplace['calories'];
        $pro = $mealToReplace['protein'];
        $carb = $mealToReplace['carbs'];
        $fat = $mealToReplace['fats'];
        $type = $mealToReplace['type'];

        $prompt = "You're a nutritionist. Replace this meal with something else based on the user's hint.\n"
            . "Target: {$cals} kcal | Protein {$pro}g | Carbs {$carb}g | Fats {$fat}g\n"
            . "Meal Type: {$type}\n"
            . "User Hint: \"{$hint}\"\n"
            . "Rules:\n"
            . "1. ONLY RAW JSON OBJECT (not an array).\n"
            . "2. Use keys: t=type, n=name, i=ingredients (minimized).\n"
            . "3. Format: {\"t\":\"Breakfast\",\"n\":\"Oats\",\"i\":[\"80g oats\",\"30g whey\"]}";

        $geminiSuggestion = $this->gemini->askForJson($prompt);

        if (!is_array($geminiSuggestion) || empty($geminiSuggestion['n'])) {
            return null;
        }

        $ingredients = $geminiSuggestion['i'] ?? ($geminiSuggestion['ingredients'] ?? ["See recipe"]);
        if (!is_array($ingredients)) {
            $ingredients = [$ingredients];
        }

        return [
            "id"           => $mealToReplace['id'],
            "day"          => $mealToReplace['day'],
            "type"         => $geminiSuggestion['t'] ?? $type,
            "name"         => $geminiSuggestion['n'] ?? "New Meal",
            "calories"     => $cals,
            "protein"      => $pro,
            "carbs"        => $carb,
            "fats"         => $fat,
            "ingredients"  => $ingredients,
            "instructions" => $geminiSuggestion['instructions'] ?? "Follow standard healthy preparation methods.",
            "image"        => "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80&sig=" . md5($geminiSuggestion['n'] ?? time()),
            "completed"    => false,
        ];
    }


    private function getMealStructure(int $count): array {
        $presets = [
            3 => [
                ["type" => "Breakfast", "weight" => 0.30],
                ["type" => "Lunch",     "weight" => 0.35],
                ["type" => "Dinner",    "weight" => 0.35],
            ],
            4 => [
                ["type" => "Breakfast", "weight" => 0.25],
                ["type" => "Lunch",     "weight" => 0.30],
                ["type" => "Dinner",    "weight" => 0.30],
                ["type" => "Snack",     "weight" => 0.15],
            ],
            5 => [
                ["type" => "Breakfast", "weight" => 0.20],
                ["type" => "Snack",     "weight" => 0.10],
                ["type" => "Lunch",     "weight" => 0.25],
                ["type" => "Snack",     "weight" => 0.15],
                ["type" => "Dinner",    "weight" => 0.30],
            ],
            6 => [
                ["type" => "Breakfast", "weight" => 0.15],
                ["type" => "Snack",     "weight" => 0.10],
                ["type" => "Lunch",     "weight" => 0.20],
                ["type" => "Snack",     "weight" => 0.10],
                ["type" => "Dinner",    "weight" => 0.25],
                ["type" => "Snack",     "weight" => 0.20],
            ],
        ];
        return $presets[$count] ?? $presets[4];
    }

    // =========================================================================
    // LOCAL FALLBACK ENGINE (original logic, preserved)
    // =========================================================================
    public function generateLocal($calories, $profile) {
        require_once __DIR__ . '/../data/food_library.php';
        $full_library = FoodLibrary::getLibrary();
        
        $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $plan = [];
        
        // Target Macros
        $weight = $profile['weight'];
        $targetWeight = $profile['target_weight'] ?? $profile['suggested_goal_weight'] ?? 70;
        $goal = $profile['goal'];
        $isRecomp = ($weight > $targetWeight) && ($goal === 'gain_muscle');
        if ($isRecomp) {
            $p_ratio = 0.40;
            $c_ratio = 0.35;
            $f_ratio = 0.25;
        } elseif (in_array($goal, ['running', 'cycling', 'swimming'])) {
            $p_ratio = 0.25;
            $c_ratio = 0.55;
            $f_ratio = 0.20;
        } elseif (in_array($goal, ['boxing', 'martial_arts'])) {
            $p_ratio = 0.40;
            $c_ratio = 0.40;
            $f_ratio = 0.20;
        } elseif ($goal === 'yoga_flexibility') {
            $p_ratio = 0.30;
            $c_ratio = 0.40;
            $f_ratio = 0.30;
        } else {
            $p_ratio = 0.30;
            $c_ratio = 0.40;
            $f_ratio = 0.30;
        }

        $p_target_total = ($calories * $p_ratio) / 4;
        $c_target_total = ($calories * $c_ratio) / 4;
        $f_target_total = ($calories * $f_ratio) / 9;

        $dislikes  = isset($profile['dislikes'])  ? explode(',', strtolower($profile['dislikes'])) : [];
        $allergies = isset($profile['allergies']) ? explode(',', strtolower($profile['allergies'])) : [];
        $meal_count = isset($profile['meals_per_day']) ? (int)$profile['meals_per_day'] : 4;

        $meal_structure = $this->getMealStructure($meal_count);

        $counter = 1;
        foreach ($days as $day) {
            foreach ($meal_structure as $meal_config) {
                $type   = $meal_config['type'];
                $weight_ratio = $meal_config['weight'];

                $options = $full_library[$type];
                
                $filtered_options = array_filter($options, function($meal) use ($dislikes, $allergies) {
                    $meal_name     = strtolower($meal['name'] ?? '');
                    $meal_tags     = isset($meal['tags']) && is_array($meal['tags']) ? array_map('strtolower', $meal['tags']) : [];
                    $meal_allergens= isset($meal['allergens']) && is_array($meal['allergens']) ? array_map('strtolower', $meal['allergens']) : [];

                    foreach ($allergies as $allergy) {
                        if (trim($allergy) == "") continue;
                        if (in_array(trim($allergy), $meal_allergens)) return false;
                        if (strpos($meal_name, trim($allergy)) !== false) return false;
                    }
                    foreach ($dislikes as $dislike) {
                        if (trim($dislike) == "") continue;
                        if (strpos($meal_name, trim($dislike)) !== false) return false;
                        if (in_array(trim($dislike), $meal_tags)) return false;
                    }
                    return true;
                });

                if (empty($filtered_options)) $filtered_options = $options;

                $meal_base = $filtered_options[array_rand($filtered_options)];

                $m_protein  = round($p_target_total * $weight_ratio);
                $m_carbs    = round($c_target_total * $weight_ratio);
                $m_fats     = round($f_target_total * $weight_ratio);
                $m_calories = ($m_protein * 4) + ($m_carbs * 4) + ($m_fats * 9);

                $plan[] = [
                    "id"           => "m" . $counter++,
                    "day"          => $day,
                    "type"         => $type,
                    "name"         => $meal_base['name'],
                    "calories"     => (int)$m_calories,
                    "protein"      => (int)$m_protein,
                    "carbs"        => (int)$m_carbs,
                    "fats"         => (int)$m_fats,
                    "ingredients"  => $meal_base['ingredients'],
                    "instructions" => $meal_base['instructions'],
                    "image"        => $this->getMealImage($meal_base['name']),
                    "completed"    => false
                ];
            }
        }

        return $plan;
    }

    private function pickBestMeal($options, $likes) {
        $scored_options = [];
        foreach ($options as $meal) {
            $score = 1;
            $meal_name = strtolower($meal['name']);
            $meal_tags = array_map('strtolower', $meal['tags']);
            foreach ($likes as $like) {
                if (trim($like) == "") continue;
                if (strpos($meal_name, trim($like)) !== false) $score += 5;
                if (in_array(trim($like), $meal_tags)) $score += 3;
            }
            $scored_options[] = ['meal' => $meal, 'score' => $score];
        }
        $total_score = array_sum(array_column($scored_options, 'score'));
        $rand = rand(1, $total_score);
        $current = 0;
        foreach ($scored_options as $opt) {
            $current += $opt['score'];
            if ($rand <= $current) return $opt['meal'];
        }
        return $options[array_rand($options)];
    }

    private function getMealImage($name) {
        return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80&sig=" . md5($name);
    }
}
?>
