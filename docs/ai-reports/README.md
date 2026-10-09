# Illustrated AI Reports

One report per active AI module, plus a combined printable PDF.

[Combined illustrated PDF](../../output/pdf/ai_modules_illustrated_report.pdf)

Reports distinguish learned models, explicit rules, and external/pretrained models. Synthetic examples are marked; no user logs or credentials are included.

- [TrainCore / Workout Recommendations](traincore.md)
- [NutriCore / Meals And Fridge Swaps](nutricore.md)
- [PredictionAI / Weight Trend](prediction.md)
- [PoseForm / Exercise Video](poseform.md)
- [ProgressAI / Progress And Scenarios](progress.md)
- [GoalAI / Suggested Goal Weight](goal.md)
- [AI Coach / Conversation](chat.md)

## Regeneration

Install `python -m pip install -r ml/requirements-reports.txt`, then run `python scripts/build-ai-reports.py`. The script can reuse the local PoseForm vendor libraries. It reads trained forest artifacts; reports do not retrain models.
