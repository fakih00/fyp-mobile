import React, { useState, useContext, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ScrollView,
    Dimensions,
    Modal,
    ActivityIndicator,
    RefreshControl,
    Animated
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../context/AppContext';
import { api } from '../services/api';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { AnimatedCard, GlassCard, PrimaryButton, AuraBackground } from '../components';

const { width } = Dimensions.get('window');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WorkoutPlanScreen = ({ navigation }) => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = daysOfWeek[new Date().getDay()];

    const { startWorkout, resetWorkout, workouts, setWorkouts, user, colors: themeColors } = useContext(AppContext);
    const [selectedDay, setSelectedDay] = useState(today);
    const [previewWorkout, setPreviewWorkout] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [floatingAnim] = useState(new Animated.Value(0));
    const [hasRecoveryPlan, setHasRecoveryPlan] = useState(false);
    const [generating, setGenerating] = useState(false);

    // History Modal States
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [history30Days, setHistory30Days] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const currentDay = today;

    const fetchWorkouts = async () => {
        if (user?.user_id) {
            const res = await api.getWorkouts();
            if (res.status === 200) {
                setWorkouts(res.data);
            }
            if (user?.injuries && user.injuries !== 'none') {
                const recRes = await api.getRecoveryPlan();
                if (recRes.status === 200 && recRes.data) {
                    setHasRecoveryPlan(true);
                } else {
                    setHasRecoveryPlan(false);
                }
            }
        }
        setLoading(false);
        setRefreshing(false);
    };

    const handleGenerateWorkout = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setGenerating(true);
        try {
            const res = await api.post('generatePlan', { type: 'workout' });
            if (res.status === 200) {
                await fetchWorkouts();
            } else {
                alert(res.data.message || "Failed to generate plan.");
            }
        } catch (e) {
            console.error(e);
            alert("Connection error.");
        } finally {
            setGenerating(false);
        }
    };

    const openHistory = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowHistoryModal(true);
        setLoadingHistory(true);
        try {
            const res = await api.get30DayWorkoutHistory();
            if (res.status === 200) {
                setHistory30Days(res.data);
            }
        } catch (e) {
            console.error('History error:', e);
        } finally {
            setLoadingHistory(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchWorkouts();
        }, [user?.user_id])
    );

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatingAnim, {
                    toValue: 0,
                    duration: 4000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchWorkouts();
    };

    const isToday = selectedDay === currentDay;

    // Filter workouts for the selected day
    const filteredWorkouts = useMemo(() => {
        return (workouts || []).filter(w => w.day === selectedDay);
    }, [workouts, selectedDay]);

    const calculateDailyStats = () => {
        const completedSessions = filteredWorkouts.filter(w => w.completed).length;
        const totalSessions = filteredWorkouts.length;

        const workout = filteredWorkouts[0];
        let kcal = 0;
        let kcalTarget = 800;
        let duration = 0;
        let durationTarget = 60;
        let intensity = 0;
        let intensityTarget = 10;
        let progress = 0;

        if (workout) {
            kcalTarget = workout.kcal || 800;
            durationTarget = parseInt(workout.duration) || 60;
            intensityTarget = workout.intensity || 10;

            const exCompleted = (workout.exercises || []).filter(e => e.completed).length;
            const exTotal = (workout.exercises || []).length;
            progress = exTotal > 0 ? exCompleted / exTotal : 0;
            if (workout.completed) progress = 1;

            // Calculate current values based on progress
            kcal = Math.round(kcalTarget * progress);
            duration = Math.round(durationTarget * progress);
            intensity = Math.round(intensityTarget * progress);
        }

        return {
            completed: completedSessions,
            total: totalSessions,
            kcal,
            kcalTarget,
            duration,
            durationTarget,
            intensity,
            intensityTarget,
            progress
        };
    };

    const handleDaySelect = (day) => {
        Haptics.selectionAsync();
        setSelectedDay(day);
    };

    const renderHeader = () => (
        <View style={styles.headerStack}>
            <LinearGradient
                colors={themeColors.gradient}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Floating Dumbbell Auras */}
            <Animated.View style={[
                styles.floatingIcon,
                {
                    top: 40,
                    left: 60,
                    opacity: 0.08,
                    transform: [
                        { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }) },
                        { rotate: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '25deg'] }) }
                    ]
                }
            ]}>
                <Ionicons name="fitness" size={40} color={COLORS.white} />
            </Animated.View>

            <Animated.View style={[
                styles.floatingIcon,
                {
                    bottom: 40,
                    right: 80,
                    opacity: 0.05,
                    transform: [
                        { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
                        { rotate: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-20deg'] }) }
                    ]
                }
            ]}>
                <Ionicons name="fitness" size={30} color={COLORS.white} />
            </Animated.View>
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.navRow}>
                    <View style={styles.headerSpacer} />
                    <View style={styles.titleStack}>
                        <Text style={styles.eliteTitle}>Workout Plan</Text>
                        <Text style={styles.eliteSubtitle}>LEVEL UP YOUR STRENGTH</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.aiButtonElite}
                        onPress={openHistory}
                    >
                        <BlurView intensity={20} tint="light" style={styles.backBlur}>
                            <Ionicons name="time" size={20} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.daySelectorElite}
                    contentContainerStyle={styles.daySelectorContentElite}
                >
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day}
                            onPress={() => handleDaySelect(day)}
                            style={[
                                styles.dayPill,
                                selectedDay === day && styles.dayPillActive
                            ]}
                        >
                            <Text style={[
                                styles.dayPillText,
                                selectedDay === day && styles.dayPillTextActive
                            ]}>
                                {day.substring(0, 3)}
                            </Text>
                            {day === currentDay && (
                                <Text style={[
                                    styles.todayLabel,
                                    selectedDay === day && { color: themeColors.accent }
                                ]}>TODAY</Text>
                            )}
                            {selectedDay === day && day !== currentDay && <View style={[styles.activeDot, { backgroundColor: themeColors.accent }]} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );

    const renderPremiumDashboard = () => {
        const { completed, total, kcal, kcalTarget, duration, durationTarget, intensity, intensityTarget, progress } = calculateDailyStats();

        return (
            <GlassCard style={styles.premiumDashboard}>
                <View style={styles.dashboardGrid}>
                    <View style={styles.mainRingSection}>
                        <View style={styles.outerRing}>
                            <BlurView intensity={10} tint="dark" style={styles.ringBlur}>
                                <View style={[styles.ringProgress, { height: `${progress * 100}%`, backgroundColor: themeColors.accent }]} />
                                <View style={styles.ringContent}>
                                    {progress === 1 ? (
                                        <>
                                            <Ionicons name="shield-checkmark" size={36} color={themeColors.accent} />
                                            <Text style={[styles.remainingLabElite, { color: themeColors.accent, marginTop: 5 }]}>DONE</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.remainingValElite}>{completed}</Text>
                                            <View style={styles.totalDividerElite} />
                                            <Text style={styles.remainingLabElite}>{total}</Text>
                                            <Text style={styles.ringSubtextElite}>SESSION</Text>
                                        </>
                                    )}
                                </View>
                            </BlurView>
                        </View>
                    </View>

                    <View style={styles.macroListElite}>
                        <MetricItem label="CALORIES" val={kcal} target={kcalTarget} color="#FF6B6B" icon="flame" />
                        <MetricItem label="DURATION" val={duration} target={durationTarget} color={themeColors.accent} icon="time" suffix="m" />
                        <MetricItem label="INTENSITY" val={intensity} target={intensityTarget} color="#34D399" icon="flash" />
                    </View>
                </View>

                <BlurView intensity={15} tint="light" style={[styles.aiEliteBox, { backgroundColor: themeColors.accent + '15' }]}>
                    <View style={[styles.aiEliteIcon, { backgroundColor: themeColors.accent }]}>
                        <Ionicons name={progress === 1 ? "checkmark-done-circle" : "flame"} size={14} color={COLORS.white} />
                    </View>
                    <Text style={styles.aiEliteMsg}>
                        {progress === 1
                            ? "Daily goal reached! Great job maintaining your momentum."
                            : `You're on a ${user?.streak || 0}-day streak! Complete today's session to keep it alive.`}
                    </Text>
                </BlurView>
            </GlassCard>
        );
    };

    const MetricItem = ({ label, val, target, color, icon, suffix = '' }) => {
        const perc = target > 0 ? Math.round((val / target) * 100) : 0;
        return (
            <View style={styles.macroRowElite}>
                <View style={styles.macroLabelRowElite}>
                    <View style={styles.metricLabelGroup}>
                        <Ionicons name={icon} size={10} color={color} style={{ marginRight: 4 }} />
                        <Text style={styles.macroLabElite}>{label}</Text>
                    </View>
                    <Text style={styles.macroPercElite}>{perc}%</Text>
                </View>
                <View style={styles.macroBarElite}>
                    <View style={[styles.macroBarFillElite, { width: `${Math.min(perc, 100)}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.macroValElite}>{val}{suffix} <Text style={styles.macroSubElite}>/ {target}{suffix}</Text></Text>
            </View>
        );
    }

    const renderWorkoutCard = ({ item, index }) => (
        <AnimatedCard delay={index * 100} style={styles.workoutCardContainer}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setPreviewWorkout(item)}
            >
                <GlassCard style={[styles.workoutCardElite, item.completed && styles.workoutCompletedElite]}>
                    <View style={styles.workoutImageWrapper}>
                        <Image source={{ uri: item.image }} style={styles.workoutImgElite} />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.7)']}
                            style={styles.workoutImgOverlay}
                        />
                        <View style={styles.categoryTagElite}>
                            <Text style={styles.categoryTagTextElite}>{item.category.toUpperCase()}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.playOverlayBtn}
                            onPress={() => {
                                if (item.completed) {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    return; // Prevent redoing
                                }
                                if (isToday) {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    startWorkout(item, item.completed);
                                    navigation.navigate('WorkoutPlayer');
                                } else {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setPreviewWorkout(item); // Just preview instead
                                }
                            }}
                        >
                            <BlurView intensity={30} tint={isToday ? "light" : "dark"} style={styles.playBlurElite}>
                                <Ionicons
                                    name={isToday ? (item.completed ? "checkmark-done-circle" : "play") : "lock-closed"}
                                    size={isToday ? 24 : 18}
                                    color={COLORS.white}
                                />
                            </BlurView>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.workoutBodyElite}>
                        <View style={styles.workoutHeaderElite}>
                            <Text style={styles.workoutTitleElite} numberOfLines={1}>{item.title}</Text>
                            <View style={[styles.checkCircleElite, item.completed && styles.checkCircleActiveElite]}>
                                <Ionicons
                                    name={item.completed ? "shield-checkmark" : "chevron-forward"}
                                    size={18}
                                    color={item.completed ? COLORS.white : themeColors.accent}
                                />
                            </View>
                        </View>

                        <View style={styles.workoutStatsGridElite}>
                            <View style={styles.miniStatElite}>
                                <Text style={styles.miniStatValElite}>{item.duration.split(' ')[0]}</Text>
                                <Text style={styles.miniStatLabElite}>MINS</Text>
                            </View>
                            <View style={styles.miniStatDivider} />
                            <View style={styles.miniStatElite}>
                                <Text style={styles.miniStatValElite}>{item.kcal}</Text>
                                <Text style={styles.miniStatLabElite}>KCAL</Text>
                            </View>
                            <View style={styles.miniStatDivider} />
                            <View style={styles.miniStatElite}>
                                <Text style={styles.miniStatValElite}>{item.difficulty}</Text>
                                <Text style={styles.miniStatLabElite}>LEVEL</Text>
                            </View>
                        </View>
                    </View>
                </GlassCard>
            </TouchableOpacity>
        </AnimatedCard>
    );

    const PreviewModal = () => (
        <Modal
            visible={!!previewWorkout}
            transparent
            animationType="slide"
            onRequestClose={() => setPreviewWorkout(null)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    {previewWorkout && (
                        <>
                            <View style={styles.modalHero}>
                                <Image source={{ uri: previewWorkout.image }} style={styles.modalImage} />
                                <TouchableOpacity
                                    style={styles.closeBtn}
                                    onPress={() => setPreviewWorkout(null)}
                                >
                                    <BlurView intensity={30} tint="dark" style={styles.closeBlur}>
                                        <Ionicons name="close" size={24} color={COLORS.white} />
                                    </BlurView>
                                </TouchableOpacity>

                                <LinearGradient
                                    colors={['transparent', 'rgba(248, 250, 252, 1)']}
                                    style={styles.modalHeroOverlay}
                                />
                            </View>

                            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                                <View style={styles.modalHeaderInfo}>
                                    <Text style={styles.modalTitle}>{previewWorkout.title}</Text>
                                    <View style={styles.modalBadgeRow}>
                                        <View style={styles.modalCategoryBadge}>
                                            <Text style={styles.modalCategoryText}>{previewWorkout.category}</Text>
                                        </View>
                                        <View style={styles.modalDifficultyBadge}>
                                            <Ionicons name="stats-chart" size={12} color="#10B981" />
                                            <Text style={styles.modalDifficultyText}>{previewWorkout.difficulty}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.modalStatsGrid}>
                                    <View style={styles.modalStatCard}>
                                        <Ionicons name="time" size={20} color="#10B981" />
                                        <Text style={styles.modalStatNum}>{previewWorkout.duration}</Text>
                                        <Text style={styles.modalStatLabel}>Time</Text>
                                    </View>
                                    <View style={styles.modalStatCard}>
                                        <Ionicons name="flame" size={20} color="#FF6B6B" />
                                        <Text style={styles.modalStatNum}>{previewWorkout.kcal}</Text>
                                        <Text style={styles.modalStatLabel}>Burn</Text>
                                    </View>
                                    <View style={styles.modalStatCard}>
                                        <Ionicons name="flash" size={20} color="#10B981" />
                                        <Text style={styles.modalStatNum}>{previewWorkout.intensity || 7}</Text>
                                        <Text style={styles.modalStatLabel}>Intensity</Text>
                                    </View>
                                </View>

                                <Text style={styles.modalSectionTitle}>AI Rationale</Text>
                                <View style={styles.rationaleCard}>
                                    <Ionicons name="bulb" size={20} color="#10B981" style={{ marginRight: 15 }} />
                                    <Text style={styles.rationaleText}>{previewWorkout.rationale}</Text>
                                </View>

                                <Text style={styles.modalSectionTitle}>Targeted Muscles</Text>
                                <View style={styles.musclePills}>
                                    {(previewWorkout.muscles || ['Full Body']).map((m, i) => (
                                        <View key={i} style={styles.musclePill}>
                                            <Text style={styles.musclePillText}>{m}</Text>
                                        </View>
                                    ))}
                                </View>

                                <Text style={styles.modalSectionTitle}>Workout Circuit</Text>
                                <View style={styles.circuitList}>
                                    {(previewWorkout.exercises || []).map((ex, i) => (
                                        <View key={i} style={styles.circuitItem}>
                                            <View style={styles.circuitNumber}>
                                                <Text style={styles.circuitNumberText}>{i + 1}</Text>
                                            </View>
                                            <View style={styles.circuitInfo}>
                                                <Text style={styles.circuitName}>{ex.name}</Text>
                                                <Text style={styles.circuitDetails}>{ex.sets} sets • {ex.reps} reps</Text>
                                            </View>
                                            <View style={styles.restChip}>
                                                <Ionicons name="refresh" size={10} color="#64748B" />
                                                <Text style={styles.restText}>{ex.rest || '30s'}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                <View style={{ height: 120 }} />
                            </ScrollView>

                            <BlurView intensity={80} tint="light" style={styles.modalFooterElite}>
                                {isToday ? (
                                    <TouchableOpacity
                                        style={[styles.startWorkoutBtnElite, previewWorkout.completed && { opacity: 0.8 }]}
                                        disabled={previewWorkout.completed}
                                        onPress={() => {
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                            startWorkout(previewWorkout, previewWorkout.completed);
                                            setPreviewWorkout(null);
                                            navigation.navigate('WorkoutPlayer');
                                        }}
                                    >
                                        <LinearGradient
                                            colors={previewWorkout.completed ? ['#64748B', '#475569'] : themeColors.gradient}
                                            style={styles.btnGradientElite}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            <Text style={styles.btnTextElite}>
                                                {previewWorkout.completed ? 'SESSION COMPLETED' : 'BEGIN SESSION'}
                                            </Text>
                                            <Ionicons
                                                name={previewWorkout.completed ? "checkmark-circle" : "play-circle"}
                                                size={24}
                                                color={COLORS.white}
                                            />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={[styles.startWorkoutBtnElite, { opacity: 0.5 }]}>
                                        <LinearGradient
                                            colors={['#64748B', '#475569']}
                                            style={styles.btnGradientElite}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            <Text style={styles.btnTextElite}>VIEW ONLY (LOCKED)</Text>
                                            <Ionicons name="lock-closed" size={20} color={COLORS.white} />
                                        </LinearGradient>
                                    </View>
                                )}
                            </BlurView>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );

    // History modal rendered as inline JSX (not a sub-component) to avoid remount issues

    if (generating) {
        return (
            <AuraBackground style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={themeColors.accent} />
                <Text style={{ marginTop: 20, color: '#475569', fontWeight: 'bold' }}>Generating your custom AI plan...</Text>
            </AuraBackground>
        );
    }

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={themeColors.accent} />
            </View>
        );
    }

    if (!workouts || workouts.length === 0) {
        return (
            <AuraBackground style={styles.container}>
                {renderHeader()}
                <View style={styles.emptyPlanContainer}>
                    <BlurView intensity={40} tint="light" style={styles.emptyPlanCard}>
                        <View style={styles.emptyPlanIconCircle}>
                            <Ionicons name="barbell" size={40} color={themeColors.accent} />
                        </View>
                        <Text style={styles.emptyPlanTitle}>GENERATE WORKOUT PLAN</Text>
                        
                        {user?.injuries && user.injuries !== 'none' ? (
                            !hasRecoveryPlan ? (
                                <>
                                    <Text style={styles.emptyPlanSubtitle}>
                                        You registered an active injury ({user.injuries.replace(/_/g, ' ')}).
                                        To ensure your safety, you must complete your AI Body Recovery assessment before we can compile your workout plan.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => {
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                            navigation.navigate('BodyRecovery');
                                        }}
                                    >
                                        <LinearGradient colors={themeColors.gradient} style={styles.actionBtnGrad}>
                                            <Text style={styles.actionBtnText}>START BODY RECOVERY</Text>
                                            <Ionicons name="heart-half" size={16} color="#FFF" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.emptyPlanSubtitle}>
                                        Your recovery assessment is complete! Click below to compile your sports-science workout plan tailored to your profile and restrictions.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={handleGenerateWorkout}
                                    >
                                        <LinearGradient colors={themeColors.gradient} style={styles.actionBtnGrad}>
                                            <Text style={styles.actionBtnText}>GENERATE WORKOUT PLAN</Text>
                                            <Ionicons name="sparkles" size={16} color="#FFF" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </>
                            )
                        ) : (
                            <>
                                <Text style={styles.emptyPlanSubtitle}>
                                    Generate your personalized AI-powered workout plan based on your onboarding preferences.
                                </Text>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleGenerateWorkout}
                                >
                                    <LinearGradient colors={themeColors.gradient} style={styles.actionBtnGrad}>
                                        <Text style={styles.actionBtnText}>GENERATE WORKOUT PLAN</Text>
                                        <Ionicons name="sparkles" size={16} color="#FFF" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}
                    </BlurView>
                </View>
                <Modal
                    visible={showHistoryModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowHistoryModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={[styles.modalContent, { backgroundColor: COLORS.surface, paddingTop: 20 }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 }}>
                                <View>
                                    <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>30-Day History</Text>
                                    <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>Your recent workout log</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={{ padding: 8, backgroundColor: 'rgba(15,23,42,0.05)', borderRadius: 20 }}>
                                    <Ionicons name="close" size={20} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>
                            {loadingHistory ? (
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                    <ActivityIndicator size="large" color={themeColors.accent} />
                                </View>
                            ) : (
                                <FlatList
                                    data={history30Days}
                                    keyExtractor={(item, index) => index.toString()}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                                    renderItem={({ item }) => {
                                        const isRest = item.type === 'rest';
                                        const isNone = item.type === 'none';
                                        const isCompleted = !isRest && !isNone && item.completed;
                                        const isMissed = !isRest && !isNone && !item.completed;
                                        let iconName = 'barbell-outline', iconColor = COLORS.textSecondary, bgColor = 'rgba(15,23,42,0.03)', statusText = 'Missed';
                                        if (isRest) { iconName = 'cafe-outline'; iconColor = '#8B5CF6'; bgColor = 'rgba(139,92,246,0.1)'; statusText = 'Rest Day'; }
                                        else if (isNone) { iconName = 'calendar-outline'; iconColor = '#94A3B8'; bgColor = 'rgba(148,163,184,0.1)'; statusText = 'No Plan'; }
                                        else if (isCompleted) { iconName = 'checkmark-circle'; iconColor = '#10B981'; bgColor = 'rgba(16,185,129,0.1)'; statusText = 'Logged'; }
                                        else if (isMissed) { iconName = 'close-circle'; iconColor = '#EF4444'; bgColor = 'rgba(239,68,68,0.1)'; statusText = 'Missed'; }
                                        return (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 16, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)' }}>
                                                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                                                    <Ionicons name={iconName} size={20} color={iconColor} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 3 }}>{item.title}</Text>
                                                    <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' }}>{item.day}, {item.date}</Text>
                                                </View>
                                                <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: bgColor }}>
                                                    <Text style={{ fontSize: 11, fontWeight: '900', color: iconColor }}>{statusText.toUpperCase()}</Text>
                                                </View>
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
    }

    return (
        <AuraBackground style={styles.container}>
            {renderHeader()}

            <FlatList
                data={filteredWorkouts}
                keyExtractor={(item) => item.id}
                renderItem={renderWorkoutCard}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.accent]} />
                }
                ListHeaderComponent={() => (
                    <View style={styles.listHeaderElite}>
                        {renderPremiumDashboard()}
                        <View style={styles.sectionHeaderElite}>
                            <Text style={styles.sectionTitleElite}>{selectedDay}'s Lineup</Text>
                            <View style={styles.sectionLine} />
                        </View>
                    </View>
                )}
                contentContainerStyle={styles.scrollPadding}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainerElite}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons name="calendar" size={40} color="#94A3B8" />
                        </View>
                        <Text style={styles.emptyTextElite}>Rest Day Scheduled</Text>
                        <Text style={styles.emptySubtextElite}>No workouts for {selectedDay}. Enjoy your recovery!</Text>
                        <TouchableOpacity
                            style={styles.generateBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onRefresh();
                            }}
                        >
                            <Text style={styles.generateBtnText}>RE-SYNC PLAN</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />

            <PreviewModal />
            <Modal
                visible={showHistoryModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowHistoryModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, { backgroundColor: COLORS.surface, paddingTop: 20 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 }}>
                            <View>
                                <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>30-Day History</Text>
                                <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>Your recent workout log</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={{ padding: 8, backgroundColor: 'rgba(15,23,42,0.05)', borderRadius: 20 }}>
                                <Ionicons name="close" size={20} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                        {loadingHistory ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={themeColors.accent} />
                            </View>
                        ) : (
                            <FlatList
                                data={history30Days}
                                keyExtractor={(item, index) => index.toString()}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                                renderItem={({ item }) => {
                                    const isRest = item.type === 'rest';
                                    const isNone = item.type === 'none';
                                    const isCompleted = !isRest && !isNone && item.completed;
                                    const isMissed = !isRest && !isNone && !item.completed;
                                    let iconName = 'barbell-outline', iconColor = COLORS.textSecondary, bgColor = 'rgba(15,23,42,0.03)', statusText = 'Missed';
                                    if (isRest) { iconName = 'cafe-outline'; iconColor = '#8B5CF6'; bgColor = 'rgba(139,92,246,0.1)'; statusText = 'Rest Day'; }
                                    else if (isNone) { iconName = 'calendar-outline'; iconColor = '#94A3B8'; bgColor = 'rgba(148,163,184,0.1)'; statusText = 'No Plan'; }
                                    else if (isCompleted) { iconName = 'checkmark-circle'; iconColor = '#10B981'; bgColor = 'rgba(16,185,129,0.1)'; statusText = 'Logged'; }
                                    else if (isMissed) { iconName = 'close-circle'; iconColor = '#EF4444'; bgColor = 'rgba(239,68,68,0.1)'; statusText = 'Missed'; }
                                    return (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 16, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)' }}>
                                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                                                <Ionicons name={iconName} size={20} color={iconColor} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 3 }}>{item.title}</Text>
                                                <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' }}>{item.day}, {item.date}</Text>
                                            </View>
                                            <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: bgColor }}>
                                                <Text style={{ fontSize: 11, fontWeight: '900', color: iconColor }}>{statusText.toUpperCase()}</Text>
                                            </View>
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
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerStack: {
        height: 175,
        position: 'relative',
        zIndex: 10,
        overflow: 'visible',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    floatingIcon: {
        position: 'absolute',
        zIndex: 1,
    },
    headerSafe: {
        flex: 1,
        paddingHorizontal: 20,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    headerSpacer: {
        width: 44,
    },
    titleStack: {
        alignItems: 'center',
    },
    eliteTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    eliteSubtitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 2,
        marginTop: 2,
    },
    aiButtonElite: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
    },
    backBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    daySelectorElite: {
        marginTop: 15,
    },
    daySelectorContentElite: {
        paddingRight: 20,
        paddingBottom: 2,
    },
    dayPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 10,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        minWidth: 55,
        height: 44,
        justifyContent: 'center',
    },
    dayPillActive: {
        backgroundColor: COLORS.surface,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    dayPillText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.8)',
    },
    dayPillTextActive: {
        color: '#064E3B',
    },
    todayLabel: {
        fontSize: 7,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        marginTop: 1,
        letterSpacing: 0.5,
    },
    todayLabelActive: {
        color: '#10B981',
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#10B981',
        marginTop: 4,
    },
    premiumDashboard: {
        marginTop: 10,
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 30,
        backgroundColor: COLORS.surface,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    dashboardGrid: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mainRingSection: {
        width: 130,
        height: 130,
        justifyContent: 'center',
        alignItems: 'center',
    },
    outerRing: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        overflow: 'hidden',
        backgroundColor: '#F1F5F9',
        justifyContent: 'flex-end',
    },
    ringBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringProgress: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        opacity: 0.3,
    },
    ringContent: {
        alignItems: 'center',
    },
    remainingValElite: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0F172A',
        lineHeight: 36,
    },
    totalDividerElite: {
        width: 40,
        height: 2,
        backgroundColor: '#E2E8F0',
        marginVertical: 4,
    },
    remainingLabElite: {
        fontSize: 16,
        fontWeight: '800',
        color: '#64748B',
    },
    ringSubtextElite: {
        fontSize: 8,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
        marginTop: 2,
    },
    macroListElite: {
        flex: 1,
        paddingLeft: 24,
        gap: 15,
    },
    macroRowElite: {
        gap: 6,
    },
    macroLabelRowElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metricLabelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    macroLabElite: {
        fontSize: 9,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    macroPercElite: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    macroBarElite: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    macroBarFillElite: {
        height: '100%',
        borderRadius: 3,
    },
    macroValElite: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0F172A',
    },
    macroSubElite: {
        fontSize: 9,
        fontWeight: 'normal',
        color: '#94A3B8',
    },
    aiEliteBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 25,
        padding: 14,
        borderRadius: 20,
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        overflow: 'hidden',
    },
    aiEliteIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    aiEliteMsg: {
        flex: 1,
        fontSize: 11,
        color: '#065F46',
        fontWeight: '600',
        lineHeight: 16,
    },
    listHeaderElite: {
        paddingBottom: 20,
    },
    sectionHeaderElite: {
        marginTop: 30,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 15,
    },
    sectionTitleElite: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    scrollPadding: {
        paddingBottom: 100,
    },
    workoutCardContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    workoutCardElite: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 28,
        backgroundColor: COLORS.surface,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    workoutCompletedElite: {
        opacity: 0.6,
        transform: [{ scale: 0.98 }],
    },
    workoutImageWrapper: {
        width: 100,
        height: 100,
        borderRadius: 22,
        overflow: 'hidden',
    },
    workoutImgElite: {
        width: '100%',
        height: '100%',
    },
    workoutImgOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    categoryTagElite: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    categoryTagTextElite: {
        fontSize: 8,
        fontWeight: '900',
        color: COLORS.white,
    },
    playOverlayBtn: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -18,
        marginLeft: -18,
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
    },
    playBlurElite: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    workoutBodyElite: {
        flex: 1,
        marginLeft: 18,
        justifyContent: 'center',
    },
    workoutHeaderElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    workoutTitleElite: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#0F172A',
        flex: 1,
        marginRight: 10,
    },
    checkCircleElite: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    checkCircleActiveElite: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    workoutStatsGridElite: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.background,
        padding: 8,
        borderRadius: 12,
    },
    miniStatElite: {
        alignItems: 'center',
    },
    miniStatValElite: {
        fontSize: 11,
        fontWeight: '800',
        color: '#334155',
    },
    miniStatLabElite: {
        fontSize: 7,
        fontWeight: '900',
        color: '#94A3B8',
        marginTop: 1,
    },
    miniStatDivider: {
        width: 1,
        height: 12,
        backgroundColor: '#E2E8F0',
    },
    emptyContainerElite: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTextElite: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 8,
    },
    emptySubtextElite: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    generateBtn: {
        marginTop: 25,
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 15,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    generateBtnText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 1,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.background,
        height: '92%',
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        overflow: 'hidden',
    },
    modalHero: {
        height: 320,
        position: 'relative',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
    modalHeroOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    closeBtn: {
        position: 'absolute',
        top: 25,
        right: 25,
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    closeBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScroll: {
        paddingHorizontal: 25,
    },
    modalHeaderInfo: {
        marginTop: -10,
        marginBottom: 30,
    },
    modalTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 12,
    },
    modalBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalCategoryBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    modalCategoryText: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    modalDifficultyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    modalDifficultyText: {
        color: '#10B981',
        fontSize: 11,
        fontWeight: 'bold',
    },
    modalStatsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 35,
    },
    modalStatCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        padding: 15,
        borderRadius: 24,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    modalStatNum: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 8,
    },
    modalStatLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94A3B8',
        marginTop: 2,
        textTransform: 'uppercase',
    },
    modalSectionTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 15,
        letterSpacing: -0.5,
    },
    musclePills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 35,
    },
    musclePill: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    musclePillText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
    },
    circuitList: {
        gap: 15,
        marginBottom: 40,
    },
    circuitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    circuitNumber: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    circuitNumberText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#10B981',
    },
    circuitInfo: {
        flex: 1,
    },
    circuitName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 2,
    },
    circuitDetails: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
    },
    restChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    restText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748B',
    },
    modalFooterElite: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 25,
        paddingTop: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    startWorkoutBtnElite: {
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    btnGradientElite: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    btnTextElite: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
    emptyPlanContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 25,
        alignItems: 'center',
    },
    emptyPlanCard: {
        width: '100%',
        borderRadius: 30,
        padding: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        alignItems: 'center',
    },
    emptyPlanIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    emptyPlanTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 1,
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyPlanSubtitle: {
        fontSize: 13,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 25,
        fontWeight: '500',
    },
    actionButton: {
        width: '100%',
        height: 54,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    actionBtnGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default WorkoutPlanScreen;
