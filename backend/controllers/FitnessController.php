<?php
require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/UserController.php';
require_once __DIR__ . '/ChallengeController.php';

class FitnessController extends BaseController {
    
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

        $query = "SELECT * FROM workouts WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1";
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
            $plan = $ai->generateMealPlan($calories, $profile);

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
                $this->jsonResponse(["target_calories" => $calories, "plan" => $plan]);
            } else {
                $this->errorResponse("Unable to save nutrition plan.", 503);
            }

        } else {
            $this->errorResponse("Invalid type. Use 'workout' or 'nutrition'.", 400);
        }
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
}
