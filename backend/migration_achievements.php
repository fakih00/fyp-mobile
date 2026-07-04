<?php
/**
 * Migration: Achievements System
 * Creates `achievements` (master catalog) and `user_achievements` (earned records) tables.
 * Run once at deployment.
 */

require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

echo "Running Achievements Migration...\n";

// 1. Create achievements master table
$db->exec("
CREATE TABLE IF NOT EXISTS `achievements` (
    `id`          INT(11) NOT NULL AUTO_INCREMENT,
    `key`         VARCHAR(100) NOT NULL COMMENT 'Unique machine-readable key',
    `icon`        VARCHAR(10)  NOT NULL DEFAULT '🏆' COMMENT 'Emoji icon',
    `title`       VARCHAR(100) NOT NULL,
    `description` TEXT         NOT NULL,
    `category`    ENUM('Milestone','Fitness','Nutrition','Social','Legacy') NOT NULL DEFAULT 'Milestone',
    `threshold`   INT(11)      NOT NULL DEFAULT 1 COMMENT 'Value needed to unlock',
    `xp_reward`   INT(11)      NOT NULL DEFAULT 0,
    `pts_reward`  INT(11)      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_ach_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");
echo "  ✅ achievements table ready\n";

// 2. Create user_achievements earned records table
$db->exec("
CREATE TABLE IF NOT EXISTS `user_achievements` (
    `id`             INT(11) NOT NULL AUTO_INCREMENT,
    `user_id`        INT(11) NOT NULL,
    `achievement_id` INT(11) NOT NULL,
    `earned_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notified`       TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Has the user been shown the unlock popup?',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_ach` (`user_id`, `achievement_id`),
    KEY `fk_ua_user` (`user_id`),
    KEY `fk_ua_ach`  (`achievement_id`),
    CONSTRAINT `fk_ua_user` FOREIGN KEY (`user_id`)        REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ua_ach`  FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");
echo "  ✅ user_achievements table ready\n";

// 3. Seed the master catalog
$catalog = [
    // ─── Fitness Milestones ──────────────────────────────────────
    ['first_workout',       '💪', 'First Rep',         'Complete your very first workout session.',           'Fitness',   1,    50,  10],
    ['workout_5',           '🏋️', 'Iron Novice',        'Complete 5 total workout sessions.',                  'Fitness',   5,    75,  15],
    ['workout_25',          '🔥', 'Grind Mode',         'Complete 25 total workout sessions.',                 'Fitness',  25,   150,  30],
    ['workout_100',         '⚡', 'Century Lifter',     'Complete 100 total workout sessions.',                'Fitness', 100,   500, 100],

    // ─── Streak Milestones ────────────────────────────────────────
    ['streak_3',            '🌟', '3-Day Streak',       'Maintain a 3-day workout streak.',                    'Milestone',  3,   50,  10],
    ['streak_7',            '🔥', '7 Day Warrior',      'Maintain a 7-day workout streak.',                    'Milestone',  7,  100,  20],
    ['streak_30',           '🚀', 'Month Maverick',     'Maintain a 30-day workout streak.',                   'Milestone', 30,  300,  75],
    ['streak_100',          '👑', 'Century Legend',     'Maintain a 100-day workout streak.',                  'Legacy',   100, 1000, 250],

    // ─── Nutrition ────────────────────────────────────────────────
    ['meal_first',          '🥗', 'Mindful Eater',      'Log your first meal completion.',                     'Nutrition',  1,   25,   5],
    ['meals_50',            '🥦', 'Nutrition Pro',      'Log 50 meals as completed.',                          'Nutrition', 50,  200,  40],
    ['quests_first',        '⭐', 'Quest Starter',      'Complete your first daily quest.',                    'Milestone',  1,   50,  10],
    ['quests_7',            '🎯', 'Quest Master',       'Complete 7 daily quests in total.',                   'Milestone',  7,  150,  30],
    ['quests_30',           '🏅', 'Quest Legend',       'Complete 30 daily quests in total.',                  'Legacy',    30,  500, 100],

    // ─── Level / XP ───────────────────────────────────────────────
    ['level_5',             '💎', 'Rising Elite',       'Reach Level 5.',                                      'Milestone',  5,  100,  20],
    ['level_10',            '🏆', 'Champion Grade',     'Reach Level 10.',                                     'Legacy',    10,  250,  50],
    ['level_25',            '🌠', 'Legendary Status',   'Reach Level 25.',                                     'Legacy',    25,  750, 150],

    // ─── Hydration ────────────────────────────────────────────────
    ['water_7days',         '💧', 'H2O Hero',           'Hit your daily water goal 7 days in a row.',          'Fitness',    7,  100,  20],

    // ─── Social ───────────────────────────────────────────────────
    ['friend_first',        '🤝', 'Social Starter',     'Add your first friend.',                              'Social',     1,   50,  10],
    ['friends_5',           '🛡️', 'Squad Goals',        'Connect with 5 friends.',                             'Social',     5,  100,  20],
    ['challenge_win',       '🏁', 'Challenge Conqueror','Complete a community challenge.',                      'Social',     1,  100,  20],
];

$ins = $db->prepare("
    INSERT IGNORE INTO achievements (`key`, `icon`, `title`, `description`, `category`, `threshold`, `xp_reward`, `pts_reward`)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");

foreach ($catalog as $row) {
    $ins->execute($row);
}
echo "  ✅ Seeded " . count($catalog) . " achievements into catalog\n";

echo "\n✅ Migration complete!\n";
