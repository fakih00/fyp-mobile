<?php
require_once __DIR__ . '/backend/config/database.php';

try {
    $db = (new Database())->getConnection();
    
    // Create notifications table
    $sql = "CREATE TABLE IF NOT EXISTS `notifications` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `user_id` int(11) NOT NULL,
      `title` varchar(255) NOT NULL,
      `message` text NOT NULL,
      `type` varchar(50) NOT NULL DEFAULT 'general',
      `icon` varchar(50) DEFAULT 'notifications',
      `color` varchar(20) DEFAULT '#10B981',
      `is_read` tinyint(1) NOT NULL DEFAULT 0,
      `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
      PRIMARY KEY (`id`),
      KEY `user_id` (`user_id`),
      CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    
    $db->exec($sql);
    
    echo "Database updated successfully: notifications table created.\n";

    // Seed some initial notifications for user 1 if table is empty
    $check = $db->query("SELECT COUNT(*) FROM notifications WHERE user_id = 1");
    if ($check->fetchColumn() == 0) {
        $seed = "INSERT INTO notifications (user_id, title, message, type, icon, color) VALUES 
            (1, 'Welcome to Elite Fitness!', 'Start your journey today by completing your profile.', 'general', 'star', '#10B981'),
            (1, 'Daily Goal Reached', 'You hit your calorie target for today. Great job!', 'achievement', 'trophy', '#F59E0B'),
            (1, 'New Challenge Available', 'Join the 30-Day Lean Muscle challenge now.', 'challenge', 'fitness', '#3B82F6')";
        $db->exec($seed);
        echo "Seeded initial notifications.\n";
    }

} catch (PDOException $e) {
    echo "Error updating database: " . $e->getMessage() . "\n";
}
