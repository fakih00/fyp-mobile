import importlib.util
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "ml" / "exercise_ai" / "video_pose_analyzer.py"
spec = importlib.util.spec_from_file_location("poseform_video_pose_analyzer", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
sys.modules["poseform_video_pose_analyzer"] = module
spec.loader.exec_module(module)

FrameMetric = module.FrameMetric


def assert_equal(actual, expected, message):
    if actual != expected:
        raise AssertionError(f"{message}: expected {expected}, got {actual}")


def assert_true(condition, message):
    if not condition:
        raise AssertionError(message)


def build_metrics(sequence):
    return [FrameMetric(timestamp_ms=i * 120, effort=value, confidence=0.92) for i, value in enumerate(sequence)]


def count_for(sequence, exercise_type):
    return module.count_reps(build_metrics(sequence), exercise_type)["reps"]


def test_generated_workout_aliases():
    aliases = {
        "Barbell Bench Press": "benchPress",
        "Incline DB Press": "benchPress",
        "Conventional Deadlift": "deadlift",
        "Overhead Press": "shoulderPress",
        "Back Squats (Barbell)": "squat",
        "Weighted Pull-Ups": "pullup",
        "Barbell Rows": "row",
        "Leg Press": "legPress",
        "Dips (Chest Focus)": "tricepDip",
        "T-Bar Rows": "row",
        "Cable Flys": "chestFly",
        "Lateral Raises (DB)": "lateralRaise",
        "Face Pulls": "latPulldown",
        "Leg Extensions": "legExtension",
        "Lying Leg Curls": "legCurl",
        "Preacher Curls": "bicepCurl",
        "Skull Crushers": "tricepDip",
        "Hammer Curls": "bicepCurl",
        "Calf Raises (Seated)": "calfRaise",
        "Pec Deck Flys": "chestFly",
        "Standard Push Ups": "pushup",
        "Diamond Push Ups": "pushup",
        "Archer Push Ups": "pushup",
        "Pike Push Ups": "pushup",
        "Bodyweight Squats": "squat",
        "Bulgarian Split Squats": "lunge",
        "Single Leg Glute Bridge": "gluteBridge",
        "Chin Ups (Strict)": "pullup",
        "Australian Pull Ups": "pullup",
        "Chair Dips": "tricepDip",
        "Hollow Body Hold": "plank",
        "Bicycle Crunches": "crunch",
        "Leg Raises (Hanging)": "crunch",
        "Russian Twists": "crunch",
        "Plank with Shoulder Taps": "plank",
        "Bird Dog": "plank",
        "Dead Bug": "plank",
        "Mountain Climbers": "mountainClimber",
        "Burpees": "burpee",
        "V-Ups": "crunch",
        "Treadmill Sprint Intervals": "locomotion",
        "Rowing Machine (500m)": "row",
        "Battle Ropes": "lateralRaise",
        "Box Jumps": "calfRaise",
        "Swimming Laps": "locomotion",
        "Kettlebell Swings": "deadlift",
        "Jump Rope": "calfRaise",
        "Thrusters (Dumbbell)": "shoulderPress",
        "Bear Crawls": "locomotion",
        "Sandbag Carries": "locomotion",
    }
    for name, expected in aliases.items():
        assert_equal(module.detect_exercise_type(name), expected, f"alias {name}")


def test_rep_counter_all_profiles():
    low_start_cycle = [5, 6, 8, 70, 82, 76, 8, 6, 5] * 4
    high_start_cycle = [82, 76, 70, 8, 6, 5, 70, 76, 82] * 3
    half_cycle = [5, 6, 8, 70, 82, 76]

    low_start_types = [
        "squat",
        "pushup",
        "lunge",
        "shoulderPress",
        "tricepDip",
        "deadlift",
        "row",
        "jumpingJack",
        "mountainClimber",
        "gluteBridge",
        "calfRaise",
        "benchPress",
        "latPulldown",
        "pullup",
        "legPress",
        "legCurl",
        "lateralRaise",
        "chestFly",
        "crunch",
        "burpee",
        "locomotion",
    ]
    for exercise_type in low_start_types:
        assert_equal(count_for(low_start_cycle, exercise_type), 4, f"low-start reps for {exercise_type}")

    assert_equal(count_for(high_start_cycle, "legExtension"), 3, "high-start reps for legExtension")
    assert_equal(count_for(half_cycle, "pushup"), 0, "half rep should not count")

    plank_info = module.count_reps(build_metrics([5, 5, 5, 5, 5, 5, 5, 5]), "plank")
    assert_equal(plank_info["reps"], 0, "plank has no rep count")
    assert_true(plank_info["events"] and plank_info["events"][0]["type"] == "hold", "plank hold event")


def test_best_visible_side_choice():
    assert_equal(module.choose_by_visibility(90, 130, 0.9, 0.2), 90, "left side should win")
    assert_equal(module.choose_by_visibility(90, 130, 0.2, 0.9), 130, "right side should win")
    assert_equal(round(module.side_visibility({
        "l_shoulder": {"visibility": 0.9},
        "l_hip": {"visibility": 0.8},
        "l_elbow": {"visibility": 0.7},
        "l_wrist": {"visibility": 0.6},
        "l_knee": {"visibility": 0.5},
        "l_ankle": {"visibility": 0.4},
    }, "l"), 2), 0.65, "side visibility average")


TESTS = [
    test_generated_workout_aliases,
    test_rep_counter_all_profiles,
    test_best_visible_side_choice,
]


if __name__ == "__main__":
    for test in TESTS:
        test()
        print(f"PASS {test.__name__}")
    print(f"\nPoseForm video analyzer validation passed {len(TESTS)}/{len(TESTS)} tests.")
