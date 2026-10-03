import React, { useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    ScrollView,
    TouchableOpacity,
    Platform,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    FlatList,
    Animated,
    ActivityIndicator,
    PanResponder
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Pedometer } from 'expo-sensors';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop, G, Line, Rect, Polygon } from 'react-native-svg';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';

const { width } = Dimensions.get('window');
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ProgressScreen = ({ navigation }) => {
    const { user, loadUserData, consumedMacros, colors: themeColors } = useContext(AppContext);
    // Generate current week dates (Monday to Sunday)
    const getCurrentWeekDates = () => {
        const dates = [];
        const today = new Date();
        const day = today.getDay(); // 0 (Sun) to 6 (Sat)

        // Find Monday of this week
        // getDay returns 0 for Sunday, so we handle it to make Monday the start
        const diffToMonday = today.getDate() - (day === 0 ? 6 : day - 1);
        const monday = new Date(today.setDate(diffToMonday));

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push({
                full: d.toISOString().split('T')[0],
                day: d.toLocaleDateString('en-US', { weekday: 'long' }),
                short: d.toLocaleDateString('en-US', { weekday: 'short' }),
                date: d.getDate()
            });
        }
        return dates;
    };

    const WEEK_DATES = getCurrentWeekDates();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = daysOfWeek[new Date().getDay()];

    const [activeCategory, setActiveCategory] = useState('Weight');
    const [selectedDayStructure, setSelectedDayStructure] = useState(WEEK_DATES.find(d => d.day === todayDayName) || WEEK_DATES[0]);
    const [selectedDate, setSelectedDate] = useState(selectedDayStructure.full);
    const [selectedDayName, setSelectedDayName] = useState(todayDayName);
    const [showLogModal, setShowLogModal] = useState(false);
    const [newWeight, setNewWeight] = useState('');
    const [weightLoggedToday, setWeightLoggedToday] = useState(false);
    const [weightHistory, setWeightHistory] = useState([]);
    const [activityHistory, setActivityHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);

    // Pulse Data State
    const [sleepHours, setSleepHours] = useState(7);
    const [stressLevel, setStressLevel] = useState('medium');
    const [auditResult, setAuditResult] = useState(null);
    const [floatingAnim] = useState(new Animated.Value(0));

    // AI Progress Audit
    const [generatingAudit, setGeneratingAudit] = useState(false);
    const [auditData, setAuditData] = useState(null);

    // AI Trajectory Simulator
    const [trajSteps, setTrajSteps] = useState(8000);
    const [trajSleep, setTrajSleep] = useState(7);
    const [trajStress, setTrajStress] = useState('medium');
    const [trajWorkoutDays, setTrajWorkoutDays] = useState(3);
    const [trajCalorieDelta, setTrajCalorieDelta] = useState(-300);
    const [simulatingTrajectory, setSimulatingTrajectory] = useState(false);
    const [trajectoryResult, setTrajectoryResult] = useState(null);

    // AI Daily Bio-Advisory
    const [loadingBioAdvisory, setLoadingBioAdvisory] = useState(false);
    const [bioAdvisoryData, setBioAdvisoryData] = useState(null);
    const [bioAdvisoryLoaded, setBioAdvisoryLoaded] = useState(false);

    // Live Steps State
    const [sessionSteps, setSessionSteps] = useState(0);
    const [isTrajectoryExpanded, setIsTrajectoryExpanded] = useState(false);
    const [isSimulatorExpanded, setIsSimulatorExpanded] = useState(false);
    const [isBioExpanded, setIsBioExpanded] = useState(false);

    // Pedometer Effect
    useEffect(() => {
        let subscription;
        const subscribe = async () => {
            const isAvailable = await Pedometer.isAvailableAsync();
            if (isAvailable) {
                subscription = Pedometer.watchStepCount(result => {
                    setSessionSteps(result.steps);
                });
            }
        };

        subscribe();

        return () => {
            subscription && subscription.remove();
        };
    }, []);

    useEffect(() => {
        if (user?.user_id) {
            fetchData();
            checkWeightStatus();
        }

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
    }, [user?.user_id]);

    const checkWeightStatus = async () => {
        const res = await api.checkWeightLogged();
        if (res.status === 200) {
            setWeightLoggedToday(res.data.logged);
            // If not logged today, show modal
            if (!res.data.logged) {
                setShowLogModal(true);
            }
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [wRes, aRes, sRes, pRes, auditRes] = await Promise.all([
                api.getWeightHistory(), // Always full history
                api.getActivityHistory(selectedDate), // Filtered by date
                api.getProgressStats(selectedDate),   // Filtered by date
                api.predictProgress(),
                api.auditProgress()
            ]);

            if (wRes.status === 200) setWeightHistory(wRes.data.history || []);
            if (aRes.status === 200) setActivityHistory(aRes.data || []);
            if (sRes.status === 200) setStats(sRes.data);
            if (pRes.status === 200) setPrediction(pRes.data);
            if (auditRes.status === 200) setAuditResult(auditRes.data);
        } catch (err) {
            console.error("Fetch Data Error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Effect to re-fetch when date changes
    useEffect(() => {
        if (user?.user_id) {
            fetchData();
        }
    }, [selectedDate]);

    const handleDaySelect = (dayObj) => {
        Haptics.selectionAsync();
        setSelectedDayStructure(dayObj);
        setSelectedDate(dayObj.full);
        setSelectedDayName(dayObj.day);
    };

    // Transform weight data for chart
    const getChartData = () => {
        let history = [...weightHistory];

        if (stats && stats.start_weight && history.length < 7) {
            const startWt = parseFloat(stats.start_weight);
            if (history.length === 0 || parseFloat(history[0].weight) !== startWt) {
                history = [{ weight: startWt, date_logged: 'Start', isStart: true }, ...history];
            }
        }

        if (history.length === 0) return { data: [], minW: 0, maxW: 0 };

        const last7 = history.slice(-7);
        const weights = last7.map(d => parseFloat(d.weight));
        if (stats?.target_weight) weights.push(parseFloat(stats.target_weight));

        const max = Math.max(...weights);
        const min = Math.min(...weights);
        const rangeRaw = max - min || 1;
        const padding = rangeRaw * 0.2; // 20% padding

        const maxW = max + padding;
        const minW = Math.max(0, min - padding);
        const range = maxW - minW || 1;

        const data = last7.map(d => {
            let dayLabel = d.isStart ? 'Start' : '??';
            if (!d.isStart) {
                try {
                    const rawDate = d.date_logged || d.date;
                    if (rawDate) {
                        const parts = rawDate.split(' ')[0].split('-');
                        if (parts.length === 3) {
                            const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                            if (!isNaN(dateObj.getTime())) {
                                dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                            }
                        }
                    }
                } catch (e) { }
            }

            return {
                day: dayLabel,
                weight: parseFloat(d.weight),
                norm: (parseFloat(d.weight) - minW) / range
            };
        });

        return { data, minW, maxW };
    };

    const WeightLineChart = ({ chartData, minW, maxW, targetWeight }) => {
        if (!chartData || chartData.length === 0) return null;

        const [activeIndex, setActiveIndex] = useState(null);
        const chartHeight = 220; // Expanded for tooltip headroom
        const topPadding = 50;   // Space for tooltip
        const drawHeight = 140;  // Actual drawing area for the line
        const labelAreaWidth = 40;
        const containerWidth = width - 90;
        const mainSvgWidth = containerWidth - labelAreaWidth;
        const sidePadding = 15;
        const drawWidth = mainSvgWidth - (sidePadding * 2);

        const isSinglePoint = chartData.length === 1;
        const gap = isSinglePoint ? 0 : drawWidth / (chartData.length - 1);

        const points = chartData.map((d, i) => ({
            x: sidePadding + (isSinglePoint ? drawWidth / 2 : i * gap),
            y: topPadding + (drawHeight - (d.norm * drawHeight))
        }));

        const panResponder = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => handleTouch(evt),
            onPanResponderMove: (evt) => handleTouch(evt),
            onPanResponderRelease: () => setActiveIndex(null),
            onPanResponderTerminate: () => setActiveIndex(null),
        });

        const handleTouch = (evt) => {
            const x = evt.nativeEvent.locationX;
            const relativeX = x - labelAreaWidth;

            let closest = 0;
            let minDist = Math.abs(points[0].x - relativeX);

            for (let i = 1; i < points.length; i++) {
                const dist = Math.abs(points[i].x - relativeX);
                if (dist < minDist) {
                    minDist = dist;
                    closest = i;
                }
            }

            if (closest !== activeIndex) {
                setActiveIndex(closest);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        };

        const getCurvePath = (pts) => {
            if (pts.length < 2) return '';
            let d = `M ${pts[0].x} ${pts[0].y}`;
            for (let i = 0; i < pts.length - 1; i++) {
                const p0 = pts[Math.max(i - 1, 0)];
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const p3 = pts[Math.min(i + 2, pts.length - 1)];
                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;
                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
            }
            return d;
        };

        const pathData = isSinglePoint ? '' : getCurvePath(points);
        let goalY = null;
        if (targetWeight) {
            const range = maxW - minW || 1;
            const normGoal = (targetWeight - minW) / range;
            goalY = topPadding + (drawHeight - (normGoal * drawHeight));
        }

        const renderGridLine = (val) => {
            const range = maxW - minW || 1;
            const norm = (val - minW) / range;
            const y = topPadding + (drawHeight - (norm * drawHeight));
            if (y < topPadding || y > (topPadding + drawHeight)) return null;
            return (
                <View key={val} style={[styles.gridLineContainerElite, { top: y }]}>
                    <Text style={styles.gridLabelElite}>{val.toFixed(0)}</Text>
                    <View style={styles.gridLineElite} />
                </View>
            );
        };

        const gridValues = [minW, (minW + maxW) / 2, maxW];

        return (
            <View style={[styles.eliteChartWrapper, { height: chartHeight + 40 }]} {...panResponder.panHandlers}>
                <View style={[styles.svgContainerElite, { height: chartHeight }]}>
                    <View style={styles.gridOverlayElite}>
                        {gridValues.map(renderGridLine)}
                    </View>

                    <Svg height={chartHeight} width={mainSvgWidth} style={{ marginLeft: labelAreaWidth }}>
                        <Defs>
                            <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={themeColors.accent} stopOpacity="0.15" />
                                <Stop offset="1" stopColor={themeColors.accent} stopOpacity="0" />
                            </SvgGradient>
                            <SvgGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={themeColors.accent} stopOpacity="0.5" />
                                <Stop offset="1" stopColor={themeColors.accent} stopOpacity="0.1" />
                            </SvgGradient>
                        </Defs>

                        {!isSinglePoint && (
                            <Path
                                d={`${pathData} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`}
                                fill="url(#areaGrad)"
                            />
                        )}

                        {goalY !== null && goalY >= 0 && goalY <= chartHeight && (
                            <Path
                                d={`M 0 ${goalY} L ${mainSvgWidth} ${goalY}`}
                                stroke="#F59E0B"
                                strokeWidth="1.5"
                                strokeDasharray="6,4"
                                opacity="0.4"
                            />
                        )}

                        {activeIndex !== null && (
                            <Line
                                x1={points[activeIndex].x}
                                y1="0"
                                x2={points[activeIndex].x}
                                y2={chartHeight}
                                stroke="#E2E8F0"
                                strokeWidth="1"
                                strokeDasharray="4,4"
                            />
                        )}

                        {/* Glow Layer */}
                        {!isSinglePoint && (
                            <Path
                                d={pathData}
                                fill="none"
                                stroke={themeColors.accent}
                                strokeWidth="8"
                                strokeOpacity="0.1"
                                strokeLinecap="round"
                            />
                        )}

                        {!isSinglePoint && (
                            <Path
                                d={pathData}
                                fill="none"
                                stroke={themeColors.accent}
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                        )}

                        {points.map((p, i) => (
                            <G key={i}>
                                {i === activeIndex && (
                                    <Circle
                                        cx={p.x}
                                        cy={p.y}
                                        r="12"
                                        fill={themeColors.accent + '33'}
                                    />
                                )}
                                <Circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={i === activeIndex ? 8 : 6}
                                    fill="#FFFFFF"
                                    opacity="0.8"
                                />
                                <Circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={i === activeIndex ? 5 : 4}
                                    fill={themeColors.accent}
                                />
                            </G>
                        ))}

                        {activeIndex !== null && (
                            <G x={points[activeIndex].x - 40} y={points[activeIndex].y - 50}>
                                <Rect
                                    width="80"
                                    height="35"
                                    rx="8"
                                    fill="#1E293B"
                                />
                                <Polygon
                                    points="35,35 45,35 40,42"
                                    fill="#1E293B"
                                />
                            </G>
                        )}
                    </Svg>

                    {activeIndex !== null && (
                        <View style={[styles.chartTooltipElite, {
                            top: points[activeIndex].y - 50,
                            left: points[activeIndex].x + labelAreaWidth - 40
                        }]}>
                            <Text style={styles.tooltipWeight}>{chartData[activeIndex].weight}kg</Text>
                            <Text style={styles.tooltipDay}>{chartData[activeIndex].day.toUpperCase()}</Text>
                        </View>
                    )}
                </View>

                <View style={[styles.xAxisElite, { marginLeft: labelAreaWidth, width: mainSvgWidth }]}>
                    {chartData.map((d, i) => (
                        <Text key={i} style={[
                            styles.xAxisLabElite,
                            { left: points[i].x - 15 },
                            i === activeIndex && { color: '#0F172A', fontWeight: '900' }
                        ]}>{d.day}</Text>
                    ))}
                </View>

                <View style={styles.chartLegendElite}>
                    <View style={styles.legendItemElite}>
                        <View style={[styles.legendDotElite, { backgroundColor: themeColors.accent }]} />
                        <Text style={styles.legendTextElite}>Actual Weight</Text>
                    </View>
                    <View style={styles.legendItemElite}>
                        <View style={[styles.legendDashElite, { backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.legendTextElite}>Goal Checkpoint</Text>
                    </View>
                </View>
            </View>
        );
    };

    const { data: weightData, minW, maxW } = getChartData();

    const handleMetricChange = (metric) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedMetric(metric);
    };

    const handleLogWeight = async () => {
        if (!newWeight) return;
        const res = await api.logDailyPulse(
            newWeight,
            sleepHours,
            stressLevel,
            stats?.steps_estimate || 0
        );
        if (res.status === 200) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowLogModal(false);
            setNewWeight('');
            fetchData();
            if (loadUserData) loadUserData(user.user_id);
        }
    };

    const handleAdaptPlans = async () => {
        setLoading(true);
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await Promise.all([
                api.post('generatePlan', { type: 'workout' }),
                api.post('generatePlan', { type: 'nutrition' })
            ]);
            fetchData();
            alert("AI has recalibrated your plans! You can view them in the Workout and Nutrition sections.");
        } catch (err) {
            console.error("Adapt Plans Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAudit = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setGeneratingAudit(true);
        try {
            const res = await api.getProgressAudit();
            if (res.status === 200) {
                setAuditData(res.data);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                alert(res.data?.message || "Failed to generate AI Audit. Please try again.");
            }
        } catch (err) {
            console.error("AI Audit Error:", err);
            alert("Connection error. Could not reach the AI Coach.");
        } finally {
            setGeneratingAudit(false);
        }
    };

    const handleSimulateTrajectory = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSimulatingTrajectory(true);
        try {
            const res = await api.simulateTrajectory({
                steps: trajSteps,
                sleep: trajSleep,
                stress: trajStress,
                workout_days: trajWorkoutDays,
                calorie_delta: trajCalorieDelta,
            });
            if (res.status === 200) {
                setTrajectoryResult(res.data);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                alert(res.data?.message || "Could not simulate trajectory. Try again.");
            }
        } catch (err) {
            console.error("Trajectory Simulation Error:", err);
            alert("Connection error. Could not reach the AI Engine.");
        } finally {
            setSimulatingTrajectory(false);
        }
    };

    const handleLoadBioAdvisory = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setLoadingBioAdvisory(true);
        try {
            const res = await api.getDailyBioAdvisory();
            if (res.status === 200) {
                setBioAdvisoryData(res.data);
                setBioAdvisoryLoaded(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                alert(res.data?.message || "Could not load daily advisory.");
            }
        } catch (err) {
            console.error("Bio Advisory Error:", err);
        } finally {
            setLoadingBioAdvisory(false);
        }
    };



    const renderProgressAudit = () => {
        return (
            <View style={styles.sectionElite}>
                <View style={styles.sectionHeaderElite}>
                    <View>
                        <Text style={styles.sectionTitleElite}>AI Progress Audit</Text>
                        <Text style={styles.sectionSubTitleElite}>BIO-METRIC PATHWAY EVALUATION</Text>
                    </View>
                    <View style={[styles.eliteBadge, { backgroundColor: themeColors.accent + '15' }]}>
                        <Text style={[styles.eliteBadgeText, { color: themeColors.accent }]}>COACH INTELLIGENCE</Text>
                    </View>
                </View>

                {!auditData ? (
                    <GlassCard style={styles.auditTriggerCard}>
                        <View style={styles.auditTriggerContent}>
                            <View style={styles.auditTriggerIconBox}>
                                <Ionicons name="sparkles" size={28} color={themeColors.accent} />
                            </View>
                            <Text style={styles.auditTriggerTitle}>Request AI Progress Audit</Text>
                            <Text style={styles.auditTriggerDesc}>
                                Let Local ProgressAI analyze your workouts, nutrition logs, sleep, stress, and weight changes to generate a custom performance report.
                            </Text>
                            <TouchableOpacity 
                                style={[styles.auditBtn, { backgroundColor: themeColors.accent }]} 
                                onPress={handleGenerateAudit}
                                disabled={generatingAudit}
                            >
                                {generatingAudit ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="analytics" size={16} color="#FFF" style={{ marginRight: 6 }} />
                                        <Text style={styles.auditBtnText}>RUN AI DIAGNOSTICS</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                ) : (
                    <View style={styles.auditContainer}>
                        <GlassCard style={styles.auditReportCard}>
                            <View style={styles.auditReportHeader}>
                                <View style={[styles.statusBadge, { backgroundColor: auditData.status === 'On Track' ? '#D1FAE5' : (auditData.status === 'Stalled' ? '#FEF3C7' : '#FEE2E2') }]}>
                                    <Text style={[styles.statusBadgeText, { color: auditData.status === 'On Track' ? '#065F46' : (auditData.status === 'Stalled' ? '#92400E' : '#991B1B') }]}>
                                        STATUS: {auditData.status?.toUpperCase() || 'UNKNOWN'}
                                    </Text>
                                </View>
                                <TouchableOpacity style={styles.refreshAuditBtn} onPress={handleGenerateAudit} disabled={generatingAudit}>
                                    {generatingAudit ? (
                                        <ActivityIndicator size="small" color={themeColors.accent} />
                                    ) : (
                                        <Ionicons name="refresh" size={16} color="#64748B" />
                                    )}
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.auditSummaryText}>"{auditData.summary}"</Text>

                            {/* Accomplishments */}
                            <View style={styles.auditSubSection}>
                                <Text style={styles.auditSectionSubTitle}>KEY ACCOMPLISHMENTS</Text>
                                {(auditData.accomplishments || []).map((item, idx) => (
                                    <View key={idx} style={styles.auditItemRow}>
                                        <Ionicons name="checkmark-circle" size={16} color={themeColors.accent} style={{ marginRight: 8 }} />
                                        <Text style={styles.auditItemText}>{item}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Concerns */}
                            {(auditData.concerns || []).length > 0 && (
                                <View style={styles.auditSubSection}>
                                    <Text style={[styles.auditSectionSubTitle, { color: '#EF4444' }]}>AREAS OF ATTENTION</Text>
                                    {(auditData.concerns || []).map((item, idx) => (
                                        <View key={idx} style={styles.auditItemRow}>
                                            <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                                            <Text style={styles.auditItemText}>{item}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Recommendations */}
                            <View style={styles.auditSubSection}>
                                <Text style={[styles.auditSectionSubTitle, { color: '#3B82F6' }]}>COACH RECOMMENDATIONS</Text>
                                {(auditData.recommendations || []).map((item, idx) => (
                                    <View key={idx} style={styles.auditItemRow}>
                                        <Ionicons name="arrow-forward-circle" size={16} color="#3B82F6" style={{ marginRight: 8 }} />
                                        <Text style={styles.auditItemText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </GlassCard>
                    </View>
                )}
            </View>
        );
    };

    const renderLoggedMealsProgress = () => {
        const meals = activityHistory.filter(item => item.type === 'MEAL');

        if (meals.length === 0) return (
            <View style={styles.emptyActivityBoxElite}>
                <Ionicons name="restaurant-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyActivityTextElite}>No meals logged for {selectedDayName}.</Text>
            </View>
        );

        return (
            <View style={styles.innerSectionElite}>
                <View style={[styles.sectionHeaderElite, { paddingHorizontal: 0, marginTop: 25 }]}>
                    <Text style={styles.innerSectionTitleElite}>Daily Fuel Logs</Text>
                </View>
                {meals.map((meal, idx) => (
                    <View key={idx} style={styles.inlineMealItemElite}>
                        <View style={styles.inlineMealIconBox}>
                            <Ionicons name="restaurant" size={18} color="#3B82F6" />
                        </View>
                        <View style={styles.inlineMealContent}>
                            <Text style={styles.inlineMealTitle}>{meal.title}</Text>
                            <Text style={styles.inlineMealSub}>{meal.subtitle}</Text>
                        </View>
                        <View style={styles.inlineMealValueGroup}>
                            <Text style={styles.inlineMealCals}>{meal.calories || '--'} kcal</Text>
                            <View style={styles.inlineMealStatusPill}>
                                <Text style={styles.inlineMealStatusText}>LOGGED</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderLoggedWorkoutsProgress = () => {
        const workouts = activityHistory.filter(item => item.type === 'WORKOUT');

        if (workouts.length === 0) return (
            <View style={styles.emptyActivityBoxElite}>
                <Ionicons name="fitness-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyActivityTextElite}>No workouts logged for {selectedDayName}.</Text>
            </View>
        );

        return (
            <View style={styles.innerSectionElite}>
                <View style={[styles.sectionHeaderElite, { paddingHorizontal: 0, marginTop: 25 }]}>
                    <Text style={styles.innerSectionTitleElite}>Daily Training Logs</Text>
                </View>
                {workouts.map((workout, idx) => (
                    <View key={idx} style={styles.inlineWorkoutItemElite}>
                        <View style={styles.inlineWorkoutIconBox}>
                            <Ionicons name="fitness" size={18} color={themeColors.accent} />
                        </View>
                        <View style={styles.inlineWorkoutContent}>
                            <Text style={styles.inlineWorkoutTitle}>{workout.title}</Text>
                            <Text style={styles.inlineWorkoutSub}>{workout.subtitle}</Text>
                        </View>
                        <View style={styles.inlineWorkoutValueGroup}>
                            <Text style={styles.inlineWorkoutDuration}>{workout.duration || '--'} min</Text>
                            <View style={styles.inlineWorkoutStatusPill}>
                                <Text style={styles.inlineWorkoutStatusText}>DONE</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderWeightExecutiveSummary = () => {
        const totalProgress = stats?.total_progress || 0;
        const velocity = stats?.weekly_velocity || 0;
        const distance = stats?.goal_distance || 0;
        const trendColor = velocity <= 0 ? themeColors.accent : '#EF4444'; // theme accent for progress, red for gain

        return (
            <View style={styles.weightExecutiveBox}>
                <View style={styles.weightMainRow}>
                    <View style={styles.weightMetricElite}>
                        <Text style={[styles.weightMetricVal, { color: totalProgress <= 0 ? themeColors.accent : '#F59E0B' }]}>
                            {totalProgress > 0 ? '+' : ''}{totalProgress}
                            <Text style={styles.weightMetricUnit}>KG</Text>
                        </Text>
                        <Text style={styles.weightMetricLab}>TOTAL PROGRESS</Text>
                    </View>
                    <View style={styles.weightMetricElite}>
                        <Text style={[styles.weightMetricVal, { color: trendColor }]}>
                            {velocity > 0 ? '+' : ''}{velocity}
                            <Text style={styles.weightMetricUnit}>/WK</Text>
                        </Text>
                        <Text style={styles.weightMetricLab}>VELOCITY</Text>
                    </View>
                </View>

                <View style={styles.goalProgressGroup}>
                    <View style={styles.goalHeader}>
                        <Text style={styles.goalLabel}>DISTANCE TO GOAL</Text>
                        <Text style={styles.goalCounter}>{distance} KG LEFT</Text>
                    </View>
                    <View style={styles.goalTrack}>
                        <View style={[styles.goalFill, { width: `${stats?.percentage || 0}%` }]} />
                    </View>
                </View>
            </View>
        );
    };

    const renderActivityExecutiveSummary = () => {
        const totalVolume = stats?.total_volume || '0';
        const totalDuration = stats?.avg_duration || '0';
        const frequencyGoal = stats?.freq_goal || 4;
        const currentFreq = stats?.current_freq || 0;
        const freqPerc = Math.round((currentFreq / frequencyGoal) * 100);

        return (
            <View style={styles.activityExecutiveBox}>
                <View style={styles.activityMainRow}>
                    <View style={styles.activityMetricElite}>
                        <Text style={styles.activityMetricVal}>{totalVolume}<Text style={styles.activityMetricUnit}>KG</Text></Text>
                        <Text style={styles.activityMetricLab}>TOTAL VOLUME</Text>
                    </View>
                    <View style={styles.activityMetricElite}>
                        <Text style={styles.activityMetricVal}>{totalDuration}<Text style={styles.activityMetricUnit}>MIN</Text></Text>
                        <Text style={styles.activityMetricLab}>AVG DURATION</Text>
                    </View>
                </View>

                <View style={styles.freqProgressGroup}>
                    <View style={styles.freqHeader}>
                        <Text style={styles.freqLabel}>FREQUENCY GOAL</Text>
                        <Text style={styles.freqCounter}>{currentFreq}/{frequencyGoal} DAYS</Text>
                    </View>
                    <View style={styles.freqTrack}>
                        <View style={[styles.freqFill, { width: `${freqPerc}%` }]} />
                    </View>
                </View>
            </View>
        );
    };

    const renderLifestyleExecutiveSummary = () => {
        const sleepScore = stats?.sleep_score || 0;
        const stressLevel = stats?.stress_index || 0;
        const recoveryStatus = sleepScore > 80 && stressLevel < 40 ? 'PEAK RECOVERY' : (sleepScore < 50 || stressLevel > 70 ? 'FATIGUE WARNING' : 'MODERATE RECOVERY');
        const recoveryColor = sleepScore > 80 && stressLevel < 40 ? themeColors.accent : (sleepScore < 50 || stressLevel > 70 ? '#EF4444' : '#F59E0B');

        return (
            <View style={styles.lifestyleExecutiveBox}>
                <View style={styles.recoveryRowElite}>
                    <View style={styles.recoveryMetricElite}>
                        <View style={styles.recoveryHeaderElite}>
                            <Ionicons name="moon" size={14} color="#6366F1" />
                            <Text style={styles.recoveryLabElite}>SLEEP QUALITY</Text>
                        </View>
                        <Text style={styles.recoveryValElite}>{sleepScore}<Text style={styles.recoveryUnitElite}>/100</Text></Text>
                    </View>
                    <View style={styles.recoveryDividerElite} />
                    <View style={styles.recoveryMetricElite}>
                        <View style={styles.recoveryHeaderElite}>
                            <Ionicons name="flash" size={14} color="#F59E0B" />
                            <Text style={styles.recoveryLabElite}>STRESS INDEX</Text>
                        </View>
                        <Text style={styles.recoveryValElite}>{stressLevel}<Text style={styles.recoveryUnitElite}>%</Text></Text>
                    </View>
                </View>

                <View style={[styles.recoveryStatusCard, { backgroundColor: recoveryColor + '10', borderColor: recoveryColor + '20' }]}>
                    <View style={[styles.recoveryStatusDot, { backgroundColor: recoveryColor }]} />
                    <Text style={[styles.recoveryStatusText, { color: recoveryColor }]}>{recoveryStatus}</Text>
                </View>
            </View>
        );
    };

    // ─── AI Trajectory Simulator ──────────────────────────────────────
    const renderTrajectorySimulator = () => {
        const plateauColors = { Low: themeColors.accent, Medium: '#F59E0B', High: '#EF4444' };
        const stepsOptions = [3000, 5000, 8000, 10000, 12000, 15000];
        const sleepOptions = [4, 5, 6, 7, 8, 9];
        const stressOptions = ['low', 'medium', 'high'];
        const workoutOptions = [1, 2, 3, 4, 5, 6];
        const calorieOptions = [-700, -500, -300, 0, 200, 400];

        const efficiencyColor = trajectoryResult
            ? (trajectoryResult.efficiency_score >= 75 ? themeColors.accent : trajectoryResult.efficiency_score >= 50 ? '#F59E0B' : '#EF4444')
            : '#64748B';

        return (
            <View style={styles.sectionElite}>
                <TouchableOpacity 
                    activeOpacity={0.8}
                    style={styles.trajectoryHeaderBtn}
                    onPress={() => {
                        Haptics.selectionAsync();
                        setIsSimulatorExpanded(!isSimulatorExpanded);
                    }}
                >
                    <View style={styles.trajectoryHeaderLeft}>
                        <LinearGradient
                            colors={themeColors.gradient}
                            style={styles.trajectoryIconBox}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="pulse" size={20} color="#FFF" />
                        </LinearGradient>
                        <View>
                            <Text style={[styles.sectionTitleElite, { marginBottom: 2 }]}>AI Trajectory Simulator</Text>
                            <Text style={styles.sectionSubTitleElite}>30-DAY WEIGHT PROJECTION ENGINE</Text>
                        </View>
                    </View>
                    <Ionicons 
                        name={isSimulatorExpanded ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={COLORS.text + '80'} 
                    />
                </TouchableOpacity>

                {isSimulatorExpanded && (
                    <View style={{ marginTop: 10 }}>
                        <GlassCard style={styles.trajCard}>
                    {/* Daily Steps */}
                    <Text style={styles.trajLabel}>DAILY STEPS TARGET</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ paddingRight: 8 }}>
                        {stepsOptions.map(s => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.trajPill, trajSteps === s && { backgroundColor: themeColors.accent, borderColor: themeColors.accent }]}
                                onPress={() => { Haptics.selectionAsync(); setTrajSteps(s); setTrajectoryResult(null); }}
                            >
                                <Text style={[styles.trajPillText, trajSteps === s && styles.trajPillTextActive]}>
                                    {s >= 1000 ? `${(s/1000).toFixed(0)}k` : s}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Sleep */}
                    <Text style={styles.trajLabel}>SLEEP HOURS / NIGHT</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ paddingRight: 8 }}>
                        {sleepOptions.map(h => (
                            <TouchableOpacity
                                key={h}
                                style={[styles.trajPill, trajSleep === h && { backgroundColor: themeColors.accent, borderColor: themeColors.accent }]}
                                onPress={() => { Haptics.selectionAsync(); setTrajSleep(h); setTrajectoryResult(null); }}
                            >
                                <Text style={[styles.trajPillText, trajSleep === h && styles.trajPillTextActive]}>{h}h</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Stress */}
                    <Text style={styles.trajLabel}>STRESS LEVEL</Text>
                    <View style={[styles.stressRow, { marginBottom: 14 }]}>
                        {stressOptions.map(s => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.trajStressBtn, trajStress === s && {
                                    backgroundColor: s === 'low' ? '#10B981' : s === 'medium' ? '#F59E0B' : '#EF4444',
                                    borderColor: s === 'low' ? '#10B981' : s === 'medium' ? '#F59E0B' : '#EF4444',
                                }]}
                                onPress={() => { Haptics.selectionAsync(); setTrajStress(s); setTrajectoryResult(null); }}
                            >
                                <Text style={[styles.trajStressBtnText, trajStress === s && { color: '#FFF' }]}>{s.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Workout Days */}
                    <Text style={styles.trajLabel}>WORKOUT DAYS / WEEK</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ paddingRight: 8 }}>
                        {workoutOptions.map(d => (
                            <TouchableOpacity
                                key={d}
                                style={[styles.trajPill, trajWorkoutDays === d && { backgroundColor: themeColors.accent, borderColor: themeColors.accent }]}
                                onPress={() => { Haptics.selectionAsync(); setTrajWorkoutDays(d); setTrajectoryResult(null); }}
                            >
                                <Text style={[styles.trajPillText, trajWorkoutDays === d && styles.trajPillTextActive]}>{d}d</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Calorie Delta */}
                    <Text style={styles.trajLabel}>CALORIE ADJUSTMENT (vs Maintenance)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ paddingRight: 8 }}>
                        {calorieOptions.map(c => (
                            <TouchableOpacity
                                key={c}
                                style={[styles.trajPill, trajCalorieDelta === c && { backgroundColor: themeColors.accent, borderColor: themeColors.accent }, c < 0 && trajCalorieDelta !== c && { borderColor: themeColors.accent + '80' }]}
                                onPress={() => { Haptics.selectionAsync(); setTrajCalorieDelta(c); setTrajectoryResult(null); }}
                            >
                                <Text style={[styles.trajPillText, trajCalorieDelta === c && styles.trajPillTextActive]}>
                                    {c > 0 ? `+${c}` : c} kcal
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Simulate Button */}
                    <TouchableOpacity
                        style={[styles.trajSimulateBtn, { backgroundColor: themeColors.accent, shadowColor: themeColors.accent }, simulatingTrajectory && { opacity: 0.7 }]}
                        onPress={handleSimulateTrajectory}
                        disabled={simulatingTrajectory}
                    >
                        {simulatingTrajectory ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="pulse" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                 <Text style={styles.trajSimulateBtnText}>SIMULATE 30-DAY TRAJECTORY</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </GlassCard>

                {/* Results */}
                {trajectoryResult && (
                    <GlassCard style={styles.trajResultCard}>
                                {/* Header Row */}
                                <View style={styles.trajResultHeader}>
                                    <Text style={styles.trajResultTitle}>Projected Outcome</Text>
                                    <TouchableOpacity onPress={() => setTrajectoryResult(null)}>
                                        <Ionicons name="close-circle" size={20} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>

                                {/* Big stat row */}
                                <View style={styles.trajStatRow}>
                                    <View style={styles.trajStatBox}>
                                        <Text style={styles.trajStatValue}>{trajectoryResult.predicted_weight?.toFixed(1) ?? '--'}</Text>
                                        <Text style={styles.trajStatUnit}>kg in 30d</Text>
                                    </View>
                                    <View style={[styles.trajStatBox, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0' }]}>
                                        <Text style={[styles.trajStatValue, { color: (trajectoryResult.weekly_change ?? 0) < 0 ? themeColors.accent : '#EF4444' }]}>
                                            {(trajectoryResult.weekly_change ?? 0) > 0 ? '+' : ''}{trajectoryResult.weekly_change?.toFixed(2) ?? '--'}
                                        </Text>
                                        <Text style={styles.trajStatUnit}>kg / week</Text>
                                    </View>
                                    <View style={[styles.trajStatBox, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0' }]}>
                                        <Text style={[styles.trajStatValue, { color: efficiencyColor }]}>
                                            {trajectoryResult.efficiency_score ?? '--'}
                                        </Text>
                                        <Text style={styles.trajStatUnit}>efficiency</Text>
                                    </View>
                                </View>

                                {/* ETA + Plateau Risk */}
                                <View style={styles.trajTagRow}>
                                    <View style={[styles.trajTag, { backgroundColor: `${themeColors.accent}15` }]}>
                                        <Ionicons name="calendar" size={13} color={themeColors.accent} style={{ marginRight: 4 }} />
                                        <Text style={[styles.trajTagText, { color: themeColors.accent }]}>
                                            {trajectoryResult.days_to_goal ? `Goal in ~${trajectoryResult.days_to_goal}d` : 'Goal >90 days'}
                                        </Text>
                                    </View>
                                    <View style={[styles.trajTag, { backgroundColor: `${plateauColors[trajectoryResult.plateau_risk] ?? '#94A3B8'}18` }]}>
                                        <Ionicons name="warning" size={13} color={plateauColors[trajectoryResult.plateau_risk] ?? '#94A3B8'} style={{ marginRight: 4 }} />
                                        <Text style={[styles.trajTagText, { color: plateauColors[trajectoryResult.plateau_risk] ?? '#94A3B8' }]}>
                                            {trajectoryResult.plateau_risk ?? 'Unknown'} Plateau Risk
                                        </Text>
                                    </View>
                                </View>

                                {/* Analysis */}
                                <Text style={styles.trajAnalysisText}>{trajectoryResult.analysis}</Text>

                                {/* Key Factors */}
                                {(trajectoryResult.key_factors || []).length > 0 && (
                                    <View style={styles.trajFactorsBox}>
                                        <Text style={styles.trajFactorsTitle}>KEY DRIVING FACTORS</Text>
                                        {(trajectoryResult.key_factors || []).map((f, i) => (
                                            <View key={i} style={styles.trajFactorRow}>
                                                <View style={styles.trajFactorDot} />
                                                <Text style={styles.trajFactorText}>{f}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </GlassCard>
                        )}
                    </View>
                )}
            </View>
        );
    };

    // ─── AI Daily Bio-Advisory ────────────────────────────────────────
    const renderBioAdvisory = () => {
        const statusColorMap = {
            green: themeColors.accent,
            yellow: '#F59E0B',
            red: '#EF4444',
            blue: '#3B82F6',
        };
        const statusBgMap = {
            green: '#ECFDF5',
            yellow: '#FEF3C7',
            red: '#FEF2F2',
            blue: '#EFF6FF',
        };

        const statusColor = statusColorMap[bioAdvisoryData?.status_color] ?? '#6366F1';
        const statusBg = statusBgMap[bioAdvisoryData?.status_color] ?? '#EEF2FF';

        return (
            <View style={styles.sectionElite}>
                <TouchableOpacity 
                    activeOpacity={0.8}
                    style={styles.trajectoryHeaderBtn}
                    onPress={() => {
                        Haptics.selectionAsync();
                        setIsBioExpanded(!isBioExpanded);
                    }}
                >
                    <View style={styles.trajectoryHeaderLeft}>
                        <LinearGradient
                            colors={themeColors.gradient}
                            style={styles.trajectoryIconBox}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="sunny" size={20} color="#FFF" />
                        </LinearGradient>
                        <View>
                            <Text style={[styles.sectionTitleElite, { marginBottom: 2 }]}>AI Daily Bio-Advisory</Text>
                            <Text style={styles.sectionSubTitleElite}>PERSONALIZED MORNING BRIEFING</Text>
                        </View>
                    </View>
                    <Ionicons 
                        name={isBioExpanded ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={COLORS.text + '80'} 
                    />
                </TouchableOpacity>

                {isBioExpanded && (
                    <View style={{ marginTop: 10 }}>
                        {!bioAdvisoryLoaded ? (
                            <GlassCard style={styles.bioTriggerCard}>
                                <View style={styles.bioTriggerInner}>
                                    <LinearGradient
                                        colors={themeColors.gradient}
                                        style={styles.bioTriggerIconBox}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name="sunny" size={26} color="#FFF" />
                                    </LinearGradient>
                                    <Text style={[styles.bioTriggerTitle, { color: themeColors.isDark ? '#FFFFFF' : '#0F172A' }]}>Get Today's Bio-Advisory</Text>
                                    <Text style={styles.bioTriggerDesc}>
                                        Local ProgressAI analyzes your sleep, steps, and stress from yesterday to generate 3 personalized action tips for today.
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.bioLoadBtn, { backgroundColor: themeColors.accent, shadowColor: themeColors.accent }]}
                                        onPress={handleLoadBioAdvisory}
                                        disabled={loadingBioAdvisory}
                                    >
                                        {loadingBioAdvisory ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <>
                                                <Ionicons name="flash" size={16} color="#FFF" style={{ marginRight: 6 }} />
                                                <Text style={styles.bioLoadBtnText}>GENERATE MORNING BRIEF</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </GlassCard>
                        ) : (
                            <View>
                                {/* Status Banner */}
                                <View style={[styles.bioStatusBanner, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30` }]}>
                                    <View style={[styles.bioStatusDot, { backgroundColor: statusColor }]} />
                                    <Text style={[styles.bioStatusText, { color: statusColor }]}>
                                        {bioAdvisoryData?.morning_status?.toUpperCase() ?? 'STATUS UNKNOWN'}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.bioRefreshBtn}
                                        onPress={handleLoadBioAdvisory}
                                        disabled={loadingBioAdvisory}
                                    >
                                        {loadingBioAdvisory
                                            ? <ActivityIndicator size="small" color={statusColor} />
                                            : <Ionicons name="refresh" size={16} color="#64748B" />
                                        }
                                    </TouchableOpacity>
                                </View>

                                {/* Advisory Cards */}
                                {(bioAdvisoryData?.advisories ?? []).map((item, idx) => (
                                    <GlassCard key={idx} style={styles.bioAdvisoryCard}>
                                        <View style={styles.bioAdvisoryRow}>
                                            <View style={[styles.bioAdvisoryIconBox, { backgroundColor: `${item.color}18` }]}>
                                                <Ionicons name={item.icon ?? 'star'} size={22} color={item.color ?? '#6366F1'} />
                                            </View>
                                            <View style={styles.bioAdvisoryContent}>
                                                <Text style={[styles.bioAdvisoryCategory, { color: item.color ?? '#6366F1' }]}>
                                                    {item.category}
                                                </Text>
                                                <Text style={[styles.bioAdvisoryTitle, { color: themeColors.isDark ? '#FFFFFF' : '#0F172A' }]}>{item.title}</Text>
                                                <Text style={[styles.bioAdvisoryAdvice, { color: themeColors.isDark ? 'rgba(255,255,255,0.75)' : 'rgba(15,23,42,0.75)' }]}>{item.advice}</Text>
                                            </View>
                                        </View>
                                    </GlassCard>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    const renderPatternRecognition = () => {
        // Logic to find strong correlations
        const insights = [];

        // 1. Stress vs Nutrition Correlation
        const currentStress = stats?.stress_level || 'medium';
        const avgStress = currentStress === 'high' ? 80 : currentStress === 'medium' ? 50 : 20;
        const proteinAdherence = (consumedMacros?.[selectedDayName]?.protein / (stats?.protein_goal || 150)) * 100;

        if (currentStress === 'high' && proteinAdherence < 80) {
            insights.push({
                id: 'stress_nut',
                type: 'CORRELATION',
                icon: 'thunderstorm',
                color: '#EF4444',
                label: 'STRESS IMPACT',
                title: 'High Stress detected',
                message: 'Your macro adherence tends to drop by ~15% on high-stress days. Try meal prepping tonight to stay on track.'
            });
        }

        // 2. Sleep vs Consistency Correlation
        const sleepHours = stats?.sleep_hours || 7;
        if (sleepHours < 7) {
            insights.push({
                id: 'sleep_cons',
                type: 'WARNING',
                icon: 'moon',
                color: '#6366F1',
                label: 'RECOVERY VOID',
                title: 'Low Sleep quality',
                message: 'Your workout intensity is predicted to be lower today due to <7h sleep. Focus on hydration.'
            });
        } else if (sleepHours >= 8) {
            insights.push({
                id: 'sleep_peak',
                type: 'PEAK',
                icon: 'trending-up',
                color: themeColors.accent,
                label: 'PRIME ZONE',
                title: 'Peak Recovery',
                message: 'You unlocked "Prime Recovery" with 8h+ sleep. Today is a great day for a heavy lifting session!'
            });
        }

        if (insights.length === 0) return null;

        return (
            <View style={styles.sectionElite}>
                <View style={styles.sectionHeaderElite}>
                    <Text style={styles.sectionTitleElite}>AI Pattern Recognition</Text>
                    <View style={styles.scanningPill}>
                        <Animated.View style={[styles.scanDot, { opacity: floatingAnim, backgroundColor: themeColors.accent }]} />
                        <Text style={styles.scanningText}>ANALYZING CORRELATIONS</Text>
                    </View>
                </View>

                {insights.map(insight => (
                    <GlassCard key={insight.id} style={styles.insightCardElite}>
                        <View style={styles.insightRow}>
                            <View style={[styles.insightIconBox, { backgroundColor: `${insight.color}15` }]}>
                                <Ionicons name={insight.icon} size={22} color={insight.color} />
                            </View>
                            <View style={styles.insightContent}>
                                <View style={styles.insightHeaderRow}>
                                    <View style={[styles.insightTag, { backgroundColor: `${insight.color}10` }]}>
                                        <Text style={[styles.insightTagText, { color: insight.color }]}>{insight.label}</Text>
                                    </View>
                                </View>
                                <Text style={styles.insightTitle}>{insight.title}</Text>
                                <Text style={styles.insightMessage}>{insight.message}</Text>
                            </View>
                        </View>
                    </GlassCard>
                ))}
            </View>
        );
    };

    const renderCoachIntelligence = () => {
        if (!auditResult && !prediction) return null;

        const status = auditResult?.status || 'on_track';
        const isWarning = status !== 'on_track';

        return (
            <View style={styles.sectionElite}>
                <View style={styles.sectionHeaderElite}>
                    <Text style={styles.sectionTitleElite}>Coach Intelligence</Text>
                    <View style={[styles.verdictPill, { backgroundColor: isWarning ? '#FEF3C7' : '#DCFCE7' }]}>
                        <Text style={[styles.verdictText, { color: isWarning ? '#92400E' : '#166534' }]}>
                            {status.replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>

                <AnimatedCard style={styles.coachCardElite}>
                    <LinearGradient
                        colors={themeColors.gradient}
                        style={styles.coachGradElite}
                    >
                        <View style={styles.coachBubbleRow}>
                            <View style={styles.coachIconBox}>
                                <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                            </View>
                            <View style={styles.coachSpeech}>
                                <Text style={styles.coachMessageText}>
                                    {auditResult?.message || "Analyzing your trajectory..."}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.coachStatsGrid}>
                            <View style={styles.coachStatBox}>
                                <Text style={styles.coachStatVal}>{prediction?.predicted_weight_30_days || '--'}kg</Text>
                                <Text style={styles.coachStatLab}>30-DAY FORECAST</Text>
                            </View>
                            <View style={styles.coachStatDivider} />
                            <View style={styles.coachStatBox}>
                                <Text style={styles.coachStatVal}>{prediction?.rate_per_week || '--'}</Text>
                                <Text style={styles.coachStatLab}>WEEKLY VELOCITY</Text>
                            </View>
                        </View>

                        {isWarning && (
                            <TouchableOpacity style={styles.recalibrateBtn} onPress={handleAdaptPlans}>
                                <BlurView intensity={20} tint="light" style={styles.recalibrateBlur}>
                                    <Ionicons name="sync" size={16} color={COLORS.white} />
                                    <Text style={styles.recalibrateText}>RECALIBRATE PLANS</Text>
                                </BlurView>
                            </TouchableOpacity>
                        )}
                    </LinearGradient>
                </AnimatedCard>
            </View>
        );
    };

    const renderVitalityGrid = () => {
        if (!stats) return null;

        const currentSteps = (stats.steps_estimate || 0) + sessionSteps;

        return (
            <View style={styles.sectionElite}>
                <View style={styles.sectionHeaderElite}>
                    <Text style={styles.sectionTitleElite}>Vitality & Recovery</Text>
                </View>
                <View style={styles.lifestyleGridElite}>
                    <View style={styles.lifeRowElite}>
                        <View style={styles.lifeItemElite}>
                            <Ionicons name="moon" size={20} color="#3B82F6" />
                            <Text style={styles.lifeValueElite}>{stats.sleep_hours}h</Text>
                            <Text style={styles.lifeLabelElite}>SLEEP</Text>
                        </View>
                        <View style={styles.lifeItemElite}>
                            <Ionicons name="pulse" size={20} color="#EF4444" />
                            <Text style={styles.lifeValueElite}>{stats.stress_level?.toUpperCase() || '--'}</Text>
                            <Text style={styles.lifeLabelElite}>STRESS</Text>
                        </View>
                        <View style={styles.lifeItemElite}>
                            <Ionicons name="footsteps" size={20} color={themeColors.accent} />
                            <Text style={styles.lifeValueElite}>{currentSteps.toLocaleString()}</Text>
                            <Text style={styles.lifeLabelElite}>STEPS</Text>
                        </View>
                    </View>
                    <Text style={styles.vitalityDateLabel}>STATS FOR {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}</Text>
                </View>
            </View>
        );
    };

    const renderTrajectory = () => {
        if (!stats?.roadmap) return null;

        return (
            <View style={styles.sectionElite}>
                <TouchableOpacity 
                    activeOpacity={0.8}
                    style={styles.trajectoryHeaderBtn}
                    onPress={() => {
                        Haptics.selectionAsync();
                        setIsTrajectoryExpanded(!isTrajectoryExpanded);
                    }}
                >
                    <View style={styles.trajectoryHeaderLeft}>
                        <LinearGradient
                            colors={themeColors.gradient}
                            style={styles.trajectoryIconBox}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="git-commit" size={20} color="#FFF" />
                        </LinearGradient>
                        <View>
                            <Text style={[styles.sectionTitleElite, { marginBottom: 2 }]}>The Trajectory</Text>
                            <Text style={styles.sectionSubTitleElite}>{stats.percentage}% TO TARGET</Text>
                        </View>
                    </View>
                    <Ionicons 
                        name={isTrajectoryExpanded ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={COLORS.text + '80'} 
                    />
                </TouchableOpacity>

                {isTrajectoryExpanded && (
                    <GlassCard style={[styles.trajectoryPath, { marginTop: 10 }]}>
                        <View style={styles.trajectoryRow}>
                            <View style={styles.tStep}>
                                <View style={[styles.tDot, styles.tDotDone]} />
                                <Text style={styles.tLab}>{stats.roadmap.start.date.toUpperCase()}</Text>
                                <Text style={styles.tVal}>{stats.roadmap.start.weight}kg</Text>
                            </View>
                            <View style={styles.tLine} />
                            <View style={styles.tStep}>
                                <View style={[styles.tDot, stats.percentage >= 50 && styles.tDotDone]} />
                                <Text style={styles.tLab}>MIDWAY</Text>
                                <Text style={styles.tVal}>{stats.roadmap.midway.weight}kg</Text>
                            </View>
                            <View style={styles.tLine} />
                            <View style={styles.tStep}>
                                <View style={styles.tDot} />
                                <Text style={styles.tLab}>GOAL</Text>
                                <Text style={styles.tVal}>{stats.roadmap.goal.weight}kg</Text>
                            </View>
                        </View>
                        <View style={styles.tProgressTrack}>
                            <View style={[styles.tProgressFill, { width: `${stats.percentage}%` }]} />
                        </View>
                    </GlassCard>
                )}
            </View>
        );
    };

    const renderPhaseProgress = () => {
        if (!stats?.phases) return null;

        return (
            <View style={styles.sectionElite}>
                <View style={styles.sectionHeaderElite}>
                    <Text style={styles.sectionTitleElite}>Phase Evolution</Text>
                    <Text style={styles.activityGoalText}>PHASE {stats.current_phase} / 5</Text>
                </View>
                <View style={styles.phaseEvolutionRow}>
                    {stats.phases.map((phase, i) => (
                        <View key={i} style={styles.phaseEvolutionItem}>
                            <View style={[
                                styles.phaseEvoDot,
                                phase.is_completed && styles.phaseEvoDotDone,
                                stats.current_phase === i + 1 && styles.phaseEvoDotActive
                            ]}>
                                {phase.is_completed && <Ionicons name="checkmark" size={10} color={COLORS.white} />}
                            </View>
                            <Text style={[styles.phaseEvoLab, stats.current_phase === i + 1 && styles.phaseEvoLabActive]}>
                                {phase.target_weight}kg
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const MacroDetail = ({ label, val, target, color, unit = 'G' }) => {
        const perc = Math.round((val / target) * 100);
        return (
            <View style={styles.macroRowElite}>
                <View style={styles.macroLabelRowElite}>
                    <View>
                        <Text style={styles.macroLabElite}>{label}</Text>
                        <Text style={styles.macroDetailElite}>{val}{unit} / {target}{unit}</Text>
                    </View>
                    <Text style={[styles.macroPercElite, { color }]}>{perc}%</Text>
                </View>
                <View style={styles.macroBarElite}>
                    <View style={[styles.macroBarFillElite, { width: `${Math.min(perc, 100)}%`, backgroundColor: color }]} />
                </View>
            </View>
        );
    };

    const renderNutritionExecutiveSummary = () => {
        const curDay = consumedMacros?.[selectedDayName] || { protein: 0, carbs: 0, fats: 0, calories: 0 };
        const calGoal = stats?.calories_goal || 2500;
        const curCal = curDay.calories || (curDay.protein * 4 + curDay.carbs * 4 + curDay.fats * 9);
        const calPerc = Math.round((curCal / calGoal) * 100);

        return (
            <View style={styles.nutriExecutiveBox}>
                <View style={styles.calDetailRow}>
                    <View>
                        <Text style={styles.calHeroVal}>{curCal}</Text>
                        <Text style={styles.calHeroLab}>CALORIES CONSUMED</Text>
                    </View>
                    <View style={styles.calGoalCircle}>
                        <Svg width={50} height={50} viewBox="0 0 100 100">
                            <Circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="10" fill="transparent" />
                            <Circle
                                cx="50" cy="50" r="40"
                                stroke={themeColors.accent} strokeWidth="10"
                                fill="transparent"
                                strokeDasharray={`${(calPerc / 100) * 251.2} 251.2`}
                                strokeLinecap="round"
                                transform="rotate(-90 50 50)"
                            />
                        </Svg>
                        <View style={styles.calPercCenter}>
                            <Text style={styles.calPercText}>{calPerc}%</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.macroSplitStrip}>
                    <View style={[styles.macroPiece, { flex: Math.max(0.1, curDay.protein), backgroundColor: themeColors.accent }]} />
                    <View style={[styles.macroPiece, { flex: Math.max(0.1, curDay.carbs), backgroundColor: '#3B82F6' }]} />
                    <View style={[styles.macroPiece, { flex: Math.max(0.1, curDay.fats), backgroundColor: '#F59E0B' }]} />
                </View>
                <View style={styles.macroSplitLabels}>
                    <Text style={styles.splitLab}><Text style={{ color: themeColors.accent }}>●</Text> P</Text>
                    <Text style={styles.splitLab}><Text style={{ color: '#3B82F6' }}>●</Text> C</Text>
                    <Text style={styles.splitLab}><Text style={{ color: '#F59E0B' }}>●</Text> F</Text>
                </View>
            </View>
        );
    };

    const renderDailyHero = () => {
        const weeklywin = stats?.weekly_win || { target_weight: 88.8, label: 'To Lose', remaining: 0.7 };
        const adherence = stats?.total_adherence || 0;
        const phase = stats?.current_phase || 1;

        return (
            <View style={styles.heroContainer}>
                <View style={styles.heroCardSummary}>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryColProfessional}>
                            <View style={styles.summaryValueGroup}>
                                <Text style={styles.summaryLabelElite}>TARGET</Text>
                                <Text style={styles.summaryValProfessional}>{weeklywin.target_weight}<Text style={styles.summaryUnitProfessional}>kg</Text></Text>
                            </View>
                            <View style={[styles.summaryPillProfessional, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                <Ionicons name="trending-down" size={10} color="#059669" />
                                <Text style={[styles.summarySubTextProfessional, { color: '#059669' }]}>-{weeklywin.remaining}kg {weeklywin.label}</Text>
                            </View>
                        </View>

                        <View style={styles.summaryDividerProfessional} />

                        <View style={styles.summaryColProfessional}>
                            <View style={styles.summaryValueGroup}>
                                <Text style={styles.summaryLabelElite}>ADHERENCE</Text>
                                <Text style={styles.summaryValProfessional}>{adherence}<Text style={styles.summaryUnitProfessional}>%</Text></Text>
                            </View>
                            <View style={[styles.summaryPillProfessional, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                <Ionicons name="leaf" size={10} color="#2563EB" />
                                <Text style={[styles.summarySubTextProfessional, { color: '#2563EB' }]}>EXCELLENT</Text>
                            </View>
                        </View>

                        <View style={styles.summaryDividerProfessional} />

                        <View style={styles.summaryColProfessional}>
                            <View style={styles.summaryValueGroup}>
                                <Text style={styles.summaryLabelElite}>PHASE</Text>
                                <Text style={styles.summaryValProfessional}>{phase}<Text style={styles.summaryUnitProfessional}>/5</Text></Text>
                            </View>
                            <View style={[styles.summaryPillProfessional, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                                <Ionicons name="flag" size={10} color="#7C3AED" />
                                <Text style={[styles.summarySubTextProfessional, { color: '#7C3AED' }]}>ON TRACK</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderCategoryTabs = () => {
        const categories = ['Weight', 'Nutrition', 'Activity', 'Lifestyle'];
        return (
            <View style={styles.tabBarElite}>
                {categories.map(cat => (
                    <TouchableOpacity
                        key={cat}
                        style={[styles.tabItemElite, activeCategory === cat && styles.tabItemActiveElite]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveCategory(cat);
                        }}
                    >
                        <Text style={[styles.tabTextElite, activeCategory === cat && { color: themeColors.accent }]}>
                            {cat}
                        </Text>
                        {activeCategory === cat && <View style={[styles.tabIndicatorElite, { backgroundColor: themeColors.accent }]} />}
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderHeader = () => (
        <View style={styles.headerStack}>
            <LinearGradient
                colors={themeColors.gradient}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.5 }}
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
                    bottom: 30,
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

            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.navRow}>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <BlurView intensity={20} tint="light" style={styles.iconBlur}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>
                    <View style={styles.titleStack}>
                        <Text style={styles.eliteTitle}>Your Progress</Text>
                        <Text style={styles.eliteSubtitle}>ACTIVITY INSIGHTS</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.headerActionBtn, weightLoggedToday && { opacity: 0.5 }]}
                        onPress={() => !weightLoggedToday && setShowLogModal(true)}
                    >
                        <BlurView intensity={20} tint="light" style={styles.iconBlur}>
                            <Ionicons name="add" size={24} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>
                </View>

                {/* Day Selector */}
                <View style={styles.daySelectorContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.daySelectorContent}
                    >
                        {WEEK_DATES.map((dayObj) => {
                            const isSelected = selectedDayName === dayObj.day;
                            const isToday = dayObj.full === new Date().toISOString().split('T')[0];

                            return (
                                <TouchableOpacity
                                    key={dayObj.day}
                                    onPress={() => handleDaySelect(dayObj)}
                                    style={[
                                        styles.dayPill,
                                        isSelected && styles.dayPillActive
                                    ]}
                                >
                                    <Text style={[
                                        styles.dayPillText,
                                        isSelected && styles.dayPillTextActive
                                    ]}>
                                        {dayObj.short}
                                    </Text>
                                    {isToday && (
                                        <Text style={[
                                            styles.todayLabel,
                                            isSelected && styles.todayLabelActive
                                        ]}>TODAY</Text>
                                    )}
                                    {isSelected && !isToday && <View style={styles.activeDot} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </SafeAreaView>
        </View>
    );

    if (loading) return <ActivityIndicator color={themeColors.accent} style={{ marginTop: 50 }} />;

    return (
        <AuraBackground style={styles.container}>
            {renderHeader()}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollPadding}
                style={{ position: 'relative', zIndex: 10 }}
            >
                {renderDailyHero()}

                <View style={styles.mainDetailCard}>
                    {renderCategoryTabs()}

                    <View style={styles.tabContentElite}>
                        {activeCategory === 'Weight' && (
                            <>
                                <View style={styles.innerContentHeader}>
                                    <View>
                                        <Text style={styles.chartTitlePrimary}>Weight Analysis</Text>
                                        <Text style={styles.chartSubLabel}>PHYSIOLOGICAL TRAJECTORY</Text>
                                    </View>
                                    <View style={styles.eliteBadge}>
                                        <Text style={styles.eliteBadgeText}>BIOMETRIC ENGINE</Text>
                                    </View>
                                </View>

                                {renderWeightExecutiveSummary()}

                                <View style={styles.weightChartContainerElite}>
                                    <WeightLineChart
                                        chartData={weightData}
                                        minW={minW}
                                        maxW={maxW}
                                        targetWeight={stats?.target_weight}
                                    />
                                </View>

                                <View style={styles.secondaryStatsRowElite}>
                                    <View style={styles.secStatItemElite}>
                                        <Text style={styles.secStatValElite}>{stats?.body_fat || '--'}%</Text>
                                        <Text style={styles.secStatLabElite}>BODY FAT</Text>
                                    </View>
                                    <View style={styles.secStatDividerElite} />
                                    <View style={styles.secStatItemElite}>
                                        <Text style={styles.secStatValElite}>{stats?.waist_size || '--'}cm</Text>
                                        <Text style={styles.secStatLabElite}>WAIST</Text>
                                    </View>
                                    <View style={styles.secStatDividerElite} />
                                    <View style={styles.secStatItemElite}>
                                        <Text style={styles.secStatValElite}>{stats?.lean_mass || '--'}kg</Text>
                                        <Text style={styles.secStatLabElite}>LEAN MASS</Text>
                                    </View>
                                </View>
                            </>
                        )}

                        {activeCategory === 'Nutrition' && (
                            <>
                                <View style={styles.innerContentHeader}>
                                    <Text style={styles.chartTitlePrimary}>Fuel Optimization</Text>
                                    <View style={styles.eliteBadge}>
                                        <Text style={styles.eliteBadgeText}>ELITE SYSTEM</Text>
                                    </View>
                                </View>
                                {renderNutritionExecutiveSummary()}
                                <View style={styles.nutritionAnalysisElite}>
                                    <MacroDetail
                                        label="PROTEIN"
                                        val={consumedMacros?.[selectedDayName]?.protein || 0}
                                        target={stats?.protein_goal || 150}
                                        color="#10B981"
                                    />
                                    <MacroDetail
                                        label="CARBS"
                                        val={consumedMacros?.[selectedDayName]?.carbs || 0}
                                        target={stats?.carbs_goal || 200}
                                        color="#3B82F6"
                                    />
                                    <MacroDetail
                                        label="FATS"
                                        val={consumedMacros?.[selectedDayName]?.fats || 0}
                                        target={stats?.fats_goal || 70}
                                        color="#F59E0B"
                                    />
                                </View>
                                {renderLoggedMealsProgress()}
                            </>
                        )}

                        {activeCategory === 'Activity' && (
                            <>
                                <View style={styles.innerContentHeader}>
                                    <Text style={styles.chartTitlePrimary}>Activity Performance</Text>
                                    <View style={styles.eliteBadge}>
                                        <Text style={styles.eliteBadgeText}>ELITE TRACKER</Text>
                                    </View>
                                </View>
                                {renderActivityExecutiveSummary()}
                                {renderLoggedWorkoutsProgress()}
                                {renderTrajectory()}
                                {renderPhaseProgress()}
                            </>
                        )}

                        {activeCategory === 'Lifestyle' && (
                            <>
                                <View style={styles.innerContentHeader}>
                                    <Text style={styles.chartTitlePrimary}>Recovery Analysis</Text>
                                    <View style={styles.eliteBadge}>
                                        <Text style={styles.eliteBadgeText}>RECOVERY PROTOCOL</Text>
                                    </View>
                                </View>
                                {renderLifestyleExecutiveSummary()}
                                {renderVitalityGrid()}
                            </>
                        )}
                    </View>
                </View>

                {renderPatternRecognition()}
                {renderProgressAudit()}
                {renderTrajectorySimulator()}
                {renderBioAdvisory()}
                {renderCoachIntelligence()}
                <View style={styles.sectionHeaderElite}>
                    <Text style={styles.sectionTitleElite}>Activity Timeline</Text>
                    <TouchableOpacity>
                        <Text style={styles.historyLinkText}>HISTORY</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.timelineContainer}>
                    {activityHistory.length > 0 ? (
                        activityHistory.map((item, i) => {
                            // Professional color/icon mapping
                            let iconName = item.icon || 'star';
                            let iconBg = '#F1F5F9';
                            let iconColor = '#64748B';
                            let typeColor = '#64748B';

                            if (item.type === 'WORKOUT') {
                                iconName = 'fitness';
                                iconBg = '#ECFDF5';
                                iconColor = '#10B981';
                                typeColor = '#059669';
                            } else if (item.type === 'MEAL') {
                                iconName = 'restaurant';
                                iconBg = '#EFF6FF';
                                iconColor = '#3B82F6';
                                typeColor = '#2563EB';
                            } else if (item.type === 'WEIGHT' || item.type === 'WEIGHT_LOG') {
                                iconName = 'scale';
                                iconBg = '#FFFBEB';
                                iconColor = '#F59E0B';
                                typeColor = '#D97706';
                            }

                            return (
                                <View key={i} style={styles.historyItemElite}>
                                    <View style={[styles.historyIconBox, { backgroundColor: iconBg }]}>
                                        <Ionicons name={iconName} size={24} color={iconColor} />
                                    </View>
                                    <View style={styles.historyContent}>
                                        <View style={styles.typeRowElite}>
                                            <Text style={[styles.typeTextElite, { color: typeColor }]}>
                                                {item.type === 'WEIGHT_LOG' ? 'WEIGHT' : item.type}
                                            </Text>
                                            <Text style={styles.historyTimeElite}>{item.time || 'Completed'}</Text>
                                        </View>
                                        <Text style={styles.historyTitleElite}>{item.title}</Text>
                                        <Text style={styles.historySubElite}>{item.subtitle || 'Activity Logged'}</Text>
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <View style={styles.emptyTimelineElite}>
                            <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
                            <Text style={styles.emptyTimelineText}>No activities for {selectedDayName}.</Text>
                        </View>
                    )}
                </View>


            </ScrollView>

            {/* WEIGHT LOG MODAL */}
            <Modal
                transparent
                visible={showLogModal}
                animationType="fade"
                onRequestClose={() => setShowLogModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <BlurView intensity={80} tint="dark" style={styles.modalBlur}>
                        <View style={styles.modalContentElite}>
                            <View style={styles.modalHeaderElite}>
                                <Text style={styles.modalTitleElite}>Log Your Weight</Text>
                                <TouchableOpacity onPress={() => setShowLogModal(false)}>
                                    <Ionicons name="close" size={24} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalBodyElite}>
                                <View style={styles.pulseSection}>
                                    <Text style={styles.pulseLabel}>TODAY'S WEIGHT</Text>
                                    <View style={styles.inputWrapperElite}>
                                        <TextInput
                                            style={styles.weightInputElite}
                                            placeholder="00.0"
                                            placeholderTextColor="#94A3B8"
                                            keyboardType="numeric"
                                            value={newWeight}
                                            onChangeText={setNewWeight}
                                            autoFocus
                                        />
                                        <Text style={styles.unitTextElite}>KG</Text>
                                    </View>
                                </View>

                                <View style={styles.pulseSection}>
                                    <Text style={styles.pulseLabel}>SLEEP QUALITY</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sleepScroll}>
                                        {[4, 5, 6, 7, 8, 9, 10].map(h => (
                                            <TouchableOpacity
                                                key={h}
                                                style={[styles.sleepPill, sleepHours === h && styles.sleepPillActive]}
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setSleepHours(h);
                                                }}
                                            >
                                                <Text style={[styles.sleepPillText, sleepHours === h && styles.sleepPillActiveText]}>{h}h</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                <View style={styles.pulseSection}>
                                    <Text style={styles.pulseLabel}>STRESS LEVEL</Text>
                                    <View style={styles.stressRow}>
                                        {['low', 'medium', 'high'].map(s => (
                                            <TouchableOpacity
                                                key={s}
                                                style={[styles.stressBtn, stressLevel === s && styles.stressBtnActive]}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setStressLevel(s);
                                                }}
                                            >
                                                <Text style={[styles.stressText, stressLevel === s && styles.stressTextActive]}>{s.toUpperCase()}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.saveBtnElite}
                                onPress={handleLogWeight}
                            >
                                <LinearGradient
                                    colors={themeColors.gradient}
                                    style={styles.saveGradElite}
                                >
                                    <Text style={styles.saveTextElite}>COMPLETE CHECK-IN</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </KeyboardAvoidingView>
            </Modal>
        </AuraBackground >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollPadding: {
        paddingTop: 0,
        paddingBottom: 40,
    },
    sectionElite: {
        marginTop: 25,
        marginBottom: 10,
    },
    sectionHeaderElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitleElite: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    activityGoalText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    headerStack: {
        height: 180, // Increased to fit DaySelector comfortably
        position: 'relative',
        zIndex: 1,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerSafe: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'space-between',
        paddingBottom: 25,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 5,
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
    floatingIcon: {
        position: 'absolute',
        zIndex: 1,
    },
    heroContainer: {
        paddingHorizontal: 20,
        marginTop: 20, // Removed negative margin to separate from header
        zIndex: 20,
        elevation: 20,
        marginBottom: 25,
    },
    heroCardSummary: {
        padding: 24,
        borderRadius: 30,
        backgroundColor: COLORS.white,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    summaryColProfessional: {
        flex: 1,
        alignItems: 'center',
    },
    summaryValueGroup: {
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryLabelElite: {
        fontSize: 9,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1.5,
        marginBottom: 5,
    },
    summaryValProfessional: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -1,
    },
    summaryUnitProfessional: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
        marginLeft: 2,
    },
    summaryPillProfessional: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    summarySubTextProfessional: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    summaryDividerProfessional: {
        width: 1,
        height: 40,
        backgroundColor: '#F1F5F9',
        marginHorizontal: 5,
    },
    mainDetailCard: {
        marginHorizontal: 20,
        backgroundColor: COLORS.white,
        borderRadius: 35,
        paddingBottom: 25,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        overflow: 'hidden',
    },
    tabBarElite: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingHorizontal: 10,
    },
    tabItemElite: {
        flex: 1,
        paddingVertical: 18,
        alignItems: 'center',
        position: 'relative',
    },
    tabItemActiveElite: {
        backgroundColor: COLORS.white,
    },
    tabTextElite: {
        fontSize: 11,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    tabTextActiveElite: {
        // color set dynamically via inline style
    },
    tabIndicatorElite: {
        position: 'absolute',
        bottom: 0,
        width: 30,
        height: 3,
        // backgroundColor set dynamically via inline style
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },
    tabContentElite: {
        paddingTop: 25,
        paddingHorizontal: 24,
    },
    innerChartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    innerContentHeader: {
        marginBottom: 20,
    },
    currentWeightBox: {
        flexDirection: 'row',
        alignItems: 'baseline',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 15,
    },
    currentWeightHero: {
        fontSize: 22,
        fontWeight: '900',
        color: '#059669',
    },
    currentWeightUnit: {
        fontSize: 10,
        fontWeight: '900',
        color: '#059669',
        marginLeft: 4,
    },
    scanningPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 8,
    },
    scanDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        // backgroundColor set dynamically via inline style
    },
    scanningText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1,
    },
    insightCardElite: {
        marginHorizontal: 20,
        marginBottom: 15,
        borderRadius: 25,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    insightRow: {
        flexDirection: 'row',
        padding: 20,
        gap: 15,
    },
    insightIconBox: {
        width: 48,
        height: 48,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    insightContent: {
        flex: 1,
    },
    insightTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    insightTagText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    insightTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 4,
    },
    insightMessage: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 18,
    },
    hubStatusPill: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    hubStatusText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1,
    },
    hubContainerElite: {
        paddingHorizontal: 20,
        gap: 15,
    },
    readinessCardElite: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 30,
        alignItems: 'center',
        gap: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    gaugeContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gaugeValueWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gaugeValue: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0F172A',
    },
    gaugeLabel: {
        fontSize: 6,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    readinessMessage: {
        flex: 1,
    },
    readinessTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 6,
    },
    readinessDecrip: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 18,
    },
    plateauCardElite: {
        padding: 20,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    plateauHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    plateauLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    plateauTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 4,
    },
    plateauReason: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 18,
    },
    pivotBtn: {
        marginTop: 15,
        backgroundColor: '#F1F5F9',
        paddingVertical: 12,
        borderRadius: 15,
        alignItems: 'center',
    },
    pivotBtnText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#EF4444',
        letterSpacing: 0.5,
    },
    eliteBadge: {
        backgroundColor: '#0F172A',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    eliteBadgeText: {
        fontSize: 7,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 0.5,
    },
    nutriExecutiveBox: {
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 25,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    calDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    calHeroVal: {
        fontSize: 36,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -1,
    },
    calHeroLab: {
        fontSize: 8,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    calGoalCircle: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calPercCenter: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calPercText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#0F172A',
    },
    macroSplitStrip: {
        height: 6,
        flexDirection: 'row',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 10,
    },
    macroPiece: {
        height: '100%',
    },
    macroSplitLabels: {
        flexDirection: 'row',
        gap: 15,
    },
    splitLab: {
        fontSize: 9,
        fontWeight: '900',
        color: '#64748B',
    },
    macroDetailElite: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        marginTop: 2,
    },
    inlineMealValueGroup: {
        alignItems: 'flex-end',
    },
    inlineMealCals: {
        fontSize: 12,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 4,
    },
    emptyActivityBoxElite: {
        alignItems: 'center',
        paddingVertical: 30,
        backgroundColor: '#F8FAFC',
        borderRadius: 25,
        marginTop: 20,
    },
    emptyActivityTextElite: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 10,
        fontWeight: '600',
    },
    innerSectionElite: {
        marginTop: 10,
    },
    innerSectionTitleElite: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 0.5,
    },
    inlineMealItemElite: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 18,
    },
    inlineMealIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    inlineMealContent: {
        flex: 1,
    },
    inlineMealTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0F172A',
    },
    inlineMealSub: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    inlineMealStatusPill: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    inlineMealStatusText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#2563EB',
    },
    // Weight Executive Styles
    weightExecutiveBox: {
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
    },
    weightMainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    weightMetricElite: {
        flex: 1,
    },
    weightMetricVal: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -1,
    },
    weightMetricUnit: {
        fontSize: 12,
        color: '#94A3B8',
        marginLeft: 2,
    },
    weightMetricLab: {
        fontSize: 8,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
        marginTop: 4,
    },
    goalProgressGroup: {
        width: '100%',
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    goalLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1,
    },
    goalCounter: {
        fontSize: 10,
        fontWeight: '900',
        color: '#0F172A',
    },
    goalTrack: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    goalFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 3,
    },
    weightChartContainerElite: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    secondaryStatsRowElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.5)',
        padding: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    secStatItemElite: {
        flex: 1,
        alignItems: 'center',
    },
    secStatValElite: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
    },
    secStatLabElite: {
        fontSize: 7,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 0.5,
        marginTop: 4,
    },
    secStatDividerElite: {
        width: 1,
        height: 20,
        backgroundColor: '#E2E8F0',
    },
    activityExecutiveBox: {
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 25,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    activityMainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    activityMetricElite: {
        flex: 1,
    },
    activityMetricVal: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -1,
    },
    activityMetricUnit: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94A3B8',
        marginLeft: 2,
    },
    activityMetricLab: {
        fontSize: 8,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
        marginTop: 2,
    },
    freqProgressGroup: {
        marginTop: 5,
    },
    freqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    freqLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1,
    },
    freqCounter: {
        fontSize: 10,
        fontWeight: '900',
        color: '#0F172A',
    },
    freqTrack: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    freqFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 3,
    },
    inlineWorkoutItemElite: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 18,
    },
    inlineWorkoutIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    inlineWorkoutContent: {
        flex: 1,
    },
    inlineWorkoutTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0F172A',
    },
    inlineWorkoutSub: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    inlineWorkoutValueGroup: {
        alignItems: 'flex-end',
    },
    inlineWorkoutDuration: {
        fontSize: 12,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 4,
    },
    inlineWorkoutStatusPill: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    inlineWorkoutStatusText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#059669',
    },
    lifestyleExecutiveBox: {
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 25,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    recoveryRowElite: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    recoveryMetricElite: {
        flex: 1,
    },
    recoveryHeaderElite: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    recoveryLabElite: {
        fontSize: 8,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    recoveryValElite: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    recoveryUnitElite: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94A3B8',
        marginLeft: 2,
    },
    recoveryDividerElite: {
        width: 1,
        height: 40,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 15,
    },
    recoveryStatusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 15,
        borderWidth: 1,
        gap: 10,
    },
    recoveryStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    recoveryStatusText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    vitalityGridElite: {
        gap: 12,
        marginBottom: 20,
    },
    vitalityItemElite: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 15,
        borderRadius: 20,
    },
    vitalityIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    vitalityContent: {
        flex: 1,
    },
    vitalityLab: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748B',
        marginBottom: 2,
    },
    vitalityVal: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
    },
    vitalityUnit: {
        fontSize: 10,
        color: '#94A3B8',
        marginLeft: 2,
    },
    vitalityProgressTrack: {
        width: 60,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    vitalityProgressFill: {
        height: '100%',
        borderRadius: 2,
    },
    scenarioScroll: {
        paddingLeft: 20,
        paddingRight: 10,
        paddingBottom: 20,
    },
    scenarioCardElite: {
        width: 280, // Wider for detail
        padding: 20,
        marginRight: 15,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    scenarioHeaderElite: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    scenarioIconBoxElite: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scenarioLabelGroupElite: {
        flex: 1,
    },
    scenarioTagElite: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 2,
    },
    scenarioTitleElite: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0F172A',
    },
    scenarioDataHeroElite: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    scenarioLargeVal: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -1,
    },
    scenarioLargeUnit: {
        fontSize: 12,
        color: '#94A3B8',
        marginLeft: 4,
    },
    scenarioDateBoxElite: {
        alignItems: 'flex-end',
    },
    scenarioDateLabelElite: {
        fontSize: 8,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    scenarioDateValElite: {
        fontSize: 12,
        fontWeight: '900',
        color: '#0F172A',
    },
    hubContainerElite: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 20,
    },
    readinessCardElite: {
        flex: 1.2,
        padding: 15,
        borderRadius: 25,
        alignItems: 'center',
    },
    gaugeContainerElite: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    gaugeContentElite: {
        position: 'absolute',
        alignItems: 'center',
    },
    gaugeValElite: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -1,
    },
    gaugeLabElite: {
        fontSize: 6,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    readinessInfoElite: {
        alignItems: 'center',
        width: '100%',
    },
    readinessTitleElite: {
        fontSize: 10,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 10,
    },
    readinessFactorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 4,
    },
    factorPillElite: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    factorTextElite: {
        fontSize: 6,
        fontWeight: '800',
        color: '#64748B',
    },
    plateauCardElite: {
        flex: 1,
        padding: 15,
        borderRadius: 25,
    },
    plateauHeaderElite: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 15,
    },
    plateauIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plateauStatusText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    plateauBodyElite: {
        marginBottom: 15,
    },
    plateauTitleElite: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94A3B8',
        marginBottom: 4,
    },
    plateauMetricRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    plateauValueElite: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
    },
    plateauUnitElite: {
        fontSize: 8,
        fontWeight: '800',
        color: '#64748B',
    },
    plateauFooterElite: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 10,
    },
    plateauDescElite: {
        fontSize: 8,
        color: '#94A3B8',
        lineHeight: 12,
    },
    scenarioDividerElite: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 15,
    },
    scenarioDescElite: {
        fontSize: 11,
        color: '#64748B',
        lineHeight: 16,
        marginBottom: 20,
        minHeight: 32,
    },
    scenarioConfidenceElite: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 12,
    },
    confidenceLab: {
        fontSize: 7,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    confidenceTrack: {
        flex: 1,
        height: 3,
        backgroundColor: '#E2E8F0',
        borderRadius: 1.5,
        overflow: 'hidden',
    },
    confidenceFill: {
        height: '100%',
        borderRadius: 1.5,
    },
    confidenceVal: {
        fontSize: 9,
        fontWeight: '900',
        color: '#0F172A',
    },
    // Elite Weight Chart Styles
    eliteChartWrapper: {
        width: '100%',
    },
    svgContainerElite: {
        height: 180,
    },
    gridOverlayElite: {
        ...StyleSheet.absoluteFillObject,
    },
    gridLineContainerElite: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    gridLabelElite: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        width: 30,
        textAlign: 'right',
        marginRight: 10,
    },
    gridLineElite: {
        flex: 1,
        height: 1,
        backgroundColor: '#F1F5F9',
    },
    xAxisElite: {
        flexDirection: 'row',
        height: 30,
        position: 'relative',
        marginTop: 10,
    },
    xAxisLabElite: {
        position: 'absolute',
        fontSize: 10,
        fontWeight: '800',
        color: '#94A3B8',
        width: 30,
        textAlign: 'center',
    },
    chartLegendElite: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginTop: 20,
    },
    legendItemElite: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDotElite: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendDashElite: {
        width: 12,
        height: 2,
        borderRadius: 1,
    },
    legendTextElite: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    chartTooltipElite: {
        position: 'absolute',
        width: 80,
        height: 35,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
    },
    tooltipWeight: {
        fontSize: 12,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    tooltipDay: {
        fontSize: 7,
        fontWeight: '700',
        color: '#94A3B8',
        marginTop: 1,
    },
    daySelectorContainer: {
        marginTop: 15,
    },
    daySelectorContent: {
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
    chartCardElite: {
        marginHorizontal: 20,
        backgroundColor: COLORS.white,
        borderRadius: 30,
        padding: 20,
        marginBottom: 25,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
    },
    chartHeaderElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    chartTitlePrimary: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    chartSubLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
        marginTop: 4,
    },
    currentWeightHero: {
        fontSize: 18,
        fontWeight: '900',
        color: '#10B981',
    },
    secondaryStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderRadius: 25,
        paddingVertical: 18,
        paddingHorizontal: 10,
        marginTop: 25,
    },
    secStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    secStatVal: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 4,
    },
    secStatLab: {
        fontSize: 9,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    secStatDivider: {
        width: 1,
        height: 25,
        backgroundColor: '#E2E8F0',
    },
    trajectoryHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    trajectoryHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    trajectoryIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trajectoryPath: {
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 30,
        backgroundColor: COLORS.white,
    },
    trajectoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    tStep: {
        alignItems: 'center',
        flex: 1,
    },
    tDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#F1F5F9',
        borderWidth: 3,
        borderColor: COLORS.white,
        marginBottom: 8,
        elevation: 2,
    },
    tDotDone: {
        backgroundColor: '#10B981',
    },
    tLine: {
        width: 30,
        height: 2,
        backgroundColor: '#F1F5F9',
        marginTop: -30,
    },
    tLab: {
        fontSize: 7,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
        marginBottom: 2,
        textAlign: 'center',
    },
    tVal: {
        fontSize: 11,
        fontWeight: '900',
        color: '#0F172A',
        textAlign: 'center',
    },
    tProgressTrack: {
        height: 4,
        backgroundColor: '#F1F5F9',
        borderRadius: 2,
        overflow: 'hidden',
    },
    tProgressFill: {
        height: '100%',
        backgroundColor: '#10B981',
    },
    phaseEvolutionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20,
        backgroundColor: COLORS.white,
        padding: 20,
        borderRadius: 25,
        elevation: 4,
    },
    phaseEvolutionItem: {
        alignItems: 'center',
        gap: 8,
    },
    phaseEvoDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    phaseEvoDotDone: {
        backgroundColor: '#10B981',
    },
    phaseEvoDotActive: {
        borderColor: '#10B981',
        backgroundColor: COLORS.white,
    },
    phaseEvoLab: {
        fontSize: 8,
        fontWeight: '900',
        color: '#94A3B8',
    },
    phaseEvoLabActive: {
        color: '#10B981',
    },
    coachCardElite: {
        marginHorizontal: 20,
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 8,
    },
    coachGradElite: {
        padding: 25,
    },
    coachBubbleRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
    },
    coachIconBox: {
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coachSpeech: {
        flex: 1,
        justifyContent: 'center',
    },
    coachMessageText: {
        fontSize: 14,
        color: COLORS.white,
        fontWeight: '600',
        lineHeight: 20,
    },
    coachStatsGrid: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 15,
        alignItems: 'center',
    },
    coachStatBox: {
        flex: 1,
        alignItems: 'center',
    },
    coachStatVal: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.white,
    },
    coachStatLab: {
        fontSize: 8,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1,
        marginTop: 4,
    },
    coachStatDivider: {
        width: 1,
        height: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    recalibrateBtn: {
        marginTop: 20,
        height: 48,
        borderRadius: 15,
        overflow: 'hidden',
    },
    recalibrateBlur: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    recalibrateText: {
        fontSize: 12,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
    lifestyleGridElite: {
        paddingHorizontal: 20,
        gap: 15,
    },
    lifeRowElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    lifeItemElite: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: 15,
        borderRadius: 20,
        alignItems: 'center',
        gap: 5,
        elevation: 3,
    },
    lifeLabelElite: {
        fontSize: 8,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    lifeValueElite: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0F172A',
    },
    macroCardElite: {
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 30,
        backgroundColor: COLORS.white,
        marginBottom: 20,
    },
    macroRowElite: {
        marginBottom: 15,
    },
    macroLabelRowElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    macroLabElite: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1,
    },
    macroPercElite: {
        fontSize: 12,
        fontWeight: '900',
        color: '#0F172A',
    },
    macroBarElite: {
        height: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        overflow: 'hidden',
    },
    macroBarFillElite: {
        height: '100%',
        borderRadius: 4,
    },
    timelineContainer: {
        paddingHorizontal: 20,
    },
    historyItemElite: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        padding: 15,
        borderRadius: 20,
        marginBottom: 12,
        alignItems: 'center',
        elevation: 2,
    },
    historyIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    historyContent: {
        flex: 1,
    },
    typeRowElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    typeTextElite: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    historyTimeElite: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
    },
    historyTitleElite: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
    },
    historySubElite: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    emptyTimelineElite: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 10,
    },
    emptyTimelineText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
    },
    modalBlur: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalContentElite: {
        backgroundColor: COLORS.white,
        borderRadius: 35,
        padding: 25,
        elevation: 25,
    },
    modalHeaderElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitleElite: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
    },
    modalBodyElite: {
        gap: 25,
        paddingBottom: 25,
    },
    pulseSection: {
        gap: 12,
    },
    pulseLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1.5,
    },
    inputWrapperElite: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 20,
        height: 70,
        borderRadius: 20,
    },
    weightInputElite: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0F172A',
        flex: 1,
        minWidth: 0,
    },
    unitTextElite: {
        fontSize: 16,
        fontWeight: '900',
        color: '#10B981',
    },
    sleepPill: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 15,
        marginRight: 10,
    },
    sleepPillActive: {
        backgroundColor: '#3B82F6',
    },
    sleepPillText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
    },
    sleepPillActiveText: {
        color: COLORS.white,
    },
    stressRow: {
        flexDirection: 'row',
        gap: 10,
    },
    stressBtn: {
        flex: 1,
        paddingVertical: 14,
        backgroundColor: '#F8FAFC',
        borderRadius: 15,
        alignItems: 'center',
    },
    stressBtnActive: {
        backgroundColor: '#EF4444',
    },
    saveBtnElite: {
        borderRadius: 20,
        overflow: 'hidden',
        height: 60,
    },
    saveGradElite: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveTextElite: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
    verdictPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    verdictText: {
        fontSize: 9,
        fontWeight: '900',
    },
    nutritionAnalysisElite: {
        gap: 15,
    },
    legendText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    labelWrapper: {
        position: 'absolute',
        width: 40,
        alignItems: 'center',
    },
    historyLinkText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    chartLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 25,
        marginTop: 30,
        paddingBottom: 10,
    },
    // AI Progress Audit Styles
    auditTriggerCard: {
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.15)',
        elevation: 4,
    },
    auditTriggerContent: {
        alignItems: 'center',
        gap: 12,
    },
    auditTriggerIconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#10B98115',
        justifyContent: 'center',
        alignItems: 'center',
    },
    auditTriggerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
        textAlign: 'center',
    },
    auditTriggerDesc: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    auditBtn: {
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 3,
    },
    auditBtnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    auditContainer: {
        paddingHorizontal: 20,
    },
    auditReportCard: {
        padding: 22,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 3,
    },
    auditReportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusBadge: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    refreshAuditBtn: {
        padding: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
    },
    auditSummaryText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#334155',
        fontStyle: 'italic',
        lineHeight: 22,
        marginBottom: 20,
    },
    auditSubSection: {
        marginBottom: 18,
        gap: 8,
    },
    auditSectionSubTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    auditItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        gap: 10,
    },
    auditItemText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#475569',
        flex: 1,
        lineHeight: 18,
    },

    // ─── Trajectory Simulator ──────────────────────────────────────
    trajCard: {
        padding: 18,
        marginBottom: 12,
    },
    trajLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: '#94A3B8',
        marginBottom: 8,
    },
    trajPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        marginRight: 8,
    },
    trajPillActive: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1',
    },
    trajPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    trajPillTextActive: {
        color: '#FFF',
    },
    trajStressBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        marginHorizontal: 3,
    },
    trajStressBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.8,
    },
    trajSimulateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366F1',
        borderRadius: 14,
        paddingVertical: 14,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    trajSimulateBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },
    trajResultCard: {
        padding: 18,
        marginBottom: 12,
    },
    trajResultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    trajResultTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    trajStatRow: {
        flexDirection: 'row',
        marginBottom: 14,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingVertical: 12,
    },
    trajStatBox: {
        flex: 1,
        alignItems: 'center',
    },
    trajStatValue: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.text,
    },
    trajStatUnit: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
        marginTop: 2,
    },
    trajTagRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
        flexWrap: 'wrap',
    },
    trajTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    trajTagText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6366F1',
    },
    trajAnalysisText: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 20,
        marginBottom: 14,
        fontStyle: 'italic',
    },
    trajFactorsBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 12,
    },
    trajFactorsTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: '#94A3B8',
        marginBottom: 8,
    },
    trajFactorRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    trajFactorDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#6366F1',
        marginTop: 5,
        marginRight: 8,
    },
    trajFactorText: {
        fontSize: 13,
        color: COLORS.text,
        fontWeight: '500',
        flex: 1,
        lineHeight: 18,
    },

    // ─── Bio-Advisory ─────────────────────────────────────────────
    bioTriggerCard: {
        marginBottom: 12,
    },
    bioTriggerInner: {
        padding: 20,
        alignItems: 'center',
    },
    bioTriggerIconBox: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    bioTriggerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    bioTriggerDesc: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    bioLoadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366F1',
        borderRadius: 14,
        paddingVertical: 13,
        paddingHorizontal: 28,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    bioLoadBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },
    bioStatusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
    },
    bioStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    bioStatusText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1,
        flex: 1,
    },
    bioRefreshBtn: {
        padding: 4,
    },
    bioAdvisoryCard: {
        padding: 16,
        marginBottom: 10,
    },
    bioAdvisoryRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    bioAdvisoryIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    bioAdvisoryContent: {
        flex: 1,
    },
    bioAdvisoryCategory: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 3,
    },
    bioAdvisoryTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 5,
    },
    bioAdvisoryAdvice: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 19,
    },
});

export default ProgressScreen;

