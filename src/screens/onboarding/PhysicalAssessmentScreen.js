import React, { useState, useEffect, useRef } from 'react';
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
    Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/Theme';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Map joint parts to human readable labels for selector buttons
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
    "Analyzing Biomechanical Alignment...",
    "Scanning Muscle Imbalances...",
    "Calibrating Joint Injury Safety...",
    "Mapping Posture Deviations...",
    "Optimizing Plan Parameters..."
];

const PhysicalAssessmentScreen = ({ navigation, route }) => {
    const { userData } = route.params || {};

    // Steps definition
    const STEPS = [
        {
            id: 'injuries',
            title: 'INJURIES & ACUTE PAIN',
            subtitle: 'Tap specific muscle groups directly on the shaded 3D model or select them below to flag acute injury/pain areas.',
            icon: 'pulse'
        },
        {
            id: 'strength',
            title: 'STRENGTH SYMMETRY',
            subtitle: 'Specify force dominance for both your upper and lower body separately to customize AI loading.',
            icon: 'barbell-outline'
        },
        {
            id: 'posture',
            title: 'POSTURAL METRICS',
            subtitle: 'Select any posture deviations to prescribe targeted corrective prehab movements.',
            icon: 'body-outline'
        },
        {
            id: 'mobility',
            title: 'MOBILITY LIMITATIONS',
            subtitle: 'Select joint limitations to avoid dangerous load ranges and integrate corrective active mobility drills.',
            icon: 'sync-outline'
        },
        {
            id: 'summary',
            title: 'SAFETY SUMMARY',
            subtitle: 'Optionally detail any chronic pain or specify particular movements to avoid completely.',
            icon: 'shield-checkmark-outline'
        }
    ];

    // Onboarding Assessment State
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [injuredParts, setInjuredParts] = useState([]);
    const [strongSideUpper, setStrongSideUpper] = useState('symmetric'); // symmetric, left, right
    const [strongSideLower, setStrongSideLower] = useState('symmetric'); // symmetric, left, right
    const [postureProblems, setPostureProblems] = useState([]); // rounded_shoulders, forward_head, tilt, none
    const [mobilityLimitations, setMobilityLimitations] = useState([]); // tight_hips, stiff_ankles, tight_hamstrings, none
    const [avoidAreas, setAvoidAreas] = useState('');
    const [chronicPain, setChronicPain] = useState('');

    // Cyber HUD view states
    const [isFrontView, setIsFrontView] = useState(true);
    const [hudTextIndex, setHudTextIndex] = useState(0);

    // Animations
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0.2)).current;
    const hudFadeAnim = useRef(new Animated.Value(1)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    // Levitation (breathing) idle loop
    const floatAnim = useRef(new Animated.Value(0)).current;

    // Front/Back Y-Axis Rotation
    const flipAnim = useRef(new Animated.Value(0)).current;

    // Start levitation animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 1,
                    duration: 2200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true
                })
            ])
        ).start();
    }, []);

    // Cycling floating HUD text
    useEffect(() => {
        const interval = setInterval(() => {
            Animated.sequence([
                Animated.timing(hudFadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                Animated.timing(hudFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true })
            ]).start();

            setTimeout(() => {
                setHudTextIndex(prev => (prev + 1) % HUD_TEXTS.length);
            }, 400);
        }, 4500);
        return () => clearInterval(interval);
    }, []);

    // Update progress tracker
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: (currentStepIndex + 1) / STEPS.length,
            duration: 350,
            useNativeDriver: false
        }).start();
    }, [currentStepIndex]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    const translateY = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-6, 6]
    });

    // 180-degree card flip transition
    const toggleView = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const toValue = isFrontView ? 180 : 0;

        Animated.timing(flipAnim, {
            toValue,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
        }).start();

        // Swap visual SVG layout halfway through (at 90 degrees)
        setTimeout(() => {
            setIsFrontView(!isFrontView);
        }, 300);
    };

    const rotateY = flipAnim.interpolate({
        inputRange: [0, 180],
        outputRange: ['0deg', '180deg']
    });

    // Tap body parts directly
    const handlePartTap = (part, side = null) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const partKey = side ? `${part}_${side}` : part;

        if (currentStepIndex === 0) {
            // Injured parts selection (side specific)
            setInjuredParts(prev => {
                if (prev.includes(partKey)) {
                    return prev.filter(p => p !== partKey);
                } else {
                    return [...prev, partKey];
                }
            });
        } else if (currentStepIndex === 1) {
            // Strength side selection
            const isUpper = (part === 'arms' || part === 'shoulders' || part === 'elbows');
            const isLower = (part === 'legs' || part === 'knees' || part === 'ankles');

            if (isUpper) {
                setStrongSideUpper(prev => prev === 'left' ? 'right' : prev === 'right' ? 'symmetric' : 'left');
            } else if (isLower) {
                setStrongSideLower(prev => prev === 'left' ? 'right' : prev === 'right' ? 'symmetric' : 'left');
            }
        }
    };

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (currentStepIndex === STEPS.length - 1) {
            // Combine upper/lower strength parameters into a single string for storage
            const combinedStrength = `Upper Body: ${strongSideUpper.toUpperCase()}, Lower Body: ${strongSideLower.toUpperCase()}`;

            // Save state & navigate forward to DietaryPreferences
            navigation.navigate('DietaryPreference', {
                userData: {
                    ...userData,
                    injuries: injuredParts.join(','),
                    pain_points: injuredParts.map(p => PART_LABELS[p] || p).join(','),
                    strong_side: combinedStrength,
                    posture_problems: postureProblems.join(','),
                    mobility_limitations: mobilityLimitations.join(','),
                    avoid_areas: avoidAreas,
                    chronic_pain: chronicPain
                }
            });
            return;
        }

        // Animate step transition
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: -width * 0.2, duration: 180, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true })
        ]).start(() => {
            setCurrentStepIndex(prev => prev + 1);
            slideAnim.setValue(width * 0.2);
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true })
            ]).start();
        });
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (currentStepIndex === 0) {
            navigation.goBack();
            return;
        }

        Animated.parallel([
            Animated.timing(slideAnim, { toValue: width * 0.2, duration: 180, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true })
        ]).start(() => {
            setCurrentStepIndex(prev => prev - 1);
            slideAnim.setValue(-width * 0.2);
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true })
            ]).start();
        });
    };

    // Toggle multi-select lists
    const toggleArrayItem = (item, list, setList) => {
        Haptics.selectionAsync();
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            if (item === 'none') {
                setList(['none']);
            } else {
                setList([...list.filter(i => i !== 'none'), item]);
            }
        }
    };

    // Determine fill gradient for body paths based on selection states
    const getPartFill = (part, side = null) => {
        const partKey = side ? `${part}_${side}` : part;

        // Step 1 & Summary: Injuries
        if (currentStepIndex === 0 || currentStepIndex === 4) {
            if (injuredParts.includes(partKey)) {
                return 'url(#grad-injured)'; // Glowing Red for injury
            }
        }

        // Step 2: Strength Symmetry (Specific to upper/lower and left/right side)
        if (currentStepIndex === 1 || currentStepIndex === 4) {
            const isUpper = (part === 'arms' || part === 'shoulders' || part === 'elbows');
            const isLower = (part === 'legs' || part === 'knees' || part === 'ankles');

            if (isUpper) {
                if (strongSideUpper === 'left' && side === 'left') return 'url(#grad-strong)';
                if (strongSideUpper === 'right' && side === 'right') return 'url(#grad-strong)';
            }
            if (isLower) {
                if (strongSideLower === 'left' && side === 'left') return 'url(#grad-strong)';
                if (strongSideLower === 'right' && side === 'right') return 'url(#grad-strong)';
            }
        }

        // Step 3: Posture
        if (currentStepIndex === 2 || currentStepIndex === 4) {
            if (postureProblems.includes('rounded_shoulders') && part === 'shoulders') {
                return 'url(#grad-warning)'; // Glowing Amber
            }
            if (postureProblems.includes('forward_head') && part === 'head') {
                return 'url(#grad-warning)';
            }
            if (postureProblems.includes('tilt') && part === 'legs') {
                return 'url(#grad-warning)';
            }
        }

        // Step 4: Mobility
        if (currentStepIndex === 3 || currentStepIndex === 4) {
            if (mobilityLimitations.includes('tight_hips') && part === 'legs') {
                return 'url(#grad-warning)';
            }
            if (mobilityLimitations.includes('stiff_ankles') && part === 'ankles') {
                return 'url(#grad-warning)';
            }
            if (mobilityLimitations.includes('tight_hamstrings') && (part === 'legs' || part === 'knees')) {
                return 'url(#grad-warning)';
            }
        }

        // Default Normal Premium Metallic Gray/Blue Gradient
        return 'url(#grad-normal)';
    };

    // Determine stroke styling for individual body paths
    const getPartStroke = (part, side = null) => {
        const fill = getPartFill(part, side);
        if (fill === 'url(#grad-injured)') return { color: '#EF4444', width: 2.2 };
        if (fill === 'url(#grad-strong)') return { color: '#06B6D4', width: 2.2 };
        if (fill === 'url(#grad-warning)') return { color: '#F59E0B', width: 2.2 };
        return { color: 'rgba(16, 185, 129, 0.3)', width: 1 }; // Soft green wire edges for light theme
    };

    // Options UI selectors
    const renderHUDOptions = () => {
        const step = STEPS[currentStepIndex];

        if (step.id === 'injuries') {
            return (
                <View style={styles.optionsContainer}>
                    <Text style={styles.panelHeader}>SELECT PAIN / INJURY SITES</Text>
                    <ScrollView style={styles.panelScroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.quickGrid}>
                            {Object.keys(PART_LABELS).map((part) => {
                                if (part === 'back' && isFrontView) return null; // Only show relevant to current perspective
                                if (part === 'chest' && !isFrontView) return null;

                                const isSelected = injuredParts.includes(part);
                                return (
                                    <TouchableOpacity
                                        key={part}
                                        style={[
                                            styles.tagOption,
                                            isSelected && styles.tagOptionInjured
                                        ]}
                                        onPress={() => handlePartTap(part)}
                                    >
                                        <Ionicons
                                            name={isSelected ? "flame" : "pulse-outline"}
                                            size={15}
                                            color={isSelected ? '#FFF' : '#64748B'}
                                        />
                                        <Text style={[styles.tagOptionText, isSelected && styles.tagOptionTextSelected]}>
                                            {PART_LABELS[part].toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            );
        }

        if (step.id === 'strength') {
            const options = [
                { id: 'left', label: 'LEFT DOMINANT', icon: 'chevron-back-outline' },
                { id: 'symmetric', label: 'SYMMETRIC', icon: 'git-commit-outline' },
                { id: 'right', label: 'RIGHT DOMINANT', icon: 'chevron-forward-outline' }
            ];

            return (
                <View style={styles.optionsContainer}>
                    <Text style={styles.panelHeader}>LOAD SYMMETRY PROFILE</Text>
                    <ScrollView style={styles.panelScroll} showsVerticalScrollIndicator={false}>
                        <View style={{ gap: 14, paddingBottom: 15 }}>
                            {/* Upper Body Segment */}
                            <View style={styles.symmetrySegment}>
                                <Text style={styles.symmetrySegmentHeader}>UPPER BODY (ARMS & SHOULDERS)</Text>
                                <View style={styles.symmetryButtonRow}>
                                    {options.map((opt) => {
                                        const isSelected = strongSideUpper === opt.id;
                                        return (
                                            <TouchableOpacity
                                                key={`upper_${opt.id}`}
                                                style={[
                                                    styles.symmetryBtn,
                                                    isSelected && styles.symmetryBtnActive
                                                ]}
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setStrongSideUpper(opt.id);
                                                }}
                                            >
                                                <Ionicons name={opt.icon} size={13} color={isSelected ? '#06B6D4' : '#64748B'} />
                                                <Text style={[styles.symmetryBtnText, isSelected && styles.symmetryBtnTextActive]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Lower Body Segment */}
                            <View style={styles.symmetrySegment}>
                                <Text style={styles.symmetrySegmentHeader}>LOWER BODY (HIPS & LEGS)</Text>
                                <View style={styles.symmetryButtonRow}>
                                    {options.map((opt) => {
                                        const isSelected = strongSideLower === opt.id;
                                        return (
                                            <TouchableOpacity
                                                key={`lower_${opt.id}`}
                                                style={[
                                                    styles.symmetryBtn,
                                                    isSelected && styles.symmetryBtnActive
                                                ]}
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setStrongSideLower(opt.id);
                                                }}
                                            >
                                                <Ionicons name={opt.icon} size={13} color={isSelected ? '#06B6D4' : '#64748B'} />
                                                <Text style={[styles.symmetryBtnText, isSelected && styles.symmetryBtnTextActive]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            );
        }

        if (step.id === 'posture') {
            const postures = [
                { id: 'none', label: 'Balanced Alignment', desc: 'Optimal natural posture.' },
                { id: 'rounded_shoulders', label: 'Rounded Shoulders', desc: 'Forward scapular migration.' },
                { id: 'forward_head', label: 'Forward Head Position', desc: 'Cervical extension under load.' },
                { id: 'tilt', label: 'Anterior Pelvic Tilt', desc: 'Tight hip flexors pulling pelvis forward.' }
            ];

            return (
                <View style={styles.optionsContainer}>
                    <Text style={styles.panelHeader}>POSTURAL ALIGNMENT</Text>
                    <ScrollView style={styles.panelScroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.verticalOptions}>
                            {postures.map((opt) => {
                                const isSelected = postureProblems.includes(opt.id);
                                return (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[
                                            styles.rowOption,
                                            isSelected && styles.rowOptionActiveAmber
                                        ]}
                                        onPress={() => toggleArrayItem(opt.id, postureProblems, setPostureProblems)}
                                    >
                                        <View style={[styles.rowIconCircle, isSelected && styles.rowIconCircleAmber]}>
                                            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={18} color={isSelected ? '#FFF' : '#F59E0B'} />
                                        </View>
                                        <View style={styles.rowTextStack}>
                                            <Text style={[styles.rowOptionTitle, isSelected && styles.rowOptionTitleSelected]}>{opt.label}</Text>
                                            <Text style={styles.rowOptionDesc}>{opt.desc}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            );
        }

        if (step.id === 'mobility') {
            const mobilities = [
                { id: 'none', label: 'Optimal Mobility', desc: 'No notable active range deficits.' },
                { id: 'tight_hips', label: 'Tight Hip Flexors', desc: 'Limits posterior chain glute loading.' },
                { id: 'stiff_ankles', label: 'Stiff Ankles / Feet', desc: 'Limits deep ankle flexion mechanics.' },
                { id: 'tight_hamstrings', label: 'Tight Hamstrings', desc: 'Restricts lumbar pelvic hip hinge hinge movements.' }
            ];

            return (
                <View style={styles.optionsContainer}>
                    <Text style={styles.panelHeader}>MOBILITY PROFILE</Text>
                    <ScrollView style={styles.panelScroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.verticalOptions}>
                            {mobilities.map((opt) => {
                                const isSelected = mobilityLimitations.includes(opt.id);
                                return (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[
                                            styles.rowOption,
                                            isSelected && styles.rowOptionActiveAmber
                                        ]}
                                        onPress={() => toggleArrayItem(opt.id, mobilityLimitations, setMobilityLimitations)}
                                    >
                                        <View style={[styles.rowIconCircle, isSelected && styles.rowIconCircleAmber]}>
                                            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={18} color={isSelected ? '#FFF' : '#F59E0B'} />
                                        </View>
                                        <View style={styles.rowTextStack}>
                                            <Text style={[styles.rowOptionTitle, isSelected && styles.rowOptionTitleSelected]}>{opt.label}</Text>
                                            <Text style={styles.rowOptionDesc}>{opt.desc}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            );
        }

        if (step.id === 'summary') {
            return (
                <View style={styles.optionsContainer}>
                    <Text style={styles.panelHeader}>SAFETY PRECAUTIONS</Text>
                    <ScrollView style={styles.panelScroll} contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
                        <View style={styles.inputArea}>
                            <Text style={styles.inputCaption}>SPECIFIC EXERCISES / AREAS TO AVOID</Text>
                            <TextInput
                                style={styles.hudInput}
                                value={avoidAreas}
                                onChangeText={setAvoidAreas}
                                placeholder="e.g. Overhead pressing, deep heavy squats"
                                placeholderTextColor="#475569"
                                multiline={true}
                                numberOfLines={2}
                            />
                        </View>
                        <View style={styles.inputArea}>
                            <Text style={styles.inputCaption}>ADDITIONAL CHRONIC PAIN DETAILS</Text>
                            <TextInput
                                style={styles.hudInput}
                                value={chronicPain}
                                onChangeText={setChronicPain}
                                placeholder="e.g. Occasional lower back soreness, clicking knee"
                                placeholderTextColor="#475569"
                                multiline={true}
                                numberOfLines={2}
                            />
                        </View>
                    </ScrollView>
                </View>
            );
        }

        return null;
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar style="dark" />

                {/* Premium Light Emerald/Slate Background Gradient */}
                <LinearGradient
                    colors={['#F8FAFC', '#ECFDF5']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Technical Cyber Backdrop HUD Lines */}
                <View style={styles.gridOverlay} pointerEvents="none">
                    <View style={styles.gridLineV} />
                    <View style={styles.gridLineV} />
                    <View style={styles.gridLineH} />
                </View>

                <SafeAreaView style={styles.safeArea}>

                    {/* Cyber Onboarding Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                            <BlurView intensity={40} tint="light" style={styles.backBlur}>
                                <Ionicons name="chevron-back" size={20} color="#10B981" />
                            </BlurView>
                        </TouchableOpacity>

                        <View style={styles.hudBadge}>
                            <Ionicons name="sparkles" size={12} color="#10B981" />
                            <Text style={styles.hudBadgeText}>ANATOMICAL PROFILE</Text>
                        </View>

                        <View style={styles.stepInfo}>
                            <Text style={styles.stepIndexText}>{currentStepIndex + 1} / {STEPS.length}</Text>
                        </View>
                    </View>

                    {/* Onboarding HUD Progress track */}
                    <View style={styles.progressWrapper}>
                        <View style={styles.progressTrack}>
                            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                        </View>
                    </View>

                    {/* Step Title Header Stack */}
                    <Animated.View style={[styles.stepTextStack, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
                        <Text style={styles.stepTitle}>{STEPS[currentStepIndex].title}</Text>
                        <Text style={styles.stepSubtitle}>{STEPS[currentStepIndex].subtitle}</Text>
                    </Animated.View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.contentWrapper}
                    >
                        {/* Upper Half: 3D Levitating Shaded Anatomy Silhouette */}
                        <View style={styles.hologramContainer}>

                            {/* Hovering Levitating Figure Box */}
                            <Animated.View style={[styles.floatingModel, { transform: [{ translateY }, { rotateY }] }]}>
                                <View style={styles.modelWrapper}>
                                    <Svg width="220" height="240" viewBox="0 0 240 320" style={styles.svgFigure}>
                                        <Defs>
                                            {/* Normal Realistic Premium Metallic Shader (Light Slate/Silver) */}
                                            <SvgLinearGradient id="grad-normal" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <Stop offset="0%" stopColor="#E2E8F0" />
                                                <Stop offset="50%" stopColor="#CBD5E1" />
                                                <Stop offset="100%" stopColor="#94A3B8" />
                                            </SvgLinearGradient>

                                            {/* Glowing Ruby Red Injury Shader (Softer for Light Theme) */}
                                            <SvgLinearGradient id="grad-injured" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <Stop offset="0%" stopColor="#FCA5A5" />
                                                <Stop offset="40%" stopColor="#EF4444" />
                                                <Stop offset="100%" stopColor="#B91C1C" />
                                            </SvgLinearGradient>

                                            {/* Glowing Warning Amber Posture/Mobility Shader */}
                                            <SvgLinearGradient id="grad-warning" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <Stop offset="0%" stopColor="#FDE047" />
                                                <Stop offset="40%" stopColor="#F59E0B" />
                                                <Stop offset="100%" stopColor="#B45309" />
                                            </SvgLinearGradient>

                                            {/* Glowing Electric Cyan Strength Shader */}
                                            <SvgLinearGradient id="grad-strong" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <Stop offset="0%" stopColor="#67E8F9" />
                                                <Stop offset="40%" stopColor="#06B6D4" />
                                                <Stop offset="100%" stopColor="#0E7490" />
                                            </SvgLinearGradient>
                                        </Defs>

                                        {isFrontView ? (
                                            /* ================= FRONT VIEW Silhouette ================= */
                                            <>
                                                {/* Left Ear */}
                                                <Path
                                                    d="M99,23 C97,23 96,25 96,28 C96,31 98,33 99,32 C100,31 100,29 100,28 Z"
                                                    fill={getPartFill('head')}
                                                    stroke={getPartStroke('head').color}
                                                    strokeWidth={1}
                                                />
                                                {/* Right Ear */}
                                                <Path
                                                    d="M141,23 C143,23 144,25 144,28 C144,31 142,33 141,32 C140,31 140,29 140,28 Z"
                                                    fill={getPartFill('head')}
                                                    stroke={getPartStroke('head').color}
                                                    strokeWidth={1}
                                                />
                                                {/* Head Base */}
                                                <Path
                                                    d="M120,10 C110,10 102,18 102,28 C102,36 107,43 113,45 C114,48 116,50 116,54 L124,54 C124,50 126,48 127,45 C133,43 138,36 138,28 C138,18 130,10 120,10 Z"
                                                    fill={getPartFill('head')}
                                                    stroke={getPartStroke('head').color}
                                                    strokeWidth={getPartStroke('head').width}
                                                    onPress={() => handlePartTap('head')}
                                                />
                                                {/* Hair Details */}
                                                <Path
                                                    d="M102,24 C104,15 110,11 120,11 C130,11 136,15 138,24 C134,20 128,19 120,20 C112,19 106,20 102,24 Z"
                                                    fill="rgba(0, 0, 0, 0.45)"
                                                    pointerEvents="none"
                                                />
                                                {/* Eyebrows */}
                                                <Path d="M108,22 C110,20 113,20 115,22" stroke="rgba(15,23,42,0.45)" strokeWidth={1} fill="none" pointerEvents="none" />
                                                <Path d="M132,22 C130,20 127,20 125,22" stroke="rgba(15,23,42,0.45)" strokeWidth={1} fill="none" pointerEvents="none" />
                                                {/* Eyes (Left / Right) */}
                                                <Circle cx="112" cy="25" r="1.8" fill="#FFF" pointerEvents="none" />
                                                <Circle cx="112" cy="25" r="0.9" fill="#10B981" pointerEvents="none" />
                                                <Circle cx="128" cy="25" r="1.8" fill="#FFF" pointerEvents="none" />
                                                <Circle cx="128" cy="25" r="0.9" fill="#10B981" pointerEvents="none" />
                                                {/* Nose Profile */}
                                                <Path d="M120,24 L120,33 L118,34" stroke="rgba(15,23,42,0.25)" strokeWidth={0.8} fill="none" pointerEvents="none" />
                                                {/* Lips/Mouth */}
                                                <Path d="M116,39 C118,41 122,41 124,39" stroke="rgba(15,23,42,0.35)" strokeWidth={1} fill="none" pointerEvents="none" />
                                                <Path d="M117,39 H123" stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} fill="none" pointerEvents="none" />
                                                {/* Collarbones */}
                                                <Path d="M103,58 C110,61 116,61 120,68 C124,61 130,61 137,58" stroke="rgba(15,23,42,0.18)" strokeWidth={1} fill="none" pointerEvents="none" />
                                                {/* Chest / Pecs */}
                                                <Path
                                                    d="M120,68 C112,68 104,66 98,60 C97,68 97,76 98,88 C104,91 112,93 120,93 C128,93 136,91 142,88 C143,76 143,68 142,60 C136,66 128,68 120,68 Z"
                                                    fill={getPartFill('chest')}
                                                    stroke={getPartStroke('chest').color}
                                                    strokeWidth={getPartStroke('chest').width}
                                                    onPress={() => handlePartTap('chest')}
                                                />
                                                {/* Chest Definition Shading Line */}
                                                <Path d="M100,78 C110,81 120,81 120,88 C120,81 130,81 140,78" stroke="rgba(15,23,42,0.15)" strokeWidth={1} fill="none" pointerEvents="none" />
                                                {/* Torso/Abs */}
                                                <Path
                                                    d="M98,88 C97,100 99,114 103,126 C108,129 114,130 120,130 C126,130 132,129 137,126 C141,114 143,100 142,88 C136,91 128,93 120,93 C112,93 104,91 98,88 Z"
                                                    fill={getPartFill('chest')}
                                                    stroke={getPartStroke('chest').color}
                                                    strokeWidth={getPartStroke('chest').width}
                                                    onPress={() => handlePartTap('chest')}
                                                />
                                                {/* Abdominal Core Contours */}
                                                <Path d="M120,93 L120,126" stroke="rgba(15,23,42,0.1)" strokeWidth={0.8} fill="none" pointerEvents="none" />
                                                <Path d="M110,102 H130" stroke="rgba(15,23,42,0.08)" strokeWidth={0.8} fill="none" pointerEvents="none" />
                                                <Path d="M112,112 H128" stroke="rgba(15,23,42,0.08)" strokeWidth={0.8} fill="none" pointerEvents="none" />
                                                <Path d="M114,120 H126" stroke="rgba(15,23,42,0.08)" strokeWidth={0.8} fill="none" pointerEvents="none" />
                                                {/* Left Shoulder (Deltoid) */}
                                                <Path
                                                    d="M98,58 C92,54 84,60 80,70 C77,78 79,84 84,86 C88,84 94,80 98,78 C97,72 97,64 98,58 Z"
                                                    fill={getPartFill('shoulders', 'left')}
                                                    stroke={getPartStroke('shoulders', 'left').color}
                                                    strokeWidth={getPartStroke('shoulders', 'left').width}
                                                    onPress={() => handlePartTap('shoulders', 'left')}
                                                />
                                                {/* Right Shoulder (Deltoid) */}
                                                <Path
                                                    d="M142,58 C148,54 156,60 160,70 C163,78 161,84 156,86 C152,84 146,80 142,78 C143,72 143,64 142,58 Z"
                                                    fill={getPartFill('shoulders', 'right')}
                                                    stroke={getPartStroke('shoulders', 'right').color}
                                                    strokeWidth={getPartStroke('shoulders', 'right').width}
                                                    onPress={() => handlePartTap('shoulders', 'right')}
                                                />
                                                {/* Left Arm (Bicep/Tricep) */}
                                                <Path
                                                    d="M80,70 C76,78 72,92 73,115 C76,118 80,120 83,118 C86,105 88,92 84,86 C82,82 81,76 80,70 Z"
                                                    fill={getPartFill('arms', 'left')}
                                                    stroke={getPartStroke('arms', 'left').color}
                                                    strokeWidth={getPartStroke('arms', 'left').width}
                                                    onPress={() => handlePartTap('arms', 'left')}
                                                />
                                                {/* Right Arm (Bicep/Tricep) */}
                                                <Path
                                                    d="M160,70 C164,78 168,92 167,115 C164,118 160,120 157,118 C154,105 152,92 156,86 C158,82 159,76 160,70 Z"
                                                    fill={getPartFill('arms', 'right')}
                                                    stroke={getPartStroke('arms', 'right').color}
                                                    strokeWidth={getPartStroke('arms', 'right').width}
                                                    onPress={() => handlePartTap('arms', 'right')}
                                                />
                                                {/* Left Elbow */}
                                                <Path
                                                    d="M73,115 C72,118 72,122 74,125 C77,125 79,122 80,120 C81,120 82,119 83,118 C80,120 76,118 73,115 Z"
                                                    fill={getPartFill('elbows', 'left')}
                                                    stroke={getPartStroke('elbows', 'left').color}
                                                    strokeWidth={getPartStroke('elbows', 'left').width}
                                                    onPress={() => handlePartTap('elbows', 'left')}
                                                />
                                                {/* Right Elbow */}
                                                <Path
                                                    d="M167,115 C168,118 168,122 166,125 C163,125 161,122 160,120 C159,120 158,119 157,118 C160,120 164,118 167,115 Z"
                                                    fill={getPartFill('elbows', 'right')}
                                                    stroke={getPartStroke('elbows', 'right').color}
                                                    strokeWidth={getPartStroke('elbows', 'right').width}
                                                    onPress={() => handlePartTap('elbows', 'right')}
                                                />
                                                {/* Left Forearm & Hand */}
                                                <Path
                                                    d="M74,125 C71,135 67,148 64,158 C62,162 60,168 59,174 C59,175 60,176 61,175 C62,173 63,166 64,162 C65,166 66,178 66,179 C66,180 67,180 68,179 C68,177 67,166 67,161 C68,165 70,179 70,181 C70,182 71,182 72,181 C72,179 70,165 69,160 C71,164 73,176 74,178 C74,179 75,179 76,178 C76,176 73,163 71,159 C73,161 76,170 77,172 C77,173 78,173 78,171 C78,169 75,159 73,156 C77,145 80,132 80,125 Z"
                                                    fill={getPartFill('arms', 'left')}
                                                    stroke={getPartStroke('arms', 'left').color}
                                                    strokeWidth={getPartStroke('arms', 'left').width}
                                                    onPress={() => handlePartTap('arms', 'left')}
                                                />
                                                {/* Right Forearm & Hand */}
                                                <Path
                                                    d="M166,125 C169,135 173,148 176,158 C178,162 180,168 181,174 C181,175 180,176 179,175 C178,173 177,166 176,162 C175,166 174,178 174,179 C174,180 173,180 172,179 C172,177 173,166 173,161 C172,165 170,179 170,181 C170,182 169,182 168,181 C168,179 170,165 171,160 C169,164 167,176 166,178 C166,179 165,179 164,178 C164,176 167,163 169,159 C167,159 164,170 163,172 C163,173 162,173 162,171 C162,169 165,159 167,156 C163,145 160,132 160,125 Z"
                                                    fill={getPartFill('arms', 'right')}
                                                    stroke={getPartStroke('arms', 'right').color}
                                                    strokeWidth={getPartStroke('arms', 'right').width}
                                                    onPress={() => handlePartTap('arms', 'right')}
                                                />
                                                {/* Hips & Pelvis */}
                                                <Path
                                                    d="M103,126 C97,133 94,142 94,152 C94,156 100,160 106,158 C114,156 126,156 134,158 C140,160 146,156 146,152 C146,142 143,133 137,126 C132,129 126,130 120,130 C114,130 108,129 103,126 Z"
                                                    fill={getPartFill('legs')}
                                                    stroke={getPartStroke('legs').color}
                                                    strokeWidth={getPartStroke('legs').width}
                                                    onPress={() => handlePartTap('legs')}
                                                />
                                                {/* Left Thigh (Quads) */}
                                                <Path
                                                    d="M94,152 C88,172 82,192 84,212 C90,215 97,215 103,212 C107,192 108,172 106,152 C100,154 96,153 94,152 Z"
                                                    fill={getPartFill('legs', 'left')}
                                                    stroke={getPartStroke('legs', 'left').color}
                                                    strokeWidth={getPartStroke('legs', 'left').width}
                                                    onPress={() => handlePartTap('legs', 'left')}
                                                />
                                                {/* Right Thigh (Quads) */}
                                                <Path
                                                    d="M146,152 C152,172 158,192 156,212 C150,215 143,215 137,212 C133,192 132,172 134,152 C140,154 144,153 146,152 Z"
                                                    fill={getPartFill('legs', 'right')}
                                                    stroke={getPartStroke('legs', 'right').color}
                                                    strokeWidth={getPartStroke('legs', 'right').width}
                                                    onPress={() => handlePartTap('legs', 'right')}
                                                />
                                                {/* Left Knee */}
                                                <Path
                                                    d="M88,212 C88,218 90,224 94,226 C98,226 101,222 103,218 C105,216 106,214 107,212 C101,215 94,215 88,212 Z"
                                                    fill={getPartFill('knees', 'left')}
                                                    stroke={getPartStroke('knees', 'left').color}
                                                    strokeWidth={getPartStroke('knees', 'left').width}
                                                    onPress={() => handlePartTap('knees', 'left')}
                                                />
                                                {/* Right Knee */}
                                                <Path
                                                    d="M152,212 C152,218 150,224 146,226 C142,226 139,222 137,218 C135,216 134,214 133,212 C139,215 146,215 152,212 Z"
                                                    fill={getPartFill('knees', 'right')}
                                                    stroke={getPartStroke('knees', 'right').color}
                                                    strokeWidth={getPartStroke('knees', 'right').width}
                                                    onPress={() => handlePartTap('knees', 'right')}
                                                />
                                                {/* Left Shin/Calf */}
                                                <Path
                                                    d="M94,226 C90,242 86,258 84,275 C88,277 93,277 97,275 C101,258 103,242 103,226 C99,228 96,228 94,226 Z"
                                                    fill={getPartFill('ankles', 'left')}
                                                    stroke={getPartStroke('ankles', 'left').color}
                                                    strokeWidth={getPartStroke('ankles', 'left').width}
                                                    onPress={() => handlePartTap('ankles', 'left')}
                                                />
                                                {/* Right Shin/Calf */}
                                                <Path
                                                    d="M146,226 C150,242 154,258 156,275 C152,277 147,277 143,275 C139,258 137,242 137,226 C141,228 144,228 146,226 Z"
                                                    fill={getPartFill('ankles', 'right')}
                                                    stroke={getPartStroke('ankles', 'right').color}
                                                    strokeWidth={getPartStroke('ankles', 'right').width}
                                                    onPress={() => handlePartTap('ankles', 'right')}
                                                />
                                                {/* Left Ankle, Foot & Toes */}
                                                <Path
                                                    d="M84,275 C82,282 80,289 77,296 C75,299 73,302 71,304 C70,305 71,306 72,306 C73,305 75,302 76,299 C77,301 76,304 75,306 C75,307 76,307 77,306 C78,304 79,301 80,298 C81,300 81,303 80,305 C80,306 81,306 82,305 C83,303 83,300 83,297 C84,299 85,301 85,303 C85,304 86,304 87,303 C87,301 87,298 86,295 C88,297 90,299 91,300 C92,300 93,299 93,298 C93,296 92,291 93,288 C95,283 96,279 97,275 Z"
                                                    fill={getPartFill('ankles', 'left')}
                                                    stroke={getPartStroke('ankles', 'left').color}
                                                    strokeWidth={getPartStroke('ankles', 'left').width}
                                                    onPress={() => handlePartTap('ankles', 'left')}
                                                />
                                                {/* Right Ankle, Foot & Toes */}
                                                <Path
                                                    d="M156,275 C158,282 160,289 163,296 C165,299 167,302 169,304 C170,305 169,306 168,306 C167,305 165,302 164,299 C163,301 164,304 165,306 C165,307 164,307 163,306 C162,304 161,301 160,298 C159,300 159,303 160,305 C160,306 159,306 158,305 C157,303 157,300 157,297 C156,299 155,301 155,303 C155,304 154,304 153,303 C153,301 153,298 154,295 C152,297 150,299 149,300 C148,300 147,299 147,298 C147,296 148,291 147,288 C145,283 144,279 144,275 Z"
                                                    fill={getPartFill('ankles', 'right')}
                                                    stroke={getPartStroke('ankles', 'right').color}
                                                    strokeWidth={getPartStroke('ankles', 'right').width}
                                                    onPress={() => handlePartTap('ankles', 'right')}
                                                />
                                            </>
                                        ) : (
                                            /* ================= BACK VIEW Silhouette ================= */
                                            <>
                                                {/* Head */}
                                                <Path
                                                    d="M120,10 C110,10 102,18 102,28 C102,36 107,43 113,45 C114,48 116,50 116,54 L124,54 C124,50 126,48 127,45 C133,43 138,36 138,28 C138,18 130,10 120,10 Z"
                                                    fill={getPartFill('head')}
                                                    stroke={getPartStroke('head').color}
                                                    strokeWidth={getPartStroke('head').width}
                                                    onPress={() => handlePartTap('head')}
                                                />
                                                {/* Upper Back / Traps */}
                                                <Path
                                                    d="M120,54 C116,54 112,56 108,58 C104,60 99,62 98,64 C99,72 99,80 100,88 C106,90 113,92 120,92 C127,92 134,90 140,88 C141,80 141,72 142,64 C141,62 136,60 132,58 C128,56 124,54 120,54 Z"
                                                    fill={getPartFill('back')}
                                                    stroke={getPartStroke('back').color}
                                                    strokeWidth={getPartStroke('back').width}
                                                    onPress={() => handlePartTap('back')}
                                                />
                                                {/* Lower Back / Lats */}
                                                <Path
                                                    d="M100,88 C100,100 102,114 105,126 C110,129 115,130 120,130 C125,130 130,129 135,126 C138,114 140,100 140,88 C134,90 127,92 120,92 C113,92 106,90 100,88 Z"
                                                    fill={getPartFill('back')}
                                                    stroke={getPartStroke('back').color}
                                                    strokeWidth={getPartStroke('back').width}
                                                    onPress={() => handlePartTap('back')}
                                                />
                                                {/* Left Rear Shoulder */}
                                                <Path
                                                    d="M98,64 C92,60 84,65 80,73 C77,81 79,88 84,91 C88,88 94,84 98,82 C97,76 97,69 98,64 Z"
                                                    fill={getPartFill('shoulders', 'left')}
                                                    stroke={getPartStroke('shoulders', 'left').color}
                                                    strokeWidth={getPartStroke('shoulders', 'left').width}
                                                    onPress={() => handlePartTap('shoulders', 'left')}
                                                />
                                                {/* Right Rear Shoulder */}
                                                <Path
                                                    d="M142,64 C148,60 156,65 160,73 C163,81 161,88 156,91 C152,88 146,84 142,82 C143,76 143,69 142,64 Z"
                                                    fill={getPartFill('shoulders', 'right')}
                                                    stroke={getPartStroke('shoulders', 'right').color}
                                                    strokeWidth={getPartStroke('shoulders', 'right').width}
                                                    onPress={() => handlePartTap('shoulders', 'right')}
                                                />
                                                {/* Left Tricep */}
                                                <Path
                                                    d="M80,73 C76,82 72,96 73,119 C76,122 80,124 83,122 C86,109 88,96 84,88 C82,84 81,78 80,73 Z"
                                                    fill={getPartFill('arms', 'left')}
                                                    stroke={getPartStroke('arms', 'left').color}
                                                    strokeWidth={getPartStroke('arms', 'left').width}
                                                    onPress={() => handlePartTap('arms', 'left')}
                                                />
                                                {/* Right Tricep */}
                                                <Path
                                                    d="M160,73 C164,82 168,96 167,119 C164,122 160,124 157,122 C154,109 152,96 156,88 C158,84 159,78 160,73 Z"
                                                    fill={getPartFill('arms', 'right')}
                                                    stroke={getPartStroke('arms', 'right').color}
                                                    strokeWidth={getPartStroke('arms', 'right').width}
                                                    onPress={() => handlePartTap('arms', 'right')}
                                                />
                                                {/* Left Elbow */}
                                                <Path
                                                    d="M73,119 C72,122 72,126 74,129 C77,129 79,126 80,124 C81,124 82,123 83,122 C80,124 76,122 73,119 Z"
                                                    fill={getPartFill('elbows', 'left')}
                                                    stroke={getPartStroke('elbows', 'left').color}
                                                    strokeWidth={getPartStroke('elbows', 'left').width}
                                                    onPress={() => handlePartTap('elbows', 'left')}
                                                />
                                                {/* Right Elbow */}
                                                <Path
                                                    d="M167,119 C168,122 168,126 166,129 C163,129 161,126 160,124 C159,124 158,123 157,122 C160,124 164,122 167,119 Z"
                                                    fill={getPartFill('elbows', 'right')}
                                                    stroke={getPartStroke('elbows', 'right').color}
                                                    strokeWidth={getPartStroke('elbows', 'right').width}
                                                    onPress={() => handlePartTap('elbows', 'right')}
                                                />
                                                {/* Left Forearm & Hand */}
                                                <Path
                                                    d="M74,129 C71,139 67,152 64,162 C62,166 60,172 59,178 C59,179 60,180 61,179 C62,177 63,170 64,166 C65,170 66,182 66,183 C66,184 67,184 68,183 C68,181 67,170 67,165 C68,169 70,183 70,185 C70,186 71,186 72,185 C72,183 70,169 69,164 C71,168 73,180 74,182 C74,183 75,183 76,182 C76,180 73,167 71,163 C73,165 76,174 77,176 C77,177 78,177 78,175 C78,173 75,163 73,160 C77,149 80,136 80,129 Z"
                                                    fill={getPartFill('arms', 'left')}
                                                    stroke={getPartStroke('arms', 'left').color}
                                                    strokeWidth={getPartStroke('arms', 'left').width}
                                                    onPress={() => handlePartTap('arms', 'left')}
                                                />
                                                {/* Right Forearm & Hand */}
                                                <Path
                                                    d="M166,129 C169,139 173,152 176,162 C178,166 180,172 181,178 C181,179 180,180 179,179 C178,177 177,170 176,166 C175,170 174,182 174,183 C174,184 173,184 172,179 C172,177 173,166 173,161 C172,165 170,179 170,181 C170,182 169,182 168,181 C168,179 170,165 171,160 C169,164 167,176 166,178 C166,179 165,179 164,178 C164,176 167,163 169,159 C167,159 164,170 163,172 C163,173 162,173 162,171 C162,169 165,159 167,156 C163,149 160,136 160,129 Z"
                                                    fill={getPartFill('arms', 'right')}
                                                    stroke={getPartStroke('arms', 'right').color}
                                                    strokeWidth={getPartStroke('arms', 'right').width}
                                                    onPress={() => handlePartTap('arms', 'right')}
                                                />
                                                {/* Glutes */}
                                                <Path
                                                    d="M105,126 C99,133 96,142 96,152 C96,156 102,160 108,158 C116,156 124,156 132,158 C138,160 144,156 144,152 C144,142 141,133 135,126 C130,129 125,130 120,130 C115,130 110,129 105,126 Z"
                                                    fill={getPartFill('legs')}
                                                    stroke={getPartStroke('legs').color}
                                                    strokeWidth={getPartStroke('legs').width}
                                                    onPress={() => handlePartTap('legs')}
                                                />
                                                {/* Left Thigh (Hamstrings) */}
                                                <Path
                                                    d="M96,152 C92,172 89,192 90,212 C96,215 103,215 109,212 C111,192 110,172 108,152 C102,154 98,153 96,152 Z"
                                                    fill={getPartFill('legs', 'left')}
                                                    stroke={getPartStroke('legs', 'left').color}
                                                    strokeWidth={getPartStroke('legs', 'left').width}
                                                    onPress={() => handlePartTap('legs', 'left')}
                                                />
                                                {/* Right Thigh (Hamstrings) */}
                                                <Path
                                                    d="M144,152 C148,172 151,192 150,212 C144,215 137,215 131,212 C129,192 130,172 132,152 C138,154 142,153 144,152 Z"
                                                    fill={getPartFill('legs', 'right')}
                                                    stroke={getPartStroke('legs', 'right').color}
                                                    strokeWidth={getPartStroke('legs', 'right').width}
                                                    onPress={() => handlePartTap('legs', 'right')}
                                                />
                                                {/* Left Knee Back */}
                                                <Path
                                                    d="M90,212 C90,218 92,224 96,226 C100,226 103,222 105,218 C107,216 108,214 109,212 C103,215 96,215 90,212 Z"
                                                    fill={getPartFill('knees', 'left')}
                                                    stroke={getPartStroke('knees', 'left').color}
                                                    strokeWidth={getPartStroke('knees', 'left').width}
                                                    onPress={() => handlePartTap('knees', 'left')}
                                                />
                                                {/* Right Knee Back */}
                                                <Path
                                                    d="M150,212 C150,218 148,224 144,226 C140,226 137,222 135,218 C133,216 132,214 131,212 C137,215 144,215 150,212 Z"
                                                    fill={getPartFill('knees', 'right')}
                                                    stroke={getPartStroke('knees', 'right').color}
                                                    strokeWidth={getPartStroke('knees', 'right').width}
                                                    onPress={() => handlePartTap('knees', 'right')}
                                                />
                                                {/* Left Calf */}
                                                <Path
                                                    d="M96,226 C92,242 88,258 86,275 C90,277 95,277 99,275 C103,258 105,242 105,226 C101,228 98,228 96,226 Z"
                                                    fill={getPartFill('ankles', 'left')}
                                                    stroke={getPartStroke('ankles', 'left').color}
                                                    strokeWidth={getPartStroke('ankles', 'left').width}
                                                    onPress={() => handlePartTap('ankles', 'left')}
                                                />
                                                {/* Right Calf */}
                                                <Path
                                                    d="M144,226 C148,242 152,258 154,275 C150,277 145,277 141,275 C137,258 135,242 135,226 C139,228 142,228 144,226 Z"
                                                    fill={getPartFill('ankles', 'right')}
                                                    stroke={getPartStroke('ankles', 'right').color}
                                                    strokeWidth={getPartStroke('ankles', 'right').width}
                                                    onPress={() => handlePartTap('ankles', 'right')}
                                                />
                                                {/* Left Heel & Toes */}
                                                <Path
                                                    d="M86,275 C84,282 82,288 79,294 C77,297 75,300 73,302 C72,303 73,304 74,304 C75,303 77,300 78,297 C79,299 78,302 77,304 C77,305 78,305 79,304 C80,302 81,299 82,296 C83,298 83,301 82,303 C82,304 83,304 84,303 C85,301 85,298 85,295 C86,297 87,299 87,301 C87,302 88,302 89,301 C89,299 89,296 88,293 C90,295 92,297 93,298 C94,298 95,297 95,296 C95,294 94,289 95,286 C97,281 98,277 99,275 Z"
                                                    fill={getPartFill('ankles', 'left')}
                                                    stroke={getPartStroke('ankles', 'left').color}
                                                    strokeWidth={getPartStroke('ankles', 'left').width}
                                                    onPress={() => handlePartTap('ankles', 'left')}
                                                />
                                                {/* Right Heel & Toes */}
                                                <Path
                                                    d="M157,275 C158,281 159,289 161,296 C163,299 165,302 167,304 C168,305 167,306 166,306 C165,305 163,302 162,299 Q161,301 162,304 C162,305 161,305 160,304 C159,302 158,299 157,296 C156,298 156,301 157,303 C157,304 156,304 155,303 C154,301 154,298 154,295 C153,297 151,299 150,301 C150,302 149,302 148,301 C148,299 148,296 147,293 C149,295 151,297 152,298 C153,298 154,297 154,296 C154,294 153,289 154,286 C156,281 156,277 157,275 Z"
                                                    fill={getPartFill('ankles', 'right')}
                                                    stroke={getPartStroke('ankles', 'right').color}
                                                    strokeWidth={getPartStroke('ankles', 'right').width}
                                                    onPress={() => handlePartTap('ankles', 'right')}
                                                />
                                            </>
                                        )}
                                    </Svg>
                                </View>
                            </Animated.View>

                            {/* Glowing radial platform beneath levitating body */}
                            <View style={styles.glowPlatform} />

                            {/* Floating cyber front/back view toggle button */}
                            <TouchableOpacity style={styles.hudFlipBtn} activeOpacity={0.8} onPress={toggleView}>
                                <BlurView intensity={40} tint="light" style={styles.hudFlipBlur}>
                                    <Ionicons name="sync" size={16} color="#10B981" />
                                    <Text style={styles.hudFlipText}>{isFrontView ? 'FRONT' : 'BACK'}</Text>
                                </BlurView>
                            </TouchableOpacity>

                            {/* Levitating platform ring */}
                            <View style={styles.cyberRing} />

                            {/* Floating AI Status HUD text */}
                            <Animated.View style={[styles.aiSubtitleBox, { opacity: hudFadeAnim }]}>
                                <Ionicons name="hardware-chip-outline" size={11} color="#059669" />
                                <Text style={styles.aiSubtitleText}>{HUD_TEXTS[hudTextIndex]}</Text>
                            </Animated.View>
                        </View>

                        {/* Lower Half: Glassmorphic interactive choice selectors */}
                        <Animated.View style={[styles.panelWrapper, { opacity: fadeAnim }]}>
                            <BlurView intensity={45} tint="light" style={styles.glassPanel}>
                                {renderHUDOptions()}
                            </BlurView>
                        </Animated.View>

                        {/* Continuing navigation button */}
                        <View style={styles.footer}>
                            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    style={styles.nextBtn}
                                    onPress={handleNext}
                                >
                                    <LinearGradient
                                        colors={['#10B981', '#047857']}
                                        style={styles.btnGrad}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.btnText}>
                                            {currentStepIndex === STEPS.length - 1 ? 'FINISH ASSESSMENT' : 'NEXT CALIBRATION'}
                                        </Text>
                                        <Ionicons
                                            name={currentStepIndex === STEPS.length - 1 ? "shield-checkmark" : "arrow-forward"}
                                            size={16}
                                            color="#FFF"
                                        />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    </KeyboardAvoidingView>

                </SafeAreaView>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.08,
    },
    gridLineV: {
        position: 'absolute',
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        left: width * 0.33,
    },
    gridLineH: {
        position: 'absolute',
        height: 1,
        width: '100%',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
        borderColor: 'rgba(16, 185, 129, 0.15)',
    },
    backBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    hudBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    hudBadgeText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    stepInfo: {
        backgroundColor: 'rgba(15, 23, 42, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
    stepIndexText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '800',
    },
    progressWrapper: {
        paddingHorizontal: 5,
        marginVertical: 10,
    },
    progressTrack: {
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 2,
    },
    stepTextStack: {
        alignItems: 'center',
        marginTop: 5,
        marginBottom: 10,
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 1.5,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    stepSubtitle: {
        fontSize: 12,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 15,
        marginTop: 5,
    },
    contentWrapper: {
        flex: 1,
        justifyContent: 'space-between',
    },
    hologramContainer: {
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 10,
    },
    floatingModel: {
        width: 220,
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
    },
    svgFigure: {
        overflow: 'visible',
    },
    glowPlatform: {
        position: 'absolute',
        bottom: 40,
        width: 130,
        height: 15,
        borderRadius: 65,
        backgroundColor: '#10B981',
        opacity: 0.15,
        transform: [{ scaleX: 1.5 }],
        filter: 'blur(8px)',
    },
    cyberRing: {
        position: 'absolute',
        bottom: 44,
        width: 140,
        height: 12,
        borderRadius: 70,
        borderWidth: 1.2,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        borderStyle: 'dashed',
        transform: [{ scaleX: 1.5 }],
    },
    hudFlipBtn: {
        position: 'absolute',
        right: 15,
        top: 20,
        width: 80,
        height: 34,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.15)',
        zIndex: 10,
    },
    hudFlipBlur: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        gap: 6,
    },
    hudFlipText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.2,
    },
    aiSubtitleBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.15)',
        position: 'absolute',
        bottom: 5,
        zIndex: 8,
    },
    aiSubtitleText: {
        color: '#059669',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    panelWrapper: {
        flex: 1,
        maxHeight: 235,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        marginBottom: 15,
    },
    glassPanel: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        padding: 16,
    },
    optionsContainer: {
        flex: 1,
    },
    panelHeader: {
        fontSize: 10,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 2,
        marginBottom: 10,
    },
    panelScroll: {
        flex: 1,
    },
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingBottom: 15,
    },
    tagOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.02)',
        borderWidth: 1.2,
        borderColor: 'rgba(15, 23, 42, 0.06)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 5,
    },
    tagOptionInjured: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    tagOptionText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#475569',
    },
    tagOptionTextSelected: {
        color: '#FFF',
    },
    verticalOptions: {
        gap: 8,
        paddingBottom: 15,
    },
    rowOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.02)',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.06)',
        borderRadius: 18,
        padding: 10,
        gap: 12,
    },
    rowOptionActiveCyan: {
        backgroundColor: 'rgba(6, 182, 212, 0.06)',
        borderColor: 'rgba(6, 182, 212, 0.35)',
    },
    rowOptionActiveAmber: {
        backgroundColor: 'rgba(245, 158, 11, 0.06)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    rowIconCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(15, 23, 42, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rowIconCircleCyan: {
        backgroundColor: '#06B6D4',
    },
    rowIconCircleAmber: {
        backgroundColor: '#F59E0B',
    },
    rowTextStack: {
        flex: 1,
    },
    rowOptionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F172A',
    },
    rowOptionTitleSelected: {
        color: '#0F172A',
    },
    rowOptionDesc: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 2,
    },
    inputArea: {
        gap: 6,
    },
    inputCaption: {
        fontSize: 9,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 1.5,
    },
    hudInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#0F172A',
        fontSize: 13,
        fontWeight: '600',
        textAlignVertical: 'top',
    },
    symmetrySegment: {
        gap: 6,
        marginBottom: 4,
    },
    symmetrySegmentHeader: {
        fontSize: 8,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1.5,
    },
    symmetryButtonRow: {
        flexDirection: 'row',
        gap: 6,
    },
    symmetryBtn: {
        flex: 1,
        height: 38,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.06)',
        backgroundColor: 'rgba(15, 23, 42, 0.02)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    symmetryBtnActive: {
        backgroundColor: 'rgba(6, 182, 212, 0.12)',
        borderColor: 'rgba(6, 182, 212, 0.45)',
    },
    symmetryBtnText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#475569',
    },
    symmetryBtnTextActive: {
        color: '#22D3EE',
    },
    footer: {
        paddingBottom: Platform.OS === 'ios' ? 15 : 25,
    },
    nextBtn: {
        height: 56,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.25)',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 6,
    },
    btnGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    btnText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1.5,
    },
});

export default PhysicalAssessmentScreen;
