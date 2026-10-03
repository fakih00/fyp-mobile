<?php

/**
 * GeminiService.php
 *
 * Optional conversational wrapper used only by the AI Chat screen.
 * Core project AI modules remain local/custom: PoseForm, TrainCore, NutriCore,
 * ProgressAI, Recovery, and Competition do not depend on this service.
 */
class GeminiService {
    private $apiKey;
    private $modelEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    public function __construct() {
        $this->apiKey = getenv('GEMINI_API_KEY');
    }

    public function isAvailable(): bool {
        return !empty($this->apiKey) && $this->apiKey !== 'YOUR_GEMINI_API_KEY_HERE';
    }

    public function chat(array $history, string $systemInstruction = ''): ?string {
        if (!$this->isAvailable()) {
            return null;
        }

        $contents = array_map(function ($msg) {
            return [
                'role' => $msg['role'] === 'user' ? 'user' : 'model',
                'parts' => [['text' => (string)($msg['text'] ?? '')]]
            ];
        }, $history);

        $payload = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => 0.65,
                'maxOutputTokens' => 700,
            ],
        ];

        if ($systemInstruction !== '') {
            $payload['systemInstruction'] = [
                'parts' => [['text' => $systemInstruction]]
            ];
        }

        $url = $this->modelEndpoint . '?key=' . urlencode($this->apiKey);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 25);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            error_log("GeminiService chat failed (HTTP {$httpCode}).");
            return null;
        }

        $decoded = json_decode($response, true);
        return $decoded['candidates'][0]['content']['parts'][0]['text'] ?? null;
    }
}
?>
