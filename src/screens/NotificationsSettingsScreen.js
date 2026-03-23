import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    TouchableOpacity,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Theme';

const NotificationsSettingsScreen = ({ navigation }) => {
    const [settings, setSettings] = useState({
        pushEnabled: true,
        workoutReminders: true,
        mealReminders: false,
        friendRequests: true,
        communityUpdates: false
    });

    const toggleSwitch = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderToggle = (label, subLabel, key) => (
        <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>{label}</Text>
                {subLabel && <Text style={styles.toggleSub}>{subLabel}</Text>}
            </View>
            <Switch
                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                thumbColor={COLORS.white}
                ios_backgroundColor="#E2E8F0"
                onValueChange={() => toggleSwitch(key)}
                value={settings[key]}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General</Text>
                    {renderToggle('Push Notifications', 'Enable notifications for this app', 'pushEnabled')}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Reminders</Text>
                    {renderToggle('Workout Reminders', 'Get notified for scheduled workouts', 'workoutReminders')}
                    {renderToggle('Meal Reminders', 'Reminders to log your meals', 'mealReminders')}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Social</Text>
                    {renderToggle('Friend Requests', 'When someone adds you', 'friendRequests')}
                    {renderToggle('Community Updates', 'News from your clubs', 'communityUpdates')}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: COLORS.white,
    },
    backBtn: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 30,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#94A3B8',
        marginBottom: 15,
        marginLeft: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    toggleSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
});

export default NotificationsSettingsScreen;
