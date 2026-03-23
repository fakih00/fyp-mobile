<?php
/**
 * File-based rate limiter. No Redis or external dependencies needed.
 * Tracks request counts per IP in a temp directory.
 */
class RateLimiter {
    private $storageDir;

    public function __construct() {
        $this->storageDir = sys_get_temp_dir() . '/fitness_rate_limit';
        if (!is_dir($this->storageDir)) {
            @mkdir($this->storageDir, 0700, true);
        }
    }

    /**
     * Check if the request is within rate limits.
     * @param string $key Unique identifier (e.g., IP or IP+endpoint)
     * @param int $maxAttempts Max attempts allowed
     * @param int $windowSeconds Time window in seconds
     * @return bool True if allowed, false if rate limited
     */
    public function check($key, $maxAttempts = 60, $windowSeconds = 60) {
        $file = $this->storageDir . '/' . md5($key) . '.json';

        $data = ['attempts' => [], 'blocked_until' => 0];
        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true) ?: $data;
        }

        $now = time();

        // Check if currently blocked
        if (isset($data['blocked_until']) && $data['blocked_until'] > $now) {
            $retryAfter = $data['blocked_until'] - $now;
            header("Retry-After: $retryAfter");
            return false;
        }

        // Clean old attempts outside the window
        $data['attempts'] = array_filter($data['attempts'], function ($t) use ($now, $windowSeconds) {
            return ($now - $t) < $windowSeconds;
        });
        $data['attempts'] = array_values($data['attempts']);

        // Check count
        if (count($data['attempts']) >= $maxAttempts) {
            $data['blocked_until'] = $now + $windowSeconds;
            file_put_contents($file, json_encode($data), LOCK_EX);
            header("Retry-After: $windowSeconds");
            return false;
        }

        // Record this attempt
        $data['attempts'][] = $now;
        file_put_contents($file, json_encode($data), LOCK_EX);

        return true;
    }

    /**
     * Get the client IP address.
     */
    public static function getClientIP() {
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }

    /**
     * Enforce rate limit — sends 429 and exits if exceeded.
     */
    public function enforce($key, $maxAttempts = 60, $windowSeconds = 60) {
        if (!$this->check($key, $maxAttempts, $windowSeconds)) {
            http_response_code(429);
            echo json_encode(["message" => "Too many requests. Please try again later."]);
            exit;
        }
    }
}
?>
