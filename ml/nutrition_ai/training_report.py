"""Generate a readable report from the completed model's recorded metrics."""


def write_training_report(path, forest, reference):
    validation = forest["validationMetrics"]
    baseline = forest["decisionTreeBaseline"]
    ranking = forest["heldOutRanking"]
    provenance = forest["label_provenance"]
    selection = forest["model_selection"]
    features = sorted(forest["feature_importances"].items(), key=lambda item: item[1], reverse=True)[:8]
    lines = [
        "# NutriCore Model Report", "",
        "The model ranks eligible meal options with a Random Forest classifier. Scores are relative suitability scores, not calibrated health probabilities.", "",
        "## Data And Labels", "",
        f"- Meals: {forest['dataset_audit']['meals']} with complete nutrient records.",
        f"- Rule-derived user/meal examples: {provenance['synthetic_pairs']}.",
        f"- Reviewer-entered training examples: {provenance['reviewer_entered_pairs']}.",
        f"- Fitting/development/test scenarios: {len(selection['fitting_groups'])}/{len(selection['development_groups'])}/{len(selection['test_groups'])}.",
        "- Test scenarios are excluded from parameter and threshold selection.",
        "- Labels use the top-third rubric cutoff per meal slot, include score ties, and require a rubric score of at least 0.55. Duplicate recipe aliases share training weight.",
        "- Reviewer ratings, when supplied, receive 4x training weight. Ratings 4-5 are positive, 1-2 negative, and 3 omitted.",
        "- No generated rating is presented as a human or expert review.", "",
        "## Unseen Scenario Results", "",
        "| Measure | Random Forest | Decision Tree Baseline |",
        "| --- | ---: | ---: |",
    ]
    for title, key in [("Average precision", "averagePrecision"), ("Balanced accuracy (%)", "balancedAccuracy"),
                       ("F1", "f1"), ("Brier score (lower is better)", "brierScore")]:
        lines.append(f"| {title} | {validation[key]} | {baseline[key]} |")
    lines.extend([
        "", f"Top-three hit rate: {ranking['hitRateAt3']}% across {ranking['eligible_slots']} eligible test slots.",
        f"Precision@3: {ranking['precisionAt3']}; binary-relevance NDCG@3: {ranking['ndcgAt3']}.",
        "These results measure agreement with rule-derived labels, not independent expert or clinical validation.", "",
        "## Project Reference Checks", "",
        f"The unchanged four project shortlists have a top-three hit rate of {reference['goalRecommendationAccuracy']}% and a first-choice hit rate of {reference['topMealApprovalAccuracy']}%.",
        "The shortlists are sparse and not treated as exhaustive negative labels. They are not used to choose the model's parameters.", "",
        "## Explanation", "",
        '"Each tree asks simple questions about nutritional fit, available ingredients, preferences, and goals. We average their outputs, apply mandatory filters, and choose the highest-ranked options."', "",
        "Global feature importance describes the trained model as a whole; it is not a causal explanation of one recommendation.", "",
        "| Feature | Importance |", "| --- | ---: |",
    ])
    lines.extend(f"| {name} | {importance:.4f} |" for name, importance in features)
    lines.extend([
        "", "## Serving And Integration", "",
        "Portions are scaled to the calorie target within 0.5x-2x the source portion. Displayed macros are the scaled recipe macros, not copied target values. Ingredient grams retain the USDA preparation-state basis.",
        "Instructions state raw, dry, cooked, drained, or as-sold weight bases. Raw rice grams must not be interpreted as cooked rice grams; no unsupported conversion factor is applied.",
        "Names identify the actual recipe ingredients. Identical recipes are deduplicated in swap suggestions and replacement alternatives; variety penalties recognize aliases. Dataset IDs remain unchanged to preserve existing approval records.",
        "API routes and required response fields are preserved. Existing stored plans are not rewritten. Frontend screens require no modifications.",
        "The model checks its feature schema and dataset fingerprint before serving. Exported predictions were compared with scikit-learn.", "",
        "## Human Review", "",
        "The generated reviewer worksheet contains unrated candidates. A reviewer supplies the rating, reviewer name, ISO review date, and notes. Import rejects malformed ratings and unknown meal IDs. Labels do not automatically approve meals for display.",
        "Actual reviewer labels are still needed for independent assessment and further refinement.", "",
        "## Limits And Research", "",
        "The recipe expert_score field is a legacy rule prior, not a human rating. Research-based criteria do not become independent expert labels.",
        "The current model does not establish fibre, sodium, saturated fat, micronutrient adequacy, or whole-day dietary quality from macro totals. Ingredient filters cannot establish absence of allergen cross-contact. See REVIEW_GUIDE.md for primary sources and reviewer checks.", "",
    ])
    path.write_text("\n".join(lines), encoding="utf-8")
