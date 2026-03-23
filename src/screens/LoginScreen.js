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

const LoginScreen = ({ navigation }) => {
    const { loadUserData, colors: themeColors } = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secureText, setSecureText] = useState(true);
    const [isFocused, setIsFocused] = useState(null);
    const [loading, setLoading] = useState(false);

    // Dynamic colors based on theme brightness
    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)';
    const inputBg = themeColors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    const placeholderColor = themeColors.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.4)';
    const iconColor = themeColors.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)';

    const handleLogin = async () => {
        if (!email || !password) {
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
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                });
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
                            <AnimatedCard delay={100} style={styles.titleSection}>
                                <View style={[styles.logoPill, { borderColor: themeColors.accent, backgroundColor: themeColors.accent + '20' }]}>
                                    <Ionicons name="flash" size={18} color={themeColors.accent} />
                                    <Text style={[styles.pillText, { color: themeColors.accent }]}>ELITE FITNESS</Text>
                                </View>
                                <Text style={[styles.welcomeText, { color: textColor }]}>Welcome Back</Text>
                                <Text style={[styles.subtitleText, { color: subTextColor }]}>Sign in to continue your streak</Text>
                            </AnimatedCard>
                        </View>

                        {/* Form */}
                        <AnimatedCard delay={200} style={styles.formSection}>
                            <GlassCard style={styles.glassForm}>
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

                                <TouchableOpacity
                                    style={styles.forgotBtn}
                                    onPress={() => alert("Password reset initiated")}
                                >
                                    <Text style={[styles.forgotText, { color: themeColors.accent }]}>Forgot Password?</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.loginBtn}
                                    onPress={handleLogin}
                                    activeOpacity={0.9}
                                    disabled={loading}
                                >
                                    <LinearGradient
                                        colors={themeColors.gradient}
                                        style={styles.loginGrad}
                                    >
                                        {loading ? (
                                            <ActivityIndicator size="small" color={COLORS.white} />
                                        ) : (
                                            <>
                                                <Text style={styles.loginBtnText}>SIGN IN</Text>
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
                                <Text style={[styles.dividerText, { color: subTextColor }]}>OR LOGIN WITH</Text>
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
                            <Text style={[styles.footerText, { color: subTextColor }]}>DONT HAVE AN ACCOUNT? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                                <Text style={[styles.signupLink, { color: themeColors.accent }]}>JOIN ELITE</Text>
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
        paddingTop: 50,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 35,
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
    forgotBtn: {
        alignSelf: 'flex-end',
        marginRight: 20,
        marginVertical: 10,
    },
    forgotText: {
        fontSize: 12,
        fontWeight: '900',
    },
    loginBtn: {
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
        marginHorizontal: 10,
        marginTop: 15,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    loginGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loginBtnText: {
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
    signupLink: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default LoginScreen;
