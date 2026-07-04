<?php
require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../services/GeminiService.php';

/**
 * RecoveryController.php
 * 
 * Handles personalized AI Injury Analysis & Recovery Plan generation.
 * Synthesizes user metrics, active injury history, and symptom responses
 * to construct a sports science rehabilitation protocol.
 */
class RecoveryController extends BaseController {

    public function generatePlan() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        // 1. Fetch complete anatomical profile context
        $stmt = $this->db->prepare("
            SELECT u.name, p.goal, p.weight, p.height, p.age, p.gender,
                   p.training_intensity, p.training_days_per_week,
                   p.injuries, p.pain_points, p.strong_side,
                   p.posture_problems, p.mobility_limitations,
                   p.avoid_areas, p.chronic_pain
            FROM users u
            JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = ?
        ");
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$profile) {
            $this->errorResponse("User profile not found. Complete your onboarding physical assessment first.", 404);
        }

        // 2. Extract injury assessment questionnaire answers
        $how_happened            = $data->how_happened ?? 'Not specified';
        $pain_start              = $data->pain_start ?? 'Not specified';
        $pain_level              = $data->pain_level ?? 'Not specified';
        $pain_type               = $data->pain_type ?? 'Not specified';
        $increase_during_workout = $data->increase_during_workout ?? 'Not specified';
        $hurt_movements          = $data->hurt_movements ?? 'Not specified';
        $seen_doctor             = $data->seen_doctor ?? 'Not specified';
        $injury_age              = $data->injury_age ?? 'Not specified';

        // 3. Connect to Google Gemini
        $gemini = new GeminiService();

        if (!$gemini->isAvailable()) {
            // Friendly mock response in case the key is missing (fallback)
            $this->jsonResponse([
                "pain_analysis" => "It looks like you are experiencing discomfort. Based on our clinical rulebook, your joint loading is exceeding standard thresholds.",
                "recovery_plan" => "Initiate a localized active rest protocol. Restrict movements that cause discomfort and emphasize light tissue mobilization twice daily.",
                "supplements" => [
                    ["name" => "Omega-3 Fish Oils", "dosage" => "2000mg daily", "reason" => "High EPA/DHA contents to naturally down-regulate joint inflammation pathways."],
                    ["name" => "Magnesium Glycinate", "dosage" => "350mg before sleep", "reason" => "Improves neuromuscular recovery and reduces deep muscle spasms."]
                ],
                "stretching" => [
                    ["name" => "Static Decompression Hold", "sets" => "3 sets", "frequency" => "Daily", "guide" => "Hold the stretched state for 30 seconds, breathing deeply into the diaphragm to relieve localized tension."]
                ],
                "mobility_exercises" => [
                    ["name" => "Active Range Controlled Rotations (CARs)", "sets" => "2 sets", "reps" => "5 rotations per direction", "guide" => "Slowly trace the outermost boundary of your joint range without eliciting sharp pain."]
                ],
                "exercises_to_avoid" => [
                    ["name" => "Heavy Compound Bilateral Movements", "reason" => "Bilateral compression may trigger nervous system compensation, exacerbating tissue strain."]
                ],
                "ai_recommendations" => [
                    "sleep" => "Target 8-9 hours of restorative sleep to maximize growth hormone levels essential for soft-tissue remodeling.",
                    "hydration" => "Consume 35ml of water per kg of bodyweight daily to maintain intervertebral disc and articular cartilage hydration.",
                    "posture" => "Perform shoulder blade squeezes (scapular retractions) every 45 minutes of sedentary desk work.",
                    "estimated_timeline" => "2 - 4 weeks of consistent prehab mobilization before re-introducing heavy axial loads."
                ],
                "ai_powered" => false
            ]);
        }

        // 4. Construct deep-context medical-tech prompt
        $name      = $profile['name'] ?? 'Athlete';
        $age       = $profile['age'] ?? 25;
        $gender    = $profile['gender'] ?? 'unknown';
        $weight    = $profile['weight'] ?? 70;
        $height    = $profile['height'] ?? 175;
        $goal      = str_replace('_', ' ', $profile['goal'] ?? 'general fitness');
        $intensity = $profile['training_intensity'] ?? 'moderate';
        
        $injuries   = $profile['injuries'] ?: 'None registered';
        $painPoints = $profile['pain_points'] ?: 'None registered';
        $posture    = $profile['posture_problems'] ?: 'None registered';
        $mobility   = $profile['mobility_limitations'] ?: 'None registered';
        $avoid      = $profile['avoid_areas'] ?: 'None registered';

        $prompt = <<<PROMPT
You are a world-class clinical Sports Rehabilitation Specialist, Physiotherapist, and Athletic Training Expert.
Provide a highly detailed, professional, and science-backed sports medicine recovery and prehab plan for our athlete, {$name}.

### Athlete Biometric Context:
- Age: {$age}, Gender: {$gender}, Weight: {$weight}kg, Height: {$height}cm
- Fitness Goal: {$goal} (intensity level: {$intensity})
- Registered Onboarding Injuries: {$injuries}
- Sore areas / Pain points: {$painPoints}
- Postural issues: {$posture}
- Joint mobility limitations: {$mobility}
- Areas to avoid under load: {$avoid}

### Active Symptom Assessment Questionnaire Answers:
- How the injury happened: {$how_happened}
- Onset (when it started): {$pain_start}
- Subjective Pain Level (1 to 10 scale): {$pain_level}/10
- Pain Quality (Sharp or Sore): {$pain_type}
- Pain Aggravation (does it increase during workouts?): {$increase_during_workout}
- Most Painful movements: {$hurt_movements}
- Medical History (has seen a doctor?): {$seen_doctor}
- Chronicity (old injury or recent/acute?): {$injury_age}

### Requirements for the Plan:
1. Provide a comprehensive biomechanical explanation in "pain_analysis" detailing what tissue or biomechanical mechanism is likely stressed under loading (explain in high-end sports medicine terms but write so it is motivating and clear).
2. Create highly targeted active recovery protocols. Detail specific recovery exercises, dynamic mobility moves, and clinical static stretches.
3. Formulate high-relevance supplement guidelines to accelerate soft-tissue, tendon, or muscular healing.
4. List specific exercises or training motions that MUST BE AVOIDED to prevent further joint strain.
5. Provide actionable guidelines for recovery, sleep hygiene, joint lubrication hydration, posture corrections, and an estimated healing timeframe.

### Rules:
- Return valid raw JSON ONLY. No markdown, no HTML, no explanation, no backticks (```json).
- Maintain an elite, science-backed, supportive medical-tech tone.

### Output JSON Format:
{
  "pain_analysis": "biomechanical sports-science assessment text...",
  "recovery_plan": "step-by-step active rest recovery roadmap...",
  "supplements": [
    { "name": "e.g., Omega-3 Fish Oil", "dosage": "e.g., 2-3g daily", "reason": "reasoning based on inflammatory markers..." }
  ],
  "stretching": [
    { "name": "stretch name...", "sets": "duration/sets...", "frequency": "frequency...", "guide": "exact execution instructions..." }
  ],
  "mobility_exercises": [
    { "name": "exercise name...", "sets": "sets...", "reps": "reps/duration...", "guide": "biomechanical instructions..." }
  ],
  "exercises_to_avoid": [
    { "name": "exercise/movement name...", "reason": "why it stresses the active injury joint..." }
  ],
  "ai_recommendations": {
    "sleep": "sleep and recovery repair tips...",
    "hydration": "hydration guidelines for synovial fluid/disc volume...",
    "posture": "posture mechanics pointers...",
    "estimated_timeline": "estimated healing window..."
  }
}
PROMPT;

        // 5. Generate plan using Gemini Service (JSON forced mode)
        $systemInstruction = "You are a Sports Medicine Doctor and Athletic Therapist. Output raw structured JSON complying exactly with the provided schema.";
        $plan = $gemini->askForJson($prompt, $systemInstruction);

        if ($plan === null) {
            // Fall back to personalized dynamic local plan compilation in case Gemini API is blocked or offline
            $plan = $this->generateLocalFallback($profile, [
                'pain_level' => $pain_level,
                'pain_type' => $pain_type,
                'how_happened' => $how_happened,
                'hurt_movements' => $hurt_movements
            ]);
        } else {
            $plan['ai_powered'] = true;
        }

        // Save generated plan to database
        $stmtSave = $this->db->prepare("
            INSERT INTO recovery_plans (user_id, plan_data, completed_items, body_parts_status, date_generated)
            VALUES (?, ?, ?, ?, CURDATE())
        ");
        $stmtSave->execute([
            $user_id,
            json_encode($plan),
            json_encode([]),
            json_encode([])
        ]);

        $plan['db_id'] = (int)$this->db->lastInsertId();
        $plan['completed_items'] = [];
        $plan['body_parts_status'] = [];

        $this->jsonResponse($plan);
    }

    private function generateLocalFallback($profile, $answers) {
        $injuries = !empty($profile['injuries']) ? $profile['injuries'] : 'general discomfort';
        $pain_level = $answers['pain_level'] ?? 5;
        $pain_type = $answers['pain_type'] ?? 'sore';

        // Biomechanical analysis
        $pain_analysis = "Based on clinical sports-rehab screening, your pain is graded at level {$pain_level}/10 with a '{$pain_type}' chronicity profile. ";
        $pain_analysis .= "Active stress has been registered on: " . str_replace('_', ' ', $injuries) . ". ";
        $pain_analysis .= "The etiology indicates localized tissue loading is exceeding the safety margins of active tendons and connective tissues, resulting in nervous system compensation.";

        $recovery_plan = "Initiate an active load management protocol. Minimize movements that replicate the pain mechanism. Engage in daily sub-maximal localized blood-flow recovery sessions.";

        // General supplements
        $supplements = [
            ["name" => "Omega-3 Fish Oils", "dosage" => "3000mg daily", "reason" => "Improves cartilage integrity and regulates systemic inflammatory markers."],
            ["name" => "Magnesium Glycinate", "dosage" => "400mg at night", "reason" => "Relaxes micro-spasms and down-regulates hyperactive nerve endings in injured limbs."]
        ];

        // Specific joint protocols
        $stretching = [];
        $mobility = [];
        $avoid = [];

        $lower_injuries = strtolower($injuries);
        if (strpos($lower_injuries, 'shoulder') !== false) {
            $stretching[] = ["name" => "Doorway Chest Stretch", "sets" => "3 sets of 30s holds", "frequency" => "2x daily", "guide" => "Place forearm against doorframe, rotate torso outward to open up chest/pec minor without pulling front delt."];
            $mobility[] = ["name" => "Scapular Wall Slides", "sets" => "3 sets", "reps" => "12 reps", "guide" => "Slide elbows and wrists up the wall while keeping scapula flush against surface."];
            $avoid[] = ["name" => "Barbell Bench & Overhead Press", "reason" => "High axial shearing on anterior glenohumeral joint under loaded compression."];
        }

        if (strpos($lower_injuries, 'knee') !== false || strpos($lower_injuries, 'leg') !== false) {
            $stretching[] = ["name" => "Standing Rectus Femoris Stretch", "sets" => "3 sets of 25s", "frequency" => "Daily", "guide" => "Pull heel to glute, tuck pelvis forward to lengthen quad/hip flexor complex."];
            $mobility[] = ["name" => "Terminal Knee Extensions (TKEs)", "sets" => "3 sets", "reps" => "20 reps", "guide" => "Anchor resistance band around knee, pull back against resistance to lock out knee under control."];
            $avoid[] = ["name" => "Heavy Back Squats & Deep Lunges", "reason" => "High patellofemoral shear forces during deep knee flexion."];
        }

        if (strpos($lower_injuries, 'back') !== false) {
            $stretching[] = ["name" => "Decompression Child's Pose", "sets" => "4 holds of 45s", "frequency" => "Daily", "guide" => "Sit back on heels, reach arms forward, breathe deeply into lower lumbar spine to decompress discs."];
            $mobility[] = ["name" => "Bird-Dog Extensions", "sets" => "3 sets", "reps" => "10 reps per side", "guide" => "Extend opposite arm/leg from all-fours, maintaining flat spine and locking active core."];
            $avoid[] = ["name" => "Bilateral Conventional Deadlifts", "reason" => "Extreme shearing load on lumbar L4-S1 vertebrae under flexion."];
        }

        if (strpos($lower_injuries, 'ankle') !== false) {
            $stretching[] = ["name" => "Gastrocnemius Wall Lean", "sets" => "3 sets of 30s", "frequency" => "Daily", "guide" => "Keep heel flat on floor, lean forward to lengthen Achilles tendon."];
            $mobility[] = ["name" => "Controlled Ankle Alphabet CARs", "sets" => "2 sets", "reps" => "5 rotations per direction", "guide" => "Trace large circles with big toe, loading ankle capsule in controlled mobility."];
            $avoid[] = ["name" => "High-Impact Running & Jump Box drills", "reason" => "High reactive peak ground forces aggravate active tendon strain."];
        }

        // Add general protocols if empty
        if (empty($stretching)) {
            $stretching[] = ["name" => "Dynamic Active Rest Stretch", "sets" => "3 sets of 30s holds", "frequency" => "Daily", "guide" => "Hold the stretched state, breathing deeply into the diaphragm to relieve localized tension."];
            $mobility[] = ["name" => "Controlled Joint Articular Rotations (CARs)", "sets" => "2 sets", "reps" => "10 rotations", "guide" => "Perform slow circular motions to lubricate joint capsules."];
            $avoid[] = ["name" => "Max-effort loaded compound movements", "reason" => "Bilateral compression may trigger nervous system compensation, exacerbating tissue strain."];
        }

        return [
            "pain_analysis" => $pain_analysis,
            "recovery_plan" => $recovery_plan,
            "supplements" => $supplements,
            "stretching" => $stretching,
            "mobility_exercises" => $mobility,
            "exercises_to_avoid" => $avoid,
            "ai_recommendations" => [
                "sleep" => "Target 8-9 hours of restorative sleep to maximize growth hormone levels essential for soft-tissue remodeling.",
                "hydration" => "Consume 35ml of water per kg of bodyweight daily to maintain intervertebral disc and articular cartilage hydration.",
                "posture" => "Avoid prolonged static seating; change position or perform scapular retractions every 45 minutes.",
                "estimated_timeline" => ($pain_level >= 8) ? "4 - 8 weeks of active prehab rehabilitation" : "2 - 4 weeks of localized tissue mobilization"
            ],
            "ai_powered" => false
        ];
    }

    public function getPlan() {
        $user_id = $this->requireAuth();
        
        $stmt = $this->db->prepare("
            SELECT id, plan_data, completed_items, body_parts_status, date_generated
            FROM recovery_plans
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
        $plan['completed_items'] = json_decode($row['completed_items'] ?? '[]', true);
        $plan['body_parts_status'] = json_decode($row['body_parts_status'] ?? '[]', true);
        $plan['date_generated'] = $row['date_generated'];

        $this->jsonResponse($plan);
    }

    public function updateProgress() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        $plan_id = $data->plan_id ?? null;
        $completed_items = $data->completed_items ?? [];
        $body_parts_status = $data->body_parts_status ?? [];

        if (!$plan_id) {
            $this->errorResponse("plan_id is required", 400);
        }

        // Verify ownership
        $stmt = $this->db->prepare("SELECT id FROM recovery_plans WHERE id = ? AND user_id = ?");
        $stmt->execute([$plan_id, $user_id]);
        if (!$stmt->fetch()) {
            $this->errorResponse("Plan not found or access denied", 404);
        }

        // Update progress
        $stmtUpdate = $this->db->prepare("
            UPDATE recovery_plans
            SET completed_items = ?, body_parts_status = ?
            WHERE id = ?
        ");
        $stmtUpdate->execute([
            json_encode($completed_items),
            json_encode($body_parts_status),
            $plan_id
        ]);

        $this->jsonResponse(["success" => true, "message" => "Progress saved successfully."]);
    }
}
?>
