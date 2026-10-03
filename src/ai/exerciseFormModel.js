const MIN_CONFIDENCE = 0.5;
const METRIC_SMOOTHING_ALPHA = 0.35;

const REP_TIMING_PROFILES = {
    strength: {
        requiredTransitionFrames: 2,
        minDownFrames: 2,
        repLockFrames: 5,
        minFramesBetweenReps: 5,
        minCalibrationFrames: 8,
    },
    slowStrength: {
        requiredTransitionFrames: 3,
        minDownFrames: 2,
        repLockFrames: 6,
        minFramesBetweenReps: 6,
        minCalibrationFrames: 8,
    },
    fast: {
        requiredTransitionFrames: 1,
        minDownFrames: 1,
        repLockFrames: 2,
        minFramesBetweenReps: 2,
        minCalibrationFrames: 5,
    },
};

const EXERCISE_TIMING_PROFILE = {
    squat: 'slowStrength',
    pushup: 'slowStrength',
    lunge: 'slowStrength',
    shoulderPress: 'strength',
    bicepCurl: 'strength',
    lateralRaise: 'strength',
    tricepDip: 'strength',
    deadlift: 'slowStrength',
    row: 'strength',
    gluteBridge: 'strength',
    calfRaise: 'strength',
    benchPress: 'strength',
    latPulldown: 'strength',
    pullup: 'slowStrength',
    legPress: 'strength',
    legExtension: 'strength',
    legCurl: 'strength',
    chestFly: 'strength',
    crunch: 'strength',
    jumpingJack: 'fast',
    mountainClimber: 'fast',
};

const SUPPORTED_EXERCISES = {
    squat: {
        labels: ['squat', 'jump squat', 'bodyweight squat', 'goblet squat'],
        phaseMetric: 'squatRise',
        downBelow: 0.42,
        upAbove: 0.52,
        faults: {
            shallowDepth: 'Go lower until your knees bend more.',
            backLean: 'Keep your chest up and spine neutral.',
            kneeCollapse: 'Keep both knees aligned over your toes.',
        },
    },
    pushup: {
        labels: ['push up', 'push-up', 'pushup', 'incline push up', 'knee push up'],
        phaseMetric: 'elbow',
        downBelow: 95,
        upAbove: 155,
        faults: {
            shallowDepth: 'Lower your chest more before pressing up.',
            hipSag: 'Brace your core and keep hips aligned.',
            elbowFlare: 'Keep elbows closer to your body.',
        },
    },
    lunge: {
        labels: ['lunge', 'lunges', 'reverse lunge', 'walking lunge', 'split squat'],
        phaseMetric: 'frontKnee',
        downBelow: 112,
        upAbove: 155,
        faults: {
            shallowDepth: 'Drop the back knee lower with control.',
            kneeDrift: 'Keep the front knee stacked over the ankle.',
            torsoLean: 'Keep your torso tall through the rep.',
        },
    },
    plank: {
        labels: ['plank', 'forearm plank', 'high plank'],
        phaseMetric: 'hold',
        faults: {
            hipSag: 'Lift your hips slightly and brace your core.',
            hipsHigh: 'Lower your hips until shoulders, hips, and ankles align.',
            shoulderStack: 'Stack shoulders over elbows or wrists.',
        },
    },
    shoulderPress: {
        labels: ['shoulder press', 'overhead press', 'dumbbell press', 'military press'],
        phaseMetric: 'elbow',
        downBelow: 105,
        upAbove: 158,
        faults: {
            incompleteLockout: 'Press fully overhead without shrugging.',
            wristDrift: 'Keep wrists stacked above elbows.',
            backArch: 'Tighten your core and avoid arching your back.',
        },
    },
    bicepCurl: {
        labels: ['bicep curl', 'bicep curls', 'dumbbell curl', 'barbell curl'],
        phaseMetric: 'elbow',
        downBelow: 70,
        upAbove: 150,
        reverseRep: true,
        faults: {
            shoulderSwing: 'Keep your upper arm still and avoid swinging.',
            incompleteCurl: 'Curl through a fuller range of motion.',
            wristDrift: 'Keep wrists neutral and stacked with the forearm.',
        },
    },
    tricepDip: {
        labels: ['tricep dip', 'tricep dips', 'dips', 'bench dip'],
        phaseMetric: 'elbow',
        downBelow: 105,
        upAbove: 158,
        faults: {
            shallowDepth: 'Lower until elbows bend close to 90 degrees.',
            shoulderShrug: 'Keep shoulders down and away from your ears.',
            hipDrift: 'Keep hips close to the bench or bars.',
        },
    },
    deadlift: {
        labels: ['deadlift', 'romanian deadlift', 'rdl', 'hip hinge'],
        phaseMetric: 'hip',
        downBelow: 118,
        upAbove: 162,
        faults: {
            roundedBack: 'Keep your back neutral through the hinge.',
            kneeDominant: 'Push hips back more; this should feel like a hinge.',
            barDrift: 'Keep the weight close to your legs.',
        },
    },
    row: {
        labels: ['barbell row', 'dumbbell row', 'row', 'rows'],
        phaseMetric: 'elbow',
        downBelow: 92,
        upAbove: 150,
        reverseRep: true,
        faults: {
            torsoRock: 'Hold your torso steady and row with control.',
            shortPull: 'Pull elbows farther back toward your ribs.',
            shoulderShrug: 'Keep shoulders packed down during the pull.',
        },
    },
    jumpingJack: {
        labels: ['jumping jack', 'jumping jacks'],
        phaseMetric: 'armRaise',
        downBelow: 42,
        upAbove: 118,
        faults: {
            lowArms: 'Reach arms higher overhead.',
            narrowFeet: 'Jump feet wider than hip width.',
            stiffLanding: 'Land softly with knees slightly bent.',
        },
    },
    mountainClimber: {
        labels: ['mountain climber', 'mountain climbers'],
        phaseMetric: 'frontKnee',
        downBelow: 82,
        upAbove: 145,
        reverseRep: true,
        faults: {
            hipHigh: 'Lower hips and keep a strong plank line.',
            slowDrive: 'Drive knees forward with a sharper rhythm.',
            shoulderStack: 'Keep shoulders stacked over wrists.',
        },
    },
    gluteBridge: {
        labels: ['glute bridge', 'hip thrust', 'bridge'],
        phaseMetric: 'hip',
        downBelow: 132,
        upAbove: 168,
        reverseRep: true,
        faults: {
            lowHips: 'Lift hips higher and squeeze glutes at the top.',
            overArch: 'Do not over-arch your lower back.',
            kneeDrift: 'Keep knees tracking in line with hips.',
        },
    },
    calfRaise: {
        labels: ['calf raise', 'calf raises', 'standing calf raise'],
        phaseMetric: 'ankleLift',
        downBelow: 8,
        upAbove: 22,
        faults: {
            lowLift: 'Rise higher onto the balls of your feet.',
            kneeBend: 'Keep knees mostly straight during the raise.',
            rushing: 'Pause briefly at the top of each rep.',
        },
    },
    benchPress: {
        labels: ['bench press', 'barbell bench press', 'dumbbell bench press', 'chest press'],
        phaseMetric: 'elbow',
        downBelow: 95,
        upAbove: 155,
        faults: {
            shallowDepth: 'Lower the weight closer to chest level with control.',
            elbowFlare: 'Tuck elbows slightly; avoid flaring them too wide.',
            wristStack: 'Keep wrists stacked over elbows.',
        },
    },
    latPulldown: {
        labels: ['lat pulldown', 'lat pull down', 'pulldown', 'cable pulldown'],
        phaseMetric: 'elbow',
        downBelow: 92,
        upAbove: 155,
        reverseRep: true,
        faults: {
            shortPull: 'Pull the bar lower toward the upper chest.',
            torsoLean: 'Keep torso stable; do not swing backward.',
            shoulderShrug: 'Pull shoulders down before bending elbows.',
        },
    },
    pullup: {
        labels: ['pull up', 'pull-up', 'pullup', 'chin up', 'chin-up'],
        phaseMetric: 'elbow',
        downBelow: 88,
        upAbove: 155,
        reverseRep: true,
        faults: {
            shortPull: 'Pull higher until your chin approaches bar level.',
            shoulderShrug: 'Depress your shoulders before pulling.',
            bodySwing: 'Keep your body still and avoid swinging.',
        },
    },
    legPress: {
        labels: ['leg press'],
        phaseMetric: 'knee',
        downBelow: 105,
        upAbove: 158,
        faults: {
            shallowDepth: 'Lower the platform deeper without lifting hips.',
            kneeLockout: 'Do not hard-lock your knees at the top.',
            kneeCollapse: 'Keep knees tracking in line with toes.',
        },
    },
    legExtension: {
        labels: ['leg extension', 'leg extensions'],
        phaseMetric: 'knee',
        downBelow: 105,
        upAbove: 160,
        reverseRep: true,
        faults: {
            incompleteExtension: 'Extend knees closer to full lockout with control.',
            hipLift: 'Keep hips seated against the pad.',
            rushing: 'Control the lowering phase.',
        },
    },
    legCurl: {
        labels: ['leg curl', 'hamstring curl', 'lying leg curl', 'seated leg curl'],
        phaseMetric: 'knee',
        downBelow: 92,
        upAbove: 155,
        faults: {
            incompleteCurl: 'Curl heels closer toward your glutes.',
            hipLift: 'Keep hips pressed into the pad.',
            rushing: 'Control the return instead of letting the weight drop.',
        },
    },
    lateralRaise: {
        labels: ['lateral raise', 'lateral raises', 'side raise', 'side lateral raise'],
        phaseMetric: 'shoulder',
        downBelow: 35,
        upAbove: 82,
        reverseRep: true,
        faults: {
            lowRaise: 'Raise arms closer to shoulder height.',
            shoulderShrug: 'Keep shoulders down; do not shrug the traps.',
            torsoSwing: 'Stand still and avoid using momentum.',
        },
    },
    chestFly: {
        labels: ['chest fly', 'chest flies', 'pec deck', 'cable fly'],
        phaseMetric: 'elbowFlare',
        downBelow: 1.15,
        upAbove: 1.75,
        reverseRep: true,
        faults: {
            shortRange: 'Open the arms wider, then squeeze across the chest.',
            elbowBend: 'Keep a soft but stable bend in the elbows.',
            shoulderShrug: 'Keep shoulders down and chest lifted.',
        },
    },
    crunch: {
        labels: ['crunch', 'crunches', 'ab crunch'],
        phaseMetric: 'torsoLean',
        downBelow: 8,
        upAbove: 24,
        reverseRep: true,
        faults: {
            neckPull: 'Do not pull the neck; curl from the ribs.',
            lowCurl: 'Lift shoulders higher by contracting your abs.',
            fastTempo: 'Slow down and control the curl.',
        },
    },
};

const POSEFORM_TEMPLATE_DATASET = {
    squat: {
        minMovementRange: 0.07,
        ready: { squatRise: [0.5, 0.82], knee: [155, 180] },
        bottom: { squatRise: [0.2, 0.48], knee: [55, 135] },
        rangeCue: 'I see you. Squat deeper, then stand tall so I can learn your full up-down range.',
    },
    pushup: {
        minMovementRange: 24,
        ready: { elbow: [150, 180] },
        bottom: { elbow: [65, 115] },
        rangeCue: 'I see you. Lower your chest more, then press back up with control.',
    },
    lunge: {
        minMovementRange: 22,
        ready: { frontKnee: [150, 180] },
        bottom: { frontKnee: [75, 125] },
        rangeCue: 'I see you. Drop into the lunge deeper, then return to a tall stance.',
    },
    shoulderPress: {
        minMovementRange: 22,
        ready: { elbow: [70, 115] },
        bottom: { elbow: [150, 180] },
        rangeCue: 'I see you. Press overhead fully, then lower the weights back to shoulder level.',
    },
    bicepCurl: {
        minMovementRange: 30,
        ready: { elbow: [135, 180] },
        bottom: { elbow: [40, 95] },
        rangeCue: 'I see you. Curl higher, then extend the arm lower so the rep is clear.',
    },
    lateralRaise: {
        minMovementRange: 18,
        ready: { shoulder: [10, 45] },
        bottom: { shoulder: [70, 105] },
        rangeCue: 'I see you. Raise closer to shoulder height, then lower with control.',
    },
    plank: {
        minMovementRange: 0,
        ready: { bodyLine: [-14, 14] },
        bottom: { bodyLine: [-14, 14] },
        rangeCue: 'Hold still with shoulders, hips, knees, and ankles in one line.',
    },
    tricepDip: {
        minMovementRange: 22,
        ready: { elbow: [150, 180] },
        bottom: { elbow: [70, 115] },
        rangeCue: 'I see you. Lower until your elbows clearly bend, then press back to the top.',
    },
    deadlift: {
        minMovementRange: 18,
        ready: { hip: [155, 180] },
        bottom: { hip: [80, 125] },
        rangeCue: 'I see you. Hinge the hips back farther, then stand tall to finish the rep.',
    },
    row: {
        minMovementRange: 28,
        ready: { elbow: [135, 175] },
        bottom: { elbow: [50, 105] },
        rangeCue: 'I see you. Pull elbows farther back, then extend the arms with control.',
    },
    jumpingJack: {
        minMovementRange: 34,
        ready: { armRaise: [10, 55] },
        bottom: { armRaise: [95, 155] },
        rangeCue: 'I see you. Reach arms higher overhead and open the feet wider.',
    },
    mountainClimber: {
        minMovementRange: 24,
        ready: { frontKnee: [130, 175] },
        bottom: { frontKnee: [45, 95] },
        rangeCue: 'I see you. Drive the knee farther toward the chest, then switch legs.',
    },
    gluteBridge: {
        minMovementRange: 18,
        ready: { hip: [115, 150] },
        bottom: { hip: [155, 180] },
        rangeCue: 'I see you. Lift hips higher and pause briefly at the top.',
    },
    calfRaise: {
        minMovementRange: 8,
        ready: { ankleLift: [0, 10] },
        bottom: { ankleLift: [18, 36] },
        rangeCue: 'I see you. Rise higher onto the balls of your feet, then lower slowly.',
    },
    benchPress: {
        minMovementRange: 24,
        ready: { elbow: [145, 180] },
        bottom: { elbow: [65, 110] },
        rangeCue: 'I see you. Lower closer to chest level, then press to a strong top position.',
    },
    latPulldown: {
        minMovementRange: 28,
        ready: { elbow: [140, 180] },
        bottom: { elbow: [50, 100] },
        rangeCue: 'I see you. Pull lower toward the upper chest, then control the return.',
    },
    pullup: {
        minMovementRange: 28,
        ready: { elbow: [145, 180] },
        bottom: { elbow: [45, 95] },
        rangeCue: 'I see you. Pull higher, then lower under control until the arms extend.',
    },
    legPress: {
        minMovementRange: 22,
        ready: { knee: [145, 175] },
        bottom: { knee: [70, 115] },
        rangeCue: 'I see you. Lower the platform deeper, then press without locking the knees hard.',
    },
    legExtension: {
        minMovementRange: 24,
        ready: { knee: [85, 125] },
        bottom: { knee: [150, 180] },
        rangeCue: 'I see you. Extend the knees higher, then lower the weight with control.',
    },
    legCurl: {
        minMovementRange: 24,
        ready: { knee: [145, 180] },
        bottom: { knee: [55, 105] },
        rangeCue: 'I see you. Curl heels closer, then return slowly.',
    },
    chestFly: {
        minMovementRange: 0.18,
        ready: { elbowFlare: [1.6, 2.2] },
        bottom: { elbowFlare: [0.85, 1.28] },
        rangeCue: 'I see you. Open wider, then squeeze the arms together with control.',
    },
    crunch: {
        minMovementRange: 10,
        ready: { torsoLean: [0, 12] },
        bottom: { torsoLean: [22, 42] },
        rangeCue: 'I see you. Curl shoulders higher from the ribs, then lower slowly.',
    },
    general: {
        minMovementRange: 18,
        rangeCue: 'I see you. Make the movement larger and slower so PoseForm can lock the rep.',
    },
};

export const getSupportedExerciseNames = () => Object.values(SUPPORTED_EXERCISES)
    .map((exercise) => exercise.labels[0]);

export const getExerciseModelType = (exerciseName = '') => {
    const normalized = exerciseName.toLowerCase();
    return Object.entries(SUPPORTED_EXERCISES)
        .sort(([, a], [, b]) => longestLabel(b.labels) - longestLabel(a.labels))
        .find(([, config]) => (
        config.labels.some((label) => normalized.includes(label))
    ))?.[0] || 'general';
};

const longestLabel = (labels) => Math.max(...labels.map((label) => label.length));

export const createExerciseTracker = () => ({
    phase: 'up',
    reps: 0,
    lastFeedback: 'Stand fully in frame so PoseForm can lock your joints.',
    stableFrames: 0,
    lastScore: 0,
    lastFaultKey: '',
    repeatedFaultFrames: 0,
    repLockFrames: 0,
    lastMetric: null,
    metricMin: null,
    metricMax: null,
    movementRange: 0,
    calibrated: false,
    dynamicDownThreshold: null,
    dynamicUpThreshold: null,
    framesSeen: 0,
    movementDirection: 'unknown',
    sawDownPosition: false,
    candidatePhase: 'up',
    candidateFrames: 0,
    framesSinceRep: 999,
    phaseFrames: 0,
    smoothedMetric: null,
    calibrationCycles: 0,
    calibrationComplete: false,
});

export const parseTargetReps = (reps) => {
    if (!reps) return null;
    const match = String(reps).match(/\d+/);
    return match ? Number(match[0]) : null;
};

export const analyzeExercisePose = ({
    exerciseName,
    skeleton,
    previous = createExerciseTracker(),
    targetReps = null,
    manualCalibration = null,
}) => {
    const exerciseType = getExerciseModelType(exerciseName);
    const visibility = estimateVisibility(skeleton);

    if (visibility < MIN_CONFIDENCE) {
        return {
            tracker: { ...previous, lastScore: 0 },
            exerciseType,
            postureState: 'SCANNING',
            feedback: 'Step back and keep your full body inside the frame.',
            formScore: 0,
            repCount: previous.reps || 0,
            phase: previous.phase || 'up',
            faultyJoints: [],
            faultyConnections: [],
            metrics: {},
        };
    }

    const metrics = calculateMetrics(skeleton);
    const nextTracker = updateRepTracker({
        exerciseType,
        config: SUPPORTED_EXERCISES[exerciseType],
        metrics,
        previous,
        targetReps,
        manualCalibration,
    });
    const analysis = analyzeByExercise(exerciseType, metrics, nextTracker.phase);
    const rangeFeedback = getManualCalibrationFeedback(manualCalibration) || getMovementRangeFeedback(exerciseType, nextTracker);

    const faultKey = analysis.faultyJoints.join('|');
    const repeatedFaultFrames = faultKey && faultKey === previous.lastFaultKey
        ? (previous.repeatedFaultFrames || 0) + 1
        : (faultKey ? 1 : 0);
    const faultIsStable = repeatedFaultFrames >= 2;
    const formScore = faultKey && !faultIsStable ? Math.max(78, analysis.formScore) : analysis.formScore;
    const postureState = formScore >= 76 ? 'CORRECT' : 'INCORRECT';
    const feedback = rangeFeedback || (faultKey && !faultIsStable
        ? 'Keep moving slowly. I am checking if that form issue repeats.'
        : analysis.feedback || (postureState === 'CORRECT'
        ? 'Strong form. Keep the tempo controlled.'
        : 'Adjust your form before the next rep.'));

    return {
        tracker: {
            ...nextTracker,
            lastFeedback: feedback,
            lastScore: formScore,
            lastFaultKey: faultKey,
            repeatedFaultFrames,
        },
        exerciseType,
        postureState,
        feedback,
        formScore,
        repCount: nextTracker.reps,
        phase: nextTracker.phase,
        faultyJoints: faultIsStable ? analysis.faultyJoints : [],
        faultyConnections: faultIsStable ? analysis.faultyConnections : [],
        metrics: {
            ...metrics,
            movementRange: nextTracker.movementRange,
            calibrated: nextTracker.calibrated,
            dynamicDownThreshold: nextTracker.dynamicDownThreshold,
            dynamicUpThreshold: nextTracker.dynamicUpThreshold,
            calibrationCycles: nextTracker.calibrationCycles,
            calibrationComplete: nextTracker.calibrationComplete,
            activeMetricName: SUPPORTED_EXERCISES[exerciseType]?.phaseMetric || 'general',
            activeMetric: nextTracker.smoothedMetric ?? metrics[SUPPORTED_EXERCISES[exerciseType]?.phaseMetric],
            manualCalibrationReady: nextTracker.manualCalibrationReady,
            manualCounting: nextTracker.manualCounting,
        },
    };
};

const estimateVisibility = (skeleton) => {
    const required = ['lShoulder', 'rShoulder', 'lHip', 'rHip', 'lKnee', 'rKnee', 'lAnkle', 'rAnkle'];
    const visible = required.filter((joint) => {
        const point = skeleton[joint];
        return point
            && Number.isFinite(point.x)
            && Number.isFinite(point.y)
            && (point.score == null || point.score >= 0.25);
    }).length;
    return visible / required.length;
};

const calculateMetrics = (p) => {
    const leftKnee = angle(p.lHip, p.lKnee, p.lAnkle);
    const rightKnee = angle(p.rHip, p.rKnee, p.rAnkle);
    const leftElbow = angle(p.lShoulder, p.lElbow, p.lWrist);
    const rightElbow = angle(p.rShoulder, p.rElbow, p.rWrist);
    const leftHip = angle(p.lShoulder, p.lHip, p.lKnee);
    const rightHip = angle(p.rShoulder, p.rHip, p.rKnee);
    const torsoLean = lineAngle(midpoint(p.lShoulder, p.rShoulder), midpoint(p.lHip, p.rHip));
    const bodyLine = lineAngle(midpoint(p.lShoulder, p.rShoulder), midpoint(p.lAnkle, p.rAnkle));
    const shoulder = averageValid(
        angle(p.lElbow, p.lShoulder, p.lHip),
        angle(p.rElbow, p.rShoulder, p.rHip)
    );
    const armRaise = averageValid(
        lineAngle(p.lShoulder, p.lWrist),
        lineAngle(p.rShoulder, p.rWrist)
    );
    const ankleLift = averageValid(
        Math.abs((p.lHeel?.y || p.lAnkle?.y || 0) - (p.lAnkle?.y || 0)),
        Math.abs((p.rHeel?.y || p.rAnkle?.y || 0) - (p.rAnkle?.y || 0))
    );
    const hipWidth = Math.max(distance(p.lHip, p.rHip), 1);
    const footWidth = distance(p.lAnkle, p.rAnkle);
    const shoulderMid = midpoint(p.lShoulder, p.rShoulder);
    const ankleMid = midpoint(p.lAnkle, p.rAnkle);
    const hipMid = midpoint(p.lHip, p.rHip);
    const verticalBodySpan = Math.max(Math.abs(ankleMid.y - shoulderMid.y), 1);
    const hipDepthRatio = (hipMid.y - shoulderMid.y) / verticalBodySpan;
    const squatRise = roundTo(clamp(1 - hipDepthRatio, 0, 1), 2);

    return {
        knee: averageValid(leftKnee, rightKnee),
        frontKnee: Math.min(leftKnee || 180, rightKnee || 180),
        elbow: averageValid(leftElbow, rightElbow),
        hip: averageValid(leftHip, rightHip),
        shoulder,
        armRaise,
        ankleLift,
        torsoLean,
        bodyLine,
        kneeGapRatio: distance(p.lKnee, p.rKnee) / Math.max(distance(p.lAnkle, p.rAnkle), 1),
        footHipRatio: footWidth / hipWidth,
        hipDepthRatio,
        squatRise,
        shoulderHipOffset: Math.abs(midpoint(p.lShoulder, p.rShoulder).x - midpoint(p.lHip, p.rHip).x),
        elbowFlare: distance(p.lElbow, p.rElbow) / Math.max(distance(p.lShoulder, p.rShoulder), 1),
        wristElbowOffset: averageValid(
            Math.abs((p.lWrist?.x || 0) - (p.lElbow?.x || 0)),
            Math.abs((p.rWrist?.x || 0) - (p.rElbow?.x || 0))
        ),
    };
};

const isWorkingPhase = (phase) => phase === 'down';

const analyzeByExercise = (exerciseType, metrics, phase = 'up') => {
    if (exerciseType === 'squat') {
        const faults = [];
        if (
            (isWorkingPhase(phase) || metrics.squatRise < 0.52 || metrics.knee < 155)
            && metrics.knee > 135
            && metrics.squatRise > 0.42
        ) faults.push(['shallowDepth', ['lKnee', 'rKnee']]);
        if (Math.abs(metrics.torsoLean) > 28) faults.push(['backLean', ['neck', 'hipCenter']]);
        if (metrics.kneeGapRatio < 0.62) faults.push(['kneeCollapse', ['lKnee', 'rKnee']]);
        return buildAnalysis('squat', faults);
    }

    if (exerciseType === 'pushup') {
        const faults = [];
        if ((isWorkingPhase(phase) || metrics.elbow < 150) && metrics.elbow > 125) faults.push(['shallowDepth', ['lElbow', 'rElbow']]);
        if (Math.abs(metrics.bodyLine) > 16) faults.push(['hipSag', ['neck', 'hipCenter', 'lHip', 'rHip']]);
        if (metrics.elbowFlare > 1.7) faults.push(['elbowFlare', ['lElbow', 'rElbow']]);
        return buildAnalysis('pushup', faults);
    }

    if (exerciseType === 'lunge') {
        const faults = [];
        if ((isWorkingPhase(phase) || metrics.frontKnee < 155) && metrics.frontKnee > 135) faults.push(['shallowDepth', ['lKnee', 'rKnee']]);
        if (metrics.kneeGapRatio < 0.5) faults.push(['kneeDrift', ['lKnee', 'rKnee']]);
        if (Math.abs(metrics.torsoLean) > 24) faults.push(['torsoLean', ['neck', 'hipCenter']]);
        return buildAnalysis('lunge', faults);
    }

    if (exerciseType === 'plank') {
        const faults = [];
        if (metrics.bodyLine > 16) faults.push(['hipSag', ['hipCenter', 'lHip', 'rHip']]);
        if (metrics.bodyLine < -16) faults.push(['hipsHigh', ['hipCenter', 'lHip', 'rHip']]);
        if (metrics.shoulderHipOffset > 90) faults.push(['shoulderStack', ['lShoulder', 'rShoulder']]);
        return buildAnalysis('plank', faults);
    }

    if (exerciseType === 'shoulderPress') {
        const faults = [];
        if (isWorkingPhase(phase) && metrics.elbow < 145) faults.push(['incompleteLockout', ['lElbow', 'rElbow', 'lWrist', 'rWrist']]);
        if (metrics.elbowFlare > 2.1) faults.push(['wristDrift', ['lWrist', 'rWrist']]);
        if (Math.abs(metrics.torsoLean) > 22) faults.push(['backArch', ['neck', 'hipCenter']]);
        return buildAnalysis('shoulderPress', faults);
    }

    if (exerciseType === 'bicepCurl') {
        const faults = [];
        if (Math.abs(metrics.torsoLean) > 16) faults.push(['shoulderSwing', ['lShoulder', 'rShoulder', 'lElbow', 'rElbow']]);
        if (isWorkingPhase(phase) && metrics.elbow > 112) faults.push(['incompleteCurl', ['lElbow', 'rElbow']]);
        if (metrics.wristElbowOffset > 70) faults.push(['wristDrift', ['lWrist', 'rWrist']]);
        return buildAnalysis('bicepCurl', faults);
    }

    if (exerciseType === 'tricepDip') {
        const faults = [];
        if (metrics.elbow > 125) faults.push(['shallowDepth', ['lElbow', 'rElbow']]);
        if (metrics.shoulder < 28) faults.push(['shoulderShrug', ['lShoulder', 'rShoulder']]);
        if (metrics.shoulderHipOffset > 115) faults.push(['hipDrift', ['hipCenter', 'lHip', 'rHip']]);
        return buildAnalysis('tricepDip', faults);
    }

    if (exerciseType === 'deadlift') {
        const faults = [];
        if (Math.abs(metrics.bodyLine) > 22) faults.push(['roundedBack', ['neck', 'hipCenter']]);
        if (metrics.knee < 125) faults.push(['kneeDominant', ['lKnee', 'rKnee']]);
        if (metrics.shoulderHipOffset > 125) faults.push(['barDrift', ['lWrist', 'rWrist']]);
        return buildAnalysis('deadlift', faults);
    }

    if (exerciseType === 'row') {
        const faults = [];
        if (Math.abs(metrics.torsoLean) > 28) faults.push(['torsoRock', ['neck', 'hipCenter']]);
        if (metrics.elbow > 118) faults.push(['shortPull', ['lElbow', 'rElbow']]);
        if (metrics.shoulder < 35) faults.push(['shoulderShrug', ['lShoulder', 'rShoulder']]);
        return buildAnalysis('row', faults);
    }

    if (exerciseType === 'jumpingJack') {
        const faults = [];
        if (metrics.armRaise < 95) faults.push(['lowArms', ['lWrist', 'rWrist']]);
        if (metrics.footHipRatio < 1.35) faults.push(['narrowFeet', ['lAnkle', 'rAnkle']]);
        if (metrics.knee > 172) faults.push(['stiffLanding', ['lKnee', 'rKnee']]);
        return buildAnalysis('jumpingJack', faults);
    }

    if (exerciseType === 'mountainClimber') {
        const faults = [];
        if (Math.abs(metrics.bodyLine) > 18) faults.push(['hipHigh', ['hipCenter', 'lHip', 'rHip']]);
        if (metrics.frontKnee > 115) faults.push(['slowDrive', ['lKnee', 'rKnee']]);
        if (metrics.shoulderHipOffset > 105) faults.push(['shoulderStack', ['lShoulder', 'rShoulder']]);
        return buildAnalysis('mountainClimber', faults);
    }

    if (exerciseType === 'gluteBridge') {
        const faults = [];
        if (metrics.hip < 150) faults.push(['lowHips', ['hipCenter', 'lHip', 'rHip']]);
        if (Math.abs(metrics.bodyLine) > 24) faults.push(['overArch', ['neck', 'hipCenter']]);
        if (metrics.kneeGapRatio < 0.62) faults.push(['kneeDrift', ['lKnee', 'rKnee']]);
        return buildAnalysis('gluteBridge', faults);
    }

    if (exerciseType === 'calfRaise') {
        const faults = [];
        if (metrics.ankleLift < 15) faults.push(['lowLift', ['lAnkle', 'rAnkle']]);
        if (metrics.knee < 165) faults.push(['kneeBend', ['lKnee', 'rKnee']]);
        if (metrics.ankleLift > 35) faults.push(['rushing', ['lAnkle', 'rAnkle']]);
        return buildAnalysis('calfRaise', faults);
    }

    if (exerciseType === 'benchPress') {
        const faults = [];
        if (metrics.elbow > 128) faults.push(['shallowDepth', ['lElbow', 'rElbow']]);
        if (metrics.elbowFlare > 1.95) faults.push(['elbowFlare', ['lElbow', 'rElbow']]);
        if (metrics.wristElbowOffset > 75) faults.push(['wristStack', ['lWrist', 'rWrist']]);
        return buildAnalysis('benchPress', faults);
    }

    if (exerciseType === 'latPulldown') {
        const faults = [];
        if (metrics.elbow > 118) faults.push(['shortPull', ['lElbow', 'rElbow']]);
        if (Math.abs(metrics.torsoLean) > 22) faults.push(['torsoLean', ['neck', 'hipCenter']]);
        if (metrics.shoulder < 35) faults.push(['shoulderShrug', ['lShoulder', 'rShoulder']]);
        return buildAnalysis('latPulldown', faults);
    }

    if (exerciseType === 'pullup') {
        const faults = [];
        if (metrics.elbow > 112) faults.push(['shortPull', ['lElbow', 'rElbow']]);
        if (metrics.shoulder < 32) faults.push(['shoulderShrug', ['lShoulder', 'rShoulder']]);
        if (Math.abs(metrics.bodyLine) > 22) faults.push(['bodySwing', ['neck', 'hipCenter', 'lAnkle', 'rAnkle']]);
        return buildAnalysis('pullup', faults);
    }

    if (exerciseType === 'legPress') {
        const faults = [];
        if (metrics.knee > 136) faults.push(['shallowDepth', ['lKnee', 'rKnee']]);
        if (metrics.knee > 174) faults.push(['kneeLockout', ['lKnee', 'rKnee']]);
        if (metrics.kneeGapRatio < 0.62) faults.push(['kneeCollapse', ['lKnee', 'rKnee']]);
        return buildAnalysis('legPress', faults);
    }

    if (exerciseType === 'legExtension') {
        const faults = [];
        if (metrics.knee < 150) faults.push(['incompleteExtension', ['lKnee', 'rKnee']]);
        if (Math.abs(metrics.bodyLine) > 24) faults.push(['hipLift', ['hipCenter', 'lHip', 'rHip']]);
        if (metrics.knee > 176) faults.push(['rushing', ['lKnee', 'rKnee']]);
        return buildAnalysis('legExtension', faults);
    }

    if (exerciseType === 'legCurl') {
        const faults = [];
        if (metrics.knee > 120) faults.push(['incompleteCurl', ['lKnee', 'rKnee']]);
        if (Math.abs(metrics.bodyLine) > 24) faults.push(['hipLift', ['hipCenter', 'lHip', 'rHip']]);
        if (metrics.knee < 58) faults.push(['rushing', ['lKnee', 'rKnee']]);
        return buildAnalysis('legCurl', faults);
    }

    if (exerciseType === 'lateralRaise') {
        const faults = [];
        if (metrics.shoulder < 70) faults.push(['lowRaise', ['lShoulder', 'rShoulder', 'lWrist', 'rWrist']]);
        if (metrics.shoulder > 115) faults.push(['shoulderShrug', ['lShoulder', 'rShoulder']]);
        if (Math.abs(metrics.torsoLean) > 16) faults.push(['torsoSwing', ['neck', 'hipCenter']]);
        return buildAnalysis('lateralRaise', faults);
    }

    if (exerciseType === 'chestFly') {
        const faults = [];
        if (metrics.elbowFlare < 1.25) faults.push(['shortRange', ['lWrist', 'rWrist']]);
        if (metrics.elbow < 135) faults.push(['elbowBend', ['lElbow', 'rElbow']]);
        if (metrics.shoulder < 32) faults.push(['shoulderShrug', ['lShoulder', 'rShoulder']]);
        return buildAnalysis('chestFly', faults);
    }

    if (exerciseType === 'crunch') {
        const faults = [];
        if (metrics.shoulderHipOffset > 115) faults.push(['neckPull', ['head', 'neck']]);
        if (Math.abs(metrics.torsoLean) < 14) faults.push(['lowCurl', ['neck', 'hipCenter']]);
        if (Math.abs(metrics.torsoLean) > 42) faults.push(['fastTempo', ['neck', 'hipCenter']]);
        return buildAnalysis('crunch', faults);
    }

    return {
        formScore: 82,
        feedback: 'Pose locked. This exercise uses general alignment checks.',
        faultyJoints: [],
        faultyConnections: [],
    };
};

const buildAnalysis = (exerciseType, faults) => {
    const config = SUPPORTED_EXERCISES[exerciseType];
    const primaryFault = faults[0];
    const formScore = Math.max(45, 94 - faults.length * 22);
    const faultyJoints = [...new Set(faults.flatMap(([, joints]) => joints))];

    return {
        formScore,
        feedback: primaryFault ? config.faults[primaryFault[0]] : 'Great form. Keep this rhythm.',
        faultyJoints,
        faultyConnections: faultyJoints,
    };
};

const updateRepTracker = ({ exerciseType, config, metrics, previous, targetReps, manualCalibration = null }) => {
    if (!config || config.phaseMetric === 'hold') {
        return {
            ...previous,
            stableFrames: (previous.stableFrames || 0) + 1,
            framesSeen: (previous.framesSeen || 0) + 1,
            framesSinceRep: (previous.framesSinceRep || 0) + 1,
        };
    }

    const metric = Number.isFinite(metrics[config.phaseMetric])
        ? metrics[config.phaseMetric]
        : 180;
    const smoothedMetric = Number.isFinite(previous.smoothedMetric)
        ? roundTo(previous.smoothedMetric + (metric - previous.smoothedMetric) * METRIC_SMOOTHING_ALPHA, config.phaseMetric === 'squatRise' ? 2 : 0)
        : metric;
    let phase = previous.phase || 'up';
    let reps = previous.reps || 0;
    let repLockFrames = Math.max((previous.repLockFrames || 0) - 1, 0);
    let candidatePhase = previous.candidatePhase || phase;
    let candidateFrames = previous.candidateFrames || 0;
    let phaseFrames = (previous.phaseFrames || 0) + 1;
    let calibrationCycles = previous.calibrationCycles || 0;
    const framesSinceRep = (previous.framesSinceRep || 0) + 1;
    const metricMin = previous.metricMin == null ? smoothedMetric : Math.min(previous.metricMin, smoothedMetric);
    const metricMax = previous.metricMax == null ? smoothedMetric : Math.max(previous.metricMax, smoothedMetric);
    const movementRange = roundTo(metricMax - metricMin, config.phaseMetric === 'squatRise' ? 2 : 0) || 0;
    const framesSeen = (previous.framesSeen || 0) + 1;
    const minMovementRange = getMinMovementRange(exerciseType);
    const manualCalibrationReady = isManualCalibrationReady(manualCalibration);
    const manualCounting = !!(manualCalibrationReady && manualCalibration?.counting);
    const calibrated = manualCalibrationReady || (movementRange >= minMovementRange && framesSeen >= getMinCalibrationFrames(exerciseType));
    const thresholds = manualCalibrationReady
        ? getManualRepThresholds({ config, manualCalibration })
        : getRepThresholds({
            config,
            metricMin,
            metricMax,
            movementRange,
            calibrated,
        });
    const previousMetric = Number.isFinite(previous.lastMetric) ? previous.lastMetric : smoothedMetric;
    const metricDelta = smoothedMetric - previousMetric;
    const direction = Math.abs(metricDelta) <= getNoiseBand(config.phaseMetric)
        ? (previous.movementDirection || 'unknown')
        : (metricDelta > 0 ? 'rising' : 'falling');
    let sawDownPosition = !!previous.sawDownPosition;

    const transitionTo = (nextPhase) => {
        if (phase === nextPhase) return;
        const completedRep = phase === 'down' && nextPhase === 'up';
        phase = nextPhase;
        if (nextPhase === 'down') {
            sawDownPosition = true;
        }
        const heldBottomLongEnough = phaseFrames >= getMinDownFrames(exerciseType);
        phaseFrames = 0;
        if (
            calibrated
            && completedRep
            && sawDownPosition
            && heldBottomLongEnough
            && repLockFrames === 0
            && framesSinceRep >= getMinFramesBetweenReps(exerciseType)
        ) {
            if (!manualCounting && calibrationCycles < getRequiredCalibrationCycles(exerciseType)) {
                calibrationCycles += 1;
            } else {
                reps += 1;
            }
            repLockFrames = getRepLockFrames(exerciseType);
            sawDownPosition = false;
        }
    };

    let requestedPhase = phase;
    const countingAllowed = !manualCalibration?.enabled || manualCounting;
    if (countingAllowed && config.reverseRep) {
        if (phase === 'up' && smoothedMetric >= thresholds.downThreshold) {
            requestedPhase = 'down';
        } else if (phase === 'down' && smoothedMetric <= thresholds.upThreshold) {
            requestedPhase = 'up';
        }
    } else if (countingAllowed && phase === 'up' && smoothedMetric <= thresholds.downThreshold) {
        requestedPhase = 'down';
    } else if (countingAllowed && phase === 'down' && smoothedMetric >= thresholds.upThreshold) {
        requestedPhase = 'up';
    }

    if (requestedPhase !== phase) {
        if (candidatePhase === requestedPhase) {
            candidateFrames += 1;
        } else {
            candidatePhase = requestedPhase;
            candidateFrames = 1;
        }

        if (candidateFrames >= getRequiredTransitionFrames(exerciseType)) {
            transitionTo(requestedPhase);
            candidatePhase = phase;
            candidateFrames = 0;
        }
    } else {
        candidatePhase = phase;
        candidateFrames = 0;
    }

    return {
        ...previous,
        phase,
        reps: targetReps ? Math.min(reps, targetReps) : reps,
        repLockFrames,
        metricMin,
        metricMax,
        movementRange,
        calibrated,
        dynamicDownThreshold: thresholds.downThreshold,
        dynamicUpThreshold: thresholds.upThreshold,
        framesSeen,
        lastMetric: smoothedMetric,
        movementDirection: direction,
        sawDownPosition,
        candidatePhase,
        candidateFrames,
        framesSinceRep: reps > (previous.reps || 0) ? 0 : framesSinceRep,
        phaseFrames,
        smoothedMetric,
        calibrationCycles,
        calibrationComplete: manualCounting || calibrationCycles >= getRequiredCalibrationCycles(exerciseType),
        manualCalibrationReady,
        manualCounting,
    };
};

const getRequiredTransitionFrames = (exerciseType) => {
    return getTimingProfile(exerciseType).requiredTransitionFrames;
};

const getRepLockFrames = (exerciseType) => {
    return getTimingProfile(exerciseType).repLockFrames;
};

const getMinFramesBetweenReps = (exerciseType) => {
    return getTimingProfile(exerciseType).minFramesBetweenReps;
};

const getMinDownFrames = (exerciseType) => {
    return getTimingProfile(exerciseType).minDownFrames;
};

const getMinCalibrationFrames = (exerciseType) => {
    return getTimingProfile(exerciseType).minCalibrationFrames;
};

const getRequiredCalibrationCycles = (exerciseType) => {
    if (exerciseType === 'jumpingJack' || exerciseType === 'mountainClimber') return 1;
    return 2;
};

const getTimingProfile = (exerciseType) => {
    const profileName = EXERCISE_TIMING_PROFILE[exerciseType] || 'strength';
    return REP_TIMING_PROFILES[profileName] || REP_TIMING_PROFILES.strength;
};

const getNoiseBand = (phaseMetric) => {
    if (phaseMetric === 'squatRise' || phaseMetric === 'elbowFlare') return 0.02;
    if (phaseMetric === 'ankleLift') return 3;
    return 6;
};

const getRepThresholds = ({ config, metricMin, metricMax, movementRange, calibrated }) => {
    if (!calibrated) {
        return config.reverseRep
            ? { downThreshold: config.upAbove, upThreshold: config.downBelow }
            : { downThreshold: config.downBelow, upThreshold: config.upAbove };
    }

    if (config.reverseRep) {
        return {
            downThreshold: roundTo(metricMax - movementRange * 0.25, config.phaseMetric === 'squatRise' ? 2 : 0),
            upThreshold: roundTo(metricMin + movementRange * 0.42, config.phaseMetric === 'squatRise' ? 2 : 0),
        };
    }

    return {
        downThreshold: roundTo(metricMin + movementRange * 0.35, config.phaseMetric === 'squatRise' ? 2 : 0),
        upThreshold: roundTo(metricMin + movementRange * 0.7, config.phaseMetric === 'squatRise' ? 2 : 0),
    };
};

const isManualCalibrationReady = (manualCalibration) => (
    !!manualCalibration?.enabled
    && Number.isFinite(manualCalibration.startMetric)
    && Number.isFinite(manualCalibration.endMetric)
    && Math.abs(manualCalibration.startMetric - manualCalibration.endMetric) > 0
);

const getManualRepThresholds = ({ config, manualCalibration }) => {
    const start = manualCalibration.startMetric;
    const end = manualCalibration.endMetric;
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    const range = Math.max(high - low, config.phaseMetric === 'squatRise' ? 0.08 : 12);
    const decimals = config.phaseMetric === 'squatRise' || config.phaseMetric === 'elbowFlare' ? 2 : 0;

    if (config.reverseRep) {
        return {
            downThreshold: roundTo(high - range * 0.22, decimals),
            upThreshold: roundTo(low + range * 0.22, decimals),
        };
    }

    return {
        downThreshold: roundTo(low + range * 0.22, decimals),
        upThreshold: roundTo(high - range * 0.22, decimals),
    };
};

const getMinMovementRange = (exerciseType) => (
    POSEFORM_TEMPLATE_DATASET[exerciseType]?.minMovementRange
    ?? POSEFORM_TEMPLATE_DATASET.general.minMovementRange
);

const getMovementRangeFeedback = (exerciseType, tracker) => {
    if (!tracker || tracker.reps > 0 || tracker.framesSeen < 5) return '';
    const template = POSEFORM_TEMPLATE_DATASET[exerciseType] || POSEFORM_TEMPLATE_DATASET.general;
    if (!tracker.calibrated) return template.rangeCue;
    const requiredCycles = getRequiredCalibrationCycles(exerciseType);
    if ((tracker.calibrationCycles || 0) < requiredCycles) {
        return `Calibration ${tracker.calibrationCycles || 0}/${requiredCycles}: do ${requiredCycles} slow clean practice reps before counting starts.`;
    }
    return '';
};

const getManualCalibrationFeedback = (manualCalibration) => {
    if (!manualCalibration?.enabled) return '';
    if (!Number.isFinite(manualCalibration.startMetric)) {
        return 'Hold the start position still so I can learn it automatically.';
    }
    if (!Number.isFinite(manualCalibration.endMetric)) {
        return 'Do one slow full demo rep and hold the end position.';
    }
    if (!manualCalibration.counting) {
        return 'Return to the start position. Counting will begin automatically.';
    }
    return '';
};

const midpoint = (a, b) => ({
    x: ((a?.x || 0) + (b?.x || 0)) / 2,
    y: ((a?.y || 0) + (b?.y || 0)) / 2,
});

const angle = (a, b, c) => {
    if (!a || !b || !c) return null;
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
    const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
    if (!magAB || !magCB) return null;
    const cosine = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
    return Math.round((Math.acos(cosine) * 180) / Math.PI);
};

const lineAngle = (a, b) => {
    if (!a || !b) return 0;
    return Math.round((Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI);
};

const distance = (a, b) => {
    if (!a || !b) return 0;
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
};

const averageValid = (...values) => {
    const valid = values.filter((value) => Number.isFinite(value));
    if (!valid.length) return null;
    return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
};

const roundTo = (value, decimals = 2) => {
    if (!Number.isFinite(value)) return null;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};

const clamp = (value, min, max) => {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
};
