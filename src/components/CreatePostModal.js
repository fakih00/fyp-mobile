import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    Image,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ActivityIndicator,
    ScrollView,
    Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import AuraBackground from './AuraBackground';

const { height, width } = Dimensions.get('window');

const CreatePostModal = ({ visible, onClose, onSubmit, user }) => {
    const [caption, setCaption] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [visibility, setVisibility] = useState('public'); // 'public' | 'friends'
    const [isPosting, setIsPosting] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setCaption('');
            setSelectedImage(null);
            setVisibility('public');
            setIsPosting(false);
        }
    }, [visible]);

    const pickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            alert("Permission to access camera roll is required!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setSelectedImage(base64Img);
        }
    };

    const handleSubmit = async () => {
        if (!caption && !selectedImage) return;

        setIsPosting(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const newPost = {
            content: caption,
            image: selectedImage,
            visibility: visibility
        };

        try {
            if (await onSubmit(newPost)) onClose();
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <AuraBackground style={styles.modalOverlay}>
                <SafeAreaView style={styles.safeArea}>
                    {/* Header Fixed at Top - Outside KeyboardAvoidingView to stay fixed */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => {
                                Keyboard.dismiss();
                                onClose();
                            }}
                            style={styles.closeBtn}
                        >
                            <Ionicons name="close" size={24} color="#0F172A" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>New Post</Text>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={(!caption && !selectedImage) || isPosting}
                            style={[styles.postBtn, (!caption && !selectedImage) && styles.disabledBtn]}
                        >
                            {isPosting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.postBtnText}>Post</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : null}
                        style={styles.keyboardView}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* User Info & Visibility */}
                            <View style={styles.userInfoRow}>
                                <View style={styles.avatarContainer}>
                                    <Image
                                        source={{ uri: user?.profileImage }}
                                        style={styles.avatar}
                                    />
                                </View>
                                <View style={styles.userMeta}>
                                    <Text style={styles.userName}>{user?.name || 'User'}</Text>
                                    <TouchableOpacity
                                        style={styles.visibilityToggle}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setVisibility(prev => prev === 'public' ? 'friends' : 'public');
                                        }}
                                    >
                                        <Ionicons
                                            name={visibility === 'public' ? "globe-outline" : "people-outline"}
                                            size={12}
                                            color={COLORS.primary}
                                        />
                                        <Text style={styles.visibilityText}>
                                            {visibility === 'public' ? 'Everyone' : 'Squad Only'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={12} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Input Area */}
                            <TextInput
                                placeholder="What's on your mind?"
                                placeholderTextColor="#94A3B8"
                                style={styles.captionInput}
                                multiline
                                value={caption}
                                onChangeText={setCaption}
                                autoFocus
                            />

                            {/* Image Preview */}
                            {selectedImage ? (
                                <View style={styles.imagePreviewContainer}>
                                    <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                                    <TouchableOpacity
                                        style={styles.removeImageBtn}
                                        onPress={() => setSelectedImage(null)}
                                    >
                                        <BlurView intensity={80} tint="dark" style={styles.removeBlur}>
                                            <Ionicons name="close" size={16} color="#FFF" />
                                        </BlurView>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </ScrollView>

                        {/* Media Selector - Sticky above Keyboard */}
                        <BlurView intensity={60} tint="light" style={styles.mediaSelectorFloating}>
                            <View style={styles.mediaSelectorContent}>
                                <Text style={styles.sectionTitle}>Add to your post</Text>
                                <View style={styles.mediaGrid}>
                                    <TouchableOpacity
                                        onPress={pickImage}
                                        style={styles.galleryBtn}
                                    >
                                        <LinearGradient
                                            colors={['#F8FAFC', '#E2E8F0']}
                                            style={styles.galleryGradient}
                                        >
                                            <Ionicons name="images" size={24} color={COLORS.primary} />
                                            <Text style={styles.galleryText}>Gallery</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.addMoreBtn} onPress={pickImage}>
                                        <Ionicons name="camera-outline" size={24} color="#64748B" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </BlurView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </AuraBackground>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,

        paddingBottom: 15,
        paddingTop: 40,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(226, 232, 240, 0.5)',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    postBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 12,
        minWidth: 70,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledBtn: {
        backgroundColor: '#E2E8F0',
        shadowOpacity: 0,
    },
    postBtnText: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 150, // Space for media selector
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 18,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    userMeta: {
        justifyContent: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 2,
    },
    visibilityToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 6,
        alignSelf: 'flex-start',
    },
    visibilityText: {
        fontSize: 11,
        fontWeight: '800',
        color: COLORS.primary,
        textTransform: 'uppercase',
    },
    captionInput: {
        fontSize: 18,
        color: '#1E293B',
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 20,
        lineHeight: 28,
        fontWeight: '500',
    },
    imagePreviewContainer: {
        width: '100%',
        height: 300,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 20,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
        borderRadius: 14,
        overflow: 'hidden',
    },
    removeBlur: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaSelectorFloating: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingTop: 15,
        paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Extra padding for home indicator
        borderTopWidth: 1,
        borderTopColor: 'rgba(226, 232, 240, 0.5)',
    },
    mediaSelectorContent: {
        width: '100%',
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: '#94A3B8',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    mediaGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    galleryBtn: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    galleryGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    galleryText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#1E293B',
    },
    addMoreBtn: {
        width: 56,
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    }
});

export default CreatePostModal;

