<?php

class NutritionAI {

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
    public function generateMealPlan($calories, $profile, array $fridgeIngredients = []) {
        return $this->generateLocal($calories, $profile, $fridgeIngredients);
    }

    public function replaceMealWithHint($mealToReplace, $hint) {
        require_once __DIR__ . '/../data/food_library.php';
        $library = FoodLibrary::getLibrary();
        $type = $mealToReplace['type'] ?? 'Meal';
        $options = $library[$type] ?? array_merge(...array_values($library));
        $selected = $this->pickReplacementMeal($options, $hint, $mealToReplace['name'] ?? '', $mealToReplace);

        if (!$selected) {
            return null;
        }

        return [
            "id"           => $mealToReplace['id'],
            "day"          => $mealToReplace['day'],
            "type"         => $type,
            "name"         => $selected['name'],
            "calories"     => (int)$mealToReplace['calories'],
            "protein"      => (int)$mealToReplace['protein'],
            "carbs"        => (int)$mealToReplace['carbs'],
            "fats"         => (int)$mealToReplace['fats'],
            "ingredients"  => $selected['ingredients'],
            "instructions" => $selected['instructions'],
            "image"        => $this->getMealImage($selected['name']),
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
    public function generateLocal($calories, $profile, array $fridgeIngredients = []) {
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

                $meal_base = $this->pickBestMealForPlan(array_values($filtered_options), $fridgeIngredients);
                $fridgeMeta = $this->getFridgeMatch($meal_base, $fridgeIngredients);

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
                    "fridge_match" => $fridgeMeta['match'],
                    "fridge_used" => $fridgeMeta['used'],
                    "missing_ingredients" => $fridgeMeta['missing'],
                    "image"        => $this->getMealImage($meal_base['name']),
                    "completed"    => false
                ];
            }
        }

        return $plan;
    }

    private function pickBestMealForPlan(array $options, array $fridgeIngredients): array {
        if (empty($options)) {
            return [];
        }

        $scored = [];
        foreach ($options as $meal) {
            $score = 1 + $this->scoreMealByFridge($meal, $fridgeIngredients);
            $scored[] = ['meal' => $meal, 'score' => $score];
        }

        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
        $top = array_slice($scored, 0, min(4, count($scored)));
        return $top[array_rand($top)]['meal'];
    }

    private function scoreMealByFridge(array $meal, array $fridgeIngredients): int {
        $score = 0;
        $haystack = $this->mealHaystack($meal);

        foreach ($this->normalizeIngredientTerms($fridgeIngredients) as $term) {
            if ($term !== '' && str_contains($haystack, $term)) {
                $score += 12;
            }
        }

        return $score;
    }

    private function getFridgeMatch(array $meal, array $fridgeIngredients): array {
        if (empty($fridgeIngredients)) {
            return ['match' => null, 'used' => [], 'missing' => []];
        }

        $terms = $this->normalizeIngredientTerms($fridgeIngredients);
        $used = [];
        $missing = [];
        $ingredients = $meal['ingredients'] ?? [];

        foreach ($ingredients as $ingredient) {
            $ingredientText = strtolower(str_replace(['_', '-'], ' ', (string)$ingredient));
            $matched = false;
            foreach ($terms as $term) {
                if ($term !== '' && str_contains($ingredientText, $term)) {
                    $used[] = $ingredient;
                    $matched = true;
                    break;
                }
            }
            if (!$matched) {
                $missing[] = $ingredient;
            }
        }

        $total = max(count($ingredients), 1);
        return [
            'match' => (int)round((count($used) / $total) * 100),
            'used' => array_values(array_unique($used)),
            'missing' => array_slice(array_values(array_unique($missing)), 0, 5),
        ];
    }

    private function mealHaystack(array $meal): string {
        return strtolower(str_replace(
            ['_', '-'],
            ' ',
            ($meal['name'] ?? '') . ' ' . implode(' ', $meal['tags'] ?? []) . ' ' . implode(' ', $meal['ingredients'] ?? [])
        ));
    }

    private function normalizeIngredientTerms(array $items): array {
        $terms = [];
        foreach ($items as $item) {
            $clean = trim(strtolower(str_replace(['_', '-'], ' ', (string)$item)));
            if ($clean === '') continue;
            $terms[] = $clean;
            foreach (preg_split('/\s+/', $clean) as $part) {
                if (strlen($part) > 3) $terms[] = $part;
            }
        }
        return array_values(array_unique($terms));
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

    private function pickReplacementMeal(array $options, string $hint, string $currentName, array $targetMeal = []): ?array {
        $hintText = strtolower($hint);
        $tokens = preg_split('/[^a-z0-9]+/', $hintText, -1, PREG_SPLIT_NO_EMPTY);
        $blocked = $this->extractBlockedTerms($hintText);
        $wantsVegan = str_contains($hintText, 'vegan') || str_contains($hintText, 'plant based') || str_contains($hintText, 'plant-based');
        $wantsProtein = str_contains($hintText, 'protein') || str_contains($hintText, 'high protein');
        $wantsLowCarb = str_contains($hintText, 'low carb') || str_contains($hintText, 'less carb');
        $wantsLowFat = str_contains($hintText, 'low fat') || str_contains($hintText, 'less fat');
        $wantsLebanese = str_contains($hintText, 'lebanese') || str_contains($hintText, 'arabic') || str_contains($hintText, 'levant') || str_contains($hintText, 'home food');
        $targetCalories = (int)($targetMeal['calories'] ?? 0);
        $targetProtein = (int)($targetMeal['protein'] ?? 0);
        $targetCarbs = (int)($targetMeal['carbs'] ?? 0);
        $targetFats = (int)($targetMeal['fats'] ?? 0);

        $best = null;
        $bestScore = PHP_INT_MIN;

        foreach ($options as $meal) {
            if (strcasecmp($meal['name'] ?? '', $currentName) === 0) {
                continue;
            }

            $haystack = strtolower(
                ($meal['name'] ?? '') . ' ' .
                implode(' ', $meal['tags'] ?? []) . ' ' .
                implode(' ', $meal['ingredients'] ?? [])
            );

            $allergens = array_map('strtolower', $meal['allergens'] ?? []);
            $tags = array_map('strtolower', $meal['tags'] ?? []);
            $score = 0;
            $mealCalories = (int)($meal['cals'] ?? 0);
            $mealProtein = (int)($meal['p'] ?? 0);
            $mealCarbs = (int)($meal['c'] ?? 0);
            $mealFats = (int)($meal['f'] ?? 0);

            foreach ($blocked as $term) {
                if ($term !== '' && (str_contains($haystack, $term) || in_array($term, $allergens, true) || in_array($term, $tags, true))) {
                    $score -= 1000;
                }
            }

            if ($wantsVegan) {
                $score += in_array('vegan', $tags, true) ? 80 : -200;
            }
            if ($wantsProtein) {
                $score += (int)($meal['p'] ?? 0) * 2;
                if (in_array('protein', $tags, true)) $score += 20;
            }
            if ($wantsLowCarb) {
                $score -= (int)($meal['c'] ?? 0);
            }
            if ($wantsLowFat) {
                $score -= (int)($meal['f'] ?? 0);
            }
            if ($wantsLebanese || in_array('lebanese', $tags, true) || in_array('arabic', $tags, true)) {
                $score += (in_array('lebanese', $tags, true) || in_array('arabic', $tags, true) || in_array('levantine', $tags, true)) ? 28 : 0;
            }

            if ($targetCalories > 0) {
                $score += max(0, 30 - (abs($mealCalories - $targetCalories) / 18));
            }
            if ($targetProtein > 0) {
                $score += max(0, 24 - (abs($mealProtein - $targetProtein) * 1.4));
            }
            if ($targetCarbs > 0) {
                $score += max(0, 14 - (abs($mealCarbs - $targetCarbs) / 3));
            }
            if ($targetFats > 0) {
                $score += max(0, 14 - (abs($mealFats - $targetFats) / 2));
            }

            if (in_array('protein', $tags, true) || $mealProtein >= 30) {
                $score += 8;
            }

            foreach ($tokens as $token) {
                if (strlen($token) < 3 || in_array($token, ['the', 'and', 'with', 'make', 'swap', 'more', 'less', 'higher', 'lower'], true)) {
                    continue;
                }
                if (str_contains($haystack, $token)) {
                    $score += 12;
                }
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $meal;
            }
        }

        return $best ?: ($options[array_rand($options)] ?? null);
    }

    private function extractBlockedTerms(string $hintText): array {
        $blocked = [];
        if (preg_match_all('/(?:no|without|avoid|remove|swap out)\s+([a-z0-9 ]{2,30})/i', $hintText, $matches)) {
            foreach ($matches[1] as $phrase) {
                foreach (preg_split('/\s+|,|and|or/', strtolower($phrase), -1, PREG_SPLIT_NO_EMPTY) as $term) {
                    if (strlen($term) >= 3) {
                        $blocked[] = $term;
                    }
                }
            }
        }
        return array_values(array_unique($blocked));
    }

    private function getMealImage($name) {
        return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80&sig=" . md5($name);
    }
}
?>
