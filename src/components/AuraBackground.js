import React, { useEffect, useState, useContext } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { AppContext } from '../context/AppContext';
import { COLORS } from '../constants/Theme';

const { width, height } = Dimensions.get('window');

const AuraBackground = ({ children, style }) => {
    const { colors: themeColors } = useContext(AppContext);
    const [auraAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(auraAnim, {
                    toValue: 1,
                    duration: 6000,
                    useNativeDriver: true,
                }),
                Animated.timing(auraAnim, {
                    toValue: 0,
                    duration: 6000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const auraX1 = auraAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
    const auraY1 = auraAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    const auraX2 = auraAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
    const auraY2 = auraAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background || COLORS.background }, style]}>
            {/* Background Auras */}
            <Animated.View style={[
                styles.auraCircle,
                {
                    top: height * 0.1,
                    right: -20,
                    backgroundColor: themeColors.accent,
                    opacity: 0.15,
                    transform: [{ translateX: auraX1 }, { translateY: auraY1 }]
                }
            ]} />
            <Animated.View style={[
                styles.auraCircle,
                {
                    bottom: height * 0.2,
                    left: -40,
                    backgroundColor: themeColors.primary,
                    opacity: 0.1,
                    width: 250,
                    height: 250,
                    borderRadius: 125,
                    transform: [{ translateX: auraX2 }, { translateY: auraY2 }, { scale: auraAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }]
                }
            ]} />
            <Animated.View style={[
                styles.auraCircle,
                {
                    top: height * 0.5,
                    left: width * 0.3,
                    backgroundColor: themeColors.secondary || themeColors.accent,
                    opacity: 0.05,
                    width: 200,
                    height: 200,
                    borderRadius: 100,
                    transform: [{ scale: auraAnim.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.8] }) }]
                }
            ]} />

            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    auraCircle: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        // In React Native, blur is best handled via library or just soft opacity/gradients
        // Since we want standard behavior, we use opacity and multiple overlapping circles
    }
});

export default AuraBackground;
