import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
    Path,
    Rect,
    Defs,
    LinearGradient as SvgGradient,
    Stop,
    ClipPath,
    Circle,
    G,
    Mask
} from 'react-native-svg';

const WaterMug = ({
    progress = 0,
    size = 60,
    primaryColor = "#3B82F6",
    secondaryColor = "#1D4ED8",
    showRipple = true,
    showSteam = false,
    withShadow = true
}) => {
    const animatedFill = React.useRef(new Animated.Value(progress)).current;
    const rippleAnim = React.useRef(new Animated.Value(0)).current;
    const steamAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedFill, {
            toValue: progress,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();

        if (showRipple) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(rippleAnim, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.out(Easing.sin),
                        useNativeDriver: false,
                    }),
                    Animated.timing(rippleAnim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: false,
                    })
                ])
            ).start();
        }

        if (showSteam && progress > 0.8) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(steamAnim, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.out(Easing.sin),
                        useNativeDriver: false,
                    }),
                    Animated.delay(500),
                ])
            ).start();
        }
    }, [progress, showRipple, showSteam]);

    // Dimensions
    const strokeWidth = size * 0.04;
    const bodyWidth = size * 0.7;
    const bodyHeight = size * 0.85;
    const handleWidth = size * 0.3;
    const rimHeight = size * 0.08;

    // Fill height animation
    const fillHeight = animatedFill.interpolate({
        inputRange: [0, 1],
        outputRange: [0, bodyHeight - rimHeight - strokeWidth * 2],
    });

    // Ripple animation values
    const rippleOpacity = rippleAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.4, 0]
    });

    const rippleScale = rippleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1.2]
    });

    const rippleYOffset = rippleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-strokeWidth * 0.5, strokeWidth]
    });

    // Steam animation
    const steamTranslateY = steamAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -size * 0.3]
    });
    const steamOpacity = steamAnim.interpolate({
        inputRange: [0, 0.3, 0.7, 1],
        outputRange: [0, 0.4, 0.6, 0]
    });

    // Create gradient ID based on colors for uniqueness
    const gradientId = `waterGradient_${primaryColor.replace('#', '')}`;
    const glassGradientId = `glassGradient_${size}`;

    return (
        <View style={[
            styles.container,
            withShadow && styles.shadow,
            { width: size + handleWidth, height: size }
        ]}>
            {showSteam && progress > 0.8 && (
                <Animated.View style={[
                    styles.steamContainer,
                    {
                        opacity: steamOpacity,
                        transform: [{ translateY: steamTranslateY }]
                    }
                ]}>
                    <Svg width={bodyWidth * 0.6} height={size * 0.3}>
                        <Path
                            d={`M ${bodyWidth * 0.3} ${size * 0.3} Q ${bodyWidth * 0.15} ${size * 0.2} ${bodyWidth * 0.3} ${size * 0.1} T ${bodyWidth * 0.45} ${0}`}
                            fill="none"
                            stroke="#F0F9FF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeOpacity="0.6"
                        />
                        <Path
                            d={`M ${bodyWidth * 0.5} ${size * 0.3} Q ${bodyWidth * 0.35} ${size * 0.2} ${bodyWidth * 0.5} ${size * 0.1} T ${bodyWidth * 0.65} ${0}`}
                            fill="none"
                            stroke="#F0F9FF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeOpacity="0.4"
                        />
                    </Svg>
                </Animated.View>
            )}

            <Svg width={size + handleWidth} height={size} viewBox={`0 0 ${size + handleWidth} ${size}`}>
                <Defs>
                    {/* Water gradient */}
                    <SvgGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={primaryColor} stopOpacity="0.9" />
                        <Stop offset="0.5" stopColor={secondaryColor} stopOpacity="0.95" />
                        <Stop offset="1" stopColor={secondaryColor} stopOpacity="0.8" />
                    </SvgGradient>

                    {/* Glass gradient */}
                    <SvgGradient id={glassGradientId} x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
                        <Stop offset="0.5" stopColor="#F8FAFC" stopOpacity="0.7" />
                        <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.9" />
                    </SvgGradient>

                    {/* Mug clip path */}
                    <ClipPath id="mugClip">
                        <Rect
                            x={strokeWidth}
                            y={rimHeight}
                            width={bodyWidth - strokeWidth * 2}
                            height={bodyHeight - rimHeight - strokeWidth}
                            rx={size * 0.02}
                        />
                    </ClipPath>

                    {/* Inner shine clip */}
                    <ClipPath id="innerShine">
                        <Rect
                            x={strokeWidth * 2}
                            y={rimHeight * 1.5}
                            width={bodyWidth * 0.3}
                            height={bodyHeight * 0.6}
                            rx={size * 0.01}
                        />
                    </ClipPath>
                </Defs>

                {/* Handle with gradient */}
                <Path
                    d={`M ${bodyWidth} ${size * 0.25} 
               C ${size + handleWidth * 0.8} ${size * 0.15}, 
                 ${size + handleWidth * 0.8} ${size * 0.65}, 
                 ${bodyWidth} ${size * 0.75}`}
                    fill="none"
                    stroke="url(#glassGradientId)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />

                {/* Handle inner shadow */}
                <Path
                    d={`M ${bodyWidth + strokeWidth} ${size * 0.28} 
               C ${size + handleWidth * 0.8} ${size * 0.18}, 
                 ${size + handleWidth * 0.8} ${size * 0.62}, 
                 ${bodyWidth + strokeWidth} ${size * 0.72}`}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth={strokeWidth * 0.5}
                    strokeLinecap="round"
                />

                {/* Mug body with glass effect */}
                <Rect
                    x="0"
                    y="0"
                    width={bodyWidth}
                    height={bodyHeight}
                    rx={size * 0.04}
                    fill="url(#glassGradientId)"
                    stroke="#E2E8F0"
                    strokeWidth={strokeWidth}
                />

                {/* Rim of the mug */}
                <Rect
                    x={strokeWidth * 0.5}
                    y="0"
                    width={bodyWidth - strokeWidth}
                    height={rimHeight}
                    rx={size * 0.02}
                    fill="#F1F5F9"
                    stroke="#CBD5E1"
                    strokeWidth={strokeWidth * 0.5}
                />

                {/* Inner rim shadow */}
                <Rect
                    x={strokeWidth}
                    y={rimHeight - strokeWidth * 0.5}
                    width={bodyWidth - strokeWidth * 2}
                    height={strokeWidth}
                    fill="#E2E8F0"
                />

                {/* Water content */}
                <G clipPath="url(#mugClip)">
                    <AnimatedRect
                        x={strokeWidth}
                        y={bodyHeight - strokeWidth}
                        width={bodyWidth - strokeWidth * 2}
                        height={Animated.multiply(fillHeight, -1)}
                        fill={`url(#${gradientId})`}
                    />

                    {/* Meniscus / Surface Curve */}
                    <G transform={`translate(0, ${bodyHeight - strokeWidth})`}>
                        <AnimatedG style={{ transform: [{ translateY: Animated.multiply(fillHeight, -1) }] }}>
                            <Path
                                d={`M ${strokeWidth} 0 Q ${bodyWidth / 2} ${-strokeWidth * 0.5} ${bodyWidth - strokeWidth} 0`}
                                fill="none"
                                stroke="#FFFFFF"
                                strokeWidth="1.5"
                                strokeOpacity="0.5"
                            />
                            {/* Surface Shine Fill */}
                            <Path
                                d={`M ${strokeWidth} 0 Q ${bodyWidth / 2} 4 ${bodyWidth - strokeWidth} 0`}
                                fill="#FFFFFF"
                                opacity="0.2"
                            />

                            {/* Dynamic Ripple */}
                            {showRipple && (
                                <AnimatedG style={{
                                    opacity: rippleOpacity,
                                    transform: [{ scale: rippleScale }, { translateY: rippleYOffset }]
                                }}>
                                    <Circle
                                        cx={bodyWidth / 2}
                                        cy={0}
                                        r={bodyWidth * 0.25}
                                        fill="none"
                                        stroke="#FFFFFF"
                                        strokeWidth="1"
                                    />
                                </AnimatedG>
                            )}
                        </AnimatedG>
                    </G>
                </G>

                {/* Inner glass shine */}
                <Rect
                    x={strokeWidth * 2}
                    y={rimHeight * 1.5}
                    width={bodyWidth * 0.3}
                    height={bodyHeight * 0.6}
                    rx={size * 0.01}
                    fill="#FFFFFF"
                    opacity="0.3"
                    clipPath="url(#innerShine)"
                />

                {/* Reflection on glass */}
                <Path
                    d={`M ${bodyWidth * 0.7} ${rimHeight * 2} 
               Q ${bodyWidth * 0.8} ${bodyHeight * 0.3}, 
                 ${bodyWidth * 0.6} ${bodyHeight * 0.7}`}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="1"
                    strokeOpacity="0.2"
                    strokeLinecap="round"
                />
            </Svg>

            {/* Water level indicator */}
            <View style={styles.levelIndicator}>
                <Animated.Text style={[
                    styles.levelText,
                    {
                        transform: [{
                            translateY: Animated.multiply(fillHeight, -0.5)
                        }]
                    }
                ]}>
                    {`${Math.round(progress * 100)}%`}
                </Animated.Text>
            </View>
        </View>
    );
};

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    steamContainer: {
        position: 'absolute',
        top: 0,
        left: '50%',
        marginLeft: -30,
        zIndex: 1,
    },
    levelIndicator: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        marginLeft: -25,
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    levelText: {
        color: '#1E293B',
        fontSize: 12,
        fontWeight: 'bold',
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
});

export default WaterMug;