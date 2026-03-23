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
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SIZES, THEMES } from '../constants/Theme';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { api } from '../services/api';
import { AppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');

const ChatScreen = ({ route, navigation }) => {
    const { friend } = route.params || {};
    const { user, token, themeName, colors: themeColors } = useContext(AppContext);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(true);
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
        setMessages([...messages, tempMsg]);

        try {
            const res = await api.sendMessage(friend.id, content);
            if (res.status !== 200) {
                console.error("Send Message Failed:", res.data.message);
            } else {
                fetchMessages();
            }
        } catch (error) {
            console.error("Send Message Error:", error);
        }
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
                            {friend.status !== 'Offline' && <View style={styles.onlineDotHeader} />}
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerName}>{friend.name}</Text>
                            <Text style={styles.headerStatus}>{isTyping ? 'Typing...' : (friend.status || 'Active now')}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.headerActionBtn}>
                        <BlurView intensity={20} tint="light" style={styles.iconBlur}>
                            <Ionicons name="call" size={20} color={COLORS.white} />
                        </BlurView>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );

    const renderMessage = ({ item, index }) => {
        const isMe = item.is_mine || item.sender_id == user?.user_id;

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
                            colors={['#10B981', '#059669']}
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
                                colors={['#10B981', '#059669']}
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
        backgroundColor: '#10B981',
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
        shadowColor: '#10B981',
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
});

export default ChatScreen;
