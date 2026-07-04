<?php
/**
 * Complete Quest Claiming End-to-End Test
 * Run via: php test_complete_claim.php
 */
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/controllers/FitnessController.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("❌ Error connecting to database.\n");
}

$userId = 1;

// 1. Mock today's daily_logs to show 8,500 steps and 3,100 ml of water
$today = date('Y-m-d');
$db->exec("INSERT INTO daily_logs (user_id, date_logged, steps, water_ml, sleep_hours, stress_level, weight) 
           VALUES ($userId, '$today', 8500, 3100, 8, 'low', 75) 
           ON DUPLICATE KEY UPDATE steps = 8500, water_ml = 3100");
echo "1. Mocked daily_logs steps=8500, water_ml=3100.\n";

// 2. Fetch quests to trigger generation and synchronization
class TestCompleteFitnessController extends FitnessController {
    protected function requireAuth() {
        return 1;
    }
    protected function getRequestData() {
        return (object) ['quest_id' => $GLOBALS['test_quest_id']];
    }
}

$controller = new TestCompleteFitnessController();
ob_start();
$controller->getDailyQuests();
$output = ob_get_clean();

$quests = json_decode($output, true);
echo "2. Generated & synced quests. Current steps quest progress:\n";
$stepsQuest = null;
foreach ($quests as $q) {
    if ($q['quest_type'] === 'steps') {
        $stepsQuest = $q;
        echo "   Quest: '{$q['title']}' | Progress: {$q['current_value']}/{$q['target_value']} | Completed: {$q['completed']}\n";
    }
}

if (!$stepsQuest) {
    die("❌ Steps quest not found.\n");
}

// 3. Claim the completed quest
$GLOBALS['test_quest_id'] = $stepsQuest['id'];
echo "3. Claiming quest ID: {$stepsQuest['id']}...\n";

ob_start();
$controller->claimDailyQuest();
$claimOutput = ob_get_clean();

$claimResult = json_decode($claimOutput, true);
if (isset($claimResult['message']) && $claimResult['message'] === "Quest claimed successfully") {
    echo "🎉 SUCCESS: Quest claimed successfully!\n";
    echo "   XP Reward: +{$claimResult['xp_reward']} XP | Points Reward: +{$claimResult['points_reward']} PTS\n";
    echo "   User Level: {$claimResult['user_stats']['level']} | XP: {$claimResult['user_stats']['xp']} | Points: {$claimResult['user_stats']['points']}\n";
} else {
    echo "❌ FAILED: " . json_encode($claimResult) . "\n";
}
?>
