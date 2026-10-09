"""Import explicit reviewer ratings; blank worksheet rows remain unlabeled."""

import csv
import json
from datetime import datetime
from pathlib import Path

REVIEW_PATH = Path(__file__).with_name("expert_validation") / "recommendation_reviews.csv"
FIELDS = ["scenario_id", "meal_id", "meal_name", "context_json", "calories", "protein", "carbs", "fats", "portion_factor", "ingredient_portions_json",
          "rating", "reviewer", "reviewed_at", "notes"]


def load_recommendation_reviews(path, meal_ids):
    if not path.exists():
        return []
    scenarios = {}
    seen = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not set(FIELDS).issubset(reader.fieldnames or []):
            raise ValueError("Reviewer CSV is missing required worksheet columns")
        for row in reader:
            if not row["rating"].strip():
                continue
            rating = int(row["rating"])
            if not 1 <= rating <= 5 or not row["reviewer"].strip() or not row["reviewed_at"].strip():
                raise ValueError("A reviewed row needs a rating 1-5, reviewer, and ISO review date")
            datetime.fromisoformat(row["reviewed_at"].replace("Z", "+00:00"))
            if row["meal_id"] not in meal_ids:
                raise ValueError(f"Unknown reviewed meal: {row['meal_id']}")
            context = json.loads(row["context_json"])
            if not isinstance(context.get("profile"), dict) or not context["profile"].get("goal"):
                raise ValueError("Reviewed scenario needs a profile with a goal")
            key = row["scenario_id"]
            if not key:
                raise ValueError("Reviewed scenario needs an ID")
            if key in scenarios and scenarios[key]["context"] != context:
                raise ValueError("Rows in one reviewer scenario must use the same context")
            pair = (key, row["meal_id"])
            if pair in seen:
                raise ValueError("Duplicate reviewed scenario/meal pair")
            seen[pair] = rating
            scenario = scenarios.setdefault(key, {"context": context, "ratings": []})
            scenario["ratings"].append({"meal_id": row["meal_id"], "rating": rating,
                                        "reviewer": row["reviewer"].strip(), "reviewed_at": row["reviewed_at"],
                                        "notes": row["notes"]})
    return list(scenarios.values())


def export_review_queue(path, meals, cases, feature_vector, score_rubric, prepare_meal, recipe_key=None):
    if path.exists():
        raise FileExistsError(f"Refusing to overwrite a reviewer worksheet: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    for index, case in enumerate(cases):
        context = {key: value for key, value in case.items() if key != "approved_meals"}
        for meal_type in ["Breakfast", "Lunch", "Dinner", "Snack"]:
            ranked = []
            for meal in meals:
                if meal["type"] != meal_type:
                    continue
                features = feature_vector(meal, case)
                if not features["blocked"]:
                    ranked.append((score_rubric(features), meal))
            ranked.sort(key=lambda item: (-item[0], item[1]["id"]))
            if recipe_key:
                distinct, seen = [], set()
                for item in ranked:
                    key = recipe_key(item[1])
                    if key not in seen:
                        distinct.append(item)
                        seen.add(key)
                ranked = distinct
            selected = ranked[:3] + ranked[len(ranked) // 2:len(ranked) // 2 + 1] + ranked[-1:]
            used = set()
            for _, meal in selected:
                if meal["id"] in used:
                    continue
                used.add(meal["id"])
                portion = prepare_meal(meal, case)
                rows.append({"scenario_id": f"review-{index + 1:03d}", "meal_id": meal["id"], "meal_name": meal["name"],
                             "context_json": json.dumps(context, separators=(",", ":")),
                             **{key: portion[key] for key in ["calories", "protein", "carbs", "fats", "portion_factor"]},
                             "ingredient_portions_json": json.dumps(portion["ingredientSources"], separators=(",", ":")),
                             "rating": "", "reviewer": "", "reviewed_at": "", "notes": ""})
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    return {"path": str(path), "candidate_rows": len(rows), "human_labels_created": 0}
