import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../context/AppContext';
import { COLORS } from '../constants/Theme';
import { INGREDIENT_CATALOG } from '../ai/mealDataset';
import { api } from '../services/api';

const DEFAULT_FRIDGE = ['chicken', 'rice', 'eggs', 'oats', 'banana', 'tomato', 'greek_yogurt', 'spinach', 'avocado'];
const SWAPS_PER_PAGE = 10;

const CATEGORY_COLORS = {
    protein: '#EF4444',
    carb: '#3B82F6',
    vegetable: '#10B981',
    fruit: '#F59E0B',
    dairy: '#8B5CF6',
    fat: '#0D9488',
};

const FRIDGE_CATEGORIES = [
    { id: 'all', label: 'All', icon: 'apps-outline' },
    { id: 'protein', label: 'Protein', icon: 'fitness-outline' },
    { id: 'carb', label: 'Carbs', icon: 'fast-food-outline' },
    { id: 'vegetable', label: 'Veg', icon: 'leaf-outline' },
    { id: 'fruit', label: 'Fruit', icon: 'nutrition-outline' },
    { id: 'dairy', label: 'Dairy', icon: 'ice-cream-outline' },
    { id: 'fat', label: 'Fats', icon: 'water-outline' },
];

const SmartMealAIScreen = ({ navigation }) => {
    const { user, meals, nutritionGoal, macroTargets, colors: themeColors, replaceMealInContext } = useContext(AppContext);
    const [selectedFridge, setSelectedFridge] = useState(DEFAULT_FRIDGE);
    const [feedback, setFeedback] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedSwap, setSelectedSwap] = useState(null);
    const [swapTargetId, setSwapTargetId] = useState(null);
    const [isApplyingSwap, setIsApplyingSwap] = useState(false);
    const [canReviewMeals, setCanReviewMeals] = useState(false);
    const [visibleSwapCount, setVisibleSwapCount] = useState(SWAPS_PER_PAGE);
    const [isLoadingSwaps, setIsLoadingSwaps] = useState(false);
    const [modelOutput, setModelOutput] = useState({
        targets: { targetCalories: 0, protein: 0, carbs: 0, fats: 0 },
        recommendations: [],
        model: {
            name: 'NutriCore AI',
            version: '1.4.0',
            learnedSamples: 0,
            validationMetrics: null,
        },
    });

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = daysOfWeek[new Date().getDay()];
    const todaysMeals = useMemo(() => (meals || []).filter((meal) => meal.day === today), [meals, today]);
    const openTodaysMeals = useMemo(() => todaysMeals.filter((meal) => !meal.completed), [todaysMeals]);
    const allTodaysMealsLogged = todaysMeals.length > 0 && openTodaysMeals.length === 0;
    const displayGoal = String(user?.goal || user?.fitness_goal || 'maintain');
    const visibleSwapMeals = useMemo(
        () => modelOutput.recommendations.slice(0, visibleSwapCount),
        [modelOutput.recommendations, visibleSwapCount]
    );
    const hasMoreSwaps = visibleSwapCount < modelOutput.recommendations.length;
    const ratingByMealId = useMemo(() => {
        const map = {};
        feedback.forEach((entry) => {
            if (!map[entry.mealId]) {
                map[entry.mealId] = Number(entry.rating || 0);
            }
        });
        return map;
    }, [feedback]);

    const validation = modelOutput.model.validationMetrics || {
        goalRecommendationAccuracy: 0,
        allergyFilteringAccuracy: 0,
        averageIngredientMatch: 0,
        averageTopMatch: 0,
    };
    const planReadiness = useMemo(
        () => todaysMeals.map((meal) => analyzeMealReadiness(meal, selectedFridge)),
        [todaysMeals, selectedFridge]
    );
    const bestReadyMeal = useMemo(
        () => [...planReadiness].sort((a, b) => b.matchPercent - a.matchPercent)[0],
        [planReadiness]
    );
    const leastReadyMeal = useMemo(
        () => [...planReadiness].sort((a, b) => a.matchPercent - b.matchPercent)[0],
        [planReadiness]
    );
    const selectedFridgeItems = useMemo(
        () => INGREDIENT_CATALOG.filter((item) => selectedFridge.includes(item.id)),
        [selectedFridge]
    );
    const visibleIngredients = useMemo(
        () => activeCategory === 'all'
            ? INGREDIENT_CATALOG
            : INGREDIENT_CATALOG.filter((item) => item.category === activeCategory),
        [activeCategory]
    );
    const compatibleOpenMeals = useMemo(
        () => {
            if (!selectedSwap?.type) return openTodaysMeals;
            const selectedType = normalizeTerm(selectedSwap.type);
            return openTodaysMeals.filter((meal) => normalizeTerm(meal.type) === selectedType);
        },
        [openTodaysMeals, selectedSwap?.type]
    );
    const swapTargetMeal = useMemo(
        () => (
            compatibleOpenMeals.find((meal) => meal.id === swapTargetId)
            || compatibleOpenMeals.find((meal) => meal.id === leastReadyMeal?.id)
            || compatibleOpenMeals[0]
            || null
        ),
        [compatibleOpenMeals, swapTargetId, leastReadyMeal]
    );
    const canApplySwap = !!swapTargetMeal && !allTodaysMealsLogged && !isApplyingSwap;

    const toggleIngredient = (ingredientId) => {
        Haptics.selectionAsync();
        setSelectedFridge((prev) => (
            prev.includes(ingredientId)
                ? prev.filter((id) => id !== ingredientId)
                : [...prev, ingredientId]
        ));
    };

    const loadPythonSwaps = useCallback(async () => {
        setIsLoadingSwaps(true);
        const res = await api.getMealSwaps(selectedFridge, 50);
        if (res.status === 200) {
            setModelOutput({
                targets: res.data?.targets || {
                    targetCalories: nutritionGoal || 0,
                    protein: macroTargets?.protein || 0,
                    carbs: macroTargets?.carbs || 0,
                    fats: macroTargets?.fats || 0,
                },
                recommendations: res.data?.recommendations || [],
                model: res.data?.model || {
                    name: 'NutriCore AI',
                    version: '1.4.0',
                    learnedSamples: 0,
                    validationMetrics: null,
                },
            });
        } else {
            setModelOutput((prev) => ({
                ...prev,
                targets: {
                    targetCalories: nutritionGoal || prev.targets.targetCalories || 0,
                    protein: macroTargets?.protein || prev.targets.protein || 0,
                    carbs: macroTargets?.carbs || prev.targets.carbs || 0,
                    fats: macroTargets?.fats || prev.targets.fats || 0,
                },
                recommendations: [],
            }));
        }
        setIsLoadingSwaps(false);
    }, [selectedFridge, nutritionGoal, macroTargets?.protein, macroTargets?.carbs, macroTargets?.fats]);

    useEffect(() => {
        setVisibleSwapCount(SWAPS_PER_PAGE);
        loadPythonSwaps();
    }, [loadPythonSwaps]);

    useEffect(() => {
        let active = true;
        const loadFeedback = async () => {
            const [feedbackRes, accessRes] = await Promise.all([
                api.getMealFeedback(),
                api.getMealReviewAccess(),
            ]);
            if (active && feedbackRes.status === 200) {
                setFeedback(feedbackRes.data?.feedback || []);
            }
            if (active && accessRes.status === 200) {
                setCanReviewMeals(!!accessRes.data?.can_review);
            }
        };
        loadFeedback();
        return () => {
            active = false;
        };
    }, []);

    const rateMeal = async (meal, rating) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const sample = { mealId: meal.id, rating, ingredients: meal.ingredients };
        setFeedback((prev) => [sample, ...prev.filter((entry) => entry.mealId !== meal.id)]);
        const res = await api.saveMealFeedback(meal.id, rating, meal.ingredients);
        if (res.status !== 200) {
            Alert.alert('Rating Not Saved', 'The rating changed this screen, but the backend did not save it.');
        } else {
            loadPythonSwaps();
        }
    };

    const openSwap = (meal) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const selectedType = normalizeTerm(meal.type);
        const defaultTarget = openTodaysMeals.find((item) => normalizeTerm(item.type) === selectedType && item.id === leastReadyMeal?.id)
            || openTodaysMeals.find((item) => normalizeTerm(item.type) === selectedType)
            || null;
        setSwapTargetId(defaultTarget?.id || null);
        setSelectedSwap(meal);
    };

    const applySwapToPlan = async () => {
        if (allTodaysMealsLogged) {
            Alert.alert('Today Complete', 'All meals are logged for today. You can still browse and rate swaps, but changes should wait for the next plan day.');
            return;
        }
        if (!selectedSwap || !swapTargetMeal) {
            Alert.alert('No compatible meal', 'This swap can only replace an unlogged meal with the same meal type.');
            return;
        }

        setIsApplyingSwap(true);
        try {
            const hint = `replace with a meal like ${selectedSwap.name}; use ${selectedSwap.ingredients.join(', ')}`;
            const exactReplacement = {
                id: selectedSwap.id,
                name: selectedSwap.name,
                type: selectedSwap.type || swapTargetMeal.type,
                calories: selectedSwap.calories,
                protein: selectedSwap.protein,
                carbs: selectedSwap.carbs,
                fats: selectedSwap.fats,
                ingredients: selectedSwap.ingredients.map(ingredientLabel),
                instructions: selectedSwap.instructions || `Prepare ${selectedSwap.name} using the selected Fridge Sync ingredients.`,
                image: selectedSwap.image,
                matchPercent: selectedSwap.matchPercent,
            };
            const res = await api.replaceMeal(swapTargetMeal.id, hint, exactReplacement, selectedFridge);
            if (res.status === 200 && res.data?.new_meal) {
                replaceMealInContext?.(res.data.new_meal);
                setSelectedSwap(null);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Swap Applied', `${swapTargetMeal.name} was replaced with ${selectedSwap.name}.`);
            } else {
                Alert.alert('Swap Failed', res.data?.message || 'NutriCore could not apply this swap.');
            }
        } catch (e) {
            Alert.alert('Connection Error', 'Could not apply the swap right now.');
        } finally {
            setIsApplyingSwap(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#06251F', '#0D9488', '#F8FAFC']} style={styles.headerBg} />
            <SafeAreaView edges={['top']} style={styles.safeHeader}>
                <View style={styles.navRow}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={22} color={COLORS.white} />
                    </TouchableOpacity>
                    <View style={styles.titleWrap}>
                        <Text style={styles.title}>Fridge Sync</Text>
                        <Text style={styles.subtitle}>NutriCore plan companion</Text>
                    </View>
                    <View style={styles.modelBadge}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.white} />
                        <Text style={styles.modelBadgeText}>{canReviewMeals ? 'Reviewer' : 'Gate'}</Text>
                    </View>
                </View>

                <View style={styles.heroPanel}>
                    <View style={styles.heroCopy}>
                        <Text style={styles.heroEyebrow}>TODAY'S PLAN READINESS</Text>
                        <Text style={styles.heroTitle}>{bestReadyMeal?.name || 'Build your fridge'}</Text>
                        <Text style={styles.heroSub}>{bestReadyMeal ? readinessCopy(bestReadyMeal) : 'Generate a NutriCore plan, then select ingredients here.'}</Text>
                    </View>
                    <View style={styles.scoreRing}>
                        <Text style={styles.scoreValue}>{bestReadyMeal?.matchPercent || 0}%</Text>
                        <Text style={styles.scoreLabel}>READY</Text>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="git-merge-outline" size={17} color={themeColors.accent} />
                        <Text style={styles.sectionTitle}>Synced To Your Plan</Text>
                    </View>
                    <Text style={styles.syncCopy}>
                        No second setup here. Fridge Sync uses your onboarding goal, allergies, avoided foods, and today's NutriCore meals.
                    </Text>
                    <View style={styles.targetGrid}>
                        {[
                            ['Calories', modelOutput.targets.targetCalories, 'kcal', '#EF4444'],
                            ['Protein', modelOutput.targets.protein, 'g', '#10B981'],
                            ['Carbs', modelOutput.targets.carbs, 'g', '#3B82F6'],
                            ['Fats', modelOutput.targets.fats, 'g', '#F59E0B'],
                        ].map(([label, value, unit, color]) => (
                            <View key={label} style={styles.targetBox}>
                                <Text style={[styles.targetValue, { color }]}>{value}</Text>
                                <Text style={styles.targetLabel}>{label} / {unit}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.planStrip}>
                        <Ionicons name="restaurant-outline" size={14} color={themeColors.accent} />
                        <Text style={styles.planStripText}>{todaysMeals.length} meals in today's plan</Text>
                        <Text style={styles.planStripGoal}>{displayGoal.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    {allTodaysMealsLogged && (
                        <View style={styles.todayCompleteNotice}>
                            <Ionicons name="lock-closed-outline" size={14} color="#0F766E" />
                            <Text style={styles.todayCompleteText}>Today is complete. Browse and rate swaps, but applying changes is locked.</Text>
                        </View>
                    )}
                </View>

                <View style={styles.fridgeCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="snow-outline" size={17} color="#0D9488" />
                        <Text style={styles.sectionTitle}>What Do You Have?</Text>
                        <Text style={styles.countText}>{selectedFridge.length} selected</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedStrip}>
                        {selectedFridgeItems.length === 0 ? (
                            <Text style={styles.noSelectionText}>Tap ingredients below to build your fridge.</Text>
                        ) : selectedFridgeItems.map((item) => (
                            <TouchableOpacity key={item.id} style={styles.selectedItemPill} onPress={() => toggleIngredient(item.id)}>
                                <Ionicons name={item.icon} size={13} color="#0F766E" />
                                <Text style={styles.selectedItemText}>{item.name}</Text>
                                <Ionicons name="close" size={12} color="#0F766E" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
                        {FRIDGE_CATEGORIES.map((category) => {
                            const active = activeCategory === category.id;
                            return (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[styles.categoryTab, active && styles.categoryTabActive]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setActiveCategory(category.id);
                                    }}
                                >
                                    <Ionicons name={category.icon} size={14} color={active ? COLORS.white : '#64748B'} />
                                    <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>{category.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.ingredientGridLarge}>
                        {visibleIngredients.map((item) => {
                            const active = selectedFridge.includes(item.id);
                            const color = CATEGORY_COLORS[item.category] || themeColors.accent;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.ingredientTile, active && { backgroundColor: color + '16', borderColor: color }]}
                                    onPress={() => toggleIngredient(item.id)}
                                >
                                    <View style={[styles.ingredientTileIcon, active && { backgroundColor: color + '24' }]}>
                                        <Ionicons name={item.icon} size={18} color={active ? color : '#94A3B8'} />
                                    </View>
                                    <Text style={[styles.ingredientText, active && { color }]} numberOfLines={2}>{item.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="person-circle-outline" size={17} color="#8B5CF6" />
                        <Text style={styles.sectionTitle}>Profile Rules Applied</Text>
                    </View>
                    <View style={styles.ruleRow}>
                        <RuleChip label="Avoids" value={user?.dislikes || 'Not set'} color="#EF4444" />
                        <RuleChip label="Ratings" value={`${modelOutput.model.learnedSamples} saved`} color="#10B981" />
                    </View>
                    <RuleChip label="Allergies" value={user?.allergies || 'None'} color="#8B5CF6" wide />
                    <Text style={styles.learningNote}>
                        Learned samples: {modelOutput.model.learnedSamples}. Ratings tune NutriCore locally without changing your profile setup.
                    </Text>
                </View>

                <View style={styles.sectionHeaderOutside}>
                    <Ionicons name="checkmark-done-outline" size={17} color="#0D9488" />
                    <Text style={styles.sectionTitle}>Today's Cookability</Text>
                </View>

                {planReadiness.length === 0 ? (
                    <View style={styles.emptyPlanCard}>
                        <Ionicons name="restaurant-outline" size={26} color="#94A3B8" />
                        <Text style={styles.emptyPlanTitle}>No NutriCore meals today</Text>
                        <Text style={styles.emptyPlanText}>Generate a nutrition plan first, then Fridge Sync will show what is ready and what is missing.</Text>
                    </View>
                ) : (
                    planReadiness.map((meal) => (
                        <View key={meal.id} style={styles.readinessCard}>
                            <View style={styles.readinessTopRow}>
                                <View style={styles.readinessIcon}>
                                    <Ionicons name={meal.matchPercent >= 70 ? 'checkmark-circle' : 'basket-outline'} size={18} color={meal.matchPercent >= 70 ? '#10B981' : '#F59E0B'} />
                                </View>
                                <View style={styles.readinessCopy}>
                                    <Text style={styles.readinessName}>{meal.name}</Text>
                                    <Text style={styles.readinessMeta}>{meal.type} · {meal.available.length} ready · {meal.missing.length} missing</Text>
                                </View>
                                <View style={styles.matchPill}>
                                    <Text style={styles.matchText}>{meal.matchPercent}%</Text>
                                </View>
                            </View>
                            <View style={styles.readinessBar}>
                                <View style={[styles.readinessBarFill, { width: `${meal.matchPercent}%` }]} />
                            </View>
                            <View style={styles.fridgePillRow}>
                                {meal.available.slice(0, 3).map((item) => (
                                    <Text key={`a-${item}`} style={[styles.fridgePill, styles.fridgePillReady]} numberOfLines={1}>{item}</Text>
                                ))}
                                {meal.missing.slice(0, 3).map((item) => (
                                    <Text key={`m-${item}`} style={[styles.fridgePill, styles.fridgePillMissing]} numberOfLines={1}>{item}</Text>
                                ))}
                            </View>
                        </View>
                    ))
                )}

                <View style={styles.sectionHeaderOutside}>
                    <Ionicons name="swap-horizontal-outline" size={17} color={themeColors.accent} />
                    <Text style={styles.sectionTitle}>Fridge-Based Swaps</Text>
                </View>

                {isLoadingSwaps ? (
                    <View style={styles.emptyPlanCard}>
                        <ActivityIndicator color={themeColors.accent} />
                        <Text style={styles.emptyPlanTitle}>Ranking swaps with NutriCore</Text>
                        <Text style={styles.emptyPlanText}>Python is checking fridge match, macros, allergies, preferences, ratings, and approval rules.</Text>
                    </View>
                ) : modelOutput.recommendations.length === 0 ? (
                    <View style={styles.emptyPlanCard}>
                        <Ionicons name="shield-checkmark-outline" size={26} color="#94A3B8" />
                        <Text style={styles.emptyPlanTitle}>No approved swaps yet</Text>
                        <Text style={styles.emptyPlanText}>Try adding more fridge ingredients or regenerating the plan so NutriCore can find a safe approved match.</Text>
                    </View>
                ) : (
                    <>
                        {visibleSwapMeals.map((meal) => {
                            const canUseMealSwap = !allTodaysMealsLogged && openTodaysMeals.some((item) => normalizeTerm(item.type) === normalizeTerm(meal.type));
                            return (
                            <TouchableOpacity
                                key={meal.id}
                                activeOpacity={0.88}
                                style={[styles.mealCard, !canUseMealSwap && styles.mealCardLocked]}
                                onPress={() => {
                                    if (canUseMealSwap) openSwap(meal);
                                }}
                            >
                                <Image source={{ uri: meal.image }} style={styles.mealImage} />
                                <View style={styles.mealBody}>
                                    <View style={styles.mealTopRow}>
                                        <Text style={styles.mealName}>{meal.name}</Text>
                                        {meal.approval?.status === 'approved' && (
                                            <View style={styles.approvedPill}>
                                                <Ionicons name="shield-checkmark" size={10} color="#047857" />
                                                <Text style={styles.approvedText}>Approved</Text>
                                            </View>
                                        )}
                                        <View style={styles.matchPill}>
                                            <Text style={styles.matchText}>{meal.matchPercent}%</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.explainText}>{meal.explanation}</Text>
                                    <View style={styles.macroRow}>
                                        <Macro label="kcal" value={meal.calories} color="#EF4444" />
                                        <Macro label="pro" value={`${meal.protein}g`} color="#10B981" />
                                        <Macro label="carb" value={`${meal.carbs}g`} color="#3B82F6" />
                                        <Macro label="fat" value={`${meal.fats}g`} color="#F59E0B" />
                                    </View>
                                    {(meal.ingredientMatch?.alternatives || []).length > 0 && (
                                        <Text style={styles.altText}>
                                            Fridge shortcut: use {meal.ingredientMatch.alternatives.map((a) => a.use).join(', ')}
                                        </Text>
                                    )}
                                    <View style={styles.rateRow}>
                                        <TouchableOpacity
                                            style={[styles.useSwapBtn, !canUseMealSwap && styles.useSwapBtnDisabled]}
                                            disabled={!canUseMealSwap}
                                            onPress={(event) => {
                                            event.stopPropagation?.();
                                            openSwap(meal);
                                        }}>
                                            <Text style={styles.useSwapText}>{allTodaysMealsLogged ? 'Today Done' : canUseMealSwap ? 'Use Swap' : 'Type Locked'}</Text>
                                            <Ionicons name={canUseMealSwap ? 'arrow-forward' : 'lock-closed'} size={14} color={COLORS.white} />
                                        </TouchableOpacity>
                                        <View style={styles.ratingCluster}>
                                            <View style={styles.starRow}>
                                                {[1, 2, 3, 4, 5].map((rating) => (
                                                    <TouchableOpacity key={rating} onPress={(event) => {
                                                        event.stopPropagation?.();
                                                        rateMeal(meal, rating);
                                                    }} style={styles.starBtn}>
                                                        <Ionicons
                                                            name={rating <= (ratingByMealId[meal.id] || 0) ? 'star' : 'star-outline'}
                                                            size={16}
                                                            color={rating <= (ratingByMealId[meal.id] || 0) ? '#F59E0B' : '#CBD5E1'}
                                                        />
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                            <Text style={styles.ratingHint}>
                                                {ratingByMealId[meal.id] ? `Rated ${ratingByMealId[meal.id]}/5` : 'Tap to rate'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                        })}
                        {hasMoreSwaps ? (
                            <TouchableOpacity
                                style={styles.moreSwapsBtn}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setVisibleSwapCount((count) => count + SWAPS_PER_PAGE);
                                }}
                            >
                                <Text style={styles.moreSwapsText}>More Approved Swaps</Text>
                                <Text style={styles.moreSwapsCount}>{Math.min(SWAPS_PER_PAGE, modelOutput.recommendations.length - visibleSwapCount)} more</Text>
                                <Ionicons name="chevron-down" size={18} color="#0D9488" />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.endSwapsPill}>
                                <Ionicons name="checkmark-circle-outline" size={15} color="#64748B" />
                                <Text style={styles.endSwapsText}>All approved swaps shown</Text>
                            </View>
                        )}
                    </>
                )}

                <View style={styles.validationCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="shield-checkmark-outline" size={17} color="#10B981" />
                        <Text style={styles.sectionTitle}>NutriCore Confidence</Text>
                    </View>
                    <View style={styles.validationGrid}>
                        <Metric label="Plan fit" value={`${validation.goalRecommendationAccuracy}%`} />
                        <Metric label="Allergy safety" value={`${validation.allergyFilteringAccuracy}%`} />
                        <Metric label="Fridge match" value={`${validation.averageIngredientMatch}%`} />
                        <Metric label="Swap score" value={`${validation.averageTopMatch}%`} />
                    </View>
                </View>
            </ScrollView>

            <Modal
                transparent
                animationType="slide"
                visible={!!selectedSwap}
                onRequestClose={() => setSelectedSwap(null)}
            >
                <View style={styles.swapOverlay}>
                    <View style={styles.swapSheet}>
                        <View style={styles.swapHandle} />
                        {selectedSwap && (
                            <>
                                <Image source={{ uri: selectedSwap.image }} style={styles.swapHeroImage} />
                                <TouchableOpacity style={styles.swapCloseBtn} onPress={() => setSelectedSwap(null)}>
                                    <Ionicons name="close" size={20} color={COLORS.white} />
                                </TouchableOpacity>
                                <View style={styles.swapSheetBody}>
                                    <View style={styles.swapTitleRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.swapTitle}>{selectedSwap.name}</Text>
                                            <Text style={styles.swapSub}>
                                                {allTodaysMealsLogged ? 'Today is complete, so this swap is saved for browsing only.' : 'Choose an unlogged meal with the same type.'}
                                            </Text>
                                        </View>
                                        {selectedSwap.approval?.status === 'approved' && (
                                            <View style={styles.approvedPill}>
                                                <Ionicons name="shield-checkmark" size={10} color="#047857" />
                                                <Text style={styles.approvedText}>Approved</Text>
                                            </View>
                                        )}
                                        <View style={styles.matchPill}>
                                            <Text style={styles.matchText}>{selectedSwap.matchPercent}%</Text>
                                        </View>
                                    </View>
                                    <View style={styles.macroRow}>
                                        <Macro label="kcal" value={selectedSwap.calories} color="#EF4444" />
                                        <Macro label="pro" value={`${selectedSwap.protein}g`} color="#10B981" />
                                        <Macro label="carb" value={`${selectedSwap.carbs}g`} color="#3B82F6" />
                                        <Macro label="fat" value={`${selectedSwap.fats}g`} color="#F59E0B" />
                                    </View>
                                    <Text style={styles.swapIngredientsTitle}>Replace Meal</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.targetMealRail}>
                                        {todaysMeals.length === 0 ? (
                                            <Text style={styles.noSelectionText}>No meals in today's plan yet.</Text>
                                        ) : todaysMeals.map((meal) => {
                                            const active = swapTargetMeal?.id === meal.id;
                                            const typeMismatch = normalizeTerm(meal.type) !== normalizeTerm(selectedSwap.type);
                                            const locked = meal.completed || typeMismatch;
                                            return (
                                                <TouchableOpacity
                                                    key={meal.id}
                                                    style={[styles.targetMealChip, active && styles.targetMealChipActive, locked && styles.targetMealChipLocked]}
                                                    disabled={locked}
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        setSwapTargetId(meal.id);
                                                    }}
                                                >
                                                    <Text style={[styles.targetMealType, active && styles.targetMealTypeActive]}>{meal.type}</Text>
                                                    <Text style={[styles.targetMealName, active && styles.targetMealNameActive]} numberOfLines={1}>{meal.name}</Text>
                                                    {meal.completed && <Text style={styles.targetMealLockedText}>LOGGED</Text>}
                                                    {!meal.completed && typeMismatch && <Text style={styles.targetMealLockedText}>TYPE LOCKED</Text>}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                    <Text style={styles.swapIngredientsTitle}>Ingredients</Text>
                                    <View style={styles.fridgePillRow}>
                                        {selectedSwap.ingredients.map((item) => (
                                            <Text key={item} style={[styles.fridgePill, styles.fridgePillReady]} numberOfLines={1}>
                                                {ingredientLabel(item)}
                                            </Text>
                                        ))}
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.applySwapBtn, !canApplySwap && styles.applySwapBtnDisabled]}
                                        onPress={applySwapToPlan}
                                        disabled={!canApplySwap}
                                    >
                                        {isApplyingSwap ? (
                                            <ActivityIndicator size="small" color={COLORS.white} />
                                        ) : (
                                            <>
                                                <Text style={styles.applySwapText}>{allTodaysMealsLogged ? 'Today Complete' : 'Apply To Today\'s Plan'}</Text>
                                                <Ionicons name={allTodaysMealsLogged ? 'lock-closed' : 'swap-horizontal-outline'} size={18} color={COLORS.white} />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const analyzeMealReadiness = (meal, selectedFridge) => {
    const terms = selectedFridge.flatMap((id) => {
        const item = INGREDIENT_CATALOG.find((ingredient) => ingredient.id === id);
        const name = item?.name || id;
        return [
            id,
            name,
            ...String(name).split(/\s+/),
        ].map(normalizeTerm);
    }).filter((term) => term.length > 2);

    const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients : [];
    const available = [];
    const missing = [];

    ingredients.forEach((ingredient) => {
        const ingredientText = normalizeTerm(ingredient);
        const matched = terms.some((term) => ingredientText.includes(term) || term.includes(ingredientText));
        if (matched) available.push(ingredient);
        else missing.push(ingredient);
    });

    const matchPercent = ingredients.length ? Math.round((available.length / ingredients.length) * 100) : 0;
    return {
        id: meal.id,
        name: meal.name,
        type: meal.type,
        matchPercent,
        available,
        missing,
    };
};

const normalizeTerm = (value) => String(value || '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

const readinessCopy = (meal) => {
    if (meal.matchPercent >= 80) return `${meal.name} is almost ready from your fridge.`;
    if (meal.matchPercent >= 45) return `${meal.name} is close. Pick up ${meal.missing.slice(0, 2).join(', ') || 'a few items'}.`;
    return `${meal.name} needs more ingredients, so check the swap list below.`;
};

const ingredientLabel = (id) => INGREDIENT_CATALOG.find((item) => item.id === id)?.name || id.replace(/_/g, ' ');

const Macro = ({ label, value, color }) => (
    <View style={[styles.macroChip, { backgroundColor: color + '14' }]}>
        <Text style={[styles.macroValue, { color }]}>{value}</Text>
        <Text style={styles.macroLabel}>{label}</Text>
    </View>
);

const RuleChip = ({ label, value, color, wide }) => (
    <View style={[styles.ruleChip, wide && styles.ruleChipWide, { borderColor: color + '40', backgroundColor: color + '10' }]}>
        <Text style={[styles.ruleLabel, { color }]}>{label}</Text>
        <Text style={styles.ruleValue} numberOfLines={1}>{value}</Text>
    </View>
);

const Metric = ({ label, value }) => (
    <View style={styles.metricBox}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 310 },
    safeHeader: { paddingHorizontal: 20 },
    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
    iconBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
    titleWrap: { alignItems: 'center' },
    title: { fontSize: 22, fontWeight: '900', color: COLORS.white },
    subtitle: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.72)', letterSpacing: 1.2, marginTop: 2 },
    modelBadge: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
    modelBadgeText: { fontSize: 12, fontWeight: '900', color: COLORS.white },
    heroPanel: { marginTop: 24, borderRadius: 28, padding: 20, backgroundColor: 'rgba(255,255,255,0.14)', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
    heroCopy: { flex: 1, paddingRight: 14 },
    heroEyebrow: { fontSize: 9, fontWeight: '900', color: '#A7F3D0', letterSpacing: 1.5, marginBottom: 6 },
    heroTitle: { fontSize: 24, fontWeight: '900', color: COLORS.white, lineHeight: 29 },
    heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 18, marginTop: 8 },
    scoreRing: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
    scoreValue: { fontSize: 25, fontWeight: '900', color: '#047857' },
    scoreLabel: { fontSize: 8, fontWeight: '900', color: '#0F766E', letterSpacing: 1 },
    content: { paddingTop: 22, paddingHorizontal: 18, paddingBottom: 40 },
    card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
    fridgeCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#CCFBF1' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    sectionHeaderOutside: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 12 },
    sectionTitle: { flex: 1, fontSize: 15, fontWeight: '900', color: '#0F172A' },
    countText: { fontSize: 11, fontWeight: '800', color: '#64748B' },
    syncCopy: { fontSize: 12, color: '#64748B', fontWeight: '600', lineHeight: 18, marginBottom: 14 },
    targetGrid: { flexDirection: 'row', gap: 8 },
    targetBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 10, alignItems: 'center' },
    targetValue: { fontSize: 18, fontWeight: '900' },
    targetLabel: { fontSize: 8, color: '#64748B', fontWeight: '800', marginTop: 2 },
    planStrip: { marginTop: 12, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F8FAFC', flexDirection: 'row', alignItems: 'center', gap: 8 },
    planStripText: { flex: 1, fontSize: 11, color: '#475569', fontWeight: '800' },
    planStripGoal: { fontSize: 9, color: '#0F766E', fontWeight: '900' },
    todayCompleteNotice: { marginTop: 10, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#99F6E4', flexDirection: 'row', alignItems: 'center', gap: 7 },
    todayCompleteText: { flex: 1, fontSize: 10, lineHeight: 14, color: '#0F766E', fontWeight: '800' },
    selectedStrip: { gap: 8, paddingRight: 10, paddingBottom: 12 },
    selectedItemPill: { height: 34, borderRadius: 17, backgroundColor: '#CCFBF1', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
    selectedItemText: { fontSize: 11, fontWeight: '900', color: '#0F766E' },
    noSelectionText: { fontSize: 12, color: '#94A3B8', fontWeight: '700', paddingVertical: 8 },
    categoryRail: { gap: 8, paddingRight: 10, paddingBottom: 14 },
    categoryTab: { height: 38, borderRadius: 14, paddingHorizontal: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 6 },
    categoryTabActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
    categoryTabText: { fontSize: 11, fontWeight: '900', color: '#64748B' },
    categoryTabTextActive: { color: COLORS.white },
    ingredientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    ingredientGridLarge: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    ingredientChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14 },
    ingredientTile: { width: '30.8%', minHeight: 82, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 8 },
    ingredientTileIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    ingredientText: { fontSize: 11, fontWeight: '800', color: '#64748B' },
    ruleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    ruleChip: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
    ruleChipWide: { width: '100%' },
    ruleLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.7, marginBottom: 3 },
    ruleValue: { fontSize: 12, color: '#0F172A', fontWeight: '800' },
    learningNote: { fontSize: 11, color: '#64748B', lineHeight: 16, fontWeight: '600' },
    mealCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row' },
    mealCardLocked: { opacity: 0.68 },
    mealImage: { width: 104, height: 132, borderRadius: 18 },
    mealBody: { flex: 1, marginLeft: 13 },
    mealTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    mealName: { flex: 1, fontSize: 15, fontWeight: '900', color: '#0F172A', lineHeight: 20 },
    approvedPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ECFDF5', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 5 },
    approvedText: { fontSize: 9, fontWeight: '900', color: '#047857' },
    matchPill: { backgroundColor: '#ECFDF5', borderRadius: 11, paddingHorizontal: 8, paddingVertical: 5 },
    matchText: { fontSize: 11, fontWeight: '900', color: '#047857' },
    explainText: { fontSize: 11, color: '#64748B', fontWeight: '600', lineHeight: 16, marginTop: 6 },
    macroRow: { flexDirection: 'row', gap: 5, marginTop: 9 },
    macroChip: { flex: 1, borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
    macroValue: { fontSize: 11, fontWeight: '900' },
    macroLabel: { fontSize: 7, color: '#94A3B8', fontWeight: '900' },
    altText: { fontSize: 10, color: '#0D9488', fontWeight: '800', marginTop: 8 },
    rateRow: { gap: 8, marginTop: 10, alignItems: 'flex-start' },
    useSwapBtn: { height: 30, borderRadius: 15, backgroundColor: '#0D9488', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 },
    useSwapBtnDisabled: { backgroundColor: '#94A3B8' },
    useSwapText: { fontSize: 10, fontWeight: '900', color: COLORS.white },
    ratingCluster: { alignItems: 'flex-start' },
    starRow: { flexDirection: 'row', gap: 3 },
    starBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    ratingHint: { fontSize: 9, fontWeight: '800', color: '#94A3B8', marginTop: 2 },
    moreSwapsBtn: { height: 52, borderRadius: 18, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#99F6E4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 },
    moreSwapsText: { fontSize: 13, fontWeight: '900', color: '#0F766E' },
    moreSwapsCount: { fontSize: 10, fontWeight: '900', color: '#0D9488', backgroundColor: COLORS.white, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9 },
    endSwapsPill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#F1F5F9', marginBottom: 14 },
    endSwapsText: { fontSize: 11, fontWeight: '800', color: '#64748B' },
    emptyPlanCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
    emptyPlanTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginTop: 8 },
    emptyPlanText: { fontSize: 11, color: '#64748B', fontWeight: '600', textAlign: 'center', lineHeight: 16, marginTop: 5 },
    readinessCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    readinessTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    readinessIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    readinessCopy: { flex: 1 },
    readinessName: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
    readinessMeta: { fontSize: 10, fontWeight: '800', color: '#64748B', marginTop: 2 },
    readinessBar: { height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden', marginTop: 12 },
    readinessBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#0D9488' },
    fridgePillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    fridgePill: { maxWidth: '48%', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, fontWeight: '900', overflow: 'hidden' },
    fridgePillReady: { color: '#047857', backgroundColor: '#ECFDF5' },
    fridgePillMissing: { color: '#B45309', backgroundColor: '#FFFBEB' },
    validationCard: { backgroundColor: '#0F172A', borderRadius: 24, padding: 18, marginTop: 6 },
    validationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metricBox: { width: '48%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 12 },
    metricValue: { fontSize: 20, fontWeight: '900', color: COLORS.white },
    metricLabel: { fontSize: 10, color: '#CBD5E1', fontWeight: '800', marginTop: 2 },
    swapOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
    swapSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
    swapHandle: { position: 'absolute', top: 10, alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.75)', zIndex: 2 },
    swapHeroImage: { width: '100%', height: 210 },
    swapCloseBtn: { position: 'absolute', top: 18, right: 18, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', alignItems: 'center' },
    swapSheetBody: { padding: 18 },
    swapTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    swapTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
    swapSub: { fontSize: 11, color: '#64748B', fontWeight: '700', marginTop: 4 },
    swapIngredientsTitle: { fontSize: 11, fontWeight: '900', color: '#0F172A', marginTop: 14, marginBottom: 2, letterSpacing: 0.8 },
    targetMealRail: { gap: 8, paddingTop: 6, paddingBottom: 2 },
    targetMealChip: { width: 132, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 10 },
    targetMealChipActive: { backgroundColor: '#ECFDF5', borderColor: '#0D9488' },
    targetMealChipLocked: { opacity: 0.55 },
    targetMealType: { fontSize: 9, fontWeight: '900', color: '#94A3B8', marginBottom: 4 },
    targetMealTypeActive: { color: '#0D9488' },
    targetMealName: { fontSize: 12, fontWeight: '900', color: '#334155' },
    targetMealNameActive: { color: '#0F766E' },
    targetMealLockedText: { fontSize: 8, fontWeight: '900', color: '#94A3B8', marginTop: 6 },
    applySwapBtn: { height: 54, borderRadius: 18, backgroundColor: '#0D9488', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 18 },
    applySwapBtnDisabled: { backgroundColor: '#94A3B8' },
    applySwapText: { fontSize: 13, fontWeight: '900', color: COLORS.white },
});

export default SmartMealAIScreen;
