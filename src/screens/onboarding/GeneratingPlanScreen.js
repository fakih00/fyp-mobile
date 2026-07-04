import React, { useEffect, useState, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { COLORS, THEMES, DEFAULT_THEME } from '../../constants/Theme';
import { AppContext } from '../../context/AppContext';
import { api } from '../../services/api';
import { AuraBackground } from '../../components';

const { width } = Dimensions.get('window');

const LOADING_PHASES = [
    { text: "Analyzing Biometric Profile", icon: "body-outline" },
    { text: "Calculating Energy Expenditure", icon: "flame-outline" },
    { text: "Structuring Macro Targets", icon: "nutrition-outline" },
    { text: "Generating Workout Split", icon: "barbell-outline" },
    { text: "Finalizing Elite Plan", icon: "sparkles-outline" }
];

const GeneratingPlanScreen = ({ navigation, route }) => {
    const { userData, suggestedWeight } = route.params || {};
    const { loadUserData, themeName } = useContext(AppContext);
    const colors = THEMES[themeName] || THEMES[DEFAULT_THEME];
    const textColor = colors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = colors.isDark ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.7)';

    const [phaseIndex, setPhaseIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Pulse effect
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                })
            ])
        ).start();

        // Rotate effect
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Simulate phase transitions and progress bar over 1 minute (60s)
        const totalDuration = 60000;
        const phaseDuration = totalDuration / LOADING_PHASES.length;

        let currentProgress = 0;
        const progressInterval = setInterval(() => {
            currentProgress += (100 / (totalDuration / 100)); // Update every 100ms
            if (currentProgress > 100) currentProgress = 100;
            setProgress(currentProgress);
        }, 100);

        const phaseInterval = setInterval(() => {
            setPhaseIndex(prev => {
                const next = prev + 1;
                if (next < LOADING_PHASES.length) {
                    // Fade out/in effect on text change
                    Animated.sequence([
                        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
                    ]).start();
                    return next;
                }
                return prev;
            });
        }, phaseDuration);

        // Core Generation Logic
        const generatePlans = async () => {
            try {
                // 1. Finalize profile if needed (from ActivityScreen accept AI goal flow)
                if (suggestedWeight && userData?.user_id) {
                    await api.post('updateUser', {
                        target_weight: suggestedWeight,
                        suggested_goal_weight: suggestedWeight
                    });
                }

                // 2. Generate plans sequentially — PHP's built-in server is single-threaded,
                //    concurrent requests would just queue up and each block for ~60s anyway.
                const hasInjury = !!(userData?.injuries && userData.injuries.trim() !== '' && userData.injuries.toLowerCase() !== 'none');
                
                let workoutResult = null;
                if (!hasInjury) {
                    workoutResult = await api.post('generatePlan', { type: 'workout' });
                    console.log('Workout result status:', workoutResult?.status);
                } else {
                    console.log('Skipping workout generation — user has injuries. Plan will be generated from WorkoutPlan screen after recovery assessment.');
                }
                const nutritionResult = await api.post('generatePlan', { type: 'nutrition' });

                // Fast forward progress if it finishes early
                clearInterval(progressInterval);
                setProgress(100);

                // Log results for debugging
                console.log('Nutrition result status:', nutritionResult?.status);

                // 3. Hydrate state — isolated so a fetch failure here doesn't
                //    trigger the catch block and incorrectly navigate to Login.
                try {
                    await loadUserData();
                } catch (hydrationError) {
                    console.warn('loadUserData failed, continuing to Main anyway:', hydrationError);
                }

                // Navigate based on injury profile
                setTimeout(() => {
                    if (hasInjury) {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'InjuryWarning', params: { userData } }],
                        });
                    } else {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Main' }],
                        });
                    }
                }, 1000); // Small delay to let user see 100%

            } catch (error) {
                console.error("AI Generation failed:", error);
                alert("Generation took too long or failed. Please try logging in again.");
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                });
            }
        };

        generatePlans();

        return () => {
            clearInterval(phaseInterval);
            clearInterval(progressInterval);
        };
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style={colors.isDark ? "light" : "dark"} />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>

                    <View style={styles.animationContainer}>
                        {/* Outer rotating ring */}
                        <Animated.View style={[styles.ring, { borderColor: colors.accent, transform: [{ rotate: spin }] }]} />

                        {/* Middle pulsing ring */}
                        <Animated.View style={[
                            styles.pulseBlob,
                            { backgroundColor: colors.accent, transform: [{ scale: pulseAnim }], opacity: 0.15 }
                        ]} />

                        {/* Center Element */}
                        <View style={[styles.centerCircle, { backgroundColor: colors.cardBg, borderColor: colors.accent }]}>
                            <Ionicons name="hardware-chip" size={40} color={colors.accent} />
                        </View>
                    </View>

                    <Text style={[styles.title, { color: textColor }]}>AI SYSTEM ACTIVE</Text>
                    <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                        <Ionicons name={String(LOADING_PHASES[phaseIndex].icon)} size={28} color={subTextColor} style={styles.phaseIcon} />
                        <Text style={[styles.phaseText, { color: subTextColor }]}>
                            {`${LOADING_PHASES[phaseIndex].text}...`}
                        </Text>
                    </Animated.View>

                </View>

                <View style={styles.footer}>
                    <Text style={[styles.percentage, { color: textColor }]}>{Math.round(progress)}%</Text>
                    <View style={styles.progressBarBg}>
                        <LinearGradient
                            colors={colors.gradient}
                            style={[styles.progressBarFill, { width: `${progress}%` }]}
                        />
                    </View>
                    <Text style={[styles.disclaimer, { color: subTextColor }]}>
                        Crafting your personalized 30-day program. This takes approx. 1 minute. Do not close the app.
                    </Text>
                </View>
            </SafeAreaView>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    animationContainer: {
        width: 250,
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 50,
    },
    ring: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderStyle: 'dashed',
        opacity: 0.5,
    },
    pulseBlob: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    centerCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 20,
    },
    phaseIcon: {
        marginBottom: 10,
    },
    phaseText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: 40,
        paddingBottom: 50,
        alignItems: 'center',
    },
    percentage: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 15,
    },
    progressBarBg: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(150, 150, 150, 0.2)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 20,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    disclaimer: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 20,
    }
});

export default GeneratingPlanScreen;
