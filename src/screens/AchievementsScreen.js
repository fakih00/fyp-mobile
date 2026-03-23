import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { AnimatedCard } from '../components';
import { ACHIEVEMENTS } from '../data/mockData';

const { width } = Dimensions.get('window');

const AchievementsScreen = ({ navigation }) => {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const categories = ['All', 'Milestone', 'Social', 'Legacy'];

    const filteredAchievements = selectedCategory === 'All'
        ? ACHIEVEMENTS
        : ACHIEVEMENTS.filter(a => a.category === selectedCategory);

    const renderBadge = ({ item, index }) => (
        <AnimatedCard delay={index * 50} style={[styles.badgeCard, !item.earned && styles.lockedBadge]}>
            <View style={styles.badgeIconWrapper}>
                <Text style={[styles.badgeIcon, !item.earned && styles.lockedIcon]}>{item.icon}</Text>
                {!item.earned && (
                    <View style={styles.lockOverlay}>
                        <Ionicons name="lock-closed" size={14} color="#64748B" />
                    </View>
                )}
            </View>
            <Text style={styles.badgeTitle}>{item.title}</Text>
            <Text style={styles.badgeCategory}>{item.category.toUpperCase()}</Text>

            {item.earned ? (
                <View style={styles.earnedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    <Text style={styles.earnedText}>{item.date}</Text>
                </View>
            ) : (
                <View style={styles.progressWrapper}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${(item.progress || 0) * 100}%` }]} />
                    </View>
                    <Text style={styles.progressLabel}>{Math.round((item.progress || 0) * 100)}%</Text>
                </View>
            )}
        </AnimatedCard>
    );

    const renderHeader = () => (
        <View style={styles.headerStack}>
            <LinearGradient
                colors={['#064E3B', '#10B981']}
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
                        <Text style={styles.eliteTitle}>Achievements</Text>
                        <Text style={styles.eliteSubtitle}>YOUR HALL OF FAME</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                {/* Category Chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipScroll}
                    contentContainerStyle={styles.chipContent}
                >
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setSelectedCategory(cat);
                            }}
                            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                        >
                            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                                {cat.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );

    return (
        <View style={styles.container}>
            {renderHeader()}

            <FlatList
                data={filteredAchievements}
                renderItem={renderBadge}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.columnWrapper}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    headerStack: {
        height: 180,
        position: 'relative',
        zIndex: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
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
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    eliteSubtitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 2,
        marginTop: 2,
    },
    chipScroll: {
        marginTop: 25,
    },
    chipContent: {
        paddingRight: 40,
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    chipActive: {
        backgroundColor: COLORS.white,
        borderColor: COLORS.white,
    },
    chipText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    chipTextActive: {
        color: '#10B981',
    },
    listContent: {
        padding: 20,
        paddingTop: 30,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    badgeCard: {
        width: (width - 60) / 2,
        backgroundColor: COLORS.white,
        borderRadius: 30,
        padding: 20,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
    },
    lockedBadge: {
        backgroundColor: '#F1F5F9',
        elevation: 0,
        shadowOpacity: 0,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    badgeIconWrapper: {
        width: 70,
        height: 70,
        borderRadius: 25,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        position: 'relative',
    },
    badgeIcon: {
        fontSize: 32,
    },
    lockedIcon: {
        opacity: 0.3,
        filter: 'grayscale(1)',
    },
    lockOverlay: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: COLORS.white,
        width: 24,
        height: 24,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    badgeTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeCategory: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#94A3B8',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    earnedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    earnedText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#10B981',
    },
    progressWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#64748B',
        borderRadius: 3,
    },
    progressLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#64748B',
    }
});

export default AchievementsScreen;
