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

const TrainingPreferenceScreen = ({ navigation, route }) => {
    const { userData } = route.params || {};
    const [selectedLocation, setSelectedLocation] = useState('gym');
    const [selectedDays, setSelectedDays] = useState(3);
    const [selectedIntensity, setSelectedIntensity] = useState('moderate');

    const LOCATIONS = [
        { id: 'home', title: 'Home Base', desc: 'No equipment needed. Bodyweight focus.', icon: 'home' },
        { id: 'gym', title: 'Power Gym', desc: 'Full gear access. Max hypertrophy potential.', icon: 'business' },
        { id: 'outdoor', title: 'Wild Hybrid', desc: 'Outdoor stations and dynamic environments.', icon: 'leaf' },
    ];

    const INTENSITIES = [
        { id: 'light', title: 'Light', desc: 'Focus on mobility and health.', icon: 'pulse' },
        { id: 'moderate', title: 'Moderate', desc: 'Balanced growth and stamina.', icon: 'fitness' },
        { id: 'heavy', title: 'Heavy', desc: 'Elite muscle and power building.', icon: 'barbell' },
    ];

    const DAYS = [1, 2, 3, 4, 5, 6, 7];

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('DietaryPreference', {
            userData: {
                ...userData,
                training_location: selectedLocation,
                training_days_per_week: selectedDays,
                training_intensity: selectedIntensity
            }
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
                        <View style={[styles.progressFill, { width: '80%' }]} />
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <AnimatedCard delay={100} style={styles.titleSection}>
                        <Text style={styles.title}>TRAINING HUB</Text>
                        <Text style={styles.subtitle}>Where do you plan to conquer your sessions and how often per week?</Text>
                    </AnimatedCard>

                    <Text style={styles.sectionLabel}>PRESET ENVIRONMENT</Text>
                    <View style={styles.locationGrid}>
                        {LOCATIONS.map((loc, index) => (
                            <TouchableOpacity
                                key={loc.id}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedLocation(loc.id);
                                }}
                                style={[
                                    styles.locationCard,
                                    selectedLocation === loc.id && styles.selectedLocationCard
                                ]}
                            >
                                <View style={[
                                    styles.locIconBox,
                                    selectedLocation === loc.id && styles.selectedLocIconBox
                                ]}>
                                    <Ionicons name={loc.icon} size={24} color={selectedLocation === loc.id ? COLORS.white : '#10B981'} />
                                </View>
                                <Text style={[styles.locTitle, selectedLocation === loc.id && styles.selectedLocTitle]}>{loc.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sectionLabel}>TRAINING INTENSITY</Text>
                    <View style={styles.locationGrid}>
                        {INTENSITIES.map((int, index) => (
                            <TouchableOpacity
                                key={int.id}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedIntensity(int.id);
                                }}
                                style={[
                                    styles.locationCard,
                                    selectedIntensity === int.id && styles.selectedLocationCard
                                ]}
                            >
                                <View style={[
                                    styles.locIconBox,
                                    selectedIntensity === int.id && styles.selectedLocIconBox
                                ]}>
                                    <Ionicons name={int.icon} size={24} color={selectedIntensity === int.id ? COLORS.white : '#10B981'} />
                                </View>
                                <Text style={[styles.locTitle, selectedIntensity === int.id && styles.selectedLocTitle]}>{int.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sectionLabel}>WEEKLY FREQUENCY</Text>
                    <View style={styles.daysGrid}>
                        {DAYS.map((day) => (
                            <TouchableOpacity
                                key={day}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedDays(day);
                                }}
                                style={[
                                    styles.dayCircle,
                                    selectedDays === day && styles.selectedDayCircle
                                ]}
                            >
                                <Text style={[styles.dayText, selectedDays === day && styles.selectedDayText]}>{day}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.daySubtext}>{selectedDays} sessions per week configured.</Text>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.nextBtn}
                        onPress={handleNext}
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
    scrollContent: {
        paddingHorizontal: 30,
        paddingBottom: 40,
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
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 2,
        marginBottom: 20,
        marginTop: 10,
    },
    locationGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    locationCard: {
        width: (width - 80) / 3,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    selectedLocationCard: {
        borderColor: '#10B981',
        backgroundColor: '#ECFDF5',
    },
    locIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    selectedLocIconBox: {
        backgroundColor: '#10B981',
    },
    locTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#64748B',
    },
    selectedLocTitle: {
        color: '#059669',
    },
    daysGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    dayCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedDayCircle: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#64748B',
    },
    selectedDayText: {
        color: COLORS.white,
    },
    daySubtext: {
        fontSize: 12,
        color: '#94A3B8',
        fontStyle: 'italic',
    },
    footer: {
        paddingHorizontal: 30,
        paddingBottom: 30,
        marginTop: 'auto',
    },
    nextBtn: {
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
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

export default TrainingPreferenceScreen;
