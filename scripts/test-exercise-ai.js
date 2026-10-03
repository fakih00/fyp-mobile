const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('src/ai/exerciseFormModel.js', 'utf8')
    .replace(/export const /g, 'const ')
    .replace(/export function /g, 'function ')
    + '\nmodule.exports = { analyzeExercisePose, createExerciseTracker };';

const context = { module: { exports: {} }, console };
vm.createContext(context);
vm.runInContext(source, context);

const { analyzeExercisePose, createExerciseTracker } = context.module.exports;

const score = 0.95;
const pt = (x, y) => ({ x, y, score });

function squatSkeleton(phase) {
    const hipY = 470 + phase * 170;
    const kneeY = 650 - phase * 35;
    const kneeSpread = 34 + phase * 28;
    return {
        head: pt(200, 120),
        neck: pt(200, 175),
        lShoulder: pt(155, 210),
        rShoulder: pt(245, 210),
        lElbow: pt(140, 320),
        rElbow: pt(260, 320),
        lWrist: pt(135, 430),
        rWrist: pt(265, 430),
        hipCenter: pt(200, hipY),
        lHip: pt(170, hipY),
        rHip: pt(230, hipY),
        lKnee: pt(200 - kneeSpread, kneeY),
        rKnee: pt(200 + kneeSpread, kneeY),
        lAnkle: pt(156, 830),
        rAnkle: pt(244, 830),
        lHeel: pt(156, 835),
        rHeel: pt(244, 835),
    };
}

function analyzeSquat(tracker, phase, manualCalibration) {
    return analyzeExercisePose({
        exerciseName: 'Squat',
        skeleton: squatSkeleton(phase),
        previous: tracker,
        targetReps: 10,
        manualCalibration,
    });
}

function getSquatCalibration() {
    let tracker = createExerciseTracker();
    const top = analyzeSquat(tracker, 0, { enabled: false });
    const bottom = analyzeSquat(top.tracker, 1, { enabled: false });
    return {
        enabled: true,
        exerciseId: 'test-squat',
        startMetric: top.metrics.activeMetric,
        endMetric: bottom.metrics.activeMetric,
        counting: true,
    };
}

function runRealRepTest() {
    const calibration = getSquatCalibration();
    let tracker = createExerciseTracker();
    const frames = [];
    const hold = (phase, count) => {
        for (let i = 0; i < count; i += 1) frames.push(phase);
    };

    hold(0, 8);
    for (let rep = 0; rep < 4; rep += 1) {
        hold(0.25, 3);
        hold(0.55, 3);
        hold(1, 5);
        hold(0.55, 3);
        hold(0.25, 3);
        hold(0, 7);
    }

    frames.forEach((phase) => {
        tracker = analyzeSquat(tracker, phase, calibration).tracker;
    });

    return { name: 'counts four controlled squats', expected: 4, actual: tracker.reps };
}

function runNoiseTest() {
    const calibration = getSquatCalibration();
    let tracker = createExerciseTracker();
    const noisyStanding = [0, 0.03, 0.05, 0.02, 0.06, 0.01, 0.04, 0.05, 0, 0.03];
    for (let loop = 0; loop < 8; loop += 1) {
        noisyStanding.forEach((phase) => {
            tracker = analyzeSquat(tracker, phase, calibration).tracker;
        });
    }
    return { name: 'ignores standing jitter', expected: 0, actual: tracker.reps };
}

const results = [runRealRepTest(), runNoiseTest()];
const failed = results.filter((result) => result.expected !== result.actual);
console.log(JSON.stringify({ passed: failed.length === 0, results }, null, 2));

if (failed.length) {
    process.exit(1);
}
