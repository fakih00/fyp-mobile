import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS } from '../constants/Theme';

const GoalRings = ({ size = 120, rings = [] }) => {
    const center = size / 2;
    const spacing = 4;
    const [activeRing, setActiveRing] = useState(null);

    // Default rings if none provided
    const displayRings = rings.length > 0 ? rings : [
        { label: 'Move', value: 300, target: 500, progress: 0.6, color: '#10B981', weight: 12 },
        { label: 'Eat', value: 1200, target: 2000, progress: 0.6, color: '#FF6B6B', weight: 12 },
        { label: 'Pulse', value: 75, target: 100, progress: 0.75, color: '#3B82F6', weight: 12 }
    ];

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size}>
                <G rotation="-90" origin={`${center}, ${center}`}>
                    {displayRings.map((ring, i) => {
                        const radius = (size / 2) - (i * (ring.weight + spacing)) - (ring.weight / 2);
                        const circumference = 2 * Math.PI * radius;
                        const strokeDashoffset = circumference - (Math.min(ring.progress, 1) * circumference);
                        const isPressed = activeRing === i;

                        return (
                            <G
                                key={i}
                                onPressIn={() => setActiveRing(i)}
                                onPressOut={() => setActiveRing(null)}
                            >
                                {/* Background Ring */}
                                <Circle
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    stroke={ring.color}
                                    strokeWidth={ring.weight}
                                    strokeOpacity={0.15}
                                    fill="none"
                                />
                                {/* Progress Ring */}
                                <Circle
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    stroke={ring.color}
                                    strokeWidth={isPressed ? ring.weight + 2 : ring.weight}
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    fill="transparent" // Ensure touch events pass through if needed, or use 'none'
                                />
                                {/* Invisible Touch Target (Wider) */}
                                <Circle
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    stroke="transparent"
                                    strokeWidth={ring.weight + 10}
                                    fill="none"
                                />
                            </G>
                        );
                    })}
                </G>
            </Svg>

            {/* Center Info Label */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none" justifyContent="center" alignItems="center">
                {activeRing !== null ? (
                    <>
                        <Text style={{ color: displayRings[activeRing].color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                            {displayRings[activeRing].label}
                        </Text>
                        <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '900' }}>
                            {displayRings[activeRing].value}
                        </Text>
                    </>
                ) : (
                    null
                )}
            </View>
        </View>
    );
};

export default GoalRings;
