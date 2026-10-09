import React, { useState, useContext, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    TouchableOpacity,
    ScrollView,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Theme';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { AppContext } from '../context/AppContext';

const NotificationsSettingsScreen = ({ navigation }) => {
    const { user, checkNotifications } = useContext(AppContext);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        enabled: true,
        activityUpdates: true,
        friendRequests: true,
        communityUpdates: true
    });
    useFocusEffect(useCallback(() => {
        let cancelled = false;
        const load = async () => {
            const res = await api.getUser();
            if (cancelled) return;
            if (res.status === 200) setSettings(current => ({ ...current, ...res.data.profile.notification_preferences }));
            else Alert.alert('Preferences unavailable', res.data?.message || 'Please reopen this screen.');
            setLoading(false);
        };
        load();
        return () => { cancelled = true; };
    }, [user?.user_id]));

    const toggleSwitch = async (key) => {
        if (saving || loading) return;
        const previous = settings;
        const next = { ...settings, [key]: !settings[key] };
        setSettings(next);
        setSaving(true);
        try {
            const res = await api.updateProfile({ notification_preferences: next });
            if (res.status !== 200) {
                setSettings(previous);
                Alert.alert('Preferences not saved', res.data?.message || 'Please retry.');
            } else await checkNotifications();
        } finally {
            setSaving(false);
        }
    };

    const renderToggle = (label, subLabel, key) => (
        <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>{label}</Text>
                {subLabel && <Text style={styles.toggleSub}>{subLabel}</Text>}
            </View>
            <Switch
                accessibilityLabel={label}
                disabled={saving || loading || (key !== 'enabled' && !settings.enabled)}
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
                    {renderToggle('In-App Notifications', 'Show alerts in your notification inbox', 'enabled')}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Activity</Text>
                    {renderToggle('Activity Updates', 'Achievements, challenges and account updates', 'activityUpdates')}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Social</Text>
                    {renderToggle('Friend Requests', 'When someone adds you', 'friendRequests')}
                    {renderToggle('Community Updates', 'Likes and comments on your posts', 'communityUpdates')}
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
