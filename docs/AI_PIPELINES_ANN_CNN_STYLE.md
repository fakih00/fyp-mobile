# AI Pipelines In ANN/CNN Course Style

Last updated: 2026-09-07

This document explains the project AI modules using the same structure as the ANN and CNN course examples:

```text
dataset/input source
preprocessing
feature encoding or image/pose extraction
neural model
training or validation
accuracy/error metric
local app inference
```

## TrainCore AI

Model family:

```text
ANN / feed-forward neural network
```

Dataset:

```text
ml/workout_ai/datasets/traincore_exercise_dataset.json
```

Dataset name:

```text
TrainCore Exercise Dataset
```

Current records:

```text
220 exercises
```

Public source:

```text
RepDB Exercise Dataset free tier
https://exercise-dataset.com/exercises.json
```

The downloaded public file contains 601 exercises; the checked-in TrainCore training dataset currently imports 220 normalized records.

Public dataset expansion references are documented in the dataset JSON:

- RepDB Exercise Dataset free tier
- Kaggle Gym Exercises Dataset
- Kaggle ExerciseDB Pro
- Kaggle 600K Workout Programs

Preprocessing:

```text
scripts/import-traincore-kaggle-dataset.py
ml/workout_ai/traincore_model.py::neural_features()
```

The preprocessing converts goal, location, intensity, exercise category, movement family, focus match, goal match, and expert category score into numeric neural features.

Training:

```bash
python ml/workout_ai/traincore_model.py --train
```

or:

```bash
npm run train:workout-ai
```

Architecture:

```text
input vector
hidden layer: 8 neurons
tanh activation
sigmoid output
exercise suitability score
```

Latest metrics:

```text
training samples: 31,720
profiles tested: 3,960
plans generated: 3,960
exercise slots ranked: 74,250
unique exercises recommended: 191
mean absolute error: 0.0329
validation passed: true
```

## NutriCore AI

Model family:

```text
ANN / feed-forward neural network classifier
```

Dataset:

```text
ml/nutrition_ai/processed_data/usda_meal_training_dataset.json
```

Dataset name:

```text
USDA Foundation Foods Smart Fridge Meal Dataset
```

Source:

```text
USDA FoodData Central Foundation Foods CSV 2026-04-30
```

Raw dataset:

```text
ml/nutrition_ai/raw_data/FoodData_Central_foundation_food_csv_2026-04-30.zip
```

Preprocessing:

```text
ml/nutrition_ai/preprocess_usda_dataset.py
ml/nutrition_ai/train_model.py::neural_features()
```

The preprocessing converts calories, protein, goal fit, fridge ingredients, preferences, expert score, meal type, and goal type into numeric features.

Training:

```bash
python ml/nutrition_ai/nutricore_model.py --train
```

or:

```bash
npm run train:nutrition-ai
```

Architecture:

```text
16 input features
hidden layer: 10 neurons
tanh activation
sigmoid output
meal suitability probability
```

Latest metrics:

```text
training samples: 216
validation samples: 72
training accuracy: 99%
validation accuracy: 100%
training MAE: 0.0217
validation MAE: 0.0094
top-3 recommendation accuracy: 100%
allergy filtering accuracy: 100%
```

## PredictionAI

Model family:

```text
ANN / feed-forward neural network regressor
```

Dataset:

```text
backend progress table weight history
```

Preprocessing:

```text
backend/services/PredictionAI.php
```

The preprocessing sorts logs by date, converts dates to day numbers, creates a baseline trend feature, and normalizes weight values.

Validation:

```bash
php scripts/test-prediction-ai.php
```

Architecture:

```text
2 input features
hidden layer: 4 neurons
tanh activation
linear numeric output
predicted weight in kg
```

Sample validation metrics:

```text
model type: php_local_neural_weight_regressor
training accuracy: 98%
validation MAE: 0.21 kg
```

## PoseForm AI

Model family:

```text
CNN/computer-vision style pose-estimation pipeline
```

Input source:

```text
recorded or uploaded exercise video
```

Neural model:

```text
ml/exercise_ai/models/pose_landmarker_lite.task
```

The pose landmark model is a local pretrained MediaPipe neural model. The project-owned layer is the PoseForm movement-template and scoring system.

Template dataset:

```text
ml/exercise_ai/poseform_pose_templates.json
ml/exercise_ai/video_pose_analyzer.py
```

Preprocessing:

```text
ml/exercise_ai/video_pose_analyzer.py
```

The preprocessing reads video frames, extracts body landmarks, filters low-confidence frames, smooths movement signals, and calculates joint angles/movement phases.

Validation:

```bash
npm run validate:exercise-ai
```

Full exercise-AI validation:

```bash
npm run train:exercise-ai
```

Latest validation:

```text
17/17 JS/template validation tests passed
3/3 Python recorded-video analyzer tests passed
24/24 recorded-video profiles passed smoke execution
```

## One Command

Run the full local AI pipeline:

```bash
python scripts/train-all-ai.py
```

or:

```bash
npm run train:all-ai
```

Defense summary:

```text
TrainCore, NutriCore, and PredictionAI follow the ANN pipeline: tabular data, preprocessing, encoded features, feed-forward neural network, and accuracy/error metrics.

PoseForm follows the CNN/computer-vision pipeline: video frames, neural pose model, landmark preprocessing, movement templates, and validation metrics.
```
