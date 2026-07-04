<?php
require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/UserController.php';

/**
 * AchievementController
 *
 * Handles:
 *   - getAchievements()  : return all catalog entries + earned state for the authenticated user
 *   - checkAndAward()    : internal static-style helper called by other controllers
 *                          to evaluate & award any newly-unlocked achievements
 */
class AchievementController extends BaseController {

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/getAchievements
     * Returns full achievements catalog with earned status, dates, and
     * any newly-unlocked (notified=0) achievements to pop up on the UI.
     */
    public function getAchievements() {
        $user_id = $this->requireAuth();

        // Fetch full catalog + left-join user's earned rows
        $stmt = $this->db->prepare("
            SELECT
                a.*,
                ua.earned_at,
                ua.notified,
                IF(ua.achievement_id IS NOT NULL, 1, 0) AS earned
            FROM achievements a
            LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
            ORDER BY a.category ASC, a.id ASC
        ");
        $stmt->execute([$user_id]);
        $achievements = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Build user progress data to compute progress % for unearned badges
        $progress = $this->getUserProgressData($user_id);

        // Attach progress ratios
        foreach ($achievements as &$ach) {
            $ach['earned']   = (bool)(int)$ach['earned'];
            $ach['notified'] = (bool)(int)$ach['notified'];
            if (!$ach['earned']) {
                $current = $this->getCurrentValueForKey($ach['key'], $progress);
                $ach['current_value'] = $current;
                $ach['progress']      = $ach['threshold'] > 0
                    ? min(round(($current / $ach['threshold']) * 100), 99)
                    : 0;
            } else {
                $ach['current_value'] = $ach['threshold'];
                $ach['progress']      = 100;
            }
        }
        unset($ach);

        // Mark all newly unlocked as notified so pop-ups only fire once
        $newlyUnlocked = array_filter($achievements, fn($a) => $a['earned'] && !$a['notified']);
        if (!empty($newlyUnlocked)) {
            $ids = array_column(array_values($newlyUnlocked), 'id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $markStmt = $this->db->prepare("
                UPDATE user_achievements
                SET notified = 1
                WHERE user_id = ? AND achievement_id IN ($placeholders)
            ");
            $markStmt->execute(array_merge([$user_id], $ids));
        }

        $this->jsonResponse([
            'achievements'  => array_values($achievements),
            'newly_unlocked'=> array_values(array_filter($achievements, fn($a) => $a['earned'] && !$a['notified'])),
            'total_earned'  => count(array_filter($achievements, fn($a) => $a['earned'])),
            'total'         => count($achievements),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal Engine — called from other controllers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Evaluate all achievements for a user and award any not yet earned.
     * Returns an array of newly-awarded achievement titles (for inline notifications).
     *
     * @param int    $user_id
     * @param string $context  Hint about what action just happened (e.g. 'workout', 'meal', 'quest', 'level')
     */
    public function checkAndAward(int $user_id, string $context = ''): array {
        // Load catalog
        $stmt = $this->db->prepare("SELECT * FROM achievements ORDER BY id ASC");
        $stmt->execute();
        $catalog = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Load already-earned IDs for this user
        $earnedStmt = $this->db->prepare("SELECT achievement_id FROM user_achievements WHERE user_id = ?");
        $earnedStmt->execute([$user_id]);
        $earnedIds = array_column($earnedStmt->fetchAll(PDO::FETCH_ASSOC), 'achievement_id');

        // Build progress snapshot
        $progress = $this->getUserProgressData($user_id);

        $newlyAwarded = [];

        foreach ($catalog as $ach) {
            if (in_array($ach['id'], $earnedIds)) continue;

            $current = $this->getCurrentValueForKey($ach['key'], $progress);

            if ($current >= $ach['threshold']) {
                // Award it
                $awardStmt = $this->db->prepare("
                    INSERT IGNORE INTO user_achievements (user_id, achievement_id, earned_at, notified)
                    VALUES (?, ?, NOW(), 0)
                ");
                $awardStmt->execute([$user_id, $ach['id']]);

                // Give XP + Points bonus
                if ($ach['xp_reward'] > 0) {
                    $userCtrl = new UserController($this->db);
                    $userCtrl->performAddXP($user_id, $ach['xp_reward']);
                }
                if ($ach['pts_reward'] > 0) {
                    $pts = $this->db->prepare("UPDATE user_profiles SET points = points + ? WHERE user_id = ?");
                    $pts->execute([$ach['pts_reward'], $user_id]);
                }

                // Create in-app notification
                $this->createNotification(
                    $user_id,
                    "Achievement Unlocked! " . $ach['icon'],
                    "You earned \"" . $ach['title'] . "\" — " . $ach['description'],
                    'achievement',
                    'trophy',
                    '#F59E0B'
                );

                $newlyAwarded[] = $ach['title'];
            }
        }

        return $newlyAwarded;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Collect all countable progress values for a user in one DB round-trip set.
     */
    private function getUserProgressData(int $user_id): array {
        $data = [
            'workouts_completed' => 0,
            'streak'             => 0,
            'level'              => 1,
            'quests_claimed'     => 0,
            'meals_completed'    => 0,
            'friends_count'      => 0,
            'challenges_won'     => 0,
        ];

        // Profile: streak, level
        $s = $this->db->prepare("SELECT streak, level FROM user_profiles WHERE user_id = ?");
        $s->execute([$user_id]);
        $row = $s->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $data['streak'] = (int)$row['streak'];
            $data['level']  = (int)$row['level'];
        }

        // Total workouts completed (count of plan days with completed=true across all workout records)
        // Count workout records where completed = 1 (full plan days completed)
        $s = $this->db->prepare("
            SELECT COUNT(*) FROM workouts WHERE user_id = ? AND completed = 1
        ");
        $s->execute([$user_id]);
        $data['workouts_completed'] = (int)$s->fetchColumn();

        // Also count individual day completions from the JSON for more accuracy
        $s2 = $this->db->prepare("SELECT plan_data FROM workouts WHERE user_id = ?");
        $s2->execute([$user_id]);
        $plans = $s2->fetchAll(PDO::FETCH_COLUMN);
        $dayCompletions = 0;
        foreach ($plans as $planJson) {
            $plan = json_decode($planJson, true);
            if (is_array($plan)) {
                foreach ($plan as $day) {
                    if (!empty($day['completed'])) $dayCompletions++;
                }
            }
        }
        // Use the higher of the two
        $data['workouts_completed'] = max($data['workouts_completed'], $dayCompletions);

        // Total quests claimed
        $s = $this->db->prepare("SELECT COUNT(*) FROM daily_quests WHERE user_id = ? AND claimed = 1");
        $s->execute([$user_id]);
        $data['quests_claimed'] = (int)$s->fetchColumn();

        // Total meals completed (from nutrition plans)
        $s = $this->db->prepare("SELECT meal_data FROM nutrition_plans WHERE user_id = ?");
        $s->execute([$user_id]);
        $mealPlans = $s->fetchAll(PDO::FETCH_COLUMN);
        $mealCount = 0;
        foreach ($mealPlans as $mealJson) {
            $meals = json_decode($mealJson, true);
            if (is_array($meals)) {
                foreach ($meals as $m) {
                    if (!empty($m['completed'])) $mealCount++;
                }
            }
        }
        $data['meals_completed'] = $mealCount;

        // Friends count (accepted only)
        $s = $this->db->prepare("SELECT COUNT(*) FROM friends WHERE user_id = ? AND status = 'accepted'");
        $s->execute([$user_id]);
        $data['friends_count'] = (int)$s->fetchColumn();

        // Challenges won
        $s = $this->db->prepare("SELECT COUNT(*) FROM user_challenges WHERE user_id = ? AND status = 'completed'");
        $s->execute([$user_id]);
        $data['challenges_won'] = (int)$s->fetchColumn();

        return $data;
    }

    /**
     * Map an achievement key to a current numeric value from progress data.
     */
    private function getCurrentValueForKey(string $key, array $progress): int {
        $map = [
            'first_workout'  => $progress['workouts_completed'],
            'workout_5'      => $progress['workouts_completed'],
            'workout_25'     => $progress['workouts_completed'],
            'workout_100'    => $progress['workouts_completed'],
            'streak_3'       => $progress['streak'],
            'streak_7'       => $progress['streak'],
            'streak_30'      => $progress['streak'],
            'streak_100'     => $progress['streak'],
            'meal_first'     => $progress['meals_completed'],
            'meals_50'       => $progress['meals_completed'],
            'quests_first'   => $progress['quests_claimed'],
            'quests_7'       => $progress['quests_claimed'],
            'quests_30'      => $progress['quests_claimed'],
            'level_5'        => $progress['level'],
            'level_10'       => $progress['level'],
            'level_25'       => $progress['level'],
            'water_7days'    => $progress['streak'], // approximate: streak implies daily water too
            'friend_first'   => $progress['friends_count'],
            'friends_5'      => $progress['friends_count'],
            'challenge_win'  => $progress['challenges_won'],
        ];
        return (int)($map[$key] ?? 0);
    }
}
