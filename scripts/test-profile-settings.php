<?php
require_once __DIR__ . '/../backend/config/database.php';
$db = (new Database())->getConnection();
$users = [];
$avatarPath = null;
function profileCheck($condition, $message) { if (!$condition) throw new RuntimeException($message); }
function profileRequest($user, $route, $body = null, $query = []) {
    $curl = curl_init('http://127.0.0.1:8000/api/' . $route . ($query ? '?' . http_build_query($query) : ''));
    $options = [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $user['token']]];
    if ($body !== null) { $options[CURLOPT_POST] = true; $options[CURLOPT_POSTFIELDS] = json_encode($body); }
    curl_setopt_array($curl, $options);
    $raw = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    $data = json_decode((string)$raw, true);
    profileCheck(is_array($data), 'Invalid response from ' . $route);
    return [$status, $data];
}
try {
    for ($i = 0; $i < 2; $i++) {
        $token = bin2hex(random_bytes(32));
        $email = 'profile-check-' . bin2hex(random_bytes(8)) . '@elitefitness.local';
        $db->prepare('INSERT INTO users(name,email,password_hash,api_token,token_expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(),INTERVAL 15 MINUTE))')->execute(['Profile test', $email, password_hash($token, PASSWORD_DEFAULT), hash('sha256', $token)]);
        $id = (int)$db->lastInsertId();
        $users[] = ['id' => $id, 'token' => $token];
        $db->prepare("INSERT INTO user_profiles(user_id,age,gender,height,weight,goal,activity_level,xp) VALUES(?,24,'male',175,75,'maintain','moderately_active',0)")->execute([$id]);
    }
    [$owner, $viewer] = $users;
    [$status] = profileRequest($owner, 'updateUser', ['name' => ' Saved Profile Name ', 'weight' => 76, 'theme' => 'Emerald', 'sleep_hours' => 8, 'stress_level' => 'low', 'strong_side' => 'Upper Body: LEFT, Lower Body: SYMMETRIC']);
    profileCheck($status === 200, 'Profile edit failed.');
    [, $profile] = profileRequest($owner, 'getUser');
    profileCheck($profile['name'] === 'Saved Profile Name' && (float)$profile['profile']['weight'] === 76.0 && (float)$profile['profile']['sleep_hours'] === 8.0, 'Profile values not persisted.');
    [$status] = profileRequest($owner, 'updateUser', ['name' => 'Must not save', 'weight' => -1]);
    profileCheck($status === 400, 'Invalid measurements accepted.');
    [, $profile] = profileRequest($owner, 'getUser');
    profileCheck($profile['name'] === 'Saved Profile Name', 'Rejected edit changed name.');

    $image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jE9sAAAAASUVORK5CYII=';
    [$status, $saved] = profileRequest($owner, 'updateUser', ['avatar' => $image]);
    profileCheck($status === 200 && str_contains($saved['avatar'], '/uploads/avatars/'), 'Avatar storage failed.');
    $avatarPath = __DIR__ . '/../backend' . parse_url($saved['avatar'], PHP_URL_PATH);
    profileCheck(is_file($avatarPath), 'Avatar file missing.');
    [, $profile] = profileRequest($owner, 'getUser');
    profileCheck($profile['profile']['avatar'] === $saved['avatar'], 'Avatar did not survive reload.');

    foreach (['friend_request','social','general'] as $type) $db->prepare('INSERT INTO notifications(user_id,title,message,type) VALUES(?,?,?,?)')->execute([$owner['id'], 'Test', 'Test notification', $type]);
    profileRequest($owner, 'updateUser', ['notification_preferences' => ['enabled' => true, 'friendRequests' => false, 'communityUpdates' => false, 'activityUpdates' => true]]);
    [, $notifications] = profileRequest($owner, 'getNotifications');
    profileCheck(count($notifications['records']) === 1 && $notifications['records'][0]['type'] === 'general', 'Notification category preferences ignored.');
    profileRequest($owner, 'updateUser', ['notification_preferences' => ['enabled' => false]]);
    [, $notifications] = profileRequest($owner, 'getNotifications');
    profileCheck(count($notifications['records']) === 0, 'Master notification preference ignored.');
    [, $profile] = profileRequest($owner, 'getUser');
    profileCheck($profile['profile']['notification_preferences']['enabled'] === false, 'Preferences did not persist.');

    $sessions = [['id'=>'w1','day'=>'Monday','completed'=>true], ['id'=>'w2','day'=>'Wednesday','completed'=>false]];
    $db->prepare('INSERT INTO workouts(user_id,plan_data,date_generated,completed) VALUES(?,?,CURDATE(),0)')->execute([$owner['id'], json_encode($sessions)]);
    [, $profile] = profileRequest($owner, 'getUser');
    profileCheck($profile['stats']['workouts'] === 1, 'Completed session not counted.');
    [, $public] = profileRequest($viewer, 'getUser', null, ['user_id' => $owner['id']]);
    profileCheck(!isset($public['email']) && !isset($public['profile']['weight']) && !isset($public['profile']['notification_preferences']), 'Private profile fields exposed.');
    profileRequest($owner, 'logout', []);
    [$status] = profileRequest($owner, 'getUser');
    profileCheck($status === 401, 'Sign-out did not invalidate token.');
    echo "PASS: name, measurements, theme, avatar persistence, validation, notification preferences, session counts, public profile boundaries and sign-out.\n";
} finally {
    foreach ($users as $user) $db->prepare('DELETE FROM users WHERE id=?')->execute([$user['id']]);
    if ($avatarPath && is_file($avatarPath)) unlink($avatarPath);
    echo "Temporary profile test data removed.\n";
}
