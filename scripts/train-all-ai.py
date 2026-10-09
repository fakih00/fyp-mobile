#!/usr/bin/env python3
"""
Run the local AI training/validation pipeline in the same spirit as the
model lifecycle: preprocess, train, validate, and report metrics.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_step(name: str, command: list[str]) -> dict:
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
    payload = {
        "name": name,
        "command": " ".join(command),
        "returncode": result.returncode,
        "success": result.returncode == 0,
    }
    output = result.stdout.strip()
    if output:
        try:
            payload["output"] = json.loads(output.splitlines()[-1])
        except json.JSONDecodeError:
            payload["output"] = output[-1200:]
    if result.stderr.strip():
        payload["stderr"] = result.stderr.strip()[-1200:]
    return payload


def main() -> int:
    python = sys.executable
    steps = [
        ("NutriCore Random Forest training", [python, "ml/nutrition_ai/nutricore_model.py", "--train"]),
        ("TrainCore Random Forest training", [python, "ml/workout_ai/traincore_model.py", "--train"]),
        ("PredictionAI linear regression validation", ["php", "scripts/test-prediction-ai.php"]),
        ("PoseForm template validation", ["node", "scripts/validate-exercise-ai.js"]),
        ("PoseForm JS validation", ["node", "scripts/test-exercise-ai.js"]),
        ("PoseForm Python analyzer validation", [python, "scripts/validate-video-pose-analyzer.py"]),
    ]
    results = [run_step(name, command) for name, command in steps]
    summary = {
        "success": all(item["success"] for item in results),
        "pipeline": "local Random Forest training and linear regression validation",
        "steps": results,
    }
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0 if summary["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
