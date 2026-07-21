<?php
/**
 * Auth Middleware — validates Bearer token, checks expiration, returns user_id.
 * 
 * Tokens are stored as SHA-256 hashes in the database.
 * The raw token is sent by the client; we hash it before lookup.
 */
class AuthMiddleware {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Authenticate the request.
     * Returns the user_id if valid, or sends 401 and exits.
     */
    public function authenticate() {
        $token = $this->extractToken();

        if (!$token) {
            http_response_code(401);
            echo json_encode(["message" => "Unauthorized. No token provided."]);
            exit;
        }

        // Hash the incoming token to match against DB
        $tokenHash = hash('sha256', $token);

        $query = "SELECT id FROM users WHERE api_token = ? AND token_expires_at > NOW() LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$tokenHash]);

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $userId = (int)$row['id'];
            
            // Update last_seen timestamp on request activity
            $stmtUpdate = $this->conn->prepare("UPDATE users SET last_seen = NOW() WHERE id = ?");
            $stmtUpdate->execute([$userId]);
            
            return $userId;
        }

        // Check if token exists but is expired
        $queryExpired = "SELECT id FROM users WHERE api_token = ? LIMIT 1";
        $stmtExpired = $this->conn->prepare($queryExpired);
        $stmtExpired->execute([$tokenHash]);

        if ($stmtExpired->rowCount() > 0) {
            http_response_code(401);
            echo json_encode(["message" => "Token expired. Please login again."]);
            exit;
        }

        http_response_code(401);
        echo json_encode(["message" => "Unauthorized. Invalid token."]);
        exit;
    }

    /**
     * Extract Bearer token from Authorization header only.
     * No query-string fallback (security risk).
     */
    private function extractToken() {
        $headers = $this->getHeaders();

        if (isset($headers['authorization'])) {
            $matches = [];
            if (preg_match('/Bearer\s(\S+)/', $headers['authorization'], $matches)) {
                return $matches[1];
            }
        }

        return null;
    }

    /**
     * Get all request headers in lowercase keys.
     */
    private function getHeaders() {
        if (function_exists('getallheaders')) {
            return array_change_key_case(getallheaders(), CASE_LOWER);
        }

        // Fallback for non-Apache servers
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (substr($key, 0, 5) === 'HTTP_') {
                $headerName = strtolower(str_replace('_', '-', substr($key, 5)));
                $headers[$headerName] = $value;
            }
        }
        return $headers;
    }
}
?>
