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
    - On Windows, run `powershell -ExecutionPolicy Bypass -File backend/start-server.ps1` from the project root. It configures a writable upload temp folder and the API router.
    - On other systems, run `php -S 0.0.0.0:8000 router.php` from `backend`, with `upload_tmp_dir` set to a writable directory for video uploads.
    - Your API URL will be `http://localhost:8000/api/` locally or `http://<computer-LAN-IP>:8000/api/` on a phone.
    - Run `php backend/migration_recovery.php` and `php backend/migration_competition.php` once after importing the base schema to enable recovery and competition plans.

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
  - Returns local neural-network prediction based on `progress` table history.

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
- **TrainCore AI / WorkoutAI**: Python local feed-forward neural-network workout recommendation model. The Python model ranks a 220-record public-source exercise dataset using the user's goal, training frequency, location, intensity, and injury filters; PHP only wraps it for the API. Training/validation runs with `npm run train:workout-ai` and saves `ml/workout_ai/traincore_trained_model.json`. External generation APIs are not used for workout generation.
- **NutriCore AI / NutritionAI**: Python-owned feed-forward neural-network meal recommendation and swap model. PHP calculates the user's calorie target, then calls `ml/nutrition_ai/nutricore_model.py` to rank the trained USDA-backed meal dataset using calories, macros, goal, fridge ingredients, allergies, dislikes, likes, ratings, and expert/model score. Weekly meal generation, Fridge Sync swap ranking, and applied meal replacements are Python-owned. Training runs with `npm run train:nutrition-ai` and saves `src/ai/trainedNutritionModel.json`; PHP does not generate meal plans.
- **PoseForm Exercise AI**: Python-owned recorded-video exercise analysis module using MediaPipe's neural pose landmark model for body-keypoint extraction, followed by local exercise/form logic. The backend accepts a recorded or uploaded exercise video, calls `ml/exercise_ai/video_pose_analyzer.py`, and returns reps, form score, confidence, feedback, and mistakes. Tutorial resources are local curated data and can be approved by the reviewer in `Expert Review`.
- **Expert Review**: One reviewer account approves NutriCore meals and PoseForm tutorial resources. Normal users can read approval status but cannot save approval decisions.
- **AI Coach Chat**: Optional Gemini conversational assistant. It is used only for open-ended chat if `GEMINI_API_KEY` is configured; it does not generate workout plans, meal plans, fridge swaps, or exercise-video analysis.
- **PredictionAI**: Uses a local PHP feed-forward neural-network regressor on historical weight data to predict the 30-day trend.
