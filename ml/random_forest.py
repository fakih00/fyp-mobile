"""Train with scikit-learn; serve the learned trees without runtime dependencies."""

import math
import struct


def predict_forest(model, features):
    if len(features) != model["feature_count"]:
        raise ValueError("Random Forest feature schema mismatch")
    if not all(math.isfinite(float(value)) for value in features):
        raise ValueError("Random Forest inputs must be finite")
    values = [struct.unpack("f", struct.pack("f", value))[0] for value in features]
    total = 0.0
    for tree in model["trees"]:
        node = 0
        while tree["left"][node] != -1:
            feature = tree["feature"][node]
            # sklearn evaluates trees with float32 inputs.
            value = values[feature]
            node = tree["left"][node] if value <= tree["threshold"][node] else tree["right"][node]
        total += tree["value"][node]
    return total / len(model["trees"])


def train_forest(features, labels, groups, feature_names, task, professional=False, sample_weights=None):
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.metrics import average_precision_score, balanced_accuracy_score, mean_absolute_error, f1_score, precision_score, recall_score, brier_score_loss
    from sklearn.model_selection import GroupShuffleSplit
    from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

    x = np.asarray(features, dtype=np.float32)
    y = np.asarray(labels)
    train, validation = next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42).split(x, y, groups))
    classifier = task == "classification"
    forest_class = RandomForestClassifier if classifier else RandomForestRegressor
    baseline_class = DecisionTreeClassifier if classifier else DecisionTreeRegressor
    settings = dict(n_estimators=64, max_depth=8, min_samples_leaf=3, random_state=42, n_jobs=-1)
    baseline = baseline_class(max_depth=5, min_samples_leaf=3, random_state=42)
    weights = np.ones(len(y)) if sample_weights is None else np.asarray(sample_weights, dtype=float)
    selection = None
    threshold = 0.5
    baseline_threshold = 0.5
    if professional:
        fitting, development = next(GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=43).split(x[train], y[train], np.asarray(groups)[train]))
        fitting, development = train[fitting], train[development]
        candidates = []
        for options in [dict(max_depth=8, min_samples_leaf=3),
                        dict(max_depth=10, min_samples_leaf=6),
                        dict(max_depth=8, min_samples_leaf=3, class_weight="balanced_subsample")]:
            candidate_settings = {**settings, **options}
            candidate = forest_class(**candidate_settings)
            candidate.fit(x[fitting], y[fitting], sample_weight=weights[fitting])
            scores = candidate.predict_proba(x[development])[:, 1]
            average_precision = float(average_precision_score(y[development], scores))
            candidates.append((average_precision, candidate_settings, scores))
        best = max(candidates, key=lambda candidate: candidate[0])
        settings = best[1]
        threshold = max([0.25, 0.35, 0.45, 0.5, 0.6, 0.7], key=lambda value: f1_score(y[development], best[2] >= value))
        baseline.fit(x[fitting], y[fitting], sample_weight=weights[fitting])
        baseline_scores = baseline.predict_proba(x[development])[:, 1]
        baseline_threshold = max([0.25, 0.35, 0.45, 0.5, 0.6, 0.7], key=lambda value: f1_score(y[development], baseline_scores >= value))
        selection = {
            "objective": "average precision on development scenarios; F1 for decision threshold",
            "fitting_groups": sorted(set(str(groups[index]) for index in fitting)),
            "development_groups": sorted(set(str(groups[index]) for index in development)),
            "test_groups": sorted(set(str(groups[index]) for index in validation)),
            "candidates": [{"parameters": item[1], "developmentAveragePrecision": round(item[0], 5)} for item in candidates],
            "selected_parameters": settings, "decision_threshold": threshold,
            "baseline_decision_threshold": baseline_threshold,
            "test_used_for_selection": False,
        }
    forest = forest_class(**settings)
    forest.fit(x[train], y[train], sample_weight=weights[train])
    baseline.fit(x[train], y[train], sample_weight=weights[train])
    if classifier and list(forest.classes_) != [0, 1]:
        raise ValueError("Training requires both suitable and unsuitable meal examples")

    def predictions(estimator, indices):
        return estimator.predict_proba(x[indices])[:, 1] if classifier else estimator.predict(x[indices])

    def metrics(estimator, indices, decision_threshold=threshold):
        predicted = predictions(estimator, indices)
        result = {"meanAbsoluteError": round(float(mean_absolute_error(y[indices], predicted)), 5)}
        if classifier:
            result.update(
                accuracy=round(float(np.mean((predicted >= decision_threshold) == y[indices])) * 100, 2),
                balancedAccuracy=round(float(balanced_accuracy_score(y[indices], predicted >= decision_threshold)) * 100, 2),
                averagePrecision=round(float(average_precision_score(y[indices], predicted)), 5),
                positiveRate=round(float(np.mean(y[indices])), 5),
                precision=round(float(precision_score(y[indices], predicted >= decision_threshold, zero_division=0)), 5),
                recall=round(float(recall_score(y[indices], predicted >= decision_threshold, zero_division=0)), 5),
                f1=round(float(f1_score(y[indices], predicted >= decision_threshold, zero_division=0)), 5),
                brierScore=round(float(brier_score_loss(y[indices], predicted)), 5),
            )
        return result

    trees = []
    for estimator in forest.estimators_:
        tree = estimator.tree_
        values = tree.value[:, 0, :]
        if classifier:
            values = values[:, 1] / values.sum(axis=1)
        else:
            values = values[:, 0]
        trees.append({"left": tree.children_left.tolist(), "right": tree.children_right.tolist(),
                      "feature": tree.feature.tolist(), "threshold": tree.threshold.tolist(), "value": values.tolist()})
    model = {
        "type": "random_forest_classifier" if classifier else "random_forest_regressor",
        "framework": "scikit-learn training / exported JSON inference",
        "feature_names": feature_names, "feature_count": len(feature_names),
        "n_estimators": len(trees), "max_depth": settings["max_depth"], "min_samples_leaf": settings["min_samples_leaf"],
        "random_state": 42, "training_samples": len(train), "validation_samples": len(validation),
        "split_method": "held-out complete profile/scenario groups (80/20, seed 42)",
        "training_groups": len(set(groups[index] for index in train)),
        "validation_groups": len(set(groups[index] for index in validation)),
        "trainingMetrics": metrics(forest, train), "validationMetrics": metrics(forest, validation),
        "decisionTreeBaseline": metrics(baseline, validation, baseline_threshold),
        "feature_importances": dict(zip(feature_names, forest.feature_importances_.tolist())), "trees": trees,
    }
    if selection:
        model["model_selection"] = selection
        model["split_method"] = "60/20/20 grouped fitting/development/test; selected model refitted on fitting+development only"
        model["decision_threshold"] = threshold
    expected = predictions(forest, validation[:100])
    actual = [predict_forest(model, row.tolist()) for row in x[validation[:100]]]
    if not np.allclose(expected, actual, rtol=0, atol=1e-12):
        raise ValueError("Exported Random Forest predictions differ from scikit-learn")
    model["export_validation"] = {"passed": True, "samples": len(actual)}
    return model
