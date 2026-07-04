const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'mobile_fitness', 'src', 'screens', 'BodyRecoveryScreen.js');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings for reliable regex
content = content.replace(/\r\n/g, '\n');

// 1. Add selectedCategory state
content = content.replace(
    /const \[recoveryPlan, setRecoveryPlan\] = useState\(null\);/,
    `const [recoveryPlan, setRecoveryPlan] = useState(null);\n    const [selectedCategory, setSelectedCategory] = useState(null);`
);

// 2. Add reset for selectedCategory
content = content.replace(
    /setRecoveryPlan\(null\);\n(\s*)setCurrentQuestionIndex\(0\);/,
    `setRecoveryPlan(null);\n$1setSelectedCategory(null);\n$1setCurrentQuestionIndex(0);`
);

// 3. Update getPartStroke for light theme
content = content.replace(
    /rgba\(94, 234, 212, 0\.2\)/g,
    `rgba(16, 185, 129, 0.3)`
);

// 4. Update Questionnaire BlurView and styling colors to light mode variables
content = content.replace(/tint="dark"/g, `tint="light"`);

// 5. Update main gradient
content = content.replace(
    /colors=\{\['#070A13', '#0B0F19', '#111827'\]\}/,
    `colors={['#F8FAFC', '#ECFDF5']}`
);

// 6. Update techGridOverlay lines
content = content.replace(
    /backgroundColor: '#06B6D4'/g,
    `backgroundColor: 'rgba(16, 185, 129, 0.3)'`
);

// 7. Update SvgLinearGradients
content = content.replace(
    /<Stop offset="0%" stopColor="#1E293B" \/>\n\s*<Stop offset="50%" stopColor="#334155" \/>\n\s*<Stop offset="100%" stopColor="#0F172A" \/>/g,
    `<Stop offset="0%" stopColor="#E2E8F0" />\n                                                <Stop offset="50%" stopColor="#CBD5E1" />\n                                                <Stop offset="100%" stopColor="#94A3B8" />`
);
content = content.replace(
    /<Stop offset="0%" stopColor="#F87171" \/>\n\s*<Stop offset="40%" stopColor="#EF4444" \/>\n\s*<Stop offset="100%" stopColor="#991B1B" \/>/g,
    `<Stop offset="0%" stopColor="#FCA5A5" />\n                                                <Stop offset="40%" stopColor="#EF4444" />\n                                                <Stop offset="100%" stopColor="#B91C1C" />`
);

// 8. Replace Results Phase code block with Dashboard layout
// The regex here needs to perfectly match the block starting with {phase === 'results' && ( and ending at the corresponding ScrollView
// Since regex over large blocks is tricky, let's use split/indexOf
const oldResultsStart = "{phase === 'results' && (\n                    <ScrollView";
const oldResultsEnd = "                )}";

const startIndex = content.indexOf("{phase === 'results' && (\n                    <ScrollView");
if (startIndex !== -1) {
    // Find the ending tag: 
    // Wait, the end tag is exactly before `</SafeAreaView>`
    const safeAreaEndIndex = content.indexOf("</SafeAreaView>", startIndex);
    
    if (safeAreaEndIndex !== -1) {
        // We want to replace everything from startIndex to safeAreaEndIndex - whitespace
        const newResultsPhase = `{phase === 'results' && !selectedCategory && (
                    <View style={styles.dashboardContainer}>
                        <Text style={styles.dashboardTitle}>RECOVERY DASHBOARD</Text>
                        <Text style={styles.dashboardSubtitle}>Select a category to view your custom roadmap</Text>
                        <View style={styles.dashboardGrid}>
                            <TouchableOpacity style={styles.dashCard} onPress={() => setSelectedCategory('mobility')}>
                                <View style={[styles.dashIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                                    <Ionicons name="sync" size={28} color="#10B981" />
                                </View>
                                <Text style={styles.dashCardTitle}>Mobility Rehab</Text>
                                <Text style={styles.dashCardSub}>{recoveryPlan?.mobility_exercises?.length || 0} exercises</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.dashCard} onPress={() => setSelectedCategory('supplements')}>
                                <View style={[styles.dashIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                                    <Ionicons name="leaf" size={28} color="#F59E0B" />
                                </View>
                                <Text style={styles.dashCardTitle}>Supplements</Text>
                                <Text style={styles.dashCardSub}>{recoveryPlan?.supplements?.length || 0} items</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.dashCard} onPress={() => setSelectedCategory('avoid')}>
                                <View style={[styles.dashIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                    <Ionicons name="ban" size={28} color="#EF4444" />
                                </View>
                                <Text style={styles.dashCardTitle}>Avoid Movements</Text>
                                <Text style={styles.dashCardSub}>{recoveryPlan?.exercises_to_avoid?.length || 0} warnings</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.dashCard} onPress={() => setSelectedCategory('ai')}>
                                <View style={[styles.dashIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                                    <Ionicons name="sparkles" size={28} color="#8B5CF6" />
                                </View>
                                <Text style={styles.dashCardTitle}>AI Clinical</Text>
                                <Text style={styles.dashCardSub}>Recommendations</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {phase === 'results' && selectedCategory && (
                    <View style={styles.detailContainer}>
                        <TouchableOpacity style={styles.detailBackBtn} onPress={() => setSelectedCategory(null)}>
                            <Ionicons name="arrow-back" size={20} color="#0F172A" />
                            <Text style={styles.detailBackText}>BACK TO DASHBOARD</Text>
                        </TouchableOpacity>
                        
                        <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultsScrollPadding}>
                            {selectedCategory === 'mobility' && (
                                <BlurView intensity={60} tint="light" style={styles.resultGlassCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                                            <Ionicons name="sync" size={20} color="#10B981" />
                                        </View>
                                        <Text style={styles.cardHeading}>ACTIVE JOINT MOBILITY REHAB</Text>
                                    </View>
                                    {recoveryPlan.mobility_exercises?.map((item, idx) => (
                                        <View key={idx} style={styles.rehabItem}>
                                            <Text style={styles.rehabItemTitle}>{item.name.toUpperCase()}</Text>
                                            <View style={styles.rehabMetaRow}>
                                                <Text style={styles.rehabMetaLabel}>SETS: <Text style={{ color: '#0F172A' }}>{item.sets}</Text></Text>
                                                <Text style={styles.rehabMetaLabel}>REPS: <Text style={{ color: '#0F172A' }}>{item.reps}</Text></Text>
                                            </View>
                                            <Text style={styles.rehabItemGuide}>{item.guide}</Text>
                                        </View>
                                    ))}
                                </BlurView>
                            )}

                            {selectedCategory === 'supplements' && (
                                <BlurView intensity={60} tint="light" style={styles.resultGlassCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.cardIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                                            <Ionicons name="leaf" size={20} color="#F59E0B" />
                                        </View>
                                        <Text style={styles.cardHeading}>CELLULAR REPAIR & SUPPLEMENTS</Text>
                                    </View>
                                    {recoveryPlan.supplements?.map((item, idx) => (
                                        <View key={idx} style={styles.suppItem}>
                                            <View style={styles.suppTop}>
                                                <Text style={styles.suppName}>{item.name.toUpperCase()}</Text>
                                                <Text style={styles.suppDosage}>{item.dosage}</Text>
                                            </View>
                                            <Text style={styles.suppReason}>{item.reason}</Text>
                                        </View>
                                    ))}
                                </BlurView>
                            )}

                            {selectedCategory === 'avoid' && (
                                <BlurView intensity={60} tint="light" style={styles.resultGlassCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                            <Ionicons name="ban" size={20} color="#EF4444" />
                                        </View>
                                        <Text style={styles.cardHeading}>EXERCISES TO AVOID COMPLETELY</Text>
                                    </View>
                                    {recoveryPlan.exercises_to_avoid?.map((item, idx) => (
                                        <View key={idx} style={styles.avoidItem}>
                                            <View style={styles.avoidDotRow}>
                                                <Ionicons name="close-circle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                                                <Text style={styles.avoidItemTitle}>{item.name.toUpperCase()}</Text>
                                            </View>
                                            <Text style={styles.avoidItemReason}>{item.reason}</Text>
                                        </View>
                                    ))}
                                </BlurView>
                            )}

                            {selectedCategory === 'ai' && (
                                <BlurView intensity={60} tint="light" style={styles.resultGlassCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.cardIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                                            <Ionicons name="sparkles" size={20} color="#8B5CF6" />
                                        </View>
                                        <Text style={styles.cardHeading}>AI CLINICAL RECOMMENDATIONS</Text>
                                    </View>
                                    <View style={styles.recItem}>
                                        <Text style={styles.recLabel}>ESTIMATED HEALING TIMELINE</Text>
                                        <Text style={styles.recValue}>{recoveryPlan.ai_recommendations?.estimated_timeline}</Text>
                                    </View>
                                    <View style={styles.recItem}>
                                        <Text style={styles.recLabel}>HYDRATION PROTOCOL</Text>
                                        <Text style={styles.recValue}>{recoveryPlan.ai_recommendations?.hydration}</Text>
                                    </View>
                                    <View style={styles.recItem}>
                                        <Text style={styles.recLabel}>REST & REPAIR SLEEP</Text>
                                        <Text style={styles.recValue}>{recoveryPlan.ai_recommendations?.sleep}</Text>
                                    </View>
                                    <View style={styles.recItem}>
                                        <Text style={styles.recLabel}>POSTURE & ALIGNMENT CORRECTIONS</Text>
                                        <Text style={styles.recValue}>{recoveryPlan.ai_recommendations?.posture}</Text>
                                    </View>
                                </BlurView>
                            )}
                            <View style={{ height: 60 }} />
                        </ScrollView>
                    </View>
                )}\n            `;
        
        content = content.substring(0, startIndex) + newResultsPhase + content.substring(safeAreaEndIndex);
    }
}

// Add missing styles for Dashboard and Detail views
// I will append them to the end of the StyleSheet, just before \n});
if(!content.includes('dashboardContainer: {')) {
    const extraStyles = `
    dashboardContainer: {
        flex: 1,
        paddingTop: 10,
    },
    dashboardTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 1,
        marginBottom: 5,
    },
    dashboardSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 20,
    },
    dashboardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 15,
    },
    dashCard: {
        width: '47%',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 20,
        padding: 15,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    dashIconBox: {
        width: 45,
        height: 45,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    dashCardTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    dashCardSub: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    detailContainer: {
        flex: 1,
    },
    detailBackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 10,
        gap: 6,
    },
    detailBackText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: 1,
    },
    detailScroll: {
        flex: 1,
    },`;

    content = content.replace(/\n\}\);/s, extraStyles + '\n});');
}

// Next, let's fix the text colors inside styles for the light theme.
content = content.replace(/color: '#FFF'/g, `color: '#0F172A'`);
content = content.replace(/color: '#94A3B8'/g, `color: '#475569'`);
content = content.replace(/backgroundColor: '#070A13'/g, `backgroundColor: '#F8FAFC'`);
content = content.replace(/backgroundColor: 'rgba\(15, 23, 42, 0\.3\)'/g, `backgroundColor: 'rgba(255, 255, 255, 0.6)'`);
content = content.replace(/backgroundColor: 'rgba\(30, 41, 59, 0\.15\)'/g, `backgroundColor: 'rgba(255, 255, 255, 0.7)'`);
content = content.replace(/borderColor: 'rgba\(255,255,255,0\.08\)'/g, `borderColor: 'rgba(15, 23, 42, 0.08)'`);
content = content.replace(/borderColor: 'rgba\(255,255,255,0\.06\)'/g, `borderColor: 'rgba(15, 23, 42, 0.08)'`);
content = content.replace(/borderColor: 'rgba\(255,255,255,0\.05\)'/g, `borderColor: 'rgba(15, 23, 42, 0.05)'`);
content = content.replace(/backgroundColor: 'rgba\(255,255,255,0\.05\)'/g, `backgroundColor: 'rgba(15, 23, 42, 0.05)'`);
content = content.replace(/backgroundColor: 'rgba\(255,255,255,0\.03\)'/g, `backgroundColor: 'rgba(15, 23, 42, 0.03)'`);
content = content.replace(/color: 'rgba\(255,255,255,0\.6\)'/g, `color: 'rgba(15, 23, 42, 0.6)'`);
content = content.replace(/color: 'rgba\(255,255,255,0\.25\)'/g, `color: 'rgba(15, 23, 42, 0.4)'`);
content = content.replace(/borderBottomColor: 'rgba\(255,255,255,0\.05\)'/g, `borderBottomColor: 'rgba(15, 23, 42, 0.05)'`);

// Let's change the qNextText and launchText back to white because they are inside a gradient button
content = content.replace(/qNextText:\s*\{\s*color: '#0F172A',/g, `qNextText: {\n        color: '#FFF',`);
content = content.replace(/launchText:\s*\{\s*color: '#0F172A',/g, `launchText: {\n        color: '#FFF',`);
// Same for scanningTitle which needs to be cyan
content = content.replace(/scanningTitle:\s*\{\s*color: '#06B6D4',/g, `scanningTitle: {\n        color: '#0E7490',`);

// Update Svg background or grid lines if needed
content = content.replace(/backgroundColor: 'rgba\(0,0,0,0\.3\)'/g, `backgroundColor: 'rgba(255,255,255,0.5)'`);

// Also update the neonPlinth to be emerald green
content = content.replace(/backgroundColor: '#06B6D4'/g, `backgroundColor: '#10B981'`);

// Scanning HUD effect
content = content.replace(/backgroundColor: 'rgba\(7, 10, 19, 0\.6\)'/g, `backgroundColor: 'rgba(255, 255, 255, 0.8)'`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated BodyRecoveryScreen.js with new node script');
