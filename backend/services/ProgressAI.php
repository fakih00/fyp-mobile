<?php
require_once __DIR__ . '/GeminiService.php';

class ProgressAI {
    public function generateProgressAudit($userLogs, $profile, $weightHistory, $adherences) {
        $gemini = new GeminiService();
        if (!$gemini->isAvailable()) {
            return [
                "summary" => "Gemini API key is not configured. Please add GEMINI_API_KEY to your environment to enable AI coaching audits.",
                "status" => "Config Needed",
                "accomplishments" => ["Biometric and activity data logged successfully"],
                "concerns" => ["Gemini API key missing in backend environment"],
                "recommendations" => ["Go to AI Studio to get a free API key and set it in your .env as GEMINI_API_KEY"]
            ];
        }

        $prompt = "Generate an Elite Coach Progress Audit for a fitness user. Here is their context:\n";
        $prompt .= "- Goal: " . ($profile['goal'] ?? 'General fitness') . "\n";
        $prompt .= "- Target Weight: " . ($profile['target_weight'] ?? 'N/A') . " kg\n";
        $prompt .= "- Training Days per Week: " . ($profile['training_days_per_week'] ?? 3) . "\n";
        $prompt .= "- Meals per Day: " . ($profile['meals_per_day'] ?? 4) . "\n";
        
        $prompt .= "\nAdherence metrics over the last 7 days:\n";
        $prompt .= "- Workout adherence: " . round($adherences['workout'] ?? 0) . "%\n";
        $prompt .= "- Nutrition/Meal log adherence: " . round($adherences['nutrition'] ?? 0) . "%\n";

        $prompt .= "\nBiometric logs (weight, sleep, steps, stress) over the last 7 days:\n";
        if (empty($userLogs)) {
            $prompt .= "- No recent biometric logs found.\n";
        } else {
            foreach ($userLogs as $log) {
                $prompt .= "- Date: " . $log['date_logged'] . " | Weight: " . ($log['weight'] ?? 'N/A') . " kg | Sleep: " . ($log['sleep_hours'] ?? 'N/A') . "h | Stress: " . ($log['stress_level'] ?? 'medium') . " | Steps: " . ($log['steps_estimate'] ?? 0) . "\n";
            }
        }

        $systemInstruction = "You are an Elite AI Fitness & Performance Coach. Analyze the user's weekly metrics, weight trends, lifestyle logs (sleep, stress, steps), and plan adherence. Create a detailed progress audit. Respond with a JSON object in this format:\n{\n  \"summary\": \"A short, motivational, and technical summary of the week's physiological status (2-3 sentences).\",\n  \"status\": \"On Track\" | \"Needs Attention\" | \"Stalled\",\n  \"accomplishments\": [\n    \"Accomplishment 1 (specific to sleep, steps, workouts, or weight logs)\",\n    \"Accomplishment 2\"\n  ],\n  \"concerns\": [\n    \"Concern 1 (specific issue like stress levels, poor sleep, or workout consistency, or empty if none)\"\n  ],\n  \"recommendations\": [\n    \"Specific advice 1 (e.g. adjust calories, prioritize sleep windows, or increase steps)\",\n    \"Specific advice 2\",\n    \"Specific advice 3\"\n  ]\n}";

        $res = $gemini->askForJson($prompt, $systemInstruction);
        if (!$res) {
            return [
                "summary" => "The AI could not analyze your progress at this time. Keep tracking your metrics, and try again shortly.",
                "status" => "Scanning",
                "accomplishments" => ["Data logged successfully"],
                "concerns" => ["AI timeout or parse failure"],
                "recommendations" => ["Try auditing again in a few moments"]
            ];
        }

        return $res;
    }

    /**
     * Simulate 30-day weight trajectory based on user-specified lifestyle changes.
     */
    public function generateTrajectorySimulation($currentWeight, $targetWeight, $goal, $scenario) {
        $gemini = new GeminiService();
        if (!$gemini->isAvailable()) {
            return [
                "predicted_weight" => $currentWeight,
                "weekly_change" => 0,
                "days_to_goal" => null,
                "plateau_risk" => "unknown",
                "efficiency_score" => 50,
                "analysis" => "Gemini API key not configured.",
                "key_factors" => [],
                "warning" => "API key missing"
            ];
        }

        $stepsLabel = $scenario['steps'] >= 10000 ? 'High Activity' : ($scenario['steps'] >= 7000 ? 'Moderate Activity' : 'Low Activity');
        $sleepLabel = $scenario['sleep'] >= 8 ? 'Optimal Sleep' : ($scenario['sleep'] >= 6 ? 'Adequate Sleep' : 'Sleep Deprived');

        $prompt = "Simulate a 30-day physiological trajectory for a fitness user under specific lifestyle conditions.\n\n";
        $prompt .= "Current Stats:\n";
        $prompt .= "- Current Weight: {$currentWeight} kg\n";
        $prompt .= "- Target Weight: {$targetWeight} kg\n";
        $prompt .= "- Goal: {$goal}\n\n";
        $prompt .= "Proposed Lifestyle Scenario (next 30 days):\n";
        $prompt .= "- Daily Steps: " . $scenario['steps'] . " ({$stepsLabel})\n";
        $prompt .= "- Sleep Hours per Night: " . $scenario['sleep'] . " ({$sleepLabel})\n";
        $prompt .= "- Stress Level: " . $scenario['stress'] . "\n";
        $prompt .= "- Workout Days per Week: " . $scenario['workout_days'] . "\n";
        $prompt .= "- Calorie Deficit/Surplus relative to maintenance: " . $scenario['calorie_delta'] . " kcal/day\n\n";

        $systemInstruction = "You are a precision physiological simulation engine. Based on the user's lifestyle scenario, predict their 30-day body weight trajectory. Consider TDEE, metabolic adaptation, sleep quality's effect on cortisol and fat loss, step-count NEAT contribution, and workout intensity. Respond ONLY with a valid JSON object in this EXACT format:\n{\n  \"predicted_weight\": <float — predicted weight after 30 days in kg>,\n  \"weekly_change\": <float — estimated kg change per week, negative for loss>,\n  \"days_to_goal\": <integer or null — estimated days to reach target weight, null if impossible in 90 days>,\n  \"plateau_risk\": \"Low\" | \"Medium\" | \"High\",\n  \"efficiency_score\": <integer 0-100 — how optimized this plan is for the user's goal>,\n  \"analysis\": \"<2-3 sentence technical explanation of the predicted trajectory and why>\",\n  \"key_factors\": [\"<Factor 1 driving results>\", \"<Factor 2>\", \"<Factor 3>\"]\n}";

        $res = $gemini->askForJson($prompt, $systemInstruction);
        if (!$res) {
            return [
                "predicted_weight" => round($currentWeight - 1.5, 1),
                "weekly_change" => -0.35,
                "days_to_goal" => null,
                "plateau_risk" => "Medium",
                "efficiency_score" => 60,
                "analysis" => "Could not reach AI at this time. Showing estimated values.",
                "key_factors" => ["Calorie balance", "Activity level", "Sleep quality"]
            ];
        }

        return $res;
    }

    /**
     * Generate 3 personalized daily bio-advisory tips based on yesterday's biometric data.
     */
    public function generateBioAdvisory($yesterdayLog, $profile, $weeklyStats) {
        $gemini = new GeminiService();
        if (!$gemini->isAvailable()) {
            return [
                "morning_status" => "System Ready",
                "status_color" => "blue",
                "advisories" => [
                    ["icon" => "fitness", "color" => "#10B981", "category" => "TRAINING", "title" => "Stay Consistent", "advice" => "Maintain your training schedule today."],
                    ["icon" => "restaurant", "color" => "#3B82F6", "category" => "NUTRITION", "title" => "Hit Your Macros", "advice" => "Focus on protein intake to support recovery."],
                    ["icon" => "moon", "color" => "#6366F1", "category" => "RECOVERY", "title" => "Prioritize Rest", "advice" => "Aim for 7-8 hours of sleep tonight."]
                ]
            ];
        }

        $prompt = "Generate 3 hyper-personalized daily bio-advisory tips for a fitness user based on their data from yesterday.\n\n";
        $prompt .= "Yesterday's Biometrics:\n";
        $prompt .= "- Weight: " . ($yesterdayLog['weight'] ?? 'Not logged') . " kg\n";
        $prompt .= "- Sleep: " . ($yesterdayLog['sleep_hours'] ?? 'Not logged') . " hours\n";
        $prompt .= "- Stress Level: " . ($yesterdayLog['stress_level'] ?? 'medium') . "\n";
        $prompt .= "- Steps: " . ($yesterdayLog['steps'] ?? 0) . "\n\n";
        $prompt .= "User Profile:\n";
        $prompt .= "- Goal: " . ($profile['goal'] ?? 'General fitness') . "\n";
        $prompt .= "- Target Weight: " . ($profile['target_weight'] ?? 'N/A') . " kg\n\n";
        $prompt .= "Weekly context: Workout adherence " . round($weeklyStats['workout_adherence'] ?? 0) . "%, Nutrition adherence " . round($weeklyStats['nutrition_adherence'] ?? 0) . "%\n";

        $systemInstruction = "You are a world-class performance coach delivering a morning briefing. Based on yesterday's biometric data, generate exactly 3 specific, actionable daily bio-advisory tips — one for training, one for nutrition, one for recovery. Make them hyper-specific (not generic). Respond ONLY with this JSON:\n{\n  \"morning_status\": \"<A 3-5 word status phrase e.g. 'Prime Zone', 'Recovery Mode', 'High Alert'>\",\n  \"status_color\": \"green\" | \"yellow\" | \"red\" | \"blue\",\n  \"advisories\": [\n    {\"icon\": \"fitness\", \"color\": \"#10B981\", \"category\": \"TRAINING\", \"title\": \"<short title>\", \"advice\": \"<specific advice based on yesterday's data>\"},\n    {\"icon\": \"restaurant\", \"color\": \"#3B82F6\", \"category\": \"NUTRITION\", \"title\": \"<short title>\", \"advice\": \"<specific advice>\"},\n    {\"icon\": \"moon\", \"color\": \"#6366F1\", \"category\": \"RECOVERY\", \"title\": \"<short title>\", \"advice\": \"<specific advice based on sleep/stress data>\"}\n  ]\n}";

        $res = $gemini->askForJson($prompt, $systemInstruction);
        if (!$res) {
            return [
                "morning_status" => "System Ready",
                "status_color" => "blue",
                "advisories" => [
                    ["icon" => "fitness", "color" => "#10B981", "category" => "TRAINING", "title" => "Stay Consistent", "advice" => "Maintain your training schedule today."],
                    ["icon" => "restaurant", "color" => "#3B82F6", "category" => "NUTRITION", "title" => "Hit Your Macros", "advice" => "Focus on protein intake to support recovery."],
                    ["icon" => "moon", "color" => "#6366F1", "category" => "RECOVERY", "title" => "Prioritize Rest", "advice" => "Aim for 7-8 hours of sleep tonight."]
                ]
            ];
        }

        return $res;
    }
}
?>

