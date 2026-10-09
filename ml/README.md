# Model Training And Inference

TrainCore uses a Random Forest regressor, NutriCore uses a Random Forest
classifier, and PredictionAI uses ordinary least-squares linear regression.
PoseForm continues to use pretrained MediaPipe followed by the existing
joint-angle, movement-phase, and repetition logic.

Illustrated reports for all seven AI modules are available in
[`docs/ai-reports`](../docs/ai-reports/README.md), with a combined
[`printable PDF`](../output/pdf/ai_modules_illustrated_report.pdf).

## Setup And Commands

Run from the repository root on Windows:

```powershell
python -m venv .venv-models
.\.venv-models\Scripts\python.exe -m pip install -r ml\requirements-training.txt
npm run train:workout-ai
npm run train:nutrition-ai
npm run train:prediction-ai
```

If npm is unavailable, use the equivalent direct commands:

```powershell
.\.venv-models\Scripts\python.exe ml\workout_ai\traincore_model.py --train
.\.venv-models\Scripts\python.exe ml\nutrition_ai\nutricore_model.py --train
php scripts\test-prediction-ai.php
python scripts\test-random-forest-ai.py
python scripts\test-traincore-dominance.py
```

`npm run train:all-ai` trains both forests and validates prediction and PoseForm.
`npm run validate:recommendation-ai` checks recommendation constraints, side
dominance, the PHP-to-Python bridges, and linear-regression edge cases.
Training uses scikit-learn. PHP inference continues to use `PYTHON_BIN` or
`python`; it does not need scikit-learn, NumPy, or a new backend service.

## Preprocessing And Labels

TrainCore cleans the exercise catalog and encodes goal, location, intensity,
category, and movement family as one-hot features. Numerical features describe
frequency, focus match, goal match, and expert-rule score. Training creates
profile/exercise pairs labeled with the existing suitability rules. All injury
variants and focuses for the same goal/location/intensity/frequency profile
remain together in the train or validation partition.

NutriCore builds 72 meals from USDA-backed ingredients. Preprocessing requires
complete, finite energy/protein/carbohydrate/fat records; missing nutrients are
not silently replaced with zero. Portions and ingredient grams scale together
within 0.5x-2x the recipe portion. Recommendations return those actual recipe
macros, not copied targets. Preparation-state assumptions remain in the data.
The classifier sees calorie, protein, carbohydrate, fat, goal, ingredient,
preference, and prior reviewer-score fit, plus one-hot meal type and user goal.
Training uses the same feature extraction and portion handling as inference.
It creates 600 varied synthetic scenarios and uses the top-third score cutoff
per meal slot when the suitability rubric is at least 0.55, including score ties.
Identical recipe aliases share training weight rather than multiplying evidence.
Complete scenarios are held out. Four unchanged project shortlists are reported
separately as sparse reference recommendation checks, not exhaustive labels.

These labels represent project rules, not measured health outcomes or independent
expert approval. Allergy, dislike, equipment, injury, and manual approval filters
remain outside the forest. Manual approval is required for generated meals,
swap suggestions, and applied replacements. A model score never approves a meal.

## Training And Evaluation

Both forests use 64 trees and seed 42. Workouts use depth 8, minimum leaf size 3,
and an 80/20 grouped split. Nutrition uses disjoint 60/20/20 fitting, development,
and test scenarios. Development average precision selects among three forest
configurations; development F1 selects the decision threshold. The chosen model
is refitted on fitting plus development scenarios before one held-out test.
A Decision Tree baseline uses the same split and its own development threshold.
Forests do not require feature scaling.

Workout quality is mean absolute error against rule-derived labels. The separate
profile-matrix check validates plan structure, not predictive accuracy. Nutrition
reports accuracy, balanced accuracy, average precision, F1, Brier score, and
positive-label prevalence. Held-out ranking reports hit rate, precision, NDCG,
and reciprocal rank. These metrics measure agreement with the synthetic rubric,
not independent expert judgment. Reference shortlist hits are also not proof of
real-world recommendation effectiveness. See `nutrition_ai/MODEL_REPORT.md`.

## Reviewer Labels

`nutrition_ai/expert_validation/recommendation_review_queue_v2_2.csv` contains 172
unrated candidate recommendations with profile context, recipe macros, and
ingredient portions. A real reviewer supplies `rating` (1-5), `reviewer`,
`reviewed_at` (ISO date), and notes. Blank rows are ignored, not auto-labeled.
Import rejects malformed rows, unknown meals, conflicting contexts, and positive
ratings that violate allergy/dislike exclusions. Ratings 4-5 are positive, 1-2
negative, and 3 omitted; reviewed pairs receive 4x training weight.

Train with a completed worksheet:

```powershell
.\.venv-models\Scripts\python.exe ml\nutrition_ai\train_model.py --review-file ml\nutrition_ai\expert_validation\recommendation_review_queue_v2_2.csv
```

To create a new worksheet, pass `--export-review-queue` with a new CSV path;
existing files are never overwritten. Training defaults to
`nutrition_ai/expert_validation/recommendation_reviews.csv` when it exists.
Reviewer labels do not change database approval status. No human ratings are
currently available, and a reviewer name alone does not verify credentials.
See `nutrition_ai/REVIEW_GUIDE.md` for research sources and the review checklist.
The worksheet includes weight bases and deduplicated recipe candidates.

## File Ownership

- `random_forest.py`: shared training, JSON export, and inference helpers.
- `requirements-training.txt`: dependencies for training both forests.
- `nutrition_ai/raw_data/`: USDA source archive needed for preprocessing.
- `nutrition_ai/processed_data/`: active USDA meal data for training and inference.
- `nutrition_ai/expert_validation/`: current worksheet and human-review records.
- `nutrition_ai/nutricore_random_forest.json`: active learned meal model.
- `nutrition_ai/MODEL_REPORT.md`: generated evaluation report.
- `nutrition_ai/REVIEW_GUIDE.md`: sourced review criteria and limitations.
- `workout_ai/datasets/`: active exercise catalog and original RepDB source data.
- `workout_ai/traincore_trained_model.json`: active learned workout model.
- `exercise_ai/models/`: pretrained MediaPipe model required for video analysis.
- `exercise_ai/vendor/`: installed Python dependencies used by video inference;
  do not remove these as if they were unused source files.

The obsolete standalone meal JSON, unused nutrition workbook, and superseded
blank worksheet were removed. `__pycache__` and `.matplotlib-cache` are disposable
generated files; Python and MediaPipe may recreate them during normal use.

PredictionAI fits `weight = intercept + slope * days`. With at least four records
and two distinct training dates, the latest 25% of observations are held out and
predicted from an earlier-only fit. The final forecast uses all observations.
With insufficient validation data, validation MAE is null. The legacy
`training_accuracy` field contains R-squared as a percentage; the new
`training_accuracy_metric` identifies it. `r_squared` and `training_mae_kg` are
also returned. Predictions extrapolate the recorded trend.

## Artifacts And Compatibility

- `workout_ai/traincore_trained_model.json`: learned trees, feature schema,
  baseline metrics, held-out metrics, and profile-matrix checks.
- `nutrition_ai/nutricore_random_forest.json`: learned nutrition trees and metrics.
- `../src/ai/trainedNutritionModel.json`: compatible metadata and scoring weights,
  without embedding forest trees in the mobile JavaScript bundle.

Inference traverses every learned tree and averages leaf scores or suitable-class
probabilities. Training checks exported predictions against scikit-learn on up
to 100 held-out examples. Nutrition also checks a dataset fingerprint and feature
schema. Missing or incompatible artifacts require retraining. Ranking scores are
not calibrated probabilities of a health outcome.

API routes, inputs, and existing response fields remain available. Model version
and type values identify the new algorithms. Frontend screens and navigation need
no changes. Existing stored plans remain stored; new generations use the new
models. The legacy frontend-only weighted nutrition helper remains intact.
NutriCore 2.2 names include the actual ingredients, and instructions identify
raw/dry, cooked, drained, or as-sold gram quantities. No cooked/raw conversion is
invented. Swap suggestions and replacement alternatives suppress identical
recipes only after allergy and approval filtering. Catalog IDs remain unchanged.

## Presentation Explanation

"We preprocess user and item features, train many decision trees on different
samples, and average their predictions to rank suitable exercises or meals.
We check unfamiliar profile scenarios and compare with a single-tree baseline.
Mandatory filters exclude unsupported options before recommendation. Weight
prediction fits a straight line through recorded weights. MediaPipe locates body
joints; our movement rules analyze exercise form."
