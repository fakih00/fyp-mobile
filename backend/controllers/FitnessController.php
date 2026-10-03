<?php
require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/UserController.php';
require_once __DIR__ . '/ChallengeController.php';
require_once __DIR__ . '/AchievementController.php';

class FitnessController extends BaseController {
    private function isAllowedNutriCoreSwapHint($hint) {
        $hint = strtolower(trim((string)$hint));
        if ($hint === '') {
            return false;
        }

        $allowed = [
            'more fridge match',
            'higher protein',
            'lower calories',
            'low calories',
            'low calorie',
            'low carb',
            'lower carb',
            'low fat',
            'lower fat',
            'no dairy',
            'without dairy',
            'no fish',
            'without fish',
            'no eggs',
            'without eggs',
            'no gluten',
            'without gluten',
            'no peanuts',
            'without peanuts',
            'plant based',
            'vegan',
            'lebanese style',
            'home food',
        ];

        foreach ($allowed as $term) {
            if (strpos($hint, $term) !== false) {
                return true;
            }
        }
        return false;
    }
    
    public function getDashboard() {
        $user_id = $this->requireAuth();

        // Fetch user basic info and profile stats
        $query = "SELECT u.name, p.* 
                  FROM users u 
                  JOIN user_profiles p ON u.id = p.user_id 
                  WHERE u.id = ?";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            $this->errorResponse("User not found", 404);
        }

        // Prepare user_info structure
        $user_info = [
            "name" => $row['name'],
            "level" => (int)$row['level'],
            "xp" => (int)$row['xp'],
            "nextLevelXp" => (int)$row['level'] * 1000,
            "streak" => (int)$row['streak'],
            "points" => (int)$row['points'],
            "weight" => $row['weight']
        ];

        // Fetch daily stats
        $daily_stats = [
            "calories" => 0,
            "steps" => 0,
            "water" => 0,
            "water_goal" => intval((float)($row['weight'] ?: 70) * 33)
        ];

        // Fetch today's steps from daily_logs
        $stmtSteps = $this->db->prepare("SELECT steps, water_ml, weight FROM daily_logs WHERE user_id = ? AND date_logged = CURDATE()");
        $stmtSteps->execute([$user_id]);
        $stepRow = $stmtSteps->fetch(PDO::FETCH_ASSOC);
        if ($stepRow) {
            $daily_stats['steps'] = (int)$stepRow['steps'];
            $daily_stats['water'] = (int)$stepRow['water_ml'];
            // If weight was logged today, use it for a more accurate goal
            if ($stepRow['weight'] > 0) {
                $daily_stats['water_goal'] = intval($stepRow['weight'] * 33);
            }
        }

        // CHECK IF nutrition_logs exists for calories (simple check)
        // For now, we'll just query the latest log if available, otherwise 0
        // (Assuming existing structure doesn't fully support daily aggregation yet without new tables)
        
        // --- Calculate Daily Calories from Logged Meals ---
        $currentDayName = date('l'); // e.g., "Monday"
        $todayDate = date('Y-m-d');
        
        // Fetch latest nutrition plan
        $stmtN = $this->db->prepare("SELECT meal_data, date_generated FROM nutrition_plans WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
        $stmtN->execute([$user_id]);
        $nRow = $stmtN->fetch(PDO::FETCH_ASSOC);

        if ($nRow) {
            $meals = json_decode($nRow['meal_data'], true);
            $planDate = $nRow['date_generated'];
            
            // Allow for plan valid duration (e.g. 1 week) checking if needed, 
            // but for now strict day checking on the plan's "day" field relative to today
            // If the plan was generated today, perfect. If last week, we might need logic.
            // Assumption: Plan is generated weekly or daily. We look for the "day" matching today.
            
            if (is_array($meals)) {
                foreach ($meals as $m) {
                    // Check if meal matches today's day name 
                    if (($m['day'] ?? '') === $currentDayName) {
                        if (!empty($m['completed'])) {
                            $daily_stats['calories'] += (int)($m['calories'] ?? 0);
                        }
                    }
                }
            }
        }
        
        // --- Calculate Weekly Chart Data (Current Week Mon-Sun) ---
        $weekly_chart_data = array_fill(0, 7, 0); // Initialize Mon-Sun with 0
        
        $monday = strtotime('monday this week');
        $today_idx = (int)date('N') - 1; // 0 (Mon) to 6 (Sun)

        // 1. Get Completed Workouts for this week
        $startVal = date('Y-m-d', $monday);
        $endVal = date('Y-m-d', strtotime('sunday this week'));
        
        $stmtW = $this->db->prepare("SELECT plan_data, date_generated FROM workouts WHERE user_id = ? AND date_generated <= ? ORDER BY date_generated DESC LIMIT 1");
        $stmtW->execute([$user_id, $endVal]);
        $wRow = $stmtW->fetch(PDO::FETCH_ASSOC);

        if ($wRow) {
            $plan = json_decode($wRow['plan_data'], true);
            $planDate = strtotime($wRow['date_generated']);
            // If plan is older than this week, simplistic check: 
            // In a real app, we'd check if the plan covers this week or if it's a recurring schedule.
            // For now, assume strict date matching or 'current active plan' logic
            
            if (is_array($plan)) {
                foreach ($plan as $day) {
                    if (!empty($day['completed'])) {
                        $dayName = $day['day'] ?? '';
                        // Map day name to index 0-6
                        $dIdx = -1;
                        switch($dayName) {
                            case 'Monday': $dIdx = 0; break;
                            case 'Tuesday': $dIdx = 1; break;
                            case 'Wednesday': $dIdx = 2; break;
                            case 'Thursday': $dIdx = 3; break;
                            case 'Friday': $dIdx = 4; break;
                            case 'Saturday': $dIdx = 5; break;
                            case 'Sunday': $dIdx = 6; break;
                        }
                        
                        if ($dIdx >= 0) {
                            // Only count if it's 'this week' (simplification: assume plan runs this week)
                            $weekly_chart_data[$dIdx] += 60; 
                        }
                    }
                }
            }
        }

        // 2. Get Weight Logs for this week
        $stmtP = $this->db->prepare("SELECT date_logged FROM progress WHERE user_id = ? AND date_logged BETWEEN ? AND ?");
        $stmtP->execute([$user_id, $startVal, $endVal]);
        $pLogs = $stmtP->fetchAll(PDO::FETCH_ASSOC);

        foreach ($pLogs as $log) {
            $ts = strtotime($log['date_logged']);
            $dIdx = (int)date('N', $ts) - 1;
            if ($dIdx >= 0 && $dIdx <= 6) {
                // If weight logged, ensure max score is 100
                if ($weekly_chart_data[$dIdx] < 100) {
                    $weekly_chart_data[$dIdx] += 40;
                }
            }
        }

        // Cap at 100
        for($i=0; $i<7; $i++) {
            if ($weekly_chart_data[$i] > 100) $weekly_chart_data[$i] = 100;
            // Don't show future data as 0, keep it 0 but logic holds.
            // Optionally, we could set future days to null? WeeklyChart expects numbers.
        }

        // 3. fetch next workout
        $next_workout = null;
        if ($wRow) {
             // Retrieve the plan from the earlier query
             $plan = json_decode($wRow['plan_data'], true);
             if (is_array($plan)) {
                 $dayName = date('l'); // Today
                 foreach ($plan as $w) {
                     if (($w['day'] ?? '') === $dayName && empty($w['completed'])) {
                         $next_workout = $w;
                         // Add duration/calories if missing (mock or calculate)
                         if (!isset($next_workout['duration'])) $next_workout['duration'] = '45 mins';
                         if (!isset($next_workout['calories'])) $next_workout['calories'] = '350 kcal';
                         break; 
                     }
                 }
                 
                 // If no workout today, maybe find the next one in the week?
                 if (!$next_workout) {
                      // Optional: Look ahead
                 }
             }
        }

        $this->jsonResponse([
            "user_info" => $user_info,
            "daily_stats" => $daily_stats,
            "weekly_chart_data" => $weekly_chart_data,
            "next_workout" => $next_workout, 
            "ai_message" => "Ready to crush your goals today?",
            "message" => "Dashboard data retrieved"
        ]);
    }

    public function getWorkouts() {
        $user_id = $this->requireAuth();

        $query = "SELECT * FROM workouts WHERE user_id = ? ORDER BY date_generated DESC, id DESC LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $workouts = json_decode($row['plan_data'], true);
            
            // Ensure it's an array of objects
            if (!is_array($workouts) || (count($workouts) > 0 && !isset($workouts[0]))) {
                $workouts = [$workouts];
            }

            foreach ($workouts as &$w) {
                if (is_array($w)) {
                    $w['plan_id'] = $row['id'];
                    $w['db_id'] = $row['id'];
                }
            }
            $this->jsonResponse($workouts);
        } else {
            $this->jsonResponse([]);
        }
    }

    public function getNutritionPlan() {
        $user_id = $this->requireAuth();

        $query = "SELECT * FROM nutrition_plans WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $this->jsonResponse([
                "meals" => json_decode($row['meal_data'], true),
                "calories" => (int)$row['calories'],
                "protein_target" => (int)($row['protein'] ?? round(($row['calories'] * 0.3) / 4)),
                "carbs_target" => (int)($row['carbs'] ?? round(($row['calories'] * 0.4) / 4)),
                "fats_target" => (int)($row['fats'] ?? round(($row['calories'] * 0.3) / 9)),
                "is_recomp" => (bool)($row['is_recomp'] ?? false)
            ]);
        } else {
            $this->jsonResponse([
                "meals" => [], 
                "calories" => 2200,
                "protein_target" => 165,
                "carbs_target" => 220,
                "fats_target" => 73,
                "is_recomp" => false
            ]);
        }
    }

    public function generatePlan() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        $type = isset($data->type) ? $data->type : 'workout';

        // Fetch user profile for AI
        $stmt = $this->db->prepare("SELECT * FROM user_profiles WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$profile) {
            $this->errorResponse("User profile not found. Please complete setup.", 404);
        }

        if ($type === 'workout') {
            // Check if user has active registered injuries
            if (!empty($profile['injuries']) && strtolower($profile['injuries']) !== 'none') {
                // Check if they have completed their AI Body Recovery plan
                $stmtRec = $this->db->prepare("SELECT COUNT(*) FROM recovery_plans WHERE user_id = ?");
                $stmtRec->execute([$user_id]);
                $hasRecoveryPlan = (int)$stmtRec->fetchColumn();
                if ($hasRecoveryPlan === 0) {
                    $this->errorResponse("You must complete your AI Body Recovery assessment before generating a workout plan.", 400);
                }
            }

            require_once __DIR__ . '/../services/WorkoutAI.php';
            $ai = new WorkoutAI();
            $plan = $ai->generatePlan($profile);

            if ($plan) {
                $query = "INSERT INTO workouts (user_id, plan_data, date_generated, completed) VALUES (?, ?, CURDATE(), 0)";
                $saveStmt = $this->db->prepare($query);
                $planJson = json_encode($plan);

                if ($saveStmt->execute([$user_id, $planJson])) {
                    $this->jsonResponse([
                        "message" => "Plan generated and saved successfully",
                        "plan" => $plan,
                        "workout_id" => $this->db->lastInsertId()
                    ]);
                } else {
                    $this->errorResponse("Failed to save plan to database", 500);
                }
            } else {
                $this->errorResponse("Plan generation failed", 500);
            }

        } elseif ($type === 'nutrition') {
            require_once __DIR__ . '/../services/NutritionAI.php';
            $ai = new NutritionAI();
            $calories = $ai->calculateCalories($profile);
            $fridgeIngredients = [];
            if (!empty($data->fridge_ingredients) && is_array($data->fridge_ingredients)) {
                $fridgeIngredients = array_values(array_filter(array_map('strval', $data->fridge_ingredients)));
            }
            $approvalReviews = $this->getMealReviewMap();
            $plan = $ai->generateMealPlan($calories, $profile, $fridgeIngredients, $approvalReviews);

            if (!is_array($plan) || count($plan) === 0) {
                $this->errorResponse("NutriCore could not generate an expert-approved nutrition plan. Ask the meal reviewer to approve meals first.", 409);
            }

            // Detect recomp for macro ratios
            $weight = $profile['weight'];
            $targetWeight = $profile['target_weight'] ?? $profile['suggested_goal_weight'] ?? 70;
            $isRecomp = ($weight > $targetWeight) && ($profile['goal'] === 'gain_muscle');

            $p_ratio = $isRecomp ? 0.4 : 0.3;
            $c_ratio = $isRecomp ? 0.35 : 0.4;
            $f_ratio = $isRecomp ? 0.25 : 0.3;

            $protein = round(($calories * $p_ratio) / 4);
            $carbs = round(($calories * $c_ratio) / 4);
            $fats = round(($calories * $f_ratio) / 9);

            $jsonPlan = json_encode($plan);
            $date = date('Y-m-d');

            $ins = "INSERT INTO nutrition_plans (user_id, meal_data, calories, protein, carbs, fats, is_recomp, date_generated) 
                    VALUES (:uid, :plan, :cals, :prot, :carb, :fat, :recomp, :date)";
            $istmt = $this->db->prepare($ins);
            $istmt->bindParam(":uid", $user_id);
            $istmt->bindParam(":plan", $jsonPlan);
            $istmt->bindParam(":cals", $calories);
            $istmt->bindParam(":prot", $protein);
            $istmt->bindParam(":carb", $carbs);
            $istmt->bindParam(":fat", $fats);
            $istmt->bindValue(":recomp", $isRecomp ? 1 : 0);
            $istmt->bindParam(":date", $date);

            if ($istmt->execute()) {
                $this->jsonResponse([
                    "target_calories" => $calories,
                    "plan" => $plan,
                    "fridge_ingredients" => $fridgeIngredients
                ]);
            } else {
                $this->errorResponse("Unable to save nutrition plan.", 503);
            }

        } else {
            $this->errorResponse("Invalid type. Use 'workout' or 'nutrition'.", 400);
        }
    }

    public function replaceMeal() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->meal_id) || (empty($data->hint) && empty($data->replacement))) {
            $this->errorResponse("Missing meal_id or replacement details", 400);
        }

        if (empty($data->replacement) && !$this->isAllowedNutriCoreSwapHint($data->hint ?? '')) {
            $this->errorResponse("Choose an approved NutriCore swap boundary instead of typing a custom request.", 400);
        }

        // Fetch user profile for AI (optional, if we need it)
        $stmt = $this->db->prepare("SELECT * FROM user_profiles WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        // Fetch current nutrition plan
        $stmtN = $this->db->prepare("SELECT id, meal_data FROM nutrition_plans WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
        $stmtN->execute([$user_id]);
        $row = $stmtN->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            $this->errorResponse("No nutrition plan found.", 404);
        }

        $meals = json_decode($row['meal_data'], true);
        if (!is_array($meals)) {
            $this->errorResponse("Invalid nutrition plan data.", 500);
        }

        $targetMealIdx = -1;
        $targetMeal = null;
        foreach ($meals as $idx => $m) {
            if ($m['id'] === $data->meal_id) {
                $targetMealIdx = $idx;
                $targetMeal = $m;
                break;
            }
        }

        if ($targetMealIdx === -1) {
            $this->errorResponse("Meal not found in current plan.", 404);
        }

        require_once __DIR__ . '/../services/NutritionAI.php';
        $ai = new NutritionAI();
        $replacement = null;
        if (!empty($data->replacement) && is_object($data->replacement)) {
            $replacement = (array)$data->replacement;
        }
        $fridgeIngredients = [];
        if (!empty($data->fridge_ingredients) && is_array($data->fridge_ingredients)) {
            $fridgeIngredients = array_values(array_filter(array_map('strval', $data->fridge_ingredients)));
        }
        $newMeal = $ai->replaceMealWithHint($targetMeal, $data->hint ?? '', is_array($profile) ? $profile : [], $replacement, $fridgeIngredients);

        if ($newMeal) {
            $meals[$targetMealIdx] = $newMeal;

            $updateStmt = $this->db->prepare("UPDATE nutrition_plans SET meal_data = ? WHERE id = ?");
            if ($updateStmt->execute([json_encode($meals), $row['id']])) {
                $this->jsonResponse(["message" => "Meal replaced successfully", "new_meal" => $newMeal]);
            } else {
                $this->errorResponse("Failed to save new meal.", 500);
            }
        } else {
            $this->errorResponse($ai->getLastError() ?: "Failed to generate replacement meal.", 409);
        }
    }

    public function getMealFeedback() {
        $user_id = $this->requireAuth();
        $this->ensureMealFeedbackTable();

        $stmt = $this->db->prepare("SELECT meal_id, rating, ingredients, created_at FROM meal_feedback WHERE user_id = ? ORDER BY created_at DESC LIMIT 100");
        $stmt->execute([$user_id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $seen = [];

        $feedback = [];
        foreach ($rows as $row) {
            if (isset($seen[$row['meal_id']])) {
                continue;
            }
            $seen[$row['meal_id']] = true;
            $ingredients = json_decode($row['ingredients'] ?? '[]', true);
            $feedback[] = [
                "mealId" => $row['meal_id'],
                "rating" => (int)$row['rating'],
                "ingredients" => is_array($ingredients) ? $ingredients : [],
                "createdAt" => $row['created_at'],
            ];
        }

        $this->jsonResponse(["feedback" => $feedback]);
    }

    public function saveMealFeedback() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->meal_id) || empty($data->rating)) {
            $this->errorResponse("Missing meal_id or rating", 400);
        }

        $rating = max(1, min(5, (int)$data->rating));
        $ingredients = [];
        if (!empty($data->ingredients) && is_array($data->ingredients)) {
            $ingredients = array_values(array_map('strval', $data->ingredients));
        }

        $this->ensureMealFeedbackTable();
        $deleteStmt = $this->db->prepare("DELETE FROM meal_feedback WHERE user_id = ? AND meal_id = ?");
        $deleteStmt->execute([$user_id, (string)$data->meal_id]);

        $stmt = $this->db->prepare("INSERT INTO meal_feedback (user_id, meal_id, rating, ingredients, created_at) VALUES (?, ?, ?, ?, NOW())");
        $stmt->execute([$user_id, (string)$data->meal_id, $rating, json_encode($ingredients)]);

        $this->jsonResponse([
            "message" => "Meal feedback saved",
            "feedback" => [
                "mealId" => (string)$data->meal_id,
                "rating" => $rating,
                "ingredients" => $ingredients,
            ]
        ]);
    }

    public function getMealReviews() {
        $this->requireAuth();
        $reviews = $this->getMealReviewMap();
        $this->jsonResponse(["reviews" => $reviews]);
    }

    public function getMealSwaps() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        $stmt = $this->db->prepare("SELECT * FROM user_profiles WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$profile) {
            $this->errorResponse("User profile not found. Please complete setup.", 404);
        }

        $fridgeIngredients = [];
        if (!empty($data->fridge_ingredients) && is_array($data->fridge_ingredients)) {
            $fridgeIngredients = array_values(array_filter(array_map('strval', $data->fridge_ingredients)));
        }
        $maxResults = isset($data->max_results) ? max(1, min(80, (int)$data->max_results)) : 50;

        $this->ensureMealFeedbackTable();
        $stmtFeedback = $this->db->prepare("SELECT meal_id, rating, ingredients, created_at FROM meal_feedback WHERE user_id = ? ORDER BY created_at DESC LIMIT 100");
        $stmtFeedback->execute([$user_id]);
        $feedback = [];
        foreach ($stmtFeedback->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $ingredients = json_decode($row['ingredients'] ?? '[]', true);
            $feedback[] = [
                "mealId" => $row['meal_id'],
                "rating" => (int)$row['rating'],
                "ingredients" => is_array($ingredients) ? $ingredients : [],
                "createdAt" => $row['created_at'],
            ];
        }

        $reviews = $this->getMealReviewMap();

        require_once __DIR__ . '/../services/NutritionAI.php';
        $ai = new NutritionAI();
        $calories = $ai->calculateCalories($profile);
        $result = $ai->recommendSwaps($profile, $calories, $fridgeIngredients, $feedback, $reviews, $maxResults);
        $result["fridge_ingredients"] = $fridgeIngredients;
        $this->jsonResponse($result);
    }

    public function saveMealReview() {
        $user_id = $this->requireAuth();
        $this->requireMealReviewer($user_id);
        $data = $this->getRequestData();

        $allowed = ['approved', 'pending', 'needs_adjustment', 'rejected'];
        if (empty($data->meal_id) || empty($data->status) || !in_array($data->status, $allowed, true)) {
            $this->errorResponse("Missing meal_id or invalid status", 400);
        }

        $this->ensureMealReviewTable();
        $notes = isset($data->notes) ? trim((string)$data->notes) : '';
        $reviewedBy = isset($data->reviewed_by) ? trim((string)$data->reviewed_by) : 'Reviewer';

        $stmt = $this->db->prepare("
            INSERT INTO meal_reviews (meal_id, status, notes, reviewed_by, updated_at)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                notes = VALUES(notes),
                reviewed_by = VALUES(reviewed_by),
                updated_at = NOW()
        ");
        $stmt->execute([(string)$data->meal_id, (string)$data->status, $notes, $reviewedBy]);

        $this->jsonResponse([
            "message" => "Meal review saved",
            "review" => [
                "mealId" => (string)$data->meal_id,
                "status" => (string)$data->status,
                "notes" => $notes,
                "reviewedBy" => $reviewedBy,
            ]
        ]);
    }

    public function getMealReviewAccess() {
        $user_id = $this->requireAuth();
        $this->jsonResponse([
            "can_review" => $this->isMealReviewer($user_id)
        ]);
    }

    public function getExerciseTutorialReviews() {
        $this->requireAuth();
        $reviews = $this->getExerciseTutorialReviewMap();
        $this->jsonResponse(["reviews" => $reviews]);
    }

    public function saveExerciseTutorialReview() {
        $user_id = $this->requireAuth();
        $this->requireMealReviewer($user_id);
        $data = $this->getRequestData();

        $allowed = ['approved', 'pending', 'needs_adjustment', 'rejected'];
        if (empty($data->tutorial_id) || empty($data->status) || !in_array($data->status, $allowed, true)) {
            $this->errorResponse("Missing tutorial_id or invalid status", 400);
        }

        $this->ensureExerciseTutorialReviewTable();
        $notes = isset($data->notes) ? trim((string)$data->notes) : '';
        $reviewedBy = isset($data->reviewed_by) ? trim((string)$data->reviewed_by) : 'Reviewer';

        $stmt = $this->db->prepare("
            INSERT INTO exercise_tutorial_reviews (tutorial_id, status, notes, reviewed_by, updated_at)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                notes = VALUES(notes),
                reviewed_by = VALUES(reviewed_by),
                updated_at = NOW()
        ");
        $stmt->execute([(string)$data->tutorial_id, (string)$data->status, $notes, $reviewedBy]);

        $this->jsonResponse([
            "message" => "Exercise tutorial review saved",
            "review" => [
                "tutorialId" => (string)$data->tutorial_id,
                "status" => (string)$data->status,
                "notes" => $notes,
                "reviewedBy" => $reviewedBy,
            ]
        ]);
    }

    private function ensureMealFeedbackTable() {
        $this->db->exec("CREATE TABLE IF NOT EXISTS meal_feedback (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            meal_id VARCHAR(100) NOT NULL,
            rating TINYINT NOT NULL,
            ingredients JSON NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_meal_feedback_user (user_id),
            INDEX idx_meal_feedback_meal (meal_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    private function ensureMealReviewTable() {
        $this->db->exec("CREATE TABLE IF NOT EXISTS meal_reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            meal_id VARCHAR(100) NOT NULL UNIQUE,
            status ENUM('approved','pending','needs_adjustment','rejected') NOT NULL DEFAULT 'pending',
            notes TEXT NULL,
            reviewed_by VARCHAR(100) NOT NULL DEFAULT 'Reviewer',
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_meal_reviews_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    private function getMealReviewMap(): array {
        $this->ensureMealReviewTable();
        $stmt = $this->db->query("SELECT meal_id, status, notes, reviewed_by, updated_at FROM meal_reviews ORDER BY updated_at DESC");
        $reviews = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $reviews[$row['meal_id']] = [
                "mealId" => $row['meal_id'],
                "status" => $row['status'],
                "notes" => $row['notes'] ?? '',
                "reviewedBy" => $row['reviewed_by'] ?? 'Reviewer',
                "updatedAt" => $row['updated_at'],
            ];
        }

        return $reviews;
    }

    private function ensureExerciseTutorialReviewTable() {
        $this->db->exec("CREATE TABLE IF NOT EXISTS exercise_tutorial_reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tutorial_id VARCHAR(100) NOT NULL UNIQUE,
            status ENUM('approved','pending','needs_adjustment','rejected') NOT NULL DEFAULT 'pending',
            notes TEXT NULL,
            reviewed_by VARCHAR(100) NOT NULL DEFAULT 'Reviewer',
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_exercise_tutorial_reviews_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    private function getExerciseTutorialReviewMap(): array {
        $this->ensureExerciseTutorialReviewTable();
        $stmt = $this->db->query("SELECT tutorial_id, status, notes, reviewed_by, updated_at FROM exercise_tutorial_reviews ORDER BY updated_at DESC");
        $reviews = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $reviews[$row['tutorial_id']] = [
                "tutorialId" => $row['tutorial_id'],
                "status" => $row['status'],
                "notes" => $row['notes'] ?? '',
                "reviewedBy" => $row['reviewed_by'] ?? 'Reviewer',
                "updatedAt" => $row['updated_at'],
            ];
        }

        return $reviews;
    }

    private function requireMealReviewer(int $user_id) {
        if (!$this->isMealReviewer($user_id)) {
            $this->errorResponse("Only the assigned meal reviewer can approve meals.", 403);
        }
    }

    private function isMealReviewer(int $user_id): bool {
        $reviewerUserId = getenv('MEAL_REVIEWER_USER_ID');
        if ($reviewerUserId !== false && trim((string)$reviewerUserId) !== '') {
            return $user_id === (int)$reviewerUserId;
        }

        $reviewerEmail = strtolower(trim((string)(getenv('MEAL_REVIEWER_EMAIL') ?: '')));
        if ($reviewerEmail !== '') {
            $stmt = $this->db->prepare("SELECT LOWER(email) FROM users WHERE id = ? LIMIT 1");
            $stmt->execute([$user_id]);
            return strtolower((string)$stmt->fetchColumn()) === $reviewerEmail;
        }

        return $user_id === 1;
    }

    public function updateWorkoutProgress() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();
        if (empty($data->exercise_id)) {
            $this->errorResponse("Missing required fields", 400);
        }

        $workout_id = $data->exercise_id;
        if (!is_numeric($workout_id)) {
            $stmtLatest = $this->db->prepare("SELECT id FROM workouts WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
            $stmtLatest->execute([$user_id]);
            $latest = $stmtLatest->fetch(PDO::FETCH_ASSOC);
            if ($latest) {
                $workout_id = $latest['id'];
            } else {
                $this->errorResponse("No valid workout found to update", 404);
            }
        }

        try {
            // First, get the current plan_data
            $getStmt = $this->db->prepare("SELECT id, plan_data FROM workouts WHERE user_id = ? AND id = ?");
            $getStmt->execute([$user_id, $workout_id]);
            $row = $getStmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                $this->errorResponse("Workout plan not found", 404);
            }

            $planData = json_decode($row['plan_data'], true);
            $dayToUpdate = isset($data->day) ? $data->day : null;
            $completed = isset($data->completed) ? $data->completed : 1;
            $alreadyCompleted = false;
            $updated = false;

            if (is_array($planData)) {
                foreach ($planData as &$workout) {
                    if ($dayToUpdate === null || (isset($workout['day']) && $workout['day'] === $dayToUpdate)) {
                        if (isset($workout['completed']) && $workout['completed']) {
                            $alreadyCompleted = true;
                        }
                        $workout['completed'] = (bool)$completed;
                        $updated = true;
                    }
                }
            }

            $newPlanData = json_encode($planData);
            
            $updateStmt = $this->db->prepare("UPDATE workouts SET plan_data = ?, completed = ?, completion_date = NOW() WHERE user_id = ? AND id = ?");
            
            $allCompleted = true;
            if (is_array($planData)) {
                foreach ($planData as $w) {
                    if (empty($w['completed'])) { $allCompleted = false; break; }
                }
            }

            if ($updateStmt->execute([$newPlanData, $allCompleted ? 1 : 0, $user_id, $workout_id])) {
                $xpResult = null;
                // Only give XP if it's a NEW completion
                if ($completed && !$alreadyCompleted) {
                    $userCtrl = new UserController($this->db);
                    $xpResult = $userCtrl->performAddXP($user_id, 200);
                    // Check achievements after workout
                    $achCtrl = new AchievementController($this->db);
                    $achCtrl->checkAndAward($user_id, 'workout');
                }
                $this->jsonResponse([
                    "message" => "Progress updated", 
                    "xp_reward" => $xpResult,
                    "day" => $dayToUpdate
                ]);
            } else {
                $this->errorResponse("Update failed", 500);
            }
        } catch (PDOException $e) {
            $this->errorResponse("Database error", 500);
        }
    }

    public function updateMealProgress() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();
        if (empty($data->meal_id)) {
            $this->errorResponse("Missing required fields", 400);
        }

        try {
            // Persist meal completion in the nutrition_plans JSON
            $stmt = $this->db->prepare("SELECT id, meal_data FROM nutrition_plans WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
            $stmt->execute([$user_id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            $alreadyCompleted = false;
            $completed = isset($data->completed) ? $data->completed : 1;

            if ($row) {
                $mealData = json_decode($row['meal_data'], true);
                if (is_array($mealData)) {
                    foreach ($mealData as &$meal) {
                        if ($meal['id'] == $data->meal_id) {
                            if (isset($meal['completed']) && $meal['completed']) {
                                $alreadyCompleted = true;
                            }
                            $meal['completed'] = (bool)$completed;
                        }
                    }
                }
                $updateStmt = $this->db->prepare("UPDATE nutrition_plans SET meal_data = ? WHERE id = ?");
                $updateStmt->execute([json_encode($mealData), $row['id']]);
            }

            $xpResult = null;
            if ($completed && !$alreadyCompleted) {
                $userCtrl = new UserController($this->db);
                $xpResult = $userCtrl->performAddXP($user_id, 50);
                
                // Track Challenge Progress
                $challengeCtrl = new ChallengeController($this->db);
                $challengeCtrl->trackProgress($user_id, 'meal');

                // Check achievements after meal
                $achCtrl = new AchievementController($this->db);
                $achCtrl->checkAndAward($user_id, 'meal');
            }
            
            $this->jsonResponse([
                "message" => "Meal progress updated",
                "xp_reward" => $xpResult
            ]);
        } catch (PDOException $e) {
            $this->errorResponse("Database error", 500);
        }
    }

    public function getSuggestedGoalWeight() {
        $user_id = $this->requireAuth();

        $query = "SELECT * FROM user_profiles WHERE user_id = ?";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$profile) $this->errorResponse("Profile not found", 404);

        require_once __DIR__ . '/../services/GoalAI.php';
        $ai = new GoalAI();
        $suggestion = $ai->suggestGoalWeight($profile);

        $this->jsonResponse($suggestion);
    }

    public function getDailyQuests() {
        $user_id = $this->requireAuth();
        $today = date('Y-m-d');

        // Fetch user profile for context
        $stmtP = $this->db->prepare("SELECT weight, target_weight, goal FROM user_profiles WHERE user_id = ?");
        $stmtP->execute([$user_id]);
        $profile = $stmtP->fetch(PDO::FETCH_ASSOC);
        
        $weight = (float)($profile['weight'] ?? 70);
        $waterGoal = intval($weight * 33);
        if ($waterGoal <= 0) $waterGoal = 2500;

        // Check if quests exist for today
        $stmtCheck = $this->db->prepare("SELECT * FROM daily_quests WHERE user_id = ? AND date_logged = ?");
        $stmtCheck->execute([$user_id, $today]);
        $quests = $stmtCheck->fetchAll(PDO::FETCH_ASSOC);

        if (empty($quests)) {
            // Generate 4 daily quests
            $generatedQuests = [
                [
                    'quest_type' => 'steps',
                    'title' => 'Pedometer Hero',
                    'description' => 'Walk 8,000 steps today.',
                    'target_value' => 8000,
                    'xp_reward' => 50,
                    'points_reward' => 10
                ],
                [
                    'quest_type' => 'water',
                    'title' => 'Hydration Champ',
                    'description' => 'Drink ' . number_format($waterGoal) . ' ml of water.',
                    'target_value' => $waterGoal,
                    'xp_reward' => 50,
                    'points_reward' => 10
                ],
                [
                    'quest_type' => 'workout',
                    'title' => 'Iron Athlete',
                    'description' => "Complete today's workout session.",
                    'target_value' => 1,
                    'xp_reward' => 100,
                    'points_reward' => 20
                ],
                [
                    'quest_type' => 'meal',
                    'title' => 'Mindful Diner',
                    'description' => 'Log at least 2 meals today.',
                    'target_value' => 2,
                    'xp_reward' => 50,
                    'points_reward' => 10
                ]
            ];

            // Insert them
            foreach ($generatedQuests as $q) {
                $ins = $this->db->prepare("INSERT INTO daily_quests (user_id, quest_type, title, description, target_value, xp_reward, points_reward, date_logged) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $ins->execute([$user_id, $q['quest_type'], $q['title'], $q['description'], $q['target_value'], $q['xp_reward'], $q['points_reward'], $today]);
            }

            // Fetch again
            $stmtCheck->execute([$user_id, $today]);
            $quests = $stmtCheck->fetchAll(PDO::FETCH_ASSOC);
        }

        // Synchronize Quest Progress from latest logs
        $todayDayName = date('l');
        
        // 1. Steps
        $stmtSteps = $this->db->prepare("SELECT steps FROM daily_logs WHERE user_id = ? AND date_logged = ?");
        $stmtSteps->execute([$user_id, $today]);
        $currentSteps = (int)$stmtSteps->fetchColumn();

        // 2. Water
        $stmtWater = $this->db->prepare("SELECT water_ml FROM daily_logs WHERE user_id = ? AND date_logged = ?");
        $stmtWater->execute([$user_id, $today]);
        $currentWater = (int)$stmtWater->fetchColumn();

        // 3. Workout
        $workoutCompleted = 0;
        $stmtW = $this->db->prepare("SELECT plan_data FROM workouts WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
        $stmtW->execute([$user_id]);
        $wPlanRow = $stmtW->fetch(PDO::FETCH_ASSOC);
        if ($wPlanRow) {
            $plan = json_decode($wPlanRow['plan_data'], true);
            if (is_array($plan)) {
                foreach ($plan as $day) {
                    if (($day['day'] ?? '') === $todayDayName) {
                        $workoutCompleted = !empty($day['completed']) ? 1 : 0;
                        break;
                    }
                }
            }
        }

        // 4. Meal
        $mealsCompleted = 0;
        $stmtN = $this->db->prepare("SELECT meal_data FROM nutrition_plans WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
        $stmtN->execute([$user_id]);
        $nPlanRow = $stmtN->fetch(PDO::FETCH_ASSOC);
        if ($nPlanRow) {
            $meals = json_decode($nPlanRow['meal_data'], true);
            if (is_array($meals)) {
                foreach ($meals as $m) {
                    if (($m['day'] ?? '') === $todayDayName && !empty($m['completed'])) {
                        $mealsCompleted++;
                    }
                }
            }
        }

        // Update each quest with dynamic current value
        foreach ($quests as &$quest) {
            $val = 0;
            if ($quest['quest_type'] === 'steps') {
                $val = $currentSteps;
            } elseif ($quest['quest_type'] === 'water') {
                $val = $currentWater;
            } elseif ($quest['quest_type'] === 'workout') {
                $val = $workoutCompleted;
            } elseif ($quest['quest_type'] === 'meal') {
                $val = $mealsCompleted;
            }

            $completed = $val >= $quest['target_value'] ? 1 : 0;

            // Save back
            $upd = $this->db->prepare("UPDATE daily_quests SET current_value = ?, completed = ? WHERE id = ?");
            $upd->execute([$val, $completed, $quest['id']]);

            // Update local copy to return
            $quest['current_value'] = $val;
            $quest['completed'] = $completed;
        }

        $this->jsonResponse($quests);
    }

    public function claimDailyQuest() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->quest_id)) {
            $this->errorResponse("Missing quest_id", 400);
        }

        $quest_id = $data->quest_id;

        try {
            $this->db->beginTransaction();

            // Fetch the quest
            $stmt = $this->db->prepare("SELECT * FROM daily_quests WHERE id = ? AND user_id = ?");
            $stmt->execute([$quest_id, $user_id]);
            $quest = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$quest) {
                $this->db->rollBack();
                $this->errorResponse("Quest not found", 404);
            }

            if ($quest['claimed']) {
                $this->db->rollBack();
                $this->errorResponse("Quest already claimed", 400);
            }

            // Sync one last time before claiming to be safe
            $current_val = 0;
            $todayDayName = date('l');
            if ($quest['quest_type'] === 'steps') {
                $stmtSteps = $this->db->prepare("SELECT steps FROM daily_logs WHERE user_id = ? AND date_logged = CURDATE()");
                $stmtSteps->execute([$user_id]);
                $current_val = (int)$stmtSteps->fetchColumn();
            } elseif ($quest['quest_type'] === 'water') {
                $stmtWater = $this->db->prepare("SELECT water_ml FROM daily_logs WHERE user_id = ? AND date_logged = CURDATE()");
                $stmtWater->execute([$user_id]);
                $current_val = (int)$stmtWater->fetchColumn();
            } elseif ($quest['quest_type'] === 'workout') {
                $stmtW = $this->db->prepare("SELECT plan_data FROM workouts WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
                $stmtW->execute([$user_id]);
                $wPlan = json_decode($stmtW->fetchColumn() ?: '[]', true);
                foreach ($wPlan as $day) {
                    if (($day['day'] ?? '') === $todayDayName) {
                        $current_val = !empty($day['completed']) ? 1 : 0;
                        break;
                    }
                }
            } elseif ($quest['quest_type'] === 'meal') {
                $stmtN = $this->db->prepare("SELECT meal_data FROM nutrition_plans WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
                $stmtN->execute([$user_id]);
                $meals = json_decode($stmtN->fetchColumn() ?: '[]', true);
                foreach ($meals as $m) {
                    if (($m['day'] ?? '') === $todayDayName && !empty($m['completed'])) {
                        $current_val++;
                    }
                }
            }

            $completed = $current_val >= $quest['target_value'] ? 1 : 0;

            if (!$completed) {
                // Let's update DB first and fail
                $upd = $this->db->prepare("UPDATE daily_quests SET current_value = ?, completed = ? WHERE id = ?");
                $upd->execute([$current_val, 0, $quest_id]);
                $this->db->commit();
                $this->errorResponse("Quest is not yet completed", 400);
            }

            // Mark as claimed & completed
            $upd = $this->db->prepare("UPDATE daily_quests SET current_value = ?, completed = 1, claimed = 1 WHERE id = ?");
            $upd->execute([$current_val, $quest_id]);

            // Award XP + Points
            $userCtrl = new UserController($this->db);
            $xpReward = $userCtrl->performAddXP($user_id, $quest['xp_reward']);
            
            // Also award the points_reward
            $points_to_add = $quest['points_reward'];
            $stmtAwardPoints = $this->db->prepare("UPDATE user_profiles SET points = points + ? WHERE user_id = ?");
            $stmtAwardPoints->execute([$points_to_add, $user_id]);

            // Notify user
            $this->createNotification(
                $user_id,
                "Quest Completed! 🎉",
                "You completed the quest '{$quest['title']}' and earned +{$quest['xp_reward']} XP and +{$points_to_add} PTS!",
                "quest",
                "flash",
                "#10B981"
            );

            $this->db->commit();

            // Check for newly-unlocked achievements after quest claim
            $achCtrl = new AchievementController($this->db);
            $achCtrl->checkAndAward($user_id, 'quest');

            // Fetch updated profile
            $stmtProfile = $this->db->prepare("SELECT level, xp, points FROM user_profiles WHERE user_id = ?");
            $stmtProfile->execute([$user_id]);
            $profile = $stmtProfile->fetch(PDO::FETCH_ASSOC);

            $this->jsonResponse([
                "message" => "Quest claimed successfully",
                "quest_id" => $quest_id,
                "xp_reward" => $quest['xp_reward'],
                "points_reward" => $points_to_add,
                "user_stats" => [
                    "level" => (int)$profile['level'],
                    "xp" => (int)$profile['xp'],
                    "points" => (int)$profile['points'],
                    "nextLevelXp" => (int)$profile['level'] * 1000
                ]
            ]);

        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            $this->errorResponse("Database error: " . $e->getMessage(), 500);
        }
    }
}
