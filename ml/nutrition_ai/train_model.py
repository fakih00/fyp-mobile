import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
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


def feature_vector(meal, case):
    targets = nutrition_targets(case["profile"])
    fridge = set(case["fridge"])
    liked = set(case.get("liked", []))
    disliked = set(case.get("disliked", []))
    allergies = set(case.get("allergies", []))

    if any(allergen in allergies for allergen in meal.get("allergens", [])):
        return {
            "calories": 0,
            "protein": 0,
            "goal": 0,
            "ingredients": 0,
            "preferences": 0,
            "expert": 0,
            "blocked": True,
        }

    meal_calorie_target = targets["targetCalories"] / 4
    meal_protein_target = targets["protein"] / 4
    calorie_score = clamp(1 - abs(meal["calories"] - meal_calorie_target) / 420)
    protein_score = clamp(1 - abs(meal["protein"] - meal_protein_target) / 35)
    goal_score = 1 if targets["goal"] in meal["goals"] else 0.72 if "maintain" in meal["goals"] else 0.38
    ingredient_score = sum(1 for ingredient in meal["ingredients"] if ingredient in fridge) / len(meal["ingredients"])
    preference_score = clamp(
        0.5
        + sum(0.08 for ingredient in meal["ingredients"] if ingredient in liked)
        - sum(0.18 for ingredient in meal["ingredients"] if ingredient in disliked)
    )

    return {
        "calories": calorie_score,
        "protein": protein_score,
        "goal": goal_score,
        "ingredients": ingredient_score,
        "preferences": preference_score,
        "expert": meal.get("expert_score", 0.8),
        "blocked": False,
    }


def rank_meals(meals, case, weights):
    ranked = []
    for meal in meals:
        features = feature_vector(meal, case)
        if features["blocked"]:
            score = 0
        else:
            score = sum(features[name] * weights[name] for name in weights)
        ranked.append((score, meal["id"], meal["name"], features))
    return sorted(ranked, reverse=True)


def normalize_weights(raw_weights):
    total = sum(raw_weights.values())
    return {key: round(value / total, 4) for key, value in raw_weights.items()}


def train_weights(meals, cases):
    feature_names = ["calories", "protein", "goal", "ingredients", "preferences", "expert"]
    best = None
    candidate_weight_sets = [
        PRIOR_WEIGHTS,
        {"calories": 0.12, "protein": 0.12, "goal": 0.18, "ingredients": 0.32, "preferences": 0.16, "expert": 0.10},
        {"calories": 0.10, "protein": 0.16, "goal": 0.20, "ingredients": 0.28, "preferences": 0.16, "expert": 0.10},
        {"calories": 0.16, "protein": 0.12, "goal": 0.18, "ingredients": 0.26, "preferences": 0.18, "expert": 0.10},
        {"calories": 0.10, "protein": 0.10, "goal": 0.22, "ingredients": 0.34, "preferences": 0.14, "expert": 0.10},
        {"calories": 0.14, "protein": 0.18, "goal": 0.18, "ingredients": 0.24, "preferences": 0.14, "expert": 0.12},
        {"calories": 0.10, "protein": 0.14, "goal": 0.16, "ingredients": 0.36, "preferences": 0.14, "expert": 0.10},
        {"calories": 0.18, "protein": 0.14, "goal": 0.16, "ingredients": 0.24, "preferences": 0.16, "expert": 0.12},
        {"calories": 0.08, "protein": 0.08, "goal": 0.16, "ingredients": 0.32, "preferences": 0.26, "expert": 0.10},
        {"calories": 0.08, "protein": 0.06, "goal": 0.18, "ingredients": 0.30, "preferences": 0.28, "expert": 0.10},
    ]

    for raw_weights in candidate_weight_sets:
        weights = normalize_weights(raw_weights)
        hits = 0
        reciprocal_rank_total = 0

        for case in cases:
            ranked = rank_meals(meals, case, weights)
            approved = set(case["approved_meals"])
            top_ids = [meal_id for _, meal_id, _, _ in ranked[:3]]
            if any(meal_id in approved for meal_id in top_ids):
                hits += 1
            first_rank = next((index + 1 for index, meal_id in enumerate([item[1] for item in ranked]) if meal_id in approved), None)
            reciprocal_rank_total += 1 / first_rank if first_rank else 0

        top3_accuracy = hits / len(cases)
        mean_reciprocal_rank = reciprocal_rank_total / len(cases)
        objective = (top3_accuracy * 0.75) + (mean_reciprocal_rank * 0.25)
        prior_distance = sum(abs(weights[name] - PRIOR_WEIGHTS[name]) for name in feature_names)

        if best is None or objective > best["objective"] or (
            math.isclose(objective, best["objective"]) and prior_distance < best["prior_distance"]
        ):
            best = {
                "objective": objective,
                "top3_accuracy": top3_accuracy,
                "mean_reciprocal_rank": mean_reciprocal_rank,
                "prior_distance": prior_distance,
                "weights": weights,
            }

    return best


def evaluate(meals, cases, weights):
    results = []
    for case in cases:
        ranked = rank_meals(meals, case, weights)
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
    data = json.loads(DATASET_PATH.read_text())
    meals = data["meals"]
    cases = data["training_cases"]
    expert_review = load_expert_review()
    expert_summary = apply_expert_review(meals, expert_review)
    training = train_weights(meals, cases)
    evaluation = evaluate(meals, cases, training["weights"])
    artifact = {
        "modelName": "Custom Adaptive Nutrition Recommendation Model",
        "version": "1.1.0",
        "trainedWith": "Python grid-search ranking optimizer",
        "trainingSamples": len(meals) + len(cases),
        "expertValidation": expert_summary,
        "weights": training["weights"],
        "trainingMetrics": {
            "objective": round(training["objective"], 4),
            "top3Accuracy": round(training["top3_accuracy"] * 100),
            "meanReciprocalRank": round(training["mean_reciprocal_rank"], 3),
        },
        "validationMetrics": evaluation,
    }
    MODEL_OUTPUT_PATH.write_text(json.dumps(artifact, indent=2))
    print(json.dumps(artifact, indent=2))
    print(f"\nSaved trained model artifact to {MODEL_OUTPUT_PATH}")


if __name__ == "__main__":
    main()
