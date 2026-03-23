export const USERS = {
    id: 'u1',
    name: 'Alex',
    weight: 75,
    height: 180,
    level: 5,
    xp: 1250,
    nextLevelXp: 2000,
    streak: 5,
    points: 450, // Added points for the shop
};

export const CHALLENGES = [
    {
        id: 'c1',
        title: '30-Day Pushup Blitz',
        description: 'Complete 50 pushups every day for 30 days.',
        points: 500,
        progress: 12,
        days: 30,
        joined: true,
        type: 'Workout',
        image: 'https://images.unsplash.com/photo-1598971639058-aba3c39433d7?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
    },
    {
        id: 'c2',
        title: 'Morning Run Streak',
        description: 'Run 3km every morning for a week.',
        points: 300,
        progress: 0,
        days: 7,
        joined: false,
        type: 'Cardio',
        image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
    },
    {
        id: 'c3',
        title: 'Water Intake Master',
        description: 'Drink 3L of water daily for 15 days.',
        points: 200,
        progress: 5,
        days: 15,
        joined: true,
        type: 'Nutrition',
        image: 'https://images.unsplash.com/photo-1548919973-5dea585f396a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
    }
];

export const SHOP_ITEMS = [
    { id: 's1', title: 'Elite Badge', points: 100, type: 'badge', icon: 'shield-checkmark', owned: false },
    { id: 's2', title: 'Workout Program', points: 500, type: 'item', icon: 'barbell', owned: false },
    { id: 's3', title: 'Pro Skin', points: 300, type: 'customization', icon: 'color-palette', owned: true },
    { id: 's4', title: 'Master Certificate', points: 1000, type: 'badge', icon: 'ribbon', owned: false },
];

export const FRIENDS = [
    { id: 'f1', name: 'Jordan', status: 'In Gym', avatar: 'https://i.pravatar.cc/150?u=jordan' },
    { id: 'f2', name: 'Sarah', status: 'Running', avatar: 'https://i.pravatar.cc/150?u=sarah' },
    { id: 'f3', name: 'Mike', status: 'Offline', avatar: 'https://i.pravatar.cc/150?u=mike' },
];

export const MOCK_MESSAGES = [
    { id: 'm1', senderId: 'f1', text: 'Hey Alex, coming to the gym?', time: '10:30 AM' },
    { id: 'm2', senderId: 'u1', text: 'Yeah, in 10 mins!', time: '10:32 AM' },
    { id: 'm3', senderId: 'f1', text: 'Great, see ya!', time: '10:35 AM' },
];

export const WORKOUT_PLANS = [
    {
        id: 'wp1',
        day: 'Monday',
        title: 'Push Day - Chest & Triceps',
        duration: '45 mins',
        kcal: 320,
        difficulty: 'Intermediate',
        category: 'Strength',
        image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        exercises: [
            { id: 'e1', name: 'Bench Press', sets: 4, reps: '8-12', rest: '90s', completed: false, guide: 'Lie on a flat bench. Grip the bar slightly wider than shoulder-width. Lower the bar to mid-chest, then press it back up while keeping feet flat on the floor.' },
            { id: 'e2', name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '60s', completed: false, guide: 'Set bench to 30-45 degrees. Press dumbbells up from chest level. Focus on the upper chest contraction.' },
            { id: 'e3', name: 'Tricep Dips', sets: 3, reps: '12-15', rest: '60s', completed: false, guide: 'Use parallel bars. Lower your body until elbows are at 90 degrees. Push back up using only your triceps.' },
        ],
        completed: false,
    },
    {
        id: 'wp2',
        day: 'Tuesday',
        title: 'Pull Day - Back & Biceps',
        duration: '50 mins',
        kcal: 350,
        difficulty: 'Intermediate',
        category: 'Strength',
        image: 'https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        exercises: [
            { id: 'e4', name: 'Pull Ups', sets: 4, reps: 'Max', rest: '90s', completed: false, guide: 'Hang from a bar with palms facing away. Pull your chest toward the bar by driving elbows down.' },
            { id: 'e5', name: 'Barbell Row', sets: 4, reps: '8-10', rest: '90s', completed: false, guide: 'Bent over at 45 degrees. Pull the barbell toward your lower ribs while keeping your back straight.' },
            { id: 'e6', name: 'Bicep Curls', sets: 3, reps: '12-15', rest: '60s', completed: false, guide: 'Stand upright with dumbbells. Curl weights toward shoulders while keeping elbows pinned to your sides.' },
        ],
        completed: false,
    },
    {
        id: 'wp3',
        day: 'Wednesday',
        title: 'HIIT Cardio Blast',
        duration: '30 mins',
        kcal: 400,
        difficulty: 'Advanced',
        category: 'HIIT',
        image: 'https://images.unsplash.com/photo-1434596922112-19c563067271?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        exercises: [
            { id: 'e7', name: 'Burpees', sets: 4, reps: '20', rest: '30s', completed: false, guide: 'Drop into a squat, kick feet back, perform a pushup, jump back to squat, then jump up explosively.' },
            { id: 'e8', name: 'Mountain Climbers', sets: 4, reps: '40', rest: '30s', completed: false, guide: 'In a plank position, drive knees alternately toward your chest as fast as possible.' },
            { id: 'e9', name: 'Jump Squats', sets: 4, reps: '15', rest: '30s', completed: false, guide: 'Lower into a squat, then jump straight up. Land softly and immediately repeat.' },
        ],
        completed: false,
    },
    {
        id: 'wp4',
        day: 'Thursday',
        title: 'Morning Yoga Flow',
        duration: '20 mins',
        kcal: 100,
        difficulty: 'Beginner',
        category: 'Yoga',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        exercises: [
            { id: 'e10', name: 'Sun Salutation', sets: 5, reps: '5 mins', rest: '0s', completed: false, guide: 'A flow of 12 linked yoga poses. Focus on synchronized breathing and smooth transitions.' },
            { id: 'e11', name: 'Warrior I', sets: 3, reps: '1 min', rest: '15s', completed: false, guide: 'Step one foot forward, bend the knee, and reach arms overhead while pressing the back heel down.' },
        ],
        completed: false,
    },
    {
        id: 'wp5',
        day: 'Friday',
        title: 'Leg Day - Quads & Glutes',
        duration: '60 mins',
        kcal: 450,
        difficulty: 'Hard',
        category: 'Strength',
        image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        exercises: [
            { id: 'e12', name: 'Squats', sets: 4, reps: '10-12', rest: '120s', completed: false, guide: 'Place bar across upper back. Sit back into a squat until thighs are parallel to the floor, then stand back up.' },
            { id: 'e13', name: 'Leg Press', sets: 3, reps: '12-15', rest: '90s', completed: false, guide: 'Sit in machine with feet shoulder-width apart. Push the weight up, then lower controlled.' },
        ],
        completed: false,
    },
    {
        id: 'wp6',
        day: 'Saturday',
        title: 'Full Body Mobility',
        duration: '25 mins',
        kcal: 120,
        difficulty: 'Beginner',
        category: 'Yoga',
        image: 'https://images.unsplash.com/photo-1518611012118-2969c63b07b8?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        exercises: [
            { id: 'e14', name: 'Cat Cow', sets: 3, reps: '2 mins', rest: '0s', completed: false, guide: 'On hands and knees, arch your back like a cat, then drop your belly and lift your head.' },
            { id: 'e15', name: 'Downward Dog', sets: 3, reps: '1 min', rest: '30s', completed: false, guide: 'Form an inverted V-shape with your body. Push hips toward the ceiling and heels toward the floor.' },
        ],
        completed: false,
    },
    {
        id: 'wp7',
        day: 'Sunday',
        title: 'Active Recovery Walk',
        duration: '45 mins',
        kcal: 200,
        difficulty: 'Beginner',
        category: 'Cardio',
        image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        exercises: [
            { id: 'e16', name: 'Nature Walk', sets: 1, reps: '45 mins', rest: '0s', completed: false, guide: 'Walk at a steady pace in a natural environment to aid recovery and mental clarity.' },
        ],
        completed: false,
    },
];

export const NUTRITION_LOG_MOCK = {
    'Monday': {
        cals: 1850, protein: 120, carbs: 180, fats: 65,
        meals: [
            { id: 'm1', name: 'Oatmeal with Berries', cals: 350, protein: 12, carbs: 60, fats: 8, time: '08:00 AM' },
            { id: 'm2', name: 'Grilled Chicken Salad', cals: 450, protein: 40, carbs: 15, fats: 25, time: '12:30 PM' },
            { id: 'm3', name: 'Protein Shake', cals: 200, protein: 30, carbs: 5, fats: 5, time: '04:00 PM' },
            { id: 'm4', name: 'Salmon & Asparagus', cals: 550, protein: 38, carbs: 10, fats: 27, time: '07:30 PM' },
        ]
    },
    'Tuesday': {
        cals: 1600, protein: 110, carbs: 150, fats: 55,
        meals: [
            { id: 'm5', name: 'Eggs & Avocado Toast', cals: 420, protein: 18, carbs: 32, fats: 28, time: '08:30 AM' },
            { id: 'm6', name: 'Turkey Wrap', cals: 380, protein: 35, carbs: 40, fats: 12, time: '01:00 PM' },
        ]
    },
    'Wednesday': {
        cals: 2100, protein: 140, carbs: 220, fats: 75,
        meals: [
            { id: 'm7', name: 'Pancakes', cals: 600, protein: 15, carbs: 80, fats: 22, time: '09:00 AM' },
        ]
    },
    'Thursday': { cals: 1750, protein: 125, carbs: 190, fats: 60, meals: [] },
    'Friday': { cals: 1900, protein: 130, carbs: 200, fats: 70, meals: [] },
    'Saturday': { cals: 2300, protein: 120, carbs: 280, fats: 85, meals: [] },
    'Sunday': { cals: 1800, protein: 115, carbs: 210, fats: 65, meals: [] },
};

export const NUTRITION_PLANS = [
    // Monday
    { id: 'np1', day: 'Monday', type: 'Breakfast', name: 'Oatmeal & Berries', calories: 450, protein: 20, carbs: 60, fats: 10, image: 'https://images.unsplash.com/photo-1517619266205-1d016d97e742?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np2', day: 'Monday', type: 'Lunch', name: 'Grilled Chicken Salad', calories: 600, protein: 50, carbs: 30, fats: 20, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np3', day: 'Monday', type: 'Dinner', name: 'Salmon & Asparagus', calories: 550, protein: 40, carbs: 20, fats: 25, image: 'https://images.unsplash.com/photo-1467003909585-2f8a7270028d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },

    // Tuesday
    { id: 'np4', day: 'Tuesday', type: 'Breakfast', name: 'Greek Yogurt & Honey', calories: 350, protein: 25, carbs: 40, fats: 12, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np5', day: 'Tuesday', type: 'Lunch', name: 'Turkey Avocado Wrap', calories: 500, protein: 35, carbs: 45, fats: 18, image: 'https://images.unsplash.com/photo-1528733918455-5a59687cedf0?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np6', day: 'Tuesday', type: 'Dinner', name: 'Beef Stir Fry', calories: 650, protein: 45, carbs: 50, fats: 22, image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },

    // Wednesday
    { id: 'np7', day: 'Wednesday', type: 'Breakfast', name: 'Avocado Toast & Eggs', calories: 420, protein: 18, carbs: 35, fats: 28, image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np8', day: 'Wednesday', type: 'Lunch', name: 'Quinoa Power Bowl', calories: 480, protein: 15, carbs: 65, fats: 15, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np9', day: 'Wednesday', type: 'Dinner', name: 'Lentil Soup', calories: 380, protein: 22, carbs: 55, fats: 8, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },

    // Thursday
    { id: 'np10', day: 'Thursday', type: 'Breakfast', name: 'Smoothie Bowl', calories: 380, protein: 12, carbs: 70, fats: 10, image: 'https://images.unsplash.com/photo-1494597564530-897f5a210287?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np11', day: 'Thursday', type: 'Lunch', name: 'Tuna Salad', calories: 420, protein: 40, carbs: 10, fats: 25, image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np12', day: 'Thursday', type: 'Dinner', name: 'Chicken Pasta', calories: 700, protein: 35, carbs: 80, fats: 20, image: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },

    // Friday
    { id: 'np13', day: 'Friday', type: 'Breakfast', name: 'Omelette with Spinach', calories: 400, protein: 24, carbs: 10, fats: 30, image: 'https://images.unsplash.com/photo-1494597564530-897f5a210287?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np14', day: 'Friday', type: 'Lunch', name: 'Falafel Wrap', calories: 550, protein: 20, carbs: 65, fats: 22, image: 'https://images.unsplash.com/photo-1522244451342-a41bf8a13d73?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np15', day: 'Friday', type: 'Dinner', name: 'Homemade Pizza', calories: 800, protein: 30, carbs: 100, fats: 35, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },

    // Saturday
    { id: 'np16', day: 'Saturday', type: 'Breakfast', name: 'Protein Pancakes', calories: 500, protein: 35, carbs: 60, fats: 15, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7bb7445?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np17', day: 'Saturday', type: 'Lunch', name: 'Burger & Fries (Cheat Meal)', calories: 950, protein: 40, carbs: 110, fats: 45, image: 'https://images.unsplash.com/photo-1456444029056-7df9fe24a445?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np18', day: 'Saturday', type: 'Dinner', name: 'Steak & Veggies', calories: 750, protein: 55, carbs: 20, fats: 40, image: 'https://images.unsplash.com/photo-1546241072-48010ad28c2c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },

    // Sunday
    { id: 'np19', day: 'Sunday', type: 'Breakfast', name: 'French Toast', calories: 450, protein: 15, carbs: 70, fats: 12, image: 'https://images.unsplash.com/photo-1484723088339-fe7838eccfc3?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np20', day: 'Sunday', type: 'Lunch', name: 'Pasta Carbonara', calories: 850, protein: 35, carbs: 90, fats: 40, image: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
    { id: 'np21', day: 'Sunday', type: 'Dinner', name: 'Roast Chicken', calories: 600, protein: 45, carbs: 15, fats: 30, image: 'https://images.unsplash.com/photo-1598103442097-8b74394b99c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', completed: false },
];

export const AI_MESSAGES = [
    {
        _id: 1,
        text: 'Hello Alex! I am your personal fitness AI. How can I help you today?',
        createdAt: new Date(),
        user: {
            _id: 2,
            name: 'AI Coach',
            avatar: 'https://placeimg.com/140/140/tech',
        },
    },
];

export const FEED_POSTS = [
    {
        id: '1',
        user: 'Sarah Jenkins',
        avatar: 'https://i.pravatar.cc/150?u=sarah',
        time: '2 hours ago',
        content: 'Just finished a 5km run! Feeling amazing. Special thanks to the Early Risers club for the motivation 🏃‍♀️💨',
        likes: 24,
        liked: true,
        image: 'https://images.unsplash.com/photo-1530143311094-34d8023df976?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        comments: [
            { id: 'c1', user: 'Mike Ross', avatar: 'https://i.pravatar.cc/150?u=mike', text: 'Great job Sarah! Keep it up! 🔥', time: '1 hour ago' },
            { id: 'c2', user: 'Jordan', avatar: 'https://i.pravatar.cc/150?u=jordan', text: 'That pace is insane!', time: '45 mins ago' },
        ],
        status: 'Active'
    },
    {
        id: '2',
        user: 'Mike Ross',
        avatar: 'https://i.pravatar.cc/150?u=mike',
        time: '4 hours ago',
        content: 'Hit my new PR on Bench Press today: 100kg! Hard work paying off. #Strength #Gains',
        likes: 56,
        liked: false,
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        comments: [
            { id: 'c3', user: 'Alex', avatar: 'https://i.pravatar.cc/150?u=Alex', text: 'Welcome to the 100kg club! 🏋️‍♂️', time: '3 hours ago' },
        ],
        status: 'In Workout'
    }
];

export const CLUBS = [
    {
        id: '1',
        name: 'Early Risers',
        members: '1.2k',
        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        tag: 'Yoga',
        description: 'A community for those who believe the best part of the day is the sunrise. We focus on morning yoga, meditation, and setting a positive intention for the day ahead. Join us for daily 6 AM sessions!',
        founder: {
            name: 'Sarah Jenkins',
            avatar: 'https://i.pravatar.cc/150?u=sarah'
        },
        chatMessages: [
            { id: 'cm1', user: 'Sarah', avatar: 'https://i.pravatar.cc/150?u=sarah', text: 'Good morning everyone! Ready for the 6 AM flow?', time: '5:45 AM' },
            { id: 'cm2', user: 'Mike Ross', avatar: 'https://i.pravatar.cc/150?u=mike', text: 'Coffee is ready, see you on the mat! 🧘‍♂️', time: '5:50 AM' },
        ]
    },
    {
        id: '2',
        name: 'Iron Lifters',
        members: '850',
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        tag: 'Strength',
        description: 'Dedicated to the pursuit of strength. Whether you are a powerlifter, bodybuilder, or just want to get stronger, Iron Lifters is your home. Leave your ego at the door and pick up some plates.',
        founder: {
            name: 'Mike Ross',
            avatar: 'https://i.pravatar.cc/150?u=mike'
        },
        chatMessages: [
            { id: 'cm3', user: 'Jordan', avatar: 'https://i.pravatar.cc/150?u=jordan', text: 'Any tips for improving deadlift form?', time: 'Yesterday' },
            { id: 'cm4', user: 'Alex', avatar: 'https://i.pravatar.cc/150?u=Alex', text: 'Keep your back flat and drive through your heels! 🏋️‍♂️', time: 'Yesterday' },
        ]
    },
    {
        id: '3',
        name: 'Runners Hub',
        members: '2.1k',
        image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        tag: 'Cardio',
        description: 'From 5ks to ultramarathons, Runners Hub is a collective of athletes who find peace in the pace. Share your routes, PRs, and find running partners in your local area.',
        founder: {
            name: 'Alex',
            avatar: 'https://i.pravatar.cc/150?u=Alex'
        },
        chatMessages: [
            { id: 'cm5', user: 'Sarah Jenkins', avatar: 'https://i.pravatar.cc/150?u=sarah', text: 'Anyone running the city marathon this weekend?', time: '2 hours ago' },
            { id: 'cm6', user: 'Mike Ross', avatar: 'https://i.pravatar.cc/150?u=mike', text: 'I\'ll be there! Look for the neon green shirt. 🏃‍♂️', time: '1 hour ago' },
        ]
    },
];

export const ACHIEVEMENTS = [
    { id: '1', icon: '🏆', title: 'Early Bird', date: 'Jan 15', description: 'Complete a workout before 7 AM', earned: true, category: 'Milestone' },
    { id: '2', icon: '🔥', title: '7 Day Streak', date: 'Jan 20', description: 'Exercise for 7 consecutive days', earned: true, category: 'Milestone' },
    { id: '3', icon: '💎', title: 'Points King', date: 'Jan 25', description: 'Accumulate 10,000 progress points', earned: true, category: 'Legacy' },
    { id: '4', icon: '🏃', title: 'Road Warrior', date: 'Pending', description: 'Run a total of 50km', earned: false, category: 'Milestone', progress: 0.8 },
    { id: '5', icon: '🛡️', title: 'Social Shield', date: 'Pending', description: 'Join 5 fitness clubs', earned: false, category: 'Social', progress: 0.6 },
    { id: '6', icon: '👑', title: 'Leaderboard God', date: 'Pending', description: 'Reach #1 in World Ranking', earned: false, category: 'Legacy', progress: 0.2 },
    { id: '7', icon: '🏋️', title: 'Iron Soul', date: 'Jan 10', description: 'Lift a total of 1000kg in one session', earned: true, category: 'Milestone' },
    { id: '8', icon: '🥗', title: 'Clean Eater', date: 'Jan 05', description: 'Log all meals for 30 days', earned: true, category: 'Social' },
];

export const MOCK_NOTIFICATIONS = [
    { id: '1', title: 'Goal Achieved! 🏆', message: 'You reached your daily step goal of 8,000 steps. Keep it up!', time: '2h ago', read: false, icon: 'trophy', color: '#F59E0B' },
    { id: '2', title: 'New Challenge Available! 🔥', message: 'The "Weekend Sprint" challenge is now open for registration.', time: '5h ago', read: true, icon: 'flame', color: '#EF4444' },
    { id: '3', title: 'Friend Request', message: 'Sarah Jenkins sent you a friend request.', time: '1d ago', read: false, icon: 'person-add', color: '#3B82F6' },
    { id: '4', title: 'Workout Reminder', message: 'Time for your "Leg Day" session. Don\'t miss out!', time: '2d ago', read: true, icon: 'fitness', color: '#10B981' },
    { id: '5', title: 'Nutrition Tip 🥗', message: 'Remember to stay hydrated throughout the day for better recovery.', time: '3d ago', read: true, icon: 'restaurant', color: '#6366F1' },
];
