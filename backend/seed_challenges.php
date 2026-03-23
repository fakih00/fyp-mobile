<?php
include_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();

// Clear existing challenges to redefine them
$db->exec("DELETE FROM user_challenges");
$db->exec("DELETE FROM challenges");
$db->exec("ALTER TABLE challenges AUTO_INCREMENT = 1");

$challenges = [
    [
        'title' => '7-Day Weight Streak',
        'description' => 'Consistency is key! Log your weight every day for 7 consecutive days to build the habit.',
        'type' => 'streak',
        'points_reward' => 500,
        'difficulty' => 'Easy',
        'duration' => 7,
        'goal_value' => 7,
        'image' => 'https://images.unsplash.com/photo-1594882645126-14020914d58d?w=500&q=80'
    ],
    [
        'title' => 'Workout Warrior',
        'description' => 'Push your limits. Complete 5 scheduled workouts to earn this badge of honor.',
        'type' => 'workout',
        'points_reward' => 1000,
        'difficulty' => 'Medium',
        'duration' => 14,
        'goal_value' => 5,
        'image' => 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&q=80'
    ],
    [
        'title' => 'Nutrition Master',
        'description' => 'Precision eating. Log 21 meals in the app to master your calorie tracking.',
        'type' => 'nutrition',
        'points_reward' => 750,
        'difficulty' => 'Medium',
        'duration' => 10,
        'goal_value' => 21,
        'image' => 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=500&q=80'
    ],
    [
        'title' => 'Water Champion',
        'description' => 'Stay hydrated. Log your water intake for 5 days straight.',
        'type' => 'water',
        'points_reward' => 300,
        'difficulty' => 'Easy',
        'duration' => 5,
        'goal_value' => 5,
        'image' => 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=500&q=80'
    ],
    [
        'title' => 'Elite Consistency',
        'description' => 'The ultimate test. Log 10 workouts and 30 meals over the next 3 weeks.',
        'type' => 'streak',
        'points_reward' => 2500,
        'difficulty' => 'Hard',
        'duration' => 21,
        'goal_value' => 10, // Let's say this tracks workouts for the 'streak' type in this context
        'image' => 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=500&q=80'
    ]
];

foreach ($challenges as $c) {
    $query = "INSERT INTO challenges (title, description, type, points_reward, difficulty, duration, goal_value, image) 
              VALUES (:title, :description, :type, :points_reward, :difficulty, :duration, :goal_value, :image)";
    $stmt = $db->prepare($query);
    if ($stmt->execute($c)) {
        echo "Inserted: " . $c['title'] . "\n";
    } else {
        echo "Failed to insert: " . $c['title'] . "\n";
    }
}
echo "Seeding complete.";
?>
