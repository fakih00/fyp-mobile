<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Error connecting to database.\n");
}

$passwordHash = password_hash('Password123!', PASSWORD_DEFAULT);

function upsertDemoUser(PDO $db, string $name, string $email, string $avatar, int $level, int $xp, int $points): int {
    global $passwordHash;

    $stmt = $db->prepare("INSERT INTO users (name, email, password_hash)
                          VALUES (?, ?, ?)
                          ON DUPLICATE KEY UPDATE name = VALUES(name)");
    $stmt->execute([$name, $email, $passwordHash]);

    $stmtId = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmtId->execute([$email]);
    $userId = (int)$stmtId->fetchColumn();

    $profile = $db->prepare("INSERT INTO user_profiles
        (user_id, age, gender, height, weight, goal, activity_level, bmi, level, xp, points, avatar)
        VALUES (?, 24, 'male', 176, 74, 'maintain', 'moderately_active', 23.89, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE level = VALUES(level), xp = VALUES(xp), points = VALUES(points), avatar = VALUES(avatar)");
    $profile->execute([$userId, $level, $xp, $points, $avatar]);

    return $userId;
}

function makeFriends(PDO $db, int $a, int $b): void {
    $stmt = $db->prepare("INSERT INTO friends (user_id, friend_id, status)
                          VALUES (?, ?, 'accepted')
                          ON DUPLICATE KEY UPDATE status = 'accepted'");
    $stmt->execute([$a, $b]);
    $stmt->execute([$b, $a]);
}

function createClub(PDO $db, int $ownerId, string $name, string $tag, string $description, string $image): int {
    $stmtId = $db->prepare("SELECT id FROM clubs WHERE name = ?");
    $stmtId->execute([$name]);
    $existing = $stmtId->fetchColumn();
    if ($existing) {
        $stmt = $db->prepare("UPDATE clubs SET description = ?, owner_id = ?, tag = ?, image = ? WHERE id = ?");
        $stmt->execute([$description, $ownerId, $tag, $image, $existing]);
        return (int)$existing;
    }

    $stmt = $db->prepare("INSERT INTO clubs (name, description, owner_id, tag, image, member_count)
                          VALUES (?, ?, ?, ?, ?, 0)");
    $stmt->execute([$name, $description, $ownerId, $tag, $image]);

    return (int)$db->lastInsertId();
}

function joinClub(PDO $db, int $clubId, int $userId): void {
    $stmt = $db->prepare("INSERT IGNORE INTO club_members (club_id, user_id) VALUES (?, ?)");
    $stmt->execute([$clubId, $userId]);

    $update = $db->prepare("UPDATE clubs SET member_count = (
        SELECT COUNT(*) FROM club_members WHERE club_id = ?
    ) WHERE id = ?");
    $update->execute([$clubId, $clubId]);
}

function createPost(PDO $db, int $userId, string $content, string $image = null): int {
    $stmtExisting = $db->prepare("SELECT id FROM posts WHERE user_id = ? AND content = ? LIMIT 1");
    $stmtExisting->execute([$userId, $content]);
    $existing = $stmtExisting->fetchColumn();
    if ($existing) {
        return (int)$existing;
    }

    $stmt = $db->prepare("INSERT INTO posts (user_id, content, image_url, visibility) VALUES (?, ?, ?, 'public')");
    $stmt->execute([$userId, $content, $image]);
    return (int)$db->lastInsertId();
}

function createComment(PDO $db, int $postId, int $userId, string $content): void {
    $stmtExisting = $db->prepare("SELECT id FROM post_comments WHERE post_id = ? AND user_id = ? AND content = ? LIMIT 1");
    $stmtExisting->execute([$postId, $userId, $content]);
    if ($stmtExisting->fetchColumn()) {
        return;
    }

    $stmt = $db->prepare("INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)");
    $stmt->execute([$postId, $userId, $content]);
}

function sendMessage(PDO $db, int $senderId, int $receiverId, string $content): void {
    $stmtExisting = $db->prepare("SELECT id FROM messages WHERE sender_id = ? AND receiver_id = ? AND content = ? LIMIT 1");
    $stmtExisting->execute([$senderId, $receiverId, $content]);
    if ($stmtExisting->fetchColumn()) {
        return;
    }

    $stmt = $db->prepare("INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)");
    $stmt->execute([$senderId, $receiverId, $content]);
}

try {
    $db->beginTransaction();

    $users = [
        upsertDemoUser($db, 'Alex Haddad', 'demo.alex@elitefitness.local', 'https://i.pravatar.cc/150?u=alex-haddad', 8, 640, 1250),
        upsertDemoUser($db, 'Maya Khoury', 'demo.maya@elitefitness.local', 'https://i.pravatar.cc/150?u=maya-khoury', 7, 520, 990),
        upsertDemoUser($db, 'Karim Nasser', 'demo.karim@elitefitness.local', 'https://i.pravatar.cc/150?u=karim-nasser', 9, 780, 1430),
        upsertDemoUser($db, 'Rita Mansour', 'demo.rita@elitefitness.local', 'https://i.pravatar.cc/150?u=rita-mansour', 6, 410, 760),
        upsertDemoUser($db, 'Omar Saade', 'demo.omar@elitefitness.local', 'https://i.pravatar.cc/150?u=omar-saade', 5, 330, 620),
    ];

    for ($i = 0; $i < count($users); $i++) {
        for ($j = $i + 1; $j < count($users); $j++) {
            makeFriends($db, $users[$i], $users[$j]);
        }
    }

    $clubs = [
        createClub($db, $users[0], 'Beirut Strength Club', 'STRENGTH', 'Compound lifts, weekly PR checks, and form reviews.', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80'),
        createClub($db, $users[1], 'Lean Meal Prep Crew', 'NUTRITION', 'High-protein meals, grocery swaps, and weekly meal wins.', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&q=80'),
        createClub($db, $users[2], '5K Morning Runners', 'RUNNING', 'Early runs, step streaks, and weekend distance goals.', 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=900&q=80'),
    ];

    foreach ($clubs as $clubId) {
        foreach ($users as $userId) {
            joinClub($db, $clubId, $userId);
        }
    }

    $postA = createPost($db, $users[0], 'Hit a new squat PR today. PoseForm helped me keep depth consistent.', 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=900&q=80');
    $postB = createPost($db, $users[1], 'Meal prep done for the week: chicken bowls, Greek yogurt, and berry oats.', 'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=80');
    $postC = createPost($db, $users[2], 'Morning 5K finished before class. Who is joining tomorrow?', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80');

    createComment($db, $postA, $users[1], 'Strong work. Your depth looked clean.');
    createComment($db, $postA, $users[2], 'Save that routine for leg day.');
    createComment($db, $postB, $users[0], 'This is exactly what I need before presentation week.');
    createComment($db, $postC, $users[3], 'I am in for tomorrow.');

    sendMessage($db, $users[1], $users[0], 'Ready for the plank duel tonight?');
    sendMessage($db, $users[0], $users[1], 'Yes. Loser buys protein coffee.');
    sendMessage($db, $users[2], $users[0], 'The running club is active tomorrow at 7.');

    $db->commit();
    echo "Social demo data seeded successfully.\n";
    echo "Demo login: demo.alex@elitefitness.local / Password123!\n";
} catch (Throwable $e) {
    $db->rollBack();
    echo "Seed failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
