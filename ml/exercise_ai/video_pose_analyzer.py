#!/usr/bin/env python3
"""
PoseForm video analyzer.

This is the accurate/offline exercise AI path. It analyzes a recorded video
frame-by-frame with MediaPipe Pose when the local Python dependencies exist,
then applies custom exercise-specific rep and form logic.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import site
import sys
from dataclasses import dataclass
from pathlib import Path
from statistics import mean
from typing import Dict, Iterable, List, Optional, Tuple


VENDOR_SITE = Path(__file__).resolve().parent / "vendor"
if VENDOR_SITE.exists() and str(VENDOR_SITE) not in sys.path:
    sys.path.insert(0, str(VENDOR_SITE))
USER_SITE = site.getusersitepackages()
if USER_SITE and USER_SITE not in sys.path:
    sys.path.append(USER_SITE)
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("MPLCONFIGDIR", str(Path(__file__).resolve().parent / ".matplotlib-cache"))

MODEL_PATH = Path(__file__).resolve().parent / "models" / "pose_landmarker_lite.task"

MIN_MOVEMENT_RANGE = {
    "squat": 20.0,
    "pushup": 18.0,
    "lunge": 18.0,
    "bicepCurl": 24.0,
    "shoulderPress": 16.0,
    "tricepDip": 18.0,
    "deadlift": 16.0,
    "row": 20.0,
    "jumpingJack": 28.0,
    "mountainClimber": 18.0,
    "gluteBridge": 16.0,
    "calfRaise": 5.0,
    "benchPress": 18.0,
    "latPulldown": 20.0,
    "pullup": 20.0,
    "legPress": 18.0,
    "legExtension": 18.0,
    "legCurl": 18.0,
    "lateralRaise": 18.0,
    "chestFly": 18.0,
    "crunch": 10.0,
    "burpee": 22.0,
    "locomotion": 14.0,
}

FAST_REP_EXERCISES = {"jumpingJack", "mountainClimber", "calfRaise", "crunch", "locomotion"}
COMPLEX_REP_EXERCISES = {"burpee"}

MIN_REP_MS = {
    "jumpingJack": 420,
    "mountainClimber": 320,
    "calfRaise": 380,
    "crunch": 420,
    "burpee": 760,
    "locomotion": 320,
}


EXERCISE_LABELS = {
    "squat": ["squat", "squats", "air squat", "bodyweight squat", "bodyweight squats", "goblet squat", "back squat", "back squats"],
    "pushup": ["push up", "push ups", "push-up", "push-ups", "pushup", "pushups", "standard push up", "standard push ups", "incline push up", "knee push up", "diamond push up", "diamond push ups", "archer push up", "archer push ups", "pike push up", "pike push ups"],
    "lunge": ["lunge", "lunges", "reverse lunge", "reverse lunges", "walking lunge", "walking lunges", "split squat", "split squats", "bulgarian split squat", "bulgarian split squats"],
    "plank": ["plank", "forearm plank", "high plank", "hollow body hold", "shoulder taps", "plank with shoulder taps", "bird dog", "dead bug"],
    "bicepCurl": ["bicep curl", "bicep curls", "dumbbell curl", "dumbbell curls", "barbell curl", "preacher curl", "preacher curls", "hammer curl", "hammer curls"],
    "shoulderPress": ["shoulder press", "overhead press", "military press", "dumbbell press", "thruster", "thrusters", "thrusters dumbbell"],
    "tricepDip": ["tricep dip", "tricep dips", "bench dip", "bench dips", "chair dip", "chair dips", "dips", "dips chest focus", "skull crusher", "skull crushers", "triceps extension", "tricep extension"],
    "deadlift": ["deadlift", "deadlifts", "conventional deadlift", "romanian deadlift", "rdl", "hip hinge", "kettlebell swing", "kettlebell swings"],
    "row": ["barbell row", "barbell rows", "dumbbell row", "dumbbell rows", "row", "rows", "t-bar row", "t-bar rows", "cable row", "cable rows", "rowing machine"],
    "jumpingJack": ["jumping jack", "jumping jacks"],
    "mountainClimber": ["mountain climber", "mountain climbers"],
    "gluteBridge": ["glute bridge", "glute bridges", "hip thrust", "hip thrusts", "bridge", "single leg glute bridge"],
    "calfRaise": ["calf raise", "calf raises", "standing calf raise", "seated calf raise", "jump rope", "box jump", "box jumps"],
    "benchPress": ["bench press", "barbell bench press", "dumbbell bench press", "chest press", "incline db press", "incline dumbbell press"],
    "latPulldown": ["lat pulldown", "lat pull down", "pulldown", "pull down", "cable pulldown", "face pull", "face pulls"],
    "pullup": ["pull up", "pull ups", "pull-up", "pull-ups", "pullup", "pullups", "weighted pull-up", "weighted pull-ups", "chin up", "chin ups", "chin-up", "australian pull up", "australian pull ups"],
    "legPress": ["leg press"],
    "legExtension": ["leg extension", "leg extensions"],
    "legCurl": ["leg curl", "leg curls", "hamstring curl", "lying leg curl", "lying leg curls", "seated leg curl"],
    "lateralRaise": ["lateral raise", "lateral raises", "lateral raises db", "side lateral raise", "side raise", "battle ropes"],
    "chestFly": ["chest fly", "chest flies", "pec fly", "pec deck", "pec deck fly", "pec deck flys", "cable fly", "cable flys", "dumbbell fly"],
    "crunch": ["crunch", "crunches", "sit up", "sit-up", "ab curl", "bicycle crunch", "bicycle crunches", "russian twist", "russian twists", "leg raise", "leg raises", "hanging leg raise", "v-up", "v-ups"],
    "burpee": ["burpee", "burpees"],
    "locomotion": ["treadmill sprint", "treadmill sprint intervals", "swimming laps", "sandbag carry", "sandbag carries", "bear crawl", "bear crawls"],
}


@dataclass
class FrameMetric:
    timestamp_ms: int
    effort: float
    confidence: float
    knee_angle: Optional[float] = None
    elbow_angle: Optional[float] = None
    shoulder_angle: Optional[float] = None
    hip_angle: Optional[float] = None
    torso_lean: Optional[float] = None
    body_line: Optional[float] = None
    front_knee_angle: Optional[float] = None
    knee_gap_ratio: Optional[float] = None
    wrist_height: Optional[float] = None
    ankle_lift: Optional[float] = None
    elbow_flare: Optional[float] = None


def detect_exercise_type(name: str) -> str:
    normalized = (name or "").lower()
    matches = []
    for exercise_type, labels in EXERCISE_LABELS.items():
        for label in labels:
            if label in normalized:
                matches.append((len(label), exercise_type))
    if matches:
        matches.sort(reverse=True)
        return matches[0][1]
    return "general"


def point(landmarks, idx: int):
    lm = landmarks[idx]
    return {"x": float(lm.x), "y": float(lm.y), "z": float(lm.z), "visibility": float(lm.visibility)}


def midpoint(a, b):
    return {
        "x": (a["x"] + b["x"]) / 2,
        "y": (a["y"] + b["y"]) / 2,
        "z": (a["z"] + b["z"]) / 2,
        "visibility": min(a["visibility"], b["visibility"]),
    }


def distance(a, b) -> float:
    return math.sqrt((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2)


def angle(a, b, c) -> float:
    ab = (a["x"] - b["x"], a["y"] - b["y"])
    cb = (c["x"] - b["x"], c["y"] - b["y"])
    dot = ab[0] * cb[0] + ab[1] * cb[1]
    mag_ab = math.hypot(*ab)
    mag_cb = math.hypot(*cb)
    if mag_ab <= 1e-6 or mag_cb <= 1e-6:
        return 0.0
    value = max(-1.0, min(1.0, dot / (mag_ab * mag_cb)))
    return math.degrees(math.acos(value))


def line_angle(a, b) -> float:
    return math.degrees(math.atan2(b["x"] - a["x"], b["y"] - a["y"]))


def avg(values: Iterable[Optional[float]]) -> Optional[float]:
    valid = [v for v in values if v is not None and math.isfinite(v)]
    return mean(valid) if valid else None


def mean_or(values: Iterable[Optional[float]], default: float = 0.0) -> float:
    valid = [v for v in values if v is not None and math.isfinite(v)]
    return mean(valid) if valid else default


def visibility_mean(pts: Dict, names: Iterable[str]) -> float:
    values = [pts[name]["visibility"] for name in names if name in pts]
    return mean(values) if values else 0.0


def side_visibility(pts: Dict, side: str, include_arm: bool = True, include_leg: bool = True) -> float:
    names = [f"{side}_shoulder", f"{side}_hip"]
    if include_arm:
        names += [f"{side}_elbow", f"{side}_wrist"]
    if include_leg:
        names += [f"{side}_knee", f"{side}_ankle"]
    return visibility_mean(pts, names)


def choose_by_visibility(left_value: Optional[float], right_value: Optional[float], left_conf: float, right_conf: float) -> Optional[float]:
    values = []
    if left_value is not None and math.isfinite(left_value):
        values.append((left_conf, left_value))
    if right_value is not None and math.isfinite(right_value):
        values.append((right_conf, right_value))
    if not values:
        return None
    values.sort(key=lambda item: item[0], reverse=True)
    return values[0][1]


def percentile(values: List[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = (len(ordered) - 1) * pct
    lo = math.floor(idx)
    hi = math.ceil(idx)
    if lo == hi:
        return ordered[lo]
    return ordered[lo] * (hi - idx) + ordered[hi] * (idx - lo)


def smooth(values: List[FrameMetric], alpha: float = 0.35) -> List[FrameMetric]:
    if not values:
        return []
    smoothed = []
    current = values[0].effort
    for item in values:
        current = current + (item.effort - current) * alpha
        smoothed.append(FrameMetric(
            timestamp_ms=item.timestamp_ms,
            effort=current,
            confidence=item.confidence,
            knee_angle=item.knee_angle,
            elbow_angle=item.elbow_angle,
            shoulder_angle=item.shoulder_angle,
            hip_angle=item.hip_angle,
            torso_lean=item.torso_lean,
            body_line=item.body_line,
            front_knee_angle=item.front_knee_angle,
            knee_gap_ratio=item.knee_gap_ratio,
            wrist_height=item.wrist_height,
            ankle_lift=item.ankle_lift,
            elbow_flare=item.elbow_flare,
        ))
    return smoothed


def median_denoise(values: List[FrameMetric], radius: int = 1) -> List[FrameMetric]:
    if len(values) < 5:
        return values
    denoised = []
    for index, item in enumerate(values):
        start = max(0, index - radius)
        end = min(len(values), index + radius + 1)
        window = sorted(m.effort for m in values[start:end])
        effort = window[len(window) // 2]
        denoised.append(FrameMetric(
            timestamp_ms=item.timestamp_ms,
            effort=effort,
            confidence=item.confidence,
            knee_angle=item.knee_angle,
            elbow_angle=item.elbow_angle,
            shoulder_angle=item.shoulder_angle,
            hip_angle=item.hip_angle,
            torso_lean=item.torso_lean,
            body_line=item.body_line,
            front_knee_angle=item.front_knee_angle,
            knee_gap_ratio=item.knee_gap_ratio,
            wrist_height=item.wrist_height,
            ankle_lift=item.ankle_lift,
            elbow_flare=item.elbow_flare,
        ))
    return denoised


def smooth_for_exercise(values: List[FrameMetric], exercise_type: str) -> List[FrameMetric]:
    if not values:
        return []
    alpha = 0.48 if exercise_type in FAST_REP_EXERCISES else 0.30
    if exercise_type in COMPLEX_REP_EXERCISES:
        alpha = 0.25
    readable = [m for m in values if m.confidence >= 0.50]
    source = readable if len(readable) >= max(8, int(len(values) * 0.55)) else values
    return smooth(median_denoise(source), alpha=alpha)


def terminal_frames_for(exercise_type: str) -> int:
    if exercise_type in FAST_REP_EXERCISES:
        return 1
    if exercise_type in COMPLEX_REP_EXERCISES:
        return 2
    return 2


def min_rep_ms_for(exercise_type: str, duration_ms: int) -> int:
    configured = MIN_REP_MS.get(exercise_type)
    if configured:
        return configured
    if duration_ms and duration_ms < 5500:
        return 420
    return 520


def rep_count_reliability(rep_info: Dict, metrics: List[FrameMetric]) -> int:
    if not metrics:
        return 0
    avg_conf = mean_or((m.confidence for m in metrics), 0)
    movement_range = float(rep_info.get("range", 0) or 0)
    min_range = float(rep_info.get("min_range", 22) or 22)
    range_ratio = min(1.25, movement_range / max(min_range, 1.0))
    valid_ratio = min(1.0, len(metrics) / 18.0)
    score = (avg_conf * 0.58 + min(1.0, range_ratio) * 0.30 + valid_ratio * 0.12) * 100
    return max(0, min(100, int(round(score))))


def camera_advice_for(exercise_type: str) -> str:
    if exercise_type in {"pushup", "plank", "deadlift", "gluteBridge", "legExtension", "legCurl", "crunch"}:
        return "Best camera angle: side view, full body visible, phone stable at hip height."
    if exercise_type in {"squat", "lunge", "jumpingJack", "lateralRaise", "latPulldown", "pullup"}:
        return "Best camera angle: front or slight diagonal view, full body visible with hands and feet inside the frame."
    if exercise_type in {"benchPress", "row", "tricepDip", "chestFly", "legPress", "burpee", "mountainClimber", "locomotion"}:
        return "Best camera angle: diagonal view, keep the working joints visible for the full set."
    return "Best camera angle: keep the target joints visible, use bright light, and avoid moving the phone."


def extract_metric(exercise_type: str, landmarks, timestamp_ms: int) -> Optional[FrameMetric]:
    pts = {
        "l_shoulder": point(landmarks, 11),
        "r_shoulder": point(landmarks, 12),
        "l_elbow": point(landmarks, 13),
        "r_elbow": point(landmarks, 14),
        "l_wrist": point(landmarks, 15),
        "r_wrist": point(landmarks, 16),
        "l_hip": point(landmarks, 23),
        "r_hip": point(landmarks, 24),
        "l_knee": point(landmarks, 25),
        "r_knee": point(landmarks, 26),
        "l_ankle": point(landmarks, 27),
        "r_ankle": point(landmarks, 28),
        "l_heel": point(landmarks, 29),
        "r_heel": point(landmarks, 30),
        "l_foot": point(landmarks, 31),
        "r_foot": point(landmarks, 32),
    }

    lower_body = {"squat", "lunge", "legPress", "legExtension", "legCurl", "calfRaise", "burpee", "locomotion"}
    floor_body = {"pushup", "plank", "mountainClimber", "gluteBridge", "burpee", "locomotion"}
    upper_body = {
        "bicepCurl", "shoulderPress", "tricepDip", "row", "benchPress",
        "latPulldown", "pullup", "lateralRaise", "chestFly", "burpee", "locomotion",
    }
    needs_lower = exercise_type in lower_body or exercise_type in floor_body
    needs_upper = exercise_type in upper_body or exercise_type in floor_body
    left_conf = side_visibility(pts, "l", include_arm=needs_upper, include_leg=needs_lower)
    right_conf = side_visibility(pts, "r", include_arm=needs_upper, include_leg=needs_lower)
    paired_core_conf = visibility_mean(pts, ["l_shoulder", "r_shoulder", "l_hip", "r_hip"])
    best_side_conf = max(left_conf, right_conf)
    confidence = max(paired_core_conf, best_side_conf)
    if confidence < 0.48:
        return None

    left_arm_conf = side_visibility(pts, "l", include_arm=True, include_leg=False)
    right_arm_conf = side_visibility(pts, "r", include_arm=True, include_leg=False)
    left_leg_conf = side_visibility(pts, "l", include_arm=False, include_leg=True)
    right_leg_conf = side_visibility(pts, "r", include_arm=False, include_leg=True)

    l_knee = angle(pts["l_hip"], pts["l_knee"], pts["l_ankle"])
    r_knee = angle(pts["r_hip"], pts["r_knee"], pts["r_ankle"])
    knee_angle = choose_by_visibility(l_knee, r_knee, left_leg_conf, right_leg_conf) or avg([l_knee, r_knee])

    l_elbow = angle(pts["l_shoulder"], pts["l_elbow"], pts["l_wrist"])
    r_elbow = angle(pts["r_shoulder"], pts["r_elbow"], pts["r_wrist"])
    elbow_angle = choose_by_visibility(l_elbow, r_elbow, left_arm_conf, right_arm_conf) or avg([l_elbow, r_elbow])
    l_shoulder_angle = angle(pts["l_hip"], pts["l_shoulder"], pts["l_wrist"])
    r_shoulder_angle = angle(pts["r_hip"], pts["r_shoulder"], pts["r_wrist"])
    shoulder_angle = choose_by_visibility(l_shoulder_angle, r_shoulder_angle, left_arm_conf, right_arm_conf) or avg([l_shoulder_angle, r_shoulder_angle])
    l_hip_angle = angle(pts["l_shoulder"], pts["l_hip"], pts["l_knee"])
    r_hip_angle = angle(pts["r_shoulder"], pts["r_hip"], pts["r_knee"])
    hip_angle = choose_by_visibility(l_hip_angle, r_hip_angle, left_leg_conf, right_leg_conf) or avg([l_hip_angle, r_hip_angle])

    shoulder_mid = midpoint(pts["l_shoulder"], pts["r_shoulder"])
    hip_mid = midpoint(pts["l_hip"], pts["r_hip"])
    ankle_mid = midpoint(pts["l_ankle"], pts["r_ankle"])
    wrist_mid = midpoint(pts["l_wrist"], pts["r_wrist"])
    torso_lean = line_angle(shoulder_mid, hip_mid)
    body_span = max(distance(shoulder_mid, ankle_mid), distance(shoulder_mid, hip_mid) * 2.2, 0.15)
    knee_gap_ratio = distance(pts["l_knee"], pts["r_knee"]) / max(distance(pts["l_ankle"], pts["r_ankle"]), 0.05)
    l_wrist_height = (pts["l_shoulder"]["y"] - pts["l_wrist"]["y"]) / body_span
    r_wrist_height = (pts["r_shoulder"]["y"] - pts["r_wrist"]["y"]) / body_span
    wrist_height = choose_by_visibility(l_wrist_height, r_wrist_height, left_arm_conf, right_arm_conf)
    if wrist_height is None:
        wrist_height = (shoulder_mid["y"] - wrist_mid["y"]) / body_span
    l_body_line = line_angle(pts["l_shoulder"], pts["l_ankle"])
    r_body_line = line_angle(pts["r_shoulder"], pts["r_ankle"])
    body_line = choose_by_visibility(l_body_line, r_body_line, left_leg_conf, right_leg_conf) or line_angle(shoulder_mid, ankle_mid)
    front_knee_angle = min(l_knee, r_knee) if abs(left_leg_conf - right_leg_conf) < 0.12 else (knee_angle or min(l_knee, r_knee))
    heel_mid = midpoint(pts["l_heel"], pts["r_heel"])
    foot_mid = midpoint(pts["l_foot"], pts["r_foot"])
    l_ankle_lift = max(0.0, (pts["l_heel"]["y"] - pts["l_foot"]["y"]) / body_span * 100.0)
    r_ankle_lift = max(0.0, (pts["r_heel"]["y"] - pts["r_foot"]["y"]) / body_span * 100.0)
    ankle_lift = choose_by_visibility(l_ankle_lift, r_ankle_lift, left_leg_conf, right_leg_conf)
    if ankle_lift is None:
        ankle_lift = max(0.0, (heel_mid["y"] - foot_mid["y"]) / body_span * 100.0)
    elbow_width = distance(pts["l_elbow"], pts["r_elbow"])
    shoulder_width = max(distance(pts["l_shoulder"], pts["r_shoulder"]), 0.05)
    elbow_flare = elbow_width / shoulder_width

    if exercise_type in {"squat", "lunge", "legPress", "legExtension", "legCurl"}:
        effort = max(0.0, min(125.0, 180.0 - (knee_angle or 180.0)))
    elif exercise_type in {"bicepCurl", "pushup", "tricepDip", "row", "benchPress", "latPulldown", "pullup", "chestFly"}:
        effort = max(0.0, min(145.0, 180.0 - (elbow_angle or 180.0)))
    elif exercise_type == "shoulderPress":
        effort = max(-0.3, min(0.8, wrist_height)) * 100.0
    elif exercise_type == "lateralRaise":
        effort = max(0.0, min(140.0, shoulder_angle or 0.0))
    elif exercise_type == "jumpingJack":
        foot_hip_ratio = distance(pts["l_ankle"], pts["r_ankle"]) / max(distance(pts["l_hip"], pts["r_hip"]), 0.05)
        effort = max(0.0, min(150.0, (shoulder_angle or 0.0) + max(0.0, foot_hip_ratio - 1.0) * 35.0))
    elif exercise_type == "mountainClimber":
        effort = max(0.0, min(145.0, 180.0 - front_knee_angle))
    elif exercise_type == "gluteBridge":
        effort = max(0.0, min(145.0, hip_angle or 0.0))
    elif exercise_type == "calfRaise":
        effort = max(0.0, min(80.0, ankle_lift))
    elif exercise_type == "crunch":
        effort = max(0.0, min(80.0, abs(torso_lean)))
    elif exercise_type == "plank":
        effort = 0.0
    elif exercise_type == "burpee":
        lower_effort = max(0.0, min(125.0, 180.0 - (knee_angle or 180.0)))
        upper_effort = max(0.0, min(145.0, 180.0 - (elbow_angle or 180.0)))
        jump_effort = max(0.0, min(80.0, wrist_height * 100.0))
        effort = max(lower_effort, upper_effort, jump_effort)
    elif exercise_type == "locomotion":
        knee_drive = max(0.0, min(145.0, 180.0 - front_knee_angle))
        arm_drive = max(0.0, min(140.0, shoulder_angle or 0.0))
        effort = max(knee_drive, arm_drive)
    else:
        effort = max(0.0, min(145.0, 180.0 - (elbow_angle or knee_angle or 180.0)))

    return FrameMetric(
        timestamp_ms=timestamp_ms,
        effort=effort,
        confidence=confidence,
        knee_angle=knee_angle,
        elbow_angle=elbow_angle,
        shoulder_angle=shoulder_angle,
        hip_angle=hip_angle,
        torso_lean=torso_lean,
        body_line=body_line,
        front_knee_angle=front_knee_angle,
        knee_gap_ratio=knee_gap_ratio,
        wrist_height=wrist_height,
        ankle_lift=ankle_lift,
        elbow_flare=elbow_flare,
    )


def count_reps(metrics: List[FrameMetric], exercise_type: str) -> Dict:
    metrics = smooth_for_exercise(metrics, exercise_type)
    efforts = [m.effort for m in metrics]
    if exercise_type == "plank":
        return {
            "reps": 0,
            "range": 0,
            "low": 0,
            "high": 0,
            "min_range": 0,
            "reliability": rep_count_reliability({"range": 0, "min_range": 0}, metrics),
            "events": [{"type": "hold", "frame": len(metrics), "ms": metrics[-1].timestamp_ms if metrics else 0}],
        }
    if len(efforts) < 8:
        return {"reps": 0, "range": 0, "low": 0, "high": 0, "min_range": MIN_MOVEMENT_RANGE.get(exercise_type, 22.0), "reliability": 0, "events": []}

    low = percentile(efforts, 0.10)
    high = percentile(efforts, 0.90)
    movement_range = high - low
    min_range = MIN_MOVEMENT_RANGE.get(exercise_type, 22.0)
    if movement_range < min_range:
        rep_info = {"reps": 0, "range": movement_range, "low": low, "high": high, "min_range": min_range, "events": []}
        rep_info["reliability"] = rep_count_reliability(rep_info, metrics)
        return rep_info

    high_threshold = low + movement_range * 0.68
    low_threshold = low + movement_range * 0.30
    mid_threshold = low + movement_range * 0.50
    first_window = efforts[: min(4, len(efforts))]
    first_effort = mean(first_window)
    phase = "high" if first_effort >= mid_threshold else "low"
    start_phase = phase
    opposite_phase = "low" if start_phase == "high" else "high"
    visited_opposite = False
    opposite_ms = 0
    last_phase_change_ms = metrics[0].timestamp_ms
    last_rep_ms = metrics[0].timestamp_ms - 5000
    high_frames = 0
    low_frames = 0
    reps = 0
    events = []
    required_terminal_frames = terminal_frames_for(exercise_type)
    duration_ms = max(0, metrics[-1].timestamp_ms - metrics[0].timestamp_ms)
    min_rep_ms = min_rep_ms_for(exercise_type, duration_ms)
    min_return_ms = 180 if exercise_type in FAST_REP_EXERCISES else 260

    for index, item in enumerate(metrics):
        if item.effort >= high_threshold:
            high_frames += 1
            low_frames = 0
        elif item.effort <= low_threshold:
            low_frames += 1
            high_frames = 0
        else:
            high_frames = 0
            low_frames = 0

        terminal = None
        if high_frames >= required_terminal_frames:
            terminal = "high"
        elif low_frames >= required_terminal_frames:
            terminal = "low"

        if terminal and terminal != phase:
            elapsed_in_phase = item.timestamp_ms - last_phase_change_ms
            if elapsed_in_phase < min_return_ms:
                continue
            phase = terminal
            last_phase_change_ms = item.timestamp_ms
            if phase == opposite_phase:
                visited_opposite = True
                opposite_ms = item.timestamp_ms
                events.append({"type": "work", "frame": index, "ms": item.timestamp_ms, "effort": round(item.effort, 2)})

        if (
            visited_opposite
            and phase == start_phase
            and item.timestamp_ms - opposite_ms >= min_return_ms
            and item.timestamp_ms - last_rep_ms >= min_rep_ms
        ):
            reps += 1
            last_rep_ms = item.timestamp_ms
            visited_opposite = False
            events.append({"type": "rep", "frame": index, "ms": item.timestamp_ms, "rep": reps, "effort": round(item.effort, 2)})

    final_effort = efforts[-1]
    ended_near_start = (
        (start_phase == "low" and final_effort <= low + movement_range * 0.52)
        or (start_phase == "high" and final_effort >= low + movement_range * 0.48)
    )
    if (
        visited_opposite
        and ended_near_start
        and metrics[-1].timestamp_ms - opposite_ms >= min_return_ms
        and metrics[-1].timestamp_ms - last_rep_ms >= min_rep_ms
    ):
        reps += 1
        events.append({
            "type": "rep",
            "frame": len(metrics) - 1,
            "ms": metrics[-1].timestamp_ms,
            "rep": reps,
            "recovered_at_clip_end": True,
        })

    rep_info = {
        "reps": reps,
        "range": round(movement_range, 2),
        "low": round(low, 2),
        "high": round(high, 2),
        "min_range": round(min_range, 2),
        "start_phase": start_phase,
        "min_rep_ms": min_rep_ms,
        "events": events[-12:],
    }
    rep_info["reliability"] = rep_count_reliability(rep_info, metrics)
    return rep_info


def score_form(metrics: List[FrameMetric], exercise_type: str, rep_info: Dict) -> Tuple[int, List[str], List[str]]:
    mistakes: List[str] = []
    feedback: List[str] = []
    score = 92

    avg_conf = mean(m.confidence for m in metrics) if metrics else 0
    if avg_conf < 0.62:
        score -= 14
        mistakes.append("Low pose confidence")
        feedback.append("Use brighter light and keep the full target body area visible.")

    if len(metrics) < 8:
        score -= 18
        feedback.append("Not enough readable pose frames. Keep the camera stable and make sure the target joints stay visible.")

    if rep_info["reps"] == 0 and exercise_type != "plank":
        score -= 20
        feedback.append("Movement range was not clear enough to count a full repetition.")

    rep_reliability = int(rep_info.get("reliability", 0) or 0)
    if exercise_type != "plank":
        if rep_reliability < 58:
            score -= 10
            feedback.append(camera_advice_for(exercise_type))
        elif rep_reliability < 74:
            feedback.append("Rep count is approximate. Slow the movement slightly and pause at the top and bottom for better accuracy.")

    if exercise_type == "squat":
        deepest_knee = min((m.knee_angle for m in metrics if m.knee_angle), default=180)
        avg_knee_gap = mean_or((m.knee_gap_ratio for m in metrics), 1.0)
        max_lean = max((abs(m.torso_lean or 0) for m in metrics), default=0)
        if deepest_knee > 125:
            score -= 16
            mistakes.append("Shallow squat depth")
            feedback.append("Squat deeper until the knees bend clearly, then stand tall.")
        if avg_knee_gap < 0.58:
            score -= 10
            mistakes.append("Knees collapsing inward")
            feedback.append("Push knees outward and keep them tracking over the feet.")
        if max_lean > 32:
            score -= 8
            mistakes.append("Torso lean")
            feedback.append("Keep chest up and avoid folding too far forward.")
    elif exercise_type == "pushup":
        deepest_elbow = min((m.elbow_angle for m in metrics if m.elbow_angle), default=180)
        body_line_spread = max((m.body_line or 0 for m in metrics), default=0) - min((m.body_line or 0 for m in metrics), default=0)
        if deepest_elbow > 118:
            score -= 16
            mistakes.append("Shallow push-up depth")
            feedback.append("Lower the chest more before pressing back up.")
        if body_line_spread > 28:
            score -= 10
            mistakes.append("Unstable plank line")
            feedback.append("Brace the core and keep shoulders, hips, and ankles moving together.")
    elif exercise_type in {"lunge", "legPress"}:
        deepest_knee = min((m.front_knee_angle or m.knee_angle for m in metrics if (m.front_knee_angle or m.knee_angle)), default=180)
        avg_knee_gap = mean_or((m.knee_gap_ratio for m in metrics), 1.0)
        if deepest_knee > 125:
            score -= 16
            mistakes.append("Shallow lower-body depth")
            feedback.append("Bend the knees deeper, then return to a strong top position.")
        if avg_knee_gap < 0.58:
            score -= 10
            mistakes.append("Knees collapsing inward")
            feedback.append("Keep knees tracking in line with the toes.")
    elif exercise_type == "plank":
        body_line_spread = max((m.body_line or 0 for m in metrics), default=0) - min((m.body_line or 0 for m in metrics), default=0)
        if avg_conf >= 0.62 and body_line_spread <= 18:
            feedback.append("Hold detected. Body line stayed readable during the clip.")
        else:
            score -= 12
            mistakes.append("Plank line unstable")
            feedback.append("Keep shoulders, hips, knees, and ankles in one firm line.")
    elif exercise_type == "bicepCurl":
        smallest_elbow = min((m.elbow_angle for m in metrics if m.elbow_angle), default=180)
        if smallest_elbow > 95:
            score -= 14
            mistakes.append("Incomplete curl")
            feedback.append("Curl higher, then lower slowly until the arm extends.")
    elif exercise_type == "shoulderPress":
        top_height = max((m.wrist_height for m in metrics if m.wrist_height is not None), default=-1)
        if top_height < 0.08:
            score -= 14
            mistakes.append("Incomplete overhead press")
            feedback.append("Press the hands clearly above shoulder height.")
    elif exercise_type == "lateralRaise":
        top_shoulder = max((m.shoulder_angle for m in metrics if m.shoulder_angle), default=0)
        max_lean = max((abs(m.torso_lean or 0) for m in metrics), default=0)
        if top_shoulder < 70:
            score -= 16
            mistakes.append("Low lateral raise")
            feedback.append("Raise the arms closer to shoulder height before lowering.")
        if max_lean > 22:
            score -= 8
            mistakes.append("Torso swing")
            feedback.append("Keep the torso quiet and lift with the shoulders.")
    elif exercise_type == "deadlift":
        lowest_hip = min((m.hip_angle for m in metrics if m.hip_angle), default=180)
        max_lean = max((abs(m.torso_lean or 0) for m in metrics), default=0)
        if lowest_hip > 132:
            score -= 14
            mistakes.append("Short hinge range")
            feedback.append("Hinge the hips farther back, then stand tall to finish.")
        if max_lean > 42:
            score -= 8
            mistakes.append("Excessive torso fold")
            feedback.append("Keep the spine neutral and avoid rounding through the hinge.")
    elif exercise_type in {"row", "latPulldown", "pullup"}:
        smallest_elbow = min((m.elbow_angle for m in metrics if m.elbow_angle), default=180)
        if smallest_elbow > 108:
            score -= 14
            mistakes.append("Short pull")
            feedback.append("Pull farther through the elbow range, then return with control.")
    elif exercise_type in {"benchPress", "tricepDip", "chestFly"}:
        smallest_elbow = min((m.elbow_angle for m in metrics if m.elbow_angle), default=180)
        flare = mean_or((m.elbow_flare for m in metrics), 1.0)
        if smallest_elbow > 118:
            score -= 14
            mistakes.append("Shallow pressing depth")
            feedback.append("Lower deeper before pressing back to the top.")
        if flare > 2.05:
            score -= 8
            mistakes.append("Wide elbow flare")
            feedback.append("Keep elbows slightly tucked and wrists stacked.")
    elif exercise_type == "jumpingJack":
        top_shoulder = max((m.shoulder_angle for m in metrics if m.shoulder_angle), default=0)
        if top_shoulder < 85:
            score -= 12
            mistakes.append("Low jumping-jack arms")
            feedback.append("Reach arms higher overhead and open the feet wider.")
    elif exercise_type == "mountainClimber":
        deepest_knee = min((m.front_knee_angle for m in metrics if m.front_knee_angle), default=180)
        body_line_spread = max((m.body_line or 0 for m in metrics), default=0) - min((m.body_line or 0 for m in metrics), default=0)
        if deepest_knee > 110:
            score -= 12
            mistakes.append("Short knee drive")
            feedback.append("Drive the knee farther toward the chest before switching.")
        if body_line_spread > 30:
            score -= 8
            mistakes.append("Unstable climber plank")
            feedback.append("Keep shoulders stacked and hips steady during the switches.")
    elif exercise_type == "gluteBridge":
        highest_hip = max((m.hip_angle for m in metrics if m.hip_angle), default=0)
        if highest_hip < 150:
            score -= 12
            mistakes.append("Low bridge height")
            feedback.append("Lift hips higher and squeeze glutes briefly at the top.")
    elif exercise_type == "legExtension":
        largest_knee = max((m.knee_angle for m in metrics if m.knee_angle), default=0)
        if largest_knee < 150:
            score -= 14
            mistakes.append("Incomplete leg extension")
            feedback.append("Extend the knees closer to straight, then lower slowly.")
    elif exercise_type == "legCurl":
        smallest_knee = min((m.knee_angle for m in metrics if m.knee_angle), default=180)
        if smallest_knee > 110:
            score -= 14
            mistakes.append("Incomplete hamstring curl")
            feedback.append("Curl the heels closer before returning.")
    elif exercise_type == "calfRaise":
        top_lift = max((m.ankle_lift for m in metrics if m.ankle_lift is not None), default=0)
        if top_lift < 4:
            score -= 12
            mistakes.append("Low calf raise")
            feedback.append("Rise higher onto the balls of the feet and pause briefly.")
    elif exercise_type == "crunch":
        max_curl = max((m.effort for m in metrics), default=0)
        if max_curl < 14:
            score -= 12
            mistakes.append("Low crunch range")
            feedback.append("Curl the shoulders higher from the ribs, then lower slowly.")
    elif exercise_type == "burpee":
        max_effort = max((m.effort for m in metrics), default=0)
        if max_effort < 55:
            score -= 16
            mistakes.append("Low burpee range")
            feedback.append("Show a clearer squat/push-up/jump cycle so the full burpee is readable.")
        else:
            feedback.append("Burpee movement detected. Keep full body visible for better rep accuracy.")
    elif exercise_type == "locomotion":
        max_effort = max((m.effort for m in metrics), default=0)
        if max_effort < 35:
            score -= 12
            mistakes.append("Low visible movement")
            feedback.append("For cardio/carry movements, keep the full body visible and exaggerate the working rhythm.")
        else:
            feedback.append("Dynamic movement detected. Repetition accuracy is approximate for cardio/carry exercises.")

    if not feedback:
        feedback.append("Good recording. Reps and form were readable.")

    return max(0, min(100, int(round(score)))), mistakes, feedback


def analyze_with_mediapipe(video_path: str, exercise_name: str, target_reps: Optional[int]) -> Dict:
    try:
        import cv2  # type: ignore
        import mediapipe as mp  # type: ignore
    except Exception as exc:
        missing = []
        for module_name in ("cv2", "mediapipe", "numpy"):
            try:
                __import__(module_name)
            except Exception:
                missing.append(module_name)
        return {
            "success": False,
            "needs_setup": True,
            "engine": "missing_dependencies",
            "missing_dependencies": missing,
            "message": "Install Python video AI dependencies before running recorded analysis.",
            "setup_command": "python -m pip install -r ml/exercise_ai/requirements.txt",
            "error": str(exc),
        }

    exercise_type = detect_exercise_type(exercise_name)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"success": False, "engine": "mediapipe_pose", "message": "Could not open uploaded video."}

    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration_sec = frame_count / fps if fps else 0
    target_sample_fps = 6
    sample_every = max(1, int(round(fps / target_sample_fps)))

    use_solutions_api = hasattr(mp, "solutions")
    pose = None
    landmarker = None

    if use_solutions_api:
        pose = mp.solutions.pose.Pose(
            static_image_mode=False,
            model_complexity=0,
            smooth_landmarks=True,
            min_detection_confidence=0.55,
            min_tracking_confidence=0.55,
        )
    else:
        from mediapipe.tasks import python as mp_python  # type: ignore
        from mediapipe.tasks.python import vision as mp_vision  # type: ignore

        model_path = str(MODEL_PATH)
        if not MODEL_PATH.exists():
            return {
                "success": False,
                "needs_setup": True,
                "engine": "missing_pose_model",
                "message": "Pose Landmarker model file is missing.",
                "model_path": model_path,
                "download_url": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
            }

        options = mp_vision.PoseLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=model_path),
            running_mode=mp_vision.RunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.55,
            min_pose_presence_confidence=0.55,
            min_tracking_confidence=0.55,
        )
        landmarker = mp_vision.PoseLandmarker.create_from_options(options)

    metrics: List[FrameMetric] = []
    processed = 0
    frame_index = 0
    max_analysis_seconds = 90
    max_frames = int(min(frame_count or fps * max_analysis_seconds, fps * max_analysis_seconds))

    while frame_index < max_frames:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_index % sample_every == 0:
            processed += 1
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            timestamp_ms = int((frame_index / fps) * 1000)
            landmarks = None
            if pose:
                result = pose.process(rgb)
                landmarks = result.pose_landmarks.landmark if result.pose_landmarks else None
            elif landmarker:
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                result = landmarker.detect_for_video(mp_image, timestamp_ms)
                landmarks = result.pose_landmarks[0] if result.pose_landmarks else None

            if landmarks:
                timestamp_ms = int((frame_index / fps) * 1000)
                item = extract_metric(exercise_type, landmarks, timestamp_ms)
                if item:
                    metrics.append(item)
        frame_index += 1

    cap.release()
    if pose:
        pose.close()
    if landmarker:
        landmarker.close()

    rep_info = count_reps(metrics, exercise_type)
    form_score, mistakes, feedback = score_form(metrics, exercise_type, rep_info)
    confidence = round(mean_or((m.confidence for m in metrics), 0) * 100)
    rep_reliability = int(rep_info.get("reliability", 0) or 0)

    if target_reps and rep_info["reps"] > target_reps + 2:
        feedback.append("The counted reps exceed the target; check that the recording contains only one set.")
    elif target_reps and abs(rep_info["reps"] - target_reps) == 1 and rep_reliability < 76:
        feedback.append("The result is close to the target but the camera signal was not perfect; repeat with a clearer angle if exact reps matter.")
    if confidence < 72:
        advice = camera_advice_for(exercise_type)
        if advice not in feedback:
            feedback.append(advice)

    return {
        "success": True,
        "engine": "mediapipe_pose",
        "exercise_type": exercise_type,
        "exercise_name": exercise_name,
        "reps": rep_info["reps"],
        "target_reps": target_reps,
        "form_score": form_score,
        "confidence": confidence,
        "rep_reliability": rep_reliability,
        "rep_count_quality": "high" if rep_reliability >= 82 else ("medium" if rep_reliability >= 64 else "low"),
        "duration_sec": round(duration_sec, 1),
        "analyzed_duration_sec": round(min(duration_sec or max_analysis_seconds, max_analysis_seconds), 1),
        "sample_fps": target_sample_fps,
        "processed_frames": processed,
        "valid_frames": len(metrics),
        "movement_range": rep_info["range"],
        "thresholds": {
            "low": rep_info["low"],
            "high": rep_info["high"],
            "min_range": rep_info.get("min_range", MIN_MOVEMENT_RANGE.get(exercise_type, 22.0)),
            "start_phase": rep_info.get("start_phase"),
            "min_rep_ms": rep_info.get("min_rep_ms"),
        },
        "mistakes": mistakes,
        "feedback": feedback,
        "events": rep_info["events"],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--exercise", default="general")
    parser.add_argument("--target-reps", type=int, default=0)
    args = parser.parse_args()

    result = analyze_with_mediapipe(
        video_path=args.video,
        exercise_name=args.exercise,
        target_reps=args.target_reps or None,
    )
    print(json.dumps(result, ensure_ascii=True))
    return 0 if result.get("success") or result.get("needs_setup") else 1


if __name__ == "__main__":
    raise SystemExit(main())
