import { Platform } from 'react-native';

// Replace with your computer's local IP if testing on a physical device.
// For Android Emulator, use 'http://10.0.2.2:8000/api'
// For iOS Simulator, use 'http://localhost:8000/api'
const BASE_URL = 'http://172.16.189.14:8000/api';
const REQUEST_TIMEOUT_MS = 10000;
const UPLOAD_TIMEOUT_MS = 300000;

// Internal token store — set after login, cleared on logout
let _token = null;
let _onUnauthorized = null; // Callback to trigger global logout on 401

/**
 * Set the auth token for all future API calls.
 */
export function setApiToken(token) {
    _token = token;
}

/**
 * Get the current auth token (e.g. for secure storage).
 */
export function getApiToken() {
    return _token;
}

/**
 * Register a callback that fires when any API call returns 401.
 * Use this to trigger a global logout in AppContext.
 */
export function setOnUnauthorized(callback) {
    _onUnauthorized = callback;
}

/**
 * Internal: build Authorization header if token is available.
 */
function authHeaders(extraHeaders = {}) {
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (_token) {
        headers['Authorization'] = `Bearer ${_token}`;
    }
    return headers;
}

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchUploadWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

function parseApiJson(raw) {
    try {
        return JSON.parse(raw);
    } catch (error) {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
            try {
                return JSON.parse(raw.slice(start, end + 1));
            } catch (nestedError) {
                return { message: 'Invalid server response' };
            }
        }
        return { message: 'Invalid server response' };
    }
}

/**
 * Internal: handle response, checking for 401 globally.
 */
async function handleResponse(response, ignoreUnauthorized = false) {
    const raw = await response.text();
    const data = parseApiJson(raw);

    if (response.status === 401 && _onUnauthorized && !ignoreUnauthorized) {
        _onUnauthorized(data.message || 'Session expired');
    }

    return { status: response.status, data };
}

export const api = {
    // ─── Auth (no token needed) ───────────────────────────────────
    async register(name, email, password) {
        try {
            const response = await fetchWithTimeout(`${BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });
            return handleResponse(response, true);
        } catch (error) {
            console.error("API Register Error:", error);
            return { status: 500, data: { message: "Cannot reach the server. Make sure the backend is running." } };
        }
    },

    async login(email, password) {
        try {
            const response = await fetchWithTimeout(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const result = await handleResponse(response, true);
            // Auto-set token on successful login
            if (result.status === 200 && result.data.token) {
                setApiToken(result.data.token);
            }
            return result;
        } catch (error) {
            console.error("API Login Error:", error);
            return { status: 500, data: { message: "Cannot reach the server. Make sure the backend is running." } };
        }
    },

    async logout() {
        try {
            const response = await fetchWithTimeout(`${BASE_URL}/logout`, {
                method: 'POST',
                headers: authHeaders(),
            });
            const result = await handleResponse(response, true);
            // Always clear local token
            setApiToken(null);
            return result;
        } catch (error) {
            console.error("API Logout Error:", error);
            setApiToken(null);
            return { status: 500, data: { message: "Cannot reach the server. Make sure the backend is running." } };
        }
    },

    // ─── Helper for protected POST requests ───────────────────────
    async post(endpoint, body = {}) {
        try {
            const response = await fetchWithTimeout(`${BASE_URL}/${endpoint}`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(body),
            });
            return handleResponse(response);
        } catch (error) {
            console.error(`API POST ${endpoint} Error:`, error);
            return { status: 500, data: { message: "Cannot reach the server. Make sure the backend is running." } };
        }
    },

    // ─── Helper for protected GET requests ────────────────────────
    async get(endpoint, params = {}) {
        try {
            const query = Object.entries(params)
                .filter(([, v]) => v !== null && v !== undefined)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');
            const url = query ? `${BASE_URL}/${endpoint}?${query}` : `${BASE_URL}/${endpoint}`;
            const response = await fetchWithTimeout(url, {
                method: 'GET',
                headers: authHeaders(),
            });
            return handleResponse(response);
        } catch (error) {
            console.error(`API GET ${endpoint} Error:`, error);
            return { status: 500, data: { message: "Cannot reach the server. Make sure the backend is running." } };
        }
    },

    // ─── Dashboard & Fitness ──────────────────────────────────────
    async getDashboard() {
        return this.get('getDashboard');
    },

    async getWorkouts() {
        return this.get('getWorkouts');
    },

    async getNutritionPlan() {
        return this.get('getNutritionPlan');
    },

    async generatePlan() {
        return this.post('generatePlan');
    },

    async replaceMeal(mealId, hint, replacement = null, fridgeIngredients = []) {
        const payload = { meal_id: mealId, hint };
        if (replacement) payload.replacement = replacement;
        if (Array.isArray(fridgeIngredients)) payload.fridge_ingredients = fridgeIngredients;
        return this.post('replaceMeal', payload);
    },

    async getMealSwaps(fridgeIngredients = [], maxResults = 50) {
        return this.post('getMealSwaps', {
            fridge_ingredients: fridgeIngredients,
            max_results: maxResults,
        });
    },

    async getMealFeedback() {
        return this.get('getMealFeedback');
    },

    async saveMealFeedback(mealId, rating, ingredients = []) {
        return this.post('saveMealFeedback', { meal_id: mealId, rating, ingredients });
    },

    async getMealReviews() {
        return this.get('getMealReviews');
    },

    async getMealReviewAccess() {
        return this.get('getMealReviewAccess');
    },

    async saveMealReview(mealId, status, notes = '', reviewedBy = 'Reviewer') {
        return this.post('saveMealReview', {
            meal_id: mealId,
            status,
            notes,
            reviewed_by: reviewedBy,
        });
    },

    async getExerciseTutorialReviews() {
        return this.get('getExerciseTutorialReviews');
    },

    async saveExerciseTutorialReview(tutorialId, status, notes = '', reviewedBy = 'Reviewer') {
        return this.post('saveExerciseTutorialReview', {
            tutorial_id: tutorialId,
            status,
            notes,
            reviewed_by: reviewedBy,
        });
    },

    async updateWorkoutProgress(day, exerciseId, completed) {
        return this.post('updateWorkoutProgress', {
            day: day,
            exercise_id: exerciseId,
            completed: completed
        });
    },

    async uploadExerciseVideo(video, exerciseName, targetReps = null) {
        try {
            const form = new FormData();
            const videoUri = typeof video === 'string' ? video : video?.uri;
            if (!videoUri) throw new Error('No exercise video was selected.');
            const extension = String(video?.fileName || videoUri).split('.').pop()?.split('?')[0]?.toLowerCase() || 'mp4';
            const fileName = `poseform-analysis.${extension}`;
            const fileType = video?.mimeType || (extension === 'mov' ? 'video/quicktime' : 'video/mp4');
            if (Platform.OS === 'web') {
                const file = video?.file || new File([await (await fetch(videoUri)).blob()], fileName, { type: fileType });
                form.append('video', file, file.name || fileName);
            } else {
                form.append('video', { uri: videoUri, name: fileName, type: fileType });
            }
            form.append('exercise_name', exerciseName || 'general');
            if (targetReps) {
                form.append('target_reps', String(targetReps));
            }

            const headers = {};
            if (_token) {
                headers.Authorization = `Bearer ${_token}`;
            }

            const response = await fetchUploadWithTimeout(`${BASE_URL}/analyzeExerciseVideo`, {
                method: 'POST',
                headers,
                body: form,
            });
            const raw = await response.text();
            const data = parseApiJson(raw);
            return { status: response.status, data };
        } catch (error) {
            console.error("API Exercise Video Upload Error:", error);
            const reason = error?.name === 'AbortError'
                ? 'Video analysis timed out. Try a shorter clip, keep it under 20 seconds, and retry.'
                : `Cannot analyze video. Backend is reachable only if your phone and laptop are on the same Wi-Fi. ${error?.message || ''}`.trim();
            return { status: 500, data: { message: reason } };
        }
    },

    async updateMealProgress(day, mealId, completed) {
        return this.post('updateMealProgress', {
            day: day,
            meal_id: mealId,
            completed: completed
        });
    },

    async getSuggestedGoalWeight() {
        return this.get('getSuggestedGoalWeight');
    },

    async get30DayWorkoutHistory() {
        return this.get('get30DayWorkoutHistory');
    },

    async get30DayMealHistory() {
        return this.get('get30DayMealHistory');
    },

    // ─── User & Profile ───────────────────────────────────────────
    async getUser(userId = null) {
        return this.get('getUser', userId ? { user_id: userId } : {});
    },

    async updateProfile(data) {
        return this.post('updateUser', data);
    },

    async getAllUsers() {
        return this.get('getUsers');
    },

    // ─── Challenges ───────────────────────────────────────────────
    async getChallenges() {
        return this.get('getChallenges');
    },

    async getUserChallenges() {
        return this.get('getUserChallenges');
    },

    async joinChallenge(challengeId) {
        return this.post('joinChallenge', { challenge_id: challengeId });
    },

    async leaveChallenge(challengeId) {
        return this.post('leaveChallenge', { challenge_id: challengeId });
    },

    async completeChallenge(challengeId) {
        return this.post('completeChallenge', { challenge_id: challengeId });
    },

    // ─── Social ───────────────────────────────────────────────────
    async getFeed() {
        return this.get('getFeed');
    },

    async createPost(content, image, visibility) {
        return this.post('createPost', {
            content: content,
            image: image,
            visibility: visibility
        });
    },

    async deletePost(postId) {
        return this.post('deletePost', { post_id: postId });
    },

    async likePost(postId) {
        return this.post('likePost', { post_id: postId });
    },

    // ─── Clubs ────────────────────────────────────────────────────
    async getClubs() {
        return this.get('getClubs');
    },

    async joinClub(clubId) {
        return this.post('joinClub', { club_id: clubId });
    },

    async createClub(name, tag, description, image) {
        return this.post('createClub', {
            name: name,
            tag: tag,
            description: description,
            image: image
        });
    },

    // ─── Friends ──────────────────────────────────────────────────
    async getFriends() {
        return this.get('getFriends');
    },

    async addFriend(friendId) {
        return this.post('addFriend', { friend_id: friendId });
    },

    async getFriendRequests() {
        return this.get('getFriendRequests');
    },

    async respondToFriendRequest(friendId, action) {
        return this.post('respondToFriendRequest', {
            friend_id: friendId,
            action: action // 'accept' or 'decline'
        });
    },

    // ─── Messages ─────────────────────────────────────────────────
    async getConversations() {
        return this.get('getConversations');
    },

    async getMessages(friendId) {
        return this.get('getMessages', { friend_id: friendId });
    },

    async sendMessage(receiverId, content) {
        return this.post('sendMessage', {
            receiver_id: receiverId,
            content: content
        });
    },

    // ─── Notifications ────────────────────────────────────────────
    async getNotifications() {
        return this.get('getNotifications');
    },

    async markNotificationRead(notificationId) {
        return this.post('markNotificationRead', { notification_id: notificationId });
    },

    async markAllNotificationsRead() {
        return this.post('markAllNotificationsRead');
    },

    // ─── Leaderboard ──────────────────────────────────────────────
    async getLeaderboard(mode = 'Global') {
        return this.get('getLeaderboard', { mode });
    },

    // ─── Progress & Weight ────────────────────────────────────────
    async getWeightHistory() {
        return this.get('getWeightHistory');
    },

    async getProgressStats(date = null) {
        return this.get('getProgressStats', { date });
    },

    async predictProgress() {
        return this.get('predictProgress');
    },

    async getActivityHistory(date = null) {
        return this.get('getActivityHistory', { date });
    },

    async checkWeightLogged() {
        return this.get('checkWeightLogged');
    },

    async logDailyPulse(weight, sleep, stress, steps) {
        return this.post('logDailyPulse', {
            weight: weight,
            sleep: sleep,
            stress: stress,
            steps: steps
        });
    },

    async logWater(amount) {
        return this.post('logWater', { amount: amount });
    },

    async logWeight(weight) {
        return this.post('logActivity', {
            type: 'weight',
            value: weight
        });
    },

    // ─── Rewards & Shop ───────────────────────────────────────────
    async getRewards() {
        return this.get('getRewards');
    },

    async redeemReward(rewardId) {
        return this.post('redeemReward', { reward_id: rewardId });
    },

    async getRedemptions() {
        return this.get('getRedemptions');
    },

    // ─── Audit ────────────────────────────────────────────────────
    async auditProgress() {
        return this.get('auditProgress');
    },

    async getProgressAudit() {
        return this.get('getProgressAudit');
    },

    async simulateTrajectory(scenario) {
        return this.post('simulateTrajectory', scenario);
    },

    async getDailyBioAdvisory() {
        return this.get('getDailyBioAdvisory');
    },

    // ─── AI Chat ──────────────────────────────────────────────────
    /**
     * Send a message to the local AI Coach.
     * @param {string} message - The user's latest message.
     * @param {Array} history - Previous messages [{ role: 'user'|'model', text: '...' }]
     */
    async aiChat(message, history = []) {
        return this.post('aiChat', { message, history });
    },

    /** Fetch persisted AI chat history from the database */
    async getAIChatHistory() {
        return this.get('getAIChatHistory');
    },

    /** Clear all persisted AI chat history for the current user */
    async clearAIChatHistory() {
        return this.post('clearAIChatHistory', {});
    },

    // ─── AI Injury & Recovery ─────────────────────────────────────
    /**
     * Generate an AI-powered soft-tissue recovery plan.
     * @param {Object} injuryAnswers - Questionnaire answers
     */
    async generateRecoveryPlan(injuryAnswers) {
        return this.post('generateRecoveryPlan', injuryAnswers);
    },

    /**
     * Retrieve latest recovery plan.
     */
    async getRecoveryPlan() {
        return this.get('getRecoveryPlan');
    },

    /**
     * Update checkboxes and body parts visual status progress.
     */
    async updateRecoveryProgress(planId, completedItems, bodyPartsStatus) {
        return this.post('updateRecoveryProgress', {
            plan_id: planId,
            completed_items: completedItems,
            body_parts_status: bodyPartsStatus
        });
    },

    // ─── AI Competition Prep ──────────────────────────────────────
    /**
     * Generate an AI-powered competition preparation plan.
     * @param {Object} formAnswers - Questionnaire answers
     */
    async generateCompetitionPlan(formAnswers) {
        return this.post('generateCompetitionPlan', formAnswers);
    },

    /**
     * Retrieve latest competition preparation plan.
     */
    async getCompetitionPlan() {
        return this.get('getCompetitionPlan');
    },

    /**
     * Update completed milestones for competition preparation.
     */
    async updateCompetitionProgress(planId, completedMilestones) {
        return this.post('updateCompetitionProgress', {
            plan_id: planId,
            completed_milestones: completedMilestones
        });
    },

    // ─── Daily Quests ─────────────────────────────────────────────
    async getDailyQuests() {
        return this.get('getDailyQuests');
    },

    async claimDailyQuest(questId) {
        return this.post('claimDailyQuest', { quest_id: questId });
    },

    // ─── Achievements ─────────────────────────────────────────────
    async getAchievements() {
        return this.get('getAchievements');
    },

    // ─── Messages / Conversations ─────────────────────────────────
    async getConversations() {
        return this.get('getConversations');
    },

    async getMessages(friendId) {
        return this.get('getMessages', { friend_id: friendId });
    },

    async sendMessage(receiverId, content) {
        return this.post('sendMessage', { receiver_id: receiverId, content });
    },

    // ─── Friends ──────────────────────────────────────────────────
    async getFriends() {
        return this.get('getFriends');
    },

    async addFriend(friendId) {
        return this.post('addFriend', { friend_id: friendId });
    },

    async getFriendRequests() {
        return this.get('getFriendRequests');
    },

    async respondToFriendRequest(friendId, action) {
        return this.post('respondToFriendRequest', { friend_id: friendId, action });
    },
};
