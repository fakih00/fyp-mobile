import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// Skeleton coordinates for a generic standing pose
const SKELETON = {
    head: { x: width / 2, y: height * 0.15 },
    neck: { x: width / 2, y: height * 0.22 },
    leftShoulder: { x: width / 2 - 45, y: height * 0.25 },
    rightShoulder: { x: width / 2 + 45, y: height * 0.25 },
    leftElbow: { x: width / 2 - 60, y: height * 0.35 },
    rightElbow: { x: width / 2 + 60, y: height * 0.35 },
    leftWrist: { x: width / 2 - 50, y: height * 0.45 },
    rightWrist: { x: width / 2 + 50, y: height * 0.45 },
    hipCenter: { x: width / 2, y: height * 0.45 },
    leftHip: { x: width / 2 - 35, y: height * 0.45 },
    rightHip: { x: width / 2 + 35, y: height * 0.45 },
    leftKnee: { x: width / 2 - 40, y: height * 0.60 },
    rightKnee: { x: width / 2 + 40, y: height * 0.60 },
    leftAnkle: { x: width / 2 - 45, y: height * 0.75 },
    rightAnkle: { x: width / 2 + 45, y: height * 0.75 },
};

const CONNECTIONS = [
    ['neck', 'leftShoulder'], ['neck', 'rightShoulder'],
    ['leftShoulder', 'leftElbow'], ['rightShoulder', 'rightElbow'],
    ['leftElbow', 'leftWrist'], ['rightElbow', 'rightWrist'],
    ['neck', 'hipCenter'],
    ['hipCenter', 'leftHip'], ['hipCenter', 'rightHip'],
    ['leftHip', 'leftKnee'], ['rightHip', 'rightKnee'],
    ['leftKnee', 'leftAnkle'], ['rightKnee', 'rightAnkle'],
];

const STATES = [
    { id: 'SCANNING', color: '#3B82F6', text: 'Aligning Body...', subtext: 'Stand in frame', icon: 'scan-outline' },
    { id: 'CORRECT', color: '#10B981', text: 'Great Posture', subtext: 'Keep it up!', icon: 'checkmark-circle-outline' },
    { id: 'INCORRECT', color: '#EF4444', text: 'Straighten Back', subtext: 'Adjust your form', icon: 'warning-outline' }
];

const AICoachOverlay = () => {
    const [currentStateIndex, setCurrentStateIndex] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    
    const currentState = STATES[currentStateIndex];

    useEffect(() => {
        // Pulse animation loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.3,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                })
            ])
        ).start();

        // State machine simulation loop
        const interval = setInterval(() => {
            setCurrentStateIndex(prev => {
                let nextIndex = prev + 1;
                if (nextIndex >= STATES.length) nextIndex = 1; // Cycle between CORRECT and INCORRECT after scanning
                
                // Trigger haptic if transitioning to incorrect
                if (STATES[nextIndex].id === 'INCORRECT') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                } else if (STATES[nextIndex].id === 'CORRECT') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                return nextIndex;
            });
        }, 3500);

        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.overlayContainer} pointerEvents="none">
            {/* Outline / Skeleton overlay */}
            <View style={StyleSheet.absoluteFill}>
                <Svg height="100%" width="100%">
                    {/* Draw connections */}
                    {CONNECTIONS.map(([start, end], index) => {
                        const p1 = SKELETON[start];
                        const p2 = SKELETON[end];
                        return (
                            <Line
                                key={`line-${index}`}
                                x1={p1.x}
                                y1={p1.y}
                                x2={p2.x}
                                y2={p2.y}
                                stroke={currentState.color}
                                strokeWidth="6"
                                strokeOpacity={0.6}
                            />
                        );
                    })}
                    {/* Draw nodes */}
                    {Object.keys(SKELETON).map((key) => {
                        const p = SKELETON[key];
                        return (
                            <Circle
                                key={`node-${key}`}
                                cx={p.x}
                                cy={p.y}
                                r={key === 'head' ? 30 : 8}
                                fill={currentState.color}
                                fillOpacity={key === 'head' ? 0.3 : 0.9}
                                stroke="#FFFFFF"
                                strokeWidth="2"
                            />
                        );
                    })}
                </Svg>
            </View>

            {/* Viewfinder Target */}
            <View style={styles.viewfinder}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
            </View>

            {/* Dynamic Status Feedback */}
            <View style={styles.feedbackContainer}>
                <BlurView intensity={60} tint="dark" style={[styles.feedbackBox, { borderColor: currentState.color }]}>
                    <Animated.View style={[styles.iconWrapper, { transform: [{ scale: currentState.id === 'SCANNING' ? pulseAnim : 1 }] }]}>
                        <Ionicons name={currentState.icon} size={28} color={currentState.color} />
                    </Animated.View>
                    <View style={styles.textWrapper}>
                        <Text style={[styles.feedbackText, { color: currentState.color }]}>{currentState.text}</Text>
                        <Text style={styles.subText}>{currentState.subtext}</Text>
                    </View>
                </BlurView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    viewfinder: {
        width: width * 0.85,
        height: height * 0.70,
        position: 'absolute',
        top: height * 0.1,
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: 'rgba(255,255,255,0.6)',
    },
    tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 15 },
    tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 15 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 15 },
    br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 15 },
    feedbackContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 140 : 120, // Adjusted to sit above the footer
        width: '100%',
        alignItems: 'center',
    },
    feedbackBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 30,
        borderWidth: 2,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
    },
    iconWrapper: {
        marginRight: 15,
    },
    textWrapper: {
        justifyContent: 'center',
    },
    feedbackText: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    subText: {
        fontSize: 13,
        color: '#CBD5E1',
        fontWeight: '600',
        marginTop: 2,
    }
});

export default AICoachOverlay;
