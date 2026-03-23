<?php
require_once __DIR__ . '/BaseController.php';

class AuthController extends BaseController {
    
    public function login() {
        $data = $this->getRequestData();
        
        if (empty($data->email) || empty($data->password)) {
            $this->errorResponse("Missing email or password", 400);
        }

        // Sanitize email
        $email = filter_var($data->email, FILTER_SANITIZE_EMAIL);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->errorResponse("Invalid email format", 400);
        }

        require_once __DIR__ . '/../models/User.php';
        $user = new User($this->db);
        $user->email = $email;
        
        if ($user->emailExists() && password_verify($data->password, $user->password_hash)) {
            // Generate a cryptographically secure token
            $rawToken = bin2hex(random_bytes(32));
            
            // Hash it before storing in DB
            $tokenHash = hash('sha256', $rawToken);
            
            // Calculate expiration
            $ttlHours = (int)(getenv('TOKEN_TTL_HOURS') ?: 24);
            $expiresAt = date('Y-m-d H:i:s', strtotime("+{$ttlHours} hours"));
            
            $updateQuery = "UPDATE users SET api_token = :token, token_expires_at = :expires WHERE id = :id";
            $stmt = $this->db->prepare($updateQuery);
            $stmt->bindParam(":token", $tokenHash);
            $stmt->bindParam(":expires", $expiresAt);
            $stmt->bindParam(":id", $user->id);
            
            if ($stmt->execute()) {
                $this->jsonResponse([
                    "message" => "Successful login.",
                    "token" => $rawToken,  // Send the RAW token to the client
                    "user_id" => $user->id,
                    "name" => $user->name
                ]);
            } else {
                $this->errorResponse("Login failed. Unable to save session.", 503);
            }
        } else {
            // Intentionally vague message to prevent user enumeration
            $this->errorResponse("Invalid email or password.", 401);
        }
    }

    public function register() {
        $data = $this->getRequestData();
        
        if (empty($data->name) || empty($data->email) || empty($data->password)) {
            $this->errorResponse("Missing required fields", 400);
        }

        // Validate email
        $email = filter_var($data->email, FILTER_SANITIZE_EMAIL);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->errorResponse("Invalid email format", 400);
        }

        // Validate password strength
        if (strlen($data->password) < 8) {
            $this->errorResponse("Password must be at least 8 characters", 400);
        }

        // Sanitize name
        $name = $this->sanitize(trim($data->name));
        if (strlen($name) < 1 || strlen($name) > 100) {
            $this->errorResponse("Name must be between 1 and 100 characters", 400);
        }

        require_once __DIR__ . '/../models/User.php';
        $user = new User($this->db);
        
        $user->name = $name;
        $user->email = $email;
        $user->password_hash = password_hash($data->password, PASSWORD_DEFAULT);

        if ($user->emailExists()) {
            $this->errorResponse("Email already exists", 400);
        }

        if ($user->create()) {
            $this->jsonResponse(["message" => "User was created."], 201);
        } else {
            $this->errorResponse("Unable to create user.", 503);
        }
    }

    public function logout() {
        $userId = $this->requireAuth();

        $query = "UPDATE users SET api_token = NULL, token_expires_at = NULL WHERE id = ?";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute([$userId])) {
            $this->jsonResponse(["message" => "Logged out successfully."]);
        } else {
            $this->errorResponse("Logout failed.", 500);
        }
    }
}
