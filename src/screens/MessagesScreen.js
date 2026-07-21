import React, { useState, useCallback, useContext, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
    Animated,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SIZES, THEMES } from '../constants/Theme';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { api } from '../services/api';
import { AppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');

const MessagesScreen = ({ navigation }) => {
    const { user, themeName, colors: themeColors } = useContext(AppContext);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const floatingAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatingAnim, { toValue: 0, duration: 3000, useNativeDriver: true })
            ])
        ).start();
    }, []);

    const fetchConversations = async () => {
        if (!user?.user_id) return;
        try {
            const res = await api.getConversations();
            if (res.status === 200) {
                setConversations(res.data.records || []);
            }
        } catch (error) {
            console.error("Fetch Conversations Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchConversations();
        }, [user?.user_id])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchConversations();
    };

    const renderHeader = () => (
        <View style={styles.headerStack}>
            <LinearGradient
                colors={themeColors.gradient}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Floating Auras */}
            <Animated.View style={[
                styles.floatingIcon,
                {
                    top: 20,
                    left: 40,
                    opacity: 0.1,
                    transform: [
                        { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) }
                    ]
                }
            ]}>
                <Ionicons name="chatbubbles" size={30} color={COLORS.white} />
            </Animated.View>

            <Animated.View style={[
                styles.floatingIcon,
                {
                    bottom: 20,
                    right: 60,
                    opacity: 0.08,
                    transform: [
                        { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -15] }) }
                    ]
                }
            ]}>
                <Ionicons name="flash" size={25} color={COLORS.white} />
            </Animated.View>
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.navRow}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <BlurView intensity={20} tint="light" style={styles.iconBlur}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>
                    <View style={styles.titleStack}>
                        <Text style={styles.eliteTitle}>Messages</Text>
                        <Text style={styles.eliteSubtitle}>YOUR CONVERSATIONS</Text>
                    </View>
                    <TouchableOpacity style={styles.headerActionBtn} onPress={() => setSearchVisible(v => !v)}>
                        <BlurView intensity={20} tint="light" style={styles.iconBlur}>
                            <Ionicons name={searchVisible ? 'close' : 'search'} size={20} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );

    const filteredConversations = conversations.filter(c =>
        !searchQuery || c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AuraBackground style={styles.container}>
            {renderHeader()}
            {searchVisible && (
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color={COLORS.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search conversations..."
                        placeholderTextColor={COLORS.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                </View>
            )}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollPadding}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.accent} />
                }
            >
                {/* Active Squad Scroller */}
                <View style={styles.activeSection}>
                    <Text style={styles.sectionTitle}>Active Now</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeScrollContent}>
                        {filteredConversations.filter(c => c.status !== 'Offline').map((friend, index) => (
                            <TouchableOpacity
                                key={friend.id}
                                style={styles.activeUser}
                                onPress={() => navigation.navigate('Chat', { friend })}
                            >
                                <View style={styles.activeAvatarFrame}>
                                    <Image source={{ uri: friend.avatar }} style={styles.activeAvatarImg} />
                                    <View style={[styles.onlineDot, { backgroundColor: themeColors.accent }]} />
                                </View>
                                <Text style={styles.activeName}>{(friend.name || 'User').split(' ')[0]}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Conversation List */}
                <View style={styles.chatListSection}>
                    <Text style={styles.sectionTitle}>Recent Chats</Text>
                    {loading && !refreshing ? (
                        <ActivityIndicator color={themeColors.accent} style={{ marginTop: 20 }} />
                    ) : filteredConversations.length > 0 ? (
                        filteredConversations.map((friend, index) => (
                            <AnimatedCard key={friend.id} delay={index * 100} style={styles.chatItemElite}>
                                <GlassCard>
                                    <TouchableOpacity
                                        style={styles.chatItemContent}
                                        onPress={() => navigation.navigate('Chat', { friend })}
                                    >
                                        <View style={styles.avatarWrapper}>
                                            <Image source={{ uri: friend.avatar }} style={styles.listAvatarImg} />
                                            {friend.status !== 'Offline' && <View style={[styles.statusDotList, { backgroundColor: themeColors.accent }]} />}
                                        </View>

                                        <View style={styles.chatInfo}>
                                            <View style={styles.chatHeaderRow}>
                                                <Text style={styles.chatName}>{friend.name}</Text>
                                                <Text style={styles.chatTime}>{friend.last_message_time || 'Just now'}</Text>
                                            </View>
                                            <View style={styles.chatPreviewRow}>
                                                <Text style={styles.chatPreview} numberOfLines={1}>
                                                    {friend.last_message}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </GlassCard>
                            </AnimatedCard>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={60} color="#CBD5E1" />
                            <Text style={styles.emptyText}>No conversations yet</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <TouchableOpacity
                style={[styles.fabElite, { shadowColor: themeColors.accent }]}
                onPress={() => navigation.navigate('Main', { screen: 'Social' })}
            >
                <LinearGradient
                    colors={themeColors.gradient}
                    style={styles.fabGradientElite}
                >
                    <Ionicons name="create" size={28} color={COLORS.white} />
                </LinearGradient>
            </TouchableOpacity>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerStack: {
        height: 140,
        position: 'relative',
        zIndex: 10,
        overflow: 'visible',
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    headerSafe: {
        flex: 1,
        paddingHorizontal: 20,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 15,
    },
    backBtn: {
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
    headerActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
    },
    scrollPadding: {
        paddingTop: 10,
        paddingBottom: 100,
    },
    activeSection: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.text,
        marginHorizontal: 20,
        marginBottom: 15,
        letterSpacing: 0.5,
    },
    activeScrollContent: {
        paddingHorizontal: 20,
        gap: 15,
    },
    activeUser: {
        alignItems: 'center',
    },
    activeAvatarFrame: {
        width: 62,
        height: 62,
        borderRadius: 24,
        padding: 2,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    activeAvatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    onlineDot: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 14,
        height: 14,
        borderRadius: 7,
        // backgroundColor handled dynamically
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    activeName: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textSecondary,
        marginTop: 8,
    },
    chatListSection: {
        paddingHorizontal: 20,
    },
    chatItemElite: {
        marginBottom: 12,
    },
    chatItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    avatarWrapper: {
        position: 'relative',
    },
    listAvatarImg: {
        width: 55,
        height: 55,
        borderRadius: 20,
    },
    statusDotList: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        // backgroundColor handled dynamically
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    chatInfo: {
        flex: 1,
        marginLeft: 15,
        gap: 4,
    },
    chatHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    chatTime: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    chatPreviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatPreview: {
        fontSize: 13,
        color: COLORS.textSecondary,
        flex: 1,
        marginRight: 10,
    },
    fabElite: {
        position: 'absolute',
        bottom: 30,
        right: 25,
        width: 60,
        height: 60,
        borderRadius: 22,
        elevation: 8,
        // shadowColor handled dynamically
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    fabGradientElite: {
        flex: 1,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        gap: 15,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        marginHorizontal: 20,
        marginTop: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '600',
    },
    floatingIcon: {
        position: 'absolute',
        zIndex: 1,
    },
});

export default MessagesScreen;
