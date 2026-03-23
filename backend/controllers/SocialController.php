<?php
require_once __DIR__ . '/BaseController.php';

class SocialController extends BaseController {
    
    public function getFeed() {
        $user_id = $this->requireAuth();
        
        $query = "SELECT p.*, u.name as user_name, up.avatar as user_avatar,
                  (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                  (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as liked_by_user
                  FROM posts p
                  JOIN users u ON p.user_id = u.id
                  JOIN user_profiles up ON p.user_id = up.user_id
                  ORDER BY p.created_at DESC LIMIT 50";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($posts as &$post) {
            $post['user'] = $post['user_name'];
            $post['avatar'] = $post['user_avatar'] ?: "https://i.pravatar.cc/150?u=" . urlencode($post['user_name']);
            $post['liked'] = (bool)$post['liked_by_user'];
            $post['likes'] = (int)$post['likes_count'];
            $post['image'] = $post['image_url'];
            $post['time'] = $this->timeElapsedString($post['created_at']);
            
            unset($post['user_name']);
            unset($post['liked_by_user']);
            unset($post['likes_count']);
            unset($post['image_url']);
        }

        $this->jsonResponse(["records" => $posts]);
    }

    public function createPost() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->content)) {
            $this->errorResponse("Missing content", 400);
        }

        // Sanitize content
        $content = $this->sanitize($data->content);

        $query = "INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)";
        $stmt = $this->db->prepare($query);
        $image_url = isset($data->image) ? $this->sanitize($data->image) : null;
        
        if ($stmt->execute([$user_id, $content, $image_url])) {
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
        
        if ($stmt->execute([$data->post_id, $user_id])) {
            $this->jsonResponse(["message" => "Post deleted successfully"]);
        } else {
            $this->errorResponse("Delete failed", 500);
        }
    }

    public function likePost() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->post_id)) {
            $this->errorResponse("Missing post_id", 400);
        }

        // Toggle like logic
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

    public function getClubs() {
        $user_id = $this->requireAuth();
        
        $query = "SELECT c.*, u.name as founder_name,
                  (SELECT COUNT(*) FROM club_members WHERE club_id = c.id AND user_id = ?) as is_member
                  FROM clubs c
                  JOIN users u ON c.owner_id = u.id
                  ORDER BY c.member_count DESC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$user_id]);
        $clubs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($clubs as &$club) {
            $club['members'] = (int)$club['member_count'];
            $club['is_member'] = (bool)$club['is_member'];
            $club['founder'] = [
                'name' => $club['founder_name'],
                'avatar' => "https://i.pravatar.cc/150?u=" . urlencode($club['founder_name'])
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

        // Check if already a member
        $stmt = $this->db->prepare("SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ?");
        $stmt->execute([$data->club_id, $user_id]);
        $is_member = $stmt->fetchColumn();

        if ($is_member) {
            $stmt = $this->db->prepare("DELETE FROM club_members WHERE club_id = ? AND user_id = ?");
            $stmt->execute([$data->club_id, $user_id]);
            $this->db->prepare("UPDATE clubs SET member_count = GREATEST(0, member_count - 1) WHERE id = ?")->execute([$data->club_id]);
            $this->jsonResponse(["message" => "Left club", "is_member" => false]);
        } else {
            $stmt = $this->db->prepare("INSERT INTO club_members (user_id, club_id) VALUES (?, ?)");
            $stmt->execute([$user_id, $data->club_id]);
            $this->db->prepare("UPDATE clubs SET member_count = member_count + 1 WHERE id = ?")->execute([$data->club_id]);
            $this->jsonResponse(["message" => "Joined club", "is_member" => true]);
        }
    }

    public function createClub() {
        $user_id = $this->requireAuth();
        $data = $this->getRequestData();

        if (empty($data->name)) {
            $this->errorResponse("Missing club name", 400);
        }

        $name = $this->sanitize($data->name);
        $description = isset($data->description) ? $this->sanitize($data->description) : "";
        $tag = isset($data->tag) ? $this->sanitize($data->tag) : "Other";
        $image = isset($data->image) ? $this->sanitize($data->image) : "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&q=80";

        $query = "INSERT INTO clubs (name, description, owner_id, tag, image) VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($query);
        
        if ($stmt->execute([$name, $description, $user_id, $tag, $image])) {
            $this->jsonResponse(["message" => "Club created", "club_id" => $this->db->lastInsertId()], 201);
        } else {
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
