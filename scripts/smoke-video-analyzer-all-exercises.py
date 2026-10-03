import importlib.util
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "ml" / "exercise_ai" / "video_pose_analyzer.py"
UPLOAD_DIR = ROOT / "backend" / "uploads" / "exercise_ai"

spec = importlib.util.spec_from_file_location("poseform_video_pose_analyzer", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
sys.modules["poseform_video_pose_analyzer"] = module
spec.loader.exec_module(module)


def latest_video():
    clips = sorted(
        [path for path in UPLOAD_DIR.glob("*.mp4") if path.stat().st_size < 38 * 1024 * 1024],
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if not clips:
        raise RuntimeError("No under-limit uploaded exercise video found for smoke testing.")
    return clips[0]


def load_landmark_frames(video_path, sample_fps=4, max_seconds=20):
    import cv2
    import mediapipe as mp

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    sample_every = max(1, int(round(fps / sample_fps)))
    max_frames = int(min(frame_count or fps * max_seconds, fps * max_seconds))
    frames = []

    pose = None
    landmarker = None
    if hasattr(mp, "solutions"):
        pose = mp.solutions.pose.Pose(
            static_image_mode=False,
            model_complexity=0,
            smooth_landmarks=True,
            min_detection_confidence=0.55,
            min_tracking_confidence=0.55,
        )
    else:
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision as mp_vision

        options = mp_vision.PoseLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=str(module.MODEL_PATH)),
            running_mode=mp_vision.RunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.55,
            min_pose_presence_confidence=0.55,
            min_tracking_confidence=0.55,
        )
        landmarker = mp_vision.PoseLandmarker.create_from_options(options)
    try:
        frame_index = 0
        while frame_index < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            if frame_index % sample_every == 0:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                timestamp_ms = int((frame_index / fps) * 1000)
                if pose:
                    result = pose.process(rgb)
                    if result.pose_landmarks:
                        frames.append((result.pose_landmarks.landmark, timestamp_ms))
                else:
                    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                    result = landmarker.detect_for_video(mp_image, timestamp_ms)
                    if result.pose_landmarks:
                        frames.append((result.pose_landmarks[0], timestamp_ms))
            frame_index += 1
    finally:
        cap.release()
        if pose:
            pose.close()
        if landmarker:
            landmarker.close()

    if not frames:
        raise RuntimeError("No readable pose landmarks found in smoke-test video.")
    return frames


if __name__ == "__main__":
    video = latest_video()
    frames = load_landmark_frames(video)
    print(f"video {video.name} landmark_frames={len(frames)}")

    failures = []
    for exercise_type in module.EXERCISE_LABELS.keys():
        metrics = []
        for landmarks, timestamp_ms in frames:
            metric = module.extract_metric(exercise_type, landmarks, timestamp_ms)
            if metric:
                metrics.append(metric)
        rep_info = module.count_reps(metrics, exercise_type)
        score, mistakes, feedback = module.score_form(metrics, exercise_type, rep_info)
        ok = len(metrics) > 0 and 0 <= score <= 100 and isinstance(feedback, list) and len(feedback) > 0
        print(
            f"{'OK' if ok else 'FAIL'} {exercise_type} "
            f"valid={len(metrics)} reps={rep_info['reps']} score={score} feedback={feedback[0] if feedback else ''}"
        )
        if not ok:
            failures.append(exercise_type)

    if failures:
        raise SystemExit(f"Failed profiles: {', '.join(failures)}")
