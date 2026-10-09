import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SIZES } from '../constants/Theme';

const CreateClubModal = ({ visible, onClose, onSubmit, user }) => {
    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [description, setDescription] = useState('');
    const [creating, setCreating] = useState(false);

    const CATEGORIES = ['Yoga', 'Strength', 'Cardio', 'HIIT', 'Running', 'Meditation'];

    const handleSubmit = async () => {
        if (!name.trim() || !tag || creating) return;
        setCreating(true);

        const newClub = {
            id: Date.now().toString(),
            name,
            tag,
            image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60', // Default image
            members: '1',
            description,
            founder: {
                name: user?.name || 'Member',
                avatar: user?.profileImage
            },
            chatMessages: []
        };

        try {
            if (await onSubmit(newClub)) resetForm();
        } finally {
            setCreating(false);
        }
    };

    const resetForm = () => {
        setName('');
        setTag('');
        setDescription('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalContainer}
            >
                <View style={styles.modalContent}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={28} color={COLORS.text} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Create Club</Text>
                            <TouchableOpacity onPress={handleSubmit}>
                                <Text style={[
                                    styles.createButton,
                                    (!name || !tag) && styles.disabledButton
                                ]}>Create</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formContainer}>
                            <Text style={styles.label}>Club Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Weekend Warriors"
                                value={name}
                                onChangeText={setName}
                            />

                            <Text style={styles.label}>Category</Text>
                            <View style={styles.categoryGrid}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.categoryChip,
                                            tag === cat && styles.activeChip
                                        ]}
                                        onPress={() => setTag(cat)}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            tag === cat && styles.activeChipText
                                        ]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="What is this club about?"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '85%',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    headerTitle: {
        ...FONTS.h3,
        color: COLORS.text,
    },
    createButton: {
        ...FONTS.h4,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.5,
    },
    formContainer: {
        gap: 20,
    },
    label: {
        ...FONTS.h4,
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.gray100,
        borderRadius: 15,
        padding: 15,
        fontSize: 16,
        color: COLORS.text,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    categoryChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.gray100,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeChip: {
        backgroundColor: COLORS.primary + '10',
        borderColor: COLORS.primary,
    },
    chipText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    activeChipText: {
        color: COLORS.primary,
    },
});

export default CreateClubModal;
