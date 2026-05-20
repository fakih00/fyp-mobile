import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Dimensions, 
    Animated,
    Platform,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/Theme';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const STEPS = [
    { 
        id: 'dislikes', 
        title: 'Foods you dislike?', 
        subtitle: 'Select any ingredients you prefer to avoid in your meals.', 
        icon: 'restaurant-outline' 
    },
    { 
        id: 'allergies', 
        title: 'Any allergies?', 
        subtitle: 'Let us know so we can safely filter your meal plans.', 
        icon: 'warning-outline' 
    },
    { 
        id: 'frequency', 
        title: 'Meals per day?', 
        subtitle: 'How many times do you prefer to eat throughout the day?', 
        icon: 'time-outline' 
    }
];

const COMMON_FOODS = [
    'Chicken', 'Beef', 'Fish', 'Salmon', 'Eggs', 'Broccoli',
    'Spinach', 'Avocado', 'Nuts', 'Pasta', 'Rice', 'Oats',
    'Fruit', 'Tofu', 'Yogurt', 'Sweet Potato'
];

const COMMON_ALLERGIES = [
    'Dairy', 'Gluten', 'Peanuts', 'Tree Nuts', 'Soy', 'Shellfish', 'Eggs', 'Fish'
];

const FREQUENCIES = [3, 4, 5, 6];

const DietaryPreferenceScreen = ({ navigation, route }) => {
    const { userData } = route.params || {};

    // State for selections
    const [dislikes, setDislikes] = useState([]);
    const [allergies, setAllergies] = useState([]);
    const [mealsPerDay, setMealsPerDay] = useState(4); // Default to 4
    
    // Core Wizard State
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Animations
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    const animateButtonPressIn = () => {
        Animated.spring(buttonScale, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };
    
    const animateButtonPressOut = () => {
        Animated.spring(buttonScale, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    // Update Progress Bar smoothly
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: (currentStepIndex + 1) / STEPS.length,
            duration: 350,
            useNativeDriver: false 
        }).start();
    }, [currentStepIndex]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    const toggleItem = (item, list, setList) => {
        Haptics.selectionAsync();
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (currentStepIndex === STEPS.length - 1) {
            // Final submission
            navigation.navigate('Activity', {
                userData: {
                    ...userData,
                    dislikes: dislikes.join(','),
                    allergies: allergies.join(','),
                    meals_per_day: mealsPerDay
                }
            });
            return;
        }

        // Animate out current step
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: -width * 0.3, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true })
        ]).start(() => {
            setCurrentStepIndex(prev => prev + 1);
            slideAnim.setValue(width * 0.3); // Setup for animate in
            
            // Animate in next step
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
            ]).start();
        });
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        if (currentStepIndex === 0) {
            navigation.goBack();
            return;
        }

        // Animate out current step via right
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: width * 0.3, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true })
        ]).start(() => {
            setCurrentStepIndex(prev => prev - 1);
            slideAnim.setValue(-width * 0.3); // Setup for animate in from left
            
            // Animate in prev step
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
            ]).start();
        });
    };

    const renderTagGrid = (items, selectedList, setList, activeColor) => (
        <ScrollView 
            contentContainerStyle={styles.tagGridContainer} 
            showsVerticalScrollIndicator={false}
            bounces={false}
        >
            <View style={styles.tagGrid}>
                {items.map((item) => {
                    const isSelected = selectedList.includes(item);
                    return (
                        <TouchableOpacity
                            key={item}
                            activeOpacity={0.7}
                            onPress={() => toggleItem(item, selectedList, setList)}
                            style={[
                                styles.tag,
                                isSelected && { backgroundColor: activeColor, borderColor: activeColor }
                            ]}
                        >
                            {isSelected && (
                                <Ionicons name="checkmark-circle" size={16} color="#FFF" style={{ marginRight: 6 }} />
                            )}
                            <Text style={[
                                styles.tagText,
                                isSelected && { color: COLORS.white, fontWeight: '800' }
                            ]}>{item}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );

    const renderFrequencyGrid = () => (
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.frequencyRow}
            snapToInterval={width * 0.3 + 16}
            decelerationRate="fast"
        >
            {FREQUENCIES.map((freq) => {
                const isSelected = mealsPerDay === freq;
                return (
                    <TouchableOpacity
                        key={freq}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setMealsPerDay(freq);
                        }}
                        style={[
                            styles.freqCard,
                            isSelected ? styles.freqCardActive : null
                        ]}
                    >
                        <Text style={[
                            styles.freqNumber,
                            isSelected ? styles.freqNumberActive : null
                        ]}>{freq}</Text>
                        <Text style={[
                            styles.freqLabel,
                            isSelected ? styles.freqLabelActive : null
                        ]}>Meals</Text>
                        {isSelected ? (
                            <View style={styles.freqCheckmark}>
                                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                            </View>
                        ) : null}
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );

    const isCurrentStepValid = () => {
        // All steps in Dietary Preferences are optional or have defaults
        // Dislikes and Allergies can be empty.
        // Frequency has a default.
        return true;
    };

    const renderActiveStep = () => {
        const step = STEPS[currentStepIndex];
        return (
            <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
                <View style={styles.iconCircle}>
                    <Ionicons name={step.icon} size={42} color="#10B981" />
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                <View style={[styles.inputWrapper, step.id === 'frequency' ? { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 } : null]}>
                    {step.id === 'dislikes' ? renderTagGrid(COMMON_FOODS, dislikes, setDislikes, '#EF4444') : null}
                    {step.id === 'allergies' ? renderTagGrid(COMMON_ALLERGIES, allergies, setAllergies, '#F59E0B') : null}
                    {step.id === 'frequency' ? renderFrequencyGrid() : null}
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#F8FAFC', '#F1F5F9', '#E2E8F0']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea}>
                
                {/* Top Navigation */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                        <BlurView intensity={40} tint="light" style={styles.backBlur}>
                            <Ionicons name="chevron-back" size={24} color="#0F172A" />
                        </BlurView>
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.stepIndicatorText}>Step {currentStepIndex + 1} of {STEPS.length}</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.skipBtn} 
                        onPress={handleNext}
                    >
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                </View>

                {/* Progress Bar Container */}
                <View style={styles.progressTrackWrapper}>
                    <View style={styles.progressTrack}>
                        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                    </View>
                </View>

                <View style={styles.contentArea}>
                    {renderActiveStep()}
                </View>
                
                {/* Floating Bottom Button */}
                <View style={styles.footer}>
                    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                        <TouchableOpacity
                            style={styles.nextBtn}
                            onPress={handleNext}
                            onPressIn={animateButtonPressIn}
                            onPressOut={animateButtonPressOut}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.btnGrad}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.btnText}>
                                    {currentStepIndex === STEPS.length - 1 ? 'FINISH' : 'CONTINUE'}
                                </Text>
                                <Ionicons 
                                    name={currentStepIndex === STEPS.length - 1 ? "checkmark-circle" : "arrow-forward"} 
                                    size={22} 
                                    color="#FFF" 
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 10,
    },
    headerCenter: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 20,
    },
    stepIndicatorText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    backBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    skipBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    skipText: {
        color: '#94A3B8',
        fontWeight: '700',
        fontSize: 15,
    },
    progressTrackWrapper: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    progressTrack: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 3,
    },
    contentArea: {
        flex: 1,
        paddingHorizontal: 24,
    },
    stepContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 10,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    stepTitle: {
        fontSize: 30,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: -0.5,
    },
    stepSubtitle: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
        marginBottom: 30,
    },
    inputWrapper: {
        width: '100%',
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 30,
        padding: 20,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
        marginBottom: 20,
    },
    tagGridContainer: {
        paddingBottom: 20,
    },
    tagGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    tagText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
    },
    frequencyRow: {
        paddingHorizontal: 10,
        paddingVertical: 10,
        gap: 16,
    },
    freqCard: {
        width: width * 0.35,
        aspectRatio: 0.85,
        backgroundColor: '#FFF',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    freqCardActive: {
        borderColor: '#10B981',
        backgroundColor: '#ECFDF5',
        shadowColor: '#10B981',
        shadowOpacity: 0.2,
    },
    freqNumber: {
        fontSize: 48,
        fontWeight: '900',
        color: '#64748B',
    },
    freqNumberActive: {
        color: '#10B981',
    },
    freqLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#94A3B8',
        marginTop: 4,
    },
    freqLabelActive: {
        color: '#059669',
    },
    freqCheckmark: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    },
    nextBtn: {
        height: 64,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    btnGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    btnText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },
});

export default DietaryPreferenceScreen;
