<?php
require_once __DIR__ . '/env.php';

class Database {
    public $conn;

    public function getConnection() {
        $this->conn = null;

        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $db   = getenv('DB_NAME') ?: 'fitness_db';
        $user = getenv('DB_USER') ?: 'root';
        $pass = getenv('DB_PASS') ?: '';

        try {
            $this->conn = new PDO(
                "mysql:host={$host};dbname={$db};charset=utf8mb4",
                $user,
                $pass,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,  // Use real prepared statements
                    PDO::ATTR_TIMEOUT            => 5,
                ]
            );
        } catch (PDOException $exception) {
            http_response_code(500);
            echo json_encode(["message" => "Database connection error"]);
            exit;
        }

        return $this->conn;
    }
}
?>
