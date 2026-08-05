import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
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
import { api } from '../services/api';
import { COLORS } from '../constants/Theme';

const FILTERS = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'needs_adjustment', label: 'Adjust' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'all', label: 'All' },
];

const STATUS_META = {
    approved: { label: 'Approved', color: '#10B981', icon: 'shield-checkmark' },
    pending: { label: 'Pending Review', color: '#F59E0B', icon: 'time-outline' },
    needs_adjustment: { label: 'Needs Adjustment', color: '#3B82F6', icon: 'construct-outline' },
    rejected: { label: 'Rejected', color: '#EF4444', icon: 'close-circle-outline' },
};

const MealReviewScreen = ({ navigation }) => {
    const [reviews, setReviews] = useState({});
    const [activeFilter, setActiveFilter] = useState('pending');
    const [selectedMeal, setSelectedMeal] = useState(null);
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
            Alert.alert('Reviewer Only', 'Only the assigned meal reviewer can approve meals.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
            return;
        }

        const res = await api.getMealReviews();
        if (res.status === 200) {
            setReviews(res.data?.reviews || {});
        } else {
            Alert.alert('Review Load Failed', res.data?.message || 'Could not load meal reviews.');
        }
        setLoading(false);
    };

    const mealRows = useMemo(() => REVIEWABLE_MEALS.map((meal) => ({
        ...meal,
        review: reviews[meal.id] || { status: 'pending', notes: '' },
    })).filter((meal) => activeFilter === 'all' || meal.review.status === activeFilter), [reviews, activeFilter]);

    const openMeal = (meal) => {
        Haptics.selectionAsync();
        setSelectedMeal(meal);
        setNotes(meal.review?.notes || '');
    };

    const saveReview = async (status) => {
        if (!selectedMeal) return;
        setSavingStatus(status);
        const res = await api.saveMealReview(selectedMeal.id, status, notes, 'Reviewer');
        if (res.status === 200) {
            setReviews((prev) => ({
                ...prev,
                [selectedMeal.id]: {
                    mealId: selectedMeal.id,
                    status,
                    notes,
                    reviewedBy: 'Reviewer',
                },
            }));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSelectedMeal(null);
        } else {
            Alert.alert('Save Failed', res.data?.message || 'Could not save this review.');
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
                <View style={styles.mealBody}>
                    <View style={styles.mealHeader}>
                        <Text style={styles.mealName} numberOfLines={2}>{item.name}</Text>
                        <View style={[styles.statusPill, { backgroundColor: meta.color + '16' }]}>
                            <Ionicons name={meta.icon} size={11} color={meta.color} />
                            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconBtn} onPress={exitReview}>
                    <Ionicons name={navigation.canGoBack() ? 'chevron-back' : 'log-out-outline'} size={22} color="#0F172A" />
                </TouchableOpacity>
                <View style={styles.titleWrap}>
                    <Text style={styles.title}>Meal Review</Text>
                    <Text style={styles.subtitle}>Only approved meals appear as swaps</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={loadReviews}>
                    <Ionicons name="refresh" size={18} color="#0F172A" />
                </TouchableOpacity>
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
                    data={mealRows}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMeal}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {selectedMeal && (
                <View style={styles.reviewPanel}>
                    <View style={styles.panelHandle} />
                    <Text style={styles.panelTitle}>{selectedMeal.name}</Text>
                    <Text style={styles.panelSub}>{selectedMeal.ingredients.join(', ')}</Text>
                    <TextInput
                        style={styles.notesInput}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Review note, adjustment, or rejection reason"
                        multiline
                    />
                    <View style={styles.actionGrid}>
                        {['approved', 'needs_adjustment', 'rejected', 'pending'].map((status) => {
                            const meta = STATUS_META[status];
                            return (
                                <TouchableOpacity key={status} style={[styles.actionBtn, { backgroundColor: meta.color }]} onPress={() => saveReview(status)} disabled={!!savingStatus}>
                                    {savingStatus === status ? (
                                        <ActivityIndicator size="small" color={COLORS.white} />
                                    ) : (
                                        <Text style={styles.actionText}>{meta.label}</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedMeal(null)}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

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
    titleWrap: { alignItems: 'center' },
    title: { fontSize: 21, fontWeight: '900', color: '#0F172A' },
    subtitle: { fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 2 },
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 12 },
    filterChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E2E8F0' },
    filterChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
    filterText: { fontSize: 11, fontWeight: '900', color: '#64748B' },
    filterTextActive: { color: COLORS.white },
    listContent: { paddingHorizontal: 18, paddingBottom: 210 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mealCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row' },
    mealImage: { width: 86, height: 110, borderRadius: 16 },
    mealBody: { flex: 1, marginLeft: 12 },
    mealHeader: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    mealName: { flex: 1, fontSize: 15, fontWeight: '900', color: '#0F172A', lineHeight: 20 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 8, fontWeight: '900' },
    macroRow: { flexDirection: 'row', gap: 5, marginTop: 10 },
    macroChip: { flex: 1, borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
    macroValue: { fontSize: 11, fontWeight: '900' },
    macroLabel: { fontSize: 7, color: '#94A3B8', fontWeight: '900' },
    ingredients: { fontSize: 10, color: '#64748B', fontWeight: '700', marginTop: 8 },
    reviewPanel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, borderWidth: 1, borderColor: '#E2E8F0' },
    panelHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
    panelTitle: { fontSize: 19, fontWeight: '900', color: '#0F172A' },
    panelSub: { fontSize: 11, color: '#64748B', fontWeight: '700', marginTop: 5, lineHeight: 16 },
    notesInput: { minHeight: 72, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 12, marginTop: 14, color: '#0F172A', textAlignVertical: 'top' },
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    actionBtn: { width: '48%', height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    actionText: { color: COLORS.white, fontSize: 12, fontWeight: '900' },
    cancelBtn: { height: 42, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    cancelText: { fontSize: 13, color: '#64748B', fontWeight: '900' },
});

export default MealReviewScreen;
