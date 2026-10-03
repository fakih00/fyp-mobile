# PoseForm Exercise AI Module

Last updated: 2026-08-25

PoseForm is the project's custom exercise-analysis AI module. It acts as a virtual personal trainer inside the workout session by analyzing a recorded or uploaded exercise video, counting repetitions, scoring form, detecting movement mistakes, and recommending an expert-reviewed technique tutorial when needed.

PoseForm is not a Gemini or external generative-AI feature. Exercise analysis is handled by local Python code and project-owned pose/form rules.

## Product Goal

PoseForm is designed to:

- capture the user's exercise through the device camera or video upload
- extract body landmarks from the full-set video
- identify the expected exercise from the active workout item
- count repetitions when the movement pattern is visible
- score form quality
- detect common mistakes
- show correction notes after analysis
- recommend a tutorial video for the same exercise
- support expert validation through Jason's review screen

The workflow is intentionally full-set based. The user presses `Start Recording`, completes the exercise, then presses `Stop & Analyze`. This avoids the unreliable high-FPS real-time camera limitations of Expo Go and gives a more stable FYP demo.

## Current Implementation

Main user screen:

```text
src/screens/WorkoutPlayerScreen.js
```

Python recorded-video analyzer:

```text
ml/exercise_ai/video_pose_analyzer.py
```

Custom pose-template validation data:

```text
ml/exercise_ai/poseform_pose_templates.json
```

Tutorial recommendation dataset:

```text
src/ai/exerciseTutorials.js
```

Backend API:

```text
backend/controllers/ExerciseAIController.php
POST /api/analyzeExerciseVideo
```

Expert tutorial review API:

```text
backend/controllers/FitnessController.php
GET  /api/getExerciseTutorialReviews
POST /api/saveExerciseTutorialReview
```

Validation commands:

```bash
npm run validate:exercise-ai
npm run train:exercise-ai
```

## High-Level Flow

```text
Workout exercise selected
        |
        v
User watches optional tutorial
        |
        v
User records or uploads full-set video
        |
        v
Backend receives video
        |
        v
Python PoseForm analyzer extracts landmarks with MediaPipe
        |
        v
Custom exercise templates score reps and form
        |
        v
API returns reps, form score, confidence, feedback, mistakes
        |
        v
WorkoutPlayer shows analysis result and tutorial recommendation
```

## Recorded Video Runtime

The current runtime uses:

- Expo CameraView for recording
- Expo ImagePicker for video upload
- PHP backend upload endpoint
- local Python analyzer
- MediaPipe pose landmark extraction
- custom PoseForm rule/template scoring

Why recorded video is used:

- Expo Go does not provide reliable native frame processors.
- Live frame-by-frame AI was too slow and unstable on mobile.
- Recorded video gives PoseForm enough frames to detect a complete movement pattern.
- Upload mode allows the team to test known squat, curl, push-up, and other sample videos during demo preparation.

Current video behavior:

- the recording ends when the user presses `Stop & Analyze`
- uploaded videos are accepted through the same analyzer path
- upload timeout is longer to support larger clips
- the UI shows duration, usable frames, confidence, reps, form score, and coaching notes
- the user can retake, accept result, or mark the exercise complete
- the user can return from PoseForm to the exercise list

## Supported Exercise Coverage

PoseForm has custom recorded-video profiles for the core supported exercise set in:

```text
ml/exercise_ai/poseform_pose_templates.json
ml/exercise_ai/video_pose_analyzer.py
```

Supported movement families include:

- squat
- push-up
- lunge
- plank
- shoulder press
- bicep curl
- tricep dip
- deadlift
- row
- jumping jack
- mountain climber
- glute bridge
- calf raise
- bench press
- lat pulldown
- pull-up
- leg press
- leg extension
- leg curl
- lateral raise
- chest fly
- crunch
- burpee / push-up based conditioning
- locomotion / walking style movement

The UI tutorial-review layer currently exposes 30 exercise tutorial rows for Jason approval:

- Squat
- Jump Squat
- Leg Press
- Leg Extension
- Push-Up
- Burpee
- Deadlift
- Glute Bridge
- Leg Curl
- Bench Press
- Incline Dumbbell Press
- Chest Fly
- Shoulder Press
- Lateral Raise
- Pull-Up
- Lat Pulldown
- Bicep Curl
- Row
- Tricep Dip
- Plank
- Mountain Climber
- Lunge
- Warrior I
- Jumping Jack
- Calf Raise
- Crunch
- Sun Salutation
- Downward Dog
- Cat Cow
- Nature Walk

Some tutorial rows share a source video when the exercise is a close variation of the same movement family. Each row still has its own approval status, so Jason can approve or reject exercises individually.

## Exercise Identification

PoseForm does not guess the exercise from zero context. It uses the active workout exercise name as the expected label, then maps that name to a supported movement profile.

Examples:

```text
Squats -> squat profile
Bicep Curls -> bicepCurl profile
Mountain Climbers -> mountainClimber profile
Bench Press -> benchPress profile
Downward Dog -> yoga tutorial profile
```

This is more reliable for the project because the workout plan already knows what the user is supposed to perform.

## Form Analysis

The Python analyzer extracts landmarks, normalizes movement, and computes exercise-specific metrics such as:

- knee angle
- hip angle
- elbow angle
- shoulder angle
- torso lean
- body-line angle
- wrist and elbow alignment
- knee tracking
- range of motion
- movement phase
- pose visibility

Then the custom PoseForm rules compare those metrics against curated templates and movement thresholds.

Example mistakes:

- squat: shallow depth, knee collapse, excessive torso lean
- push-up: shallow depth, hip sag, elbow flare
- bicep curl: elbow swing, incomplete curl, wrist drift
- deadlift: rounded back, knee-dominant hinge, poor lockout
- bench press: shallow depth, elbow flare, wrist stack issue
- mountain climber: hips too high, weak knee drive, poor shoulder stack
- lateral raise: shoulder shrug, torso swing, low raise
- crunch: neck pulling, fast tempo, low curl

The response includes:

```json
{
  "success": true,
  "exercise": "bicepCurl",
  "reps": 10,
  "form_score": 84,
  "confidence": 82,
  "rep_reliability": 80,
  "valid_frames": 142,
  "feedback": ["Good elbow control."],
  "mistakes": ["Avoid swinging the torso."]
}
```

## Repetition Counting

Rep counting uses movement phases:

```text
ready -> working position -> returned position = 1 rep
```

For each supported exercise, PoseForm watches the most relevant movement metric:

- squat and leg press: hip/knee depth pattern
- push-up and bench press: elbow flexion/extension
- bicep curl: elbow angle curl pattern
- shoulder press: arm press pattern
- deadlift and glute bridge: hip hinge/extension pattern
- jumping jack: arm and leg opening/closing
- mountain climber: alternating knee drive
- calf raise: ankle lift

The model uses denoising, adaptive thresholds, and minimum movement range checks so it does not count tiny random motion as a rep.

## Tutorial Recommendation

Exercise tutorial data is stored locally:

```text
src/ai/exerciseTutorials.js
```

The app maps the active exercise to a curated YouTube tutorial or trusted YouTube search query. The user sees:

- `Technique Tutorial` before opening PoseForm
- `Watch Technique First` inside PoseForm
- `Improve This Set` after a weak form score

The tutorial feature is not an AI API. It is a local recommendation dataset linked to the current workout exercise.

## Expert Approval

Jason approves both meals and exercise tutorials in the same screen:

```text
src/screens/MealReviewScreen.js
```

The screen is now titled:

```text
Expert Review
```

It includes:

- `Meals` tab
- `Tutorials` tab
- status filters
- note input
- approve / needs adjustment / reject / pending actions
- direct tutorial video opening

Tutorial approval is stored in:

```text
exercise_tutorial_reviews
```

Normal users cannot approve tutorials. They can only see whether a tutorial is `Expert Approved` or `Pending Expert Review`.

## Training And Validation

PoseForm is trained and tuned as an explainable custom pose-template and rule-ranking model, not as a black-box generative model.

Training/tuning assets:

```text
ml/exercise_ai/poseform_pose_templates.json
ml/exercise_ai/video_pose_analyzer.py
```

The Python analyzer implements the movement classes, angle ranges, camera-view handling, and runtime form rules. The template dataset is used by validation to confirm supported exercise coverage.

Validation covers:

- supported exercise name mapping
- pose template coverage
- target rep parsing
- recorded-video analyzer execution
- all supported video-analysis profiles
- common bad-form cases
- rep counting behavior

Latest recorded metadata:

```text
17/17 JS/template validation tests passed
3/3 Python recorded-video analyzer tests passed
24/24 recorded-video smoke profiles passed
```

## Current Limitations

- Accuracy depends on camera angle, lighting, and full-body visibility.
- A phone placed too close can hide joints and reduce confidence.
- Some movements are approximated from 2D landmarks.
- PoseForm is strongest when the user records the full target set from the recommended angle.
- Real clinical safety still requires human judgment for injuries or pain.

## Future Improvements

The strongest future upgrades are:

1. Save PoseForm results to backend history.
2. Show form improvement charts per exercise.
3. Let Jason approve form-rule templates, not only tutorial resources.
4. Add a native Android dev build with true frame processors.
5. Expand video datasets with expert-labeled correct and incorrect reps.
6. Add automatic exercise alternatives when the same mistake repeats.

## FYP Defense Summary

PoseForm is now a custom AI module with:

- local Python recorded-video analysis
- MediaPipe landmark extraction
- custom exercise-specific rep logic
- form scoring and mistake detection
- curated pose-template metadata
- 24 recorded-video analyzer profiles
- 30 expert-reviewable tutorial resources
- Jason approval workflow
- normal-user tutorial visibility
- no Gemini dependency for exercise analysis
