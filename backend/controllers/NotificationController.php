<?php
require_once __DIR__ . '/BaseController.php';

class NotificationController extends BaseController {
    
    public function getNotifications() {
        $user_id = $this->requireAuth();

        $query = "SELECT id, title, message, type, icon, color, is_read, created_at as time 
                  FROM notifications 
                  WHERE user_id = ? 
                  ORDER BY created_at DESC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $prefs = $this->db->prepare('SELECT notification_preferences FROM user_profiles WHERE user_id = ?');
        $prefs->execute([$user_id]);
        $settings = array_merge(['enabled' => true, 'friendRequests' => true, 'communityUpdates' => true, 'activityUpdates' => true], json_decode($prefs->fetchColumn() ?: '{}', true) ?: []);
        $notifications = array_values(array_filter($notifications, function ($notification) use ($settings) {
            if (!$settings['enabled']) return false;
            if ($notification['type'] === 'friend_request') return $settings['friendRequests'];
            if ($notification['type'] === 'social') return $settings['communityUpdates'];
            return $settings['activityUpdates'];
        }));

        foreach ($notifications as &$n) {
            $n['is_read'] = (bool)$n['is_read'];
        }

        $this->jsonResponse(["records" => $notifications]);
    }

    public function markAsRead() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->notification_id)) {
            $this->errorResponse("Missing notification_id", 400);
        }

        // Only mark own notifications as read
        $query = "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute([$data->notification_id, $user_id])) {
            $this->jsonResponse(["message" => "Notification marked as read"]);
        } else {
            $this->errorResponse("Failed to update notification", 500);
        }
    }

    public function markAllAsRead() {
        $user_id = $this->requireAuth();

        $query = "UPDATE notifications SET is_read = 1 WHERE user_id = ?";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute([$user_id])) {
            $this->jsonResponse(["message" => "All notifications marked as read"]);
        } else {
            $this->errorResponse("Failed to update notifications", 500);
        }
    }
}
