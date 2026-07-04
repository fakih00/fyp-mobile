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
    // =========================================================================
    // SPORT-SPECIFIC PROMPT ENHANCERS
    // =========================================================================
    private function getSportPromptContext(string $goal): string {
        $contexts = [
            'running' => "SPORT CONTEXT — Running Performance:\n"
                . "Design workouts specifically to improve running performance. Include:\n"
                . "- Cardio: Treadmill sprint intervals, tempo runs, hill sprints, fartlek sessions\n"
                . "- Strength supporting runs: Hip thrusts, single-leg squats, calf raises, glute bridges\n"
                . "- Core stability: Dead bugs, bird dog, anti-rotation press\n"
                . "- Mobility: Hip flexor stretches, hamstring decompression, dynamic warmups\n"
                . "- Focus sessions should alternate: Long Endurance Run, Speed Intervals, Strength (run-specific), Tempo Run.\n"
                . "- Avoid excessive upper body bulk that harms running economy.\n",

            'boxing' => "SPORT CONTEXT — Combat & Boxing Conditioning:\n"
                . "Design workouts for a combat athlete preparing for boxing/fighting. Include:\n"
                . "- Explosive plyometrics: Box jumps, med ball slams, jump rope (double-unders)\n"
                . "- Shadow boxing rounds, heavy bag work (if available)\n"
                . "- Footwork: Ladder drills, defensive shuffle, agility cones\n"
                . "- Rotational core: Russian twists, rotational med ball throws, oblique cable crunches\n"
                . "- Conditioning: HIIT circuits, battle ropes, sprint pyramids\n"
                . "- Strength: Push-ups variations, pull-ups, dumbbell punching drills\n"
                . "- Focus: Build explosive upper body power and anaerobic conditioning.\n",

            'swimming' => "SPORT CONTEXT — Swimming Performance (Dryland Training):\n"
                . "Design dryland workouts that directly improve swimming performance. Include:\n"
                . "- Pull strength: Pull-ups, lat pulldowns, cable rows, resistance band pulls\n"
                . "- Rotator cuff stability: Band external rotations, face pulls, Cuban press\n"
                . "- Core rotation: Landmine twists, cable woodchoppers, paloff press\n"
                . "- Hip flexibility: Hip circles, pigeon pose, butterfly stretch\n"
                . "- Explosive power: Box jumps, medicine ball chest throws, broad jumps\n"
                . "- Kick strength: Leg press, calf raises, flutter kicks\n"
                . "- Avoid: heavy overhead pressing that causes shoulder impingement.\n",

            'cycling' => "SPORT CONTEXT — Cycling Performance:\n"
                . "Design workouts to improve cycling power, endurance, and cadence. Include:\n"
                . "- Leg power: Back squats, leg press, Bulgarian split squats, lunges\n"
                . "- Cycling-specific cardio: Stationary bike (if available), spin intervals\n"
                . "- Hip hinge: Romanian deadlifts, kettlebell swings, hip thrusts\n"
                . "- Glute activation: Clamshells, glute bridges, hip abduction\n"
                . "- Core stability: Plank variations, dead bug, anti-lateral flexion holds\n"
                . "- Upper body maintenance: Light rows, band pull-aparts for posture\n"
                . "- Focus: Build quad/glute power and aerobic base. Avoid excessive upper body mass.\n",

            'martial_arts' => "SPORT CONTEXT — Martial Arts Conditioning:\n"
                . "Design workouts for a martial arts athlete. Include:\n"
                . "- Explosive movements: Plyometric push-ups, jump squats, clap push-ups\n"
                . "- Grappling strength: Pull-ups, farmer carries, towel pull-ups, deadlifts\n"
                . "- Flexibility & mobility: Hip flexor stretches, shoulder mobility, active splits\n"
                . "- Core power: Hollow body, L-sit, dragon flags, cable woodchoppers\n"
                . "- Agility & reaction: Ladder drills, cone shuffles, footwork circuits\n"
                . "- Conditioning: Tabata circuits, AMRAP rounds, burpees\n"
                . "- Balance: Single-leg work, stability ball exercises\n",

            'yoga_flexibility' => "SPORT CONTEXT — Yoga & Flexibility Training:\n"
                . "Design workouts focused on improving flexibility, mobility and mind-body connection. Include:\n"
                . "- Active flexibility: PNF stretching, dynamic flows, sun salutations\n"
                . "- Mobility work: Hip openers, thoracic rotations, shoulder circles\n"
                . "- Strength: Bodyweight resistance (chaturanga, warrior sequences, chair pose holds)\n"
                . "- Balance: Tree pose, warrior III, single-leg deadlift holds\n"
                . "- Core: Boat pose, plank holds, hollow body\n"
                . "- Breathwork integration: Box breathing cues, ujjayi breath during holds\n"
                . "- Sets/reps: Use hold times (30s, 45s, 60s) instead of repetition counts where appropriate.\n",
        ];

        return $contexts[$goal] ?? '';
    }

    private function getLocationContext(string $location): string {
        $contexts = [
            'gym'        => "Training Location: Full commercial gym — access to barbells, dumbbells, cables, machines, squat rack, and cardio equipment.",
            'home'       => "Training Location: Home setup — limited to bodyweight, resistance bands, and light dumbbells. Avoid exercises requiring machines or heavy barbells.",
            'outdoor'    => "Training Location: Outdoor environment — use bodyweight, park benches, pull-up bars, and open-space cardio. No gym machines.",
            'pool'       => "Training Location: Swimming pool (25m/50m lanes) — all exercises should be aquatic or pool-based: laps, drills, kick sets, pull sets, and interval swims. No dry-land exercises.",
            'open_water' => "Training Location: Open water (lake/ocean/river) — design open-water swim sets and beach/shore dryland warm-up/cool-down. No gym equipment.",
            'dryland'    => "Training Location: Dryland swim training area — use resistance bands, swim cords, medicine balls, and bodyweight movements that mimic swim mechanics.",
            'studio'     => "Training Location: Yoga/Pilates studio — use a yoga mat, blocks, straps, and bodyweight only. No heavy weights or machines.",
        ];
        return $contexts[$location] ?? $contexts['gym'];
    }

    private function generateWithGemini($profile): ?array {
        $goal          = $profile['goal'] ?? 'general_fitness';
        $frequency     = (int)($profile['training_days_per_week'] ?? 3);
        $location      = $profile['training_location'] ?? 'gym';
        $intensity     = $profile['training_intensity'] ?? 'moderate';
        $age           = $profile['age'] ?? 25;
        $weight        = $profile['weight'] ?? 70;
        $targetWeight  = $profile['target_weight'] ?? $profile['suggested_goal_weight'] ?? $weight;

        $injuries      = !empty($profile['injuries']) ? $profile['injuries'] : 'None';
        $painPoints    = !empty($profile['pain_points']) ? $profile['pain_points'] : 'None';
        $strongSide    = !empty($profile['strong_side']) ? $profile['strong_side'] : 'None';
        $posture       = !empty($profile['posture_problems']) ? $profile['posture_problems'] : 'None';
        $mobility      = !empty($profile['mobility_limitations']) ? $profile['mobility_limitations'] : 'None';
        $avoid         = !empty($profile['avoid_areas']) ? $profile['avoid_areas'] : 'None';
        $chronicPain   = !empty($profile['chronic_pain']) ? $profile['chronic_pain'] : 'None';

        $goalLabel    = str_replace('_', ' ', $goal);
        $allDays      = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
        $dayMap       = [1=>[0],2=>[0,3],3=>[0,2,4],4=>[0,1,3,4],5=>[0,1,3,4,6],6=>[0,1,2,3,4,5],7=>[0,1,2,3,4,5,6]];
        $trainDays    = array_map(fn($i) => $allDays[$i], $dayMap[min($frequency,7)] ?? $dayMap[3]);
        $dayList      = implode(', ', $trainDays);

        // Inject sport-specific context if applicable
        $sportContext = $this->getSportPromptContext($goal);

        $locationContext = $this->getLocationContext($location);

        $hasInjuries = ($injuries !== 'None' && !empty(trim($injuries)));
        $injuryRehabContext = '';
        if ($hasInjuries) {
            $injuryRehabContext = "\n⚠️  INJURY REHABILITATION MODE ACTIVE ⚠️\n"
                . "This athlete has the following active injuries/pain: {$injuries} ({$painPoints}).\n"
                . "MANDATORY RULES for this plan:\n"
                . "1. PRIMARY GOAL IS RECOVERY & PAIN REDUCTION — every session must include at least 2 rehabilitation or mobility exercises targeting the injured area.\n"
                . "2. ZERO loading of injured joints/muscles — no exercises that compress, strain, or stretch the injured area under load.\n"
                . "3. Include specific therapeutic exercises: gentle range-of-motion work, isometric holds, blood flow restriction at low weights, and anti-inflammatory mobility drills for the injured region.\n"
                . "4. Safe alternatives only: if the user's sport goal (e.g. boxing) includes movements that stress the injured area, replace those specific movements with injury-safe variants (e.g. shadowboxing footwork instead of heavy bag punching for a shoulder injury).\n"
                . "5. Intensity must be LIGHT-to-MODERATE for injured body parts. Other uninjured body parts may train normally at the user's selected intensity.\n"
                . "6. Label each workout day with a rehab-focused title (e.g. 'Lower Body Rehab & Strength', 'Shoulder Recovery & Core').\n";
        }

        $prompt = "Elite personal trainer & rehabilitation specialist. Generate a {$frequency}-day workout plan. NO rest days — only training days.\n"
            . "User Details: goal={$goalLabel}, age={$age}, weight={$weight}kg, target={$targetWeight}kg, intensity={$intensity}\n"
            . "{$locationContext}\n"
            . "{$injuryRehabContext}"
            . "Physical Assessment:\n"
            . "- Injuries: {$injuries}\n"
            . "- Pain points/sore areas: {$painPoints}\n"
            . "- Muscle imbalances (strong side): {$strongSide}\n"
            . "- Posture problems: {$posture}\n"
            . "- Mobility limitations: {$mobility}\n"
            . "- Areas to avoid during workouts: {$avoid}\n"
            . "- Chronic pain or discomfort: {$chronicPain}\n"
            . ($sportContext ? "\n{$sportContext}\n" : '')
            . "Safety & Personalization Rules:\n"
            . "1. CRITICAL: Give the athlete the best exercises that suit their body and goal. If they have an active registered injury (e.g., left shoulder injury, knee pain, etc.), they CANNOT perform exercises that load or stress that specific area (for example, if they have a left shoulder injury, they CANNOT do Bench Press or Overhead Press). Instead, select alternative, safe, non-impact or rehabilitation-friendly movements.\n"
            . "2. If there are posture problems or mobility limitations (e.g. forward head, tight hips), incorporate specific stretching or corrective exercises (e.g. face pulls, hip flexor stretches).\n"
            . "3. If one side is stronger, encourage unilateral movements (e.g. dumbbell work instead of barbell compound) to fix imbalances.\n"
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
        // Map extended location IDs down to the three local-engine buckets
        $locationRaw = isset($profile['training_location']) ? $profile['training_location'] : 'gym';
        $locationMap = [
            'pool'       => 'outdoor',
            'open_water' => 'outdoor',
            'dryland'    => 'home',
            'studio'     => 'home',
        ];
        $location = $locationMap[$locationRaw] ?? $locationRaw;
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
        $injuries = $profile['injuries'] ?? null;
        foreach ($training_indexes as $idx) {
            $dayName = $days[$idx];
            $workout = $this->getWorkoutForGoal($goal, $workout_count, $location, $intensity, $frequency, $injuries);
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

    private function isExerciseSafe(array $ex, ?string $injuriesStr): bool {
        if (empty($injuriesStr) || strtolower($injuriesStr) === 'none') {
            return true;
        }
        $lowerInjuries = strtolower($injuriesStr);
        $muscles = array_map('strtolower', $ex['muscles']);

        // Shoulder / Chest injury
        if (strpos($lowerInjuries, 'shoulder') !== false || strpos($lowerInjuries, 'chest') !== false) {
            foreach ($muscles as $m) {
                if (strpos($m, 'shoulder') !== false || strpos($m, 'chest') !== false || strpos($m, 'delt') !== false || strpos($m, 'tricep') !== false) {
                    return false;
                }
            }
        }
        // Knee / Leg / Hip injury
        if (strpos($lowerInjuries, 'knee') !== false || strpos($lowerInjuries, 'leg') !== false) {
            foreach ($muscles as $m) {
                if (strpos($m, 'quad') !== false || strpos($m, 'hamstring') !== false || strpos($m, 'glute') !== false || strpos($m, 'leg') !== false) {
                    return false;
                }
            }
        }
        // Back injury
        if (strpos($lowerInjuries, 'back') !== false) {
            foreach ($muscles as $m) {
                if (strpos($m, 'back') !== false || strpos($m, 'lat') !== false || strpos($m, 'spinal') !== false) {
                    return false;
                }
            }
        }
        // Elbow / Arm injury
        if (strpos($lowerInjuries, 'elbow') !== false || strpos($lowerInjuries, 'arm') !== false) {
            foreach ($muscles as $m) {
                if (strpos($m, 'arm') !== false || strpos($m, 'bicep') !== false || strpos($m, 'tricep') !== false) {
                    return false;
                }
            }
        }
        // Ankle injury
        if (strpos($lowerInjuries, 'ankle') !== false) {
            foreach ($muscles as $m) {
                if (strpos($m, 'calf') !== false || strpos($m, 'ankle') !== false) {
                    return false;
                }
            }
        }

        return true;
    }

    private function getWorkoutForGoal($goal, $index, $location, $intensityPreference, $frequency, $injuries = null) {
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

        // 1. ROTATION LOGIC — goal-aware splits
        $rotationType = "Full Body";
        $focus = "Mixed Intensity";

        // Goal-specific split templates
        $goalSplits = [
            'lose_weight'    => ["HIIT & Fat Burn", "Cardio & Core", "Full Body Circuit", "Metabolic Conditioning", "Cardio Endurance", "Core & Burn"],
            'build_muscle'   => ["Push (Chest/Delts)", "Pull (Back/Biceps)", "Legs (Lower Body 1)", "Upper Body Power", "Legs (Lower Body 2)", "Core & HIIT"],
            'keep_fit'       => ["Full Body (A)", "Cardio & Mobility", "Full Body (B)", "Core & Flexibility", "Full Body (C)", "Active Recovery"],
            'gain_weight'    => ["Push Power", "Pull Hypertrophy", "Leg Mass", "Upper Body Volume", "Compound Power", "Full Body Bulk"],
            'running'        => ["Long Endurance Run", "Speed Intervals", "Strength (Run Support)", "Tempo Run", "Hill Sprints", "Recovery Mobility"],
            'boxing'         => ["Explosive HIIT", "Heavy Bag & Core", "Footwork & Agility", "Upper Body Power", "Conditioning Circuit", "Shadow & Speed"],
            'swimming'       => ["Pull Strength", "Core Rotation", "Kick Power", "Dryland Full Body", "Flexibility & Mobility", "Explosive Dryland"],
            'cycling'        => ["Leg Power", "Spin Intervals", "Hip Hinge & Glutes", "Core Stability", "Cyclist Endurance", "Full Body Maintenance"],
            'martial_arts'   => ["Explosive Plyometrics", "Grappling Strength", "Flexibility & Mobility", "Core Power", "Agility & Reaction", "Conditioning"],
            'yoga_flexibility'=> ["Active Flexibility", "Mobility Flow", "Strength & Balance", "Hip Openers", "Core & Breathwork", "Full Body Yoga"],
            // Legacy goals
            'gain_muscle'    => ["Push (Chest/Delts)", "Pull (Back/Biceps)", "Legs (Lower Body 1)", "Upper Body Power", "Legs (Lower Body 2)", "Core & HIIT"],
            'maintain'       => ["Full Body (A)", "Cardio & Mobility", "Full Body (B)", "Core & Flexibility", "Full Body (C)", "Active Recovery"],
            'improve_stamina'=> ["HIIT & Cardio", "Endurance Run", "Circuit Training", "Cardio & Core", "Interval Training", "Active Recovery"],
        ];

        $splits = $goalSplits[$goal] ?? ["Full Body (A)", "Full Body (B)", "Full Body (C)"];

        if ($frequency >= 5) {
            $rotationType = "Advanced Split";
        } elseif ($frequency >= 3) {
            $rotationType = "Foundation Cycle";
        } else {
            $rotationType = "Maintenance";
        }
        $focus = $splits[$index % count($splits)];

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
            if (!$this->isExerciseSafe($ex, $injuries)) continue;
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
                if (in_array($location, $ex['loc']) && $this->isExerciseSafe($ex, $injuries) && !in_array($ex['id'], array_column($selected_exercises, 'id'))) {
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
