import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES } from '../../constants/Theme';
import { AnimatedCard } from '../../components';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const DietaryPreferenceScreen = ({ navigation, route }) => {
    const { userData } = route.params || {};

    const [dislikes, setDislikes] = useState([]);
    const [allergies, setAllergies] = useState([]);
    const [mealsPerDay, setMealsPerDay] = useState(4);

    const FREQUENCIES = [3, 4, 5, 6];

    const COMMON_FOODS = [
        'Chicken', 'Beef', 'Fish', 'Salmon', 'Eggs', 'Broccoli',
        'Spinach', 'Avocado', 'Nuts', 'Pasta', 'Rice', 'Oats',
        'Fruit', 'Tofu', 'Yogurt', 'Sweet Potato'
    ];

    const COMMON_ALLERGIES = [
        'Dairy', 'Gluten', 'Peanuts', 'Tree Nuts', 'Soy', 'Shellfish', 'Eggs', 'Fish'
    ];

    const toggleItem = (item, list, setList) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('Activity', {
            userData: {
                ...userData,
                dislikes: dislikes.join(','),
                allergies: allergies.join(','),
                meals_per_day: mealsPerDay
            }
        });
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.goBack();
    };

    const renderTags = (items, selectedList, setList, color) => (
        <View style={styles.tagGrid}>
            {items.map((item) => {
                const isSelected = selectedList.includes(item);
                return (
                    <TouchableOpacity
                        key={item}
                        onPress={() => toggleItem(item, selectedList, setList)}
                        style={[
                            styles.tag,
                            isSelected && { backgroundColor: color, borderColor: color }
                        ]}
                    >
                        <Text style={[
                            styles.tagText,
                            isSelected && { color: COLORS.white }
                        ]}>{item}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#F8FAFC', '#ECFDF5']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                        <BlurView intensity={40} tint="light" style={styles.backBlur}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                        </BlurView>
                    </TouchableOpacity>

                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: '90%' }]} />
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <AnimatedCard delay={100} style={styles.titleSection}>
                        <Text style={styles.title}>DIETARY PROFILE</Text>
                        <Text style={styles.subtitle}>Our AI adjusts your meals based on what you love, hate, or can't eat.</Text>
                    </AnimatedCard>

                    <Text style={styles.sectionLabel}>FOODS YOU DISLIKE</Text>
                    {renderTags(COMMON_FOODS, dislikes, setDislikes, '#EF4444')}

                    <Text style={styles.sectionLabel}>ALLERGIES</Text>
                    {renderTags(COMMON_ALLERGIES, allergies, setAllergies, '#F59E0B')}

                    <Text style={styles.sectionLabel}>MEAL FREQUENCY</Text>
                    <View style={styles.tagGrid}>
                        {FREQUENCIES.map((freq) => (
                            <TouchableOpacity
                                key={freq}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setMealsPerDay(freq);
                                }}
                                style={[
                                    styles.tag,
                                    mealsPerDay === freq && { backgroundColor: '#10B981', borderColor: '#10B981' }
                                ]}
                            >
                                <Text style={[
                                    styles.tagText,
                                    mealsPerDay === freq && { color: COLORS.white }
                                ]}>{freq} Meals / Day</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.nextBtn}
                        onPress={handleNext}
                    >
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.btnGrad}
                        >
                            <Text style={styles.btnText}>CONTINUE</Text>
                            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                        </LinearGradient>
                    </TouchableOpacity>
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
    scrollContent: {
        paddingHorizontal: 30,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 35,
        paddingHorizontal: 30,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
    },
    backBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressTrack: {
        flex: 1,
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        marginLeft: 25,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 3,
    },
    titleSection: {
        backgroundColor: 'transparent',
        elevation: 0,
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: 15,
    },
    subtitle: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 2,
        marginBottom: 15,
        marginTop: 20,
    },
    tagGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tag: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: COLORS.white,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    footer: {
        paddingHorizontal: 30,
        paddingBottom: 30,
        marginTop: 'auto',
    },
    nextBtn: {
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
    },
    btnGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    btnText: {
        fontSize: 15,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1.5,
    },
});

export default DietaryPreferenceScreen;
