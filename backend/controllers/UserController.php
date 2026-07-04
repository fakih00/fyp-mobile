<?php
require_once __DIR__ . '/BaseController.php';

class UserController extends BaseController {
    
    public function getUser() {
        // Auth: derive user_id from token
        $user_id = $this->requireAuth();

        $query = "SELECT u.id, u.name, u.email, p.* 
                  FROM users u 
                  JOIN user_profiles p ON u.id = p.user_id 
                  WHERE u.id = ?";

        $stmt = $this->db->prepare($query);
        $stmt->bindParam(1, $user_id);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $nextLevelXp = $row['level'] * 1000;
            
            // Workouts count
            $stmtWorkouts = $this->db->prepare("SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND completed = 1");
            $stmtWorkouts->execute([$user_id]);
            $workoutsCount = $stmtWorkouts->fetch(PDO::FETCH_ASSOC)['count'];

            // Friends count
            $stmtFriends = $this->db->prepare("SELECT COUNT(*) as count FROM friends WHERE user_id = ? AND status = 'accepted'");
            $stmtFriends->execute([$user_id]);
            $friendsCount = $stmtFriends->fetch(PDO::FETCH_ASSOC)['count'];

            // Clubs count
            $stmtClubs = $this->db->prepare("SELECT COUNT(*) as count FROM club_members WHERE user_id = ?");
            $stmtClubs->execute([$user_id]);
            $clubsCount = $stmtClubs->fetch(PDO::FETCH_ASSOC)['count'];

            // Achievements
            $stmtAch = $this->db->prepare("
                SELECT c.title, c.type, uc.status, uc.progress 
                FROM user_challenges uc 
                JOIN challenges c ON uc.challenge_id = c.id 
                WHERE uc.user_id = ? AND uc.status = 'completed'
                ORDER BY uc.challenge_id DESC 
                LIMIT 5
            ");
            $stmtAch->execute([$user_id]);
            $achievements = $stmtAch->fetchAll(PDO::FETCH_ASSOC);

            $this->jsonResponse([
                "id" => $row['id'],
                "name" => $row['name'],
                "email" => $row['email'],
                "profile" => [
                    "weight" => $row['weight'],
                    "height" => $row['height'],
                    "age" => $row['age'],
                    "gender" => $row['gender'],
                    "level" => $row['level'],
                    "xp" => $row['xp'],
                    "points" => $row['points'],
                    "streak" => $row['streak'],
                    "nextLevelXp" => $nextLevelXp,
                    "goal" => $row['goal'],
                    "activity_level" => $row['activity_level'],
                    "training_location" => $row['training_location'],
                    "training_days_per_week" => $row['training_days_per_week'],
                    "training_intensity" => $row['training_intensity'],
                    "likes" => $row['likes'],
                    "dislikes" => $row['dislikes'],
                    "allergies" => $row['allergies'],
                    "meals_per_day" => $row['meals_per_day'],
                    "avatar" => $row['avatar'],
                    "injuries" => $row['injuries'] ?? null,
                    "pain_points" => $row['pain_points'] ?? null,
                    "strong_side" => $row['strong_side'] ?? null,
                    "posture_problems" => $row['posture_problems'] ?? null,
                    "mobility_limitations" => $row['mobility_limitations'] ?? null,
                    "avoid_areas" => $row['avoid_areas'] ?? null,
                    "chronic_pain" => $row['chronic_pain'] ?? null
                ],
                "stats" => [
                    "workouts" => $workoutsCount,
                    "friends" => $friendsCount,
                    "clubs" => $clubsCount
                ],
                "achievements" => $achievements
            ]);
        } else {
            $this->errorResponse("User not found", 404);
        }
    }

    public function getUsers() {
        $user_id = $this->requireAuth();
        
        $query = "SELECT u.id, u.name, up.level, up.points, up.avatar 
                  FROM users u
                  JOIN user_profiles up ON u.id = up.user_id
                  WHERE u.id != :user_id";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();
        
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->jsonResponse(["records" => $users]);
    }

    public function updateUser() {
        // Auth: only the authenticated user can update their own profile
        $user_id = $this->requireAuth();

        $data = $this->getRequestData();

        // Whitelist of allowed fields
        $allowedFields = [
            'weight', 'height', 'age', 'gender', 'goal', 
            'activity_level', 'training_location', 
            'training_days_per_week', 'training_intensity',
            'likes', 'dislikes', 'allergies', 'meals_per_day', 'avatar',
            'body_fat', 'waist_size', 'job_type', 'steps_estimate', 
            'sleep_hours', 'stress_level', 'suggested_goal_weight',
            'injuries', 'pain_points', 'strong_side', 'posture_problems',
            'mobility_limitations', 'avoid_areas', 'chronic_pain'
        ];

        // String fields that need sanitization
        $textFields = ['gender', 'goal', 'activity_level', 'training_location', 
                       'training_intensity', 'likes', 'dislikes', 'allergies', 'job_type', 'avatar',
                       'injuries', 'pain_points', 'strong_side', 'posture_problems',
                       'mobility_limitations', 'avoid_areas', 'chronic_pain'];
        $data = $this->sanitizeFields($data, $textFields);

        $updates = [];
        $params = [':user_id' => $user_id];

        foreach ($allowedFields as $field) {
            if (isset($data->$field)) {
                $updates[] = "$field = :$field";
                $params[":$field"] = $data->$field;
            }
        }

        if (empty($updates)) {
            $this->errorResponse("No fields to update", 400);
        }

        $query = "UPDATE user_profiles SET " . implode(", ", $updates) . " WHERE user_id = :user_id";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute($params)) {
            $this->jsonResponse(["message" => "User updated successfully"]);
        } else {
            $this->errorResponse("Failed to update user", 500);
        }
    }

    public function getFriends() {
        $user_id = $this->requireAuth();

        $query = "SELECT u.id, u.name, up.level, up.points, up.avatar, f.status
                  FROM friends f
                  JOIN users u ON f.friend_id = u.id
                  JOIN user_profiles up ON u.id = up.user_id
                  WHERE f.user_id = ? AND f.status = 'accepted'";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $friends = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add avatar URL
        foreach ($friends as &$f) {
            $f['avatar'] = $f['avatar'] ?: "https://i.pravatar.cc/150?u=" . urlencode($f['name']);
        }

        $this->jsonResponse(["records" => $friends]);
    }

    public function addFriend() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->friend_id)) {
            $this->errorResponse("Missing friend_id", 400);
        }

        // Prevent self-friending
        if ($data->friend_id == $user_id) {
            $this->errorResponse("Cannot add yourself as a friend", 400);
        }

        $query = "INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')
                  ON DUPLICATE KEY UPDATE status = status";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute([$user_id, $data->friend_id])) {
            $this->jsonResponse(["message" => "Friend request sent"]);
        } else {
            $this->errorResponse("Failed to send request", 500);
        }
    }

    public function getFriendRequests() {
        $user_id = $this->requireAuth();

        $query = "SELECT u.id, u.name, up.level
                  FROM friends f
                  JOIN users u ON f.user_id = u.id
                  JOIN user_profiles up ON u.id = up.user_id
                  WHERE f.friend_id = ? AND f.status = 'pending'";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $this->jsonResponse(["records" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    public function respondToFriendRequest() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->friend_id) || empty($data->action)) {
            $this->errorResponse("Missing required fields", 400);
        }

        if ($data->action === 'accept') {
            $this->db->beginTransaction();
            try {
                // Update existing request
                $stmt = $this->db->prepare("UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ?");
                $stmt->execute([$data->friend_id, $user_id]);

                // Create reciprocal friendship
                $stmt2 = $this->db->prepare("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'accepted') 
                                             ON DUPLICATE KEY UPDATE status = 'accepted'");
                $stmt2->execute([$user_id, $data->friend_id]);

                $this->db->commit();
                $this->jsonResponse(["message" => "Friend request accepted"]);
            } catch (Exception $e) {
                $this->db->rollBack();
                $this->errorResponse("Action failed", 500);
            }
        } else {
            $stmt = $this->db->prepare("DELETE FROM friends WHERE user_id = ? AND friend_id = ?");
            if ($stmt->execute([$data->friend_id, $user_id])) {
                $this->jsonResponse(["message" => "Friend request declined"]);
            } else {
                $this->errorResponse("Action failed", 500);
            }
        }
    }

    public function addXP() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (!isset($data->amount)) {
            $this->errorResponse("Missing amount", 400);
        }

        $result = $this->performAddXP($user_id, $data->amount);
        if ($result) {
            $this->jsonResponse($result);
        } else {
            $this->errorResponse("Failed to update XP", 500);
        }
    }

    public function performAddXP($user_id, $amount) {
        // Fetch current profile
        $stmt = $this->db->prepare("SELECT level, xp, points FROM user_profiles WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$profile) return null;

        $level = (int)$profile['level'];
        $xp = (int)$profile['xp'] + (int)$amount;
        $points = (int)$profile['points'];
        $levelUp = false;

        $nextLevelXp = $level * 1000;

        while ($xp >= $nextLevelXp) {
            $xp -= $nextLevelXp;
            $level++;
            $points += 100; // Reward for level up
            $levelUp = true;
            $nextLevelXp = $level * 1000;
        }

        $updateQuery = "UPDATE user_profiles SET level = ?, xp = ?, points = ? WHERE user_id = ?";
        $updateStmt = $this->db->prepare($updateQuery);
        
        if ($updateStmt->execute([$level, $xp, $points, $user_id])) {
            if ($levelUp) {
                // Check level-based achievements after leveling up
                require_once __DIR__ . '/AchievementController.php';
                $achCtrl = new AchievementController($this->db);
                $achCtrl->checkAndAward($user_id, 'level');
            }
            return [
                "message" => $levelUp ? "Congratulations! You reached level $level!" : "XP added successfully",
                "level" => $level,
                "xp" => $xp,
                "points" => $points,
                "level_up" => $levelUp,
                "xp_added" => $amount
            ];
        }
        return null;
    }

    public function getLeaderboard() {
        $user_id = $this->requireAuth();
        $mode = isset($_GET['mode']) ? $_GET['mode'] : 'Global';

        if ($mode === 'Friends') {
            $query = "SELECT u.id, u.name, up.xp, up.level, up.avatar
                      FROM users u
                      JOIN user_profiles up ON u.id = up.user_id
                      WHERE u.id = :user_id OR u.id IN (
                          SELECT friend_id FROM friends WHERE user_id = :user_id AND status = 'accepted'
                      )
                      ORDER BY up.xp DESC LIMIT 100";
        } else {
            $query = "SELECT u.id, u.name, up.xp, up.level, up.avatar
                      FROM users u
                      JOIN user_profiles up ON u.id = up.user_id
                      ORDER BY up.xp DESC LIMIT 100";
        }

        $stmt = $this->db->prepare($query);
        if ($mode === 'Friends') {
            $stmt->bindParam(":user_id", $user_id);
        }
        $stmt->execute();
        $rankings = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add rank and handle avatar
        foreach ($rankings as $index => &$r) {
            $r['rank'] = $index + 1;
            $r['avatar_url'] = $r['avatar'];
            $r['avatar'] = $r['avatar'] ? null : strtoupper(substr($r['name'], 0, 1));
        }

        $this->jsonResponse(["records" => $rankings]);
    }
}
