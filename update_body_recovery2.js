const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'mobile_fitness', 'src', 'screens', 'BodyRecoveryScreen.js');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// Replace the old results section
const searchStartStr = "{phase === 'results' && recoveryPlan && (\\n                    <ScrollView";
// Actually, let's use a simpler replacement
const startIndex = content.indexOf("{phase === 'results' && recoveryPlan && (");
if (startIndex !== -1) {
    const endStr = "                    </ScrollView>\n                )}";
    const endIndex = content.indexOf(endStr, startIndex);
    
    if (endIndex !== -1) {
        const fullEndIndex = endIndex + endStr.length;
        
        const newResultsPhase = `{phase === 'results' && recoveryPlan && !selectedCategory && (
                    <View style={styles.dashboardContainer}>
                        <Text style={styles.dashboardTitle}>RECOVERY DASHBOARD</Text>
                        <Text style={styles.dashboardSubtitle}>Select a category to view your custom roadmap</Text>
                        <View style={styles.dashboardGrid}>
                            
                            <TouchableOpacity style={styles.dashCard} onPress={() => setSelectedCategory('analysis')}>
                                <View style={[styles.dashIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                    <Ionicons name="pulse" size={28} color="#EF4444" />
                                </View>
                                <Text style={styles.dashCardTitle}>Pain Analysis</Text>
                                <Text style={styles.dashCardSub}>Clinical Overview</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.dashCard} onPress={() => setSelectedCategory('stretching')}>
                                <View style={[styles.dashIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                                    <Ionicons name="accessibility" size={28} color="#06B6D4" />
                                </View>
                                <Text style={styles.dashCardTitle}>Stretching</Text>
                                <Text style={styles.dashCardSub}>{recoveryPlan?.stretching?.length || 0} moves</Text>
                            </TouchableOpacity>

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
                            
                            {selectedCategory === 'analysis' && (
                                <BlurView intensity={60} tint="light" style={styles.resultGlassCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                            <Ionicons name="pulse" size={20} color="#EF4444" />
                                        </View>
                                        <Text style={styles.cardHeading}>CLINICAL BIOMECHANICAL ANALYSIS</Text>
                                    </View>
                                    <Text style={styles.cardParagraph}>{recoveryPlan.pain_analysis}</Text>
                                </BlurView>
                            )}

                            {selectedCategory === 'stretching' && (
                                <BlurView intensity={60} tint="light" style={styles.resultGlassCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.cardIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                                            <Ionicons name="accessibility" size={20} color="#06B6D4" />
                                        </View>
                                        <Text style={styles.cardHeading}>TARGETED STATIC STRETCHING</Text>
                                    </View>
                                    {recoveryPlan.stretching?.map((item, idx) => (
                                        <View key={idx} style={styles.rehabItem}>
                                            <Text style={styles.rehabItemTitle}>{item.name.toUpperCase()}</Text>
                                            <View style={styles.rehabMetaRow}>
                                                <Text style={styles.rehabMetaLabel}>SETS/HOLD: <Text style={{ color: '#0F172A' }}>{item.sets}</Text></Text>
                                                <Text style={styles.rehabMetaLabel}>FREQ: <Text style={{ color: '#0F172A' }}>{item.frequency}</Text></Text>
                                            </View>
                                            <Text style={styles.rehabItemGuide}>{item.guide}</Text>
                                        </View>
                                    ))}
                                </BlurView>
                            )}

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
                )}`;

        content = content.substring(0, startIndex) + newResultsPhase + content.substring(fullEndIndex);
        
        // Remove duplicate selectedCategory state
        content = content.replace(/const \[selectedCategory, setSelectedCategory\] = useState\(null\);\n    const \[selectedCategory, setSelectedCategory\] = useState\(null\);/g, "const [selectedCategory, setSelectedCategory] = useState(null);");

        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Successfully replaced the results phase.");
    } else {
        console.log("Failed to find end index.");
    }
} else {
    console.log("Failed to find start index.");
}
