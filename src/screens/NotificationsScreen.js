import React, { useState, useCallback, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    FlatList,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { api } from '../services/api';
import { AppContext } from '../context/AppContext';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const NotificationsScreen = ({ navigation }) => {
    const { user, token, colors: themeColors, checkNotifications } = useContext(AppContext);
    const [requests, setRequests] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)';
    const cardBg = themeColors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

    const fetchData = async () => {
        if (!user?.user_id && !user?.id) return;
        try {
            const [reqRes, notifRes] = await Promise.all([
                api.getFriendRequests(),
                api.getNotifications()
            ]);

            if (reqRes.status === 200) setRequests(reqRes.data.records || []);
            if (notifRes.status === 200) setNotifications(notifRes.data.records || []);

            // Sync the global unread count
            checkNotifications();
        } catch (error) {
            console.error("Fetch Data Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user?.user_id || user?.id])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleRequestResponse = async (friendId, action) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const res = await api.respondToFriendRequest(friendId, action);
            if (res.status === 200) {
                setRequests(requests.filter(r => r.id !== friendId));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Alert.alert("Error", res.data.message || "Failed to process request");
            }
        } catch (error) {
            Alert.alert("Error", "Network error");
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const res = await api.markNotificationRead(notificationId);
            if (res.status === 200) {
                setNotifications(notifications.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
                checkNotifications();
            }
        } catch (error) {
            console.error("Mark Read Error:", error);
        }
    };

    const renderNotification = ({ item, index }) => (
        <AnimatedCard delay={index * 50} style={styles.cardWrapper}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => !item.is_read && handleMarkAsRead(item.id)}>
                <GlassCard style={styles.notifCard}>
                    <View style={[styles.iconBox, { backgroundColor: (item.color || themeColors.accent) + '20' }]}>
                        <Ionicons name={item.icon || 'notifications'} size={20} color={item.color || themeColors.accent} />
                    </View>
                    <View style={styles.contentBox}>
                        <View style={styles.headerRow}>
                            <Text style={[styles.notifTitle, { color: textColor }]}>{item.title}</Text>
                            <Text style={[styles.timeText, { color: subTextColor }]}>{item.time}</Text>
                        </View>
                        <Text style={[styles.messageText, { color: subTextColor }]} numberOfLines={2}>
                            {item.message}
                        </Text>
                        {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: themeColors.accent }]} />}
                    </View>
                </GlassCard>
            </TouchableOpacity>
        </AnimatedCard>
    );

    const renderFriendRequest = ({ item, index }) => (
        <AnimatedCard delay={index * 50} style={styles.cardWrapper}>
            <GlassCard style={[styles.requestCard, { borderLeftWidth: 4, borderLeftColor: themeColors.accent }]}>
                <Image source={{ uri: item.avatar }} style={styles.reqAvatar} />
                <View style={styles.reqInfo}>
                    <Text style={[styles.reqText, { color: subTextColor }]}>
                        <Text style={[styles.reqName, { color: textColor }]}>{item.name}</Text> sent you a friend request.
                    </Text>
                    <View style={styles.reqActions}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleRequestResponse(item.id, 'accept')}
                        >
                            <LinearGradient
                                colors={themeColors.gradient}
                                style={styles.actionGrad}
                            >
                                <Text style={styles.acceptText}>Accept</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={() => handleRequestResponse(item.id, 'decline')}
                        >
                            <Text style={[styles.declineText, { color: subTextColor }]}>Decline</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </GlassCard>
        </AnimatedCard>
    );

    const integratedData = [
        ...requests.map(r => ({ ...r, isRequest: true })),
        ...notifications.map(n => ({ ...n, isRequest: false }))
    ];

    const handleMarkAllRead = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const res = await api.markAllNotificationsRead();
            if (res.status === 200) {
                setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                checkNotifications();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            console.error("Mark All Read Error:", error);
        }
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.navRow}>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={styles.iconBlur}>
                            <Ionicons name="chevron-back" size={24} color={textColor} />
                        </BlurView>
                    </TouchableOpacity>
                    <View style={styles.titleStack}>
                        <Text style={[styles.eliteTitle, { color: textColor }]}>Notifications</Text>
                        <Text style={[styles.eliteSubtitle, { color: themeColors.accent }]}>STAY CONNECTED</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={handleMarkAllRead}
                    >
                        <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={styles.iconBlur}>
                            <Ionicons name="checkmark-done-all" size={20} color={textColor} />
                        </BlurView>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style={themeColors.isDark ? "light" : "dark"} />
            {renderHeader()}

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={themeColors.accent} />
                </View>
            ) : (
                <FlatList
                    data={integratedData}
                    renderItem={({ item, index }) =>
                        item.isRequest ? renderFriendRequest({ item, index }) : renderNotification({ item, index })
                    }
                    keyExtractor={(item, index) => (item.id || index).toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={themeColors.accent}
                            colors={[themeColors.accent]}
                            progressBackgroundColor={themeColors.isDark ? '#1E293B' : 'white'}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: cardBg }]}>
                                <Ionicons name="notifications-off-outline" size={40} color={subTextColor} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: textColor }]}>All caught up!</Text>
                            <Text style={[styles.emptySub, { color: subTextColor }]}>No new notifications or requests at the moment.</Text>
                        </View>
                    }
                />
            )}
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingBottom: 10,
    },
    headerSafe: {
        paddingHorizontal: 25,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    headerActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
    },
    iconBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleStack: {
        alignItems: 'center',
    },
    eliteTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    eliteSubtitle: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginTop: 2,
    },
    listContent: {
        paddingHorizontal: 25,
        paddingTop: 10,
        paddingBottom: 40,
    },
    cardWrapper: {
        marginBottom: 15,
        backgroundColor: 'transparent',
    },
    notifCard: {
        flexDirection: 'row',
        borderRadius: 25,
        padding: 16,
        alignItems: 'center',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    contentBox: {
        flex: 1,
        position: 'relative',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    notifTitle: {
        fontSize: 14,
        fontWeight: '900',
        flex: 1,
        marginRight: 10,
    },
    timeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    messageText: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    unreadDot: {
        position: 'absolute',
        top: 2,
        right: -5,
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    requestCard: {
        flexDirection: 'row',
        borderRadius: 25,
        padding: 16,
        alignItems: 'center',
    },
    reqAvatar: {
        width: 54,
        height: 54,
        borderRadius: 18,
        marginRight: 15,
        backgroundColor: '#1E293B',
    },
    reqInfo: {
        flex: 1,
    },
    reqText: {
        fontSize: 14,
        marginBottom: 12,
        lineHeight: 20,
        fontWeight: '500',
    },
    reqName: {
        fontWeight: '900',
    },
    reqActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        height: 38,
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionGrad: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    declineText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 6,
    },
    emptySub: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        paddingHorizontal: 50,
        lineHeight: 18,
    },
});

export default NotificationsScreen;
