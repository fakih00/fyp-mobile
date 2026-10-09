import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ImageBackground,
    ActivityIndicator,
    Dimensions,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { api } from '../services/api';
import { AnimatedCard, GlassCard, AuraBackground, ClubDetailModal } from '../components';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const MyClubsScreen = ({ navigation }) => {
    const { user, colors: themeColors } = useContext(AppContext);
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClub, setSelectedClub] = useState(null);
    const [updating, setUpdating] = useState(false);

    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)';
    const cardBg = themeColors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

    const fetchClubs = async () => {
        try {
            const res = await api.getClubs();
            if (res.status === 200) {
                const allClubs = res.data.records || [];
                const joinedClubs = allClubs.filter(c => c.is_member);
                setClubs(joinedClubs);
                setSelectedClub(current => current ? allClubs.find(club => club.id === current.id) || null : null);
            }
        } catch (error) {
            console.error("Fetch Clubs Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchClubs();
        }, [user?.user_id])
    );

    const handleMembership = async (clubId) => {
        if (updating) return;
        setUpdating(true);
        try {
            const res = await api.joinClub(clubId);
            if (res.status === 200) await fetchClubs();
            else Alert.alert('Could not update membership', res.data?.message || 'Please retry.');
        } finally {
            setUpdating(false);
        }
    };

    const renderClubItem = ({ item, index }) => (
        <AnimatedCard delay={index * 100} style={styles.cardWrapper}>
            <TouchableOpacity
                activeOpacity={0.9}
                style={styles.cardBtn}
                onPress={() => setSelectedClub(item)}
            >
                <ImageBackground
                    source={{ uri: item.image }}
                    style={styles.bgImage}
                    imageStyle={{ borderRadius: 30 }}
                >
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.9)']}
                        style={styles.cardGradient}
                    >
                        <View style={styles.tagBadge}>
                            <BlurView intensity={30} tint="light" style={styles.tagBlur}>
                                <Text style={styles.tagText}>{item.tag.toUpperCase()}</Text>
                            </BlurView>
                        </View>
                        <Text style={styles.clubName}>{item.name}</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Ionicons name="people" size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.membersText}>{item.members} Members</Text>
                            </View>
                            <View style={[styles.activePill, { backgroundColor: themeColors.accent + '30' }]}>
                                <View style={[styles.activeDot, { backgroundColor: themeColors.accent }]} />
                                <Text style={[styles.activeText, { color: themeColors.accent }]}>MEMBER</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </ImageBackground>
            </TouchableOpacity>
        </AnimatedCard>
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
                        <Text style={[styles.eliteTitle, { color: textColor }]}>My Clubs</Text>
                        <Text style={[styles.eliteSubtitle, { color: themeColors.accent }]}>YOUR COMMUNITY</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>
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
                    data={clubs}
                    renderItem={renderClubItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: cardBg }]}>
                                <Ionicons name="people-circle-outline" size={40} color={subTextColor} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: textColor }]}>Join the movement!</Text>
                            <Text style={[styles.emptySub, { color: subTextColor }]}>You haven't joined any fitness clubs yet.</Text>
                            <TouchableOpacity
                                style={[styles.browseBtn, { backgroundColor: themeColors.accent }]}
                                onPress={() => navigation.navigate('Main', { screen: 'Social' })}
                            >
                                <Text style={styles.browseBtnText}>BROWSE CLUBS</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
            <ClubDetailModal visible={!!selectedClub} club={selectedClub} isMember={!!selectedClub?.is_member} onClose={() => setSelectedClub(null)} onJoinLeave={handleMembership} />
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
    list: {
        paddingHorizontal: 25,
        paddingTop: 10,
        paddingBottom: 40,
    },
    cardWrapper: {
        marginBottom: 20,
        height: 200,
        borderRadius: 30,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    cardBtn: {
        flex: 1,
    },
    bgImage: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    cardGradient: {
        padding: 24,
        paddingTop: 60,
    },
    tagBadge: {
        position: 'absolute',
        top: 20,
        left: 20,
        borderRadius: 10,
        overflow: 'hidden',
    },
    tagBlur: {
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    tagText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 9,
        letterSpacing: 1,
    },
    clubName: {
        color: 'white',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    membersText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '600',
    },
    activePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 6,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    activeText: {
        fontSize: 9,
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
        marginBottom: 30,
    },
    browseBtn: {
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 15,
    },
    browseBtnText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
    }
});

export default MyClubsScreen;
