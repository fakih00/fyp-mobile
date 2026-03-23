# AI Fitness App Backend

## Setup Instructions

### Prerequisites
- PHP 7.4 or higher
- MySQL Database (e.g., via XAMPP, WAMP, or MAMP)
- MySQL Workbench (optional, for management)

### Installation
1. **Database Setup**:
    - Open MySQL Workbench or phpMyAdmin.
    - Create a new database named `fitness_app`.
    - Import the `schema.sql` file located in the root of this `backend` folder.
2. **Configuration**:
    - Open `config/database.php`.
    - Update `$username` and `$password` if your local MySQL credentials differ from `root` / `` (empty).
3. **Running the Server**:
    - You can use PHP's built-in server for testing:
      ```bash
      cd backend
      php -S localhost:8000
      ```
    - Your API URL will be `http://localhost:8000/api/`.

## API Documentation

### Authentication
- `POST /api/register.php`
  - Body: `{ "name": "John", "email": "john@example.com", "password": "123" }`
- `POST /api/login.php`
  - Body: `{ "email": "john@example.com", "password": "123" }`
  - Returns: `{ "token": "...", "user_id": 1 }`

### AI Plan Generation
- `POST /api/generatePlan.php`
  - Body: `{ "user_id": 1, "type": "workout" }`
  - Body: `{ "user_id": 1, "type": "nutrition" }`
  - Note: User must have a profile in `user_profiles` table (insert manually or extend API).

### Progress Prediction
- `GET /api/predictProgress.php?user_id=1`
  - Returns linear regression prediction based on `progress` table history.

### Challenges
- `GET /api/getChallenges.php`
  - Returns list of challenges.
- `POST /api/joinChallenge.php`
  - Body: `{ "user_id": 1, "challenge_id": 1 }`
- `POST /api/completeChallenge.php`
  - Body: `{ "user_id": 1, "challenge_id": 1 }`

### Social & Gamification (Phase 2)
- `GET /api/getUser.php?user_id=1`
  - Returns profile + stats (level, xp, points).
- `POST /api/updateUser.php`
  - Body: `{ "user_id": 1, "xp": 1500, "level": 6 }`
- `GET /api/getFriends.php?user_id=1`
- `POST /api/addFriend.php` (Body: `{ "user_id": 1, "friend_id": 2 }`)
- `GET /api/getMessages.php?user_id=1&friend_id=2`
- `POST /api/sendMessage.php` (Body: `{ "sender_id": 1, "receiver_id": 2, "content": "Hi!" }`)
- `GET /api/getRewards.php`
- `POST /api/redeemReward.php` (Body: `{ "user_id": 1, "reward_id": 1 }`)
- `GET /api/getLeaderboard.php`
- `POST /api/logActivity.php`
  - Body: `{ "user_id": 1, "type": "weight", "value": 75.5 }`

## AI Logic Explanation
- **WorkoutAI**: Generates weekly split based on goal (lose weight vs muscle) and activity level.
- **NutritionAI**: Calculates BMR using Mifflin-St Jeor equation and distributes macros.
- **PredictionAI**: Uses Linear Regression on historical weight data to predict 30-day trend.
