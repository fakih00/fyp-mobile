#!/usr/bin/env python3
"""
TrainCore AI workout recommendation model.

This is the Python-owned custom workout AI path. The PHP backend calls this
module for inference, while training/validation also runs here.
"""

from __future__ import annotations

import argparse
import base64
import json
import math
import random
import re
import sys
import zlib
from dataclasses import dataclass
from functools import lru_cache
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml"))
from random_forest import predict_forest, train_forest
ARTIFACT_PATH = ROOT / "ml" / "workout_ai" / "traincore_trained_model.json"
DATASET_PATH = ROOT / "ml" / "workout_ai" / "datasets" / "traincore_exercise_dataset.json"

MODEL_NAME = "TrainCore AI"
MODEL_VERSION = "2.0.0"
FOREST_MODEL_CACHE = None
FEATURE_SCHEMA_CACHE = None
DATASET_METADATA = {}

WEIGHTS = {
    "goal_fit": 32,
    "focus_fit": 26,
    "location_fit": 18,
    "safety_fit": 20,
    "intensity_fit": 14,
    "expert_score": 10,
    "variety": 4,
}

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAY_MAP = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 3, 4, 6],
    6: [0, 1, 2, 4, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
}

GOAL_SPLITS = {
    "lose_weight": ["HIIT & Fat Burn", "Cardio & Core", "Full Body Circuit", "Metabolic Conditioning", "Cardio Endurance", "Core & Burn"],
    "build_muscle": ["Push (Chest/Delts)", "Pull (Back/Biceps)", "Legs (Lower Body 1)", "Upper Body Power", "Legs (Lower Body 2)", "Core & HIIT"],
    "keep_fit": ["Full Body (A)", "Cardio & Mobility", "Full Body (B)", "Core & Flexibility", "Full Body (C)", "Active Recovery"],
    "gain_weight": ["Push Power", "Pull Hypertrophy", "Leg Mass", "Upper Body Volume", "Compound Power", "Full Body Bulk"],
    "running": ["Long Endurance Run", "Speed Intervals", "Strength (Run Support)", "Tempo Run", "Hill Sprints", "Recovery Mobility"],
    "boxing": ["Explosive HIIT", "Heavy Bag & Core", "Footwork & Agility", "Upper Body Power", "Conditioning Circuit", "Shadow & Speed"],
    "swimming": ["Pull Strength", "Core Rotation", "Kick Power", "Dryland Full Body", "Flexibility & Mobility", "Explosive Dryland"],
    "cycling": ["Leg Power", "Spin Intervals", "Hip Hinge & Glutes", "Core Stability", "Cyclist Endurance", "Full Body Maintenance"],
    "martial_arts": ["Explosive Plyometrics", "Grappling Strength", "Flexibility & Mobility", "Core Power", "Agility & Reaction", "Conditioning"],
    "yoga_flexibility": ["Active Flexibility", "Mobility Flow", "Strength & Balance", "Hip Openers", "Core & Breathwork", "Full Body Yoga"],
    "gain_muscle": ["Push (Chest/Delts)", "Pull (Back/Biceps)", "Legs (Lower Body 1)", "Upper Body Power", "Legs (Lower Body 2)", "Core & HIIT"],
    "maintain": ["Full Body (A)", "Cardio & Mobility", "Full Body (B)", "Core & Flexibility", "Full Body (C)", "Active Recovery"],
    "improve_stamina": ["HIIT & Cardio", "Endurance Run", "Circuit Training", "Cardio & Core", "Interval Training", "Active Recovery"],
}

GOAL_PROFILES = {
    "lose_weight": {"categories": ["hiit", "cardio", "stamina", "compound", "base"], "muscles": ["full body", "heart", "legs", "core"]},
    "gain_muscle": {"categories": ["strength", "volume", "accessory", "compound", "power"], "muscles": ["chest", "back", "shoulders", "quads", "glutes", "hamstrings", "biceps", "triceps"]},
    "build_muscle": {"categories": ["strength", "volume", "accessory", "compound", "power"], "muscles": ["chest", "back", "shoulders", "quads", "glutes", "hamstrings", "biceps", "triceps"]},
    "gain_weight": {"categories": ["strength", "power", "compound", "volume"], "muscles": ["chest", "back", "quads", "glutes", "hamstrings", "shoulders"]},
    "running": {"categories": ["stamina", "hiit", "prehab", "mobility", "strength"], "muscles": ["heart", "legs", "glutes", "hamstrings", "calves", "hips", "core"]},
    "boxing": {"categories": ["hiit", "skill", "power", "cardio", "core"], "muscles": ["shoulders", "core", "cardio", "footwork", "full body"]},
    "swimming": {"categories": ["strength", "prehab", "mobility", "stamina"], "muscles": ["lats", "back", "shoulders", "rotator cuff", "core", "hips"]},
    "cycling": {"categories": ["stamina", "hiit", "strength", "prehab"], "muscles": ["quads", "glutes", "hamstrings", "heart", "core"]},
    "martial_arts": {"categories": ["power", "skill", "mobility", "hiit", "strength"], "muscles": ["full body", "core", "hips", "grip", "shoulders"]},
    "yoga_flexibility": {"categories": ["mobility", "isometric", "prehab", "base"], "muscles": ["mobility", "hips", "core", "balance", "breathing"]},
    "maintain": {"categories": ["base", "strength", "mobility", "stamina"], "muscles": ["full body", "core", "heart"]},
    "keep_fit": {"categories": ["base", "strength", "mobility", "stamina"], "muscles": ["full body", "core", "heart"]},
}

EXPERT_CATEGORY_SCORE = {
    "compound": 0.98,
    "strength": 0.95,
    "power": 0.93,
    "prehab": 0.92,
    "mobility": 0.90,
    "base": 0.88,
    "stamina": 0.87,
    "hiit": 0.86,
    "volume": 0.84,
    "accessory": 0.82,
    "isometric": 0.80,
    "skill": 0.78,
    "cardio": 0.76,
}

def load_exercise_dataset() -> List[Dict[str, Any]]:
    global DATASET_METADATA
    if not DATASET_PATH.exists():
        return []
    try:
        payload = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    if isinstance(payload, dict):
        DATASET_METADATA = {key: value for key, value in payload.items() if key != "exercises"}
        exercises = payload.get("exercises", [])
    else:
        DATASET_METADATA = {"dataset_name": "TrainCore Exercise Dataset", "source_type": "legacy_list"}
        exercises = payload
    if not isinstance(exercises, list):
        return []
    required = {"id", "name", "loc", "muscles", "cat"}
    clean = []
    for exercise in exercises:
        if isinstance(exercise, dict) and required.issubset(exercise.keys()):
            clean.append(exercise)
    return clean


FALLBACK_EXERCISES = [
    {"id": "g1", "name": "Barbell Bench Press", "loc": ["gym"], "muscles": ["Chest", "Triceps"], "cat": "strength"},
    {"id": "g2", "name": "Incline DB Press", "loc": ["gym"], "muscles": ["Upper Chest"], "cat": "strength"},
    {"id": "g3", "name": "Conventional Deadlift", "loc": ["gym"], "muscles": ["Back", "Hamstrings", "Glutes"], "cat": "power"},
    {"id": "g4", "name": "Overhead Press", "loc": ["gym"], "muscles": ["Shoulders", "Triceps"], "cat": "strength"},
    {"id": "g5", "name": "Back Squats (Barbell)", "loc": ["gym"], "muscles": ["Quads", "Glutes"], "cat": "strength"},
    {"id": "g6", "name": "Weighted Pull-Ups", "loc": ["gym", "outdoor"], "muscles": ["Lats", "Biceps"], "cat": "strength"},
    {"id": "g7", "name": "Barbell Rows", "loc": ["gym"], "muscles": ["Mid Back", "Biceps"], "cat": "strength"},
    {"id": "g8", "name": "Leg Press", "loc": ["gym"], "muscles": ["Quads", "Glutes"], "cat": "volume"},
    {"id": "g9", "name": "Dips (Chest Focus)", "loc": ["gym", "outdoor"], "muscles": ["Chest", "Triceps"], "cat": "strength"},
    {"id": "g10", "name": "T-Bar Rows", "loc": ["gym"], "muscles": ["Mid Back"], "cat": "strength"},
    {"id": "a1", "name": "Cable Flys", "loc": ["gym"], "muscles": ["Chest"], "cat": "accessory"},
    {"id": "a2", "name": "Lateral Raises (DB)", "loc": ["gym", "home"], "muscles": ["Side Delts"], "cat": "accessory"},
    {"id": "a3", "name": "Face Pulls", "loc": ["gym"], "muscles": ["Rear Delts", "Upper Back"], "cat": "prehab"},
    {"id": "a4", "name": "Leg Extensions", "loc": ["gym"], "muscles": ["Quads"], "cat": "accessory"},
    {"id": "a5", "name": "Lying Leg Curls", "loc": ["gym"], "muscles": ["Hamstrings"], "cat": "accessory"},
    {"id": "a6", "name": "Preacher Curls", "loc": ["gym"], "muscles": ["Biceps"], "cat": "accessory"},
    {"id": "a7", "name": "Skull Crushers", "loc": ["gym"], "muscles": ["Triceps"], "cat": "accessory"},
    {"id": "a8", "name": "Hammer Curls", "loc": ["gym", "home"], "muscles": ["Biceps", "Forearms"], "cat": "accessory"},
    {"id": "a9", "name": "Calf Raises (Seated)", "loc": ["gym"], "muscles": ["Calves"], "cat": "accessory"},
    {"id": "a10", "name": "Pec Deck Flys", "loc": ["gym"], "muscles": ["Chest"], "cat": "accessory"},
    {"id": "h1", "name": "Standard Push Ups", "loc": ["home", "outdoor", "gym"], "muscles": ["Chest", "Triceps"], "cat": "base"},
    {"id": "h2", "name": "Diamond Push Ups", "loc": ["home", "outdoor"], "muscles": ["Triceps"], "cat": "strength"},
    {"id": "h3", "name": "Archer Push Ups", "loc": ["home", "outdoor"], "muscles": ["Chest", "Stability"], "cat": "expert"},
    {"id": "h4", "name": "Pike Push Ups", "loc": ["home", "outdoor"], "muscles": ["Shoulders"], "cat": "strength"},
    {"id": "h5", "name": "Bodyweight Squats", "loc": ["home", "outdoor", "gym"], "muscles": ["Quads", "Glutes"], "cat": "base"},
    {"id": "h6", "name": "Bulgarian Split Squats", "loc": ["home", "outdoor", "gym"], "muscles": ["Quads", "Glutes"], "cat": "strength"},
    {"id": "h7", "name": "Single Leg Glute Bridge", "loc": ["home", "outdoor"], "muscles": ["Glutes", "Lower Back"], "cat": "base"},
    {"id": "h8", "name": "Chin Ups (Strict)", "loc": ["outdoor", "gym"], "muscles": ["Biceps", "Lats"], "cat": "strength"},
    {"id": "h9", "name": "Australian Pull Ups", "loc": ["outdoor"], "muscles": ["Mid Back"], "cat": "base"},
    {"id": "h10", "name": "Chair Dips", "loc": ["home"], "muscles": ["Triceps"], "cat": "base"},
    {"id": "c1", "name": "Hollow Body Hold", "loc": ["home", "gym", "outdoor"], "muscles": ["Core"], "cat": "isometric"},
    {"id": "c2", "name": "Bicycle Crunches", "loc": ["home", "outdoor", "gym"], "muscles": ["Obliques"], "cat": "volume"},
    {"id": "c3", "name": "Leg Raises (Hanging)", "loc": ["gym", "outdoor"], "muscles": ["Lower Abs"], "cat": "strength"},
    {"id": "c4", "name": "Russian Twists", "loc": ["home", "gym"], "muscles": ["Obliques"], "cat": "volume"},
    {"id": "c5", "name": "Plank with Shoulder Taps", "loc": ["home", "outdoor"], "muscles": ["Core", "Shoulders"], "cat": "functional"},
    {"id": "c6", "name": "Bird Dog", "loc": ["home", "gym"], "muscles": ["Spinal Stability"], "cat": "prehab"},
    {"id": "c7", "name": "Dead Bug", "loc": ["home", "gym"], "muscles": ["Deep Core"], "cat": "prehab"},
    {"id": "c8", "name": "Mountain Climbers", "loc": ["home", "outdoor"], "muscles": ["Full Body", "Cardio"], "cat": "cardio"},
    {"id": "c9", "name": "Burpees", "loc": ["home", "outdoor"], "muscles": ["Full Body", "Explosive"], "cat": "cardio"},
    {"id": "c10", "name": "V-Ups", "loc": ["home", "gym"], "muscles": ["Abs"], "cat": "strength"},
    {"id": "e1", "name": "Treadmill Sprint Intervals", "loc": ["gym"], "muscles": ["Heart", "Legs"], "cat": "hiit"},
    {"id": "e2", "name": "Rowing Machine (500m)", "loc": ["gym"], "muscles": ["Full Body"], "cat": "stamina"},
    {"id": "e3", "name": "Battle Ropes", "loc": ["gym"], "muscles": ["Shoulders", "Core"], "cat": "hiit"},
    {"id": "e4", "name": "Box Jumps", "loc": ["gym", "outdoor"], "muscles": ["Quads", "CNS"], "cat": "plyo"},
    {"id": "e5", "name": "Swimming Laps", "loc": ["outdoor"], "muscles": ["Full Body"], "cat": "stamina"},
    {"id": "e6", "name": "Kettlebell Swings", "loc": ["gym", "home"], "muscles": ["Glutes", "Hamstrings", "Heart"], "cat": "hiit"},
    {"id": "e7", "name": "Jump Rope", "loc": ["home", "outdoor"], "muscles": ["Calves", "Cardio"], "cat": "cardio"},
    {"id": "e8", "name": "Thrusters (Dumbbell)", "loc": ["gym", "home"], "muscles": ["Full Body"], "cat": "compound"},
    {"id": "e9", "name": "Bear Crawls", "loc": ["outdoor", "home"], "muscles": ["Shoulders", "Core"], "cat": "mobility"},
    {"id": "e10", "name": "Sandbag Carries", "loc": ["outdoor", "gym"], "muscles": ["Grip", "Total Body"], "cat": "power"},
    {"id": "m1", "name": "Hip Flexor Mobility Flow", "loc": ["home", "gym", "outdoor"], "muscles": ["Hips", "Mobility"], "cat": "mobility"},
    {"id": "m2", "name": "World's Greatest Stretch", "loc": ["home", "gym", "outdoor"], "muscles": ["Hips", "Thoracic", "Hamstrings"], "cat": "mobility"},
    {"id": "m3", "name": "Thoracic Open Books", "loc": ["home", "gym"], "muscles": ["Thoracic", "Shoulders"], "cat": "mobility"},
    {"id": "m4", "name": "Band Pull Aparts", "loc": ["home", "gym"], "muscles": ["Rear Delts", "Upper Back"], "cat": "prehab"},
    {"id": "m5", "name": "Scapular Wall Slides", "loc": ["home", "gym"], "muscles": ["Shoulders", "Upper Back"], "cat": "prehab"},
    {"id": "m6", "name": "Copenhagen Side Plank", "loc": ["home", "gym"], "muscles": ["Adductors", "Core"], "cat": "strength"},
    {"id": "m7", "name": "Pallof Press", "loc": ["gym", "home"], "muscles": ["Core", "Obliques"], "cat": "prehab"},
    {"id": "m8", "name": "Farmer Carries", "loc": ["gym", "outdoor", "home"], "muscles": ["Grip", "Core", "Traps"], "cat": "power"},
    {"id": "m9", "name": "Sled Push", "loc": ["gym", "outdoor"], "muscles": ["Quads", "Glutes", "Heart"], "cat": "power"},
    {"id": "m10", "name": "Medicine Ball Slams", "loc": ["gym", "outdoor"], "muscles": ["Full Body", "Core"], "cat": "power"},
    {"id": "m11", "name": "Shadow Boxing Rounds", "loc": ["home", "gym", "outdoor"], "muscles": ["Shoulders", "Core", "Cardio"], "cat": "skill"},
    {"id": "m12", "name": "Agility Ladder Drills", "loc": ["gym", "outdoor"], "muscles": ["Footwork", "Cardio"], "cat": "skill"},
    {"id": "m13", "name": "Tempo Run", "loc": ["outdoor", "gym"], "muscles": ["Heart", "Legs"], "cat": "stamina"},
    {"id": "m14", "name": "Hill Sprint Repeats", "loc": ["outdoor"], "muscles": ["Glutes", "Hamstrings", "Heart"], "cat": "hiit"},
    {"id": "m15", "name": "Stationary Bike Intervals", "loc": ["gym", "home"], "muscles": ["Quads", "Heart"], "cat": "hiit"},
    {"id": "m16", "name": "Flutter Kicks", "loc": ["home", "gym", "outdoor"], "muscles": ["Core", "Hip Flexors"], "cat": "volume"},
    {"id": "m17", "name": "Resistance Band Rows", "loc": ["home", "gym"], "muscles": ["Back", "Biceps"], "cat": "strength"},
    {"id": "m18", "name": "Band External Rotations", "loc": ["home", "gym"], "muscles": ["Rotator Cuff", "Shoulders"], "cat": "prehab"},
    {"id": "m19", "name": "Single-Leg Romanian Deadlift", "loc": ["home", "gym"], "muscles": ["Hamstrings", "Glutes", "Balance"], "cat": "strength"},
    {"id": "m20", "name": "Step-Ups", "loc": ["home", "gym", "outdoor"], "muscles": ["Quads", "Glutes"], "cat": "strength"},
    {"id": "m21", "name": "Wall Sit", "loc": ["home", "gym"], "muscles": ["Quads"], "cat": "isometric"},
    {"id": "m22", "name": "Yoga Sun Salutation Flow", "loc": ["home", "studio", "outdoor"], "muscles": ["Full Body", "Mobility"], "cat": "mobility"},
    {"id": "m23", "name": "Warrior Balance Sequence", "loc": ["home", "studio", "outdoor"], "muscles": ["Balance", "Hips", "Core"], "cat": "mobility"},
    {"id": "m24", "name": "Box Breathing Core Hold", "loc": ["home", "studio", "gym"], "muscles": ["Core", "Breathing"], "cat": "isometric"},
    {"id": "m25", "name": "Cable Woodchoppers", "loc": ["gym"], "muscles": ["Obliques", "Core"], "cat": "strength"},
    {"id": "m26", "name": "Landmine Rotations", "loc": ["gym"], "muscles": ["Core", "Shoulders"], "cat": "power"},
    {"id": "m27", "name": "Reverse Sled Drag", "loc": ["gym", "outdoor"], "muscles": ["Quads", "Knees"], "cat": "prehab"},
    {"id": "m28", "name": "Seated Cable Row", "loc": ["gym"], "muscles": ["Back", "Biceps"], "cat": "strength"},
    {"id": "m29", "name": "Goblet Squat", "loc": ["home", "gym"], "muscles": ["Quads", "Glutes", "Core"], "cat": "strength"},
    {"id": "m30", "name": "Incline Walking Intervals", "loc": ["gym", "outdoor"], "muscles": ["Heart", "Legs"], "cat": "stamina"},
]

EXERCISES = load_exercise_dataset() or FALLBACK_EXERCISES


@dataclass(frozen=True)
class IntensityParams:
    sets: int
    reps: str
    rest: str
    difficulty: str
    intensity_score: int
    description: str


def model_card() -> Dict[str, Any]:
    return {
        "name": MODEL_NAME,
        "version": MODEL_VERSION,
        "type": "Python local Random Forest workout recommendation model",
        "primary_inputs": [
            "goal",
            "training_days_per_week",
            "training_location",
            "training_intensity",
            "injuries",
            "pain_points",
            "posture_problems",
            "mobility_limitations",
            "target_weight",
            "current_weight",
        ],
        "dataset_size": len(EXERCISES),
        "dataset_name": DATASET_METADATA.get("dataset_name", "TrainCore Exercise Dataset"),
        "dataset_file": str(DATASET_PATH.relative_to(ROOT)).replace("\\", "/"),
        "dataset_source_type": DATASET_METADATA.get("source_type", "project_curated"),
        "dataset_primary_source": DATASET_METADATA.get("primary_source", "Project-curated exercise records"),
        "dataset_source_url": DATASET_METADATA.get("source_url"),
        "public_reference_sources": DATASET_METADATA.get("public_reference_sources", []),
        "weights": WEIGHTS,
        "training_method": "A Random Forest regressor is trained from expert-rule labels over profile/exercise pairs with held-out profile validation; hard injury and location filters remain outside the model",
        "external_generation_api": False,
    }


def normalize_location(location: str) -> str:
    location = (location or "gym").strip().lower()
    return {
        "pool": "outdoor",
        "open_water": "outdoor",
        "dryland": "home",
    }.get(location, location)


def location_matches(exercise: Dict[str, Any], location: str) -> bool:
    locs = exercise.get("loc", [])
    if location in locs:
        return True
    if location == "studio" and "home" in locs:
        return True
    return False


def contains_any(values: Iterable[str], needles: Iterable[str]) -> bool:
    haystack = [str(value).lower() for value in values]
    for value in haystack:
        for needle in needles:
            needle = str(needle).lower()
            if needle and needle in value:
                return True
    return False


def is_exercise_safe(exercise: Dict[str, Any], injuries: str | None) -> bool:
    if not injuries or str(injuries).strip().lower() in {"", "none", "no", "n/a"}:
        return True
    lower = str(injuries).lower()
    muscles = [str(item).lower() for item in exercise.get("muscles", [])]

    blocked = []
    if "shoulder" in lower or "chest" in lower:
        blocked += ["shoulder", "chest", "delt", "tricep", "rotator cuff"]
    if "knee" in lower or "leg" in lower or "hip" in lower:
        blocked += ["quad", "hamstring", "glute", "leg", "knee", "hip"]
    if "back" in lower:
        blocked += ["back", "lat", "spinal", "lower back"]
    if "elbow" in lower or "arm" in lower:
        blocked += ["arm", "bicep", "tricep", "forearm"]
    if "ankle" in lower:
        blocked += ["calf", "ankle"]

    return not contains_any(muscles, blocked)


def focus_targets(focus: str) -> List[str]:
    focus = (focus or "").lower()
    mapping = {
        "push": ["chest", "triceps", "shoulders", "upper chest", "side delts"],
        "pull": ["back", "biceps", "lats", "mid back", "rear delts"],
        "leg": ["quads", "glutes", "hamstrings", "calves", "legs"],
        "core": ["core", "abs", "obliques", "deep core"],
        "hiit": ["heart", "cardio", "full body"],
        "cardio": ["heart", "cardio", "legs"],
        "run": ["heart", "legs", "glutes", "hamstrings", "calves"],
        "speed": ["heart", "legs", "footwork"],
        "boxing": ["shoulders", "core", "cardio", "footwork"],
        "swim": ["lats", "back", "shoulders", "rotator cuff"],
        "pull strength": ["lats", "back", "shoulders"],
        "cycling": ["quads", "glutes", "heart"],
        "mobility": ["mobility", "hips", "thoracic", "shoulders"],
        "flexibility": ["mobility", "hips", "hamstrings", "balance"],
        "balance": ["balance", "core", "hips"],
    }
    targets: List[str] = []
    for needle, items in mapping.items():
        if needle in focus:
            targets.extend(items)
    return sorted(set(targets))


def expert_score(category: str) -> float:
    return EXPERT_CATEGORY_SCORE.get((category or "").lower(), 0.75)


def movement_family(exercise: Dict[str, Any]) -> str:
    muscles = [str(item).lower() for item in exercise.get("muscles", [])]
    category = str(exercise.get("cat", "")).lower()
    if contains_any(muscles, ["chest", "triceps", "shoulders"]):
        return "push"
    if contains_any(muscles, ["back", "biceps", "lats", "rear delts"]):
        return "pull"
    if contains_any(muscles, ["quads", "glutes", "hamstrings", "calves", "legs"]):
        return "lower"
    if contains_any(muscles, ["core", "abs", "obliques"]):
        return "core"
    if category in {"hiit", "cardio", "stamina", "skill"}:
        return "conditioning"
    if category in {"mobility", "prehab", "isometric"}:
        return "mobility"
    return "general"


def exercise_matches_focus(exercise: Dict[str, Any], focus: str) -> bool:
    targets = focus_targets(focus)
    if not targets:
        return True
    muscles = [str(item).lower() for item in exercise.get("muscles", [])]
    category = str(exercise.get("cat", "base")).lower()
    return contains_any(muscles, targets) or category in targets


def traincore_feature_schema() -> Dict[str, List[str]]:
    global FEATURE_SCHEMA_CACHE
    if FEATURE_SCHEMA_CACHE is not None:
        return FEATURE_SCHEMA_CACHE
    FEATURE_SCHEMA_CACHE = {
        "goals": sorted(GOAL_PROFILES.keys()),
        "locations": ["gym", "home", "outdoor", "studio"],
        "intensities": ["light", "moderate", "heavy"],
        "categories": sorted({str(ex.get("cat", "base")).lower() for ex in EXERCISES}),
        "families": ["push", "pull", "lower", "core", "conditioning", "mobility", "general"],
    }
    return FEATURE_SCHEMA_CACHE


def one_hot(value: str, choices: List[str]) -> List[float]:
    return [1.0 if value == choice else 0.0 for choice in choices]


def forest_features(exercise: Dict[str, Any], goal: str, focus: str, location: str, intensity: str, frequency: int) -> List[float]:
    schema = traincore_feature_schema()
    category = str(exercise.get("cat", "base")).lower()
    family = movement_family(exercise)
    goal_profile = GOAL_PROFILES.get(goal, {"categories": [], "muscles": []})
    muscles = [str(item).lower() for item in exercise.get("muscles", [])]
    goal_muscle_hits = sum(1 for target in goal_profile.get("muscles", []) if contains_any(muscles, [target]))
    goal_muscle_fit = goal_muscle_hits / max(len(goal_profile.get("muscles", [])), 1)
    goal_category_fit = 1.0 if category in [item.lower() for item in goal_profile.get("categories", [])] else 0.0

    return (
        one_hot(goal, schema["goals"])
        + one_hot(location, schema["locations"])
        + one_hot(intensity, schema["intensities"])
        + one_hot(category, schema["categories"])
        + one_hot(family, schema["families"])
        + [
            min(max(frequency, 1), 7) / 7,
            1.0 if location_matches(exercise, location) else 0.0,
            1.0 if exercise_matches_focus(exercise, focus) else 0.0,
            goal_category_fit,
            goal_muscle_fit,
            expert_score(category),
            1.0 if focus_targets(focus) else 0.0,
        ]
    )


def load_forest_model() -> Dict[str, Any] | None:
    global FOREST_MODEL_CACHE
    if FOREST_MODEL_CACHE is not None:
        return FOREST_MODEL_CACHE
    if not ARTIFACT_PATH.exists():
        raise RuntimeError("TrainCore Random Forest missing; run npm run train:workout-ai")
    artifact = json.loads(ARTIFACT_PATH.read_text(encoding="utf-8"))
    model = artifact.get("random_forest")
    if not isinstance(model, dict) or not model.get("trees"):
        raise RuntimeError("TrainCore Random Forest missing; run npm run train:workout-ai")
    if model.get("feature_schema") != traincore_feature_schema():
        raise RuntimeError("TrainCore dataset schema changed; retrain the Random Forest")
    FOREST_MODEL_CACHE = model
    return model


@lru_cache(maxsize=65536)
def predict_workout_features(features: tuple) -> float:
    return predict_forest(load_forest_model(), features)


def forest_score_exercise(exercise: Dict[str, Any], goal: str, focus: str, location: str, intensity: str, frequency: int) -> float | None:
    model = load_forest_model()
    if not model:
        return None
    features = forest_features(exercise, goal, focus, location, intensity, frequency)
    return round(max(0.0, min(99.0, predict_workout_features(tuple(features)) * 99)), 4)


def expert_rule_score_exercise(exercise: Dict[str, Any], goal: str, focus: str, location: str, intensity: str, frequency: int, day_index: int) -> float:
    goal_profile = GOAL_PROFILES.get(goal, {"categories": ["base", "strength", "mobility", "stamina"], "muscles": ["full body", "core"]})
    targets = focus_targets(focus)
    muscles = [str(item).lower() for item in exercise.get("muscles", [])]
    category = str(exercise.get("cat", "base")).lower()
    score = 0.0
    focus_match = exercise_matches_focus(exercise, focus)

    if location_matches(exercise, location):
        score += WEIGHTS["location_fit"]

    if category in [item.lower() for item in goal_profile["categories"]]:
        score += WEIGHTS["goal_fit"]

    for target in goal_profile["muscles"]:
        if contains_any(muscles, [target]):
            score += WEIGHTS["goal_fit"] * 0.35

    if targets:
        if focus_match:
            score += WEIGHTS["focus_fit"]
        else:
            score -= WEIGHTS["focus_fit"] * 0.95
    else:
        score += WEIGHTS["focus_fit"] * 0.45

    if intensity == "heavy" and category in {"strength", "power", "compound"}:
        score += WEIGHTS["intensity_fit"]
    elif intensity == "light" and category in {"base", "mobility", "prehab", "isometric"}:
        score += WEIGHTS["intensity_fit"]
    elif intensity == "moderate":
        score += WEIGHTS["intensity_fit"] * 0.65

    if frequency >= 5 and category in {"accessory", "volume", "prehab"}:
        score += 4
    elif frequency <= 2 and category in {"compound", "strength", "power", "base"}:
        score += 4

    score += expert_score(category) * WEIGHTS["expert_score"]
    seed = zlib.crc32(f"{goal}|{focus}|{location}|{intensity}|{frequency}|{day_index}|{exercise['id']}".encode("utf-8"))
    score += ((seed % 100) / 100) * WEIGHTS["variety"]
    return round(max(0.0, min(99.0, score)), 4)


def score_exercise(exercise: Dict[str, Any], goal: str, focus: str, location: str, intensity: str, frequency: int, day_index: int) -> float:
    forest_score = forest_score_exercise(exercise, goal, focus, location, intensity, frequency)
    if forest_score is not None:
        seed = zlib.crc32(f"{goal}|{focus}|{location}|{intensity}|{frequency}|{day_index}|{exercise['id']}".encode("utf-8"))
        return round(max(0.0, min(99.0, forest_score + ((seed % 100) / 100) * 1.5)), 4)
    return expert_rule_score_exercise(exercise, goal, focus, location, intensity, frequency, day_index)


def intensity_params(intensity: str) -> IntensityParams:
    if intensity == "heavy":
        return IntensityParams(4, "5-8", "120s", "Elite", 9, "high load, long recovery")
    if intensity == "light":
        return IntensityParams(2, "15-20", "30s", "Beginner", 5, "low load, high metabolic stress")
    return IntensityParams(3, "10-12", "60s", "Intermediate", 7, "standard hypertrophy parameters")


def build_exercise_guide(exercise: Dict[str, Any], focus: str, score: float) -> str:
    muscles = ", ".join(exercise.get("muscles", []))
    return f"{MODEL_NAME} selected this for {focus}. Match score {round(score)}%. Focus on {muscles} and keep controlled form."


def dominance_variation(exercise: Dict[str, Any], profile: Dict[str, Any]) -> str | None:
    dominance = str(profile.get("strong_side") or "").lower()
    upper = re.search(r"upper body:\s*(left|right)\b", dominance)
    lower = re.search(r"lower body:\s*(left|right)\b", dominance)
    name = exercise["name"].lower()
    upper_options = {
        "bent-over dumbbell row",
        "chest-supported dumbbell row",
        "dumbbell bicep curl",
        "dumbbell reverse curl",
    }
    lower_options = {
        "bodyweight reverse lunge",
        "bulgarian split squat",
        "dumbbell lunge",
        "dumbbell kickstand deadlift",
    }
    if upper and name in upper_options:
        return "Single-arm option: work one arm at a time, using the same rep target on each side."
    if lower and name in lower_options:
        return "Single-leg option: work each side separately, using the same rep target on each side."
    return None


def generate_workout_day(profile: Dict[str, Any], index: int, location: str, frequency: int) -> Dict[str, Any]:
    goal = str(profile.get("goal") or "maintain")
    intensity = str(profile.get("training_intensity") or "moderate")
    injuries = str(profile.get("injuries") or "none")
    splits = GOAL_SPLITS.get(goal, ["Full Body (A)", "Full Body (B)", "Full Body (C)"])
    focus = splits[index % len(splits)]
    params = intensity_params(intensity)

    ranked = []
    for exercise in EXERCISES:
        if not location_matches(exercise, location):
            continue
        if not is_exercise_safe(exercise, injuries):
            continue
        ranked.append({
            "exercise": exercise,
            "score": score_exercise(exercise, goal, focus, location, intensity, frequency, index),
        })
    ranked.sort(key=lambda item: item["score"], reverse=True)

    selected = []
    used_families = set()
    target_count = 6 if frequency >= 5 else 5
    preferred_ranked = [item for item in ranked if exercise_matches_focus(item["exercise"], focus)]
    fallback_ranked = [item for item in ranked if not exercise_matches_focus(item["exercise"], focus)]

    # Prefer one matching unilateral option after injury and location exclusions.
    unilateral = next((item for item in preferred_ranked if dominance_variation(item["exercise"], profile)), None)
    if unilateral:
        preferred_ranked = [unilateral] + [item for item in preferred_ranked if item is not unilateral]

    for candidate in preferred_ranked:
        exercise = candidate["exercise"]
        family = movement_family(exercise)
        if family in used_families and len(selected) < 3:
            continue
        selected.append({
            "id": exercise["id"],
            "name": exercise["name"],
            "sets": params.sets,
            "reps": params.reps,
            "rest": params.rest,
            "completed": False,
            "guide": build_exercise_guide(exercise, focus, candidate["score"]),
            "ai_score": round(candidate["score"], 1),
            "model": MODEL_NAME,
        })
        used_families.add(family)
        if len(selected) >= target_count:
            break

    if len(selected) < target_count:
        existing = {item["id"] for item in selected}
        for candidate in preferred_ranked + fallback_ranked:
            exercise = candidate["exercise"]
            if exercise["id"] in existing:
                continue
            selected.append({
                "id": exercise["id"],
                "name": exercise["name"],
                "sets": params.sets,
                "reps": params.reps,
                "rest": params.rest,
                "completed": False,
                "guide": build_exercise_guide(exercise, focus, candidate["score"]),
                "ai_score": round(candidate["score"], 1),
                "model": MODEL_NAME,
            })
            if len(selected) >= target_count:
                break

    rotation_type = "Advanced Split" if frequency >= 5 else ("Foundation Cycle" if frequency >= 3 else "Maintenance")
    unilateral_selected = False
    for item in selected:
        if unilateral and item["id"] == unilateral["exercise"]["id"]:
            item["guide"] = dominance_variation(unilateral["exercise"], profile) + " " + item["guide"]
            unilateral_selected = True
    loc_name = "Elite Training Facility" if location == "gym" else location.capitalize()
    rationale = (
        f"Based on your {goal} goal and {frequency}-day frequency, TrainCore AI designed a {rotation_type} program. "
        f"Since you requested {intensity} intensity, it optimized parameters for {params.description} using the available equipment at your {loc_name}. "
        f"Today's {focus} session was ranked using goal fit, body-part focus, location, safety, and intensity."
    )
    if unilateral_selected:
        rationale += " A unilateral option was prioritized for your reported side dominance; train both sides with the same rep target."

    return {
        "focus": focus,
        "exercises": selected,
        "duration": random.randint(45, 65),
        "kcal": random.randint(450, 600) if intensity == "heavy" else random.randint(250, 400),
        "category": "Power" if intensity == "heavy" else "Endurance",
        "difficulty": params.difficulty,
        "intensity_score": params.intensity_score,
        "rationale": rationale,
        "image": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=500&q=60",
    }


def generate_plan(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    goal = str(profile.get("goal") or "maintain")
    frequency = max(1, min(7, int(profile.get("training_days_per_week") or 3)))
    location = normalize_location(str(profile.get("training_location") or "gym"))
    training_indexes = DAY_MAP.get(frequency, DAY_MAP[3])
    plan = []

    for workout_count, day_index in enumerate(training_indexes):
        workout = generate_workout_day(profile, workout_count, location, frequency)
        plan.append({
            "id": f"w{workout_count + 1}",
            "day": DAYS[day_index],
            "title": f"{workout['focus']} @ {location.capitalize()}",
            "focus": workout["focus"],
            "exercises": workout["exercises"],
            "duration": f"{workout['duration']} mins",
            "kcal": workout["kcal"],
            "category": workout["category"],
            "difficulty": workout["difficulty"],
            "intensity": workout["intensity_score"],
            "rationale": workout["rationale"],
            "image": workout["image"],
            "location": location,
            "ai_model": MODEL_NAME,
            "model_version": MODEL_VERSION,
            "model_type": "python_local_random_forest_exercise_ranker",
            "completed": False,
        })
    return plan


def validate_plan(plan: Any) -> bool:
    if not isinstance(plan, list) or not plan:
        return False
    for day in plan:
        if not isinstance(day, dict) or not day.get("day") or not day.get("title"):
            return False
        exercises = day.get("exercises")
        if not isinstance(exercises, list) or not exercises:
            return False
        if any(not isinstance(ex, dict) or not ex.get("name") for ex in exercises):
            return False
    return True


def train_random_forest() -> Dict[str, Any]:
    goals = ["lose_weight", "gain_muscle", "build_muscle", "gain_weight", "maintain", "running", "boxing", "swimming", "cycling", "martial_arts", "yoga_flexibility"]
    locations = ["gym", "home", "outdoor", "studio"]
    intensities = ["light", "moderate", "heavy"]
    injuries = ["none", "left shoulder pain", "knee pain", "lower back pain", "ankle pain"]
    frequencies = [2, 3, 4, 5]
    features, labels, groups = [], [], []

    for goal in goals:
        splits = GOAL_SPLITS.get(goal, ["Full Body (A)", "Full Body (B)", "Full Body (C)"])
        for location in locations:
            for intensity in intensities:
                for injury in injuries:
                    for frequency in frequencies:
                        # Injury variants share a group: the same profile cannot leak across the split.
                        group = f"{goal}|{location}|{intensity}|{frequency}"
                        for day_index, focus in enumerate(splits[:min(frequency, len(splits))]):
                            for exercise in EXERCISES:
                                if not location_matches(exercise, location) or not is_exercise_safe(exercise, injury):
                                    continue
                                seed = zlib.crc32(f"{group}|{injury}|{focus}|{exercise['id']}".encode("utf-8"))
                                if seed % 23 != 0:
                                    continue
                                features.append(forest_features(exercise, goal, focus, location, intensity, frequency))
                                labels.append(expert_rule_score_exercise(exercise, goal, focus, location, intensity, frequency, day_index) / 99)
                                groups.append(group)
    schema = traincore_feature_schema()
    names = [f"{key}:{value}" for key in ["goals", "locations", "intensities", "categories", "families"] for value in schema[key]]
    names += ["frequency", "location_fit", "focus_fit", "goal_category_fit", "goal_muscle_fit", "expert_score", "has_focus"]
    model = train_forest(features, labels, groups, names, "regression")
    model.update(feature_schema=schema, label_source="expert-rule suitability scores, not measured fitness outcomes",
                 input="user profile and exercise features", output="exercise suitability score (0 to 1)")
    return model


def train_model() -> Dict[str, Any]:
    global FOREST_MODEL_CACHE
    goals = ["lose_weight", "gain_muscle", "build_muscle", "gain_weight", "maintain", "running", "boxing", "swimming", "cycling", "martial_arts", "yoga_flexibility"]
    locations = ["gym", "home", "outdoor", "pool", "dryland", "studio"]
    intensities = ["light", "moderate", "heavy"]
    injuries = ["none", "left shoulder pain", "knee pain", "lower back pain", "ankle pain"]
    frequencies = [2, 3, 4, 5]

    profiles_tested = 0
    plans_generated = 0
    exercise_slots = 0
    score_total = 0.0
    unique_exercises = {}
    failures = []
    goal_coverage: Dict[str, int] = {}
    random_forest = train_random_forest()
    FOREST_MODEL_CACHE = random_forest
    predict_workout_features.cache_clear()

    for goal in goals:
        for location in locations:
            for intensity in intensities:
                for injury in injuries:
                    for frequency in frequencies:
                        profiles_tested += 1
                        profile = {
                            "goal": goal,
                            "training_days_per_week": frequency,
                            "training_location": location,
                            "training_intensity": intensity,
                            "injuries": injury,
                            "pain_points": "none" if injury == "none" else injury,
                            "posture_problems": "none",
                            "mobility_limitations": "none",
                            "weight": 76,
                            "target_weight": 70 if goal in {"lose_weight", "running", "cycling"} else 82,
                        }
                        plan = generate_plan(profile)
                        if not validate_plan(plan):
                            failures.append(f"{goal}/{location}/{intensity}/{injury}/{frequency}: invalid plan")
                            continue
                        plans_generated += 1
                        goal_coverage[goal] = goal_coverage.get(goal, 0) + 1
                        for day in plan:
                            for exercise in day["exercises"]:
                                exercise_slots += 1
                                unique_exercises[exercise["id"]] = exercise["name"]
                                score_total += float(exercise.get("ai_score") or 0)

    average_score = round(score_total / exercise_slots, 2) if exercise_slots else 0
    artifact = {
        "model": model_card(),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_type": "scikit-learn Random Forest training, held-out profile evaluation, and plan-contract validation",
        "random_forest": random_forest,
        "trainingMetrics": random_forest["trainingMetrics"],
        "validationMetrics": random_forest["validationMetrics"],
        "training_profiles_tested": profiles_tested,
        "plans_generated": plans_generated,
        "exercise_slots_ranked": exercise_slots,
        "unique_exercises_recommended": len(unique_exercises),
        "average_ai_score": average_score,
        "goal_coverage": goal_coverage,
        "validation": {
            "passed": len(failures) == 0,
            "failure_count": len(failures),
            "failures": failures[:20],
            "external_api_disabled": True,
            "local_first": True,
            "python_model": True,
            "random_forest": True,
        },
        "notes": [
            "TrainCore AI evaluates learned Random Forest trees locally.",
            "The forest learns exercise suitability from expert-rule labels, not observed fitness outcomes.",
            "Hard injury and location filters remain outside the forest.",
            "The PHP backend only calls the Python model and stores the generated plan.",
        ],
    }
    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT_PATH.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    return artifact


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile-json", default="")
    parser.add_argument("--profile-b64", default="")
    parser.add_argument("--train", action="store_true")
    args = parser.parse_args()

    if args.train:
        artifact = train_model()
        print(json.dumps({
            "success": artifact["validation"]["passed"],
            "message": "TrainCore AI training complete",
            "profiles_tested": artifact["training_profiles_tested"],
            "plans_generated": artifact["plans_generated"],
            "exercise_slots_ranked": artifact["exercise_slots_ranked"],
            "unique_exercises_recommended": artifact["unique_exercises_recommended"],
            "average_ai_score": artifact["average_ai_score"],
            "artifact": str(ARTIFACT_PATH.relative_to(ROOT)).replace("\\", "/"),
        }))
        return 0 if artifact["validation"]["passed"] else 1

    try:
        if args.profile_b64:
            raw_profile = base64.b64decode(args.profile_b64).decode("utf-8")
        else:
            raw_profile = args.profile_json or "{}"
        profile = json.loads(raw_profile)
    except Exception as exc:
        print(json.dumps({"success": False, "message": "Invalid profile JSON", "error": str(exc)}))
        return 1

    plan = generate_plan(profile)
    print(json.dumps({"success": validate_plan(plan), "engine": "python_traincore", "model": model_card(), "plan": plan}))
    return 0 if validate_plan(plan) else 1


if __name__ == "__main__":
    sys.exit(main())
