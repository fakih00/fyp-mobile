import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

const AnimatedCard = ({ children, delay = 0, style }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                delay,
                useNativeDriver: true,
                easing: Easing.out(Easing.poly(4)),
            }),
            Animated.timing(translateYAnim, {
                toValue: 0,
                duration: 600,
                delay,
                useNativeDriver: true,
                easing: Easing.out(Easing.poly(4)),
            }),
        ]).start();
    }, [delay]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: translateYAnim }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

export default AnimatedCard;
