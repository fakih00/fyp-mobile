const fs = require('fs');
const vm = require('vm');

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

const shallowSquat = () => ({
  ...base(),
  lHip: { x: 175, y: 255 },
  rHip: { x: 225, y: 255 },
  hipCenter: { x: 200, y: 255 },
  lKnee: { x: 175, y: 335 },
  rKnee: { x: 225, y: 335 },
  lAnkle: { x: 185, y: 450 },
  rAnkle: { x: 215, y: 450 },
});

const missingBody = () => ({
  lShoulder: { x: 160, y: 90 },
  rShoulder: { x: 240, y: 90 },
});

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

test('detects expanded exercise labels', () => {
  assert(getSupportedExerciseNames().length >= 12, 'expected expanded supported exercise set');
  assert(getExerciseModelType('Romanian Deadlift') === 'deadlift', 'deadlift alias failed');
  assert(getExerciseModelType('Standing Calf Raises') === 'calfRaise', 'calf raise alias failed');
  assert(getExerciseModelType('Dumbbell Row') === 'row', 'row alias failed');
  assert(getExerciseModelType('Mountain Climbers') === 'mountainClimber', 'mountain climber alias failed');
});

test('parses target reps from common workout strings', () => {
  assert(parseTargetReps('10-12') === 10, 'range reps failed');
  assert(parseTargetReps('Max') === null, 'max reps should not cap');
});

test('returns scanning when body visibility is too low', () => {
  const result = analyzeExercisePose({ exerciseName: 'Squats', skeleton: missingBody() });
  assert(result.postureState === 'SCANNING', 'low visibility should scan');
});

test('counts squat rep from up-down-up sequence', () => {
  let tracker = createExerciseTracker();
  tracker = analyzeExercisePose({ exerciseName: 'Squats', skeleton: base(), previous: tracker }).tracker;
  tracker = analyzeExercisePose({ exerciseName: 'Squats', skeleton: squatDown(), previous: tracker }).tracker;
  const result = analyzeExercisePose({ exerciseName: 'Squats', skeleton: base(), previous: tracker });
  assert(result.repCount === 1, `expected 1 squat rep, got ${result.repCount}`);
});

test('counts push-up rep from up-down-up sequence', () => {
  let tracker = createExerciseTracker();
  tracker = analyzeExercisePose({ exerciseName: 'Push Ups', skeleton: pushupUp(), previous: tracker }).tracker;
  tracker = analyzeExercisePose({ exerciseName: 'Push Ups', skeleton: pushupDown(), previous: tracker }).tracker;
  const result = analyzeExercisePose({ exerciseName: 'Push Ups', skeleton: pushupUp(), previous: tracker });
  assert(result.repCount === 1, `expected 1 push-up rep, got ${result.repCount}`);
});

test('flags shallow squat as incorrect', () => {
  const result = analyzeExercisePose({ exerciseName: 'Squats', skeleton: shallowSquat() });
  assert(result.postureState === 'INCORRECT', 'shallow squat should be incorrect');
  assert(result.feedback.toLowerCase().includes('lower'), 'expected depth feedback');
});

let passed = 0;
tests.forEach(({ name, fn }) => {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
});

console.log(`\nPoseForm validation passed ${passed}/${tests.length} tests.`);
