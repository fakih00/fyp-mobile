import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { api } from '../services/api';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const MyFriendsScreen = ({ navigation }) => {
    const { user, colors: themeColors } = useContext(AppContext);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)';
    const cardBg = themeColors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

    const fetchFriends = async () => {
        try {
            const res = await api.getFriends();
            if (res.status === 200) {
                setFriends(res.data.records || []);
            }
        } catch (error) {
            console.error("Fetch Friends Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchFriends();
        }, [])
    );

    const renderFriendItem = ({ item, index }) => (
        <AnimatedCard delay={index * 50} style={styles.cardWrapper}>
            <GlassCard style={styles.cardElite}>
                <TouchableOpacity
                    style={styles.cardContent}
                    onPress={() => navigation.navigate('Chat', { friend: item })}
                >
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{ uri: item.avatar }}
                            style={styles.avatar}
                        />
                        <View style={[styles.statusDot, { backgroundColor: item.status === 'Online' ? '#10B981' : '#94A3B8' }]} />
                    </View>
                    <View style={styles.info}>
                        <Text style={[styles.name, { color: textColor }]}>{item.name}</Text>
                        <Text style={[styles.status, { color: subTextColor }]}>{item.status || 'Offline'}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.chatBtn, { backgroundColor: themeColors.accent + '20' }]}
                        onPress={() => navigation.navigate('Chat', { friend: item })}
                    >
                        <Ionicons name="chatbubble-ellipses" size={20} color={themeColors.accent} />
                    </TouchableOpacity>
                </TouchableOpacity>
            </GlassCard>
        </AnimatedCard>
    );

    const filteredFriends = friends.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        <Text style={[styles.eliteTitle, { color: textColor }]}>My Friends</Text>
                        <Text style={[styles.eliteSubtitle, { color: themeColors.accent }]}>YOUR CIRCLE</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate('FindFriends');
                        }}
                    >
                        <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={styles.iconBlur}>
                            <Ionicons name="person-add" size={22} color={textColor} />
                        </BlurView>
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <AnimatedCard delay={100} style={styles.searchWrapper}>
                    <GlassCard style={styles.searchBarElite}>
                        <Ionicons name="search" size={20} color={subTextColor} />
                        <TextInput
                            placeholder="Find a friend..."
                            style={[styles.searchInput, { color: textColor }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor={subTextColor}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={subTextColor} />
                            </TouchableOpacity>
                        )}
                    </GlassCard>
                </AnimatedCard>
            </SafeAreaView>
        </View>
    );

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style={themeColors.isDark ? "light" : "dark"} />
            {renderHeader()}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={themeColors.accent} />
                </View>
            ) : (
                <FlatList
                    data={filteredFriends}
                    renderItem={renderFriendItem}
                    keyExtractor={item => (item.id || item.user_id).toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: cardBg }]}>
                                <Ionicons name="people-outline" size={40} color={subTextColor} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: textColor }]}>Lonely here...</Text>
                            <Text style={[styles.emptySub, { color: subTextColor }]}>Sync with your fitness buddies and start competing!</Text>
                            <TouchableOpacity
                                style={[styles.findBtn, { backgroundColor: themeColors.accent }]}
                                onPress={() => navigation.navigate('FindFriends')}
                            >
                                <Text style={styles.findBtnText}>FIND FRIENDS</Text>
                            </TouchableOpacity>
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
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
    searchWrapper: {
        marginTop: 25,
        backgroundColor: 'transparent',
    },
    searchBarElite: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        fontWeight: '600',
    },
    list: {
        paddingHorizontal: 25,
        paddingTop: 10,
        paddingBottom: 40,
    },
    cardWrapper: {
        marginBottom: 15,
        backgroundColor: 'transparent',
    },
    cardElite: {
        borderRadius: 25,
        padding: 0,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 20,
        backgroundColor: '#1E293B',
    },
    statusDot: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: 'white',
    },
    info: {
        flex: 1,
        marginLeft: 15,
    },
    name: {
        fontSize: 16,
        fontWeight: '900',
    },
    status: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    chatBtn: {
        width: 44,
        height: 44,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
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
        marginBottom: 30,
    },
    findBtn: {
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 15,
    },
    findBtnText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
    }
});

export default MyFriendsScreen;
