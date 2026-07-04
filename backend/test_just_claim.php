<?php
/**
 * Test claiming only
 */
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/controllers/FitnessController.php';

$database = new Database();
$db = $database->getConnection();

$userId = 1;
$questId = $db->query("SELECT id FROM daily_quests WHERE user_id = $userId AND quest_type = 'steps' AND date_logged = CURDATE()")->fetchColumn();

class TestClaimOnly extends FitnessController {
    protected function requireAuth() { return 1; }
    protected function getRequestData() { return (object) ['quest_id' => $GLOBALS['test_quest_id']]; }
}
$GLOBALS['test_quest_id'] = $questId;

$controller = new TestClaimOnly();
$controller->claimDailyQuest();
?>
