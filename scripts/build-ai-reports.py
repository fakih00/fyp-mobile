"""Build illustrated module reports from current artifacts, without user data."""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / "tmp" / "report-matplotlib"))
sys.path.insert(0, str(ROOT / "ml" / "exercise_ai" / "vendor"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak

OUT = ROOT / "docs" / "ai-reports"
IMAGES = OUT / "images"
PDF = ROOT / "output" / "pdf" / "ai_modules_illustrated_report.pdf"
INK, GREEN, RED = "#20262b", "#16866c", "#c3464a"
plt.rcParams.update({"font.size": 11, "text.color": INK, "axes.labelcolor": INK,
                     "axes.spines.top": False, "axes.spines.right": False})


def save(fig, name):
    path = IMAGES / f"{name}.png"
    fig.savefig(path, dpi=160, facecolor="white", bbox_inches="tight")
    plt.close(fig)
    return path


def flow(name, labels):
    fig, ax = plt.subplots(figsize=(9, 2))
    ax.set(xlim=(0, len(labels)), ylim=(0, 1))
    ax.axis("off")
    for index, label in enumerate(labels):
        ax.add_patch(FancyBboxPatch((index + 0.05, 0.24), 0.82, 0.54,
                                   boxstyle="round,pad=0.02,rounding_size=0.03",
                                   facecolor="#e6f3ed" if index % 2 == 0 else "#f2f3f5",
                                   edgecolor=GREEN if index % 2 == 0 else "#707880"))
        ax.text(index + 0.46, 0.51, label, ha="center", va="center", fontsize=10)
        if index < len(labels) - 1:
            ax.annotate("", xy=(index + 1.04, 0.51), xytext=(index + 0.89, 0.51),
                        arrowprops={"arrowstyle": "->", "color": INK})
    return save(fig, f"{name}-flow")


def bar(name, title, values, ylabel):
    fig, ax = plt.subplots(figsize=(8, 3))
    ax.bar(["Random Forest", "Single Tree"], values, color=[GREEN, RED], width=0.5)
    ax.set(title=title, ylabel=ylabel, ylim=(0, max(values) * 1.24))
    for index, value in enumerate(values):
        ax.text(index, value + max(values) * 0.035, f"{value:.5f}", ha="center")
    ax.grid(axis="y", alpha=0.15)
    return save(fig, name)


def paragraph(text, style):
    return Paragraph(escape(text), style)


def build():
    IMAGES.mkdir(parents=True, exist_ok=True)
    PDF.parent.mkdir(parents=True, exist_ok=True)
    workout = json.loads((ROOT / "ml/workout_ai/traincore_trained_model.json").read_text())
    nutrition = json.loads((ROOT / "ml/nutrition_ai/nutricore_random_forest.json").read_text())
    wf = workout["random_forest"]
    modules = [
        {"id": "traincore", "title": "TrainCore / Workout Recommendations", "kind": "Local Random Forest regressor",
         "steps": ["User\nprofile", "Injury /\nlocation filters", "64 trees\nscore exercises", "Variety +\nplan structure", "Weekly\nworkout plan"],
         "how": "Encode goal, location, intensity, exercise category, movement family, and numeric fit features. Each trained tree predicts an exercise suitability score; average the 64 predictions. Hard restrictions and plan-building rules remain separate from the learned model.",
         "training": f"Rule-derived profile/exercise examples: {wf['training_samples']:,} training and {wf['validation_samples']:,} held out. Grouped profiles stay together. Compare the forest with a single-tree baseline. No feature scaling is required.",
         "evidence": f"Held-out score MAE: {wf['validationMetrics']['meanAbsoluteError']}; single-tree baseline: {wf['decisionTreeBaseline']['meanAbsoluteError']}. The training pipeline generated and checked 3,960 profile plans. These are rule-agreement and structural checks, not clinical validation.",
         "example": "Illustrative: a home-training user with knee pain gets location- and injury-filtered candidates before scoring. A high model score cannot override those restrictions. The selected exercises are arranged into the requested weekly schedule.",
         "limits": "Rule-derived labels are not observed injury or fitness outcomes. The forest is easier to describe than a neural network, but 64 trees are less transparent than one tree. Check equipment availability and obtain appropriate professional advice for injuries.",
         "source": "ml/workout_ai/traincore_model.py; ml/workout_ai/traincore_trained_model.json"},
        {"id": "nutricore", "title": "NutriCore / Meals And Fridge Swaps", "kind": "Local Random Forest classifier",
         "steps": ["Profile +\nmeal targets", "Allergy / dislike\nexclusions", "Scale recipe\nportions", "64 trees +\nmanual approval", "Plan / swap\nrecommendation"],
         "how": "Preprocess complete USDA nutrient records into 72 recipes. Scale portions within 0.5x-2x, keeping ingredient grams and nutrients consistent. Trees compare macro, goal, fridge, and preference fit. Only manually approved options can be shown. Small macro bonuses, feedback, and variety adjustments influence final ranking; duplicate aliases are suppressed.",
         "training": f"{nutrition['label_provenance']['synthetic_pairs']:,} rule-derived examples over 600 scenarios. Split scenarios 60/20/20 for fitting, development, and test; select settings on development only, then refit on fitting plus development. Tied rubric scores receive consistent labels, and identical recipes share training weight.",
         "evidence": f"Held-out average precision: {nutrition['validationMetrics']['averagePrecision']}; baseline: {nutrition['decisionTreeBaseline']['averagePrecision']}. Top-three rule-label hit rate: {nutrition['heldOutRanking']['hitRateAt3']}% over {nutrition['heldOutRanking']['eligible_slots']} eligible test slots. Human training ratings currently available: {nutrition['label_provenance']['reviewer_entered_pairs']}.",
         "example": "Illustrative: with a 2,200-calorie daily target and four meals, lunch receives 30%, or 660 calories. A 550-calorie recipe scales by 1.2. A base 40 g protein becomes 48 g. Milk-containing options are excluded for a recorded dairy allergy. An unapproved recipe is excluded even with a high score.",
         "limits": "Scores are relative suitability, not health probabilities. Existing recipe approval is not expert validation of every personalized portion. Gram instructions state raw/dry, cooked, drained, or as-sold weight. Ingredient records do not guarantee absence of allergen cross-contact. Macro totals alone do not establish fibre, sodium, or micronutrient adequacy.",
         "source": "ml/nutrition_ai/nutricore_model.py; train_model.py; MODEL_REPORT.md; REVIEW_GUIDE.md"},
        {"id": "prediction", "title": "PredictionAI / Weight Trend", "kind": "Local ordinary least-squares linear regression",
         "steps": ["Dated\nweight logs", "Sort + convert\nto elapsed days", "Fit slope\nand intercept", "Earlier-to-later\nvalidation", "30-day trend\nextrapolation"],
         "how": "Fit weight = intercept + slope x elapsed days. The slope describes average weight change per day. Fit the final trend to all available records and extrapolate 30 days beyond the latest observation. Refit for each user when requested; no shared model artifact needs offline training.",
         "training": "With at least four records and two distinct dates in the earlier training subset, hold out the latest 25% and predict those observations using only earlier data. Validation MAE is unavailable when there is insufficient data. Legacy training_accuracy is R-squared percentage, not classification accuracy.",
         "evidence": "The local validation script passes 10 cases covering exact lines, chronological error, ordering, insufficient data, and duplicate dates. A perfect score on a synthetic straight line is not real-world forecast accuracy.",
         "example": "Illustrative only: logs following weight = 82 - 0.1 x day have a slope of -0.1 kg/day. If the latest day is 28, a 30-day extension reaches day 58 and predicts 76.2 kg. This is mathematical extrapolation, not a promised outcome.",
         "limits": "Weight change is rarely linear indefinitely. Water fluctuations, sparse logs, changing behaviour, and medical factors can invalidate the forecast. It is a trend estimate, not a treatment or target-weight prescription.",
         "source": "backend/services/PredictionAI.php; scripts/test-prediction-ai.php"},
        {"id": "poseform", "title": "PoseForm / Exercise Video", "kind": "Pretrained MediaPipe plus explicit movement rules",
         "steps": ["Recorded\nvideo", "MediaPipe\nbody landmarks", "Visibility +\njoint angles", "Movement\nphase tracking", "Reps + form\nfeedback"],
         "how": "Read video frames and locate body joints with pretrained MediaPipe. Compute joint angles and select the more visible side. Exercise-specific start/end phases, range checks, and visibility thresholds determine repetitions and form feedback. This module still uses a neural pose detector; it was not replaced or retrained.",
         "training": "No local neural-network training. The supplied MediaPipe model is already trained. Local pose templates and movement rules are validated using synthetic pose sequences and exercise aliases.",
         "evidence": "17 template/form tests, two JavaScript repetition/noise checks, and three Python analyzer suites pass. An uploaded-video smoke test processed 62 landmark frames across 24 exercise modes. Running all modes on one clip checks robustness, not accuracy for 24 different exercises.",
         "example": "Illustrative: a squat must complete the configured standing-to-lowered-to-standing sequence. Small jitter and incomplete movement should not count as a full repetition. If body landmarks are unclear, the analyzer requests a clearer recording rather than treating missing joints as valid movement.",
         "limits": "Camera angle, occlusion, lighting, frame skipping, exercise selection, and movement variation affect results. Labeled exercise videos are needed to measure rep-count and form accuracy independently.",
         "source": "ml/exercise_ai/video_pose_analyzer.py; poseform_pose_templates.json; scripts/validate-exercise-ai.js"},
        {"id": "progress", "title": "ProgressAI / Progress And Scenarios", "kind": "Explicit PHP rules and heuristic simulation",
         "steps": ["Logs +\nadherence", "Compare\nthresholds", "Weight / sleep\ntrend checks", "Scenario\nformulas", "Status +\nadvice"],
         "how": "Compare workout and nutrition adherence with explicit thresholds, inspect recent weight change, and generate predefined status and advice. Scenario simulation combines calorie delta, steps, sleep, and workout frequency using project formulas. There is no learned model or training file.",
         "training": "Not applicable. Rules are edited and tested as ordinary code; weights are not learned from examples.",
         "evidence": "This report describes the current source. The recommendation test suites do not independently validate ProgressAI's simulated health outcomes. No predictive accuracy is claimed.",
         "example": "With 50% workout adherence and 80% nutrition adherence, the audit reports Needs Attention because at least one adherence value is below 60%. Advice emphasizes consistency rather than adding extra training volume.",
         "limits": "Simulation constants and thresholds are project heuristics. They are not individualized physiology or clinical evidence, and status labels should not be treated as diagnoses.",
         "source": "backend/services/ProgressAI.php"},
        {"id": "goal", "title": "GoalAI / Suggested Goal Weight", "kind": "Explicit body-composition heuristics",
         "steps": ["Profile +\nbody-fat input", "Estimate\nlean body mass", "Goal-specific\nbody-fat target", "Lifestyle +\nBMI rules", "Suggested\nweight"],
         "how": "Estimate lean body mass from weight and supplied or heuristically estimated body fat. Compute a suggested weight for a fixed goal-specific body-fat percentage, apply small lifestyle adjustments, then apply BMI-related safeguards. No neural network or Random Forest is used.",
         "training": "Not applicable. The body-fat estimates, targets, and adjustments are hand-written formulas, not learned parameters.",
         "evidence": "No independent validation of goal-weight accuracy is available. Reported values describe the current code, not professional recommendations.",
         "example": "Illustrative intermediate calculation: 80 kg at 25% body fat implies 60 kg lean mass. A hypothetical 20% target gives 60 / 0.8 = 75 kg before adjustments. That target is an illustration, not an actual recommendation for a user.",
         "limits": "Waist-only estimates and default body-fat assumptions can be inaccurate. Fixed body-fat targets and BMI rules require professional review before presenting them as health-optimal goals. The app's suggested weight is not a clinical prescription.",
         "source": "backend/services/GoalAI.php"},
        {"id": "chat", "title": "AI Coach / Conversation", "kind": "External Gemini model through a PHP API wrapper",
         "steps": ["User\nmessage", "Chat history +\nsystem guidance", "Gemini\nAPI request", "Provider\nresponse", "Stored\nconversation"],
         "how": "Send conversation history and coaching instructions to Gemini using a server-side environment key. Display the provider response and store chat history. The chat instructions reserve workouts, meals, and video analysis for the dedicated local modules.",
         "training": "No local model training or fine-tuning. GEMINI_MODEL chooses the provider model. A model-name alias may change over time; it is not a reproducible locally trained artifact.",
         "evidence": "Requires configured credentials and network access. This report does not make a live Gemini call or claim an evaluated coaching accuracy. Credentials are excluded from Git and the report.",
         "example": "A question about staying consistent is sent as conversational context. Full workout generation remains TrainCore's responsibility; NutriCore owns meal plans, and PoseForm owns recorded-video analysis.",
         "limits": "Provider responses can be incorrect or inappropriate. Conversation content is transmitted to an external service. Use privacy-aware inputs and do not treat chat as medical diagnosis.",
         "source": "backend/controllers/AIChatController.php; backend/services/GeminiService.php"},
    ]
    for module in modules:
        module["images"] = [flow(module["id"], module["steps"])]
    modules[0]["images"].append(bar("workout-validation", "Held-out workout score error (lower is better)",
                                  [wf["validationMetrics"]["meanAbsoluteError"], wf["decisionTreeBaseline"]["meanAbsoluteError"]], "Mean absolute error"))
    modules[1]["images"].append(bar("nutrition-validation", "Held-out nutrition average precision (higher is better)",
                                  [nutrition["validationMetrics"]["averagePrecision"], nutrition["decisionTreeBaseline"]["averagePrecision"]], "Average precision"))
    fig, ax = plt.subplots(figsize=(8, 3))
    days = [0, 7, 14, 21, 28]
    ax.scatter(days, [82 - 0.1 * day for day in days], color=GREEN, label="Illustrative logs")
    ax.plot([0, 28], [82, 79.2], color=GREEN)
    ax.plot([28, 58], [79.2, 76.2], "--", color=RED, label="Illustrative extrapolation")
    ax.set(title="Synthetic straight-line example - not a user forecast", xlabel="Elapsed days", ylabel="Weight (kg)")
    ax.legend(loc="upper right", frameon=False, fontsize=9)
    modules[2]["images"].append(save(fig, "prediction-example"))
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d UTC")
    for module in modules:
        lines = [f"# {module['title']}", "", f"**{module['kind']}** | Generated {stamp}", ""]
        for heading, key in [("How It Works", "how"), ("Training", "training"), ("Evidence", "evidence"), ("Example", "example"), ("Limits", "limits")]:
            lines.extend([f"## {heading}", "", module[key], ""])
            if key == "how":
                lines.extend([f"![{module['title']} workflow](images/{module['images'][0].name})", ""])
            if key == "evidence" and len(module["images"]) > 1:
                lines.extend([f"![Chart](images/{module['images'][1].name})", ""])
        lines.extend(["## Source", "", module["source"], ""])
        (OUT / f"{module['id']}.md").write_text("\n".join(lines), encoding="utf-8")
    index = ["# Illustrated AI Reports", "", "One report per active AI module, plus a combined printable PDF.", "",
             "[Combined illustrated PDF](../../output/pdf/ai_modules_illustrated_report.pdf)", "",
             "Reports distinguish learned models, explicit rules, and external/pretrained models. Synthetic examples are marked; no user logs or credentials are included.", ""]
    index.extend(f"- [{module['title']}]({module['id']}.md)" for module in modules)
    index.extend(["", "## Regeneration", "", "Install `python -m pip install -r ml/requirements-reports.txt`, then run `python scripts/build-ai-reports.py`. The script can reuse the local PoseForm vendor libraries. It reads trained forest artifacts; reports do not retrain models.", ""])
    (OUT / "README.md").write_text("\n".join(index), encoding="utf-8")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="ReportBody", fontName="Helvetica", fontSize=9.5, leading=13, spaceAfter=7))
    styles.add(ParagraphStyle(name="ReportHeading", fontName="Helvetica-Bold", fontSize=12, leading=15, spaceBefore=9, spaceAfter=5, textColor=colors.HexColor(GREEN)))
    story = [paragraph("Fitness App: Illustrated AI Reports", styles["Title"]), Spacer(1, 18),
             paragraph(f"Generated {stamp} from the current local code and trained artifacts.", styles["ReportBody"]),
             paragraph("Seven module reports explain inputs, processing, training, examples, measured evidence, and limits. No patient or user records are included. Research-based rules and synthetic labels are not independent human-expert validation.", styles["ReportBody"])]
    for module in modules:
        story.extend([Spacer(1, 10), paragraph(module["title"], styles["ReportHeading"]), paragraph(module["kind"], styles["ReportBody"])])
    for module in modules:
        story.extend([PageBreak(), paragraph(module["title"], styles["Heading1"]), paragraph(module["kind"], styles["ReportBody"]),
                      Image(str(module["images"][0]), width=475, height=105)])
        for heading, key in [("How It Works", "how"), ("Training And Evidence", "training"), ("Example", "example"), ("Limits", "limits")]:
            story.extend([paragraph(heading, styles["ReportHeading"]), paragraph(module[key], styles["ReportBody"])])
            if key == "training":
                story.append(paragraph(module["evidence"], styles["ReportBody"]))
                if len(module["images"]) > 1:
                    story.append(Image(str(module["images"][1]), width=440, height=155))
        story.extend([paragraph("Source", styles["ReportHeading"]), paragraph(module["source"], styles["ReportBody"])])
    def footer(canvas, doc):
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#60666c"))
        canvas.drawString(42, 25, "Fitness App | Engineering report | Not clinical validation")
        canvas.drawRightString(A4[0] - 42, 25, str(doc.page))
    SimpleDocTemplate(str(PDF), pagesize=A4, rightMargin=42, leftMargin=42, topMargin=36, bottomMargin=42,
                      title="Fitness App Illustrated AI Reports", author="Project engineering documentation").build(story, onFirstPage=footer, onLaterPages=footer)
    print(json.dumps({"reports": len(modules), "images": sum(len(module["images"]) for module in modules), "pdf": str(PDF)}))


if __name__ == "__main__":
    build()
