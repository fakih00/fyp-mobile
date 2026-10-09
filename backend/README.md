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
    - Run these once after importing the base schema:
      `php backend/migration_social_community.php`
      `php backend/migration_community_chat.php`
      `php backend/migration_profile_settings.php`
      `php backend/migration_competition.php`
      The social migration enables login sessions, online status, avatars, notifications, posts, clubs, comments, and friend request support.
    - Optional demo data for presentation: run `php backend/seed_social_demo.php` after the social migration. It creates demo users, friends, clubs, posts, comments, and messages. Demo login: `demo.alex@elitefitness.local` / `Password123!`.

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
  - Returns local linear-regression prediction based on `progress` table history.

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
- **Physical Assessment**: Collects self-reported limitations and side dominance. TrainCore applies exercise exclusions for supported injury areas, then prioritizes one suitable single-arm or single-leg option in matching sessions when side dominance is reported. Both sides use the same rep target; no corrective treatment or asymmetric loads are prescribed. Posture and mobility observations remain profile context. Recovery-plan generation and its workout prerequisite have been removed. Historical recovery records are retained but are no longer exposed by the API.
- **TrainCore AI / WorkoutAI**: Python local Random Forest regression workout recommendation model. The Python model ranks a 220-record public-source exercise dataset using the user's goal, training frequency, location, intensity, and injury filters; PHP only wraps it for the API. Training/validation runs with `npm run train:workout-ai` and saves `ml/workout_ai/traincore_trained_model.json`. External generation APIs are not used for workout generation.
- **NutriCore AI / NutritionAI**: Python-owned Random Forest classification meal recommendation and swap model. PHP calculates the user's calorie target, then calls `ml/nutrition_ai/nutricore_model.py` to rank the trained USDA-backed meal dataset using calories, macros, goal, fridge ingredients, allergies, dislikes, likes, ratings, and expert/model score. Weekly meal generation, Fridge Sync swap ranking, and applied meal replacements are Python-owned. Training runs with `npm run train:nutrition-ai` and saves learned trees in `ml/nutrition_ai/nutricore_random_forest.json` plus compatible metadata in `src/ai/trainedNutritionModel.json`; PHP does not generate meal plans.
- **PoseForm Exercise AI**: Python-owned recorded-video exercise analysis module using MediaPipe's neural pose landmark model for body-keypoint extraction, followed by local exercise/form logic. The backend accepts a recorded or uploaded exercise video, calls `ml/exercise_ai/video_pose_analyzer.py`, and returns reps, form score, confidence, feedback, and mistakes. Tutorial resources are local curated data and can be approved by the reviewer in `Expert Review`.
- **Expert Review**: One reviewer account approves NutriCore meals and PoseForm tutorial resources. Normal users can read approval status but cannot save approval decisions.
- **AI Coach Chat**: Gemini-only conversational assistant. Configure `GEMINI_API_KEY` in `backend/.env`. Missing configuration returns HTTP 503, and an upstream failure returns HTTP 502; predefined coach replies are not used. It does not generate workout plans, meal plans, fridge swaps, or exercise-video analysis.
- **PredictionAI**: Uses ordinary least-squares linear regression on historical weight data to estimate the 30-day trend. Validation holds out recent observations when enough distinct training dates are available.

See [the model training guide](../ml/README.md) for environment setup, preprocessing, model explanations, evaluation limits, and contract checks. Both recommendation models use actual learned trees exported from scikit-learn; serving needs only Python's standard library. API routes and frontend screen code are unchanged by this migration.
