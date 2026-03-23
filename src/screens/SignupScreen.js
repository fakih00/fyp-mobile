import React, { useState, useContext } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES, THEMES } from '../constants/Theme';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { StatusBar } from 'expo-status-bar';
import { AppContext } from '../context/AppContext';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

const SignupScreen = ({ navigation }) => {
    const { loadUserData, colors: themeColors } = useContext(AppContext);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [secureText, setSecureText] = useState(true);
    const [secureConfirmText, setSecureConfirmText] = useState(true);
    const [isFocused, setIsFocused] = useState(null);
    const [loading, setLoading] = useState(false);

    // Dynamic colors based on theme brightness
    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)';
    const inputBg = themeColors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    const placeholderColor = themeColors.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.4)';
    const iconColor = themeColors.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)';

    const handleSignup = async () => {
        if (!name || !email || !password || !confirmPassword) {
            alert("Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            alert("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            alert("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            const result = await api.register(name, email, password);

            if (result.status === 201 || result.status === 200) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                // Login after signup
                const loginResult = await api.login(email, password);
                setLoading(false);

                if (loginResult.status === 200) {
                    await loadUserData(loginResult.data.user_id, loginResult.data.token);
                    // Navigate to onboarding (GenderSelect) so the user can provide
                    // their fitness data for personalized plan generation
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'GenderSelect' }],
                    });
                } else {
                    navigation.navigate('Login');
                }
            } else {
                setLoading(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                alert(result.data.message || "Registration failed");
            }
        } catch (error) {
            setLoading(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            alert("An error occurred. Please try again.");
        }
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.goBack();
    };

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style={themeColors.isDark ? "light" : "dark"} />

            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                                <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={styles.backBlur}>
                                    <Ionicons name="chevron-back" size={24} color={textColor} />
                                </BlurView>
                            </TouchableOpacity>

                            <AnimatedCard delay={100} style={styles.titleSection}>
                                <View style={[styles.logoPill, { borderColor: themeColors.accent, backgroundColor: themeColors.accent + '20' }]}>
                                    <Ionicons name="flash" size={18} color={themeColors.accent} />
                                    <Text style={[styles.pillText, { color: themeColors.accent }]}>ELITE COMMUNITY</Text>
                                </View>
                                <Text style={[styles.welcomeText, { color: textColor }]}>Create Account</Text>
                                <Text style={[styles.subtitleText, { color: subTextColor }]}>Join the elite fitness revolution</Text>
                            </AnimatedCard>
                        </View>

                        {/* Form */}
                        <AnimatedCard delay={200} style={styles.formSection}>
                            <GlassCard style={styles.glassForm}>
                                <View style={[
                                    styles.inputContainer,
                                    { backgroundColor: inputBg },
                                    isFocused === 'name' && { borderColor: themeColors.accent, backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                                ]}>
                                    <Ionicons name="person-outline" size={20} color={isFocused === 'name' ? themeColors.accent : iconColor} />
                                    <TextInput
                                        placeholder="Full Name"
                                        placeholderTextColor={placeholderColor}
                                        style={[styles.input, { color: textColor }]}
                                        value={name}
                                        onChangeText={setName}
                                        onFocus={() => setIsFocused('name')}
                                        onBlur={() => setIsFocused(null)}
                                    />
                                </View>

                                <View style={[
                                    styles.inputContainer,
                                    { backgroundColor: inputBg },
                                    isFocused === 'email' && { borderColor: themeColors.accent, backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                                ]}>
                                    <Ionicons name="mail-outline" size={20} color={isFocused === 'email' ? themeColors.accent : iconColor} />
                                    <TextInput
                                        placeholder="Email Address"
                                        placeholderTextColor={placeholderColor}
                                        style={[styles.input, { color: textColor }]}
                                        value={email}
                                        onChangeText={setEmail}
                                        onFocus={() => setIsFocused('email')}
                                        onBlur={() => setIsFocused(null)}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={[
                                    styles.inputContainer,
                                    { backgroundColor: inputBg },
                                    isFocused === 'password' && { borderColor: themeColors.accent, backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                                ]}>
                                    <Ionicons name="lock-closed-outline" size={20} color={isFocused === 'password' ? themeColors.accent : iconColor} />
                                    <TextInput
                                        placeholder="Password"
                                        placeholderTextColor={placeholderColor}
                                        style={[styles.input, { color: textColor }]}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={secureText}
                                        onFocus={() => setIsFocused('password')}
                                        onBlur={() => setIsFocused(null)}
                                    />
                                    <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                                        <Ionicons name={secureText ? "eye-off-outline" : "eye-outline"} size={20} color={iconColor} />
                                    </TouchableOpacity>
                                </View>

                                <View style={[
                                    styles.inputContainer,
                                    { backgroundColor: inputBg },
                                    isFocused === 'confirmPassword' && { borderColor: themeColors.accent, backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                                ]}>
                                    <Ionicons name="shield-checkmark-outline" size={20} color={isFocused === 'confirmPassword' ? themeColors.accent : iconColor} />
                                    <TextInput
                                        placeholder="Confirm Password"
                                        placeholderTextColor={placeholderColor}
                                        style={[styles.input, { color: textColor }]}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={secureConfirmText}
                                        onFocus={() => setIsFocused('confirmPassword')}
                                        onBlur={() => setIsFocused(null)}
                                    />
                                    <TouchableOpacity onPress={() => setSecureConfirmText(!secureConfirmText)}>
                                        <Ionicons name={secureConfirmText ? "eye-off-outline" : "eye-outline"} size={20} color={iconColor} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={[styles.termsText, { color: subTextColor }]}>
                                    By signing up, you agree to our <Text style={[styles.link, { color: themeColors.accent }]}>Terms</Text> and <Text style={[styles.link, { color: themeColors.accent }]}>Privacy Policy</Text>
                                </Text>

                                <TouchableOpacity
                                    style={styles.signupBtn}
                                    onPress={handleSignup}
                                    activeOpacity={0.9}
                                    disabled={loading}
                                >
                                    <LinearGradient
                                        colors={themeColors.gradient}
                                        style={styles.signupGrad}
                                    >
                                        {loading ? (
                                            <ActivityIndicator size="small" color={COLORS.white} />
                                        ) : (
                                            <>
                                                <Text style={styles.signupBtnText}>CREATE ACCOUNT</Text>
                                                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </GlassCard>
                        </AnimatedCard>

                        {/* Social Login */}
                        <AnimatedCard delay={300} style={styles.socialSection}>
                            <View style={styles.dividerRow}>
                                <View style={[styles.line, { backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                                <Text style={[styles.dividerText, { color: subTextColor }]}>OR SIGN UP WITH</Text>
                                <View style={[styles.line, { backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                            </View>

                            <View style={styles.socialRow}>
                                <TouchableOpacity style={styles.socialBtn}>
                                    <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={[styles.socialInner, { borderColor: themeColors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                        <Ionicons name="logo-google" size={24} color={textColor} />
                                    </BlurView>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.socialBtn}>
                                    <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={[styles.socialInner, { borderColor: themeColors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                        <Ionicons name="logo-apple" size={24} color={textColor} />
                                    </BlurView>
                                </TouchableOpacity>
                            </View>
                        </AnimatedCard>

                        {/* Footer */}
                        <AnimatedCard delay={400} style={styles.footer}>
                            <Text style={[styles.footerText, { color: subTextColor }]}>ALREADY HAVE AN ACCOUNT? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={[styles.loginLink, { color: themeColors.accent }]}>SIGN IN</Text>
                            </TouchableOpacity>
                        </AnimatedCard>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingTop: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 35,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 25,
    },
    backBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleSection: {
        backgroundColor: 'transparent',
    },
    logoPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 8,
        marginBottom: 15,
        borderWidth: 1,
    },
    pillText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    welcomeText: {
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: -1,
    },
    subtitleText: {
        fontSize: 15,
        fontWeight: '600',
        marginTop: 5,
    },
    formSection: {
        backgroundColor: 'transparent',
    },
    glassForm: {
        padding: 5,
        borderRadius: 35,
        paddingBottom: 25,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 65,
        borderRadius: 22,
        paddingHorizontal: 20,
        margin: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    input: {
        flex: 1,
        marginLeft: 15,
        fontSize: 15,
        fontWeight: '600',
    },
    termsText: {
        fontSize: 12,
        textAlign: 'center',
        marginHorizontal: 30,
        marginBottom: 25,
        marginTop: 10,
        lineHeight: 18,
    },
    link: {
        fontWeight: 'bold',
    },
    signupBtn: {
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
        marginHorizontal: 10,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    signupGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    signupBtnText: {
        fontSize: 15,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1.5,
    },
    socialSection: {
        marginTop: 35,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 25,
    },
    line: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontSize: 10,
        fontWeight: '900',
        marginHorizontal: 20,
        letterSpacing: 2,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 20,
    },
    socialBtn: {
        width: 70,
        height: 70,
        borderRadius: 25,
        overflow: 'hidden',
    },
    socialInner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    footer: {
        marginTop: 40,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    footerText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    loginLink: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default SignupScreen;
