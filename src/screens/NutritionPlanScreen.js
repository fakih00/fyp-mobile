import React, { useContext, useState, useMemo, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView,
    Dimensions, Modal, Animated, ActivityIndicator, RefreshControl, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';
import { api } from '../services/api';
import { COLORS } from '../constants/Theme';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';

const { width } = Dimensions.get('window');
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const NutritionPlanScreen = ({ navigation }) => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = daysOfWeek[new Date().getDay()];

    const { meals, toggleMealComplete, replaceMealInContext, nutritionGoal, isRecomp, macroTargets, colors: themeColors, user } = useContext(AppContext);
    const [selectedDay, setSelectedDay] = useState(today);
    const [selectedMeal, setSelectedMeal] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [floatingAnim] = useState(new Animated.Value(0));
    const [generating, setGenerating] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [waterGlasses, setWaterGlasses] = useState(0);

    // History
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [mealHistory, setMealHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [expandedHistoryDay, setExpandedHistoryDay] = useState(null);

    // AI Replace Meal
    const [showReplaceInput, setShowReplaceInput] = useState(false);
    const [replaceHint, setReplaceHint] = useState('');
    const [isReplacing, setIsReplacing] = useState(false);

    const proteinTarget = macroTargets?.protein || Math.round((nutritionGoal * 0.3) / 4);
    const carbTarget = macroTargets?.carbs || Math.round((nutritionGoal * 0.4) / 4);
    const fatTarget = macroTargets?.fats || Math.round((nutritionGoal * 0.3) / 9);

    const filteredMeals = useMemo(() => (meals || []).filter(m => m.day === selectedDay), [meals, selectedDay]);

    const totalCals = useMemo(() => (filteredMeals || []).reduce((a, m) => a + (m.calories || 0), 0) || nutritionGoal, [filteredMeals, nutritionGoal]);
    const consumedCals = useMemo(() => (filteredMeals || []).filter(m => m.completed).reduce((a, m) => a + (m.calories || 0), 0), [filteredMeals]);
    const remaining = Math.max(totalCals - consumedCals, 0);
    const progress = totalCals > 0 ? consumedCals / totalCals : 0;

    const consumedProtein = useMemo(() => (filteredMeals || []).filter(m => m.completed).reduce((a, m) => a + (m.protein || 0), 0), [filteredMeals]);
    const consumedCarbs = useMemo(() => (filteredMeals || []).filter(m => m.completed).reduce((a, m) => a + (m.carbs || 0), 0), [filteredMeals]);
    const consumedFats = useMemo(() => (filteredMeals || []).filter(m => m.completed).reduce((a, m) => a + (m.fats || 0), 0), [filteredMeals]);

    const completedMeals = (filteredMeals || []).filter(m => m.completed).length;
    const totalMeals = (filteredMeals || []).length;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
                Animated.timing(floatingAnim, { toValue: 0, duration: 4000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const openHistory = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowHistoryModal(true);
        setLoadingHistory(true);
        try {
            const res = await api.get30DayMealHistory();
            if (res.status === 200) setMealHistory(res.data);
        } catch (e) {
            console.error('Meal history error:', e);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleGeneratePlan = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setGenerating(true);
        console.log("Initiating AI synthesis for nutrition plan generation...");
        try {
            const res = await api.post('generatePlan', { type: 'nutrition' });
            if (res.status !== 200) Alert.alert('Error', res.data?.message || 'Failed to generate plan.');
        } catch (e) {
            Alert.alert('Connection Error', 'Please check your connection and try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleLogMeal = (id) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toggleMealComplete(id);
        setIsModalVisible(false);
    };

    const handleReplaceMeal = async () => {
        if (!replaceHint.trim()) {
            Alert.alert('Hint Required', 'Please tell the AI what to change about this meal (e.g., "no chicken", "make it vegan").');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsReplacing(true);
        try {
            const res = await api.replaceMeal(selectedMeal.id, replaceHint);
            if (res.status === 200 && res.data?.new_meal) {
                replaceMealInContext(res.data.new_meal);
                setSelectedMeal(res.data.new_meal);
                setShowReplaceInput(false);
                setReplaceHint('');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Alert.alert('Replacement Failed', res.data?.message || 'The AI could not replace this meal. Please try another hint.');
            }
        } catch (e) {
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setIsReplacing(false);
        }
    };

    const addWaterGlass = () => {
        if (waterGlasses < 8) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setWaterGlasses(w => w + 1);
        }
    };

    // ── Render Header ────────────────────────────────────────────────
    const renderHeader = () => (
        <View style={styles.headerStack}>
            <LinearGradient colors={themeColors.gradient} style={styles.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Animated.View style={[styles.floatingIcon, {
                top: 40, left: 50, opacity: 0.08,
                transform: [
                    { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }) },
                    { rotate: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '20deg'] }) }
                ]
            }]}>
                <Ionicons name="nutrition" size={44} color={COLORS.white} />
            </Animated.View>

            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.navRow}>
                    <View style={styles.headerSpacer} />
                    <View style={styles.titleStack}>
                        <Text style={styles.eliteTitle}>Nutrition Plan</Text>
                        {isRecomp ? (
                            <View style={styles.recompBadge}>
                                <Ionicons name="flash" size={10} color={COLORS.white} />
                                <Text style={styles.recompBadgeText}>RECOMPOSITION MODE</Text>
                            </View>
                        ) : (
                            <Text style={styles.eliteSubtitle}>ELITE PERFORMANCE FUEL</Text>
                        )}
                    </View>
                    <TouchableOpacity style={styles.headerBtn} onPress={openHistory}>
                        <BlurView intensity={20} tint="light" style={styles.headerBtnBlur}>
                            <Ionicons name="time" size={20} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector} contentContainerStyle={styles.daySelectorContent}>
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day}
                            onPress={() => { Haptics.selectionAsync(); setSelectedDay(day); }}
                            style={[styles.dayPill, selectedDay === day && styles.dayPillActive]}
                        >
                            <Text style={[styles.dayPillText, selectedDay === day && styles.dayPillTextActive]}>
                                {day.substring(0, 3)}
                            </Text>
                            {day === today && <Text style={[styles.todayLabel, selectedDay === day && { color: themeColors.accent }]}>TODAY</Text>}
                            {selectedDay === day && day !== today && <View style={[styles.activeDot, { backgroundColor: themeColors.accent }]} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );

    // ── Calorie Ring Dashboard ────────────────────────────────────────
    const renderDashboard = () => (
        <GlassCard style={styles.dashboard}>
            {/* Top row: ring + macros */}
            <View style={styles.dashRow}>
                <View style={styles.ringSection}>
                    <View style={styles.ringOuter}>
                        <LinearGradient
                            colors={[themeColors.accent + '30', themeColors.accent + '08']}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={[styles.ringFill, { height: `${Math.min(progress * 100, 100)}%`, backgroundColor: themeColors.accent + '30' }]} />
                        <View style={styles.ringCenter}>
                            {isRecomp && <Text style={[styles.recompMini, { color: themeColors.accent }]}>RECOMP</Text>}
                            <Text style={styles.ringVal}>{remaining}</Text>
                            <Text style={styles.ringLabel}>KCAL LEFT</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.macroList}>
                    {[
                        { label: 'PROTEIN', val: consumedProtein, target: proteinTarget, color: '#EF4444' },
                        { label: 'CARBS',   val: consumedCarbs,   target: carbTarget,    color: '#3B82F6' },
                        { label: 'FATS',    val: consumedFats,    target: fatTarget,     color: '#F59E0B' },
                    ].map(({ label, val, target, color }) => {
                        const pct = target > 0 ? Math.min(Math.round((val / target) * 100), 100) : 0;
                        return (
                            <View key={label} style={styles.macroRow}>
                                <View style={styles.macroLabelRow}>
                                    <View style={[styles.macroDot, { backgroundColor: color }]} />
                                    <Text style={styles.macroLab}>{label}</Text>
                                    <Text style={styles.macroPerc}>{pct}%</Text>
                                </View>
                                <View style={styles.macroBar}>
                                    <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                                </View>
                                <Text style={styles.macroVal}>{val}g <Text style={styles.macroSub}>/ {target}g</Text></Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Stats strip */}
            <View style={styles.statsStrip}>
                {[
                    { icon: 'flame',        label: 'Consumed',  val: `${consumedCals} kcal`,  color: '#EF4444' },
                    { icon: 'restaurant',   label: 'Meals Done', val: `${completedMeals}/${totalMeals}`, color: themeColors.accent },
                    { icon: 'trending-up',  label: 'Target',    val: `${totalCals} kcal`,     color: '#3B82F6' },
                ].map(({ icon, label, val, color }) => (
                    <View key={label} style={styles.statChip}>
                        <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
                            <Ionicons name={icon} size={14} color={color} />
                        </View>
                        <Text style={styles.statVal}>{val}</Text>
                        <Text style={styles.statLab}>{label}</Text>
                    </View>
                ))}
            </View>

            {/* AI insight */}
            <View style={[styles.aiBox, { backgroundColor: themeColors.accent + '12' }]}>
                <View style={[styles.aiIcon, { backgroundColor: themeColors.accent }]}>
                    <Ionicons name="sparkles" size={12} color={COLORS.white} />
                </View>
                <Text style={[styles.aiMsg, { color: themeColors.accent }]}>
                    {progress >= 1
                        ? "🎉 All calories consumed for today! Great discipline."
                        : progress >= 0.7
                        ? "Almost there! Keep fueling your body with high-quality food."
                        : isRecomp
                        ? "AI Pivot: Targeting 40% protein to preserve muscle while burning fat."
                        : `${Math.round((1 - progress) * 100)}% of your daily fuel remaining — stay on track!`}
                </Text>
            </View>
        </GlassCard>
    );


    // ── Meal Card ─────────────────────────────────────────────────────
    const renderMeal = ({ item, index }) => (
        <AnimatedCard delay={index * 80} style={styles.mealCardWrap}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => { Haptics.selectionAsync(); setSelectedMeal(item); setIsModalVisible(true); }}>
                <GlassCard style={[styles.mealCard, item.completed && styles.mealCardDone]}>
                    <View style={styles.mealImageWrap}>
                        <Image source={{ uri: item.image }} style={styles.mealImg} />
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={StyleSheet.absoluteFill} />
                        <View style={styles.mealTypeTag}>
                            <Text style={styles.mealTypeText}>{item.type.toUpperCase()}</Text>
                        </View>
                        {item.completed && (
                            <View style={styles.mealDoneBadge}>
                                <Ionicons name="checkmark" size={16} color={COLORS.white} />
                            </View>
                        )}
                    </View>

                    <View style={styles.mealBody}>
                        <View style={styles.mealHeaderRow}>
                            <Text style={styles.mealName} numberOfLines={1}>{item.name}</Text>
                            <TouchableOpacity
                                style={[styles.logBtn, item.completed && styles.logBtnDone]}
                                onPress={() => handleLogMeal(item.id)}
                                disabled={item.completed}
                            >
                                {item.completed
                                    ? <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
                                    : <Text style={styles.logBtnText}>LOG</Text>}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.macroChips}>
                            {[
                                { val: item.calories, lab: 'kcal', color: '#EF4444' },
                                { val: `${item.protein}g`, lab: 'pro', color: '#10B981' },
                                { val: `${item.carbs}g`, lab: 'carb', color: '#3B82F6' },
                                { val: `${item.fats}g`, lab: 'fat', color: '#F59E0B' },
                            ].map(({ val, lab, color }) => (
                                <View key={lab} style={[styles.macroChip, { backgroundColor: color + '15' }]}>
                                    <Text style={[styles.macroChipVal, { color }]}>{val}</Text>
                                    <Text style={styles.macroChipLab}>{lab}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </GlassCard>
            </TouchableOpacity>
        </AnimatedCard>
    );

    return (
        <AuraBackground style={styles.container}>
            {renderHeader()}

            <FlatList
                data={filteredMeals}
                keyExtractor={item => item.id}
                renderItem={renderMeal}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }} tintColor={themeColors.accent} />}
                ListHeaderComponent={() => (
                    <View style={styles.listHeader}>
                        {renderDashboard()}
                        <View style={styles.sectionHeader}>
                            <Ionicons name="restaurant" size={16} color={themeColors.accent} />
                            <Text style={styles.sectionTitle}>{selectedDay}'s Fuel Plan</Text>
                            <View style={styles.sectionLine} />
                            <Text style={styles.mealCountBadge}>{totalMeals} meals</Text>
                        </View>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyWrap}>
                        <Ionicons name="restaurant-outline" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>No meals for {selectedDay}</Text>
                        <Text style={styles.emptySub}>Generate a plan or switch to another day</Text>
                        <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: themeColors.accent + '18' }]} onPress={handleGeneratePlan}>
                            <Text style={[styles.emptyBtnText, { color: themeColors.accent }]}>GENERATE PLAN</Text>
                        </TouchableOpacity>
                    </View>
                )}
                contentContainerStyle={styles.listContent}
            />

            {/* ── Meal Details Modal ── */}
            <Modal animationType="slide" transparent visible={isModalVisible} onRequestClose={() => { setIsModalVisible(false); setShowReplaceInput(false); setReplaceHint(''); }}>
                <View style={styles.modalOverlay}>
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    {selectedMeal && (
                        <View style={styles.modalSheet}>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.modalHero}>
                                    <Image source={{ uri: selectedMeal.image }} style={styles.modalImg} />
                                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
                                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setIsModalVisible(false); setShowReplaceInput(false); setReplaceHint(''); }}>
                                        <Ionicons name="close" size={22} color={COLORS.white} />
                                    </TouchableOpacity>
                                    <View style={styles.modalHeroText}>
                                        <Text style={styles.modalMealType}>{selectedMeal.type.toUpperCase()}</Text>
                                        <Text style={styles.modalMealName}>{selectedMeal.name}</Text>
                                    </View>
                                </View>

                                <View style={styles.modalBody}>
                                    <View style={styles.modalMacroGrid}>
                                        {[
                                            { val: selectedMeal.calories, lab: 'KCAL', color: '#EF4444', icon: 'flame' },
                                            { val: `${selectedMeal.protein}g`, lab: 'PROTEIN', color: '#10B981', icon: 'barbell' },
                                            { val: `${selectedMeal.carbs}g`, lab: 'CARBS', color: '#3B82F6', icon: 'layers' },
                                            { val: `${selectedMeal.fats}g`, lab: 'FATS', color: '#F59E0B', icon: 'water' },
                                        ].map(({ val, lab, color, icon }) => (
                                            <View key={lab} style={[styles.modalMacroPill, { backgroundColor: color + '12' }]}>
                                                <Ionicons name={icon} size={16} color={color} />
                                                <Text style={[styles.modalMacroVal, { color }]}>{val}</Text>
                                                <Text style={styles.modalMacroLab}>{lab}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {(selectedMeal.ingredients || []).length > 0 && (
                                        <View style={styles.detailSection}>
                                            <Text style={styles.detailTitle}>INGREDIENTS</Text>
                                            {(selectedMeal.ingredients || []).map((ing, i) => (
                                                <View key={i} style={styles.ingredientRow}>
                                                    <View style={[styles.ingDot, { backgroundColor: themeColors.accent }]} />
                                                    <Text style={styles.ingredientText}>{ing}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {selectedMeal.instructions && (
                                        <View style={styles.detailSection}>
                                            <Text style={styles.detailTitle}>PREPARATION</Text>
                                            <Text style={styles.instructionText}>{selectedMeal.instructions}</Text>
                                        </View>
                                    )}

                                    {/* ── AI Meal Replacement ── */}
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailTitle}>AI MEAL REPLACEMENT</Text>
                                        {!showReplaceInput ? (
                                            <TouchableOpacity 
                                                style={[styles.aiReplaceBtn, { borderColor: themeColors.accent }]} 
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setShowReplaceInput(true);
                                                }}
                                            >
                                                <Ionicons name="sparkles" size={18} color={themeColors.accent} />
                                                <Text style={[styles.aiReplaceBtnText, { color: themeColors.accent }]}>Replace this meal with AI</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={styles.aiInputContainer}>
                                                <Text style={styles.aiInputHint}>Tell Gemini what to change (e.g., "no dairy", "swap chicken for beef", "higher protein")</Text>
                                                <TextInput
                                                    style={styles.aiTextInput}
                                                    placeholder="Enter your replacement hint..."
                                                    placeholderTextColor="#94A3B8"
                                                    value={replaceHint}
                                                    onChangeText={setReplaceHint}
                                                    multiline
                                                    numberOfLines={3}
                                                    editable={!isReplacing}
                                                />
                                                <View style={styles.aiActionRow}>
                                                    <TouchableOpacity 
                                                        style={[styles.aiCancelBtn, isReplacing && { opacity: 0.5 }]} 
                                                        onPress={() => {
                                                            setShowReplaceInput(false);
                                                            setReplaceHint('');
                                                        }}
                                                        disabled={isReplacing}
                                                    >
                                                        <Text style={styles.aiCancelBtnText}>Cancel</Text>
                                                    </TouchableOpacity>
                                                    
                                                    <TouchableOpacity 
                                                        style={[styles.aiSubmitBtn, { backgroundColor: themeColors.accent }]} 
                                                        onPress={handleReplaceMeal}
                                                        disabled={isReplacing}
                                                    >
                                                        {isReplacing ? (
                                                            <ActivityIndicator size="small" color={COLORS.white} />
                                                        ) : (
                                                            <View style={styles.aiSubmitBtnContent}>
                                                                <Ionicons name="sparkles" size={14} color={COLORS.white} />
                                                                <Text style={styles.aiSubmitBtnText}>Replace Meal</Text>
                                                            </View>
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                {selectedMeal.day !== today && !selectedMeal.completed && (
                                    <View style={styles.lockNotice}>
                                        <Ionicons name="time" size={14} color="#F59E0B" />
                                        <Text style={styles.lockText}>Logging only available for today's meals.</Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={[styles.logActionBtn, (selectedMeal.completed || selectedMeal.day !== today) && { opacity: 0.6 }]}
                                    onPress={() => handleLogMeal(selectedMeal.id)}
                                    disabled={selectedMeal.completed || selectedMeal.day !== today}
                                >
                                    <LinearGradient
                                        colors={(selectedMeal.completed || selectedMeal.day !== today) ? ['#94A3B8', '#64748B'] : themeColors.gradient}
                                        style={styles.logActionGrad}
                                    >
                                        <Text style={styles.logActionText}>
                                            {selectedMeal.completed ? 'MEAL LOGGED ✓' : selectedMeal.day !== today ? 'NOT TODAY\'S MEAL' : 'LOG THIS MEAL'}
                                        </Text>
                                        <Ionicons
                                            name={selectedMeal.completed ? 'checkmark-circle' : selectedMeal.day !== today ? 'lock-closed' : 'add-circle'}
                                            size={20} color={COLORS.white}
                                        />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>

            {/* ── 30-Day Meal History Modal (inline JSX) ── */}
            <Modal
                visible={showHistoryModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowHistoryModal(false)}
            >
                <View style={styles.historyModalOverlay}>
                    <View style={styles.historyModalSheet}>
                        {/* Handle */}
                        <View style={styles.historyHandle} />

                        {/* Title row */}
                        <View style={styles.historyTitleRow}>
                            <View>
                                <Text style={styles.historyTitle}>30-Day Meal History</Text>
                                <Text style={styles.historySub}>Your nutrition log for the past month</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={styles.historyCloseBtn}>
                                <Ionicons name="close" size={20} color={COLORS.text || '#0F172A'} />
                            </TouchableOpacity>
                        </View>

                        {loadingHistory ? (
                            <View style={styles.historyLoading}>
                                <ActivityIndicator size="large" color={themeColors.accent} />
                                <Text style={styles.historyLoadingText}>Loading history...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={mealHistory}
                                keyExtractor={(item, i) => i.toString()}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                                renderItem={({ item }) => {
                                    const safeItem = {
                                        total_meals: 0, logged: 0, missed: 0, total_cals: 0, meals: [],
                                        ...item,
                                        meals: Array.isArray(item.meals) ? item.meals : [],
                                    };
                                    const allLogged = safeItem.logged === safeItem.total_meals && safeItem.total_meals > 0;
                                    const noPlan = safeItem.total_meals === 0;
                                    const partial = !allLogged && safeItem.logged > 0;
                                    const missed = safeItem.logged === 0 && safeItem.total_meals > 0;
                                    const isExpanded = expandedHistoryDay === safeItem.date;

                                    let statusColor = '#94A3B8';
                                    let statusBg = 'rgba(148,163,184,0.1)';
                                    let statusText = 'No Plan';
                                    let statusIcon = 'calendar-outline';

                                    if (allLogged) { statusColor = '#10B981'; statusBg = 'rgba(16,185,129,0.1)'; statusText = 'All Logged'; statusIcon = 'checkmark-circle'; }
                                    else if (partial) { statusColor = '#F59E0B'; statusBg = 'rgba(245,158,11,0.1)'; statusText = `${safeItem.logged}/${safeItem.total_meals} Logged`; statusIcon = 'ellipse-outline'; }
                                    else if (missed) { statusColor = '#EF4444'; statusBg = 'rgba(239,68,68,0.1)'; statusText = 'Missed'; statusIcon = 'close-circle'; }

                                    return (
                                        <View style={styles.historyDayCard}>
                                            <TouchableOpacity
                                                style={styles.historyDayRow}
                                                onPress={() => {
                                                    if (!noPlan) {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setExpandedHistoryDay(isExpanded ? null : safeItem.date);
                                                    }
                                                }}
                                            >
                                                <View style={[styles.historyDayIcon, { backgroundColor: statusBg }]}>
                                                    <Ionicons name={statusIcon} size={20} color={statusColor} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.historyDayName}>{safeItem.day}</Text>
                                                    <Text style={styles.historyDayDate}>{safeItem.date} · {noPlan ? 'No plan' : `${safeItem.total_cals} kcal`}</Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                                    <View style={[styles.historyStatusBadge, { backgroundColor: statusBg }]}>
                                                        <Text style={[styles.historyStatusText, { color: statusColor }]}>{statusText.toUpperCase()}</Text>
                                                    </View>
                                                    {!noPlan && <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#94A3B8" />}
                                                </View>
                                            </TouchableOpacity>

                                            {/* Expanded meal breakdown */}
                                                {isExpanded && (safeItem.meals || []).length > 0 && (
                                                <View style={styles.historyMealList}>
                                                    {safeItem.meals.map((meal, mi) => (
                                                        <View key={mi} style={styles.historyMealRow}>
                                                            <View style={[styles.historyMealDot, { backgroundColor: meal.completed ? '#10B981' : '#EF4444' }]} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.historyMealName}>{meal.name}</Text>
                                                                <Text style={styles.historyMealCals}>{meal.calories} kcal · {meal.protein}g protein</Text>
                                                            </View>
                                                            <View style={[styles.historyMealBadge, { backgroundColor: meal.completed ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                                                                <Text style={{ fontSize: 9, fontWeight: '900', color: meal.completed ? '#10B981' : '#EF4444' }}>
                                                                    {meal.completed ? 'LOGGED' : 'MISSED'}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    );
                                }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background || '#F5F2ED' },

    // ── Header
    headerStack: {
        height: 175, position: 'relative', zIndex: 10,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
    },
    headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    floatingIcon: { position: 'absolute', zIndex: 1 },
    headerSafe: { flex: 1, paddingHorizontal: 20 },
    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    headerSpacer: { width: 44 },
    titleStack: { alignItems: 'center' },
    eliteTitle: { fontSize: 24, fontWeight: '900', color: COLORS.white, letterSpacing: -0.5 },
    eliteSubtitle: { fontSize: 10, fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginTop: 2 },
    recompBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4, gap: 4 },
    recompBadgeText: { fontSize: 9, fontWeight: '900', color: COLORS.white, letterSpacing: 1 },
    headerBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
    headerBtnBlur: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    daySelector: { marginTop: 12 },
    daySelectorContent: { paddingRight: 20, paddingBottom: 2 },
    dayPill: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', minWidth: 52, height: 44, justifyContent: 'center' },
    dayPillActive: { backgroundColor: COLORS.surface || '#FFFCF9', elevation: 4 },
    dayPillText: { fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.85)' },
    dayPillTextActive: { color: '#064E3B' },
    todayLabel: { fontSize: 7, fontWeight: '900', color: 'rgba(255,255,255,0.6)', marginTop: 1, letterSpacing: 0.5 },
    activeDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },

    // ── Dashboard
    dashboard: { marginTop: 12, marginHorizontal: 20, padding: 22, borderRadius: 30, backgroundColor: COLORS.surface || '#FFFCF9', elevation: 8 },
    dashRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    ringSection: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
    ringOuter: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#F1F5F9', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
    ringFill: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    ringCenter: { alignItems: 'center' },
    recompMini: { fontSize: 6, fontWeight: '900', letterSpacing: 1, marginBottom: -2 },
    ringVal: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
    ringLabel: { fontSize: 8, fontWeight: '900', color: '#64748B', letterSpacing: 1 },
    macroList: { flex: 1, paddingLeft: 20, gap: 12 },
    macroRow: { gap: 4 },
    macroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    macroDot: { width: 6, height: 6, borderRadius: 3 },
    macroLab: { flex: 1, fontSize: 9, fontWeight: '900', color: '#64748B', letterSpacing: 0.5 },
    macroPerc: { fontSize: 10, fontWeight: '800', color: '#0F172A' },
    macroBar: { height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
    macroBarFill: { height: '100%', borderRadius: 3 },
    macroVal: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
    macroSub: { color: '#94A3B8', fontWeight: '400' },
    statsStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    statChip: { alignItems: 'center', gap: 4, flex: 1 },
    statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    statVal: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
    statLab: { fontSize: 9, fontWeight: '700', color: '#94A3B8' },
    aiBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18 },
    aiIcon: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    aiMsg: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 16 },

    // ── Water Tracker
    waterCard: { marginHorizontal: 20, marginTop: 16, padding: 20, borderRadius: 24, backgroundColor: COLORS.surface || '#FFFCF9', elevation: 4 },
    waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    waterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    waterTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
    waterCount: { fontSize: 13, fontWeight: '900', color: '#38BDF8' },
    glassRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
    glass: { flex: 1, aspectRatio: 1, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0' },
    glassFilled: { backgroundColor: 'rgba(56,189,248,0.12)', borderColor: '#38BDF8' },
    waterBarBg: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
    waterBarFill: { height: '100%', borderRadius: 3 },
    waterSub: { fontSize: 11, color: '#64748B', fontWeight: '600' },

    // ── Quick Actions
    quickActionsRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, gap: 10 },
    quickAction: { flex: 1, height: 68, borderRadius: 20, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
    quickActionGrad: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
    quickActionText: { fontSize: 11, fontWeight: '900', color: COLORS.white, letterSpacing: 0.5 },

    // ── List
    listHeader: { paddingBottom: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 12, gap: 10 },
    sectionTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
    sectionLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    mealCountBadge: { fontSize: 10, fontWeight: '900', color: '#94A3B8' },
    listContent: { paddingBottom: 110 },

    // ── Meal Card
    mealCardWrap: { paddingHorizontal: 20, marginBottom: 16 },
    mealCard: { flexDirection: 'row', padding: 12, borderRadius: 26, backgroundColor: COLORS.surface || '#FFFCF9', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    mealCardDone: { opacity: 0.65 },
    mealImageWrap: { width: 95, height: 95, borderRadius: 20, overflow: 'hidden' },
    mealImg: { width: '100%', height: '100%' },
    mealTypeTag: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.5)' },
    mealTypeText: { fontSize: 8, fontWeight: '900', color: COLORS.white },
    mealDoneBadge: { position: 'absolute', bottom: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
    mealBody: { flex: 1, marginLeft: 15, justifyContent: 'center' },
    mealHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    mealName: { fontSize: 16, fontWeight: '800', color: '#0F172A', flex: 1, marginRight: 8 },
    logBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    logBtnDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
    logBtnText: { fontSize: 9, fontWeight: '900', color: '#475569' },
    macroChips: { flexDirection: 'row', gap: 6 },
    macroChip: { flex: 1, paddingVertical: 5, borderRadius: 10, alignItems: 'center' },
    macroChipVal: { fontSize: 11, fontWeight: '900' },
    macroChipLab: { fontSize: 7, fontWeight: '800', color: '#94A3B8', marginTop: 1 },

    // ── Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 30 },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: '#334155', marginTop: 14 },
    emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 6, marginBottom: 20 },
    emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
    emptyBtnText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },

    // ── Meal Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: COLORS.surface || '#FFFCF9', borderTopLeftRadius: 40, borderTopRightRadius: 40, height: '88%', overflow: 'hidden' },
    modalHero: { height: 280, position: 'relative' },
    modalImg: { width: '100%', height: '100%' },
    modalCloseBtn: { position: 'absolute', top: 18, right: 18, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
    modalHeroText: { position: 'absolute', bottom: 24, left: 24, right: 24 },
    modalMealType: { fontSize: 11, fontWeight: '900', color: '#10B981', letterSpacing: 2, marginBottom: 6 },
    modalMealName: { fontSize: 26, fontWeight: '900', color: COLORS.white, letterSpacing: -0.5 },
    modalBody: { padding: 24 },
    modalMacroGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    modalMacroPill: { flex: 1, marginHorizontal: 4, borderRadius: 18, paddingVertical: 14, alignItems: 'center', gap: 4 },
    modalMacroVal: { fontSize: 16, fontWeight: '900' },
    modalMacroLab: { fontSize: 9, fontWeight: '800', color: '#64748B' },
    detailSection: { marginBottom: 24 },
    detailTitle: { fontSize: 12, fontWeight: '900', color: '#0F172A', letterSpacing: 1.5, marginBottom: 12 },
    ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
    ingDot: { width: 8, height: 8, borderRadius: 4 },
    ingredientText: { fontSize: 14, color: '#475569', fontWeight: '500' },
    instructionText: { fontSize: 14, color: '#475569', lineHeight: 22 },
    modalFooter: { padding: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    lockNotice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', padding: 12, borderRadius: 14, marginBottom: 12, gap: 8 },
    lockText: { fontSize: 11, color: '#B45309', fontWeight: '600', flex: 1 },
    logActionBtn: { height: 58, borderRadius: 20, overflow: 'hidden' },
    logActionGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    logActionText: { fontSize: 15, fontWeight: '900', color: COLORS.white, letterSpacing: 1 },

    // ── History Modal
    historyModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    historyModalSheet: { backgroundColor: COLORS.surface || '#FFFCF9', borderTopLeftRadius: 36, borderTopRightRadius: 36, height: '90%', paddingTop: 14 },
    historyHandle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    historyTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 22, marginBottom: 20 },
    historyTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
    historySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
    historyCloseBtn: { padding: 8, backgroundColor: 'rgba(15,23,42,0.05)', borderRadius: 18 },
    historyLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
    historyLoadingText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    historyDayCard: { backgroundColor: COLORS.white || '#FFFFFF', borderRadius: 20, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(15,23,42,0.05)' },
    historyDayRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
    historyDayIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
    historyDayName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
    historyDayDate: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
    historyStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9 },
    historyStatusText: { fontSize: 9, fontWeight: '900' },
    historyMealList: { backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingBottom: 12 },
    historyMealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    historyMealDot: { width: 8, height: 8, borderRadius: 4 },
    historyMealName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
    historyMealCals: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    historyMealBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

    // AI Replacement
    aiReplaceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        backgroundColor: 'transparent',
        gap: 8,
        marginTop: 4,
    },
    aiReplaceBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    aiInputContainer: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginTop: 4,
        gap: 12,
    },
    aiInputHint: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 18,
        fontWeight: '500',
    },
    aiTextInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#0F172A',
        minHeight: 60,
        textAlignVertical: 'top',
    },
    aiActionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
    },
    aiCancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    aiCancelBtnText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
    },
    aiSubmitBtn: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiSubmitBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    aiSubmitBtnText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

export default NutritionPlanScreen;
