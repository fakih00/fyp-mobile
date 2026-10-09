import React, { useState, useContext, useCallback, useRef, useEffect } from 'react';
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
    ActivityIndicator,
    Image,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { api } from '../services/api';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// ─── Reusable Chip Selector ──────────────────────────────────────────────────
const SelectionChips = ({ label, options, selected, onSelect, themeColors }) => {
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : '#64748B';
    return (
        <View style={styles.chipGroup}>
            {label ? <Text style={[styles.fieldLabel, { color: subTextColor }]}>{label}</Text> : null}
            <View style={styles.chipRow}>
                {options.map(opt => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[
                            styles.chip,
                            { backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                            selected === opt.value && { borderColor: themeColors.accent, backgroundColor: themeColors.accent + '20' }
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onSelect(opt.value);
                        }}
                    >
                        <Text style={[
                            styles.chipText,
                            { color: subTextColor },
                            selected === opt.value && { color: themeColors.accent, fontWeight: '900' }
                        ]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

// ─── Reusable Text Field ─────────────────────────────────────────────────────
const InputField = ({ label, value, onChangeText, placeholder, keyboardType, multiline, themeColors }) => {
    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : '#64748B';
    return (
        <GlassCard style={styles.inputCard}>
            <Text style={[styles.fieldLabel, { color: subTextColor }]}>{label}</Text>
            <TextInput
                style={[styles.textInput, { color: textColor, minHeight: multiline ? 70 : undefined }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder || ''}
                placeholderTextColor={subTextColor}
                keyboardType={keyboardType || 'default'}
                multiline={!!multiline}
            />
        </GlassCard>
    );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const EditProfileScreen = ({ navigation }) => {
    const { user, setUser, updateUserProfileImage, colors: themeColors } = useContext(AppContext);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('Personal');
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const tabs = ['Personal', 'Body', 'Fitness', 'Nutrition', 'Limitations'];

    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : '#64748B';

    const [formData, setFormData] = useState({
        // Personal
        name: user.name || '',
        age: user.profile?.age != null ? String(user.profile.age) : '',
        gender: user.profile?.gender || 'male',
        // Body
        weight: user.profile?.weight != null ? String(user.profile.weight) : '',
        height: user.profile?.height != null ? String(user.profile.height) : '',
        sleep_hours: user.profile?.sleep_hours != null ? String(user.profile.sleep_hours) : '7',
        stress_level: user.profile?.stress_level || 'low',
        // Fitness
        goal: user.profile?.goal || 'lose_weight',
        activity_level: user.profile?.activity_level || 'moderately_active',
        training_location: user.profile?.training_location || 'gym',
        training_intensity: user.profile?.training_intensity || 'moderate',
        training_days_per_week: user.profile?.training_days_per_week != null ? String(user.profile.training_days_per_week) : '3',
        // Nutrition
        meals_per_day: user.profile?.meals_per_day != null ? String(user.profile.meals_per_day) : '4',
        likes: user.profile?.likes || '',
        dislikes: user.profile?.dislikes || '',
        allergies: user.profile?.allergies || '',
        // Recovery
        injuries: user.profile?.injuries || '',
        pain_points: user.profile?.pain_points || '',
        strong_side: user.profile?.strong_side || '',
        posture_problems: user.profile?.posture_problems || '',
        mobility_limitations: user.profile?.mobility_limitations || '',
        avoid_areas: user.profile?.avoid_areas || '',
        chronic_pain: user.profile?.chronic_pain || ''
    });

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
            ])
        ).start();
    }, []);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const pickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true
        });
        if (!result.canceled) {
            const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
            if (await updateUserProfileImage(base64Uri)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            else Alert.alert('Photo not saved', 'Please choose an image under 6 MB and retry.');
        }
    };

    const safeInt = (val) => {
        const n = parseInt(val, 10);
        return isNaN(n) ? undefined : n;
    };
    const safeFloat = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? undefined : n;
    };

    const handleSave = async () => {
        if (loading) return;
        if (!formData.name.trim()) {
            Alert.alert('Name required', 'Enter your name before saving.');
            return;
        }
        const ranges = {
            age: [1, 120], weight: [20, 400], height: [80, 250],
            training_days_per_week: [1, 7], meals_per_day: [1, 8], sleep_hours: [0, 24],
        };
        for (const [field, [min, max]] of Object.entries(ranges)) {
            const value = Number(formData[field]);
            if (!String(formData[field]).trim() || !Number.isFinite(value) || value < min || value > max || (['age', 'training_days_per_week', 'meals_per_day'].includes(field) && !Number.isInteger(value))) {
                Alert.alert('Check your profile', `Enter a valid ${field.replace(/_/g, ' ')} between ${min} and ${max}.`);
                return;
            }
        }
        setLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const payload = {
                name: formData.name.trim(),
                age: safeInt(formData.age),
                gender: formData.gender,
                weight: safeFloat(formData.weight),
                height: safeFloat(formData.height),
                goal: formData.goal,
                activity_level: formData.activity_level,
                training_location: formData.training_location,
                training_intensity: formData.training_intensity,
                training_days_per_week: safeInt(formData.training_days_per_week),
                meals_per_day: safeInt(formData.meals_per_day),
                likes: formData.likes,
                dislikes: formData.dislikes,
                allergies: formData.allergies,
                sleep_hours: safeFloat(formData.sleep_hours),
                stress_level: formData.stress_level,
                injuries: formData.injuries,
                pain_points: formData.pain_points,
                strong_side: formData.strong_side,
                posture_problems: formData.posture_problems,
                mobility_limitations: formData.mobility_limitations,
                avoid_areas: formData.avoid_areas,
                chronic_pain: formData.chronic_pain
            };

            const res = await api.post('updateUser', payload);

            if (res.status === 200) {
                setUser(prev => ({
                    ...prev,
                    ...payload,
                    name: formData.name.trim(),
                    profile: { ...prev.profile, ...payload }
                }));
                Alert.alert('✓ Saved', 'Your profile has been updated!');
                navigation.goBack();
            } else {
                Alert.alert('Error', res.data?.message || 'Failed to update profile.');
            }
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('Network Error', 'Could not connect to server.');
        } finally {
            setLoading(false);
        }
    };

    // ── Header ────────────────────────────────────────────────────────────────
    const renderHeader = () => (
        <View>
            <LinearGradient
                colors={themeColors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            />
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.navRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                        <BlurView intensity={30} tint="light" style={styles.btnBlur}>
                            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>
                    <View style={styles.titleStack}>
                        <Text style={styles.headerTitle}>Edit Profile</Text>
                        <Text style={styles.headerSub}>REFINE YOUR BLUEPRINT</Text>
                    </View>
                    <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={loading}>
                        <BlurView intensity={30} tint="light" style={styles.btnBlur}>
                            {loading
                                ? <ActivityIndicator size="small" color={COLORS.white} />
                                : <Ionicons name="checkmark" size={22} color={COLORS.white} />
                            }
                        </BlurView>
                    </TouchableOpacity>
                </View>

                {/* Avatar Picker */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
                        <Animated.View style={[styles.avatarRing, { borderColor: themeColors.accent, transform: [{ scale: pulseAnim }] }]}>
                            <Image
                                source={{ uri: user.profileImage || user.profile?.avatar || `https://i.pravatar.cc/150?u=${user.name}` }}
                                style={styles.avatarImg}
                            />
                            <View style={[styles.cameraBadge, { backgroundColor: themeColors.accent }]}>
                                <Ionicons name="camera" size={14} color={COLORS.white} />
                            </View>
                        </Animated.View>
                    </TouchableOpacity>
                    <Text style={styles.avatarName}>{formData.name || 'Your Name'}</Text>
                    <Text style={styles.avatarHint}>Tap photo to change</Text>
                </View>

                {/* Tab Bar */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabContent}
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
                                activeTab === tab
                                    ? { backgroundColor: themeColors.accent }
                                    : { backgroundColor: 'rgba(0,0,0,0.12)' }
                            ]}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === tab ? COLORS.white : COLORS.white }
                            ]}>
                                {tab.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );

    // ── Personal Tab ──────────────────────────────────────────────────────────
    const renderPersonal = () => (
        <AnimatedCard delay={100} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.accent }]}>⚡ IDENTITY</Text>

            <InputField
                label="FULL NAME"
                value={formData.name}
                onChangeText={v => handleChange('name', v)}
                placeholder="Your name"
                themeColors={themeColors}
            />

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                    <InputField
                        label="AGE"
                        value={formData.age}
                        onChangeText={v => handleChange('age', v)}
                        keyboardType="numeric"
                        placeholder="25"
                        themeColors={themeColors}
                    />
                </View>
                <GlassCard style={[styles.inputCard, { flex: 1.6 }]}>
                    <SelectionChips
                        label="GENDER"
                        options={[
                            { label: '♂ Male', value: 'male' },
                            { label: '♀ Female', value: 'female' },
                            { label: '✦ Other', value: 'other' }
                        ]}
                        selected={formData.gender}
                        onSelect={v => handleChange('gender', v)}
                        themeColors={themeColors}
                    />
                </GlassCard>
            </View>
        </AnimatedCard>
    );

    // ── Body Tab ──────────────────────────────────────────────────────────────
    const renderBody = () => (
        <AnimatedCard delay={100} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.accent }]}>💪 PHYSICAL METRICS</Text>

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                    <InputField
                        label="WEIGHT (KG)"
                        value={formData.weight}
                        onChangeText={v => handleChange('weight', v)}
                        keyboardType="numeric"
                        placeholder="70"
                        themeColors={themeColors}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <InputField
                        label="HEIGHT (CM)"
                        value={formData.height}
                        onChangeText={v => handleChange('height', v)}
                        keyboardType="numeric"
                        placeholder="175"
                        themeColors={themeColors}
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                    <InputField
                        label="SLEEP (HRS/NIGHT)"
                        value={formData.sleep_hours}
                        onChangeText={v => handleChange('sleep_hours', v)}
                        keyboardType="numeric"
                        placeholder="7"
                        themeColors={themeColors}
                    />
                </View>
                <GlassCard style={[styles.inputCard, { flex: 1.6 }]}>
                    <SelectionChips
                        label="STRESS LEVEL"
                        options={[
                            { label: 'LOW', value: 'low' },
                            { label: 'MED', value: 'medium' },
                            { label: 'HIGH', value: 'high' }
                        ]}
                        selected={formData.stress_level}
                        onSelect={v => handleChange('stress_level', v)}
                        themeColors={themeColors}
                    />
                </GlassCard>
            </View>
        </AnimatedCard>
    );

    // ── Fitness Tab ────────────────────────────────────────────────────────────
    const renderFitness = () => (
        <AnimatedCard delay={100} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.accent }]}>🏆 FITNESS STRATEGY</Text>

            <GlassCard style={styles.inputCard}>
                <SelectionChips
                    label="PRIMARY GOAL"
                    options={[
                        { label: '🔥 Lose Weight', value: 'lose_weight' },
                        { label: '💪 Build Muscle', value: 'build_muscle' },
                        { label: '⚡ Keep Fit', value: 'keep_fit' },
                        { label: '📈 Gain Weight', value: 'gain_weight' },
                        { label: '🏃 Running', value: 'running' },
                        { label: '🥊 Boxing', value: 'boxing' },
                        { label: '🏊 Swimming', value: 'swimming' },
                        { label: '🚴 Cycling', value: 'cycling' },
                        { label: '🥋 Martial Arts', value: 'martial_arts' },
                        { label: '🧘 Yoga', value: 'yoga_flexibility' },
                        { label: '📊 Maintain', value: 'maintain' },
                        { label: '🦾 Stamina', value: 'improve_stamina' }
                    ]}
                    selected={formData.goal}
                    onSelect={v => handleChange('goal', v)}
                    themeColors={themeColors}
                />
            </GlassCard>

            <GlassCard style={styles.inputCard}>
                <SelectionChips
                    label="ACTIVITY LEVEL"
                    options={[
                        { label: '🛋️ Sedentary', value: 'sedentary' },
                        { label: '🚶 Light', value: 'lightly_active' },
                        { label: '🏃 Moderate', value: 'moderately_active' },
                        { label: '🔥 Very Active', value: 'very_active' },
                        { label: '⚡ Super Active', value: 'super_active' }
                    ]}
                    selected={formData.activity_level}
                    onSelect={v => handleChange('activity_level', v)}
                    themeColors={themeColors}
                />
            </GlassCard>

            <GlassCard style={styles.inputCard}>
                <SelectionChips
                    label="TRAINING LOCATION"
                    options={[
                        { label: '🏋️ Gym', value: 'gym' },
                        { label: '🏠 Home', value: 'home' },
                        { label: '🌳 Outdoor', value: 'outdoor' },
                        { label: '🏊 Pool', value: 'pool' },
                        { label: '🌊 Open Water', value: 'open_water' },
                        { label: '🏃 Dryland', value: 'dryland' },
                        { label: '🧘 Studio', value: 'studio' }
                    ]}
                    selected={formData.training_location}
                    onSelect={v => handleChange('training_location', v)}
                    themeColors={themeColors}
                />
            </GlassCard>

            <View style={styles.row}>
                <GlassCard style={[styles.inputCard, { flex: 1, marginRight: 10 }]}>
                    <SelectionChips
                        label="INTENSITY"
                        options={[
                            { label: 'LIGHT', value: 'light' },
                            { label: 'MOD', value: 'moderate' },
                            { label: 'HEAVY', value: 'heavy' }
                        ]}
                        selected={formData.training_intensity}
                        onSelect={v => handleChange('training_intensity', v)}
                        themeColors={themeColors}
                    />
                </GlassCard>
                <View style={{ flex: 1 }}>
                    <InputField
                        label="DAYS / WEEK"
                        value={formData.training_days_per_week}
                        onChangeText={v => handleChange('training_days_per_week', v)}
                        keyboardType="numeric"
                        placeholder="4"
                        themeColors={themeColors}
                    />
                </View>
            </View>
        </AnimatedCard>
    );

    // ── Nutrition Tab ──────────────────────────────────────────────────────────
    const renderNutrition = () => (
        <AnimatedCard delay={100} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.accent }]}>🥗 NUTRITION PROFILE</Text>

            <InputField
                label="MEALS PER DAY"
                value={formData.meals_per_day}
                onChangeText={v => handleChange('meals_per_day', v)}
                keyboardType="numeric"
                placeholder="4"
                themeColors={themeColors}
            />

            <InputField
                label="FOODS I LOVE 💚"
                value={formData.likes}
                onChangeText={v => handleChange('likes', v)}
                placeholder="Chicken, rice, salmon, oats..."
                multiline
                themeColors={themeColors}
            />

            <InputField
                label="FOODS I AVOID ❌"
                value={formData.dislikes}
                onChangeText={v => handleChange('dislikes', v)}
                placeholder="Broccoli, mushrooms..."
                multiline
                themeColors={themeColors}
            />

            <InputField
                label="ALLERGIES ⚠️"
                value={formData.allergies}
                onChangeText={v => handleChange('allergies', v)}
                placeholder="Gluten, lactose, peanuts..."
                multiline
                themeColors={themeColors}
            />
        </AnimatedCard>
    );

    // ── Recovery Tab ───────────────────────────────────────────────────────────
    const dominanceFor = (region) => {
        const match = formData.strong_side.match(new RegExp(`${region} Body:\\s*(left|right|symmetric)`, 'i'));
        if (match) return match[1].toLowerCase();
        return ['left', 'right'].includes(formData.strong_side.toLowerCase()) ? formData.strong_side.toLowerCase() : 'symmetric';
    };
    const updateDominance = (region, side) => {
        const upper = region === 'Upper' ? side : dominanceFor('Upper');
        const lower = region === 'Lower' ? side : dominanceFor('Lower');
        handleChange('strong_side', `Upper Body: ${upper.toUpperCase()}, Lower Body: ${lower.toUpperCase()}`);
    };
    const renderRecovery = () => (
        <AnimatedCard delay={100} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.accent }]}>TRAINING LIMITATIONS</Text>
            <Text style={[styles.sectionNote, { color: subTextColor }]}>
                Reported limitations support exercise exclusions. This is not rehabilitation or medical clearance.
            </Text>

            <InputField
                label="CURRENT INJURIES"
                value={formData.injuries}
                onChangeText={v => handleChange('injuries', v)}
                placeholder="Knee ligament, shoulder strain..."
                multiline
                themeColors={themeColors}
            />

            <InputField
                label="PAIN POINTS"
                value={formData.pain_points}
                onChangeText={v => handleChange('pain_points', v)}
                placeholder="Lower back, neck, wrists..."
                multiline
                themeColors={themeColors}
            />

            <InputField
                label="CHRONIC PAIN / CONDITIONS"
                value={formData.chronic_pain}
                onChangeText={v => handleChange('chronic_pain', v)}
                placeholder="Arthritis, fibromyalgia..."
                multiline
                themeColors={themeColors}
            />

            <GlassCard style={styles.inputCard}>
                <SelectionChips
                    label="UPPER BODY SIDE"
                    options={[
                        { label: 'Right', value: 'right' },
                        { label: 'Left', value: 'left' },
                        { label: 'Symmetric', value: 'symmetric' }
                    ]}
                    selected={dominanceFor('Upper')}
                    onSelect={v => updateDominance('Upper', v)}
                    themeColors={themeColors}
                />
                <SelectionChips
                    label="LOWER BODY SIDE"
                    options={[{ label: 'Right', value: 'right' }, { label: 'Left', value: 'left' }, { label: 'Symmetric', value: 'symmetric' }]}
                    selected={dominanceFor('Lower')}
                    onSelect={v => updateDominance('Lower', v)}
                    themeColors={themeColors}
                />
            </GlassCard>

            <InputField
                label="POSTURE PROBLEMS"
                value={formData.posture_problems}
                onChangeText={v => handleChange('posture_problems', v)}
                placeholder="Rounded shoulders, forward head..."
                multiline
                themeColors={themeColors}
            />

            <InputField
                label="MOBILITY LIMITATIONS"
                value={formData.mobility_limitations}
                onChangeText={v => handleChange('mobility_limitations', v)}
                placeholder="Limited hip flexion, ankle stiffness..."
                multiline
                themeColors={themeColors}
            />

            <InputField
                label="AREAS TO AVOID"
                value={formData.avoid_areas}
                onChangeText={v => handleChange('avoid_areas', v)}
                placeholder="Heavy leg press, overhead press..."
                multiline
                themeColors={themeColors}
            />
        </AnimatedCard>
    );

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <AuraBackground style={styles.container}>
            <StatusBar style="light" />
            {renderHeader()}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {activeTab === 'Personal' && renderPersonal()}
                    {activeTab === 'Body' && renderBody()}
                    {activeTab === 'Fitness' && renderFitness()}
                    {activeTab === 'Nutrition' && renderNutrition()}
                    {activeTab === 'Limitations' && renderRecovery()}

                    <View style={{ height: 140 }} />
                </ScrollView>

                <View style={styles.bottomActions}>
                    <TouchableOpacity
                        style={[styles.saveBtn, loading && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={themeColors.gradient}
                            style={styles.saveBtnGrad}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <>
                                    <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
                                    <Ionicons name="flash" size={18} color={COLORS.white} />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </AuraBackground>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    headerGradient: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 360,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
    },
    headerSafe: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    headerBtn: {
        width: 44, height: 44,
        borderRadius: 14,
        overflow: 'hidden',
    },
    btnBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleStack: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    headerSub: {
        fontSize: 9,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.75)',
        letterSpacing: 2.5,
        marginTop: 2,
    },

    // Avatar
    avatarSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    avatarRing: {
        width: 90,
        height: 90,
        borderRadius: 28,
        borderWidth: 3,
        overflow: 'visible',
        position: 'relative',
    },
    avatarImg: {
        width: 84,
        height: 84,
        borderRadius: 26,
    },
    cameraBadge: {
        position: 'absolute',
        bottom: -6,
        right: -6,
        width: 28,
        height: 28,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    avatarName: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.white,
        marginTop: 12,
        letterSpacing: -0.3,
    },
    avatarHint: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.65)',
        marginTop: 3,
        fontWeight: '600',
    },

    // Tabs
    tabScroll: {
        marginTop: 20,
        marginBottom: 4,
    },
    tabContent: {
        gap: 8,
        paddingRight: 20,
    },
    tabBtn: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    tabText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
        color: COLORS.white,
    },

    // Form
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    section: {
        marginBottom: 20,
        backgroundColor: 'transparent',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    sectionNote: {
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 16,
        lineHeight: 17,
    },
    inputCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: 0.8,
    },
    textInput: {
        fontSize: 16,
        fontWeight: '700',
        padding: 0,
        lineHeight: 22,
    },

    // Chips
    chipGroup: {},
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    chipText: {
        fontSize: 10,
        fontWeight: '700',
    },

    // Bottom Save
    bottomActions: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingTop: 12,
    },
    saveBtn: {
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
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
});

export default EditProfileScreen;
