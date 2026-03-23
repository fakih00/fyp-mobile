import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DebugScreen = () => (
    <View style={styles.container}>
        <Text style={styles.text}>Debug Screen</Text>
        <Text>If you see this, the core app structure is working.</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    }
});

export default DebugScreen;
