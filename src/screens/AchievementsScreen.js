import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    FlatList,
    Modal,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { AnimatedCard } from '../components';
import { api } from '../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

const CATEGORIES = ['All', 'Milestone', 'Fitness', 'Nutrition', 'Social', 'Legacy'];

const CATEGORY_COLORS = {
    Milestone: '#F59E0B',
    Fitness:   '#EF4444',
    Nutrition: '#10B981',
    Social:    '#3B82F6',
    Legacy:    '#8B5CF6',
};

// ─── Achievement Unlock Popup ─────────────────────────────────────────────────
const UnlockPopup = ({ visible, achievement, onDismiss }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible && achievement) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                    Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
                ])
            ).start();

            // Auto-dismiss after 4 seconds
            const timer = setTimeout(onDismiss, 4000);
            return () => clearTimeout(timer);
        } else {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible, achievement]);

    if (!achievement) return null;
    const catColor = CATEGORY_COLORS[achievement.category] || '#F59E0B';

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
            <Animated.View style={[styles.popupOverlay, { opacity: opacityAnim }]}>
                <TouchableOpacity style={styles.popupOverlay} onPress={onDismiss} activeOpacity={1}>
                    <Animated.View style={[styles.popupCard, { transform: [{ scale: scaleAnim }] }]}>
                        <LinearGradient
                            colors={['#1A1A2E', '#16213E', '#0F3460']}
                            style={styles.popupGrad}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {/* Glow ring */}
                            <Animated.View style={[
                                styles.popupGlow,
                                {
                                    borderColor: catColor,
                                    opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] }),
                                    transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] }) }]
                                }
                            ]} />

                            <View style={styles.popupBadgeLabel}>
                                <Ionicons name="lock-open" size={12} color={catColor} />
                                <Text style={[styles.popupBadgeTxt, { color: catColor }]}>ACHIEVEMENT UNLOCKED</Text>
                            </View>

                            <View style={[styles.popupIconRing, { borderColor: catColor + '60', backgroundColor: catColor + '20' }]}>
                                <Text style={styles.popupEmoji}>{achievement.icon}</Text>
                            </View>

                            <Text style={styles.popupTitle}>{achievement.title}</Text>
                            <Text style={styles.popupDesc}>{achievement.description}</Text>

                            <View style={styles.popupRewardsRow}>
                                {achievement.xp_reward > 0 && (
                                    <View style={styles.popupRewardChip}>
                                        <Ionicons name="flash" size={12} color="#F59E0B" />
                                        <Text style={styles.popupRewardTxt}>+{achievement.xp_reward} XP</Text>
                                    </View>
                                )}
                                {achievement.pts_reward > 0 && (
                                    <View style={[styles.popupRewardChip, { borderColor: '#10B981' + '40' }]}>
                                        <Ionicons name="star" size={12} color="#10B981" />
                                        <Text style={[styles.popupRewardTxt, { color: '#10B981' }]}>+{achievement.pts_reward} PTS</Text>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity onPress={onDismiss} style={[styles.popupDismissBtn, { backgroundColor: catColor }]}>
                                <Text style={styles.popupDismissTxt}>AWESOME!</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animated.View>
                </TouchableOpacity>
            </Animated.View>
        </Modal>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AchievementsScreen = ({ navigation }) => {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total_earned: 0, total: 0 });

    // Unlock popup state
    const [unlockQueue, setUnlockQueue] = useState([]);
    const [currentUnlock, setCurrentUnlock] = useState(null);
    const [showPopup, setShowPopup] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadAchievements();
        }, [])
    );

    const loadAchievements = async () => {
        setLoading(true);
        console.log("Loading achievements from API...");
        try {
            const res = await api.getAchievements();
            if (res.status === 200) {
                setAchievements(res.data.achievements || []);
                setStats({
                    total_earned: res.data.total_earned || 0,
                    total: res.data.total || 0,
                });
                // Queue up newly-unlocked popups
                if (res.data.newly_unlocked?.length > 0) {
                    setUnlockQueue(res.data.newly_unlocked);
                }
            }
        } catch (e) {
            console.error('Load achievements error:', e);
        } finally {
            setLoading(false);
        }
    };

    // Process popup queue one-by-one
    useEffect(() => {
        if (unlockQueue.length > 0 && !showPopup) {
            const [next, ...rest] = unlockQueue;
            setCurrentUnlock(next);
            setShowPopup(true);
            setUnlockQueue(rest);
        }
    }, [unlockQueue, showPopup]);

    const handleDismissPopup = () => {
        setShowPopup(false);
        setTimeout(() => setCurrentUnlock(null), 300);
    };

    const filteredAchievements = selectedCategory === 'All'
        ? achievements
        : achievements.filter(a => a.category === selectedCategory);

    const earnedCount = achievements.filter(a => a.earned).length;
    const completionPct = achievements.length > 0 ? Math.round((earnedCount / achievements.length) * 100) : 0;

    // ─── Header ──────────────────────────────────────────────────────────────
    const renderHeader = () => (
        <View style={styles.headerStack}>
            <LinearGradient
                colors={['#1A1A2E', '#16213E', '#0F3460']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Decorative stars */}
            <View style={[styles.starDot, { top: 30, left: 40, width: 4, height: 4, opacity: 0.6 }]} />
            <View style={[styles.starDot, { top: 60, left: width * 0.6, width: 3, height: 3, opacity: 0.4 }]} />
            <View style={[styles.starDot, { top: 20, right: 50, width: 5, height: 5, opacity: 0.5 }]} />
            <View style={[styles.starDot, { top: 80, left: 120, width: 2, height: 2, opacity: 0.7 }]} />

            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.navRow}>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }}
                    >
                        <BlurView intensity={20} tint="light" style={styles.iconBlur}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>

                    <View style={styles.titleStack}>
                        <Text style={styles.eliteTitle}>Achievements</Text>
                        <Text style={styles.eliteSubtitle}>YOUR HALL OF FAME</Text>
                    </View>

                    <View style={[styles.headerActionBtn, { opacity: 0 }]} />
                </View>

                {/* Stats Banner */}
                <View style={styles.statsBanner}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{earnedCount}</Text>
                        <Text style={styles.statLabel}>EARNED</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{achievements.length}</Text>
                        <Text style={styles.statLabel}>TOTAL</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#F59E0B' }]}>{completionPct}%</Text>
                        <Text style={styles.statLabel}>COMPLETE</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.totalProgressWrap}>
                    <View style={styles.totalProgressBg}>
                        <LinearGradient
                            colors={['#F59E0B', '#EF4444', '#8B5CF6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.totalProgressFill, { width: `${completionPct}%` }]}
                        />
                    </View>
                </View>

                {/* Category chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipScroll}
                    contentContainerStyle={styles.chipContent}
                >
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => { Haptics.selectionAsync(); setSelectedCategory(cat); }}
                            style={[
                                styles.chip,
                                selectedCategory === cat && { backgroundColor: COLORS.white, borderColor: COLORS.white }
                            ]}
                        >
                            {cat !== 'All' && (
                                <View style={[styles.chipDot, { backgroundColor: CATEGORY_COLORS[cat] || '#64748B' }]} />
                            )}
                            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                                {cat.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );

    // ─── Badge Card ───────────────────────────────────────────────────────────
    const renderBadge = ({ item, index }) => {
        const catColor = CATEGORY_COLORS[item.category] || '#64748B';
        const progressPct = item.earned ? 100 : (item.progress || 0);

        return (
            <AnimatedCard delay={index * 40} style={[styles.badgeCard, !item.earned && styles.lockedBadge]}>
                {/* Earned glow */}
                {item.earned && (
                    <LinearGradient
                        colors={[catColor + '15', 'transparent']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                    />
                )}

                {/* Category accent bar */}
                <View style={[styles.badgeCategoryBar, { backgroundColor: item.earned ? catColor : '#E2E8F0' }]} />

                <View style={styles.badgeIconWrapper}>
                    <Text style={[styles.badgeIcon, !item.earned && styles.lockedIcon]}>{item.icon}</Text>
                    {!item.earned && (
                        <View style={styles.lockOverlay}>
                            <Ionicons name="lock-closed" size={10} color="#94A3B8" />
                        </View>
                    )}
                    {item.earned && (
                        <View style={[styles.earnedRing, { borderColor: catColor }]}>
                            <Ionicons name="checkmark" size={10} color={catColor} />
                        </View>
                    )}
                </View>

                <Text style={[styles.badgeTitle, !item.earned && { color: '#94A3B8' }]}>{item.title}</Text>

                <View style={[styles.badgeCatChip, { backgroundColor: catColor + (item.earned ? '20' : '10') }]}>
                    <Text style={[styles.badgeCatText, { color: item.earned ? catColor : '#94A3B8' }]}>
                        {item.category.toUpperCase()}
                    </Text>
                </View>

                {item.earned ? (
                    <View style={styles.earnedBadge}>
                        <Ionicons name="checkmark-circle" size={11} color={catColor} />
                        <Text style={[styles.earnedText, { color: catColor }]}>
                            {item.earned_at ? new Date(item.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Earned'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.progressWrapper}>
                        <View style={styles.progressBar}>
                            <View style={[
                                styles.progressFill,
                                {
                                    width: `${progressPct}%`,
                                    backgroundColor: catColor,
                                }
                            ]} />
                        </View>
                        <Text style={styles.progressLabel}>{progressPct}%</Text>
                    </View>
                )}

                {/* Reward chips */}
                {item.earned && (
                    <View style={styles.badgeRewardsRow}>
                        {item.xp_reward > 0 && (
                            <Text style={styles.badgeRewardTxt}>⚡ {item.xp_reward} XP</Text>
                        )}
                    </View>
                )}
            </AnimatedCard>
        );
    };

    return (
        <View style={styles.container}>
            {renderHeader()}

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#F59E0B" />
                    <Text style={{ color: '#94A3B8', marginTop: 15, fontSize: 13, fontWeight: '600' }}>
                        Loading Achievements...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredAchievements}
                    renderItem={renderBadge}
                    keyExtractor={item => String(item.id)}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    columnWrapperStyle={styles.columnWrapper}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>🔍</Text>
                            <Text style={styles.emptyTitle}>No achievements here yet</Text>
                            <Text style={styles.emptySubtitle}>Keep training to unlock your first badge!</Text>
                        </View>
                    )}
                />
            )}

            {/* Achievement Unlock Popup */}
            <UnlockPopup
                visible={showPopup}
                achievement={currentUnlock}
                onDismiss={handleDismissPopup}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },

    // ─── Header ────────────────────────────────────────────────────
    headerStack: {
        position: 'relative',
        zIndex: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerSafe: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 5,
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
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 2,
        marginTop: 2,
    },
    starDot: {
        position: 'absolute',
        borderRadius: 99,
        backgroundColor: '#FFFFFF',
    },

    // ─── Stats Banner ───────────────────────────────────────────────
    statsBanner: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20,
        marginTop: 18,
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1.5,
    },
    statDivider: {
        width: 1,
        height: '80%',
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'center',
    },

    // ─── Total Progress Bar ──────────────────────────────────────────
    totalProgressWrap: {
        marginTop: 14,
    },
    totalProgressBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    totalProgressFill: {
        height: '100%',
        borderRadius: 3,
    },

    // ─── Category Chips ─────────────────────────────────────────────
    chipScroll: {
        marginTop: 16,
    },
    chipContent: {
        paddingRight: 20,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        gap: 6,
    },
    chipDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    chipText: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 0.5,
    },
    chipTextActive: {
        color: '#1A1A2E',
    },

    // ─── Badge Grid ─────────────────────────────────────────────────
    listContent: {
        padding: 20,
        paddingTop: 25,
        paddingBottom: 110,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 18,
    },
    badgeCard: {
        width: CARD_WIDTH,
        backgroundColor: COLORS.white,
        borderRadius: 28,
        padding: 18,
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    lockedBadge: {
        backgroundColor: '#F8FAFC',
        elevation: 2,
        shadowOpacity: 0.04,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    badgeCategoryBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    badgeIconWrapper: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 8,
        position: 'relative',
    },
    badgeIcon: {
        fontSize: 34,
    },
    lockedIcon: {
        opacity: 0.25,
    },
    lockOverlay: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: COLORS.white,
        width: 22,
        height: 22,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    earnedRing: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: COLORS.white,
        width: 22,
        height: 22,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        borderWidth: 2,
    },
    badgeTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 6,
        lineHeight: 18,
    },
    badgeCatChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginBottom: 10,
    },
    badgeCatText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    earnedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
    },
    earnedText: {
        fontSize: 9,
        fontWeight: '900',
    },
    progressWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
    },
    progressBar: {
        flex: 1,
        height: 5,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#94A3B8',
    },
    badgeRewardsRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 6,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    badgeRewardTxt: {
        fontSize: 9,
        fontWeight: '900',
        color: '#F59E0B',
        backgroundColor: '#FFF9ED',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
    },

    // ─── Empty state ────────────────────────────────────────────────
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
        gap: 10,
    },
    emptyIcon: {
        fontSize: 48,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: '#0F172A',
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 30,
    },

    // ─── Unlock Popup ────────────────────────────────────────────────
    popupOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    popupCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 36,
        overflow: 'hidden',
        elevation: 30,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
    },
    popupGrad: {
        padding: 30,
        alignItems: 'center',
        position: 'relative',
    },
    popupGlow: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        height: 140,
        borderRadius: 28,
        borderWidth: 2,
    },
    popupBadgeLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 20,
    },
    popupBadgeTxt: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    popupIconRing: {
        width: 100,
        height: 100,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
        borderWidth: 2,
    },
    popupEmoji: {
        fontSize: 48,
    },
    popupTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: COLORS.white,
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    popupDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 22,
        fontWeight: '600',
    },
    popupRewardsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    popupRewardChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: 'rgba(245,158,11,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.3)',
    },
    popupRewardTxt: {
        fontSize: 13,
        fontWeight: '900',
        color: '#F59E0B',
    },
    popupDismissBtn: {
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 20,
    },
    popupDismissTxt: {
        fontSize: 13,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
});

export default AchievementsScreen;
