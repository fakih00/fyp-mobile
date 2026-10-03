#!/usr/bin/env python3
"""
Convert a Kaggle/public exercise CSV or JSON export into TrainCore's local
training dataset format.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "ml" / "workout_ai" / "datasets" / "traincore_exercise_dataset.json"


def clean(value: Any) -> str:
    return str(value or "").strip()


def first(row: Dict[str, Any], names: Iterable[str]) -> str:
    lowered = {str(key).lower().replace(" ", "_"): value for key, value in row.items()}
    for name in names:
        key = name.lower().replace(" ", "_")
        if clean(lowered.get(key)):
            return clean(lowered[key])
    return ""


def split_terms(value: str) -> List[str]:
    parts = value.replace("/", ",").replace("|", ",").replace(";", ",").split(",")
    return [part.strip().title() for part in parts if part.strip()]


def infer_location(equipment: str, name: str) -> List[str]:
    text = f"{equipment} {name}".lower()
    if any(term in text for term in ["body weight", "bodyweight", "none", "no equipment"]):
        return ["home", "outdoor", "gym"]
    if any(term in text for term in ["band", "dumbbell", "kettlebell", "mat"]):
        return ["home", "gym"]
    if any(term in text for term in ["run", "sprint", "jump rope", "swim", "cycling"]):
        return ["outdoor", "gym"]
    return ["gym"]


def infer_category(row: Dict[str, Any], name: str, body_part: str, equipment: str) -> str:
    text = " ".join([name, body_part, equipment, first(row, ["type", "category", "level"])]).lower()
    if any(term in text for term in ["stretch", "mobility", "yoga"]):
        return "mobility"
    if any(term in text for term in ["cardio", "run", "sprint", "bike", "swim", "rope"]):
        return "cardio"
    if any(term in text for term in ["plyo", "jump", "explosive"]):
        return "power"
    if any(term in text for term in ["rehab", "prehab", "rotator", "corrective"]):
        return "prehab"
    if any(term in text for term in ["barbell", "deadlift", "squat", "bench", "press"]):
        return "strength"
    if any(term in text for term in ["cable", "curl", "extension", "raise", "fly"]):
        return "accessory"
    return "base"


def load_rows(path: Path) -> List[Dict[str, Any]]:
    if path.suffix.lower() == ".json":
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            for key in ("exercises", "data", "rows"):
                if isinstance(payload.get(key), list):
                    return payload[key]
        if isinstance(payload, list):
            return payload
        return []

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def convert(rows: List[Dict[str, Any]], max_records: int) -> List[Dict[str, Any]]:
    exercises = []
    seen = set()
    for row in rows:
        name = first(row, ["name", "name_en", "exercise", "exercise_name", "title"])
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)

        body_part = first(row, ["body_part", "bodypart", "target", "target_muscle", "muscle_group", "primary_muscles"])
        secondary = first(row, ["secondary_muscles", "synergist", "muscles"])
        equipment = first(row, ["equipment", "equipment_required", "apparatus"])
        if isinstance(row.get("primary_muscles"), list):
            primary_muscles = [clean(item).replace("_", " ").title() for item in row.get("primary_muscles", []) if clean(item)]
        else:
            primary_muscles = split_terms(body_part.replace("_", " "))
        if isinstance(row.get("secondary_muscles"), list):
            secondary_muscles = [clean(item).replace("_", " ").title() for item in row.get("secondary_muscles", []) if clean(item)]
        else:
            secondary_muscles = split_terms(secondary.replace("_", " "))
        muscles = primary_muscles + [item for item in secondary_muscles if item not in primary_muscles]
        if not muscles:
            muscles = ["Full Body"]

        exercises.append({
            "id": f"k{len(exercises) + 1}",
            "name": name,
            "loc": infer_location(equipment, name),
            "muscles": muscles[:4],
            "cat": infer_category(row, name, body_part, equipment),
        })
        if len(exercises) >= max_records:
            break
    return exercises


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="Path to Kaggle/public exercise CSV or JSON file")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--source-name", default="Imported public exercise dataset")
    parser.add_argument("--source-url", default="")
    parser.add_argument("--max-records", type=int, default=220)
    args = parser.parse_args()

    source = Path(args.input)
    rows = load_rows(source)
    exercises = convert(rows, args.max_records)
    if not exercises:
        raise SystemExit("No valid exercise rows were imported.")

    payload = {
        "dataset_name": "TrainCore Exercise Dataset",
        "version": "1.0.0",
        "source_type": "kaggle_or_public_dataset_import",
        "primary_source": args.source_name,
        "source_url": args.source_url,
        "records": len(exercises),
        "fields": ["id", "name", "loc", "muscles", "cat"],
        "preprocessing": "CSV/JSON rows are deduplicated, normalized, mapped to TrainCore locations, target muscles, and exercise categories.",
        "labeling": "Training labels are generated locally from TrainCore expert-rule suitability scoring.",
        "exercises": exercises,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(output), "records": len(exercises)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
