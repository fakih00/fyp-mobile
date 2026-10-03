import { MEAL_DATASET as CURATED_MEAL_DATASET, VALIDATION_CASES } from './mealDataset';
import usdaDataset from './usdaMealDataset.json';
import trainedModel from './trainedNutritionModel.json';

const ACTIVITY_FACTORS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    athlete: 1.9,
};

const GOAL_CALORIE_DELTA = {
    weight_loss: -400,
    maintain: 0,
    muscle_gain: 250,
    weight_gain: 450,
};

const DEFAULT_WEIGHTS = {
    calories: 0.22,
    protein: 0.18,
    goal: 0.17,
    ingredients: 0.22,
    preferences: 0.11,
    expert: 0.1,
};

const MODEL_WEIGHTS = trainedModel?.weights || DEFAULT_WEIGHTS;
const LEBANESE_MEAL_DATASET = [
    {
        id: 'lb_chicken_tawouk_bowl',
        name: 'Chicken Tawouk Rice Bowl',
        type: 'Lunch',
        ingredients: ['chicken', 'rice', 'tomato', 'cucumber', 'lettuce'],
        alternatives: { cucumber: ['lettuce'], rice: ['potato', 'bread'] },
        calories: 560,
        protein: 45,
        carbs: 62,
        fats: 14,
        goals: ['weight_loss', 'maintain', 'muscle_gain'],
        allergens: [],
        prepMinutes: 22,
        expertScore: 0.94,
        cultureTags: ['lebanese', 'arabic'],
        image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'lb_kafta_potato_plate',
        name: 'Lean Kafta Potato Plate',
        type: 'Dinner',
        ingredients: ['beef', 'potato', 'tomato', 'onion', 'lettuce'],
        alternatives: { beef: ['turkey', 'chicken'], potato: ['rice'] },
        calories: 620,
        protein: 42,
        carbs: 54,
        fats: 22,
        goals: ['maintain', 'muscle_gain'],
        allergens: [],
        prepMinutes: 28,
        expertScore: 0.9,
        cultureTags: ['lebanese', 'arabic'],
        image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'lb_tuna_fattoush',
        name: 'Tuna Fattoush Protein Salad',
        type: 'Lunch',
        ingredients: ['tuna', 'lettuce', 'tomato', 'cucumber', 'olive_oil'],
        alternatives: { tuna: ['chicken', 'turkey'], cucumber: ['lettuce'] },
        calories: 430,
        protein: 36,
        carbs: 24,
        fats: 20,
        goals: ['weight_loss', 'maintain'],
        allergens: ['fish'],
        prepMinutes: 10,
        expertScore: 0.92,
        cultureTags: ['lebanese', 'arabic'],
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'lb_hummus_egg_plate',
        name: 'Hummus Egg Breakfast Plate',
        type: 'Breakfast',
        ingredients: ['eggs', 'hummus', 'tomato', 'cucumber', 'bread'],
        alternatives: { bread: ['potato'], cucumber: ['lettuce'] },
        calories: 520,
        protein: 29,
        carbs: 48,
        fats: 24,
        goals: ['maintain', 'muscle_gain'],
        allergens: ['eggs', 'gluten', 'sesame'],
        prepMinutes: 12,
        expertScore: 0.88,
        cultureTags: ['lebanese', 'arabic'],
        image: 'https://images.unsplash.com/photo-1600335895229-6e75511892c8?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'lb_labneh_oats_bowl',
        name: 'Labneh Oats Protein Bowl',
        type: 'Snack',
        ingredients: ['greek_yogurt', 'oats', 'berries', 'walnuts'],
        alternatives: { walnuts: ['almonds'], berries: ['banana', 'apple'] },
        calories: 390,
        protein: 28,
        carbs: 38,
        fats: 15,
        goals: ['weight_loss', 'maintain', 'muscle_gain'],
        allergens: ['dairy'],
        prepMinutes: 5,
        expertScore: 0.9,
        cultureTags: ['lebanese', 'arabic'],
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'lb_chicken_shawarma_wrap',
        name: 'Light Chicken Shawarma Wrap',
        type: 'Dinner',
        ingredients: ['chicken', 'tortilla', 'lettuce', 'tomato', 'greek_yogurt'],
        alternatives: { tortilla: ['bread', 'rice'], greek_yogurt: ['hummus'] },
        calories: 590,
        protein: 46,
        carbs: 52,
        fats: 18,
        goals: ['maintain', 'muscle_gain'],
        allergens: ['dairy', 'gluten'],
        prepMinutes: 18,
        expertScore: 0.93,
        cultureTags: ['lebanese', 'arabic'],
        image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=80',
    },
];
const normalizeMeal = (meal) => ({
    alternatives: {},
    cultureTags: [],
    expertScore: meal.expertScore ?? meal.expert_score ?? 0.82,
    ...meal,
});
const MEAL_DATASET = [...LEBANESE_MEAL_DATASET, ...CURATED_MEAL_DATASET, ...(usdaDataset?.meals || [])].map(normalizeMeal);
export const REVIEWABLE_MEALS = MEAL_DATASET;

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const normalize = (value = '') => String(value).trim().toLowerCase();

export function calculateNutritionTargets(profile = {}) {
    const age = Number(profile.age || 22);
    const height = Number(profile.height || profile.heightCm || 175);
    const weight = Number(profile.weight || profile.weightKg || 75);
    const gender = normalize(profile.gender || 'male');
    const goal = normalize(profile.goal || profile.fitness_goal || 'maintain');
    const activityLevel = normalize(profile.activityLevel || profile.activity_level || 'moderate');

    const genderConstant = gender === 'female' ? -161 : 5;
    const bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + genderConstant);
    const tdee = Math.round(bmr * (ACTIVITY_FACTORS[activityLevel] || ACTIVITY_FACTORS.moderate));
    const targetCalories = Math.max(1200, Number(profile.targetCalories) || (tdee + (GOAL_CALORIE_DELTA[goal] ?? 0)));

    const proteinPerKg = goal === 'muscle_gain' ? 2 : goal === 'weight_loss' ? 1.8 : 1.6;
    const protein = Math.round(Number(profile.protein) || (weight * proteinPerKg));
    const fat = Math.round(Number(profile.fats) || ((targetCalories * (goal === 'weight_loss' ? 0.28 : 0.25)) / 9));
    const carbs = Math.max(80, Math.round(Number(profile.carbs) || ((targetCalories - (protein * 4) - (fat * 9)) / 4)));
    const bmi = Number((weight / ((height / 100) ** 2)).toFixed(1));

    return { bmr, tdee, targetCalories, protein, carbs, fats: fat, bmi, goal };
}

export function trainPreferenceModel(feedback = []) {
    const ingredientWeights = {};
    const mealWeights = {};

    feedback.forEach((entry) => {
        const rating = Number(entry.rating || 3);
        const delta = (rating - 3) / 10;
        if (entry.mealId) {
            mealWeights[entry.mealId] = (mealWeights[entry.mealId] || 0) + delta;
        }
        (entry.ingredients || []).forEach((ingredient) => {
            ingredientWeights[ingredient] = (ingredientWeights[ingredient] || 0) + delta;
        });
    });

    return { ingredientWeights, mealWeights, samples: feedback.length };
}

function scoreDistance(actual, target, tolerance) {
    if (!target) return 0.5;
    return clamp(1 - Math.abs(actual - target) / tolerance);
}

function ingredientCoverage(meal, fridgeSet) {
    const present = [];
    const missing = [];
    const alternatives = [];

    meal.ingredients.forEach((ingredient) => {
        if (fridgeSet.has(ingredient)) {
            present.push(ingredient);
            return;
        }

        const alternative = (meal.alternatives?.[ingredient] || []).find((alt) => fridgeSet.has(alt));
        if (alternative) {
            alternatives.push({ missing: ingredient, use: alternative });
        } else {
            missing.push(ingredient);
        }
    });

    const availableCount = present.length + (alternatives.length * 0.75);
    const score = availableCount / meal.ingredients.length;
    return { score: clamp(score), present, missing, alternatives };
}

function preferenceScore(meal, preferences = {}, learned = {}) {
    const disliked = new Set((preferences.dislikedIngredients || []).map(normalize));
    let score = 0.5;

    meal.ingredients.forEach((ingredient) => {
        if (disliked.has(ingredient)) score -= 0.18;
        score += learned.ingredientWeights?.[ingredient] || 0;
    });

    score += learned.mealWeights?.[meal.id] || 0;
    return clamp(score);
}

function hasBlockedAllergy(meal, allergies = []) {
    const allergySet = new Set(allergies.map(normalize));
    return meal.allergens.some((allergen) => allergySet.has(allergen));
}

function getApprovalStatus({ meal, blocked, calorieScore, proteinScore, goalScore, approvalReviews = null }) {
    const requiresManualApproval = approvalReviews !== null;
    const humanReview = approvalReviews?.[meal.id];
    if (humanReview?.status) {
        const labels = {
            approved: 'Approved',
            pending: 'Pending Review',
            needs_adjustment: 'Needs Adjustment',
            rejected: 'Rejected',
        };
        return {
            status: humanReview.status,
            label: labels[humanReview.status] || 'Pending Review',
            reason: humanReview.notes || 'Manual review status.',
            manual: true,
        };
    }

    if (blocked) {
        return { status: 'rejected', label: 'Rejected', reason: 'Conflicts with allergy rules.' };
    }
    if (goalScore < 0.5) {
        return { status: 'needs_adjustment', label: 'Needs Adjustment', reason: 'Does not strongly match this goal.' };
    }
    if (calorieScore >= 0.55 && proteinScore >= 0.45) {
        return requiresManualApproval
            ? { status: 'pending', label: 'Pending Review', reason: 'Fits model rules, waiting for human approval.' }
            : { status: 'approved', label: 'Approved', reason: 'Fits goal, macro, and safety rules.' };
    }
    return { status: 'pending', label: 'Pending Review', reason: 'Close match, but macros need review.' };
}

export function recommendMeals({ profile = {}, fridge = [], preferences = {}, feedback = [], approvalReviews = null, maxResults = 10 } = {}) {
    const targets = calculateNutritionTargets(profile);
    const learned = trainPreferenceModel(feedback);
    const fridgeSet = new Set(fridge.map(normalize));
    const mealCalorieTarget = Math.round(targets.targetCalories / 4);
    const mealProteinTarget = Math.round(targets.protein / 4);

    const recommendations = MEAL_DATASET
        .map((meal) => {
            const blocked = hasBlockedAllergy(meal, preferences.allergies || []);
            const coverage = ingredientCoverage(meal, fridgeSet);
            const calorieScore = scoreDistance(meal.calories, mealCalorieTarget, 420);
            const proteinScore = scoreDistance(meal.protein, mealProteinTarget, 35);
            const goalScore = meal.goals.includes(targets.goal) ? 1 : meal.goals.includes('maintain') ? 0.72 : 0.38;
            const prefScore = preferenceScore(meal, preferences, learned);
            const culturalScore = meal.cultureTags?.some((tag) => ['lebanese', 'arabic'].includes(tag)) ? 0.06 : 0;
            const approval = getApprovalStatus({ meal, blocked, calorieScore, proteinScore, goalScore, approvalReviews });

            const rawScore =
                (calorieScore * MODEL_WEIGHTS.calories) +
                (proteinScore * MODEL_WEIGHTS.protein) +
                (goalScore * MODEL_WEIGHTS.goal) +
                (coverage.score * MODEL_WEIGHTS.ingredients) +
                (prefScore * MODEL_WEIGHTS.preferences) +
                ((meal.expertScore || 0.8) * MODEL_WEIGHTS.expert) +
                culturalScore +
                (approval.status === 'approved' ? 0.07 : approval.status === 'needs_adjustment' ? -0.06 : 0);

            const score = blocked ? 0 : clamp(rawScore);
            const matchPercent = Math.round(score * 100);

            return {
                ...meal,
                matchPercent,
                modelScore: Number(score.toFixed(3)),
                ingredientMatch: coverage,
                calorieScore: Number(calorieScore.toFixed(3)),
                proteinScore: Number(proteinScore.toFixed(3)),
                goalScore: Number(goalScore.toFixed(3)),
                preferenceScore: Number(prefScore.toFixed(3)),
                approval,
                blocked,
                explanation: buildExplanation(meal, targets, coverage, matchPercent),
            };
        })
        .filter((meal) => !meal.blocked && meal.approval.status === 'approved')
        .sort((a, b) => b.modelScore - a.modelScore)
        .slice(0, maxResults);

    return {
        targets,
        recommendations,
        model: {
            name: 'Custom Adaptive Nutrition Recommendation Model',
            version: trainedModel?.version || '1.0.0',
            trainedWith: trainedModel?.trainedWith || 'Local neural-network ranking model',
            trainingSamples: (trainedModel?.trainingSamples || MEAL_DATASET.length) + feedback.length,
            learnedSamples: learned.samples,
            weights: MODEL_WEIGHTS,
            trainingMetrics: trainedModel?.trainingMetrics,
        },
    };
}

function buildExplanation(meal, targets, coverage, matchPercent) {
    const available = coverage.present.length + coverage.alternatives.length;
    const total = meal.ingredients.length;
    const goalLabel = targets.goal.replace('_', ' ');
    const missing = coverage.missing.length ? `Missing: ${coverage.missing.join(', ')}.` : 'All core ingredients are available.';
    return `${matchPercent}% match for ${goalLabel}. ${available}/${total} ingredients available. ${missing}`;
}

export function evaluateNutritionModel(cases = VALIDATION_CASES) {
    const results = cases.map((testCase) => {
        const output = recommendMeals({
            profile: testCase.profile,
            fridge: testCase.fridge,
            preferences: testCase.preferences,
            maxResults: 3,
        });
        const top = output.recommendations[0];
        const goalHit = top ? top.goals.some((goal) => testCase.expectedTopGoals.includes(goal)) : false;
        const allergySafe = output.recommendations.every((meal) => !hasBlockedAllergy(meal, testCase.preferences.allergies || []));
        const ingredientScore = top?.ingredientMatch?.score || 0;

        return {
            topMeal: top?.name || 'No meal',
            goalHit,
            allergySafe,
            ingredientScore,
            matchPercent: top?.matchPercent || 0,
        };
    });

    const accuracy = {
        goalRecommendationAccuracy: Math.round((results.filter((r) => r.goalHit).length / results.length) * 100),
        allergyFilteringAccuracy: Math.round((results.filter((r) => r.allergySafe).length / results.length) * 100),
        averageIngredientMatch: Math.round((results.reduce((sum, r) => sum + r.ingredientScore, 0) / results.length) * 100),
        averageTopMatch: Math.round(results.reduce((sum, r) => sum + r.matchPercent, 0) / results.length),
        trainedTopMealApprovalAccuracy: trainedModel?.validationMetrics?.topMealApprovalAccuracy,
    };

    return { cases: results, accuracy };
}
