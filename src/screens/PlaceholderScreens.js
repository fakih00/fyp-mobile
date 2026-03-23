import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../constants/Theme';

const Placeholder = ({ name }) => (
    <View style={styles.container}>
        <Text style={styles.text}>{name}</Text>
        <Text style={{ color: COLORS.textSecondary }}>Coming Soon</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    text: {
        ...FONTS.h1,
        color: COLORS.primary,
    }
});

// Implementation for these exists in separate files.
// Placeholder is kept here for any future feature expansion.
export const FutureFeatureScreen = () => <Placeholder name="Future Feature" />;
