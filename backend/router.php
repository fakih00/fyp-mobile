<?php
/**
 * PHP Built-in Server Router Script
 * 
 * Usage: php -S 0.0.0.0:8000 router.php
 * 
 * Routes all /api/* requests to api/index.php.
 * Serves static files normally for non-API requests.
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// If the request is for the /api/ path, route to the centralized router
if (preg_match('#^/api(/|$)#', $uri)) {
    require __DIR__ . '/api/index.php';
    return true;
}

// For all other requests, let PHP's built-in server handle them
return false;
