from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
OUT_PATH = OUT_DIR / "fyp_ai_fitness_project_brief.pdf"


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=10,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#475569"),
            spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=21,
            textColor=colors.HexColor("#0F766E"),
            spaceBefore=12,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            leading=16,
            textColor=colors.HexColor("#1E293B"),
            spaceBefore=8,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.3,
            leading=13.2,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=5,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=11,
            textColor=colors.HexColor("#475569"),
        ),
        "callout": ParagraphStyle(
            "Callout",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9.4,
            leading=13.5,
            textColor=colors.HexColor("#0F172A"),
            backColor=colors.HexColor("#ECFDF5"),
            borderColor=colors.HexColor("#99F6E4"),
            borderWidth=0.8,
            borderPadding=7,
            spaceBefore=6,
            spaceAfter=8,
        ),
    }


S = styles()


def p(text, style="body"):
    return Paragraph(text, S[style])


def bullet(items):
    flow = []
    for item in items:
        flow.append(p("- " + item))
    return flow


def section(title, items):
    return [p(title, "h1"), *items]


def table(data, widths=None):
    converted = []
    for row in data:
        converted.append([p(str(cell), "small") for cell in row])
    t = Table(converted, colWidths=widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F766E")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(0.55 * inch, 0.38 * inch, "AI Fitness FYP Project Brief")
    canvas.drawRightString(7.72 * inch, 0.38 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build_story():
    flow = []
    flow.append(p("AI Fitness Mobile Application", "title"))
    flow.append(p("Full FYP technical brief, advisor talking points, AI module explanation, reviewer workflow, credentials, and implementation summary. Prepared from the current project files on 2026-09-03.", "subtitle"))
    flow.append(p("Main defense sentence: Our project evolved from a normal fitness tracker into a personalized AI-assisted fitness system. The three main custom modules are NutriCore AI for meals, TrainCore AI for workout plans, and PoseForm AI for exercise video analysis. The rest of the app supports tracking, progress, recovery, competition preparation, social engagement, and expert validation.", "callout"))

    flow += section("1. Project Overview", [
        p("The project is a full-stack mobile fitness app. The frontend is built with React Native and Expo. The backend is PHP with a centralized API router and database access through PDO. Python scripts power the main custom AI modules."),
        *bullet([
            "Frontend: React Native, Expo, React Navigation, Expo Camera, Expo ImagePicker, AsyncStorage, SVG/UI components.",
            "Backend: PHP controllers, API router, authentication middleware, validation, rate limiting, MySQL-style schema and migrations.",
            "AI layer: local Python recommendation/analyzer modules plus explainable rule logic and JSON training artifacts.",
            "Database: users, user profiles, workout plans, nutrition plans, progress logs, social tables, reviews, chat history, recovery plans, competition plans, achievements, rewards, and notifications.",
        ]),
    ])

    flow.append(table([
        ["Area", "What to say to the advisor"],
        ["Main contribution", "A personalized AI fitness assistant that connects user profile data to meal planning, workout generation, exercise video analysis, progress analytics, recovery guidance, and expert approval."],
        ["AI architecture", "Important decisions are local and explainable. Gemini is optional chat only, not the generator for meals, workouts, fridge swaps, or exercise analysis."],
        ["Current branch", "The project is on branch codex/recording-ai-refactor in the local workspace."],
        ["Important tradeoff", "Live camera analysis in Expo Go was too slow, so PoseForm was changed to recorded/uploaded video analysis for stability and better FYP demonstration."],
    ], [1.45 * inch, 5.55 * inch]))
    flow.append(PageBreak())

    flow += section("2. How Many AI Modules?", [
        p("Use this clear classification. It avoids overselling rule screens as deep AI while still showing the project is broad and well engineered."),
        table([
            ["Module", "Category", "Status"],
            ["NutriCore AI", "Main custom AI", "Implemented for meal plans, fridge-aware generation, swaps, ratings, and approved meal filtering."],
            ["TrainCore AI", "Main custom AI", "Implemented as a local Python neural workout ranker over ml/workout_ai/datasets/traincore_exercise_dataset.json."],
            ["PoseForm AI", "Main custom AI", "Implemented as recorded/uploaded exercise video analysis using pose landmarks, custom rules, rep counting, and form feedback."],
            ["ProgressAI / PredictionAI", "Predictive analytics", "PredictionAI uses a local neural regressor for weight trend prediction; ProgressAI uses local rules for readiness, plateau risk, and progress audit."],
            ["Recovery module", "Rule-based advisor", "Uses injuries and pain questionnaire data to generate recovery guidance. Not a medical diagnosis."],
            ["Competition Prep", "Rule-based planner", "Creates event preparation phases and milestones and should be described separately from the TrainCore neural recommender."],
            ["AI Chat", "Optional external chat", "Gemini only if API key exists. Chat does not own core recommendation decisions."],
        ], [1.35 * inch, 1.45 * inch, 4.2 * inch]),
    ])

    flow += section("3. What We Replaced", [
        *bullet([
            "Replaced Gemini meal generation with NutriCore AI, a local Python-owned nutrition model.",
            "Replaced static/basic workout generation with TrainCore AI, a local Python workout recommendation ranker.",
            "Replaced unreliable live camera exercise AI in Expo Go with recorded/uploaded video analysis through PoseForm.",
            "Replaced separate fridge meal generation with Fridge Sync connected to the same NutriCore scoring system.",
            "Replaced open meal display with an approval gate where actionable meals must be approved.",
            "Replaced normal-user approval with a single reviewer-only Expert Review workflow.",
            "Kept Gemini only for optional open-ended chat, with meal/workout/fridge/video decisions blocked from Gemini.",
        ]),
    ])

    flow.append(PageBreak())
    flow += section("4. Onboarding And User Inputs", [
        p("The onboarding screens collect the profile data required by the AI and recommendation modules. This is important because personalization is not random; it is based on structured user context."),
        *bullet([
            "Biometrics: age, gender, height, weight, target weight, BMI-related calculations.",
            "Fitness goal: fat loss, muscle gain, weight gain, maintenance, sport goals such as running, boxing, cycling, swimming, martial arts, and flexibility.",
            "Lifestyle: activity level, job type, steps estimate, sleep hours, stress level.",
            "Training: days per week, location, intensity, preferences.",
            "Physical assessment: injuries, pain points, strong side, posture problems, mobility limitations, avoid areas, chronic pain.",
            "Dietary assessment: meals per day, dietary preference, allergies, dislikes, fridge ingredients when using Fridge Sync.",
        ]),
    ])

    flow += section("5. NutriCore AI - Meal Recommendation", [
        p("NutriCore AI is the main custom meal recommendation model. It is Python-owned. PHP calculates calories and calls the Python model, then saves the generated plan."),
        table([
            ["Item", "Details"],
            ["Main files", "ml/nutrition_ai/nutricore_model.py, backend/services/NutritionAI.php, src/ai/trainedNutritionModel.json, ml/nutrition_ai/processed_data/usda_meal_training_dataset.json"],
            ["Training data", "USDA-backed meal dataset, local meal training dataset, processed nutrition dataset, trained JSON weights."],
            ["Inputs", "calories, macros, age, gender, height, weight, goal, activity level, allergies, dislikes, dietary preference, fridge ingredients, approval reviews, ratings."],
            ["Outputs", "weekly meal plan, meal calories/macros, ingredients, image, fridge match, missing ingredients, approval fields."],
            ["Algorithm", "Local scoring/ranking model using calorie fit, protein/macro fit, goal fit, ingredient fit, preference score, rating history, expert/model score, and approval status."],
            ["Important defense line", "Gemini does not generate meal plans, recipes, fridge swaps, or replacements. NutriCore owns meal decisions."],
        ], [1.45 * inch, 5.55 * inch]),
    ])

    flow += section("6. Fridge Sync", [
        p("Fridge Sync is not a second meal planner. It supports the current NutriCore plan by checking what ingredients the user has and suggesting approved swaps."),
        *bullet([
            "Shows today's meal-plan readiness from the existing NutriCore plan.",
            "Lets the user select fridge/pantry ingredients from a larger categorized selector.",
            "Ranks approved swaps based on fridge match, goal fit, calories, macros, allergies, ratings, and approval.",
            "Shows the first approved swaps, with a More Approved Swaps option to browse more without regenerating the main plan.",
            "Locks swaps for meals already logged, because completed nutrition logs are historical progress data.",
            "Ratings persist per user and can boost or penalize exact meals and similar-ingredient meals.",
        ]),
    ])

    flow.append(PageBreak())
    flow += section("7. Expert Review And Reviewer Credentials", [
        p("The project includes a human validation workflow. This is important for safety and explainability because meals and exercise tutorials should not simply appear to users without review."),
        p("Reviewer account for the demo:", "h2"),
        table([
            ["Field", "Value"],
            ["Email", "meal.reviewer.20260804@nutricore.local"],
            ["Password", "JasonTest123!"],
            ["Role", "Single reviewer only. This account opens the Expert Review page and can approve meals and exercise tutorials."],
        ], [1.5 * inch, 5.5 * inch]),
        p("What the reviewer can do:", "h2"),
        *bullet([
            "Open one simple Expert Review page.",
            "Switch between Meals and Tutorials tabs.",
            "Filter pending, approved, needs adjustment, rejected, or all items.",
            "Inspect meal macros, ingredients, and notes.",
            "Open exercise tutorial videos.",
            "Approve, reject, mark pending, or request adjustment.",
        ]),
        p("Normal users can read approval status and use approved content, but they cannot save approval decisions.", "callout"),
    ])

    flow += section("8. TrainCore AI - Workout Recommendation", [
        p("TrainCore AI is the main custom neural-network workout recommendation module. It generates workout plans locally from a separate TrainCore Exercise Dataset file and user profile data."),
        table([
            ["Item", "Details"],
            ["Main files", "ml/workout_ai/traincore_model.py, ml/workout_ai/datasets/traincore_exercise_dataset.json, ml/workout_ai/traincore_trained_model.json, backend/services/WorkoutAI.php"],
            ["Dataset", "TrainCore Exercise Dataset: 220 public-source exercise records imported from RepDB free tier, with a preprocessing importer for Kaggle/public exercise CSV or JSON expansion."],
            ["Inputs", "goal, training days, location, intensity, injuries, pain points, posture problems, mobility limits, current weight, target weight."],
            ["Neural features", "one-hot goal/location/intensity/category/movement family plus frequency, location match, focus match, goal fit, muscle fit, and expert score."],
            ["Output", "weekly workout plan with days, titles, exercises, sets, reps, rest, guide text, and AI score."],
            ["Important defense line", "Workout generation does not use Gemini. It uses the local TrainCore neural ranker."],
        ], [1.45 * inch, 5.55 * inch]),
    ])

    flow.append(PageBreak())
    flow += section("9. PoseForm AI - Exercise Video Analysis", [
        p("PoseForm AI is the exercise-analysis module. The current defendable version analyzes recorded or uploaded full-set videos instead of trying to do unstable live frame detection in Expo Go."),
        table([
            ["Item", "Details"],
            ["Main files", "src/screens/WorkoutPlayerScreen.js, backend/controllers/ExerciseAIController.php, ml/exercise_ai/video_pose_analyzer.py, ml/exercise_ai/poseform_pose_templates.json"],
            ["Computer vision", "MediaPipe pose landmark extraction from recorded video frames."],
            ["Inputs", "exercise video, active workout exercise name, target reps."],
            ["Outputs", "detected exercise profile, reps, form score, confidence, rep reliability, usable frames, feedback, mistakes."],
            ["Custom logic", "Exercise-specific movement metrics, denoising, adaptive thresholds, minimum movement range, phase transitions, and form rules."],
            ["Why recorded video", "Expo Go does not provide reliable real video frame processors. Recorded video gives enough frames to analyze a complete set and makes the demo more stable."],
        ], [1.45 * inch, 5.55 * inch]),
        p("Supported movement families include squat, push-up, lunge, plank, shoulder press, bicep curl, tricep dip, deadlift, row, jumping jack, mountain climber, glute bridge, calf raise, bench press, lat pulldown, pull-up, leg press, leg extension, leg curl, lateral raise, chest fly, crunch, burpee, and locomotion/walking-style movement."),
        p("PoseForm also connects to local exercise tutorial recommendations. Tutorials can be approved by the same reviewer from the Expert Review page.", "callout"),
    ])

    flow += section("10. Progress Prediction And Analytics", [
        p("Progress prediction uses a small local neural-network regressor trained from the user's own weight history."),
        *bullet([
            "Uses a PHP feed-forward neural network on normalized date and weight-history features to predict the next 30-day trend.",
            "Uses user logs to estimate rate per week, readiness, plateau risk, and goal progress.",
            "Uses sleep, stress, steps, water, workout adherence, and nutrition adherence for recommendations.",
            "ProgressAI generates local audits, trajectory simulations, and daily bio advisory messages.",
            "Advisor wording: PredictionAI is neural; ProgressAI daily advisory text remains deterministic local analysis.",
        ]),
    ])

    flow.append(PageBreak())
    flow += section("11. Recovery Module", [
        p("The recovery feature is a rule-based wellness recommendation module. It is not a clinical diagnosis and should not be presented as medical authority."),
        *bullet([
            "Uses injury profile, pain points, pain level, pain type, pain history, and movement triggers.",
            "Generates pain analysis, recovery plan, supplements, stretching, mobility exercises, exercises to avoid, sleep advice, hydration advice, posture advice, and estimated timeline.",
            "Saves recovery plans and completed items to the backend.",
            "Advisor wording: expert-rule recovery guidance based on physical assessment data.",
        ]),
    ])

    flow += section("12. Competition Prep", [
        p("Competition Prep is a rule-based planning module, not a trained custom AI model yet."),
        *bullet([
            "Uses competition name, date, type, weeks available, specific goal, fitness level, and user profile.",
            "Generates base-building phase, specific conditioning phase, taper/recovery phase, weekly schedule, milestones, nutrition guidance, and readiness estimate.",
            "Currently it does not use TrainCore's exercise dataset.",
            "Future improvement: connect Competition Prep to TrainCore so event plans are generated from the same custom workout AI engine.",
        ]),
    ])

    flow += section("13. AI Chat", [
        p("AI Chat is optional. It can use Gemini if GEMINI_API_KEY is configured, otherwise it can fall back to local coaching logic."),
        p("Defense boundary: Gemini is used only for open-ended conversation. It is explicitly not responsible for NutriCore meal plans, TrainCore workout generation, Fridge Sync swaps, or PoseForm exercise-video analysis.", "callout"),
    ])

    flow.append(PageBreak())
    flow += section("14. Backend And API", [
        p("The backend uses a centralized router in backend/api/index.php. Routes dispatch to controllers and apply authentication/rate limiting where needed."),
        table([
            ["Area", "Representative routes"],
            ["Auth", "POST /api/register, POST /api/login, POST /api/logout"],
            ["Fitness plans", "GET /api/getWorkouts, GET /api/getNutritionPlan, POST /api/generatePlan"],
            ["Meals and fridge", "POST /api/replaceMeal, POST /api/getMealSwaps, GET /api/getMealFeedback, POST /api/saveMealFeedback"],
            ["Review", "GET /api/getMealReviews, POST /api/saveMealReview, GET /api/getMealReviewAccess, GET /api/getExerciseTutorialReviews, POST /api/saveExerciseTutorialReview"],
            ["PoseForm", "POST /api/analyzeExerciseVideo"],
            ["Progress", "GET /api/getWeightHistory, GET /api/getProgressStats, GET /api/predictProgress, POST /api/logDailyPulse, POST /api/logWater"],
            ["Recovery", "POST /api/generateRecoveryPlan, GET /api/getRecoveryPlan, POST /api/updateRecoveryProgress"],
            ["Competition", "POST /api/generateCompetitionPlan, GET /api/getCompetitionPlan, POST /api/updateCompetitionProgress"],
            ["Social", "friends, clubs, feed, messages, leaderboard, challenges, rewards, notifications, achievements"],
        ], [1.55 * inch, 5.45 * inch]),
    ])

    flow += section("15. Database And Migrations", [
        p("The database stores the user profile, generated plans, logs, review decisions, social/gamification state, and AI-support records."),
        *bullet([
            "Core tables: users, user_profiles, workouts, nutrition_plans, progress.",
            "Social tables: friends, messages, clubs/feed-related tables, challenges, rewards, redemptions, leaderboard-related data.",
            "AI/support tables: meal_feedback, meal_reviews, exercise_tutorial_reviews, ai_chat_history, recovery_plans, competition_plans, daily_logs, achievements, notifications.",
            "Important migrations include physical assessment fields, meal reviews, AI chat history, recovery plans, competition plans, achievements, quests, and goals.",
        ]),
    ])

    flow.append(PageBreak())
    flow += section("16. Frontend Screens", [
        table([
            ["Screen/Area", "Purpose"],
            ["Onboarding", "Collects personal, training, dietary, lifestyle, physical, injury, and goal inputs."],
            ["Home/Dashboard", "Shows overview, streaks, daily state, shortcuts, and user summary."],
            ["Workout Plan", "Shows TrainCore workout plan and starts workout session."],
            ["Workout Player", "Runs workout session, PoseForm recording/upload, tutorial recommendation, reps/form result, and completion."],
            ["Nutrition Plan", "Shows NutriCore meal plan, macro targets, meal logging, and NutriCore swaps."],
            ["Fridge Sync", "Ingredient selector, plan readiness, approved swaps, ratings, swap application, and logged-meal locking."],
            ["Expert Review", "Single reviewer page for approving meals and tutorials."],
            ["Progress", "Weight history, prediction, readiness, plateau risk, adherence and daily logs."],
            ["Recovery", "Injury questionnaire, generated recovery plan, and recovery progress."],
            ["Competition Prep", "Event information, generated preparation schedule, milestones and progress."],
            ["Social/Gamification", "Friends, clubs, feed, messages, leaderboard, achievements, challenges, shop/rewards, notifications."],
        ], [1.65 * inch, 5.35 * inch]),
    ])

    flow += section("17. Training And Validation", [
        *bullet([
            "NutriCore training command: npm run train:nutrition-ai.",
            "TrainCore training command: npm run train:workout-ai.",
            "PoseForm validation/training command: npm run validate:exercise-ai and npm run train:exercise-ai.",
            "Recorded metadata from docs: NutriCore internal validation includes goal recommendation accuracy, allergy safety, fridge match, and top-swap quality. TrainCore tested thousands of profile combinations and ranked exercise slots from the 80-exercise dataset. PoseForm includes JS/template validation, Python video analyzer validation, and recorded-video smoke profiles.",
            "Important wording: these are internal validation metrics for an FYP prototype, not clinical or medical certification.",
        ]),
    ])

    flow += section("18. Limitations And Future Work", [
        *bullet([
            "Real-time camera AI in Expo Go is limited because Expo Go does not expose true native frame processors.",
            "PoseForm accuracy depends on lighting, camera angle, full-body visibility, and exercise type.",
            "Recovery advice is not a medical diagnosis.",
            "Competition Prep should later use TrainCore's custom exercise dataset.",
            "Progress analytics can improve as the user logs more data.",
            "Future work: save detailed PoseForm history, show form improvement charts, add expert-labeled video datasets, connect competition planning to TrainCore, add real food scanner AI, and build a native Android dev build for real-time pose frames.",
        ]),
    ])

    flow.append(PageBreak())
    flow += section("19. What To Say In The Meeting", [
        p("Use this compact script if the advisor asks for the whole project:"),
        p("This FYP is a full-stack AI fitness application. The mobile frontend is React Native Expo, the backend is PHP with a MySQL database, and the main AI logic is in local Python modules. We built three main custom AI modules: NutriCore for personalized meal plans and fridge-based swaps, TrainCore for personalized workout generation, and PoseForm for recorded exercise video analysis. We also added predictive analytics for progress, rule-based recovery guidance, rule-based competition preparation, social/gamification features, and a single-reviewer approval workflow for meals and tutorials."),
        p("Use this if he asks about Gemini:", "h2"),
        p("Gemini is only an optional chat assistant. It does not generate meals, workouts, fridge swaps, or exercise analysis. Those decisions are handled by our custom local modules."),
        p("Use this if he asks about the exercise AI:", "h2"),
        p("We first tried live camera detection, but Expo Go was too slow and unstable for real-time frame processing. So we changed PoseForm to recorded/uploaded video analysis. This gives the analyzer enough frames to count reps and score form more reliably, which is better for the FYP demo."),
        p("Use this if he asks what is really custom AI:", "h2"),
        p("The true main custom AI modules are NutriCore, TrainCore, and PoseForm. Progress Prediction is predictive analytics. Recovery and Competition Prep are expert-rule modules. Gemini is chat only."),
    ])

    return flow


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT_PATH),
        pagesize=A4,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.62 * inch,
        title="AI Fitness FYP Project Brief",
        author="FYP Project Team",
    )
    doc.build(build_story(), onFirstPage=footer, onLaterPages=footer)
    print(OUT_PATH)


if __name__ == "__main__":
    main()
