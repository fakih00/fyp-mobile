<?php
$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyDQSMGuq4wB-MlTY-3viau3379CUelNVtg';
$payload = json_encode([
    'contents' => [['role' => 'user', 'parts' => [['text' => 'Say "OK" only']]]],
]);
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP $httpCode\n";
$data = json_decode($response, true);
if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
    echo "Reply: " . $data['candidates'][0]['content']['parts'][0]['text'] . "\n";
} else {
    echo $response . "\n";
}
