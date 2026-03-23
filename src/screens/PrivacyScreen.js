import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Theme';

const PrivacyScreen = ({ navigation }) => {

    const handleAction = (action) => {
        Alert.alert("Coming Soon", `${action} functionality will be available in the next update.`);
    };

    const renderItem = (icon, label, onPress) => (
        <TouchableOpacity style={styles.itemRow} onPress={onPress}>
            <View style={styles.itemLeft}>
                <View style={styles.iconBox}>
                    <Ionicons name={icon} size={20} color="#64748B" />
                </View>
                <Text style={styles.itemLabel}>{label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy & Security</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Security</Text>
                    {renderItem('key-outline', 'Change Password', () => handleAction('Change Password'))}
                    {renderItem('finger-print-outline', 'Biometric Login', () => handleAction('Biometric Login'))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Privacy</Text>
                    {renderItem('eye-off-outline', 'Blocked Users', () => handleAction('Blocked Users'))}
                    {renderItem('settings-outline', 'Data Preferences', () => handleAction('Data Preferences'))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => Alert.alert("Delete Account", "Are you sure? This cannot be undone.", [{ text: "Cancel" }, { text: "Delete", style: 'destructive' }])}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        <Text style={styles.deleteText}>Delete Account</Text>
                    </TouchableOpacity>
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
        marginBottom: 25,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 5,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#94A3B8',
        marginBottom: 10,
        marginTop: 15,
        marginLeft: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#0F172A',
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        gap: 10,
    },
    deleteText: {
        color: '#EF4444',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default PrivacyScreen;
