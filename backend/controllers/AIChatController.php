<?php
require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../services/GeminiService.php';

/**
 * AIChatController.php
 * 
 * Handles AI chatbot conversations powered by Google Gemini.
 * Receives a message history from the frontend and returns
 * a contextually-aware AI coach response.
 */
class AIChatController extends BaseController {

    public function chat() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->message)) {
            $this->errorResponse("Missing message field", 400);
        }

        // Load user profile for personalized context
        $stmt = $this->db->prepare("
            SELECT u.name, p.goal, p.weight, p.height, p.age, p.gender,
                   p.training_intensity, p.training_days_per_week, p.training_location,
                   p.level, p.streak, p.xp, p.likes, p.dislikes, p.allergies,
                   p.injuries, p.pain_points, p.strong_side, p.posture_problems,
                   p.mobility_limitations, p.avoid_areas, p.chronic_pain
            FROM users u
            JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = ?
        ");
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        // Build conversation history from the frontend
        // Expected: [{ role: 'user'|'model', text: '...' }]
        $history = [];
        if (!empty($data->history) && is_array($data->history)) {
            foreach ($data->history as $msg) {
                $role = ($msg->role === 'user') ? 'user' : 'model';
                $history[] = ['role' => $role, 'text' => $msg->text];
            }
        }

        // Always append the latest user message at the end
        $history[] = ['role' => 'user', 'text' => $data->message];

        // Build a personalized system prompt
        $systemPrompt = $this->buildSystemPrompt($profile);

        // Call Gemini
        $gemini = new GeminiService();

        if (!$gemini->isAvailable()) {
            $this->jsonResponse([
                "reply" => "I'm your AI Coach! However, my AI brain isn't connected yet. Please ask your developer to add the GEMINI_API_KEY to the backend.",
                "ai_powered" => false
            ]);
        }

        $reply = $gemini->chat($history, $systemPrompt);

        if ($reply === null) {
            // Fallback if Gemini fails
            $this->jsonResponse([
                "reply" => "Sorry, I'm having trouble thinking right now. Please try again in a moment!",
                "ai_powered" => false
            ]);
        }

        // ── Persist both messages to the database ──────────────────────────
        $insert = $this->db->prepare(
            "INSERT INTO ai_chat_history (user_id, role, message) VALUES (?, ?, ?)"
        );
        $insert->execute([$user_id, 'user',  $data->message]);
        $insert->execute([$user_id, 'model', $reply]);

        $this->jsonResponse([
            "reply"      => $reply,
            "ai_powered" => true
        ]);
    }

    /**
     * GET history — returns all saved AI chat messages for this user,
     * ordered oldest first so the frontend can render them in order.
     */
    public function getHistory() {
        $user_id = $this->requireAuth();

        $stmt = $this->db->prepare(
            "SELECT id, role, message, created_at
             FROM ai_chat_history
             WHERE user_id = ?
             ORDER BY created_at ASC, id ASC
             LIMIT 500"
        );
        $stmt->execute([$user_id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->jsonResponse(['messages' => $rows]);
    }

    /**
     * DELETE history — wipes all AI chat messages for this user.
     */
    public function clearHistory() {
        $user_id = $this->requireAuth();

        $stmt = $this->db->prepare(
            "DELETE FROM ai_chat_history WHERE user_id = ?"
        );
        $stmt->execute([$user_id]);

        $this->jsonResponse(['success' => true]);
    }


    private function buildSystemPrompt($profile): string {
        if (!$profile) {
            return "You are Coach Elite, an advanced AI athletic performance coach. Be concise, motivating, and science-backed. Do not generate meal plans or meal replacements; direct users to the Nutrition module for those.";
        }

        $goal      = str_replace('_', ' ', $profile['goal'] ?? 'general fitness');
        $name      = $profile['name'] ?? 'Champion';
        $weight    = $profile['weight'] ?? '?';
        $height    = $profile['height'] ?? '?';
        $age       = $profile['age'] ?? '?';
        $gender    = $profile['gender'] ?? 'person';
        $level     = $profile['level'] ?? 1;
        $streak    = $profile['streak'] ?? 0;
        $intensity = $profile['training_intensity'] ?? 'moderate';
        $location  = $profile['training_location'] ?? 'gym';
        $days      = $profile['training_days_per_week'] ?? 3;

        // Nutritional preferences
        $likes     = $profile['likes'] ?? 'None specified';
        $dislikes  = $profile['dislikes'] ?? 'None specified';
        $allergies = $profile['allergies'] ?? 'None specified';

        // Recovery / Medical constraints
        $injuries           = $profile['injuries'] ?? 'None';
        $painPoints         = $profile['pain_points'] ?? 'None';
        $strongSide         = $profile['strong_side'] ?? 'right';
        $postureProblems    = $profile['posture_problems'] ?? 'None';
        $mobilityLimit      = $profile['mobility_limitations'] ?? 'None';
        $avoidAreas         = $profile['avoid_areas'] ?? 'None';
        $chronicPain        = $profile['chronic_pain'] ?? 'None';

        return <<<PROMPT
        You are "Coach Elite", a world-class AI Personal Trainer, Sports Medicine Specialist, and Precision Nutrition Advisor.
        
        You are currently advising a user with the following physiological profile:
        - Name: {$name} (User ID: {$name})
        - Goals & Activity: Target is "{$goal}", training {$days} days/week at {$intensity} intensity.
        - Primary Location: {$location}
        - Metrics: {$weight}kg, {$height}cm, Age {$age}, Gender: {$gender}
        - User Progress: Level {$level}, Streak {$streak} days
        
        Nutrition & Dietary Constraints:
        - Preferences (Likes): {$likes}
        - Dislikes: {$dislikes}
        - Allergies / Avoid: {$allergies}
        
        Biomechanical / Safety Context:
        - Active Injuries: {$injuries}
        - Chronic Pain: {$chronicPain}
        - Pain Points: {$painPoints}
        - Dominant Side: {$strongSide}
        - Posture Issues: {$postureProblems}
        - Mobility Restrictions: {$mobilityLimit}
        - Specific Movements to Avoid: {$avoidAreas}
        
        Coaching Directive:
        1. PERSONALIZATION: Always tailor your coaching response to the user's specific injuries, allergies, training location, and goals. NEVER recommend movements they must avoid or foods they are allergic to.
        2. STYLE: Direct, expert, highly motivating, science-backed. Sound like a dedicated premium private trainer. Use 1-2 emojis max per response.
        3. SAFETY: If the user mentions pain, refer to their pain points or injuries, and provide safe, modification exercises. Never give medical diagnoses; advise seeking professional care if pain persists.
        4. NUTRITION BOUNDARY: Do not generate meal plans, recipes, or meal replacements. The app's local Nutrition module owns all meal generation and replacement. If asked for a meal plan or meal swap, tell the user to use the Nutrition Plan screen and only provide high-level macro or habit guidance.
        5. BREVITY: Keep answers concise and direct. Avoid generic introductory filler like "Sure, I can help with that!". Dive straight into high-value information. Keep responses to 2-4 sentences for questions, or structured lists up to 8 sentences if planning.
        PROMPT;
    }
}
?>
