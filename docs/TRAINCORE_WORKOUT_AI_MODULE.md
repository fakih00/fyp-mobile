# TrainCore AI Workout Recommendation Module

Last updated: 2026-09-07

TrainCore AI is the project's custom Python neural-network workout recommendation module. It generates workout plans locally from a public-source exercise dataset, user profile features, hard injury/location safety filters, and a trained feed-forward neural ranker. It does not use an external generation API in the workout-generation path.

## Purpose

TrainCore AI recommends workouts based on:

- user goal
- training days per week
- training location
- training intensity
- injuries and pain points
- posture and mobility limitations
- current weight and target weight
- sport-specific needs such as running, boxing, swimming, cycling, martial arts, and flexibility

## Model Name

```text
TrainCore AI
```

Current version:

```text
1.1.0
```

## Dataset

The workout dataset is stored as a separate local dataset file:

```text
ml/workout_ai/datasets/traincore_exercise_dataset.json
```

Dataset name:

```text
TrainCore Exercise Dataset
```

Current local dataset size:

```text
220 exercise records
```

The current checked-in dataset is imported from a public exercise dataset:

```text
Primary source: RepDB Exercise Dataset free tier
Source URL: https://exercise-dataset.com/exercises.json
Original public source size: 601 exercises
Imported TrainCore records: 220 exercises
```

The model can also import a Kaggle/public exercise CSV or JSON using:

```bash
npm run preprocess:workout-ai -- path/to/kaggle_exercise_dataset.csv --source-name "Kaggle Gym Exercises Dataset" --source-url "https://www.kaggle.com/datasets/niharika41298/gym-exercise-data"
```

Useful public dataset references for expansion:

- RepDB Exercise Dataset free tier
- Kaggle Gym Exercises Dataset
- Kaggle ExerciseDB Pro exercise library
- Kaggle 600K Workout Programs dataset

The preprocessing/import script is:

```text
scripts/import-traincore-kaggle-dataset.py
```

It maps public exercise rows into the TrainCore schema:

```text
name -> exercise name
equipment -> home/gym/outdoor location
body part / target muscle -> muscles
exercise type / equipment / name -> category
```

The dataset includes exercise records across:

- gym compound lifts
- gym accessories
- home and calisthenics exercises
- core and functional exercises
- cardio and explosive exercises
- mobility exercises
- rehabilitation/prehab exercises
- sport-specific drills

Each exercise record includes:

- exercise id
- exercise name
- available location
- target muscles
- category

At runtime, `ml/workout_ai/traincore_model.py` loads `traincore_exercise_dataset.json`. The older embedded exercise list remains only as a fallback if the dataset file is missing.

## Training Artifact

Training output is saved at:

```text
ml/workout_ai/traincore_trained_model.json
```

Latest training run:

```text
npm run train:workout-ai
```

Current validation result:

```text
Profiles tested: 3960
Plans generated: 3960
Exercise slots ranked: 74250
Unique exercises recommended: 191
Average AI score: 67.33
Neural training samples: 31720
Hidden layers: [8]
Mean absolute error: 0.0329
External API disabled: true
Python model: true
Neural network: true
```

## Neural Network Architecture

TrainCore uses a small local feed-forward neural network:

```text
Profile + exercise features
   |
   v
Dense hidden layer: 8 neurons
   |
   v
tanh activation
   |
   v
sigmoid output
   |
   v
exercise suitability score from 0 to 99
```

The network is implemented in pure Python so the project can train and run locally without TensorFlow or PyTorch installation during the demo.

## How It Works

```text
User profile
   |
   v
Normalize goal, frequency, location, intensity, injuries
   |
   v
Select weekly split based on goal and training days
   |
   v
Filter dataset by location and injury safety
   |
   v
Predict each exercise suitability score using the trained neural network
   |
   v
Rank exercises by score
   |
   v
Build workout day with sets, reps, rest, guide text, and AI score
   |
   v
Save weekly workout plan
```

## Neural Input Features

TrainCore AI converts the user and exercise into numeric features:

- goal one-hot encoding
- training location one-hot encoding
- intensity one-hot encoding
- exercise category one-hot encoding
- exercise movement-family one-hot encoding
- training frequency
- location match
- workout focus match
- goal/category fit
- goal/muscle fit
- expert score

The model learns from expert-rule labels generated inside:

```text
ml/workout_ai/traincore_model.py
```

The PHP backend service:

```text
backend/services/WorkoutAI.php
```

acts as the API wrapper. It sends the user profile to the Python model and saves the generated plan.

## External API Usage

TrainCore AI does not use an external generation API. Workout generation is Python-owned; if the Python model fails, the API returns an error instead of generating a plan in PHP.

For the senior project defense, TrainCore should be described as a local neural-network recommender, not a generative API wrapper.

## Training Command

```bash
npm run train:workout-ai
```

The training script:

```text
ml/workout_ai/traincore_model.py
```

Training flow:

```text
1. Load TrainCore Exercise Dataset from ml/workout_ai/datasets/traincore_exercise_dataset.json
2. Generate many synthetic user profile combinations
3. Pair each profile with compatible exercises
4. Preprocess profile + exercise into numeric neural features
5. Generate labels from expert-rule suitability scoring
6. Train the feed-forward neural network
7. Validate thousands of profile/plan combinations
8. Save neural weights and metrics to ml/workout_ai/traincore_trained_model.json
```

It trains the local neural network, disables external generation APIs, tests profile combinations, validates generated plans, measures exercise coverage, and writes the trained model artifact.

## Before And After

Before:

- recommendations were driven directly by explicit scoring rules
- score values could exceed 100 before normalization
- off-focus exercises could appear too high in the wrong workout day

After:

- a local neural network predicts exercise suitability
- hard safety filters protect injury and location constraints
- output scores are capped below 100
- workout days prefer exercises matching the day focus
- training creates a neural-network artifact with weights and validation metrics
