<?php
require_once __DIR__ . '/BaseController.php';

class ChallengeController extends BaseController {
    
    public function getChallenges() {
        $user_id = $this->requireAuth();
        
        // Fetch all challenges
        $query = "SELECT * FROM challenges";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $challenges = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Mark joined ones for the authenticated user
        $stmtJoined = $this->db->prepare("SELECT challenge_id, status, progress, expires_at FROM user_challenges WHERE user_id = ?");
        $stmtJoined->execute([$user_id]);
        $joined = $stmtJoined->fetchAll(PDO::FETCH_ASSOC);
        $joinedMap = [];
        foreach ($joined as $j) $joinedMap[$j['challenge_id']] = $j;

        foreach ($challenges as &$c) {
            $c['joined'] = isset($joinedMap[$c['id']]);
            if ($c['joined']) {
                $c['user_status'] = $joinedMap[$c['id']]['status'];
                $c['progress'] = $joinedMap[$c['id']]['progress'];
                $c['days_left'] = $this->calculateDaysLeft($joinedMap[$c['id']]['expires_at']);
            } else {
                $c['progress'] = 0;
                $c['days_left'] = $c['duration'];
            }
        }

        $this->jsonResponse(["records" => $challenges]);
    }

    public function getUserChallenges() {
        $user_id = $this->requireAuth();

        $query = "SELECT c.*, uc.status, uc.progress, uc.expires_at 
                  FROM user_challenges uc 
                  JOIN challenges c ON uc.challenge_id = c.id 
                  WHERE uc.user_id = ?";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($records as &$r) {
            $r['days_left'] = $this->calculateDaysLeft($r['expires_at']);
        }

        $this->jsonResponse(["records" => $records]);
    }

    public function join() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->challenge_id)) {
            $this->errorResponse("Missing challenge_id", 400);
        }

        // Check if user already has an active challenge
        $now = date('Y-m-d H:i:s');
        $checkStmt = $this->db->prepare("SELECT COUNT(*) FROM user_challenges WHERE user_id = ? AND status = 'joined' AND (expires_at IS NULL OR expires_at > ?)");
        $checkStmt->execute([$user_id, $now]);
        if ($checkStmt->fetchColumn() > 0) {
            $this->errorResponse("You can only participate in one active challenge at a time. Please leave or complete your current challenge first.", 403);
            return;
        }

        // Get challenge duration
        $stmtDuration = $this->db->prepare("SELECT duration FROM challenges WHERE id = ?");
        $stmtDuration->execute([$data->challenge_id]);
        $duration = $stmtDuration->fetchColumn();
        
        $joined_at = date('Y-m-d H:i:s');
        $expires_at = date('Y-m-d H:i:s', strtotime("+$duration days"));

        $query = "INSERT INTO user_challenges (user_id, challenge_id, status, joined_at, expires_at, progress) 
                  VALUES (?, ?, 'joined', ?, ?, 0) 
                  ON DUPLICATE KEY UPDATE status = 'joined', progress = 0, joined_at = ?, expires_at = ?";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute([$user_id, $data->challenge_id, $joined_at, $expires_at, $joined_at, $expires_at])) {
            $this->jsonResponse(["message" => "Challenge joined successfully"]);
        } else {
            $this->errorResponse("Join failed", 500);
        }
    }

    public function leaveChallenge() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->challenge_id)) {
            $this->errorResponse("Missing challenge_id", 400);
        }

        // User can only leave their own challenges
        $query = "DELETE FROM user_challenges WHERE user_id = ? AND challenge_id = ?";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute([$user_id, $data->challenge_id])) {
            $this->jsonResponse(["message" => "Left challenge successfully"]);
        } else {
            $this->errorResponse("Action failed", 500);
        }
    }

    public function completeChallenge() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->challenge_id)) {
            $this->errorResponse("Missing challenge_id", 400);
        }

        if ($this->completeChallengeInternal($user_id, $data->challenge_id)) {
            $this->jsonResponse(["message" => "Challenge completed! Points awarded."]);
        } else {
            $this->errorResponse("Action failed", 500);
        }
    }

    private function completeChallengeInternal($user_id, $challenge_id) {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("UPDATE user_challenges SET status = 'completed' WHERE user_id = ? AND challenge_id = ?");
            $stmt->execute([$user_id, $challenge_id]);

            $stmtPts = $this->db->prepare("SELECT points_reward FROM challenges WHERE id = ?");
            $stmtPts->execute([$challenge_id]);
            $pts = $stmtPts->fetchColumn();

            $stmtAward = $this->db->prepare("UPDATE user_profiles SET points = points + ?, xp = xp + ? WHERE user_id = ?");
            $stmtAward->execute([$pts, $pts * 2, $user_id]);

            $this->db->commit();

            $stmtC = $this->db->prepare("SELECT title FROM challenges WHERE id = ?");
            $stmtC->execute([$challenge_id]);
            $cTitle = $stmtC->fetchColumn();
            $this->createNotification(
                $user_id, 
                "Challenge Mastered! 🏆", 
                "You've completed the '{$cTitle}' challenge and earned {$pts} points. Keep going!", 
                "challenge", 
                "trophy", 
                "#F59E0B"
            );

            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function trackProgress($user_id, $type, $amount = 1) {
        $now = date('Y-m-d H:i:s');
        $query = "SELECT uc.challenge_id, c.goal_value, uc.progress 
                  FROM user_challenges uc
                  JOIN challenges c ON uc.challenge_id = c.id
                  WHERE uc.user_id = ? 
                  AND uc.status = 'joined' 
                  AND c.type = ?
                  AND (uc.expires_at IS NULL OR uc.expires_at > ?)";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id, $type, $now]);
        $activeRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($activeRows as $row) {
            $newProgress = $row['progress'] + $amount;
            if ($newProgress >= $row['goal_value']) {
                $this->completeChallengeInternal($user_id, $row['challenge_id']);
            } else {
                $upd = $this->db->prepare("UPDATE user_challenges SET progress = ? WHERE user_id = ? AND challenge_id = ?");
                $upd->execute([$newProgress, $user_id, $row['challenge_id']]);
            }
        }
    }

    private function calculateDaysLeft($expires_at) {
        if (!$expires_at) return null;
        $now = new DateTime();
        $expiry = new DateTime($expires_at);
        if ($expiry < $now) return 0;
        $diff = $now->diff($expiry);
        return $diff->days + 1;
    }
}
