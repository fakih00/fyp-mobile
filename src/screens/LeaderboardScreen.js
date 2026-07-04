import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    Animated,
    Modal,
    ActivityIndicator,
    RefreshControl,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/Theme';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { api } from '../services/api';
import { AppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');

const LEAGUES = [
    { name: 'Bronze',  color: '#CD7F32', gradient: ['#CD7F32', '#A0522D'], icon: 'shield',        minXP: 0,     maxXP: 500  },
    { name: 'Silver',  color: '#94A3B8', gradient: ['#94A3B8', '#64748B'], icon: 'shield-half',   minXP: 500,   maxXP: 1500 },
    { name: 'Gold',    color: '#F59E0B', gradient: ['#F59E0B', '#D97706'], icon: 'shield-checkmark', minXP: 1500, maxXP: 4000 },
    { name: 'Emerald', color: '#10B981', gradient: ['#10B981', '#059669'], icon: 'diamond',        minXP: 4000,  maxXP: 10000},
    { name: 'Diamond', color: '#7DD3FC', gradient: ['#7DD3FC', '#38BDF8'], icon: 'star',           minXP: 10000, maxXP: 99999},
];

const getLeagueForXP = (xp) => {
    for (let i = LEAGUES.length - 1; i >= 0; i--) {
        if (xp >= LEAGUES[i].minXP) return LEAGUES[i];
    }
    return LEAGUES[0];
};

const getSeasonTimer = () => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
    const diff = endOfMonth - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h REMAINING`;
};

const LeaderboardScreen = ({ navigation }) => {
    const { user, colors: themeColors } = useContext(AppContext);
    const [mode, setMode] = useState('Global');
    const [selectedLeague, setSelectedLeague] = useState(LEAGUES[3]);
    const [showLeagueModal, setShowLeagueModal] = useState(false);
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [seasonTimer] = useState(getSeasonTimer());
    const [floatingAnim] = useState(new Animated.Value(0));

    const fetchLeaderboard = useCallback(async (isRefreshing = false) => {
        if (!user?.user_id) return;
        if (!isRefreshing) setLoading(true);
        try {
            const res = await api.getLeaderboard(mode);
            if (res.status === 200) {
                const records = res.data.records || [];
                setRankings(records);
                // Auto-set league based on user's XP
                const myRecord = records.find(r => r.id == user?.user_id);
                if (myRecord) {
                    setSelectedLeague(getLeagueForXP(myRecord.xp || 0));
                }
            }
        } catch (error) {
            console.error('Fetch Leaderboard Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.user_id, mode]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
                Animated.timing(floatingAnim, { toValue: 0, duration: 4000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchLeaderboard(true);
    };

    // Filter rankings by selected league's XP bracket
    const leagueRankings = rankings.filter(r =>
        r.xp >= selectedLeague.minXP && r.xp < selectedLeague.maxXP
    );

    const displayRankings = leagueRankings.length > 0 ? leagueRankings : rankings;

    const topThree = [
        displayRankings.find(r => r.rank === 2) || displayRankings[1] || { name: '—', xp: 0, avatar: '?' },
        displayRankings.find(r => r.rank === 1) || displayRankings[0] || { name: '—', xp: 0, avatar: '?' },
        displayRankings.find(r => r.rank === 3) || displayRankings[2] || { name: '—', xp: 0, avatar: '?' },
    ];
    const otherRankings = displayRankings.filter(r => r.rank > 3);

    const myRecord = rankings.find(r => r.id == user?.user_id) || { rank: '?', xp: 0 };
    const myXP = myRecord.xp || 0;
    const myLeague = getLeagueForXP(myXP);
    const xpProgress = myLeague.maxXP < 99999
        ? Math.min(((myXP - myLeague.minXP) / (myLeague.maxXP - myLeague.minXP)) * 100, 100)
        : 100;
    const xpToNext = myLeague.maxXP < 99999 ? (myLeague.maxXP - myXP) : 0;

    const handleModeSwitch = (newMode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMode(newMode);
    };

    const handleLeagueSelect = (league) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedLeague(league);
        setShowLeagueModal(false);
    };

    // ── Sub-components ──────────────────────────────────────────────
    const PodiumItem = ({ userData, delay, size, rank, isWinner }) => (
        <AnimatedCard delay={delay} style={[styles.podiumItemElite, isWinner && styles.winnerShift]}>
            <View style={[styles.podiumAvatarFrame, { width: size + 10, height: size + 10, borderRadius: (size + 10) / 2 }]}>
                <LinearGradient
                    colors={isWinner ? themeColors.gradient : ['#E2E8F0', '#94A3B8']}
                    style={[styles.podiumAvatarInner, { borderRadius: size / 2, width: size, height: size }]}
                >
                    {userData?.avatar_url ? (
                        <Image source={{ uri: userData.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
                    ) : (
                        <Text style={[styles.podiumAvatarText, { fontSize: size * 0.4 }]}>{userData?.avatar || '?'}</Text>
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
            <Text style={styles.podiumNameElite} numberOfLines={1}>{userData?.name || '—'}</Text>
            <View style={styles.podiumXPBadge}>
                <Text style={[styles.podiumXPElite, { color: themeColors.accent }]}>{(userData?.xp || 0).toLocaleString()}</Text>
                <Text style={styles.podiumXPUnitElite}>XP</Text>
            </View>
        </AnimatedCard>
    );

    return (
        <AuraBackground style={styles.container}>
            {/* ── Header ── */}
            <View style={styles.headerStack}>
                <LinearGradient
                    colors={themeColors.gradient}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <Animated.View style={[styles.floatingIcon, {
                    top: 40, left: 60, opacity: 0.08,
                    transform: [
                        { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }) },
                        { rotate: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '25deg'] }) }
                    ]
                }]}>
                    <Ionicons name="trophy" size={40} color={COLORS.white} />
                </Animated.View>

                <SafeAreaView edges={['top']} style={styles.headerSafe}>
                    <View style={styles.navRow}>
                        <View style={styles.headerSpacer} />
                        <View style={styles.titleStack}>
                            <Text style={styles.eliteTitle}>Leaderboard</Text>
                            <Text style={styles.eliteSubtitle}>ELITE RANKINGS</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.headerActionBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                Alert.alert(
                                    '🏆 Season Info',
                                    `Current Season: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}\n\nTime Remaining: ${seasonTimer}\n\nTop players at season end earn exclusive rewards and keep their league standing!`,
                                    [{ text: 'Got it!' }]
                                );
                            }}
                        >
                            <BlurView intensity={20} tint="light" style={styles.iconBlur}>
                                <Ionicons name="information-circle" size={22} color={COLORS.white} />
                            </BlurView>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.leagueSelectorElite}>
                        <TouchableOpacity
                            style={[styles.leaguePillElite, { borderColor: selectedLeague.color + '60' }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setShowLeagueModal(true);
                            }}
                        >
                            <Ionicons name={selectedLeague.icon} size={16} color={selectedLeague.color} style={{ marginRight: 8 }} />
                            <Text style={[styles.leaguePillText, { color: selectedLeague.color }]}>
                                {selectedLeague.name.toUpperCase()} LEAGUE
                            </Text>
                            <Ionicons name="chevron-down" size={14} color={selectedLeague.color + 'AA'} style={{ marginLeft: 8 }} />
                        </TouchableOpacity>

                        <View style={styles.seasonTimerElite}>
                            <BlurView intensity={20} tint="light" style={styles.timerBlur}>
                                <Ionicons name="time" size={12} color={COLORS.white} />
                                <Text style={styles.timerTextElite}>{seasonTimer}</Text>
                            </BlurView>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            {loading && !refreshing ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={themeColors.accent} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollPadding}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.accent} />}
                >
                    {/* ── Mode Switcher ── */}
                    <View style={styles.modeSwitcherElite}>
                        {['Global', 'Friends'].map((m) => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.modePill, mode === m && { backgroundColor: themeColors.accent }]}
                                onPress={() => handleModeSwitch(m)}
                            >
                                <Ionicons
                                    name={m === 'Global' ? 'globe' : 'people'}
                                    size={14}
                                    color={mode === m ? COLORS.white : '#94A3B8'}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[styles.modePillText, mode === m && styles.modePillTextActive]}>
                                    {m.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── League Banner ── */}
                    <LinearGradient
                        colors={[selectedLeague.color + '22', selectedLeague.color + '05']}
                        style={styles.leagueBanner}
                    >
                        <View style={styles.leagueBannerLeft}>
                            <Ionicons name={selectedLeague.icon} size={28} color={selectedLeague.color} />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={[styles.leagueBannerTitle, { color: selectedLeague.color }]}>
                                    {selectedLeague.name} League
                                </Text>
                                <Text style={styles.leagueBannerSub}>
                                    {selectedLeague.minXP.toLocaleString()} – {selectedLeague.maxXP < 99999 ? selectedLeague.maxXP.toLocaleString() : '∞'} XP
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.leagueBannerBadge, { backgroundColor: selectedLeague.color + '20' }]}>
                            <Text style={[styles.leagueBannerCount, { color: selectedLeague.color }]}>
                                {displayRankings.length} players
                            </Text>
                        </View>
                    </LinearGradient>

                    {/* ── Podium ── */}
                    {displayRankings.length >= 1 ? (
                        <View style={styles.podiumWrapperElite}>
                            <PodiumItem userData={topThree[0]} delay={200} size={85} rank={2} />
                            <PodiumItem userData={topThree[1]} delay={100} size={110} rank={1} isWinner />
                            <PodiumItem userData={topThree[2]} delay={300} size={80} rank={3} />
                        </View>
                    ) : (
                        <View style={styles.emptyLeague}>
                            <Ionicons name={selectedLeague.icon} size={40} color={selectedLeague.color + '60'} />
                            <Text style={styles.emptyLeagueTitle}>No players in this league yet</Text>
                            <Text style={styles.emptyLeagueSub}>Be the first to reach {selectedLeague.name} League!</Text>
                        </View>
                    )}

                    {/* ── Rankings List ── */}
                    {otherRankings.length > 0 && (
                        <>
                            <View style={styles.rankingsHeaderElite}>
                                <Text style={styles.rankingsTitle}>Rankings</Text>
                                <View style={styles.rankingsLine} />
                            </View>

                            <View style={styles.listContainerElite}>
                                {otherRankings.map((item, index) => {
                                    const isMe = item.id == user?.user_id;
                                    return (
                                        <AnimatedCard key={item.id} delay={400 + index * 50} style={[styles.rankItemElite, isMe && { borderWidth: 2, borderColor: themeColors.accent + '60' }]}>
                                            <View style={styles.rankNumGrp}>
                                                <Text style={[styles.rankNumText, isMe && { color: themeColors.accent }]}>{item.rank}</Text>
                                                <View style={styles.rankTrendIcon}>
                                                    <Ionicons name="caret-up" size={10} color={themeColors.accent} />
                                                </View>
                                            </View>

                                            <View style={[styles.listAvatarElite, isMe && { borderWidth: 2, borderColor: themeColors.accent }]}>
                                                {item.avatar_url ? (
                                                    <Image source={{ uri: item.avatar_url }} style={{ width: '100%', height: '100%', borderRadius: 18 }} />
                                                ) : (
                                                    <Text style={styles.listAvatarTextElite}>{item.avatar}</Text>
                                                )}
                                            </View>

                                            <View style={styles.listInfoElite}>
                                                <Text style={[styles.listNameElite, isMe && { color: themeColors.accent }]}>
                                                    {item.name} {isMe ? '(You)' : ''}
                                                </Text>
                                                <View style={styles.levelRowElite}>
                                                    <Ionicons name="star" size={9} color={themeColors.accent} style={{ marginRight: 3 }} />
                                                    <Text style={[styles.levelLabelElite, { color: themeColors.accent }]}>LEVEL {item.level || 1}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.listXPGrpElite}>
                                                <Text style={styles.listXPTextElite}>{(item.xp || 0).toLocaleString()}</Text>
                                                <Text style={styles.listXPUnitElite}>XP</Text>
                                            </View>
                                        </AnimatedCard>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* ── My Rank Card ── */}
                    <GlassCard style={styles.myRankCardElite}>
                        <LinearGradient
                            colors={[themeColors.accent + '15', 'transparent']}
                            style={StyleSheet.absoluteFillObject}
                            borderRadius={30}
                        />
                        <View style={styles.myRankContent}>
                            <View style={styles.myRankHeaderElite}>
                                <LinearGradient
                                    colors={themeColors.gradient}
                                    style={styles.myRankAvatarElite}
                                >
                                    {user?.profileImage ? (
                                        <Image source={{ uri: user.profileImage }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
                                    ) : (
                                        <Text style={styles.myRankAvatarTextElite}>{user?.name?.charAt(0) || 'U'}</Text>
                                    )}
                                </LinearGradient>
                                <View style={styles.myRankTextGrp}>
                                    <Text style={styles.myRankGreeting}>Keep pushing, {user?.name?.split(' ')[0]}!</Text>
                                    <Text style={styles.myRankStatus}>
                                        Rank <Text style={{ color: themeColors.accent, fontWeight: '900' }}>#{myRecord.rank}</Text>
                                        {' • '}<Text style={{ color: myLeague.color, fontWeight: '900' }}>{myLeague.name}</Text>
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.myRankBadgeElite, { backgroundColor: themeColors.accent + '15' }]}>
                                <Text style={styles.rankLabelSmall}>XP</Text>
                                <Text style={[styles.rankValLarge, { color: themeColors.accent }]}>{myXP.toLocaleString()}</Text>
                            </View>
                        </View>

                        <View style={styles.rankXPProgressElite}>
                            <View style={styles.rankXPTextRow}>
                                <Text style={styles.rankXPProgLabel}>
                                    {myLeague.maxXP < 99999 ? `NEXT LEAGUE PROGRESS` : 'MAX LEAGUE REACHED 🏆'}
                                </Text>
                                <Text style={[styles.rankXPProgVal, { color: themeColors.accent }]}>
                                    {myLeague.maxXP < 99999 ? `${xpToNext.toLocaleString()} XP to go` : `${myXP.toLocaleString()} XP`}
                                </Text>
                            </View>
                            <View style={styles.progBarBgElite}>
                                <LinearGradient
                                    colors={themeColors.gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.progBarFillElite, { width: `${xpProgress.toFixed(0)}%` }]}
                                />
                            </View>
                            <View style={styles.leagueProgressLabels}>
                                <View style={styles.leagueProgressChip}>
                                    <Ionicons name={myLeague.icon} size={11} color={myLeague.color} style={{ marginRight: 3 }} />
                                    <Text style={[styles.leagueChipText, { color: myLeague.color }]}>{myLeague.name}</Text>
                                </View>
                                {myLeague.maxXP < 99999 && (
                                    <View style={styles.leagueProgressChip}>
                                        <Ionicons name={LEAGUES[LEAGUES.indexOf(myLeague) + 1]?.icon || 'star'} size={11} color="#94A3B8" style={{ marginRight: 3 }} />
                                        <Text style={[styles.leagueChipText, { color: '#94A3B8' }]}>
                                            {LEAGUES[LEAGUES.indexOf(myLeague) + 1]?.name || 'Max'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </GlassCard>

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {/* ── League Selector Modal ── */}
            <Modal
                visible={showLeagueModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowLeagueModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowLeagueModal(false)}
                >
                    <View style={styles.leagueModalContent}>
                        <View style={styles.leagueModalHandle} />
                        <Text style={styles.leagueModalTitle}>Select League</Text>
                        <Text style={styles.leagueModalSub}>View rankings by XP bracket</Text>

                        {LEAGUES.map((league) => {
                            const isSelected = selectedLeague.name === league.name;
                            const isMyLeague = myLeague.name === league.name;
                            const count = rankings.filter(r => r.xp >= league.minXP && r.xp < league.maxXP).length;
                            return (
                                <TouchableOpacity
                                    key={league.name}
                                    style={[styles.leagueOption, isSelected && { backgroundColor: league.color + '18', borderColor: league.color }]}
                                    onPress={() => handleLeagueSelect(league)}
                                >
                                    <LinearGradient
                                        colors={league.gradient}
                                        style={styles.leagueOptionIcon}
                                    >
                                        <Ionicons name={league.icon} size={20} color={COLORS.white} />
                                    </LinearGradient>
                                    <View style={styles.leagueOptionInfo}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={[styles.leagueOptionName, { color: league.color }]}>{league.name}</Text>
                                            {isMyLeague && (
                                                <View style={[styles.youBadge, { backgroundColor: league.color + '20' }]}>
                                                    <Text style={[styles.youBadgeText, { color: league.color }]}>YOU</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.leagueOptionRange}>
                                            {league.minXP.toLocaleString()} – {league.maxXP < 99999 ? league.maxXP.toLocaleString() : '∞'} XP  •  {count} players
                                        </Text>
                                    </View>
                                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={league.color} />}
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowLeagueModal(false)}>
                            <Text style={styles.closeModalBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerStack: {
        height: 175,
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
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden',
    },
    floatingIcon: { position: 'absolute', zIndex: 1 },
    headerSafe: { flex: 1, paddingHorizontal: 20 },
    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
    headerSpacer: { width: 44 },
    titleStack: { alignItems: 'center' },
    eliteTitle: { fontSize: 24, fontWeight: '900', color: COLORS.white, letterSpacing: -0.5 },
    eliteSubtitle: { fontSize: 10, fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginTop: 2 },
    headerActionBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
    iconBlur: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    leagueSelectorElite: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
    leaguePillElite: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20,
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    },
    leaguePillText: { fontSize: 12, fontWeight: '900', color: COLORS.white, letterSpacing: 0.5 },
    seasonTimerElite: { borderRadius: 15, overflow: 'hidden' },
    timerBlur: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
    timerTextElite: { fontSize: 10, fontWeight: 'bold', color: COLORS.white },
    scrollPadding: { paddingBottom: 120 },
    modeSwitcherElite: {
        flexDirection: 'row', backgroundColor: COLORS.white,
        marginHorizontal: 20, marginTop: 20, marginBottom: 16,
        borderRadius: 22, padding: 5,
        elevation: 8, shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10,
    },
    modePill: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 18, flexDirection: 'row', justifyContent: 'center' },
    modePillText: { fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 1 },
    modePillTextActive: { color: COLORS.white },
    leagueBanner: {
        marginHorizontal: 20, marginBottom: 20, borderRadius: 20,
        padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    },
    leagueBannerLeft: { flexDirection: 'row', alignItems: 'center' },
    leagueBannerTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
    leagueBannerSub: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
    leagueBannerBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    leagueBannerCount: { fontSize: 12, fontWeight: '900' },
    podiumWrapperElite: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
        paddingHorizontal: 20, marginBottom: 35, height: 220, gap: 10,
    },
    podiumItemElite: { alignItems: 'center', backgroundColor: 'transparent' },
    winnerShift: { transform: [{ translateY: -15 }] },
    podiumAvatarFrame: {
        backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center',
        elevation: 15, shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20,
        marginBottom: 15, position: 'relative',
    },
    podiumAvatarInner: { justifyContent: 'center', alignItems: 'center' },
    podiumAvatarText: { color: COLORS.white, fontWeight: '900' },
    rankBadgeElite: {
        position: 'absolute', bottom: 0, right: 0,
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: COLORS.white,
    },
    rankBadgeTextElite: { color: COLORS.white, fontWeight: '900', fontSize: 14 },
    winnerCrown: { position: 'absolute', top: -24 },
    podiumNameElite: { fontSize: 15, fontWeight: 'bold', color: '#0F172A', marginBottom: 6, width: 90, textAlign: 'center' },
    podiumXPBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 3 },
    podiumXPElite: { fontSize: 12, fontWeight: '900' },
    podiumXPUnitElite: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
    emptyLeague: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 30 },
    emptyLeagueTitle: { fontSize: 16, fontWeight: '900', color: '#334155', marginTop: 12, textAlign: 'center' },
    emptyLeagueSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 6 },
    rankingsHeaderElite: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15, gap: 15 },
    rankingsTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
    rankingsLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    listContainerElite: { paddingHorizontal: 20 },
    rankItemElite: {
        flexDirection: 'row', alignItems: 'center', padding: 15,
        backgroundColor: COLORS.white, borderRadius: 25, marginBottom: 12,
        elevation: 3, shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10,
        borderWidth: 1, borderColor: 'transparent',
    },
    rankNumGrp: { width: 35, alignItems: 'center' },
    rankNumText: { fontSize: 16, fontWeight: '900', color: '#94A3B8' },
    rankTrendIcon: { marginTop: 2 },
    listAvatarElite: {
        width: 50, height: 50, borderRadius: 18,
        backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
        marginHorizontal: 12, borderWidth: 1.5, borderColor: 'transparent',
    },
    listAvatarTextElite: { fontSize: 18, fontWeight: '900', color: '#475569' },
    listInfoElite: { flex: 1, gap: 2 },
    listNameElite: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
    levelRowElite: { flexDirection: 'row', alignItems: 'center' },
    levelLabelElite: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    listXPGrpElite: { alignItems: 'flex-end' },
    listXPTextElite: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
    listXPUnitElite: { fontSize: 9, fontWeight: '800', color: '#94A3B8', marginTop: 1 },
    myRankCardElite: {
        marginHorizontal: 20, marginTop: 15, padding: 24,
        backgroundColor: COLORS.white, borderRadius: 30, elevation: 10, overflow: 'hidden',
    },
    myRankContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    myRankHeaderElite: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    myRankAvatarElite: { width: 55, height: 55, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    myRankAvatarTextElite: { fontSize: 24, fontWeight: '900', color: COLORS.white },
    myRankTextGrp: { gap: 3 },
    myRankGreeting: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    myRankStatus: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
    myRankBadgeElite: { alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
    rankLabelSmall: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
    rankValLarge: { fontSize: 22, fontWeight: '900' },
    rankXPProgressElite: { gap: 10 },
    rankXPTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rankXPProgLabel: { fontSize: 10, fontWeight: '900', color: '#64748B', letterSpacing: 0.5 },
    rankXPProgVal: { fontSize: 11, fontWeight: '900' },
    progBarBgElite: { height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
    progBarFillElite: { height: '100%', borderRadius: 5 },
    leagueProgressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    leagueProgressChip: { flexDirection: 'row', alignItems: 'center' },
    leagueChipText: { fontSize: 10, fontWeight: '900' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    leagueModalContent: {
        backgroundColor: COLORS.surface || '#FFFCF9', borderTopLeftRadius: 35, borderTopRightRadius: 35,
        paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16,
    },
    leagueModalHandle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    leagueModalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
    leagueModalSub: { fontSize: 13, color: '#64748B', marginBottom: 20 },
    leagueOption: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        borderRadius: 20, marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent',
        backgroundColor: '#F8FAFC',
    },
    leagueOptionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    leagueOptionInfo: { flex: 1 },
    leagueOptionName: { fontSize: 16, fontWeight: '900' },
    leagueOptionRange: { fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
    youBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    youBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    closeModalBtn: {
        marginTop: 8, paddingVertical: 16, borderRadius: 20,
        backgroundColor: '#F1F5F9', alignItems: 'center',
    },
    closeModalBtnText: { fontSize: 14, fontWeight: '900', color: '#64748B' },
});

export default LeaderboardScreen;
