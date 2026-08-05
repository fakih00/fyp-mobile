# PoseForm Exercise AI Module

Last updated: 2026-08-05

This document explains the custom exercise analysis module added to the workout player. The goal is to provide a realistic FYP-ready virtual trainer using camera pose estimation, joint-angle rules, real-time feedback, and automatic repetition counting for supported exercises.

## Product Goal

PoseForm acts as a virtual personal trainer inside the workout session.

It can:

- capture movement through the device camera
- detect body joints through MoveNet pose estimation
- calculate joint angles and body alignment
- identify the active exercise from the workout plan name
- analyze form quality
- detect posture and movement mistakes
- provide real-time correction feedback
- count repetitions for clear up/down movements
- show a form score in the workout summary

## Current Implementation

Main screen:

```text
src/screens/WorkoutPlayerScreen.js
```

Custom AI module:

```text
src/ai/exerciseFormModel.js
```

Training/rule metadata:

```text
ml/exercise_ai/poseform_training_rules.json
```

Validation script:

```text
scripts/validate-exercise-ai.js
```

The app already had:

- `expo-camera`
- TensorFlow.js
- `@tensorflow-models/pose-detection`
- MoveNet SinglePose Lightning setup
- live camera mode in the workout player

The new work connects those pieces to a real local analysis module instead of random simulated feedback.

## Supported Exercises

The current version supports a broader but still controlled exercise library:

- Squat
- Push-up
- Lunge
- Plank
- Shoulder press / overhead press
- Bicep curl
- Tricep dip
- Deadlift / Romanian deadlift
- Row
- Jumping jack
- Mountain climber
- Glute bridge / hip thrust
- Calf raise

Unsupported exercises still receive general pose locking feedback, but detailed correction rules and rep counting are strongest for the supported exercises.

## Pipeline

```text
Expo Camera
        |
        v
MoveNet pose detector
        |
        v
17 body keypoints
        |
        v
screen-space skeleton mapping
        |
        v
PoseForm exercise model
        |
        +--> joint angles
        +--> movement phase
        +--> form score
        +--> faulty joints
        +--> correction feedback
        +--> repetition count
        |
        v
WorkoutPlayer UI
```

## Exercise Detection

Exercise detection currently uses the active workout exercise name.

Examples:

```text
Squats -> squat model
Push Ups -> pushup model
Lunges -> lunge model
Plank -> plank model
Shoulder Press -> shoulderPress model
```

This is more reliable for the app than trying to guess every exercise only from movement, because the workout plan already knows what the user is supposed to perform.

## Form Rules

PoseForm calculates angles such as:

- knee angle
- front knee angle
- elbow angle
- hip angle
- shoulder angle
- torso lean
- body-line angle
- arm raise
- ankle lift
- knee gap ratio
- foot-to-hip width ratio
- shoulder/hip alignment
- elbow flare
- wrist/elbow drift

Example squat rules:

- shallow depth -> ask the user to go lower
- excessive torso lean -> ask the user to keep chest up
- knee collapse -> ask the user to keep knees aligned over toes

Example push-up rules:

- shallow depth -> lower chest more
- hip sag -> brace core and keep hips aligned
- elbow flare -> keep elbows closer to body

Example plank rules:

- hips sagging -> lift hips and brace core
- hips too high -> lower hips into one line
- shoulders not stacked -> stack shoulders over elbows/wrists

Additional supported rule examples:

- bicep curl: shoulder swing, incomplete curl, wrist drift
- tricep dip: shallow depth, shoulder shrug, hip drift
- deadlift: rounded back, knee-dominant hinge, weight drifting away
- row: torso rocking, short pull, shoulder shrug
- jumping jack: low arms, narrow feet, stiff landing
- mountain climber: hips too high, slow knee drive, shoulder stack
- glute bridge: low hips, over-arching, knee drift
- calf raise: low lift, knee bend, rushing the top position

## Rep Counting

Rep counting uses movement phases:

```text
up -> down -> up = 1 rep
```

For each supported rep-based exercise, PoseForm watches a primary angle:

- Squat: knee angle
- Push-up: elbow angle
- Lunge: front knee angle
- Shoulder press: elbow angle

Plank is treated as a hold exercise, so it does not count reps.

Current rep-counting support:

- Squat
- Push-up
- Lunge
- Shoulder press
- Bicep curl
- Tricep dip
- Deadlift
- Row
- Jumping jack
- Mountain climber
- Glute bridge
- Calf raise

## UI Behavior

When the AI camera is active, the workout player now shows:

- live skeleton overlay
- form feedback toast
- PoseForm AI panel
- detected exercise mode
- form score
- AI rep count
- movement phase
- model status
- highlighted faulty joints

The workout summary now uses the real PoseForm score instead of a fixed fake score.

## Training Approach

This first version is a custom explainable model, not a black-box deep-learning classifier.

That is intentional because:

- it is easier to validate for an FYP
- corrections are explainable
- rules can be tuned per exercise
- it works with a small dataset
- it reduces the need for thousands of labeled videos

Future training can improve it with:

- labeled correct/incorrect exercise videos
- per-exercise mistake datasets
- learned thresholds per body type
- personalized calibration
- model confidence tracking
- expert-reviewed form examples

Current training/tuning assets:

```text
ml/exercise_ai/poseform_training_rules.json
```

This file records the supported exercise library, tracked body metrics, rep-counting method, and latest validation result.

Validation command:

```bash
npm run validate:exercise-ai
```

Latest local validation:

```text
PoseForm validation passed 6/6 tests.
```

The validation checks:

- expanded exercise-name detection
- target rep parsing
- low-visibility scanning state
- squat repetition sequence
- push-up repetition sequence
- incorrect shallow-squat classification

## Current Limitations

- It depends on camera visibility and lighting.
- It uses snapshot-based inference, not high-FPS native frame processing.
- It is strongest for the supported exercises only.
- It does not yet save detailed form analytics to the backend.
- It does not yet generate automatic workout recommendations based on repeated form mistakes.

## Future Improvements

Next logical steps:

1. Add backend storage for form sessions.
2. Save rep count, form score, detected mistakes, and exercise name.
3. Show a history chart of form improvement.
4. Recommend safer alternatives when the user repeatedly performs an exercise incorrectly.
5. Add expert validation data for exercise form rules.
6. Expand supported exercises gradually.
7. Replace snapshot inference with a faster native camera frame processor if needed.

## FYP Status

The AI Exercise Analysis model is now partially implemented as `PoseForm`.

Implemented:

- camera-based pose estimation
- custom local analysis module
- joint-angle calculations
- form scoring
- real-time feedback
- faulty joint highlighting
- rep counting for supported rep-based exercises
- workout summary integration
- expanded expert-rule library for 13 exercise patterns
- validation script and curated rule metadata

Still future work:

- larger real-video training dataset
- expert-reviewed exercise dataset
- backend analytics storage
- full automatic recommendation engine
- more exercises
