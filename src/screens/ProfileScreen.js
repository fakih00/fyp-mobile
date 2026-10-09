import React, { useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
    Modal,
    Alert,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES, THEMES } from '../constants/Theme';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ route, navigation }) => {
    const { user, updateUserProfileImage, logout, themeName, setThemeName, colors: themeColors } = useContext(AppContext);
    const { friendId } = route?.params || {};
    const isFriendProfile = !!friendId;

    const [profileData, setProfileData] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [selectedSetting, setSelectedSetting] = useState(null);
    const floatingAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
                Animated.timing(floatingAnim, { toValue: 0, duration: 4000, useNativeDriver: true })
            ])
        ).start();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchUserProfile();
        }, [friendId, user?.user_id])
    );

    const fetchUserProfile = async () => {
        try {
            const res = await api.getUser(friendId || null);
            if (res.status === 200) {
                setProfileData(res.data);
                setAchievements(res.data.achievements || []);
            }
        } catch (e) {
            console.error("Failed to fetch profile", e);
        }
    };

    const pickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true
        });

        if (!result.canceled) {
            const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
            if (await updateUserProfileImage(base64Uri)) {
                await fetchUserProfile();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else Alert.alert('Photo not saved', 'Choose an image under 6 MB and retry.');
        }
    };

    const stats = [
        { id: '1', label: 'Workouts', value: profileData?.stats?.workouts || '0', icon: 'barbell', color: '#10B981' },
        { id: '2', label: 'Streak', value: `${profileData?.profile?.streak ?? (isFriendProfile ? 0 : user.profile?.streak ?? 0)} Days`, icon: 'flame', color: '#F59E0B' },
        { id: '3', label: 'Current XP', value: Number(profileData?.profile?.xp ?? (isFriendProfile ? 0 : user.xp ?? 0)).toLocaleString(), icon: 'trending-up', color: '#3B82F6' },
    ];

    const handleAction = (label) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleOpenSettings = (label) => {
        handleAction(label);
        switch (label) {
            case 'Edit Profile': navigation.navigate('EditProfile'); break;
            case 'Notifications': navigation.navigate('NotificationsSettings'); break;
            case 'Privacy & Security': navigation.navigate('Privacy'); break;
            case 'Elite Subscription': navigation.navigate('EliteSubscription'); break;
            default:
                setSelectedSetting(label);
                setShowSettingsModal(true);
                break;
        }
    };

    const renderSettingItem = (icon, label, onPress, isLast = false) => (
        <TouchableOpacity
            style={[styles.settingItem, !isLast ? styles.borderBottom : null]}
            onPress={() => {
                handleAction(label);
                onPress && onPress();
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.settingIconBoxElite, { backgroundColor: themeColors.accent + '15' }]}>
                    <Ionicons name={icon} size={18} color={themeColors.accent} />
                </View>
                <Text style={styles.settingTextElite}>{label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>
    );

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
                    top: 25,
                    left: 20,
                    opacity: 0.1,
                    transform: [{ translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }) }]
                }
            ]}>
                <Ionicons name="trophy" size={40} color={COLORS.white} />
            </Animated.View>

            <Animated.View style={[
                styles.floatingIcon,
                {
                    bottom: 30,
                    right: 30,
                    opacity: 0.08,
                    transform: [{ translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }]
                }
            ]}>
                <Ionicons name="medal" size={35} color={COLORS.white} />
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
                        <Text style={styles.eliteTitle}>Profile</Text>
                        <Text style={styles.eliteSubtitle}>ELITE MEMBER</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        disabled={isFriendProfile}
                        onPress={() => handleOpenSettings('App Theme')}
                    >
                        <BlurView intensity={20} tint="light" style={styles.iconBlur}>
                            <Ionicons name="color-palette" size={20} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );

    return (
        <AuraBackground style={styles.container}>
            {renderHeader()}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
                {/* Profile Card Floating */}
                <AnimatedCard delay={100} style={styles.profileCardElite}>
                    <GlassCard style={styles.profileGlass}>
                        <View style={styles.profileMainRow}>
                            <View style={styles.avatarWrapperElite}>
                                <TouchableOpacity
                                    activeOpacity={isFriendProfile ? 1 : 0.9}
                                    onPress={isFriendProfile ? null : pickImage}
                                    style={styles.avatarBorderElite}
                                >
                                    {(isFriendProfile ? profileData?.profile?.avatar : user.profileImage) ? (
                                        <Image source={{ uri: isFriendProfile ? profileData?.profile?.avatar : user.profileImage }} style={styles.avatarInnerImage} />
                                    ) : (
                                        <LinearGradient colors={themeColors.gradient} style={styles.avatarInnerElite}>
                                            <Text style={styles.avatarTextElite}>{(isFriendProfile ? profileData?.name : user.name)?.[0] || '?'}</Text>
                                        </LinearGradient>
                                    )}
                                </TouchableOpacity>
                                {!isFriendProfile && (
                                    <TouchableOpacity style={styles.editBadgeElite} onPress={pickImage}>
                                        <Ionicons name="camera" size={12} color={COLORS.white} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={styles.userInfoElite}>
                                <Text style={styles.userNameElite}>{isFriendProfile ? (profileData?.name || 'Loading...') : user.name}</Text>
                                <View style={[styles.statusBadgeElite, { backgroundColor: themeColors.accent + '15' }]}>
                                    <Ionicons name="shield-checkmark" size={10} color={themeColors.accent} />
                                    <Text style={[styles.statusTextElite, { color: themeColors.accent }]}>LEVEL {isFriendProfile ? (profileData?.profile?.level || 1) : user.level} ATHLETE</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.quickStatsRow}>
                            <TouchableOpacity disabled={isFriendProfile} onPress={() => navigation.navigate('MyFriends')} style={styles.quickStatItem}>
                                <Text style={styles.quickStatVal}>{profileData?.stats?.friends || 0}</Text>
                                <Text style={styles.quickStatLab}>Friends</Text>
                            </TouchableOpacity>
                            <View style={styles.statDivider} />
                            <TouchableOpacity disabled={isFriendProfile} onPress={() => navigation.navigate('MyClubs')} style={styles.quickStatItem}>
                                <Text style={styles.quickStatVal}>{profileData?.stats?.clubs || 0}</Text>
                                <Text style={styles.quickStatLab}>Clubs</Text>
                            </TouchableOpacity>
                            <View style={styles.statDivider} />
                            <View style={styles.quickStatItem}>
                                <Text style={styles.quickStatVal}>{profileData?.profile?.points ?? (isFriendProfile ? 0 : user.points ?? 0)}</Text>
                                <Text style={styles.quickStatLab}>Points</Text>
                            </View>
                        </View>
                    </GlassCard>
                </AnimatedCard>

                {/* Dashboard Stats */}
                <View style={styles.statsGridElite}>
                    {stats.map((stat, index) => (
                        <TouchableOpacity
                            key={stat.id}
                            activeOpacity={0.8}
                            disabled={isFriendProfile}
                            onPress={() => navigation.navigate('Progress')}
                            style={styles.statTouch}
                        >
                            <AnimatedCard delay={index * 100 + 200} style={styles.statCardElite}>
                                <GlassCard style={styles.statGlass}>
                                    <View style={[styles.statIconFrame, { backgroundColor: stat.color + '15' }]}>
                                        <Ionicons name={stat.icon} size={20} color={stat.color} />
                                    </View>
                                    <View style={styles.statTextGrp}>
                                        <Text style={styles.statValueElite}>{stat.value}</Text>
                                        <Text style={styles.statLabelElite}>{stat.label.toUpperCase()}</Text>
                                    </View>
                                </GlassCard>
                            </AnimatedCard>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Achievements */}
                <View style={styles.sectionElite}>
                    <View style={styles.sectionHeaderElite}>
                        <Text style={styles.sectionTitleElite}>Achievements</Text>
                        <TouchableOpacity disabled={isFriendProfile} onPress={() => navigation.navigate('Achievements')}>
                            <Text style={[styles.seeAllElite, { color: themeColors.accent }]}>VIEW ALL</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementScrollElite}>
                        {achievements.length > 0 ? (
                            achievements.map((item, index) => (
                                <AnimatedCard key={index} delay={400 + index * 100} style={styles.achievementCardElite}>
                                    <GlassCard style={styles.achGlass}>
                                        <View style={styles.achIconCircle}>
                                            <Text style={{ fontSize: 24 }}>🏆</Text>
                                        </View>
                                        <Text style={styles.achTitleElite}>{item.title}</Text>
                                        <Text style={styles.achDateElite}>Completed</Text>
                                    </GlassCard>
                                </AnimatedCard>
                            ))
                        ) : (
                            <Text style={{ color: '#94A3B8', fontStyle: 'italic', marginLeft: 10 }}>
                                No achievements yet. Complete challenges to earn them!
                            </Text>
                        )}
                    </ScrollView>
                </View>

                {/* Settings — only for own profile */}
                {!isFriendProfile && (
                    <>
                        {/* Settings Group 1 */}
                        <View style={styles.sectionElite}>
                            <Text style={styles.sectionTitleElite}>Account & Security</Text>
                            <AnimatedCard delay={600} style={styles.settingsCardElite}>
                                <GlassCard style={styles.settingsGlass}>
                                    {renderSettingItem('person-outline', 'Edit Profile', () => handleOpenSettings('Edit Profile'))}
                                    {renderSettingItem('notifications-outline', 'Notifications', () => handleOpenSettings('Notifications'))}
                                    {renderSettingItem('shield-checkmark-outline', 'Privacy & Security', () => handleOpenSettings('Privacy & Security'))}
                                    {renderSettingItem('card-outline', 'Elite Subscription', () => handleOpenSettings('Elite Subscription'), true)}
                                </GlassCard>
                            </AnimatedCard>
                        </View>

                        {/* Settings Group 2 */}
                        <View style={styles.sectionElite}>
                            <Text style={styles.sectionTitleElite}>App Settings</Text>
                            <AnimatedCard delay={700} style={styles.settingsCardElite}>
                                <GlassCard style={styles.settingsGlass}>
                                    {renderSettingItem('color-palette-outline', 'App Theme', () => handleOpenSettings('App Theme'))}
                                    {renderSettingItem('help-circle-outline', 'Support Center', () => handleOpenSettings('Support Center'))}
                                    {renderSettingItem('information-circle-outline', 'About App', () => handleOpenSettings('About App'), true)}
                                </GlassCard>
                            </AnimatedCard>
                        </View>

                        <TouchableOpacity
                            style={styles.logoutBtnElite}
                            onPress={() => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                Alert.alert(
                                    "Logout",
                                    "Are you sure you want to exit your Elite session?",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                            text: "Sign Out",
                                            style: "destructive",
                                            onPress: () => {
                                                logout();
                                                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                                            }
                                        }
                                    ]
                                );
                            }}
                        >
                            <Ionicons name="log-out" size={20} color="#EF4444" />
                            <Text style={styles.logoutTextElite}>SIGN OUT</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* Friend Profile Actions */}
                {isFriendProfile && (
                    <View style={styles.friendActionsSection}>
                        <TouchableOpacity
                            style={[styles.friendActionPrimaryBtn, { backgroundColor: themeColors.accent }]}
                            onPress={() => navigation.navigate('Chat', { friend: { id: friendId, name: profileData?.name, avatar: profileData?.profile?.avatar } })}
                        >
                            <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.white} />
                            <Text style={styles.friendActionPrimaryText}>Send Message</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Modal remains largely similar but with themeColors integration */}
            <Modal visible={showSettingsModal} transparent={true} animationType="slide" onRequestClose={() => setShowSettingsModal(false)}>
                <View style={styles.modalOverlay}>
                    <BlurView intensity={80} tint="dark" style={styles.modalBlur}>
                        <View style={styles.modalContentElite}>
                            <View style={styles.modalHeaderElite}>
                                <Text style={styles.modalTitleElite}>{selectedSetting}</Text>
                                <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                                    <Ionicons name="close-circle" size={28} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.modalBodyElite}>
                                {selectedSetting === 'App Theme' ? (
                                    <View style={styles.themeGridElite}>
                                        {Object.keys(THEMES).map((theme) => (
                                            <TouchableOpacity
                                                key={theme}
                                                style={styles.themeOptionElite}
                                                onPress={async () => {
                                                    if (!await setThemeName(theme)) Alert.alert('Theme not saved', 'Please retry.');
                                                    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                }}
                                            >
                                                <View style={[
                                                    styles.themeCircleElite,
                                                    {
                                                        backgroundColor: THEMES[theme].primary,
                                                        borderColor: themeName === theme ? themeColors.accent : 'rgba(255,255,255,0.2)',
                                                        borderWidth: themeName === theme ? 3 : 2
                                                    }
                                                ]} />
                                                <Text style={[
                                                    styles.themeLabelElite,
                                                    themeName === theme && { color: themeColors.accent, fontWeight: '900' }
                                                ]}>{theme}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : selectedSetting === 'About App' ? (
                                    <View style={styles.aboutAppContainer}>
                                        <View style={styles.aboutAppLogoRow}>
                                            <View style={[styles.aboutAppLogoBg, { backgroundColor: themeColors.accent + '20' }]}>
                                                <Ionicons name="sparkles" size={28} color={themeColors.accent} />
                                            </View>
                                            <View style={styles.aboutAppTextStack}>
                                                <Text style={styles.aboutAppName}>Elite Fitness AI</Text>
                                                <Text style={styles.aboutAppVer}>Version 1.0.0 · Final-Year Project</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.aboutAppDesc}>
                                            An advanced, athletic intelligence platform engineered to synchronize biomechanical tracking, nutritional algorithms, and real-time training optimizations into a personalized fitness blueprint.
                                        </Text>
                                        <View style={styles.aboutAppMetaRow}>
                                            <View style={styles.aboutAppMetaItem}>
                                                <Text style={styles.aboutAppMetaTitle}>AI Models</Text>
                                                <Text style={[styles.aboutAppMetaValue, { color: themeColors.accent }]}>Local Models + Gemini</Text>
                                            </View>
                                            <View style={styles.aboutAppMetaItem}>
                                                <Text style={styles.aboutAppMetaTitle}>Platform</Text>
                                                <Text style={styles.aboutAppMetaValue}>React Native / Expo</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.aboutAppCopyright}>Elite Fitness · 2026</Text>
                                    </View>
                                ) : selectedSetting === 'Support Center' ? (
                                    <View style={styles.supportContainer}>
                                        <Text style={styles.supportIntro}>How can we assist your athletic journey today?</Text>
                                        
                                        {/* Contact Channels */}
                                        <View style={styles.supportChannelsRow}>
                                            <TouchableOpacity 
                                                style={[styles.supportChannelCard, { borderColor: themeColors.accent + '30' }]}
                                                onPress={() => Alert.alert('Project Support', 'Contact your project team for account or application assistance.')}
                                            >
                                                <Ionicons name="mail" size={20} color={themeColors.accent} />
                                                <Text style={styles.supportChannelTitle}>Project Support</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[styles.supportChannelCard, { borderColor: themeColors.accent + '30' }]}
                                                onPress={() => {
                                                    setShowSettingsModal(false);
                                                    navigation.navigate('AIChat');
                                                }}
                                            >
                                                <Ionicons name="chatbubble-ellipses" size={20} color={themeColors.accent} />
                                                <Text style={styles.supportChannelTitle}>Ask AI Coach</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* FAQs */}
                                        <Text style={styles.supportFaqHeader}>Frequently Asked Questions</Text>
                                        <View style={styles.supportFaqList}>
                                            {[
                                                { q: "How does exercise analysis work?", a: "PoseForm analyzes a recorded or uploaded exercise video and returns estimated reps and form feedback." },
                                                { q: "How do I change my daily goal?", a: "Navigate to Edit Profile from account settings and change your Primary Goal." },
                                                { q: "When do my plans change?", a: "Saved plans stay in place until you request a new plan. Update your profile before generating new recommendations." }
                                            ].map((faq, idx) => (
                                                <TouchableOpacity 
                                                    key={idx} 
                                                    style={styles.supportFaqItem}
                                                    onPress={() => Alert.alert(faq.q, faq.a)}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.supportFaqQ} numberOfLines={1}>{faq.q}</Text>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ) : (
                                    <Text style={styles.modalPlaceholderText}>
                                        Manage your profile, notifications, privacy, theme, support, and account details from the available profile settings.
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.modalActionBtnElite, { backgroundColor: themeColors.primary }]}
                                onPress={() => setShowSettingsModal(false)}
                            >
                                <Text style={styles.modalActionTextElite}>CLOSE</Text>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </View>
            </Modal>
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    friendActionsSection: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
    },
    friendActionPrimaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    friendActionPrimaryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.3,
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
        marginTop: 15,
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
    profileCardElite: {
        marginHorizontal: 20,
        marginTop: -30,
        zIndex: 20,
    },
    profileGlass: {
        padding: 20,
        borderRadius: 30,
    },
    profileMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 20,
    },
    avatarWrapperElite: {
        position: 'relative',
    },
    avatarBorderElite: {
        width: 75,
        height: 75,
        borderRadius: 28,
        padding: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    avatarInnerElite: {
        flex: 1,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInnerImage: {
        flex: 1,
        borderRadius: 25,
    },
    avatarTextElite: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.white,
    },
    editBadgeElite: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 24,
        height: 24,
        borderRadius: 10,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    userInfoElite: {
        flex: 1,
        gap: 4,
    },
    userNameElite: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.text,
    },
    statusBadgeElite: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        alignSelf: 'flex-start',
        gap: 6,
    },
    statusTextElite: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    quickStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    quickStatItem: {
        alignItems: 'center',
        gap: 2,
    },
    quickStatVal: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.text,
    },
    quickStatLab: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    scrollPadding: {
        paddingTop: 60,
        paddingBottom: 40,
    },
    statsGridElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 25,
        marginBottom: 30,
    },
    statTouch: {
        width: (width - 60) / 3,
    },
    statCardElite: {
        width: '100%',
    },
    statGlass: {
        padding: 12,
        borderRadius: 22,
        alignItems: 'center',
    },
    statIconFrame: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    statTextGrp: {
        alignItems: 'center',
    },
    statValueElite: {
        fontSize: 14,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 2,
    },
    statLabelElite: {
        fontSize: 8,
        fontWeight: '900',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    sectionElite: {
        marginBottom: 25,
        paddingHorizontal: 20,
    },
    sectionHeaderElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitleElite: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    seeAllElite: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    achievementScrollElite: {
        gap: 12,
    },
    achievementCardElite: {
        width: 115,
    },
    achGlass: {
        padding: 15,
        borderRadius: 25,
        alignItems: 'center',
    },
    achIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    achTitleElite: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 2,
    },
    achDateElite: {
        fontSize: 9,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    settingsCardElite: {
        width: '100%',
    },
    settingsGlass: {
        borderRadius: 25,
        padding: 5,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    settingIconBoxElite: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    settingTextElite: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    logoutBtnElite: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        padding: 18,
        marginHorizontal: 20,
        borderRadius: 22,
        gap: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.1)',
    },
    logoutTextElite: {
        fontSize: 13,
        fontWeight: '900',
        color: '#EF4444',
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBlur: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContentElite: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 30,
        paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    },
    modalHeaderElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    modalTitleElite: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.text,
    },
    modalBodyElite: {
        marginBottom: 30,
    },
    modalPlaceholderText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    modalActionBtnElite: {
        padding: 18,
        borderRadius: 20,
        alignItems: 'center',
    },
    modalActionTextElite: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    themeGridElite: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
        justifyContent: 'center',
    },
    themeOptionElite: {
        alignItems: 'center',
        width: '40%',
        gap: 10,
    },
    themeCircleElite: {
        width: 50,
        height: 50,
        borderRadius: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    themeLabelElite: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '600',
    },
    floatingIcon: {
        position: 'absolute',
        zIndex: 1,
    },
    aboutAppContainer: {
        gap: 15,
    },
    aboutAppLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 5,
    },
    aboutAppLogoBg: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aboutAppTextStack: {
        gap: 3,
    },
    aboutAppName: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.text,
    },
    aboutAppVer: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    aboutAppDesc: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 20,
        fontWeight: '500',
    },
    aboutAppMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.03)',
        padding: 15,
        borderRadius: 18,
        marginTop: 5,
    },
    aboutAppMetaItem: {
        gap: 4,
    },
    aboutAppMetaTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    aboutAppMetaValue: {
        fontSize: 13,
        fontWeight: '900',
        color: COLORS.text,
    },
    aboutAppCopyright: {
        fontSize: 10,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 10,
        fontWeight: '600',
    },
    supportContainer: {
        gap: 15,
    },
    supportIntro: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '600',
        marginBottom: 5,
    },
    supportChannelsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    supportChannelCard: {
        flex: 1,
        borderWidth: 1.5,
        borderRadius: 18,
        padding: 16,
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    supportChannelTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.text,
    },
    supportFaqHeader: {
        fontSize: 14,
        fontWeight: '900',
        color: COLORS.text,
        marginTop: 10,
        letterSpacing: 0.5,
    },
    supportFaqList: {
        gap: 8,
    },
    supportFaqItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 14,
    },
    supportFaqQ: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.text,
    },
});

export default ProfileScreen;
