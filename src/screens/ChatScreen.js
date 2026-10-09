import React, { useState, useEffect, useContext, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Image,
    Animated,
    ActivityIndicator,
    Dimensions,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SIZES, THEMES } from '../constants/Theme';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { api } from '../services/api';
import { AppContext } from '../context/AppContext';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ChatScreen = ({ route, navigation }) => {
    const { friend } = route.params || {};
    const { user, token, themeName, colors: themeColors } = useContext(AppContext);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showCallModal, setShowCallModal] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const callTimerRef = useRef(null);
    const pulseAnim1 = useRef(new Animated.Value(1)).current;
    const pulseAnim2 = useRef(new Animated.Value(1)).current;
    const pulseAnim3 = useRef(new Animated.Value(1)).current;
    const flatListRef = useRef();

    useEffect(() => {
        if (friend) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [friend]);

    const fetchMessages = async () => {
        if (!user?.user_id || !friend?.id) return;
        try {
            const res = await api.getMessages(friend.id);
            if (res.status === 200) {
                setMessages(res.data.records);
            }
        } catch (error) {
            console.error("Fetch Messages Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (inputText.trim() === '' || !user?.user_id || !friend?.id) return;

        const content = inputText.trim();
        setInputText('');

        const tempMsg = {
            id: Date.now().toString(),
            sender_id: user.user_id,
            text: content,
            timestamp: new Date().toISOString(),
            is_mine: true
        };
        setMessages(current => [...current, tempMsg]);

        try {
            const res = await api.sendMessage(friend.id, content);
            if (res.status !== 200) {
                console.error("Send Message Failed:", res.data.message);
                setMessages(current => current.filter(message => message.id !== tempMsg.id));
                setInputText(content);
                Alert.alert('Message not sent', res.data?.message || 'Please retry.');
            } else {
                fetchMessages();
            }
        } catch (error) {
            console.error("Send Message Error:", error);
            setMessages(current => current.filter(message => message.id !== tempMsg.id));
            setInputText(content);
            Alert.alert('Message not sent', 'Please retry.');
        }
    };

    const handleAcceptDuel = async (challengeType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const activeMessage = `⚔️ DUEL ACTIVE: ${challengeType} | 0 vs 0`;
        try {
            await api.sendMessage(friend.id, activeMessage);
            fetchMessages();
        } catch (err) {
            console.error("Accept duel error:", err);
        }
    };

    const handleUpdateDuelScore = async (item, challengeType, scoreSender, scoreReceiver, isMeSender) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let newScoreSender = parseInt(scoreSender);
        let newScoreReceiver = parseInt(scoreReceiver);
        
        const target = challengeType.includes('5,000') ? 5000 : (challengeType.includes('500') ? 500 : 300);
        
        if (isMeSender) {
            newScoreSender += challengeType.includes('5,000') ? 1000 : (challengeType.includes('500') ? 100 : 30);
        } else {
            newScoreReceiver += challengeType.includes('5,000') ? 1000 : (challengeType.includes('500') ? 100 : 30);
        }

        if (newScoreSender >= target || newScoreReceiver >= target) {
            const winnerName = newScoreSender >= target ? user.name : friend.name;
            const finishedMessage = `🏆 DUEL FINISHED: ${challengeType} | Winner is ${winnerName}!`;
            try {
                await api.sendMessage(friend.id, finishedMessage);
                fetchMessages();
            } catch (err) {
                console.error("Finish duel error:", err);
            }
        } else {
            const activeMessage = `⚔️ DUEL ACTIVE: ${challengeType} | ${newScoreSender} vs ${newScoreReceiver}`;
            try {
                await api.sendMessage(friend.id, activeMessage);
                fetchMessages();
            } catch (err) {
                console.error("Update duel score error:", err);
            }
        }
    };

    const startCall = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCallDuration(0);
        setShowCallModal(true);

        // Start pulsing animation rings
        const pulse = (anim, delay) => Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: 1.8, duration: 1200, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 1, duration: 0, useNativeDriver: true })
            ])
        ).start();
        pulse(pulseAnim1, 0);
        pulse(pulseAnim2, 400);
        pulse(pulseAnim3, 800);

        // Start call duration timer
        callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    const endCall = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        clearInterval(callTimerRef.current);
        pulseAnim1.stopAnimation();
        pulseAnim2.stopAnimation();
        pulseAnim3.stopAnimation();
        pulseAnim1.setValue(1);
        pulseAnim2.setValue(1);
        pulseAnim3.setValue(1);
        setShowCallModal(false);
        setCallDuration(0);
        // Send missed call message
        try {
            await api.sendMessage(friend.id, `📞 MISSED VOICE CALL`);
            fetchMessages();
        } catch (err) {
            console.error("Missed call send error:", err);
        }
    };

    const formatCallDuration = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const renderHeader = () => (
        <View style={styles.headerStack}>
            <LinearGradient
                colors={themeColors.gradient}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
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

                    <View style={styles.headerUser}>
                        <View style={styles.headerAvatarContainer}>
                            <Image source={{ uri: friend.avatar }} style={styles.headerAvatar} />
                            {friend.status !== 'Offline' && <View style={[styles.onlineDotHeader, { backgroundColor: themeColors.accent }]} />}
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerName}>{friend.name}</Text>
                            <Text style={styles.headerStatus}>{isTyping ? 'Typing...' : (friend.status || 'Active now')}</Text>
                        </View>
                    </View>

                </View>
            </SafeAreaView>
        </View>
    );

    const renderMessage = ({ item, index }) => {
        const isMe = item.is_mine || item.sender_id == user?.user_id;
        const text = item.text || '';

        // Missed Call Card
        if (text === '📞 MISSED VOICE CALL') {
            return (
                <View style={[styles.missedCallWrapper, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                    <View style={styles.missedCallBubble}>
                        <Ionicons name="call" size={16} color="#EF4444" />
                        <Text style={styles.missedCallText}>Missed Voice Call</Text>
                        <Text style={styles.missedCallTime}>
                            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                    </View>
                </View>
            );
        }

        // Case 1: Duel Invite
        if (text.startsWith('⚔️ DUEL INVITE:')) {
            const challengeType = text.replace('⚔️ DUEL INVITE:', '').trim();
            return (
                <View style={styles.duelCardWrapper}>
                    <GlassCard style={styles.duelCardMain}>
                        <View style={styles.duelCardHeader}>
                            <Ionicons name="flash" size={24} color="#EF4444" />
                            <Text style={styles.duelCardTitle}>FITNESS DUEL INVITE ⚔️</Text>
                        </View>
                        <Text style={styles.duelCardSub}>{challengeType}</Text>
                        
                        {isMe ? (
                            <Text style={styles.duelCardStatus}>Waiting for friend to accept... ⏳</Text>
                        ) : (
                            <View style={styles.duelActionRow}>
                                <TouchableOpacity 
                                    style={[styles.duelAcceptBtn, { backgroundColor: themeColors.accent }]}
                                    onPress={() => handleAcceptDuel(challengeType)}
                                >
                                    <Text style={styles.duelAcceptBtnText}>Accept</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </GlassCard>
                </View>
            );
        }

        // Case 2: Active Duel Progress Tracker
        if (text.startsWith('⚔️ DUEL ACTIVE:')) {
            // Format: ⚔️ DUEL ACTIVE: challengeType | scoreSender vs scoreReceiver
            const parts = text.replace('⚔️ DUEL ACTIVE:', '').split('|');
            const challengeType = parts[0]?.trim();
            const scores = parts[1]?.trim().split('vs');
            const scoreSender = parseInt(scores[0]?.trim() || '0');
            const scoreReceiver = parseInt(scores[1]?.trim() || '0');

            // Find target score
            const target = challengeType.includes('5,000') ? 5000 : (challengeType.includes('500') ? 500 : 300);
            
            // Sender is whoever sent this message. If isMe is true, then sender is Me, receiver is Friend.
            // If isMe is false, sender is Friend, receiver is Me.
            const myScore = isMe ? scoreSender : scoreReceiver;
            const friendScore = isMe ? scoreReceiver : scoreSender;

            const myProgress = Math.min(myScore / target, 1);
            const friendProgress = Math.min(friendScore / target, 1);

            return (
                <View style={styles.duelCardWrapper}>
                    <GlassCard style={styles.duelCardMain}>
                        <View style={styles.duelCardHeader}>
                            <Ionicons name="flame" size={24} color="#3B82F6" />
                            <Text style={styles.duelCardTitle}>ACTIVE DUEL ⚔️</Text>
                        </View>
                        <Text style={styles.duelCardSub}>{challengeType}</Text>
                        
                        <View style={styles.duelProgressSection}>
                            {/* My Progress */}
                            <View style={styles.duelProgressBarRow}>
                                <Text style={styles.duelProgressLabel}>You: {myScore} / {target}</Text>
                                <View style={styles.duelProgressBarBg}>
                                    <View style={[styles.duelProgressBarFill, { width: `${myProgress * 100}%`, backgroundColor: '#3B82F6' }]} />
                                </View>
                            </View>

                            {/* Friend Progress */}
                            <View style={styles.duelProgressBarRow}>
                                <Text style={styles.duelProgressLabel}>{friend.name}: {friendScore} / {target}</Text>
                                <View style={styles.duelProgressBarBg}>
                                    <View style={[styles.duelProgressBarFill, { width: `${friendProgress * 100}%`, backgroundColor: '#EF4444' }]} />
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.duelUpdateBtn}
                            onPress={() => handleUpdateDuelScore(item, challengeType, scoreSender, scoreReceiver, isMe)}
                        >
                            <Text style={styles.duelUpdateBtnText}>
                                Log +{challengeType.includes('5,000') ? '1,000 Steps' : (challengeType.includes('500') ? '100 Kcal' : '30s Plank')} ⚡
                            </Text>
                        </TouchableOpacity>
                    </GlassCard>
                </View>
            );
        }

        // Case 3: Finished Duel
        if (text.startsWith('🏆 DUEL FINISHED:')) {
            const parts = text.replace('🏆 DUEL FINISHED:', '').split('|');
            const challengeType = parts[0]?.trim();
            const winnerName = parts[1]?.replace('Winner is', '').trim();

            return (
                <View style={styles.duelCardWrapper}>
                    <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.duelCardFinished}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="trophy" size={32} color={COLORS.white} style={{ textAlign: 'center', marginBottom: 8 }} />
                        <Text style={styles.duelFinishedTitle}>DUEL COMPLETE! 🏆</Text>
                        <Text style={styles.duelFinishedSub}>{challengeType}</Text>
                        <Text style={styles.duelFinishedWinner}>{winnerName} Won!</Text>
                    </LinearGradient>
                </View>
            );
        }

        // Case 4: Rich Shared Post Card
        if (text.startsWith('📢 SHARED POST:')) {
            const parts = text.replace('📢 SHARED POST:', '').split('|');
            const author = parts[0]?.trim() || 'Someone';
            const content = parts[1]?.trim() || '';
            const imageUrl = parts[2]?.trim() || '';

            return (
                <View style={[styles.sharedPostWrapper, isMe ? styles.mySharedPost : styles.theirSharedPost]}>
                    <GlassCard style={styles.sharedPostCard}>
                        <View style={styles.sharedPostHeader}>
                            <Ionicons name="share-social" size={16} color={themeColors.accent} />
                            <Text style={styles.sharedPostTitle}>Shared Post by {author}</Text>
                        </View>
                        <Text style={styles.sharedPostContent} numberOfLines={4}>{content}</Text>
                        {imageUrl && imageUrl.trim() !== '' ? (
                            <Image source={{ uri: imageUrl }} style={styles.sharedPostImage} />
                        ) : null}
                    </GlassCard>
                </View>
            );
        }

        return (
            <AnimatedCard delay={index * 50} style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
                {!isMe && (
                    <View style={styles.avatarWrapper}>
                        <Image source={{ uri: friend.avatar }} style={styles.chatAvatar} />
                    </View>
                )}
                <View style={styles.bubbleWrapper}>
                    {isMe ? (
                        <LinearGradient
                            colors={themeColors.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.myBubble}
                        >
                            <Text style={styles.myMessageText}>{item.text}</Text>
                            <Text style={styles.myTimestamp}>
                                {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                            </Text>
                        </LinearGradient>
                    ) : (
                        <GlassCard style={styles.theirBubble}>
                            <Text style={styles.theirMessageText}>{item.text}</Text>
                            <Text style={styles.theirTimestamp}>
                                {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                            </Text>
                        </GlassCard>
                    )}
                </View>
            </AnimatedCard>
        );
    };

    return (
        <AuraBackground style={styles.container}>
            {renderHeader()}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={themeColors.accent} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            )}

            {/* Voice Call Modal */}
            <Modal
                visible={showCallModal}
                animationType="fade"
                transparent={false}
                statusBarTranslucent={true}
            >
                <LinearGradient
                    colors={['#0F172A', '#1E293B', '#0F172A']}
                    style={styles.callScreen}
                >
                    {/* Pulsing rings */}
                    <View style={styles.callRingsContainer}>
                        <Animated.View style={[styles.callRing, { transform: [{ scale: pulseAnim3 }], opacity: pulseAnim3.interpolate({ inputRange: [1, 1.8], outputRange: [0.15, 0] }) }]} />
                        <Animated.View style={[styles.callRing, { transform: [{ scale: pulseAnim2 }], opacity: pulseAnim2.interpolate({ inputRange: [1, 1.8], outputRange: [0.25, 0] }) }]} />
                        <Animated.View style={[styles.callRing, { transform: [{ scale: pulseAnim1 }], opacity: pulseAnim1.interpolate({ inputRange: [1, 1.8], outputRange: [0.4, 0] }) }]} />

                        {/* Avatar */}
                        <View style={styles.callAvatarBorder}>
                            {friend?.avatar ? (
                                <Image source={{ uri: friend.avatar }} style={styles.callAvatar} />
                            ) : (
                                <View style={[styles.callAvatar, { backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' }]}>
                                    <Text style={{ fontSize: 36, color: '#fff', fontWeight: 'bold' }}>{friend?.name?.[0] || '?'}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <Text style={styles.callName}>{friend?.name}</Text>
                    <Text style={styles.callStatus}>
                        {callDuration > 0 ? formatCallDuration(callDuration) : 'Calling...'}
                    </Text>

                    {/* End Call Button */}
                    <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
                        <Ionicons name="call" size={30} color={COLORS.white} style={{ transform: [{ rotate: '135deg' }] }} />
                    </TouchableOpacity>

                    <Text style={styles.callHintText}>Tap to end call</Text>
                </LinearGradient>
            </Modal>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <BlurView intensity={40} tint="light" style={styles.inputBarWrapper}>
                    <View style={styles.inputInner}>
                        <TouchableOpacity style={styles.attachBtn}>
                            <Ionicons name="add" size={28} color={themeColors.accent} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            placeholder="Message..."
                            placeholderTextColor="#94A3B8"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
                            onPress={handleSend}
                            disabled={!inputText.trim()}
                        >
                            <LinearGradient
                                colors={themeColors.gradient}
                                style={styles.sendGradient}
                            >
                                <Ionicons name="send" size={18} color={COLORS.white} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </KeyboardAvoidingView>
            {Platform.OS === 'ios' && <SafeAreaView edges={['bottom']} />}
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerStack: {
        height: 120,
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
        marginTop: 10,
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
    headerUser: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    headerAvatarContainer: {
        position: 'relative',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    onlineDotHeader: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        // backgroundColor handled dynamically via themeColors.accent
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    headerInfo: {
        marginLeft: 10,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    headerStatus: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 0.5,
    },
    headerActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 10,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '85%',
    },
    myMessage: {
        alignSelf: 'flex-end',
    },
    theirMessage: {
        alignSelf: 'flex-start',
    },
    avatarWrapper: {
        marginRight: 8,
        alignSelf: 'flex-end',
    },
    chatAvatar: {
        width: 28,
        height: 28,
        borderRadius: 10,
    },
    bubbleWrapper: {
        flex: 1,
    },
    myBubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 22,
        borderBottomRightRadius: 4,
        elevation: 4,
        // shadowColor handled dynamically
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    theirBubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 22,
        borderBottomLeftRadius: 4,
    },
    myMessageText: {
        fontSize: 15,
        color: COLORS.white,
        lineHeight: 20,
        fontWeight: '500',
    },
    theirMessageText: {
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 20,
        fontWeight: '500',
    },
    myTimestamp: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    theirTimestamp: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    inputBarWrapper: {
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    inputInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    attachBtn: {
        width: 44,
        height: 44,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 22,
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 15,
        color: COLORS.text,
    },
    inputBarWrapper: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    duelCardWrapper: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        alignItems: 'center',
        width: '100%',
    },
    duelCardMain: {
        width: '100%',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    duelCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    duelCardTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    duelCardSub: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
    },
    duelCardStatus: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        fontWeight: '600',
    },
    duelActionRow: {
        marginTop: 5,
    },
    duelAcceptBtn: {
        // backgroundColor handled dynamically
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    duelAcceptBtnText: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: 'bold',
    },
    duelProgressSection: {
        gap: 12,
        marginBottom: 16,
        width: '100%',
    },
    duelProgressBarRow: {
        width: '100%',
    },
    duelProgressLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 6,
    },
    duelProgressBarBg: {
        height: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 4,
        overflow: 'hidden',
        width: '100%',
    },
    duelProgressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    duelUpdateBtn: {
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        width: '100%',
    },
    duelUpdateBtnText: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: 'bold',
    },
    duelCardFinished: {
        width: '100%',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    duelFinishedTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 0.5,
    },
    duelFinishedSub: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 4,
        fontWeight: '600',
    },
    duelFinishedWinner: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.white,
        marginTop: 12,
    },
    sharedPostWrapper: {
        width: '100%',
        paddingHorizontal: 20,
        paddingVertical: 6,
    },
    mySharedPost: {
        alignItems: 'flex-end',
    },
    theirSharedPost: {
        alignItems: 'flex-start',
    },
    sharedPostCard: {
        width: '75%',
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    sharedPostHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    sharedPostTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    sharedPostContent: {
        fontSize: 13,
        color: COLORS.text,
        lineHeight: 18,
        marginBottom: 8,
    },
    sharedPostImage: {
        width: '100%',
        height: 140,
        borderRadius: 12,
        marginTop: 4,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 15,
        overflow: 'hidden',
    },
    sendGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // ── Voice Call Screen ─────────────────────────────────
    callScreen: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 60,
    },
    callRingsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 240,
        height: 240,
        marginBottom: 32,
    },
    callRing: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        borderWidth: 2,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59,130,246,0.1)',
    },
    callAvatarBorder: {
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 3,
        borderColor: '#3B82F6',
        padding: 3,
        backgroundColor: '#1E293B',
        overflow: 'hidden',
    },
    callAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 62,
    },
    callName: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    callStatus: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 60,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    endCallBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 10,
    },
    callHintText: {
        marginTop: 16,
        fontSize: 13,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 0.5,
    },
    // ── Missed Call Bubble ───────────────────────────────
    missedCallWrapper: {
        paddingHorizontal: 16,
        paddingVertical: 4,
        width: '100%',
    },
    missedCallBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(239,68,68,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        maxWidth: '70%',
    },
    missedCallText: {
        color: '#EF4444',
        fontWeight: '700',
        fontSize: 13,
        flex: 1,
    },
    missedCallTime: {
        color: 'rgba(239,68,68,0.6)',
        fontSize: 11,
    },
});

export default ChatScreen;
