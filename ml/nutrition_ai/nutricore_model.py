import argparse
import base64
import json
import hashlib
import math
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml"))
from random_forest import predict_forest
MODULE_DIR = Path(__file__).resolve().parent
DATASET_PATH = MODULE_DIR / "processed_data" / "usda_meal_training_dataset.json"
MODEL_PATH = ROOT / "src" / "ai" / "trainedNutritionModel.json"
FOREST_ARTIFACT_PATH = MODULE_DIR / "nutricore_random_forest.json"
PREPROCESS_SCRIPT = MODULE_DIR / "preprocess_usda_dataset.py"
TRAIN_SCRIPT = MODULE_DIR / "train_model.py"

MODEL_NAME = "NutriCore AI"
MODEL_VERSION = "2.2.0"
FOREST_MODEL_CACHE = None
REQUIRE_EXPERT_APPROVAL = True

GOALS = ["weight_loss", "maintain", "muscle_gain", "weight_gain", "endurance", "performance"]
MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"]
FEATURE_NAMES = ["calories", "protein", "goal", "ingredients", "preferences", "expert", "carbs", "fats"] + [
    "is_breakfast", "is_lunch", "is_dinner", "is_snack"
] + [f"goal_{goal}" for goal in GOALS]


def dataset_fingerprint(meals):
    fields = ["id", "name", "type", "calories", "protein", "carbs", "fats", "ingredients", "ingredientSources", "allergens", "goals"]
    records = [{key: meal.get(key) for key in fields} for meal in meals]
    return hashlib.sha256(json.dumps(records, sort_keys=True).encode()).hexdigest()

def recipe_signature(meal):
    if meal.get("recipe_signature"):
        return meal["recipe_signature"]
    sources = sorted((item.get("ingredient"), item.get("fdcId"), item.get("servingGrams"))
                     for item in meal.get("ingredientSources", []))
    recipe = sources or sorted(meal.get("ingredients", []))
    return hashlib.sha256(json.dumps(recipe).encode()).hexdigest()


def distinct_ranked_recipes(ranked, meal_for):
    result, seen = [], set()
    for item in ranked:
        signature = recipe_signature(meal_for(item))
        if signature not in seen:
            result.append(item)
            seen.add(signature)
    return result


DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MEAL_STRUCTURES = {
    3: [("Breakfast", 0.30), ("Lunch", 0.35), ("Dinner", 0.35)],
    4: [("Breakfast", 0.25), ("Lunch", 0.30), ("Dinner", 0.30), ("Snack", 0.15)],
    5: [("Breakfast", 0.20), ("Snack", 0.10), ("Lunch", 0.25), ("Snack", 0.15), ("Dinner", 0.30)],
    6: [("Breakfast", 0.15), ("Snack", 0.10), ("Lunch", 0.20), ("Snack", 0.10), ("Dinner", 0.25), ("Snack", 0.20)],
}

DEFAULT_WEIGHTS = {
    "calories": 0.14,
    "protein": 0.16,
    "goal": 0.20,
    "ingredients": 0.24,
    "preferences": 0.16,
    "expert": 0.10,
}

GOAL_ALIASES = {
    "lose_weight": "weight_loss",
    "weight_loss": "weight_loss",
    "fat_loss": "weight_loss",
    "gain_muscle": "muscle_gain",
    "muscle_gain": "muscle_gain",
    "gain_weight": "weight_gain",
    "weight_gain": "weight_gain",
    "maintain": "maintain",
    "running": "endurance",
    "cycling": "endurance",
    "swimming": "endurance",
    "boxing": "performance",
    "martial_arts": "performance",
    "yoga_flexibility": "maintain",
}

IMAGE_BY_MEAL_TYPE = {
    "Breakfast": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80",
    "Lunch": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
    "Dinner": "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?auto=format&fit=crop&w=900&q=80",
    "Snack": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
    "Meal": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=70",
}

IMAGE_BY_MEAL_THEME = {
    "chicken_bowl": "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=900&q=80",
    "beef_plate": "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=80",
    "salad": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
    "eggs": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80",
    "yogurt_oats": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
    "fish_plate": "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?auto=format&fit=crop&w=900&q=80",
    "wrap": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=80",
    "pasta": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80",
    "smoothie": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=900&q=80",
    "beans_rice": "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80",
}


def clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def clean_term(value):
    return str(value or "").strip().lower().replace("_", " ").replace("-", " ")


def image_for_meal(meal, fallback_type=None):
    existing = meal.get("image")
    if existing:
        return existing

    ingredients = meal.get("ingredients") or []
    if not isinstance(ingredients, list):
        ingredients = [ingredients]
    ingredient_set = {clean_term(item).replace(" ", "_") for item in ingredients}
    terms = " ".join([
        clean_term(meal.get("id")),
        clean_term(meal.get("name")),
        clean_term(meal.get("type") or meal.get("meal") or fallback_type),
        " ".join(clean_term(item) for item in ingredients),
    ])

    if {"milk", "banana", "peanut_butter"} <= ingredient_set or "smoothie" in terms:
        return IMAGE_BY_MEAL_THEME["smoothie"]
    if "wrap" in terms or "sandwich" in terms or {"bread", "lettuce", "tomato"} <= ingredient_set:
        return IMAGE_BY_MEAL_THEME["wrap"]
    if "pasta" in terms:
        return IMAGE_BY_MEAL_THEME["pasta"]
    if "omelette" in terms or "egg" in terms or "eggs" in ingredient_set:
        return IMAGE_BY_MEAL_THEME["eggs"]
    if "yogurt" in terms or "oat" in terms or {"greek_yogurt", "berries"} & ingredient_set:
        return IMAGE_BY_MEAL_THEME["yogurt_oats"]
    if {"salmon", "tuna", "pollock", "fish"} & ingredient_set:
        return IMAGE_BY_MEAL_THEME["fish_plate"]
    if "beef" in ingredient_set or "steak" in terms:
        return IMAGE_BY_MEAL_THEME["beef_plate"]
    if "beans" in ingredient_set or "lentil" in terms:
        return IMAGE_BY_MEAL_THEME["beans_rice"]
    if {"lettuce", "spinach"} & ingredient_set and not ({"rice", "potato"} & ingredient_set):
        return IMAGE_BY_MEAL_THEME["salad"]
    if "chicken" in ingredient_set or "turkey" in ingredient_set or "rice" in ingredient_set:
        return IMAGE_BY_MEAL_THEME["chicken_bowl"]
    return IMAGE_BY_MEAL_TYPE.get(fallback_type or meal.get("type") or meal.get("meal"), IMAGE_BY_MEAL_TYPE["Meal"])


def parse_csv(value):
    if isinstance(value, list):
        return [clean_term(item) for item in value if clean_term(item)]
    return [clean_term(item) for item in str(value or "").split(",") if clean_term(item)]


def ingredient_terms(items):
    terms = set()
    for item in items:
        clean = clean_term(item)
        if not clean:
            continue
        terms.add(clean)
        for part in clean.split():
            if len(part) > 3:
                terms.add(part)
    return terms


def normalize_goal(goal):
    return GOAL_ALIASES.get(clean_term(goal).replace(" ", "_"), "maintain")


def load_json(path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def load_dataset():
    data = load_json(DATASET_PATH, {"meals": []})
    meals = data.get("meals", [])
    if not meals:
        raise RuntimeError(f"Nutrition dataset is empty or missing: {DATASET_PATH}")
    return meals


def load_model():
    artifact = load_json(MODEL_PATH, {})
    weights = artifact.get("weights") or DEFAULT_WEIGHTS
    return {
        "name": MODEL_NAME,
        "version": MODEL_VERSION,
        "weights": {key: float(weights.get(key, DEFAULT_WEIGHTS[key])) for key in DEFAULT_WEIGHTS},
        "training": artifact,
    }


def load_forest_model():
    global FOREST_MODEL_CACHE
    if FOREST_MODEL_CACHE is not None:
        return FOREST_MODEL_CACHE
    model = load_json(FOREST_ARTIFACT_PATH, {})
    if not model.get("trees"):
        raise RuntimeError("NutriCore Random Forest missing; run npm run train:nutrition-ai")
    if model.get("feature_names") != FEATURE_NAMES or model.get("dataset_fingerprint") != dataset_fingerprint(load_dataset()):
        raise RuntimeError("NutriCore dataset or feature schema changed; retrain the Random Forest")
    FOREST_MODEL_CACHE = model
    return model


def forest_features_from_scores(features, goal, meal_type):
    return (
        [float(features[name]) for name in ["calories", "protein", "goal", "ingredients", "preferences", "expert", "carbs", "fats"]]
        + [1.0 if meal_type == item else 0.0 for item in MEAL_TYPES]
        + [1.0 if goal == item else 0.0 for item in GOALS]
    )


def predict_forest_score(features, goal, meal_type):
    model = load_forest_model()
    if not model:
        return None
    forest_features = forest_features_from_scores(features, goal, meal_type)
    if len(forest_features) != int(model.get("feature_count", -1)):
        raise RuntimeError("NutriCore feature schema changed; retrain the Random Forest")
    return predict_forest(model, forest_features)


def macro_ratios(profile):
    goal = clean_term(profile.get("goal"))
    weight = float(profile.get("weight") or 75)
    target_weight = float(profile.get("target_weight") or profile.get("suggested_goal_weight") or weight)
    is_recomp = weight > target_weight and goal == "gain_muscle"

    if is_recomp:
        return 0.40, 0.35, 0.25, True
    if goal in {"running", "cycling", "swimming"}:
        return 0.25, 0.55, 0.20, False
    if goal in {"boxing", "martial_arts"}:
        return 0.40, 0.40, 0.20, False
    if goal == "yoga_flexibility":
        return 0.30, 0.40, 0.30, False
    return 0.30, 0.40, 0.30, False


def distance_score(actual, target, tolerance):
    return clamp(1 - abs(float(actual or 0) - float(target or 0)) / tolerance)


def blocks_meal(meal, allergies, dislikes):
    haystack = " ".join([
        clean_term(meal.get("name")),
        " ".join(clean_term(item) for item in meal.get("ingredients", [])),
        " ".join(clean_term(item) for item in meal.get("allergens", [])),
        " ".join(clean_term(item) for item in meal.get("goals", [])),
    ])
    allergens = {clean_term(item) for item in meal.get("allergens", [])}
    allergy_groups = [
        {"milk", "dairy"}, {"egg", "eggs"}, {"wheat", "gluten"},
        {"peanut", "peanuts"}, {"soy", "soya", "soybean", "soybeans"},
        {"sesame"}, {"fish"}, {"shellfish", "crustacean shellfish"},
        {"tree nut", "tree nuts"},
    ]

    for allergy in allergies:
        term = clean_term(allergy)
        alternatives = next((group for group in allergy_groups if term in group), {term})
        if term == "nuts":
            alternatives = {"peanut", "peanuts", "tree nut", "tree nuts"}
        if term and any(item in allergens or item in haystack for item in alternatives):
            return True
    for dislike in dislikes:
        if dislike and dislike in haystack:
            return True
    return False


def fridge_match(meal, fridge):
    ingredients = meal.get("ingredients", [])
    if not fridge:
        return {"match": None, "used": [], "missing": ingredients[:5], "score": 0.55}

    terms = ingredient_terms(fridge)
    used = []
    missing = []
    for ingredient in ingredients:
        clean = clean_term(ingredient)
        if any(term and (term in clean or clean in term) for term in terms):
            used.append(ingredient)
        else:
            missing.append(ingredient)

    total = max(len(ingredients), 1)
    ratio = len(used) / total
    return {
        "match": round(ratio * 100),
        "used": list(dict.fromkeys(used)),
        "missing": list(dict.fromkeys(missing))[:5],
        "score": ratio,
    }


def preference_score(meal, likes, dislikes):
    haystack = " ".join([
        clean_term(meal.get("name")),
        " ".join(clean_term(item) for item in meal.get("ingredients", [])),
        " ".join(clean_term(item) for item in meal.get("goals", [])),
    ])
    score = 0.50
    for like in likes:
        if like and like in haystack:
            score += 0.12
    for dislike in dislikes:
        if dislike and dislike in haystack:
            score -= 0.22
    return clamp(score)


def portion_meal(meal, target_calories):
    base_calories = float(meal.get("calories") or 0)
    factor = clamp(float(target_calories) / base_calories, 0.5, 2.0) if base_calories > 0 and target_calories > 0 else 1.0
    return {
        **meal,
        "recipe_signature": recipe_signature(meal),
        **{key: round(float(meal.get(key) or 0) * factor) for key in ["calories", "protein", "carbs", "fats"]},
        "portion_factor": round(factor, 4),
        "ingredientSources": [{**item, "servingGrams": round(float(item.get("servingGrams") or 0) * factor)}
                              for item in meal.get("ingredientSources", [])],
    }


def score_meal(meal, context, meal_type, targets, allow_any_type=False, use_model=True):
    allergies = context["allergies"]
    dislikes = context["dislikes"]
    if not allow_any_type and meal.get("type") != meal_type:
        return None
    if blocks_meal(meal, allergies, dislikes):
        return None

    meal = portion_meal(meal, targets["calories"])

    goal = context["goal"]
    meal_goals = {normalize_goal(item) for item in meal.get("goals", [])}
    fridge = fridge_match(meal, context["fridge"])
    features = {
        "calories": distance_score(meal.get("calories"), targets["calories"], 420),
        "protein": distance_score(meal.get("protein"), targets["protein"], 35),
        "goal": 1.0 if goal in meal_goals else 0.72 if "maintain" in meal_goals else 0.42,
        "ingredients": fridge["score"],
        "preferences": preference_score(meal, context["likes"], dislikes),
        "expert": clamp(float(meal.get("expert_score", 0.82))),
        "carbs": distance_score(meal.get("carbs"), targets["carbs"], max(30, targets["carbs"])),
        "fats": distance_score(meal.get("fats"), targets["fats"], max(15, targets["fats"])),
    }
    forest_score = predict_forest_score(features, goal, meal.get("type") or meal_type) if use_model else None
    score = forest_score if forest_score is not None else sum(features[key] * context["weights"][key] for key in context["weights"])
    macro_bonus = (
        distance_score(meal.get("carbs"), targets["carbs"], 55) * 0.05
        + distance_score(meal.get("fats"), targets["fats"], 25) * 0.04
    )
    slot_penalty = 0 if meal.get("type") == meal_type else 0.12
    final_score = clamp(score + macro_bonus - slot_penalty, 0, 1.15)
    match_percent = round(clamp(final_score / 1.15) * 100)
    return {
        "meal": meal,
        "score": final_score,
        "matchPercent": match_percent,
        "features": features,
        "fridge": fridge,
        "forest_score": forest_score,
    }


def meal_slot_type(meal):
    return meal.get("type") or meal.get("meal") or meal.get("slot") or "Meal"


def instructions_for(meal):
    ingredients = meal.get("ingredients", [])
    prep = meal.get("prepMinutes") or meal.get("prep_minutes") or 15
    if not ingredients:
        return "Prepare the meal with balanced portions and adjust seasoning lightly."
    portions = "; ".join(f"{item['ingredient']}: {item['servingGrams']} g ({item.get('weightBasis', item.get('description', 'source weight basis'))})"
                         for item in meal.get("ingredientSources", []))
    portion_text = f" Portions: {portions}." if portions else ""
    return f"Prepare {', '.join(ingredients)} as a balanced {meal.get('type', 'meal').lower()} meal. Estimated prep time: {prep} minutes.{portion_text}"


def select_ranked_meal(meals, context, meal_type, targets, used_ids):
    ranked = []
    approval_reviews = context.get("approval_reviews") or {}
    for meal in meals:
        item = score_meal(meal, context, meal_type, targets)
        if not item:
            continue
        approval = approval_for(meal, approval_reviews)
        if REQUIRE_EXPERT_APPROVAL and not is_expert_approved(approval):
            continue
        if recipe_signature(meal) in used_ids:
            item["score"] -= 0.05
        item["score"] = clamp(item["score"] + 0.04, 0, 1.15)
        item["approval"] = approval
        ranked.append(item)

    if not ranked:
        # Keep the expert gate strict, but do not drop a meal slot just because
        # the approved review set is still small for this exact slot type.
        for meal in meals:
            item = score_meal(meal, context, meal_type, targets, allow_any_type=True)
            if not item:
                continue
            approval = approval_for(meal, approval_reviews)
            if REQUIRE_EXPERT_APPROVAL and not is_expert_approved(approval):
                continue
            if recipe_signature(meal) in used_ids:
                item["score"] -= 0.08
            item["score"] = clamp(item["score"] + 0.04, 0, 1.15)
            item["approval"] = approval
            ranked.append(item)

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked[0] if ranked else None


def context_from_payload(payload):
    model = load_model()
    profile = payload.get("profile") or {}
    approval_reviews = payload.get("approval_reviews") or {}
    return {
        "goal": normalize_goal(profile.get("goal")),
        "likes": parse_csv(profile.get("likes")),
        "dislikes": parse_csv(profile.get("dislikes")),
        "allergies": parse_csv(profile.get("allergies")),
        "fridge": payload.get("fridge_ingredients") or [],
        "weights": model["weights"],
        "approval_reviews": approval_reviews,
    }


def generate_plan(payload):
    meals = load_dataset()
    profile = payload.get("profile") or {}
    calories = int(payload.get("calories") or profile.get("target_calories") or 2200)
    meal_count = int(profile.get("meals_per_day") or 4)
    meal_structure = MEAL_STRUCTURES.get(meal_count, MEAL_STRUCTURES[4])
    p_ratio, c_ratio, f_ratio, is_recomp = macro_ratios(profile)

    context = context_from_payload(payload)
    approval_reviews = context.get("approval_reviews") or {}
    approved_review_count = sum(
        1 for review in approval_reviews.values()
        if (review or {}).get("status") == "approved"
    )

    protein_total = (calories * p_ratio) / 4
    carbs_total = (calories * c_ratio) / 4
    fats_total = (calories * f_ratio) / 9
    plan = []
    used_ids = set()
    counter = 1
    expected_slots = len(DAYS) * len(meal_structure)

    for day in DAYS:
        for meal_type, ratio in meal_structure:
            targets = {
                "calories": calories * ratio,
                "protein": protein_total * ratio,
                "carbs": carbs_total * ratio,
                "fats": fats_total * ratio,
            }
            selected = select_ranked_meal(meals, context, meal_type, targets, used_ids)
            if not selected:
                continue
            meal = selected["meal"]
            fridge = selected["fridge"]
            approval = selected.get("approval") or approval_for(meal, approval_reviews)
            used_ids.add(recipe_signature(meal))

            plan.append({
                "id": f"m{counter}",
                "dataset_meal_id": meal.get("id"),
                "day": day,
                "type": meal_type,
                "name": meal.get("name"),
                "calories": meal["calories"],
                "protein": meal["protein"],
                "carbs": meal["carbs"],
                "fats": meal["fats"],
                "portion_factor": meal["portion_factor"],
                "ingredients": meal.get("ingredients", []),
                "instructions": instructions_for(meal),
                "fridge_match": fridge["match"],
                "fridge_used": fridge["used"],
                "missing_ingredients": fridge["missing"],
                "match_percent": selected["matchPercent"],
                "ai_score": round(selected["score"] * 100, 1),
                "expert_score": meal.get("expert_score", 0.82),
                "approval": approval,
                "expert_approved": is_expert_approved(approval),
                "model_approved": False,
                "source": meal.get("source", "NutriCore curated meal dataset"),
                "image": image_for_meal(meal, meal_type),
                "completed": False,
                "ai_model": MODEL_NAME,
                "model_version": MODEL_VERSION,
                "model_type": "python_local_random_forest_meal_ranker",
            })
            counter += 1

    if len(plan) < expected_slots:
        return {
            "success": False,
            "error": "NutriCore could not fill every meal slot with expert-approved meals.",
            "model": MODEL_NAME,
            "version": MODEL_VERSION,
            "model_type": "python_local_random_forest_meal_ranker",
            "expert_approval": {
                "gate_active": True,
                "reviewedMeals": len(approval_reviews),
                "approvedMeals": approved_review_count,
                "required": True,
                "rule": "Only manually expert-approved meals may be displayed to users.",
            },
            "plan": plan,
        }

    return {
        "success": True,
        "model": MODEL_NAME,
        "version": MODEL_VERSION,
        "model_type": "python_local_random_forest_meal_ranker",
        "is_recomp": is_recomp,
        "expert_approval": {
            "gate_active": True,
            "reviewedMeals": len(approval_reviews),
            "approvedMeals": approved_review_count,
            "required": True,
            "rule": "Only manually expert-approved meals may be displayed to users.",
        },
        "plan": plan,
    }


def extract_blocked_terms(hint):
    hint_text = clean_term(hint)
    blocked = set()
    markers = ["no ", "without ", "avoid ", "remove ", "swap out "]
    for marker in markers:
        if marker not in hint_text:
            continue
        tail = hint_text.split(marker, 1)[1]
        tail = tail.split(".", 1)[0].split(",", 1)[0]
        for part in tail.replace(" and ", " ").replace(" or ", " ").split():
            if len(part) >= 3:
                blocked.add(part)
    return blocked


def hint_score(meal, hint, target_meal):
    hint_text = clean_term(hint)
    tokens = [token for token in hint_text.replace(",", " ").split() if len(token) >= 3]
    haystack = " ".join([
        clean_term(meal.get("name")),
        " ".join(clean_term(item) for item in meal.get("ingredients", [])),
        " ".join(clean_term(item) for item in meal.get("goals", [])),
        " ".join(clean_term(item) for item in meal.get("allergens", [])),
    ])
    allergens = {clean_term(item) for item in meal.get("allergens", [])}
    score = 0.0

    for blocked in extract_blocked_terms(hint):
        if blocked in haystack or blocked in allergens:
            score -= 1.25

    wants_vegan = "vegan" in hint_text or "plant based" in hint_text
    wants_protein = "protein" in hint_text or "high protein" in hint_text
    wants_low_carb = "low carb" in hint_text or "less carb" in hint_text
    wants_low_fat = "low fat" in hint_text or "less fat" in hint_text
    wants_low_calorie = "lower calories" in hint_text or "low calories" in hint_text or "low calorie" in hint_text
    wants_lebanese = any(term in hint_text for term in ["lebanese", "arabic", "levant", "home food"])

    if wants_vegan:
        animal_terms = {"chicken", "beef", "turkey", "tuna", "egg", "eggs", "milk", "yogurt", "dairy"}
        score += 0.35 if not any(term in haystack for term in animal_terms) else -0.65
    if wants_protein:
        score += clamp(float(meal.get("protein", 0)) / 45) * 0.35
    if wants_low_carb:
        score += clamp(1 - float(meal.get("carbs", 0)) / max(float(target_meal.get("carbs", 45)), 1)) * 0.25
    if wants_low_fat:
        score += clamp(1 - float(meal.get("fats", 0)) / max(float(target_meal.get("fats", 20)), 1)) * 0.20
    if wants_low_calorie:
        target_calories = max(float(target_meal.get("calories", 450) or 450), 1)
        score += clamp(1 - float(meal.get("calories", 0)) / target_calories) * 0.25
    if wants_lebanese:
        score += 0.08 if any(term in haystack for term in ["hummus", "tahini", "rice", "beans", "pita"]) else 0

    stopwords = {"the", "and", "with", "make", "swap", "more", "less", "higher", "lower", "meal", "food"}
    for token in tokens:
        if token not in stopwords and token in haystack:
            score += 0.08
    return score


def resolve_dataset_replacement(replacement, meals, target_meal):
    if not isinstance(replacement, dict):
        return None

    replacement_id = clean_term(replacement.get("id") or replacement.get("dataset_meal_id")).replace(" ", "_")
    replacement_name = clean_term(replacement.get("name"))
    for meal in meals:
        meal_id = clean_term(meal.get("id")).replace(" ", "_")
        meal_name = clean_term(meal.get("name"))
        if (replacement_id and replacement_id == meal_id) or (replacement_name and replacement_name == meal_name):
            return dict(meal)
    return None


def build_replacement_output(selected, target_meal):
    meal = selected["meal"]
    fridge = selected["fridge"]
    meal_type = meal_slot_type(target_meal)
    if meal_type == "Meal":
        meal_type = meal.get("type") or meal.get("meal") or "Meal"
    ingredients = meal.get("ingredients", [])
    instructions = meal.get("instructions") or instructions_for(meal)
    return {
        "id": target_meal.get("id"),
        "dataset_meal_id": meal.get("id"),
        "day": target_meal.get("day"),
        "type": meal_type,
        "meal": meal_type,
        "name": meal.get("name"),
        "calories": meal["calories"],
        "protein": meal["protein"],
        "carbs": meal["carbs"],
        "fats": meal["fats"],
        "portion_factor": meal["portion_factor"],
        "ingredients": ingredients,
        "instructions": instructions,
        "fridge_match": fridge["match"],
        "fridge_used": fridge["used"],
        "missing_ingredients": fridge["missing"],
        "match_percent": selected["matchPercent"],
        "ai_score": round(selected["score"] * 100, 1),
        "expert_score": meal.get("expert_score", 0.82),
        "source": meal.get("source", "NutriCore trained replacement model"),
        "image": meal.get("image") or target_meal.get("image") or image_for_meal(meal, meal_type),
        "completed": False,
        "ai_model": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "model_type": "python_local_random_forest_meal_swap_ranker",
        "approval": selected["approval"],
        "expert_approved": is_expert_approved(selected["approval"]),
        "model_approved": False,
    }


def replace_meal(payload):
    meals = load_dataset()
    target_meal = payload.get("target_meal") or {}
    hint = payload.get("hint") or ""
    replacement = payload.get("replacement")
    context = context_from_payload(payload)
    meal_type = meal_slot_type(target_meal)
    targets = {
        "calories": float(target_meal.get("calories") or 0),
        "protein": float(target_meal.get("protein") or 0),
        "carbs": float(target_meal.get("carbs") or 0),
        "fats": float(target_meal.get("fats") or 0),
    }

    if isinstance(replacement, dict) and replacement:
        resolved_replacement = resolve_dataset_replacement(replacement, meals, target_meal)
        if not resolved_replacement:
            return {
                "success": False,
                "error": "Selected replacement is not part of the trained NutriCore meal dataset.",
            }
        approval = approval_for(resolved_replacement, context["approval_reviews"])
        if REQUIRE_EXPERT_APPROVAL and not is_expert_approved(approval):
            return {"success": False, "error": "Selected replacement requires manual expert approval."}
        selected = score_meal(resolved_replacement, context, meal_type, targets)
        if not selected:
            return {
                "success": False,
                "error": "Selected replacement does not pass NutriCore allergy, dislike, or meal-type constraints.",
            }
        selected["approval"] = approval
        selected["score"] = clamp(selected["score"] + hint_score(resolved_replacement, hint, target_meal), 0, 1.25)
        if "fridge" in clean_term(hint):
            selected["score"] = clamp(selected["score"] + (selected["fridge"]["score"] * 0.25), 0, 1.25)
        selected["matchPercent"] = round(clamp(selected["score"] / 1.25) * 100)
        return {
            "success": True,
            "model": MODEL_NAME,
            "version": MODEL_VERSION,
            "model_type": "python_local_random_forest_meal_swap_ranker",
            "replacement": build_replacement_output(selected, target_meal),
            "alternatives": [],
        }

    ranked = []
    candidates = list(meals)
    current_name = clean_term(target_meal.get("name"))
    hint_text = clean_term(hint)
    for meal in candidates:
        if clean_term(meal.get("name")) == current_name:
            continue
        approval = approval_for(meal, context["approval_reviews"])
        if REQUIRE_EXPERT_APPROVAL and not is_expert_approved(approval):
            continue
        item = score_meal(meal, context, meal_type, targets)
        if not item:
            continue
        item["approval"] = approval
        item["score"] = clamp(item["score"] + hint_score(meal, hint, target_meal), 0, 1.25)
        if "fridge" in hint_text:
            item["score"] = clamp(item["score"] + (item["fridge"]["score"] * 0.25), 0, 1.25)
        item["matchPercent"] = round(clamp(item["score"] / 1.25) * 100)
        ranked.append(item)

    if not ranked:
        return {
            "success": False,
            "error": "No approved replacement meal matched the user's allergy, dislike, and meal-type constraints.",
        }

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return {
        "success": True,
        "model": MODEL_NAME,
        "version": MODEL_VERSION,
        "model_type": "python_local_random_forest_meal_swap_ranker",
        "replacement": build_replacement_output(ranked[0], target_meal),
        "alternatives": [
            {
                "name": item["meal"].get("name"),
                "match_percent": item["matchPercent"],
                "ai_score": round(item["score"] * 100, 1),
            }
            for item in distinct_ranked_recipes(ranked, lambda item: item["meal"])[1:4]
        ],
    }


def feedback_bonus(meal, feedback):
    if not feedback:
        return 0.0
    meal_id = meal.get("id")
    ingredients = {clean_term(item) for item in meal.get("ingredients", [])}
    bonus = 0.0
    for entry in feedback:
        rating = int(entry.get("rating") or 0)
        delta = 0.06 if rating >= 4 else -0.07 if rating <= 2 else 0
        if entry.get("mealId") == meal_id or entry.get("meal_id") == meal_id:
            bonus += delta * 2
        for ingredient in entry.get("ingredients") or []:
            if clean_term(ingredient) in ingredients:
                bonus += delta
    return clamp(bonus, -0.20, 0.20)


def approval_for(meal, approval_reviews):
    if not approval_reviews:
        return {
            "status": "pending",
            "label": "Pending Expert Review",
            "reason": "Meal must be approved by the expert before it can be displayed to the user.",
            "manual": False,
        }
    review = approval_reviews.get(meal.get("id")) or {}
    status = review.get("status") or "pending"
    labels = {
        "approved": "Approved",
        "pending": "Pending Review",
        "needs_adjustment": "Needs Adjustment",
        "rejected": "Rejected",
    }
    return {
        "status": status,
        "label": labels.get(status, "Pending Review"),
        "reason": review.get("notes") or "Manual review status.",
        "manual": True,
    }


def is_expert_approved(approval):
    return bool(approval.get("manual")) and approval.get("status") == "approved"


def explain_swap(meal, selected, targets):
    fridge = selected["fridge"]
    used = len(fridge["used"])
    total = max(len(meal.get("ingredients", [])), 1)
    return (
        f"{selected['matchPercent']}% match. Uses {used}/{total} available ingredients "
        f"and stays close to a {round(targets['calories'])} kcal meal target."
    )


def recommend_swaps(payload):
    meals = load_dataset()
    profile = payload.get("profile") or {}
    context = context_from_payload(payload)
    calories = int(payload.get("calories") or profile.get("target_calories") or 2200)
    max_results = int(payload.get("max_results") or 50)
    approval_reviews = payload.get("approval_reviews") or {}
    feedback = payload.get("feedback") or []
    p_ratio, c_ratio, f_ratio, _ = macro_ratios(profile)
    targets = {
        "calories": calories / 4,
        "protein": (calories * p_ratio) / 16,
        "carbs": (calories * c_ratio) / 16,
        "fats": (calories * f_ratio) / 36,
    }

    ranked = []
    for meal in meals:
        selected = score_meal(meal, context, meal.get("type") or "Meal", targets)
        if not selected:
            continue
        approval = approval_for(meal, approval_reviews)
        if REQUIRE_EXPERT_APPROVAL and not is_expert_approved(approval):
            continue
        selected["score"] = clamp(selected["score"] + feedback_bonus(meal, feedback), 0, 1.15)
        selected["matchPercent"] = round(clamp(selected["score"] / 1.15) * 100)
        ranked.append((selected["score"], selected, approval))

    ranked.sort(key=lambda item: item[0], reverse=True)
    recommendations = []
    distinct = distinct_ranked_recipes(ranked, lambda item: item[1]["meal"])
    for _, selected, approval in distinct[:max_results]:
        meal = selected["meal"]
        recommendations.append({
            "id": meal.get("id"),
            "name": meal.get("name"),
            "type": meal.get("type"),
            "calories": int(meal.get("calories") or 0),
            "protein": int(meal.get("protein") or 0),
            "carbs": int(meal.get("carbs") or 0),
            "fats": int(meal.get("fats") or 0),
            "ingredients": meal.get("ingredients", []),
            "instructions": instructions_for(meal),
            "image": image_for_meal(meal, meal.get("type") or "Meal"),
            "matchPercent": selected["matchPercent"],
            "modelScore": round(selected["score"], 3),
            "ingredientMatch": {
                "score": round(selected["fridge"]["score"], 3),
                "available": selected["fridge"]["used"],
                "missing": selected["fridge"]["missing"],
                "used": selected["fridge"]["used"],
            },
            "calorieScore": round(selected["features"].get("calories", 0), 3),
            "proteinScore": round(selected["features"].get("protein", 0), 3),
            "goalScore": round(selected["features"].get("goal", 0), 3),
            "preferenceScore": round(selected["features"].get("preferences", 0), 3),
            "approval": approval,
            "blocked": False,
            "explanation": explain_swap(meal, selected, targets),
            "ai_model": MODEL_NAME,
            "model_version": MODEL_VERSION,
            "model_type": "python_local_random_forest_meal_swap_ranker",
        })

    return {
        "success": True,
        "targets": {
            "targetCalories": calories,
            "protein": round((calories * p_ratio) / 4),
            "carbs": round((calories * c_ratio) / 4),
            "fats": round((calories * f_ratio) / 9),
        },
        "recommendations": recommendations,
        "model": {
            "name": MODEL_NAME,
            "version": MODEL_VERSION,
            "trainedWith": "Python local Random Forest meal ranking and swap model",
            "trainingSamples": len(meals) + len(feedback),
            "learnedSamples": len(feedback),
            "weights": context["weights"],
            "trainingMetrics": load_model()["training"].get("trainingMetrics"),
            "validationMetrics": load_model()["training"].get("validationMetrics"),
        },
    }


def run_training():
    subprocess.run([sys.executable, str(PREPROCESS_SCRIPT)], cwd=str(ROOT), check=True)
    subprocess.run([sys.executable, str(TRAIN_SCRIPT)], cwd=str(ROOT), check=True)
    artifact = load_json(MODEL_PATH, {})
    artifact["modelName"] = MODEL_NAME
    artifact["version"] = MODEL_VERSION
    artifact["runtime"] = "Python local Random Forest meal ranker"
    MODEL_PATH.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    return {
        "success": True,
        "message": "NutriCore AI training complete",
        "artifact": str(MODEL_PATH.relative_to(ROOT)),
        "trainingMetrics": artifact.get("trainingMetrics"),
        "validationMetrics": artifact.get("validationMetrics"),
    }


def parse_args():
    parser = argparse.ArgumentParser(description="NutriCore AI local meal recommendation model")
    parser.add_argument("--train", action="store_true")
    parser.add_argument("--payload-json")
    parser.add_argument("--payload-b64")
    parser.add_argument("--payload-file")
    parser.add_argument("--replace-json")
    parser.add_argument("--replace-b64")
    parser.add_argument("--replace-file")
    parser.add_argument("--swaps-json")
    parser.add_argument("--swaps-b64")
    parser.add_argument("--swaps-file")
    return parser.parse_args()


def read_json_file(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main():
    args = parse_args()
    try:
        if args.train:
            print(json.dumps(run_training()))
            return
        if args.replace_file:
            print(json.dumps(replace_meal(read_json_file(args.replace_file))))
            return
        if args.replace_b64:
            payload = json.loads(base64.b64decode(args.replace_b64).decode("utf-8"))
            print(json.dumps(replace_meal(payload)))
            return
        if args.replace_json:
            print(json.dumps(replace_meal(json.loads(args.replace_json))))
            return
        if args.swaps_file:
            print(json.dumps(recommend_swaps(read_json_file(args.swaps_file))))
            return
        if args.swaps_b64:
            payload = json.loads(base64.b64decode(args.swaps_b64).decode("utf-8"))
            print(json.dumps(recommend_swaps(payload)))
            return
        if args.swaps_json:
            print(json.dumps(recommend_swaps(json.loads(args.swaps_json))))
            return
        if args.payload_file:
            payload = read_json_file(args.payload_file)
        elif args.payload_b64:
            payload = json.loads(base64.b64decode(args.payload_b64).decode("utf-8"))
        elif args.payload_json:
            payload = json.loads(args.payload_json)
        else:
            payload = json.loads(sys.stdin.read() or "{}")
        print(json.dumps(generate_plan(payload)))
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
