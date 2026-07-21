import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { COLORS } from '../constants/Theme';

const { width } = Dimensions.get('window');

import { AppContext } from '../context/AppContext';

const WeeklyChart = ({ data = [20, 45, 28, 80, 99, 43, 88], height = 80 }) => {
    const { colors: themeColors } = React.useContext(AppContext);
    const chartWidth = width - 100;
    const padding = 10;

    // Scale points
    const maxVal = Math.max(...data, 100);
    const points = data.map((val, i) => ({
        x: data.length > 1 ? (i * (chartWidth / (data.length - 1))) + padding : (chartWidth / 2) + padding,
        y: height - (val / maxVal) * (height - padding * 2) - padding
    }));

    // Create path string
    if (points.length === 0) return null;

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        // Curve calculation (simple Bezier or straight lines)
        // For a "powerful" look, let's use slightly curved lines if possible, 
        // but simple lines with high-quality gradients look very "Elite".
        d += ` L ${points[i].x} ${points[i].y}`;
    }

    // Dynamic gradient colors
    const gradStart = themeColors.secondary || themeColors.accent;
    const gradEnd = themeColors.accent;

    return (
        <View style={styles.container}>
            <View style={styles.chartWrapper}>
                <Svg width={chartWidth + padding * 2} height={height}>
                    <Defs>
                        <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor={gradStart} stopOpacity="1" />
                            <Stop offset="1" stopColor={gradEnd} stopOpacity="1" />
                        </LinearGradient>
                    </Defs>

                    {/* The Line */}
                    <Path
                        d={d}
                        fill="none"
                        stroke="url(#lineGrad)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Dots at peaks */}
                    {points.map((p, i) => (
                        <Circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r="3"
                            fill={COLORS.white}
                            stroke={themeColors.accent}
                            strokeWidth="2"
                        />
                    ))}
                </Svg>
            </View>
            <View style={styles.daysRow}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <Text key={i} style={styles.dayText}>{day}</Text>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
    },
    chartWrapper: {
        alignItems: 'center',
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 25,
        marginTop: 10,
    },
    dayText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94A3B8',
    }
});

export default WeeklyChart;
