<?php
require_once __DIR__ . '/BaseController.php';

class MessageController extends BaseController {
    
    public function getConversations() {
        $user_id = $this->requireAuth();

        $query = "SELECT 
                    CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as id,
                    u.name as name,
                    up.avatar as avatar,
                    m.content as last_message,
                    m.timestamp as last_message_time,
                    CASE WHEN u.last_seen >= NOW() - INTERVAL 2 MINUTE THEN 'Online' ELSE 'Offline' END as status
                  FROM messages m
                  JOIN users u ON u.id = (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END)
                  LEFT JOIN user_profiles up ON u.id = up.user_id
                  WHERE m.id IN (
                      SELECT MAX(id) 
                      FROM messages 
                      WHERE sender_id = ? OR receiver_id = ? 
                      GROUP BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
                  )
                  ORDER BY m.timestamp DESC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id, $user_id, $user_id, $user_id, $user_id]);
        
        $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($conversations as &$conv) {
            $conv['avatar'] = $conv['avatar'] ?: "https://i.pravatar.cc/150?u=" . urlencode($conv['name']);
            $conv['last_message_time'] = $this->timeElapsedString($conv['last_message_time']);
        }

        $this->jsonResponse(["records" => $conversations]);
    }

    public function getMessages() {
        $user_id = $this->requireAuth();
        $friend_id = isset($_GET['friend_id']) ? $_GET['friend_id'] : null;
        
        if (!$friend_id) $this->errorResponse("Missing friend_id", 400);

        $query = "SELECT id, sender_id, receiver_id, content as text, timestamp 
                  FROM messages 
                  WHERE (sender_id = ? AND receiver_id = ?) 
                     OR (sender_id = ? AND receiver_id = ?)
                  ORDER BY timestamp ASC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id, $friend_id, $friend_id, $user_id]);
        
        $this->jsonResponse(["records" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    public function sendMessage() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->receiver_id) || empty($data->content)) {
            $this->errorResponse("Missing fields", 400);
        }

        // Sanitize message content
        $content = $this->sanitize($data->content);

        $query = "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute([$user_id, $data->receiver_id, $content])) {
            $this->jsonResponse(["message" => "Message sent", "id" => $this->db->lastInsertId()], 200);
        } else {
            $this->errorResponse("Failed to send message", 500);
        }
    }
}
