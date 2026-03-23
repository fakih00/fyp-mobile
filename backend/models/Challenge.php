<?php
class Challenge {
    private $conn;
    private $table_name = "challenges";

    public $id;
    public $title;
    public $description;
    public $type;
    public $points_reward;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function read() {
        $query = "SELECT * FROM " . $this->table_name;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    public function join($user_id, $challenge_id) {
        $query = "INSERT INTO user_challenges (user_id, challenge_id, status, progress) VALUES (:uid, :cid, 'joined', 0)";
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(":uid", $user_id);
        $stmt->bindParam(":cid", $challenge_id);

        if($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>
