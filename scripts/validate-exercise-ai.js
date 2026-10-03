const fs = require('fs');
const vm = require('vm');

const poseTemplateDataset = JSON.parse(fs.readFileSync('ml/exercise_ai/poseform_pose_templates.json', 'utf8'));
const source = fs.readFileSync('src/ai/exerciseFormModel.js', 'utf8')
  .replace(/export const /g, 'const ')
  + '\nmodule.exports = { getExerciseModelType, analyzeExercisePose, createExerciseTracker, parseTargetReps, getSupportedExerciseNames };';

const sandbox = { module: { exports: {} }, exports: {}, console, Math, Number, String };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const {
  getExerciseModelType,
  analyzeExercisePose,
  createExerciseTracker,
  parseTargetReps,
  getSupportedExerciseNames,
} = sandbox.module.exports;

const base = () => ({
  head: { x: 200, y: 40 },
  neck: { x: 200, y: 80 },
  lShoulder: { x: 160, y: 90 },
  rShoulder: { x: 240, y: 90 },
  lElbow: { x: 150, y: 160 },
  rElbow: { x: 250, y: 160 },
  lWrist: { x: 145, y: 225 },
  rWrist: { x: 255, y: 225 },
  hipCenter: { x: 200, y: 210 },
  lHip: { x: 175, y: 210 },
  rHip: { x: 225, y: 210 },
  lKnee: { x: 175, y: 330 },
  rKnee: { x: 225, y: 330 },
  lAnkle: { x: 175, y: 450 },
  rAnkle: { x: 225, y: 450 },
});

const squatDown = () => ({
  ...base(),
  lHip: { x: 150, y: 250 },
  rHip: { x: 250, y: 250 },
  hipCenter: { x: 200, y: 250 },
  lKnee: { x: 150, y: 340 },
  rKnee: { x: 250, y: 340 },
  lAnkle: { x: 240, y: 340 },
  rAnkle: { x: 160, y: 340 },
});

const pushupUp = () => ({
  ...base(),
  neck: { x: 95, y: 160 },
  lShoulder: { x: 100, y: 170 },
  rShoulder: { x: 100, y: 170 },
  lElbow: { x: 200, y: 170 },
  rElbow: { x: 200, y: 170 },
  lWrist: { x: 300, y: 170 },
  rWrist: { x: 300, y: 170 },
  hipCenter: { x: 210, y: 175 },
  lHip: { x: 210, y: 175 },
  rHip: { x: 210, y: 175 },
  lKnee: { x: 310, y: 180 },
  rKnee: { x: 310, y: 180 },
  lAnkle: { x: 420, y: 185 },
  rAnkle: { x: 420, y: 185 },
});

const pushupDown = () => ({
  ...pushupUp(),
  lWrist: { x: 200, y: 265 },
  rWrist: { x: 200, y: 265 },
});

const curlExtended = () => ({
  ...base(),
  lShoulder: { x: 165, y: 90 },
  rShoulder: { x: 235, y: 90 },
  lElbow: { x: 165, y: 170 },
  rElbow: { x: 235, y: 170 },
  lWrist: { x: 165, y: 250 },
  rWrist: { x: 235, y: 250 },
});

const curlFlexed = () => ({
  ...curlExtended(),
  lWrist: { x: 135, y: 120 },
  rWrist: { x: 265, y: 120 },
});

const shoulderPressBottom = () => ({
  ...base(),
  lShoulder: { x: 165, y: 100 },
  rShoulder: { x: 235, y: 100 },
  lElbow: { x: 165, y: 170 },
  rElbow: { x: 235, y: 170 },
  lWrist: { x: 230, y: 170 },
  rWrist: { x: 170, y: 170 },
});

const shoulderPressTop = () => ({
  ...shoulderPressBottom(),
  lElbow: { x: 160, y: 70 },
  rElbow: { x: 240, y: 70 },
  lWrist: { x: 160, y: 20 },
  rWrist: { x: 240, y: 20 },
});

const shallowSquat = () => ({
  ...base(),
  lHip: { x: 175, y: 270 },
  rHip: { x: 225, y: 270 },
  hipCenter: { x: 200, y: 270 },
  lKnee: { x: 175, y: 340 },
  rKnee: { x: 225, y: 340 },
  lAnkle: { x: 230, y: 410 },
  rAnkle: { x: 170, y: 410 },
});

const smallSquatDip = () => ({
  ...base(),
  lHip: { x: 172, y: 226 },
  rHip: { x: 228, y: 226 },
  hipCenter: { x: 200, y: 226 },
  lKnee: { x: 172, y: 338 },
  rKnee: { x: 228, y: 338 },
  lAnkle: { x: 184, y: 448 },
  rAnkle: { x: 216, y: 448 },
});

const missingBody = () => ({
  lShoulder: { x: 160, y: 90 },
  rShoulder: { x: 240, y: 90 },
});

const badPushupSag = () => ({
  ...pushupUp(),
  hipCenter: { x: 210, y: 250 },
  lHip: { x: 210, y: 250 },
  rHip: { x: 210, y: 250 },
});

const badBenchPress = () => ({
  ...base(),
  lShoulder: { x: 165, y: 140 },
  rShoulder: { x: 235, y: 140 },
  lElbow: { x: 120, y: 170 },
  rElbow: { x: 280, y: 170 },
  lWrist: { x: 80, y: 170 },
  rWrist: { x: 320, y: 170 },
});

const badLateralRaise = () => ({
  ...base(),
  lShoulder: { x: 165, y: 100 },
  rShoulder: { x: 235, y: 100 },
  lElbow: { x: 150, y: 160 },
  rElbow: { x: 250, y: 160 },
  lWrist: { x: 135, y: 210 },
  rWrist: { x: 265, y: 210 },
});

const badLegPress = () => ({
  ...base(),
  lHip: { x: 175, y: 260 },
  rHip: { x: 225, y: 260 },
  hipCenter: { x: 200, y: 260 },
  lKnee: { x: 190, y: 340 },
  rKnee: { x: 210, y: 340 },
  lAnkle: { x: 160, y: 430 },
  rAnkle: { x: 240, y: 430 },
});

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const analyzeStableFault = (exerciseName, skeleton) => {
  let tracker = createExerciseTracker();
  tracker = analyzeExercisePose({ exerciseName, skeleton, previous: tracker }).tracker;
  return analyzeExercisePose({ exerciseName, skeleton, previous: tracker });
};

const buildManualCalibration = (exerciseName, startSkeleton, endSkeleton) => {
  let tracker = createExerciseTracker();
  const start = analyzeExercisePose({
    exerciseName,
    skeleton: startSkeleton,
    previous: tracker,
    manualCalibration: { enabled: false },
  });
  tracker = start.tracker;
  const end = analyzeExercisePose({
    exerciseName,
    skeleton: endSkeleton,
    previous: tracker,
    manualCalibration: { enabled: false },
  });
  return {
    enabled: true,
    exerciseId: `${exerciseName}-validation`,
    startMetric: start.metrics.activeMetric,
    endMetric: end.metrics.activeMetric,
    counting: true,
  };
};

const runControlledRep = (exerciseName, startSkeleton, endSkeleton) => {
  const manualCalibration = buildManualCalibration(exerciseName, startSkeleton, endSkeleton);
  let tracker = createExerciseTracker();
  const frames = [
    ...Array(8).fill(startSkeleton),
    ...Array(7).fill(endSkeleton),
    ...Array(9).fill(startSkeleton),
  ];
  let result = null;
  frames.forEach((skeleton) => {
    result = analyzeExercisePose({
      exerciseName,
      skeleton,
      previous: tracker,
      targetReps: 10,
      manualCalibration,
    });
    tracker = result.tracker;
  });
  return result;
};

test('detects expanded exercise labels', () => {
  assert(getSupportedExerciseNames().length >= 20, 'expected expanded supported exercise set');
  const aliases = {
    'Goblet Squat': 'squat',
    'Incline Push Up': 'pushup',
    'Walking Lunges': 'lunge',
    'Forearm Plank': 'plank',
    'Military Press': 'shoulderPress',
    'Dumbbell Curl': 'bicepCurl',
    'Bench Dips': 'tricepDip',
    'Romanian Deadlift': 'deadlift',
    'Dumbbell Row': 'row',
    'Jumping Jacks': 'jumpingJack',
    'Mountain Climbers': 'mountainClimber',
    'Hip Thrust': 'gluteBridge',
    'Standing Calf Raises': 'calfRaise',
    'Barbell Bench Press': 'benchPress',
    'Lat Pulldown': 'latPulldown',
    'Pull Ups': 'pullup',
    'Leg Press': 'legPress',
    'Leg Extensions': 'legExtension',
    'Hamstring Curl': 'legCurl',
    'Side Lateral Raise': 'lateralRaise',
    'Pec Deck': 'chestFly',
    'Ab Crunch': 'crunch',
  };

  Object.entries(aliases).forEach(([name, type]) => {
    assert(getExerciseModelType(name) === type, `${name} should map to ${type}, got ${getExerciseModelType(name)}`);
  });
});

test('custom pose template dataset covers every supported exercise', () => {
  const supportedTypes = new Set([
    'squat',
    'pushup',
    'lunge',
    'plank',
    'shoulderPress',
    'bicepCurl',
    'tricepDip',
    'deadlift',
    'row',
    'jumpingJack',
    'mountainClimber',
    'gluteBridge',
    'calfRaise',
    'benchPress',
    'latPulldown',
    'pullup',
    'legPress',
    'legExtension',
    'legCurl',
    'lateralRaise',
    'chestFly',
    'crunch',
  ]);
  supportedTypes.forEach((type) => {
    const template = poseTemplateDataset.templates[type];
    assert(template, `missing pose template for ${type}`);
    assert(template.primaryMetric, `${type} template missing primary metric`);
    assert(Number.isFinite(template.minimumMovementRange), `${type} template missing minimum movement range`);
    assert(Array.isArray(template.views) && template.views.length > 0, `${type} template missing camera views`);
    assert(Array.isArray(template.faults) && template.faults.length > 0, `${type} template missing fault labels`);
  });
  ['front', 'side', 'threeQuarter', 'lowPhone', 'closePhone'].forEach((view) => {
    assert(poseTemplateDataset.cameraViewProfiles[view], `missing camera view profile ${view}`);
  });
});

test('parses target reps from common workout strings', () => {
  assert(parseTargetReps('10-12') === 10, 'range reps failed');
  assert(parseTargetReps('Max') === null, 'max reps should not cap');
});

test('returns scanning when body visibility is too low', () => {
  const result = analyzeExercisePose({ exerciseName: 'Squats', skeleton: missingBody() });
  assert(result.postureState === 'SCANNING', 'low visibility should scan');
});

test('keeps ready stance as correct before the rep starts', () => {
  const result = analyzeExercisePose({ exerciseName: 'Squats', skeleton: base() });
  assert(result.postureState === 'CORRECT', 'standing ready stance should not be punished as shallow');
  assert(result.formScore >= 85, `expected high ready score, got ${result.formScore}`);
});

test('counts squat rep from up-down-up sequence', () => {
  const result = runControlledRep('Squats', base(), squatDown());
  assert(result.repCount === 1, `expected 1 squat rep, got ${result.repCount}`);
});

test('calibrates squat from guided start and end positions', () => {
  const manualCalibration = buildManualCalibration('Squats', base(), squatDown());
  let tracker = createExerciseTracker();
  const result = analyzeExercisePose({
    exerciseName: 'Squats',
    skeleton: base(),
    previous: tracker,
    manualCalibration,
  });
  assert(result.metrics.calibrated === true, 'expected squat tracker to calibrate from guided start/end positions');
  assert(result.metrics.manualCalibrationReady === true, 'expected manual calibration to be ready');
  assert(Number.isFinite(result.metrics.dynamicDownThreshold), 'expected dynamic down threshold');
  assert(Number.isFinite(result.metrics.dynamicUpThreshold), 'expected dynamic up threshold');
});

test('rejects sparse skipped camera frames as reps', () => {
  const manualCalibration = buildManualCalibration('Squats', base(), squatDown());
  let tracker = createExerciseTracker();
  const sparseFrames = [base(), squatDown(), base(), squatDown(), base(), squatDown(), base()];
  sparseFrames.forEach((skeleton) => {
    tracker = analyzeExercisePose({
      exerciseName: 'Squats',
      skeleton,
      previous: tracker,
      targetReps: 10,
      manualCalibration,
    }).tracker;
  });
  const result = analyzeExercisePose({
    exerciseName: 'Squats',
    skeleton: base(),
    previous: tracker,
    targetReps: 10,
    manualCalibration,
  });
  assert(result.repCount === 0, `sparse skipped frames should not count reps, got ${result.repCount}`);
});

test('does not count tiny squat movement and gives range cue', () => {
  let tracker = createExerciseTracker();
  for (let i = 0; i < 6; i += 1) {
    const skeleton = i % 2 === 0 ? base() : smallSquatDip();
    tracker = analyzeExercisePose({ exerciseName: 'Squats', skeleton, previous: tracker }).tracker;
  }
  const result = analyzeExercisePose({ exerciseName: 'Squats', skeleton: smallSquatDip(), previous: tracker });
  assert(result.repCount === 0, `tiny movement should not count reps, got ${result.repCount}`);
  assert(result.feedback.toLowerCase().includes('deeper'), `expected range cue, got "${result.feedback}"`);
});

test('counts push-up rep from up-down-up sequence', () => {
  const result = runControlledRep('Push Ups', pushupUp(), pushupDown());
  assert(result.repCount === 1, `expected 1 push-up rep, got ${result.repCount}`);
});

test('counts bicep curl rep from extended-flexed-extended sequence', () => {
  const result = runControlledRep('Dumbbell Curl', curlExtended(), curlFlexed());
  assert(result.repCount === 1, `expected 1 curl rep, got ${result.repCount}`);
});

test('counts shoulder press rep from bottom-top sequence', () => {
  const result = runControlledRep('Shoulder Press', shoulderPressBottom(), shoulderPressTop());
  assert(result.repCount === 1, `expected 1 shoulder press rep, got ${result.repCount}`);
});

test('flags shallow squat as incorrect', () => {
  const result = analyzeStableFault('Squats', shallowSquat());
  assert(result.postureState === 'INCORRECT', 'shallow squat should be incorrect');
  assert(result.feedback.toLowerCase().includes('lower'), 'expected depth feedback');
});

test('flags sagging push-up as incorrect', () => {
  const result = analyzeStableFault('Push Ups', badPushupSag());
  assert(result.postureState === 'INCORRECT', 'sagging push-up should be incorrect');
  assert(result.faultyJoints.includes('hipCenter') || result.faultyJoints.includes('lHip'), 'expected hip/core fault');
});

test('flags bench press elbow flare/wrist stack issue', () => {
  const result = analyzeStableFault('Bench Press', badBenchPress());
  assert(result.postureState === 'INCORRECT', 'bad bench press should be incorrect');
  assert(result.faultyJoints.includes('lElbow') || result.faultyJoints.includes('lWrist'), 'expected bench faulty upper-body joints');
});

test('flags low lateral raise as incorrect', () => {
  const result = analyzeStableFault('Lateral Raise', badLateralRaise());
  assert(result.postureState === 'INCORRECT', 'low lateral raise should be incorrect');
  assert(result.feedback.toLowerCase().includes('raise'), 'expected raise feedback');
});

test('flags leg press knee collapse as incorrect', () => {
  const result = analyzeStableFault('Leg Press', badLegPress());
  assert(result.postureState === 'INCORRECT', 'bad leg press should be incorrect');
  assert(result.faultyJoints.includes('lKnee') || result.faultyJoints.includes('rKnee'), 'expected knee fault');
});

let passed = 0;
tests.forEach(({ name, fn }) => {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
});

console.log(`\nPoseForm validation passed ${passed}/${tests.length} tests.`);
