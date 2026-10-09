<?php
require_once __DIR__ . '/BaseController.php';

class SocialController extends BaseController {
    private function columnExists($table, $column) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
        $stmt->execute([$table, $column]);
        return (int)$stmt->fetchColumn() > 0;
    }

    private function requireVisiblePost($postId, $userId) {
        $stmt = $this->db->prepare("SELECT p.id FROM posts p WHERE p.id = ? AND
            (p.visibility = 'public' OR p.user_id = ? OR (p.visibility = 'friends' AND EXISTS (
                SELECT 1 FROM friends f WHERE f.status = 'accepted' AND
                ((f.user_id = ? AND f.friend_id = p.user_id) OR (f.friend_id = ? AND f.user_id = p.user_id))
            )))");
        $stmt->execute([$postId, $userId, $userId, $userId]);
        if (!$stmt->fetchColumn()) $this->errorResponse('Post not found or unavailable.', 404);
    }
    
    public function getFeed() {
        $user_id = $this->requireAuth();
        
        $query = "SELECT p.*, u.name as user_name, up.avatar as user_avatar,
                  (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                  (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as liked_by_user,
                  (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
                  FROM posts p
                  JOIN users u ON p.user_id = u.id
                  JOIN user_profiles up ON p.user_id = up.user_id
                  WHERE p.visibility = 'public' OR p.user_id = ? OR (p.visibility = 'friends' AND EXISTS (
                      SELECT 1 FROM friends f WHERE f.status = 'accepted' AND
                      ((f.user_id = ? AND f.friend_id = p.user_id) OR (f.friend_id = ? AND f.user_id = p.user_id))
                  ))
                  ORDER BY p.created_at DESC LIMIT 50";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id, $user_id, $user_id, $user_id]);
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($posts as &$post) {
            $post['user'] = $post['user_name'];
            $post['avatar'] = $post['user_avatar'] ?: "https://i.pravatar.cc/150?u=" . urlencode($post['user_name']);
            $post['liked'] = (bool)$post['liked_by_user'];
            $post['likes'] = (int)$post['likes_count'];
            $post['image'] = $post['image_url'];
            $post['time'] = $this->timeElapsedString($post['created_at']);
            $post['comments_count'] = (int)$post['comments_count'];
            $post['comments'] = $this->getPostComments($post['id']);
            
            unset($post['user_name']);
            unset($post['liked_by_user']);
            unset($post['likes_count']);
            unset($post['image_url']);
        }

        $this->jsonResponse(["records" => $posts]);
    }

    private function getPostComments($postId) {
        $query = "SELECT pc.id, u.name as user, up.avatar, pc.content as text, pc.created_at
                  FROM post_comments pc
                  JOIN users u ON pc.user_id = u.id
                  LEFT JOIN user_profiles up ON u.id = up.user_id
                  WHERE pc.post_id = ?
                  ORDER BY pc.created_at ASC, pc.id ASC";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$postId]);
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($comments as &$comment) {
            $comment['avatar'] = $comment['avatar'] ?: "https://i.pravatar.cc/150?u=" . urlencode($comment['user']);
            $comment['time'] = $this->timeElapsedString($comment['created_at']);
            unset($comment['created_at']);
        }

        return $comments;
    }

    public function createPost() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (trim($data->content ?? '') === '' && empty($data->image)) {
            $this->errorResponse("Missing content", 400);
        }

        // Sanitize content
        $content = $this->sanitize(trim($data->content ?? ''));
        $visibility = $data->visibility ?? 'public';
        if (!in_array($visibility, ['public', 'friends'], true)) $this->errorResponse('Invalid post visibility.', 400);

        $query = "INSERT INTO posts (user_id, content, image_url, visibility) VALUES (?, ?, ?, ?)";
        $stmt = $this->db->prepare($query);
        $image_url = isset($data->image) ? $this->sanitize($data->image) : null;
        if (!empty($data->image) && str_starts_with($data->image, 'data:image/')) {
            if (!preg_match('#^data:image/(jpeg|png|webp);base64,(.+)$#s', $data->image, $match)) $this->errorResponse('Unsupported image format.', 400);
            $bytes = base64_decode($match[2], true);
            $info = $bytes !== false ? @getimagesizefromstring($bytes) : false;
            if (!$info || strlen($bytes) > 6 * 1024 * 1024 || !in_array($info['mime'], ['image/jpeg', 'image/png', 'image/webp'], true)) $this->errorResponse('Choose a valid image under 6 MB.', 400);
            $extension = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$info['mime']];
            $folder = __DIR__ . '/../uploads/social';
            if (!is_dir($folder) && !mkdir($folder, 0775, true)) $this->errorResponse('Image storage unavailable.', 500);
            $filename = bin2hex(random_bytes(16)) . '.' . $extension;
            if (file_put_contents($folder . '/' . $filename, $bytes) === false) $this->errorResponse('Could not save image.', 500);
            $scheme = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http';
            $image_url = $scheme . '://' . $_SERVER['HTTP_HOST'] . '/uploads/social/' . $filename;
        }
        
        if ($stmt->execute([$user_id, $content, $image_url, $visibility])) {
            $this->jsonResponse(["message" => "Post created", "post_id" => $this->db->lastInsertId()], 201);
        } else {
            $this->errorResponse("Failed to create post", 500);
        }
    }

    public function deletePost() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->post_id)) {
            $this->errorResponse("Missing post_id", 400);
        }

        // User can only delete their own posts
        $query = "DELETE FROM posts WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute([$data->post_id, $user_id]) && $stmt->rowCount() > 0) {
            $this->jsonResponse(["message" => "Post deleted successfully"]);
        } else {
            $this->errorResponse("Post not found or not owned by you.", 404);
        }
    }

    public function likePost() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->post_id)) {
            $this->errorResponse("Missing post_id", 400);
        }

        // Toggle like logic
        $this->requireVisiblePost($data->post_id, $user_id);
        $stmt = $this->db->prepare("SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?");
        $stmt->execute([$user_id, $data->post_id]);
        
        $liked = false;
        if ($stmt->fetch()) {
            $stmt = $this->db->prepare("DELETE FROM post_likes WHERE user_id = ? AND post_id = ?");
            $stmt->execute([$user_id, $data->post_id]);
            $liked = false;
        } else {
            $stmt = $this->db->prepare("INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)");
            $stmt->execute([$user_id, $data->post_id]);
            $liked = true;
        }

        // Get new like count
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM post_likes WHERE post_id = ?");
        $stmt->execute([$data->post_id]);
        $likes = $stmt->fetchColumn();

        if ($liked) {
            // Notify post author
            $stmtAuthor = $this->db->prepare("SELECT user_id, content FROM posts WHERE id = ?");
            $stmtAuthor->execute([$data->post_id]);
            $post = $stmtAuthor->fetch(PDO::FETCH_ASSOC);
            
            if ($post && $post['user_id'] != $user_id) {
                $stmtLiker = $this->db->prepare("SELECT name FROM users WHERE id = ?");
                $stmtLiker->execute([$user_id]);
                $likerName = $stmtLiker->fetchColumn();
                
                $preview = strlen($post['content']) > 30 ? substr($post['content'], 0, 30) . "..." : $post['content'];
                $this->createNotification(
                    $post['user_id'], 
                    "New Like! ❤️", 
                    "{$likerName} liked your post: \"{$preview}\"", 
                    "social", 
                    "heart", 
                    "#EF4444"
                );
            }
        }

        $this->jsonResponse(["message" => $liked ? "Liked" : "Unliked", "liked" => $liked, "likes" => (int)$likes]);
    }

    public function addComment() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->post_id) || empty($data->content)) {
            $this->errorResponse("Missing post_id or content", 400);
        }

        $content = $this->sanitize(trim($data->content));
        if ($content === '') {
            $this->errorResponse("Comment cannot be empty", 400);
        }
        $this->requireVisiblePost($data->post_id, $user_id);

        $stmt = $this->db->prepare("INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)");
        if (!$stmt->execute([$data->post_id, $user_id, $content])) {
            $this->errorResponse("Failed to add comment", 500);
        }

        $commentId = $this->db->lastInsertId();
        $stmtComment = $this->db->prepare("SELECT pc.id, u.name as user, up.avatar, pc.content as text, pc.created_at
                                           FROM post_comments pc
                                           JOIN users u ON pc.user_id = u.id
                                           LEFT JOIN user_profiles up ON u.id = up.user_id
                                           WHERE pc.id = ?");
        $stmtComment->execute([$commentId]);
        $comment = $stmtComment->fetch(PDO::FETCH_ASSOC);
        $comment['avatar'] = $comment['avatar'] ?: "https://i.pravatar.cc/150?u=" . urlencode($comment['user']);
        $comment['time'] = $this->timeElapsedString($comment['created_at']);
        unset($comment['created_at']);

        $stmtAuthor = $this->db->prepare("SELECT p.user_id, p.content, u.name as commenter_name
                                          FROM posts p
                                          JOIN users u ON u.id = ?
                                          WHERE p.id = ?");
        $stmtAuthor->execute([$user_id, $data->post_id]);
        $post = $stmtAuthor->fetch(PDO::FETCH_ASSOC);
        if ($post && (int)$post['user_id'] !== (int)$user_id) {
            $preview = strlen($post['content']) > 30 ? substr($post['content'], 0, 30) . "..." : $post['content'];
            $this->createNotification(
                $post['user_id'],
                "New Comment",
                "{$post['commenter_name']} commented on your post: \"{$preview}\"",
                "social",
                "chatbubble",
                "#3B82F6"
            );
        }

        $this->jsonResponse(["message" => "Comment added", "comment" => $comment], 201);
    }

    public function getClubs() {
        $user_id = $this->requireAuth();

        $ownerField = $this->columnExists('clubs', 'owner_id') ? 'c.owner_id' : 'c.founder_id';
        $memberCountField = '(SELECT COUNT(*) FROM club_members cm_count WHERE cm_count.club_id = c.id)';
        
        $query = "SELECT c.*, u.name as founder_name, {$memberCountField} as actual_members,
                  (SELECT COUNT(*) FROM club_members WHERE club_id = c.id AND user_id = ?) as is_member
                  FROM clubs c
                  LEFT JOIN users u ON {$ownerField} = u.id
                  ORDER BY {$memberCountField} DESC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $clubs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($clubs as &$club) {
            $club['members'] = (int)$club['actual_members'];
            unset($club['actual_members']);
            $club['is_member'] = (bool)$club['is_member'];
            $founderName = $club['founder_name'] ?: 'Community';
            $club['founder'] = [
                'name' => $founderName,
                'avatar' => "https://i.pravatar.cc/150?u=" . urlencode($founderName)
            ];
            unset($club['founder_name']);
            unset($club['member_count']);
        }

        $this->jsonResponse(["records" => $clubs]);
    }

    public function joinClub() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->club_id)) {
            $this->errorResponse("Missing club_id", 400);
        }

        $this->db->beginTransaction();
        $club = $this->db->prepare('SELECT id FROM clubs WHERE id = ? FOR UPDATE');
        $club->execute([$data->club_id]);
        if (!$club->fetchColumn()) {
            $this->db->rollBack();
            $this->errorResponse('Club not found.', 404);
        }
        // Serialize membership changes and derive the counter from actual memberships.
        $stmt = $this->db->prepare("SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ?");
        $stmt->execute([$data->club_id, $user_id]);
        $is_member = $stmt->fetchColumn();

        if ($is_member) {
            $stmt = $this->db->prepare("DELETE FROM club_members WHERE club_id = ? AND user_id = ?");
            $stmt->execute([$data->club_id, $user_id]);
            $this->db->prepare("UPDATE clubs SET member_count = (SELECT COUNT(*) FROM club_members WHERE club_id = ?) WHERE id = ?")->execute([$data->club_id, $data->club_id]);
            $this->db->commit();
            $this->jsonResponse(["message" => "Left club", "is_member" => false]);
        } else {
            $stmt = $this->db->prepare("INSERT INTO club_members (user_id, club_id) VALUES (?, ?)");
            $stmt->execute([$user_id, $data->club_id]);
            $this->db->prepare("UPDATE clubs SET member_count = (SELECT COUNT(*) FROM club_members WHERE club_id = ?) WHERE id = ?")->execute([$data->club_id, $data->club_id]);
            $this->db->commit();
            $this->jsonResponse(["message" => "Joined club", "is_member" => true]);
        }
    }

    public function createClub() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (trim($data->name ?? '') === '') {
            $this->errorResponse("Missing club name", 400);
        }

        $name = $this->sanitize(trim($data->name));
        $description = isset($data->description) ? $this->sanitize($data->description) : "";
        $tag = isset($data->tag) ? $this->sanitize($data->tag) : "Other";
        $image = isset($data->image) ? $this->sanitize($data->image) : "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&q=80";

        $columns = ['name', 'description', 'tag', 'image'];
        $values = [$name, $description, $tag, $image];

        if ($this->columnExists('clubs', 'owner_id')) {
            $columns[] = 'owner_id';
            $values[] = $user_id;
        }

        if ($this->columnExists('clubs', 'founder_id')) {
            $columns[] = 'founder_id';
            $values[] = $user_id;
        }

        if ($this->columnExists('clubs', 'member_count')) {
            $columns[] = 'member_count';
            $values[] = 1;
        }

        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $query = "INSERT INTO clubs (" . implode(', ', $columns) . ") VALUES ({$placeholders})";
        $stmt = $this->db->prepare($query);
        
        $this->db->beginTransaction();
        if ($stmt->execute($values)) {
            $clubId = $this->db->lastInsertId();
            $memberStmt = $this->db->prepare("INSERT IGNORE INTO club_members (user_id, club_id) VALUES (?, ?)");
            $memberStmt->execute([$user_id, $clubId]);
            $this->db->commit();
            $this->jsonResponse(["message" => "Club created", "club_id" => $clubId], 201);
        } else {
            $this->db->rollBack();
            $this->errorResponse("Failed to create club", 500);
        }
    }

    public function getRewards() {
        // Rewards are public data but still require auth
        $this->requireAuth();

        $query = "SELECT * FROM rewards ORDER BY cost ASC";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $this->jsonResponse(["records" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    public function redeemReward() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->reward_id)) {
            $this->errorResponse("Missing reward_id", 400);
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT cost FROM rewards WHERE id = ?");
            $stmt->execute([$data->reward_id]);
            $reward = $stmt->fetch(PDO::FETCH_ASSOC);

            $stmt = $this->db->prepare("SELECT points FROM user_profiles WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($profile['points'] < $reward['cost']) {
                $this->errorResponse("Not enough points", 402);
            }

            $stmt = $this->db->prepare("UPDATE user_profiles SET points = points - ? WHERE user_id = ?");
            $stmt->execute([$reward['cost'], $user_id]);

            $voucherCode = "ELITE-LB-" . strtoupper(bin2hex(random_bytes(3)));
            
            $stmtLog = $this->db->prepare("INSERT INTO redemptions (user_id, reward_id, voucher_code) VALUES (?, ?, ?)");
            $stmtLog->execute([$user_id, $data->reward_id, $voucherCode]);

            $this->db->commit();
            $this->jsonResponse([
                "message" => "Reward redeemed successfully",
                "voucher_code" => $voucherCode
            ]);
        } catch (Exception $e) {
            $this->db->rollBack();
            $this->errorResponse("Redemption failed", 500);
        }
    }

    public function getRedemptions() {
        $user_id = $this->requireAuth();

        $query = "SELECT r.*, rew.name as reward_name, rew.cost as reward_cost, rew.icon as reward_icon, rew.type as reward_type
                  FROM redemptions r
                  JOIN rewards rew ON r.reward_id = rew.id
                  WHERE r.user_id = ?
                  ORDER BY r.timestamp DESC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $redemptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($redemptions as &$red) {
            $red['id'] = (string)$red['id'];
            $red['time'] = $this->timeElapsedString($red['timestamp']);
        }

        $this->jsonResponse(["records" => $redemptions]);
    }
}
