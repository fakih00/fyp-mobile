import React, { useContext, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView, Dimensions, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';

const { width } = Dimensions.get('window');
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const NutritionPlanScreen = ({ navigation }) => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = daysOfWeek[new Date().getDay()];

    const { meals, toggleMealComplete, nutritionGoal, isRecomp, macroTargets, colors: themeColors } = useContext(AppContext);
    const [selectedDay, setSelectedDay] = useState(today);
    const [selectedMeal, setSelectedMeal] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [floatingAnim] = useState(new Animated.Value(0));

    const currentDay = today; // Reuse the calculated today

    // Macro Targets (Dynamic from AppContext)
    const proteinTarget = macroTargets?.protein || Math.round((nutritionGoal * 0.3) / 4);
    const carbTarget = macroTargets?.carbs || Math.round((nutritionGoal * 0.4) / 4);
    const fatTarget = macroTargets?.fats || Math.round((nutritionGoal * 0.3) / 9);

    // Filter meals for the selected day
    const filteredMeals = useMemo(() => {
        return meals.filter(m => m.day === selectedDay);
    }, [meals, selectedDay]);

    const calculateTotalCalories = () => {
        const total = filteredMeals.reduce((acc, curr) => acc + curr.calories, 0);
        return total > 0 ? total : nutritionGoal; // Fallback to nutritionGoal
    };

    const calculateConsumedCalories = () => {
        return filteredMeals.filter(m => m.completed).reduce((acc, curr) => acc + curr.calories, 0);
    };

    const calculateConsumedProtein = () => filteredMeals.filter(m => m.completed).reduce((acc, curr) => acc + curr.protein, 0);
    const calculateConsumedCarbs = () => filteredMeals.filter(m => m.completed).reduce((acc, curr) => acc + curr.carbs, 0);
    const calculateConsumedFats = () => filteredMeals.filter(m => m.completed).reduce((acc, curr) => acc + curr.fats, 0);

    const handleOpenMealDetails = (meal) => {
        Haptics.selectionAsync();
        setSelectedMeal(meal);
        setIsModalVisible(true);
    };

    const handleLogMeal = (id) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toggleMealComplete(id);
        setIsModalVisible(false);
    };

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatingAnim, {
                    toValue: 0,
                    duration: 4000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const renderHeader = () => (
        <View style={styles.headerStack}>
            <LinearGradient
                colors={themeColors.gradient}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Floating Dumbbell Auras */}
            <Animated.View style={[
                styles.floatingIcon,
                {
                    top: 40,
                    left: 60,
                    opacity: 0.08,
                    transform: [
                        { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }) },
                        { rotate: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '25deg'] }) }
                    ]
                }
            ]}>
                <Ionicons name="fitness" size={40} color={COLORS.white} />
            </Animated.View>

            <Animated.View style={[
                styles.floatingIcon,
                {
                    bottom: 40,
                    right: 80,
                    opacity: 0.05,
                    transform: [
                        { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
                        { rotate: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-20deg'] }) }
                    ]
                }
            ]}>
                <Ionicons name="fitness" size={30} color={COLORS.white} />
            </Animated.View>
            <View style={styles.headerSafe}>
                <View style={styles.navRow}>
                    <View style={styles.headerSpacer} />
                    <View style={styles.titleStack}>
                        <Text style={styles.eliteTitle}>Nutrition Plan</Text>
                        {isRecomp ? (
                            <View style={[styles.recompBadgeElite, { backgroundColor: themeColors.accent + '33' }]}>
                                <Ionicons name="flash" size={10} color={themeColors.accent} />
                                <Text style={[styles.recompBadgeTextElite, { color: COLORS.white }]}>RECOMPOSITION MODE</Text>
                            </View>
                        ) : (
                            <Text style={styles.eliteSubtitle}>ELITE PERFORMANCE FUEL</Text>
                        )}
                    </View>
                    <TouchableOpacity style={styles.aiButtonElite}>
                        <BlurView intensity={20} tint="light" style={styles.backBlur}>
                            <Ionicons name="sparkles" size={20} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.daySelectorElite}
                    contentContainerStyle={styles.daySelectorContentElite}
                >
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setSelectedDay(day);
                            }}
                            style={[
                                styles.dayPill,
                                selectedDay === day && styles.dayPillActive
                            ]}
                        >
                            <Text style={[
                                styles.dayPillText,
                                selectedDay === day && styles.dayPillTextActive
                            ]}>
                                {day.substring(0, 3)}
                            </Text>
                            {day === currentDay && (
                                <Text style={[
                                    styles.todayLabel,
                                    selectedDay === day && { color: themeColors.accent }
                                ]}>TODAY</Text>
                            )}
                            {selectedDay === day && day !== currentDay && <View style={[styles.activeDot, { backgroundColor: themeColors.accent }]} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );

    const renderMacroDashboard = () => {
        const totalCals = calculateTotalCalories();
        const consumedCals = calculateConsumedCalories();
        const remaining = Math.max(totalCals - consumedCals, 0);
        const progress = totalCals > 0 ? (consumedCals / totalCals) : 0;

        const protein = calculateConsumedProtein();
        const carbs = calculateConsumedCarbs();
        const fats = calculateConsumedFats();

        return (
            <GlassCard style={styles.premiumDashboard}>
                <View style={styles.dashboardGrid}>
                    <View style={styles.mainRingSection}>
                        <View style={styles.outerRing}>
                            <BlurView intensity={10} tint="dark" style={styles.ringBlur}>
                                <View style={[styles.ringProgress, { height: `${progress * 100}%`, backgroundColor: themeColors.accent }]} />
                                <View style={styles.ringContent}>
                                    {isRecomp && <Text style={[styles.recompMiniLabel, { color: themeColors.accent }]}>RECOMP</Text>}
                                    <Text style={styles.remainingValElite}>{remaining}</Text>
                                    <Text style={styles.remainingLabElite}>KCAL LEFT</Text>
                                </View>
                            </BlurView>
                        </View>
                    </View>

                    <View style={styles.macroListElite}>
                        <MacroItem label="PROTEIN" val={protein} target={proteinTarget} color="#FF5252" />
                        <MacroItem label="CARBS" val={carbs} target={carbTarget} color="#448AFF" />
                        <MacroItem label="FATS" val={fats} target={fatTarget} color="#FFD740" />
                    </View>
                </View>

                <BlurView intensity={15} tint="light" style={[styles.aiEliteBox, { backgroundColor: themeColors.accent + '15' }]}>
                    <View style={[styles.aiEliteIcon, { backgroundColor: themeColors.accent }]}>
                        <Ionicons name="flash" size={14} color={COLORS.white} />
                    </View>
                    <Text style={styles.aiEliteMsg}>
                        {isRecomp
                            ? "AI Pivot: Targeting 40% protein to preserve muscle foundation while melting fat. Precision is key."
                            : "High protein intake detected. Your muscle recovery is currently optimized at 85%."}
                    </Text>
                </BlurView>
            </GlassCard>
        );
    };

    const MacroItem = ({ label, val, target, color }) => {
        const perc = Math.round((val / target) * 100);
        return (
            <View style={styles.macroRowElite}>
                <View style={styles.macroLabelRowElite}>
                    <Text style={styles.macroLabElite}>{label}</Text>
                    <Text style={styles.macroPercElite}>{perc}%</Text>
                </View>
                <View style={styles.macroBarElite}>
                    <View style={[styles.macroBarFillElite, { width: `${Math.min(perc, 100)}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.macroValElite}>{val}g <Text style={styles.macroSubElite}>/ {target}g</Text></Text>
            </View>
        );
    }

    const renderMeal = ({ item, index }) => (
        <AnimatedCard delay={index * 100} style={styles.mealCardContainer}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleOpenMealDetails(item)}
            >
                <GlassCard style={[styles.mealCardElite, item.completed && styles.mealCompletedElite]}>
                    <View style={styles.mealImageWrapper}>
                        <Image source={{ uri: item.image }} style={styles.mealImgElite} />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                            style={styles.mealImgOverlay}
                        />
                        <View style={styles.mealTypeTagElite}>
                            <Text style={styles.mealTypeTextElite}>{item.type.toUpperCase()}</Text>
                        </View>
                    </View>

                    <View style={styles.mealBodyElite}>
                        <View style={styles.mealHeaderElite}>
                            <Text style={styles.mealNameElite} numberOfLines={1}>{item.name}</Text>
                            <View style={[styles.checkCircleElite, item.completed && styles.checkCircleActiveElite]}>
                                {item.completed ? (
                                    <Ionicons name="shield-checkmark" size={18} color={COLORS.white} />
                                ) : (
                                    <Text style={styles.logBtnTextElite}>LOG</Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.mealMacroGrid}>
                            <View style={styles.miniMacroElite}>
                                <Text style={styles.miniMacroValElite}>{item.calories}</Text>
                                <Text style={styles.miniMacroLabElite}>KCAL</Text>
                            </View>
                            <View style={styles.miniMacroDivider} />
                            <View style={styles.miniMacroElite}>
                                <Text style={styles.miniMacroValElite}>{item.protein}g</Text>
                                <Text style={styles.miniMacroLabElite}>PRO</Text>
                            </View>
                            <View style={styles.miniMacroDivider} />
                            <View style={styles.miniMacroElite}>
                                <Text style={styles.miniMacroValElite}>{item.carbs}g</Text>
                                <Text style={styles.miniMacroLabElite}>CARB</Text>
                            </View>
                            <View style={styles.miniMacroDivider} />
                            <View style={styles.miniMacroElite}>
                                <Text style={styles.miniMacroValElite}>{item.fats}g</Text>
                                <Text style={styles.miniMacroLabElite}>FAT</Text>
                            </View>
                        </View>
                    </View>
                </GlassCard>
            </TouchableOpacity>
        </AnimatedCard>
    );

    return (
        <AuraBackground style={styles.container}>
            {renderHeader()}

            <FlatList
                data={filteredMeals}
                keyExtractor={item => item.id}
                renderItem={renderMeal}
                ListHeaderComponent={() => (
                    <View style={styles.listHeaderElite}>
                        {renderMacroDashboard()}
                        <View style={styles.sectionHeaderElite}>
                            <Text style={styles.sectionTitleElite}>{selectedDay}'s Fuel Plan</Text>
                            <View style={styles.sectionLine} />
                        </View>
                    </View>
                )}
                contentContainerStyle={styles.scrollPadding}
                showsVerticalScrollIndicator={false}
            />

            <MealDetailsModal
                visible={isModalVisible}
                meal={selectedMeal}
                currentDay={currentDay}
                onClose={() => setIsModalVisible(false)}
                onLog={handleLogMeal}
                themeColors={themeColors}
            />
        </AuraBackground>
    );
};

const MealDetailsModal = ({ visible, meal, currentDay, onClose, onLog, themeColors }) => {
    if (!meal) return null;

    const isToday = meal.day === currentDay;
    const isDisabled = meal.completed || !isToday;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.modalContent}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.modalImageWrapper}>
                            <Image source={{ uri: meal.image }} style={styles.modalImg} />
                            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                <Ionicons name="close" size={24} color={COLORS.white} />
                            </TouchableOpacity>
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.8)']}
                                style={styles.modalImgOverlay}
                            />
                            <View style={styles.modalTopInfo}>
                                <Text style={styles.modalMealType}>{meal.type.toUpperCase()}</Text>
                                <Text style={styles.modalMealName}>{meal.name}</Text>
                            </View>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.modalMacroDashboard}>
                                <View style={styles.modalMacroItem}>
                                    <Text style={styles.modalMacroVal}>{meal.calories}</Text>
                                    <Text style={styles.modalMacroLab}>KCAL</Text>
                                </View>
                                <View style={styles.modalMacroItem}>
                                    <Text style={styles.modalMacroVal}>{meal.protein}g</Text>
                                    <Text style={styles.modalMacroLab}>PRO</Text>
                                </View>
                                <View style={styles.modalMacroItem}>
                                    <Text style={styles.modalMacroVal}>{meal.carbs}g</Text>
                                    <Text style={styles.modalMacroLab}>CARB</Text>
                                </View>
                                <View style={styles.modalMacroItem}>
                                    <Text style={styles.modalMacroVal}>{meal.fats}g</Text>
                                    <Text style={styles.modalMacroLab}>FAT</Text>
                                </View>
                            </View>

                            <View style={styles.detailSection}>
                                <Text style={styles.detailTitle}>INGREDIENTS</Text>
                                {(meal.ingredients || []).map((ing, idx) => (
                                    <View key={idx} style={styles.ingredientRow}>
                                        <Ionicons name="radio-button-on" size={10} color="#10B981" />
                                        <Text style={styles.ingredientText}>{ing}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.detailSection}>
                                <Text style={styles.detailTitle}>PREPARATION</Text>
                                <Text style={styles.instructionText}>{meal.instructions}</Text>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        {!isToday && !meal.completed && (
                            <View style={styles.restrictionNotice}>
                                <Ionicons name="time" size={14} color="#F59E0B" />
                                <Text style={styles.restrictionText}>You can only log meals scheduled for today ({currentDay}).</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[styles.logActionBtn, isDisabled && styles.logActionBtnDisabled]}
                            onPress={() => onLog(meal.id)}
                            disabled={isDisabled}
                        >
                            <LinearGradient
                                colors={isDisabled ? ['#94A3B8', '#64748B'] : themeColors.gradient}
                                style={styles.logActionGrad}
                            >
                                <Text style={styles.logActionText}>
                                    {meal.completed ? 'MEAL LOGGED' : (isToday ? 'LOG THIS MEAL' : 'LOGGING DISABLED')}
                                </Text>
                                <Ionicons name={meal.completed ? "checkmark-circle" : (isToday ? "add-circle" : "lock-closed")} size={20} color={COLORS.white} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerStack: {
        height: 175,
        position: 'relative',
        zIndex: 10,
        overflow: 'visible',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    headerSafe: {
        flex: 1,
        paddingHorizontal: 20,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: -20,
    },
    headerSpacer: {
        width: 44,
    },
    backButtonElite: {
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
    titleStack: {
        alignItems: 'center',
    },
    eliteTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    eliteSubtitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 2,
        marginTop: 2,
    },
    aiButtonElite: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
    },
    recompBadgeElite: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 4,
        gap: 5,
    },
    recompBadgeTextElite: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
    daySelectorElite: {
        marginTop: 15,
        paddingLeft: 1,
    },
    daySelectorContentElite: {
        paddingRight: 20,
        paddingBottom: 2,
    },
    dayPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 10,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        minWidth: 55,
        height: 44,
        justifyContent: 'center',
    },
    dayPillActive: {
        backgroundColor: COLORS.surface,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    dayPillText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.8)',
    },
    dayPillTextActive: {
        color: '#064E3B',
    },
    todayLabel: {
        fontSize: 7,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        marginTop: 1,
        letterSpacing: 0.5,
    },
    todayLabelActive: {
        color: '#10B981',
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#10B981',
        marginTop: 4,
    },
    premiumDashboard: {
        marginTop: 10,
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 30,
        backgroundColor: COLORS.surface,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    dashboardGrid: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mainRingSection: {
        width: 130,
        height: 130,
        justifyContent: 'center',
        alignItems: 'center',
    },
    outerRing: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        overflow: 'hidden',
        backgroundColor: '#F1F5F9',
        justifyContent: 'flex-end',
    },
    ringBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringProgress: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        opacity: 0.15,
    },
    ringContent: {
        alignItems: 'center',
    },
    remainingValElite: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0F172A',
    },
    remainingLabElite: {
        fontSize: 8,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1,
    },
    recompMiniLabel: {
        fontSize: 7,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 1,
        marginBottom: -4,
    },
    macroListElite: {
        flex: 1,
        paddingLeft: 24,
        gap: 15,
    },
    macroRowElite: {
        gap: 6,
    },
    macroLabelRowElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    macroLabElite: {
        fontSize: 9,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    macroPercElite: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    macroBarElite: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    macroBarFillElite: {
        height: '100%',
        borderRadius: 3,
    },
    macroValElite: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0F172A',
    },
    macroSubElite: {
        fontSize: 9,
        fontWeight: 'normal',
        color: '#94A3B8',
    },
    aiEliteBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 25,
        padding: 14,
        borderRadius: 20,
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        overflow: 'hidden',
    },
    aiEliteIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    aiEliteMsg: {
        flex: 1,
        fontSize: 11,
        color: '#065F46',
        fontWeight: '600',
        lineHeight: 16,
    },
    listHeaderElite: {
        paddingBottom: 20,
    },
    sectionHeaderElite: {
        marginTop: 30,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 15,
    },
    sectionTitleElite: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    scrollPadding: {
        paddingBottom: 100,
    },
    mealCardContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    mealCardElite: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 28,
        backgroundColor: COLORS.surface,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    mealCompletedElite: {
        opacity: 0.6,
        transform: [{ scale: 0.98 }],
    },
    mealImageWrapper: {
        width: 100,
        height: 100,
        borderRadius: 22,
        overflow: 'hidden',
    },
    mealImgElite: {
        width: '100%',
        height: '100%',
    },
    mealImgOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    mealTypeTagElite: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    mealTypeTextElite: {
        fontSize: 8,
        fontWeight: '900',
        color: COLORS.white,
    },
    mealBodyElite: {
        flex: 1,
        marginLeft: 18,
        justifyContent: 'center',
    },
    mealHeaderElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    mealNameElite: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#0F172A',
        flex: 1,
        marginRight: 10,
    },
    checkCircleElite: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    checkCircleActiveElite: {
        borderColor: 'transparent',
    },
    logBtnTextElite: {
        fontSize: 8,
        fontWeight: '900',
    },
    mealMacroGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 8,
        borderRadius: 12,
    },
    miniMacroElite: {
        alignItems: 'center',
    },
    miniMacroValElite: {
        fontSize: 11,
        fontWeight: '800',
        color: '#334155',
    },
    miniMacroLabElite: {
        fontSize: 7,
        fontWeight: '900',
        color: '#94A3B8',
        marginTop: 1,
    },
    miniMacroDivider: {
        width: 1,
        height: 12,
        backgroundColor: '#E2E8F0',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        height: '85%',
        overflow: 'hidden',
    },
    modalImageWrapper: {
        height: 300,
        width: '100%',
        position: 'relative',
    },
    modalImg: {
        width: '100%',
        height: '100%',
    },
    closeBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    modalImgOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    modalTopInfo: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
    },
    modalMealType: {
        fontSize: 12,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 2,
        marginBottom: 8,
    },
    modalMealName: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    modalBody: {
        padding: 30,
    },
    modalMacroDashboard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 25,
        marginBottom: 30,
    },
    modalMacroItem: {
        alignItems: 'center',
    },
    modalMacroVal: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    modalMacroLab: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748B',
        marginTop: 4,
    },
    detailSection: {
        marginBottom: 30,
    },
    detailTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 1,
        marginBottom: 15,
    },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 12,
    },
    ingredientText: {
        fontSize: 15,
        color: '#475569',
        fontWeight: '500',
    },
    instructionText: {
        fontSize: 15,
        color: '#475569',
        lineHeight: 24,
    },
    modalFooter: {
        padding: 30,
        paddingTop: 10,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    logActionBtn: {
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
    },
    logActionBtnDisabled: {
        opacity: 0.8,
    },
    logActionGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    logActionText: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
    restrictionNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 15,
        marginBottom: 15,
        gap: 8,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    restrictionText: {
        fontSize: 11,
        color: '#B45309',
        fontWeight: '600',
        flex: 1,
    }
});

export default NutritionPlanScreen;
