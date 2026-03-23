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
