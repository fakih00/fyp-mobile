import React, { useState, useContext, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Dimensions,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { StatusBar } from 'expo-status-bar';
import { AppContext } from '../context/AppContext';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const DATA = [
    {
        id: '1',
        tag: 'TRAINING',
        title: 'ELITE TRAINING',
        desc: 'Advanced workout plans powered by AI to push your limits.',
        color: '#10B981',
        type: 'workout'
    },
    {
        id: '2',
        tag: 'DIET',
        title: 'SMART NUTRITION',
        desc: 'Personalized meal tracking and macro goals for your physique.',
        color: '#3B82F6',
        type: 'nutrition'
    },
    {
        id: '3',
        tag: 'SOCIAL',
        title: 'ELITE COMMUNITY',
        desc: 'Compete with friends and climb the global leaderboards.',
        color: '#F59E0B',
        type: 'social'
    },
];

const VisualMockup = ({ type, color, themeColors }) => {
    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subText = themeColors.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)';

    if (type === 'workout') {
        return (
            <View style={styles.mockupContainer}>
                {/* Mini Workout Card */}
                <GlassCard style={styles.miniCard}>
                    <View style={styles.miniHeader}>
                        <View style={[styles.miniIcon, { backgroundColor: color + '20' }]}>
                            <Ionicons name="barbell" size={18} color={color} />
                        </View>
                        <View>
                            <Text style={[styles.miniTitle, { color: textColor }]}>Chest & Triceps</Text>
                            <Text style={[styles.miniSubtitle, { color: subText }]}>Next Session • 45m</Text>
                        </View>
                    </View>
                    <View style={styles.miniProgressContainer}>
                        <View style={[styles.miniProgressBar, { backgroundColor: color + '20' }]}>
                            <View style={[styles.miniProgressFill, { width: '65%', backgroundColor: color }]} />
                        </View>
                        <Text style={[styles.miniPercent, { color: color }]}>65%</Text>
                    </View>
                </GlassCard>
                {/* Decorative Badge */}
                <View style={[styles.floatingBadge, { top: -20, right: -10, backgroundColor: themeColors.accent }]}>
                    <Ionicons name="flash" size={12} color={COLORS.white} />
                    <Text style={styles.badgeText}>ELITE</Text>
                </View>
            </View>
        );
    }

    if (type === 'nutrition') {
        return (
            <View style={styles.mockupContainer}>
                {/* Macro Pills */}
                <View style={styles.macroGrid}>
                    <GlassCard style={styles.macroPill}>
                        <Text style={styles.macroVal}>165g</Text>
                        <Text style={[styles.macroLabel, { color: COLORS.protein }]}>PRO</Text>
                    </GlassCard>
                    <GlassCard style={styles.macroPill}>
                        <Text style={styles.macroVal}>220g</Text>
                        <Text style={[styles.macroLabel, { color: COLORS.carbs }]}>CARB</Text>
                    </GlassCard>
                </View>
                {/* Main Meal Preview */}
                <GlassCard style={styles.miniCard}>
                    <View style={styles.miniHeader}>
                        <View style={[styles.miniIcon, { backgroundColor: color + '20' }]}>
                            <Ionicons name="restaurant" size={18} color={color} />
                        </View>
                        <View>
                            <Text style={[styles.miniTitle, { color: textColor }]}>Grilled Salmon</Text>
                            <Text style={[styles.miniSubtitle, { color: subText }]}>High Protein • Lunch</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={20} color={color} style={{ marginLeft: 'auto' }} />
                    </View>
                </GlassCard>
            </View>
        );
    }

    if (type === 'social') {
        return (
            <View style={styles.mockupContainer}>
                {/* Mini Leaderboard */}
                <GlassCard style={[styles.miniCard, { width: 220 }]}>
                    <View style={styles.rankItem}>
                        <View style={styles.rankBadge}>
                            <Ionicons name="trophy" size={14} color="#F59E0B" />
                        </View>
                        <View style={styles.rankAvatar} />
                        <Text style={[styles.rankName, { color: textColor }]}>You</Text>
                        <Text style={[styles.rankXP, { color: themeColors.accent }]}>12.4k XP</Text>
                    </View>
                    <View style={[styles.rankItem, { opacity: 0.6 }]}>
                        <Text style={[styles.rankNum, { color: subText }]}>02</Text>
                        <View style={[styles.rankAvatar, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                        <Text style={[styles.rankName, { color: textColor }]}>K. Alex</Text>
                        <Text style={[styles.rankXP, { color: subText }]}>11.8k XP</Text>
                    </View>
                </GlassCard>
            </View>
        );
    }

    return null;
};

const OnboardingScreen = ({ navigation }) => {
    const { colors: themeColors } = useContext(AppContext);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef(null);

    const viewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollTo = () => {
        if (currentIndex < DATA.length - 1) {
            slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('Login');
        }
    };

    const skip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('Login');
    };

    // Dynamic colors
    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)';

    const renderItem = ({ item }) => (
        <View style={styles.slide}>
            {/* Visual Section */}
            <AnimatedCard style={styles.visualContainer} delay={200}>
                <VisualMockup type={item.type} color={item.color} themeColors={themeColors} />
            </AnimatedCard>

            {/* Content Section */}
            <AnimatedCard style={styles.contentContainer} delay={400}>
                <View style={styles.infoWrapper}>
                    <View style={[styles.tagPill, { backgroundColor: item.color + '15' }]}>
                        <Text style={[styles.tagText, { color: item.color }]}>{item.tag}</Text>
                    </View>

                    <GlassCard style={styles.textCard}>
                        <Text style={[styles.slideTitle, { color: textColor }]}>{item.title}</Text>
                        <Text style={[styles.slideDesc, { color: subTextColor }]}>{item.desc}</Text>
                    </GlassCard>
                </View>
            </AnimatedCard>
        </View>
    );

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style={themeColors.isDark ? "light" : "dark"} />

            <SafeAreaView style={styles.safeArea}>
                <FlatList
                    data={DATA}
                    renderItem={renderItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                        useNativeDriver: false,
                    })}
                    scrollEventThrottle={32}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    ref={slidesRef}
                />

                <View style={styles.footer}>
                    {/* Pagination */}
                    <View style={styles.pagination}>
                        {DATA.map((_, i) => {
                            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                            const dotWidth = scrollX.interpolate({
                                inputRange,
                                outputRange: [8, 20, 8],
                                extrapolate: 'clamp',
                            });
                            const opacity = scrollX.interpolate({
                                inputRange,
                                outputRange: [0.3, 1, 0.3],
                                extrapolate: 'clamp',
                            });

                            return (
                                <Animated.View
                                    style={[
                                        styles.dot,
                                        { width: dotWidth, opacity, backgroundColor: themeColors.accent },
                                    ]}
                                    key={i.toString()}
                                />
                            );
                        })}
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.skipBtn} onPress={skip}>
                            <Text style={[styles.skipText, { color: subTextColor }]}>SKIP</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.nextBtn} onPress={scrollTo}>
                            <LinearGradient
                                colors={themeColors.gradient}
                                style={styles.nextGrad}
                            >
                                <Text style={styles.nextText}>
                                    {currentIndex === DATA.length - 1 ? 'GET STARTED' : 'CONTINUE'}
                                </Text>
                                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
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
    slide: {
        width,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 25,
    },
    visualContainer: {
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        backgroundColor: 'transparent',
        marginBottom: 30,
    },
    mockupContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    miniCard: {
        padding: 16,
        width: 260,
        borderRadius: 24,
    },
    miniHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    miniIcon: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniTitle: {
        fontSize: 14,
        fontWeight: '900',
    },
    miniSubtitle: {
        fontSize: 10,
        fontWeight: '600',
    },
    miniProgressContainer: {
        marginTop: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    miniProgressBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    miniProgressFill: {
        height: '100%',
        borderRadius: 2,
    },
    miniPercent: {
        fontSize: 10,
        fontWeight: '900',
    },
    floatingBadge: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
        elevation: 5,
    },
    badgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: COLORS.white,
    },
    macroGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    macroPill: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        alignItems: 'center',
        borderRadius: 18,
    },
    macroVal: {
        fontSize: 14,
        fontWeight: '900',
        color: COLORS.white,
    },
    macroLabel: {
        fontSize: 8,
        fontWeight: '900',
    },
    rankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    rankBadge: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    rankName: {
        fontSize: 12,
        fontWeight: '900',
        flex: 1,
    },
    rankXP: {
        fontSize: 10,
        fontWeight: '900',
    },
    rankNum: {
        fontSize: 10,
        fontWeight: '900',
        width: 24,
        textAlign: 'center',
    },
    contentContainer: {
        width: '100%',
        backgroundColor: 'transparent',
    },
    infoWrapper: {
        alignItems: 'center',
    },
    tagPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginBottom: 12,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    textCard: {
        padding: 30,
        borderRadius: 40,
        width: '100%',
        alignItems: 'center',
    },
    slideTitle: {
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 15,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    slideDesc: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
    },
    footer: {
        height: 160,
        justifyContent: 'space-between',
        paddingHorizontal: 25,
        paddingBottom: 20,
    },
    pagination: {
        flexDirection: 'row',
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        height: 6,
        borderRadius: 3,
        marginHorizontal: 4,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    skipBtn: {
        paddingHorizontal: 10,
    },
    skipText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    nextBtn: {
        height: 60,
        minWidth: 170,
        borderRadius: 22,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    nextGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 25,
        gap: 12,
    },
    nextText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
});

export default OnboardingScreen;
