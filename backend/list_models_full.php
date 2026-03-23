<?php
$url = 'https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyDQSMGuq4wB-MlTY-3viau3379CUelNVtg';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
$data = json_decode($response, true);
foreach ($data['models'] as $m) {
    echo $m['name'] . " | " . implode(',', $m['supportedGenerationMethods']) . "\n";
}
