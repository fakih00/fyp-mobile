import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/Theme';

const EliteSubscriptionScreen = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' }}
                style={styles.bgImage}
            >
                <LinearGradient
                    colors={['transparent', '#0F172A']}
                    style={styles.gradient}
                >
                    <SafeAreaView style={styles.safeArea}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                            <Ionicons name="close-circle" size={32} color={COLORS.white} />
                        </TouchableOpacity>

                        <View style={styles.content}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>SUBSCRIPTION PREVIEW</Text>
                            </View>
                            <Text style={styles.title}>Unlock Your Full Potential</Text>
                            <Text style={styles.subtitle}>Get personalized AI coaching, advanced analytics, and exclusive content.</Text>

                            <View style={styles.features}>
                                <FeatureItem text="AI-Powered Workout Plans" />
                                <FeatureItem text="Advanced Health Analytics" />
                                <FeatureItem text="Exclusive Nutrition Guides" />
                                <FeatureItem text="Priority Support" />
                            </View>

                            <TouchableOpacity style={[styles.upgradeBtn, { opacity: 0.6 }]} disabled>
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.btnGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.btnText}>Subscriptions Not Available</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <Text style={styles.disclaimer}>No billing or paid subscription is enabled.</Text>
                        </View>
                    </SafeAreaView>
                </LinearGradient>
            </ImageBackground>
        </View>
    );
};

const FeatureItem = ({ text }) => (
    <View style={styles.featureRow}>
        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        <Text style={styles.featureText}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    bgImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    gradient: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    safeArea: {
        flex: 1,
    },
    closeBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
    },
    content: {
        padding: 30,
        paddingBottom: 50,
    },
    badge: {
        backgroundColor: '#10B981',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 15,
    },
    badgeText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 1,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 10,
        lineHeight: 42,
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginBottom: 30,
        lineHeight: 24,
    },
    features: {
        gap: 15,
        marginBottom: 40,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    featureText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    upgradeBtn: {
        width: '100%',
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 15,
        elevation: 10,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
    },
    btnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    disclaimer: {
        color: '#64748B',
        textAlign: 'center',
        fontSize: 12,
    },
});

export default EliteSubscriptionScreen;
