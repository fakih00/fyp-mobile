const normalize = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const slugify = (value = '') => normalize(value).replace(/\s+/g, '-');

const SOURCE_TUTORIALS = {
    squat: {
        channel: 'Alan Thrall',
        url: 'https://www.youtube.com/watch?v=bs_Ej32IYgo',
        bestAngle: 'Full body side or 3/4 view',
        focus: 'Depth, knees, hips, and bracing',
        reviewStatus: 'Pending Jason review',
    },
    pushup: {
        channel: 'Calisthenicmovement',
        url: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
        bestAngle: 'Side view from shoulder to ankle',
        focus: 'Straight body line, elbow path, and controlled depth',
        reviewStatus: 'Pending Jason review',
    },
    deadlift: {
        channel: 'Alan Thrall',
        url: 'https://www.youtube.com/watch?v=Y1IGeJEXpF4',
        bestAngle: 'Side view with hips and bar visible',
        focus: 'Hip hinge, neutral spine, lockout, and bar path',
        reviewStatus: 'Pending Jason review',
    },
    benchPress: {
        channel: 'Alan Thrall',
        url: 'https://www.youtube.com/watch?v=BYKScL2sgCs',
        bestAngle: 'Side or 3/4 view from upper body',
        focus: 'Shoulder position, controlled lower, and press path',
        reviewStatus: 'Pending Jason review',
    },
    overheadPress: {
        channel: 'Alan Thrall',
        url: 'https://www.youtube.com/watch?v=wol7Hko8RhY',
        bestAngle: 'Front or 3/4 view with elbows visible',
        focus: 'Brace, press path, shoulder control, and elbow alignment',
        reviewStatus: 'Pending Jason review',
    },
    pullup: {
        channel: 'FitnessFAQs',
        url: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
        bestAngle: 'Front or 3/4 view with shoulders and elbows visible',
        focus: 'Scapular control, elbow drive, and full range',
        reviewStatus: 'Pending Jason review',
    },
    bicepCurl: {
        channel: 'NASM',
        url: 'https://www.youtube.com/watch?v=pQfJR-sSIvA',
        bestAngle: 'Front view with elbows and wrists visible',
        focus: 'Elbow position, wrist alignment, and controlled lowering',
        reviewStatus: 'Pending Jason review',
    },
    row: {
        channel: 'Mind Pump TV search',
        url: 'https://www.youtube.com/results?search_query=Mind+Pump+TV+proper+barbell+row+form',
        bestAngle: 'Side or 3/4 view from hip height',
        focus: 'Back angle, pulling path, and shoulder blade control',
        reviewStatus: 'Search pick pending Jason review',
    },
    tricepDip: {
        channel: 'NASM search',
        url: 'https://www.youtube.com/results?search_query=NASM+proper+tricep+dip+form',
        bestAngle: 'Side or 3/4 view with elbows visible',
        focus: 'Shoulder safety, elbow depth, and controlled press',
        reviewStatus: 'Search pick pending Jason review',
    },
    plank: {
        channel: 'NASM search',
        url: 'https://www.youtube.com/results?search_query=NASM+proper+plank+form',
        bestAngle: 'Side view from shoulder to ankle',
        focus: 'Neutral spine, hip height, and shoulder stack',
        reviewStatus: 'Search pick pending Jason review',
    },
    lunge: {
        channel: 'Certified trainer search',
        url: 'https://www.youtube.com/results?search_query=proper+lunge+form+certified+personal+trainer',
        bestAngle: 'Side or front view with both legs visible',
        focus: 'Front knee tracking, hip control, and balance',
        reviewStatus: 'Search pick pending Jason review',
    },
    jumpingJack: {
        channel: 'Certified trainer search',
        url: 'https://www.youtube.com/results?search_query=proper+jumping+jack+form+certified+personal+trainer',
        bestAngle: 'Full body front view',
        focus: 'Rhythm, soft landing, and arm-leg timing',
        reviewStatus: 'Search pick pending Jason review',
    },
    calfRaise: {
        channel: 'Certified trainer search',
        url: 'https://www.youtube.com/results?search_query=proper+calf+raise+form+certified+personal+trainer',
        bestAngle: 'Side or rear view with ankles visible',
        focus: 'Full ankle range, control, and balance',
        reviewStatus: 'Search pick pending Jason review',
    },
    crunch: {
        channel: 'Certified trainer search',
        url: 'https://www.youtube.com/results?search_query=proper+crunch+form+certified+personal+trainer',
        bestAngle: 'Side view from shoulder to hip',
        focus: 'Rib curl, neck safety, and slow control',
        reviewStatus: 'Search pick pending Jason review',
    },
    yoga: {
        channel: 'Yoga With Adriene search',
        url: 'https://www.youtube.com/results?search_query=Yoga+With+Adriene+sun+salutation+downward+dog+warrior+one',
        bestAngle: 'Side view with full body visible',
        focus: 'Breathing, smooth transitions, and joint alignment',
        reviewStatus: 'Search pick pending Jason review',
    },
    walk: {
        channel: 'Physical therapist search',
        url: 'https://www.youtube.com/results?search_query=proper+walking+form+physical+therapist',
        bestAngle: 'Side view with full stride visible',
        focus: 'Posture, stride, cadence, and foot strike',
        reviewStatus: 'Search pick pending Jason review',
    },
};

const EXERCISE_TUTORIAL_SPECS = [
    ['Squat', 'squat', ['squat', 'squats']],
    ['Jump Squat', 'squat', ['jump squat', 'jump squats']],
    ['Leg Press', 'squat', ['leg press', 'legpress']],
    ['Leg Extension', 'squat', ['leg extension', 'legextension']],
    ['Push-Up', 'pushup', ['pushup', 'pushups', 'push up', 'push ups']],
    ['Burpee', 'pushup', ['burpee', 'burpees']],
    ['Deadlift', 'deadlift', ['deadlift', 'dead lift']],
    ['Glute Bridge', 'deadlift', ['glute bridge', 'glutebridge']],
    ['Leg Curl', 'deadlift', ['leg curl', 'legcurl']],
    ['Bench Press', 'benchPress', ['bench press', 'benchpress']],
    ['Incline Dumbbell Press', 'benchPress', ['incline dumbbell press', 'incline press']],
    ['Chest Fly', 'benchPress', ['chest fly', 'chestfly']],
    ['Shoulder Press', 'overheadPress', ['shoulder press', 'shoulderpress', 'overhead press']],
    ['Lateral Raise', 'overheadPress', ['lateral raise', 'lateralraise']],
    ['Pull-Up', 'pullup', ['pullup', 'pullups', 'pull up', 'pull ups']],
    ['Lat Pulldown', 'pullup', ['lat pulldown', 'latpulldown']],
    ['Bicep Curl', 'bicepCurl', ['bicep curl', 'bicep curls', 'bicepcurl', 'curl', 'curls']],
    ['Row', 'row', ['row', 'barbell row', 'bent over row']],
    ['Tricep Dip', 'tricepDip', ['tricep dip', 'tricep dips', 'tricepdip', 'dip', 'dips']],
    ['Plank', 'plank', ['plank']],
    ['Mountain Climber', 'plank', ['mountain climber', 'mountain climbers', 'mountainclimber']],
    ['Lunge', 'lunge', ['lunge', 'lunges']],
    ['Warrior I', 'lunge', ['warrior i', 'warrior one']],
    ['Jumping Jack', 'jumpingJack', ['jumping jack', 'jumping jacks', 'jumpingjack']],
    ['Calf Raise', 'calfRaise', ['calf raise', 'calf raises', 'calfraise']],
    ['Crunch', 'crunch', ['crunch', 'crunches']],
    ['Sun Salutation', 'yoga', ['sun salutation']],
    ['Downward Dog', 'yoga', ['downward dog']],
    ['Cat Cow', 'yoga', ['cat cow', 'cat-cow']],
    ['Nature Walk', 'walk', ['nature walk', 'walk', 'walking', 'locomotion']],
];

export const EXERCISE_TUTORIALS = EXERCISE_TUTORIAL_SPECS.map(([exerciseName, sourceKey, aliases]) => {
    const source = SOURCE_TUTORIALS[sourceKey];
    return {
        id: `exercise-${slugify(exerciseName)}`,
        exerciseName,
        title: `${exerciseName} Technique Tutorial`,
        sourceKey,
        channel: source.channel,
        url: source.url,
        match: aliases,
        bestAngle: source.bestAngle,
        focus: source.focus,
        reviewStatus: source.reviewStatus,
    };
});

export const getExerciseTutorial = (exerciseName = '') => {
    const target = normalize(exerciseName);
    if (!target) return null;

    let best = null;
    let bestScore = 0;

    EXERCISE_TUTORIALS.forEach((tutorial) => {
        const patterns = [tutorial.exerciseName, tutorial.title, ...tutorial.match];
        patterns.forEach((pattern) => {
            const normalizedPattern = normalize(pattern);
            if (!normalizedPattern) return;
            const exact = target === normalizedPattern;
            const contains = target.includes(normalizedPattern) || normalizedPattern.includes(target);
            const score = exact ? 100 : contains ? normalizedPattern.length : 0;
            if (score > bestScore) {
                best = tutorial;
                bestScore = score;
            }
        });
    });

    return best || EXERCISE_TUTORIALS[0];
};
