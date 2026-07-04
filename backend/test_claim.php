<?php
/**
 * Test Daily Quests Claiming Endpoint
 * Run via: php test_claim.php
 */
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/controllers/FitnessController.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("❌ Error connecting to database.\n");
}

$userId = 1;

// Retrieve the quest ID for steps
$questId = $db->query("SELECT id FROM daily_quests WHERE user_id = $userId AND quest_type = 'steps' AND date_logged = CURDATE()")->fetchColumn();

if (!$questId) {
    die("❌ Quest not found. Run test_quests.php first.\n");
}

// Complete the quest in the DB to allow claiming
$db->exec("UPDATE daily_quests SET current_value = target_value, completed = 1 WHERE id = $questId");

// Instantiate and mock getRequestData and requireAuth
class TestClaimFitnessController extends FitnessController {
    protected function requireAuth() {
        return 1;
    }
    protected function getRequestData() {
        return (object) ['quest_id' => $GLOBALS['test_quest_id']];
    }
}
$GLOBALS['test_quest_id'] = $questId;

$controller = new TestClaimFitnessController();

echo "Running claimDailyQuest for quest ID: $questId...\n";
$controller->claimDailyQuest();
?>
