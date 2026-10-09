import React, { useState, useEffect, useContext, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
    Dimensions,
    Linking,
    Platform,
    Animated,
    Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle } from 'react-native-svg';
import { AppContext } from '../context/AppContext';
import { api } from '../services/api';
import { COLORS } from '../constants/Theme';
import { AnimatedCard, GlassCard } from '../components';
import { parseTargetReps } from '../ai/exerciseFormModel';
import { getExerciseTutorial } from '../ai/exerciseTutorials';

const { width } = Dimensions.get('window');

const MOTIVATIONAL_QUOTES = [
    "Push yourself, because no one else is going to do it for you.",
    "Your body can stand almost anything. It's your mind that you have to convince.",
    "Success starts with self-discipline.",
    "Form is temporary, class is permanent. Keep it tight!",
    "Great effort! PoseForm is tracking elite form potential."
];

const poseFormQualityLabel = (value) => {
    const score = Number(value || 0);
    if (score >= 82) return 'High';
    if (score >= 64) return 'Medium';
    if (score > 0) return 'Low';
    return '--';
};

const getPoseFormSetup = (exerciseName = '') => {
    const normalized = String(exerciseName).toLowerCase().replace(/[^a-z]/g, '');

    if (/(pushup|plank|deadlift|glutebridge|mountainclimber|tricepdip|legcurl|legextension|legpress)/.test(normalized)) {
        return {
            angle: 'Side view',
            frame: 'Shoulder to ankle',
            tip: 'Phone at hip height',
        };
    }

    if (/(bicepcurl|lateralraise|shoulderpress|row|latpulldown|pullup|benchpress)/.test(normalized)) {
        return {
            angle: 'Front or 3/4',
            frame: 'Shoulders to wrists',
            tip: 'Keep elbows visible',
        };
    }

    if (/(squat|lunge|jumpingjack|burpee|calfraise)/.test(normalized)) {
        return {
            angle: 'Front or side',
            frame: 'Full body',
            tip: 'Keep feet in frame',
        };
    }

    return {
        angle: 'Clear angle',
        frame: 'Working joints',
        tip: 'Move slowly once first',
    };
};

const WorkoutPlayerScreen = ({ navigation }) => {
    const { activeWorkout, completeWorkout, toggleExercise } = useContext(AppContext);
    
    // States for premium state machine
    const [screenState, setScreenState] = useState('COUNTDOWN'); // COUNTDOWN, ACTIVE, REST, SUMMARY
    const [countdownSeconds, setCountdownSeconds] = useState(5);
    const [restSeconds, setRestSeconds] = useState(25);
    const [workoutSeconds, setWorkoutSeconds] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isAiCoachActive, setIsAiCoachActive] = useState(false);
    const [activeMotivationalQuote, setActiveMotivationalQuote] = useState(MOTIVATIONAL_QUOTES[0]);
    
    // AI posture states
    const [aiFeedbackText, setAiFeedbackText] = useState("PoseForm standing by...");
    const [postureState, setPostureState] = useState("CORRECT"); // CORRECT, INCORRECT, SCANNING
    const [aiRepCount, setAiRepCount] = useState(0);
    const [aiFormScore, setAiFormScore] = useState(0);
    const [cameraFacing, setCameraFacing] = useState('front');
    const [aiVideoRecording, setAiVideoRecording] = useState(false);
    const [aiVideoUploading, setAiVideoUploading] = useState(false);
    const [aiVideoStatus, setAiVideoStatus] = useState('Ready for accurate video analysis.');
    const [aiVideoResult, setAiVideoResult] = useState(null);
    const [aiRecordingSeconds, setAiRecordingSeconds] = useState(0);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [exerciseTutorialReviews, setExerciseTutorialReviews] = useState({});
    
    // Camera Permission
    const [permission, requestPermission] = useCameraPermissions();

    // Animated values for premium visual enhancements
    const countdownScale = useRef(new Animated.Value(1)).current;
    // Background interval timers
    const timerRef = useRef(null);
    const restTimerRef = useRef(null);

    const cameraRef = useRef(null);
    const lastCoachStatusRef = useRef({ message: '', at: 0 });
    const aiVideoStartTimerRef = useRef(null);
    const recordingClockRef = useRef(null);
    const screenStateRef = useRef(screenState);
    const isPausedRef = useRef(isPaused);
    const workoutScrollRef = useRef(null);
    const currentEx = activeWorkout?.exercises?.find(ex => !(activeWorkout.completedExercises || []).includes(ex.id)) || activeWorkout?.exercises?.[0];

    const publishCoachStatus = (message, force = false) => {
        const now = Date.now();
        const previous = lastCoachStatusRef.current;
        if (!force && previous.message === message && now - previous.at < 1800) return;
        lastCoachStatusRef.current = { message, at: now };
        setAiFeedbackText(message);
    };

    const resetPoseFormState = (feedback = null) => {
        setAiRepCount(0);
        setAiFormScore(0);
        setAiVideoResult(null);
        setAiRecordingSeconds(0);
        setAiVideoStatus('Ready for accurate video analysis.');
        setPostureState('SCANNING');
        setAiFeedbackText(feedback || 'Camera changed. Record the full target set again.');
    };

    useEffect(() => {
        screenStateRef.current = screenState;
    }, [screenState]);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        if (!activeWorkout) {
            navigation.goBack();
            return;
        }

        // Start countdown immediately
        startCountdownFlow();

        return () => {
            clearInterval(timerRef.current);
            clearInterval(restTimerRef.current);
            if (aiVideoStartTimerRef.current) {
                clearTimeout(aiVideoStartTimerRef.current);
            }
            clearInterval(recordingClockRef.current);
        };
    }, [activeWorkout]);

    useEffect(() => {
        clearInterval(recordingClockRef.current);
        if (aiVideoRecording) {
            recordingClockRef.current = setInterval(() => {
                setAiRecordingSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(recordingClockRef.current);
    }, [aiVideoRecording]);

    // Handle countdown flow before starting workout
    const startCountdownFlow = () => {
        setScreenState('COUNTDOWN');
        setCountdownSeconds(5);

        const countdownInterval = setInterval(() => {
            setCountdownSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    return 0;
                }
                // Animate count number
                countdownScale.setValue(1.5);
                Animated.timing(countdownScale, {
                    toValue: 1,
                    duration: 400,
                    easing: Easing.out(Easing.back()),
                    useNativeDriver: true
                }).start();
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        if (screenState === 'COUNTDOWN' && countdownSeconds === 0) {
            setScreenState('ACTIVE');
            startWorkoutTimer();
        }
    }, [screenState, countdownSeconds]);

    // Active workout timer
    const startWorkoutTimer = () => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (!isPausedRef.current && screenStateRef.current === 'ACTIVE') {
                setWorkoutSeconds(prev => prev + 1);
            }
        }, 1000);
    };

    // Rest period timer
    const startRestPeriod = () => {
        clearInterval(timerRef.current);
        setScreenState('REST');
        setRestSeconds(25);
        // Set a random motivational quote
        const randQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
        setActiveMotivationalQuote(randQuote);

        clearInterval(restTimerRef.current);
        restTimerRef.current = setInterval(() => {
            if (!isPaused) {
                setRestSeconds(prev => {
                    if (prev <= 1) {
                        clearInterval(restTimerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);
    };

    useEffect(() => {
        if (screenState === 'REST' && restSeconds === 0) {
            setScreenState('ACTIVE');
            startWorkoutTimer();
        }
    }, [screenState, restSeconds]);

    useEffect(() => {
        resetPoseFormState(currentEx ? `PoseForm ready for ${currentEx.name}. Open video analysis when you are ready.` : 'PoseForm standing by...');
    }, [currentEx?.id]);

    useEffect(() => {
        let mounted = true;
        api.getExerciseTutorialReviews()
            .then((res) => {
                if (mounted && res.status === 200) {
                    setExerciseTutorialReviews(res.data?.reviews || {});
                }
            })
            .catch(() => {});
        return () => {
            mounted = false;
        };
    }, []);

    // Camera readiness feedback for recorded analysis
    useEffect(() => {
        let postureInterval = null;
        if (isAiCoachActive && permission?.granted && screenState === 'ACTIVE' && !isPaused) {
            postureInterval = setInterval(() => {
                if (!isCameraReady) {
                    setPostureState('SCANNING');
                    publishCoachStatus('Opening camera. When ready, record the full target set.');
                }
            }, 2500);
        }
        return () => clearInterval(postureInterval);
    }, [isAiCoachActive, permission?.granted, screenState, isPaused, isCameraReady]);

    useEffect(() => {
        if (isAiCoachActive && screenState === 'ACTIVE' && isCameraReady) {
            setAiFeedbackText('Camera ready. Tap start, complete all target reps, then stop for analysis.');
        }
    }, [isAiCoachActive, screenState, isCameraReady]);

    const formatTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const uploadRecordedExerciseVideo = async (video) => {
        setAiVideoUploading(true);
        setAiVideoStatus('Analyzing video with backend AI...');
        publishCoachStatus('Uploading recorded set for PoseForm analysis.', true);

        const result = await api.uploadExerciseVideo(
            video,
            currentEx?.name || 'general',
            parseTargetReps(currentEx?.reps)
        );

        setAiVideoUploading(false);
        setAiRecordingSeconds(0);
        if (result.status === 200 && result.data?.success) {
            const data = result.data;
            setAiVideoResult(data);
            setAiRepCount(Number(data.reps || 0));
            setAiFormScore(Number(data.form_score || 0));
            setPostureState(Number(data.form_score || 0) >= 70 ? 'CORRECT' : 'INCORRECT');
            const target = parseTargetReps(currentEx?.reps);
            const reachedTarget = target && Number(data.reps || 0) >= target;
            const targetStatus = reachedTarget ? 'Target reps completed. ' : '';
            const repQuality = data.rep_count_quality ? `${data.rep_count_quality} rep quality` : `${data.confidence || 0}% lock`;
            const reps = Number(data.reps || 0);
            const summary = `${targetStatus}${reps} ${reps === 1 ? 'rep' : 'reps'}, ${data.form_score || 0}% form, ${repQuality}. ${data.feedback?.[0] || 'Video analysis complete.'}`;
            setAiVideoStatus(summary);
            setAiFeedbackText(summary);
            return;
        }

        const message = result.data?.needs_setup
            ? 'Python AI dependencies are missing. Install requirements, then retry video analysis.'
            : (result.data?.message || 'Video analysis failed. Try a shorter, brighter recording.');
        setAiVideoResult(result.data || null);
        setAiVideoStatus(message);
        setAiFeedbackText(message);
        setPostureState('SCANNING');
    };

    const toggleAiVideoRecording = async () => {
        if (aiVideoRecording) {
            if (aiVideoStartTimerRef.current) {
                clearTimeout(aiVideoStartTimerRef.current);
                aiVideoStartTimerRef.current = null;
            }
            setAiVideoStatus('Finishing recording...');
            cameraRef.current?.stopRecording?.();
            setAiVideoRecording(false);
            return;
        }

        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert("Camera Required", "Camera permission is needed for video exercise analysis.");
                return;
            }
        }

        if (!isAiCoachActive) {
            setIsAiCoachActive(true);
        }

        setAiVideoResult(null);
        setAiRecordingSeconds(0);
        setAiVideoRecording(true);
        setAiVideoStatus(`Recording. Do ${parseTargetReps(currentEx?.reps) || 'all'} target reps slowly, then press stop.`);
        setAiFeedbackText('Recording video analysis. Move slowly and keep the body framed.');

        if (aiVideoStartTimerRef.current) {
            clearTimeout(aiVideoStartTimerRef.current);
        }

        aiVideoStartTimerRef.current = setTimeout(async () => {
            try {
                if (!cameraRef.current?.recordAsync) {
                    throw new Error('Camera is not ready for video recording.');
                }
                const video = await cameraRef.current.recordAsync({
                    maxFileSize: 38 * 1024 * 1024,
                });
                setAiVideoRecording(false);
                if (video?.uri) {
                    await uploadRecordedExerciseVideo(video.uri);
                } else {
                    setAiVideoStatus('No video was captured. Try again after the camera preview is ready.');
                }
            } catch (error) {
                console.log('Video analysis recording error:', error);
                setAiVideoStatus('Could not record video. Reopen AI camera and try again.');
                setAiFeedbackText('Could not record video. Reopen AI camera and try again.');
                setAiVideoRecording(false);
            } finally {
                setAiVideoRecording(false);
            }
        }, 650);
    };

    const clearPoseFormResult = () => {
        setAiVideoResult(null);
        setAiRepCount(0);
        setAiFormScore(0);
        setAiRecordingSeconds(0);
        setPostureState('SCANNING');
        setAiVideoStatus('Ready for a new PoseForm analysis.');
        setAiFeedbackText('Record again or upload a clearer clip.');
    };

    const pickExerciseVideo = async () => {
        if (aiVideoRecording || aiVideoUploading) return;

        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert("Gallery Required", "Gallery permission is needed to upload an exercise video for AI analysis.");
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                allowsEditing: false,
                quality: 1,
                videoMaxDuration: 90,
            });

            if (result.canceled) {
                return;
            }

            const asset = result.assets?.[0];
            if (!asset?.uri) {
                setAiVideoStatus('No video was selected. Pick a clear exercise clip and retry.');
                return;
            }

            setAiVideoResult(null);
            setAiRepCount(0);
            setAiFormScore(0);
            setPostureState('SCANNING');
            setAiVideoStatus('Uploading selected video for AI analysis...');
            setAiFeedbackText('Selected video received. PoseForm is analyzing reps and form.');
            await uploadRecordedExerciseVideo(asset);
        } catch (error) {
            console.log('Video picker analysis error:', error);
            setAiVideoStatus('Could not read the selected video. Try another clip under 38 MB.');
            setAiFeedbackText('Could not read the selected video. Try another clip under 38 MB.');
            setPostureState('SCANNING');
        }
    };

    const openExerciseTutorial = async () => {
        if (!poseFormTutorial?.url) {
            Alert.alert('Tutorial Unavailable', 'No tutorial is mapped for this exercise yet.');
            return;
        }

        try {
            await Linking.openURL(poseFormTutorial.url);
        } catch (error) {
            console.log('Exercise tutorial open error:', error);
            Alert.alert('Could Not Open Tutorial', 'Please check your connection and try again.');
        }
    };

    const returnToExerciseList = () => {
        if (aiVideoRecording || aiVideoUploading) {
            Alert.alert('Analysis In Progress', 'Wait until recording or analysis finishes before returning to the exercise list.');
            return;
        }

        setIsAiCoachActive(false);
        setIsCameraReady(false);
        setAiFeedbackText('Back on the exercise list. Open PoseForm whenever you are ready.');
        setTimeout(() => {
            workoutScrollRef.current?.scrollTo?.({ y: 520, animated: true });
        }, 120);
    };

    const handleToggleExercise = (id) => {
        toggleExercise(id);

        // Check if there are other exercises remaining
        const remaining = activeWorkout.exercises.filter(
            ex => !activeWorkout.completedExercises.includes(ex.id) && ex.id !== id
        );

        if (remaining.length > 0) {
            // Initiate Rest Interval Screen
            startRestPeriod();
        } else {
            // All exercises marked done, trigger summary screen
            handleFinish();
        }
    };

    const handleSkipExercise = () => {
        // Find next incomplete exercise and proceed to rest or next
        const currentEx = activeWorkout.exercises.find(ex => !activeWorkout.completedExercises.includes(ex.id));
        if (currentEx) {
            handleToggleExercise(currentEx.id);
        } else {
            handleFinish();
        }
    };

    const handleFinish = () => {
        clearInterval(timerRef.current);
        clearInterval(restTimerRef.current);
        setScreenState('SUMMARY');
    };

    const handleConfirmFinish = () => {
        const sessionData = {
            title: activeWorkout.title,
            duration: formatTime(workoutSeconds),
            kcal: activeWorkout.kcal
        };
        completeWorkout(sessionData);
        navigation.navigate('Main', {
            screen: 'Workout',
            params: { refresh: true }
        });
    };

    const toggleAiCoach = () => {
        if (!isAiCoachActive) {
            setIsAiCoachActive(true);
            setIsCameraReady(false);
            setPostureState("SCANNING");
            publishCoachStatus(permission?.granted
                ? "Opening recording camera. Frame the exercise clearly."
                : "Upload a video, or tap Start Recording to enable the camera.", true);
        } else {
            setIsAiCoachActive(false);
            setIsCameraReady(false);
        }
    };

    const flipCamera = () => {
        const nextFacing = cameraFacing === 'front' ? 'back' : 'front';
        setIsCameraReady(false);
        setCameraFacing(nextFacing);
        resetPoseFormState(nextFacing === 'back'
            ? 'Back camera selected. Place the phone so your full body is visible.'
            : 'Front camera selected. Face the phone and keep torso/legs visible.');
    };

    const handleCameraReady = async () => {
        setIsCameraReady(true);
        setAiFeedbackText(cameraFacing === 'back'
            ? 'Back camera ready. Record the full target set.'
            : 'Front camera ready. Face the phone and record the full target set.');
    };

    if (!activeWorkout) return null;

    const completedExerciseIds = activeWorkout.completedExercises || [];
    const totalExercises = activeWorkout.exercises.length;
    const completedCount = completedExerciseIds.length;
    const progressPercent = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;
    const targetReps = parseTargetReps(currentEx?.reps);
    const videoFeedbackItems = Array.isArray(aiVideoResult?.feedback) ? aiVideoResult.feedback : [];
    const videoMistakeItems = Array.isArray(aiVideoResult?.mistakes) ? aiVideoResult.mistakes : [];
    const poseFormTargetReached = !!targetReps && aiVideoResult?.success && Number(aiVideoResult.reps || 0) >= targetReps;
    const poseFormQuality = poseFormQualityLabel(aiVideoResult?.rep_reliability ?? aiVideoResult?.confidence);
    const poseFormSetup = getPoseFormSetup(currentEx?.name);
    const poseFormTutorial = getExerciseTutorial(currentEx?.name);
    const poseFormTutorialReview = poseFormTutorial ? exerciseTutorialReviews[poseFormTutorial.id] : null;
    const poseFormTutorialApproved = poseFormTutorialReview?.status === 'approved';
    const shouldShowTutorialNudge = !!poseFormTutorial && aiVideoResult?.success && Number(aiVideoResult.form_score || 0) < 76;
    const poseFormDurationLabel = aiVideoRecording
        ? formatTime(aiRecordingSeconds)
        : aiVideoResult?.analyzed_duration_sec
            ? `${aiVideoResult.analyzed_duration_sec}s`
            : '--';
    let poseFormResultTitle = 'Ready To Analyze';
    let poseFormResultSubtitle = 'Record or upload one clear full-set video.';
    if (aiVideoUploading) {
        poseFormResultTitle = 'Analyzing Video';
        poseFormResultSubtitle = 'PoseForm is reading movement, reps, and form quality.';
    } else if (aiVideoRecording) {
        poseFormResultTitle = 'Recording Set';
        poseFormResultSubtitle = 'Finish the planned reps, then press Stop & Analyze.';
    } else if (aiVideoResult?.success) {
        poseFormResultTitle = poseFormTargetReached ? 'Target Completed' : 'Analysis Complete';
        poseFormResultSubtitle = poseFormTargetReached
            ? 'Good set. You can mark this exercise complete.'
            : 'Review the result, retake if needed, or accept it.';
    }
    const poseHeaderBadgeValue = aiVideoRecording
        ? formatTime(aiRecordingSeconds)
        : aiVideoUploading
            ? '...'
            : aiVideoResult?.success
                ? (poseFormTargetReached ? 'HIT' : 'DONE')
                : 'READY';

    // Color definitions based on posture state
    const getPostureColor = () => {
        if (aiVideoUploading || aiVideoRecording) return '#38BDF8';
        if (postureState === 'CORRECT') return '#10B981';
        if (postureState === 'INCORRECT') return '#EF4444';
        return '#3B82F6'; // Scanning
    };

    return (
        <View style={styles.container}>
            {/* Immersive Camera view background when active */}
            {isAiCoachActive && permission?.granted && screenState === 'ACTIVE' && (
                <View style={StyleSheet.absoluteFill}>
                    <CameraView
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill}
                        facing={cameraFacing}
                        mode="video"
                        videoQuality="480p"
                        videoBitrate={1000000}
                        animateShutter={false}
                        mute
                        onCameraReady={handleCameraReady}
                    />
                    {/* Immersive Dark Vignette Tint */}
                    <LinearGradient
                        colors={['rgba(5, 8, 20, 0.4)', 'rgba(5, 8, 20, 0.75)']}
                        style={StyleSheet.absoluteFill}
                    />

                    <View style={styles.recordingFrameGuide}>
                        <View style={styles.recordingCorner} />
                        <Text style={styles.recordingFrameText}>Keep the working joints inside frame</Text>
                    </View>
                </View>
            )}

            {/* Default Deep Slate Dark Premium Gradient when camera is inactive */}
            {(!isAiCoachActive || !permission?.granted || screenState !== 'ACTIVE') && (
                <LinearGradient
                    colors={['#060913', '#0F1524', '#070A14']}
                    style={StyleSheet.absoluteFill}
                />
            )}

            {/* PRE-WORKOUT COUNTDOWN MODE */}
            {screenState === 'COUNTDOWN' && (
                <View style={styles.fullscreenOverlay}>
                    <Animated.View style={[styles.countdownBox, { transform: [{ scale: countdownScale }] }]}>
                        <Text style={styles.countdownTitle}>GET READY</Text>
                        <Text style={styles.countdownNumber}>{countdownSeconds}</Text>
                        <Text style={styles.countdownSubtitle}>Prepare to record your exercise set...</Text>
                    </Animated.View>
                </View>
            )}

            {/* ACTIVE WORKOUT HUD */}
            {screenState === 'ACTIVE' && (
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                    {/* Top Header Controls */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={isAiCoachActive ? returnToExerciseList : () => navigation.goBack()} style={styles.headerBtn}>
                            <BlurView intensity={35} tint="dark" style={styles.headerBlur}>
                                <Ionicons name={isAiCoachActive ? 'list-outline' : 'chevron-down'} size={24} color={COLORS.white} />
                            </BlurView>
                        </TouchableOpacity>

                        <View style={styles.headerTitleBox}>
                            <View style={styles.statusBadge}>
                                <View style={[styles.statusDot, { backgroundColor: isAiCoachActive ? '#10B981' : '#64748B' }]} />
                                <Text style={styles.statusBadgeText}>
                                    {isAiCoachActive ? 'POSEFORM READY' : 'WORKOUT'}
                                </Text>
                            </View>
                            <Text style={styles.headerWorkoutTitle} numberOfLines={1}>{activeWorkout.title}</Text>
                        </View>

                        <View style={styles.headerActions}>
                            {isAiCoachActive && (
                                <TouchableOpacity onPress={flipCamera} style={styles.headerBtn}>
                                    <BlurView intensity={35} tint="dark" style={styles.headerBlur}>
                                        <Ionicons name="camera-reverse-outline" size={22} color={COLORS.white} />
                                    </BlurView>
                                </TouchableOpacity>
                            )}
                            {isAiCoachActive && (
                                <TouchableOpacity onPress={returnToExerciseList} style={styles.headerBtn}>
                                    <BlurView intensity={35} tint="dark" style={styles.headerBlur}>
                                        <Ionicons name="close-outline" size={24} color={COLORS.white} />
                                    </BlurView>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {isAiCoachActive ? (
                        <View style={styles.cameraModePanel}>
                            <BlurView intensity={70} tint="dark" style={[styles.cameraModeCard, { borderColor: getPostureColor() }]}>
                                <View style={styles.cameraModeTopRow}>
                                    <View style={styles.cameraModeTitleBlock}>
                                        <Text style={styles.poseFormEyebrow}>POSEFORM VIDEO ANALYSIS</Text>
                                        <Text style={styles.cameraExerciseName} numberOfLines={1}>{currentEx.name}</Text>
                                        <Text style={styles.cameraModeSub}>
                                            Record {targetReps ? `${targetReps} target reps` : 'the full set'} in one video
                                        </Text>
                                    </View>
                                    <View style={[styles.cameraScoreRing, { borderColor: getPostureColor() }]}>
                                        <Text
                                            style={[
                                                styles.cameraScoreValue,
                                                aiVideoRecording && styles.cameraScoreValueSmall,
                                                { color: getPostureColor() },
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {poseHeaderBadgeValue}
                                        </Text>
                                        <Text style={styles.cameraScoreLabel}>SET</Text>
                                    </View>
                                </View>

                                <View style={styles.cameraFeedbackRow}>
                                    <Ionicons
                                        name={postureState === 'CORRECT' ? 'checkmark-circle' : postureState === 'INCORRECT' ? 'alert-circle' : 'scan-outline'}
                                        size={20}
                                        color={getPostureColor()}
                                    />
                                    <Text style={[styles.cameraFeedbackText, { color: getPostureColor() }]} numberOfLines={2}>{aiFeedbackText}</Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.backToExerciseListBtn, (aiVideoRecording || aiVideoUploading) && styles.videoAnalysisBtnDisabled]}
                                    onPress={returnToExerciseList}
                                    disabled={aiVideoRecording || aiVideoUploading}
                                >
                                    <Ionicons name="list-outline" size={16} color="#BAE6FD" />
                                    <Text style={styles.backToExerciseListText}>Back To Exercise List</Text>
                                </TouchableOpacity>

                                {!!poseFormTutorial && (
                                    <TouchableOpacity
                                        style={styles.tutorialStrip}
                                        onPress={openExerciseTutorial}
                                        disabled={aiVideoUploading}
                                    >
                                        <View style={styles.tutorialIconBox}>
                                            <Ionicons name="logo-youtube" size={18} color="#F87171" />
                                        </View>
                                        <View style={styles.tutorialTextBlock}>
                                            <Text style={styles.tutorialTitle} numberOfLines={1}>Watch Technique First</Text>
                                            <Text style={styles.tutorialMeta} numberOfLines={1}>
                                                {poseFormTutorialApproved ? 'Expert Approved' : 'Pending Expert Review'} • {poseFormTutorial.bestAngle}
                                            </Text>
                                        </View>
                                        <Ionicons name="open-outline" size={17} color="#E2E8F0" />
                                    </TouchableOpacity>
                                )}

                                <View style={styles.videoAnalysisPanel}>
                                    <View style={styles.videoActionRow}>
                                        <TouchableOpacity
                                            style={[
                                                styles.videoAnalysisBtn,
                                                aiVideoRecording && styles.videoAnalysisBtnRecording,
                                                aiVideoUploading && styles.videoAnalysisBtnDisabled,
                                            ]}
                                            onPress={toggleAiVideoRecording}
                                            disabled={aiVideoUploading}
                                        >
                                            <Ionicons
                                                name={aiVideoRecording ? 'stop-circle' : 'radio-button-on'}
                                                size={16}
                                                color={COLORS.white}
                                            />
                                            <Text style={styles.videoAnalysisBtnText}>
                                                {aiVideoRecording ? 'Stop & Analyze' : aiVideoUploading ? 'Analyzing...' : 'Start Recording'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.videoAnalysisBtn,
                                                styles.videoAttachBtn,
                                                (aiVideoRecording || aiVideoUploading) && styles.videoAnalysisBtnDisabled,
                                            ]}
                                            onPress={pickExerciseVideo}
                                            disabled={aiVideoRecording || aiVideoUploading}
                                        >
                                            <Ionicons name="cloud-upload-outline" size={16} color={COLORS.white} />
                                            <Text style={styles.videoAnalysisBtnText}>Upload Video</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.poseStatusCard}>
                                        <View style={styles.poseStatusHeader}>
                                            <View style={styles.poseStatusTitleBlock}>
                                                <Text style={styles.poseStatusTitle}>{poseFormResultTitle}</Text>
                                                <Text style={styles.poseStatusSub}>{poseFormResultSubtitle}</Text>
                                            </View>
                                            <View style={[styles.poseStatusIcon, { backgroundColor: getPostureColor() + '22' }]}>
                                                <Ionicons
                                                    name={aiVideoResult?.success ? 'checkmark-circle' : aiVideoUploading ? 'sync-outline' : aiVideoRecording ? 'radio-button-on' : 'videocam-outline'}
                                                    size={18}
                                                    color={getPostureColor()}
                                                />
                                            </View>
                                        </View>

                                        <Text style={styles.videoAnalysisStatus} numberOfLines={3}>{aiVideoStatus}</Text>

                                        {aiVideoResult?.success ? (
                                            <View style={styles.poseResultGrid}>
                                                <View style={styles.poseResultBox}>
                                                    <Text style={styles.poseResultValue}>{aiVideoResult.reps || 0}{targetReps ? ` / ${targetReps}` : ''}</Text>
                                                    <Text style={styles.poseResultLabel}>Reps</Text>
                                                </View>
                                                <View style={styles.poseResultBox}>
                                                    <Text style={styles.poseResultValue}>{aiVideoResult.form_score || 0}%</Text>
                                                    <Text style={styles.poseResultLabel}>Form</Text>
                                                </View>
                                                <View style={styles.poseResultBox}>
                                                    <Text style={styles.poseResultValue}>{poseFormQuality}</Text>
                                                    <Text style={styles.poseResultLabel}>Quality</Text>
                                                </View>
                                            </View>
                                        ) : (
                                            <Text style={styles.videoAnalysisHint}>
                                                Keep the working joints visible and stop only after the full set.
                                            </Text>
                                        )}

                                        {aiVideoResult?.success && (
                                            <View style={styles.poseAnalysisDetails}>
                                                <Text style={styles.poseAnalysisDetailText}>Duration {poseFormDurationLabel}</Text>
                                                <Text style={styles.poseAnalysisDetailDot}>|</Text>
                                                <Text style={styles.poseAnalysisDetailText}>{aiVideoResult?.valid_frames ?? 0} usable frames</Text>
                                                <Text style={styles.poseAnalysisDetailDot}>|</Text>
                                                <Text style={styles.poseAnalysisDetailText}>{aiVideoResult.rep_reliability ?? aiVideoResult.confidence ?? 0}% confidence</Text>
                                            </View>
                                        )}

                                        {aiVideoResult?.success && (!!videoFeedbackItems.length || !!videoMistakeItems.length) && (
                                            <View style={styles.poseNotesBox}>
                                                <Text style={styles.poseNotesTitle}>Coaching Notes</Text>
                                                {videoFeedbackItems.slice(0, 2).map((item, index) => (
                                                    <View key={`feedback-${index}`} style={styles.poseNoteRow}>
                                                        <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                                                        <Text style={styles.poseNoteText}>{item}</Text>
                                                    </View>
                                                ))}
                                                {videoMistakeItems.slice(0, 2).map((item, index) => (
                                                    <View key={`mistake-${index}`} style={styles.poseNoteRow}>
                                                        <Ionicons name="alert-circle-outline" size={14} color="#F59E0B" />
                                                        <Text style={styles.poseNoteText}>Needs work: {item}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {shouldShowTutorialNudge && (
                                            <TouchableOpacity style={styles.poseTutorialNudge} onPress={openExerciseTutorial}>
                                                <Ionicons name="school-outline" size={15} color="#FBBF24" />
                                                <View style={styles.poseTutorialNudgeTextBlock}>
                                                    <Text style={styles.poseTutorialNudgeTitle}>Improve This Set</Text>
                                                    <Text style={styles.poseTutorialNudgeText} numberOfLines={2}>
                                                        Review {poseFormTutorial.title} for {poseFormTutorial.focus.toLowerCase()}.
                                                    </Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={16} color="#FDE68A" />
                                            </TouchableOpacity>
                                        )}

                                        {aiVideoResult?.needs_setup && (
                                            <View style={styles.poseNotesBox}>
                                                <Text style={styles.poseNotesTitle}>Backend Setup</Text>
                                                <View style={styles.poseNoteRow}>
                                                    <Ionicons name="alert-circle-outline" size={14} color="#F59E0B" />
                                                    <Text style={styles.poseNoteText}>Run npm run setup:exercise-video-ai, then retry.</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>

                                    {aiVideoResult && (
                                        <View style={styles.poseResultActions}>
                                            <TouchableOpacity
                                                style={styles.poseSecondaryBtn}
                                                onPress={clearPoseFormResult}
                                                disabled={aiVideoRecording || aiVideoUploading}
                                            >
                                                <Ionicons name="refresh-outline" size={15} color="#BAE6FD" />
                                                <Text style={styles.poseSecondaryText}>Retake</Text>
                                            </TouchableOpacity>
                                            {aiVideoResult.success && (
                                                <TouchableOpacity
                                                    style={[styles.posePrimaryBtn, !poseFormTargetReached && styles.posePrimaryBtnSoft]}
                                                    onPress={() => handleToggleExercise(currentEx.id)}
                                                    disabled={aiVideoRecording || aiVideoUploading}
                                                >
                                                    <Ionicons name="checkmark-done-outline" size={15} color={COLORS.white} />
                                                    <Text style={styles.posePrimaryText}>
                                                        {poseFormTargetReached ? 'Mark Complete' : 'Accept Result'}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </BlurView>
                        </View>
                    ) : (
                        <ScrollView ref={workoutScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollHUD}>
                            <GlassCard style={styles.currentExerciseCard}>
                                <View style={styles.focusHeader}>
                                    <View style={styles.exerciseIndexPill}>
                                        <Text style={styles.exerciseIndexText}>EXERCISE {completedCount + 1} OF {totalExercises}</Text>
                                    </View>
                                    <View style={styles.kcalBadge}>
                                        <Ionicons name="flame" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                                        <Text style={styles.kcalText}>{currentEx.kcal || Math.round(activeWorkout.kcal / totalExercises)} kcal</Text>
                                    </View>
                                </View>

                                <Text style={styles.exerciseNameText}>{currentEx.name}</Text>
                                {!!currentEx.guide && (
                                    <Text style={styles.exerciseGuideText} numberOfLines={3}>{currentEx.guide}</Text>
                                )}

                                <View style={styles.metricsSplitGrid}>
                                    <View style={styles.splitMetricBox}>
                                        <Text style={styles.splitMetricValue}>{currentEx.sets || '3'}</Text>
                                        <Text style={styles.splitMetricLabel}>SETS TARGET</Text>
                                    </View>
                                    <View style={styles.splitMetricDivider} />
                                    <View style={styles.splitMetricBox}>
                                        <Text style={styles.splitMetricValue}>{currentEx.reps || '12'}</Text>
                                        <Text style={styles.splitMetricLabel}>REPS TARGET</Text>
                                    </View>
                                    <View style={styles.splitMetricDivider} />
                                    <View style={styles.splitMetricBox}>
                                        <Text style={styles.splitMetricValue}>{currentEx.rest || '30s'}</Text>
                                        <Text style={styles.splitMetricLabel}>EST. REST</Text>
                                    </View>
                                </View>

                                <View style={styles.posePrepPanel}>
                                    <View style={styles.posePrepItem}>
                                        <Ionicons name="phone-portrait-outline" size={15} color="#38BDF8" />
                                        <View style={styles.posePrepTextBlock}>
                                            <Text style={styles.posePrepLabel}>BEST ANGLE</Text>
                                            <Text style={styles.posePrepValue}>{poseFormSetup.angle}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.posePrepItem}>
                                        <Ionicons name="scan-outline" size={15} color="#38BDF8" />
                                        <View style={styles.posePrepTextBlock}>
                                            <Text style={styles.posePrepLabel}>FRAME</Text>
                                            <Text style={styles.posePrepValue}>{poseFormSetup.frame}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.posePrepItem}>
                                        <Ionicons name="fitness-outline" size={15} color="#38BDF8" />
                                        <View style={styles.posePrepTextBlock}>
                                            <Text style={styles.posePrepLabel}>TIP</Text>
                                            <Text style={styles.posePrepValue}>{poseFormSetup.tip}</Text>
                                        </View>
                                    </View>
                                </View>

                                {!!poseFormTutorial && (
                                    <TouchableOpacity style={styles.prePoseTutorialCard} onPress={openExerciseTutorial}>
                                        <View style={styles.prePoseTutorialLeft}>
                                            <View style={styles.prePoseTutorialIcon}>
                                                <Ionicons name="logo-youtube" size={18} color="#F87171" />
                                            </View>
                                            <View style={styles.prePoseTutorialText}>
                                                <Text style={styles.prePoseTutorialTitle}>Technique Tutorial</Text>
                                                <Text style={styles.prePoseTutorialMeta} numberOfLines={1}>
                                                    {poseFormTutorialApproved ? 'Expert Approved' : 'Pending Expert Review'} • {poseFormTutorial.channel}
                                                </Text>
                                            </View>
                                        </View>
                                        <Ionicons name="open-outline" size={18} color="#E2E8F0" />
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={styles.openVideoAiBtn}
                                    onPress={toggleAiCoach}
                                >
                                    <LinearGradient
                                        colors={['#10B981', '#059669']}
                                        style={styles.openVideoAiGrad}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Ionicons name="videocam" size={20} color={COLORS.white} />
                                        <View style={styles.openVideoAiTextBlock}>
                                            <Text style={styles.openVideoAiText}>OPEN POSEFORM</Text>
                                            <Text style={styles.openVideoAiSub}>Record or upload a full-set video</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.manualCompleteBtn}
                                    onPress={() => handleToggleExercise(currentEx.id)}
                                >
                                    <Ionicons name="checkmark-done-outline" size={18} color="#94A3B8" />
                                    <Text style={styles.manualCompleteText}>MARK DONE MANUALLY</Text>
                                </TouchableOpacity>
                            </GlassCard>

                            <View style={styles.workoutProgressSection}>
                                <View style={styles.progressHeaderRow}>
                                    <Text style={styles.progressTitleText}>SESSION PROGRESS</Text>
                                    <Text style={styles.progressPercentText}>{Math.round(progressPercent)}%</Text>
                                </View>
                                <View style={styles.progressBarWrapper}>
                                    <View style={[styles.progressBarFilled, { width: `${progressPercent}%` }]} />
                                </View>
                                <View style={styles.sessionStatsRow}>
                                    <View style={styles.sessionStatPill}>
                                        <Ionicons name="time-outline" size={13} color="#94A3B8" />
                                        <View style={styles.sessionStatTextBlock}>
                                            <Text style={styles.sessionStatText}>{formatTime(workoutSeconds)}</Text>
                                            <Text style={styles.sessionStatLabel}>SESSION TIME</Text>
                                        </View>
                                    </View>
                                    <View style={styles.sessionStatPill}>
                                        <Ionicons name="flame-outline" size={13} color="#EF4444" />
                                        <View style={styles.sessionStatTextBlock}>
                                            <Text style={styles.sessionStatText}>{activeWorkout.kcal} kcal</Text>
                                            <Text style={styles.sessionStatLabel}>TARGET BURN</Text>
                                        </View>
                                    </View>
                                    <View style={styles.sessionStatPill}>
                                        <Ionicons name="ribbon-outline" size={13} color="#F59E0B" />
                                        <View style={styles.sessionStatTextBlock}>
                                            <Text style={styles.sessionStatText}>+250 XP</Text>
                                            <Text style={styles.sessionStatLabel}>REWARD</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.exerciseQueueSection}>
                                <View style={styles.exerciseQueueHeader}>
                                    <Text style={styles.exerciseQueueTitle}>EXERCISE LIST</Text>
                                    <Text style={styles.exerciseQueueCount}>{completedCount}/{totalExercises}</Text>
                                </View>
                                {activeWorkout.exercises.map((exercise, index) => {
                                    const isCompleted = completedExerciseIds.includes(exercise.id);
                                    const isCurrent = currentEx?.id === exercise.id && !isCompleted;
                                    const tutorial = getExerciseTutorial(exercise.name);
                                    const tutorialReview = tutorial ? exerciseTutorialReviews[tutorial.id] : null;
                                    const tutorialApproved = tutorialReview?.status === 'approved';

                                    return (
                                        <View
                                            key={exercise.id || `${exercise.name}-${index}`}
                                            style={[
                                                styles.exerciseQueueItem,
                                                isCurrent && styles.exerciseQueueItemCurrent,
                                                isCompleted && styles.exerciseQueueItemDone,
                                            ]}
                                        >
                                            <View style={[styles.exerciseQueueIndex, isCurrent && styles.exerciseQueueIndexCurrent, isCompleted && styles.exerciseQueueIndexDone]}>
                                                {isCompleted ? (
                                                    <Ionicons name="checkmark" size={14} color={COLORS.white} />
                                                ) : (
                                                    <Text style={[styles.exerciseQueueIndexText, isCurrent && styles.exerciseQueueIndexTextActive]}>
                                                        {index + 1}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={styles.exerciseQueueInfo}>
                                                <Text style={styles.exerciseQueueName} numberOfLines={1}>{exercise.name}</Text>
                                                <Text style={styles.exerciseQueueMeta} numberOfLines={1}>
                                                    {exercise.sets || '3'} sets - {String(exercise.reps || '12').replace(/\s*reps?$/i, '')} reps - {tutorialApproved ? 'Expert Approved' : 'Tutorial Pending'}
                                                </Text>
                                            </View>
                                            {isCurrent && (
                                                <TouchableOpacity style={styles.exerciseQueuePoseBtn} onPress={toggleAiCoach}>
                                                    <Ionicons name="videocam-outline" size={15} color={COLORS.white} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    )}

                    {/* FLOATING ACTION CONTROL BAR */}
                    <View style={styles.floatingControlsPanel}>
                        <BlurView intensity={70} tint="dark" style={styles.controlsBlurWrapper}>
                            {/* Pause / Resume Button */}
                            <TouchableOpacity onPress={() => setIsPaused(!isPaused)} style={styles.controlActionCircleMain}>
                                <LinearGradient
                                    colors={isPaused ? ['#3B82F6', '#1E40AF'] : ['#10B981', '#047857']}
                                    style={styles.mainControlActionGrad}
                                >
                                    <Ionicons name={isPaused ? "play" : "pause"} size={26} color={COLORS.white} />
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Skip Exercise */}
                            <TouchableOpacity onPress={handleSkipExercise} style={styles.controlActionCircle}>
                                <Ionicons name="play-skip-forward-outline" size={22} color={COLORS.white} />
                            </TouchableOpacity>

                            {/* Complete Entire Workout */}
                            <TouchableOpacity onPress={handleFinish} style={styles.controlActionCircleEnd}>
                                <Ionicons name="stop-circle" size={22} color="#EF4444" />
                            </TouchableOpacity>
                        </BlurView>
                    </View>
                </SafeAreaView>
            )}

            {/* REST INTERVAL INTERMISSION STATE */}
            {screenState === 'REST' && (
                <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={styles.restCardContainer}>
                        <Text style={styles.restHeading}>REST & RECOVER</Text>
                        
                        {/* Circular Rest countdown */}
                        <View style={styles.restCircularBox}>
                            <Svg height="140" width="140">
                                <Circle cx="70" cy="70" r="60" stroke="#1E293B" strokeWidth="6" fill="transparent" />
                                <Circle cx="70" cy="70" r="60" stroke="#10B981" strokeWidth="6" fill="transparent" strokeDasharray="376.8" strokeDashoffset={376.8 - (376.8 * restSeconds) / 25} />
                            </Svg>
                            <View style={styles.restTimerTextContent}>
                                <Text style={styles.restSecondsText}>{restSeconds}</Text>
                                <Text style={styles.restSecLabel}>SECONDS</Text>
                            </View>
                        </View>

                        {/* Motivation Box */}
                        <View style={styles.motivationSpeechBubble}>
                            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#10B981" style={{ marginBottom: 8 }} />
                            <Text style={styles.motivationText}>"{activeMotivationalQuote}"</Text>
                        </View>

                        {/* Next Exercise Preview */}
                        <View style={styles.nextPreviewBox}>
                            <Text style={styles.nextPreviewLabel}>UP NEXT</Text>
                            <Text style={styles.nextPreviewName}>{currentEx.name}</Text>
                            <Text style={styles.nextPreviewStats}>{currentEx.sets} Sets • {String(currentEx.reps || '12').replace(/\s*reps?$/i, '')} Reps</Text>
                        </View>

                        {/* Skip rest Button */}
                        <TouchableOpacity
                            style={styles.skipRestBtn}
                            onPress={() => {
                                clearInterval(restTimerRef.current);
                                setScreenState('ACTIVE');
                                startWorkoutTimer();
                            }}
                        >
                            <Text style={styles.skipRestBtnText}>SKIP REST</Text>
                            <Ionicons name="play-forward" size={16} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            )}

            {/* FINAL WORKOUT SUMMARY OVERLAY */}
            {screenState === 'SUMMARY' && (
                <View style={styles.fullscreenSummaryContainer}>
                    <SafeAreaView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
                        
                        <AnimatedCard delay={100} style={styles.summaryGlassCard}>
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.summaryTrophyBox}
                            >
                                <Ionicons name="trophy-outline" size={54} color={COLORS.white} />
                            </LinearGradient>

                            <Text style={styles.summaryHeading}>SESSION COMPLETED!</Text>
                            <Text style={styles.summarySubtitle}>Fantastic job. Here is your PoseForm performance breakdown.</Text>

                            {/* Form Score Ring */}
                            <View style={styles.scoreContainer}>
                                <Text style={styles.scoreNumber}>{aiFormScore || 0}%</Text>
                                <Text style={styles.scoreLabel}>POSEFORM SCORE</Text>
                                <View style={styles.scoreTierBadge}>
                                    <Ionicons name="ribbon" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                                    <Text style={styles.scoreTierText}>{aiFormScore >= 86 ? 'ELITE FORM' : aiFormScore >= 70 ? 'GOOD FORM' : 'NEEDS WORK'}</Text>
                                </View>
                            </View>

                            {/* Summary Metrics list */}
                            <View style={styles.summaryMetricsRow}>
                                <View style={styles.summaryMetricItem}>
                                    <Text style={styles.summaryMetricVal}>{formatTime(workoutSeconds)}</Text>
                                    <Text style={styles.summaryMetricLab}>TOTAL TIME</Text>
                                </View>
                                <View style={styles.summaryDividerLine} />
                                <View style={styles.summaryMetricItem}>
                                    <Text style={styles.summaryMetricVal}>{activeWorkout.kcal}</Text>
                                    <Text style={styles.summaryMetricLab}>KCAL BURNED</Text>
                                </View>
                                <View style={styles.summaryDividerLine} />
                                <View style={styles.summaryMetricItem}>
                                    <Text style={styles.summaryMetricVal}>{aiRepCount}</Text>
                                    <Text style={styles.summaryMetricLab}>POSEFORM REPS</Text>
                                </View>
                            </View>

                            <View style={styles.xpRewardBox}>
                                <Ionicons name="sparkles" size={18} color="#F59E0B" />
                                <Text style={styles.xpRewardText}>CLAIM +200 XP REWARD</Text>
                            </View>

                            {/* Complete Action Button */}
                            <TouchableOpacity
                                style={styles.claimSummaryBtn}
                                onPress={handleConfirmFinish}
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.claimSummaryGrad}
                                >
                                    <Text style={styles.claimSummaryBtnText}>COMPLETE SESSION</Text>
                                    <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </AnimatedCard>
                    </SafeAreaView>
                </View>
            )}

            {/* PAUSE OVERLAY WINDOW */}
            {isPaused && screenState === 'ACTIVE' && (
                <View style={styles.pausedOverlay}>
                    <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.pausedContent}>
                        <Ionicons name="pause-circle" size={80} color="#3B82F6" style={{ marginBottom: 20 }} />
                        <Text style={styles.pausedTitle}>WORKOUT PAUSED</Text>
                        <Text style={styles.pausedSubtitle}>Breathing is key. Resume when you're ready to push form limits.</Text>
                        
                        <TouchableOpacity
                            style={styles.resumeWorkoutBtn}
                            onPress={() => setIsPaused(false)}
                        >
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.resumeWorkoutGrad}
                            >
                                <Ionicons name="play" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                                <Text style={styles.resumeWorkoutBtnText}>RESUME SESSION</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050814',
    },
    fullscreenOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#050814',
        padding: 30
    },
    countdownBox: {
        alignItems: 'center',
    },
    countdownTitle: {
        fontSize: 16,
        color: '#10B981',
        fontWeight: '900',
        letterSpacing: 4,
        marginBottom: 10
    },
    countdownNumber: {
        fontSize: 120,
        fontWeight: '900',
        color: COLORS.white,
    },
    countdownSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        zIndex: 100
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 15,
        overflow: 'hidden',
    },
    headerActions: {
        minWidth: 44,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
    },
    headerBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTitleBox: {
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 10
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        marginBottom: 4
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6
    },
    statusBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1
    },
    headerWorkoutTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.white,
    },
    recordingFrameGuide: {
        position: 'absolute',
        left: 26,
        right: 26,
        top: Platform.OS === 'ios' ? 112 : 96,
        bottom: 330,
        borderWidth: 1.5,
        borderColor: 'rgba(56,189,248,0.72)',
        borderRadius: 18,
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 12,
    },
    recordingCorner: {
        position: 'absolute',
        top: -1.5,
        left: -1.5,
        width: 48,
        height: 48,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderColor: '#38BDF8',
        borderTopLeftRadius: 18,
    },
    recordingFrameText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#E0F2FE',
        backgroundColor: 'rgba(15,23,42,0.68)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    cameraModePanel: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: Platform.OS === 'ios' ? 136 : 122,
        zIndex: 60,
    },
    cameraModeCard: {
        borderWidth: 1.5,
        borderRadius: 22,
        padding: 14,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        overflow: 'hidden',
    },
    cameraModeTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    cameraModeTitleBlock: {
        flex: 1,
    },
    cameraExerciseName: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.white,
        marginTop: 3,
    },
    cameraModeSub: {
        fontSize: 9,
        fontWeight: '900',
        color: '#94A3B8',
        marginTop: 3,
    },
    cameraScoreRing: {
        width: 58,
        height: 58,
        borderRadius: 29,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    cameraScoreValue: {
        fontSize: 17,
        fontWeight: '900',
    },
    cameraScoreValueSmall: {
        fontSize: 12,
    },
    cameraScoreLabel: {
        fontSize: 7,
        fontWeight: '900',
        color: '#94A3B8',
    },
    cameraFeedbackRow: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginTop: 12,
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.055)',
    },
    cameraFeedbackText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '800',
    },
    backToExerciseListBtn: {
        marginTop: 10,
        minHeight: 38,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(186,230,253,0.24)',
        backgroundColor: 'rgba(15,23,42,0.42)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
    },
    backToExerciseListText: {
        color: '#BAE6FD',
        fontSize: 10,
        fontWeight: '900',
    },
    tutorialStrip: {
        marginTop: 10,
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.25)',
        backgroundColor: 'rgba(127,29,29,0.18)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        gap: 10,
    },
    tutorialIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    tutorialTextBlock: {
        flex: 1,
    },
    tutorialTitle: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: '900',
    },
    tutorialMeta: {
        color: '#FECACA',
        fontSize: 9,
        fontWeight: '700',
        marginTop: 3,
    },
    videoAnalysisPanel: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.10)',
    },
    videoActionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    videoAnalysisBtn: {
        flex: 1,
        minHeight: 36,
        borderRadius: 11,
        backgroundColor: 'rgba(16,185,129,0.20)',
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.42)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
    },
    videoAnalysisBtnRecording: {
        backgroundColor: 'rgba(239,68,68,0.22)',
        borderColor: 'rgba(239,68,68,0.50)',
    },
    videoAttachBtn: {
        backgroundColor: 'rgba(56,189,248,0.16)',
        borderColor: 'rgba(56,189,248,0.36)',
    },
    videoAnalysisBtnDisabled: {
        opacity: 0.72,
    },
    videoAnalysisBtnText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '900',
    },
    poseStatusCard: {
        marginTop: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        backgroundColor: 'rgba(255,255,255,0.045)',
        padding: 11,
    },
    poseStatusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    poseStatusTitleBlock: {
        flex: 1,
    },
    poseStatusTitle: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '900',
    },
    poseStatusSub: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '700',
        lineHeight: 14,
        marginTop: 2,
    },
    poseStatusIcon: {
        width: 34,
        height: 34,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoAnalysisStatus: {
        color: '#CBD5E1',
        fontSize: 10,
        lineHeight: 14,
        fontWeight: '800',
    },
    videoAnalysisHint: {
        marginTop: 2,
        color: '#94A3B8',
        fontSize: 9,
        lineHeight: 13,
        fontWeight: '700',
    },
    poseResultGrid: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    poseResultBox: {
        flex: 1,
        minHeight: 54,
        borderRadius: 13,
        backgroundColor: 'rgba(15,23,42,0.45)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    poseResultValue: {
        color: '#E0F2FE',
        fontSize: 15,
        fontWeight: '900',
    },
    poseResultLabel: {
        color: '#94A3B8',
        fontSize: 7,
        fontWeight: '900',
        marginTop: 3,
        textAlign: 'center',
    },
    poseAnalysisDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginTop: 9,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    poseAnalysisDetailText: {
        color: '#94A3B8',
        fontSize: 8,
        fontWeight: '800',
    },
    poseAnalysisDetailDot: {
        color: '#475569',
        fontSize: 8,
        fontWeight: '900',
    },
    poseNotesBox: {
        marginTop: 10,
        padding: 11,
        borderRadius: 14,
        backgroundColor: 'rgba(15,23,42,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.18)',
        gap: 8,
    },
    poseNotesTitle: {
        fontSize: 9,
        fontWeight: '900',
        color: '#E2E8F0',
        letterSpacing: 1,
    },
    poseNoteRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 7,
    },
    poseNoteText: {
        flex: 1,
        fontSize: 10,
        fontWeight: '700',
        color: '#CBD5E1',
        lineHeight: 15,
    },
    poseTutorialNudge: {
        marginTop: 10,
        minHeight: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.28)',
        backgroundColor: 'rgba(120,53,15,0.22)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        gap: 9,
    },
    poseTutorialNudgeTextBlock: {
        flex: 1,
    },
    poseTutorialNudgeTitle: {
        color: '#FEF3C7',
        fontSize: 10,
        fontWeight: '900',
    },
    poseTutorialNudgeText: {
        color: '#FDE68A',
        fontSize: 9,
        lineHeight: 13,
        fontWeight: '700',
        marginTop: 2,
    },
    poseResultActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 9,
    },
    poseSecondaryBtn: {
        flex: 1,
        minHeight: 36,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: 'rgba(186,230,253,0.28)',
        backgroundColor: 'rgba(255,255,255,0.045)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    poseSecondaryText: {
        color: '#BAE6FD',
        fontSize: 10,
        fontWeight: '900',
    },
    posePrimaryBtn: {
        flex: 1.25,
        minHeight: 36,
        borderRadius: 11,
        backgroundColor: '#10B981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    posePrimaryBtnSoft: {
        backgroundColor: 'rgba(16,185,129,0.55)',
    },
    posePrimaryText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '900',
    },
    videoDetailsBox: {
        marginTop: 8,
        padding: 9,
        borderRadius: 10,
        backgroundColor: 'rgba(56,189,248,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(56,189,248,0.22)',
    },
    videoDetailText: {
        color: '#DFF6FF',
        fontSize: 10,
        lineHeight: 14,
        fontWeight: '700',
    },
    videoMistakeBox: {
        marginTop: 7,
        padding: 9,
        borderRadius: 10,
        backgroundColor: 'rgba(239,68,68,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.25)',
    },
    videoMistakeText: {
        color: '#FCA5A5',
        fontSize: 10,
        lineHeight: 14,
        fontWeight: '800',
    },
    scrollHUD: {
        paddingBottom: 140,
        paddingHorizontal: 20,
    },
    currentExerciseCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 24,
        padding: 18,
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 5
    },
    focusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    exerciseIndexPill: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8
    },
    exerciseIndexText: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '900',
        letterSpacing: 1
    },
    kcalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8
    },
    kcalText: {
        fontSize: 11,
        color: '#EF4444',
        fontWeight: '800',
    },
    exerciseNameText: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.white,
        marginBottom: 8
    },
    exerciseGuideText: {
        fontSize: 12,
        lineHeight: 17,
        color: '#94A3B8',
        fontWeight: '700',
        marginBottom: 14
    },
    metricsSplitGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingHorizontal: 4,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.035)'
    },
    splitMetricBox: {
        alignItems: 'center',
        flex: 1
    },
    splitMetricValue: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.white,
    },
    splitMetricLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748B',
        marginTop: 4,
        letterSpacing: 0.8
    },
    splitMetricDivider: {
        width: 1.5,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.08)'
    },
    posePrepPanel: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    posePrepItem: {
        flex: 1,
        minHeight: 54,
        borderRadius: 14,
        backgroundColor: 'rgba(56,189,248,0.09)',
        borderWidth: 1,
        borderColor: 'rgba(56,189,248,0.18)',
        paddingHorizontal: 8,
        paddingVertical: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    posePrepTextBlock: {
        alignItems: 'center',
        marginTop: 4,
    },
    posePrepLabel: {
        color: '#7DD3FC',
        fontSize: 7,
        fontWeight: '900',
    },
    posePrepValue: {
        color: COLORS.white,
        fontSize: 9,
        fontWeight: '900',
        textAlign: 'center',
        marginTop: 2,
    },
    prePoseTutorialCard: {
        minHeight: 54,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.24)',
        backgroundColor: 'rgba(127,29,29,0.16)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        marginBottom: 10,
    },
    prePoseTutorialLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingRight: 8,
    },
    prePoseTutorialIcon: {
        width: 34,
        height: 34,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    prePoseTutorialText: {
        flex: 1,
    },
    prePoseTutorialTitle: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: '900',
    },
    prePoseTutorialMeta: {
        color: '#FECACA',
        fontSize: 9,
        fontWeight: '700',
        marginTop: 3,
    },
    openVideoAiBtn: {
        minHeight: 58,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 10,
    },
    openVideoAiGrad: {
        minHeight: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        gap: 12,
    },
    openVideoAiTextBlock: {
        flex: 1,
    },
    openVideoAiText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    openVideoAiSub: {
        color: '#BAE6FD',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 3,
    },
    poseFormEyebrow: {
        fontSize: 9,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 1.2
    },
    manualCompleteBtn: {
        minHeight: 44,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.20)',
        backgroundColor: 'rgba(255,255,255,0.035)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    manualCompleteText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#CBD5E1',
    },
    workoutProgressSection: {
        marginTop: 14,
        paddingHorizontal: 5,
        paddingBottom: 8
    },
    progressHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8
    },
    progressTitleText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1
    },
    progressPercentText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#10B981'
    },
    progressBarWrapper: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBarFilled: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 3
    },
    sessionStatsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12
    },
    sessionStatPill: {
        flex: 1,
        minHeight: 42,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.045)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5
    },
    sessionStatTextBlock: {
        alignItems: 'center',
    },
    sessionStatText: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.white
    },
    sessionStatLabel: {
        marginTop: 2,
        fontSize: 6,
        fontWeight: '900',
        color: '#64748B',
    },
    exerciseQueueSection: {
        marginTop: 16,
        paddingBottom: 12,
    },
    exerciseQueueHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    exerciseQueueTitle: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    exerciseQueueCount: {
        color: '#10B981',
        fontSize: 11,
        fontWeight: '900',
    },
    exerciseQueueItem: {
        minHeight: 58,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.14)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 8,
        gap: 10,
    },
    exerciseQueueItemCurrent: {
        borderColor: 'rgba(16,185,129,0.44)',
        backgroundColor: 'rgba(16,185,129,0.10)',
    },
    exerciseQueueItemDone: {
        opacity: 0.74,
    },
    exerciseQueueIndex: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: 'rgba(148,163,184,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseQueueIndexCurrent: {
        backgroundColor: '#10B981',
    },
    exerciseQueueIndexDone: {
        backgroundColor: '#334155',
    },
    exerciseQueueIndexText: {
        color: '#CBD5E1',
        fontSize: 11,
        fontWeight: '900',
    },
    exerciseQueueIndexTextActive: {
        color: COLORS.white,
    },
    exerciseQueueInfo: {
        flex: 1,
    },
    exerciseQueueName: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '900',
    },
    exerciseQueueMeta: {
        color: '#94A3B8',
        fontSize: 9,
        fontWeight: '700',
        marginTop: 4,
    },
    exerciseQueuePoseBtn: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingControlsPanel: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 40 : 25,
        left: 20,
        right: 20,
        height: 80,
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15
    },
    controlsBlurWrapper: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        paddingHorizontal: 15
    },
    controlActionCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlActionCircleEnd: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlActionCircleMain: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
    },
    mainControlActionGrad: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    restCardContainer: {
        width: width * 0.88,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1.5,
        borderRadius: 35,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.35,
        shadowRadius: 25,
        elevation: 8
    },
    restHeading: {
        fontSize: 16,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 4,
        marginBottom: 25
    },
    restCircularBox: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 30
    },
    restTimerTextContent: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center'
    },
    restSecondsText: {
        fontSize: 38,
        fontWeight: '900',
        color: COLORS.white,
    },
    restSecLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1.5,
        marginTop: 2
    },
    motivationSpeechBubble: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        marginBottom: 30,
        width: '100%'
    },
    motivationText: {
        fontSize: 13,
        color: '#94A3B8',
        fontStyle: 'italic',
        textAlign: 'center',
        lineHeight: 20,
    },
    nextPreviewBox: {
        alignItems: 'center',
        marginBottom: 35
    },
    nextPreviewLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 2,
        marginBottom: 6
    },
    nextPreviewName: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.white,
    },
    nextPreviewStats: {
        fontSize: 13,
        color: '#10B981',
        fontWeight: '700',
        marginTop: 4
    },
    skipRestBtn: {
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 30
    },
    skipRestBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.white,
        letterSpacing: 1
    },
    fullscreenSummaryContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#050814',
    },
    summaryGlassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 40,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 10
    },
    summaryTrophyBox: {
        width: 100,
        height: 100,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
    },
    summaryHeading: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.5
    },
    summarySubtitle: {
        textAlign: 'center',
        fontSize: 13,
        color: '#64748B',
        marginTop: 8,
        marginBottom: 30,
        lineHeight: 20,
    },
    scoreContainer: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderRadius: 24,
        paddingVertical: 15,
        paddingHorizontal: 30,
        width: '100%',
        marginBottom: 30
    },
    scoreNumber: {
        fontSize: 48,
        fontWeight: '900',
        color: '#10B981',
    },
    scoreLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1.5,
        marginVertical: 4
    },
    scoreTierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    scoreTierText: {
        fontSize: 8,
        fontWeight: '900',
        color: COLORS.white,
    },
    summaryMetricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        width: '100%',
        marginBottom: 30
    },
    summaryMetricItem: {
        alignItems: 'center'
    },
    summaryMetricVal: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.white,
    },
    summaryMetricLab: {
        fontSize: 8,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 0.8,
        marginTop: 4
    },
    summaryDividerLine: {
        width: 1,
        height: 35,
        backgroundColor: 'rgba(255,255,255,0.08)'
    },
    xpRewardBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 35,
        gap: 6
    },
    xpRewardText: {
        fontSize: 11,
        color: '#F59E0B',
        fontWeight: '900',
        letterSpacing: 0.5
    },
    claimSummaryBtn: {
        width: '100%',
        height: 65,
        borderRadius: 20,
        overflow: 'hidden',
    },
    claimSummaryGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    claimSummaryBtnText: {
        fontSize: 15,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1
    },
    pausedOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5000,
        padding: 30
    },
    pausedContent: {
        alignItems: 'center',
        zIndex: 5001
    },
    pausedTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
        marginBottom: 10
    },
    pausedSubtitle: {
        textAlign: 'center',
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 35,
        paddingHorizontal: 20,
        lineHeight: 22
    },
    resumeWorkoutBtn: {
        height: 56,
        borderRadius: 18,
        overflow: 'hidden',
        paddingHorizontal: 35
    },
    resumeWorkoutGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resumeWorkoutBtnText: {
        fontSize: 14,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 0.8
    }
});

export default WorkoutPlayerScreen;
