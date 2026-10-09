<?php
require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/controllers/UserController.php';

class LeaderboardTestResponse extends RuntimeException {
    public $data;
    public function __construct($data) { $this->data = $data; parent::__construct('Captured response'); }
}

class LeaderboardTestController extends UserController {
    public $testUserId;
    protected function requireAuth() { return $this->testUserId; }
    protected function jsonResponse($data, $status = 200) { throw new LeaderboardTestResponse($data); }
}

function recordsFor($controller, $mode) {
    $_GET = ['mode' => $mode];
    try { $controller->getLeaderboard(); }
    catch (LeaderboardTestResponse $response) { return $response->data['records']; }
    throw new RuntimeException('No leaderboard response');
}

$db = (new Database())->getConnection();
$db->beginTransaction();
try {
    $prefix = 'leaderboard-check-' . bin2hex(random_bytes(6));
    $insertUser = $db->prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)');
    $insertProfile = $db->prepare("INSERT INTO user_profiles (user_id,age,gender,height,weight,goal,activity_level,xp) VALUES (?,24,'male',175,75,'maintain','moderately_active',?)");
    $hash = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
    $ids = [];
    for ($i = 0; $i < 101; $i++) {
        $insertUser->execute(['Leaderboard test', "$prefix-$i@elitefitness.local", $hash]);
        $ids[] = (int)$db->lastInsertId();
        $insertProfile->execute([$ids[$i], 500]);
    }
    $friends = $db->prepare('INSERT INTO friends (user_id,friend_id,status) VALUES (?,?,?)');
    $friends->execute([$ids[0], $ids[1], 'accepted']);
    $friends->execute([$ids[1], $ids[0], 'accepted']);
    $friends->execute([$ids[2], $ids[0], 'accepted']);
    $friends->execute([$ids[0], $ids[3], 'pending']);
    $controller = new LeaderboardTestController($db);
    $controller->testUserId = $ids[0];

    $global = recordsFor($controller, 'Global');
    $expectedCount = (int)$db->query('SELECT COUNT(*) FROM users u JOIN user_profiles p ON p.user_id=u.id')->fetchColumn();
    if (count($global) !== $expectedCount || count($global) <= 100) throw new RuntimeException('Global counts are truncated.');
    foreach ($global as $index => $record) {
        if ($record['rank'] !== $index + 1) throw new RuntimeException('Incorrect rank position.');
        if ($index && $global[$index - 1]['xp'] < $record['xp']) throw new RuntimeException('Incorrect XP ordering.');
        if ($index && $global[$index - 1]['xp'] === $record['xp'] && $global[$index - 1]['id'] > $record['id']) throw new RuntimeException('Unstable tied rankings.');
    }
    $friendRecords = recordsFor($controller, 'Friends');
    $actualIds = array_map('intval', array_column($friendRecords, 'id'));
    sort($actualIds);
    if ($actualIds !== array_slice($ids, 0, 3)) throw new RuntimeException('Friends must include self, both directions, no duplicates, and no pending requests.');
    echo "PASS: complete Global counts, XP ordering, stable ties, bidirectional friendships and pending-request exclusion.\n";
} finally {
    $db->rollBack();
    echo "Temporary test records rolled back.\n";
}
