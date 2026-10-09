import csv
import json
import math
import re
import zipfile
from itertools import product
from io import TextIOWrapper
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW_ZIP = ROOT / "ml" / "nutrition_ai" / "raw_data" / "FoodData_Central_foundation_food_csv_2026-04-30.zip"
PROCESSED_DIR = ROOT / "ml" / "nutrition_ai" / "processed_data"
OUTPUT_JSON = PROCESSED_DIR / "usda_meal_training_dataset.json"
APP_DATASET = ROOT / "src" / "ai" / "usdaMealDataset.json"

NUTRIENTS = {
    "protein": "1003",
    "fat": "1004",
    "carbs": "1005",
    "energy_general": "2047",
    "energy_specific": "2048",
}

INGREDIENT_KEYWORDS = {
    "chicken": {"include": [r"\bCHICKEN\b"], "exclude": ["LUNCHMEAT"], "prefer": ["COOKED", "MEAT ONLY"]},
    "turkey": {"include": [r"\bTURKEY\b"], "exclude": ["LUNCHMEAT"], "prefer": ["ROASTED", "COOKED"]},
    "beef": {"include": [r"\bBEEF\b"], "exclude": ["BOLOGNA", "LUNCHMEAT"], "prefer": ["LEAN", "COOKED"]},
    "salmon": {"include": [r"\bSALMON\b"], "exclude": [], "prefer": ["COOKED", "RAW"]},
    "tuna": {"include": [r"\bTUNA\b"], "exclude": [], "prefer": ["CANNED", "DRAINED"]},
    "pollock": {"include": [r"\bPOLLOCK\b"], "exclude": [], "prefer": ["RAW", "COOKED"]},
    "eggs": {"include": [r"\bEGG\b"], "exclude": ["DRIED"], "prefer": ["WHOLE", "RAW"]},
    "hummus": {"include": [r"\bHUMMUS\b"], "exclude": [], "prefer": ["CLASSIC"]},
    "rice": {"include": [r"\bRICE\b"], "exclude": ["PRICE", "FLOUR"], "prefer": ["WHITE RICE", "BROWN RICE", "LONG GRAIN"]},
    "oats": {"include": [r"\bOAT"], "exclude": ["FLOUR"], "prefer": ["ROLLED", "REGULAR"]},
    "beans": {"include": [r"\bBEANS?\b"], "exclude": ["SNAP"], "prefer": ["BAKED", "CANNED", "VEGETARIAN"]},
    "potato": {"include": [r"\bPOTATO"], "exclude": ["CHIPS", "FLOUR"], "prefer": ["RAW", "BAKED"]},
    "bread": {"include": [r"\bBREAD\b"], "exclude": [], "prefer": ["WHOLE WHEAT", "MULTIGRAIN"]},
    "tomato": {"include": [r"\bTOMATO"], "exclude": ["SAUCE", "KETCHUP"], "prefer": ["RAW"]},
    "broccoli": {"include": [r"\bBROCCOLI\b"], "exclude": [], "prefer": ["RAW"]},
    "spinach": {"include": [r"\bSPINACH\b"], "exclude": [], "prefer": ["RAW"]},
    "lettuce": {"include": [r"\bLETTUCE\b"], "exclude": [], "prefer": ["RAW"]},
    "avocado": {"include": [r"\bAVOCADO\b"], "exclude": ["OIL"], "prefer": ["RAW"]},
    "peanut_butter": {"include": [r"\bPEANUT BUTTER\b"], "exclude": [], "prefer": ["SMOOTH"]},
    "banana": {"include": [r"\bBANANA"], "exclude": [], "prefer": ["RAW"]},
    "berries": {"include": [r"\bBLUEBERR", r"\bSTRAWBERR", r"\bRASPBERR"], "exclude": ["SYRUP"], "prefer": ["RAW", "FRESH"]},
    "apple": {"include": [r"\bAPPLE"], "exclude": ["JUICE", "SAUCE"], "prefer": ["RAW"]},
    "milk": {"include": [r"\bMILK\b"], "exclude": ["YOGURT", "BUTTERMILK", "CHEESE", "POWDER", "DRIED", "COCONUT"], "prefer": ["WHOLE", "LOWFAT", "FLUID"]},
    "greek_yogurt": {"include": [r"\bYOGURT\b"], "exclude": [], "prefer": ["GREEK", "PLAIN"]},
}

MEAL_TEMPLATES = [
    {
        "id": "usda_chicken_rice_bowl",
        "name": "USDA Chicken Rice Power Bowl",
        "type": "Lunch",
        "ingredients": ["chicken", "rice", "broccoli", "avocado"],
        "goals": ["muscle_gain", "maintain"],
        "allergens": [],
        "prepMinutes": 25,
    },
    {
        "id": "usda_egg_oats_breakfast",
        "name": "USDA Egg and Oat Breakfast",
        "type": "Breakfast",
        "ingredients": ["eggs", "oats", "banana", "milk"],
        "goals": ["muscle_gain", "maintain"],
        "allergens": ["eggs", "dairy"],
        "prepMinutes": 12,
    },
    {
        "id": "usda_salmon_potato_plate",
        "name": "USDA Salmon Potato Plate",
        "type": "Dinner",
        "ingredients": ["salmon", "potato", "spinach", "avocado"],
        "goals": ["maintain", "muscle_gain"],
        "allergens": ["fish"],
        "prepMinutes": 30,
    },
    {
        "id": "usda_beans_rice_bowl",
        "name": "USDA Bean Rice Green Bowl",
        "type": "Dinner",
        "ingredients": ["beans", "rice", "broccoli", "avocado"],
        "goals": ["weight_loss", "maintain"],
        "allergens": [],
        "prepMinutes": 22,
    },
    {
        "id": "usda_beef_potato_builder",
        "name": "USDA Lean Beef Potato Builder",
        "type": "Dinner",
        "ingredients": ["beef", "potato", "tomato", "spinach"],
        "goals": ["muscle_gain", "weight_gain"],
        "allergens": [],
        "prepMinutes": 28,
    },
    {
        "id": "usda_yogurt_oat_bowl",
        "name": "USDA Yogurt Oat Protein Bowl",
        "type": "Snack",
        "ingredients": ["greek_yogurt", "berries", "oats", "peanut_butter"],
        "goals": ["weight_loss", "maintain", "muscle_gain"],
        "allergens": ["dairy", "peanuts"],
        "prepMinutes": 5,
    },
    {
        "id": "usda_turkey_hummus_wrap",
        "name": "USDA Turkey Hummus Plate",
        "type": "Lunch",
        "ingredients": ["turkey", "bread", "hummus", "lettuce", "tomato"],
        "goals": ["weight_loss", "maintain"],
        "allergens": ["gluten", "sesame"],
        "prepMinutes": 8,
    },
    {
        "id": "usda_mass_gain_smoothie",
        "name": "USDA Mass Gain Smoothie",
        "type": "Snack",
        "ingredients": ["milk", "banana", "oats", "peanut_butter", "greek_yogurt"],
        "goals": ["weight_gain", "muscle_gain"],
        "allergens": ["dairy", "peanuts"],
        "prepMinutes": 6,
    },
    {
        "id": "usda_omelette_plate",
        "name": "USDA Vegetable Omelette Plate",
        "type": "Breakfast",
        "ingredients": ["eggs", "spinach", "tomato", "avocado"],
        "goals": ["weight_loss", "maintain"],
        "allergens": ["eggs"],
        "prepMinutes": 10,
    },
    {
        "id": "usda_pollock_rice_plate",
        "name": "USDA Pollock Rice Plate",
        "type": "Dinner",
        "ingredients": ["pollock", "rice", "broccoli", "avocado"],
        "goals": ["weight_loss", "maintain"],
        "allergens": ["fish"],
        "prepMinutes": 24,
    },
]

IMAGE_BY_TYPE = {
    "Breakfast": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80",
    "Lunch": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
    "Dinner": "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?auto=format&fit=crop&w=900&q=80",
    "Snack": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
}

IMAGE_BY_THEME = {
    "chicken_bowl": "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=900&q=80",
    "beef_plate": "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=80",
    "salad": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
    "eggs": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80",
    "yogurt_oats": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
    "fish_plate": "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?auto=format&fit=crop&w=900&q=80",
    "wrap": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=80",
    "pasta": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80",
    "sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80",
    "smoothie": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=900&q=80",
    "beans_rice": "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80",
}

SERVING_FACTORS = {
    "chicken": 1.35,
    "turkey": 1.25,
    "beef": 1.2,
    "salmon": 1.3,
    "tuna": 1.2,
    "pollock": 1.35,
    "eggs": 1.0,
    "beans": 1.0,
    "hummus": 0.6,
    "rice": 0.75,
    "oats": 0.55,
    "potato": 1.4,
    "bread": 0.65,
    "tomato": 0.8,
    "broccoli": 0.85,
    "spinach": 0.45,
    "lettuce": 0.5,
    "avocado": 0.55,
    "peanut_butter": 0.32,
    "banana": 1.0,
    "berries": 0.85,
    "apple": 1.0,
    "milk": 2.4,
    "greek_yogurt": 1.7,
}

INGREDIENT_LABELS = {
    "chicken": "Chicken",
    "turkey": "Turkey",
    "beef": "Beef",
    "salmon": "Salmon",
    "tuna": "Tuna",
    "pollock": "Pollock",
    "eggs": "Egg",
    "beans": "Bean",
    "hummus": "Hummus",
    "rice": "Rice",
    "oats": "Oat",
    "potato": "Potato",
    "bread": "Toast",
    "tomato": "Tomato",
    "broccoli": "Broccoli",
    "spinach": "Spinach",
    "lettuce": "Lettuce",
    "avocado": "Avocado",
    "peanut_butter": "Peanut Butter",
    "banana": "Banana",
    "berries": "Berry",
    "apple": "Apple",
    "milk": "Milk",
    "greek_yogurt": "Yogurt",
}


def slugify(value):
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def infer_allergens(ingredients):
    allergen_map = {
        "salmon": "fish",
        "tuna": "fish",
        "pollock": "fish",
        "eggs": "eggs",
        "milk": "dairy",
        "greek_yogurt": "dairy",
        "peanut_butter": "peanuts",
        "bread": "gluten",
        "hummus": "sesame",
    }
    return sorted({allergen_map[item] for item in ingredients if item in allergen_map})


def image_for_template(template):
    ingredients = template.get("ingredients", [])
    terms = " ".join([
        template.get("id", ""),
        template.get("name", ""),
        template.get("type", ""),
        " ".join(ingredients),
    ]).lower()
    ingredient_set = set(ingredients)

    if {"milk", "banana", "peanut_butter"} <= ingredient_set or "smoothie" in terms:
        return IMAGE_BY_THEME["smoothie"]
    if "wrap" in terms or "sandwich" in terms or {"bread", "lettuce", "tomato"} <= ingredient_set:
        return IMAGE_BY_THEME["wrap"]
    if "pasta" in terms:
        return IMAGE_BY_THEME["pasta"]
    if "omelette" in terms or "egg" in terms or "eggs" in ingredient_set:
        return IMAGE_BY_THEME["eggs"]
    if "yogurt" in terms or "oat" in terms or {"greek_yogurt", "berries"} & ingredient_set:
        return IMAGE_BY_THEME["yogurt_oats"]
    if {"salmon", "tuna", "pollock"} & ingredient_set:
        return IMAGE_BY_THEME["fish_plate"]
    if "beef" in ingredient_set:
        return IMAGE_BY_THEME["beef_plate"]
    if "beans" in ingredient_set:
        return IMAGE_BY_THEME["beans_rice"]
    if {"lettuce", "spinach"} & ingredient_set and not ({"rice", "potato"} & ingredient_set):
        return IMAGE_BY_THEME["salad"]
    if "chicken" in ingredient_set or "turkey" in ingredient_set or "rice" in ingredient_set:
        return IMAGE_BY_THEME["chicken_bowl"]
    return IMAGE_BY_TYPE.get(template.get("type"), IMAGE_BY_TYPE["Lunch"])


def infer_goals(ingredients, meal_type):
    ingredient_set = set(ingredients)
    if meal_type == "Snack" and {"milk", "oats", "peanut_butter"} & ingredient_set:
        return ["weight_gain", "muscle_gain"]
    if "beef" in ingredient_set or ("potato" in ingredient_set and {"chicken", "turkey"} & ingredient_set):
        return ["muscle_gain", "weight_gain"]
    if {"salmon", "tuna", "pollock", "beans"} & ingredient_set:
        return ["weight_loss", "maintain"]
    if meal_type == "Breakfast" and "eggs" in ingredient_set:
        return ["weight_loss", "maintain", "muscle_gain"]
    return ["maintain", "muscle_gain"]


def make_template(meal_id, name, meal_type, ingredients, prep_minutes):
    return {
        "id": meal_id,
        "name": name,
        "type": meal_type,
        "ingredients": ingredients,
        "goals": infer_goals(ingredients, meal_type),
        "allergens": infer_allergens(ingredients),
        "prepMinutes": prep_minutes,
    }


def generate_expanded_meal_templates(seed_templates, target_count=72):
    templates = {template["id"]: template for template in seed_templates}

    bowl_proteins = ["chicken", "turkey", "beef", "salmon", "tuna", "pollock", "beans"]
    bowl_carbs = ["rice", "potato"]
    bowl_vegetables = ["broccoli", "spinach", "tomato", "lettuce"]
    bowl_fats = ["avocado", "hummus"]

    for protein, carb, vegetable, fat in product(bowl_proteins, bowl_carbs, bowl_vegetables, bowl_fats):
        ingredients = [protein, carb, vegetable, fat]
        name = f"USDA {INGREDIENT_LABELS[protein]} {INGREDIENT_LABELS[carb]} {INGREDIENT_LABELS[vegetable]} Bowl"
        meal_id = f"usda_{slugify(protein)}_{slugify(carb)}_{slugify(vegetable)}_bowl"
        templates.setdefault(meal_id, make_template(meal_id, name, "Lunch", ingredients, 22))
        if len(templates) >= target_count:
            return list(templates.values())

    breakfast_proteins = ["eggs", "greek_yogurt"]
    breakfast_carbs = ["oats", "bread"]
    fruits = ["banana", "berries", "apple"]
    breakfast_addons = ["milk", "peanut_butter", "avocado"]

    for protein, carb, fruit, addon in product(breakfast_proteins, breakfast_carbs, fruits, breakfast_addons):
        ingredients = [protein, carb, fruit, addon]
        name = f"USDA {INGREDIENT_LABELS[protein]} {INGREDIENT_LABELS[fruit]} Breakfast"
        meal_id = f"usda_{slugify(protein)}_{slugify(carb)}_{slugify(fruit)}_breakfast"
        templates.setdefault(meal_id, make_template(meal_id, name, "Breakfast", ingredients, 12))
        if len(templates) >= target_count:
            return list(templates.values())

    snack_bases = ["milk", "greek_yogurt"]
    snack_fruits = ["banana", "berries", "apple"]
    snack_addons = ["oats", "peanut_butter", "hummus"]

    for base, fruit, addon in product(snack_bases, snack_fruits, snack_addons):
        ingredients = [base, fruit, addon]
        name = f"USDA {INGREDIENT_LABELS[fruit]} {INGREDIENT_LABELS[base]} Smart Snack"
        meal_id = f"usda_{slugify(base)}_{slugify(fruit)}_{slugify(addon)}_snack"
        templates.setdefault(meal_id, make_template(meal_id, name, "Snack", ingredients, 6))
        if len(templates) >= target_count:
            return list(templates.values())

    return list(templates.values())


MEAL_TEMPLATES = generate_expanded_meal_templates(MEAL_TEMPLATES)

TRAINING_CASES = [
    {
        "profile": {"age": 22, "gender": "male", "height": 178, "weight": 76, "activity_level": "moderate", "goal": "muscle_gain"},
        "fridge": ["chicken", "rice", "broccoli", "eggs", "oats", "banana"],
        "liked": ["chicken", "rice"],
        "disliked": [],
        "allergies": [],
        "approved_meals": ["usda_chicken_rice_bowl", "usda_chicken_rice_broccoli_bowl", "usda_egg_oats_breakfast"],
    },
    {
        "profile": {"age": 21, "gender": "female", "height": 164, "weight": 68, "activity_level": "light", "goal": "weight_loss"},
        "fridge": ["eggs", "spinach", "tomato", "avocado", "greek_yogurt", "berries"],
        "liked": ["eggs", "spinach"],
        "disliked": ["tuna"],
        "allergies": ["fish"],
        "approved_meals": ["usda_omelette_plate", "usda_yogurt_oat_bowl"],
    },
    {
        "profile": {"age": 24, "gender": "male", "height": 181, "weight": 64, "activity_level": "active", "goal": "weight_gain"},
        "fridge": ["milk", "banana", "oats", "peanut_butter", "potato", "beef"],
        "liked": ["peanut_butter", "beef"],
        "disliked": [],
        "allergies": [],
        "approved_meals": ["usda_mass_gain_smoothie", "usda_beef_potato_builder"],
    },
    {
        "profile": {"age": 26, "gender": "female", "height": 170, "weight": 61, "activity_level": "moderate", "goal": "maintain"},
        "fridge": ["beans", "rice", "broccoli", "avocado", "apple", "berries"],
        "liked": ["beans", "rice"],
        "disliked": ["beef"],
        "allergies": ["dairy"],
        "approved_meals": ["usda_beans_rice_bowl", "usda_beans_rice_broccoli_bowl"],
    },
]


def read_csv_from_zip(zip_file, filename):
    member = next(name for name in zip_file.namelist() if name.endswith(f"/{filename}") or name == filename)
    with zip_file.open(member) as handle:
        text = TextIOWrapper(handle, encoding="utf-8-sig", newline="")
        return list(csv.DictReader(text))


def normalize_description(value):
    return re.sub(r"\s+", " ", value.upper()).strip()


def load_usda_foods():
    with zipfile.ZipFile(RAW_ZIP) as zip_file:
        foods = read_csv_from_zip(zip_file, "food.csv")
        nutrients = read_csv_from_zip(zip_file, "food_nutrient.csv")

    food_by_id = {
        row["fdc_id"]: {
            "fdcId": row["fdc_id"],
            "description": row["description"],
            "normalized": normalize_description(row["description"]),
            "dataType": row["data_type"],
            "publicationDate": row["publication_date"],
            "nutrients": {},
        }
        for row in foods
    }

    target_ids = set(NUTRIENTS.values())
    for row in nutrients:
        nutrient_id = row["nutrient_id"]
        if nutrient_id not in target_ids:
            continue
        food = food_by_id.get(row["fdc_id"])
        if not food:
            continue
        try:
            amount = float(row["amount"])
        except (TypeError, ValueError):
            continue
        food["nutrients"][nutrient_id] = amount

    return food_by_id


def find_best_food(food_by_id, ingredient_id):
    rule = INGREDIENT_KEYWORDS[ingredient_id]
    candidates = []
    for food in food_by_id.values():
        description = food["normalized"]
        if not has_complete_nutrients(food):
            continue
        if any(exclude in description for exclude in rule.get("exclude", [])):
            continue
        if any(re.search(pattern, description) for pattern in rule["include"]):
            penalty = sum(3 for phrase in rule.get("prefer", []) if phrase in description)
            if "RAW" in description:
                penalty += 1
            if "PREPARED" in description or "COOKED" in description:
                penalty += 2
            if "COMMERCIAL" in description:
                penalty += 1
            score = penalty - (len(description) / 100)
            candidates.append((score, food))

    if not candidates:
        raise ValueError(f"No USDA match found for ingredient '{ingredient_id}'")
    return sorted(candidates, key=lambda item: item[0], reverse=True)[0][1]


def has_complete_nutrients(food):
    nutrients = food["nutrients"]
    required = [NUTRIENTS[key] for key in ["protein", "fat", "carbs"]]
    if not all(key in nutrients and math.isfinite(nutrients[key]) and nutrients[key] >= 0 for key in required):
        return False
    energy = nutrients.get(NUTRIENTS["energy_specific"], nutrients.get(NUTRIENTS["energy_general"]))
    return energy is not None and math.isfinite(energy) and energy > 0


def nutrient_value(food, key):
    nutrients = food["nutrients"]
    if key == "calories":
        if NUTRIENTS["energy_specific"] in nutrients:
            return nutrients[NUTRIENTS["energy_specific"]]
        return nutrients[NUTRIENTS["energy_general"]]
    return nutrients[NUTRIENTS[key]]


def weight_basis(description):
    text = description.upper()
    if "DRAINED" in text:
        return "drained weight"
    if any(word in text for word in ["COOKED", "BRAISED", "ROASTED", "BAKED"]):
        return "cooked weight"
    if "RAW" in text:
        return "raw/dry weight" if "RICE" in text else "raw weight"
    if "OATS" in text or "ROLLED" in text:
        return "dry weight"
    return "as-sold weight; follow the source description"


def descriptive_meal_name(template):
    labels = [INGREDIENT_LABELS[item] for item in template["ingredients"]]
    ingredients = ", ".join(labels[:-1]) + " and " + labels[-1]
    return f"USDA {ingredients} {template['type']}"


def build_meals(ingredient_foods):
    meals = []
    for template in MEAL_TEMPLATES:
        ingredient_sources = []
        calories = protein = carbs = fats = 0
        for ingredient in template["ingredients"]:
            food = ingredient_foods[ingredient]
            serving_multiplier = SERVING_FACTORS.get(ingredient, 1)
            ingredient_sources.append({
                "ingredient": ingredient,
                "servingGrams": round(serving_multiplier * 100),
                "fdcId": food["fdcId"],
                "description": food["description"],
                "publicationDate": food["publicationDate"],
                "weightBasis": weight_basis(food["description"]),
            })
            calories += nutrient_value(food, "calories") * serving_multiplier
            protein += nutrient_value(food, "protein") * serving_multiplier
            carbs += nutrient_value(food, "carbs") * serving_multiplier
            fats += nutrient_value(food, "fat") * serving_multiplier

        meal = {
            **template,
            "name": descriptive_meal_name(template),
            "calories": round(calories),
            "protein": round(protein),
            "carbs": round(carbs),
            "fats": round(fats),
            "expert_score": 0.9 if "weight_loss" in template["goals"] or "muscle_gain" in template["goals"] else 0.86,
            "expert_score_source": "rule_prior_not_human_review",
            "source": "USDA FoodData Central Foundation Foods CSV 2026-04-30",
            "sourceUrl": "https://fdc.nal.usda.gov/download-datasets/",
            "image": image_for_template(template),
            "ingredientSources": ingredient_sources,
        }
        meals.append(meal)
    return meals


def main():
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    food_by_id = load_usda_foods()
    ingredient_foods = {
        ingredient_id: find_best_food(food_by_id, ingredient_id)
        for ingredient_id in INGREDIENT_KEYWORDS
    }
    meals = build_meals(ingredient_foods)

    output = {
        "dataset_name": "USDA Foundation Foods Smart Fridge Meal Dataset",
        "source": "USDA FoodData Central Foundation Foods CSV 2026-04-30",
        "source_url": "https://fdc.nal.usda.gov/download-datasets/",
        "license": "USDA FoodData Central data are public domain / CC0 1.0 Universal",
        "preprocessing": {"missing_nutrients": "exclude incomplete ingredient records; never substitute zero",
                          "portion_basis": "grams in the preparation state recorded in each ingredient source",
                          "complete_ingredient_records": len(ingredient_foods)},
        "meals": meals,
        "training_cases": TRAINING_CASES,
    }

    OUTPUT_JSON.write_text(json.dumps(output, indent=2))
    APP_DATASET.write_text(json.dumps({"meals": meals}, indent=2))
    print(json.dumps({
        "source": output["source"],
        "meals": len(meals),
        "ingredients_mapped": len(ingredient_foods),
        "output": str(OUTPUT_JSON),
        "appDataset": str(APP_DATASET),
    }, indent=2))


if __name__ == "__main__":
    main()
