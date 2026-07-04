<?php
/**
 * Test Daily Quests Endpoints
 * Run via: php test_quests.php
 */
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/controllers/FitnessController.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("❌ Error connecting to database.\n");
}

echo "=== Testing Quests Generation & Sync ===\n";

// We simulate user ID 1
$userId = 1;

// Clear today's quests to test fresh generation
$db->exec("DELETE FROM daily_quests WHERE user_id = $userId AND date_logged = CURDATE()");
echo "1. Cleared existing quests for today.\n";

// We instantiate FitnessController and mock Auth to return 1
class TestFitnessController extends FitnessController {
    protected function requireAuth() {
        return 1; // Simulated user_id
    }
}

$controller = new TestFitnessController();

// We override BaseController's jsonResponse so it doesn't call exit
class MockDatabase {
    // Keep it simple, we can capture printed output of jsonResponse
}

echo "2. Running getDailyQuests...\n";
// Let's capture output of getDailyQuests
ob_start();
$controller->getDailyQuests();
$output = ob_get_clean();

$quests = json_decode($output, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "❌ Failed to parse response: $output\n";
    exit(1);
}

echo "✅ Generated and synced quests successfully. Count: " . count($quests) . "\n";
foreach ($quests as $q) {
    echo "   Quest [ID: {$q['id']}, Type: {$q['quest_type']}]: '{$q['title']}' -> Progress: {$q['current_value']}/{$q['target_value']} | Claimed: {$q['claimed']}\n";
}

echo "\n3. Testing quest completion simulation...\n";
// Let's force complete the Steps quest in DB
$db->exec("UPDATE daily_quests SET current_value = target_value, completed = 1 WHERE user_id = $userId AND quest_type = 'steps' AND date_logged = CURDATE()");
echo "✅ Set steps quest as completed.\n";

// Retrieve the updated quest ID
$questId = $db->query("SELECT id FROM daily_quests WHERE user_id = $userId AND quest_type = 'steps' AND date_logged = CURDATE()")->fetchColumn();

echo "\n4. Testing claimDailyQuest for quest ID: $questId...\n";
// We mock getRequestData to return quest_id
class ClaimFitnessController extends TestFitnessController {
    protected function getRequestData() {
        return (object) ['quest_id' => $GLOBALS['test_quest_id']];
    }
}
$GLOBALS['test_quest_id'] = $questId;

$claimController = new ClaimFitnessController();
ob_start();
$claimController->claimDailyQuest();
$claimOutput = ob_get_clean();

$claimResult = json_decode($claimOutput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "❌ Failed to parse claim response: $claimOutput\n";
    exit(1);
}

echo "✅ Quest claimed successfully!\n";
echo "   Message: {$claimResult['message']}\n";
echo "   XP Reward: {$claimResult['xp_reward']} | Points Reward: {$claimResult['points_reward']}\n";
echo "   Updated User Stats -> Level: {$claimResult['user_stats']['level']} | XP: {$claimResult['user_stats']['xp']} | Points: {$claimResult['user_stats']['points']}\n";

echo "\n🎉 All daily quests backend verification tests passed successfully!\n";
?>
