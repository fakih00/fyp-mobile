import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    KeyboardAvoidingView, 
    Platform, 
    Dimensions, 
    Animated,
    Keyboard,
    TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/Theme';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const STEPS = [
    { id: 'age', title: 'How old are you?', subtitle: 'This helps us calculate your accurate metabolic rate.', icon: 'calendar-outline', stepAmount: 1 },
    { id: 'weight', title: 'What is your weight?', subtitle: 'Used to determine your daily calorie needs.', icon: 'scale-outline', unitToggle: ['KG', 'LBS'], stepAmount: 0.5 },
    { id: 'height', title: 'How tall are you?', subtitle: 'Combined with weight to calculate BMI.', icon: 'resize-outline', unitToggle: ['CM', 'FT'], stepAmount: 1 },
    { id: 'bodyFat', title: 'Body Composition', subtitle: 'Enter your body fat percentage or waist size.', icon: 'body-outline' }
];

const BiometricScreen = ({ navigation, route }) => {
    const { userData } = route.params || {};

    // State for values
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [bodyFat, setBodyFat] = useState('');
    const [waistSize, setWaistSize] = useState('');

    // State for UI toggles and units
    const [showWaist, setShowWaist] = useState(false);
    const [weightUnit, setWeightUnit] = useState('KG');
    const [heightUnit, setHeightUnit] = useState('CM');
    
    // Core Wizard State
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Animations
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    // Helper: Haptics & Scaling for buttons
    const animateButtonPressIn = () => {
        Animated.spring(buttonScale, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };
    
    const animateButtonPressOut = () => {
        Animated.spring(buttonScale, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    // Update Progress Bar smoothly
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

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (currentStepIndex === STEPS.length - 1) {
            // Final submission
            navigation.navigate('Lifestyle', {
                userData: {
                    ...userData,
                    age,
                    weight,
                    height,
                    body_fat: bodyFat,
                    waist_size: waistSize,
                    weight_unit: weightUnit,
                    height_unit: heightUnit
                }
            });
            return;
        }

        // Animate out current step
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: -width * 0.3, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true })
        ]).start(() => {
            setCurrentStepIndex(prev => prev + 1);
            slideAnim.setValue(width * 0.3); // Setup for animate in
            
            // Animate in next step
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
            ]).start();
        });
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        if (currentStepIndex === 0) {
            navigation.goBack();
            return;
        }

        // Animate out current step via right
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: width * 0.3, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true })
        ]).start(() => {
            setCurrentStepIndex(prev => prev - 1);
            slideAnim.setValue(-width * 0.3); // Setup for animate in from left
            
            // Animate in prev step
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
            ]).start();
        });
    };

    const adjustValue = (setter, value, amount) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const current = parseFloat(value) || 0;
        const newValue = Math.max(0, current + amount);
        // Format to step precision (prevent floating point artifacts like 0.300000000004)
        const formatPrecision = amount % 1 !== 0 ? 1 : 0;
        setter(newValue.toFixed(formatPrecision).replace(/\.0$/, ''));
    };

    const renderUnitToggle = (unit, setUnit, option1, option2) => (
        <View style={styles.toggleContainer}>
            <TouchableOpacity
                style={[styles.toggleBtn, unit === option1 && styles.activeToggle]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setUnit(option1);
                }}
            >
                <Text style={[styles.toggleText, unit === option1 && styles.activeToggleText]}>{option1}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.toggleBtn, unit === option2 && styles.activeToggle]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setUnit(option2);
                }}
            >
                <Text style={[styles.toggleText, unit === option2 && styles.activeToggleText]}>{option2}</Text>
            </TouchableOpacity>
        </View>
    );

    const isCurrentStepValid = () => {
        const step = STEPS[currentStepIndex];
        if (step.id === 'age') return !!age;
        if (step.id === 'weight') return !!weight;
        if (step.id === 'height') return !!height;
        if (step.id === 'bodyFat') return !!bodyFat || !!waistSize;
        return false;
    };

    const renderActiveStep = () => {
        const step = STEPS[currentStepIndex];

        let value, setValue, unitControl;
        if (step.id === 'age') { value = age; setValue = setAge; }
        else if (step.id === 'weight') { value = weight; setValue = setWeight; unitControl = renderUnitToggle(weightUnit, setWeightUnit, 'KG', 'LBS'); }
        else if (step.id === 'height') { value = height; setValue = setHeight; unitControl = renderUnitToggle(heightUnit, setHeightUnit, 'CM', 'FT'); }

        return (
            <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
                <View style={styles.iconCircle}>
                    <Ionicons name={step.icon} size={42} color="#10B981" />
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                {step.id === 'bodyFat' ? (
                    <TouchableOpacity 
                        style={styles.switchBodyFatBtn}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setShowWaist(!showWaist);
                        }}
                    >
                        <Ionicons name="swap-horizontal" size={16} color="#10B981" />
                        <Text style={styles.switchBodyFatText}>
                            {showWaist ? 'Switch to Body Fat %' : 'Use Waist Size instead'}
                        </Text>
                    </TouchableOpacity>
                ) : null}
                <View style={styles.inputWrapper}>
                    {unitControl ? <View style={styles.unitControlWrapper}>{unitControl}</View> : null}
                    <View style={styles.stepperContainer}>
                        <TouchableOpacity 
                            style={styles.stepperBtn} 
                            onPress={() => {
                                if (step.id === 'bodyFat') {
                                    adjustValue(showWaist ? setWaistSize : setBodyFat, showWaist ? waistSize : bodyFat, showWaist ? -1 : -0.5);
                                } else {
                                    adjustValue(setValue, value, -step.stepAmount);
                                }
                            }}
                        >
                            <Ionicons name="remove" size={32} color="#64748B" />
                        </TouchableOpacity>
                        <TextInput
                            value={step.id === 'bodyFat' ? (showWaist ? waistSize : bodyFat) : value}
                            onChangeText={step.id === 'bodyFat' ? (showWaist ? setWaistSize : setBodyFat) : setValue}
                            placeholder="0"
                            keyboardType="numeric"
                            style={styles.giantInput}
                            placeholderTextColor="#CBD5E1"
                            maxLength={5}
                            autoFocus={true}
                        />
                        <TouchableOpacity 
                            style={styles.stepperBtn} 
                            onPress={() => {
                                if (step.id === 'bodyFat') {
                                    adjustValue(showWaist ? setWaistSize : setBodyFat, showWaist ? waistSize : bodyFat, showWaist ? 1 : 0.5);
                                } else {
                                    adjustValue(setValue, value, step.stepAmount);
                                }
                            }}
                        >
                            <Ionicons name="add" size={32} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    {step.id === 'bodyFat' ? (
                        <Text style={styles.unitLabelBelow}>{showWaist ? 'Centimeters' : 'Percent (%)'}</Text>
                    ) : null}
                </View>
            </Animated.View>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar style="dark" />
                <LinearGradient
                    colors={['#F8FAFC', '#F1F5F9', '#E2E8F0']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />

                <SafeAreaView style={styles.safeArea}>
                    
                    {/* Top Top Navigation */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                            <BlurView intensity={40} tint="light" style={styles.backBlur}>
                                <Ionicons name="chevron-back" size={24} color="#0F172A" />
                            </BlurView>
                        </TouchableOpacity>
                        <View style={styles.headerCenter}>
                            <Text style={styles.stepIndicatorText}>Step {currentStepIndex + 1} of {STEPS.length}</Text>
                        </View>
                        <View style={styles.backBtn} /> {/* Placeholder for balance */}
                    </View>

                    {/* Progress Bar Container */}
                    <View style={styles.progressTrackWrapper}>
                        <View style={styles.progressTrack}>
                            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                        </View>
                    </View>

                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                        style={styles.keyboardView}
                    >
                        {renderActiveStep()}
                        
                        {/* Floating Bottom Button */}
                        <View style={styles.footer}>
                            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                <TouchableOpacity
                                    style={[styles.nextBtn, !isCurrentStepValid() && styles.disabledBtn]}
                                    onPress={handleNext}
                                    onPressIn={animateButtonPressIn}
                                    onPressOut={animateButtonPressOut}
                                    disabled={!isCurrentStepValid()}
                                    activeOpacity={0.9}
                                >
                                    <LinearGradient
                                        colors={['#10B981', '#059669']}
                                        style={styles.btnGrad}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.btnText}>
                                            {currentStepIndex === STEPS.length - 1 ? 'FINISH' : 'CONTINUE'}
                                        </Text>
                                        <Ionicons 
                                            name={currentStepIndex === STEPS.length - 1 ? "checkmark-circle" : "arrow-forward"} 
                                            size={22} 
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
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 10,
    },
    headerCenter: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 20,
    },
    stepIndicatorText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    backBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    progressTrackWrapper: {
        paddingHorizontal: 24,
        marginBottom: 30,
    },
    progressTrack: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 3,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },
    stepContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: height * 0.1, // Offset center slightly upward
    },
    iconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    stepTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    stepSubtitle: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    switchBodyFatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginBottom: 30,
        gap: 8,
    },
    switchBodyFatText: {
        color: '#10B981',
        fontWeight: '700',
        fontSize: 14,
    },
    inputWrapper: {
        width: '100%',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 30,
        padding: 30,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
    },
    unitControlWrapper: {
        marginBottom: 20,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        padding: 4,
    },
    toggleBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    activeToggle: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94A3B8',
    },
    activeToggleText: {
        color: '#0F172A',
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    stepperBtn: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E2E8F0',
    },
    giantInput: {
        fontSize: 48,
        fontWeight: '900',
        color: '#0F172A',
        textAlign: 'center',
        minWidth: 100,
    },
    unitLabelBelow: {
        marginTop: 15,
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    footer: {
        paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    },
    nextBtn: {
        height: 64,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    disabledBtn: {
        opacity: 0.5,
        shadowOpacity: 0,
        transform: [{ scale: 1 }],
    },
    btnGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    btnText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },
});

export default BiometricScreen;
