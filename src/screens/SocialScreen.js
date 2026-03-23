import React, { useState, useContext, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { RefreshControl } from 'react-native';
import { api } from '../services/api';
import { AppContext } from '../context/AppContext';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    Dimensions,
    Alert,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import {
    AnimatedCard,
    GlassCard,
    CreatePostModal,
    CreateClubModal,
    PostDetailModal,
    ClubDetailModal,
    AuraBackground
} from '../components';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const CATEGORIES = ['All', 'Friends', 'Clubs', 'Discover'];

const SocialScreen = ({ navigation }) => {
    const { user, token, colors: themeColors } = useContext(AppContext);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Data State
    const [posts, setPosts] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [friends, setFriends] = useState([]);
    const [myClubs, setMyClubs] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);
    const [selectedClub, setSelectedClub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [floatingAnim] = useState(new Animated.Value(0));

    // Modals State
    const [showPostModal, setShowPostModal] = useState(false);
    const [showClubModal, setShowClubModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showClubDetailModal, setShowClubDetailModal] = useState(false);

    const fetchSocialData = async () => {
        if (!user?.user_id) return;

        try {
            const [feedRes, clubsRes, friendsRes] = await Promise.all([
                api.getFeed(),
                api.getClubs(),
                api.getFriends()
            ]);

            if (feedRes.status === 200) setPosts(feedRes.data.records || []);
            if (clubsRes.status === 200) {
                const clubsData = clubsRes.data.records || [];
                setClubs(clubsData);
                const memberClubs = clubsData.filter(c => c.is_member).map(c => c.id);
                setMyClubs(memberClubs);
            }
            if (friendsRes.status === 200) {
                setFriends(friendsRes.data.records);
            }

        } catch (error) {
            console.error("Fetch Social Data Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchSocialData();
        }, [user?.user_id])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchSocialData();
    };

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatingAnim, {
                    toValue: 0,
                    duration: 4000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const handleCreatePost = async (newPostData) => {
        const res = await api.createPost(
            newPostData.content,
            newPostData.image,
            newPostData.visibility
        );
        if (res.status === 201) {
            fetchSocialData();
        }
    };

    const handleCreateClub = async (newClubData) => {
        const res = await api.createClub(
            newClubData.name,
            newClubData.tag,
            newClubData.description,
            newClubData.image
        );
        if (res.status === 201) {
            fetchSocialData();
        }
    };

    const handleLike = async (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const res = await api.likePost(id);
        if (res.status === 200) {
            // Optimistic update
            setPosts(posts.map(post =>
                post.id === id
                    ? {
                        ...post,
                        likes: res.data.liked ? post.likes + 1 : post.likes - 1,
                        liked: res.data.liked
                    }
                    : post
            ));
        }
    };

    const handleDeletePost = (postId) => {
        Alert.alert(
            "Delete Post",
            "Are you sure you want to remove this post?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        // Optimistic update
                        setPosts(posts.filter(p => p.id !== postId));
                        await api.deletePost(postId);
                    }
                }
            ]
        );
    };

    const openPostDetail = (post) => {
        setSelectedPost(post);
        setShowDetailModal(true);
    };

    const openClubDetail = (club) => {
        setSelectedClub(club);
        setShowClubDetailModal(true);
    };

    const handleJoinLeaveClub = async (clubId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const res = await api.joinClub(clubId);
        if (res.status === 200) {
            setMyClubs(prev =>
                res.data.is_member
                    ? [...prev, clubId]
                    : prev.filter(id => id !== clubId)
            );
            // Update clubs state as well to reflect member count
            fetchSocialData();
        }
    };

    const handleAddComment = (postId, comment) => {
        setPosts(posts.map(post =>
            post.id === postId
                ? {
                    ...post,
                    comments_count: (post.comments_count || 0) + 1,
                    comments: [...(post.comments || []), comment]
                }
                : post
        ));
        // Update selected post if it's the one we're viewing
        if (selectedPost && selectedPost.id === postId) {
            setSelectedPost({
                ...selectedPost,
                comments_count: (selectedPost.comments_count || 0) + 1,
                comments: [...(selectedPost.comments || []), comment]
            });
        }
    };

    const renderSearchBar = () => (
        <View style={styles.searchSectionElite}>
            <View style={styles.searchContainerElite}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                    placeholder="Find friends or clubs..."
                    style={styles.searchInputElite}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#94A3B8"
                />
            </View>
        </View>
    );

    const renderCategories = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroller}
            contentContainerStyle={styles.categoryContent}
        >
            {CATEGORIES.map((cat, index) => (
                <TouchableOpacity
                    key={index}
                    style={[
                        styles.catChip,
                        selectedCategory === cat && styles.catChipActive
                    ]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedCategory(cat);
                    }}
                >
                    <Text style={[
                        styles.catText,
                        selectedCategory === cat && styles.catTextActive
                    ]}>
                        {cat.toUpperCase()}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderFriends = () => (
        <View style={styles.sectionElite}>
            <View style={styles.sectionHeaderElite}>
                <Text style={styles.sectionTitleElite}>Your Squad</Text>
                <TouchableOpacity
                    style={[styles.addFriendBtnElite, { backgroundColor: themeColors.accent + '22', borderColor: themeColors.accent + '33' }]}
                    onPress={() => navigation.navigate('FindFriends')}
                >
                    <Ionicons name="person-add" size={14} color={themeColors.accent} />
                    <Text style={[styles.addFriendText, { color: themeColors.accent }]}>ADD NEW</Text>
                </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsScrollContent}>
                {(friends || []).filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((friend, index) => (
                    <AnimatedCard key={friend.id} delay={100 + index * 50} style={styles.friendCardElite}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => navigation.navigate('Chat', { friend })}
                        >
                            <View style={styles.friendAvatarFrame}>
                                <Image source={{ uri: friend.avatar }} style={styles.friendAvatarImg} />
                                <View style={[
                                    styles.friendStatusIndicator,
                                    { backgroundColor: friend.status === 'Offline' ? '#94A3B8' : themeColors.accent }
                                ]} />
                            </View>
                            <Text style={styles.friendNameElite} numberOfLines={1}>{(friend.name || 'User').split(' ')[0]}</Text>
                        </TouchableOpacity>
                    </AnimatedCard>
                ))}
            </ScrollView>
        </View>
    );

    const renderClubs = () => (
        <View style={styles.sectionElite}>
            <View style={styles.sectionHeaderElite}>
                <Text style={styles.sectionTitleElite}>Featured Clubs</Text>
                <TouchableOpacity onPress={() => setShowClubModal(true)}>
                    <Text style={styles.seeAllElite}>CREATE CLUB</Text>
                </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clubsScrollContent}>
                {(clubs || []).filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((club, index) => (
                    <AnimatedCard key={club.id} delay={index * 100} style={styles.clubCardElite}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => openClubDetail(club)}
                            style={{ flex: 1 }}
                        >
                            <Image source={{ uri: club.image }} style={styles.clubImgElite} />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.7)']}
                                style={styles.clubOverlayElite}
                            >
                                <View style={styles.clubTagElite}>
                                    <Text style={styles.clubTagTextElite}>{club.tag}</Text>
                                </View>
                                <Text style={styles.clubTitleElite}>{club.name}</Text>
                                <View style={styles.clubStatRow}>
                                    <Ionicons name="people" size={12} color="#CBD5E1" />
                                    <Text style={styles.clubMembersElite}>{club.members}</Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.clubJoinBtnElite, myClubs.includes(club.id) && styles.joinedBtnElite]}
                                    onPress={(e) => {
                                        // e.stopPropagation() is not needed here as we use nested touches carefully, 
                                        // but it's good practice. React Native handles this differently.
                                        handleJoinLeaveClub(club.id);
                                    }}
                                >
                                    <Text style={[styles.joinBtnTextElite, myClubs.includes(club.id) && { color: COLORS.white }]}>
                                        {myClubs.includes(club.id) ? 'MEMBER' : 'JOIN CLUB'}
                                    </Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </TouchableOpacity>
                    </AnimatedCard>
                ))}
            </ScrollView>
        </View>
    );

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView edges={['top']} style={styles.safeTop} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollPadding}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.accent]} />
                }
            >
                <View style={styles.headerBasicElite}>
                    <View>
                        <Text style={styles.titleBasicElite}>Community</Text>
                        <Text style={styles.subtitleBasicElite}>CONNECT & GROW</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={[styles.actionBtnBasic, { marginRight: 10 }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setShowPostModal(true);
                            }}
                        >
                            <Ionicons name="add" size={28} color={themeColors.accent} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionBtnBasic}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.navigate('Messages');
                            }}
                        >
                            <Ionicons name="chatbubbles" size={24} color={themeColors.accent} />
                            <View style={styles.notifDotBasic} />
                        </TouchableOpacity>
                    </View>
                </View>

                {renderSearchBar()}
                {renderCategories()}

                {(selectedCategory === 'All' || selectedCategory === 'Friends') && renderFriends()}
                {(selectedCategory === 'All' || selectedCategory === 'Clubs') && renderClubs()}

                <View style={styles.sectionElite}>
                    <View style={styles.sectionHeaderElite}>
                        <Text style={styles.sectionTitleElite}>Global Feed</Text>
                        <View style={styles.sectionLine} />
                    </View>

                    {/* Create Post Shortcut */}
                    <TouchableOpacity
                        style={styles.createPostShortcut}
                        activeOpacity={0.9}
                        onPress={() => setShowPostModal(true)}
                    >
                        <Image
                            source={{ uri: user?.profileImage }}
                            style={styles.shortcutAvatar}
                        />
                        <View style={styles.shortcutInput}>
                            <Text style={styles.shortcutText}>What's on your mind, {user?.name?.split(' ')[0] || 'Member'}?</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.shortcutIconBtn}
                            onPress={() => setShowPostModal(true)}
                        >
                            <Ionicons name="images" size={24} color={themeColors.accent} />
                        </TouchableOpacity>
                    </TouchableOpacity>

                    <View style={styles.feedContainerElite}>
                        {(posts || []).filter(p =>
                            p?.content?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
                            p?.user?.toLowerCase()?.includes(searchQuery.toLowerCase())
                        ).map((post, index) => (
                            <AnimatedCard key={post.id} delay={300 + index * 100} style={styles.postCardElite}>
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => openPostDetail(post)}
                                >
                                    <View style={styles.postHeaderElite}>
                                        <View style={styles.postUserGrp}>
                                            <View style={styles.postAvatarCircle}>
                                                <Image source={{ uri: post.avatar }} style={styles.postAvatarImgSmall} />
                                            </View>
                                            <View>
                                                <Text style={styles.postAuthorName}>{post.user || 'User'}</Text>
                                                <Text style={styles.postTimestamp}>{post.time || 'now'}</Text>
                                            </View>
                                        </View>
                                        {post.user_id == user?.user_id && (
                                            <TouchableOpacity
                                                style={styles.moreOptionsBtn}
                                                onPress={() => handleDeletePost(post.id)}
                                            >
                                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <Text style={styles.postBodyText}>{post.content}</Text>

                                    {post.image && (
                                        <View style={styles.postImageWrapper}>
                                            <Image source={{ uri: post.image }} style={styles.postImageContent} />
                                        </View>
                                    )}

                                    <View style={styles.postFooterElite}>
                                        <View style={styles.footerActionRow}>
                                            <TouchableOpacity
                                                style={styles.interactionBtn}
                                                onPress={() => handleLike(post.id)}
                                            >
                                                <Ionicons
                                                    name={post.liked ? "heart" : "heart-outline"}
                                                    size={22}
                                                    color={post.liked ? themeColors.accent : '#64748B'}
                                                />
                                                <Text style={[styles.interactionText, post.liked && { color: themeColors.accent }]}>{post.likes}</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.interactionBtn}
                                                onPress={() => openPostDetail(post)}
                                            >
                                                <Ionicons name="chatbubble-outline" size={20} color="#64748B" />
                                                <Text style={styles.interactionText}>{post.comments_count || 0}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <TouchableOpacity style={styles.shareBtnElite}>
                                            <Ionicons name="share-social-outline" size={20} color="#64748B" />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            </AnimatedCard>
                        ))}
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>


            <CreatePostModal
                visible={showPostModal}
                user={user}
                onClose={() => setShowPostModal(false)}
                onSubmit={handleCreatePost}
            />

            <CreateClubModal
                visible={showClubModal}
                user={user}
                onClose={() => setShowClubModal(false)}
                onSubmit={handleCreateClub}
            />

            <PostDetailModal
                visible={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                post={selectedPost}
                currentUser={user}
                onAddComment={handleAddComment}
            />

            <ClubDetailModal
                visible={showClubDetailModal}
                onClose={() => setShowClubDetailModal(false)}
                club={selectedClub}
                isMember={selectedClub ? myClubs.includes(selectedClub.id) : false}
                onJoinLeave={handleJoinLeaveClub}
            />
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    safeTop: {
        backgroundColor: 'transparent',
    },
    headerBasicElite: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    titleBasicElite: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: -0.5,
    },
    subtitleBasicElite: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1.5,
        marginTop: -2,
    },
    actionBtnBasic: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    notifDotBasic: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    searchSectionElite: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    searchContainerElite: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 15,
        height: 50,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    searchInputElite: {
        flex: 1,
        fontWeight: '600',
        color: '#0F172A',
    },
    categoryScroller: {
        marginTop: 25,
        marginBottom: 30,
    },
    categoryContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    catChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 15,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    catChipActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    catText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1,
    },
    catTextActive: {
        color: COLORS.white,
    },
    scrollPadding: {
        paddingBottom: 110,
    },
    sectionElite: {
        marginBottom: 35,
    },
    sectionHeaderElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionTitleElite: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    addFriendBtnElite: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    addFriendText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#10B981',
    },
    friendsScrollContent: {
        paddingHorizontal: 20,
        gap: 15,
    },
    friendCardElite: {
        width: 80,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    friendAvatarFrame: {
        width: 70,
        height: 70,
        borderRadius: 25,
        backgroundColor: COLORS.white,
        padding: 4,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        position: 'relative',
    },
    friendAvatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    friendStatusIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    friendNameElite: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#334155',
        marginTop: 10,
        textAlign: 'center',
    },
    seeAllElite: {
        fontSize: 12,
        fontWeight: '900',
        color: '#10B981',
    },
    clubsScrollContent: {
        paddingHorizontal: 20,
        gap: 18,
    },
    clubCardElite: {
        width: 200,
        height: 260,
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: COLORS.white,
        elevation: 10,
    },
    clubImgElite: {
        width: '100%',
        height: '100%',
    },
    clubOverlayElite: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70%',
        padding: 20,
        justifyContent: 'flex-end',
    },
    clubTagElite: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(16, 185, 129, 0.4)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 10,
    },
    clubTagTextElite: {
        fontSize: 9,
        fontWeight: '900',
        color: COLORS.white,
    },
    clubTitleElite: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.white,
        marginBottom: 4,
    },
    clubStatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 15,
    },
    clubMembersElite: {
        fontSize: 12,
        color: '#E2E8F0',
        fontWeight: '600',
    },
    clubJoinBtnElite: {
        backgroundColor: COLORS.white,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 15,
    },
    joinedBtnElite: {
        backgroundColor: '#10B981',
    },
    joinBtnTextElite: {
        fontSize: 12,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 0.5,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
        marginLeft: 15,
        marginRight: 20,
    },
    feedContainerElite: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    postCardElite: {
        backgroundColor: COLORS.white,
        borderRadius: 30,
        padding: 20,
        marginBottom: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    postHeaderElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    postUserGrp: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    postAvatarCircle: {
        width: 45,
        height: 45,
        borderRadius: 18,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    postAvatarImgSmall: {
        width: '100%',
        height: '100%',
    },
    postAuthorName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    postTimestamp: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    postBodyText: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 22,
        marginBottom: 15,
        fontWeight: '500',
    },
    postImageWrapper: {
        width: '100%',
        height: 220,
        borderRadius: 25,
        overflow: 'hidden',
        marginBottom: 15,
    },
    postImageContent: {
        width: '100%',
        height: '100%',
    },
    postFooterElite: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    footerActionRow: {
        flexDirection: 'row',
        gap: 20,
    },
    interactionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    interactionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    shareBtnElite: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabElite: {
        position: 'absolute',
        bottom: 30,
        right: 25,
        width: 65,
        height: 65,
        borderRadius: 22,
        elevation: 10,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    fabGradientElite: {
        flex: 1,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createPostShortcut: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        padding: 15,
        borderRadius: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    shortcutAvatar: {
        width: 40,
        height: 40,
        borderRadius: 16,
        marginRight: 15,
    },
    shortcutInput: {
        flex: 1,
        height: 40,
        justifyContent: 'center',
    },
    shortcutText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '600',
    },
    shortcutIconBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SocialScreen;
