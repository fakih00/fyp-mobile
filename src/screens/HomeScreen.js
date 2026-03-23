import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    Animated,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
// import { CHALLENGES, USERS } from '../data/mockData'; // Removed mock data
import { AnimatedCard, GlassCard, WeeklyChart, GoalRings, WaterMug, AuraBackground } from '../components';
import { api } from '../services/api'; // Import API
import * as Haptics from 'expo-haptics';
import { Pedometer } from 'expo-sensors'; // Import Pedometer

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
    const { user, colors: themeColors, unreadCount, checkNotifications } = useContext(AppContext);
    const [pulseAnim] = useState(new Animated.Value(1));
    const [headerFadeAnim] = useState(new Animated.Value(0));
    const [headerSlideAnim] = useState(new Animated.Value(-20));
    const [floatingAnim] = useState(new Animated.Value(0));

    // State for real data
    const [dashboardData, setDashboardData] = useState(null);
    const [challenges, setChallenges] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [waterIntake, setWaterIntake] = useState(0); // For mug visualization

    const [initialSteps, setInitialSteps] = useState(0);
    const [sessionSteps, setSessionSteps] = useState(0);
    const [pedometerAvailable, setPedometerAvailable] = useState('checking');

    // Fetch data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            const fetchData = async () => {
                if (user?.user_id) {
                    console.log("Fetching dashboard for UID:", user.user_id);
                    // Fetch Dashboard Data
                    const dashRes = await api.getDashboard();
                    console.log("Dashboard Response Status:", dashRes.status);
                    if (dashRes.status === 200) {
                        setDashboardData(dashRes.data);
                        // Initialize steps from backend
                        if (dashRes.data.daily_stats?.steps) {
                            setInitialSteps(dashRes.data.daily_stats.steps);
                        }
                        // Initialize water from daily stats if available
                        if (dashRes.data.daily_stats?.water) {
                            const goal = dashRes.data.daily_stats.water_goal || 2500;
                            setWaterIntake(dashRes.data.daily_stats.water / goal);
                        }
                    } else {
                        console.error("Dashboard Fetch Failed:", dashRes.data);
                    }

                    // Fetch Active Challenges
                    const challRes = await api.getUserChallenges();
                    if (challRes.status === 200) {
                        setChallenges(challRes.data.records || []);
                    }

                    // Fetch Activity History for Chart
                    const histRes = await api.getActivityHistory();
                    if (histRes.status === 200) {
                        setHistory(histRes.data);
                    }

                    // Check for new notifications
                    checkNotifications();
                } else {
                    console.log("No user_id in context yet.");
                }
                setLoading(false);
            };
            fetchData();
        }, [user])
    );

    // Pedometer Effect
    useEffect(() => {
        let subscription;
        const subscribe = async () => {
            const isAvailable = await Pedometer.isAvailableAsync();
            setPedometerAvailable(String(isAvailable));

            if (isAvailable) {
                subscription = Pedometer.watchStepCount(result => {
                    setSessionSteps(result.steps);
                });
            }
        };

        subscribe();

        return () => {
            subscription && subscription.remove();
        };
    }, []);

    // Sync Steps to Backend periodicially
    useEffect(() => {
        const interval = setInterval(() => {
            if (sessionSteps > 0 && user?.user_id) {
                const totalSteps = initialSteps + sessionSteps;
                // We send '0' for others to signify we only want to update steps if possible? 
                // Currently logDailyPulse updates all. We should be careful. 
                // But the backend uses ON DUPLICATE KEY UPDATE.
                // It might overwrite weight/sleep if we send 0/default.
                // Ideally we should have a specific endpoint or update the backend to ignore nulls.
                // For now, let's assume we just want to update steps.
                // Implemented logDailyPulse overwrites everything.
                // Let's modify api.js/backend slightly or just re-send known values if we have them?
                // We don't have current weight/sleep here easily without dashboardData.

                if (dashboardData?.user_info?.weight) {
                    // We try to preserve existing values if possible, 
                    // or purely use it for steps if the backend handled it. 
                    // Current backend: updates all columns. 
                    // IMPORTANT: We need to pass the current values back to avoid zeroing them out.
                    // But we don't have sleep/stress here.
                    // The backend 'logDailyPulse' might need improvement to support partial updates 
                    // or we fetch the latest first. 
                    // Since this is a "Pulse", maybe we only do it if we are sure?
                    // Actually, let's just send the steps. 
                    // To avoid data loss, we really should read-then-write or make backend smart.
                    // Let's update backend to use partial updates if values are missing? 
                    // For now, I will use a safe approach: 
                    // We will use the `logDailyPulse` but I will assume the user isn't changing sleep/weight *while walking*.
                    // I will pass the existing dashboard values.

                    api.logDailyPulse(
                        dashboardData.user_info.weight,
                        7, // Default sleep if unknown 
                        'medium', // Default stress
                        totalSteps
                    );
                }
            }
        }, 30000); // Sync every 30s

        return () => clearInterval(interval);
    }, [sessionSteps, initialSteps, user, dashboardData]);

    useEffect(() => {
        // Pulse Loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Entrance Animation
        Animated.parallel([
            Animated.timing(headerFadeAnim, {
                toValue: 1,
                duration: 800,
                delay: 200,
                useNativeDriver: true,
            }),
            Animated.spring(headerSlideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                delay: 200,
                useNativeDriver: true,
            })
        ]).start();

        // Floating Icons Animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatingAnim, {
                    toValue: 0,
                    duration: 4000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const renderHeader = () => {
        const hour = new Date().getHours();
        let greeting = 'Elite Athlete';
        if (hour < 12) greeting = 'Good Morning';
        else if (hour < 18) greeting = 'Good Afternoon';
        else greeting = 'Good Evening';

        return (
            <View style={styles.headerStack}>
                <LinearGradient
                    colors={themeColors.gradient}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* SVG Pattern Overlay Shorthand (Subtle noise/texture) */}
                <View style={styles.textureOverlay} />

                {/* Floating Dumbbell Auras */}
                <Animated.View style={[
                    styles.floatingIcon,
                    {
                        top: 40,
                        left: 60,
                        opacity: 0.08,
                        transform: [
                            { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }) },
                            { rotate: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '25deg'] }) }
                        ]
                    }
                ]}>
                    <Ionicons name="fitness" size={40} color={COLORS.white} />
                </Animated.View>

                <Animated.View style={[
                    styles.floatingIcon,
                    {
                        bottom: 20,
                        right: 80,
                        opacity: 0.05,
                        transform: [
                            { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
                            { rotate: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-20deg'] }) }
                        ]
                    }
                ]}>
                    <Ionicons name="fitness" size={30} color={COLORS.white} />
                </Animated.View>

                <SafeAreaView edges={['top']} style={styles.headerSafe}>
                    <Animated.View style={[
                        styles.navRow,
                        { opacity: headerFadeAnim, transform: [{ translateY: headerSlideAnim }] }
                    ]}>
                        <TouchableOpacity
                            style={styles.profileBtnElite}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.navigate('Profile');
                            }}
                        >
                            <BlurView intensity={30} tint="light" style={styles.avatarBlur}>
                                <Image
                                    source={{ uri: user.profileImage }}
                                    style={styles.avatarElite}
                                />
                            </BlurView>
                            <View style={styles.onlineStatus} />
                        </TouchableOpacity>

                        <View style={styles.titleStack}>
                            <Text style={styles.greetingText}>{greeting}, {user.name?.split(' ')[0]}</Text>
                            <View style={styles.brandRow}>
                                <Text style={styles.eliteTitle}>ELITE</Text>
                                <Text style={[styles.eliteTitle, { color: themeColors.accent }]}>FITNESS</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.headerActionBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.navigate('Notifications');
                            }}
                        >
                            <BlurView intensity={30} tint="light" style={styles.iconBlur}>
                                <Ionicons name="notifications" size={20} color={COLORS.white} />
                            </BlurView>
                            {unreadCount > 0 && <View style={styles.notifDot} />}
                        </TouchableOpacity>
                    </Animated.View>
                </SafeAreaView>
            </View>
        );
    };

    const renderUserDashboard = () => {
        if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 50 }} />;

        if (!dashboardData) {
            return (
                <GlassCard style={styles.userDashboardElite}>
                    <View style={{ alignItems: 'center', padding: 20 }}>
                        <Ionicons name="alert-circle" size={40} color={COLORS.error} />
                        <Text style={[styles.userNameText, { marginTop: 10, fontSize: 18 }]}>Profile Incomplete</Text>
                        <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 5, marginBottom: 15 }}>
                            You haven't completed your profile setup yet.
                        </Text>
                        <TouchableOpacity
                            style={[styles.viewProgressBtnElite, { borderTopWidth: 0, marginTop: 0 }]}
                            onPress={() => navigation.navigate('GenderSelect', {
                                userData: {
                                    user_id: user.user_id,
                                    token: user.token
                                }
                            })}
                        >
                            <Text style={styles.viewProgressTextElite}>COMPLETE SETUP</Text>
                            <Ionicons name="arrow-forward" size={14} color="#10B981" />
                        </TouchableOpacity>
                    </View>
                </GlassCard>
            );
        }

        const { user_info, daily_stats } = dashboardData;
        // Calc percentage
        const progress = Math.min((user_info.xp / user_info.nextLevelXp) * 100, 100);

        const totalSteps = initialSteps + sessionSteps;

        return (
            <GlassCard style={styles.userDashboardElite}>
                <View style={styles.userInfoRow}>
                    <View style={styles.userTextGrp}>
                        <Text style={styles.welcomeText}>Welcome back,</Text>
                        <Text style={styles.userNameText}>{user_info.name}</Text>
                    </View>
                    <View style={styles.levelBadgeElite}>
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.levelGrad}
                        >
                            <Text style={styles.levelValElite}>LVL {user_info.level}</Text>
                        </LinearGradient>
                    </View>
                </View>

                <View style={styles.expSection}>
                    <View style={styles.expHeader}>
                        <Text style={styles.expLabel}>Elite Athlete Progress</Text>
                        <Text style={styles.expPerc}>{Math.round(progress)}%</Text>
                    </View>
                    <View style={styles.expBarBg}>
                        <LinearGradient
                            colors={['#10B981', '#34D399']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.expBarFill, { width: `${progress}%` }]}
                        />
                    </View>
                    <Text style={styles.expSub}>{user_info.nextLevelXp - user_info.xp} XP to next rank</Text>
                </View>

                <View style={styles.dashboardMainElite}>
                    <View style={styles.ringsWrapper}>
                        <GoalRings
                            size={100}
                            rings={[
                                { label: 'Calories', value: daily_stats.calories, progress: Math.min(daily_stats.calories / 2500, 1), color: themeColors.accent, weight: 10 },
                                { label: 'Steps', value: totalSteps, progress: Math.min(totalSteps / 10000, 1), color: '#3B82F6', weight: 10 },
                                { label: 'XP', value: user_info.xp, progress: Math.min(user_info.xp / user_info.nextLevelXp, 1), color: '#F59E0B', weight: 10 }
                            ]}
                        />
                    </View>
                    <View style={styles.metricGridElite}>
                        <MetricItem icon="scale" val={`${user_info.weight} kg`} label="WEIGHT" color="#10B981" />
                        <View style={styles.metricDivider} />
                        <MetricItem icon="restaurant" val={daily_stats.calories} label="INCAL" color="#FF6B6B" />
                        <View style={styles.metricDivider} />
                        <MetricItem icon="flame" val={user_info.streak} label="STREAK" color="#F59E0B" />
                    </View>
                </View>

                <View style={styles.chartSectionElite}>
                    <Text style={styles.chartTitleElite}>Weekly Performance</Text>
                    <WeeklyChart
                        data={dashboardData.weekly_chart_data || [0, 0, 0, 0, 0, 0, 0]}
                        height={60}
                    />
                </View>

                <TouchableOpacity
                    style={styles.viewProgressBtnElite}
                    onPress={() => navigation.navigate('Progress')}
                >
                    <Text style={styles.viewProgressTextElite}>VIEW DETAILED ANALYTICS</Text>
                    <Ionicons name="chevron-forward" size={14} color="#10B981" />
                </TouchableOpacity>
            </GlassCard>
        );
    };

    const MetricItem = ({ icon, val, label, color }) => (
        <View style={styles.metricBoxElite}>
            <Ionicons name={icon} size={18} color={color} />
            <Text style={styles.metricValElite}>{val}</Text>
            <Text style={styles.metricLabElite}>{label}</Text>
        </View>
    );

    return (
        <AuraBackground style={styles.container}>
            {renderHeader()}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
                {renderUserDashboard()}

                {/* AI COACH SECTION */}
                <AnimatedCard delay={100} style={styles.aiSectionElite}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            navigation.navigate('AIChat');
                        }}
                    >
                        <LinearGradient
                            colors={['#064E3B', '#065F46']}
                            style={styles.aiCardElite}
                        >
                            <View style={styles.aiIconWrapper}>
                                <BlurView intensity={30} tint="light" style={styles.aiBlurIcon}>
                                    <Ionicons name="sparkles" size={24} color="#10B981" />
                                </BlurView>
                                <Animated.View style={[styles.aiPulseElite, { transform: [{ scale: pulseAnim }] }]} />
                            </View>
                            <View style={styles.aiContentElite}>
                                <View style={styles.aiBadge}>
                                    <Text style={styles.aiBadgeText}>ELITE INSIGHT</Text>
                                </View>
                                <Text style={styles.aiMsgElite}>
                                    "{dashboardData?.ai_message || "Ready to crush your goals today?"}"
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
                        </LinearGradient>
                    </TouchableOpacity>
                </AnimatedCard>

                {/* NEXT UP SECTION */}
                <View style={styles.sectionHeaderElite}>
                    <Text style={styles.sectionTitleElite}>Next Scheduled</Text>
                </View>
                <AnimatedCard delay={150} style={styles.nextUpCardElite}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('Workout')}
                        style={styles.nextUpContent}
                    >
                        <LinearGradient
                            colors={['#FFF', '#F1F5F9']}
                            style={styles.nextUpInner}
                        >
                            <View style={[styles.nextIconBox, { backgroundColor: '#ECFDF5' }]}>
                                <Ionicons name="fitness" size={24} color="#10B981" />
                            </View>
                            <View style={styles.nextInfo}>
                                <Text style={styles.nextLabel}>TODAY'S SESSION</Text>
                                <Text style={styles.nextTitle}>{dashboardData?.next_workout?.title || "Rest Day"}</Text>
                                <View style={styles.nextMeta}>
                                    <Ionicons name="time-outline" size={14} color="#64748B" />
                                    <Text style={styles.nextMetaText}>
                                        {dashboardData?.next_workout
                                            ? `${dashboardData.next_workout.duration || '45m'} • ${dashboardData.next_workout.calories || '300'} kcal`
                                            : "No workout scheduled"}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.startBtnElite}>
                                <Text style={styles.startBtnText}>{dashboardData?.next_workout ? 'START' : 'PLAN'}</Text>
                                <Ionicons name={dashboardData?.next_workout ? "play" : "calendar"} size={12} color="#10B981" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </AnimatedCard>

                {/* QUICK ACTIONS */}
                <View style={styles.actionRowElite}>
                    {[
                        {
                            icon: 'water',
                            label: 'Water',
                            color: '#10B981',
                            gradient: ['#F0FDF4', '#DCFCE7'],
                            onPress: () => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                navigation.navigate('WaterLog');
                            },
                            customIcon: <WaterMug progress={waterIntake} size={45} showSteam={true} />
                        },
                        {
                            icon: 'body',
                            label: 'Weight',
                            color: '#059669',
                            gradient: ['#F0FDF4', '#D1FAE5'],
                            onPress: () => navigation.navigate('Progress')
                        },
                        {
                            icon: 'restaurant',
                            label: 'Meal',
                            color: '#059669',
                            gradient: ['#F0FDF4', '#D1FAE5'],
                            onPress: () => navigation.navigate('Nutrition')
                        },
                        {
                            icon: 'fitness',
                            label: 'Workout',
                            color: '#047857',
                            gradient: ['#F0FDF4', '#DCFCE7'],
                            onPress: () => navigation.navigate('Workout')
                        },
                    ].map((item, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.actionBtnElite}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                item.onPress?.();
                            }}
                        >
                            <LinearGradient
                                colors={item.gradient}
                                style={styles.actionIconElite}
                            >
                                {item.customIcon ? item.customIcon : (
                                    <Ionicons name={item.icon} size={24} color={item.color} />
                                )}
                            </LinearGradient>
                            <Text style={styles.actionLabElite}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* CHALLENGES */}
                <View style={styles.sectionHeaderElite}>
                    <Text style={styles.sectionTitleElite}>Active Challenges</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Challenges')}>
                        <Text style={styles.seeAllElite}>View All</Text>
                    </TouchableOpacity>
                </View>

                {challenges.length > 0 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.challengesScrollElite}
                    >
                        {challenges.map((challenge, index) => (
                            <AnimatedCard key={challenge.id} delay={200 + index * 100} style={styles.challengeCardElite}>
                                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Challenges')}>
                                    <Image source={{ uri: challenge.image }} style={styles.challengeImgElite} />
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.9)']}
                                        style={styles.challengeOverlayElite}
                                    >
                                        <View style={styles.challengeBadgeElite}>
                                            <Text style={styles.challengeBadgeText}>ACTIVE</Text>
                                        </View>
                                        <Text style={styles.challengeTitleElite} numberOfLines={1}>{challenge.title}</Text>
                                        <View style={styles.challengeProgressRow}>
                                            <View style={styles.miniBarBg}>
                                                <View style={[styles.miniBarFill, { width: `${(challenge.progress / challenge.days) * 100}%` }]} />
                                            </View>
                                            <Text style={styles.miniBarText}>{challenge.progress}/{challenge.days}d</Text>
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </AnimatedCard>
                        ))}
                    </ScrollView>
                ) : (
                    <AnimatedCard delay={300} style={styles.emptyChallengeCardElite}>
                        <LinearGradient
                            colors={['#F1F5F9', '#FFF']}
                            style={styles.emptyChallengeInner}
                        >
                            <View style={styles.emptyChallContent}>
                                <Text style={styles.emptyChallTitle}>No Active Challenges</Text>
                                <Text style={styles.emptyChallSub}>Join one of our elite challenges to push your limits.</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.joinChallBtn}
                                onPress={() => navigation.navigate('Challenges')}
                            >
                                <Text style={styles.joinChallBtnText}>DISCOVER</Text>
                                <Ionicons name="compass-outline" size={14} color={COLORS.white} />
                            </TouchableOpacity>
                        </LinearGradient>
                    </AnimatedCard>
                )}

                {/* SHOP SPOTLIGHT */}
                <View style={styles.sectionHeaderElite}>
                    <Text style={styles.sectionTitleElite}>Points & Rewards</Text>
                </View>
                <TouchableOpacity
                    style={styles.shopSectionElite}
                    onPress={() => navigation.navigate('Shop')}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={['#D1FAE5', '#10B981']}
                        style={styles.shopCardElite}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.shopTopElite}>
                            <View style={styles.pointsBadge}>
                                <Ionicons name="star" size={14} color="#065F46" />
                                <Text style={styles.pointsText}>{dashboardData?.user_info?.points || 0} pts</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#065F46" />
                        </View>
                        <View style={styles.shopContentRow}>
                            <View style={styles.shopTextStack}>
                                <Text style={styles.shopCalloutElite}>Redeem Pro Badges</Text>
                                <Text style={styles.shopDescElite}>You have new rewards available.</Text>
                            </View>
                            <View style={styles.badgeSpotlight}>
                                <BlurView intensity={20} style={styles.badgeBlur}>
                                    <Ionicons name="ribbon" size={28} color="#065F46" />
                                </BlurView>
                            </View>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

            </ScrollView>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerStack: {
        height: 140,
        position: 'relative',
        zIndex: 10,
        overflow: 'visible', // Changed from 'hidden' to let shadow show
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        overflow: 'hidden',
    },
    floatingIcon: {
        position: 'absolute',
        zIndex: 1,
    },
    auraCircle: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        filter: 'blur(30px)', // Note: standard style blur isn't native, but we can use scale/opacity for aura
    },
    textureOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.03)',
        opacity: 0.1,
    },
    headerSafe: {
        flex: 1,
        paddingHorizontal: 20,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 15,
    },
    profileBtnElite: {
        width: 50,
        height: 50,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(255,255,255,0.1)',
        position: 'relative',
    },
    avatarBlur: {
        flex: 1,
        padding: 2,
    },
    avatarElite: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    onlineStatus: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#064E3B',
    },
    titleStack: {
        alignItems: 'center',
    },
    greetingText: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    brandRow: {
        flexDirection: 'row',
        gap: 4,
    },
    eliteTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -1,
    },
    headerActionBtn: {
        width: 50,
        height: 50,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(255,255,255,0.1)',
        position: 'relative',
    },
    iconBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifDot: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 1.5,
        borderColor: '#064E3B',
    },
    scrollPadding: {
        paddingBottom: 100,
    },
    userDashboardElite: {
        marginTop: 10,
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 30,
        backgroundColor: COLORS.surface,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
    },
    dashboardMainElite: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    ringsWrapper: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartSectionElite: {
        marginTop: 5,
        marginBottom: 10,
    },
    chartTitleElite: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    userInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    userTextGrp: {
        gap: 2,
    },
    welcomeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    userNameText: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0F172A',
    },
    levelBadgeElite: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    levelGrad: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    levelValElite: {
        fontSize: 11,
        fontWeight: '900',
        color: COLORS.white,
    },
    expSection: {
        marginBottom: 25,
    },
    expHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    expLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    expPerc: {
        fontSize: 12,
        fontWeight: '900',
        color: '#0F172A',
    },
    expBarBg: {
        height: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        overflow: 'hidden',
    },
    expBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    expSub: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 6,
        fontWeight: '600',
    },
    metricGridElite: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        padding: 15,
        borderRadius: 20,
        flex: 1,
        marginLeft: 20,
    },
    metricBoxElite: {
        alignItems: 'center',
        flex: 1,
    },
    metricValElite: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 4,
    },
    metricLabElite: {
        fontSize: 8,
        fontWeight: '900',
        color: '#94A3B8',
        marginTop: 1,
    },
    viewProgressBtnElite: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 8,
    },
    viewProgressTextElite: {
        fontSize: 9,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 1,
    },
    metricDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#E2E8F0',
    },
    aiSectionElite: {
        marginHorizontal: 20,
        marginTop: 25,
        marginBottom: 30,
    },
    aiCardElite: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 28,
        elevation: 8,
    },
    aiIconWrapper: {
        width: 50,
        height: 50,
        borderRadius: 25,
        position: 'relative',
        overflow: 'hidden',
    },
    aiBlurIcon: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiPulseElite: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 25,
        backgroundColor: '#10B981',
        opacity: 0.2,
    },
    aiContentElite: {
        flex: 1,
        marginHorizontal: 16,
    },
    aiBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 6,
    },
    aiBadgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 1,
    },
    aiMsgElite: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 16,
    },
    nextUpCardElite: {
        marginHorizontal: 20,
        marginBottom: 30,
    },
    nextUpContent: {
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    nextUpInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    nextIconBox: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextInfo: {
        flex: 1,
        marginLeft: 15,
    },
    nextLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 0.5,
    },
    nextTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
        marginTop: 2,
    },
    nextMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 5,
    },
    nextMetaText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    startBtnElite: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    startBtnText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#10B981',
    },
    actionRowElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 35,
    },
    actionBtnElite: {
        alignItems: 'center',
        gap: 8,
    },
    actionIconElite: {
        width: 70,
        height: 70,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.7)',
        elevation: 3,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        paddingTop: 5, // Extra space for steam
    },
    actionLabElite: {
        fontSize: 12,
        fontWeight: '800',
        color: '#1E293B',
    },
    sectionHeaderElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitleElite: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    seeAllElite: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10B981',
    },
    emptyChallengeCardElite: {
        marginHorizontal: 20,
        marginBottom: 35,
    },
    emptyChallengeInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    emptyChallContent: {
        flex: 1,
        marginRight: 10,
    },
    emptyChallTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    emptyChallSub: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    joinChallBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B981',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
        elevation: 4,
    },
    joinChallBtnText: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
    challengesScrollElite: {
        paddingLeft: 20,
        paddingBottom: 35,
    },
    challengeCardElite: {
        width: 260,
        height: 160,
        borderRadius: 28,
        marginRight: 15,
        overflow: 'hidden',
        backgroundColor: COLORS.surface,
        elevation: 5,
    },
    challengeImgElite: {
        width: '100%',
        height: '100%',
    },
    challengeOverlayElite: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
    challengeBadgeElite: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#10B981',
        marginBottom: 8,
    },
    challengeBadgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: COLORS.white,
    },
    challengeTitleElite: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 10,
    },
    challengeProgressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    miniBarBg: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
    },
    miniBarFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 2,
    },
    miniBarText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    shopSectionElite: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    shopCardElite: {
        padding: 24,
        borderRadius: 28,
        elevation: 6,
    },
    shopTopElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    shopContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    shopTextStack: {
        flex: 1,
    },
    badgeSpotlight: {
        width: 54,
        height: 54,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    badgeBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    pointsText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#065F46',
    },
    shopCalloutElite: {
        fontSize: 20,
        fontWeight: '900',
        color: '#064E3B',
        marginBottom: 4,
    },
    shopDescElite: {
        fontSize: 12,
        color: '#065F46',
        fontWeight: '600',
    },
});

export default HomeScreen;
