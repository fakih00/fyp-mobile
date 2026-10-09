<?php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Error connecting to database.\n");
}

function columnExists(PDO $db, string $table, string $column): bool {
    $stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
    $stmt->execute([$table, $column]);
    return (int)$stmt->fetchColumn() > 0;
}

function addColumn(PDO $db, string $table, string $column, string $definition): void {
    if (!columnExists($db, $table, $column)) {
        echo "Adding $table.$column...\n";
        $db->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
    } else {
        echo "$table.$column already exists. Skipping.\n";
    }
}

function tableExists(PDO $db, string $table): bool {
    $stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
    $stmt->execute([$table]);
    return (int)$stmt->fetchColumn() > 0;
}

try {
    addColumn($db, 'users', 'api_token', 'VARCHAR(64) DEFAULT NULL');
    addColumn($db, 'users', 'token_expires_at', 'DATETIME DEFAULT NULL');
    addColumn($db, 'users', 'last_seen', 'DATETIME DEFAULT NULL');
    addColumn($db, 'user_profiles', 'avatar', 'VARCHAR(500) DEFAULT NULL');

    $db->exec("CREATE TABLE IF NOT EXISTS `notifications` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `user_id` INT(11) NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `message` TEXT NOT NULL,
        `type` VARCHAR(50) NOT NULL DEFAULT 'general',
        `icon` VARCHAR(50) NOT NULL DEFAULT 'notifications',
        `color` VARCHAR(20) NOT NULL DEFAULT '#10B981',
        `is_read` TINYINT(1) NOT NULL DEFAULT 0,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_notifications_user` (`user_id`),
        CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS `posts` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `user_id` INT(11) NOT NULL,
        `content` TEXT NOT NULL,
        `image_url` VARCHAR(500) DEFAULT NULL,
        `visibility` VARCHAR(50) NOT NULL DEFAULT 'public',
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_posts_user` (`user_id`),
        CONSTRAINT `fk_posts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    addColumn($db, 'posts', 'image_url', 'VARCHAR(500) DEFAULT NULL');
    addColumn($db, 'posts', 'visibility', "VARCHAR(50) NOT NULL DEFAULT 'public'");

    $db->exec("CREATE TABLE IF NOT EXISTS `post_likes` (
        `post_id` INT(11) NOT NULL,
        `user_id` INT(11) NOT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`post_id`, `user_id`),
        KEY `idx_post_likes_user` (`user_id`),
        CONSTRAINT `fk_post_likes_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
        CONSTRAINT `fk_post_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS `post_comments` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `post_id` INT(11) NOT NULL,
        `user_id` INT(11) NOT NULL,
        `content` TEXT NOT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_post_comments_post` (`post_id`),
        KEY `idx_post_comments_user` (`user_id`),
        CONSTRAINT `fk_post_comments_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
        CONSTRAINT `fk_post_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS `clubs` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `name` VARCHAR(255) NOT NULL,
        `description` TEXT DEFAULT NULL,
        `owner_id` INT(11) NOT NULL,
        `tag` VARCHAR(50) NOT NULL DEFAULT 'Other',
        `image` VARCHAR(500) DEFAULT NULL,
        `member_count` INT(11) NOT NULL DEFAULT 0,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_clubs_owner` (`owner_id`),
        CONSTRAINT `fk_clubs_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    addColumn($db, 'clubs', 'owner_id', 'INT(11) NULL');
    addColumn($db, 'clubs', 'member_count', 'INT(11) NOT NULL DEFAULT 0');
    if (columnExists($db, 'clubs', 'founder_id')) {
        $db->exec("UPDATE `clubs` SET `owner_id` = `founder_id` WHERE `owner_id` IS NULL");
        $db->exec("ALTER TABLE `clubs` MODIFY `founder_id` INT(11) NULL");
    }

    $db->exec("CREATE TABLE IF NOT EXISTS `club_members` (
        `club_id` INT(11) NOT NULL,
        `user_id` INT(11) NOT NULL,
        `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`club_id`, `user_id`),
        KEY `idx_club_members_user` (`user_id`),
        CONSTRAINT `fk_club_members_club` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
        CONSTRAINT `fk_club_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    if (tableExists($db, 'clubs') && tableExists($db, 'club_members')) {
        $db->exec("UPDATE `clubs` c
                   SET c.member_count = (
                       SELECT COUNT(*) FROM `club_members` cm WHERE cm.club_id = c.id
                   )");
    }

    echo "Social/community migration completed successfully.\n";
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
