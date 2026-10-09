"""Contract and constraint checks for trained recommendation forests."""

import json
import math
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "ml"))

from random_forest import predict_forest
from ml.workout_ai import traincore_model as workout
from ml.nutrition_ai import nutricore_model as nutrition
from ml.nutrition_ai import train_model as nutrition_training
from ml.nutrition_ai.review_labels import FIELDS, load_recommendation_reviews
from ml.nutrition_ai.preprocess_usda_dataset import has_complete_nutrients, NUTRIENTS, weight_basis, descriptive_meal_name


class RecommendationForestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.meals = nutrition.load_dataset()
        cls.payload = {
            "calories": 2200,
            "profile": {"goal": "build_muscle", "meals_per_day": 4, "weight": 75,
                        "likes": "rice", "allergies": "dairy,nuts", "dislikes": "fish"},
            "fridge_ingredients": ["chicken", "rice", "broccoli"],
            "approval_reviews": {meal["id"]: {"status": "approved"} for meal in cls.meals},
        }

    def test_exported_forests_are_learned_and_validated(self):
        for model in [workout.load_forest_model(), nutrition.load_forest_model()]:
            self.assertEqual(model["n_estimators"], 64)
            self.assertEqual(len(model["trees"]), 64)
            self.assertTrue(model["export_validation"]["passed"])
            self.assertGreater(model["validation_groups"], 0)
            self.assertTrue(all(len(tree["left"]) > 1 for tree in model["trees"]))

    def test_model_selection_never_uses_test_profiles(self):
        selection = nutrition.load_forest_model()["model_selection"]
        fitting, development, testing = [set(selection[key]) for key in ["fitting_groups", "development_groups", "test_groups"]]
        self.assertFalse(fitting & development)
        self.assertFalse(fitting & testing)
        self.assertFalse(development & testing)
        self.assertFalse(selection["test_used_for_selection"])
        self.assertEqual(len(testing), 120)

    def test_incomplete_usda_records_are_rejected(self):
        nutrients = {NUTRIENTS["protein"]: 5, NUTRIENTS["fat"]: 3, NUTRIENTS["carbs"]: 10, NUTRIENTS["energy_general"]: 80}
        self.assertTrue(has_complete_nutrients({"nutrients": nutrients}))
        for key in nutrients:
            self.assertFalse(has_complete_nutrients({"nutrients": {name: value for name, value in nutrients.items() if name != key}}))
        self.assertFalse(has_complete_nutrients({"nutrients": {**nutrients, NUTRIENTS["protein"]: math.nan}}))

    def test_portion_scaling_preserves_actual_macros(self):
        meal = {"calories": 400, "protein": 20, "carbs": 50, "fats": 12,
                "ingredientSources": [{"ingredient": "rice", "servingGrams": 100}]}
        scaled = nutrition.portion_meal(meal, 600)
        self.assertEqual([scaled[key] for key in ["calories", "protein", "carbs", "fats"]], [600, 30, 75, 18])
        self.assertEqual(scaled["ingredientSources"][0]["servingGrams"], 150)
        self.assertEqual(nutrition.portion_meal(meal, 2000)["portion_factor"], 2.0)
        self.assertEqual(nutrition.portion_meal(meal, 50)["portion_factor"], 0.5)
        self.assertEqual(meal["protein"], 20)

    def test_training_features_equal_serving_features(self):
        case = nutrition_training.build_training_cases(self.meals)[0]
        context = nutrition_training.case_context(case)
        for meal in self.meals:
            scored = nutrition.score_meal(meal, context, meal["type"], nutrition_training.slot_targets(case, meal["type"]), use_model=False)
            if scored:
                expected = nutrition.forest_features_from_scores(scored["features"], context["goal"], meal["type"])
                self.assertEqual(nutrition_training.meal_features(meal, case), expected)

    def test_portion_instructions_preserve_weight_basis(self):
        self.assertEqual(weight_basis("Rice, brown, raw"), "raw/dry weight")
        self.assertEqual(weight_basis("Chicken, cooked, braised"), "cooked weight")
        self.assertEqual(weight_basis("Beans, canned, drained and rinsed"), "drained weight")
        self.assertEqual(weight_basis("Oats, rolled"), "dry weight")
        chicken = next(meal for meal in self.meals if meal["id"] == "usda_chicken_rice_bowl")
        text = nutrition.instructions_for(nutrition.portion_meal(chicken, 660))
        self.assertIn("raw/dry weight", text)
        self.assertIn("cooked weight", text)
        for meal in self.meals:
            self.assertEqual(meal["name"], descriptive_meal_name(meal))
            self.assertTrue(all(source.get("weightBasis") for source in meal["ingredientSources"]))

    def test_recipe_aliases_do_not_change_after_portion_scaling(self):
        lookup = {meal["id"]: meal for meal in self.meals}
        original = lookup["usda_chicken_rice_bowl"]
        alias = lookup["usda_chicken_rice_broccoli_bowl"]
        key = nutrition.recipe_signature(original)
        self.assertEqual(key, nutrition.recipe_signature(alias))
        self.assertEqual(key, nutrition.recipe_signature(nutrition.portion_meal(original, 660)))
        self.assertEqual(nutrition.distinct_ranked_recipes([alias, original], lambda meal: meal), [alias])

    def test_tied_scores_receive_consistent_training_labels(self):
        self.assertEqual(nutrition_training.relevance_labels([0.9, 0.7, 0.7, 0.2]), [1, 1, 1, 0])
        self.assertEqual(nutrition_training.relevance_labels([0.54, 0.54]), [0, 0])
        self.assertEqual(nutrition_training.relevance_labels([]), [])

    def test_common_allergy_aliases_are_blocked(self):
        cases = [("milk", ["dairy"]), ("wheat", ["gluten"]), ("egg", ["eggs"]),
                 ("peanut", ["peanuts"]), ("nuts", ["peanuts"]), ("soya", ["soy"])]
        for allergy, allergens in cases:
            self.assertTrue(nutrition.blocks_meal({"allergens": allergens}, [allergy], []))
        self.assertFalse(nutrition.blocks_meal({"allergens": ["dairy"]}, ["peanut"], []))

    def test_swaps_deduplicate_only_after_approval_filtering(self):
        lookup = {meal["id"]: meal for meal in self.meals}
        payload = {**self.payload, "profile": {"goal": "muscle_gain"}, "max_results": 100}
        swaps = nutrition.recommend_swaps(payload)["recommendations"]
        keys = [nutrition.recipe_signature(lookup[meal["id"]]) for meal in swaps]
        self.assertEqual(len(keys), len(set(keys)))
        alias_id = "usda_chicken_rice_broccoli_bowl"
        only_alias = {**payload, "approval_reviews": {alias_id: {"status": "approved"}}}
        self.assertEqual([meal["id"] for meal in nutrition.recommend_swaps(only_alias)["recommendations"]], [alias_id])

    def test_review_import_requires_real_filled_rows(self):
        import csv
        row = dict.fromkeys(FIELDS, "")
        row.update(scenario_id="review-test", meal_id=self.meals[0]["id"],
                   context_json=json.dumps({"profile": {"goal": "maintain"}, "fridge": [], "allergies": []}))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "reviews.csv"
            def write_row():
                with path.open("w", newline="", encoding="utf-8") as handle:
                    writer = csv.DictWriter(handle, fieldnames=FIELDS)
                    writer.writeheader()
                    writer.writerow(row)
            write_row()
            self.assertEqual(load_recommendation_reviews(path, {self.meals[0]["id"]}), [])
            row["rating"] = "5"
            write_row()
            with self.assertRaises(ValueError):
                load_recommendation_reviews(path, {self.meals[0]["id"]})
            row.update(reviewer="Test Reviewer", reviewed_at="2026-10-09")
            write_row()
            imported = load_recommendation_reviews(path, {self.meals[0]["id"]})
            self.assertEqual(imported[0]["ratings"][0]["rating"], 5)
            row["meal_id"] = "unknown-id"
            write_row()
            with self.assertRaises(ValueError):
                load_recommendation_reviews(path, {self.meals[0]["id"]})

    def test_export_traversal_and_feature_validation(self):
        model = {"feature_count": 1, "trees": [
            {"left": [1, -1, -1], "right": [2, -1, -1], "feature": [0, -2, -2],
             "threshold": [0.5, -2, -2], "value": [0, 0.2, 0.8]}]}
        self.assertAlmostEqual(predict_forest(model, [0.5]), 0.2)
        self.assertAlmostEqual(predict_forest(model, [0.6]), 0.8)
        for features in [[], [math.nan], [math.inf]]:
            with self.assertRaises(ValueError):
                predict_forest(model, features)

    def test_workout_contract_and_constraints(self):
        lookup = {item["id"]: item for item in workout.EXERCISES}
        for goal in ["build_muscle", "lose_weight", "running", "yoga_flexibility"]:
            for location in ["gym", "home", "outdoor"]:
                profile = {"goal": goal, "training_location": location,
                           "training_days_per_week": 3, "training_intensity": "moderate", "injuries": "knee pain"}
                plan = workout.generate_plan(profile)
                self.assertTrue(workout.validate_plan(plan))
                self.assertEqual(len(plan), 3)
                for day in plan:
                    self.assertIn("random_forest", day["model_type"])
                    for exercise in day["exercises"]:
                        self.assertTrue(workout.location_matches(lookup[exercise["id"]], location))
                        self.assertTrue(workout.is_exercise_safe(lookup[exercise["id"]], "knee pain"))
                        self.assertTrue(0 <= exercise["ai_score"] <= 99)

    def test_meal_plan_contract_and_filters(self):
        result = nutrition.generate_plan(self.payload)
        self.assertTrue(result["success"])
        self.assertEqual(len(result["plan"]), 28)
        lookup = {item["id"]: item for item in self.meals}
        context = nutrition.context_from_payload(self.payload)
        for meal in result["plan"]:
            self.assertTrue(meal["expert_approved"])
            self.assertFalse(nutrition.blocks_meal(lookup[meal["dataset_meal_id"]], context["allergies"], context["dislikes"]))
            for field in ["id", "name", "day", "type", "calories", "protein", "carbs", "fats", "ingredients", "image", "completed"]:
                self.assertIn(field, meal)
            original = lookup[meal["dataset_meal_id"]]
            self.assertAlmostEqual(meal["protein"], round(original["protein"] * meal["portion_factor"]), delta=1)

    def test_pending_meals_are_not_displayed(self):
        payload = {**self.payload, "approval_reviews": {}}
        self.assertFalse(nutrition.generate_plan(payload)["success"])
        self.assertEqual(nutrition.recommend_swaps(payload)["recommendations"], [])

    def test_swaps_and_replacement_contract(self):
        swaps = nutrition.recommend_swaps(self.payload)
        self.assertGreater(len(swaps["recommendations"]), 0)
        first = swaps["recommendations"][0]
        self.assertTrue(first["approval"]["manual"])
        plan = nutrition.generate_plan(self.payload)["plan"]
        target = next(meal for meal in plan if meal["type"] == "Lunch")
        result = nutrition.replace_meal({**self.payload, "target_meal": target, "hint": "use fridge ingredients"})
        self.assertTrue(result["success"])
        self.assertIn("replacement", result)
        self.assertIn("calories", result["replacement"])
        self.assertTrue(result["replacement"]["expert_approved"])
        self.assertFalse(result["replacement"]["model_approved"])

    def test_replacement_cannot_bypass_manual_approval(self):
        target = next(meal for meal in nutrition.generate_plan(self.payload)["plan"] if meal["type"] == "Lunch")
        approved = nutrition.replace_meal({**self.payload, "target_meal": target})["replacement"]
        for status in ["pending", "rejected", "needs_adjustment"]:
            payload = {**self.payload, "target_meal": target,
                       "approval_reviews": {meal["id"]: {"status": status} for meal in self.meals}}
            self.assertFalse(nutrition.replace_meal(payload)["success"])
            self.assertFalse(nutrition.replace_meal({**payload, "replacement": approved})["success"])

    def test_cli_response_stays_json_without_sklearn_runtime(self):
        result = subprocess.run([sys.executable, str(ROOT / "ml/workout_ai/traincore_model.py"),
                                 "--profile-json", json.dumps({"goal": "build_muscle", "training_location": "home"})],
                                capture_output=True, text=True, check=True)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["engine"], "python_traincore")
        self.assertTrue(workout.validate_plan(payload["plan"]))


if __name__ == "__main__":
    unittest.main()
