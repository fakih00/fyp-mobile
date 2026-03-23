<?php
/**
 * GeminiService.php
 * 
 * A reusable wrapper for Google Gemini 1.5 Flash API.
 * Handles prompt sending and parses structured JSON responses.
 * Falls back gracefully if the API key is not configured.
 * 
 * Free Tier Limits: 15 requests/min, 1500 requests/day
 * Get your free key at: https://aistudio.google.com/app/apikey
 */
class GeminiService {

    private $apiKey;
    private $modelEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    public function __construct() {
        $this->apiKey = getenv('GEMINI_API_KEY');
    }

    /**
     * Check if the Gemini API key is configured and usable.
     */
    public function isAvailable(): bool {
        return !empty($this->apiKey) && $this->apiKey !== 'YOUR_GEMINI_API_KEY_HERE';
    }

    /**
     * Send a prompt to Gemini and get a text response.
     * 
     * @param string $prompt The prompt to send.
     * @param string $systemInstruction Optional system-level instruction.
     * @return string|null The text response, or null on failure.
     */
    public function ask(string $prompt, string $systemInstruction = ''): ?string {
        if (!$this->isAvailable()) {
            return null;
        }

        $url = $this->modelEndpoint . '?key=' . $this->apiKey;

        $payload = [
            'contents' => [
                ['role' => 'user', 'parts' => [['text' => $prompt]]]
            ],
            'generationConfig' => [
                'temperature'     => 0.7,
                'maxOutputTokens' => 8192,
            ]
        ];

        // Add system instruction if provided
        if (!empty($systemInstruction)) {
            $payload['systemInstruction'] = [
                'parts' => [['text' => $systemInstruction]]
            ];
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            error_log("GeminiService Error (HTTP $httpCode): $response");
            return null;
        }

        $decoded = json_decode($response, true);
        return $decoded['candidates'][0]['content']['parts'][0]['text'] ?? null;
    }

    /**
     * Send a prompt and attempt to parse the response as a JSON object/array.
     * Gemini is instructed to return ONLY valid JSON.
     *
     * @param string $prompt The prompt to send.
     * @param string $systemInstruction Optional system instruction.
     * @return array|null Parsed JSON array, or null on failure.
     */
    public function askForJson(string $prompt, string $systemInstruction = ''): ?array {
        set_time_limit(120); // Extend PHP execution limit for this AI call
        $fullSystemInstruction = "You are a JSON API. ALWAYS respond with valid, raw JSON only. No markdown, no explanation, no code fences. Just the JSON object or array.";
        if (!empty($systemInstruction)) {
            $fullSystemInstruction .= "\n\n" . $systemInstruction;
        }

        $url = $this->modelEndpoint . '?key=' . $this->apiKey;
        
        $payload = [
            'contents' => [
                ['role' => 'user', 'parts' => [['text' => $prompt]]]
            ],
            'systemInstruction' => [
                'parts' => [['text' => $fullSystemInstruction]]
            ],
            'generationConfig' => [
                'temperature'      => 0.2,
                'responseMimeType' => 'application/json',
                // Disable thinking mode — gemini-2.5-flash spends 15-30s thinking by
                // default. For structured JSON generation, thinking is unnecessary.
                'thinkingConfig'   => ['thinkingBudget' => 0],
            ],
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 45); // 45s for Gemini (2x plans sequential = 90s < 120s limit)
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            error_log("GeminiService JSON Error (HTTP $httpCode): $response");
            return null;
        }

        $decoded = json_decode($response, true);
        $candidate = $decoded['candidates'][0] ?? null;
        
        if (!$candidate) {
            error_log("GeminiService: No candidates in response: " . json_encode($decoded));
            return null;
        }

        $finishReason = $candidate['finishReason'] ?? 'UNKNOWN';
        if ($finishReason !== 'STOP') {
            error_log("GeminiService: Warning - finishReason is $finishReason");
            // We can still try to parse if it's truncated, but usually it fails
        }

        $rawText = $candidate['content']['parts'][0]['text'] ?? null;

        if ($rawText === null) {
            error_log("GeminiService: No text in JSON response");
            return null;
        }

        // Clean up text
        $cleanText = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', trim($rawText));
        $cleanText = trim($cleanText);

        $parsed = json_decode($cleanText, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("GeminiService JSON Parse Error (" . json_last_error_msg() . ")");
            error_log("FinishReason: $finishReason");
            error_log("Raw Text snippet: " . substr($rawText, 0, 500));
            // Return null as we can't trust partial JSON
            return null;
        }

        return $parsed;
    }

    /**
     * Generate a chat completion — ideal for the AI Chat screen.
     * 
     * @param array $history Array of ['role' => 'user'|'model', 'text' => '...'] messages.
     * @param string $systemInstruction The AI persona/system prompt.
     * @return string|null The model's text reply, or null on failure.
     */
    public function chat(array $history, string $systemInstruction = ''): ?string {
        if (!$this->isAvailable()) {
            return null;
        }

        $url = $this->modelEndpoint . '?key=' . $this->apiKey;

        $contents = array_map(function ($msg) {
            return [
                'role' => $msg['role'],
                'parts' => [['text' => $msg['text']]]
            ];
        }, $history);

        $payload = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature'     => 0.8,
                'maxOutputTokens' => 1024,
            ]
        ];

        if (!empty($systemInstruction)) {
            $payload['systemInstruction'] = [
                'parts' => [['text' => $systemInstruction]]
            ];
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            error_log("GeminiService Chat Error (HTTP $httpCode): $response");
            return null;
        }

        $decoded = json_decode($response, true);
        return $decoded['candidates'][0]['content']['parts'][0]['text'] ?? null;
    }
}
?>
