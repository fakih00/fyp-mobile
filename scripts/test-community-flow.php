<?php
require_once __DIR__ . '/../backend/config/database.php';
$db = (new Database())->getConnection();
$users = [];
$clubs = [];
$imagePaths = [];

function expect($condition, $message) {
    if (!$condition) throw new RuntimeException($message);
}

function communityRequest($user, $route, $payload = null, $query = []) {
    $url = 'http://127.0.0.1:8000/api/' . $route . ($query ? '?' . http_build_query($query) : '');
    $curl = curl_init($url);
    $options = [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $user['token']]];
    if ($payload !== null) {
        $options[CURLOPT_POST] = true;
        $options[CURLOPT_POSTFIELDS] = json_encode($payload);
    }
    curl_setopt_array($curl, $options);
    $raw = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    $data = json_decode((string)$raw, true);
    expect(is_array($data), 'Invalid JSON from ' . $route);
    return [$status, $data];
}

try {
    $prefix = 'community-check-' . bin2hex(random_bytes(6));
    for ($i = 0; $i < 3; $i++) {
        $token = bin2hex(random_bytes(32));
        $stmt = $db->prepare('INSERT INTO users(name,email,password_hash,api_token,token_expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(),INTERVAL 15 MINUTE))');
        $stmt->execute(['Community test ' . $i, "$prefix-$i@elitefitness.local", password_hash($token, PASSWORD_DEFAULT), hash('sha256', $token)]);
        $id = (int)$db->lastInsertId();
        $users[] = ['id' => $id, 'token' => $token];
        $db->prepare("INSERT INTO user_profiles(user_id,age,gender,height,weight,goal,activity_level,xp,points) VALUES(?,24,'male',175,75,'maintain','moderately_active',600,900)")->execute([$id]);
    }
    [$owner, $friend, $stranger] = $users;
    [$status] = communityRequest($owner, 'respondToFriendRequest', ['friend_id' => $stranger['id'], 'action' => 'accept']);
    expect($status === 404, 'Must not accept a nonexistent request.');
    communityRequest($friend, 'addFriend', ['friend_id' => $owner['id']]);
    [, $people] = communityRequest($owner, 'getUsers');
    $incoming = array_values(array_filter($people['records'], fn($person) => $person['id'] == $friend['id']))[0];
    expect($incoming['request_direction'] === 'incoming' && (int)$incoming['xp'] === 600, 'Incorrect incoming request or XP.');
    [$status] = communityRequest($owner, 'respondToFriendRequest', ['friend_id' => $friend['id'], 'action' => 'accept']);
    expect($status === 200, 'Friend acceptance failed.');
    foreach ([[$owner, $friend], [$friend, $owner]] as [$viewer, $other]) {
        [, $friends] = communityRequest($viewer, 'getFriends');
        expect(count(array_filter($friends['records'], fn($record) => $record['id'] == $other['id'])) === 1, 'Friendship must appear once on both sides.');
    }
    [$status] = communityRequest($owner, 'sendMessage', ['receiver_id' => $friend['id'], 'content' => 'Direct message test']);
    expect($status === 200, 'Direct message send failed.');
    [, $direct] = communityRequest($friend, 'getMessages', null, ['friend_id' => $owner['id']]);
    expect(count($direct['records']) === 1 && $direct['records'][0]['text'] === 'Direct message test', 'Direct message not persisted.');

    $image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jE9sAAAAASUVORK5CYII=';
    [$status, $post] = communityRequest($owner, 'createPost', ['content' => '', 'image' => $image, 'visibility' => 'friends']);
    expect($status === 201, 'Image-only post creation failed.');
    $postId = $post['post_id'];
    [, $feed] = communityRequest($owner, 'getFeed');
    $saved = array_values(array_filter($feed['records'], fn($record) => $record['id'] == $postId))[0];
    expect($saved['visibility'] === 'friends' && !str_starts_with($saved['image'], 'data:'), 'Visibility or image storage failed.');
    $imagePaths[] = __DIR__ . '/../backend' . parse_url($saved['image'], PHP_URL_PATH);
    [, $feed] = communityRequest($stranger, 'getFeed');
    expect(!array_filter($feed['records'], fn($record) => $record['id'] == $postId), 'Squad-only post leaked.');
    [$status] = communityRequest($stranger, 'likePost', ['post_id' => $postId]);
    expect($status === 404, 'Stranger can like a restricted post.');
    [$status] = communityRequest($stranger, 'addComment', ['post_id' => $postId, 'content' => 'Not allowed']);
    expect($status === 404, 'Stranger can comment on a restricted post.');
    [$status] = communityRequest($friend, 'likePost', ['post_id' => $postId]);
    expect($status === 200, 'Friend cannot like a squad post.');
    [$status] = communityRequest($friend, 'addComment', ['post_id' => $postId, 'content' => 'Saved comment']);
    expect($status === 201, 'Comment creation failed.');
    [, $feed] = communityRequest($friend, 'getFeed');
    $saved = array_values(array_filter($feed['records'], fn($record) => $record['id'] == $postId))[0];
    expect($saved['comments_count'] === 1 && count($saved['comments']) === 1 && $saved['likes'] === 1, 'Feed counters or persistence incorrect.');
    [$status] = communityRequest($friend, 'deletePost', ['post_id' => $postId]);
    expect($status === 404, 'A friend may delete another author post.');

    [$status, $club] = communityRequest($owner, 'createClub', ['name' => $prefix, 'tag' => 'Strength', 'description' => 'Temporary test club']);
    expect($status === 201, 'Club creation failed.');
    $clubId = $club['club_id'];
    $clubs[] = $clubId;
    [, $records] = communityRequest($owner, 'getClubs');
    $savedClub = array_values(array_filter($records['records'], fn($record) => $record['id'] == $clubId))[0];
    expect($savedClub['members'] === 1 && $savedClub['is_member'], 'Creator is not counted as member.');
    [$status] = communityRequest($friend, 'getClubMessages', null, ['club_id' => $clubId]);
    expect($status === 403, 'Nonmember can access chat.');
    communityRequest($friend, 'joinClub', ['club_id' => $clubId]);
    [, $records] = communityRequest($friend, 'getClubs');
    $savedClub = array_values(array_filter($records['records'], fn($record) => $record['id'] == $clubId))[0];
    expect($savedClub['members'] === 2 && $savedClub['is_member'], 'Join count is incorrect.');
    [$status] = communityRequest($friend, 'sendClubMessage', ['club_id' => $clubId, 'content' => 'Persistent club message']);
    expect($status === 201, 'Club chat send failed.');
    [, $messages] = communityRequest($owner, 'getClubMessages', null, ['club_id' => $clubId]);
    expect(count($messages['records']) === 1 && $messages['records'][0]['text'] === 'Persistent club message' && !$messages['records'][0]['is_mine'], 'Shared chat not persisted correctly.');
    communityRequest($friend, 'joinClub', ['club_id' => $clubId]);
    [$status] = communityRequest($friend, 'getClubMessages', null, ['club_id' => $clubId]);
    expect($status === 403, 'Former member retains chat access.');
    [, $records] = communityRequest($owner, 'getClubs');
    $savedClub = array_values(array_filter($records['records'], fn($record) => $record['id'] == $clubId))[0];
    expect($savedClub['members'] === 1, 'Leave count is incorrect.');
    echo "PASS: friend requests, reciprocal lists, direct messages, XP, private feed, image posts, likes, comments, ownership, club membership counts and persistent member-only chat.\n";
} finally {
    foreach ($clubs as $id) $db->prepare('DELETE FROM clubs WHERE id=?')->execute([$id]);
    foreach ($users as $user) {
        $db->prepare('DELETE FROM users WHERE id=?')->execute([$user['id']]);
    }
    foreach ($imagePaths as $imagePath) if (is_file($imagePath)) unlink($imagePath);
    echo "Temporary community test data removed.\n";
}
