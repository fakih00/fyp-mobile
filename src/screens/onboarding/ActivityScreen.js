import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES } from '../../constants/Theme';
import { AnimatedCard } from '../../components';
import { StatusBar } from 'expo-status-bar';

const { width, height: screenHeight } = Dimensions.get('window');

const ActivityScreen = ({ navigation, route }) => {
    const { userData } = route.params || {};
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Import API
    const { api } = require('../../services/api');
    const { AppContext } = require('../../context/AppContext'); // Import Context

    const LEVELS = [
        { id: 'sedentary', title: 'Resting State', desc: 'Minimal physical exertion. Focus on base health.', icon: 'bed' },
        { id: 'light', title: 'Active Lifestyle', desc: '1-3 sessions per week. Foundation building.', icon: 'walk' },
        { id: 'active', title: 'High Performance', desc: '3-5 sessions per week. Advanced metabolic load.', icon: 'bicycle' },
        { id: 'very_active', title: 'Elite Athlete', desc: '6-7 sessions per week. Maximum physiological demand.', icon: 'bolt' },
    ];

    const handleComplete = async () => { // Async
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (selectedLevel) {
            setLoading(true);

            // Map Frontend IDs to Database ENUMs
            const ACTIVITY_MAP = {
                'sedentary': 'sedentary',
                'light': 'lightly_active',
                'active': 'moderately_active',
                'very_active': 'very_active'
            };

            const GOAL_MAP = {
                'lose_weight': 'lose_weight',
                'build_muscle': 'gain_muscle',
                'keep_fit': 'maintain',
                'gain_weight': 'gain_muscle' // Mapping gain_weight to gain_muscle for now
            };

            const dbActivity = ACTIVITY_MAP[selectedLevel] || 'sedentary';
            const dbGoal = GOAL_MAP[userData.goal] || 'maintain';

            const finalProfile = { ...userData, activityLevel: dbActivity, goal: dbGoal };

            // Submit to Backend
            // updateUser needs user_id in body
            const res = await api.post('updateUser', {
                age: finalProfile.age,
                weight: finalProfile.weight,
                height: finalProfile.height,
                gender: finalProfile.gender ? finalProfile.gender.toLowerCase() : 'male',
                goal: finalProfile.goal,
                activity_level: finalProfile.activityLevel,
                training_location: userData.training_location || 'gym',
                training_days_per_week: userData.training_days_per_week || 3,
                dislikes: userData.dislikes || '',
                allergies: userData.allergies || '',
                meals_per_day: userData.meals_per_day || 4,
                // New Fields
                body_fat: userData.body_fat || null,
                waist_size: userData.waist_size || null,
                job_type: userData.job_type || 'desk',
                steps_estimate: userData.steps_estimate || 5000,
                sleep_hours: userData.sleep_hours || 7,
                stress_level: userData.stress_level || 'medium'
            });

            if (res.status === 200) {
                // Fetch AI Suggestion
                const suggestRes = await api.getSuggestedGoalWeight();
                if (suggestRes.status === 200) {
                    setPrediction(suggestRes.data);
                    setShowModal(true);
                } else {
                    // Fallback to finishing if AI fails
                    finishOnboarding(finalProfile);
                }
            } else {
                setLoading(false);
                alert(res.data.message || "Failed to save profile. Please try again.");
            }
        }
    };

    const finishOnboarding = async (user, suggestedWeight = null) => {
        setLoading(true);

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
                colors={['#F8FAFC', '#ECFDF5']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                        <BlurView intensity={40} tint="light" style={styles.backBlur}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                        </BlurView>
                    </TouchableOpacity>

                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: '100%' }]} />
                    </View>
                </View>

                <AnimatedCard delay={100} style={styles.titleSection}>
                    <Text style={styles.title}>ENERGY EXPENDITURE</Text>
                    <Text style={styles.subtitle}>Specify your current activity frequency to calibrate your daily macro-nutrient allowances.</Text>
                </AnimatedCard>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
                    {LEVELS.map((level, index) => (
                        <TouchableOpacity
                            key={level.id}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedLevel(level.id);
                            }}
                            activeOpacity={0.9}
                            style={styles.levelWrapper}
                        >
                            <AnimatedCard delay={200 + index * 100} style={[
                                styles.levelCard,
                                selectedLevel === level.id && styles.selectedLevelCard
                            ]}>
                                <View style={[
                                    styles.iconBox,
                                    selectedLevel === level.id && styles.selectedIconBox
                                ]}>
                                    <Ionicons
                                        name={level.icon}
                                        size={26}
                                        color={selectedLevel === level.id ? COLORS.white : '#10B981'}
                                    />
                                </View>

                                <View style={styles.textStack}>
                                    <Text style={[
                                        styles.levelTitle,
                                        selectedLevel === level.id && styles.selectedLevelTitle
                                    ]}>{level.title.toUpperCase()}</Text>
                                    <Text style={styles.levelDesc}>{level.desc}</Text>
                                </View>

                                {selectedLevel === level.id && (
                                    <View style={styles.checkIcon}>
                                        <LinearGradient
                                            colors={['#10B981', '#059669']}
                                            style={styles.checkGrad}
                                        >
                                            <Ionicons name="checkmark" size={16} color={COLORS.white} />
                                        </LinearGradient>
                                    </View>
                                )}
                            </AnimatedCard>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.nextBtn, !selectedLevel && styles.disabledBtn]}
                        onPress={handleComplete}
                        disabled={!selectedLevel || loading}
                    >
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.btnGrad}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <>
                                    <Text style={styles.btnText}>FINISH SETUP</Text>
                                    <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

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
                                    <Text style={styles.statVal}>{prediction?.estimated_current_bf}%</Text>
                                    <Text style={styles.statLab}>EST. BODY FAT</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statVal}>{prediction?.target_bf}%</Text>
                                    <Text style={styles.statLab}>TARGET BF</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statVal}>{prediction?.lbm}kg</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 35,
        paddingHorizontal: 30,
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
    titleSection: {
        backgroundColor: 'transparent',
        elevation: 0,
        alignItems: 'center',
        marginBottom: 30,
        paddingHorizontal: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: 15,
    },
    subtitle: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    listContainer: {
        paddingHorizontal: 30,
        gap: 15,
        paddingBottom: 40,
    },
    levelWrapper: {
        width: '100%',
    },
    levelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 30,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    selectedLevelCard: {
        borderColor: '#10B981',
        backgroundColor: '#ECFDF5',
    },
    iconBox: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    selectedIconBox: {
        backgroundColor: '#10B981',
    },
    textStack: {
        flex: 1,
    },
    levelTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 1,
        marginBottom: 4,
    },
    selectedLevelTitle: {
        color: '#059669',
    },
    levelDesc: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 18,
    },
    checkIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
        marginLeft: 10,
    },
    checkGrad: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        paddingHorizontal: 30,
        paddingTop: 10,
        paddingBottom: 30,
    },
    nextBtn: {
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
    },
    disabledBtn: {
        opacity: 0.3,
    },
    btnGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    btnText: {
        fontSize: 15,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1.5,
    },
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
