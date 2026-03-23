// Replace with your computer's local IP if testing on a physical device.
// For Android Emulator, use 'http://10.0.2.2:8000/api'
// For iOS Simulator, use 'http://localhost:8000/api'
const BASE_URL = 'http://192.168.0.108:8000/api';

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

/**
 * Internal: handle response, checking for 401 globally.
 */
async function handleResponse(response, ignoreUnauthorized = false) {
    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = { message: 'Invalid server response' };
    }

    if (response.status === 401 && _onUnauthorized && !ignoreUnauthorized) {
        _onUnauthorized(data.message || 'Session expired');
    }

    return { status: response.status, data };
}

export const api = {
    // ─── Auth (no token needed) ───────────────────────────────────
    async register(name, email, password) {
        try {
            const response = await fetch(`${BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });
            return handleResponse(response, true);
        } catch (error) {
            console.error("API Register Error:", error);
            return { status: 500, data: { message: "Network error" } };
        }
    },

    async login(email, password) {
        try {
            const response = await fetch(`${BASE_URL}/login`, {
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
            return { status: 500, data: { message: "Network error" } };
        }
    },

    async logout() {
        try {
            const response = await fetch(`${BASE_URL}/logout`, {
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
            return { status: 500, data: { message: "Network error" } };
        }
    },

    // ─── Helper for protected POST requests ───────────────────────
    async post(endpoint, body = {}) {
        try {
            const response = await fetch(`${BASE_URL}/${endpoint}`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(body),
            });
            return handleResponse(response);
        } catch (error) {
            console.error(`API POST ${endpoint} Error:`, error);
            return { status: 500, data: { message: "Network error" } };
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
            const response = await fetch(url, {
                method: 'GET',
                headers: authHeaders(),
            });
            return handleResponse(response);
        } catch (error) {
            console.error(`API GET ${endpoint} Error:`, error);
            return { status: 500, data: { message: "Network error" } };
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

    async updateWorkoutProgress(day, exerciseId, completed) {
        return this.post('updateWorkoutProgress', {
            day: day,
            exercise_id: exerciseId,
            completed: completed
        });
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

    // ─── User & Profile ───────────────────────────────────────────
    async getUser() {
        return this.get('getUser');
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

    // ─── AI Chat ──────────────────────────────────────────────────
    /**
     * Send a message to the Gemini AI Coach.
     * @param {string} message - The user's latest message.
     * @param {Array} history - Previous messages [{ role: 'user'|'model', text: '...' }]
     */
    async aiChat(message, history = []) {
        return this.post('aiChat', { message, history });
    },
};
