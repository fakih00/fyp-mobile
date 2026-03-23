<?php

require_once __DIR__ . '/../config/env.php';

class BaseController {
    protected $db;

    public function __construct($db = null) {
        if ($db) {
            $this->db = $db;
        } else {
            require_once __DIR__ . '/../config/database.php';
            $database = new Database();
            $this->db = $database->getConnection();
        }

        // Synchronize Timezone
        date_default_timezone_set('Asia/Beirut');
        $this->db->exec("SET time_zone = '+02:00'");
    }

    /**
     * Require authentication. Returns the authenticated user_id.
     * Sends 401 and exits if the token is invalid or expired.
     */
    protected function requireAuth() {
        require_once __DIR__ . '/../middleware/AuthMiddleware.php';
        $auth = new AuthMiddleware($this->db);
        return $auth->authenticate();
    }

    protected function jsonResponse($data, $status = 200) {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data);
        exit;
    }

    protected function getRequestData() {
        $data = json_decode(file_get_contents("php://input"));
        if ($data === null) {
            // Fallback to $_POST or $_GET if JSON body is empty
            return (object) array_merge($_GET, $_POST);
        }
        return $data;
    }

    protected function errorResponse($message, $status = 400) {
        $this->jsonResponse(["message" => $message], $status);
    }

    /**
     * Sanitize a string for safe output (prevent XSS).
     */
    protected function sanitize($value) {
        if (is_string($value)) {
            return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        }
        return $value;
    }

    /**
     * Sanitize an array of fields in a data object.
     */
    protected function sanitizeFields($data, $fields) {
        foreach ($fields as $field) {
            if (isset($data->$field) && is_string($data->$field)) {
                $data->$field = $this->sanitize($data->$field);
            }
        }
        return $data;
    }

    protected function createNotification($userId, $title, $message, $type = 'general', $icon = 'notifications', $color = '#10B981') {
        $query = "INSERT INTO notifications (user_id, title, message, type, icon, color) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($query);
        return $stmt->execute([$userId, $title, $message, $type, $icon, $color]);
    }

    protected function timeElapsedString($datetime, $full = false) {
        $now = new DateTime;
        $ago = new DateTime($datetime);
        $diff = $now->diff($ago);

        $diff->w = floor($diff->d / 7);
        $diff->d -= $diff->w * 7;

        $string = array(
            'y' => 'year',
            'm' => 'month',
            'w' => 'week',
            'd' => 'day',
            'h' => 'hour',
            'i' => 'minute',
            's' => 'second',
        );
        foreach ($string as $k => &$v) {
            if ($diff->$k) {
                $v = $diff->$k . ' ' . $v . ($diff->$k > 1 ? 's' : '');
            } else {
                unset($string[$k]);
            }
        }

        if (!$full) $string = array_slice($string, 0, 1);
        return $string ? implode(', ', $string) . ' ago' : 'just now';
    }
}
