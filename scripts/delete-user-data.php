<?php
require_once __DIR__ . '/../backend/config/database.php';

$needle = strtolower(trim($argv[1] ?? ''));
if ($needle === '') {
    fwrite(STDERR, "Usage: php scripts/delete-user-data.php <name-or-email>\n");
    exit(1);
}

$database = new Database();
$db = $database->getConnection();

$userColumns = $db->query('DESCRIBE users')->fetchAll(PDO::FETCH_COLUMN);
$nameColumn = in_array('name', $userColumns, true) ? 'name' : (in_array('full_name', $userColumns, true) ? 'full_name' : null);

$where = 'LOWER(email) LIKE ?';
$params = ["%{$needle}%"];
if ($nameColumn) {
    $where .= " OR LOWER(`{$nameColumn}`) LIKE ?";
    $params[] = "%{$needle}%";
}

$stmt = $db->prepare("SELECT id, email" . ($nameColumn ? ", `{$nameColumn}` AS name" : '') . " FROM users WHERE {$where} ORDER BY id");
$stmt->execute($params);
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($users) === 0) {
    echo "No user found matching '{$needle}'.\n";
    exit(0);
}

if (count($users) > 1) {
    echo "Multiple users matched '{$needle}'. Delete one by exact email instead:\n";
    foreach ($users as $user) {
        echo "  id={$user['id']} email={$user['email']}" . (isset($user['name']) ? " name={$user['name']}" : '') . "\n";
    }
    exit(2);
}

$userId = (int)$users[0]['id'];
echo "Deleting user id={$userId} email={$users[0]['email']}" . (isset($users[0]['name']) ? " name={$users[0]['name']}" : '') . "\n";

$tables = $db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
$deleted = [];

$db->beginTransaction();
try {
    $db->exec('SET FOREIGN_KEY_CHECKS = 0');

    foreach ($tables as $table) {
        $safeTable = str_replace('`', '``', $table);
        $columns = $db->query("DESCRIBE `{$safeTable}`")->fetchAll(PDO::FETCH_COLUMN);

        foreach (['user_id', 'sender_id', 'receiver_id', 'from_user_id', 'to_user_id', 'created_by', 'participant_id'] as $column) {
            if (!in_array($column, $columns, true)) {
                continue;
            }
            $stmt = $db->prepare("DELETE FROM `{$safeTable}` WHERE `{$column}` = ?");
            $stmt->execute([$userId]);
            $count = $stmt->rowCount();
            if ($count > 0) {
                $deleted[] = "{$table}.{$column}: {$count}";
            }
        }
    }

    $stmt = $db->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $deleted[] = 'users.id: ' . $stmt->rowCount();

    $db->exec('SET FOREIGN_KEY_CHECKS = 1');
    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    $db->exec('SET FOREIGN_KEY_CHECKS = 1');
    throw $e;
}

echo "Deleted rows:\n";
foreach ($deleted as $line) {
    echo "  {$line}\n";
}
echo "Done.\n";
