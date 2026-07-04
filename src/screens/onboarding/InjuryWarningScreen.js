import React, { useState, useRef, useEffect, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated,
    Modal,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { COLORS, THEMES, DEFAULT_THEME } from '../../constants/Theme';
import { AppContext } from '../../context/AppContext';
import { api } from '../../services/api';
import { AuraBackground } from '../../components';

const { width } = Dimensions.get('window');

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

const InjuryWarningScreen = ({ navigation, route }) => {
    const { userData } = route.params || {};
    const { loadUserData, themeName } = useContext(AppContext);
    const colors = THEMES[themeName] || THEMES[DEFAULT_THEME];

    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Animations
    const warningPulse = useRef(new Animated.Value(1)).current;
    const contentFade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Warning Icon Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(warningPulse, {
                    toValue: 1.15,
                    duration: 1200,
                    useNativeDriver: true
                }),
                Animated.timing(warningPulse, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true
                })
            ])
        ).start();

        // Screen Fade In
        Animated.timing(contentFade, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
        }).start();
    }, []);

    const injuriesList = userData?.injuries
        ? userData.injuries.split(',').map(item => PART_LABELS[item.trim()] || item.replace(/_/g, ' ')).join(', ')
        : 'Active Joint Injury';

    const handleAcceptRecovery = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Reset navigation stack to Main Tab, and mount BodyRecovery on top of it
        navigation.reset({
            index: 1,
            routes: [
                { name: 'Main' },
                { name: 'BodyRecovery' }
            ]
        });
    };

    const handleBypassTraining = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setShowDisclaimer(true);
    };

    const confirmBypass = async () => {
        setShowDisclaimer(false);
        setGenerating(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            // User chooses to train anyway -> we generate standard modified plan now
            const res = await api.post('generatePlan', { type: 'workout' });
            console.log('Workout generation bypass result status:', res?.status);

            // Hydrate state
            try {
                await loadUserData();
            } catch (hydrationError) {
                console.warn('loadUserData failed, continuing anyway:', hydrationError);
            }

            // Navigate to Main Plan Dashboard
            navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }]
            });
        } catch (e) {
            console.error(e);
            alert("AI generation failed. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView style={styles.safeArea}>
                <Animated.View style={[styles.mainContent, { opacity: contentFade }]}>
                    
                    {/* Header Alert badge */}
                    <View style={styles.alertHeaderBadge}>
                        <Ionicons name="shield-alert" size={14} color="#EF4444" />
                        <Text style={styles.alertHeaderBadgeText}>BIOMECHANICAL RISK IN EFFECT</Text>
                    </View>

                    {/* Warning Center Icon */}
                    <View style={styles.iconWrapper}>
                        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: warningPulse }], backgroundColor: 'rgba(239, 68, 68, 0.12)' }]} />
                        <View style={styles.centerIconCircle}>
                            <Ionicons name="alert-circle" size={56} color="#EF4444" />
                        </View>
                    </View>

                    {/* Warning Text */}
                    <Text style={styles.title}>INJURY DETECTED</Text>
                    <Text style={styles.subtitle}>
                        Your assessment flagged active discomfort or acute symptoms in:
                    </Text>

                    {/* Active Injury Box */}
                    <View style={styles.injuryBox}>
                        <Ionicons name="pulse" size={18} color="#EF4444" />
                        <Text style={styles.injuryText}>{injuriesList.toUpperCase()}</Text>
                    </View>

                    {/* Clinical Rationale */}
                    <View style={styles.rationaleContainer}>
                        <Text style={styles.rationaleTitle}>SPORTS CLINIC RECOMMENDATION</Text>
                        <Text style={styles.rationaleText}>
                            Continuing standard high-intensity loading on a compromised kinetic chain increases the risk of tendon tears, joint micro-fractures, or permanent postural compensation. 
                        </Text>
                        <Text style={styles.rationaleText}>
                            Initiating a <Text style={{ fontWeight: 'bold', color: '#059669' }}>Recovery & Rehabilitation Phase</Text> pivots your program to low-impact therapeutic holds, mobility work, and targeted blood flow stimulation to rebuild safety parameters.
                        </Text>
                    </View>

                    {/* Buttons Deck */}
                    <View style={styles.buttonDeck}>
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleAcceptRecovery}>
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.btnGrad}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <View style={styles.btnContent}>
                                    <Text style={styles.btnText}>START RECOVERY PHASE</Text>
                                    <Text style={styles.btnSubtext}>Activate clinic assessment & therapeutic program (Recommended)</Text>
                                </View>
                                <Ionicons name="heart-half" size={24} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryBtn} onPress={handleBypassTraining}>
                            <Text style={styles.secondaryBtnText}>BYPASS & TRAIN ANYWAY</Text>
                            <Text style={styles.secondaryBtnSubtext}>Generate injury-restricted standard workout plan</Text>
                        </TouchableOpacity>
                    </View>

                </Animated.View>
            </SafeAreaView>

            {/* Disclaimer Modal */}
            <Modal visible={showDisclaimer} transparent animationType="fade" onRequestClose={() => setShowDisclaimer(false)}>
                <BlurView intensity={90} tint="dark" style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconBox}>
                            <Ionicons name="warning" size={32} color="#EF4444" />
                        </View>
                        <Text style={styles.modalTitle}>LIABILITY & SAFETY WARNING</Text>
                        
                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalText}>
                                By training with active injuries, you are proceeding against sports-science clinical advice. 
                            </Text>
                            <Text style={styles.modalText}>
                                You acknowledge that you are fully responsible for your safety and any potential set-backs, structural aggravations, or chronic joint degradation.
                            </Text>
                            <Text style={styles.modalText}>
                                We will generate a plan designed to avoid loading the <Text style={{ fontWeight: 'bold' }}>{injuriesList}</Text> area as much as possible, but you must monitor pain thresholds and stop immediately if symptoms escalate.
                            </Text>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDisclaimer(false); }}>
                                <Text style={styles.modalCancelBtnText}>CANCEL & RE-CONSIDER</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.modalAcceptBtn} onPress={confirmBypass}>
                                <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.modalAcceptGrad}>
                                    <Text style={styles.modalAcceptBtnText}>I ACCEPT - GENERATE PLAN</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </BlurView>
            </Modal>

            {/* Loading Modal */}
            <Modal visible={generating} transparent animationType="none">
                <View style={styles.loadingBackdrop}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={styles.loadingText}>Compiling injury-adjusted training protocols...</Text>
                </View>
            </Modal>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    mainContent: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertHeaderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 0.8,
        borderColor: 'rgba(239, 68, 68, 0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
        marginBottom: 20,
    },
    alertHeaderBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#EF4444',
        letterSpacing: 1,
    },
    iconWrapper: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 10,
    },
    pulseCircle: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
    },
    centerIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF',
        elevation: 8,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    injuryBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
        marginBottom: 25,
        maxWidth: '90%',
    },
    injuryText: {
        color: '#B91C1C',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    rationaleContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.05)',
        padding: 16,
        borderRadius: 18,
        marginBottom: 35,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
    },
    rationaleTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#059669',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    rationaleText: {
        fontSize: 12,
        color: '#475569',
        lineHeight: 18,
        marginBottom: 8,
    },
    buttonDeck: {
        width: '100%',
        gap: 15,
    },
    primaryBtn: {
        height: 68,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    btnGrad: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        justifyContent: 'space-between',
    },
    btnContent: {
        flex: 1,
        marginRight: 10,
    },
    btnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
    },
    btnSubtext: {
        fontSize: 9,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    secondaryBtn: {
        height: 56,
        borderRadius: 18,
        borderWidth: 1.2,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        backgroundColor: 'rgba(239, 68, 68, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryBtnText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    secondaryBtnSubtext: {
        fontSize: 8,
        color: 'rgba(239, 68, 68, 0.7)',
        marginTop: 2,
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    modalIconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
        marginBottom: 15,
    },
    modalScroll: {
        maxHeight: 180,
        width: '100%',
        marginBottom: 20,
    },
    modalText: {
        fontSize: 12,
        color: '#475569',
        lineHeight: 18,
        textAlign: 'center',
        marginBottom: 10,
    },
    modalActions: {
        width: '100%',
        gap: 10,
    },
    modalCancelBtn: {
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    modalCancelBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#475569',
        letterSpacing: 1,
    },
    modalAcceptBtn: {
        height: 48,
        borderRadius: 14,
        overflow: 'hidden',
    },
    modalAcceptGrad: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalAcceptBtnText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
    },
    loadingBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingText: {
        color: '#0F172A',
        fontSize: 13,
        fontWeight: '700',
        marginTop: 15,
        textAlign: 'center',
    }
});

export default InjuryWarningScreen;
