import React, { useState, useContext, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    Animated,
    Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/Theme';
import { GlassCard, AuraBackground } from '../components';
import { StatusBar } from 'expo-status-bar';
import { AppContext } from '../context/AppContext';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

// 1. Interactive Animated Input
const AnimatedInput = ({ icon, placeholder, value, onChangeText, isSecure, keyboardType, colors, isDark }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(!isSecure);
    
    const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
    const borderAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(labelAnim, {
                toValue: (isFocused || value) ? 1 : 0,
                duration: 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.timing(borderAnim, {
                toValue: isFocused ? 1 : 0,
                duration: 250,
                useNativeDriver: false,
            })
        ]).start();
    }, [isFocused, value]);

    const handleFocus = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const togglePassword = () => {
        Haptics.selectionAsync();
        setIsPasswordVisible(!isPasswordVisible);
    };

    const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 8] });
    const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
    const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', colors.accent] });

    const textColor = isDark ? COLORS.white : COLORS.text;
    const placeholderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.5)';
    const inputBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
    const activeInputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

    return (
        <Animated.View style={[
            styles.inputContainer,
            { backgroundColor: isFocused ? activeInputBg : inputBg, borderColor: borderColor }
        ]}>
            <Ionicons name={icon} size={22} color={isFocused ? colors.accent : placeholderColor} style={styles.inputIcon} />
            <View style={styles.inputStack}>
                <Animated.Text style={[styles.floatingLabel, { top: labelTop, fontSize: labelSize, color: isFocused ? colors.accent : placeholderColor }]}>
                    {placeholder}
                </Animated.Text>
                <TextInput
                    style={[styles.input, { color: textColor }]}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    secureTextEntry={isSecure && !isPasswordVisible}
                    keyboardType={keyboardType || 'default'}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>
            {isSecure && (
                <TouchableOpacity onPress={togglePassword} hitSlop={{top: 15, bottom: 15, left: 15, right: 15}} style={styles.eyeBtn}>
                    <Ionicons name={isPasswordVisible ? "eye-outline" : "eye-off-outline"} size={22} color={placeholderColor} />
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

// 2. Spring Tactile Button
const SpringButton = ({ onPress, children, style, colors, disabled }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        if (disabled) return;
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%' }}>
            <TouchableOpacity
                onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}
                activeOpacity={0.9} disabled={disabled}
                style={[styles.loginBtn, style, disabled && { opacity: 0.7 }]}
            >
                <LinearGradient colors={colors.gradient} style={styles.loginGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    {children}
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};


const LoginScreen = ({ navigation }) => {
    const { loadUserData, colors: themeColors } = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // 7-part Stagger Assembly: Header, Email, Password, Forgot, Button, Social, Footer
    const staggerAnims = useRef([...Array(7)].map(() => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.stagger(100, staggerAnims.map(anim => 
            Animated.spring(anim, {
                toValue: 1,
                friction: 8,
                tension: 50,
                useNativeDriver: true,
            })
        )).start();
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            alert("Please enter email and password");
            return;
        }

        setLoading(true);
        try {
            const result = await api.login(email, password);
            if (result.status === 200) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await loadUserData(result.data.user_id, result.data.token);
                setLoading(false);
                navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
            } else {
                setLoading(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                alert(result.data.message || "Login failed");
            }
        } catch (error) {
            setLoading(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            alert("An error occurred. Please try again.");
        }
    };

    const getStaggerStyle = (index) => ({
        opacity: staggerAnims[index],
        transform: [{
            translateY: staggerAnims[index].interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0]
            })
        }]
    });

    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)';

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style={themeColors.isDark ? "light" : "dark"} />

            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                        
                        {/* Header (Sequence 0) */}
                        <Animated.View style={[styles.header, getStaggerStyle(0)]}>
                            <View style={[styles.logoPill, { borderColor: themeColors.accent, backgroundColor: themeColors.accent + '20' }]}>
                                <Ionicons name="flash" size={18} color={themeColors.accent} />
                                <Text style={[styles.pillText, { color: themeColors.accent }]}>ELITE FITNESS</Text>
                            </View>
                            <Text style={[styles.welcomeText, { color: textColor }]}>Welcome Back</Text>
                            <Text style={[styles.subtitleText, { color: subTextColor }]}>Sign in to continue your streak</Text>
                        </Animated.View>

                        {/* Form Body */}
                        <GlassCard style={styles.glassForm}>
                            
                            {/* Email (Sequence 1) */}
                            <Animated.View style={getStaggerStyle(1)}>
                                <AnimatedInput 
                                    icon="mail-outline" placeholder="Email Address"
                                    value={email} onChangeText={setEmail} keyboardType="email-address"
                                    colors={themeColors} isDark={themeColors.isDark}
                                />
                            </Animated.View>

                            {/* Password (Sequence 2) */}
                            <Animated.View style={getStaggerStyle(2)}>
                                <AnimatedInput 
                                    icon="lock-closed-outline" placeholder="Password"
                                    value={password} onChangeText={setPassword} isSecure={true}
                                    colors={themeColors} isDark={themeColors.isDark}
                                />
                            </Animated.View>

                            {/* Forgot Password (Sequence 3) */}
                            <Animated.View style={getStaggerStyle(3)}>
                                <TouchableOpacity
                                    style={styles.forgotBtn}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        alert("Password reset initiated");
                                    }}
                                >
                                    <Text style={[styles.forgotText, { color: themeColors.accent }]}>Forgot Password?</Text>
                                </TouchableOpacity>
                            </Animated.View>

                            {/* Button (Sequence 4) */}
                            <Animated.View style={getStaggerStyle(4)}>
                                <SpringButton onPress={handleLogin} disabled={loading} colors={themeColors} style={{ marginTop: 5 }}>
                                    {loading ? (
                                        <ActivityIndicator size="small" color={COLORS.white} />
                                    ) : (
                                        <>
                                            <Text style={styles.loginBtnText}>SIGN IN</Text>
                                            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                                        </>
                                    )}
                                </SpringButton>
                            </Animated.View>

                        </GlassCard>

                        {/* Social Logic (Sequence 5) */}
                        <Animated.View style={[styles.socialSection, getStaggerStyle(5)]}>
                            <View style={styles.dividerRow}>
                                <View style={[styles.line, { backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                                <Text style={[styles.dividerText, { color: subTextColor }]}>OR LOGIN WITH</Text>
                                <View style={[styles.line, { backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                            </View>

                            <View style={styles.socialRow}>
                                <TouchableOpacity style={styles.socialBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)} activeOpacity={0.7}>
                                    <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={[styles.socialInner, { borderColor: themeColors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                        <Ionicons name="logo-google" size={24} color={textColor} />
                                    </BlurView>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.socialBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)} activeOpacity={0.7}>
                                    <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={[styles.socialInner, { borderColor: themeColors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                        <Ionicons name="logo-apple" size={24} color={textColor} />
                                    </BlurView>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* Footer (Sequence 6) */}
                        <Animated.View style={[styles.footer, getStaggerStyle(6)]}>
                            <Text style={[styles.footerText, { color: subTextColor }]}>DONT HAVE AN ACCOUNT? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Signup')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                                <Text style={[styles.signupLink, { color: themeColors.accent }]}>JOIN ELITE</Text>
                            </TouchableOpacity>
                        </Animated.View>

                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: { paddingHorizontal: 25, paddingTop: 50, paddingBottom: 40 },
    
    header: { marginBottom: 35 },
    logoPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 8, marginBottom: 15, borderWidth: 1 },
    pillText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    welcomeText: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
    subtitleText: { fontSize: 15, fontWeight: '600', marginTop: 5 },
    
    // Explicitly mapping the transparency to remove the ugly white box
    glassForm: { padding: 5, borderRadius: 35, paddingBottom: 25, backgroundColor: 'transparent', elevation: 0 },
    
    inputContainer: { flexDirection: 'row', alignItems: 'center', height: 70, borderRadius: 22, marginHorizontal: 10, marginTop: 15, borderWidth: 1.5, overflow: 'hidden' },
    inputIcon: { marginLeft: 20, marginRight: 15 },
    inputStack: { flex: 1, height: '100%', justifyContent: 'center' },
    floatingLabel: { position: 'absolute', fontWeight: '700', letterSpacing: 0.5 },
    input: { flex: 1, fontSize: 16, fontWeight: '600', paddingTop: 15 },
    eyeBtn: { paddingHorizontal: 20, height: '100%', justifyContent: 'center' },
    
    forgotBtn: { alignSelf: 'flex-end', marginRight: 20, marginVertical: 15 },
    forgotText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
    
    loginBtn: { height: 65, borderRadius: 22, overflow: 'hidden', marginHorizontal: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    loginGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    loginBtnText: { fontSize: 16, fontWeight: '900', color: COLORS.white, letterSpacing: 2 },
    
    socialSection: { marginTop: 35, alignItems: 'center' },
    dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 25 },
    line: { flex: 1, height: 1 },
    dividerText: { fontSize: 10, fontWeight: '900', marginHorizontal: 20, letterSpacing: 2 },
    socialRow: { flexDirection: 'row', gap: 20 },
    socialBtn: { width: 70, height: 70, borderRadius: 25, overflow: 'hidden' },
    socialInner: { flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    
    footer: { marginTop: 40, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    footerText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    signupLink: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});

export default LoginScreen;
