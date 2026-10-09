# NutriCore Model Report

The model ranks eligible meal options with a Random Forest classifier. Scores are relative suitability scores, not calibrated health probabilities.

## Data And Labels

- Meals: 72 with complete nutrient records.
- Rule-derived user/meal examples: 39481.
- Reviewer-entered training examples: 0.
- Fitting/development/test scenarios: 360/120/120.
- Test scenarios are excluded from parameter and threshold selection.
- Labels use the top-third rubric cutoff per meal slot, include score ties, and require a rubric score of at least 0.55. Duplicate recipe aliases share training weight.
- Reviewer ratings, when supplied, receive 4x training weight. Ratings 4-5 are positive, 1-2 negative, and 3 omitted.
- No generated rating is presented as a human or expert review.

## Unseen Scenario Results

| Measure | Random Forest | Decision Tree Baseline |
| --- | ---: | ---: |
| Average precision | 0.9037 | 0.79884 |
| Balanced accuracy (%) | 85.62 | 81.9 |
| F1 | 0.81382 | 0.76135 |
| Brier score (lower is better) | 0.09857 | 0.12346 |

Top-three hit rate: 98.84% across 431 eligible test slots.
Precision@3: 0.73434; binary-relevance NDCG@3: 0.94901.
These results measure agreement with rule-derived labels, not independent expert or clinical validation.

## Project Reference Checks

The unchanged four project shortlists have a top-three hit rate of 75% and a first-choice hit rate of 75%.
The shortlists are sparse and not treated as exhaustive negative labels. They are not used to choose the model's parameters.

## Explanation

"Each tree asks simple questions about nutritional fit, available ingredients, preferences, and goals. We average their outputs, apply mandatory filters, and choose the highest-ranked options."

Global feature importance describes the trained model as a whole; it is not a causal explanation of one recommendation.

| Feature | Importance |
| --- | ---: |
| ingredients | 0.2260 |
| protein | 0.2177 |
| goal | 0.1714 |
| carbs | 0.1403 |
| fats | 0.0739 |
| preferences | 0.0499 |
| calories | 0.0308 |
| is_lunch | 0.0187 |

## Serving And Integration

Portions are scaled to the calorie target within 0.5x-2x the source portion. Displayed macros are the scaled recipe macros, not copied target values. Ingredient grams retain the USDA preparation-state basis.
Instructions state raw, dry, cooked, drained, or as-sold weight bases. Raw rice grams must not be interpreted as cooked rice grams; no unsupported conversion factor is applied.
Names identify the actual recipe ingredients. Identical recipes are deduplicated in swap suggestions and replacement alternatives; variety penalties recognize aliases. Dataset IDs remain unchanged to preserve existing approval records.
API routes and required response fields are preserved. Existing stored plans are not rewritten. Frontend screens require no modifications.
The model checks its feature schema and dataset fingerprint before serving. Exported predictions were compared with scikit-learn.

## Human Review

The generated reviewer worksheet contains unrated candidates. A reviewer supplies the rating, reviewer name, ISO review date, and notes. Import rejects malformed ratings and unknown meal IDs. Labels do not automatically approve meals for display.
Actual reviewer labels are still needed for independent assessment and further refinement.

## Limits And Research

The recipe expert_score field is a legacy rule prior, not a human rating. Research-based criteria do not become independent expert labels.
The current model does not establish fibre, sodium, saturated fat, micronutrient adequacy, or whole-day dietary quality from macro totals. Ingredient filters cannot establish absence of allergen cross-contact. See REVIEW_GUIDE.md for primary sources and reviewer checks.
