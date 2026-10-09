import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES } from '../constants/Theme';

const { width, height } = Dimensions.get('window');

const PostDetailModal = ({ visible, onClose, post, currentUser, onAddComment }) => {
    const [commentText, setCommentText] = useState('');
    const [sending, setSending] = useState(false);

    if (!post) return null;

    const handleAddComment = async () => {
        if (commentText.trim().length === 0 || sending) return;
        setSending(true);

        const newComment = {
            id: Date.now().toString(),
            user: currentUser?.name || 'Member',
            avatar: currentUser?.profileImage,
            text: commentText,
            time: 'Just now'
        };

        try {
            if (await onAddComment(post.id, newComment)) {
                setCommentText('');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                    <View style={styles.modalInner}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="chevron-down" size={28} color="#0F172A" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Post Details</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            {/* User Info */}
                            <View style={styles.userInfo}>
                                <Image source={{ uri: post.avatar }} style={styles.avatar} />
                                <View>
                                    <Text style={styles.userName}>{post.user}</Text>
                                    <Text style={styles.timeText}>{post.time}</Text>
                                </View>
                            </View>

                            {/* Content */}
                            <Text style={styles.postText}>{post.content}</Text>

                            {post.image && (
                                <Image source={{ uri: post.image }} style={styles.postImage} />
                            )}

                            {/* Divider */}
                            <View style={styles.divider} />

                            {/* Comments Section */}
                            <Text style={styles.commentsTitle}>Comments ({post.comments_count || 0})</Text>

                            {post.comments && post.comments.length > 0 ? (
                                post.comments.map((comment) => (
                                    <View key={comment.id} style={styles.commentItem}>
                                        <Image source={{ uri: comment.avatar }} style={styles.commentAvatar} />
                                        <View style={styles.commentContent}>
                                            <View style={styles.commentHeader}>
                                                <Text style={styles.commentUser}>{comment.user}</Text>
                                                <Text style={styles.commentTime}>{comment.time}</Text>
                                            </View>
                                            <Text style={styles.commentText}>{comment.text}</Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.noComments}>
                                    <Ionicons name="chatbubble-outline" size={40} color="#CBD5E1" />
                                    <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
                                </View>
                            )}
                        </ScrollView>

                        {/* Comment Input */}
                        <View style={styles.inputArea}>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Add a comment..."
                                placeholderTextColor="#94A3B8"
                                value={commentText}
                                onChangeText={setCommentText}
                                multiline
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
                                onPress={handleAddComment}
                                disabled={!commentText.trim()}
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.sendGrad}
                                >
                                    <Ionicons name="send" size={18} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    content: {
        height: height * 0.9,
    },
    modalInner: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    closeBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 18,
        marginRight: 12,
    },
    userName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    timeText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
    },
    postText: {
        fontSize: 16,
        color: '#334155',
        lineHeight: 24,
        marginBottom: 15,
    },
    postImage: {
        width: '100%',
        height: 250,
        borderRadius: 25,
        marginBottom: 20,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 20,
    },
    commentsTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 20,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 14,
        marginRight: 12,
    },
    commentContent: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    commentUser: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    commentTime: {
        fontSize: 11,
        color: '#94A3B8',
    },
    commentText: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
    },
    noComments: {
        alignItems: 'center',
        marginTop: 20,
    },
    noCommentsText: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 10,
    },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 15,
        color: '#0F172A',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sendBtn: {
        marginLeft: 12,
        width: 44,
        height: 44,
        borderRadius: 15,
        overflow: 'hidden',
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
    sendGrad: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default PostDetailModal;
