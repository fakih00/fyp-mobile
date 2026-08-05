const MIN_CONFIDENCE = 0.5;

const SUPPORTED_EXERCISES = {
    squat: {
        labels: ['squat', 'jump squat', 'bodyweight squat', 'goblet squat'],
        phaseMetric: 'knee',
        downBelow: 112,
        upAbove: 158,
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
        labels: ['bicep curl', 'bicep curls', 'curl', 'curls'],
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
};

export const getSupportedExerciseNames = () => Object.values(SUPPORTED_EXERCISES)
    .map((exercise) => exercise.labels[0]);

export const getExerciseModelType = (exerciseName = '') => {
    const normalized = exerciseName.toLowerCase();
    return Object.entries(SUPPORTED_EXERCISES).find(([, config]) => (
        config.labels.some((label) => normalized.includes(label))
    ))?.[0] || 'general';
};

export const createExerciseTracker = () => ({
    phase: 'up',
    reps: 0,
    lastFeedback: 'Stand fully in frame so PoseForm can lock your joints.',
    stableFrames: 0,
    lastScore: 0,
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
    const analysis = analyzeByExercise(exerciseType, metrics, skeleton);
    const nextTracker = updateRepTracker({
        exerciseType,
        config: SUPPORTED_EXERCISES[exerciseType],
        metrics,
        previous,
        targetReps,
    });

    const postureState = analysis.formScore >= 76 ? 'CORRECT' : 'INCORRECT';
    const feedback = analysis.feedback || (postureState === 'CORRECT'
        ? 'Strong form. Keep the tempo controlled.'
        : 'Adjust your form before the next rep.');

    return {
        tracker: {
            ...nextTracker,
            lastFeedback: feedback,
            lastScore: analysis.formScore,
        },
        exerciseType,
        postureState,
        feedback,
        formScore: analysis.formScore,
        repCount: nextTracker.reps,
        phase: nextTracker.phase,
        faultyJoints: analysis.faultyJoints,
        faultyConnections: analysis.faultyConnections,
        metrics,
    };
};

const estimateVisibility = (skeleton) => {
    const required = ['lShoulder', 'rShoulder', 'lHip', 'rHip', 'lKnee', 'rKnee', 'lAnkle', 'rAnkle'];
    const visible = required.filter((joint) => {
        const point = skeleton[joint];
        return point && Number.isFinite(point.x) && Number.isFinite(point.y);
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
        shoulderHipOffset: Math.abs(midpoint(p.lShoulder, p.rShoulder).x - midpoint(p.lHip, p.rHip).x),
        elbowFlare: distance(p.lElbow, p.rElbow) / Math.max(distance(p.lShoulder, p.rShoulder), 1),
        wristElbowOffset: averageValid(
            Math.abs((p.lWrist?.x || 0) - (p.lElbow?.x || 0)),
            Math.abs((p.rWrist?.x || 0) - (p.rElbow?.x || 0))
        ),
    };
};

const analyzeByExercise = (exerciseType, metrics) => {
    if (exerciseType === 'squat') {
        const faults = [];
        if (metrics.knee > 135) faults.push(['shallowDepth', ['lKnee', 'rKnee']]);
        if (Math.abs(metrics.torsoLean) > 28) faults.push(['backLean', ['neck', 'hipCenter']]);
        if (metrics.kneeGapRatio < 0.62) faults.push(['kneeCollapse', ['lKnee', 'rKnee']]);
        return buildAnalysis('squat', faults);
    }

    if (exerciseType === 'pushup') {
        const faults = [];
        if (metrics.elbow > 125) faults.push(['shallowDepth', ['lElbow', 'rElbow']]);
        if (Math.abs(metrics.bodyLine) > 16) faults.push(['hipSag', ['neck', 'hipCenter', 'lHip', 'rHip']]);
        if (metrics.elbowFlare > 1.7) faults.push(['elbowFlare', ['lElbow', 'rElbow']]);
        return buildAnalysis('pushup', faults);
    }

    if (exerciseType === 'lunge') {
        const faults = [];
        if (metrics.frontKnee > 135) faults.push(['shallowDepth', ['lKnee', 'rKnee']]);
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
        if (metrics.elbow < 145) faults.push(['incompleteLockout', ['lElbow', 'rElbow', 'lWrist', 'rWrist']]);
        if (metrics.elbowFlare > 2.1) faults.push(['wristDrift', ['lWrist', 'rWrist']]);
        if (Math.abs(metrics.torsoLean) > 22) faults.push(['backArch', ['neck', 'hipCenter']]);
        return buildAnalysis('shoulderPress', faults);
    }

    if (exerciseType === 'bicepCurl') {
        const faults = [];
        if (Math.abs(metrics.torsoLean) > 16) faults.push(['shoulderSwing', ['lShoulder', 'rShoulder', 'lElbow', 'rElbow']]);
        if (metrics.elbow > 112) faults.push(['incompleteCurl', ['lElbow', 'rElbow']]);
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

const updateRepTracker = ({ exerciseType, config, metrics, previous, targetReps }) => {
    if (!config || config.phaseMetric === 'hold') {
        return {
            ...previous,
            stableFrames: (previous.stableFrames || 0) + 1,
        };
    }

    const metric = metrics[config.phaseMetric] || 180;
    let phase = previous.phase || 'up';
    let reps = previous.reps || 0;

    if (config.reverseRep) {
        if (phase === 'up' && metric > config.upAbove) {
            phase = 'down';
        } else if (phase === 'down' && metric < config.downBelow) {
            phase = 'up';
            reps += 1;
        }
    } else if (phase === 'up' && metric < config.downBelow) {
        phase = 'down';
    } else if (phase === 'down' && metric > config.upAbove) {
        phase = 'up';
        reps += 1;
    }

    return {
        ...previous,
        phase,
        reps: targetReps ? Math.min(reps, targetReps) : reps,
    };
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
