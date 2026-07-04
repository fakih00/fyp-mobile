import React, { useState, useContext, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { api } from '../services/api';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const CATEGORIES = ['All', 'Workout', 'Nutrition', 'Cardio', 'Steps', 'Water', 'Streak'];

const ChallengesScreen = ({ navigation }) => {
    const { user, colors: themeColors } = useContext(AppContext);
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Discover');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Dynamic colors based on theme
    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)';
    const cardBg = themeColors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

    const loadData = async () => {
        setLoading(true);
        console.log("Loading active and available challenges from database...");
        try {
            const res = await api.getChallenges();
            if (res.status === 200) {
                setChallenges(res.data.records || []);
            }
        } catch (e) {
            console.error("Fetch Challenges Error:", e);
        } finally {
            setLoading(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const hasActiveChallenge = challenges.some(c => c.joined && c.user_status === 'joined');

    const handleJoin = async (challenge) => {
        if (hasActiveChallenge) {
            Alert.alert(
                "Active Challenge Found",
                "You can only participate in one active challenge at a time. Please leave or complete your current challenge before starting a new one."
            );
            return;
        }

        Alert.alert(
            "Join Challenge",
            `Are you sure you want to join the "${challenge.title}" challenge?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Yes, Join",
                    onPress: async () => {
                        try {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            const res = await api.joinChallenge(challenge.id);

                            const updated = challenges.map(c =>
                                c.id === challenge.id ? { ...c, joined: true, progress: 0, days_left: challenge.duration, user_status: 'joined' } : c
                            );
                            setChallenges(updated);
                            Alert.alert("Success", "You've successfully started this challenge. Good luck!");
                        } catch (e) {
                            loadData();
                            const errorMsg = e.response?.data?.message || "Could not join challenge. Please try again.";
                            Alert.alert("Hold on", errorMsg);
                        }
                    }
                }
            ]
        );
    };

    const handleLeave = async (challenge) => {
        Alert.alert(
            "Leave Challenge",
            `Are you sure you want to leave "${challenge.title}"? Your current progress will be lost.`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Yes, Leave",
                    style: "destructive",
                    onPress: async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        const updated = challenges.map(c =>
                            c.id === challenge.id ? { ...c, joined: false, user_status: null, progress: 0 } : c
                        );
                        setChallenges(updated);

                        try {
                            await api.leaveChallenge(challenge.id);
                        } catch (e) {
                            loadData();
                        }
                    }
                }
            ]
        );
    };

    const filteredChallenges = challenges.filter(c => {
        const matchesTab = activeTab === 'Discover' ? !c.joined : c.joined;
        const matchesCategory = selectedCategory === 'All' || c.type === selectedCategory;
        return matchesTab && matchesCategory;
    });

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.navRow}>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={styles.iconBlur}>
                            <Ionicons name="chevron-back" size={24} color={textColor} />
                        </BlurView>
                    </TouchableOpacity>
                    <View style={styles.titleStack}>
                        <Text style={[styles.eliteTitle, { color: textColor }]}>Challenges</Text>
                        <Text style={[styles.eliteSubtitle, { color: themeColors.accent }]}>PUSH YOUR LIMITS</Text>
                    </View>
                    <View style={styles.pointsBadgeElite}>
                        <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={styles.pointsBlur}>
                            <Ionicons name="flash" size={14} color="#F59E0B" />
                            <Text style={[styles.pointsValueElite, { color: textColor }]}>{user.points}</Text>
                        </BlurView>
                    </View>
                </View>

                {/* Tab Switcher */}
                <View style={[styles.tabContainerElite, { backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <TouchableOpacity
                        style={[styles.tabElite, activeTab === 'Discover' && { backgroundColor: themeColors.accent }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab('Discover');
                        }}
                    >
                        <Text style={[styles.tabTextElite, { color: subTextColor }, activeTab === 'Discover' && styles.activeTabTextElite]}>DISCOVER</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabElite, activeTab === 'Active' && { backgroundColor: themeColors.accent }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab('Active');
                        }}
                    >
                        <Text style={[styles.tabTextElite, { color: subTextColor }, activeTab === 'Active' && styles.activeTabTextElite]}>MY JOURNEY</Text>
                        {challenges.filter(c => c.joined).length > 0 && (
                            <View style={styles.notifDotElite} />
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );

    const renderCategories = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
            style={styles.categoryScroll}
        >
            {CATEGORIES.map(cat => (
                <TouchableOpacity
                    key={cat}
                    style={[
                        styles.categoryChipElite,
                        { backgroundColor: cardBg, borderColor: themeColors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                        selectedCategory === cat && { borderColor: themeColors.accent, backgroundColor: themeColors.accent + '20' }
                    ]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedCategory(cat);
                    }}
                >
                    <Text style={[styles.categoryTextElite, { color: subTextColor }, selectedCategory === cat && { color: themeColors.accent }]}>
                        {cat.toUpperCase()}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderChallengeCard = ({ item, index }) => (
        <AnimatedCard delay={index * 100} style={styles.cardWrapper}>
            <GlassCard style={styles.cardElite}>
                <View style={styles.imageContainer}>
                    <Image source={{ uri: item.image }} style={styles.cardImgElite} />
                    <LinearGradient
                        colors={['transparent', themeColors.isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)']}
                        style={styles.cardOverlayElite}
                    />
                    <View style={styles.cardTagElite}>
                        <BlurView intensity={30} tint={themeColors.isDark ? "dark" : "light"} style={styles.tagBlurElite}>
                            <Text style={[styles.tagTextElite, { color: textColor }]}>{item.type.toUpperCase()}</Text>
                        </BlurView>
                    </View>
                </View>

                <View style={styles.cardContentElite}>
                    <View style={styles.cardHeaderElite}>
                        <Text style={[styles.cardTitleElite, { color: textColor }]}>{item.title}</Text>
                        <View style={[styles.rewardPillElite, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B40' }]}>
                            <Ionicons name="flash" size={12} color="#F59E0B" />
                            <Text style={styles.rewardValueElite}>+{item.points_reward}</Text>
                        </View>
                    </View>

                    <Text style={[styles.cardDescElite, { color: subTextColor }]} numberOfLines={2}>{item.description}</Text>

                    {item.joined ? (
                        <View style={styles.progressSectionElite}>
                            <View style={styles.progressLabelRow}>
                                <Text style={[styles.progressPercElite, { color: themeColors.accent }]}>
                                    {Math.min(100, (((item.progress || 0) / (item.goal_value || 1)) * 100)).toFixed(0)}% COMPLETED
                                </Text>
                                <Text style={[styles.daysRemElite, { color: subTextColor }]}>{item.days_left} DAYS LEFT</Text>
                            </View>
                            <View style={[styles.progressBarBgElite, { backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                <LinearGradient
                                    colors={themeColors.gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.progressBarFillElite, { width: `${Math.min(100, ((item.progress || 0) / (item.goal_value || 1)) * 100)}%` }]}
                                />
                            </View>
                            <TouchableOpacity style={styles.leaveBtn} onPress={() => handleLeave(item)}>
                                <Text style={[styles.leaveBtnText, { color: subTextColor }]}>Leave Challenge</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.joinBtnElite}
                            onPress={() => handleJoin(item)}
                        >
                            <LinearGradient
                                colors={themeColors.gradient}
                                style={styles.joinGradElite}
                            >
                                <Text style={styles.joinBtnTextElite}>START CHALLENGE</Text>
                                <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </GlassCard>
        </AnimatedCard>
    );

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style={themeColors.isDark ? "light" : "dark"} />
            {renderHeader()}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={themeColors.accent} />
                </View>
            ) : (
                <FlatList
                    data={filteredChallenges}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderChallengeCard}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={renderCategories}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: cardBg }]}>
                                <Ionicons name="trophy-outline" size={40} color={subTextColor} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: textColor }]}>All caught up!</Text>
                            <Text style={[styles.emptySub, { color: subTextColor }]}>No {selectedCategory !== 'All' ? selectedCategory.toLowerCase() : ''} challenges found.</Text>
                        </View>
                    )}
                />
            )}
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerContainer: {
        paddingBottom: 10,
    },
    headerSafe: {
        paddingHorizontal: 25,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
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
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    eliteSubtitle: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginTop: 2,
    },
    pointsBadgeElite: {
        height: 40,
        borderRadius: 12,
        overflow: 'hidden',
    },
    pointsBlur: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        gap: 6,
    },
    pointsValueElite: {
        fontSize: 14,
        fontWeight: '900',
    },
    tabContainerElite: {
        flexDirection: 'row',
        marginTop: 25,
        borderRadius: 20,
        padding: 6,
    },
    tabElite: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    tabTextElite: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    activeTabTextElite: {
        color: COLORS.white,
    },
    notifDotElite: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F59E0B',
    },
    categoryScroll: {
        marginTop: 20,
        marginBottom: 10,
    },
    categoryScrollContent: {
        paddingHorizontal: 25,
        gap: 12,
    },
    categoryChipElite: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
    },
    categoryTextElite: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    listContent: {
        paddingBottom: 40,
        paddingHorizontal: 25,
    },
    cardWrapper: {
        marginBottom: 20,
        backgroundColor: 'transparent',
    },
    cardElite: {
        borderRadius: 35,
        overflow: 'hidden',
        padding: 0,
    },
    imageContainer: {
        height: 180,
        position: 'relative',
    },
    cardImgElite: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1E293B',
    },
    cardOverlayElite: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
    },
    cardTagElite: {
        position: 'absolute',
        top: 15,
        left: 15,
        borderRadius: 10,
        overflow: 'hidden',
    },
    tagBlurElite: {
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    tagTextElite: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cardContentElite: {
        padding: 20,
        marginTop: -30,
    },
    cardHeaderElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    cardTitleElite: {
        fontSize: 20,
        fontWeight: '900',
        flex: 1,
        marginRight: 10,
    },
    rewardPillElite: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    rewardValueElite: {
        fontSize: 11,
        fontWeight: '900',
        color: '#F59E0B',
    },
    cardDescElite: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
        marginBottom: 20,
    },
    progressSectionElite: {
        gap: 10,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressPercElite: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    daysRemElite: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    progressBarBgElite: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFillElite: {
        height: '100%',
        borderRadius: 3,
    },
    joinBtnElite: {
        height: 54,
        borderRadius: 18,
        overflow: 'hidden',
    },
    joinGradElite: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    joinBtnTextElite: {
        fontSize: 14,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1.5,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 6,
    },
    emptySub: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 18,
    },
    leaveBtn: {
        alignItems: 'center',
        marginTop: 10
    },
    leaveBtnText: {
        fontSize: 11,
        fontWeight: '700',
        textDecorationLine: 'underline',
    }
});

export default ChallengesScreen;
