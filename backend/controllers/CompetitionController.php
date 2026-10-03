<?php
require_once __DIR__ . '/BaseController.php';

/**
 * CompetitionController.php
 * 
 * Handles personalized AI Competition Preparation Plan generation.
 * Customizes training periodization, target milestones, hydration/nutrition
 * protocols, and strategy based on user profile and competition goals.
 */
class CompetitionController extends BaseController {

    public function generatePlan() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        // 1. Fetch complete biometric profile context for the athlete
        $stmt = $this->db->prepare("
            SELECT u.name, p.goal, p.weight, p.height, p.age, p.gender,
                   p.training_intensity, p.training_days_per_week
            FROM users u
            JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = ?
        ");
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$profile) {
            $this->errorResponse("User profile not found. Complete your assessment first.", 404);
        }

        // 2. Extract competition parameters
        $competition_name = $data->competition_name ?? 'Competition';
        $competition_date = $data->competition_date ?? date('Y-m-d', strtotime('+8 weeks'));
        $competition_type = $data->competition_type ?? 'Running';
        $weeks_duration   = isset($data->weeks_duration) ? (int)$data->weeks_duration : 8;
        $specific_goal    = $data->specific_goal ?? 'Finish successfully';
        $fitness_level    = $data->fitness_level ?? 'Intermediate';

        $plan = $this->generateLocalPlan($profile, [
            'competition_name' => $competition_name,
            'competition_type' => $competition_type,
            'weeks_duration'   => $weeks_duration,
            'specific_goal'    => $specific_goal,
            'fitness_level'    => $fitness_level
        ]);

        // Save generated plan to database
        $stmtSave = $this->db->prepare("
            INSERT INTO competition_plans (user_id, competition_name, competition_date, competition_type, weeks_duration, specific_goal, fitness_level, plan_data, completed_milestones, date_generated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
        ");
        $stmtSave->execute([
            $user_id,
            $competition_name,
            $competition_date,
            $competition_type,
            $weeks_duration,
            $specific_goal,
            $fitness_level,
            json_encode($plan),
            json_encode([])
        ]);

        $plan['db_id'] = (int)$this->db->lastInsertId();
        $plan['completed_milestones'] = [];
        $plan['competition_name'] = $competition_name;
        $plan['competition_date'] = $competition_date;
        $plan['competition_type'] = $competition_type;
        $plan['weeks_duration'] = $weeks_duration;

        $this->jsonResponse($plan);
    }

    private function generateLocalPlan($profile, $params) {
        $compName = $params['competition_name'];
        $compType = $params['competition_type'];
        $weeks    = $params['weeks_duration'];
        $goal     = $params['specific_goal'];
        $level    = $params['fitness_level'];

        $overview = "Initiating localized training preparation for {$compName} ({$compType}) over a {$weeks}-week timeframe. ";
        $overview .= "This protocol focuses on gradual neuromuscular adaptations, muscular stabilization, and specific pacing routines designed to secure the goal of: '{$goal}'.";

        $weekly_schedule = [];
        
        // Calculate phases dynamically
        if ($weeks >= 8) {
            $weekly_schedule[] = [
                "phase_name" => "Weeks 1-3: Base Building & Neuromuscular Adaptations",
                "focus" => "Establish basic cardiovascular capacity, mechanical efficiency, and joint stability.",
                "training_volume" => "Low-to-moderate intensity, 3 key training sessions per week.",
                "weekly_workouts" => [
                    ["day" => "Day 1", "workout" => "Base Conditioning: 30-40 mins low intensity steady state (LISS), RPE 5/10."],
                    ["day" => "Day 3", "workout" => "Strength/Stability: Bilateral squats 3x10, Dumbbell presses 3x10, planks 3x60s."],
                    ["day" => "Day 5", "workout" => "Long Slow Duration: 50-60 mins steady aerobic effort, RPE 6/10."]
                ]
            ];
            $weekly_schedule[] = [
                "phase_name" => "Weeks 4-6: Specific Power & Capacity Accumulation",
                "focus" => "Increase lactate threshold, power output, and target competition pace tolerance.",
                "training_volume" => "Moderate-to-high volume, incorporating higher effort intervals.",
                "weekly_workouts" => [
                    ["day" => "Day 1", "workout" => "Interval Pace Work: 5x3 mins at target competition speed, 2 mins easy recovery."],
                    ["day" => "Day 3", "workout" => "Strength & Core: Dumbbell lunges 3x10, Kettlebell swings 4x12, hanging knee raises 3x15."],
                    ["day" => "Day 5", "workout" => "Simulated Prep Effort: 70-80 mins paced conditioning, RPE 7/10."]
                ]
            ];
            $weekly_schedule[] = [
                "phase_name" => "Weeks 7-" . $weeks . ": Peak Output, Taper & Recovery Strategy",
                "focus" => "Dissipate training fatigue, supercompensate glycogen stores, and peak active output.",
                "training_volume" => "Drastically reduced training volume, keeping intensity brief but target-specific.",
                "weekly_workouts" => [
                    ["day" => "Day 1", "workout" => "Light Pace Play: 20 mins paced, 3x1 min high effort strides, easy recovery."],
                    ["day" => "Day 3", "workout" => "Active Mobility: Dynamic stretching, hip openers, light yoga flow."],
                    ["day" => "Day 5", "workout" => "Pre-event Activation: 15 mins very easy warm-up, 2x1 min pace strides. REST."]
                ]
            ];
        } else {
            $weekly_schedule[] = [
                "phase_name" => "Weeks 1-2: Specific Conditioning & Speed",
                "focus" => "Rapidly adapt muscle tissue and joint stabilizers to competition volume.",
                "training_volume" => "Moderate intensity, focusing on biomechanical efficiency.",
                "weekly_workouts" => [
                    ["day" => "Day 1", "workout" => "Aerobic Pace Work: 30 mins at target pace, RPE 6/10."],
                    ["day" => "Day 3", "workout" => "Strength/Mobility: Core work, dynamic bodyweight drills, hip mobility."],
                    ["day" => "Day 5", "workout" => "Paced Conditioning: 45-60 mins comfortable long workout."]
                ]
            ];
            $weekly_schedule[] = [
                "phase_name" => "Weeks 3-" . $weeks . ": Taper & Supercompensation",
                "focus" => "Recharge CNS reserves and prepare mentally and physically for competition day.",
                "training_volume" => "Low volume, high quality, full rest days.",
                "weekly_workouts" => [
                    ["day" => "Day 1", "workout" => "Taper Prep: 20 mins light walk/jog/cycle with 3x30s fast strides."],
                    ["day" => "Day 3", "workout" => "Active Rest: Focused foam rolling, mobility, hydration verification."],
                    ["day" => "Day 5", "workout" => "Event Day Activation: Rest, light stretching, carbohydrate loading."]
                ]
            ];
        }

        $milestones = [
            [
                "id" => "m1",
                "title" => "Volume Benchmark Check",
                "description" => "Complete a full-length workout equal to 75% of competition duration without hitting severe fatigue.",
                "target_week" => max(1, floor($weeks / 2) - 1)
            ],
            [
                "id" => "m2",
                "title" => "Target Pace Simulation",
                "description" => "Execute 20-30 minutes continuously at exact competition goal intensity.",
                "target_week" => max(2, floor($weeks / 2) + 1)
            ],
            [
                "id" => "m3",
                "title" => "Taper Dry Run",
                "description" => "Verify competition gear, apparel, and pre-workout nutrition to ensure zero digestive or mechanical issues.",
                "target_week" => $weeks - 1
            ]
        ];

        return [
            "overview" => $overview,
            "avoid_mistakes" => "Avoid sudden volume spikes, skipping sleep (aim for 8 hours), and testing new foods/gear on competition day.",
            "nutrition_guidance" => "Focus on balanced carbohydrate intake (5-7g per kg of bodyweight), hydration (35ml water per kg bodyweight + electrolytes), and quality lean protein.",
            "weekly_schedule" => $weekly_schedule,
            "milestones" => $milestones,
            "estimated_readiness" => "Based on a {$weeks}-week preparation cycle and {$level} status, the athlete has a high probability of meeting the target goal of: '{$goal}' with structural pacing and disciplined recovery.",
            "ai_powered" => false
        ];
    }

    public function getPlan() {
        $user_id = $this->requireAuth();

        $stmt = $this->db->prepare("
            SELECT id, competition_name, competition_date, competition_type, weeks_duration, specific_goal, fitness_level, plan_data, completed_milestones, date_generated
            FROM competition_plans
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 1
        ");
        $stmt->execute([$user_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            $this->jsonResponse(null);
        }

        $plan = json_decode($row['plan_data'], true);
        $plan['db_id'] = (int)$row['id'];
        $plan['completed_milestones'] = json_decode($row['completed_milestones'] ?? '[]', true);
        $plan['competition_name'] = $row['competition_name'];
        $plan['competition_date'] = $row['competition_date'];
        $plan['competition_type'] = $row['competition_type'];
        $plan['weeks_duration'] = (int)$row['weeks_duration'];
        $plan['specific_goal'] = $row['specific_goal'];
        $plan['fitness_level'] = $row['fitness_level'];
        $plan['date_generated'] = $row['date_generated'];

        $this->jsonResponse($plan);
    }

    public function updateProgress() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        $plan_id = $data->plan_id ?? null;
        $completed_milestones = $data->completed_milestones ?? [];

        if (!$plan_id) {
            $this->errorResponse("plan_id is required", 400);
        }

        // Verify ownership
        $stmt = $this->db->prepare("SELECT id FROM competition_plans WHERE id = ? AND user_id = ?");
        $stmt->execute([$plan_id, $user_id]);
        if (!$stmt->fetch()) {
            $this->errorResponse("Plan not found or access denied", 404);
        }

        // Update progress
        $stmtUpdate = $this->db->prepare("
            UPDATE competition_plans
            SET completed_milestones = ?
            WHERE id = ?
        ");
        $stmtUpdate->execute([
            json_encode($completed_milestones),
            $plan_id
        ]);

        $this->jsonResponse(["success" => true, "message" => "Progress saved successfully."]);
    }
}
?>
