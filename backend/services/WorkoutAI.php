<?php
require_once __DIR__ . '/GeminiService.php';

class WorkoutAI {

    private GeminiService $gemini;

    public function __construct() {
        $this->gemini = new GeminiService();
    }

    public function generatePlan($profile) {
        // --- Try Gemini AI first ---
        if ($this->gemini->isAvailable()) {
            $plan = $this->generateWithGemini($profile);
            if ($plan !== null) {
                return $plan;
            }
            // If Gemini failed, fall through to the local logic
            error_log("WorkoutAI: Gemini failed, falling back to local logic.");
        }

        // --- Fallback: Local rule-based engine ---
        return $this->generateLocal($profile);
    }

    // =========================================================================
    // GEMINI AI PLAN GENERATION
    // =========================================================================
    private function generateWithGemini($profile): ?array {
        $goal          = $profile['goal'] ?? 'general_fitness';
        $frequency     = (int)($profile['training_days_per_week'] ?? 3);
        $location      = $profile['training_location'] ?? 'gym';
        $intensity     = $profile['training_intensity'] ?? 'moderate';
        $age           = $profile['age'] ?? 25;
        $weight        = $profile['weight'] ?? 70;
        $targetWeight  = $profile['target_weight'] ?? $profile['suggested_goal_weight'] ?? $weight;

        $goalLabel = str_replace('_', ' ', $goal);
        $allDays   = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
        $dayMap    = [1=>[0],2=>[0,3],3=>[0,2,4],4=>[0,1,3,4],5=>[0,1,3,4,6],6=>[0,1,2,3,4,5],7=>[0,1,2,3,4,5,6]];
        $trainDays = array_map(fn($i) => $allDays[$i], $dayMap[min($frequency,7)] ?? $dayMap[3]);
        $dayList   = implode(', ', $trainDays);

        $prompt = "Elite personal trainer. Generate a {$frequency}-day workout plan. NO rest days — only training days.\n"
            . "User: goal={$goalLabel}, age={$age}, weight={$weight}kg, target={$targetWeight}kg, location={$location}, intensity={$intensity}\n"
            . "Assign EXACTLY these day names: {$dayList}\n\n"
            . "Rules:\n"
            . "1. RAW JSON array ONLY. EXACTLY {$frequency} objects — one per training day listed above.\n"
            . "2. EXACTLY 5 exercises per day. NO rest days, NO recovery days, NO empty exercise arrays.\n"
            . "3. Use shorthand keys: d=day name (use exact names from above), t=title, f=focus, k=kcal, df=difficulty, r=rationale, e=exercises (n=name, s=sets, rp=reps, rt=rest).\n"
            . "4. Format: [{\"d\":\"Monday\",\"t\":\"Push Day\",\"f\":\"Chest & Triceps\",\"k\":420,\"df\":\"Hard\",\"r\":\"...\",\"e\":[{\"n\":\"Bench Press\",\"s\":4,\"rp\":\"8\",\"rt\":\"90s\"}]}]";

        $plan = $this->gemini->askForJson($prompt);

        // Accept both shorthand 'e' (as instructed in the prompt) and full 'exercises'
        if (!is_array($plan) || count($plan) === 0 || (!isset($plan[0]['e']) && !isset($plan[0]['exercises']))) {
            return null;
        }

        // Filter out any rest/recovery days Gemini might have included despite instructions
        $plan = array_values(array_filter($plan, function($day) {
            $exercises = $day['e'] ?? ($day['exercises'] ?? []);
            $focus     = strtolower($day['f'] ?? ($day['focus'] ?? ''));
            $title     = strtolower($day['t'] ?? ($day['title'] ?? ''));
            return is_array($exercises) && count($exercises) > 0
                && strpos($focus, 'rest') === false
                && strpos($title, 'rest') === false;
        }));

        // Cap to exactly $frequency training days
        $plan = array_slice($plan, 0, $frequency);

        if (count($plan) === 0) {
            return null;
        }

        $images = [
            'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=500&q=60',
            'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=500&q=60',
            'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=500&q=60',
            'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=500&q=60',
        ];

        $sanitized = [];
        foreach ($plan as $i => $day) {
            // Always use $trainDays for day names — Gemini may return numbers or wrong casing
            $dayName = $trainDays[$i] ?? ($day['d'] ?? ($day['day'] ?? "Day " . ($i + 1)));
            $sanitized[] = [
                "id"         => "w" . ($i + 1),
                "day"        => $dayName,
                "title"      => $day['t'] ?? ($day['title'] ?? ($day['f'] ?? ($day['focus'] ?? 'Workout')) . " @ " . ucfirst($location)),
                "focus"      => $day['f'] ?? ($day['focus'] ?? "General Fitness"),
                "exercises"  => $this->sanitizeExercises($day['e'] ?? ($day['exercises'] ?? [])),
                "duration"   => rand(45, 65) . " mins",
                "kcal"       => (int)($day['k'] ?? ($day['kcal'] ?? rand(300, 500))),
                "category"   => "Strength",
                "difficulty" => $day['df'] ?? ($day['difficulty'] ?? "Intermediate"),
                "intensity"  => 7,
                "rationale"  => $day['r'] ?? ($day['rationale'] ?? ""),
                "image"      => $images[$i % count($images)],
                "location"   => $location,
                "completed"  => false,
            ];
        }

        return $sanitized;
    }


    private function sanitizeExercises(array $exercises): array {
        $clean = [];
        foreach ($exercises as $i => $ex) {
            $clean[] = [
                "id"        => $ex['id'] ?? "e" . ($i + 1),
                "name"      => $ex['n'] ?? ($ex['name'] ?? "Exercise " . ($i + 1)),
                "sets"      => (int)($ex['s'] ?? ($ex['sets'] ?? 3)),
                "reps"      => $ex['rp'] ?? ($ex['reps'] ?? "10-12"),
                "rest"      => $ex['rt'] ?? ($ex['rest'] ?? "60s"),
                "guide"     => $ex['guide'] ?? "",
                "completed" => false,
            ];
        }
        return $clean;
    }


    // =========================================================================
    // LOCAL FALLBACK ENGINE (original logic, preserved)
    // =========================================================================
    public function generateLocal($profile) {
        $goal = $profile['goal'];
        $frequency = isset($profile['training_days_per_week']) ? (int)$profile['training_days_per_week'] : 3;
        $location = isset($profile['training_location']) ? $profile['training_location'] : 'gym';
        $intensity = isset($profile['training_intensity']) ? $profile['training_intensity'] : 'moderate';
        
        $plan = [];
        $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        $training_indexes = [];
        if ($frequency == 1) $training_indexes = [0]; 
        elseif ($frequency == 2) $training_indexes = [0, 3]; 
        elseif ($frequency == 3) $training_indexes = [0, 2, 4]; 
        elseif ($frequency == 4) $training_indexes = [0, 1, 3, 4]; 
        elseif ($frequency == 5) $training_indexes = [0, 1, 3, 4, 6]; 
        elseif ($frequency == 6) $training_indexes = [0, 1, 2, 4, 5, 6]; 
        else $training_indexes = [0, 1, 2, 3, 4, 5, 6]; 
        
        $workout_count = 0;
        foreach ($training_indexes as $idx) {
            $dayName = $days[$idx];
            $workout = $this->getWorkoutForGoal($goal, $workout_count, $location, $intensity, $frequency);
            $plan[] = [
                "id" => "w" . ($workout_count + 1),
                "day" => $dayName,
                "title" => $workout['focus'] . " @ " . ucfirst($location),
                "focus" => $workout['focus'],
                "exercises" => $workout['exercises'],
                "duration" => $workout['duration'] . " mins",
                "kcal" => $workout['kcal'],
                "category" => $workout['category'],
                "difficulty" => $workout['difficulty'],
                "intensity" => $workout['intensity_score'],
                "rationale" => $workout['rationale'],
                "image" => $workout['image'],
                "location" => $location,
                "completed" => false
            ];
            $workout_count++;
        }

        return $plan;
    }

    private function getWorkoutForGoal($goal, $index, $location, $intensityPreference, $frequency) {
        // Advanced Dynamic Exercise Library (60+ Movements)
        $library = [
            // GYM COMPOUNDS
            ["id" => "g1", "name" => "Barbell Bench Press", "loc" => ["gym"], "muscles" => ["Chest", "Triceps"], "cat" => "strength"],
            ["id" => "g2", "name" => "Incline DB Press", "loc" => ["gym"], "muscles" => ["Upper Chest"], "cat" => "strength"],
            ["id" => "g3", "name" => "Conventional Deadlift", "loc" => ["gym"], "muscles" => ["Back", "Hamstrings", "Glutes"], "cat" => "power"],
            ["id" => "g4", "name" => "Overhead Press", "loc" => ["gym"], "muscles" => ["Shoulders", "Triceps"], "cat" => "strength"],
            ["id" => "g5", "name" => "Back Squats (Barbell)", "loc" => ["gym"], "muscles" => ["Quads", "Glutes"], "cat" => "strength"],
            ["id" => "g6", "name" => "Weighted Pull-Ups", "loc" => ["gym", "outdoor"], "muscles" => ["Lats", "Biceps"], "cat" => "strength"],
            ["id" => "g7", "name" => "Barbell Rows", "loc" => ["gym"], "muscles" => ["Mid Back", "Biceps"], "cat" => "strength"],
            ["id" => "g8", "name" => "Leg Press", "loc" => ["gym"], "muscles" => ["Quads", "Glutes"], "cat" => "volume"],
            ["id" => "g9", "name" => "Dips (Chest Focus)", "loc" => ["gym", "outdoor"], "muscles" => ["Chest", "Triceps"], "cat" => "strength"],
            ["id" => "g10", "name" => "T-Bar Rows", "loc" => ["gym"], "muscles" => ["Mid Back"], "cat" => "strength"],
            
            // GYM ACCESSORIES
            ["id" => "a1", "name" => "Cable Flys", "loc" => ["gym"], "muscles" => ["Chest"], "cat" => "accessory"],
            ["id" => "a2", "name" => "Lateral Raises (DB)", "loc" => ["gym", "home"], "muscles" => ["Side Delts"], "cat" => "accessory"],
            ["id" => "a3", "name" => "Face Pulls", "loc" => ["gym"], "muscles" => ["Rear Delts", "Upper Back"], "cat" => "prehab"],
            ["id" => "a4", "name" => "Leg Extensions", "loc" => ["gym"], "muscles" => ["Quads"], "cat" => "accessory"],
            ["id" => "a5", "name" => "Lying Leg Curls", "loc" => ["gym"], "muscles" => ["Hamstrings"], "cat" => "accessory"],
            ["id" => "a6", "name" => "Preacher Curls", "loc" => ["gym"], "muscles" => ["Biceps"], "cat" => "accessory"],
            ["id" => "a7", "name" => "Skull Crushers", "loc" => ["gym"], "muscles" => ["Triceps"], "cat" => "accessory"],
            ["id" => "a8", "name" => "Hammer Curls", "loc" => ["gym", "home"], "muscles" => ["Biceps", "Forearms"], "cat" => "accessory"],
            ["id" => "a9", "name" => "Calf Raises (Seated)", "loc" => ["gym"], "muscles" => ["Calves"], "cat" => "accessory"],
            ["id" => "a10", "name" => "Pec Deck Flys", "loc" => ["gym"], "muscles" => ["Chest"], "cat" => "accessory"],

            // HOME / CALISTHENICS
            ["id" => "h1", "name" => "Standard Push Ups", "loc" => ["home", "outdoor", "gym"], "muscles" => ["Chest", "Triceps"], "cat" => "base"],
            ["id" => "h2", "name" => "Diamond Push Ups", "loc" => ["home", "outdoor"], "muscles" => ["Triceps"], "cat" => "strength"],
            ["id" => "h3", "name" => "Archer Push Ups", "loc" => ["home", "outdoor"], "muscles" => ["Chest", "Stability"], "cat" => "expert"],
            ["id" => "h4", "name" => "Pike Push Ups", "loc" => ["home", "outdoor"], "muscles" => ["Shoulders"], "cat" => "strength"],
            ["id" => "h5", "name" => "Bodyweight Squats", "loc" => ["home", "outdoor", "gym"], "muscles" => ["Quads", "Glutes"], "cat" => "base"],
            ["id" => "h6", "name" => "Bulgarian Split Squats", "loc" => ["home", "outdoor", "gym"], "muscles" => ["Quads", "Glutes"], "cat" => "strength"],
            ["id" => "h7", "name" => "Single Leg Glute Bridge", "loc" => ["home", "outdoor"], "muscles" => ["Glutes", "Lower Back"], "cat" => "base"],
            ["id" => "h8", "name" => "Chin Ups (Strict)", "loc" => ["outdoor", "gym"], "muscles" => ["Biceps", "Lats"], "cat" => "strength"],
            ["id" => "h9", "name" => "Australian Pull Ups", "loc" => ["outdoor"], "muscles" => ["Mid Back"], "cat" => "base"],
            ["id" => "h10", "name" => "Chair Dips", "loc" => ["home"], "muscles" => ["Triceps"], "cat" => "base"],

            // CORE & FUNCTIONAL
            ["id" => "c1", "name" => "Hollow Body Hold", "loc" => ["home", "gym", "outdoor"], "muscles" => ["Core"], "cat" => "isometric"],
            ["id" => "c2", "name" => "Bicycle Crunches", "loc" => ["home", "outdoor", "gym"], "muscles" => ["Obliques"], "cat" => "volume"],
            ["id" => "c3", "name" => "Leg Raises (Hanging)", "loc" => ["gym", "outdoor"], "muscles" => ["Lower Abs"], "cat" => "strength"],
            ["id" => "c4", "name" => "Russian Twists", "loc" => ["home", "gym"], "muscles" => ["Obliques"], "cat" => "volume"],
            ["id" => "c5", "name" => "Plank with Shoulder Taps", "loc" => ["home", "outdoor"], "muscles" => ["Core", "Shoulders"], "cat" => "functional"],
            ["id" => "c6", "name" => "Bird Dog", "loc" => ["home", "gym"], "muscles" => ["Spinal Stability"], "cat" => "prehab"],
            ["id" => "c7", "name" => "Dead Bug", "loc" => ["home", "gym"], "muscles" => ["Deep Core"], "cat" => "prehab"],
            ["id" => "c8", "name" => "Mountain Climbers", "loc" => ["home", "outdoor"], "muscles" => ["Full Body", "Cardio"], "cat" => "cardio"],
            ["id" => "c9", "name" => "Burpees", "loc" => ["home", "outdoor"], "muscles" => ["Full Body", "Explosive"], "cat" => "cardio"],
            ["id" => "c10", "name" => "V-Ups", "loc" => ["home", "gym"], "muscles" => ["Abs"], "cat" => "strength"],

            // CARDIO & EXPLOSIVE
            ["id" => "e1", "name" => "Treadmill Sprint Intervals", "loc" => ["gym"], "muscles" => ["Heart", "Legs"], "cat" => "hiit"],
            ["id" => "e2", "name" => "Rowing Machine (500m)", "loc" => ["gym"], "muscles" => ["Full Body"], "cat" => "stamina"],
            ["id" => "e3", "name" => "Battle Ropes", "loc" => ["gym"], "muscles" => ["Shoulders", "Core"], "cat" => "hiit"],
            ["id" => "e4", "name" => "Box Jumps", "loc" => ["gym", "outdoor"], "muscles" => ["Quads", "CNS"], "cat" => "plyo"],
            ["id" => "e5", "name" => "Swimming Laps", "loc" => ["outdoor"], "muscles" => ["Full Body"], "cat" => "stamina"],
            ["id" => "e6", "name" => "Kettlebell Swings", "loc" => ["gym", "home"], "muscles" => ["Glutes", "Hamstrings", "Heart"], "cat" => "hiit"],
            ["id" => "e7", "name" => "Jump Rope", "loc" => ["home", "outdoor"], "muscles" => ["Calves", "Cardio"], "cat" => "cardio"],
            ["id" => "e8", "name" => "Thrusters (Dumbbell)", "loc" => ["gym", "home"], "muscles" => ["Full Body"], "cat" => "compound"],
            ["id" => "e9", "name" => "Bear Crawls", "loc" => ["outdoor", "home"], "muscles" => ["Shoulders", "Core"], "cat" => "mobility"],
            ["id" => "e10", "name" => "Sandbag Carries", "loc" => ["outdoor", "gym"], "muscles" => ["Grip", "Total Body"], "cat" => "power"],
        ];

        // 1. ROTATION LOGIC
        $rotationType = "Full Body";
        $focus = "Mixed Intensity";
        
        if ($frequency >= 5) {
            $splits = ["Push (Chest/Delts)", "Pull (Back/Biceps)", "Legs (Lower Body 1)", "Upper Body Power", "Legs (Lower Body 2)", "Core & HIIT"];
            $rotationType = "Advanced Split";
            $focus = $splits[$index % count($splits)];
        } elseif ($frequency >= 3) {
            $splits = ["Full Body (A)", "Full Body (B)", "Full Body (C)"];
            $rotationType = "Foundation Cycle";
            $focus = $splits[$index % count($splits)];
        } else {
            $rotationType = "Maintenance";
            $focus = "Total Efficiency";
        }

        // 2. INTENSITY LOGIC
        $sets = 3; $reps = "10-12"; $rest = "60s"; $difficulty = "Intermediate"; $intensity_score = 7; $intensity_desc = "standard hypertrophy parameters";

        switch ($intensityPreference) {
            case 'heavy':
                $sets = 4; $reps = "5-8"; $rest = "120s"; $difficulty = "Elite"; $intensity_score = 9; $intensity_desc = "high load, long recovery";
                break;
            case 'light':
                $sets = 2; $reps = "15-20"; $rest = "30s"; $difficulty = "Beginner"; $intensity_score = 5; $intensity_desc = "low load, high metabolic stress";
                break;
        }

        // 3. RATIONALE
        $loc_name = ($location === 'gym') ? "Elite Training Facility" : ucfirst($location);
        $rationale  = "Based on your $goal goal and $frequency-day frequency, I've designed a $rotationType program. ";
        $rationale .= "Since you requested $intensityPreference intensity, I've optimized parameters for $intensity_desc using the available equipment at your $loc_name. ";
        $rationale .= "Today's $focus session is calculated to trigger optimal recovery markers.";

        // 4. EXERCISE SELECTION
        $selected_exercises = [];
        $shuffled_library = $library;
        shuffle($shuffled_library);

        foreach ($shuffled_library as $ex) {
            if (!in_array($location, $ex['loc'])) continue;
            if (stripos($focus, 'Push') !== false && !array_intersect($ex['muscles'], ['Chest', 'Triceps', 'Shoulders', 'Upper Chest', 'Side Delts'])) continue;
            if (stripos($focus, 'Pull') !== false && !array_intersect($ex['muscles'], ['Back', 'Biceps', 'Lats', 'Mid Back', 'Rear Delts'])) continue;
            if (stripos($focus, 'Legs') !== false && !array_intersect($ex['muscles'], ['Quads', 'Glutes', 'Hamstrings', 'Calves'])) continue;

            $selected_exercises[] = [
                "id" => $ex['id'], "name" => $ex['name'],
                "sets" => $sets, "reps" => $reps, "rest" => $rest, "completed" => false,
                "guide" => "Focus on the " . implode(', ', $ex['muscles']) . " throughout the movement."
            ];
            if (count($selected_exercises) >= 7) break;
        }

        // Fallback
        if (count($selected_exercises) < 4) {
            foreach ($shuffled_library as $ex) {
                if (in_array($location, $ex['loc']) && !in_array($ex['id'], array_column($selected_exercises, 'id'))) {
                    $selected_exercises[] = ["id" => $ex['id'], "name" => $ex['name'], "sets" => $sets, "reps" => $reps, "rest" => $rest, "completed" => false];
                }
                if (count($selected_exercises) >= 6) break;
            }
        }

        return [
            "focus"           => $focus,
            "exercises"       => $selected_exercises,
            "duration"        => rand(45, 65),
            "kcal"            => ($intensityPreference === 'heavy' ? rand(450, 600) : rand(250, 400)),
            "category"        => ($intensityPreference === 'heavy' ? "Power" : "Endurance"),
            "difficulty"      => $difficulty,
            "intensity_score" => $intensity_score,
            "rationale"       => $rationale,
            "image"           => "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=500&q=60"
        ];
    }
}
?>
