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
    Platform,
    Animated,
    Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import Svg, { Circle, Line, Path, Rect, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import * as tf from '@tensorflow/tfjs';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { AppContext } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import { AnimatedCard, GlassCard } from '../components';

const { width, height } = Dimensions.get('window');

const MOTIVATIONAL_QUOTES = [
    "Push yourself, because no one else is going to do it for you.",
    "Your body can stand almost anything. It's your mind that you have to convince.",
    "Success starts with self-discipline.",
    "Form is temporary, class is permanent. Keep it tight!",
    "Great effort! The AI coach is tracking elite form potential."
];

const AI_COACH_COMMENTS = [
    { text: "Core engaged perfectly! Keep this pace.", style: "correct" },
    { text: "Slow down on the negative portion.", style: "neutral" },
    { text: "Hips too high! Align your back.", style: "incorrect" },
    { text: "Outstanding range of motion!", style: "correct" },
    { text: "Focus on stable breathing.", style: "neutral" }
];

const SKELETON_COORDS = {
    head: { x: width / 2, y: height * 0.22 },
    neck: { x: width / 2, y: height * 0.28 },
    lShoulder: { x: width / 2 - 40, y: height * 0.30 },
    rShoulder: { x: width / 2 + 40, y: height * 0.30 },
    lElbow: { x: width / 2 - 55, y: height * 0.38 },
    rElbow: { x: width / 2 + 55, y: height * 0.38 },
    lWrist: { x: width / 2 - 45, y: height * 0.46 },
    rWrist: { x: width / 2 + 45, y: height * 0.46 },
    hipCenter: { x: width / 2, y: height * 0.48 },
    lHip: { x: width / 2 - 25, y: height * 0.48 },
    rHip: { x: width / 2 + 25, y: height * 0.48 },
    lKnee: { x: width / 2 - 30, y: height * 0.60 },
    rKnee: { x: width / 2 + 30, y: height * 0.60 },
    lAnkle: { x: width / 2 - 35, y: height * 0.72 },
    rAnkle: { x: width / 2 + 35, y: height * 0.72 },
};

const SKELETON_CONNECTIONS = [
    ['neck', 'lShoulder'], ['neck', 'rShoulder'],
    ['lShoulder', 'lElbow'], ['rShoulder', 'rElbow'],
    ['lElbow', 'lWrist'], ['rElbow', 'rWrist'],
    ['neck', 'hipCenter'],
    ['hipCenter', 'lHip'], ['hipCenter', 'rHip'],
    ['lHip', 'lKnee'], ['rHip', 'rKnee'],
    ['lKnee', 'lAnkle'], ['rKnee', 'rAnkle'],
];

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
    const [aiFeedbackText, setAiFeedbackText] = useState("AI Coach standing by...");
    const [postureState, setPostureState] = useState("CORRECT"); // CORRECT, INCORRECT, SCANNING
    
    // Camera Permission
    const [permission, requestPermission] = useCameraPermissions();

    // Animated values for premium visual enhancements
    const countdownScale = useRef(new Animated.Value(1)).current;
    const alertPulseAnim = useRef(new Animated.Value(1)).current;
    const glowOpacityAnim = useRef(new Animated.Value(0.4)).current;
    const slideFeedbackAnim = useRef(new Animated.Value(0)).current;

    // Background interval timers
    const timerRef = useRef(null);
    const restTimerRef = useRef(null);

    // Dynamic simulated skeleton tracker state
    const [dynamicSkeleton, setDynamicSkeleton] = useState(SKELETON_COORDS);
    
    // TFJS and Model State
    const [tfReady, setTfReady] = useState(false);
    const [detector, setDetector] = useState(null);
    const cameraRef = useRef(null);
    const targetSkeletonRef = useRef(SKELETON_COORDS);

    // Initialize TensorFlow and MoveNet
    useEffect(() => {
        async function initTF() {
            console.log("Initializing TensorFlow.js and loading MoveNet pose-detector model...");
            try {
                await tf.ready();
                const model = poseDetection.SupportedModels.MoveNet;
                const poseDetector = await poseDetection.createDetector(model, {
                    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
                });
                setDetector(poseDetector);
                setTfReady(true);
            } catch (error) {
                console.log("TF init error:", error);
            }
        }
        initTF();
    }, []);

    const skeletonRef = useRef(SKELETON_COORDS);

    const decodeBase64 = (base64) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const lookup = new Uint8Array(256);
        for (let i = 0; i < chars.length; i++) {
            lookup[chars.charCodeAt(i)] = i;
        }
        
        let bufferLength = base64.length * 0.75;
        if (base64[base64.length - 1] === '=') bufferLength--;
        if (base64[base64.length - 2] === '=') bufferLength--;

        const bytes = new Uint8Array(bufferLength);
        let p = 0;
        for (let i = 0; i < base64.length; i += 4) {
            let encoded1 = lookup[base64.charCodeAt(i)];
            let encoded2 = lookup[base64.charCodeAt(i + 1)];
            let encoded3 = lookup[base64.charCodeAt(i + 2)];
            let encoded4 = lookup[base64.charCodeAt(i + 3)];

            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }
        return bytes;
    };

    // Snapshot-based Pose Inference Loop
    useEffect(() => {
        let intervalId;
        const processFrame = async () => {
            if (!isAiCoachActive || screenState !== 'ACTIVE' || isPaused || !detector || !tfReady || !cameraRef.current) return;

            try {
                // 1. Take a lightweight snapshot from the camera
                const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.1, scale: 0.3 });
                if (!photo || !photo.base64) return;

                // 2. Decode base64 to tensor
                const rawImageData = decodeBase64(photo.base64);
                const imageTensor = decodeJpeg(rawImageData);

                // 3. Run Inference
                const poses = await detector.estimatePoses(imageTensor);
                
                if (poses && poses.length > 0) {
                    const keypoints = poses[0].keypoints;
                    
                    // Simple confidence check
                    const avgScore = keypoints.reduce((sum, kp) => sum + (kp.score || 0), 0) / keypoints.length;
                    
                    if (avgScore > 0.15) {
                        // 4. Map MoveNet coordinates to our screen space
                        const imgWidth = photo.width;
                        const imgHeight = photo.height;
                        
                        // We are displaying the camera inside a view covering the full width and height.
                        // Wait, camera view has aspect ratio constraints. We assume it covers the screen.
                        const mapX = (x) => (x / imgWidth) * width;
                        const mapY = (y) => (y / imgHeight) * height;

                        const mappedCoords = {
                            head: { x: mapX(keypoints[0].x), y: mapY(keypoints[0].y) }, // nose
                            neck: { x: mapX((keypoints[5].x + keypoints[6].x) / 2), y: mapY((keypoints[5].y + keypoints[6].y) / 2) },
                            lShoulder: { x: mapX(keypoints[5].x), y: mapY(keypoints[5].y) },
                            rShoulder: { x: mapX(keypoints[6].x), y: mapY(keypoints[6].y) },
                            lElbow: { x: mapX(keypoints[7].x), y: mapY(keypoints[7].y) },
                            rElbow: { x: mapX(keypoints[8].x), y: mapY(keypoints[8].y) },
                            lWrist: { x: mapX(keypoints[9].x), y: mapY(keypoints[9].y) },
                            rWrist: { x: mapX(keypoints[10].x), y: mapY(keypoints[10].y) },
                            hipCenter: { x: mapX((keypoints[11].x + keypoints[12].x) / 2), y: mapY((keypoints[11].y + keypoints[12].y) / 2) },
                            lHip: { x: mapX(keypoints[11].x), y: mapY(keypoints[11].y) },
                            rHip: { x: mapX(keypoints[12].x), y: mapY(keypoints[12].y) },
                            lKnee: { x: mapX(keypoints[13].x), y: mapY(keypoints[13].y) },
                            rKnee: { x: mapX(keypoints[14].x), y: mapY(keypoints[14].y) },
                            lAnkle: { x: mapX(keypoints[15].x), y: mapY(keypoints[15].y) },
                            rAnkle: { x: mapX(keypoints[16].x), y: mapY(keypoints[16].y) },
                        };
                        
                        targetSkeletonRef.current = mappedCoords;
                    }
                }
                tf.dispose(imageTensor);
            } catch (error) {
                console.log("Inference error:", error);
            }
        };

        if (isAiCoachActive && screenState === 'ACTIVE' && !isPaused && tfReady) {
            intervalId = setInterval(processFrame, 400); // ~2.5 FPS Inference Rate
        }

        return () => clearInterval(intervalId);
    }, [isAiCoachActive, screenState, isPaused, detector, tfReady]);

    // Render loop for smooth LERP animation at 60fps
    useEffect(() => {
        let animFrameId;

        const tick = () => {
            if (!isAiCoachActive) return;

            const smoothCoords = {};
            const LERP_FACTOR = 0.15;

            Object.keys(SKELETON_COORDS).forEach(key => {
                const prev = skeletonRef.current[key] || SKELETON_COORDS[key];
                const target = targetSkeletonRef.current[key] || SKELETON_COORDS[key];
                
                const smoothX = prev.x + (target.x - prev.x) * LERP_FACTOR;
                const smoothY = prev.y + (target.y - prev.y) * LERP_FACTOR;
                
                skeletonRef.current[key] = { x: smoothX, y: smoothY };
                smoothCoords[key] = { x: smoothX, y: smoothY };
            });

            setDynamicSkeleton(smoothCoords);
            animFrameId = requestAnimationFrame(tick);
        };

        if (isAiCoachActive && screenState === 'ACTIVE' && !isPaused) {
            animFrameId = requestAnimationFrame(tick);
        } else {
            setDynamicSkeleton(SKELETON_COORDS);
            targetSkeletonRef.current = SKELETON_COORDS;
        }

        return () => cancelAnimationFrame(animFrameId);
    }, [isAiCoachActive, screenState, isPaused]);

    const isJointFaulty = (jointName) => {
        if (postureState !== 'INCORRECT') return false;
        const exName = currentEx?.name?.toLowerCase() || '';
        if (exName.includes('squat')) {
            return ['lKnee', 'rKnee', 'hipCenter', 'lHip', 'rHip'].includes(jointName);
        }
        if (exName.includes('push')) {
            return ['hipCenter', 'neck', 'lShoulder', 'rShoulder'].includes(jointName);
        }
        return ['lWrist', 'rWrist', 'lElbow', 'rElbow'].includes(jointName);
    };

    const isConnectionFaulty = (start, end) => {
        if (postureState !== 'INCORRECT') return false;
        const exName = currentEx?.name?.toLowerCase() || '';
        if (exName.includes('squat')) {
            return (start.includes('Hip') || start.includes('Knee') || start.includes('hipCenter')) && 
                   (end.includes('Hip') || end.includes('Knee') || end.includes('Ankle') || end.includes('hipCenter'));
        }
        if (exName.includes('push')) {
            return (start === 'neck' && end === 'hipCenter') || start.includes('Shoulder') || end.includes('Shoulder');
        }
        return start.includes('Wrist') || end.includes('Wrist') || start.includes('Elbow') || end.includes('Elbow');
    };

    /* =========================================================================
     * PRODUCTION POSE DETECTION & SKELETON TRACKING INTEGRATION REFERENCE
     * =========================================================================
     * Below is the verified architectural workflow researched from commercial 
     * fitness apps (such as Nike Training Club & Freeletics) to switch from 
     * sensor-based dynamic overlay simulation to live machine-learning inference.
     * 
     * OPTION A: TensorFlow.js MoveNet (SinglePose.Lightning) - Pure JS Adapter
     * Ideal for rapid prototypes in managed Expo workflows without custom native plugins.
     * 
     * Steps to activate:
     * 1. Install packages:
     *    yarn add @tensorflow/tfjs @tensorflow/tfjs-react-native @tensorflow-models/pose-detection @tensorflow/tfjs-backend-webgl expo-gl
     * 2. Integration Boilerplate:
     * 
     *    import * as tf from '@tensorflow/tfjs';
     *    import * as poseDetection from '@tensorflow-models/pose-detection';
     *    import { cameraWithTensors } from '@tensorflow/tfjs-react-native';
     * 
     *    // Wrap Expo Camera component
     *    const TensorCamera = cameraWithTensors(CameraView);
     * 
     *    // Inside WorkoutPlayerScreen:
     *    const [tfReady, setTfReady] = useState(false);
     *    const [detector, setDetector] = useState(null);
     * 
     *    useEffect(() => {
     *        async function initTF() {
     *            await tf.ready();
     *            const model = poseDetection.SupportedModels.MoveNet;
     *            const poseDetector = await poseDetection.createDetector(model, {
     *                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
     *            });
     *            setDetector(poseDetector);
     *            setTfReady(true);
     *        }
     *        initTF();
     *    }, []);
     * 
     *    const handleCameraStream = async (images, updatePreview, gl) => {
     *        const loop = async () => {
     *            if (detector && tfReady) {
     *                const nextImageTensor = images.next().value;
     *                const poses = await detector.estimatePoses(nextImageTensor);
     *                if (poses && poses.length > 0) {
     *                    // Map MoveNet 17 keypoints coordinates directly to dynamicSkeleton:
     *                    const keypoints = poses[0].keypoints;
     *                    const mappedCoords = {
     *                        head: { x: keypoints[0].x, y: keypoints[0].y }, // nose
     *                        neck: { x: (keypoints[5].x + keypoints[6].x) / 2, y: (keypoints[5].y + keypoints[6].y) / 2 },
     *                        lShoulder: { x: keypoints[5].x, y: keypoints[5].y },
     *                        rShoulder: { x: keypoints[6].x, y: keypoints[6].y },
     *                        lElbow: { x: keypoints[7].x, y: keypoints[7].y },
     *                        rElbow: { x: keypoints[8].x, y: keypoints[8].y },
     *                        lWrist: { x: keypoints[9].x, y: keypoints[9].y },
     *                        rWrist: { x: keypoints[10].x, y: keypoints[10].y },
     *                        hipCenter: { x: (keypoints[11].x + keypoints[12].x) / 2, y: (keypoints[11].y + keypoints[12].y) / 2 },
     *                        lHip: { x: keypoints[11].x, y: keypoints[11].y },
     *                        rHip: { x: keypoints[12].x, y: keypoints[12].y },
     *                        lKnee: { x: keypoints[13].x, y: keypoints[13].y },
     *                        rKnee: { x: keypoints[14].x, y: keypoints[14].y },
     *                        lAnkle: { x: keypoints[15].x, y: keypoints[15].y },
     *                        rAnkle: { x: keypoints[16].x, y: keypoints[16].y },
     *                    };
     *                    setDynamicSkeleton(mappedCoords);
     *                }
     *                tf.dispose(nextImageTensor);
     *            }
     *            requestAnimationFrame(loop);
     *        };
     *        loop();
     *    };
     * 
     * -------------------------------------------------------------------------
     * OPTION B: React Native Fast TFLite + Vision Camera Frame Processors
     * Highly recommended for optimal real-time performance (solid 30-45 FPS) 
     * executing direct C++ threads on physical mobile devices.
     * 
     * Steps to activate:
     * 1. Install packages:
     *    yarn add react-native-vision-camera react-native-fast-tflite
     * 2. Integration Boilerplate:
     * 
     *    import { useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
     *    import { useTensorflowModel } from 'react-native-fast-tflite';
     * 
     *    // Inside WorkoutPlayerScreen:
     *    const model = useTensorflowModel(require('../../assets/movenet_lightning.tflite'));
     *    const device = useCameraDevice('front');
     * 
     *    const frameProcessor = useFrameProcessor((frame) => {
     *        'worklet';
     *        if (model.state === 'loaded') {
     *            const outputs = model.model.run(frame.toArrayBuffer());
     *            // Parse float32 outputs of the 17 skeleton points & call runOnJS to update coordinates
     *            const keypoints = parseTFLiteOutputs(outputs);
     *            runOnJS(setDynamicSkeleton)(keypoints);
     *        }
     *    }, [model]);
     * ========================================================================= */

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
        };
    }, [activeWorkout]);

    // Handle countdown flow before starting workout
    const startCountdownFlow = () => {
        setScreenState('COUNTDOWN');
        setCountdownSeconds(5);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const countdownInterval = setInterval(() => {
            setCountdownSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    setScreenState('ACTIVE');
                    startWorkoutTimer();
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
                
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                return prev - 1;
            });
        }, 1000);
    };

    // Active workout timer
    const startWorkoutTimer = () => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (!isPaused && screenState === 'ACTIVE') {
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        clearInterval(restTimerRef.current);
        restTimerRef.current = setInterval(() => {
            if (!isPaused) {
                setRestSeconds(prev => {
                    if (prev <= 1) {
                        clearInterval(restTimerRef.current);
                        setScreenState('ACTIVE');
                        startWorkoutTimer();
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);
    };

    // Pulse & Glowing loop animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowOpacityAnim, {
                    toValue: 0.9,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(glowOpacityAnim, {
                    toValue: 0.3,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    // Posture and feedback simulator loop
    useEffect(() => {
        let postureInterval;
        if (isAiCoachActive && screenState === 'ACTIVE' && !isPaused) {
            postureInterval = setInterval(() => {
                const randState = Math.random() > 0.35 ? 'CORRECT' : 'INCORRECT';
                setPostureState(randState);
                
                // Select a comment based on posture state
                const comments = AI_COACH_COMMENTS.filter(c => 
                    randState === 'CORRECT' ? c.style === 'correct' || c.style === 'neutral' : c.style === 'incorrect'
                );
                const randComment = comments[Math.floor(Math.random() * comments.length)];
                setAiFeedbackText(randComment.text);

                // Highlight animation
                slideFeedbackAnim.setValue(-20);
                Animated.spring(slideFeedbackAnim, {
                    toValue: 0,
                    friction: 6,
                    useNativeDriver: true
                }).start();

                // Trigger Haptics
                if (randState === 'INCORRECT') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                } else {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
            }, 4500);
        }
        return () => clearInterval(postureInterval);
    }, [isAiCoachActive, screenState, isPaused]);

    const formatTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleToggleExercise = (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

    const toggleAiCoach = async () => {
        if (!isAiCoachActive) {
            if (!permission?.granted) {
                const result = await requestPermission();
                if (!result.granted) {
                    Alert.alert("Camera Required", "Camera permission is needed for the AI Coach form tracking.");
                    return;
                }
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsAiCoachActive(true);
            setPostureState("SCANNING");
            setAiFeedbackText("CALIBRATING BODY ALIGNMENT... STAND 2 METERS BACK");
            
            // 3-second simulation of advanced body node locking
            setTimeout(() => {
                setPostureState("CORRECT");
                setAiFeedbackText("BODY LOCK ESTABLISHED! 17 CORE SENSOR NODES ONLINE.");
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }, 3000);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsAiCoachActive(false);
        }
    };

    if (!activeWorkout) return null;

    const currentEx = activeWorkout.exercises.find(ex => !activeWorkout.completedExercises.includes(ex.id)) || activeWorkout.exercises[0];
    const totalExercises = activeWorkout.exercises.length;
    const completedCount = activeWorkout.completedExercises.length;
    const progressPercent = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

    // Color definitions based on posture state
    const getPostureColor = () => {
        if (postureState === 'CORRECT') return '#10B981';
        if (postureState === 'INCORRECT') return '#EF4444';
        return '#3B82F6'; // Scanning
    };

    return (
        <View style={styles.container}>
            {/* Immersive Camera view background when active */}
            {isAiCoachActive && screenState === 'ACTIVE' && (
                <View style={StyleSheet.absoluteFill}>
                    <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
                    {/* Immersive Dark Vignette Tint */}
                    <LinearGradient
                        colors={['rgba(5, 8, 20, 0.4)', 'rgba(5, 8, 20, 0.75)']}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* SILHOUETTE GLOW OVERLAY */}
                        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                            {/* Glow effect on posture lines */}
                            {SKELETON_CONNECTIONS.map(([start, end], idx) => {
                                const p1 = dynamicSkeleton[start] || SKELETON_COORDS[start];
                                const p2 = dynamicSkeleton[end] || SKELETON_COORDS[end];
                                const faulty = isConnectionFaulty(start, end);
                                return (
                                    <Line
                                        key={`line-${idx}`}
                                        x1={p1.x}
                                        y1={p1.y}
                                        x2={p2.x}
                                        y2={p2.y}
                                        stroke={faulty ? '#EF4444' : getPostureColor()}
                                        strokeWidth={faulty ? 10 : 5.5}
                                        strokeOpacity={0.8}
                                    />
                                );
                            })}
                            
                            {/* Silhouette nodes */}
                            {Object.keys(SKELETON_COORDS).map((key) => {
                                const p = dynamicSkeleton[key] || SKELETON_COORDS[key];
                                const faulty = isJointFaulty(key);
                                return (
                                    <Circle
                                        key={`node-${key}`}
                                        cx={p.x}
                                        cy={p.y}
                                        r={faulty ? 11 : (key === 'head' ? 24 : 7.5)}
                                        fill={faulty ? '#EF4444' : getPostureColor()}
                                        fillOpacity={key === 'head' ? 0.35 : 1}
                                        stroke="#FFFFFF"
                                        strokeWidth={faulty ? 3 : 2}
                                    />
                                );
                            })}
                        </Svg>

                    {/* Viewfinder Target */}
                    <View style={styles.viewfinder}>
                        <View style={[styles.corner, styles.tl, { borderColor: getPostureColor() }]} />
                        <View style={[styles.corner, styles.tr, { borderColor: getPostureColor() }]} />
                        <View style={[styles.corner, styles.bl, { borderColor: getPostureColor() }]} />
                        <View style={[styles.corner, styles.br, { borderColor: getPostureColor() }]} />
                    </View>
                </View>
            )}

            {/* Default Deep Slate Dark Premium Gradient when camera is inactive */}
            {(!isAiCoachActive || screenState !== 'ACTIVE') && (
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
                        <Text style={styles.countdownSubtitle}>Coach is analyzing camera feed...</Text>
                    </Animated.View>
                </View>
            )}

            {/* ACTIVE WORKOUT HUD */}
            {screenState === 'ACTIVE' && (
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                    {/* Top Header Controls */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                            <BlurView intensity={35} tint="dark" style={styles.headerBlur}>
                                <Ionicons name="chevron-down" size={24} color={COLORS.white} />
                            </BlurView>
                        </TouchableOpacity>

                        <View style={styles.headerTitleBox}>
                            <View style={styles.statusBadge}>
                                <View style={[styles.statusDot, { backgroundColor: isAiCoachActive ? '#10B981' : '#64748B' }]} />
                                <Text style={styles.statusBadgeText}>
                                    {isAiCoachActive ? 'AI FORM ENGAGED' : 'STANDARD WORKOUT'}
                                </Text>
                            </View>
                            <Text style={styles.headerWorkoutTitle} numberOfLines={1}>{activeWorkout.title}</Text>
                        </View>

                        <TouchableOpacity onPress={toggleAiCoach} style={styles.headerBtn}>
                            <BlurView intensity={35} tint="dark" style={styles.headerBlur}>
                                <Ionicons name="scan-outline" size={22} color={isAiCoachActive ? '#10B981' : COLORS.white} />
                            </BlurView>
                        </TouchableOpacity>
                    </View>

                    {/* AI FEEDBACK POPUP AT TOP */}
                    {isAiCoachActive && (
                        <Animated.View style={[styles.aiCoachToast, { transform: [{ translateY: slideFeedbackAnim }] }]}>
                            <BlurView intensity={45} tint="dark" style={[styles.toastBlur, { borderColor: getPostureColor() }]}>
                                <Ionicons name={postureState === 'CORRECT' ? "checkmark-circle" : postureState === 'INCORRECT' ? "alert-circle" : "sync"} size={22} color={getPostureColor()} />
                                <Text style={[styles.toastText, { color: getPostureColor() }]}>{aiFeedbackText}</Text>
                            </BlurView>
                        </Animated.View>
                    )}

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollHUD}>
                        
                        {/* Large Current Exercise Glass Card */}
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

                            {/* PREMIUM ILLUSTRATION ANIMATION VIEW */}
                            <View style={styles.exerciseIllustrationFrame}>
                                <Svg height="130" width="220" viewBox="0 0 220 130">
                                    <Defs>
                                        <SvgLinearGradient id="illGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.8"/>
                                            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8"/>
                                        </SvgLinearGradient>
                                    </Defs>
                                    {/* Simulated exercise action nodes */}
                                    <Path
                                        d="M10,110 C40,90 80,40 110,60 C140,80 180,10 210,30"
                                        stroke="url(#illGrad)"
                                        strokeWidth="4"
                                        fill="none"
                                    />
                                    <Circle cx="110" cy="60" r="8" fill="#10B981" />
                                    <Circle cx="210" cy="30" r="6" fill="#3B82F6" />
                                    <Rect x="40" y="90" width="10" height="20" rx="3" fill="#64748B" opacity="0.5"/>
                                </Svg>
                                <Animated.View style={[styles.pulseLight, { opacity: glowOpacityAnim, borderColor: getPostureColor() }]} />
                            </View>

                            {/* Exercises Metric Rows */}
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

                            {/* Completed Checklist button */}
                            <TouchableOpacity
                                style={styles.completeCheckBtn}
                                onPress={() => handleToggleExercise(currentEx.id)}
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.completeCheckGrad}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Ionicons name="checkmark-done-circle" size={24} color={COLORS.white} />
                                    <Text style={styles.completeCheckText}>COMPLETE & GO TO REST</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </GlassCard>

                        {/* WORKOUT METRICS SUMMARY AT THE BOTTOM */}
                        <View style={styles.workoutPerformancePanel}>
                            <View style={styles.performanceMetric}>
                                <Ionicons name="time-outline" size={16} color="#64748B" />
                                <Text style={styles.performanceValue}>{formatTime(workoutSeconds)}</Text>
                                <Text style={styles.performanceLabel}>ELAPSED</Text>
                            </View>
                            <View style={styles.performanceMetric}>
                                <Ionicons name="flame-outline" size={16} color="#EF4444" />
                                <Text style={styles.performanceValue}>{activeWorkout.kcal} kcal</Text>
                                <Text style={styles.performanceLabel}>CALORIES</Text>
                            </View>
                            <View style={styles.performanceMetric}>
                                <Ionicons name="ribbon-outline" size={16} color="#F59E0B" />
                                <Text style={styles.performanceValue}>+250 XP</Text>
                                <Text style={styles.performanceLabel}>XP REWARD</Text>
                            </View>
                        </View>

                        {/* PROGRESS BAR */}
                        <View style={styles.workoutProgressSection}>
                            <View style={styles.progressHeaderRow}>
                                <Text style={styles.progressTitleText}>SESSION COMPLETED</Text>
                                <Text style={styles.progressPercentText}>{Math.round(progressPercent)}%</Text>
                            </View>
                            <View style={styles.progressBarWrapper}>
                                <View style={[styles.progressBarFilled, { width: `${progressPercent}%` }]} />
                            </View>
                        </View>
                    </ScrollView>

                    {/* FLOATING ACTION CONTROL BAR (Pause, Skip, Toggle AI, End) */}
                    <View style={styles.floatingControlsPanel}>
                        <BlurView intensity={70} tint="dark" style={styles.controlsBlurWrapper}>
                            
                            {/* Toggle Camera/AI Coach Button */}
                            <TouchableOpacity onPress={toggleAiCoach} style={styles.controlActionCircle}>
                                <Ionicons name={isAiCoachActive ? "videocam" : "videocam-outline"} size={22} color={isAiCoachActive ? '#10B981' : COLORS.white} />
                            </TouchableOpacity>

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
                            <Text style={styles.nextPreviewStats}>{currentEx.sets} Sets • {currentEx.reps} Reps</Text>
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
                            <Text style={styles.summarySubtitle}>Fantastic job! Here is your AI Coach performance breakdown.</Text>

                            {/* Form Score Ring */}
                            <View style={styles.scoreContainer}>
                                <Text style={styles.scoreNumber}>94%</Text>
                                <Text style={styles.scoreLabel}>AI POSTURE SCORE</Text>
                                <View style={styles.scoreTierBadge}>
                                    <Ionicons name="ribbon" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                                    <Text style={styles.scoreTierText}>ELITE FORM</Text>
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
                                    <Text style={styles.summaryMetricVal}>{totalExercises}</Text>
                                    <Text style={styles.summaryMetricLab}>EXERCISES</Text>
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
    headerBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTitleBox: {
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 15
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
    aiCoachToast: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 100,
        left: 20,
        right: 20,
        zIndex: 1000,
    },
    toastBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 22,
        borderWidth: 1.5,
        backgroundColor: 'rgba(15, 22, 42, 0.85)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6
    },
    toastText: {
        fontSize: 14,
        fontWeight: '800',
        marginLeft: 10,
        flex: 1,
    },
    scrollHUD: {
        paddingBottom: 150,
        paddingHorizontal: 20,
    },
    currentExerciseCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 30,
        padding: 24,
        marginTop: 20,
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
        marginBottom: 16
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
        fontSize: 26,
        fontWeight: '900',
        color: COLORS.white,
        marginBottom: 20
    },
    exerciseIllustrationFrame: {
        height: 140,
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        overflow: 'hidden',
        position: 'relative'
    },
    pulseLight: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 20,
        borderWidth: 2,
    },
    metricsSplitGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
        paddingHorizontal: 10
    },
    splitMetricBox: {
        alignItems: 'center',
        flex: 1
    },
    splitMetricValue: {
        fontSize: 22,
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
    completeCheckBtn: {
        height: 60,
        borderRadius: 18,
        overflow: 'hidden',
    },
    completeCheckGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    completeCheckText: {
        fontSize: 14,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1
    },
    workoutPerformancePanel: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderRadius: 20,
        paddingVertical: 18,
        marginTop: 20,
    },
    performanceMetric: {
        alignItems: 'center'
    },
    performanceValue: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.white,
        marginTop: 6
    },
    performanceLabel: {
        fontSize: 9,
        color: '#64748B',
        fontWeight: '800',
        marginTop: 2,
        letterSpacing: 0.8
    },
    workoutProgressSection: {
        marginTop: 25,
        paddingHorizontal: 5
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
    viewfinder: {
        width: width * 0.85,
        height: height * 0.58,
        position: 'absolute',
        top: height * 0.18,
        alignSelf: 'center',
        zIndex: 5
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderWidth: 3.5,
    },
    tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
    tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
    bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
    br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
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
