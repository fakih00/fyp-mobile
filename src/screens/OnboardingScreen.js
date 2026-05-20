import React, { useState, useContext, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Dimensions,
    TouchableOpacity,
    Animated,
    Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/Theme';
import { GlassCard } from '../components';
import { StatusBar } from 'expo-status-bar';
import { AppContext } from '../context/AppContext';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const DATA = [
    {
        id: '1',
        tag: 'TRAINING',
        title: 'ELITE TRAINING',
        desc: 'Advanced workout plans powered by AI to push your physical limits.',
        color: '#10B981', // Emerald
        type: 'workout'
    },
    {
        id: '2',
        tag: 'DIET',
        title: 'SMART NUTRITION',
        desc: 'Personalized meal tracking and precise macro goals for your physique.',
        color: '#3B82F6', // Blue
        type: 'nutrition'
    },
    {
        id: '3',
        tag: 'SOCIAL',
        title: 'ELITE COMMUNITY',
        desc: 'Compete with your friends and climb the global leaderboards.',
        color: '#F59E0B', // Amber
        type: 'social'
    },
];

// Tactical Spring Button
const SpringButton = ({ onPress, children, style, colors }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}
                activeOpacity={0.9} style={[styles.actionBtn, style]}
            >
                <LinearGradient colors={colors.gradient} style={styles.actionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    {children}
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

const VisualMockup = ({ type, color, themeColors }) => {
    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subText = themeColors.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)';

    if (type === 'workout') {
        return (
            <View style={styles.mockupContainer}>
                <GlassCard style={styles.miniCard}>
                    <View style={styles.miniHeader}>
                        <View style={[styles.miniIcon, { backgroundColor: color + '20' }]}>
                            <Ionicons name="barbell" size={20} color={color} />
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
                <View style={[styles.floatingBadge, { top: -25, right: -15, backgroundColor: themeColors.accent }]}>
                    <Ionicons name="flash" size={12} color={COLORS.white} />
                    <Text style={styles.badgeText}>ELITE</Text>
                </View>
            </View>
        );
    }

    if (type === 'nutrition') {
        return (
            <View style={styles.mockupContainer}>
                <View style={styles.macroGrid}>
                    <GlassCard style={[styles.macroPill, { width: 90 }]}>
                        <Text style={styles.macroVal}>165g</Text>
                        <Text style={[styles.macroLabel, { color: COLORS.protein }]}>PRO</Text>
                    </GlassCard>
                    <GlassCard style={[styles.macroPill, { width: 90, marginTop: 25 }]}>
                        <Text style={styles.macroVal}>220g</Text>
                        <Text style={[styles.macroLabel, { color: COLORS.carbs }]}>CARB</Text>
                    </GlassCard>
                </View>
                <GlassCard style={[styles.miniCard, { marginTop: -15, transform: [{ rotate: '-2deg' }] }]}>
                    <View style={styles.miniHeader}>
                        <View style={[styles.miniIcon, { backgroundColor: color + '20' }]}>
                            <Ionicons name="restaurant" size={20} color={color} />
                        </View>
                        <View>
                            <Text style={[styles.miniTitle, { color: textColor }]}>Grilled Salmon</Text>
                            <Text style={[styles.miniSubtitle, { color: subText }]}>High Protein • Lunch</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={22} color={color} style={{ marginLeft: 'auto' }} />
                    </View>
                </GlassCard>
            </View>
        );
    }

    if (type === 'social') {
        return (
            <View style={styles.mockupContainer}>
                <GlassCard style={[styles.miniCard, { width: 240, padding: 20 }]}>
                    <View style={styles.rankItem}>
                        <View style={styles.rankBadge}>
                            <Ionicons name="trophy" size={18} color="#F59E0B" />
                        </View>
                        <View style={[styles.rankAvatar, { backgroundColor: '#F59E0B20' }]} />
                        <Text style={[styles.rankName, { color: textColor, fontSize: 16 }]}>You</Text>
                        <Text style={[styles.rankXP, { color: themeColors.accent }]}>12.4k XP</Text>
                    </View>
                    <View style={[styles.rankItem, { opacity: 0.5, marginTop: 15 }]}>
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
            Haptics.selectionAsync(); // Click when passing threshold
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollTo = () => {
        if (currentIndex < DATA.length - 1) {
            slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
        } else {
            navigation.navigate('Login');
        }
    };

    const skip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('Login');
    };

    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)';

    // Live interpolated background array matching slide colors
    const bgColors = DATA.map(item => item.color + (themeColors.isDark ? '25' : '15')); // 25 alpha tint
    const dynamicBgColor = scrollX.interpolate({
        inputRange: DATA.map((_, i) => i * width),
        outputRange: bgColors,
        extrapolate: 'clamp',
    });

    const renderItem = ({ item, index }) => {
        const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width
        ];

        // Slide Physics
        const textScale = scrollX.interpolate({ inputRange, outputRange: [0.8, 1, 0.8], extrapolate: 'clamp' });
        const textOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
        const textTranslateY = scrollX.interpolate({ inputRange, outputRange: [50, 0, 50], extrapolate: 'clamp' });

        // Deep Visual Parallax
        const visualTranslateX = scrollX.interpolate({ inputRange, outputRange: [width * 0.4, 0, -width * 0.4], extrapolate: 'clamp' });
        const visualTranslateY = scrollX.interpolate({ inputRange, outputRange: [-20, 0, 20], extrapolate: 'clamp' });
        const visualRotate = scrollX.interpolate({ inputRange, outputRange: ['-10deg', '0deg', '10deg'], extrapolate: 'clamp' });
        const visualScale = scrollX.interpolate({ inputRange, outputRange: [0.7, 1.1, 0.7], extrapolate: 'clamp' });
        
        return (
            <View style={styles.slide}>
                {/* 3D Visual Section */}
                <Animated.View style={[styles.visualContainer, { 
                    transform: [
                        { translateX: visualTranslateX },
                        { translateY: visualTranslateY },
                        { scale: visualScale },
                        { rotate: visualRotate }
                    ]
                }]}>
                    <VisualMockup type={item.type} color={item.color} themeColors={themeColors} />
                </Animated.View>

                {/* Scaling Content Section */}
                <Animated.View style={[styles.contentContainer, { 
                    opacity: textOpacity, 
                    transform: [{ scale: textScale }, { translateY: textTranslateY }] 
                }]}>
                    <View style={styles.infoWrapper}>
                        <View style={[styles.tagPill, { backgroundColor: item.color + '20' }]}>
                            <Text style={[styles.tagText, { color: item.color }]}>{item.tag}</Text>
                        </View>

                        <Text style={[styles.slideTitle, { color: textColor }]}>{item.title}</Text>
                        <Text style={[styles.slideDesc, { color: subTextColor }]}>{item.desc}</Text>
                    </View>
                </Animated.View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background || COLORS.background }]}>
            <StatusBar style={themeColors.isDark ? "light" : "dark"} />
            
            {/* Dynamic Interpolated Aurora Tint Layer */}
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: dynamicBgColor }]} />

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
                        useNativeDriver: false, // Must be false for color interpolation
                    })}
                    scrollEventThrottle={16} // 60fps tracking
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    ref={slidesRef}
                />

                <View style={styles.footer}>
                    {/* Living Pagination */}
                    <View style={styles.pagination}>
                        {DATA.map((_, i) => {
                            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                            const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 25, 8], extrapolate: 'clamp' });
                            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
                            const color = scrollX.interpolate({ inputRange, outputRange: ['#ffffff50', DATA[i].color, '#ffffff50'], extrapolate: 'clamp' });

                            return (
                                <Animated.View
                                    style={[styles.dot, { width: dotWidth, opacity, backgroundColor: "white" }]}
                                    key={i.toString()}
                                />
                            );
                        })}
                    </View>

                    {/* Action Block */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.skipBtn} onPress={skip} hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}>
                            <Text style={[styles.skipText, { color: subTextColor }]}>SKIP</Text>
                        </TouchableOpacity>

                        <SpringButton onPress={scrollTo} colors={themeColors}>
                            <Text style={styles.nextText}>
                                {currentIndex === DATA.length - 1 ? 'GET STARTED' : 'CONTINUE'}
                            </Text>
                            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                        </SpringButton>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    slide: { width, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 25 },
    
    // Abstracted Parallax Views
    visualContainer: { height: height * 0.35, justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: 30 },
    contentContainer: { width: '100%' },
    
    // Mockup UI
    mockupContainer: { justifyContent: 'center', alignItems: 'center', width: '100%' },
    miniCard: { padding: 20, width: 280, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    miniHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    miniIcon: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    miniTitle: { fontSize: 16, fontWeight: '900' },
    miniSubtitle: { fontSize: 12, fontWeight: '600' },
    miniProgressContainer: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
    miniProgressBar: { flex: 1, height: 6, borderRadius: 3 },
    miniProgressFill: { height: '100%', borderRadius: 3 },
    miniPercent: { fontSize: 12, fontWeight: '900' },
    floatingBadge: { position: 'absolute', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4, elevation: 15, shadowColor: '#000', shadowOffset:{width:0, height:5}, shadowOpacity: 0.3, shadowRadius: 10 },
    badgeText: { fontSize: 10, fontWeight: '900', color: COLORS.white },
    
    macroGrid: { flexDirection: 'row', gap: 15, marginBottom: 15 },
    macroPill: { paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    macroVal: { fontSize: 18, fontWeight: '900', color: COLORS.white },
    macroLabel: { fontSize: 10, fontWeight: '900', marginTop: 4 },
    
    rankItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 10 },
    rankBadge: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
    rankAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
    rankName: { fontSize: 14, fontWeight: '900', flex: 1 },
    rankXP: { fontSize: 12, fontWeight: '900' },
    rankNum: { fontSize: 12, fontWeight: '900', width: 30, textAlign: 'center' },
    
    // Slide Data
    infoWrapper: { alignItems: 'flex-start', paddingHorizontal: 10 },
    tagPill: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    tagText: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    slideTitle: { fontSize: 40, fontWeight: '900', marginBottom: 15, letterSpacing: -1, lineHeight: 45 },
    slideDesc: { fontSize: 16, lineHeight: 26, fontWeight: '500' },
    
    // Footer Blocks
    footer: { height: 160, justifyContent: 'flex-end', paddingHorizontal: 30, paddingBottom: 30 },
    pagination: { flexDirection: 'row', height: 40, justifyContent: 'flex-start', alignItems: 'center', marginBottom: 20 },
    dot: { height: 6, borderRadius: 3, marginHorizontal: 4 },
    
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    skipBtn: { padding: 10 },
    skipText: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
    
    // Spring Btn
    actionBtn: { height: 65, minWidth: 180, borderRadius: 25, overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    actionGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 25, gap: 12 },
    nextText: { color: COLORS.white, fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
});

export default OnboardingScreen;
