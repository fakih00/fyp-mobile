import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { AnimatedCard, GlassCard, PrimaryButton } from '../components';

const { width } = Dimensions.get('window');

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_MAP = {
    'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
    'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
};

const NutritionLogScreen = ({ navigation }) => {
    const { user, meals, nutritionGoal, isRecomp, macroTargets, consumedMacros, colors: themeColors } = useContext(AppContext);
    const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);

    // Get real daily totals
    const dayName = DAY_MAP[selectedDay];
    const dayConsumed = consumedMacros[dayName] || { calories: 0, protein: 0, carbs: 0, fats: 0 };
    const dayMeals = meals.filter(m => m.day === dayName && m.completed);

    const goalCals = nutritionGoal;
    const goalProtein = macroTargets?.protein || Math.round((goalCals * 0.3) / 4);
    const goalCarbs = macroTargets?.carbs || Math.round((goalCals * 0.4) / 4);
    const goalFats = macroTargets?.fats || Math.round((goalCals * 0.3) / 9);

    const MacroRing = ({ label, value, goal, color }) => {
        const progress = Math.min(value / goal, 1);
        return (
            <View style={styles.macroTrack}>
                <View style={styles.macroTextRow}>
                    <Text style={styles.macroLabel}>{label}</Text>
                    <Text style={styles.macroValue}>{value}g / {goal}g</Text>
                </View>
                <View style={styles.macroBarBg}>
                    <LinearGradient
                        colors={[color, color + '99']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.macroBarFill, { width: `${progress * 100}%` }]}
                    />
                </View>
            </View>
        );
    };

    const MicronutrientItem = ({ label, value, status }) => (
        <View style={styles.microItem}>
            <View>
                <Text style={styles.microLabel}>{label}</Text>
                <Text style={styles.microValue}>{value}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status === 'Good' ? '#D1FAE5' : '#FEE2E2' }]}>
                <Text style={[styles.statusText, { color: status === 'Good' ? '#065F46' : '#991B1B' }]}>{status}</Text>
            </View>
        </View>
    );

    const remaining = Math.max(goalCals - dayConsumed.calories, 0);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Nutrition Log</Text>
                        <Text style={styles.subtitle}>{isRecomp ? "Recomposition: Performance Fuel" : "Fuel your performance"}</Text>
                    </View>
                    <TouchableOpacity style={styles.addMealBtn} onPress={() => navigation.navigate('NutritionPlan')}>
                        <LinearGradient colors={themeColors.gradient} style={styles.addBtnGradient}>
                            <Ionicons name="restaurant" size={24} color={COLORS.white} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Day selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                    {DAYS.map(day => (
                        <TouchableOpacity
                            key={day}
                            style={[styles.dayItem, selectedDay === day && { backgroundColor: themeColors.accent }]}
                            onPress={() => setSelectedDay(day)}
                        >
                            <Text style={[styles.dayText, selectedDay === day && styles.dayTextActive]}>{day}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Main Calorie Card */}
                <AnimatedCard delay={100} style={styles.mainCardContainer}>
                    <GlassCard style={styles.mainCard}>
                        <View style={styles.calorieInfo}>
                            <View style={[styles.calorieCircle, { borderColor: themeColors.accent + '20' }, isRecomp && { borderColor: themeColors.accent + '40' }]}>
                                <Text style={styles.caloriesNumber}>{remaining}</Text>
                                <Text style={styles.caloriesLabel}>Remaining</Text>
                                {isRecomp && <Text style={[styles.recompMiniLabelLog, { color: themeColors.accent }]}>RECOMP</Text>}
                            </View>
                            <View style={styles.calorieBreakdown}>
                                <View style={styles.breakdownItem}>
                                    <Ionicons name="restaurant" size={16} color={themeColors.accent} />
                                    <View>
                                        <Text style={styles.breakdownValue}>{dayConsumed.calories}</Text>
                                        <Text style={styles.breakdownLabel}>Eaten</Text>
                                    </View>
                                </View>
                                <View style={styles.breakdownItem}>
                                    <Ionicons name="flame" size={16} color="#F59E0B" />
                                    <View>
                                        <Text style={styles.breakdownValue}>420</Text>
                                        <Text style={styles.breakdownLabel}>Burned</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.macrosContainer}>
                            <MacroRing label="Protein" value={dayConsumed.protein} goal={goalProtein} color="#EF4444" />
                            <MacroRing label="Carbs" value={dayConsumed.carbs} goal={goalCarbs} color="#3B82F6" />
                            <MacroRing label="Fats" value={dayConsumed.fats} goal={goalFats} color="#F59E0B" />
                        </View>
                    </GlassCard>
                </AnimatedCard>

                {/* Micronutrients */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Micronutrients</Text>
                    <GlassCard style={styles.microCard}>
                        <View style={styles.microGrid}>
                            <MicronutrientItem label="Fiber" value="32g / 35g" status="Good" />
                            <MicronutrientItem label="Sugar" value="45g / 50g" status="Warning" />
                            <MicronutrientItem label="Sodium" value="1.2g / 2.3g" status="Good" />
                            <MicronutrientItem label="Potassium" value="2.8g / 4.7g" status="Warning" />
                        </View>
                    </GlassCard>
                </View>

                {/* Weight Progress Mini Chart */}
                <AnimatedCard delay={200} style={styles.section}>
                    <Text style={styles.sectionTitle}>Body Progress</Text>
                    <GlassCard style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <View>
                                <Text style={styles.chartValue}>78.2 kg</Text>
                                <Text style={styles.chartLabel}>Current Weight</Text>
                            </View>
                            <View style={styles.trendBadge}>
                                <Ionicons name="trending-down" size={14} color="#22C55E" />
                                <Text style={styles.trendText}>-1.4 kg this week</Text>
                            </View>
                        </View>
                        {/* Visual Chart Placeholder */}
                        <View style={styles.chartVisual}>
                            <View style={styles.chartLinesContainer}>
                                {[40, 60, 45, 70, 55, 30, 40].map((h, i) => (
                                    <View key={i} style={[styles.chartBar, { height: h, backgroundColor: themeColors.accent + '30' }]} />
                                ))}
                            </View>
                        </View>
                    </GlassCard>
                </AnimatedCard>

                {/* Meal Log */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Daily Log</Text>
                        <TouchableOpacity>
                            <Text style={[styles.seeAllText, { color: themeColors.accent }]}>Edit Log</Text>
                        </TouchableOpacity>
                    </View>
                    {dayMeals.map((meal, index) => (
                        <AnimatedCard key={meal.id} delay={300 + index * 100} style={styles.mealCard}>
                            <View style={[styles.mealIcon, { backgroundColor: themeColors.accent + '10' }]}>
                                <Ionicons
                                    name={meal.type === 'Breakfast' ? 'sunny' : meal.type === 'Snack' ? 'cafe' : 'restaurant'}
                                    size={20}
                                    color={themeColors.accent}
                                />
                            </View>
                            <View style={styles.mealInfo}>
                                <Text style={styles.mealName}>{meal.name}</Text>
                                <Text style={styles.mealTime}>{meal.type} • Logged</Text>
                                <View style={styles.mealMacros}>
                                    <Text style={styles.mealMacroText}>P: {meal.protein}g</Text>
                                    <Text style={styles.mealMacroText}>C: {meal.carbs}g</Text>
                                    <Text style={styles.mealMacroText}>F: {meal.fats}g</Text>
                                </View>
                            </View>
                            <Text style={[styles.mealCals, { color: themeColors.accent }]}>{meal.calories} kcal</Text>
                        </AnimatedCard>
                    ))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        paddingTop: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SIZES.padding,
        marginBottom: 20,
    },
    title: {
        ...FONTS.h1,
        color: COLORS.text,
    },
    subtitle: {
        ...FONTS.body3,
        color: COLORS.textSecondary,
    },
    addMealBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 4,
    },
    addBtnGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    daySelector: {
        marginBottom: 25,
        paddingHorizontal: SIZES.padding,
    },
    dayItem: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginRight: 10,
        borderRadius: 20,
        backgroundColor: COLORS.white,
    },
    dayItemActive: {
        // backgroundColor handled dynamically
    },
    dayText: {
        ...FONTS.body4,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
    },
    dayTextActive: {
        color: COLORS.white,
    },
    mainCardContainer: {
        marginHorizontal: SIZES.padding,
        marginBottom: 30,
    },
    mainCard: {
        padding: 25,
    },
    calorieInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    calorieCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 10,
        // borderColor handled dynamically
        justifyContent: 'center',
        alignItems: 'center',
    },
    caloriesNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    caloriesLabel: {
        ...FONTS.body5,
        color: COLORS.textSecondary,
    },
    calorieBreakdown: {
        gap: 20,
    },
    breakdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    breakdownValue: {
        ...FONTS.h4,
        color: COLORS.text,
        fontWeight: 'bold',
    },
    breakdownLabel: {
        ...FONTS.body5,
        color: COLORS.textSecondary,
    },
    macrosContainer: {
        gap: 15,
    },
    macroTrack: {
        gap: 8,
    },
    macroTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    macroLabel: {
        ...FONTS.body4,
        color: COLORS.text,
        fontWeight: '600',
    },
    macroValue: {
        ...FONTS.body5,
        color: COLORS.textSecondary,
    },
    macroBarBg: {
        height: 10,
        backgroundColor: COLORS.gray100 + '30',
        borderRadius: 5,
        overflow: 'hidden',
    },
    macroBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    section: {
        paddingHorizontal: SIZES.padding,
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        ...FONTS.h3,
        color: COLORS.text,
        marginBottom: 15,
    },
    seeAllText: {
        ...FONTS.body4,
        // color handled dynamically
        fontWeight: 'bold',
    },
    microCard: {
        padding: 20,
    },
    microGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 15,
    },
    microItem: {
        width: (width - SIZES.padding * 2 - 55) / 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    microLabel: {
        ...FONTS.body5,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    microValue: {
        ...FONTS.body4,
        color: COLORS.text,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    chartCard: {
        padding: 20,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    chartValue: {
        ...FONTS.h2,
        color: COLORS.text,
        fontWeight: 'bold',
    },
    chartLabel: {
        ...FONTS.body5,
        color: COLORS.textSecondary,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    trendText: {
        fontSize: 11,
        color: '#065F46',
        fontWeight: 'bold',
    },
    chartVisual: {
        height: 80,
        justifyContent: 'flex-end',
    },
    chartLinesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: '100%',
    },
    chartBar: {
        width: 30,
        // backgroundColor handled dynamically
        borderRadius: 8,
    },
    mealCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 15,
        borderRadius: 20,
        marginBottom: 12,
        elevation: 2,
    },
    mealIcon: {
        width: 45,
        height: 45,
        borderRadius: 12,
        // backgroundColor handled dynamically
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    mealInfo: {
        flex: 1,
    },
    mealName: {
        ...FONTS.h4,
        color: COLORS.text,
        fontWeight: 'bold',
    },
    mealTime: {
        ...FONTS.body5,
        color: COLORS.textSecondary,
        fontSize: 10,
        marginBottom: 5,
    },
    mealMacros: {
        flexDirection: 'row',
        gap: 10,
    },
    mealMacroText: {
        fontSize: 9,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
    },
    mealCals: {
        ...FONTS.h4,
        // color handled dynamically
        fontWeight: 'bold',
    },
});

export default NutritionLogScreen;
