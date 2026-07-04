import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated,
    Platform,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Easing,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';

const { width, height } = Dimensions.get('window');

const COMP_TYPES = [
    { type: 'Running', icon: 'walk-outline', color: '#3B82F6', desc: 'Marathon, half-marathon, 10k, trail races' },
    { type: 'Powerlifting', icon: 'barbell-outline', color: '#EF4444', desc: 'Squat, bench press, deadlift meet' },
    { type: 'Bodybuilding', icon: 'body-outline', color: '#F59E0B', desc: 'Physique, classic, hypertrophy show' },
    { type: 'Cycling', icon: 'bicycle-outline', color: '#10B981', desc: 'Road races, time trials, gravel, mountain' },
    { type: 'Swimming', icon: 'water-outline', color: '#06B6D4', desc: 'Open water, pool events, triathlons' },
    { type: 'CrossFit', icon: 'grid-outline', color: '#8B5CF6', desc: 'Local throws, functional fitness events' },
    { type: 'General', icon: 'fitness-outline', color: '#64748B', desc: 'Obstacle courses, team sports prep' }
];

const WEEK_OPTIONS = [4, 8, 12, 16, 24];

const HUD_STEPS = [
    "Compiling athletic profile parameters...",
    "Calculating glycogen replenishment ratios...",
    "Structuring training volume tapering...",
    "Simulating competition day cardiovascular loads...",
    "Integrating macro loading schedules...",
    "Synthesizing periodization cycles..."
];

const STEP_TITLES = [
    'Competition Name',
    'Sport Type',
    'Timeline',
    'Your Goal',
    'Fitness Level'
];

const CompetitionPrepScreen = ({ navigation }) => {
    const { colors: themeColors } = useContext(AppContext);
    const accent = themeColors?.accent || COLORS.primary;

    // UI Phase State: 'loading' | 'idle' | 'form' | 'generating' | 'results'
    const [phase, setPhase] = useState('loading');
    const [plan, setPlan] = useState(null);
    const [activeTab, setActiveTab] = useState('schedule');
    const [completedMilestones, setCompletedMilestones] = useState([]);

    // Questionnaire Form State
    const [currentStep, setCurrentStep] = useState(0);
    const [form, setForm] = useState({
        competition_name: '',
        competition_type: 'Running',
        weeks_duration: 8,
        competition_date: '',
        specific_goal: '',
        fitness_level: 'Intermediate'
    });

    // Animations
    const progressAnim = useRef(new Animated.Value(0)).current;
    const stepSlide = useRef(new Animated.Value(0)).current;
    const idlePulse = useRef(new Animated.Value(1)).current;
    const hudBarAnim = useRef(new Animated.Value(0)).current;
    const headerFade = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef(null);

    // HUD log state
    const [hudIndex, setHudIndex] = useState(0);
    const [hudProgress, setHudProgress] = useState(0);

    // Idle screen pulse animation
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(idlePulse, { toValue: 1.08, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(idlePulse, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // Fade in on mount
    useEffect(() => {
        Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        const d = new Date();
        d.setDate(d.getDate() + 8 * 7);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setForm(prev => ({ ...prev, competition_date: `${yyyy}-${mm}-${dd}` }));
        loadPlan();
    }, []);

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: (currentStep + 1) / 5,
            duration: 400,
            useNativeDriver: false,
            easing: Easing.out(Easing.cubic)
        }).start();
    }, [currentStep]);

    // Step transition animation
    const animateStepChange = (callback) => {
        Animated.sequence([
            Animated.timing(stepSlide, { toValue: -30, duration: 120, useNativeDriver: true }),
            Animated.timing(stepSlide, { toValue: 0, duration: 250, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
        ]).start();
        callback();
    };

    // HUD animation loop
    useEffect(() => {
        let interval;
        if (phase === 'generating') {
            setHudIndex(0);
            setHudProgress(0);
            Animated.timing(hudBarAnim, { toValue: 0, duration: 0, useNativeDriver: false }).start();
            Animated.timing(hudBarAnim, {
                toValue: 1,
                duration: HUD_STEPS.length * 2000,
                useNativeDriver: false,
                easing: Easing.linear
            }).start();
            interval = setInterval(() => {
                setHudIndex(prev => (prev + 1) % HUD_STEPS.length);
                setHudProgress(p => Math.min(p + 16.6, 100));
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [phase]);

    const loadPlan = async () => {
        try {
            const res = await api.getCompetitionPlan();
            if (res.status === 200 && res.data) {
                setPlan(res.data);
                setCompletedMilestones(res.data.completed_milestones || []);
                setPhase('results');
            } else {
                setPhase('idle');
            }
        } catch (e) {
            console.error("Failed to load competition plan:", e);
            setPhase('idle');
        }
    };

    const handleFormSubmit = async () => {
        Keyboard.dismiss();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPhase('generating');
        try {
            const res = await api.generateCompetitionPlan(form);
            if (res.status === 200 && res.data) {
                setPlan(res.data);
                setCompletedMilestones([]);
                setPhase('results');
            } else {
                throw new Error(res.data.message || "Failed to generate plan");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("API Error", e.message || "Could not generate preparation plan.");
            setPhase('idle');
        }
    };

    const handleToggleMilestone = async (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const nextCompleted = completedMilestones.includes(id)
            ? completedMilestones.filter(item => item !== id)
            : [...completedMilestones, id];
        setCompletedMilestones(nextCompleted);
        if (plan?.db_id) {
            try {
                await api.updateCompetitionProgress(plan.db_id, nextCompleted);
            } catch (e) {
                console.error("Failed to update milestone:", e);
            }
        }
    };

    const handleResetPlan = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Warning);
        Alert.alert(
            "Reset Preparation Plan",
            "Delete your current competition roadmap? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        setPlan(null);
                        setCompletedMilestones([]);
                        setCurrentStep(0);
                        setActiveTab('schedule');
                        const d = new Date();
                        d.setDate(d.getDate() + 8 * 7);
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        setForm({
                            competition_name: '',
                            competition_type: 'Running',
                            weeks_duration: 8,
                            competition_date: `${yyyy}-${mm}-${dd}`,
                            specific_goal: '',
                            fitness_level: 'Intermediate'
                        });
                        setPhase('idle');
                    }
                }
            ]
        );
    };

    const getDaysRemaining = () => {
        if (!plan?.competition_date) return 0;
        const target = new Date(plan.competition_date);
        const today = new Date();
        target.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
        return days < 0 ? 0 : days;
    };

    // ─── LOADING ────────────────────────────────────────────────────
    if (phase === 'loading') {
        return (
            <AuraBackground style={styles.loadingContainer}>
                <View style={styles.loadingInner}>
                    <View style={styles.loadingIconRing}>
                        <Ionicons name="trophy" size={36} color={accent} />
                    </View>
                    <ActivityIndicator size="large" color={accent} style={{ marginTop: 20 }} />
                    <Text style={[styles.loadingText, { color: accent }]}>Calibrating Arena...</Text>
                </View>
            </AuraBackground>
        );
    }

    // ─── IDLE ────────────────────────────────────────────────────────
    if (phase === 'idle') {
        return (
            <AuraBackground style={styles.container}>
                <SafeAreaView edges={['top']} style={styles.safeArea}>
                    <Animated.View style={[styles.headerRow, { opacity: headerFade }]}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>COMPETITION PREP</Text>
                        <View style={{ width: 40 }} />
                    </Animated.View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Hero Card */}
                        <GlassCard style={styles.heroCard}>
                            <LinearGradient
                                colors={['rgba(16,185,129,0.08)', 'rgba(16,185,129,0.02)']}
                                style={StyleSheet.absoluteFillObject}
                            />
                            <Animated.View style={[styles.heroIconRing, { transform: [{ scale: idlePulse }] }]}>
                                <LinearGradient
                                    colors={[accent + '30', accent + '10']}
                                    style={styles.heroIconRingGrad}
                                >
                                    <View style={[styles.heroIconInner, { borderColor: accent + '40' }]}>
                                        <Ionicons name="trophy" size={44} color={accent} />
                                    </View>
                                </LinearGradient>
                            </Animated.View>
                            <Text style={styles.heroTitle}>Enter the Arena</Text>
                            <Text style={styles.heroSubtitle}>
                                Get a high-performance training strategy, race-day mechanics, and nutrition loading protocols — all tailored to your specific competition.
                            </Text>

                            <View style={styles.featurePillsRow}>
                                {[
                                    { icon: 'analytics-outline', label: 'Periodized Training', color: '#10B981' },
                                    { icon: 'restaurant-outline', label: 'Carb Loading', color: '#3B82F6' },
                                    { icon: 'checkbox-outline', label: 'Milestones', color: '#8B5CF6' },
                                ].map((f, i) => (
                                    <View key={i} style={[styles.featurePill, { borderColor: f.color + '30', backgroundColor: f.color + '10' }]}>
                                        <Ionicons name={f.icon} size={14} color={f.color} />
                                        <Text style={[styles.featurePillText, { color: f.color }]}>{f.label}</Text>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={styles.launchBtn}
                                activeOpacity={0.85}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    setPhase('form');
                                }}
                            >
                                <LinearGradient
                                    colors={[accent, accent + 'CC']}
                                    style={styles.launchBtnGrad}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Ionicons name="rocket-outline" size={18} color="#fff" />
                                    <Text style={styles.launchBtnText}>BUILD MY PROTOCOL</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </GlassCard>

                        {/* Info Cards */}
                        <View style={styles.infoCardsRow}>
                            {[
                                { icon: 'time-outline', val: '5 min', label: 'Setup Time', color: '#F59E0B' },
                                { icon: 'layers-outline', val: 'AI', label: 'Powered Plan', color: accent },
                                { icon: 'medal-outline', val: '100%', label: 'Tailored', color: '#8B5CF6' },
                            ].map((c, i) => (
                                <GlassCard key={i} style={styles.infoCard}>
                                    <Ionicons name={c.icon} size={22} color={c.color} />
                                    <Text style={[styles.infoCardVal, { color: c.color }]}>{c.val}</Text>
                                    <Text style={styles.infoCardLabel}>{c.label}</Text>
                                </GlassCard>
                            ))}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </AuraBackground>
        );
    }

    // ─── FORM / WIZARD ───────────────────────────────────────────────
    if (phase === 'form') {
        const renderStepContent = () => {
            switch (currentStep) {
                case 0:
                    return (
                        <View style={styles.stepContentBox}>
                            <Text style={styles.stepQuestion}>What is the name of your competition?</Text>
                            <Text style={styles.stepHint}>This helps personalise your roadmap branding.</Text>
                            <TextInput
                                style={styles.textInput}
                                value={form.competition_name}
                                onChangeText={(val) => setForm({ ...form, competition_name: val })}
                                placeholder="e.g. Beirut Marathon 2026"
                                placeholderTextColor="rgba(15, 23, 42, 0.3)"
                                autoFocus
                            />
                        </View>
                    );
                case 1:
                    return (
                        <View style={styles.stepContentBox}>
                            <Text style={styles.stepQuestion}>Select your sport type:</Text>
                            <ScrollView style={styles.typesList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                                {COMP_TYPES.map((item) => {
                                    const isSelected = form.competition_type === item.type;
                                    return (
                                        <TouchableOpacity
                                            key={item.type}
                                            style={[
                                                styles.typeItem,
                                                isSelected && { borderColor: item.color, backgroundColor: item.color + '12' }
                                            ]}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setForm({ ...form, competition_type: item.type });
                                            }}
                                        >
                                            <View style={[styles.typeIconBox, { backgroundColor: isSelected ? item.color : '#F1F5F9' }]}>
                                                <Ionicons name={item.icon} size={20} color={isSelected ? '#fff' : '#64748B'} />
                                            </View>
                                            <View style={styles.typeInfo}>
                                                <Text style={[styles.typeLabel, isSelected && { color: item.color, fontWeight: '800' }]}>{item.type}</Text>
                                                <Text style={styles.typeDesc}>{item.desc}</Text>
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={20} color={item.color} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    );
                case 2:
                    return (
                        <View style={styles.stepContentBox}>
                            <Text style={styles.stepQuestion}>When is your competition?</Text>
                            <Text style={styles.stepHint}>Format: YYYY-MM-DD</Text>
                            <TextInput
                                style={styles.textInput}
                                value={form.competition_date}
                                onChangeText={(val) => {
                                    let weeks = form.weeks_duration;
                                    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                                        const target = new Date(val);
                                        const today = new Date();
                                        target.setHours(0, 0, 0, 0);
                                        today.setHours(0, 0, 0, 0);
                                        const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
                                        weeks = Math.max(1, Math.ceil(days / 7));
                                    }
                                    setForm({ ...form, competition_date: val, weeks_duration: weeks });
                                }}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="rgba(15, 23, 42, 0.3)"
                            />
                            {/^\d{4}-\d{2}-\d{2}$/.test(form.competition_date) && (
                                <View style={{ marginTop: 15, padding: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' }}>
                                        Calculated Duration: <Text style={{ color: accent, fontWeight: '800' }}>{form.weeks_duration} Weeks</Text>
                                    </Text>
                                    <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>
                                        Sports science recommends 8–12 weeks for optimal peaking.
                                    </Text>
                                </View>
                            )}
                        </View>
                    );
                case 3:
                    return (
                        <View style={styles.stepContentBox}>
                            <Text style={styles.stepQuestion}>What is your target performance goal?</Text>
                            <Text style={styles.stepHint}>Be specific — the AI uses this to calibrate your plan intensity.</Text>
                            <TextInput
                                style={[styles.textInput, { minHeight: 90 }]}
                                value={form.specific_goal}
                                onChangeText={(val) => setForm({ ...form, specific_goal: val })}
                                placeholder="e.g. Finish under 4 hours, deadlift 220kg, complete safely"
                                placeholderTextColor="rgba(15, 23, 42, 0.3)"
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    );
                case 4:
                    return (
                        <View style={styles.stepContentBox}>
                            <Text style={styles.stepQuestion}>What is your training level?</Text>
                            <Text style={styles.stepHint}>Helps calibrate loading intensity and recovery demands.</Text>
                            <View style={styles.levelStack}>
                                {[
                                    { level: 'Beginner', icon: 'leaf-outline', desc: 'New to this modality. Starting with light, progressive training.', color: '#10B981' },
                                    { level: 'Intermediate', icon: 'flame-outline', desc: 'Active trainee, comfortable with loading, seeking optimized performance.', color: '#F59E0B' },
                                    { level: 'Advanced', icon: 'flash-outline', desc: 'Experienced athlete seeking peak-phase and extreme loading protocols.', color: '#EF4444' },
                                ].map(({ level, icon, desc, color }) => {
                                    const isSelected = form.fitness_level === level;
                                    return (
                                        <TouchableOpacity
                                            key={level}
                                            style={[styles.levelBtn, isSelected && { borderColor: color, backgroundColor: color + '10' }]}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setForm({ ...form, fitness_level: level });
                                            }}
                                        >
                                            <View style={styles.levelLabelRow}>
                                                <View style={[styles.levelIconBox, { backgroundColor: isSelected ? color : '#F1F5F9' }]}>
                                                    <Ionicons name={icon} size={16} color={isSelected ? '#fff' : '#64748B'} />
                                                </View>
                                                <Text style={[styles.levelTitle, isSelected && { color: color, fontWeight: '800' }]}>
                                                    {level.toUpperCase()}
                                                </Text>
                                                {isSelected && <Ionicons name="checkmark-circle" size={18} color={color} />}
                                            </View>
                                            <Text style={styles.levelDesc}>{desc}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    );
                default:
                    return null;
            }
        };

        const handleNextStep = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (currentStep === 0 && (!form.competition_name || !form.competition_name.trim())) {
                Alert.alert("Field Required", "Please input the name of your competition.");
                return;
            }
            if (currentStep === 2) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(form.competition_date)) {
                    Alert.alert("Invalid Format", "Please specify the date in YYYY-MM-DD format.");
                    return;
                }
            }
            if (currentStep === 3 && (!form.specific_goal || !form.specific_goal.trim())) {
                Alert.alert("Field Required", "Please specify your target objective.");
                return;
            }
            if (currentStep < 4) {
                animateStepChange(() => setCurrentStep(currentStep + 1));
            } else {
                handleFormSubmit();
            }
        };

        const handlePrevStep = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (currentStep > 0) {
                animateStepChange(() => setCurrentStep(currentStep - 1));
            } else {
                setPhase('idle');
            }
        };

        return (
            <AuraBackground style={styles.container}>
                <SafeAreaView edges={['top']} style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <TouchableOpacity style={styles.backBtn} onPress={handlePrevStep}>
                            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTitle}>{STEP_TITLES[currentStep].toUpperCase()}</Text>
                            <Text style={styles.headerStepLabel}>Step {currentStep + 1} of 5</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressBarWrapper}>
                        <View style={styles.progressDotsRow}>
                            {[0,1,2,3,4].map(i => (
                                <View
                                    key={i}
                                    style={[
                                        styles.progressDot,
                                        i <= currentStep && { backgroundColor: accent, width: i === currentStep ? 22 : 8 }
                                    ]}
                                />
                            ))}
                        </View>
                        <View style={styles.progressBarBg}>
                            <Animated.View style={[
                                styles.progressBarFill,
                                {
                                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                                    backgroundColor: accent
                                }
                            ]} />
                        </View>
                    </View>

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={{ flex: 1, justifyContent: 'space-between', paddingBottom: 20 }}>
                                <ScrollView contentContainerStyle={{ paddingVertical: 10 }} showsVerticalScrollIndicator={false}>
                                    <Animated.View style={{ transform: [{ translateY: stepSlide }] }}>
                                        <GlassCard style={styles.formCard}>
                                            {renderStepContent()}
                                        </GlassCard>
                                    </Animated.View>
                                </ScrollView>

                                <TouchableOpacity style={styles.nextBtn} onPress={handleNextStep} activeOpacity={0.85}>
                                    <LinearGradient
                                        colors={[accent, accent + 'CC']}
                                        style={styles.nextBtnGrad}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.nextBtnText}>
                                            {currentStep === 4 ? 'LAUNCH AI SCAN' : 'CONTINUE'}
                                        </Text>
                                        <Ionicons
                                            name={currentStep === 4 ? 'rocket-outline' : 'arrow-forward'}
                                            size={18}
                                            color="#fff"
                                        />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </AuraBackground>
        );
    }

    // ─── GENERATING / HUD ────────────────────────────────────────────
    if (phase === 'generating') {
        return (
            <AuraBackground style={styles.hudContainer}>
                <View style={styles.hudCard}>
                    {/* Spinning icon */}
                    <View style={[styles.hudIconRing, { borderColor: accent + '40' }]}>
                        <ActivityIndicator size="large" color={accent} />
                    </View>

                    <Text style={[styles.hudTitle, { color: COLORS.text }]}>AI COGNITIVE MATRIX</Text>
                    <Text style={[styles.hudSubtitle, { color: COLORS.textSecondary }]}>Building your personalised periodization plan...</Text>

                    {/* Progress bar */}
                    <View style={styles.hudProgressBg}>
                        <Animated.View style={[
                            styles.hudProgressFill,
                            {
                                width: hudBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                                backgroundColor: accent
                            }
                        ]} />
                    </View>

                    {/* Console log */}
                    <View style={styles.hudConsole}>
                        {HUD_STEPS.map((log, i) => {
                            const isCurrent = i === hudIndex;
                            const isPast = i < hudIndex;
                            return (
                                <View key={i} style={styles.hudLogRow}>
                                    <Ionicons
                                        name={isPast ? 'checkmark-circle' : isCurrent ? 'radio-button-on' : 'radio-button-off'}
                                        size={12}
                                        color={isPast ? '#10B981' : isCurrent ? accent : '#CBD5E1'}
                                    />
                                    <Text style={[
                                        styles.hudConsoleLine,
                                        isCurrent && { color: accent, fontWeight: '700' },
                                        isPast && { color: '#10B981' },
                                        !isCurrent && !isPast && { color: '#CBD5E1' }
                                    ]}>
                                        {log}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </AuraBackground>
        );
    }

    // ─── RESULTS ─────────────────────────────────────────────────────
    const daysLeft = getDaysRemaining();
    const milestoneProgress = Math.round(((completedMilestones.length) / (plan?.milestones?.length || 1)) * 100);

    return (
        <AuraBackground style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{plan?.competition_name?.toUpperCase()}</Text>
                        <Text style={styles.headerStepLabel}>{plan?.competition_type} · {plan?.weeks_duration}w plan</Text>
                    </View>
                    <TouchableOpacity style={styles.resetBtn} onPress={handleResetPlan}>
                        <Ionicons name="refresh-outline" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                </View>

                {/* Countdown Banner */}
                <View style={styles.countdownBanner}>
                    <LinearGradient
                        colors={[accent + '18', accent + '06']}
                        style={styles.countdownGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {/* Days box */}
                        <View style={[styles.daysBox, { backgroundColor: accent + '15', borderColor: accent + '30' }]}>
                            <Text style={[styles.daysNum, { color: accent }]}>{daysLeft}</Text>
                            <Text style={[styles.daysLabel, { color: accent + 'AA' }]}>DAYS LEFT</Text>
                        </View>

                        <View style={styles.countdownRight}>
                            <View style={[styles.typePill, { backgroundColor: accent + '15', borderColor: accent + '25' }]}>
                                <Ionicons name="flag-outline" size={12} color={accent} />
                                <Text style={[styles.typePillText, { color: accent }]}>{plan?.competition_type}</Text>
                            </View>
                            <Text style={styles.countdownGoalText} numberOfLines={2}>
                                🎯 {plan?.specific_goal}
                            </Text>
                            <View style={styles.countdownProgressRow}>
                                <View style={styles.miniProgressBg}>
                                    <View style={[styles.miniProgressFill, { width: `${milestoneProgress}%`, backgroundColor: accent }]} />
                                </View>
                                <Text style={[styles.miniProgressLabel, { color: accent }]}>{milestoneProgress}%</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Tabs */}
                <View style={styles.tabBar}>
                    {[
                        { key: 'schedule', label: 'Roadmap', icon: 'calendar-outline' },
                        { key: 'nutrition', label: 'Nutrition', icon: 'restaurant-outline' },
                        { key: 'milestones', label: 'Milestones', icon: 'checkbox-outline' }
                    ].map((t) => {
                        const isActive = activeTab === t.key;
                        return (
                            <TouchableOpacity
                                key={t.key}
                                style={[styles.tabItem, isActive && { backgroundColor: accent + '15', borderColor: accent + '30' }]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setActiveTab(t.key);
                                }}
                            >
                                <Ionicons name={t.icon} size={15} color={isActive ? accent : '#94A3B8'} />
                                <Text style={[styles.tabLabel, isActive && { color: accent, fontWeight: '800' }]}>{t.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── SCHEDULE TAB ── */}
                    {activeTab === 'schedule' && (
                        <View style={styles.tabContent}>
                            <GlassCard style={styles.overviewCard}>
                                <View style={styles.overviewHeader}>
                                    <View style={[styles.overviewIconBox, { backgroundColor: accent + '15' }]}>
                                        <Ionicons name="analytics-outline" size={20} color={accent} />
                                    </View>
                                    <Text style={styles.overviewTitle}>AI S&C Assessment</Text>
                                </View>
                                <Text style={styles.overviewText}>{plan?.overview}</Text>
                            </GlassCard>

                            <View style={styles.phaseSectionHeader}>
                                <Ionicons name="map-outline" size={14} color={accent} />
                                <Text style={[styles.sectionHeader, { color: accent, marginTop: 0 }]}>PHASE ROADMAP</Text>
                            </View>

                            {/* Timeline */}
                            <View style={styles.timelineContainer}>
                                {plan?.weekly_schedule?.map((ph, i) => {
                                    const isLast = i === (plan?.weekly_schedule?.length ?? 0) - 1;
                                    const phaseColors = [
                                        { bg: '#10B981', light: '#10B98118' },
                                        { bg: '#3B82F6', light: '#3B82F618' },
                                        { bg: '#F59E0B', light: '#F59E0B18' },
                                        { bg: '#8B5CF6', light: '#8B5CF618' },
                                        { bg: '#EF4444', light: '#EF444418' },
                                    ];
                                    const pc = phaseColors[i % phaseColors.length];
                                    return (
                                        <View key={i} style={styles.timelineItem}>
                                            {/* Left: dot + line */}
                                            <View style={styles.timelineLeftCol}>
                                                <View style={[styles.timelineDot, { backgroundColor: pc.bg, borderColor: pc.bg + '40' }]}>
                                                    <Text style={styles.timelineDotText}>{i + 1}</Text>
                                                </View>
                                                {!isLast && <View style={[styles.timelineLine, { backgroundColor: pc.bg + '30' }]} />}
                                            </View>

                                            {/* Right: card */}
                                            <View style={[styles.phaseCardNew, { borderColor: pc.bg + '22' }]}>
                                                {/* Colored top accent bar */}
                                                <View style={[styles.phaseAccentBar, { backgroundColor: pc.bg }]} />

                                                {/* Phase name + volume pill */}
                                                <View style={styles.phaseCardHeader}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.phaseNameText}>{ph.phase_name}</Text>
                                                    </View>
                                                    <View style={[styles.volumePill, { backgroundColor: pc.light, borderColor: pc.bg + '30' }]}>
                                                        <Ionicons name="trending-up-outline" size={11} color={pc.bg} />
                                                        <Text style={[styles.volumePillText, { color: pc.bg }]}>{ph.training_volume}</Text>
                                                    </View>
                                                </View>

                                                {/* Focus blurb */}
                                                <Text style={styles.phaseFocusText}>{ph.focus}</Text>

                                                {/* Divider */}
                                                <View style={styles.phaseDivider} />

                                                {/* Workout rows */}
                                                <View style={styles.workoutsBlock}>
                                                    {ph.weekly_workouts?.map((w, idx) => (
                                                        <View key={idx} style={[
                                                            styles.workoutRowNew,
                                                            idx < (ph.weekly_workouts?.length ?? 0) - 1 && styles.workoutRowBorder
                                                        ]}>
                                                            <View style={[styles.dayChip, { backgroundColor: pc.bg }]}>
                                                                <Text style={styles.dayChipText}>{w.day?.slice(0, 3).toUpperCase()}</Text>
                                                            </View>
                                                            <Text style={styles.workoutLabel}>{w.workout}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* ── NUTRITION TAB ── */}
                    {activeTab === 'nutrition' && (
                        <View style={styles.tabContent}>
                            {[
                                { title: 'Fueling & Pacing Matrix', icon: 'restaurant', color: '#10B981', content: plan?.nutrition_guidance },
                                { title: 'Errors to Avoid', icon: 'alert-circle', color: '#EF4444', content: plan?.avoid_mistakes },
                                { title: 'Expected Readiness', icon: 'ribbon-outline', color: '#F59E0B', content: plan?.estimated_readiness },
                            ].map((card, i) => (
                                <GlassCard key={i} style={styles.nutritionCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.cardIconBox, { backgroundColor: card.color + '15' }]}>
                                            <Ionicons name={card.icon} size={18} color={card.color} />
                                        </View>
                                        <Text style={[styles.cardHeaderTitle, { color: card.color }]}>{card.title}</Text>
                                    </View>
                                    <Text style={styles.cardBodyText}>{card.content}</Text>
                                </GlassCard>
                            ))}
                        </View>
                    )}

                    {/* ── MILESTONES TAB ── */}
                    {activeTab === 'milestones' && (
                        <View style={styles.tabContent}>
                            <GlassCard style={styles.progressSummaryCard}>
                                <View style={styles.progressSummaryHeader}>
                                    <Text style={styles.progressSummaryTitle}>Milestones Checklist</Text>
                                    <Text style={[styles.progressSummaryPct, { color: accent }]}>{milestoneProgress}%</Text>
                                </View>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, { width: `${milestoneProgress}%`, backgroundColor: accent }]} />
                                </View>
                                <Text style={styles.progressSubtext}>
                                    {completedMilestones.length} of {plan?.milestones?.length || 0} benchmarks completed
                                </Text>
                            </GlassCard>

                            <Text style={styles.sectionHeader}>MILESTONES LIST</Text>

                            {plan?.milestones?.map((m) => {
                                const isChecked = completedMilestones.includes(m.id);
                                return (
                                    <TouchableOpacity
                                        key={m.id}
                                        style={[
                                            styles.milestoneItem,
                                            isChecked && { borderColor: accent + '30', backgroundColor: accent + '06' }
                                        ]}
                                        onPress={() => handleToggleMilestone(m.id)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.milestoneCheck, { backgroundColor: isChecked ? accent + '15' : '#F1F5F9' }]}>
                                            <Ionicons
                                                name={isChecked ? 'checkmark' : 'ellipse-outline'}
                                                size={16}
                                                color={isChecked ? accent : '#CBD5E1'}
                                            />
                                        </View>
                                        <View style={styles.milestoneBody}>
                                            <View style={styles.milestoneHeaderRow}>
                                                <Text style={[styles.milestoneTitleText, isChecked && { textDecorationLine: 'line-through', color: '#94A3B8' }]}>
                                                    {m.title}
                                                </Text>
                                                <View style={[styles.weekPill, { backgroundColor: accent + '12', borderColor: accent + '20' }]}>
                                                    <Text style={[styles.weekPillText, { color: accent }]}>W{m.target_week}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.milestoneDesc}>{m.description}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    // ── CONTAINERS ──────────────────────────────────
    container: { flex: 1 },
    safeArea: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingInner: { alignItems: 'center' },
    loadingIconRing: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(16,185,129,0.1)',
        borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.25)',
        justifyContent: 'center', alignItems: 'center'
    },
    loadingText: { marginTop: 14, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
    hudContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // ── HEADER ──────────────────────────────────────
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16, height: 58,
        borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.06)'
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    resetBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: {
        fontSize: 14, fontWeight: '900', letterSpacing: 1.2,
        color: COLORS.text, textAlign: 'center'
    },
    headerStepLabel: {
        fontSize: 11, fontWeight: '600',
        color: COLORS.textSecondary, marginTop: 2
    },

    // ── IDLE / HERO ──────────────────────────────────
    scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
    heroCard: { padding: 24, alignItems: 'center', borderRadius: 24, overflow: 'hidden', marginBottom: 16 },
    heroIconRing: { marginBottom: 20 },
    heroIconRingGrad: { borderRadius: 60, padding: 12 },
    heroIconInner: {
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)'
    },
    heroTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 10 },
    heroSubtitle: {
        fontSize: 13, color: COLORS.textSecondary, textAlign: 'center',
        lineHeight: 20, marginBottom: 20
    },
    featurePillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 },
    featurePill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1
    },
    featurePillText: { fontSize: 11, fontWeight: '700' },
    launchBtn: {
        alignSelf: 'stretch', borderRadius: 16, overflow: 'hidden', height: 52,
        shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2, shadowRadius: 10, elevation: 4
    },
    launchBtnGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    launchBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

    infoCardsRow: { flexDirection: 'row', gap: 10 },
    infoCard: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 16, gap: 4 },
    infoCardVal: { fontSize: 18, fontWeight: '900', marginTop: 4 },
    infoCardLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },

    // ── FORM WIZARD ──────────────────────────────────
    progressBarWrapper: { paddingHorizontal: 16, paddingVertical: 12 },
    progressDotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, justifyContent: 'center' },
    progressDot: {
        height: 8, width: 8, borderRadius: 4,
        backgroundColor: '#E2E8F0', overflow: 'hidden'
    },
    progressBarBg: {
        height: 4, backgroundColor: '#E2E8F0', borderRadius: 2,
        overflow: 'hidden'
    },
    progressBarFill: { height: '100%', borderRadius: 2 },

    formCard: { marginHorizontal: 16, padding: 22, borderRadius: 22 },
    stepContentBox: { minHeight: 260 },
    stepQuestion: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 6, lineHeight: 24 },
    stepHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 17 },
    textInput: {
        borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 13,
        fontSize: 14, color: COLORS.text,
        backgroundColor: 'rgba(255,255,255,0.6)',
        marginTop: 4
    },
    typesList: { maxHeight: 300 },
    typeItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: 12, borderWidth: 1.5, borderColor: COLORS.border,
        borderRadius: 14, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.45)'
    },
    typeIconBox: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    typeInfo: { flex: 1 },
    typeLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    typeDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

    weeksGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 10,
        justifyContent: 'space-between', marginBottom: 12
    },
    weekBtn: {
        width: '30%', aspectRatio: 1.3,
        borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.45)'
    },
    weekBtnText: { fontSize: 20, fontWeight: '900', color: COLORS.text },
    weekBtnSub: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, marginTop: 2 },

    levelStack: { gap: 10 },
    levelBtn: {
        borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 16,
        padding: 14, backgroundColor: 'rgba(255,255,255,0.45)'
    },
    levelLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    levelIconBox: {
        width: 32, height: 32, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center'
    },
    levelTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, flex: 1 },
    levelDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },

    nextBtn: {
        marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', height: 52,
        shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18, shadowRadius: 10, elevation: 4
    },
    nextBtnGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },

    // ── HUD ──────────────────────────────────────────
    hudCard: {
        width: width * 0.88, padding: 26, borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.2)',
        alignItems: 'center',
        shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12, shadowRadius: 16, elevation: 6
    },
    hudIconRing: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 2, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)', marginBottom: 18
    },
    hudTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
    hudSubtitle: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
    hudProgressBg: {
        width: '100%', height: 5, backgroundColor: '#E2E8F0',
        borderRadius: 3, overflow: 'hidden', marginBottom: 20
    },
    hudProgressFill: { height: '100%', borderRadius: 3 },
    hudConsole: {
        alignSelf: 'stretch', backgroundColor: 'rgba(15,23,42,0.03)',
        borderRadius: 14, padding: 14, gap: 10
    },
    hudLogRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    hudConsoleLine: {
        fontSize: 10.5, fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        lineHeight: 15, flex: 1
    },

    // ── RESULTS ──────────────────────────────────────
    countdownBanner: { paddingHorizontal: 16, paddingVertical: 10 },
    countdownGrad: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        borderRadius: 20, padding: 16, borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.15)'
    },
    daysBox: {
        width: 76, height: 76, borderRadius: 18,
        borderWidth: 1.5, justifyContent: 'center', alignItems: 'center'
    },
    daysNum: { fontSize: 28, fontWeight: '900' },
    daysLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
    countdownRight: { flex: 1 },
    typePill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1, marginBottom: 6
    },
    typePillText: { fontSize: 10, fontWeight: '800' },
    countdownGoalText: { fontSize: 12, fontWeight: '600', color: COLORS.text, lineHeight: 17, marginBottom: 8 },
    countdownProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    miniProgressBg: { flex: 1, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' },
    miniProgressFill: { height: '100%', borderRadius: 2 },
    miniProgressLabel: { fontSize: 11, fontWeight: '800' },

    tabBar: {
        flexDirection: 'row', paddingHorizontal: 16,
        marginBottom: 8, gap: 8
    },
    tabItem: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 5, paddingVertical: 9, paddingHorizontal: 10,
        borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.5)',
        borderWidth: 1, borderColor: 'rgba(15,23,42,0.04)'
    },
    tabLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
    tabContent: { gap: 14, paddingTop: 4 },

    overviewCard: { padding: 16, borderRadius: 18 },
    overviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    overviewIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    overviewTitle: { fontSize: 13, fontWeight: '900', color: COLORS.text },
    overviewText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
    sectionHeader: {
        fontSize: 10, fontWeight: '900', letterSpacing: 1.5,
        color: COLORS.textSecondary, marginTop: 4
    },

    phaseSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, marginTop: 4 },

    // ── TIMELINE ────────────────────────────────────
    timelineContainer: { gap: 0 },
    timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    timelineLeftCol: { alignItems: 'center', width: 36 },
    timelineDot: {
        width: 36, height: 36, borderRadius: 18,
        borderWidth: 2, justifyContent: 'center', alignItems: 'center',
        zIndex: 2, backgroundColor: '#10B981'
    },
    timelineDotText: { fontSize: 13, fontWeight: '900', color: '#fff' },
    timelineLine: {
        width: 2, flex: 1, minHeight: 24,
        marginTop: 2, marginBottom: 2
    },

    // ── PHASE CARD ───────────────────────────────────
    phaseCardNew: {
        flex: 1, borderRadius: 18, borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.88)',
        overflow: 'hidden', marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 3
    },
    phaseAccentBar: { height: 4, width: '100%' },
    phaseCardHeader: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingHorizontal: 14, paddingTop: 14,
        paddingBottom: 6, gap: 8
    },
    phaseNameText: {
        fontSize: 15, fontWeight: '900', color: COLORS.text,
        lineHeight: 20, flex: 1
    },
    volumePill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 9, paddingVertical: 5,
        borderRadius: 10, borderWidth: 1, marginTop: 2
    },
    volumePillText: { fontSize: 10, fontWeight: '800' },
    phaseFocusText: {
        fontSize: 12, color: COLORS.textSecondary,
        lineHeight: 18, paddingHorizontal: 14, marginBottom: 12
    },
    phaseDivider: {
        height: 1, backgroundColor: 'rgba(15,23,42,0.06)',
        marginHorizontal: 14, marginBottom: 10
    },
    workoutsBlock: { paddingHorizontal: 14, paddingBottom: 14, gap: 0 },
    workoutRowNew: {
        flexDirection: 'row', alignItems: 'flex-start',
        gap: 10, paddingVertical: 9
    },
    workoutRowBorder: {
        borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.05)'
    },
    dayChip: {
        minWidth: 38, paddingHorizontal: 6, paddingVertical: 4,
        borderRadius: 8, alignItems: 'center', justifyContent: 'center'
    },
    dayChipText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
    workoutLabel: {
        fontSize: 12, fontWeight: '600', color: COLORS.text,
        flex: 1, lineHeight: 17
    },

    nutritionCard: { padding: 16, borderRadius: 18 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    cardIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    cardHeaderTitle: { fontSize: 13, fontWeight: '900' },
    cardBodyText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 19 },

    progressSummaryCard: { padding: 16, borderRadius: 18 },
    progressSummaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    progressSummaryTitle: { fontSize: 13, fontWeight: '900', color: COLORS.text },
    progressSummaryPct: { fontSize: 18, fontWeight: '900' },
    progressTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', borderRadius: 3 },
    progressSubtext: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

    milestoneItem: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderWidth: 1.5, borderColor: 'rgba(15,23,42,0.05)',
        borderRadius: 16, padding: 14
    },
    milestoneCheck: {
        width: 30, height: 30, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 1
    },
    milestoneBody: { flex: 1 },
    milestoneHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 10 },
    milestoneTitleText: { fontSize: 13, fontWeight: '800', color: COLORS.text, flex: 1 },
    weekPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
    weekPillText: { fontSize: 9, fontWeight: '800' },
    milestoneDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
});

export default CompetitionPrepScreen;
