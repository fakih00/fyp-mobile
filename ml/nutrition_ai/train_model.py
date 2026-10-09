import argparse
from collections import Counter
import hashlib
import json
import math
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml"))
from random_forest import predict_forest, train_forest
from nutrition_ai.nutricore_model import score_meal, forest_features_from_scores, macro_ratios, normalize_goal, MEAL_STRUCTURES, portion_meal, dataset_fingerprint, recipe_signature
from nutrition_ai.review_labels import REVIEW_PATH, load_recommendation_reviews, export_review_queue
from nutrition_ai.training_report import write_training_report
DATASET_PATH = Path(__file__).with_name("processed_data") / "usda_meal_training_dataset.json"
MODEL_OUTPUT_PATH = ROOT / "src" / "ai" / "trainedNutritionModel.json"
EXPERT_REVIEW_PATH = Path(__file__).with_name("expert_validation") / "jason_mattar_review.json"

ACTIVITY_FACTORS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "athlete": 1.9,
}

GOAL_CALORIE_DELTA = {
    "weight_loss": -400,
    "maintain": 0,
    "muscle_gain": 250,
    "weight_gain": 450,
}

PRIOR_WEIGHTS = {
    "calories": 0.22,
    "protein": 0.18,
    "goal": 0.17,
    "ingredients": 0.22,
    "preferences": 0.11,
    "expert": 0.10,
}

GOALS = ["weight_loss", "maintain", "muscle_gain", "weight_gain", "endurance", "performance"]
MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"]
FEATURE_NAMES = [
    "calories",
    "protein",
    "goal",
    "ingredients",
    "preferences",
    "expert",
    "carbs",
    "fats",
    "is_breakfast",
    "is_lunch",
    "is_dinner",
    "is_snack",
    "goal_weight_loss",
    "goal_maintain",
    "goal_muscle_gain",
    "goal_weight_gain",
    "goal_endurance",
    "goal_performance",
]


def clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def nutrition_targets(profile):
    gender_constant = -161 if profile.get("gender") == "female" else 5
    weight = float(profile.get("weight", 75))
    height = float(profile.get("height", 175))
    age = float(profile.get("age", 22))
    goal = profile.get("goal", "maintain")
    activity = profile.get("activity_level", "moderate")
    bmr = round((10 * weight) + (6.25 * height) - (5 * age) + gender_constant)
    tdee = round(bmr * ACTIVITY_FACTORS.get(activity, ACTIVITY_FACTORS["moderate"]))
    target_calories = max(1200, tdee + GOAL_CALORIE_DELTA.get(goal, 0))
    protein_factor = 2.0 if goal == "muscle_gain" else 1.8 if goal == "weight_loss" else 1.6
    protein = round(weight * protein_factor)
    return {
        "bmr": bmr,
        "tdee": tdee,
        "targetCalories": target_calories,
        "protein": protein,
        "goal": goal,
    }


def case_context(case):
    return {
        "goal": normalize_goal(case["profile"]["goal"]),
        "fridge": case.get("fridge", []), "likes": case.get("liked", []),
        "dislikes": case.get("disliked", []), "allergies": case.get("allergies", []),
        "weights": PRIOR_WEIGHTS,
    }


def slot_targets(case, meal_type):
    daily = nutrition_targets(case["profile"])["targetCalories"]
    structure = MEAL_STRUCTURES.get(case["profile"].get("meals_per_day", 4), MEAL_STRUCTURES[4])
    ratios = [ratio for slot, ratio in structure if slot == meal_type]
    ratio = (sum(ratios) / len(ratios)) if ratios else 0.25
    if case.get("mode") == "swap":
        ratio = 0.25
    calories = daily * ratio
    protein, carbs, fats, _ = macro_ratios(case["profile"])
    return {"calories": calories, "protein": calories * protein / 4,
            "carbs": calories * carbs / 4, "fats": calories * fats / 9}


def feature_vector(meal, case):
    result = score_meal(meal, case_context(case), meal["type"], slot_targets(case, meal["type"]), use_model=False)
    if result is None:
        return {**dict.fromkeys(list(PRIOR_WEIGHTS) + ["carbs", "fats"], 0.0), "blocked": True}
    return {**result["features"], "blocked": False}


def meal_features(meal, case):
    features = feature_vector(meal, case)
    return forest_features_from_scores(features, normalize_goal(case["profile"]["goal"]), meal["type"])


LABEL_WEIGHTS = {"calories": 0.14, "protein": 0.18, "goal": 0.14, "ingredients": 0.28,
                 "preferences": 0.10, "expert": 0.06, "carbs": 0.06, "fats": 0.04}


def score_rubric(features):
    return sum(features[key] * weight for key, weight in LABEL_WEIGHTS.items())


def validate_dataset(meals):
    ids = set()
    for meal in meals:
        if not meal.get("id") or meal["id"] in ids:
            raise ValueError("Meal IDs must be present and unique")
        ids.add(meal["id"])
        if meal.get("type") not in MEAL_TYPES or not meal.get("ingredients"):
            raise ValueError(f"Invalid meal schema: {meal['id']}")
        for key in ["calories", "protein", "carbs", "fats"]:
            value = float(meal[key])
            if not math.isfinite(value) or value < 0 or (key == "calories" and value == 0):
                raise ValueError(f"Invalid meal nutrition: {meal['id']}/{key}")
    return {"meals": len(meals), "unique_ids": len(ids), "complete_nutrition": True,
            "meal_type_counts": {slot: sum(meal["type"] == slot for meal in meals) for slot in MEAL_TYPES}}


def scenario_group(case):
    context = {key: value for key, value in case.items() if key not in {"approved_meals", "mode"}}
    return hashlib.sha256(json.dumps(context, sort_keys=True).encode()).hexdigest()[:16]


def build_training_cases(meals):
    rng = random.Random(42)
    ingredients = sorted({ingredient for meal in meals for ingredient in meal["ingredients"]})
    cases = []
    for index in range(600):
        anchor = meals[index % len(meals)]
        fridge = list(anchor["ingredients"]) if index % 2 == 0 else rng.sample(ingredients, min(len(ingredients), rng.randint(0, 12)))
        cases.append({
            "profile": {"goal": GOALS[index % len(GOALS)], "gender": rng.choice(["male", "female"]),
                        "weight": rng.randint(50, 105), "height": rng.randint(150, 195),
                        "age": rng.randint(18, 65), "activity_level": rng.choice(list(ACTIVITY_FACTORS)),
                        "meals_per_day": rng.choice([3, 4, 5, 6])},
            "fridge": fridge, "mode": "swap" if index % 3 == 0 else "plan",
            "liked": list(anchor["ingredients"][:2]) if index % 2 == 0 else rng.sample(ingredients, min(2, len(ingredients))),
            "disliked": rng.sample(ingredients, min(1, len(ingredients))) if index % 4 == 0 else [],
            "allergies": [rng.choice(["dairy", "nuts", "eggs", "gluten", "fish"])] if index % 3 == 0 else [],
        })
    return cases


def relevance_labels(scores):
    if not scores:
        return []
    cutoff = max(0.55, sorted(scores, reverse=True)[max(1, math.ceil(len(scores) / 3)) - 1])
    return [int(score >= cutoff - 1e-12) for score in scores]


def train_random_forest(meals, review_path=REVIEW_PATH):
    features, labels, groups, weights = [], [], [], []
    cases = build_training_cases(meals)
    synthetic_pairs = 0
    recipe_counts = Counter((meal["type"], recipe_signature(meal)) for meal in meals)
    for case in cases:
        for meal_type in MEAL_TYPES:
            candidates = [(meal, feature_vector(meal, case)) for meal in meals if meal["type"] == meal_type]
            candidates = [(meal, scores) for meal, scores in candidates if not scores["blocked"]]
            candidates.sort(key=lambda item: (-score_rubric(item[1]), item[0]["id"]))
            candidate_labels = relevance_labels([score_rubric(scores) for _, scores in candidates])
            for (meal, scores), label in zip(candidates, candidate_labels):
                features.append(forest_features_from_scores(scores, normalize_goal(case["profile"]["goal"]), meal_type))
                labels.append(label)
                groups.append(scenario_group(case))
                weights.append(1.0 / recipe_counts[(meal["type"], recipe_signature(meal))])
                synthetic_pairs += 1
    reviews = load_recommendation_reviews(review_path, {meal["id"] for meal in meals})
    lookup = {meal["id"]: meal for meal in meals}
    reviewed_pairs = 0
    for scenario in reviews:
        case = scenario["context"]
        for review in scenario["ratings"]:
            if review["rating"] == 3:
                continue
            meal = lookup[review["meal_id"]]
            scores = feature_vector(meal, case)
            if scores["blocked"]:
                if review["rating"] >= 4:
                    raise ValueError("A positive reviewer label conflicts with allergy/dislike exclusions")
                continue
            features.append(forest_features_from_scores(scores, normalize_goal(case["profile"]["goal"]), meal["type"]))
            labels.append(int(review["rating"] >= 4))
            groups.append(scenario_group(case))
            weights.append(4.0)
            reviewed_pairs += 1
    model = train_forest(features, labels, groups, FEATURE_NAMES, "classification",
                         professional=True, sample_weights=weights)
    model.update(
        label_source="rule-derived relative meal-slot relevance plus explicit reviewer CSV ratings when available",
        label_rule="top-third rubric cutoff per scenario/meal slot, including ties, with rubric >= 0.55; duplicate recipe aliases share training weight; human ratings 4-5 positive, 1-2 negative, 3 omitted",
        label_weights=LABEL_WEIGHTS,
        label_provenance={"synthetic_pairs": synthetic_pairs, "reviewer_entered_pairs": reviewed_pairs,
                          "reviewer_scenarios": len(reviews), "review_file": str(review_path.relative_to(ROOT)) if review_path.is_relative_to(ROOT) else str(review_path),
                          "human_labels_available": reviewed_pairs > 0,
                          "independent_expert_validation_available": False},
        input="portion-aware macro fit, user goal, fridge, preferences and meal type",
        output="relative suitability score (uncalibrated; not clinical confidence)",
        preprocessing="shared runtime feature extraction, complete USDA nutrients, bounded portions, one-hot encoding",
        dataset_audit=validate_dataset(meals),
        dataset_fingerprint=dataset_fingerprint(meals),
    )
    heldout_groups = set(model["model_selection"]["test_groups"])
    heldout_cases = [case for case in cases if scenario_group(case) in heldout_groups]
    model["heldOutRanking"] = evaluate_ranking(meals, heldout_cases, model)
    return model


def evaluate_ranking(meals, cases, model):
    import numpy as np
    from sklearn.metrics import ndcg_score
    hits, precision, ndcg, reciprocal, slots = [], [], [], [], 0
    for case in cases:
        for meal_type in MEAL_TYPES:
            candidates = [(meal, feature_vector(meal, case)) for meal in meals if meal["type"] == meal_type]
            candidates = [(meal, scores) for meal, scores in candidates if not scores["blocked"]]
            if len(candidates) < 2:
                continue
            relevance = [score_rubric(scores) for _, scores in candidates]
            predictions = [predict_forest(model, forest_features_from_scores(scores, normalize_goal(case["profile"]["goal"]), meal_type)) for _, scores in candidates]
            positives = {index for index, label in enumerate(relevance_labels(relevance)) if label}
            if not positives:
                continue
            order = sorted(range(len(candidates)), key=lambda index: (-predictions[index], candidates[index][0]["id"]))
            top = order[:3]
            slots += 1
            hits.append(bool(positives.intersection(top)))
            precision.append(len(positives.intersection(top)) / len(top))
            ndcg.append(float(ndcg_score(np.asarray([[int(index in positives) for index in range(len(candidates))]]), np.asarray([predictions]), k=3)))
            reciprocal.append(next((1 / (rank + 1) for rank, index in enumerate(order) if index in positives), 0))
    return {"scenario_count": len(cases), "eligible_slots": slots,
            "hitRateAt3": round(sum(hits) / max(slots, 1) * 100, 2),
            "precisionAt3": round(sum(precision) / max(slots, 1), 5),
            "ndcgAt3": round(sum(ndcg) / max(slots, 1), 5),
            "meanReciprocalRank": round(sum(reciprocal) / max(slots, 1), 5),
            "label_scope": "rule-derived relevance; separate from human reviewer validation"}


def rank_meals_forest(meals, case, model):
    ranked = []
    for meal in meals:
        features = feature_vector(meal, case)
        if features["blocked"]:
            continue
        score = predict_forest(model, meal_features(meal, case))
        ranked.append((score, meal["id"], meal["name"], features))
    return sorted(ranked, reverse=True)


def evaluate_forest(meals, cases, forest_model):
    results = []
    for case in cases:
        ranked = rank_meals_forest(meals, case, forest_model)
        approved = set(case["approved_meals"])
        top_score, top_id, top_name, top_features = ranked[0]
        top3 = [meal_id for _, meal_id, _, _ in ranked[:3]]
        results.append({
            "topMeal": top_name,
            "topMealApproved": top_id in approved,
            "top3Hit": any(meal_id in approved for meal_id in top3),
            "allergySafe": not top_features["blocked"],
            "ingredientScore": round(top_features["ingredients"], 3),
            "matchPercent": round(top_score * 100),
        })

    return {
        "goalRecommendationAccuracy": round(sum(item["top3Hit"] for item in results) / len(results) * 100),
        "topMealApprovalAccuracy": round(sum(item["topMealApproved"] for item in results) / len(results) * 100),
        "allergyFilteringAccuracy": round(sum(item["allergySafe"] for item in results) / len(results) * 100),
        "averageIngredientMatch": round(sum(item["ingredientScore"] for item in results) / len(results) * 100),
        "averageTopMatch": round(sum(item["matchPercent"] for item in results) / len(results)),
        "cases": results,
    }

def load_expert_review():
    if not EXPERT_REVIEW_PATH.exists():
        return {"reviewer": None, "reviews": []}
    return json.loads(EXPERT_REVIEW_PATH.read_text())


def apply_expert_review(meals, expert_review):
    reviews = {
        item["meal_id"]: item
        for item in expert_review.get("reviews", [])
        if item.get("meal_id") and item.get("rating") is not None
    }
    reviewed_count = 0
    approved_count = 0

    for meal in meals:
        review = reviews.get(meal["id"])
        if not review:
            meal["expert_score_source"] = "model_prior_pending_expert_review"
            continue
        rating = max(1, min(5, int(review["rating"])))
        meal["expert_score"] = round(rating / 5, 2)
        meal["expert_score_source"] = "jason_mattar_review"
        meal["expert_review"] = {
            "reviewer": expert_review.get("reviewer", {}).get("name", "Jason Mattar"),
            "rating": rating,
            "approved": bool(review.get("approved", rating >= 4)),
            "notes": review.get("notes", ""),
        }
        reviewed_count += 1
        if meal["expert_review"]["approved"]:
            approved_count += 1

    return {
        "reviewer": expert_review.get("reviewer"),
        "reviewedMeals": reviewed_count,
        "approvedMeals": approved_count,
        "pendingMeals": len(meals) - reviewed_count,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--review-file", type=Path, default=REVIEW_PATH)
    parser.add_argument("--export-review-queue", type=Path)
    args = parser.parse_args()
    data = json.loads(DATASET_PATH.read_text())
    meals = data["meals"]
    cases = data["training_cases"]
    validate_dataset(meals)
    if args.export_review_queue:
        selected_cases = [{**case, "mode": "swap"} for case in cases] + build_training_cases(meals)[:8]
        print(json.dumps(export_review_queue(args.export_review_queue, meals, selected_cases, feature_vector, score_rubric,
                                            lambda meal, case: portion_meal(meal, slot_targets(case, meal["type"])["calories"]),
                                            recipe_signature)))
        return
    expert_review = load_expert_review()
    expert_summary = apply_expert_review(meals, expert_review)
    forest = train_random_forest(meals, args.review_file)
    evaluation = evaluate_forest(meals, [{**case, "mode": "swap"} for case in cases], forest)
    artifact = {
        "modelName": "NutriCore AI",
        "version": "2.2.0",
        "trainedWith": "scikit-learn Random Forest classifier with rule-derived suitability labels",
        "trainingSamples": forest["training_samples"],
        "validationSamples": forest["validation_samples"],
        "expertValidation": expert_summary,
        "weights": PRIOR_WEIGHTS,
        "random_forest": {key: value for key, value in forest.items() if key != "trees"},
        "forestArtifact": "ml/nutrition_ai/nutricore_random_forest.json",
        "trainingMetrics": forest["trainingMetrics"],
        "validationMetrics": {**evaluation, "heldOutClassification": forest["validationMetrics"],
                              "heldOutRanking": forest["heldOutRanking"],
                              "labelProvenance": forest["label_provenance"],
                              "evaluationScope": "four unchanged project reference shortlists using swap targets; no clinical validation"},
    }
    forest_path = Path(__file__).with_name("nutricore_random_forest.json")
    forest_path.write_text(json.dumps(forest, separators=(",", ":")), encoding="utf-8")
    MODEL_OUTPUT_PATH.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    write_training_report(Path(__file__).with_name("MODEL_REPORT.md"), forest, evaluation)
    print(json.dumps({"success": True, "artifact": str(MODEL_OUTPUT_PATH),
                      "trainingMetrics": artifact["trainingMetrics"],
                      "validationMetrics": artifact["validationMetrics"]}))


if __name__ == "__main__":
    main()
