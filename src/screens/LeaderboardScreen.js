import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { api } from '../services/api';
import { AppContext } from '../context/AppContext';
import { useContext, useEffect, useCallback } from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';

const { width } = Dimensions.get('window');

const LEAGUES = [
    { name: 'Bronze', color: '#CD7F32', icon: 'shield' },
    { name: 'Silver', color: '#C0C0C0', icon: 'shield' },
    { name: 'Gold', color: '#FFD700', icon: 'shield' },
    { name: 'Emerald', color: '#10B981', icon: 'shield' },
    { name: 'Diamond', color: '#B9F2FF', icon: 'shield' },
];

const LeaderboardScreen = ({ navigation }) => {
    const { user, colors: themeColors } = useContext(AppContext);
    const [mode, setMode] = useState('Global'); // Global or Friends
    const [selectedLeague, setSelectedLeague] = useState(LEAGUES[3]); // Emerald League
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [floatingAnim] = useState(new Animated.Value(0));

    const fetchLeaderboard = useCallback(async (isRefreshing = false) => {
        if (!user?.user_id) return;
        if (!isRefreshing) setLoading(true);

        try {
            const res = await api.getLeaderboard(mode);
            if (res.status === 200) {
                setRankings(res.data.records);
            }
        } catch (error) {
            console.error("Fetch Leaderboard Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.user_id, mode]);

    useEffect(() => {
        fetchLeaderboard();

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
    }, [fetchLeaderboard]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchLeaderboard(true);
    };

    // Correctly split rankings for podium and list
    // Podium is Rank 2 (left), Rank 1 (middle), Rank 3 (right)
    const topThree = [
        rankings.find(r => r.rank === 2) || { name: '...', xp: 0, avatar: '?' },
        rankings.find(r => r.rank === 1) || { name: '...', xp: 0, avatar: '?' },
        rankings.find(r => r.rank === 3) || { name: '...', xp: 0, avatar: '?' },
    ];

    const otherRankings = rankings.filter(r => r.rank > 3);
    const myRank = rankings.find(r => r.id == user?.user_id) || { rank: '?', xp: 0 };

    const handleModeSwitch = (newMode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMode(newMode);
    };

    const renderHeader = () => (
        <View style={styles.headerStack}>
            <LinearGradient
                colors={themeColors.gradient}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

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
                    bottom: 40,
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
                <View style={styles.navRow}>
                    <View style={styles.headerSpacer} />
                    <View style={styles.titleStack}>
                        <Text style={styles.eliteTitle}>Leaderboard</Text>
                        <Text style={styles.eliteSubtitle}>ELITE RANKINGS</Text>
                    </View>
                    <TouchableOpacity style={styles.headerActionBtn}>
                        <BlurView intensity={20} tint="light" style={styles.iconBlur}>
                            <Ionicons name="trophy" size={20} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>
                </View>

                <View style={styles.leagueSelectorElite}>
                    <TouchableOpacity style={styles.leaguePillElite}>
                        <Ionicons name={selectedLeague.icon} size={16} color={COLORS.white} style={{ marginRight: 8 }} />
                        <Text style={styles.leaguePillText}>{selectedLeague.name.toUpperCase()} LEAGUE</Text>
                        <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.6)" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>

                    <View style={styles.seasonTimerElite}>
                        <BlurView intensity={20} tint="light" style={styles.timerBlur}>
                            <Ionicons name="time" size={12} color={COLORS.white} />
                            <Text style={styles.timerTextElite}>2d 14h REMAINING</Text>
                        </BlurView>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );

    const renderPodium = () => (
        <View style={styles.podiumWrapperElite}>
            {/* Rank 2 */}
            <PodiumItem user={topThree[0]} delay={200} size={85} rank={2} />
            {/* Rank 1 */}
            <PodiumItem user={topThree[1]} delay={100} size={110} rank={1} isWinner />
            {/* Rank 3 */}
            <PodiumItem user={topThree[2]} delay={300} size={80} rank={3} />
        </View>
    );

    const PodiumItem = ({ user, delay, size, rank, isWinner }) => (
        <AnimatedCard delay={delay} style={[styles.podiumItemElite, isWinner && styles.winnerShift]}>
            <View style={[styles.podiumAvatarFrame, { width: size + 10, height: size + 10, borderRadius: (size + 10) / 2 }]}>
                <LinearGradient
                    colors={isWinner ? themeColors.gradient : ['#E2E8F0', '#94A3B8']}
                    style={[styles.podiumAvatarInner, { borderRadius: size / 2, width: size, height: size }]}
                >
                    {user.avatar_url ? (
                        <Image source={{ uri: user.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
                    ) : (
                        <Text style={[styles.podiumAvatarText, { fontSize: size * 0.4 }]}>{user.avatar}</Text>
                    )}
                </LinearGradient>
                <View style={[styles.rankBadgeElite, { backgroundColor: isWinner ? themeColors.accent : '#64748B' }]}>
                    <Text style={styles.rankBadgeTextElite}>{rank}</Text>
                </View>
                {isWinner && (
                    <View style={styles.winnerCrown}>
                        <Ionicons name="ribbon" size={24} color="#F59E0B" />
                    </View>
                )}
            </View>
            <Text style={styles.podiumNameElite} numberOfLines={1}>{user.name}</Text>
            <View style={styles.podiumXPBadge}>
                <Text style={[styles.podiumXPElite, { color: themeColors.accent }]}>{user.xp}</Text>
                <Text style={styles.podiumXPUnitElite}>XP</Text>
            </View>
        </AnimatedCard>
    );

    return (
        <AuraBackground style={styles.container}>
            {renderHeader()}

            {loading && !refreshing ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={themeColors.accent} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollPadding}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.accent} />
                    }
                >
                    {/* Mode Switcher */}
                    <View style={styles.modeSwitcherElite}>
                        <TouchableOpacity
                            style={[styles.modePill, mode === 'Global' && { backgroundColor: themeColors.accent }]}
                            onPress={() => handleModeSwitch('Global')}
                        >
                            <Text style={[styles.modePillText, mode === 'Global' && styles.modePillTextActive]}>GLOBAL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modePill, mode === 'Friends' && { backgroundColor: themeColors.accent }]}
                            onPress={() => handleModeSwitch('Friends')}
                        >
                            <Text style={[styles.modePillText, mode === 'Friends' && styles.modePillTextActive]}>FRIENDS</Text>
                        </TouchableOpacity>
                    </View>

                    {renderPodium()}

                    <View style={styles.rankingsHeaderElite}>
                        <Text style={styles.rankingsTitle}>Rankings</Text>
                        <View style={styles.rankingsLine} />
                    </View>

                    <View style={styles.listContainerElite}>
                        {otherRankings.map((user, index) => (
                            <AnimatedCard key={user.id} delay={400 + index * 50} style={styles.rankItemElite}>
                                <View style={styles.rankNumGrp}>
                                    <Text style={styles.rankNumText}>{user.rank}</Text>
                                    <View style={styles.rankTrendIcon}>
                                        <Ionicons name="caret-up" size={10} color={themeColors.accent} />
                                    </View>
                                </View>

                                <View style={styles.listAvatarElite}>
                                    {user.avatar_url ? (
                                        <Image source={{ uri: user.avatar_url }} style={{ width: '100%', height: '100%', borderRadius: 18 }} />
                                    ) : (
                                        <Text style={styles.listAvatarTextElite}>{user.avatar}</Text>
                                    )}
                                </View>

                                <View style={styles.listInfoElite}>
                                    <Text style={styles.listNameElite}>{user.name}</Text>
                                    <View style={styles.levelRowElite}>
                                        <Text style={[styles.levelLabelElite, { color: themeColors.accent }]}>LEVEL {user.level || 1}</Text>
                                    </View>
                                </View>

                                <View style={styles.listXPGrpElite}>
                                    <Text style={styles.listXPTextElite}>{user.xp.toLocaleString()}</Text>
                                    <Text style={styles.listXPUnitElite}>XP</Text>
                                </View>
                            </AnimatedCard>
                        ))}
                    </View>

                    {/* My Rank Sticky Concept */}
                    <GlassCard style={styles.myRankCardElite}>
                        <View style={styles.myRankContent}>
                            <View style={styles.myRankHeaderElite}>
                                <View style={styles.myRankAvatarElite}>
                                    {user?.profileImage ? (
                                        <Image source={{ uri: user.profileImage }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
                                    ) : (
                                        <Text style={styles.myRankAvatarTextElite}>{user?.name?.charAt(0) || 'U'}</Text>
                                    )}
                                </View>
                                <View style={styles.myRankTextGrp}>
                                    <Text style={styles.myRankGreeting}>Keep pushing, {user?.name?.split(' ')[0]}!</Text>
                                    <Text style={styles.myRankStatus}>You're at rank <Text style={{ color: themeColors.accent, fontWeight: '900' }}>#{myRank.rank}</Text></Text>
                                </View>
                            </View>
                            <View style={styles.myRankBadgeElite}>
                                <Text style={styles.rankLabelSmall}>XP</Text>
                                <Text style={styles.rankValLarge}>{myRank.xp}</Text>
                            </View>
                        </View>

                        <View style={styles.rankXPProgressElite}>
                            <View style={styles.rankXPTextRow}>
                                <Text style={styles.rankXPProgLabel}>NEXT RANK PROGRESS</Text>
                                <Text style={styles.rankXPProgVal}>85%</Text>
                            </View>
                            <View style={styles.progBarBgElite}>
                                <LinearGradient
                                    colors={themeColors.gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.progBarFillElite, { width: '85%' }]}
                                />
                            </View>
                        </View>
                    </GlassCard>

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    headerStack: {
        height: 180,
        position: 'relative',
        zIndex: 10,
        overflow: 'visible',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
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
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    floatingIcon: {
        position: 'absolute',
        zIndex: 1,
    },
    headerSafe: {
        flex: 1,
        paddingHorizontal: 20,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    headerSpacer: {
        width: 44,
    },
    titleStack: {
        alignItems: 'center',
    },
    eliteTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    eliteSubtitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 2,
        marginTop: 2,
    },
    headerActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
    },
    iconBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    leagueSelectorElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
    },
    leaguePillElite: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    leaguePillText: {
        fontSize: 12,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 0.5,
    },
    seasonTimerElite: {
        borderRadius: 15,
        overflow: 'hidden',
    },
    timerBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
    },
    timerTextElite: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    scrollPadding: {
        paddingBottom: 120,
    },
    modeSwitcherElite: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 35,
        borderRadius: 22,
        padding: 5,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    modePill: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 18,
    },
    modePillActive: {
        backgroundColor: '#10B981',
    },
    modePillText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1,
    },
    modePillTextActive: {
        color: COLORS.white,
    },
    podiumWrapperElite: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        marginBottom: 40,
        height: 220,
        gap: 10,
    },
    podiumItemElite: {
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    winnerShift: {
        transform: [{ translateY: -15 }],
    },
    podiumAvatarFrame: {
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        marginBottom: 15,
        position: 'relative',
    },
    podiumAvatarInner: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    podiumAvatarText: {
        color: COLORS.white,
        fontWeight: '900',
    },
    rankBadgeElite: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: COLORS.white,
    },
    rankBadgeTextElite: {
        color: COLORS.white,
        fontWeight: '900',
        fontSize: 14,
    },
    winnerCrown: {
        position: 'absolute',
        top: -24,
    },
    podiumNameElite: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 6,
        width: 90,
        textAlign: 'center',
    },
    podiumXPBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 3,
    },
    podiumXPElite: {
        fontSize: 12,
        fontWeight: '900',
        color: '#10B981',
    },
    podiumXPUnitElite: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94A3B8',
    },
    rankingsHeaderElite: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 15,
    },
    rankingsTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    rankingsLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    listContainerElite: {
        paddingHorizontal: 20,
    },
    rankItemElite: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: COLORS.white,
        borderRadius: 25,
        marginBottom: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    rankNumGrp: {
        width: 35,
        alignItems: 'center',
    },
    rankNumText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#94A3B8',
    },
    rankTrendIcon: {
        marginTop: 2,
    },
    listAvatarElite: {
        width: 50,
        height: 50,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 15,
    },
    listAvatarTextElite: {
        fontSize: 18,
        fontWeight: '900',
        color: '#475569',
    },
    listInfoElite: {
        flex: 1,
        gap: 2,
    },
    listNameElite: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    levelRowElite: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    levelLabelElite: {
        fontSize: 9,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 0.5,
    },
    listXPGrpElite: {
        alignItems: 'flex-end',
    },
    listXPTextElite: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
    },
    listXPUnitElite: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94A3B8',
        marginTop: 1,
    },
    myRankCardElite: {
        marginHorizontal: 20,
        marginTop: 15,
        padding: 24,
        backgroundColor: COLORS.white,
        borderRadius: 30,
        elevation: 10,
    },
    myRankContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    myRankHeaderElite: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    myRankAvatarElite: {
        width: 55,
        height: 55,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    myRankAvatarTextElite: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.white,
    },
    myRankTextGrp: {
        gap: 2,
    },
    myRankGreeting: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    myRankStatus: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    myRankBadgeElite: {
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
    },
    rankLabelSmall: {
        fontSize: 8,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    rankValLarge: {
        fontSize: 22,
        fontWeight: '900',
        color: '#10B981',
    },
    rankXPProgressElite: {
        gap: 10,
    },
    rankXPTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rankXPProgLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    rankXPProgVal: {
        fontSize: 12,
        fontWeight: '900',
        color: '#0F172A',
    },
    progBarBgElite: {
        height: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progBarFillElite: {
        height: '100%',
        borderRadius: 5,
    }
});

export default LeaderboardScreen;
