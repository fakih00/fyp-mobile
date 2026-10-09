import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ml.workout_ai.traincore_model import EXERCISES, generate_plan, validate_plan


class DominanceSelectionTests(unittest.TestCase):
    def plan(self, dominance="", injuries="none", location="gym"):
        result = generate_plan({
            "goal": "build_muscle",
            "training_location": location,
            "training_days_per_week": 3,
            "training_intensity": "moderate",
            "strong_side": dominance,
            "injuries": injuries,
        })
        self.assertTrue(validate_plan(result))
        return result

    def options(self, plan, label):
        return [(day, exercise) for day in plan for exercise in day["exercises"]
                if exercise["guide"].startswith(label)]

    def test_symmetric_selection_unchanged(self):
        baseline = self.plan()
        symmetric = self.plan("Upper Body: SYMMETRIC, Lower Body: SYMMETRIC")
        self.assertEqual([[e["id"] for e in d["exercises"]] for d in baseline],
                         [[e["id"] for e in d["exercises"]] for d in symmetric])
        self.assertFalse(self.options(symmetric, "Single-"))

    def test_upper_dominance_prefers_arm_option_on_both_sides(self):
        for side in ["LEFT", "RIGHT"]:
            result = self.plan(f"Upper Body: {side}, Lower Body: SYMMETRIC")
            options = self.options(result, "Single-arm")
            self.assertTrue(options)
            self.assertFalse(self.options(result, "Single-leg"))
            for day, exercise in options:
                self.assertIn("Pull", day["focus"])
                self.assertEqual(exercise["sets"], 3)
                self.assertEqual(exercise["reps"], "10-12")
                self.assertIn("same rep target on each side", exercise["guide"])

    def test_lower_dominance_prefers_leg_option(self):
        result = self.plan("Upper Body: SYMMETRIC, Lower Body: RIGHT")
        options = self.options(result, "Single-leg")
        self.assertTrue(options)
        self.assertFalse(self.options(result, "Single-arm"))
        self.assertTrue(all("Legs" in day["focus"] for day, _ in options))

    def test_injury_exclusions_override_dominance(self):
        result = self.plan("Upper Body: LEFT, Lower Body: RIGHT", "arms_left,legs_right")
        self.assertFalse(self.options(result, "Single-"))
        lookup = {e["id"]: e for e in EXERCISES}
        blocked = ["arm", "bicep", "tricep", "forearm", "quad", "hamstring", "glute", "leg", "knee", "hip"]
        for day in result:
            for exercise in day["exercises"]:
                muscles = lookup[exercise["id"]]["muscles"]
                self.assertFalse(any(term in muscle.lower() for muscle in muscles for term in blocked))

    def test_location_restrictions_still_apply(self):
        result = self.plan("Upper Body: RIGHT, Lower Body: LEFT", location="home")
        lookup = {e["id"]: e for e in EXERCISES}
        self.assertTrue(all("home" in lookup[e["id"]]["loc"] for d in result for e in d["exercises"]))


if __name__ == "__main__":
    unittest.main()
