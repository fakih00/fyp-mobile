import React, { useEffect, useRef, useContext } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/Theme';
import { AppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');

const AnimatedTabBar = ({ state, descriptors, navigation }) => {
    const { colors: themeColors } = useContext(AppContext);
    const BAR_WIDTH = width - 40;
    const TAB_WIDTH = BAR_WIDTH / state.routes.length;
    const translateX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(translateX, {
            toValue: state.index * TAB_WIDTH,
            useNativeDriver: true,
            friction: 8,
            tension: 50,
        }).start();
    }, [state.index]);

    const indicatorStyle = {
        transform: [{ translateX: translateX }],
    };

    return (
        <View style={styles.container}>
            <BlurView intensity={80} tint="light" style={styles.tabBarContainer}>
                {/* Active Indicator Background Pill */}
                <Animated.View style={[styles.activeIndicatorPill, { width: TAB_WIDTH - 10 }, indicatorStyle]}>
                    <LinearGradient
                        colors={[`${themeColors.accent}26`, `${themeColors.accent}0D`]}
                        style={styles.pillGradient}
                    />
                    <View style={[styles.topEmeraldLine, { backgroundColor: themeColors.accent }]} />
                </Animated.View>

                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                    };

                    const iconName = () => {
                        if (route.name === 'Home') return isFocused ? 'grid' : 'grid-outline';
                        if (route.name === 'Workout') return isFocused ? 'fitness' : 'fitness-outline';
                        if (route.name === 'Nutrition') return isFocused ? 'leaf' : 'leaf-outline';
                        if (route.name === 'Leaderboard') return isFocused ? 'trophy' : 'trophy-outline';
                        if (route.name === 'Social') return isFocused ? 'people' : 'people-outline';
                        return 'square';
                    };

                    return (
                        <TouchableOpacity
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabItem}
                            activeOpacity={0.7}
                        >
                            <TabIcon
                                isFocused={isFocused}
                                iconName={iconName()}
                                label={route.name}
                                themeColors={themeColors}
                            />
                        </TouchableOpacity>
                    );
                })}
            </BlurView>
        </View>
    );
};

const TabIcon = ({ isFocused, iconName, label, themeColors }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: isFocused ? 1.15 : 1,
                useNativeDriver: true,
                friction: 7,
                tension: 80,
            }),
            Animated.timing(opacity, {
                toValue: isFocused ? 1 : 0.5,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start();
    }, [isFocused]);

    return (
        <Animated.View style={[styles.iconContainer, { transform: [{ scale }], opacity }]}>
            <Ionicons
                name={iconName}
                size={22}
                color={isFocused ? themeColors.accent : '#64748B'}
            />
            {isFocused && (
                <View style={[styles.dotIndicator, { backgroundColor: themeColors.accent }]} />
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 34 : 24,
        left: 20,
        right: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBarContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 28,
        height: 72,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        paddingHorizontal: 5,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    activeIndicatorPill: {
        position: 'absolute',
        height: 52,
        top: 10,
        left: 5,
        borderRadius: 20,
        overflow: 'hidden',
    },
    pillGradient: {
        flex: 1,
    },
    topEmeraldLine: {
        position: 'absolute',
        top: 0,
        left: '25%',
        right: '25%',
        height: 2,
        borderRadius: 1,
    },
    dotIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 2,
    }
});

export default AnimatedTabBar;
