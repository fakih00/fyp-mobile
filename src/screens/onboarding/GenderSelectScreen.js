import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES } from '../../constants/Theme';
import { AnimatedCard } from '../../components';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const GenderSelectScreen = ({ navigation, route }) => {
    const [selectedGender, setSelectedGender] = useState(null);
    const { userData } = route.params || {};

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (selectedGender) {
            navigation.navigate('Biometric', {
                userData: { ...userData, gender: selectedGender.toLowerCase() }
            });
        }
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.goBack();
    };

    const GenderCard = ({ gender, icon }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedGender(gender);
            }}
            style={styles.cardWrapper}
        >
            <View style={[
                styles.card,
                selectedGender === gender && styles.selectedCard
            ]}>
                <View style={[
                    styles.iconCircle,
                    selectedGender === gender && styles.selectedIconCircle
                ]}>
                    <Ionicons
                        name={icon}
                        size={44}
                        color={selectedGender === gender ? COLORS.white : '#94A3B8'}
                    />
                </View>
                <Text style={[
                    styles.genderText,
                    selectedGender === gender && styles.selectedGenderText
                ]}>{gender.toUpperCase()}</Text>

                {selectedGender === gender && (
                    <View style={styles.checkBadge}>
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.checkBadgeGrad}
                        >
                            <Ionicons name="checkmark" size={14} color={COLORS.white} />
                        </LinearGradient>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

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
                        <View style={[styles.progressFill, { width: '20%' }]} />
                    </View>
                </View>

                <AnimatedCard delay={100} style={styles.titleSection}>
                    <Text style={styles.title}>IDENTIFY YOURSELF</Text>
                    <Text style={styles.subtitle}>Genetic baselines help our AI tailor your workout and nutrition metabolic algorithms.</Text>
                </AnimatedCard>

                <View style={styles.cardsRow}>
                    <GenderCard gender="Male" icon="male" />
                    <GenderCard gender="Female" icon="female" />
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.nextBtn, !selectedGender && styles.disabledBtn]}
                        onPress={handleNext}
                        disabled={!selectedGender}
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
        paddingHorizontal: 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 40,
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
        marginBottom: 60,
    },
    cardsRow: {
        flexDirection: 'row',
        gap: 20,
        height: 220,
    },
    cardWrapper: {
        flex: 1,
    },
    card: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 35,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    selectedCard: {
        borderColor: '#10B981',
        backgroundColor: '#ECFDF5',
    },
    iconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    selectedIconCircle: {
        backgroundColor: '#10B981',
    },
    genderText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 2,
    },
    selectedGenderText: {
        color: '#0F172A',
    },
    checkBadge: {
        position: 'absolute',
        top: 15,
        right: 15,
        width: 26,
        height: 26,
        borderRadius: 13,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#ECFDF5',
    },
    checkBadgeGrad: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        marginTop: 'auto',
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

export default GenderSelectScreen;
