<?php
require_once __DIR__ . '/BaseController.php';

class UserController extends BaseController {
    
    public function getUser() {
        // Auth: derive user_id from token
        $current_user_id = $this->requireAuth();
        $user_id = $current_user_id;

        if (isset($_GET['user_id']) && !empty($_GET['user_id'])) {
            $user_id = (int)$_GET['user_id'];
        }

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
            $stmtWorkouts = $this->db->prepare("SELECT plan_data FROM workouts WHERE user_id = ?");
            $stmtWorkouts->execute([$user_id]);
            $workoutsCount = 0;
            foreach ($stmtWorkouts->fetchAll(PDO::FETCH_COLUMN) as $planJson) {
                $sessions = json_decode($planJson, true) ?: [];
                if (isset($sessions['day'])) $sessions = [$sessions];
                foreach ($sessions as $session) if (is_array($session) && !empty($session['completed'])) $workoutsCount++;
            }

            // Friends count
            $stmtFriends = $this->db->prepare("SELECT COUNT(DISTINCT CASE WHEN user_id = ? THEN friend_id ELSE user_id END) as count FROM friends WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'");
            $stmtFriends->execute([$user_id, $user_id, $user_id]);
            $friendsCount = $stmtFriends->fetch(PDO::FETCH_ASSOC)['count'];

            // Clubs count
            $stmtClubs = $this->db->prepare("SELECT COUNT(*) as count FROM club_members WHERE user_id = ?");
            $stmtClubs->execute([$user_id]);
            $clubsCount = $stmtClubs->fetch(PDO::FETCH_ASSOC)['count'];

            // Achievements
            $stmtAch = $this->db->prepare("
                SELECT a.title, a.icon, ua.earned_at
                FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.user_id = ?
                ORDER BY ua.earned_at DESC, a.id DESC
                LIMIT 5
            ");
            $stmtAch->execute([$user_id]);
            $achievements = $stmtAch->fetchAll(PDO::FETCH_ASSOC);

            $response = [
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
                    "theme" => $row['theme'] ?? 'Emerald',
                    "injuries" => $row['injuries'] ?? null,
                    "pain_points" => $row['pain_points'] ?? null,
                    "strong_side" => $row['strong_side'] ?? null,
                    "posture_problems" => $row['posture_problems'] ?? null,
                    "mobility_limitations" => $row['mobility_limitations'] ?? null,
                    "avoid_areas" => $row['avoid_areas'] ?? null,
                    "chronic_pain" => $row['chronic_pain'] ?? null,
                    "sleep_hours" => $row['sleep_hours'] ?? 7,
                    "stress_level" => $row['stress_level'] ?? 'medium',
                    "notification_preferences" => json_decode($row['notification_preferences'] ?? '{}', true) ?: []
                ],
                "stats" => [
                    "workouts" => $workoutsCount,
                    "friends" => $friendsCount,
                    "clubs" => $clubsCount
                ],
                "achievements" => $achievements
            ];
            if ((int)$user_id !== (int)$current_user_id) {
                unset($response['email']);
                $response['profile'] = array_intersect_key($response['profile'], array_flip(['level','xp','points','streak','nextLevelXp','avatar']));
            }
            $this->jsonResponse($response);
        } else {
            $this->errorResponse("User not found", 404);
        }
    }

    public function getUsers() {
        $user_id = $this->requireAuth();
        
        $query = "SELECT u.id, u.name, up.level, up.points, up.xp, up.avatar,
                         CASE WHEN sent.status = 'accepted' OR received.status = 'accepted' THEN 'accepted'
                              ELSE COALESCE(sent.status, received.status) END as friendship_status,
                         CASE WHEN received.status = 'pending' THEN 'incoming'
                              WHEN sent.status = 'pending' THEN 'outgoing' ELSE NULL END as request_direction
                  FROM users u
                  JOIN user_profiles up ON u.id = up.user_id
                  LEFT JOIN friends sent ON sent.user_id = ? AND sent.friend_id = u.id
                  LEFT JOIN friends received ON received.user_id = u.id AND received.friend_id = ?
                  WHERE u.id != ?";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id, $user_id, $user_id]);
        
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($users as &$u) {
            $u['avatar'] = $u['avatar'] ?: "https://i.pravatar.cc/150?u=" . urlencode($u['name']);
            $u['friendship_status'] = $u['friendship_status'] ?: 'none';
        }
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
            'mobility_limitations', 'avoid_areas', 'chronic_pain', 'theme', 'notification_preferences'
        ];

        // String fields that need sanitization
        $textFields = ['gender', 'goal', 'activity_level', 'training_location', 
                       'training_intensity', 'likes', 'dislikes', 'allergies', 'job_type', 'avatar',
                       'injuries', 'pain_points', 'strong_side', 'posture_problems',
                       'mobility_limitations', 'avoid_areas', 'chronic_pain', 'theme'];
        $data = $this->sanitizeFields($data, $textFields);

        if (isset($data->name) && trim((string)$data->name) === '') $this->errorResponse('Name cannot be empty.', 400);
        foreach (['age' => [1, 120], 'weight' => [20, 400], 'height' => [80, 250], 'training_days_per_week' => [1, 7], 'meals_per_day' => [1, 8], 'sleep_hours' => [0, 24]] as $field => [$min, $max]) {
            if (isset($data->$field) && (!is_numeric($data->$field) || $data->$field < $min || $data->$field > $max)) {
                $this->errorResponse("Invalid {$field}.", 400);
            }
        }
        if (isset($data->notification_preferences)) {
            $preferences = (array)$data->notification_preferences;
            $filtered = [];
            foreach (['enabled', 'friendRequests', 'communityUpdates', 'activityUpdates'] as $key) {
                if (isset($preferences[$key])) $filtered[$key] = (bool)$preferences[$key];
            }
            $data->notification_preferences = json_encode($filtered);
        }
        if (isset($data->avatar) && str_starts_with($data->avatar, 'data:image/')) {
            if (!preg_match('#^data:image/(jpeg|png|webp);base64,(.+)$#s', $data->avatar, $match)) $this->errorResponse('Unsupported profile image.', 400);
            $bytes = base64_decode($match[2], true);
            $info = $bytes !== false ? @getimagesizefromstring($bytes) : false;
            if (!$info || strlen($bytes) > 6 * 1024 * 1024 || !in_array($info['mime'], ['image/jpeg','image/png','image/webp'], true)) $this->errorResponse('Choose a valid profile image under 6 MB.', 400);
            $folder = __DIR__ . '/../uploads/avatars';
            if (!is_dir($folder) && !mkdir($folder, 0775, true)) $this->errorResponse('Profile image storage unavailable.', 500);
            $extension = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$info['mime']];
            $filename = bin2hex(random_bytes(16)) . '.' . $extension;
            if (file_put_contents($folder . '/' . $filename, $bytes) === false) $this->errorResponse('Could not save profile image.', 500);
            $scheme = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http';
            $data->avatar = $scheme . '://' . $_SERVER['HTTP_HOST'] . '/uploads/avatars/' . $filename;
        }

        $updates = [];
        $params = [':user_id' => $user_id];

        foreach ($allowedFields as $field) {
            if (isset($data->$field)) {
                $updates[] = "$field = :$field";
                $params[":$field"] = $data->$field;
            }
        }

        if (empty($updates) && !isset($data->name)) {
            $this->errorResponse("No fields to update", 400);
        }

        $this->db->beginTransaction();
        try {
            if ($updates) {
                $query = "UPDATE user_profiles SET " . implode(", ", $updates) . " WHERE user_id = :user_id";
                $this->db->prepare($query)->execute($params);
            }
            if (isset($data->name)) {
                $this->db->prepare('UPDATE users SET name = ? WHERE id = ?')->execute([trim($data->name), $user_id]);
            }
            $this->db->commit();
        } catch (Throwable $error) {
            $this->db->rollBack();
            $this->errorResponse('Failed to save profile.', 500);
        }
        $this->jsonResponse(['message' => 'User updated successfully', 'avatar' => $data->avatar ?? null]);
    }

    public function getFriends() {
        $user_id = $this->requireAuth();

        $query = "SELECT u.id, u.name, up.level, up.points, up.xp, up.avatar,
                         CASE WHEN u.last_seen >= NOW() - INTERVAL 2 MINUTE THEN 'Online' ELSE 'Offline' END as status
                  FROM users u
                  JOIN user_profiles up ON u.id = up.user_id
                  WHERE u.id != ? AND EXISTS (
                      SELECT 1 FROM friends f WHERE f.status = 'accepted' AND
                      ((f.user_id = ? AND f.friend_id = u.id) OR (f.friend_id = ? AND f.user_id = u.id))
                  ) ORDER BY u.name, u.id";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id, $user_id, $user_id]);
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

        $target = $this->db->prepare('SELECT id FROM users WHERE id = ?');
        $target->execute([$data->friend_id]);
        if (!$target->fetchColumn()) $this->errorResponse('User not found.', 404);
        $existing = $this->db->prepare("SELECT status FROM friends WHERE
            (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)");
        $existing->execute([$user_id, $data->friend_id, $data->friend_id, $user_id]);
        $statuses = $existing->fetchAll(PDO::FETCH_COLUMN);
        if ($statuses) {
            $this->jsonResponse(['message' => in_array('accepted', $statuses, true) ? 'Already friends.' : 'A friend request already exists.']);
        }

        $query = "INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')
                  ON DUPLICATE KEY UPDATE status = status";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute([$user_id, $data->friend_id])) {
            $stmtSender = $this->db->prepare("SELECT name FROM users WHERE id = ?");
            $stmtSender->execute([$user_id]);
            $senderName = $stmtSender->fetchColumn() ?: "Someone";
            $this->createNotification(
                $data->friend_id,
                "New Friend Request",
                "{$senderName} wants to connect with you.",
                "friend_request",
                "person-add",
                "#10B981"
            );
            $this->jsonResponse(["message" => "Friend request sent"]);
        } else {
            $this->errorResponse("Failed to send request", 500);
        }
    }

    public function getFriendRequests() {
        $user_id = $this->requireAuth();

        $query = "SELECT u.id, u.name, up.level, up.avatar
                  FROM friends f
                  JOIN users u ON f.user_id = u.id
                  JOIN user_profiles up ON u.id = up.user_id
                  WHERE f.friend_id = ? AND f.status = 'pending'";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($requests as &$request) {
            $request['avatar'] = $request['avatar'] ?: "https://i.pravatar.cc/150?u=" . urlencode($request['name']);
        }
        $this->jsonResponse(["records" => $requests]);
    }

    public function respondToFriendRequest() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->friend_id) || empty($data->action)) {
            $this->errorResponse("Missing required fields", 400);
        }

        if (!in_array($data->action, ['accept', 'decline'], true)) $this->errorResponse('Invalid friend request action.', 400);
        $pending = $this->db->prepare("SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'pending'");
        $pending->execute([$data->friend_id, $user_id]);
        if (!$pending->fetchColumn()) $this->errorResponse('Pending request not found.', 404);

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
            $stmt = $this->db->prepare("DELETE FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'pending'");
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
                      WHERE u.id = ? OR EXISTS (
                          SELECT 1 FROM friends f WHERE f.status = 'accepted'
                          AND ((f.user_id = ? AND f.friend_id = u.id)
                            OR (f.friend_id = ? AND f.user_id = u.id))
                      )
                      ORDER BY up.xp DESC, u.id ASC";
        } else {
            $query = "SELECT u.id, u.name, up.xp, up.level, up.avatar
                      FROM users u
                      JOIN user_profiles up ON u.id = up.user_id
                      ORDER BY up.xp DESC, u.id ASC";
        }

        $stmt = $this->db->prepare($query);
        if ($mode === 'Friends') {
            $stmt->execute([$user_id, $user_id, $user_id]);
        } else {
            $stmt->execute();
        }
        $rankings = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add rank and handle avatar
        foreach ($rankings as $index => &$r) {
            $r['rank'] = $index + 1;
            $r['xp'] = (int)$r['xp'];
            $r['level'] = (int)$r['level'];
            $r['avatar_url'] = $r['avatar'];
            $r['avatar'] = $r['avatar'] ? null : strtoupper(substr($r['name'], 0, 1));
        }

        $this->jsonResponse(["records" => $rankings]);
    }
}
