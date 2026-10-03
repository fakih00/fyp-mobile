<?php
/**
 * Centralized CORS and Preflight handler.
 * Include this at the top of every API endpoint file.
 */
require_once __DIR__ . '/../config/env.php';

// Read allowed origins from .env
$allowedOriginsStr = getenv('CORS_ORIGINS') ?: 'http://localhost:8081,http://127.0.0.1:8081';
$allowedOrigins = array_map('trim', explode(',', $allowedOriginsStr));

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    // For mobile apps that don't send an Origin header, allow the request
    // but don't set CORS headers (browser requests from disallowed origins will be blocked)
    if (!empty($origin)) {
        // Disallowed origin — still process the request but CORS will block in browser
    }
}

header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
?>
