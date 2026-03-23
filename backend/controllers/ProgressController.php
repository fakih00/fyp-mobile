<?php
require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../services/PredictionAI.php';

class ProgressController extends BaseController {
    
    public function getWeightHistory() {
        $user_id = $this->requireAuth();

        // Fetch Progress History
        $query = "SELECT weight, date_logged FROM progress WHERE user_id = ? ORDER BY date_logged ASC";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->jsonResponse(["history" => $history]);
    }

    public function getStats() {
        $user_id = $this->requireAuth();
        $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

        // Fetch Profile Data
        $stmt = $this->db->prepare("SELECT 
            weight, target_weight, goal, nutrition_streak, streak,
            body_fat, waist_size, job_type, steps_estimate, 
            sleep_hours, stress_level, suggested_goal_weight,
            training_days_per_week, meals_per_day
            FROM user_profiles WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$profile) {
            $this->errorResponse("User profile not found", 404);
        }

        // Fetch Today's Pulse if exists
        $targetDate = $date;
        $stmtPulse = $this->db->prepare("SELECT sleep_hours, stress_level, steps, weight, water_ml FROM daily_logs WHERE user_id = ? AND date_logged = ?");
        $stmtPulse->execute([$user_id, $targetDate]);
        $pulse = $stmtPulse->fetch(PDO::FETCH_ASSOC);

        // Water Metrics
        $waterConsumed = (int)($pulse['water_ml'] ?? 0);
        $weightForWater = (float)($pulse['weight'] ?? $profile['weight'] ?? 70);
        // AI Calculation: 0.033 L per kg = 33ml per kg
        $waterGoalLiters = round($weightForWater * 0.033, 1);
        $waterGoalMl = intval($weightForWater * 33);

        // Override profile data with today's pulse for current context
        if ($pulse) {
            $profile['sleep_hours'] = $pulse['sleep_hours'];
            $profile['stress_level'] = $pulse['stress_level'];
            $profile['steps_estimate'] = $pulse['steps'];
            $profile['weight'] = $pulse['weight'];
        }

        // Calculate Recovery Metrics (Lifestyle)
        $sleepHours = (float)($profile['sleep_hours'] ?: 7);
        $sleepScore = min(100, round(($sleepHours / 8) * 100));
        
        $stressStr = strtolower($profile['stress_level'] ?: 'medium');
        $stressIndex = 50;
        if ($stressStr === 'high') $stressIndex = 85;
        if ($stressStr === 'low') $stressIndex = 25;

        // Calculate Activity Metrics
        $totalVolume = 0;
        $totalDurations = 0;
        $doneWorkouts = 0;
        $workoutCount = 0;
        
        $stmtWk = $this->db->prepare("SELECT plan_data FROM workouts WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
        $stmtWk->execute([$user_id]);
        $wPlanData = $stmtWk->fetchColumn();
        $wPlan = json_decode($wPlanData ?: '[]', true);
        
        if (is_array($wPlan)) {
            foreach ($wPlan as $day) {
                if (isset($day['exercises']) && is_array($day['exercises'])) {
                    foreach ($day['exercises'] as $ex) {
                        $sets = (int)($ex['sets'] ?? 3);
                        $reps = (int)($ex['reps'] ?? 10);
                        // Default to some load if weight isn't in exercise (this is high level summary)
                        $load = (int)($ex['weight'] ?? 30); 
                        $totalVolume += ($sets * $reps * $load);
                    }
                }
                if (isset($day['duration'])) {
                    $totalDurations += (int)$day['duration'];
                    $workoutCount++;
                }
                if (!empty($day['completed'])) {
                    $doneWorkouts++;
                }
            }
        }
        $avgDuration = $workoutCount > 0 ? round($totalDurations / $workoutCount) : 45;
        $freqGoal = (int)($profile['training_days_per_week'] ?: 4);

        // Fetch Start Weight (First entry in progress or current if no history)
        $stmtStart = $this->db->prepare("SELECT weight FROM progress WHERE user_id = ? ORDER BY date_logged ASC LIMIT 1");
        $stmtStart->execute([$user_id]);
        $startRow = $stmtStart->fetch(PDO::FETCH_ASSOC);
        $startWeight = $startRow ? $startRow['weight'] : $profile['weight'];

        // Calculate Progress Percentage
        $current = $profile['weight'];
        $target = $profile['target_weight'];
        $percentage = 0;

        if ($target) {
            $totalChangeNeeded = abs($target - $startWeight);
            $currentChange = abs($current - $startWeight);
            
            if ($totalChangeNeeded > 0) {
                // If goal is lose weight and we gained, or vice versa, progress might be 0 or handled differently.
                // For simplicity, we assume movement towards goal is positive.
                
                // Check direction
                $isLossGoal = $target < $startWeight;
                $isMovingRight = $isLossGoal ? ($current < $startWeight) : ($current > $startWeight);

                if ($isMovingRight) {
                    $percentage = min(100, round(($currentChange / $totalChangeNeeded) * 100));
                }
            } else {
                // Already at target? (Start == Target)
                $percentage = 100;
            }
        }

        // AI Readiness Score Calculation
        $readinessScore = 100;
        $factors = [];
        
        // 1. Sleep Factor
        $sleep = (float)$profile['sleep_hours'];
        if ($sleep >= 8) {
            $factors[] = "Peak recovery sleep";
        } elseif ($sleep >= 7) {
            $readinessScore -= 10;
            $factors[] = "Slight sleep deficit";
        } else {
            $readinessScore -= 25;
            $factors[] = "Inadequate recovery";
        }

        // 2. Stress Factor
        $stress = $profile['stress_level'];
        if ($stress === 'high') {
            $readinessScore -= 20;
            $factors[] = "High CNS stress";
        } elseif ($stress === 'medium') {
            $readinessScore -= 10;
        }

        // 3. Activity Factor (Yesterday's Workout)
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $stmtW = $this->db->prepare("SELECT plan_data FROM workouts WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
        $stmtW->execute([$user_id]);
        $trainedYesterday = false;
        $wRow = $stmtW->fetch(PDO::FETCH_ASSOC);
        if ($wRow) {
            $plan = json_decode($wRow['plan_data'], true);
            $yesterdayDay = date('l', strtotime($yesterday));
            if (is_array($plan)) {
                foreach ($plan as $w) {
                    if (($w['day'] ?? '') === $yesterdayDay && !empty($w['completed'])) {
                        $trainedYesterday = true;
                        break;
                    }
                }
            }
        }
        if ($trainedYesterday) {
            $readinessScore -= 15;
            $factors[] = "Muscle recovery active";
        }

        // 4. Bonus for Activity
        if ((int)$profile['steps_estimate'] > 10000) $readinessScore += 5;

        $readinessScore = max(10, min(100, $readinessScore));

        // Recommendations
        $rec = "Ready for high intensity.";
        if ($readinessScore < 50) $rec = "Focus on active recovery.";
        elseif ($readinessScore < 75) $rec = "Moderate intensity recommended.";

        // Fallback for Target Weight if missing
        if ($target <= 0) {
            $target = (float)$profile['suggested_goal_weight'];
            if ($target <= 0) {
                // If still 0, assume a 5kg loss from current for roadmap visualization
                $target = $current - 5;
            }
        }

        // Calculate Roadmap Milestones
        $roadmap = [
            "start" => ["weight" => round($startWeight, 1), "date" => date('M j, Y', strtotime($startRow['date_logged'] ?? 'today'))],
            "midway" => ["weight" => round(($startWeight + $target) / 2, 1), "date" => "Calculating..."],
            "goal" => ["weight" => round($target, 1), "date" => "Calculating..."]
        ];

        // Fetch History for rate calculation
        $stmtH = $this->db->prepare("SELECT weight, date_logged FROM progress WHERE user_id = ? ORDER BY date_logged ASC");
        $stmtH->execute([$user_id]);
        $history = $stmtH->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($history) >= 2 && $target > 0) {
            $x = []; $y = [];
            $firstDate = strtotime($history[0]['date_logged']);
            foreach ($history as $record) {
                $x[] = (strtotime($record['date_logged']) - $firstDate) / (60 * 60 * 24);
                $y[] = floatval($record['weight']);
            }
            $n = count($x);
            $sumX = array_sum($x); $sumY = array_sum($y); $sumXY = 0; $sumXX = 0;
            for ($i = 0; $i < $n; $i++) {
                $sumXY += ($x[$i] * $y[$i]);
                $sumXX += ($x[$i] * $x[$i]);
            }
            $denom = ($n * $sumXX - $sumX * $sumX);
            $m = ($denom == 0) ? 0 : ($n * $sumXY - $sumX * $sumY) / $denom;

            if ($m != 0) {
                $isLossGoal = $target < $startWeight;
                if (($isLossGoal && $m < 0) || (!$isLossGoal && $m > 0)) {
                    $midWeight = ($startWeight + $target) / 2;
                    $daysToMid = abs(($midWeight - $current) / $m);
                    $daysToGoal = abs(($target - $current) / $m);
                    
                    $roadmap['midway']['date'] = date('M j, Y', strtotime("+" . round($daysToMid) . " days"));
                    $roadmap['goal']['date'] = date('M j, Y', strtotime("+" . round($daysToGoal) . " days"));
                } else {
                    $roadmap['midway']['date'] = "Pending Trend";
                    $roadmap['goal']['date'] = "Pending Trend";
                }
            } else {
                $roadmap['midway']['date'] = "Steady";
                $roadmap['goal']['date'] = "Steady";
            }
        }

        // Calculate Performance Hub Metrics
        $plateauRisk = false;
        $weeklyProgress = 0;
        $weeklyVelocity = 0;
        if (count($history) >= 7) {
            $latestW = (float)end($history)['weight'];
            $oldW = (float)$history[count($history) - 7]['weight'];
            $wChange = abs($latestW - $oldW);
            $weeklyVelocity = round($latestW - $oldW, 2);
            if ($wChange < 0.2) {
                $plateauRisk = true;
            }
            if ($oldW > 0) {
                $weeklyProgress = round((($latestW - $oldW) / $oldW) * 100, 2);
            }
        }

        $totalProgress = round($current - $startWeight, 2);
        $goalDistance = round(abs($current - $target), 2);
        
        $bodyFat = (float)$profile['body_fat'];
        $leanMass = $bodyFat > 0 ? round($current * (1 - ($bodyFat / 100)), 1) : 0;

        // Micro-Milestones & Psychology Shift Logic
        // Decision: Always use Target Weight vs Current Weight as the source of truth for direction
        $shouldLose = $target < $current;
        $intentToGain = stripos($profile['goal'] ?? '', 'gain') !== false || stripos($profile['goal'] ?? '', 'muscle') !== false;
        
        $isRecomp = $shouldLose && $intentToGain;
        $missionLabel = $isRecomp ? "Recomposition" : ($shouldLose ? "To Lose" : "To Gain");

        if ($shouldLose) {
            // Recomp loss is slower (0.5%) than standard loss (0.75%) to prioritize muscle preservation
            $lossRate = $isRecomp ? 0.005 : 0.0075;
            $weeklyChange = $current * $lossRate;
            $weeklyTarget = $current - $weeklyChange;
        } else {
             $gainRate = 0.0025; // 0.25% of bodyweight (Lean Bulk)
             $weeklyChange = $current * $gainRate;
             $weeklyTarget = $current + $weeklyChange;
        }

        $recompInsight = null;
        if ($isRecomp) {
            $recompInsight = "AI ADVISOR: You've selected 'Gain Muscle', but you have fat to lose first. We've switched you to 'Recomposition' mode to shed fat while protecting your muscle foundation.";
        }
        
        // Phase Breakdown (5 Phases)
        $totalSpan = abs($startWeight - $target);
        $phaseStep = $totalSpan / 5;
        $phases = [];
        $currentPhaseIndex = 0;

        for ($i = 1; $i <= 5; $i++) {
            $phaseWeight = $shouldLose ? ($startWeight - ($phaseStep * $i)) : ($startWeight + ($phaseStep * $i));
            $phases[] = [
                "name" => "Phase " . $i,
                "target_weight" => round($phaseWeight, 1),
                "is_completed" => $shouldLose ? ($current <= $phaseWeight) : ($current >= $phaseWeight)
            ];
            if ($shouldLose ? ($current <= $phaseWeight) : ($current >= $phaseWeight)) {
                $currentPhaseIndex = $i - 1;
            }
        }

        // Consolidated Adherence (Mocking for now, will link to actual audit logic)
        // Calculating actual weekly adherence from latest data
        $stmtWk = $this->db->prepare("SELECT plan_data FROM workouts WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
        $stmtWk->execute([$user_id]);
        $wPlan = json_decode($stmtWk->fetchColumn() ?: '[]', true);
        
        // 3. Nutrition Adherence (Last 7 Days)
        $stmtNu = $this->db->prepare("SELECT meal_data, calories, protein, carbs, fats FROM nutrition_plans WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
        $stmtNu->execute([$user_id]);
        $nPlanRow = $stmtNu->fetch(PDO::FETCH_ASSOC);
        $nPlan = json_decode($nPlanRow['meal_data'] ?? '[]', true);

        // Nutrition Targets (Sync with FitnessController)
        if ($nPlanRow) {
            $caloriesGoal = (int)$nPlanRow['calories'];
            $proteinGoal = (int)($nPlanRow['protein'] ?? round(($caloriesGoal * 0.3) / 4));
            $carbsGoal = (int)($nPlanRow['carbs'] ?? round(($caloriesGoal * 0.4) / 4));
            $fatsGoal = (int)($nPlanRow['fats'] ?? round(($caloriesGoal * 0.3) / 9));
        } else {
            $caloriesGoal = 2200;
            $proteinGoal = 165;
            $carbsGoal = 220;
            $fatsGoal = 73;
        }

        $doneCount = 0; $totalCount = 0;
        foreach((array)$wPlan as $w) { $totalCount++; if(!empty($w['completed'])) $doneCount++; }
        foreach((array)$nPlan as $n) { $totalCount++; if(!empty($n['completed'])) $doneCount++; }
        $totalAdherence = $totalCount > 0 ? round(($doneCount / $totalCount) * 100) : 0;

        // Calculate Scenario Projections
        $currentWeight = (float)$profile['weight'];
        $goalWeight = (float)$target;
        $weightDiff = abs($currentWeight - $goalWeight);
        
        $scenariosArr = [];
        if ($weightDiff > 0) {
            $isLoss = $goalWeight < $currentWeight;
            
            // 1. Elite Path (Max sustainable: ~0.8kg/week)
            $eliteRate = 0.8;
            $eliteWeeks = ceil($weightDiff / $eliteRate);
            $scenariosArr['elite'] = [
                'weeks' => $eliteWeeks,
                'date' => date('Y-m-d', strtotime("+$eliteWeeks weeks")),
                'label' => 'ELITE PATH',
                'title' => '95% Adherence'
            ];

            // 2. Current Path (Based on actual adherence)
            // Base rate of 0.7kg/week adjusted by adherence
            $currentRate = 0.7 * ($totalAdherence / 100);
            if ($currentRate < 0.1) $currentRate = 0.1; // Min floors
            $currentWeeks = ceil($weightDiff / $currentRate);
            $scenariosArr['current'] = [
                'weeks' => $currentWeeks,
                'date' => date('Y-m-d', strtotime("+$currentWeeks weeks")),
                'label' => 'CURRENT PATH',
                'title' => $totalAdherence . '% Adherence'
            ];

            // 3. Steady Path (Sustainable ~0.3kg/week)
            $steadyRate = 0.3;
            $steadyWeeks = ceil($weightDiff / $steadyRate);
            $scenariosArr['steady'] = [
                'weeks' => $steadyWeeks,
                'date' => date('Y-m-d', strtotime("+$steadyWeeks weeks")),
                'label' => 'STEADY PATH',
                'title' => '60% Adherence'
            ];
        }

        $this->jsonResponse([
            "start_weight" => $startWeight,
            "current_weight" => $current,
            "target_weight" => $target,
            "percentage" => $percentage,
            "goal" => $profile['goal'],
            "workout_streak" => (int)$profile['streak'],
            "nutrition_streak" => (int)$profile['nutrition_streak'],
            "body_fat" => $profile['body_fat'],
            "waist_size" => $profile['waist_size'],
            "job_type" => $profile['job_type'],
            "steps_estimate" => (int)$profile['steps_estimate'],
            "sleep_hours" => (float)$profile['sleep_hours'],
            "stress_level" => $profile['stress_level'],
            "suggested_goal_weight" => (float)$profile['suggested_goal_weight'],
            "readiness" => [
                "score" => $readinessScore,
                "label" => $rec,
                "factors" => array_slice($factors, 0, 2)
            ],
            "roadmap" => $roadmap,
            "weekly_win" => [
                "target_weight" => round($weeklyTarget, 1),
                "remaining" => round(abs($current - $weeklyTarget), 1),
                "label" => $missionLabel
            ],
            "phases" => $phases,
            "current_phase" => $currentPhaseIndex + 1,
            "total_adherence" => $totalAdherence,
            "is_recomp" => $isRecomp,
            "recomp_insight" => $recompInsight,
            "total_volume" => $totalVolume >= 1000 ? round($totalVolume / 1000, 1) . 'k' : $totalVolume,
            "avg_duration" => $avgDuration,
            "current_freq" => $doneWorkouts,
            "freq_goal" => $freqGoal,
            "sleep_score" => $sleepScore,
            "stress_index" => $stressIndex,
            "scenarios" => $scenariosArr,
            "plateau_risk" => $plateauRisk,
            "weekly_progress" => $weeklyProgress,
            "weekly_velocity" => $weeklyVelocity,
            "total_progress" => $totalProgress,
            "goal_distance" => $goalDistance,
            "lean_mass" => $leanMass,
            "calories_goal" => $caloriesGoal,
            "protein_goal" => $proteinGoal,
            "carbs_goal" => $carbsGoal,
            "fats_goal" => $fatsGoal,
            "water_consumed" => $waterConsumed,
            "water_goal" => $waterGoalMl,
            "water_goal_liters" => $waterGoalLiters
        ]);
    }

    public function getPrediction() {
        $user_id = $this->requireAuth();

        // Fetch Progress History
        $query = "SELECT weight, date_logged FROM progress WHERE user_id = ? ORDER BY date_logged ASC";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch Profile for additional context
        $stmtProf = $this->db->prepare("SELECT * FROM user_profiles WHERE user_id = ?");
        $stmtProf->execute([$user_id]);
        $profile = $stmtProf->fetch(PDO::FETCH_ASSOC);

        $ai = new PredictionAI();
        $prediction = $ai->predictNextMonth($history, $profile); // Returns array or error string

        // Also calculate "Time to Goal" if valid prediction
        $timeToGoal = "N/A";
        
        $stmtProfile = $this->db->prepare("SELECT target_weight, weight FROM user_profiles WHERE user_id = ?");
        $stmtProfile->execute([$user_id]);
        $profile = $stmtProfile->fetch(PDO::FETCH_ASSOC);

        if (is_array($prediction) && $profile && $profile['target_weight']) {
            $current = $profile['weight'];
            $target = $profile['target_weight'];
            $rateStr = $prediction['rate_per_week']; // e.g., "-0.5 kg/week"
            
            // Extract numeric rate
            preg_match('/([-\d.]+)/', $rateStr, $matches);
            $rate = isset($matches[1]) ? floatval($matches[1]) : 0;

            if ($rate != 0) {
                $diff = $target - $current;
                // If diff and rate have same sign, we are moving towards it
                if (($diff < 0 && $rate < 0) || ($diff > 0 && $rate > 0)) {
                    $weeks = abs($diff / $rate);
                    $timeToGoal = round($weeks, 1) . " weeks";
                } else {
                    $timeToGoal = "Wrong direction";
                }
            } else {
                $timeToGoal = "Plateau";
            }
        }
        
        // Enhance prediction array
        if (is_array($prediction)) {
            $prediction['time_to_goal'] = $timeToGoal;
        }

        $this->jsonResponse($prediction);
    }

    public function getActivityHistory() {
        $user_id = $this->requireAuth();
        $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

        $history = [];
        $targetDayName = date('l', strtotime($date));

        // 1. Get Completed Workouts from Latest Plan
        $stmtW = $this->db->prepare("SELECT plan_data, date_generated FROM workouts WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
        $stmtW->execute([$user_id]);
        $wRow = $stmtW->fetch(PDO::FETCH_ASSOC);
        if ($wRow) {
            $plan = json_decode($wRow['plan_data'], true);
            $baseDate = $wRow['date_generated'];
            if (is_array($plan)) {
                foreach ($plan as $w) {
                    if (!empty($w['completed'])) {
                        // Filter by selected date if provided
                        $itemDay = $w['day'] ?? 'Monday';
                        if ($itemDay !== $targetDayName) continue;

                        // Estimate date based on day of week if not stored
                        // We use current week mapping for the latest active plan
                        $date = $this->getDateFromDayName($itemDay, $baseDate, true);
                        $history[] = [
                            'id' => 'w_' . ($w['day'] ?? 'd') . '_' . $date,
                            'type' => 'WORKOUT',
                            'title' => $w['title'] ?? 'Workout',
                            'subtitle' => ($w['duration'] ?? '45 mins') . ' • ' . ($w['kcal'] ?? '300') . ' kcal',
                            'time' => 'Completed',
                            'day' => $itemDay,
                            'date' => $date,
                            'icon' => 'barbell',
                            'color' => '#3B82F6'
                        ];
                    }
                }
            }
        }

        // 2. Get Completed Meals from Latest Nutrition Plan
        $stmtN = $this->db->prepare("SELECT meal_data, date_generated FROM nutrition_plans WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
        $stmtN->execute([$user_id]);
        $nRow = $stmtN->fetch(PDO::FETCH_ASSOC);
        if ($nRow) {
            $meals = json_decode($nRow['meal_data'], true);
            $baseDate = $nRow['date_generated'];
            if (is_array($meals)) {
                foreach ($meals as $m) {
                    if (!empty($m['completed'])) {
                        $itemDay = $m['day'] ?? 'Monday';
                        if ($itemDay !== $targetDayName) continue;

                        $date = $this->getDateFromDayName($itemDay, $baseDate, true);
                        $history[] = [
                            'id' => 'm_' . ($m['id'] ?? uniqid()) . '_' . $date,
                            'type' => 'MEAL',
                            'title' => $m['name'] ?? 'Meal',
                            'subtitle' => ($m['calories'] ?? '??') . ' kcal • ' . ($m['protein'] ?? '??') . 'g P',
                            'time' => 'Logged',
                            'day' => $itemDay,
                            'date' => $date,
                            'icon' => 'restaurant',
                            'color' => '#10B981'
                        ];
                    }
                }
            }
        }

        // 3. Get Weight Logs
        $stmtP = $this->db->prepare("SELECT id, weight, date_logged FROM progress WHERE user_id = ? ORDER BY date_logged DESC LIMIT 10");
        $stmtP->execute([$user_id]);
        $pRows = $stmtP->fetchAll(PDO::FETCH_ASSOC);
        foreach ($pRows as $p) {
            $dayName = date('l', strtotime($p['date_logged']));
            if ($dayName !== $targetDayName) continue;

            $history[] = [
                'id' => 'p_' . $p['id'],
                'type' => 'WEIGHT',
                'title' => 'Weight Check-in',
                'subtitle' => $p['weight'] . ' kg • Recorded',
                'time' => date('M j', strtotime($p['date_logged'])),
                'day' => $dayName,
                'date' => $p['date_logged'],
                'icon' => 'scale',
                'color' => '#F59E0B'
            ];
        }

        $this->jsonResponse($history);
    }

    public function checkWeightLogged() {
        $user_id = $this->requireAuth();

        $today = date('Y-m-d');
        $stmt = $this->db->prepare("SELECT 1 FROM progress WHERE user_id = ? AND date_logged = ?");
        $stmt->execute([$user_id, $today]);
        $logged = (bool)$stmt->fetch();

        $this->jsonResponse(["logged" => $logged]);
    }

    public function logDailyPulse() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        $weight = $data->weight ?? 0;
        $sleep = $data->sleep ?? 0;
        $stress = $data->stress ?? 'medium';
        $steps = $data->steps ?? 0;
        $water = $data->water_ml ?? 0;
        $today = date('Y-m-d');

        try {
            $this->db->beginTransaction();

            // 1. Log to progress table (for backward compatibility / history)
            if ($weight > 0) {
                // Check if already logged weight today in progress table
                $stmtCheck = $this->db->prepare("SELECT id FROM progress WHERE user_id = ? AND date_logged = ?");
                $stmtCheck->execute([$user_id, $today]);
                if ($row = $stmtCheck->fetch()) {
                    $stmtUpd = $this->db->prepare("UPDATE progress SET weight = ? WHERE id = ?");
                    $stmtUpd->execute([$weight, $row['id']]);
                } else {
                    $stmtIns = $this->db->prepare("INSERT INTO progress (user_id, weight, date_logged) VALUES (?, ?, ?)");
                    $stmtIns->execute([$user_id, $weight, $today]);
                }
                
                // Also update current weight in profile
                $stmtProf = $this->db->prepare("UPDATE user_profiles SET weight = ? WHERE user_id = ?");
                $stmtProf->execute([$weight, $user_id]);
            }

            // 2. Log to daily_logs (The "Pulse" table)
            $sqlPulse = "INSERT INTO daily_logs (user_id, date_logged, sleep_hours, stress_level, steps, weight, water_ml) 
                         VALUES (?, ?, ?, ?, ?, ?, ?) 
                         ON DUPLICATE KEY UPDATE 
                         sleep_hours = VALUES(sleep_hours), 
                         stress_level = VALUES(stress_level), 
                         steps = VALUES(steps), 
                         weight = VALUES(weight),
                         water_ml = VALUES(water_ml)";
            $stmtPulse = $this->db->prepare($sqlPulse);
            $stmtPulse->execute([$user_id, $today, $sleep, $stress, $steps, $weight, $water]);

            // Track Challenge Progress
            require_once __DIR__ . '/ChallengeController.php';
            $challengeCtrl = new ChallengeController();
            
            // Weight log counts towards 'streak' challenge in this context
            if ($weight > 0) {
                $challengeCtrl->trackProgress($user_id, 'streak');
            }
            // If steps > 0, maybe track steps?
            if ($steps > 0) {
                $challengeCtrl->trackProgress($user_id, 'steps');
            }

            $this->db->commit();
            $this->jsonResponse(["message" => "Pulse logged successfully"]);
        } catch (\Exception $e) {
            $this->db->rollBack();
            $this->errorResponse("Database error: " . $e->getMessage(), 500);
        }
    }

    public function logWater() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        $amount = (int)($data->amount ?? 0);
        $today = date('Y-m-d');

        try {
            $this->db->beginTransaction();
            
            // Check if record exists
            $stmt = $this->db->prepare("SELECT water_ml FROM daily_logs WHERE user_id = ? AND date_logged = ?");
            $stmt->execute([$user_id, $today]);
            $existing = $stmt->fetch();

            if ($existing) {
                $newAmount = $existing['water_ml'] + $amount;
                $upd = $this->db->prepare("UPDATE daily_logs SET water_ml = ? WHERE user_id = ? AND date_logged = ?");
                $upd->execute([$newAmount, $user_id, $today]);
            } else {
                $ins = $this->db->prepare("INSERT INTO daily_logs (user_id, date_logged, water_ml) VALUES (?, ?, ?)");
                $ins->execute([$user_id, $today, $amount]);
                $newAmount = $amount;
            }

            // Track Challenge Progress for 'water'
            require_once __DIR__ . '/ChallengeController.php';
            $challengeCtrl = new ChallengeController();
            $challengeCtrl->trackProgress($user_id, 'water', $amount);

            $this->db->commit();
            $this->jsonResponse([
                "message" => "Water logged successfully",
                "water_consumed" => $newAmount
            ]);
        } catch (\Exception $e) {
            $this->db->rollBack();
            $this->errorResponse("Database error: " . $e->getMessage(), 500);
        }
    }

    public function auditProgress() {
        $user_id = $this->requireAuth();

        // Fetch user profile for context
        $stmtP = $this->db->prepare("SELECT goal, meals_per_day, training_days_per_week FROM user_profiles WHERE user_id = ?");
        $stmtP->execute([$user_id]);
        $profile = $stmtP->fetch(PDO::FETCH_ASSOC);
        if (!$profile) $this->errorResponse("User profile not found", 404);

        $mealsPerDay = (int)($profile['meals_per_day'] ?? 4);
        $trainingDays = (int)($profile['training_days_per_week'] ?? 3);
        $goal = $profile['goal'] ?? 'fat loss';

        // 1. Weekly Weight Trend
        $sevenDaysAgo = date('Y-m-d', strtotime('-7 days'));
        $stmtW = $this->db->prepare("SELECT weight, date_logged FROM progress WHERE user_id = ? AND date_logged >= ? ORDER BY date_logged ASC");
        $stmtW->execute([$user_id, $sevenDaysAgo]);
        $weights = $stmtW->fetchAll(PDO::FETCH_ASSOC);
        
        $trend = 0;
        if (count($weights) >= 2) {
            $trend = end($weights)['weight'] - $weights[0]['weight'];
        }

        // 2. Workout Adherence (Last 7 Days)
        $stmtWorkout = $this->db->prepare("SELECT plan_data FROM workouts WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
        $stmtWorkout->execute([$user_id]);
        $wRow = $stmtWorkout->fetch(PDO::FETCH_ASSOC);
        $wAdherence = 0;
        if ($wRow) {
            $plan = json_decode($wRow['plan_data'], true);
            $doneW = 0;
            if (is_array($plan)) {
                foreach ($plan as $day) {
                    if (isset($day['completed']) && $day['completed']) $doneW++;
                }
            }
            // Use profile training days as the denominator for accuracy
            $expectedW = max($trainingDays, 1);
            $wAdherence = ($doneW / $expectedW) * 100;
        }

        // 3. Nutrition Adherence (Last 7 Days)
        $stmtNut = $this->db->prepare("SELECT meal_data FROM nutrition_plans WHERE user_id = ? ORDER BY date_generated DESC LIMIT 1");
        $stmtNut->execute([$user_id]);
        $nRow = $stmtNut->fetch(PDO::FETCH_ASSOC);
        $nAdherence = 0;
        if ($nRow) {
            $plan = json_decode($nRow['meal_data'], true);
            $doneM = 0;
            if (is_array($plan)) {
                foreach ($plan as $meal) {
                    if (isset($meal['completed']) && $meal['completed']) $doneM++;
                }
            }
            // Calculation based on user-specific meal frequency
            $expectedM = $mealsPerDay * 7;
            if ($expectedM <= 0) $expectedM = 28; // Fallback to 4/day
            $nAdherence = ($doneM / $expectedM) * 100;
        }

        // Clip adherence at 100% just in case
        $wAdherence = min($wAdherence, 100);
        $nAdherence = min($nAdherence, 100);

        // 5. Verdict Logic
        $verdict = "OPTIMIZED";
        $message = "You're making great progress! Your adherence and weight trend are perfectly aligned.";
        
        $stalled = abs($trend) < 0.2;
        $isLoss = stripos($goal, 'loss') !== false || stripos($goal, 'cut') !== false;

        if ($stalled) {
            if ($nAdherence < 70) {
                $verdict = "NUTRITION_GAP";
                $message = "Results are plateauing. Your nutrition adherence is at " . round($nAdherence) . "%. Precision in your meal plan (targeting " . $mealsPerDay . " meals/day) is key to breaking this stall.";
                $this->createNotification($user_id, "Nutrition Gap Detected! 🥗", $message, "audit", "restaurant", "#F59E0B");
            } elseif ($wAdherence < 70) {
                $verdict = "WORKOUT_GAP";
                $message = "Your progress has stalled. The audit shows a gap in workout consistency (" . round($wAdherence) . "% adherence). Focus on hitting your " . $trainingDays . " sessions/week.";
                $this->createNotification($user_id, "Workout Gap Detected! 💪", $message, "audit", "barbell", "#3B82F6");
            } else {
                $verdict = "ADAPTATION_NEEDED";
                $message = "Your adherence is elite (" . round(($wAdherence + $nAdherence) / 2) . "%), but your body has adapted. It's time to regenerate your plans to shock your system.";
                $this->createNotification($user_id, "Adaptive Plateau Reached 📈", $message, "audit", "trending-up", "#10B981");
            }
        }

        $this->jsonResponse([
            "verdict" => $verdict,
            "message" => $message,
            "stats" => [
                "trend" => round($trend, 2),
                "workout_adherence" => round($wAdherence),
                "nutrition_adherence" => round($nAdherence)
            ]
        ]);
    }

    private function getDateFromDayName($dayName, $baseDate, $useCurrentWeek = false) {
        if ($useCurrentWeek) {
            // Find Monday of the current week
            $monday = date('Y-m-d', strtotime('monday this week'));
            $baseDate = $monday;
        }

        $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $baseDayIndex = array_search(date('l', strtotime($baseDate)), $days);
        $targetDayIndex = array_search($dayName, $days);
        
        if ($baseDayIndex === false || $targetDayIndex === false) return $baseDate;
        
        $diff = $targetDayIndex - $baseDayIndex;
        return date('Y-m-d', strtotime("$baseDate $diff days"));
    }

    /**
     * Log an activity (weight, workout, or meal).
     * Migrated from api/logActivity.php
     */
    public function logActivity() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->type)) {
            $this->errorResponse("Missing type (weight/workout/meal).", 400);
        }

        $type = $data->type;
        $date = date('Y-m-d');

        if ($type === 'weight') {
            if (empty($data->value)) {
                $this->errorResponse("Missing weight value.", 400);
            }

            $weight = (float)$data->value;

            $query = "INSERT INTO progress (user_id, weight, date_logged) VALUES (:uid, :weight, :date)";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":uid", $user_id);
            $stmt->bindParam(":weight", $weight);
            $stmt->bindParam(":date", $date);

            // Also update current profile weight
            $upd = "UPDATE user_profiles SET weight = :weight WHERE user_id = :uid";
            $ustmt = $this->db->prepare($upd);
            $ustmt->bindParam(":weight", $weight);
            $ustmt->bindParam(":uid", $user_id);
            $ustmt->execute();

            if ($stmt->execute()) {
                // Track Challenge Progress
                require_once __DIR__ . '/ChallengeController.php';
                $challengeCtrl = new ChallengeController($this->db);
                $challengeCtrl->trackProgress($user_id, 'streak');

                $this->jsonResponse(["message" => "Weight logged successfully."]);
            } else {
                $this->errorResponse("Unable to log weight.", 503);
            }

        } elseif ($type === 'workout') {
            require_once __DIR__ . '/ChallengeController.php';
            $challengeCtrl = new ChallengeController($this->db);
            $challengeCtrl->trackProgress($user_id, 'workout');

            $this->jsonResponse(["message" => "Workout logged."]);

        } elseif ($type === 'meal') {
            require_once __DIR__ . '/ChallengeController.php';
            $challengeCtrl = new ChallengeController($this->db);
            $challengeCtrl->trackProgress($user_id, 'nutrition');

            $this->jsonResponse(["message" => "Meal logged."]);

        } else {
            $this->errorResponse("Invalid type.", 400);
        }
    }
}
?>
