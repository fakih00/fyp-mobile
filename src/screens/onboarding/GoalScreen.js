import React, { useState, useRef, useEffect, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
    Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/Theme';
import { StatusBar } from 'expo-status-bar';
import { AppContext } from '../../context/AppContext';
import { AuraBackground } from '../../components';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 72) / 2; // 2 columns with padding of 30 on each side and 12 gap

// ─── Goal Definitions ───────────────────────────────────────────────────────
const GOALS = [
    // ── General ─────────────────────────────────────────
    {
        id: 'lose_weight',
        title: 'Fat Burn',
        desc: 'Thermogenesis & accelerated fat loss',
        icon: 'flame',
        emoji: '🔥',
        gradient: ['#F97316', '#EF4444'],
        category: 'general',
        badge: 'POPULAR',
    },
    {
        id: 'build_muscle',
        title: 'Hypertrophy',
        desc: 'Engineered mass gain & peak strength',
        icon: 'barbell',
        emoji: '💪',
        gradient: ['#8B5CF6', '#6D28D9'],
        category: 'general',
        badge: 'TOP PICK',
    },
    {
        id: 'keep_fit',
        title: 'Stay Fit',
        desc: 'Peak physiological maintenance',
        icon: 'heart',
        emoji: '❤️',
        gradient: ['#EC4899', '#BE185D'],
        category: 'general',
        badge: null,
    },
    {
        id: 'gain_weight',
        title: 'Power Bulk',
        desc: 'High-density caloric surplus & recovery',
        icon: 'nutrition',
        emoji: '🥩',
        gradient: ['#10B981', '#065F46'],
        category: 'general',
        badge: null,
    },

    // ── Sport-Specific ───────────────────────────────────
    {
        id: 'running',
        title: "Runner's Edge",
        desc: 'VO₂max, tempo runs & race conditioning',
        icon: 'walk',
        emoji: '🏃',
        gradient: ['#06B6D4', '#0284C7'],
        category: 'sport',
        badge: 'SPORT',
    },
    {
        id: 'boxing',
        title: 'Combat Athlete',
        desc: 'Explosive power, footwork & fight conditioning',
        icon: 'hand-left',
        emoji: '🥊',
        gradient: ['#EF4444', '#991B1B'],
        category: 'sport',
        badge: 'SPORT',
    },
    {
        id: 'swimming',
        title: 'Aqua Elite',
        desc: 'Dryland strength, pull power & swim drills',
        icon: 'water',
        emoji: '🏊',
        gradient: ['#0EA5E9', '#0369A1'],
        category: 'sport',
        badge: 'SPORT',
    },
    {
        id: 'cycling',
        title: 'Pedal Power',
        desc: 'Cycling endurance, cadence & hill strength',
        icon: 'bicycle',
        emoji: '🚴',
        gradient: ['#F59E0B', '#B45309'],
        category: 'sport',
        badge: 'SPORT',
    },
    {
        id: 'martial_arts',
        title: 'Martial Arts',
        desc: 'Agility, flexibility & combat conditioning',
        icon: 'body',
        emoji: '🥋',
        gradient: ['#6366F1', '#4338CA'],
        category: 'sport',
        badge: 'SPORT',
    },
    {
        id: 'yoga_flexibility',
        title: 'Flex & Flow',
        desc: 'Mobility, yoga practice & deep recovery',
        icon: 'leaf',
        emoji: '🧘',
        gradient: ['#14B8A6', '#0F766E'],
        category: 'sport',
        badge: 'SPORT',
    },
];

// ─── Animated Goal Card ──────────────────────────────────────────────────────
const GoalCard = ({ goal, selected, onPress, delay }) => {
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const { colors } = useContext(AppContext);
    const isDark = colors.isDark;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const selectAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 400,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                delay,
                friction: 8,
                tension: 80,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    useEffect(() => {
        Animated.spring(selectAnim, {
            toValue: selected ? 1 : 0,
            friction: 6,
            tension: 100,
            useNativeDriver: false,
        }).start();

        if (selected) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        }
    }, [selected]);

    const borderColor = selectAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
            isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
            isDark ? 'rgba(255,255,255,0.9)' : colors.primary
        ],
    });

    const cardScale = Animated.multiply(scaleAnim, pulseAnim);

    return (
        <Animated.View style={[
            styles.cardWrapper,
            { opacity: opacityAnim, transform: [{ scale: cardScale }] }
        ]}>
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={onPress}
                style={styles.cardTouchable}
            >
                <Animated.View style={[styles.cardBorder, { borderColor }]}>
                    <LinearGradient
                        colors={selected ? goal.gradient : (isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F1F5F9'])}
                        style={styles.cardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {/* Badge */}
                        {goal.badge && (
                            <View style={[
                                styles.badge,
                                !selected && { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)' }
                            ]}>
                                <Text style={[
                                    styles.badgeText,
                                    !selected && { color: isDark ? '#fff' : '#64748B' }
                                ]}>{goal.badge}</Text>
                            </View>
                        )}

                        {/* Icon Circle */}
                        <View style={[
                            styles.iconCircle,
                            selected ? { backgroundColor: 'rgba(255,255,255,0.25)' } : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }
                        ]}>
                            <Text style={styles.emoji}>{goal.emoji}</Text>
                        </View>

                        {/* Text */}
                        <Text style={[
                            styles.cardTitle,
                            selected ? { color: '#fff' } : { color: isDark ? 'rgba(255,255,255,0.95)' : '#1E293B' }
                        ]}>
                            {goal.title}
                        </Text>
                        <Text style={[
                            styles.cardDesc,
                            selected ? { color: 'rgba(255,255,255,0.85)' } : { color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }
                        ]}>
                            {goal.desc}
                        </Text>

                        {/* Selected Check */}
                        {selected && (
                            <View style={styles.checkBadge}>
                                <Ionicons name="checkmark" size={12} color="#fff" />
                            </View>
                        )}
                    </LinearGradient>
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const GoalScreen = ({ navigation, route }) => {
    const { userData } = route.params || {};
    const [selectedGoal, setSelectedGoal] = useState(null);
    const { colors } = useContext(AppContext);
    const isDark = colors.isDark;

    const headerAnim = useRef(new Animated.Value(0)).current;
    const footerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.stagger(100, [
            Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
            Animated.spring(footerAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleSelect = (goalId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedGoal(goalId);
    };

    const handleNext = () => {
        if (!selectedGoal) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        navigation.navigate('TrainingPreference', {
            userData: { ...userData, goal: selectedGoal }
        });
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.goBack();
    };

    const selectedGoalObj = GOALS.find(g => g.id === selectedGoal);

    const generalGoals = GOALS.filter(g => g.category === 'general');
    const sportGoals   = GOALS.filter(g => g.category === 'sport');

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient colors={['#F8FAFC', '#ECFDF5']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <Animated.View style={[styles.header, {
                    opacity: headerAnim,
                    transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-20, 0] }) }]
                }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                        <BlurView intensity={40} tint="light" style={styles.backBlur}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                        </BlurView>
                    </TouchableOpacity>

                    {/* Progress Bar */}
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: '60%' }]} />
                    </View>
                    <Text style={styles.progressLabel}>3 / 5</Text>
                </Animated.View>

                {/* Title */}
                <Animated.View style={[styles.titleSection, {
                    opacity: headerAnim,
                    transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [20, 0] }) }]
                }]}>
                    <View style={styles.titleBadge}>
                        <Ionicons name="trophy" size={14} color="#10B981" />
                        <Text style={styles.titleBadgeText}>SELECT YOUR OBJECTIVE</Text>
                    </View>
                    <Text style={styles.title}>What's your{'\n'}primary goal?</Text>
                    <Text style={styles.subtitle}>
                        Your AI coach will build a fully personalized plan around this.
                    </Text>
                </Animated.View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    bounces={true}
                >
                    {/* General Goals */}
                    <View style={styles.categoryHeader}>
                        <View style={styles.categoryLine} />
                        <Text style={styles.categoryLabel}>GENERAL</Text>
                        <View style={styles.categoryLine} />
                    </View>

                    <View style={styles.grid}>
                        {generalGoals.map((goal, index) => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                selected={selectedGoal === goal.id}
                                onPress={() => handleSelect(goal.id)}
                                delay={index * 60}
                            />
                        ))}
                    </View>

                    {/* Sport Goals */}
                    <View style={[styles.categoryHeader, { marginTop: 12 }]}>
                        <View style={styles.categoryLine} />
                        <Text style={styles.categoryLabel}>SPORT-SPECIFIC</Text>
                        <View style={styles.categoryLine} />
                    </View>

                    <View style={styles.grid}>
                        {sportGoals.map((goal, index) => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                selected={selectedGoal === goal.id}
                                onPress={() => handleSelect(goal.id)}
                                delay={240 + index * 60}
                            />
                        ))}
                    </View>

                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Footer CTA */}
                <Animated.View style={[styles.footer, {
                    opacity: footerAnim,
                    transform: [{ translateY: footerAnim.interpolate({ inputRange: [0,1], outputRange: [60, 0] }) }]
                }]}>
                    <BlurView intensity={40} tint="light" style={styles.footerBlur}>
                        {selectedGoalObj ? (
                            <View style={styles.selectedInfo}>
                                <Text style={styles.selectedEmoji}>{selectedGoalObj.emoji}</Text>
                                <View>
                                    <Text style={styles.selectedLabel}>Selected goal</Text>
                                    <Text style={styles.selectedTitle}>{selectedGoalObj.title}</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.selectedInfo}>
                                <Text style={styles.selectedEmoji}>🎯</Text>
                                <View>
                                    <Text style={styles.selectedLabel}>Choose target</Text>
                                    <Text style={styles.selectedTitle}>Select objective</Text>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.nextBtn, !selectedGoal && styles.disabledBtn]}
                            onPress={handleNext}
                            disabled={!selectedGoal}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.nextGrad}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.nextText}>
                                    CONTINUE
                                </Text>
                                <Ionicons name="arrow-forward" size={18} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </BlurView>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    safeArea: {
        flex: 1,
    },
    orb: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
        marginTop: 10,
        marginBottom: 30,
    },
    backBtn: {
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
    progressTrack: {
        flex: 1,
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        marginLeft: 25,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 3,
    },
    progressLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 1,
        marginLeft: 12,
    },

    // Title Section
    titleSection: {
        alignItems: 'center',
        paddingHorizontal: 30,
        marginBottom: 30,
    },
    titleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
    },
    titleBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 2,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
        textAlign: 'center',
        lineHeight: 32,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },

    // Scroll
    scrollContent: {
        paddingHorizontal: 30,
        paddingTop: 4,
    },

    // Category Headers
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    categoryLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    categoryLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 2,
    },

    // Grid
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
        marginBottom: 8,
    },

    // Goal Card
    cardWrapper: {
        width: CARD_WIDTH,
    },
    cardTouchable: {
        flex: 1,
    },
    cardBorder: {
        borderRadius: 24,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    cardGradient: {
        padding: 16,
        paddingBottom: 18,
        minHeight: 155,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#10B981',
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    badgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    emoji: {
        fontSize: 26,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.3,
        marginBottom: 5,
    },
    cardDesc: {
        fontSize: 11,
        lineHeight: 16,
    },
    checkBadge: {
        position: 'absolute',
        bottom: 14,
        right: 14,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    footerBlur: {
        paddingHorizontal: 30,
        paddingTop: 16,
        paddingBottom: 32,
        gap: 14,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    selectedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectedEmoji: {
        fontSize: 28,
    },
    selectedLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    selectedTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0F172A',
        marginTop: 2,
    },
    nextBtn: {
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
    },
    disabledBtn: {
        opacity: 0.3,
    },
    nextGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    nextText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1.5,
    },
});

export default GoalScreen;
