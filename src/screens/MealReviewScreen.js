import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Linking,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { REVIEWABLE_MEALS } from '../ai/nutritionRecommendationModel';
import { EXERCISE_TUTORIALS } from '../ai/exerciseTutorials';
import { api } from '../services/api';
import { COLORS } from '../constants/Theme';

const FILTERS = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'needs_adjustment', label: 'Adjust' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'all', label: 'All' },
];

const REVIEW_TYPES = [
    { id: 'meals', label: 'Meals', icon: 'restaurant-outline' },
    { id: 'tutorials', label: 'Tutorials', icon: 'school-outline' },
];

const STATUS_META = {
    approved: { label: 'Approved', color: '#10B981', icon: 'shield-checkmark' },
    pending: { label: 'Pending Review', color: '#F59E0B', icon: 'time-outline' },
    needs_adjustment: { label: 'Needs Adjustment', color: '#3B82F6', icon: 'construct-outline' },
    rejected: { label: 'Rejected', color: '#EF4444', icon: 'close-circle-outline' },
};

const defaultReview = { status: 'pending', notes: '' };

const MealReviewScreen = ({ navigation }) => {
    const [mealReviews, setMealReviews] = useState({});
    const [tutorialReviews, setTutorialReviews] = useState({});
    const [activeReviewType, setActiveReviewType] = useState('meals');
    const [activeFilter, setActiveFilter] = useState('pending');
    const [selectedMeal, setSelectedMeal] = useState(null);
    const [selectedTutorial, setSelectedTutorial] = useState(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingStatus, setSavingStatus] = useState(null);

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        setLoading(true);
        const accessRes = await api.getMealReviewAccess();
        if (accessRes.status !== 200 || !accessRes.data?.can_review) {
            setLoading(false);
            Alert.alert('Reviewer Only', 'Only the assigned expert reviewer can approve meals and exercise tutorials.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
            return;
        }

        const [mealRes, tutorialRes] = await Promise.all([
            api.getMealReviews(),
            api.getExerciseTutorialReviews(),
        ]);

        if (mealRes.status === 200) {
            setMealReviews(mealRes.data?.reviews || {});
        } else {
            Alert.alert('Meal Reviews Failed', mealRes.data?.message || 'Could not load meal reviews.');
        }

        if (tutorialRes.status === 200) {
            setTutorialReviews(tutorialRes.data?.reviews || {});
        } else {
            Alert.alert('Tutorial Reviews Failed', tutorialRes.data?.message || 'Could not load tutorial reviews.');
        }
        setLoading(false);
    };

    const mealRows = useMemo(() => REVIEWABLE_MEALS.map((meal) => ({
        ...meal,
        review: mealReviews[meal.id] || defaultReview,
    })).filter((meal) => activeFilter === 'all' || meal.review.status === activeFilter), [mealReviews, activeFilter]);

    const tutorialRows = useMemo(() => EXERCISE_TUTORIALS.map((tutorial) => ({
        ...tutorial,
        review: tutorialReviews[tutorial.id] || defaultReview,
    })).filter((tutorial) => activeFilter === 'all' || tutorial.review.status === activeFilter), [tutorialReviews, activeFilter]);

    const rows = activeReviewType === 'meals' ? mealRows : tutorialRows;

    const switchReviewType = (type) => {
        Haptics.selectionAsync();
        setActiveReviewType(type);
        setSelectedMeal(null);
        setSelectedTutorial(null);
        setNotes('');
    };

    const openMeal = (meal) => {
        Haptics.selectionAsync();
        setSelectedMeal(meal);
        setSelectedTutorial(null);
        setNotes(meal.review?.notes || '');
    };

    const openTutorial = (tutorial) => {
        Haptics.selectionAsync();
        setSelectedTutorial(tutorial);
        setSelectedMeal(null);
        setNotes(tutorial.review?.notes || '');
    };

    const openTutorialVideo = async (tutorial = selectedTutorial) => {
        if (!tutorial?.url) return;
        try {
            await Linking.openURL(tutorial.url);
        } catch (error) {
            Alert.alert('Open Failed', 'Could not open this tutorial link.');
        }
    };

    const saveMealReview = async (status) => {
        if (!selectedMeal) return;
        setSavingStatus(status);
        const res = await api.saveMealReview(selectedMeal.id, status, notes, 'Jason Mattar');
        if (res.status === 200) {
            setMealReviews((prev) => ({
                ...prev,
                [selectedMeal.id]: {
                    mealId: selectedMeal.id,
                    status,
                    notes,
                    reviewedBy: 'Jason Mattar',
                },
            }));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSelectedMeal(null);
        } else {
            Alert.alert('Save Failed', res.data?.message || 'Could not save this review.');
        }
        setSavingStatus(null);
    };

    const saveTutorialReview = async (status) => {
        if (!selectedTutorial) return;
        setSavingStatus(status);
        const res = await api.saveExerciseTutorialReview(selectedTutorial.id, status, notes, 'Jason Mattar');
        if (res.status === 200) {
            setTutorialReviews((prev) => ({
                ...prev,
                [selectedTutorial.id]: {
                    tutorialId: selectedTutorial.id,
                    status,
                    notes,
                    reviewedBy: 'Jason Mattar',
                },
            }));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSelectedTutorial(null);
        } else {
            Alert.alert('Save Failed', res.data?.message || 'Could not save this tutorial review.');
        }
        setSavingStatus(null);
    };

    const exitReview = async () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }
        await api.logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    };

    const renderMeal = ({ item }) => {
        const meta = STATUS_META[item.review.status] || STATUS_META.pending;
        return (
            <TouchableOpacity style={styles.mealCard} activeOpacity={0.88} onPress={() => openMeal(item)}>
                <Image source={{ uri: item.image }} style={styles.mealImage} />
                <View style={styles.cardBody}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                        <StatusPill meta={meta} />
                    </View>
                    <View style={styles.macroRow}>
                        <Macro label="kcal" value={item.calories} color="#EF4444" />
                        <Macro label="pro" value={`${item.protein}g`} color="#10B981" />
                        <Macro label="carb" value={`${item.carbs}g`} color="#3B82F6" />
                        <Macro label="fat" value={`${item.fats}g`} color="#F59E0B" />
                    </View>
                    <Text style={styles.ingredients} numberOfLines={1}>{item.ingredients.join(', ')}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderTutorial = ({ item }) => {
        const meta = STATUS_META[item.review.status] || STATUS_META.pending;
        return (
            <TouchableOpacity style={styles.tutorialCard} activeOpacity={0.88} onPress={() => openTutorial(item)}>
                <View style={styles.tutorialLeadIcon}>
                    <Ionicons name="logo-youtube" size={22} color="#EF4444" />
                </View>
                <View style={styles.cardBody}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardName} numberOfLines={2}>{item.title}</Text>
                        <StatusPill meta={meta} />
                    </View>
                    <View style={styles.tutorialMetaGrid}>
                        <InfoPill icon="person-outline" text={item.channel} />
                        <InfoPill icon="scan-outline" text={item.bestAngle} />
                    </View>
                    <Text style={styles.ingredients} numberOfLines={2}>{item.focus}</Text>
                </View>
                <TouchableOpacity style={styles.openLinkBtn} onPress={() => openTutorialVideo(item)}>
                    <Ionicons name="open-outline" size={16} color="#64748B" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const renderPanel = () => {
        const selected = selectedMeal || selectedTutorial;
        if (!selected) return null;

        const isTutorial = !!selectedTutorial;
        return (
            <View style={styles.reviewPanel}>
                <View style={styles.panelHandle} />
                <Text style={styles.panelTitle}>{isTutorial ? selected.title : selected.name}</Text>
                <Text style={styles.panelSub}>
                    {isTutorial
                        ? `${selected.channel} - ${selected.bestAngle} - ${selected.focus}`
                        : selected.ingredients.join(', ')}
                </Text>
                {isTutorial && (
                    <TouchableOpacity style={styles.panelLinkBtn} onPress={() => openTutorialVideo(selected)}>
                        <Ionicons name="logo-youtube" size={16} color="#EF4444" />
                        <Text style={styles.panelLinkText}>Open Tutorial Video</Text>
                    </TouchableOpacity>
                )}
                <TextInput
                    style={styles.notesInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={isTutorial ? 'Technique quality, safety notes, or replacement reason' : 'Review note, adjustment, or rejection reason'}
                    multiline
                />
                <View style={styles.actionGrid}>
                    {['approved', 'needs_adjustment', 'rejected', 'pending'].map((status) => {
                        const meta = STATUS_META[status];
                        return (
                            <TouchableOpacity
                                key={status}
                                style={[styles.actionBtn, { backgroundColor: meta.color }]}
                                onPress={() => (isTutorial ? saveTutorialReview(status) : saveMealReview(status))}
                                disabled={!!savingStatus}
                            >
                                {savingStatus === status ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <Text style={styles.actionText}>{meta.label}</Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                    setSelectedMeal(null);
                    setSelectedTutorial(null);
                }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconBtn} onPress={exitReview}>
                    <Ionicons name={navigation.canGoBack() ? 'chevron-back' : 'log-out-outline'} size={22} color="#0F172A" />
                </TouchableOpacity>
                <View style={styles.titleWrap}>
                    <Text style={styles.title}>Expert Review</Text>
                    <Text style={styles.subtitle}>
                        {activeReviewType === 'meals' ? 'Approve safe meals for NutriCore swaps' : 'Approve tutorials used by PoseForm'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={loadReviews}>
                    <Ionicons name="refresh" size={18} color="#0F172A" />
                </TouchableOpacity>
            </View>

            <View style={styles.reviewTypeRow}>
                {REVIEW_TYPES.map((type) => {
                    const active = activeReviewType === type.id;
                    return (
                        <TouchableOpacity key={type.id} style={[styles.reviewTypeTab, active && styles.reviewTypeTabActive]} onPress={() => switchReviewType(type.id)}>
                            <Ionicons name={type.icon} size={15} color={active ? COLORS.white : '#64748B'} />
                            <Text style={[styles.reviewTypeText, active && styles.reviewTypeTextActive]}>{type.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.filterRow}>
                {FILTERS.map((filter) => {
                    const active = activeFilter === filter.id;
                    return (
                        <TouchableOpacity key={filter.id} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setActiveFilter(filter.id)}>
                            <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0D9488" />
                </View>
            ) : (
                <FlatList
                    data={rows}
                    keyExtractor={(item) => item.id}
                    renderItem={activeReviewType === 'meals' ? renderMeal : renderTutorial}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="checkmark-done-outline" size={24} color="#94A3B8" />
                            <Text style={styles.emptyText}>No items in this filter</Text>
                        </View>
                    }
                />
            )}

            {renderPanel()}
        </SafeAreaView>
    );
};

const StatusPill = ({ meta }) => (
    <View style={[styles.statusPill, { backgroundColor: meta.color + '16' }]}>
        <Ionicons name={meta.icon} size={11} color={meta.color} />
        <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
    </View>
);

const InfoPill = ({ icon, text }) => (
    <View style={styles.infoPill}>
        <Ionicons name={icon} size={11} color="#64748B" />
        <Text style={styles.infoPillText} numberOfLines={1}>{text}</Text>
    </View>
);

const Macro = ({ label, value, color }) => (
    <View style={[styles.macroChip, { backgroundColor: color + '14' }]}>
        <Text style={[styles.macroValue, { color }]}>{value}</Text>
        <Text style={styles.macroLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
    iconBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    titleWrap: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
    title: { fontSize: 21, fontWeight: '900', color: '#0F172A' },
    subtitle: { fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 2, textAlign: 'center' },
    reviewTypeRow: { flexDirection: 'row', gap: 9, paddingHorizontal: 18, marginBottom: 10 },
    reviewTypeTab: { flex: 1, minHeight: 42, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    reviewTypeTabActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
    reviewTypeText: { fontSize: 12, fontWeight: '900', color: '#64748B' },
    reviewTypeTextActive: { color: COLORS.white },
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 12 },
    filterChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E2E8F0' },
    filterChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
    filterText: { fontSize: 11, fontWeight: '900', color: '#64748B' },
    filterTextActive: { color: COLORS.white },
    listContent: { paddingHorizontal: 18, paddingBottom: 230 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mealCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row' },
    tutorialCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' },
    mealImage: { width: 86, height: 110, borderRadius: 16 },
    tutorialLeadIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardBody: { flex: 1 },
    cardHeader: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    cardName: { flex: 1, fontSize: 15, fontWeight: '900', color: '#0F172A', lineHeight: 20 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 8, fontWeight: '900' },
    macroRow: { flexDirection: 'row', gap: 5, marginTop: 10 },
    macroChip: { flex: 1, borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
    macroValue: { fontSize: 11, fontWeight: '900' },
    macroLabel: { fontSize: 7, color: '#94A3B8', fontWeight: '900' },
    ingredients: { fontSize: 10, color: '#64748B', fontWeight: '700', marginTop: 8, lineHeight: 14 },
    tutorialMetaGrid: { flexDirection: 'row', gap: 6, marginTop: 9 },
    infoPill: { flex: 1, minHeight: 28, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, gap: 4 },
    infoPillText: { flex: 1, fontSize: 9, fontWeight: '800', color: '#64748B' },
    openLinkBtn: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, gap: 8 },
    emptyText: { fontSize: 12, color: '#64748B', fontWeight: '800' },
    reviewPanel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, borderWidth: 1, borderColor: '#E2E8F0' },
    panelHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
    panelTitle: { fontSize: 19, fontWeight: '900', color: '#0F172A' },
    panelSub: { fontSize: 11, color: '#64748B', fontWeight: '700', marginTop: 5, lineHeight: 16 },
    panelLinkBtn: { alignSelf: 'flex-start', minHeight: 36, borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, marginTop: 12 },
    panelLinkText: { fontSize: 11, fontWeight: '900', color: '#991B1B' },
    notesInput: { minHeight: 72, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 12, marginTop: 14, color: '#0F172A', textAlignVertical: 'top' },
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    actionBtn: { width: '48%', height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    actionText: { color: COLORS.white, fontSize: 12, fontWeight: '900' },
    cancelBtn: { height: 42, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    cancelText: { fontSize: 13, color: '#64748B', fontWeight: '900' },
});

export default MealReviewScreen;
