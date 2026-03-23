import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
    Dimensions,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { AnimatedCard, GlassCard, PrimaryButton } from '../components';

const { width, height } = Dimensions.get('window');
const EMERALD = '#10B981';

const WorkoutPlayerScreen = ({ navigation }) => {
    const { activeWorkout, completeWorkout, toggleExercise } = useContext(AppContext);
    const [seconds, setSeconds] = useState(0);
    const [showCelebration, setShowCelebration] = useState(false);
    const [showGuide, setShowGuide] = useState(null);

    useEffect(() => {
        if (!activeWorkout) {
            navigation.goBack();
            return;
        }
        const interval = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [activeWorkout]);

    const formatTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFinish = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowCelebration(true);
    };

    const handleConfirmFinish = () => {
        const sessionData = {
            title: activeWorkout.title,
            duration: formatTime(seconds),
            kcal: activeWorkout.kcal
        };

        // Optimistic navigation and state update
        completeWorkout(sessionData);

        // Use a more robust navigation method
        navigation.navigate('Main', {
            screen: 'Workout',
            params: { refresh: true } // Trigger potential update
        });
    };

    const handleToggleExercise = (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        toggleExercise(id);
    };

    if (!activeWorkout) return null;

    const currentEx = activeWorkout.exercises.find(ex => !activeWorkout.completedExercises.includes(ex.id)) || activeWorkout.exercises[0];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F8FAFC', '#ECFDF5']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                        <BlurView intensity={40} tint="light" style={styles.circleBlur}>
                            <Ionicons name="chevron-down" size={24} color={COLORS.text} />
                        </BlurView>
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>SESSION IN PROGRESS</Text>
                        </View>
                        <Text style={styles.headerTitle}>{activeWorkout.title}</Text>
                    </View>
                    <TouchableOpacity style={styles.closeBtn}>
                        <BlurView intensity={40} tint="light" style={styles.circleBlur}>
                            <Ionicons name="options-outline" size={20} color={COLORS.text} />
                        </BlurView>
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Timer Section */}
                    <View style={styles.timerContainer}>
                        <LinearGradient
                            colors={['rgba(16, 185, 129, 0.1)', 'transparent']}
                            style={styles.glowCircle}
                        />
                        <View style={styles.mainTimerWrapper}>
                            <LinearGradient
                                colors={['#10B981', '#34D399']}
                                style={styles.timerBorder}
                            >
                                <View style={styles.timerInner}>
                                    <Text style={styles.timerValue}>{formatTime(seconds)}</Text>
                                    <Text style={styles.timerLabel}>ELAPSED TIME</Text>
                                </View>
                            </LinearGradient>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{activeWorkout.kcal}</Text>
                                <Text style={styles.statLabel}>KCAL</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>+250</Text>
                                <Text style={styles.statLabel}>XP</Text>
                            </View>
                        </View>
                    </View>

                    {/* Current Exercise Focus */}
                    <AnimatedCard delay={100} style={styles.focusContainer}>
                        <View style={styles.focusHeader}>
                            <View style={styles.focusPill}>
                                <Text style={styles.focusPillText}>NEXT SET</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowGuide(currentEx)} style={styles.infoBtn}>
                                <Ionicons name="information-circle-outline" size={24} color={EMERALD} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.focusTitle}>{currentEx.name}</Text>

                        <View style={styles.focusMetrics}>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricValue}>{currentEx.sets}</Text>
                                <Text style={styles.metricLabel}>SETS</Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricValue}>{currentEx.reps}</Text>
                                <Text style={styles.metricLabel}>REPS</Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricValue}>{currentEx.rest}</Text>
                                <Text style={styles.metricLabel}>REST</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.doneBtn}
                            onPress={() => handleToggleExercise(currentEx.id)}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.doneGrad}
                            >
                                <Ionicons name="checkmark-done" size={22} color={COLORS.white} />
                                <Text style={styles.doneText}>MARK AS COMPLETED</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </AnimatedCard>

                    {/* Exercise List */}
                    <View style={styles.listSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>WORKOUT PROGRAM</Text>
                            <Text style={styles.progressText}>
                                {activeWorkout.completedExercises.length} / {activeWorkout.exercises.length}
                            </Text>
                        </View>

                        {activeWorkout.exercises.map((exercise, index) => {
                            const isDone = activeWorkout.completedExercises.includes(exercise.id);
                            return (
                                <TouchableOpacity
                                    key={exercise.id}
                                    activeOpacity={0.8}
                                    onPress={() => handleToggleExercise(exercise.id)}
                                >
                                    <View style={[styles.exerciseCard, isDone && styles.exerciseDone]}>
                                        <View style={styles.cardMain}>
                                            <View style={[styles.checkRing, isDone && styles.checkRingDone]}>
                                                {isDone && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                                            </View>
                                            <View style={styles.exInfo}>
                                                <Text style={[styles.exTitle, isDone && styles.exTitleDone]}>{exercise.name}</Text>
                                                <Text style={styles.exMeta}>{exercise.sets} Sets • {exercise.reps} Reps</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => setShowGuide(exercise)} style={styles.miniInfo}>
                                                <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* Footer Action */}
                <BlurView intensity={80} tint="light" style={styles.footer}>
                    <TouchableOpacity
                        style={styles.finishBtn}
                        onPress={handleFinish}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.finishGrad}
                        >
                            <Text style={styles.finishBtnText}>FINISH WORKOUT</Text>
                            <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
                        </LinearGradient>
                    </TouchableOpacity>
                </BlurView>
            </SafeAreaView>

            {/* Guides Modal */}
            <Modal visible={!!showGuide} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowGuide(null)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{showGuide?.name}</Text>
                            <TouchableOpacity onPress={() => setShowGuide(null)} style={styles.modalClose}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                            <View style={styles.guideBlock}>
                                <Text style={styles.blockLabel}>COACH'S GUIDE</Text>
                                <Text style={styles.blockText}>{showGuide?.guide}</Text>
                            </View>
                            <View style={styles.tipBlock}>
                                <LinearGradient
                                    colors={['rgba(16, 185, 129, 0.05)', 'transparent']}
                                    style={styles.tipGrad}
                                />
                                <Ionicons name="bulb-outline" size={24} color={EMERALD} />
                                <Text style={styles.tipText}>Maintain strict form and control the negative portion of the movement.</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalBtn}
                                onPress={() => setShowGuide(null)}
                            >
                                <Text style={styles.modalBtnText}>CONFIRMED</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Celebration Overlay */}
            <Modal visible={showCelebration} transparent animationType="fade">
                <View style={styles.celebOverlay}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <AnimatedCard delay={100} style={styles.celebContent}>
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.celebIconBox}
                        >
                            <Ionicons name="trophy-outline" size={50} color={COLORS.white} />
                        </LinearGradient>

                        <Text style={styles.celebTitle}>SESSION ENDED!</Text>
                        <Text style={styles.celebSubtitle}>Outstanding performance today. Your progress is showing.</Text>

                        <View style={styles.celebMetrics}>
                            <View style={styles.celebMetric}>
                                <Text style={styles.celebVal}>{formatTime(seconds)}</Text>
                                <Text style={styles.celebLab}>TOTAL TIME</Text>
                            </View>
                            <View style={styles.celebDivider} />
                            <View style={styles.celebMetric}>
                                <Text style={styles.celebVal}>+250</Text>
                                <Text style={styles.celebLab}>EARNED XP</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.claimBtn}
                            onPress={handleConfirmFinish}
                        >
                            <LinearGradient
                                colors={['#0F172A', '#1E293B']}
                                style={styles.claimGrad}
                            >
                                <Text style={styles.claimText}>COMPLETE SESSION</Text>
                                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </AnimatedCard>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
    },
    circleBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        alignItems: 'center',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 6,
        marginBottom: 4,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: EMERALD,
    },
    liveText: {
        fontSize: 10,
        fontWeight: '900',
        color: EMERALD,
        letterSpacing: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    scrollContent: {
        paddingBottom: 140,
    },
    timerContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    glowCircle: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        top: -30,
    },
    mainTimerWrapper: {
        width: 220,
        height: 220,
        borderRadius: 110,
        padding: 6,
        backgroundColor: 'rgba(255,255,255,0.8)',
        elevation: 10,
        shadowColor: EMERALD,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    timerBorder: {
        flex: 1,
        borderRadius: 104,
        padding: 4,
    },
    timerInner: {
        flex: 1,
        borderRadius: 100,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerValue: {
        fontSize: 52,
        fontWeight: '900',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    timerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.textSecondary,
        letterSpacing: 1.5,
        marginTop: 5,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 35,
        gap: 50,
    },
    statBox: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.textSecondary,
        letterSpacing: 1,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#E2E8F0',
    },
    focusContainer: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        borderRadius: 35,
        padding: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        marginBottom: 40,
    },
    focusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    focusPill: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    focusPillText: {
        fontSize: 11,
        fontWeight: '900',
        color: EMERALD,
        letterSpacing: 1,
    },
    focusTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 25,
        letterSpacing: -0.5,
    },
    focusMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    metricItem: {
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 26,
        fontWeight: '900',
        color: COLORS.text,
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.textSecondary,
        letterSpacing: 1,
        marginTop: 4,
    },
    doneBtn: {
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
    },
    doneGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    doneText: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
    listSection: {
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 20,
        paddingHorizontal: 5,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: COLORS.textSecondary,
        letterSpacing: 1.5,
    },
    progressText: {
        fontSize: 13,
        fontWeight: '900',
        color: EMERALD,
    },
    exerciseCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        marginBottom: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
    },
    exerciseDone: {
        opacity: 0.5,
        backgroundColor: '#F1F5F9',
    },
    cardMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkRing: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    checkRingDone: {
        backgroundColor: EMERALD,
        borderColor: EMERALD,
    },
    exInfo: {
        flex: 1,
    },
    exTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    exTitleDone: {
        textDecorationLine: 'line-through',
        color: COLORS.textSecondary,
    },
    exMeta: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    miniInfo: {
        padding: 5,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
        paddingHorizontal: 25,
        borderTopWidth: 1,
        borderColor: '#E2E8F0',
    },
    finishBtn: {
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
    },
    finishGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
    },
    finishBtnText: {
        fontSize: 17,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-end',
    },
    modalDismiss: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 30,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    modalTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: COLORS.text,
        flex: 1,
        letterSpacing: -0.5,
    },
    modalClose: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScroll: {
        marginBottom: 20,
    },
    guideBlock: {
        marginBottom: 35,
    },
    blockLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: EMERALD,
        letterSpacing: 2,
        marginBottom: 12,
    },
    blockText: {
        fontSize: 17,
        lineHeight: 28,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    tipBlock: {
        padding: 24,
        borderRadius: 25,
        overflow: 'hidden',
        flexDirection: 'row',
        gap: 18,
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
    },
    tipGrad: {
        ...StyleSheet.absoluteFillObject,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        color: '#065F46',
        fontWeight: '700',
        lineHeight: 20,
    },
    modalBtn: {
        marginTop: 40,
        height: 65,
        backgroundColor: '#0F172A',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBtnText: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
    celebOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 25,
    },
    celebContent: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 45,
        padding: 40,
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
    },
    celebIconBox: {
        width: 110,
        height: 110,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    celebTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -1,
    },
    celebSubtitle: {
        textAlign: 'center',
        fontSize: 16,
        color: COLORS.textSecondary,
        marginTop: 12,
        marginBottom: 40,
        lineHeight: 24,
    },
    celebMetrics: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 40,
        marginBottom: 45,
    },
    celebMetric: {
        alignItems: 'center',
    },
    celebVal: {
        fontSize: 26,
        fontWeight: '900',
        color: COLORS.text,
    },
    celebLab: {
        fontSize: 10,
        fontWeight: '900',
        color: EMERALD,
        letterSpacing: 1.5,
        marginTop: 6,
    },
    celebDivider: {
        width: 1,
        height: 45,
        backgroundColor: '#E2E8F0',
    },
    claimBtn: {
        width: '100%',
        height: 70,
        borderRadius: 25,
        overflow: 'hidden',
    },
    claimGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
    },
    claimText: {
        fontSize: 17,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
});

export default WorkoutPlayerScreen;
