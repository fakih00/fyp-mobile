<?php
class User {
    private $conn;
    private $table_name = "users";

    public $id;
    public $email;
    public $password_hash;
    public $name;
    public $created_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create new user
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " SET name=:name, email=:email, password_hash=:password_hash";
        $stmt = $this->conn->prepare($query);

        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->email = htmlspecialchars(strip_tags($this->email));
        // password_hash is already hashed and should not be sanitized as it might corrupt the hash

        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":password_hash", $this->password_hash);

        try {
            if($stmt->execute()) {
                // Get the ID of the newly created user
                $this->id = $this->conn->lastInsertId();

                // Create a default profile entry with dummy data (will be updated during onboarding)
                $profileQuery = "INSERT INTO user_profiles 
                    (user_id, age, gender, height, weight, goal, activity_level, bmi) 
                    VALUES 
                    (:user_id, 0, 'male', 170, 70, 'maintain', 'moderately_active', 24.22)";
                $profileStmt = $this->conn->prepare($profileQuery);
                
                if (!$profileStmt) {
                    return false;
                }

                $profileStmt->bindParam(":user_id", $this->id);
                
                if($profileStmt->execute()){
                    return true;
                } 
            }
        } catch (PDOException $e) {
            // Return false on duplicate entry or other DB errors
            return false;
        }
        return false;
    }

    // Check if email exists
    public function emailExists() {
        $query = "SELECT id, name, password_hash FROM " . $this->table_name . " WHERE email = ? LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->email);
        $stmt->execute();
        $num = $stmt->rowCount();

        if($num > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->id = $row['id'];
            $this->name = $row['name'];
            $this->password_hash = $row['password_hash'];
            return true;
        }
        return false;
    }
}
?>
