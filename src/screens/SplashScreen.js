import React, { useEffect, useState, useContext } from 'react';
import {
    View,
    StyleSheet,
    Animated,
    Dimensions,
    Text
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS } from '../constants/Theme';
import { AuraBackground } from '../components';
import { StatusBar } from 'expo-status-bar';
import { AppContext } from '../context/AppContext';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
    const { colors: themeColors } = useContext(AppContext);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.8));
    const [floatAnim] = useState(new Animated.Value(0));
    const [loaderAnim] = useState(new Animated.Value(0));

    // Dynamic colors based on theme brightness
    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)';

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();

        // Floating animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -15,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                })
            ])
        ).start();

        // Loader animation
        Animated.timing(loaderAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: false,
        }).start(() => {
            navigation.replace('Onboarding');
        });
    }, []);

    const loaderWidth = loaderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style={themeColors.isDark ? "light" : "dark"} />

            <Animated.View style={[
                styles.content,
                {
                    opacity: fadeAnim,
                    transform: [
                        { scale: scaleAnim },
                        { translateY: floatAnim }
                    ]
                }
            ]}>
                {/* Elite Branding Circle */}
                <View style={styles.logoOuter}>
                    <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={styles.logoInner}>
                        <LinearGradient
                            colors={themeColors.gradient}
                            style={styles.logoGrad}
                        >
                            <Ionicons name="flash" size={60} color={COLORS.white} />
                        </LinearGradient>
                    </BlurView>
                </View>

                <Text style={[styles.title, { color: textColor }]}>ELITE</Text>
                <Text style={[styles.subtitle, { color: themeColors.accent }]}>FITNESS</Text>

                <View style={styles.loaderContainer}>
                    <View style={[styles.loaderBg, { backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                        <Animated.View style={[styles.loaderFill, { width: loaderWidth, backgroundColor: themeColors.accent }]} />
                    </View>
                    <Text style={[styles.loadingText, { color: subTextColor }]}>LOADING YOUR EXPERIENCE...</Text>
                </View>

                <Text style={[styles.versionText, { color: subTextColor }]}>v2.0.4</Text>
            </Animated.View>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoOuter: {
        width: 140,
        height: 140,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    logoInner: {
        width: 110,
        height: 110,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        overflow: 'hidden',
    },
    logoGrad: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 50,
        fontWeight: '900',
        letterSpacing: 10,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 8,
        marginTop: -5,
        marginBottom: 60,
    },
    loaderContainer: {
        width: 200,
        alignItems: 'center',
    },
    loaderBg: {
        width: '100%',
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 15,
    },
    loaderFill: {
        height: '100%',
        borderRadius: 2,
    },
    loadingText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    versionText: {
        position: 'absolute',
        bottom: -150,
        fontSize: 12,
        fontWeight: '700',
        opacity: 0.5,
    }
});

export default SplashScreen;
