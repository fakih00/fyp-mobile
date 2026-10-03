import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    Dimensions, 
    Modal, 
    ActivityIndicator,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/Theme';
import { StatusBar } from 'expo-status-bar';
import { api } from '../../services/api';

const { width, height: screenHeight } = Dimensions.get('window');

const ActivityScreen = ({ navigation, route }) => {
    const { userData } = route.params || {};
    
    // Status states for UI
    const [prediction, setPrediction] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        // Start Auto-Process immediately
        runAutomatedAnalysis();
    }, []);

    const calculateActivityLevel = (data) => {
        const days = data.training_days_per_week || parseInt(data.training_frequency || 0) || 3;
        const job = data.job_type || 'desk';
        const steps = data.steps_estimate || 5000;

        // Base points
        let score = 0;
        
        // Training frequency points
        if (days >= 5) score += 3;
        else if (days >= 3) score += 2;
        else if (days >= 1) score += 1;

        // Lifestyle points
        if (job === 'active' || steps >= 10000) score += 1;
        if (steps > 15000) score += 1; // Extremely active

        // Map to DB Enum
        if (score >= 4) return 'very_active';
        if (score === 3) return 'moderately_active';
        if (score >= 1) return 'lightly_active';
        
        // Lowest activity classification
        return 'sedentary';
    };

    const runAutomatedAnalysis = async () => {
        try {
            // Determine activity level algorithmically based on prior screens
            const calculatedActivity = calculateActivityLevel(userData);

            // Only remap the 4 legacy display-name goals to their DB equivalents.
            // All new sport goals (boxing, running, swimming, cycling, martial_arts,
            // yoga_flexibility, keep_fit, gain_weight) are stored exactly as picked
            // because the DB ENUM was already expanded to include them.
            const LEGACY_GOAL_MAP = {
                'build_muscle': 'build_muscle',  // already correct
                'lose_weight':  'lose_weight',   // already correct
                'keep_fit':     'keep_fit',      // already correct
                'gain_weight':  'gain_weight',   // already correct
            };
            // Pass the goal through as-is (sport goals go straight to DB).
            // LEGACY_GOAL_MAP is only here for documentation; we keep the raw value.
            const dbGoal = userData.goal || 'lose_weight';

            const finalProfile = { ...userData, activityLevel: calculatedActivity, goal: dbGoal };

            const res = await api.post('updateUser', {
                age: finalProfile.age,
                weight: finalProfile.weight,
                height: finalProfile.height,
                gender: finalProfile.gender ? finalProfile.gender.toLowerCase() : 'male',
                goal: finalProfile.goal,
                activity_level: finalProfile.activityLevel,
                training_location: userData.training_location || 'gym',
                training_days_per_week: userData.training_days_per_week || 3,
                training_intensity: userData.training_intensity || 'moderate',
                dislikes: userData.dislikes || '',
                allergies: userData.allergies || '',
                meals_per_day: userData.meals_per_day || 4,
                body_fat: userData.body_fat || null,
                waist_size: userData.waist_size || null,
                job_type: userData.job_type || 'desk',
                steps_estimate: userData.steps_estimate || 5000,
                sleep_hours: userData.sleep_hours || 7,
                stress_level: userData.stress_level || 'medium',
                injuries: userData.injuries || '',
                pain_points: userData.pain_points || '',
                strong_side: userData.strong_side || '',
                posture_problems: userData.posture_problems || '',
                mobility_limitations: userData.mobility_limitations || '',
                avoid_areas: userData.avoid_areas || '',
                chronic_pain: userData.chronic_pain || ''
            });

            if (res.status === 200) {
                // Fetch AI Suggestion
                const suggestRes = await api.getSuggestedGoalWeight();
                
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                
                if (suggestRes.status === 200) {
                    setPrediction(suggestRes.data);
                    setShowModal(true); // Show instantly without artificial timeout
                } else {
                    // Continue onboarding if AI prediction fails
                    finishOnboarding(finalProfile);
                }

            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setErrorMsg(res.data.message || "Failed to save profile. Please try again.");
            }
        } catch (e) {
            console.error("Analysis Error:", e);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setErrorMsg("An unexpected network error occurred.");
        }
    };

    const finishOnboarding = async (user, suggestedWeight = null) => {
        // Safe navigation cleanup for the AI modal acceptance
        setShowModal(false);

        if (suggestedWeight) {
            await api.post('updateUser', {
                target_weight: suggestedWeight,
                suggested_goal_weight: suggestedWeight
            });
        }

        // Generate Plans inside the new Screen
        navigation.reset({
            index: 0,
            routes: [{
                name: 'GeneratingPlan',
                params: { userData: user, suggestedWeight: suggestedWeight }
            }],
        });
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#F8FAFC', '#ECFDF5']} // Matching the LifestyleScreen background seamlessly
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                        <BlurView intensity={40} tint="light" style={styles.backBlur}>
                            <Ionicons name="chevron-back" size={24} color="#0F172A" />
                        </BlurView>
                    </TouchableOpacity>
                </View>
                {errorMsg ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="warning" size={60} color="#EF4444" />
                        <Text style={styles.errorTitle}>Analysis Failed</Text>
                        <Text style={styles.errorText}>{errorMsg || ''}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => { setErrorMsg(''); runAutomatedAnalysis(); }}>
                            <Text style={styles.retryBtnText}>RETRY</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.processingContainer}>
                        <ActivityIndicator size="large" color="#10B981" />
                        <Text style={styles.processingText}>Synchronizing Profile...</Text>
                    </View>
                )}
            </SafeAreaView>

            {/* AI Goal Discovery Modal */}
            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.modalContent}>
                        <LinearGradient colors={['#fff', '#f0fff4']} style={styles.modalGrad}>
                            <View style={styles.aiBadge}>
                                <Ionicons name="sparkles" size={16} color="#10B981" />
                                <Text style={styles.aiBadgeText}>AI TARGET DISCOVERY</Text>
                            </View>

                            <Text style={styles.modalTitle}>SUGGESTED GOAL</Text>
                            <View style={styles.weightDisplay}>
                                <Text style={styles.weightValue}>{prediction?.suggested_weight}</Text>
                                <Text style={styles.weightUnit}>KG</Text>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statVal}>{prediction ? `${prediction.estimated_current_bf}%` : '-'}</Text>
                                    <Text style={styles.statLab}>EST. BODY FAT</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statVal}>{prediction ? `${prediction.target_bf}%` : '-'}</Text>
                                    <Text style={styles.statLab}>TARGET BF</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statVal}>{prediction ? `${prediction.lbm}kg` : '-'}</Text>
                                    <Text style={styles.statLab}>LEAN MASS</Text>
                                </View>
                            </View>

                            <ScrollView style={styles.analysisBox} showsVerticalScrollIndicator={false}>
                                <Text style={styles.analysisText}>{prediction?.analysis}</Text>
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.acceptBtn}
                                    onPress={() => finishOnboarding(userData, prediction.suggested_weight)}
                                >
                                    <LinearGradient colors={['#10B981', '#059669']} style={styles.modalBtnGrad}>
                                        <Text style={styles.acceptText}>ACCEPT AI GOAL</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.customBtn}
                                    onPress={() => finishOnboarding(userData)}
                                >
                                    <Text style={styles.customText}>SET LATER</Text>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>
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
    safeArea: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
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
    processingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    processingText: {
        marginTop: 20,
        fontSize: 14,
        color: '#64748B',
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0F172A',
        marginTop: 20,
        marginBottom: 10,
    },
    errorText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    retryBtn: {
        backgroundColor: '#10B981',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 20,
    },
    retryBtnText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 14,
        letterSpacing: 1,
    },
    
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        height: screenHeight * 0.75,
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        overflow: 'hidden',
    },
    modalGrad: {
        flex: 1,
        padding: 30,
        alignItems: 'center',
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 20,
        gap: 8,
    },
    aiBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#059669',
        letterSpacing: 2,
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 3,
        marginBottom: 10,
    },
    weightDisplay: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 30,
    },
    weightValue: {
        fontSize: 80,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -2,
    },
    weightUnit: {
        fontSize: 24,
        fontWeight: '700',
        color: '#10B981',
        marginLeft: 10,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 25,
        marginBottom: 25,
    },
    statItem: {
        alignItems: 'center',
    },
    statVal: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    statLab: {
        fontSize: 8,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1,
    },
    analysisBox: {
        flex: 1,
        width: '100%',
        marginBottom: 30,
    },
    analysisText: {
        fontSize: 15,
        color: '#475569',
        lineHeight: 26,
        textAlign: 'center',
        fontWeight: '500',
    },
    modalActions: {
        width: '100%',
        gap: 15,
        paddingBottom: 20,
    },
    acceptBtn: {
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
    },
    modalBtnGrad: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptText: {
        fontSize: 15,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1.5,
    },
    customBtn: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    customText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1,
    },
});

export default ActivityScreen;
