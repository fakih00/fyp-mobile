import React, { createContext, useState, useEffect } from 'react';
import { USERS, WORKOUT_PLANS, NUTRITION_PLANS, CHALLENGES, SHOP_ITEMS, FRIENDS } from '../data/mockData';
import { THEMES, DEFAULT_THEME } from '../constants/Theme';

import { api, setApiToken, setOnUnauthorized } from '../services/api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    // Initial state matching mock structure but ready for updates
    const [user, setUser] = useState({ ...USERS }); // Default mock state until loaded
    const [workouts, setWorkouts] = useState([]);
    const [meals, setMeals] = useState([]);
    const [challenges, setChallenges] = useState(CHALLENGES);
    const [nutritionGoal, setNutritionGoal] = useState(2200);
    const [isRecomp, setIsRecomp] = useState(false);
    const [macroTargets, setMacroTargets] = useState({ protein: 165, carbs: 220, fats: 73 });

    // Theme state
    const [themeName, rawSetThemeName] = useState(DEFAULT_THEME);
    const colors = THEMES[themeName] || THEMES[DEFAULT_THEME];
    
    const setThemeName = async (newTheme) => {
        rawSetThemeName(newTheme);
        try {
            await api.updateProfile({ theme: newTheme });
        } catch (e) {
            console.error("Failed to update theme in database", e);
        }
    };

    const [unreadCount, setUnreadCount] = useState(0);

    // Function to load notifications count
    const checkNotifications = async () => {
        try {
            const res = await api.getNotifications();
            if (res.status === 200) {
                const unread = (res.data.records || []).filter(n => !n.is_read).length;
                setUnreadCount(unread);
            }
        } catch (error) {
            console.error("checkNotifications error:", error);
        }
    };

    // Function to load real data
    const loadUserData = async (userId, token = null) => {
        // Set the API token if provided (e.g. after login)
        if (token) {
            setApiToken(token);
        }

        // Load notification status
        checkNotifications();

        const res = await api.getUser();
        if (res.status === 200 && res.data && res.data.profile) {
            const userData = res.data.profile;
            setUser(prev => ({
                ...prev,
                ...userData,
                profileImage: userData.avatar, // Map backend 'avatar' to frontend 'profileImage'
                id: res.data.id,
                user_id: res.data.id,
                token: token || prev.token,
                name: res.data.name,
                email: res.data.email
            }));
            if (userData.theme) {
                setThemeName(userData.theme);
            }
        }

        const chalRes = await api.getChallenges();
        if (chalRes.status === 200 && chalRes.data) {
            // Transform if necessary, or just set
            // setChallenges(chalRes.data.records); // Logic depends on data shape
        }

        const workRes = await api.getWorkouts();
        if (workRes.status === 200 && workRes.data) {
            // The backend returns the plan_data which is already an array as per AI service
            setWorkouts(workRes.data);
        }

        const nutRes = await api.getNutritionPlan();
        if (nutRes.status === 200 && nutRes.data) {
            const nutritionMeals = Array.isArray(nutRes.data.meals) ? nutRes.data.meals : [];
            setMeals(nutritionMeals);
            setNutritionGoal(nutRes.data.calories || 2200);
            setIsRecomp(nutRes.data.is_recomp || false);
            setMacroTargets({
                protein: nutRes.data.protein_target || 165,
                carbs: nutRes.data.carbs_target || 220,
                fats: nutRes.data.fats_target || 73
            });

            // Re-calculate consumed macros
            const newMacros = {
                Monday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
                Tuesday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
                Wednesday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
                Thursday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
                Friday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
                Saturday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
                Sunday: { calories: 0, protein: 0, carbs: 0, fats: 0 }
            };

            nutritionMeals.forEach(m => {
                const mealDay = newMacros[m.day] ? m.day : 'Monday';
                if (m.completed) {
                    newMacros[mealDay].calories += Number(m.calories || 0);
                    newMacros[mealDay].protein += Number(m.protein || 0);
                    newMacros[mealDay].carbs += Number(m.carbs || 0);
                    newMacros[mealDay].fats += Number(m.fats || 0);
                }
            });
            setConsumedMacros(newMacros);
        }
    };
    const [shopItems, setShopItems] = useState(SHOP_ITEMS);
    const [friends, setFriends] = useState(FRIENDS);
    const [activeWorkout, setActiveWorkout] = useState(null);
    const [consumedMacros, setConsumedMacros] = useState({
        Monday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        Tuesday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        Wednesday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        Thursday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        Friday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        Saturday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        Sunday: { calories: 0, protein: 0, carbs: 0, fats: 0 }
    });
    const [history, setHistory] = useState([
        { id: 'h1', type: 'MEAL', title: 'Salmon & Asparagus', subtitle: '550 kcal • Balanced', time: '08:30 PM', day: 'Monday', icon: 'restaurant', color: '#10B981' },
        { id: 'h2', type: 'WORKOUT', title: 'Chest & Triceps', subtitle: '45 mins • 320 kcal', time: '06:15 PM', day: 'Monday', icon: 'barbell', color: '#3B82F6' },
        { id: 'h3', type: 'WEIGHT', title: 'Morning Check-in', subtitle: '75.0 kg • Stable', time: '07:30 AM', day: 'Monday', icon: 'scale', color: '#F59E0B' },
        { id: 'h4', type: 'MEAL', title: 'Protein Smoothie', subtitle: '350 kcal • High Protein', time: 'Yesterday', day: 'Sunday', icon: 'beaker', color: '#10B981' },
    ]);

    // Actions
    const toggleWorkoutComplete = (id) => {
        setWorkouts(prev => prev.map(w => w.id === id ? { ...w, completed: !w.completed } : w));
    };

    const replaceMealInContext = (newMeal) => {
        setMeals(prev => prev.map(m => m.id === newMeal.id ? newMeal : m));
    };

    const toggleMealComplete = (id) => {
        setMeals(prev => prev.map(m => {
            if (m.id === id) {
                const newState = !m.completed;

                // 1. Log to history when completed
                if (newState) {
                    const mealItem = m;
                    const newHistoryItem = {
                        id: 'h' + Date.now(),
                        type: 'MEAL',
                        title: mealItem.name,
                        subtitle: `${mealItem.calories} kcal • ${mealItem.protein}g P`,
                        time: 'Just now',
                        day: mealItem.day,
                        icon: 'restaurant',
                        color: '#10B981'
                    };
                    setHistory(prevHist => [newHistoryItem, ...prevHist]);

                    // Update consumed macros for that specific day
                    setConsumedMacros(prev => {
                        const mealDay = prev[mealItem.day] ? mealItem.day : 'Monday';
                        return {
                            ...prev,
                            [mealDay]: {
                                calories: prev[mealDay].calories + Number(mealItem.calories || 0),
                                protein: prev[mealDay].protein + Number(mealItem.protein || 0),
                                carbs: prev[mealDay].carbs + Number(mealItem.carbs || 0),
                                fats: prev[mealDay].fats + Number(mealItem.fats || 0)
                            }
                        };
                    });
                } else {
                    // Update consumed macros (subtract)
                    setConsumedMacros(prev => {
                        const mealDay = prev[m.day] ? m.day : 'Monday';
                        return {
                            ...prev,
                            [mealDay]: {
                                calories: Math.max(0, prev[mealDay].calories - Number(m.calories || 0)),
                                protein: Math.max(0, prev[mealDay].protein - Number(m.protein || 0)),
                                carbs: Math.max(0, prev[mealDay].carbs - Number(m.carbs || 0)),
                                fats: Math.max(0, prev[mealDay].fats - Number(m.fats || 0))
                            }
                        };
                    });
                }

                // 2. BACKGROUND SYNC
                if (user?.user_id) {
                    api.updateMealProgress(m.day, m.id, newState)
                        .then(res => {
                            if (res.status === 200 && res.data.xp_reward) {
                                loadUserData(user.user_id);
                            }
                        })
                        .catch(err => console.error("Meal Sync Error:", err));
                }

                return { ...m, completed: newState };
            }
            return m;
        }));
    }

    const updateXP = (amount) => {
        setUser(prev => {
            const newXP = prev.xp + amount;
            if (newXP >= prev.nextLevelXp) {
                return {
                    ...prev,
                    level: prev.level + 1,
                    xp: newXP - prev.nextLevelXp,
                    nextLevelXp: prev.nextLevelXp + 500
                };
            }
            return { ...prev, xp: newXP };
        });
    };

    const joinChallenge = (id) => {
        setChallenges(prev => prev.map(c => c.id === id ? { ...c, joined: true } : c));
    };

    const redeemItem = (id) => {
        const item = shopItems.find(i => i.id === id);
        if (item && !item.owned && user.points >= item.points) {
            setUser(prev => ({ ...prev, points: prev.points - item.points }));
            setShopItems(prev => prev.map(i => i.id === id ? { ...i, owned: true } : i));
            return true;
        }
        return false;
    };

    const addFriend = (name) => {
        const newFriend = {
            id: 'f' + (friends.length + 1),
            name,
            status: 'Just Added',
            avatar: null // Will be handled by backend or default to initial
        };
        setFriends([...friends, newFriend]);
    };

    const startWorkout = (workout, forceReset = false) => {
        // Enforce: Don't let user redo a completed workout
        if (workout.completed && !forceReset) {
            console.log("Workout already completed. Redo blocked.");
            return;
        }

        const baseWorkout = forceReset ? {
            ...workout,
            completed: false,
            exercises: (workout.exercises || []).map(ex => ({ ...ex, completed: false }))
        } : workout;

        setActiveWorkout({
            ...baseWorkout,
            startTime: new Date(),
            completedExercises: forceReset ? [] : (baseWorkout.exercises || [])
                .filter(ex => ex.completed)
                .map(ex => ex.id)
        });

        if (forceReset) {
            resetWorkout(workout.day);
        }
    };

    const resetWorkout = async (day) => {
        // 1. Update local state
        setWorkouts(prev => prev.map(w => {
            if (w.day === day) {
                return {
                    ...w,
                    completed: false,
                    exercises: (w.exercises || []).map(ex => ({ ...ex, completed: false }))
                };
            }
            return w;
        }));

        // 2. Sync with backend (entire session reset)
        if (user?.user_id) {
            api.updateWorkoutProgress(day, null, false)
                .catch(err => console.error("Reset Sync Error:", err));
        }
    };

    const completeWorkout = async (sessionData) => {
        if (activeWorkout) {
            updateXP(200);

            // 1. UPDATE LOCAL STATE IMMEDIATELY (SNAPPY UI)
            setWorkouts(prev => prev.map(w => {
                if (w.day === activeWorkout.day) {
                    return {
                        ...w,
                        completed: true,
                        exercises: (w.exercises || []).map(ex => ({ ...ex, completed: true }))
                    };
                }
                return w;
            }));

            // Log history local
            const newHistoryItem = {
                id: 'h' + Date.now(),
                type: 'WORKOUT',
                title: sessionData?.title || activeWorkout.title,
                subtitle: `${sessionData?.duration || '00:00'} • ${sessionData?.kcal || activeWorkout.kcal} kcal`,
                time: 'Just now',
                day: activeWorkout.day,
                icon: 'barbell',
                color: '#3B82F6'
            };
            setHistory(prev => [newHistoryItem, ...prev]);

            // 2. BACKGROUND SYNC
            if (user?.user_id) {
                const workoutId = activeWorkout.db_id || activeWorkout.plan_id || activeWorkout.id;
                api.updateWorkoutProgress(activeWorkout.day, workoutId, true)
                    .then(res => {
                        if (res.status === 200 && res.data.xp_reward) {
                            loadUserData(user.user_id);
                        }
                    })
                    .catch(err => console.error("Sync Error:", err));
            }

            setActiveWorkout(null);
            return true;
        }
        return false;
    };

    const toggleExercise = async (exerciseId) => {
        if (activeWorkout) {
            const isCompleted = activeWorkout.completedExercises.includes(exerciseId);
            const newState = !isCompleted;

            // 1. Update active session state (Player UI)
            setActiveWorkout(prev => ({
                ...prev,
                completedExercises: newState
                    ? [...prev.completedExercises, exerciseId]
                    : prev.completedExercises.filter(id => id !== exerciseId)
            }));

            // 2. Update main workouts list (Dashboard UI) - OPTIMISTIC
            setWorkouts(prevWorkouts => prevWorkouts.map(w => {
                if (w.day === activeWorkout.day) {
                    return {
                        ...w,
                        exercises: (w.exercises || []).map(ex => ex.id === exerciseId ? { ...ex, completed: newState } : ex)
                    };
                }
                return w;
            }));

            // 3. BACKGROUND SYNC
            if (user?.user_id) {
                api.updateWorkoutProgress(activeWorkout.day, exerciseId, newState)
                    .catch(err => console.error("Sync Error:", err));
            }
        }
    };

    const updateUserProfileImage = async (uri) => {
        // Optimistic update
        setUser(prev => ({ ...prev, profileImage: uri }));

        if (user?.user_id) {
            try {
                // Sync with backend
                await api.updateProfile({ avatar: uri });
            } catch (err) {
                console.error("Profile Image Sync Error:", err);
            }
        }
    };

    const logout = async () => {
        // Invalidate token on server, then clear local state
        try {
            await api.logout();
        } catch (err) {
            console.error("Server logout error:", err);
        }
        setApiToken(null);
        setUser({ ...USERS });
        setWorkouts([]);
        setMeals([]);
        setChallenges(CHALLENGES);
        setHistory([]);
        setConsumedMacros({
            Monday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
            Tuesday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
            Wednesday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
            Thursday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
            Friday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
            Saturday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
            Sunday: { calories: 0, protein: 0, carbs: 0, fats: 0 }
        });
        setActiveWorkout(null);
        setUnreadCount(0);
    };

    // Wire up global 401 handler to trigger logout
    useEffect(() => {
        setOnUnauthorized((message) => {
            console.warn('Session expired:', message);
            logout();
        });
    }, []);

    const values = {
        user,
        setUser,
        updateUserProfileImage,
        workouts,
        setWorkouts,
        meals,
        setMeals,
        challenges,
        shopItems,
        friends,
        activeWorkout,
        toggleWorkoutComplete,
        toggleMealComplete,
        replaceMealInContext,
        joinChallenge,
        redeemItem,
        addFriend,
        startWorkout,
        resetWorkout,
        completeWorkout,
        toggleExercise,
        history,
        setHistory,
        consumedMacros,
        setConsumedMacros,
        nutritionGoal,
        isRecomp,
        macroTargets,
        loadUserData,
        unreadCount,
        setUnreadCount,
        checkNotifications,
        logout,
        themeName,
        setThemeName,
        colors
    };

    return (
        <AppContext.Provider value={values}>
            {children}
        </AppContext.Provider>
    );
};
