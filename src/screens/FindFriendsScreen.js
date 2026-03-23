import React, { useState, useEffect, useContext, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    ActivityIndicator,
    Alert,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES, THEMES } from '../constants/Theme';
import { api } from '../services/api';
import { AppContext } from '../context/AppContext';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';

const FindFriendsScreen = ({ navigation }) => {
    const { user, token, colors: themeColors } = useContext(AppContext);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingIds, setAddingIds] = useState([]);
    const floatingAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        fetchUsers();
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
                Animated.timing(floatingAnim, { toValue: 0, duration: 4000, useNativeDriver: true })
            ])
        ).start();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.getAllUsers();
            if (res.status === 200) {
                setUsers(res.data.records || []);
            }
        } catch (error) {
            console.error("Fetch Users Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async (friendId) => {
        setAddingIds([...addingIds, friendId]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const res = await api.addFriend(friendId);
            if (res.status === 200) {
                setUsers(users.map(u =>
                    u.id === friendId ? { ...u, friendship_status: 'pending' } : u
                ));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Alert.alert("Error", res.data.message || "Could not send request");
            }
        } catch (error) {
            Alert.alert("Error", "Network error");
        } finally {
            setAddingIds(addingIds.filter(id => id !== friendId));
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderUserItem = ({ item, index }) => {
        const isPending = item.friendship_status === 'pending';
        const isAccepted = item.friendship_status === 'accepted';

        return (
            <AnimatedCard delay={index * 50 + 400} style={styles.userCardElite}>
                <GlassCard style={styles.userGlass}>
                    <Image source={{ uri: item.avatar }} style={styles.avatarElite} />
                    <View style={styles.userInfoElite}>
                        <Text style={styles.userNameElite}>{item.name}</Text>
                        <View style={styles.statsRowElite}>
                            <View style={[styles.badgeElite, { backgroundColor: themeColors.accent + '15' }]}>
                                <Text style={[styles.badgeTextElite, { color: themeColors.accent }]}>LVL {item.level}</Text>
                            </View>
                            <Text style={styles.pointsTextElite}>{item.points} XP</Text>
                        </View>
                    </View>

                    {isAccepted ? (
                        <View style={styles.statusBadgeElite}>
                            <Ionicons name="checkmark-circle" size={28} color={themeColors.accent} />
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.addBtnElite,
                                (addingIds.includes(item.id) || isPending) && styles.disabledBtnElite,
                                !isPending && !addingIds.includes(item.id) && { backgroundColor: themeColors.accent }
                            ]}
                            onPress={() => !isPending && handleAddFriend(item.id)}
                            disabled={addingIds.includes(item.id) || isPending}
                        >
                            {addingIds.includes(item.id) ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : isPending ? (
                                <Ionicons name="time" size={20} color="#94A3B8" />
                            ) : (
                                <Ionicons name="person-add" size={20} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    )}
                </GlassCard>
            </AnimatedCard>
        );
    };

    const renderHeader = () => (
        <View style={styles.headerStack}>
            <LinearGradient
                colors={themeColors.gradient}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <Animated.View style={[
                styles.floatingIcon,
                {
                    top: 20,
                    right: 40,
                    opacity: 0.1,
                    transform: [{ translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }) }]
                }
            ]}>
                <Ionicons name="people" size={45} color={COLORS.white} />
            </Animated.View>

            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.navRow}>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <BlurView intensity={20} tint="light" style={styles.iconBlur}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>
                    <View style={styles.titleStack}>
                        <Text style={styles.eliteTitle}>Find Friends</Text>
                        <Text style={styles.eliteSubtitle}>EXPAND YOUR CIRCLE</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                <AnimatedCard delay={200} style={styles.searchCard}>
                    <GlassCard style={styles.searchGlass}>
                        <Ionicons name="search" size={20} color={themeColors.accent} />
                        <TextInput
                            placeholder="Search by name..."
                            style={styles.searchInputElite}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="rgba(255,255,255,0.4)"
                        />
                    </GlassCard>
                </AnimatedCard>
            </SafeAreaView>
        </View>
    );

    return (
        <AuraBackground style={styles.container}>
            {renderHeader()}

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={themeColors.accent} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredUsers}
                        renderItem={renderUserItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={60} color="rgba(255,255,255,0.15)" />
                                <Text style={styles.emptyText}>No users found to add</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerStack: {
        height: 180,
        position: 'relative',
        zIndex: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
    },
    headerSafe: {
        flex: 1,
        paddingHorizontal: 20,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 5,
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
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    eliteSubtitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 2,
        marginTop: 2,
    },
    searchCard: {
        marginTop: 25,
    },
    searchGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 20,
    },
    searchInputElite: {
        flex: 1,
        marginLeft: 12,
        height: 50,
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    content: {
        flex: 1,
    },
    listContent: {
        padding: 20,
        paddingTop: 30,
        paddingBottom: 40,
    },
    userCardElite: {
        marginBottom: 15,
    },
    userGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 25,
    },
    avatarElite: {
        width: 55,
        height: 55,
        borderRadius: 20,
        marginRight: 15,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    userInfoElite: {
        flex: 1,
    },
    userNameElite: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 4,
    },
    statsRowElite: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    badgeElite: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeTextElite: {
        fontSize: 10,
        fontWeight: '900',
    },
    pointsTextElite: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    addBtnElite: {
        width: 44,
        height: 44,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    disabledBtnElite: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        elevation: 0,
        shadowOpacity: 0,
    },
    statusBadgeElite: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        fontWeight: '700',
        marginTop: 15,
    },
    floatingIcon: {
        position: 'absolute',
        zIndex: 1,
    },
});

export default FindFriendsScreen;
