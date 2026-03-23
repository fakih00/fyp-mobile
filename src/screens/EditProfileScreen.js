import React, { useState, useContext, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { api } from '../services/api';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const SelectionChips = ({ label, options, selected, onSelect, themeColors }) => {
    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)';

    return (
        <View style={styles.chipGroup}>
            <Text style={[styles.fieldLabel, { color: subTextColor }]}>{label}</Text>
            <View style={styles.chipRow}>
                {options.map(opt => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[
                            styles.chip,
                            { backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: 'transparent' },
                            selected === opt.value && { borderColor: themeColors.accent, backgroundColor: themeColors.accent + '20' }
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onSelect(opt.value);
                        }}
                    >
                        <Text style={[styles.chipText, { color: subTextColor }, selected === opt.value && { color: themeColors.accent }]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const EditProfileScreen = ({ navigation }) => {
    const { user, setUser, colors: themeColors } = useContext(AppContext);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('Personal');

    const tabs = ['Personal', 'Body', 'Fitness', 'Nutrition'];

    // Dynamic colors
    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)';
    const inputBg = themeColors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    const [formData, setFormData] = useState({
        name: user.name || '',
        age: user.profile?.age?.toString() || '',
        gender: user.profile?.gender || 'male',
        weight: user.profile?.weight?.toString() || '',
        height: user.profile?.height?.toString() || '',
        goal: user.profile?.goal || 'lose_weight',
        activity_level: user.profile?.activity_level || 'moderately_active',
        training_location: user.profile?.training_location || 'gym',
        training_intensity: user.profile?.training_intensity || 'moderate',
        training_days_per_week: user.profile?.training_days_per_week?.toString() || '3',
        meals_per_day: user.profile?.meals_per_day?.toString() || '4',
        likes: user.profile?.likes || '',
        dislikes: user.profile?.dislikes || '',
        allergies: user.profile?.allergies || '',
        sleep_hours: user.profile?.sleep_hours?.toString() || '7',
        stress_level: user.profile?.stress_level || 'low'
    });

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const payload = {
                name: formData.name,
                age: parseInt(formData.age),
                gender: formData.gender,
                weight: parseFloat(formData.weight),
                height: parseFloat(formData.height),
                goal: formData.goal,
                activity_level: formData.activity_level,
                training_location: formData.training_location,
                training_intensity: formData.training_intensity,
                training_days_per_week: parseInt(formData.training_days_per_week),
                meals_per_day: parseInt(formData.meals_per_day),
                likes: formData.likes,
                dislikes: formData.dislikes,
                allergies: formData.allergies,
                sleep_hours: parseFloat(formData.sleep_hours),
                stress_level: formData.stress_level
            };

            const res = await api.post('updateUser', payload);

            if (res.status === 200) {
                setUser(prev => ({
                    ...prev,
                    name: formData.name,
                    profile: {
                        ...prev.profile,
                        ...payload
                    }
                }));
                Alert.alert("Success", "Elite profile synchronization complete.");
                navigation.goBack();
            } else {
                Alert.alert("Sync Error", "Failed to update your fitness blueprint.");
            }
        } catch (error) {
            console.error("Update error:", error);
            Alert.alert("Network Error", "Could not connect to Elite servers.");
        } finally {
            setLoading(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.navRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerActionBtn}>
                        <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={styles.iconBlur}>
                            <Ionicons name="chevron-back" size={24} color={textColor} />
                        </BlurView>
                    </TouchableOpacity>
                    <View style={styles.titleStack}>
                        <Text style={[styles.eliteTitle, { color: textColor }]}>Edit Profile</Text>
                        <Text style={[styles.eliteSubtitle, { color: themeColors.accent }]}>REFINE YOUR BLUEPRINT</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={styles.headerActionBtn}
                        disabled={loading}
                    >
                        <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={styles.iconBlur}>
                            {loading ? (
                                <ActivityIndicator size="small" color={themeColors.accent} />
                            ) : (
                                <Ionicons name="checkmark" size={24} color={themeColors.accent} />
                            )}
                        </BlurView>
                    </TouchableOpacity>
                </View>

                {/* Tab Bar */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabScrollContent}
                    style={styles.tabScroll}
                >
                    {tabs.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setActiveTab(tab);
                            }}
                            style={[
                                styles.tabBtn,
                                { backgroundColor: inputBg },
                                activeTab === tab && { backgroundColor: themeColors.accent }
                            ]}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: subTextColor },
                                activeTab === tab && { color: COLORS.white }
                            ]}>
                                {tab.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );

    const renderPersonalInfo = () => (
        <AnimatedCard delay={200} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: themeColors.accent }]}>IDENTITY</Text>
            <GlassCard style={styles.inputCard}>
                <Text style={[styles.fieldLabel, { color: subTextColor }]}>FULL NAME</Text>
                <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={formData.name}
                    onChangeText={(t) => handleChange('name', t)}
                    placeholder="Elite Athlete Name"
                    placeholderTextColor={subTextColor}
                />
            </GlassCard>
            <View style={styles.row}>
                <GlassCard style={[styles.inputCard, { flex: 1, marginRight: 10 }]}>
                    <Text style={[styles.fieldLabel, { color: subTextColor }]}>AGE</Text>
                    <TextInput
                        style={[styles.textInput, { color: textColor }]}
                        value={formData.age}
                        onChangeText={(t) => handleChange('age', t)}
                        keyboardType="numeric"
                        placeholder="25"
                        placeholderTextColor={subTextColor}
                    />
                </GlassCard>
                <GlassCard style={[styles.inputCard, { flex: 1.5 }]}>
                    <SelectionChips
                        label="GENDER"
                        options={[
                            { label: 'MALE', value: 'male' },
                            { label: 'FEMALE', value: 'female' },
                            { label: 'OTHER', value: 'other' }
                        ]}
                        selected={formData.gender}
                        onSelect={(v) => handleChange('gender', v)}
                        themeColors={themeColors}
                    />
                </GlassCard>
            </View>
        </AnimatedCard>
    );

    const renderBodyMetrics = () => (
        <AnimatedCard delay={200} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: themeColors.accent }]}>PHYSICAL METRICS</Text>
            <View style={styles.row}>
                <GlassCard style={[styles.inputCard, { flex: 1, marginRight: 10 }]}>
                    <Text style={[styles.fieldLabel, { color: subTextColor }]}>WEIGHT (KG)</Text>
                    <TextInput
                        style={[styles.textInput, { color: textColor }]}
                        value={formData.weight}
                        onChangeText={(t) => handleChange('weight', t)}
                        keyboardType="numeric"
                    />
                </GlassCard>
                <GlassCard style={[styles.inputCard, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: subTextColor }]}>HEIGHT (CM)</Text>
                    <TextInput
                        style={[styles.textInput, { color: textColor }]}
                        value={formData.height}
                        onChangeText={(t) => handleChange('height', t)}
                        keyboardType="numeric"
                    />
                </GlassCard>
            </View>
            <GlassCard style={styles.inputCard}>
                <SelectionChips
                    label="STRESS LEVEL"
                    options={[
                        { label: 'LOW', value: 'low' },
                        { label: 'MEDIUM', value: 'medium' },
                        { label: 'HIGH', value: 'high' }
                    ]}
                    selected={formData.stress_level}
                    onSelect={(v) => handleChange('stress_level', v)}
                    themeColors={themeColors}
                />
            </GlassCard>
            <GlassCard style={styles.inputCard}>
                <Text style={[styles.fieldLabel, { color: subTextColor }]}>SLEEP HOURS</Text>
                <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={formData.sleep_hours}
                    onChangeText={(t) => handleChange('sleep_hours', t)}
                    keyboardType="numeric"
                />
            </GlassCard>
        </AnimatedCard>
    );

    const renderFitnessStrategy = () => (
        <AnimatedCard delay={200} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: themeColors.accent }]}>STRATEGY</Text>
            <GlassCard style={styles.inputCard}>
                <SelectionChips
                    label="PRIMARY GOAL"
                    options={[
                        { label: 'LOSE WEIGHT', value: 'lose_weight' },
                        { label: 'BUILD MUSCLE', value: 'build_muscle' },
                        { label: 'GET FIT', value: 'get_fit' }
                    ]}
                    selected={formData.goal}
                    onSelect={(v) => handleChange('goal', v)}
                    themeColors={themeColors}
                />
            </GlassCard>
            <GlassCard style={styles.inputCard}>
                <SelectionChips
                    label="ACTIVITY LEVEL"
                    options={[
                        { label: 'SEDENTARY', value: 'sedentary' },
                        { label: 'LIGHT', value: 'lightly_active' },
                        { label: 'ACTIVE', value: 'moderately_active' },
                        { label: 'PRO', value: 'very_active' }
                    ]}
                    selected={formData.activity_level}
                    onSelect={(v) => handleChange('activity_level', v)}
                    themeColors={themeColors}
                />
            </GlassCard>
            <View style={styles.row}>
                <GlassCard style={[styles.inputCard, { flex: 1, marginRight: 10 }]}>
                    <SelectionChips
                        label="LOCATION"
                        options={[
                            { label: 'GYM', value: 'gym' },
                            { label: 'HOME', value: 'home' }
                        ]}
                        selected={formData.training_location}
                        onSelect={(v) => handleChange('training_location', v)}
                        themeColors={themeColors}
                    />
                </GlassCard>
                <GlassCard style={[styles.inputCard, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: subTextColor }]}>DAYS / WEEK</Text>
                    <TextInput
                        style={[styles.textInput, { color: textColor }]}
                        value={formData.training_days_per_week}
                        onChangeText={(t) => handleChange('training_days_per_week', t)}
                        keyboardType="numeric"
                    />
                </GlassCard>
            </View>
        </AnimatedCard>
    );

    const renderNutritionRefinement = () => (
        <AnimatedCard delay={200} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: themeColors.accent }]}>NUTRITION</Text>
            <GlassCard style={styles.inputCard}>
                <Text style={[styles.fieldLabel, { color: subTextColor }]}>MEALS PER DAY</Text>
                <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={formData.meals_per_day}
                    onChangeText={(t) => handleChange('meals_per_day', t)}
                    keyboardType="numeric"
                />
            </GlassCard>
            <GlassCard style={styles.inputCard}>
                <Text style={[styles.fieldLabel, { color: subTextColor }]}>I LOVE (LIKES)</Text>
                <TextInput
                    style={[styles.textInput, { color: textColor, minHeight: 60 }]}
                    value={formData.likes}
                    onChangeText={(t) => handleChange('likes', t)}
                    placeholder="Chicken, Rice, Salmon..."
                    placeholderTextColor={subTextColor}
                    multiline
                />
            </GlassCard>
            <GlassCard style={styles.inputCard}>
                <Text style={[styles.fieldLabel, { color: subTextColor }]}>I HATE (DISLIKES)</Text>
                <TextInput
                    style={[styles.textInput, { color: textColor, minHeight: 60 }]}
                    value={formData.dislikes}
                    onChangeText={(t) => handleChange('dislikes', t)}
                    placeholder="Broccoli, Eggplant..."
                    placeholderTextColor={subTextColor}
                    multiline
                />
            </GlassCard>
        </AnimatedCard>
    );

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style={themeColors.isDark ? "light" : "dark"} />
            {renderHeader()}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {activeTab === 'Personal' && renderPersonalInfo()}
                    {activeTab === 'Body' && renderBodyMetrics()}
                    {activeTab === 'Fitness' && renderFitnessStrategy()}
                    {activeTab === 'Nutrition' && renderNutritionRefinement()}

                    <View style={{ height: 120 }} />
                </ScrollView>

                <View style={styles.bottomActions}>
                    <TouchableOpacity
                        style={[styles.saveBtn, loading && styles.disabledBtn]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={themeColors.gradient}
                            style={styles.saveBtnGrad}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.saveBtnText}>
                                {loading ? 'SYNCHRONIZING...' : 'UPDATE BLUEPRINT'}
                            </Text>
                            <Ionicons name="flash" size={18} color={COLORS.white} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    tabScroll: {
        marginTop: 25,
        marginBottom: 10,
    },
    tabScrollContent: {
        gap: 12,
        paddingRight: 25,
    },
    tabBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 15,
        minWidth: 100,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    scrollContent: {
        padding: 25,
    },
    section: {
        marginBottom: 30,
        backgroundColor: 'transparent',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 15,
        letterSpacing: 1.5,
    },
    inputCard: {
        borderRadius: 22,
        padding: 16,
        marginBottom: 15,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    textInput: {
        fontSize: 16,
        fontWeight: '700',
        padding: 0,
    },
    chipGroup: {
        marginTop: 0,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 10,
        fontWeight: '900',
    },
    bottomActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 25,
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    },
    saveBtn: {
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    saveBtnGrad: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    saveBtnText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    disabledBtn: {
        opacity: 0.5,
    }
});

export default EditProfileScreen;
