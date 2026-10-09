<?php
ini_set('display_errors', '0');
ini_set('log_errors', '1');
/**
 * Centralized API Router
 * 
 * Single entry point for all API requests. Handles:
 * - CORS preflight
 * - Route resolution
 * - Authentication (via AuthMiddleware)
 * - Rate limiting (for auth endpoints)
 * - Controller dispatch
 */

// 1. CORS & Preflight
require_once __DIR__ . '/../middleware/cors.php';

// 2. Parse the endpoint from the URL
//    Supports: /api/getDashboard, /api/getDashboard.php, /api/index.php/getDashboard
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip common prefixes
$uri = preg_replace('#^.*/api/#', '', $uri);
// Strip index.php/ prefix if routed through index.php
$uri = preg_replace('#^index\.php/?#', '', $uri);
// Strip .php extension for backwards compatibility
$endpoint = basename($uri, '.php');
// Clean up any trailing slashes
$endpoint = rtrim($endpoint, '/');

// 3. Route Table
//    Format: 'endpoint' => ['ControllerFile', 'ControllerClass', 'method', requireAuth, rateLimitConfig]
//    rateLimitConfig: false or [maxAttempts, windowSeconds]
$routes = [
    // ─── Auth (no token needed) ───────────────────────────
    'login'                    => ['AuthController', 'login', false, [5, 60]],
    'register'                 => ['AuthController', 'register', false, [3, 60]],
    'logout'                   => ['AuthController', 'logout', true, false],

    // ─── Dashboard & Fitness ──────────────────────────────
    'getDashboard'             => ['FitnessController', 'getDashboard', true, false],
    'getWorkouts'              => ['FitnessController', 'getWorkouts', true, false],
    'getNutritionPlan'         => ['FitnessController', 'getNutritionPlan', true, false],
    'generatePlan'             => ['FitnessController', 'generatePlan', true, false],
    'replaceMeal'              => ['FitnessController', 'replaceMeal', true, false],
    'getMealSwaps'             => ['FitnessController', 'getMealSwaps', true, false],
    'getMealFeedback'          => ['FitnessController', 'getMealFeedback', true, false],
    'saveMealFeedback'         => ['FitnessController', 'saveMealFeedback', true, false],
    'getMealReviews'           => ['FitnessController', 'getMealReviews', true, false],
    'saveMealReview'           => ['FitnessController', 'saveMealReview', true, false],
    'getMealReviewAccess'      => ['FitnessController', 'getMealReviewAccess', true, false],
    'getExerciseTutorialReviews' => ['FitnessController', 'getExerciseTutorialReviews', true, false],
    'saveExerciseTutorialReview' => ['FitnessController', 'saveExerciseTutorialReview', true, false],
    'updateWorkoutProgress'    => ['FitnessController', 'updateWorkoutProgress', true, false],
    'updateMealProgress'       => ['FitnessController', 'updateMealProgress', true, false],
    'getSuggestedGoalWeight'   => ['FitnessController', 'getSuggestedGoalWeight', true, false],
    'analyzeExerciseVideo'     => ['ExerciseAIController', 'analyzeVideo', true, false],

    // ─── User & Profile ───────────────────────────────────
    'getUser'                  => ['UserController', 'getUser', true, false],
    'getUsers'                 => ['UserController', 'getUsers', true, false],
    'updateUser'               => ['UserController', 'updateUser', true, false],
    'getFriends'               => ['UserController', 'getFriends', true, false],
    'addFriend'                => ['UserController', 'addFriend', true, false],
    'getFriendRequests'        => ['UserController', 'getFriendRequests', true, false],
    'respondToFriendRequest'   => ['UserController', 'respondToFriendRequest', true, false],
    'getLeaderboard'           => ['UserController', 'getLeaderboard', true, false],

    // ─── Challenges ───────────────────────────────────────
    'getChallenges'            => ['ChallengeController', 'getChallenges', true, false],
    'getUserChallenges'        => ['ChallengeController', 'getUserChallenges', true, false],
    'joinChallenge'            => ['ChallengeController', 'join', true, false],
    'leaveChallenge'           => ['ChallengeController', 'leaveChallenge', true, false],
    'completeChallenge'        => ['ChallengeController', 'completeChallenge', true, false],

    // ─── Social ───────────────────────────────────────────
    'getFeed'                  => ['SocialController', 'getFeed', true, false],
    'createPost'               => ['SocialController', 'createPost', true, false],
    'deletePost'               => ['SocialController', 'deletePost', true, false],
    'likePost'                 => ['SocialController', 'likePost', true, false],
    'addComment'               => ['SocialController', 'addComment', true, false],
    'getClubs'                 => ['SocialController', 'getClubs', true, false],
    'getClubMessages'          => ['ClubChatController', 'getMessages', true, false],
    'sendClubMessage'          => ['ClubChatController', 'sendMessage', true, false],
    'joinClub'                 => ['SocialController', 'joinClub', true, false],
    'createClub'               => ['SocialController', 'createClub', true, false],

    // ─── Rewards & Shop ───────────────────────────────────
    'getRewards'               => ['SocialController', 'getRewards', true, false],
    'redeemReward'             => ['SocialController', 'redeemReward', true, false],
    'getRedemptions'           => ['SocialController', 'getRedemptions', true, false],

    // ─── Messages ─────────────────────────────────────────
    'getConversations'         => ['MessageController', 'getConversations', true, false],
    'getMessages'              => ['MessageController', 'getMessages', true, false],
    'sendMessage'              => ['MessageController', 'sendMessage', true, false],

    // ─── Notifications ────────────────────────────────────
    'getNotifications'         => ['NotificationController', 'getNotifications', true, false],
    'markNotificationRead'     => ['NotificationController', 'markAsRead', true, false],
    'markAllNotificationsRead' => ['NotificationController', 'markAllAsRead', true, false],

    // ─── Progress & Weight ────────────────────────────────
    'getWeightHistory'         => ['ProgressController', 'getWeightHistory', true, false],
    'getProgressStats'         => ['ProgressController', 'getStats', true, false],
    'predictProgress'          => ['ProgressController', 'getPrediction', true, false],
    'getActivityHistory'       => ['ProgressController', 'getActivityHistory', true, false],
    'get30DayWorkoutHistory'   => ['ProgressController', 'get30DayWorkoutHistory', true, false],
    'get30DayMealHistory'      => ['ProgressController', 'get30DayMealHistory', true, false],
    'checkWeightLogged'        => ['ProgressController', 'checkWeightLogged', true, false],
    'logDailyPulse'            => ['ProgressController', 'logDailyPulse', true, false],
    'logWater'                 => ['ProgressController', 'logWater', true, false],
    'getDailyQuests'           => ['FitnessController', 'getDailyQuests', true, false],
    'claimDailyQuest'          => ['FitnessController', 'claimDailyQuest', true, false],

    // ─── Achievements ──────────────────────────────────────────────────
    'getAchievements'          => ['AchievementController', 'getAchievements', true, false],
    // ─── AI Chat ──────────────────────────────────────────────────
    'aiChat'                   => ['AIChatController', 'chat',         true, false],
    'getAIChatHistory'         => ['AIChatController', 'getHistory',   true, false],
    'clearAIChatHistory'       => ['AIChatController', 'clearHistory', true, false],
    'generateCompetitionPlan'  => ['CompetitionController', 'generatePlan', true, false],
    'getCompetitionPlan'       => ['CompetitionController', 'getPlan', true, false],
    'updateCompetitionProgress' => ['CompetitionController', 'updateProgress', true, false],

    // ─── Audit ────────────────────────────────────────────────────
    'auditProgress'            => ['ProgressController', 'auditProgress', true, false],
    'getProgressAudit'         => ['ProgressController', 'getProgressAudit', true, false],
    'simulateTrajectory'       => ['ProgressController', 'simulateTrajectory', true, false],
    'getDailyBioAdvisory'      => ['ProgressController', 'getDailyBioAdvisory', true, false],
    'logActivity'              => ['ProgressController', 'logActivity', true, false],
];

// 4. Handle special endpoints
if ($endpoint === 'ping' || $endpoint === '') {
    echo json_encode(["status" => "online", "message" => "Backend is reachable."]);
    exit;
}

// 5. Look up route
if (!isset($routes[$endpoint])) {
    http_response_code(404);
    echo json_encode(["message" => "Endpoint not found", "endpoint" => $endpoint]);
    exit;
}

$route = $routes[$endpoint];
$controllerClass = $route[0];
$method           = $route[1];
$requireAuth      = $route[2];
$rateLimit        = $route[3];

// 6. Apply Rate Limiting (if configured)
if ($rateLimit !== false) {
    require_once __DIR__ . '/../middleware/RateLimiter.php';
    $limiter = new RateLimiter();
    $ip = RateLimiter::getClientIP();
    $limiter->enforce($endpoint . '_' . $ip, $rateLimit[0], $rateLimit[1]);
}

// 7. Load controller and dispatch
$controllerFile = __DIR__ . "/../controllers/{$controllerClass}.php";

if (!file_exists($controllerFile)) {
    http_response_code(500);
    echo json_encode(["message" => "Controller not found: {$controllerClass}"]);
    exit;
}

try {
    require_once $controllerFile;
    $controller = new $controllerClass();

    if (!method_exists($controller, $method)) {
        throw new RuntimeException("Method not found: {$controllerClass}::{$method}");
    }

    // 8. Dispatch — the controller method handles auth internally via requireAuth()
    $controller->$method();
} catch (Throwable $error) {
    error_log("API {$endpoint} failed: " . $error);
    http_response_code(500);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(["message" => "Internal server error"]);
}
