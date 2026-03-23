import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS, SIZES } from '../constants/Theme';

const GlassCard = ({ children, style }) => {
    return (
        <View style={[styles.glass, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    glass: {
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        borderRadius: SIZES.radius + 8,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
});

export default GlassCard;
