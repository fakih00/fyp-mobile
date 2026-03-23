import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Dimensions,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { WaterMug, AuraBackground, GlassCard } from '../components';
import { api } from '../services/api';
import { AppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');

const WaterLogScreen = () => {
    const navigation = useNavigation();
    const { user } = useContext(AppContext);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [logging, setLogging] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const res = await api.getProgressStats();
            if (res.status === 200) {
                setStats(res.data);
            }
        } catch (error) {
            console.error("Load Water Stats Error:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleLogWater = async (amount) => {
        if (logging) return;
        setLogging(amount);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const res = await api.logWater(amount);
            if (res.status === 200) {
                // Optimistic update or reload
                setStats(prev => ({
                    ...prev,
                    water_consumed: (prev?.water_consumed || 0) + amount
                }));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Alert.alert("Error", "Could not log water. Please try again.");
            }
        } catch (error) {
            Alert.alert("Error", "Network error. Please try again.");
        } finally {
            setLogging(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    const waterConsumed = stats?.water_consumed || 0;
    const waterGoal = stats?.water_goal || 2500;
    const progress = Math.min(waterConsumed / waterGoal, 1.2); // Allow a bit over 100%
    const remaining = Math.max(0, waterGoal - waterConsumed);

    return (
        <SafeAreaView style={styles.container}>
            <AuraBackground color1="#DBEAFE" color2="#EFF6FF" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#1E293B" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Hydration</Text>
                    <Text style={styles.headerSubtitle}>Elite Performance Tracking</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.mugSection}>
                    <WaterMug
                        progress={progress}
                        size={width * 0.45}
                        showRipple={true}
                        showSteam={false}
                    />

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statVal}>{waterConsumed}ml</Text>
                            <Text style={styles.statLab}>Consumed</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statVal}>{waterGoal}ml</Text>
                            <Text style={styles.statLab}>Daily Goal</Text>
                        </View>
                    </View>

                    {remaining > 0 ? (
                        <Text style={styles.remainingText}>
                            You need <Text style={{ fontWeight: '900', color: '#3B82F6' }}>{remaining}ml</Text> more to hit your goal.
                        </Text>
                    ) : (
                        <View style={styles.goalMetBadge}>
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                            <Text style={styles.goalMetText}>Daily Goal Achieved!</Text>
                        </View>
                    )}
                </View>

                <View style={styles.actionSection}>
                    <Text style={styles.sectionTitle}>Quick Log</Text>
                    <View style={styles.logGrid}>
                        <LogButton
                            amount={250}
                            icon="water-outline"
                            label="Small Glass"
                            onPress={() => handleLogWater(250)}
                            isLogging={logging === 250}
                        />
                        <LogButton
                            amount={500}
                            icon="water"
                            label="Bottle"
                            onPress={() => handleLogWater(500)}
                            isLogging={logging === 500}
                        />
                        <LogButton
                            amount={750}
                            icon="beaker-outline"
                            label="Large"
                            onPress={() => handleLogWater(750)}
                            isLogging={logging === 750}
                        />
                        <LogButton
                            amount={100}
                            icon="flask-outline"
                            label="Sip"
                            onPress={() => handleLogWater(100)}
                            isLogging={logging === 100}
                        />
                    </View>
                </View>

                <GlassCard style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                        <View style={styles.aiIcon}>
                            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                        </View>
                        <Text style={styles.insightTitle}>AI HYDRATION INSIGHT</Text>
                    </View>
                    <Text style={styles.insightText}>
                        Your personalized goal of {waterGoal}ml ({stats?.water_goal_liters}L) is calculated based on your current weight of {stats?.current_weight || 70}kg.
                        Drinking 33ml per kg ensures optimal metabolic function and muscle recovery.
                    </Text>
                    <View style={styles.insightFooter}>
                        <Text style={styles.insightFooterText}>Based on elite sports science protocols.</Text>
                    </View>
                </GlassCard>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const LogButton = ({ amount, icon, label, onPress, isLogging }) => (
    <TouchableOpacity
        style={styles.logBtn}
        onPress={onPress}
        disabled={isLogging}
    >
        <LinearGradient
            colors={['#F0F9FF', '#E0F2FE']}
            style={styles.logBtnGradient}
        >
            {isLogging ? (
                <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
                <Ionicons name={icon} size={24} color="#3B82F6" />
            )}
            <Text style={styles.logBtnAmount}>+{amount}ml</Text>
            <Text style={styles.logBtnLabel}>{label}</Text>
        </LinearGradient>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1E293B',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    mugSection: {
        alignItems: 'center',
        marginVertical: 30,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 25,
        backgroundColor: '#FFFFFF',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    statBox: {
        alignItems: 'center',
    },
    statVal: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1E293B',
    },
    statLab: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#E2E8F0',
        mx: 20,
        marginHorizontal: 25,
    },
    remainingText: {
        marginTop: 20,
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
    },
    goalMetBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 12,
        marginTop: 20,
    },
    goalMetText: {
        marginLeft: 6,
        color: '#065F46',
        fontWeight: '800',
        fontSize: 13,
    },
    actionSection: {
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1E293B',
        marginBottom: 15,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    logGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    logBtn: {
        width: (width - 60) / 2,
        height: 110,
        marginBottom: 15,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    logBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
    },
    logBtnAmount: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1E293B',
        marginTop: 8,
    },
    logBtnLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        marginTop: 2,
    },
    insightCard: {
        marginTop: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    aiIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    insightTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: 1,
    },
    insightText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#475569',
        fontWeight: '500',
    },
    insightFooter: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(226, 232, 240, 0.5)',
    },
    insightFooterText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        fontStyle: 'italic',
    }
});

export default WaterLogScreen;
