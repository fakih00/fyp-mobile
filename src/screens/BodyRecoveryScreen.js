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
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { api } from '../services/api';
import AuraBackground from '../components/AuraBackground';

const { width, height } = Dimensions.get('window');

const PART_LABELS = {
    shoulders_left: 'Left Shoulder',
    shoulders_right: 'Right Shoulder',
    arms_left: 'Left Arm',
    arms_right: 'Right Arm',
    elbows_left: 'Left Elbow',
    elbows_right: 'Right Elbow',
    chest: 'Chest',
    back: 'Back / Spine',
    knees_left: 'Left Knee',
    knees_right: 'Right Knee',
    legs_left: 'Left Leg',
    legs_right: 'Right Leg',
    ankles_left: 'Left Ankle / Foot',
    ankles_right: 'Right Ankle / Foot',
    head: 'Head / Neck'
};

const HUD_TEXTS = [
    "Analyzing soft tissue boundaries...",
    "Scanning neuromuscular pathways...",
    "Calibrating joint loading limits...",
    "Detecting kinetic chain imbalances...",
    "Formulating prehab prescriptions..."
];

const BodyRecoveryScreen = ({ navigation }) => {
    const { colors: themeColors } = useContext(AppContext);
    // UI Phase State: 'loading_profile' | 'scan_idle' | 'questionnaire' | 'analyzing' | 'results'
    const [phase, setPhase] = useState('loading_profile');
    const [profile, setProfile] = useState(null);
    const [userId, setUserId] = useState(null);
    const [activeInjuries, setActiveInjuries] = useState([]);

    // Recovery Plan Cache
    const [recoveryPlan, setRecoveryPlan] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Interactive Questionnaire State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({
        how_happened: '',
        pain_start: '',
        pain_level: 5,
        pain_type: 'sore', // sore | sharp
        increase_during_workout: 'no', // yes | no
        hurt_movements: '',
        seen_doctor: 'no', // yes | no
        injury_age: 'recent' // recent | chronic
    });

    // Interactive Recovery Progress & Timer States
    const [completedItems, setCompletedItems] = useState([]);
    const [activeTimer, setActiveTimer] = useState(null); // { id, duration }
    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const timerRef = useRef(null);

    const saveProgressToServer = async (updatedItems) => {
        if (recoveryPlan && recoveryPlan.db_id) {
            try {
                await api.updateRecoveryProgress(recoveryPlan.db_id, updatedItems, recoveryPlan.body_parts_status || []);
            } catch (e) {
                console.error("Failed to save recovery progress:", e);
            }
        }
    };

    useEffect(() => {
        if (isTimerActive && timeLeft > 0) {
            timerRef.current = setTimeout(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isTimerActive) {
            setIsTimerActive(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (activeTimer) {
                setCompletedItems(prev => {
                    const next = prev.includes(activeTimer.id) ? prev : [...prev, activeTimer.id];
                    saveProgressToServer(next);
                    return next;
                });
            }
            Alert.alert("🔥 Hold Completed!", "Great work on completing this exercise!");
        }
        return () => clearTimeout(timerRef.current);
    }, [timeLeft, isTimerActive, activeTimer]);

    const startTimer = (id, durationStr) => {
        let seconds = 30;
        const matches = durationStr.match(/(\d+)\s*s/i) || durationStr.match(/(\d+)\s*sec/i) || durationStr.match(/(\d+)/);
        if (matches) {
            seconds = parseInt(matches[1], 10);
            if (seconds < 5) seconds = 30; // safety fallback for set count
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setActiveTimer({ id, duration: seconds });
        setTimeLeft(seconds);
        setIsTimerActive(true);
    };

    const toggleTimerPause = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsTimerActive(!isTimerActive);
    };

    const resetTimer = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsTimerActive(false);
        if (activeTimer) {
            setTimeLeft(activeTimer.duration);
        }
    };

    const toggleItemCompleted = (itemId) => {
        Haptics.selectionAsync();
        setCompletedItems(prev => {
            const next = prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId];
            saveProgressToServer(next);
            return next;
        });
    };

    // Hologram Silhouette View Perspective
    const [isFrontView, setIsFrontView] = useState(true);

    // Visual HUD Scan Text
    const [hudTextIndex, setHudTextIndex] = useState(0);

    // Animations
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const flipAnim = useRef(new Animated.Value(0)).current;
    const scanBarAnim = useRef(new Animated.Value(-10)).current;
    const pulseWarningAnim = useRef(new Animated.Value(1)).current;

    const cardAnims = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

    useEffect(() => {
        if (phase === 'results' && !selectedCategory) {
            cardAnims.forEach(anim => anim.setValue(0));
            Animated.stagger(75, cardAnims.map(anim =>
                Animated.spring(anim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true
                })
            )).start();
        }
    }, [phase, selectedCategory]);

    // Levitation Idle Loop
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 1,
                    duration: 2500,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2500,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true
                })
            ])
        ).start();
    }, []);

    // Injury Indicator Warning Pulse
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseWarningAnim, {
                    toValue: 1.3,
                    duration: 1200,
                    useNativeDriver: true
                }),
                Animated.timing(pulseWarningAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true
                })
            ])
        ).start();
    }, []);

    // Scanning Beam Vertical Loop (Only active during 'analyzing')
    useEffect(() => {
        if (phase === 'analyzing') {
            scanBarAnim.setValue(-10);
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanBarAnim, {
                        toValue: 250,
                        duration: 2200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.timing(scanBarAnim, {
                        toValue: -10,
                        duration: 2200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    })
                ])
            ).start();
        } else {
            scanBarAnim.setValue(-10);
        }
    }, [phase]);

    // Cycling HUD Text during scanning
    useEffect(() => {
        let interval;
        if (phase === 'analyzing') {
            interval = setInterval(() => {
                setHudTextIndex(prev => (prev + 1) % HUD_TEXTS.length);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [phase]);

    // Initial Data Hydration
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        console.log("Hydrating active recovery profile and plan data...");
        try {
            // 1. Fetch User Profile
            const res = await api.getUser();
            let currentUserId = null;
            if (res.status === 200) {
                setProfile(res.data.profile);
                currentUserId = res.data.id;
                setUserId(res.data.id);

                // Parse onboarding injuries (e.g. "shoulders_left,knees_right")
                if (res.data.profile.injuries) {
                    const parsed = res.data.profile.injuries.split(',').filter(Boolean);
                    setActiveInjuries(parsed);
                }
            }

            // 2. Load Recovery Plan from Backend or local cache
            const planRes = await api.getRecoveryPlan();
            if (planRes.status === 200 && planRes.data) {
                setRecoveryPlan(planRes.data);
                if (planRes.data.completed_items) {
                    setCompletedItems(planRes.data.completed_items);
                }
                setPhase('results');
            } else {
                const cacheKey = currentUserId ? `@active_recovery_plan_${currentUserId}` : '@active_recovery_plan';
                const cachedPlan = await AsyncStorage.getItem(cacheKey);
                if (cachedPlan) {
                    const parsed = JSON.parse(cachedPlan);
                    setRecoveryPlan(parsed);
                    if (parsed.completed_items) {
                        setCompletedItems(parsed.completed_items);
                    }
                    setPhase('results');
                } else {
                    setPhase('scan_idle');
                }
            }
        } catch (e) {
            console.error("Recovery Screen Hydration Error:", e);
            setPhase('scan_idle');
        }
    };

    // Card Flip Perspective Transition
    const toggleView = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const toValue = isFrontView ? 180 : 0;

        Animated.timing(flipAnim, {
            toValue,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
        }).start();

        setTimeout(() => {
            setIsFrontView(!isFrontView);
        }, 300);
    };

    // Levitation mapping
    const translateY = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-8, 8]
    });

    const rotateY = flipAnim.interpolate({
        inputRange: [0, 180],
        outputRange: ['0deg', '180deg']
    });

    // Body parts selection visualization based on profile injuries
    const getPartFill = (part, side = null) => {
        const partKey = side ? `${part}_${side}` : part;
        if (activeInjuries.includes(partKey) || activeInjuries.includes(part)) {
            const totalItems = (recoveryPlan?.stretching?.length || 0) + (recoveryPlan?.mobility_exercises?.length || 0);
            if (totalItems > 0) {
                const ratio = completedItems.length / totalItems;
                if (ratio >= 1.0) {
                    return 'url(#grad-neon-emerald)'; // Fully recovered (green)
                } else if (ratio >= 0.4) {
                    return 'url(#grad-neon-amber)'; // Recovering (yellow/amber)
                }
            }
            return 'url(#grad-neon-ruby)'; // Glowing neon ruby red for injured joints
        }
        return 'url(#grad-clinical-slate)'; // Futuristic wireframe titanium slate
    };

    const getPartStroke = (part, side = null) => {
        const partKey = side ? `${part}_${side}` : part;
        if (activeInjuries.includes(partKey) || activeInjuries.includes(part)) {
            const totalItems = (recoveryPlan?.stretching?.length || 0) + (recoveryPlan?.mobility_exercises?.length || 0);
            if (totalItems > 0) {
                const ratio = completedItems.length / totalItems;
                if (ratio >= 1.0) {
                    return { color: '#10B981', width: 2.2 };
                } else if (ratio >= 0.4) {
                    return { color: '#F59E0B', width: 2.2 };
                }
            }
            return { color: '#EF4444', width: 2.2 };
        }
        return { color: 'rgba(16, 185, 129, 0.3)', width: 0.8 }; // Soft cyber-teal wire edge
    };

    // Submitting questionnaire triggers backend Gemini synthesis
    const handleGenerateAnalysis = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPhase('analyzing');

        try {
            const res = await api.generateRecoveryPlan(answers);
            if (res.status === 200 && res.data) {
                const planData = res.data;
                setRecoveryPlan(planData);
                setCompletedItems([]);
                const cacheKey = userId ? `@active_recovery_plan_${userId}` : '@active_recovery_plan';
                await AsyncStorage.setItem(cacheKey, JSON.stringify(planData));

                // Transition phase to results
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true
                }).start(() => {
                    setPhase('results');
                    fadeAnim.setValue(1);
                });
            } else {
                throw new Error(res.data.message || "Failed to generate plan");
            }
        } catch (e) {
            console.error("AI Plan Generation failed:", e);
            Alert.alert("System Failure", e.message || "We could not compile your recovery roadmap. Please retry in a moment.");
            setPhase('scan_idle');
        }
    };

    const resetAnalysis = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            "New Clinical Assessment",
            "Are you sure you want to discard your active recovery roadmap and scan a new injury profile?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Discard",
                    style: "destructive",
                    onPress: async () => {
                        const cacheKey = userId ? `@active_recovery_plan_${userId}` : '@active_recovery_plan';
                        await AsyncStorage.removeItem(cacheKey);
                        setRecoveryPlan(null);
                        setSelectedCategory(null);
                        setCurrentQuestionIndex(0);
                        setPhase('scan_idle');
                    }
                }
            ]
        );
    };

    // Multi-step Interactive Questionnaire renderer
    const renderQuestionnaire = () => {
        const questions = [
            {
                id: 'how_happened',
                title: 'Etiology & Mechanism',
                subtitle: 'How did this pain or injury occur? (e.g., loaded squat, overhead press compression, sudden twist)',
                type: 'text',
                placeholder: 'Type mechanism of injury...'
            },
            {
                id: 'pain_start',
                title: 'Onset & Duration',
                subtitle: 'When did the discomfort start?',
                type: 'options',
                choices: ['Today / Sudden', 'A few days ago', 'Last week', 'Over 1 month ago (Chronic)']
            },
            {
                id: 'pain_level',
                title: 'Subjective Pain Level',
                subtitle: 'Rate your maximum discomfort on a scale of 1 (subtle soreness) to 10 (intense pain).',
                type: 'slider',
                min: 1,
                max: 10
            },
            {
                id: 'pain_type',
                title: 'Symptom Quality',
                subtitle: 'Is the pain sharp/clicking (suggests joint/nerve restriction) or sore/dull (suggests muscle fatigue)?',
                type: 'options',
                choices: ['Sharp / Shooting / Clicking', 'Dull / Sore / Burning']
            },
            {
                id: 'increase_during_workout',
                title: 'Workout Aggravation',
                subtitle: 'Does the discomfort escalate during active muscle loading or training?',
                type: 'options',
                choices: ['Yes, pain intensifies during workouts', 'No, it feels better once warmed up', 'It remains constant throughout']
            },
            {
                id: 'hurt_movements',
                title: 'Restricted Range of Motion',
                subtitle: 'Which specific movements trigger the sharpest discomfort?',
                type: 'text',
                placeholder: 'e.g., deep bending, rotating outward, reaching overhead...'
            },
            {
                id: 'seen_doctor',
                title: 'Medical Diagnostics',
                subtitle: 'Have you consulted a doctor or physiotherapist for this specific symptom?',
                type: 'options',
                choices: ['Yes, received professional medical diagnosis', 'No, self-diagnosing active symptoms']
            },
            {
                id: 'injury_age',
                title: 'Chronicity Profile',
                subtitle: 'Is this a brand new injury, or a recurring aggravation of an older problem?',
                type: 'options',
                choices: ['Brand new acute injury', 'Old injury flaring up / Chronic recurrence']
            }
        ];

        const q = questions[currentQuestionIndex];

        const handleAnswerChange = (val) => {
            setAnswers(prev => ({ ...prev, [q.id]: val }));
        };

        const handleSkipAssessment = async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setPhase('analyzing');
            try {
                const defaultAnswers = {
                    how_happened: 'Preventive / No active injury',
                    pain_start: 'No pain',
                    pain_level: 1,
                    pain_type: 'sore',
                    increase_during_workout: 'no',
                    hurt_movements: 'none',
                    seen_doctor: 'no',
                    injury_age: 'recent'
                };
                const res = await api.generateRecoveryPlan(defaultAnswers);
                if (res.status === 200 && res.data) {
                    const planData = res.data;
                    setRecoveryPlan(planData);
                    setCompletedItems([]);
                    const cacheKey = userId ? `@active_recovery_plan_${userId}` : '@active_recovery_plan';
                    await AsyncStorage.setItem(cacheKey, JSON.stringify(planData));
                    setPhase('results');
                } else {
                    throw new Error("Failed to generate preventive recovery plan");
                }
            } catch (e) {
                console.error(e);
                Alert.alert("System Failure", "We could not compile your preventive recovery plan. Please try again.");
                setPhase('scan_idle');
            }
        };

        const handleNext = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Required Question Validation
            if (q.id === 'how_happened' && (!answers.how_happened || answers.how_happened.trim() === '')) {
                Alert.alert("Required Field", "Please describe how this pain or injury occurred.");
                return;
            }
            if (q.id === 'pain_start' && (!answers.pain_start || answers.pain_start === '')) {
                Alert.alert("Required Selection", "Please specify when the discomfort started.");
                return;
            }
            if (q.id === 'hurt_movements' && (!answers.hurt_movements || answers.hurt_movements.trim() === '')) {
                Alert.alert("Required Field", "Please specify which movements trigger the discomfort.");
                return;
            }

            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                handleGenerateAnalysis();
            }
        };

        const handlePrev = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (currentQuestionIndex > 0) {
                setCurrentQuestionIndex(prev => prev - 1);
            } else {
                setPhase('scan_idle');
            }
        };

        return (
            <BlurView intensity={35} tint="light" style={styles.questionPanel}>
                <View style={styles.questionHeader}>
                    <TouchableOpacity onPress={handlePrev} style={styles.qBackBtn}>
                        <Ionicons name="chevron-back" size={20} color="#06B6D4" />
                    </TouchableOpacity>
                    <Text style={styles.qProgressText}>Step {currentQuestionIndex + 1} of {questions.length}</Text>
                    {activeInjuries.length === 0 ? (
                        <TouchableOpacity onPress={handleSkipAssessment} style={styles.qSkipBtn}>
                            <Text style={styles.qSkipText}>SKIP</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
                </View>

                {/* Progress bar */}
                <View style={styles.qProgressTrack}>
                    <View style={[styles.qProgressFill, { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }]} />
                </View>

                <View style={styles.questionContent}>
                    <Text style={styles.questionTitle}>{q.title.toUpperCase()}</Text>
                    <Text style={styles.questionSubtitle}>{q.subtitle}</Text>

                    {q.type === 'text' && (
                        <TextInput
                            style={styles.questionInput}
                            value={answers[q.id]}
                            onChangeText={handleAnswerChange}
                            placeholder={q.placeholder}
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            multiline
                            autoFocus
                        />
                    )}

                    {q.type === 'options' && (
                        <ScrollView style={styles.choiceScroll} showsVerticalScrollIndicator={false}>
                            <View style={styles.choicesGrid}>
                                {q.choices.map((choice, i) => {
                                    const isSelected = answers[q.id] === choice;
                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[styles.choiceBtn, isSelected && styles.choiceBtnActive]}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                handleAnswerChange(choice);
                                            }}
                                        >
                                            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={16} color={isSelected ? themeColors.accent : '#64748B'} />
                                            <Text style={[styles.choiceText, isSelected && { color: themeColors.accent, fontWeight: '700' }]}>{choice}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    )}

                    {q.type === 'slider' && (
                        <View style={styles.sliderWrapper}>
                            <Text style={styles.sliderValueText}>{answers[q.id]} / 10</Text>
                            <Text style={[
                                styles.sliderSubText,
                                answers[q.id] >= 8 ? { color: '#EF4444' } : answers[q.id] >= 4 ? { color: '#F59E0B' } : { color: '#10B981' }
                            ]}>
                                {answers[q.id] >= 8 ? 'SEVERE PAIN (LOAD RESTRICTION)' : answers[q.id] >= 4 ? 'MODERATE DISCOMFORT (STABILITY PREPAREDNESS)' : 'MILD SORENESS (ACTIVE WORKOUT ADJUSTMENT)'}
                            </Text>
                            <View style={styles.painNumberRow}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                                    const isActive = answers[q.id] === num;
                                    return (
                                        <TouchableOpacity
                                            key={num}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                handleAnswerChange(num);
                                            }}
                                            style={[
                                                styles.painNumBtn,
                                                isActive && styles.painNumBtnActive,
                                                num >= 8 && isActive && { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.2)' }
                                            ]}
                                        >
                                            <Text style={[styles.painNumText, isActive && styles.painNumTextActive]}>{num}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                </View>

                <TouchableOpacity style={styles.qNextBtn} onPress={handleNext}>
                    <LinearGradient
                        colors={themeColors.gradient || ['#06B6D4', '#0891B2']}
                        style={styles.qNextGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.qNextText}>{currentQuestionIndex === questions.length - 1 ? 'LAUNCH CLINICAL SCAN' : 'NEXT STEP'}</Text>
                        <Ionicons name={currentQuestionIndex === questions.length - 1 ? "hardware-chip" : "arrow-forward"} size={16} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </BlurView>
        );
    };

    // Scan overlay panel containing visual scan sweeps
    const renderAnalyzing = () => {
        return (
            <BlurView intensity={30} tint="light" style={styles.scanningHUDEffect}>
                <View style={styles.hudTerminal}>
                    <ActivityIndicator size="large" color="#06B6D4" style={{ marginBottom: 20 }} />
                    <Text style={styles.scanningTitle}>NEUROMUSCULAR RECONSTRUCTION...</Text>
                    <Text style={styles.scanningSubtitle}>Gemini AI is integrating joint limitations & active symptoms...</Text>

                    <View style={styles.scrollingHUDLog}>
                        {HUD_TEXTS.map((txt, i) => {
                            const isActive = i === hudTextIndex;
                            return (
                                <Text
                                    key={i}
                                    style={[
                                        styles.hudLogLine,
                                        isActive ? { color: '#06B6D4', fontWeight: 'bold' } : { color: 'rgba(15, 23, 42, 0.4)' }
                                    ]}
                                >
                                    {isActive ? '>> ' : '   '} {txt.toUpperCase()}
                                </Text>
                            );
                        })}
                    </View>
                </View>
            </BlurView>
        );
    };


    const renderBodySilhouette = (customWidth = 200, customHeight = 240) => {
        return (
            <Svg width={customWidth} height={customHeight} viewBox="0 0 240 320" style={styles.svgFigure}>
                <Defs>
                    {/* Slate metallic bone structure */}
                    <SvgLinearGradient id="grad-clinical-slate" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#E2E8F0" />
                        <Stop offset="50%" stopColor="#CBD5E1" />
                        <Stop offset="100%" stopColor="#94A3B8" />
                    </SvgLinearGradient>

                    {/* Glowing hot Ruby Red for damaged soft-tissues */}
                    <SvgLinearGradient id="grad-neon-ruby" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#FCA5A5" />
                        <Stop offset="40%" stopColor="#EF4444" />
                        <Stop offset="100%" stopColor="#B91C1C" />
                    </SvgLinearGradient>

                    {/* Glowing hot Amber for recovering tissues */}
                    <SvgLinearGradient id="grad-neon-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#FDE047" />
                        <Stop offset="40%" stopColor="#F59E0B" />
                        <Stop offset="100%" stopColor="#D97706" />
                    </SvgLinearGradient>

                    {/* Glowing Emerald Green for fully stabilized tissues */}
                    <SvgLinearGradient id="grad-neon-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#6EE7B7" />
                        <Stop offset="40%" stopColor="#10B981" />
                        <Stop offset="100%" stopColor="#047857" />
                    </SvgLinearGradient>
                </Defs>

                {isFrontView ? (
                    /* ================= SILHOUETTE FRONT VIEW ================= */
                    <>
                        {/* Left Ear */}
                        <Path d="M99,23 C97,23 96,25 96,28 C96,31 98,33 99,32 C100,31 100,29 100,28 Z" fill={getPartFill('head')} stroke={getPartStroke('head').color} strokeWidth={1} />
                        {/* Right Ear */}
                        <Path d="M141,23 C143,23 144,25 144,28 C144,31 142,33 141,32 C140,31 140,29 140,28 Z" fill={getPartFill('head')} stroke={getPartStroke('head').color} strokeWidth={1} />
                        {/* Head Base */}
                        <Path d="M120,10 C110,10 102,18 102,28 C102,36 107,43 113,45 C114,48 116,50 116,54 L124,54 C124,50 126,48 127,45 C133,43 138,36 138,28 C138,18 130,10 120,10 Z" fill={getPartFill('head')} stroke={getPartStroke('head').color} strokeWidth={getPartStroke('head').width} />
                        {/* Face glowing elements */}
                        <Circle cx="112" cy="25" r="1" fill="#06B6D4" pointerEvents="none" />
                        <Circle cx="128" cy="25" r="1" fill="#06B6D4" pointerEvents="none" />
                        {/* Chest / Pecs */}
                        <Path d="M120,68 C112,68 104,66 98,60 C97,68 97,76 98,88 C104,91 112,93 120,93 C128,93 136,91 142,88 C143,76 143,68 142,60 C136,66 128,68 120,68 Z" fill={getPartFill('chest')} stroke={getPartStroke('chest').color} strokeWidth={getPartStroke('chest').width} />
                        {/* Torso/Abs */}
                        <Path d="M98,88 C97,100 99,114 103,126 C108,129 114,130 120,130 C126,130 132,129 137,126 C141,114 143,100 142,88 C136,91 128,93 120,93 C112,93 104,91 98,88 Z" fill={getPartFill('chest')} stroke={getPartStroke('chest').color} strokeWidth={getPartStroke('chest').width} />
                        {/* Left Shoulder (Deltoid) */}
                        <Path d="M98,58 C92,54 84,60 80,70 C77,78 79,84 84,86 C88,84 94,80 98,78 C97,72 97,64 98,58 Z" fill={getPartFill('shoulders', 'left')} stroke={getPartStroke('shoulders', 'left').color} strokeWidth={getPartStroke('shoulders', 'left').width} />
                        {/* Right Shoulder (Deltoid) */}
                        <Path d="M142,58 C148,54 156,60 160,70 C163,78 161,84 156,86 C152,84 146,80 142,78 C143,72 143,64 142,58 Z" fill={getPartFill('shoulders', 'right')} stroke={getPartStroke('shoulders', 'right').color} strokeWidth={getPartStroke('shoulders', 'right').width} />
                        {/* Left Arm (Bicep/Tricep) */}
                        <Path d="M80,70 C76,78 72,92 73,115 C76,118 80,120 83,118 C86,105 88,92 84,86 C82,82 81,76 80,70 Z" fill={getPartFill('arms', 'left')} stroke={getPartStroke('arms', 'left').color} strokeWidth={getPartStroke('arms', 'left').width} />
                        {/* Right Arm (Bicep/Tricep) */}
                        <Path d="M160,70 C164,78 168,92 167,115 C164,118 160,120 157,118 C154,105 152,92 156,86 C158,82 159,76 160,70 Z" fill={getPartFill('arms', 'right')} stroke={getPartStroke('arms', 'right').color} strokeWidth={getPartStroke('arms', 'right').width} />
                        {/* Left Elbow */}
                        <Path d="M73,115 C72,118 72,122 74,125 C77,125 79,122 80,120 C81,120 82,119 83,118 C80,120 76,118 73,115 Z" fill={getPartFill('elbows', 'left')} stroke={getPartStroke('elbows', 'left').color} strokeWidth={getPartStroke('elbows', 'left').width} />
                        {/* Right Elbow */}
                        <Path d="M167,115 C168,118 168,122 166,125 C163,125 161,122 160,120 C159,120 158,119 157,118 C160,120 164,118 167,115 Z" fill={getPartFill('elbows', 'right')} stroke={getPartStroke('elbows', 'right').color} strokeWidth={getPartStroke('elbows', 'right').width} />
                        {/* Left Forearm & Hand */}
                        <Path d="M74,125 C71,135 67,148 64,158 C62,162 60,168 59,174 C59,175 60,176 61,175 C62,173 63,166 64,162 C65,166 66,178 66,179 C66,180 67,180 68,179 C68,177 67,166 67,161 C68,165 70,179 70,181 C70,182 71,182 72,181 C72,179 70,165 69,160 C71,164 73,176 74,178 C74,179 75,179 76,178 C76,176 73,163 71,159 C73,161 76,170 77,172 C77,173 78,173 78,171 C78,169 75,159 73,156 C77,145 80,132 80,125 Z" fill={getPartFill('arms', 'left')} stroke={getPartStroke('arms', 'left').color} strokeWidth={getPartStroke('arms', 'left').width} />
                        {/* Right Forearm & Hand */}
                        <Path d="M166,125 C169,135 173,148 176,158 C178,162 180,168 181,174 C181,175 180,176 179,175 C178,173 177,166 176,162 C175,166 174,178 174,179 C174,180 173,180 172,179 C172,177 173,166 173,161 C172,165 170,179 170,181 C170,182 169,182 168,181 C168,179 170,165 171,160 C169,164 167,176 166,178 C166,179 165,179 164,178 C164,176 167,163 169,159 C167,159 164,170 163,172 C163,173 162,173 162,171 C162,169 165,159 167,156 C163,145 160,132 160,125 Z" fill={getPartFill('arms', 'right')} stroke={getPartStroke('arms', 'right').color} strokeWidth={getPartStroke('arms', 'right').width} />
                        {/* Hips & Pelvis */}
                        <Path d="M103,126 C97,133 94,142 94,152 C94,156 100,160 106,158 C114,156 126,156 134,158 C140,160 146,156 146,152 C146,142 143,133 137,126 C132,129 126,130 120,130 C114,130 108,129 103,126 Z" fill={getPartFill('legs')} stroke={getPartStroke('legs').color} strokeWidth={getPartStroke('legs').width} />
                        {/* Left Thigh */}
                        <Path d="M94,152 C88,172 82,192 84,212 C90,215 97,215 103,212 C107,192 108,172 106,152 C100,154 96,153 94,152 Z" fill={getPartFill('legs', 'left')} stroke={getPartStroke('legs', 'left').color} strokeWidth={getPartStroke('legs', 'left').width} />
                        {/* Right Thigh */}
                        <Path d="M146,152 C152,172 158,192 156,212 C150,215 143,215 137,212 C133,192 132,172 134,152 C140,154 144,153 146,152 Z" fill={getPartFill('legs', 'right')} stroke={getPartStroke('legs', 'right').color} strokeWidth={getPartStroke('legs', 'right').width} />
                        {/* Left Knee */}
                        <Path d="M88,212 C88,218 90,224 94,226 C98,226 101,222 103,218 C105,216 106,214 107,212 C101,215 94,215 88,212 Z" fill={getPartFill('knees', 'left')} stroke={getPartStroke('knees', 'left').color} strokeWidth={getPartStroke('knees', 'left').width} />
                        {/* Right Knee */}
                        <Path d="M152,212 C152,218 150,224 146,226 C142,226 139,222 137,218 C135,216 134,214 133,212 C139,215 146,215 152,212 Z" fill={getPartFill('knees', 'right')} stroke={getPartStroke('knees', 'right').color} strokeWidth={getPartStroke('knees', 'right').width} />
                        {/* Left Shin/Calf */}
                        <Path d="M94,226 C90,242 86,258 84,275 C88,277 93,277 97,275 C101,258 103,242 103,226 Z" fill={getPartFill('ankles', 'left')} stroke={getPartStroke('ankles', 'left').color} strokeWidth={getPartStroke('ankles', 'left').width} />
                        {/* Right Shin/Calf */}
                        <Path d="M146,226 C150,242 154,258 156,275 C152,277 147,277 143,275 C139,258 137,242 137,226 Z" fill={getPartFill('ankles', 'right')} stroke={getPartStroke('ankles', 'right').color} strokeWidth={getPartStroke('ankles', 'right').width} />
                        {/* Left Ankle & Foot */}
                        <Path d="M84,275 C82,282 80,289 77,296 C75,299 73,302 71,304 C70,305 71,306 72,306 C73,305 75,302 76,299 C77,301 76,304 75,306 C75,307 76,307 77,306 C78,304 79,301 80,298 C81,300 81,303 80,305 C80,306 81,306 82,305 C83,303 83,300 83,297 C84,299 85,301 85,303 C85,304 86,304 87,303 C87,301 87,298 86,295 C88,297 90,299 91,300 C92,300 93,299 93,298 C93,296 92,291 93,288 C95,283 96,279 97,275 Z" fill={getPartFill('ankles', 'left')} stroke={getPartStroke('ankles', 'left').color} strokeWidth={getPartStroke('ankles', 'left').width} />
                        {/* Right Ankle & Foot */}
                        <Path d="M156,275 C158,282 160,289 163,296 C165,299 167,302 169,304 C170,305 169,306 168,306 C167,305 165,302 164,299 C163,301 164,304 165,306 C165,307 164,307 163,306 C162,304 161,301 160,298 C159,300 159,303 160,305 C160,306 159,306 158,305 C157,303 157,300 157,297 C156,299 155,301 155,303 C155,304 154,304 153,303 C153,301 153,298 154,295 C152,297 150,299 149,300 C148,300 147,299 147,298 C147,296 148,291 147,288 C145,283 144,279 144,275 Z" fill={getPartFill('ankles', 'right')} stroke={getPartStroke('ankles', 'right').color} strokeWidth={getPartStroke('ankles', 'right').width} />
                    </>
                ) : (
                    /* ================= SILHOUETTE BACK VIEW ================= */
                    <>
                        {/* Head Base */}
                        <Path d="M120,10 C110,10 102,18 102,28 C102,36 107,43 113,45 C114,48 116,50 116,54 L124,54 C124,50 126,48 127,45 C133,43 138,36 138,28 C138,18 130,10 120,10 Z" fill={getPartFill('head')} stroke={getPartStroke('head').color} strokeWidth={getPartStroke('head').width} />
                        {/* Upper Back / Spine / Traps */}
                        <Path d="M120,54 C116,54 112,56 108,58 C104,60 99,62 98,64 C99,72 99,80 100,88 C106,90 113,92 120,92 C127,92 134,90 140,88 C141,80 141,72 142,64 C141,62 136,60 132,58 C128,56 124,54 120,54 Z" fill={getPartFill('back')} stroke={getPartStroke('back').color} strokeWidth={getPartStroke('back').width} />
                        {/* Lower Back / Lats */}
                        <Path d="M100,88 C100,100 102,114 105,126 C110,129 115,130 120,130 C125,130 130,129 135,126 C138,114 140,100 140,88 C134,90 127,92 120,92 C113,92 106,90 100,88 Z" fill={getPartFill('back')} stroke={getPartStroke('back').color} strokeWidth={getPartStroke('back').width} />
                        {/* Left Rear Shoulder */}
                        <Path d="M98,64 C92,60 84,65 80,73 C77,81 79,88 84,91 C88,88 94,84 98,82 C97,76 97,69 98,64 Z" fill={getPartFill('shoulders', 'left')} stroke={getPartStroke('shoulders', 'left').color} strokeWidth={getPartStroke('shoulders', 'left').width} />
                        {/* Right Rear Shoulder */}
                        <Path d="M142,64 C148,60 156,65 160,73 C163,81 161,88 156,91 C152,88 146,84 142,82 C143,76 143,69 142,64 Z" fill={getPartFill('shoulders', 'right')} stroke={getPartStroke('shoulders', 'right').color} strokeWidth={getPartStroke('shoulders', 'right').width} />
                        {/* Left Tricep */}
                        <Path d="M80,73 C76,82 72,96 73,119 C76,122 80,124 83,122 C86,109 88,96 84,88 C82,84 81,78 80,73 Z" fill={getPartFill('arms', 'left')} stroke={getPartStroke('arms', 'left').color} strokeWidth={getPartStroke('arms', 'left').width} />
                        {/* Right Tricep */}
                        <Path d="M160,73 C164,82 168,96 167,119 C164,122 160,124 157,122 C154,109 152,96 156,88 C158,84 159,78 160,73 Z" fill={getPartFill('arms', 'right')} stroke={getPartStroke('arms', 'right').color} strokeWidth={getPartStroke('arms', 'right').width} />
                        {/* Left Elbow */}
                        <Path d="M73,119 C72,122 72,126 74,129 C77,129 79,126 80,124 C81,124 82,123 83,122 C80,124 76,122 73,119 Z" fill={getPartFill('elbows', 'left')} stroke={getPartStroke('elbows', 'left').color} strokeWidth={getPartStroke('elbows', 'left').width} />
                        {/* Right Elbow */}
                        <Path d="M167,119 C168,122 168,126 166,129 C163,129 161,126 160,124 C159,124 158,123 157,122 C160,124 164,122 167,119 Z" fill={getPartFill('elbows', 'right')} stroke={getPartStroke('elbows', 'right').color} strokeWidth={getPartStroke('elbows', 'right').width} />
                        {/* Left Forearm & Hand */}
                        <Path d="M74,129 C71,139 67,152 64,162 C62,166 60,172 59,178 C59,179 60,180 61,179 C62,177 63,170 64,166 C65,170 66,182 66,183 C66,184 67,184 68,183 C68,181 67,170 67,165 C68,169 70,183 70,185 C70,186 71,186 72,185 C72,183 70,169 69,164 C71,168 73,180 74,182 C74,183 75,183 76,182 C76,180 73,167 71,163 C73,165 76,174 77,176 C77,177 78,177 78,175 C78,173 75,163 73,160 C77,149 80,136 80,129 Z" fill={getPartFill('arms', 'left')} stroke={getPartStroke('arms', 'left').color} strokeWidth={getPartStroke('arms', 'left').width} />
                        {/* Right Forearm & Hand */}
                        <Path d="M166,129 C169,139 173,152 176,162 C178,166 180,172 181,178 C181,179 180,180 179,179 C178,177 177,170 176,166 C175,170 174,182 174,183 C174,184 173,184 172,179 C172,177 173,166 173,161 C172,165 170,179 170,181 C170,182 169,182 168,181 C168,179 170,165 171,160 C169,164 167,176 166,178 C166,179 165,179 164,178 C164,176 167,163 169,159 C167,159 164,170 163,172 C163,173 162,173 162,171 C162,169 165,159 167,156 C163,149 160,136 160,129 Z" fill={getPartFill('arms', 'right')} stroke={getPartStroke('arms', 'right').color} strokeWidth={getPartStroke('arms', 'right').width} />
                        {/* Glutes */}
                        <Path d="M105,126 C99,133 96,142 96,152 C96,156 102,160 108,158 C116,156 124,156 132,158 C138,160 144,156 144,152 C144,142 141,133 135,126 C130,129 125,130 120,130 C115,130 110,129 105,126 Z" fill={getPartFill('legs')} stroke={getPartStroke('legs').color} strokeWidth={getPartStroke('legs').width} />
                        {/* Left Hamstring */}
                        <Path d="M96,152 C92,172 89,192 90,212 C96,215 103,215 109,212 C111,192 110,172 108,152 C102,154 98,153 96,152 Z" fill={getPartFill('legs', 'left')} stroke={getPartStroke('legs', 'left').color} strokeWidth={getPartStroke('legs', 'left').width} />
                        {/* Right Hamstring */}
                        <Path d="M144,152 C148,172 151,192 150,212 C144,215 137,215 131,212 C129,192 130,172 132,152 C138,154 142,153 144,152 Z" fill={getPartFill('legs', 'right')} stroke={getPartStroke('legs', 'right').color} strokeWidth={getPartStroke('legs', 'right').width} />
                        {/* Left Knee Back */}
                        <Path d="M90,212 C90,218 92,224 96,226 C100,226 103,222 105,218 C107,216 108,214 109,212 C103,215 96,215 90,212 Z" fill={getPartFill('knees', 'left')} stroke={getPartStroke('knees', 'left').color} strokeWidth={getPartStroke('knees', 'left').width} />
                        {/* Right Knee Back */}
                        <Path d="M150,212 C150,218 148,224 144,226 C140,226 137,222 135,218 C133,216 132,214 131,212 C137,215 144,215 150,212 Z" fill={getPartFill('knees', 'right')} stroke={getPartStroke('knees', 'right').color} strokeWidth={getPartStroke('knees', 'right').width} />
                        {/* Left Calf */}
                        <Path d="M96,226 C92,242 88,258 86,275 C90,277 95,277 99,275 C103,258 105,242 105,226 C101,228 98,228 96,226 Z" fill={getPartFill('ankles', 'left')} stroke={getPartStroke('ankles', 'left').color} strokeWidth={getPartStroke('ankles', 'left').width} />
                        {/* Right Calf */}
                        <Path d="M144,226 C148,242 152,258 154,275 C150,277 145,277 141,275 C137,258 135,242 135,226 C139,228 142,228 144,226 Z" fill={getPartFill('ankles', 'right')} stroke={getPartStroke('ankles', 'right').color} strokeWidth={getPartStroke('ankles', 'right').width} />
                        {/* Left Heel & Toes */}
                        <Path d="M86,275 C84,282 82,288 79,294 C77,297 75,300 73,302 C72,303 73,304 74,304 C75,303 77,300 78,297 C79,299 78,302 77,304 C77,305 78,305 79,304 C80,302 81,299 82,296 C83,298 83,301 82,303 C82,304 83,304 84,303 C85,301 85,298 85,295 C86,297 87,299 87,301 C87,302 88,302 89,301 C89,299 89,296 88,293 C90,295 92,297 93,298 C94,298 95,297 95,296 C95,294 94,289 95,286 C97,281 98,277 99,275 Z" fill={getPartFill('ankles', 'left')} stroke={getPartStroke('ankles', 'left').color} strokeWidth={getPartStroke('ankles', 'left').width} />
                        {/* Right Heel & Toes */}
                        <Path d="M157,275 C158,281 159,289 161,296 C163,299 165,302 167,304 C168,305 167,306 166,306 C165,305 163,302 162,299 Q161,301 162,304 C162,305 161,305 160,304 C159,302 158,299 157,296 C156,298 156,301 157,303 C157,304 156,304 155,303 C154,301 154,298 154,295 C153,297 151,299 150,301 C150,302 149,302 148,301 C148,299 148,296 147,293 C149,295 151,297 152,298 C153,298 154,297 154,296 C154,294 153,289 154,286 C156,281 156,277 157,275 Z" fill={getPartFill('ankles', 'right')} stroke={getPartStroke('ankles', 'right').color} strokeWidth={getPartStroke('ankles', 'right').width} />
                    </>
                )}
            </Svg>
        );
    };

    const renderActiveTimerWidget = () => {
        if (!activeTimer) return null;

        const progress = timeLeft / activeTimer.duration;

        return (
            <BlurView intensity={90} tint="light" style={styles.floatingTimerCard}>
                <View style={styles.timerInfoRow}>
                    <View style={styles.timerIconCircle}>
                        <Ionicons name="stopwatch" size={20} color="#06B6D4" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.timerTitleText} numberOfLines={1}>
                            {activeTimer.id.split('-')[0].toUpperCase()} HOLD
                        </Text>
                        <Text style={styles.timerSubtitleText}>Keep holding the position...</Text>
                    </View>
                    <Text style={styles.timerClockText}>{timeLeft}s</Text>
                </View>

                {/* Progress bar */}
                <View style={styles.timerProgressTrack}>
                    <View style={[styles.timerProgressFill, { width: `${progress * 100}%` }]} />
                </View>

                <View style={styles.timerControlsRow}>
                    <TouchableOpacity style={styles.timerControlBtn} onPress={toggleTimerPause}>
                        <Ionicons name={isTimerActive ? "pause" : "play"} size={18} color="#0F172A" />
                        <Text style={styles.timerControlBtnText}>{isTimerActive ? "PAUSE" : "RESUME"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.timerControlBtn, { backgroundColor: 'rgba(15, 23, 42, 0.05)' }]} onPress={resetTimer}>
                        <Ionicons name="refresh" size={16} color="#475569" />
                        <Text style={[styles.timerControlBtnText, { color: '#475569' }]}>RESET</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.timerCloseBtn} onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsTimerActive(false);
                        setActiveTimer(null);
                    }}>
                        <Ionicons name="close" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </BlurView>
        );
    };

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style="dark" />

            {/* Futuristic Tech Grid Lines */}
            <View style={styles.techGridOverlay} pointerEvents="none">
                <View style={styles.techGridLineV} />
                <View style={styles.techGridLineV} />
                <View style={styles.techGridLineH} />
            </View>

            <SafeAreaView style={styles.safeArea}>
                {/* Cyber-Med Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={[styles.backBtn, { borderColor: `${themeColors.accent}40` }]} onPress={() => navigation.goBack()}>
                        <BlurView intensity={40} tint="light" style={styles.backBlur}>
                            <Ionicons name="chevron-back" size={20} color={themeColors.accent} />
                        </BlurView>
                    </TouchableOpacity>

                    <BlurView intensity={30} tint="light" style={[styles.hudBadge, { borderColor: `${themeColors.accent}30` }]}>
                        <Animated.View style={[styles.hudPulseDot, { backgroundColor: themeColors.accent, transform: [{ scale: pulseWarningAnim }] }]} />
                        <Text style={[styles.hudBadgeText, { color: themeColors.accent }]}>SMART RECOVERY</Text>
                    </BlurView>

                    {phase === 'results' ? (
                        <TouchableOpacity style={styles.resetBtn} onPress={resetAnalysis}>
                            <BlurView intensity={40} tint="light" style={styles.resetBtnBlur}>
                                <Ionicons name="refresh" size={16} color="#EF4444" />
                            </BlurView>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
                </View>

                {phase === 'loading_profile' && (
                    <View style={styles.centerSpinner}>
                        <ActivityIndicator size="large" color={themeColors.accent} />
                        <Text style={styles.loadingProfileText}>Contacting Sports Clinic database...</Text>
                    </View>
                )}

                {phase !== 'loading_profile' && phase !== 'results' && (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        {/* Biomechanical Wireframe Model Viewing Deck */}
                        {phase !== 'questionnaire' && (
                            <View style={styles.hologramContainer}>
                                <Animated.View style={[styles.floatingModel, { transform: [{ translateY }, { rotateY }] }]}>
                                    <View style={styles.modelWrapper}>
                                        {renderBodySilhouette(200, 240)}

                                        {/* Scanning Beam Overlay (Only visible during 'analyzing') */}
                                        {phase === 'analyzing' && (
                                            <Animated.View
                                                style={[
                                                    styles.scanningBeam,
                                                    { transform: [{ translateY: scanBarAnim }] }
                                                ]}
                                            />
                                        )}
                                    </View>
                                </Animated.View>

                                {/* Neon glowing aura base below */}
                                <View style={styles.neonPlinth} />

                                {/* Perspective toggler */}
                                <TouchableOpacity style={[styles.viewToggleBtn, { borderColor: `${themeColors.accent}30` }]} activeOpacity={0.8} onPress={toggleView}>
                                    <BlurView intensity={35} tint="light" style={styles.viewToggleBlur}>
                                        <Ionicons name="sync" size={14} color={themeColors.accent} style={{ marginRight: 6 }} />
                                        <Text style={[styles.viewToggleText, { color: themeColors.accent }]}>{isFrontView ? 'FRONT VIEW' : 'BACK VIEW'}</Text>
                                    </BlurView>
                                </TouchableOpacity>

                                {/* Active Injury HUD warning markers */}
                                {activeInjuries.length > 0 && (
                                    <Animated.View style={[styles.activeInjuryHUDAlert, { transform: [{ scale: pulseWarningAnim }] }]}>
                                        <Ionicons name="warning" size={12} color="#EF4444" style={{ marginRight: 6 }} />
                                        <Text style={styles.activeInjuryHUDText}>
                                            {activeInjuries.length} ANATOMICAL {activeInjuries.length === 1 ? 'JOINT' : 'JOINTS'} FLAGGED
                                        </Text>
                                    </Animated.View>
                                )}
                            </View>
                        )}

                        {/* Interactive Questionnaire & Loader Content */}
                        <View style={styles.bottomControlDeck}>
                            {phase === 'scan_idle' && (
                                <View style={styles.scanIdleContent}>
                                    <Text style={styles.idleTitle}>BIOMECHANICAL SCAN READY</Text>
                                    <Text style={styles.idleSubtitle}>
                                        {activeInjuries.length > 0
                                            ? `Anatomical analysis indicates tissue load anomalies in your ${activeInjuries.map(p => PART_LABELS[p] || p).join(', ')}.`
                                            : 'No acute structural injuries are currently registered on your profile. You can still launch a preventive assessment.'}
                                    </Text>

                                    <TouchableOpacity style={styles.launchBtn} onPress={() => setPhase('questionnaire')}>
                                        <LinearGradient
                                            colors={themeColors.gradient || ['#06B6D4', '#0891B2']}
                                            style={styles.launchGrad}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            <Text style={styles.launchText}>START SYMPTOM ASSESSMENT</Text>
                                            <Ionicons name="pulse" size={18} color="#FFF" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {phase === 'questionnaire' && renderQuestionnaire()}
                            {phase === 'analyzing' && renderAnalyzing()}
                        </View>
                    </KeyboardAvoidingView>
                )}

                {/* Structured Results Roadmap View (Results Phase) */}
                {phase === 'results' && recoveryPlan && !selectedCategory && (
                    <ScrollView style={styles.dashboardContainer} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        {/* Premium Dashboard Header */}
                        <View style={styles.dashHeaderSection}>
                            <Text style={styles.dashboardTitle}>RECOVERY{'\n'}DASHBOARD</Text>
                            <View style={styles.dashHeaderRight}>
                                <View style={styles.dashScorePill}>
                                    <Text style={styles.dashScoreNumber}>{
                                        Math.round(((completedItems.length) / (
                                            (recoveryPlan?.stretching?.length || 0) +
                                            (recoveryPlan?.mobility_exercises?.length || 0) +
                                            (recoveryPlan?.supplements?.length || 0)
                                        || 1)) * 100)
                                    }%</Text>
                                    <Text style={styles.dashScoreLabel}>DONE</Text>
                                </View>
                            </View>
                        </View>

                        {/* Summary Stats Row */}
                        <View style={styles.summaryStatsRow}>
                            <BlurView intensity={50} tint="light" style={styles.summaryStatCard}>
                                <Ionicons name="fitness" size={18} color={themeColors.accent} />
                                <Text style={styles.summaryStatNumber}>{recoveryPlan?.stretching?.length || 0}</Text>
                                <Text style={styles.summaryStatLabel}>Stretches</Text>
                            </BlurView>
                            <BlurView intensity={50} tint="light" style={styles.summaryStatCard}>
                                <Ionicons name="sync" size={18} color="#10B981" />
                                <Text style={styles.summaryStatNumber}>{recoveryPlan?.mobility_exercises?.length || 0}</Text>
                                <Text style={styles.summaryStatLabel}>Mobility</Text>
                            </BlurView>
                            <BlurView intensity={50} tint="light" style={styles.summaryStatCard}>
                                <Ionicons name="leaf" size={18} color="#F59E0B" />
                                <Text style={styles.summaryStatNumber}>{recoveryPlan?.supplements?.length || 0}</Text>
                                <Text style={styles.summaryStatLabel}>Supps</Text>
                            </BlurView>
                            <BlurView intensity={50} tint="light" style={styles.summaryStatCard}>
                                <Ionicons name="ban" size={18} color="#EF4444" />
                                <Text style={styles.summaryStatNumber}>{recoveryPlan?.exercises_to_avoid?.length || 0}</Text>
                                <Text style={styles.summaryStatLabel}>Avoid</Text>
                            </BlurView>
                        </View>

                        {/* Visual Progress Hologram Card */}
                        <BlurView intensity={50} tint="light" style={styles.hologramCard}>
                            <View style={styles.hologramCardHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons name="accessibility" size={16} color="#06B6D4" />
                                    <Text style={styles.hologramCardTitle}>ANATOMICAL TRACKER</Text>
                                </View>
                                <TouchableOpacity style={styles.hologramToggleBtn} onPress={toggleView}>
                                    <Text style={styles.hologramToggleText}>{isFrontView ? 'FRONT' : 'BACK'}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.hologramVisualContainer}>
                                <Animated.View style={{ transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-4, 4] }) }] }}>
                                    {renderBodySilhouette(130, 160)}
                                </Animated.View>
                                <View style={styles.hologramLegend}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                                        <Text style={styles.legendText}>Active Pain</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                                        <Text style={styles.legendText}>Rehab Stage</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                                        <Text style={styles.legendText}>Recovered</Text>
                                    </View>
                                </View>
                            </View>
                        </BlurView>

                        <Text style={styles.dashSectionLabel}>SELECT CATEGORY</Text>

                        <View style={styles.dashboardGrid}>
                            {[
                                { key: 'analysis', icon: 'pulse', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', title: 'Pain Analysis', sub: 'Clinical overview', gradColors: ['#EF4444', '#F87171'] },
                                { key: 'stretching', icon: 'accessibility', color: themeColors.accent, bg: `${themeColors.accent}20`, title: 'Stretching', sub: `${recoveryPlan?.stretching?.length || 0} targeted moves`, gradColors: themeColors.gradient || ['#06B6D4', '#22D3EE'] },
                                { key: 'mobility', icon: 'sync', color: '#10B981', bg: 'rgba(16,185,129,0.12)', title: 'Mobility Rehab', sub: `${recoveryPlan?.mobility_exercises?.length || 0} active drills`, gradColors: ['#10B981', '#34D399'] },
                                { key: 'supplements', icon: 'leaf', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', title: 'Supplements', sub: `${recoveryPlan?.supplements?.length || 0} compounds`, gradColors: ['#F59E0B', '#FBBF24'] },
                                { key: 'avoid', icon: 'ban', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', title: 'Avoid Movements', sub: `${recoveryPlan?.exercises_to_avoid?.length || 0} restrictions`, gradColors: ['#EF4444', '#FB7185'] },
                                { key: 'ai', icon: 'sparkles', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', title: 'AI Clinical', sub: 'Smart recommendations', gradColors: ['#8B5CF6', '#A78BFA'] },
                            ].map((card, idx) => {
                                const animValue = cardAnims[idx];
                                const animatedScale = animValue.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
                                const animatedOpacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
                                const animatedTranslateY = animValue.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });

                                return (
                                    <Animated.View key={card.key} style={{
                                        width: '47%',
                                        opacity: animatedOpacity,
                                        transform: [{ scale: animatedScale }, { translateY: animatedTranslateY }]
                                    }}>
                                        <TouchableOpacity
                                            style={styles.dashCard}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                setSelectedCategory(card.key);
                                            }}
                                        >
                                            <LinearGradient
                                                colors={card.gradColors}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.dashCardGradientAccent}
                                            />
                                            <View style={[styles.dashIconBox, { backgroundColor: card.bg }]}>
                                                <Ionicons name={card.icon} size={26} color={card.color} />
                                            </View>
                                            <Text style={styles.dashCardTitle}>{card.title}</Text>
                                            <Text style={styles.dashCardSub}>{card.sub}</Text>
                                            <View style={styles.dashCardArrowRow}>
                                                <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
                                            </View>
                                        </TouchableOpacity>
                                    </Animated.View>
                                );
                            })}
                        </View>
                    </ScrollView>
                )}

                {phase === 'results' && selectedCategory && (
                    <View style={styles.detailContainer}>
                        <TouchableOpacity style={styles.detailBackBtn} onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedCategory(null);
                        }}>
                            <BlurView intensity={40} tint="light" style={styles.detailBackBlur}>
                                <Ionicons name="arrow-back" size={16} color="#06B6D4" />
                                <Text style={styles.detailBackText}>DASHBOARD</Text>
                            </BlurView>
                        </TouchableOpacity>
                        
                        <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultsScrollPadding}>
                            
                            {selectedCategory === 'analysis' && (
                                <BlurView intensity={60} tint="light" style={styles.resultGlassCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                            <Ionicons name="pulse" size={20} color="#EF4444" />
                                        </View>
                                        <Text style={styles.cardHeading}>CLINICAL BIOMECHANICAL ANALYSIS</Text>
                                    </View>
                                    <Text style={styles.cardParagraph}>{recoveryPlan.pain_analysis}</Text>
                                </BlurView>
                            )}

                            {selectedCategory === 'stretching' && (
                                <View>
                                    <View style={styles.interactiveProgressCard}>
                                        <View style={styles.progressHeader}>
                                            <Text style={styles.progressTitle}>DAILY STRETCHING PROTOCOL</Text>
                                            <Text style={styles.progressBadge}>
                                                {recoveryPlan.stretching?.filter((_, idx) => completedItems.includes(`stretching-${idx}`)).length || 0} / {recoveryPlan.stretching?.length || 0} COMPLETED
                                            </Text>
                                        </View>
                                        <View style={styles.progressBarTrack}>
                                            <View style={[
                                                styles.progressBarFill, 
                                                { 
                                                    width: `${((recoveryPlan.stretching?.filter((_, idx) => completedItems.includes(`stretching-${idx}`)).length || 0) / (recoveryPlan.stretching?.length || 1)) * 100}%`, 
                                                    backgroundColor: '#06B6D4' 
                                                }
                                            ]} />
                                        </View>
                                    </View>

                                    <BlurView intensity={60} tint="light" style={styles.resultGlassCard}>
                                        <View style={styles.cardHeaderRow}>
                                            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                                                <Ionicons name="accessibility" size={20} color="#06B6D4" />
                                            </View>
                                            <Text style={styles.cardHeading}>TARGETED STATIC STRETCHING</Text>
                                        </View>
                                        {recoveryPlan.stretching?.map((item, idx) => {
                                            const itemId = `stretching-${idx}`;
                                            const isDone = completedItems.includes(itemId);
                                            return (
                                                <View key={idx} style={[styles.rehabItem, isDone && styles.rehabItemCompleted]}>
                                                    <View style={styles.rehabItemHeaderRow}>
                                                        <Text style={[styles.rehabItemTitle, isDone && styles.rehabItemTitleCompleted]}>
                                                            {item.name.toUpperCase()}
                                                        </Text>
                                                        <TouchableOpacity 
                                                            style={[styles.itemCheckCircle, isDone && styles.itemCheckCircleCompleted]} 
                                                            onPress={() => toggleItemCompleted(itemId)}
                                                        >
                                                            <Ionicons name={isDone ? "checkmark-circle" : "ellipse-outline"} size={22} color={isDone ? "#10B981" : "#94A3B8"} />
                                                        </TouchableOpacity>
                                                    </View>
                                                    
                                                    <View style={styles.rehabMetaRow}>
                                                        <Text style={styles.rehabMetaLabel}>SETS/HOLD: <Text style={{ color: '#0F172A' }}>{item.sets}</Text></Text>
                                                        <Text style={styles.rehabMetaLabel}>FREQ: <Text style={{ color: '#0F172A' }}>{item.frequency}</Text></Text>
                                                    </View>
                                                    <Text style={styles.rehabItemGuide}>{item.guide}</Text>

                                                    <View style={styles.itemActionsRow}>
                                                        <TouchableOpacity 
                                                            style={styles.itemActionTimerBtn} 
                                                            onPress={() => startTimer(itemId, item.sets)}
                                                        >
                                                            <Ionicons name="stopwatch" size={14} color="#06B6D4" />
                                                            <Text style={styles.itemActionTimerBtnText}>START TIMER</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </BlurView>
                                </View>
                            )}

                            {selectedCategory === 'mobility' && (
                                <View>
                                    <View style={styles.interactiveProgressCard}>
                                        <View style={styles.progressHeader}>
                                            <Text style={styles.progressTitle}>DAILY MOBILITY GOAL</Text>
                                            <Text style={[styles.progressBadge, { color: '#10B981' }]}>
                                                {recoveryPlan.mobility_exercises?.filter((_, idx) => completedItems.includes(`mobility-${idx}`)).length || 0} / {recoveryPlan.mobility_exercises?.length || 0} COMPLETED
                                            </Text>
                                        </View>
                                        <View style={styles.progressBarTrack}>
                                            <View style={[
                                                styles.progressBarFill, 
                                                { 
                                                    width: `${((recoveryPlan.mobility_exercises?.filter((_, idx) => completedItems.includes(`mobility-${idx}`)).length || 0) / (recoveryPlan.mobility_exercises?.length || 1)) * 100}%`, 
                                                    backgroundColor: '#10B981' 
                                                }
                                            ]} />
                                        </View>
                                    </View>

                                    <BlurView intensity={60} tint="light" style={styles.resultGlassCard}>
                                        <View style={styles.cardHeaderRow}>
                                            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                                                <Ionicons name="sync" size={20} color="#10B981" />
                                            </View>
                                            <Text style={styles.cardHeading}>ACTIVE JOINT MOBILITY REHAB</Text>
                                        </View>
                                        {recoveryPlan.mobility_exercises?.map((item, idx) => {
                                            const itemId = `mobility-${idx}`;
                                            const isDone = completedItems.includes(itemId);
                                            return (
                                                <View key={idx} style={[styles.rehabItem, isDone && styles.rehabItemCompleted]}>
                                                    <View style={styles.rehabItemHeaderRow}>
                                                        <Text style={[styles.rehabItemTitle, { color: '#10B981' }, isDone && styles.rehabItemTitleCompleted]}>
                                                            {item.name.toUpperCase()}
                                                        </Text>
                                                        <TouchableOpacity 
                                                            style={[styles.itemCheckCircle, isDone && styles.itemCheckCircleCompleted]} 
                                                            onPress={() => toggleItemCompleted(itemId)}
                                                        >
                                                            <Ionicons name={isDone ? "checkmark-circle" : "ellipse-outline"} size={22} color={isDone ? "#10B981" : "#94A3B8"} />
                                                        </TouchableOpacity>
                                                    </View>

                                                    <View style={styles.rehabMetaRow}>
                                                        <Text style={styles.rehabMetaLabel}>SETS: <Text style={{ color: '#0F172A' }}>{item.sets}</Text></Text>
                                                        <Text style={styles.rehabMetaLabel}>REPS: <Text style={{ color: '#0F172A' }}>{item.reps}</Text></Text>
                                                    </View>
                                                    <Text style={styles.rehabItemGuide}>{item.guide}</Text>

                                                    <View style={styles.itemActionsRow}>
                                                        <TouchableOpacity 
                                                            style={[styles.itemActionTimerBtn, { borderColor: 'rgba(16, 185, 129, 0.3)' }]} 
                                                            onPress={() => startTimer(itemId, "60s")}
                                                        >
                                                            <Ionicons name="stopwatch" size={14} color="#10B981" />
                                                            <Text style={[styles.itemActionTimerBtnText, { color: '#10B981' }]}>START TIMER</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </BlurView>
                                </View>
                            )}

                            {selectedCategory === 'supplements' && (
                                <View>
                                    <View style={styles.interactiveProgressCard}>
                                        <View style={styles.progressHeader}>
                                            <Text style={styles.progressTitle}>DAILY SUPPLEMENT STACK</Text>
                                            <Text style={[styles.progressBadge, { color: '#F59E0B' }]}>
                                                {recoveryPlan.supplements?.filter((_, idx) => completedItems.includes(`supplements-${idx}`)).length || 0} / {recoveryPlan.supplements?.length || 0} TAKEN
                                            </Text>
                                        </View>
                                        <View style={styles.progressBarTrack}>
                                            <View style={[
                                                styles.progressBarFill, 
                                                { 
                                                    width: `${((recoveryPlan.supplements?.filter((_, idx) => completedItems.includes(`supplements-${idx}`)).length || 0) / (recoveryPlan.supplements?.length || 1)) * 100}%`, 
                                                    backgroundColor: '#F59E0B' 
                                                }
                                            ]} />
                                        </View>
                                    </View>

                                    <BlurView intensity={60} tint="light" style={styles.resultGlassCard}>
                                        <View style={styles.cardHeaderRow}>
                                            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                                                <Ionicons name="leaf" size={20} color="#F59E0B" />
                                            </View>
                                            <Text style={styles.cardHeading}>CELLULAR REPAIR & SUPPLEMENTS</Text>
                                        </View>
                                        {recoveryPlan.supplements?.map((item, idx) => {
                                            const itemId = `supplements-${idx}`;
                                            const isDone = completedItems.includes(itemId);
                                            return (
                                                <View key={idx} style={[styles.suppItem, isDone && styles.rehabItemCompleted]}>
                                                    <View style={styles.suppTop}>
                                                        <Text style={[styles.suppName, isDone && styles.rehabItemTitleCompleted]}>{item.name.toUpperCase()}</Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                            <Text style={styles.suppDosage}>{item.dosage}</Text>
                                                            <TouchableOpacity 
                                                                onPress={() => toggleItemCompleted(itemId)}
                                                            >
                                                                <Ionicons name={isDone ? "checkmark-circle" : "ellipse-outline"} size={22} color={isDone ? "#10B981" : "#94A3B8"} />
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.suppReason}>{item.reason}</Text>
                                                </View>
                                            );
                                        })}
                                    </BlurView>
                                </View>
                            )}

                            {selectedCategory === 'avoid' && (
                                <BlurView intensity={60} tint="light" style={styles.resultGlassCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                            <Ionicons name="ban" size={20} color="#EF4444" />
                                        </View>
                                        <Text style={styles.cardHeading}>EXERCISES TO AVOID COMPLETELY</Text>
                                    </View>
                                    {recoveryPlan.exercises_to_avoid?.map((item, idx) => (
                                        <View key={idx} style={styles.avoidItem}>
                                            <View style={styles.avoidDotRow}>
                                                <Ionicons name="close-circle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                                                <Text style={styles.avoidItemTitle}>{item.name.toUpperCase()}</Text>
                                            </View>
                                            <Text style={styles.avoidItemReason}>{item.reason}</Text>
                                        </View>
                                    ))}
                                </BlurView>
                            )}

                            {selectedCategory === 'ai' && (
                                <BlurView intensity={60} tint="light" style={styles.resultGlassCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.cardIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                                            <Ionicons name="sparkles" size={20} color="#8B5CF6" />
                                        </View>
                                        <Text style={styles.cardHeading}>AI CLINICAL RECOMMENDATIONS</Text>
                                    </View>
                                    <View style={styles.recItem}>
                                        <Text style={styles.recLabel}>ESTIMATED HEALING TIMELINE</Text>
                                        <Text style={styles.recValue}>{recoveryPlan.ai_recommendations?.estimated_timeline}</Text>
                                    </View>
                                    <View style={styles.recItem}>
                                        <Text style={styles.recLabel}>HYDRATION PROTOCOL</Text>
                                        <Text style={styles.recValue}>{recoveryPlan.ai_recommendations?.hydration}</Text>
                                    </View>
                                    <View style={styles.recItem}>
                                        <Text style={styles.recLabel}>REST & REPAIR SLEEP</Text>
                                        <Text style={styles.recValue}>{recoveryPlan.ai_recommendations?.sleep}</Text>
                                    </View>
                                    <View style={styles.recItem}>
                                        <Text style={styles.recLabel}>POSTURE & ALIGNMENT CORRECTIONS</Text>
                                        <Text style={styles.recValue}>{recoveryPlan.ai_recommendations?.posture}</Text>
                                    </View>
                                </BlurView>
                            )}
                            <View style={{ height: 60 }} />
                        </ScrollView>
                    </View>
                )}
            </SafeAreaView>
            {renderActiveTimerWidget()}
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    techGridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.04,
    },
    techGridLineV: {
        position: 'absolute',
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        left: width * 0.33,
    },
    techGridLineH: {
        position: 'absolute',
        height: 1,
        width: '100%',
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        top: height * 0.44,
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.25)',
    },
    backBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hudBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.2)',
        overflow: 'hidden',
    },
    hudPulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#06B6D4',
        marginRight: 6,
    },
    hudBadgeText: {
        color: '#06B6D4',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    resetBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    resetBtnBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerSpinner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingProfileText: {
        color: '#475569',
        fontSize: 13,
        marginTop: 12,
        fontWeight: '600',
    },
    hologramContainer: {
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 10,
        marginTop: 10,
    },
    floatingModel: {
        width: 200,
        height: 240,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    modelWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    svgFigure: {
        overflow: 'visible',
    },
    neonPlinth: {
        position: 'absolute',
        bottom: 35,
        width: 110,
        height: 12,
        borderRadius: 55,
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        opacity: 0.1,
        transform: [{ scaleX: 1.4 }],
        filter: 'blur(8px)',
    },
    viewToggleBtn: {
        position: 'absolute',
        right: 10,
        top: 15,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.2)',
        zIndex: 10,
    },
    viewToggleBlur: {
        flexDirection: 'row',
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignItems: 'center',
    },
    viewToggleText: {
        color: '#06B6D4',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
    },
    activeInjuryHUDAlert: {
        position: 'absolute',
        left: 10,
        top: 15,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 0.8,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
    },
    activeInjuryHUDText: {
        color: '#EF4444',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
    },
    scanningBeam: {
        position: 'absolute',
        width: '80%',
        height: 2,
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        opacity: 0.8,
        shadowColor: '#06B6D4',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    bottomControlDeck: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: 20,
    },
    scanIdleContent: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    idleTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 2,
        marginBottom: 8,
    },
    idleSubtitle: {
        fontSize: 11,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 16,
        marginBottom: 25,
    },
    launchBtn: {
        width: '100%',
        height: 52,
        borderRadius: 16,
        overflow: 'hidden',
    },
    launchGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    launchText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    questionPanel: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
    },
    questionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    qBackBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qProgressText: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: '800',
    },
    qProgressTrack: {
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 1.5,
        overflow: 'hidden',
        marginBottom: 20,
    },
    qProgressFill: {
        height: '100%',
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
    },
    questionContent: {
        minHeight: 180,
        justifyContent: 'center',
    },
    questionTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    questionSubtitle: {
        fontSize: 11,
        color: '#475569',
        lineHeight: 16,
        marginBottom: 15,
    },
    questionInput: {
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
        borderRadius: 12,
        padding: 15,
        color: '#0F172A',
        fontSize: 13,
        height: 80,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.08)',
    },
    choiceScroll: {
        maxHeight: 130,
    },
    choicesGrid: {
        gap: 10,
    },
    choiceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.05)',
        borderRadius: 12,
        padding: 12,
        gap: 10,
    },
    choiceBtnActive: {
        backgroundColor: 'rgba(6, 182, 212, 0.08)',
        borderColor: 'rgba(6, 182, 212, 0.3)',
    },
    choiceText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '600',
    },
    choiceTextActive: {
        color: '#06B6D4',
        fontWeight: '800',
    },
    sliderWrapper: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    sliderValueText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 1,
    },
    sliderSubText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
        marginVertical: 10,
        textAlign: 'center',
    },
    painNumberRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
        marginTop: 5,
    },
    painNumBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.02)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    painNumBtnActive: {
        borderColor: '#06B6D4',
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
    },
    painNumText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: 'bold',
    },
    painNumTextActive: {
        color: '#0F172A',
    },
    qNextBtn: {
        marginTop: 20,
        height: 48,
        borderRadius: 14,
        overflow: 'hidden',
    },
    qNextGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    qNextText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    scanningHUDEffect: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.2)',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        alignItems: 'center',
    },
    scanningTitle: {
        color: '#0E7490',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 5,
        textAlign: 'center',
    },
    scanningSubtitle: {
        color: '#64748B',
        fontSize: 10,
        textAlign: 'center',
        lineHeight: 14,
        marginBottom: 20,
    },
    scrollingHUDLog: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
        gap: 6,
    },
    hudLogLine: {
        fontSize: 8,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    resultsScrollPadding: {
        paddingTop: 10,
        paddingBottom: 50,
    },
    disclaimerContainer: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    disclaimerBlur: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        alignItems: 'flex-start',
    },
    disclaimerTitle: {
        color: '#EF4444',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 2,
    },
    disclaimerText: {
        color: 'rgba(15, 23, 42, 0.6)',
        fontSize: 9,
        lineHeight: 13,
        fontWeight: '600',
    },
    resultGlassCard: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 20,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 12,
    },
    cardIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardHeading: {
        color: '#0F172A',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    cardParagraph: {
        color: '#475569',
        fontSize: 11,
        lineHeight: 16,
    },
    rehabItem: {
        borderBottomWidth: 0.8,
        borderBottomColor: 'rgba(15, 23, 42, 0.05)',
        paddingVertical: 12,
        gap: 4,
    },
    rehabItemTitle: {
        color: '#06B6D4',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    rehabMetaRow: {
        flexDirection: 'row',
        gap: 15,
        marginVertical: 2,
    },
    rehabMetaLabel: {
        fontSize: 8,
        color: '#64748B',
        fontWeight: '900',
    },
    rehabItemGuide: {
        color: '#475569',
        fontSize: 10,
        lineHeight: 14,
    },
    suppItem: {
        borderBottomWidth: 0.8,
        borderBottomColor: 'rgba(15, 23, 42, 0.05)',
        paddingVertical: 12,
        gap: 4,
    },
    suppTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    suppName: {
        color: '#F59E0B',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    suppDosage: {
        color: '#0F172A',
        fontSize: 9,
        fontWeight: 'bold',
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    suppReason: {
        color: '#475569',
        fontSize: 10,
        lineHeight: 14,
    },
    avoidItem: {
        borderBottomWidth: 0.8,
        borderBottomColor: 'rgba(15, 23, 42, 0.05)',
        paddingVertical: 12,
        gap: 4,
    },
    avoidDotRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avoidItemTitle: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    avoidItemReason: {
        color: '#475569',
        fontSize: 10,
        lineHeight: 14,
    },
    recItem: {
        borderBottomWidth: 0.8,
        borderBottomColor: 'rgba(15, 23, 42, 0.05)',
        paddingVertical: 12,
        gap: 2,
    },
    recLabel: {
        color: '#8B5CF6',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    recValue: {
        color: '#475569',
        fontSize: 10,
        lineHeight: 14,
    },
    hologramCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
    },
    hologramCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    hologramCardTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 1.5,
    },
    hologramToggleBtn: {
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 0.8,
        borderColor: 'rgba(6, 182, 212, 0.2)',
    },
    hologramToggleText: {
        fontSize: 8,
        color: '#06B6D4',
        fontWeight: '900',
        letterSpacing: 1,
    },
    hologramVisualContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    hologramLegend: {
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
    },
    dashboardContainer: {
        flex: 1,
        paddingTop: 5,
    },
    dashHeaderSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    dashHeaderRight: {
        alignItems: 'flex-end',
    },
    dashScorePill: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    dashScoreNumber: {
        fontSize: 22,
        fontWeight: '900',
        color: '#10B981',
    },
    dashScoreLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1.5,
    },
    summaryStatsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    summaryStatCard: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: 'center',
        gap: 4,
        borderWidth: 0.8,
        borderColor: 'rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
    },
    summaryStatNumber: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    summaryStatLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    dashSectionLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 2,
        marginBottom: 14,
    },
    dashboardTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 0.5,
        lineHeight: 30,
    },
    dashboardSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 20,
    },
    dashboardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 14,
    },
    dashCard: {
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.06)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 4,
        overflow: 'hidden',
    },
    dashCardGradientAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
    },
    dashIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    dashCardTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 3,
    },
    dashCardSub: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
    },
    dashCardArrowRow: {
        alignItems: 'flex-end',
        marginTop: 8,
    },
    detailContainer: {
        flex: 1,
    },
    detailBackBtn: {
        alignSelf: 'flex-start',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.2)',
    },
    detailBackBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 6,
    },
    detailBackText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#06B6D4',
        letterSpacing: 1,
    },
    detailScroll: {
        flex: 1,
    },
    floatingTimerCard: {
        position: 'absolute',
        bottom: 25,
        left: 20,
        right: 20,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.25)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        gap: 12,
    },
    timerInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timerIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(6, 182, 212, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerTitleText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 1,
    },
    timerSubtitleText: {
        fontSize: 10,
        color: '#64748B',
    },
    timerClockText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#06B6D4',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    timerProgressTrack: {
        height: 4,
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    timerProgressFill: {
        height: '100%',
        backgroundColor: '#06B6D4',
    },
    timerControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    timerControlBtn: {
        flex: 1,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    timerControlBtnText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#06B6D4',
        letterSpacing: 0.8,
    },
    timerCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    interactiveProgressCard: {
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.05)',
        marginBottom: 15,
        gap: 10,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#475569',
        letterSpacing: 1,
    },
    progressBadge: {
        fontSize: 9,
        fontWeight: '900',
        color: '#06B6D4',
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    rehabItemCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.02)',
        opacity: 0.8,
    },
    rehabItemTitleCompleted: {
        textDecorationLine: 'line-through',
        color: '#94A3B8',
    },
    rehabItemHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemCheckCircle: {
        padding: 4,
    },
    itemCheckCircleCompleted: {
        transform: [{ scale: 1.05 }],
    },
    itemActionsRow: {
        flexDirection: 'row',
        marginTop: 8,
    },
    itemActionTimerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 0.8,
        borderColor: 'rgba(6, 182, 212, 0.3)',
        backgroundColor: 'rgba(255,255,255,0.6)',
        gap: 6,
    },
    itemActionTimerBtnText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#06B6D4',
        letterSpacing: 0.5,
    },
    qSkipBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(6, 182, 212, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qSkipText: {
        color: '#06B6D4',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.2,
    },
});

export default BodyRecoveryScreen;
