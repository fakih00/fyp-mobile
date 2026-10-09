import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Share,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, SHADOWS } from '../constants/Theme';
import { api } from '../services/api';

const { width, height } = Dimensions.get('window');

const ClubDetailModal = ({ visible, onClose, club, isMember, onJoinLeave }) => {
    const [activeTab, setActiveTab] = useState('Overview');
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [sending, setSending] = useState(false);
    const [chatError, setChatError] = useState('');
    const chatScrollViewRef = React.useRef(null);

    useEffect(() => {
        setActiveTab('Overview');
        setMessage('');
        setChatMessages([]);
        setChatError('');
    }, [visible, club?.id]);
    useEffect(() => {
        if (!visible || !club?.id || !isMember) {
            setChatMessages([]);
            return;
        }
        let cancelled = false;
        const load = async () => {
            const res = await api.getClubMessages(club.id);
            if (cancelled) return;
            if (res.status === 200) {
                setChatMessages(res.data.records || []);
                setChatError('');
            } else setChatError(res.data?.message || 'Could not load club chat.');
        };
        load();
        const timer = setInterval(load, 8000);
        return () => { cancelled = true; clearInterval(timer); };
    }, [visible, club?.id, isMember]);

    if (!club) return null;

    const handleSend = async () => {
        if (!message.trim() || !isMember || sending) return;
        setSending(true);
        try {
            const res = await api.sendClubMessage(club.id, message.trim());
            if (res.status !== 201) {
                Alert.alert('Could not send', res.data?.message || 'Please retry.');
                return;
            }
            setMessage('');
            const refreshed = await api.getClubMessages(club.id);
            if (refreshed.status === 200) setChatMessages(refreshed.data.records || []);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } finally {
            setSending(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this fitness club: ${club.name}! Join us on Elite Fitness AI.`,
            });
        } catch (error) {
            console.log(error.message);
        }
    };

    const renderOverview = () => (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ABOUT</Text>
                <Text style={styles.description}>{club.description}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>FOUNDER</Text>
                <View style={styles.founderRow}>
                    <Image source={{ uri: club.founder?.avatar }} style={styles.founderAvatar} />
                    <View>
                        <Text style={styles.founderName}>{club.founder?.name || 'Club Staff'}</Text>
                        <Text style={styles.founderTag}>Club Creator</Text>
                    </View>
                </View>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                    <Ionicons name="people" size={24} color="#10B981" />
                    <Text style={styles.statVal}>{club.members}</Text>
                    <Text style={styles.statLabel}>Members</Text>
                </View>
                <View style={styles.statBox}>
                    <Ionicons name="chatbubbles" size={24} color="#10B981" />
                    <Text style={styles.statVal}>{chatMessages.length}</Text>
                    <Text style={styles.statLabel}>Messages</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Ionicons name="share-social" size={20} color="#10B981" />
                <Text style={styles.shareBtnText}>SHARE CLUB</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const renderChat = () => (
        <View style={styles.chatContainer}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.chatScroll}
                ref={chatScrollViewRef}
                onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {chatError ? <Text style={styles.chatLockText}>{chatError}</Text> : isMember && chatMessages.length === 0 ? <Text style={styles.chatLockText}>No messages yet.</Text> : null}
                {chatMessages.map((msg) => (
                    <View key={msg.id} style={[styles.msgRow, msg.is_mine && styles.myMsgRow]}>
                        {!msg.is_mine && (
                            <Image source={{ uri: msg.avatar }} style={styles.msgAvatar} />
                        )}
                        <View style={[styles.msgBubble, msg.is_mine && styles.myMsgBubble]}>
                            {!msg.is_mine && <Text style={styles.msgUser}>{msg.user}</Text>}
                            <Text style={[styles.msgText, msg.is_mine && styles.myMsgText]}>{msg.text}</Text>
                            <Text style={[styles.msgTime, msg.is_mine && styles.myMsgTime]}>{msg.time}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {!isMember ? (
                <View style={styles.chatOverlay}>
                    <BlurView intensity={80} tint="light" style={styles.chatBlur}>
                        <Ionicons name="lock-closed" size={32} color="#94A3B8" />
                        <Text style={styles.chatLockText}>Join club to participate in chat</Text>
                        <TouchableOpacity
                            style={styles.joinNowBtn}
                            onPress={() => onJoinLeave(club.id)}
                        >
                            <Text style={styles.joinNowText}>JOIN NOW</Text>
                        </TouchableOpacity>
                    </BlurView>
                </View>
            ) : (
                <View style={styles.inputBar}>
                    <TextInput
                        placeholder="Message the club..."
                        style={styles.input}
                        value={message}
                        onChangeText={setMessage}
                        placeholderTextColor="#94A3B8"
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending || !message.trim()}>
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.sendGrad}>
                            <Ionicons name="send" size={18} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

                <View style={styles.container}>
                    {/* Header Image */}
                    <View style={styles.imageHeader}>
                        <Image source={{ uri: club.image }} style={styles.bgImage} />
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.imgOverlay} />

                        <TouchableOpacity style={styles.backBtn} onPress={onClose}>
                            <BlurView intensity={60} tint="dark" style={styles.backBlur}>
                                <Ionicons name="chevron-down" size={28} color="#FFF" />
                            </BlurView>
                        </TouchableOpacity>

                        <View style={styles.headerInfo}>
                            <View style={styles.tag}>
                                <Text style={styles.tagText}>{club.tag}</Text>
                            </View>
                            <Text style={styles.title}>{club.name}</Text>
                        </View>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabBar}>
                        {['Overview', 'Chat'].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, activeTab === tab && styles.activeTab]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setActiveTab(tab);
                                }}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                    {tab.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.content}>
                        {activeTab === 'Overview' ? renderOverview() : renderChat()}
                    </View>

                    <SafeAreaView edges={['bottom']} style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.mainBtn, isMember && styles.leaveBtn]}
                            onPress={() => onJoinLeave(club.id)}
                        >
                            <LinearGradient
                                colors={isMember ? ['#F1F5F9', '#E2E8F0'] : ['#10B981', '#059669']}
                                style={styles.btnGrad}
                            >
                                <Text style={[styles.btnText, isMember && { color: '#EF4444' }]}>
                                    {isMember ? 'LEAVE CLUB' : 'JOIN THIS CLUB'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        height: height * 0.9,
        backgroundColor: '#F8FAFC',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        overflow: 'hidden',
    },
    imageHeader: {
        height: 250,
        position: 'relative',
    },
    bgImage: {
        width: '100%',
        height: '100%',
    },
    imgOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
        padding: 25,
        justifyContent: 'flex-end',
    },
    backBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    backBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        position: 'absolute',
        bottom: 25,
        left: 25,
    },
    tag: {
        backgroundColor: 'rgba(16, 185, 129, 0.4)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    tagText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
    },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: 25,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    tab: {
        paddingVertical: 18,
        marginRight: 30,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#10B981',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    activeTabText: {
        color: '#0F172A',
    },
    content: {
        flex: 1,
    },
    tabContent: {
        padding: 25,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
        marginBottom: 15,
    },
    description: {
        fontSize: 15,
        color: '#334155',
        lineHeight: 24,
        fontWeight: '500',
    },
    founderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    founderAvatar: {
        width: 50,
        height: 50,
        borderRadius: 20,
        marginRight: 15,
    },
    founderName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    founderTag: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 30,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 25,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    statVal: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
        marginTop: 10,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94A3B8',
        marginTop: 4,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        backgroundColor: '#ECFDF5',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        gap: 10,
        marginBottom: 50,
    },
    shareBtnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#10B981',
    },
    chatContainer: {
        flex: 1,
    },
    chatScroll: {
        padding: 20,
        paddingBottom: 40,
    },
    msgRow: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'flex-end',
    },
    myMsgRow: {
        justifyContent: 'flex-end',
    },
    msgAvatar: {
        width: 32,
        height: 32,
        borderRadius: 12,
        marginRight: 10,
    },
    msgBubble: {
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        maxWidth: '80%',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    myMsgBubble: {
        backgroundColor: '#10B981',
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 4,
        borderColor: '#10B981',
    },
    msgUser: {
        fontSize: 11,
        fontWeight: '900',
        color: '#64748B',
        marginBottom: 4,
    },
    msgText: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
        fontWeight: '500',
    },
    myMsgText: {
        color: '#FFF',
    },
    msgTime: {
        fontSize: 9,
        color: '#94A3B8',
        marginTop: 6,
        alignSelf: 'flex-end',
    },
    myMsgTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    chatOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
    },
    chatBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    chatLockText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
        marginVertical: 15,
        textAlign: 'center',
    },
    joinNowBtn: {
        backgroundColor: '#10B981',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 15,
    },
    joinNowText: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 13,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    input: {
        flex: 1,
        height: 45,
        backgroundColor: '#F1F5F9',
        borderRadius: 22,
        paddingHorizontal: 18,
        fontSize: 14,
        color: '#0F172A',
        marginRight: 12,
    },
    sendBtn: {
        width: 45,
        height: 45,
        borderRadius: 22,
        overflow: 'hidden',
    },
    sendGrad: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        padding: 25,
        backgroundColor: '#F8FAFC',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    mainBtn: {
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
    },
    leaveBtn: {
        backgroundColor: '#F1F5F9',
    },
    btnGrad: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1,
    }
});

export default ClubDetailModal;
