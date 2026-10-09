<?php
require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../services/GeminiService.php';

/**
 * AIChatController.php
 * 
 * Handles Gemini-only conversational coaching.
 * Local modules own workout, meal, fridge, pose, and progress logic.
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

        $history = [];
        if (!empty($data->history) && is_array($data->history)) {
            foreach ($data->history as $msg) {
                $role = ($msg->role ?? '') === 'user' ? 'user' : 'model';
                $text = trim((string)($msg->text ?? ''));
                if ($text !== '') {
                    $history[] = ['role' => $role, 'text' => $text];
                }
            }
        }
        $history[] = ['role' => 'user', 'text' => (string)$data->message];

        $gemini = new GeminiService();
        if (!$gemini->isAvailable()) {
            $this->errorResponse('AI Coach is unavailable because Gemini has not been configured.', 503);
        }
        $reply = $gemini->chat($history, $this->buildChatSystemPrompt($profile ?: []));
        if ($reply === null || trim($reply) === '') {
            $this->errorResponse('Gemini could not respond right now. Please try again shortly.', 502);
        }

        // ── Persist both messages to the database ──────────────────────────
        $insert = $this->db->prepare(
            "INSERT INTO ai_chat_history (user_id, role, message) VALUES (?, ?, ?)"
        );
        $insert->execute([$user_id, 'user',  $data->message]);
        $insert->execute([$user_id, 'model', $reply]);

        $this->jsonResponse([
            "reply"      => $reply,
            "ai_powered" => true,
            "model" => "Gemini Chat Assistant"
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


    private function buildChatSystemPrompt(array $profile): string {
        $name = $profile['name'] ?? 'Champion';
        $goal = str_replace('_', ' ', $profile['goal'] ?? 'general fitness');
        $days = $profile['training_days_per_week'] ?? 3;
        $location = $profile['training_location'] ?? 'gym';
        $injuries = $profile['injuries'] ?? 'None';
        $allergies = $profile['allergies'] ?? 'None';
        $likes = $profile['likes'] ?? 'None specified';
        $dislikes = $profile['dislikes'] ?? 'None specified';

        return <<<PROMPT
You are the app's Gemini-powered conversational coach.

Important boundaries:
- Do not generate full workout plans. TrainCore AI, the local Python module, owns workout generation.
- Do not generate meal plans, fridge swaps, recipes, or meal replacements. NutriCore AI, the local Python module, owns nutrition decisions.
- Do not analyze exercise videos. PoseForm AI, the local Python module, owns video analysis.
- You may explain concepts, motivate, answer questions, give high-level habits, and tell the user which local module to use.
- If the user reports pain or medical symptoms, give conservative safety advice and recommend professional care for sharp, worsening, or persistent pain.

User context:
- Name: {$name}
- Goal: {$goal}
- Training days/week: {$days}
- Training location: {$location}
- Injuries: {$injuries}
- Allergies: {$allergies}
- Likes: {$likes}
- Dislikes: {$dislikes}

Style:
- Concise, practical, motivating.
- 2-5 sentences unless the user asks for details.
- Never claim you are the core AI module. You are only the chat interface.
PROMPT;
    }
}
?>
