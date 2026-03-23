import React, { useState, useEffect } from 'react';
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
    const [weightUnit, setWeightUnit] = useState('KG'); // KG or LBS
    const [heightUnit, setHeightUnit] = useState('CM'); // CM or FT
    const [focusedInput, setFocusedInput] = useState(null);

    // Helpers for unit conversion logic (Internal storage should ideally be metric)
    // For this UI implementation, we will keep the value as the user sees it, 
    // but in a real app you might want to convert before sending to backend.

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Simple validation
        if (age && weight && height && (bodyFat || waistSize)) {
            // Normalize data for backend if necessary - assuming backend handles raw values or we send units
            // For now passing as is, adding unit info could be useful
            navigation.navigate('Lifestyle', {
                userData: {
                    ...userData,
                    age,
                    weight,
                    height,
                    body_fat: bodyFat,
                    waist_size: waistSize, // Optional
                    weight_unit: weightUnit,
                    height_unit: heightUnit
                }
            });
        }
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.goBack();
    };

    const adjustValue = (setter, value, amount) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const current = parseFloat(value) || 0;
        const newValue = Math.max(0, current + amount);
        setter(newValue.toString());
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                <BlurView intensity={40} tint="light" style={styles.backBlur}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </BlurView>
            </TouchableOpacity>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: '40%' }]} />
            </View>
        </View>
    );

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

    const renderCard = (title, value, setValue, icon, unitControl = null, isMain = false, step = 1) => (
        <AnimatedCard delay={100} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardLabelRow}>
                    <View style={styles.iconContainer}>
                        <Ionicons name={icon} size={20} color="#10B981" />
                    </View>
                    <Text style={styles.cardTitle}>{title}</Text>
                </View>
                {unitControl}
            </View>

            <View style={styles.inputRow}>
                <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => adjustValue(setValue, value, -step)}
                >
                    <Ionicons name="remove" size={24} color="#64748B" />
                </TouchableOpacity>

                <View style={styles.inputContainer}>
                    <TextInput
                        value={value}
                        onChangeText={setValue}
                        placeholder="0"
                        keyboardType="numeric"
                        style={styles.mainInput}
                        placeholderTextColor="#CBD5E1"
                        onFocus={() => setFocusedInput(title)}
                        onBlur={() => setFocusedInput(null)}
                    />
                </View>

                <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => adjustValue(setValue, value, step)}
                >
                    <Ionicons name="add" size={24} color="#64748B" />
                </TouchableOpacity>
            </View>
        </AnimatedCard>
    );

    const isValid = age && weight && height && (bodyFat || waistSize);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#F8FAFC', '#F1F5F9']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {renderHeader()}

                        <Text style={styles.pageTitle}>Your Body Metrics</Text>
                        <Text style={styles.pageSubtitle}>
                            Accurate measurements help us calculate your BMR and design the perfect plan.
                        </Text>

                        <View style={styles.grid}>
                            {/* Age Card */}
                            {renderCard('Age', age, setAge, 'calendar-outline', null, false, 1)}

                            {/* Weight Card */}
                            {renderCard(
                                'Weight',
                                weight,
                                setWeight,
                                'scale-outline',
                                renderUnitToggle(weightUnit, setWeightUnit, 'KG', 'LBS'),
                                true,
                                0.5
                            )}

                            {/* Height Card */}
                            {renderCard(
                                'Height',
                                height,
                                setHeight,
                                'resize-outline',
                                renderUnitToggle(heightUnit, setHeightUnit, 'CM', 'FT'),
                                true,
                                1
                            )}

                            {/* Body Fat / Waist Toggle */}
                            <AnimatedCard delay={200} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardLabelRow}>
                                        <View style={styles.iconContainer}>
                                            <Ionicons name={showWaist ? "body-outline" : "pie-chart-outline"} size={20} color="#10B981" />
                                        </View>
                                        <Text style={styles.cardTitle}>{showWaist ? 'Waist Size' : 'Body Fat %'}</Text>
                                    </View>

                                    <TouchableOpacity onPress={() => setShowWaist(!showWaist)}>
                                        <Text style={styles.linkText}>
                                            {showWaist ? 'Know Body Fat %?' : 'Use Waist Size instead?'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputRow}>
                                    {showWaist ? (
                                        <>
                                            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustValue(setWaistSize, waistSize, -1)}>
                                                <Ionicons name="remove" size={24} color="#64748B" />
                                            </TouchableOpacity>
                                            <TextInput
                                                value={waistSize}
                                                onChangeText={setWaistSize}
                                                placeholder="0 cm"
                                                keyboardType="numeric"
                                                style={styles.mainInput}
                                                placeholderTextColor="#CBD5E1"
                                            />
                                            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustValue(setWaistSize, waistSize, 1)}>
                                                <Ionicons name="add" size={24} color="#64748B" />
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustValue(setBodyFat, bodyFat, -0.5)}>
                                                <Ionicons name="remove" size={24} color="#64748B" />
                                            </TouchableOpacity>
                                            <TextInput
                                                value={bodyFat}
                                                onChangeText={setBodyFat}
                                                placeholder="0 %"
                                                keyboardType="numeric"
                                                style={styles.mainInput}
                                                placeholderTextColor="#CBD5E1"
                                            />
                                            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustValue(setBodyFat, bodyFat, 0.5)}>
                                                <Ionicons name="add" size={24} color="#64748B" />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </AnimatedCard>

                        </View>

                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.nextBtn, !isValid && styles.disabledBtn]}
                                onPress={handleNext}
                                disabled={!isValid}
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.btnGrad}
                                >
                                    <Text style={styles.btnText}>CONTINUE</Text>
                                    <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
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
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 20,
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
    pageTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
    },
    pageSubtitle: {
        fontSize: 15,
        color: '#64748B',
        lineHeight: 22,
        marginBottom: 30,
    },
    grid: {
        gap: 16,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 3,
    },
    toggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    activeToggle: {
        backgroundColor: COLORS.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    toggleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
    },
    activeToggleText: {
        color: '#0F172A',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
    },
    stepperBtn: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    inputContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainInput: {
        fontSize: 32,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        width: '100%',
    },
    linkText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
    },
    footer: {
        marginTop: 40,
        paddingBottom: 20,
    },
    nextBtn: {
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    disabledBtn: {
        opacity: 0.4,
        shadowOpacity: 0,
    },
    btnGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    btnText: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: 1,
    },
});

export default BiometricScreen;

