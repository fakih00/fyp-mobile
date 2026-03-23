import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES } from '../../constants/Theme';
import { AnimatedCard } from '../../components';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const LifestyleScreen = ({ navigation, route }) => {
    const { userData } = route.params || {};
    const [jobType, setJobType] = useState('desk');
    const [stressLevel, setStressLevel] = useState('medium');
    const [steps, setSteps] = useState('');
    const [sleep, setSleep] = useState('');
    const [isFocused, setIsFocused] = useState(null);

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (steps && sleep) {
            navigation.navigate('Goal', {
                userData: {
                    ...userData,
                    job_type: jobType,
                    stress_level: stressLevel,
                    steps_estimate: parseInt(steps),
                    sleep_hours: parseFloat(sleep)
                }
            });
        }
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.goBack();
    };

    const renderOption = (label, value, current, setter, icon) => (
        <TouchableOpacity
            style={[styles.optionCard, current === value && styles.optionCardActive]}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setter(value);
            }}
        >
            <Ionicons name={icon} size={20} color={current === value ? '#10B981' : '#94A3B8'} />
            <Text style={[styles.optionLabel, current === value && styles.optionLabelActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const isValid = steps && sleep;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient colors={['#F8FAFC', '#ECFDF5']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                            <Text style={styles.title}>LIFESTYLE ANALYTICS</Text>
                            <Text style={styles.subtitle}>Environmental factors significantly influence metabolic adaptation and recovery potential.</Text>
                        </AnimatedCard>

                        <AnimatedCard delay={200} style={styles.formSection}>
                            <View style={styles.glassContainer}>
                                <Text style={styles.sectionTitle}>OCCUPATION TYPE</Text>
                                <View style={styles.optionsRow}>
                                    {renderOption('Desk Job', 'desk', jobType, setJobType, 'briefcase-outline')}
                                    {renderOption('Active Job', 'active', jobType, setJobType, 'walk-outline')}
                                </View>

                                <Text style={styles.sectionTitle}>STRESS EXPOSURE</Text>
                                <View style={styles.optionsRow}>
                                    {renderOption('Low', 'low', stressLevel, setStressLevel, 'sunny-outline')}
                                    {renderOption('Medium', 'medium', stressLevel, setStressLevel, 'cloud-outline')}
                                    {renderOption('High', 'high', stressLevel, setStressLevel, 'thunderstorm-outline')}
                                </View>

                                <View style={styles.inputStack}>
                                    <Text style={styles.inputLabel}>DAILY STEPS (ESTIMATE)</Text>
                                    <View style={[styles.inputWrapper, isFocused === 'steps' && styles.focusedInput]}>
                                        <TextInput
                                            style={styles.input}
                                            value={steps}
                                            onChangeText={setSteps}
                                            keyboardType="numeric"
                                            placeholder="e.g. 10000"
                                            onFocus={() => setIsFocused('steps')}
                                            onBlur={() => setIsFocused(null)}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputStack}>
                                    <Text style={styles.inputLabel}>SLEEP PER NIGHT (HOURS)</Text>
                                    <View style={[styles.inputWrapper, isFocused === 'sleep' && styles.focusedInput]}>
                                        <TextInput
                                            style={styles.input}
                                            value={sleep}
                                            onChangeText={setSleep}
                                            keyboardType="numeric"
                                            placeholder="e.g. 7.5"
                                            onFocus={() => setIsFocused('sleep')}
                                            onBlur={() => setIsFocused(null)}
                                        />
                                    </View>
                                </View>
                            </View>
                        </AnimatedCard>

                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.nextBtn, !isValid && styles.disabledBtn]}
                                onPress={handleNext}
                                disabled={!isValid}
                            >
                                <LinearGradient colors={['#10B981', '#059669']} style={styles.btnGrad}>
                                    <Text style={styles.btnText}>CALIBRATE GOALS</Text>
                                    <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    safeArea: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 40 },
    backBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
    backBlur: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    progressTrack: { flex: 1, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginLeft: 25, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },
    titleSection: { backgroundColor: 'transparent', elevation: 0, alignItems: 'center', marginBottom: 40 },
    title: { fontSize: 26, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, textAlign: 'center', marginBottom: 15 },
    subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
    formSection: { backgroundColor: 'transparent', elevation: 0 },
    glassContainer: { backgroundColor: COLORS.white, borderRadius: 35, padding: 25, gap: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 15, borderWidth: 1, borderColor: '#E2E8F0' },
    sectionTitle: { fontSize: 10, fontWeight: '900', color: '#10B981', letterSpacing: 2, marginBottom: 4, marginLeft: 5 },
    optionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    optionCard: { flex: 1, height: 50, borderRadius: 15, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
    optionCardActive: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
    optionLabel: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    optionLabelActive: { color: '#10B981' },
    inputStack: { gap: 10 },
    inputLabel: { fontSize: 10, fontWeight: '900', color: '#10B981', letterSpacing: 2, marginLeft: 5 },
    inputWrapper: { height: 60, backgroundColor: '#F8FAFC', borderRadius: 18, borderWIdth: 1, borderColor: 'transparent', paddingHorizontal: 20, justifyContent: 'center' },
    focusedInput: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
    input: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
    footer: { marginTop: 40, paddingBottom: 20 },
    nextBtn: { height: 65, borderRadius: 22, overflow: 'hidden' },
    disabledBtn: { opacity: 0.3 },
    btnGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    btnText: { fontSize: 14, fontWeight: '900', color: COLORS.white, letterSpacing: 1.5 },
});

export default LifestyleScreen;
