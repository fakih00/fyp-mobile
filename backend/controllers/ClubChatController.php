<?php
require_once __DIR__ . '/BaseController.php';

class ClubChatController extends BaseController {
    private function requireMembership($clubId, $userId) {
        $stmt = $this->db->prepare('SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ?');
        $stmt->execute([$clubId, $userId]);
        if (!$stmt->fetchColumn()) $this->errorResponse('Join this club to access its chat.', 403);
    }

    public function getMessages() {
        $userId = $this->requireAuth();
        $clubId = (int)($_GET['club_id'] ?? 0);
        if (!$clubId) $this->errorResponse('Missing club_id.', 400);
        $this->requireMembership($clubId, $userId);
        $stmt = $this->db->prepare('SELECT m.id, m.user_id, m.content as text, m.created_at, u.name as user, p.avatar
            FROM club_messages m JOIN users u ON u.id = m.user_id LEFT JOIN user_profiles p ON p.user_id = u.id
            WHERE m.club_id = ? ORDER BY m.id ASC');
        $stmt->execute([$clubId]);
        $messages = $stmt->fetchAll();
        foreach ($messages as &$message) {
            $message['is_mine'] = (int)$message['user_id'] === (int)$userId;
            $message['avatar'] = $message['avatar'] ?: 'https://i.pravatar.cc/150?u=' . urlencode($message['user']);
            $message['time'] = $this->timeElapsedString($message['created_at']);
        }
        $this->jsonResponse(['records' => $messages]);
    }

    public function sendMessage() {
        $userId = $this->requireAuth();
        $data = $this->getRequestData();
        $clubId = (int)($data->club_id ?? 0);
        $text = trim((string)($data->content ?? ''));
        if (!$clubId || $text === '') $this->errorResponse('Club and message are required.', 400);
        $this->requireMembership($clubId, $userId);
        $stmt = $this->db->prepare('INSERT INTO club_messages (club_id,user_id,content) VALUES (?,?,?)');
        $stmt->execute([$clubId, $userId, $this->sanitize($text)]);
        $this->jsonResponse(['message' => 'Message sent.', 'id' => $this->db->lastInsertId()], 201);
    }
}
