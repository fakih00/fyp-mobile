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
                   p.level, p.streak, p.xp
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

        $this->jsonResponse([
            "reply" => $reply,
            "ai_powered" => true
        ]);
    }

    private function buildSystemPrompt($profile): string {
        if (!$profile) {
            return "You are an elite AI fitness coach. Be concise, motivating, and science-backed. Keep responses under 3 sentences unless the user asks for a detailed plan.";
        }

        $goal      = str_replace('_', ' ', $profile['goal'] ?? 'general fitness');
        $name      = $profile['name'] ?? 'Champion';
        $weight    = $profile['weight'] ?? '?';
        $age       = $profile['age'] ?? '?';
        $gender    = $profile['gender'] ?? 'person';
        $level     = $profile['level'] ?? 1;
        $streak    = $profile['streak'] ?? 0;
        $intensity = $profile['training_intensity'] ?? 'moderate';
        $location  = $profile['training_location'] ?? 'gym';
        $days      = $profile['training_days_per_week'] ?? 3;

        return <<<PROMPT
        You are an elite, world-class AI Personal Trainer and Nutrition Coach named "Coach Elite".
        
        You are currently coaching a user named {$name} with the following profile:
        - Goal: {$goal}
        - Age: {$age}, Gender: {$gender}, Weight: {$weight}kg
        - Training: {$days} days/week, {$intensity} intensity, at a {$location}
        - App Level: {$level}, Current Streak: {$streak} days
        
        Coaching Style Rules:
        1. Be direct, motivating, and science-backed. Think like a mix of a drill sergeant and a supportive mentor.
        2. ALWAYS personalize your response using the user's name or profile details when relevant.
        3. Keep responses CONCISE — 2-4 sentences for simple questions, up to 8 for detailed plans.
        4. If someone asks for a workout or meal plan, provide a brief but specific example.
        5. Use emojis sparingly (1-2 max per response) for energy and personality.
        6. If you don't have enough data to answer precisely, say so and ask a follow-up question.
        7. Never give medical advice. For injuries or health conditions, always recommend consulting a doctor.
        PROMPT;
    }
}
?>
