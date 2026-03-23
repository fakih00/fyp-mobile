import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES } from '../../constants/Theme';
import { AnimatedCard } from '../../components';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const GoalScreen = ({ navigation, route }) => {
    const { userData } = route.params || {};
    const [selectedGoal, setSelectedGoal] = useState(null);

    const GOALS = [
        { id: 'lose_weight', title: 'Fat Destruction', desc: 'Accelerated thermogenesis and fat-burning protocols.', icon: 'flame' },
        { id: 'build_muscle', title: 'Hypertrophy', desc: 'Engineered mass gain and peak strength levels.', icon: 'barbell' },
        { id: 'keep_fit', title: 'Optimal Health', desc: 'Precision maintenance of peak physiological state.', icon: 'heart' },
        { id: 'gain_weight', title: 'Power Bulk', desc: 'High-density caloric intake and recovery focus.', icon: 'nutrition' },
    ];

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (selectedGoal) {
            navigation.navigate('TrainingPreference', {
                userData: { ...userData, goal: selectedGoal }
            });
        }
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
                        <View style={[styles.progressFill, { width: '60%' }]} />
                    </View>
                </View>

                <AnimatedCard delay={100} style={styles.titleSection}>
                    <Text style={styles.title}>SELECT OBJECTIVE</Text>
                    <Text style={styles.subtitle}>Your primary target determines the AI profile assigned to your coaching logic.</Text>
                </AnimatedCard>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
                    {GOALS.map((goal, index) => (
                        <TouchableOpacity
                            key={goal.id}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedGoal(goal.id);
                            }}
                            activeOpacity={0.9}
                            style={styles.goalWrapper}
                        >
                            <AnimatedCard delay={200 + index * 100} style={[
                                styles.goalCard,
                                selectedGoal === goal.id && styles.selectedGoalCard
                            ]}>
                                <View style={[
                                    styles.iconBox,
                                    selectedGoal === goal.id && styles.selectedIconBox
                                ]}>
                                    <Ionicons
                                        name={goal.icon}
                                        size={26}
                                        color={selectedGoal === goal.id ? COLORS.white : '#10B981'}
                                    />
                                </View>

                                <View style={styles.textStack}>
                                    <Text style={[
                                        styles.goalTitle,
                                        selectedGoal === goal.id && styles.selectedGoalTitle
                                    ]}>{goal.title.toUpperCase()}</Text>
                                    <Text style={styles.goalDesc}>{goal.desc}</Text>
                                </View>

                                {selectedGoal === goal.id && (
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
                        style={[styles.nextBtn, !selectedGoal && styles.disabledBtn]}
                        onPress={handleNext}
                        disabled={!selectedGoal}
                    >
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.btnGrad}
                        >
                            <Text style={styles.btnText}>CONTINUE</Text>
                            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
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
    goalWrapper: {
        width: '100%',
    },
    goalCard: {
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
    selectedGoalCard: {
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
    goalTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 1,
        marginBottom: 4,
    },
    selectedGoalTitle: {
        color: '#059669',
    },
    goalDesc: {
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
});

export default GoalScreen;
