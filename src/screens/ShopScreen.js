import React, { useState, useContext, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Alert,
    Platform,
    Image,
    Modal,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { api } from '../services/api';
import { AnimatedCard, GlassCard, AuraBackground } from '../components';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const CATEGORIES = ['All', 'Subscription', 'Coupon', 'Supplement', 'Equipment', 'Program'];

const HistoryModal = ({ visible, onClose, history, themeColors }) => {
    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subText = themeColors.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)';
    const itemBg = themeColors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <BlurView intensity={40} tint={themeColors.isDark ? "dark" : "light"} style={styles.modalBlur}>
                    <SafeAreaView style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Redemption History</Text>
                            <TouchableOpacity onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: itemBg }]}>
                                <Ionicons name="close" size={24} color={textColor} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={history}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <View style={[styles.historyItem, { backgroundColor: itemBg }]}>
                                    <View style={[styles.historyIconCircle, { backgroundColor: themeColors.accent + '20' }]}>
                                        <Ionicons name={item.reward_icon || 'gift'} size={20} color={themeColors.accent} />
                                    </View>
                                    <View style={styles.historyInfo}>
                                        <Text style={[styles.historyName, { color: textColor }]}>{item.reward_name}</Text>
                                        <Text style={[styles.historyDate, { color: subText }]}>{item.time}</Text>
                                    </View>
                                    <View style={styles.historyCost}>
                                        <Text style={styles.historyCostText}>-{item.reward_cost} pts</Text>
                                    </View>
                                </View>
                            )}
                            ItemSeparatorComponent={() => <View style={styles.historySeparator} />}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyHistory}>
                                    <View style={[styles.emptyHistoryIcon, { backgroundColor: itemBg }]}>
                                        <Ionicons name="receipt-outline" size={40} color={subText} />
                                    </View>
                                    <Text style={[styles.emptyHistoryText, { color: subText }]}>No redemptions yet</Text>
                                </View>
                            )}
                            contentContainerStyle={styles.historyList}
                            showsVerticalScrollIndicator={false}
                        />
                    </SafeAreaView>
                </BlurView>
            </View>
        </Modal>
    );
}

const ShopScreen = ({ navigation }) => {
    const { user, setUser, colors: themeColors } = useContext(AppContext);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [rewards, setRewards] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        console.log("Loading reward inventory items and redemption ledger...");
        try {
            const [rewardsRes, historyRes] = await Promise.all([
                api.getRewards(),
                api.getRedemptions()
            ]);

            if (rewardsRes.status === 200) setRewards(rewardsRes.data.records || []);
            if (historyRes.status === 200) setHistory(historyRes.data.records || []);
        } catch (e) {
            console.error("Shop Load Data Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = rewards.filter(item =>
        selectedCategory === 'All' || item.type === selectedCategory
    );

    const handleAction = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleRedeem = (item) => {
        handleAction();
        if (user.points < item.cost) {
            Alert.alert("Insufficient Points", "Keep smashing those workouts to earn more points!");
            return;
        }

        Alert.alert(
            "Confirm Redemption",
            `Redeem ${item.name} for ${item.cost} points?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Redeem",
                    onPress: async () => {
                        const res = await api.redeemReward(item.id);
                        if (res.status === 200) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            const userRes = await api.getUser();
                            if (userRes.status === 200) setUser(prev => ({ ...prev, points: userRes.data.profile.points || 0 }));
                            loadData();
                            Alert.alert("Success!", `${item.name} is now yours.`);
                        } else {
                            Alert.alert("Error", res.data.message || "Redemption failed.");
                        }
                    }
                }
            ]
        );
    };

    // Dynamic colors
    const textColor = themeColors.isDark ? COLORS.white : COLORS.text;
    const subTextColor = themeColors.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)';
    const cardBg = themeColors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.navRow}>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={styles.iconBlur}>
                            <Ionicons name="chevron-back" size={24} color={textColor} />
                        </BlurView>
                    </TouchableOpacity>
                    <View style={styles.titleStack}>
                        <Text style={[styles.eliteTitle, { color: textColor }]}>Elite Shop</Text>
                        <Text style={[styles.eliteSubtitle, { color: themeColors.accent }]}>REDEEM YOUR REWARDS</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => { handleAction(); setShowHistory(true); }}
                    >
                        <BlurView intensity={20} tint={themeColors.isDark ? "light" : "dark"} style={styles.iconBlur}>
                            <Ionicons name="receipt-outline" size={22} color={textColor} />
                        </BlurView>
                    </TouchableOpacity>
                </View>

                {/* Balance Widget */}
                <AnimatedCard delay={100} style={styles.balanceWrapper}>
                    <GlassCard style={styles.balanceCardElite}>
                        <View style={styles.balanceInfoElite}>
                            <View style={styles.balanceLabelRow}>
                                <Text style={[styles.balanceLabelElite, { color: subTextColor }]}>POINTS BALANCE</Text>
                                <View style={[styles.eliteMemberBadge, { backgroundColor: themeColors.accent + '20' }]}>
                                    <Text style={[styles.eliteMemberText, { color: themeColors.accent }]}>ELITE MEMBER</Text>
                                </View>
                            </View>
                            <View style={styles.pointsRowElite}>
                                <Ionicons name="flash" size={32} color="#F59E0B" />
                                <Text style={[styles.pointsValueElite, { color: textColor }]}>{user.points}</Text>
                                <Text style={[styles.pointsSuffixElite, { color: themeColors.accent }]}>PTS</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.earnMoreBtnElite, { backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={() => navigation.navigate('Challenges')}
                        >
                            <Text style={[styles.earnMoreTextElite, { color: textColor }]}>EARN MORE</Text>
                            <View style={[styles.earnIconCircle, { backgroundColor: themeColors.accent + '20' }]}>
                                <Ionicons name="add" size={14} color={themeColors.accent} />
                            </View>
                        </TouchableOpacity>
                    </GlassCard>
                </AnimatedCard>
            </SafeAreaView>
        </View>
    );

    const renderCategories = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
            style={styles.categoryScroll}
        >
            {CATEGORIES.map(cat => (
                <TouchableOpacity
                    key={cat}
                    style={[
                        styles.categoryChipElite,
                        { backgroundColor: cardBg, borderColor: themeColors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                        selectedCategory === cat && { borderColor: themeColors.accent, backgroundColor: themeColors.accent + '20' }
                    ]}
                    onPress={() => { handleAction(); setSelectedCategory(cat); }}
                >
                    <Text style={[styles.categoryTextElite, { color: subTextColor }, selectedCategory === cat && { color: themeColors.accent }]}>
                        {cat.toUpperCase()}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderItem = ({ item, index }) => {
        const isOwned = history.some(h => h.reward_id == item.id);

        return (
            <AnimatedCard delay={200 + index * 50} style={styles.itemCardWrapper}>
                <GlassCard style={styles.itemCardElite}>
                    <View style={styles.itemIconContainerElite}>
                        <Image
                            source={{ uri: item.image }}
                            style={styles.itemImageElite}
                        />
                        <BlurView intensity={30} tint={themeColors.isDark ? "dark" : "light"} style={styles.typeBadgeBlur}>
                            <Ionicons name={item.icon || 'gift'} size={14} color={themeColors.accent} />
                        </BlurView>

                        {isOwned && (
                            <View style={styles.ownedBadgeElite}>
                                <LinearGradient
                                    colors={themeColors.gradient}
                                    style={styles.ownedBadgeGrad}
                                >
                                    <Ionicons name="checkmark" size={12} color={COLORS.white} />
                                </LinearGradient>
                            </View>
                        )}
                    </View>

                    <View style={styles.itemInfoElite}>
                        <Text style={[styles.itemTitleElite, { color: textColor }]} numberOfLines={2}>{item.name}</Text>
                        <Text style={[styles.itemTypeElite, { color: subTextColor }]}>{item.type.toUpperCase()}</Text>

                        <View style={styles.itemFooterElite}>
                            <View style={[styles.costBadgeElite, { backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                <Ionicons name="flash" size={12} color="#F59E0B" />
                                <Text style={[styles.costTextElite, { color: textColor }]}>{item.cost}</Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.redeemBtnElite, isOwned && styles.ownedBtnElite]}
                                onPress={() => !isOwned && handleRedeem(item)}
                                disabled={isOwned}
                            >
                                {isOwned ? (
                                    <Text style={styles.ownedBtnTextElite}>OWNED</Text>
                                ) : (
                                    <LinearGradient
                                        colors={themeColors.gradient}
                                        style={styles.redeemBtnGrad}
                                    >
                                        <Text style={styles.redeemBtnTextElite}>REDEEM</Text>
                                    </LinearGradient>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </GlassCard>
            </AnimatedCard>
        );
    };

    return (
        <AuraBackground style={styles.container}>
            <StatusBar style={themeColors.isDark ? "light" : "dark"} />
            {renderHeader()}

            <FlatList
                data={filteredItems}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                numColumns={2}
                onRefresh={loadData}
                refreshing={loading}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={() => (
                    <View>
                        {renderCategories()}
                        <Text style={[styles.featuredTitleElite, { color: textColor }]}>FEATURED REWARDS</Text>
                    </View>
                )}
                columnWrapperStyle={styles.columnRowElite}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={() => loading ? (
                    <View style={{ marginTop: 50 }}>
                        <ActivityIndicator size="large" color={themeColors.accent} />
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: subTextColor }]}>No rewards found for this category.</Text>
                    </View>
                )}
            />

            <HistoryModal
                visible={showHistory}
                onClose={() => setShowHistory(false)}
                history={history}
                themeColors={themeColors}
            />
        </AuraBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingBottom: 10,
    },
    headerSafe: {
        paddingHorizontal: 25,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
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
        letterSpacing: -0.5,
    },
    eliteSubtitle: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginTop: 2,
    },
    balanceWrapper: {
        marginTop: 25,
        backgroundColor: 'transparent',
    },
    balanceCardElite: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 30,
    },
    balanceInfoElite: {
        gap: 8,
    },
    balanceLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    balanceLabelElite: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    eliteMemberBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    eliteMemberText: {
        fontSize: 7,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    pointsRowElite: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pointsValueElite: {
        fontSize: 32,
        fontWeight: '900',
    },
    pointsSuffixElite: {
        fontSize: 12,
        fontWeight: '900',
        marginTop: 10,
    },
    earnMoreBtnElite: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 15,
        gap: 8,
    },
    earnMoreTextElite: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    earnIconCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryScroll: {
        marginTop: 20,
        marginBottom: 10,
    },
    categoryScrollContent: {
        paddingHorizontal: 25,
        gap: 12,
    },
    categoryChipElite: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
    },
    categoryTextElite: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    featuredTitleElite: {
        fontSize: 18,
        fontWeight: '900',
        marginHorizontal: 25,
        marginTop: 20,
        marginBottom: 20,
        letterSpacing: -0.5,
    },
    listContent: {
        paddingBottom: 40,
    },
    columnRowElite: {
        justifyContent: 'space-between',
        paddingHorizontal: 25,
        gap: 15,
    },
    itemCardWrapper: {
        width: (width - 65) / 2,
        marginBottom: 15,
        backgroundColor: 'transparent',
    },
    itemCardElite: {
        borderRadius: 30,
        padding: 12,
        alignItems: 'center',
    },
    itemIconContainerElite: {
        width: '100%',
        aspectRatio: 1,
        marginBottom: 12,
        position: 'relative',
    },
    itemImageElite: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
        backgroundColor: '#1E293B',
    },
    typeBadgeBlur: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        padding: 6,
        borderRadius: 10,
        overflow: 'hidden',
    },
    ownedBadgeElite: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 28,
        height: 28,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    ownedBadgeGrad: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemInfoElite: {
        width: '100%',
        alignItems: 'center',
    },
    itemTitleElite: {
        fontSize: 14,
        fontWeight: '900',
        textAlign: 'center',
        height: 40,
        lineHeight: 18,
    },
    itemTypeElite: {
        fontSize: 8,
        fontWeight: '900',
        marginTop: 4,
        letterSpacing: 0.8,
        marginBottom: 15,
    },
    itemFooterElite: {
        width: '100%',
        gap: 10,
    },
    costBadgeElite: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 6,
        borderRadius: 12,
    },
    costTextElite: {
        fontSize: 12,
        fontWeight: '900',
    },
    redeemBtnElite: {
        width: '100%',
        height: 46,
        borderRadius: 14,
        overflow: 'hidden',
    },
    redeemBtnGrad: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ownedBtnElite: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    redeemBtnTextElite: {
        fontSize: 11,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
    ownedBtnTextElite: {
        fontSize: 10,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
    },
    modalBlur: {
        flex: 1,
    },
    modalContent: {
        flex: 1,
        marginTop: Platform.OS === 'ios' ? 0 : 40,
        paddingHorizontal: 25,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 25,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    modalCloseBtn: {
        width: 44,
        height: 44,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyList: {
        paddingBottom: 40,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 22,
        marginBottom: 12,
    },
    historyIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    historyInfo: {
        flex: 1,
    },
    historyName: {
        fontSize: 15,
        fontWeight: '900',
    },
    historyDate: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    historyCost: {
        alignItems: 'flex-end',
    },
    historyCostText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#F59E0B',
    },
    historySeparator: {
        height: 0,
    },
    emptyHistory: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 20,
    },
    emptyHistoryIcon: {
        width: 100,
        height: 100,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyHistoryText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
    }
});

export default ShopScreen;
