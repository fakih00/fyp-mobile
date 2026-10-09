import React, { useState, useRef, useContext, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Dimensions,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { AnimatedCard, GlassCard } from '../components';
import { api } from '../services/api';
import { AppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
    { label: "Protein tips", icon: "restaurant-outline" },
    { label: "Workout plan", icon: "barbell-outline" },
    { label: "Fat loss help", icon: "flame-outline" },
    { label: "Stretching", icon: "body-outline" },
    { label: "Water goal", icon: "water-outline" },
];

const AIChatScreen = ({ navigation }) => {
    const { colors: themeColors, user } = useContext(AppContext);
    const [messages, setMessages] = useState([
        {
            _id: 1,
            text: "Hello! I'm your Elite AI Coach. Ask me about training, nutrition, or recovery. Workout, meal, fridge, and video analysis use the app's custom AI modules.",
            createdAt: new Date(),
            user: { _id: 2, name: 'AI' },
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const flatListRef = useRef(null);

    // Conversation history for multi-turn context
    // Format: [{ role: 'user'|'model', text: '...' }]
    const chatHistoryRef = useRef([]);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    // Load persisted history from DB on first mount.
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await api.getAIChatHistory();
                if (res.status === 200 && res.data?.messages?.length > 0) {
                    // Convert DB rows to FlatList message format (newest first)
                    const dbMessages = res.data.messages.map(row => ({
                        _id: row.id,
                        text: row.message,
                        createdAt: new Date(row.created_at),
                        user: { _id: row.role === 'user' ? 1 : 2, name: row.role === 'user' ? 'You' : 'AI' },
                    })).reverse(); // FlatList is inverted so newest must be first

                    setMessages(dbMessages);

                    // Rebuild multi-turn context ref from loaded history (up to last 20)
                    const context = res.data.messages.slice(-20).map(row => ({
                        role: row.role,
                        text: row.message,
                    }));
                    chatHistoryRef.current = context;
                }
            } catch (e) {
                console.log('Could not load AI chat history:', e);
            } finally {
                setHistoryLoaded(true);
            }
        };
        loadHistory();
    }, []);

    const INITIAL_MESSAGE = {
        _id: 1,
        text: `Hello${user?.name ? ` ${user.name}` : ''}! I'm your Elite AI Coach. Ask me about training, nutrition, or recovery. Workout, meal, fridge, and video analysis use the app's custom AI modules.`,
        createdAt: new Date(),
        user: { _id: 2, name: 'AI' },
    };

    const handleHeaderMenu = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const goal = user?.profile?.goal?.replace(/_/g, ' ') || 'general fitness';
        const weight = user?.profile?.weight ? `${user.profile.weight}kg` : '-';
        const streak = user?.profile?.streak || 0;
        Alert.alert(
            'Coach Elite',
            `What would you like to do?`,
            [
                {
                    text: 'Clear Chat',
                    onPress: async () => {
                        try { await api.clearAIChatHistory(); } catch (e) {}
                        chatHistoryRef.current = [];
                        setMessages([{ ...INITIAL_MESSAGE, _id: Date.now(), createdAt: new Date() }]);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                },
                {
                    text: 'Active Profile',
                    onPress: () => Alert.alert(
                        'Active Profile',
                        `Name: ${user?.name || '-'}\nGoal: ${goal}\nWeight: ${weight}\nStreak: ${streak} days\nInjuries: ${user?.profile?.injuries || '-'}\nAllergies: ${user?.profile?.allergies || '-'}\n\nThe AI Coach uses all this data to give you personalized advice.`,
                        [{ text: 'Got it', style: 'default' }]
                    ),
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const sendMessage = async (text) => {
        const messageText = text || inputText;
        if (messageText.trim().length === 0) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const userMessage = {
            _id: Math.round(Math.random() * 1000000),
            text: messageText,
            createdAt: new Date(),
            user: { _id: 1, name: 'User' },
        };

        setMessages(prev => [userMessage, ...prev]);
        setInputText('');
        setIsTyping(true);

        try {
            // Only successful Gemini replies enter the conversation history.
            const result = await api.aiChat(messageText, chatHistoryRef.current);

            if (result.status !== 200 || !result.data.reply) {
                throw new Error(result.data?.message || 'Gemini could not respond. Please retry.');
            }
            let replyText;

            if (result.status === 200 && result.data.reply) {
                replyText = result.data.reply;

                // Update multi-turn history (keep last 20 entries = 10 turns)
                chatHistoryRef.current = [
                    ...chatHistoryRef.current,
                    { role: 'user', text: messageText },
                    { role: 'model', text: replyText },
                ].slice(-20);
            }

            const aiMessage = {
                _id: Math.round(Math.random() * 1000000),
                text: replyText,
                createdAt: new Date(),
                user: { _id: 2, name: 'AI' },
            };

            setMessages(prev => [aiMessage, ...prev]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error("AI Chat Error:", error);
            const errorMessage = {
                _id: Math.round(Math.random() * 1000000),
                text: error.message || 'Could not reach AI Coach. Please try again.',
                createdAt: new Date(),
                user: { _id: 2, name: 'AI' },
            };
            setMessages(prev => [errorMessage, ...prev]);
        } finally {
            setIsTyping(false);
        }
    };

    const renderMessage = ({ item, index }) => {
        const isUser = item.user._id === 1;
        return (
            <View style={[
                styles.messageContainer,
                isUser ? styles.userContainer : styles.aiContainer
            ]}>
                <View style={[
                    styles.bubble,
                    isUser ? [styles.userBubble, { backgroundColor: themeColors.accent }] : styles.aiBubble
                ]}>
                    <Text style={[
                        styles.messageText,
                        isUser ? styles.userText : styles.aiText
                    ]}>{item.text}</Text>
                </View>
                <Text style={styles.timeText}>
                    {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Elite Header */}
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
                            style={styles.headerActionBtn}
                            onPress={() => navigation.goBack()}
                        >
                            <BlurView intensity={20} tint="light" style={styles.iconBlur}>
                                <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                            </BlurView>
                        </TouchableOpacity>
                        <View style={styles.titleStack}>
                            <Text style={styles.eliteTitle}>AI Coach</Text>
                            <View style={styles.statusRow}>
                                <View style={[styles.liveDot, { backgroundColor: themeColors.accent }]} />
                                <Text style={styles.statusText}>ALWAYS READY</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.headerActionBtn} onPress={handleHeaderMenu}>
                            <BlurView intensity={20} tint="light" style={styles.iconBlur}>
                                <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.white} />
                            </BlurView>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item._id.toString()}
                renderItem={renderMessage}
                inverted
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={() => isTyping && (
                    <View style={styles.typingIndicator}>
                        <ActivityIndicator size="small" color={themeColors.accent} />
                        <Text style={styles.typingText}>Thinking...</Text>
                    </View>
                )}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
            >
                <BlurView intensity={90} tint="light" style={styles.inputArea}>
                    {/* Quick Actions */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.quickActions}
                        contentContainerStyle={styles.quickActionsContent}
                    >
                        {QUICK_ACTIONS.map((action, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.actionChip}
                                onPress={() => sendMessage(action.label)}
                            >
                                <Ionicons name={action.icon} size={13} color={themeColors.accent} />
                                <Text style={styles.actionChipText}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Input Field */}
                    <View style={styles.inputRow}>
                        <View style={styles.textInputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Talk to your coach..."
                                placeholderTextColor="#64748B"
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                            />
                        </View>
                        <TouchableOpacity
                            onPress={() => sendMessage()}
                            style={styles.sendBtn}
                            disabled={inputText.trim().length === 0}
                        >
                            <LinearGradient
                                colors={inputText.trim().length > 0 ? themeColors.gradient : ['#E2E8F0', '#CBD5E1']}
                                style={[styles.sendGradient, inputText.trim().length > 0 && { shadowColor: themeColors.accent }]}
                            >
                                <Ionicons name="send" size={18} color={COLORS.white} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    headerStack: {
        height: 120,
        position: 'relative',
        zIndex: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
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
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        // backgroundColor set dynamically in JSX if needed, or reference theme colors below:
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    statusText: {
        fontSize: 9,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1.5,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 10,
    },
    messageContainer: {
        marginVertical: 6,
    },
    userContainer: {
        alignItems: 'flex-end',
    },
    aiContainer: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '85%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 22,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    userBubble: {
        // backgroundColor handled dynamically
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        backgroundColor: COLORS.white,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '500',
    },
    userText: {
        color: COLORS.white,
    },
    aiText: {
        color: '#0F172A',
    },
    timeText: {
        fontSize: 9,
        color: '#94A3B8',
        marginTop: 4,
        marginHorizontal: 8,
        fontWeight: '600',
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        marginLeft: 5,
    },
    typingText: {
        fontSize: 12,
        color: '#64748B',
        fontStyle: 'italic',
        marginLeft: 10,
        fontWeight: '600',
    },
    inputArea: {
        paddingTop: 15,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    quickActions: {
        maxHeight: 40,
        marginBottom: 15,
    },
    quickActionsContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    actionChipText: {
        fontSize: 11,
        color: '#0F172A',
        fontWeight: '800',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        gap: 12,
    },
    textInputContainer: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 12,
        maxHeight: 120,
    },
    input: {
        fontSize: 15,
        color: '#0F172A',
        fontWeight: '500',
        paddingTop: 0,
    },
    sendBtn: {
        marginBottom: 2,
    },
    sendGradient: {
        width: 50,
        height: 50,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        // shadowColor handled dynamically
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
});

export default AIChatScreen;
