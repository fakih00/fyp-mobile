import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const root = 'C:/Users/user/Desktop/FYP/fyp-mobile';
const skill = 'C:/Users/user/.codex/plugins/cache/openai-primary-runtime/presentations/26.923.10815/skills/presentations';
const media = path.join(root, 'presentation_build/report/word/media');
const build = path.join(root, 'presentation_build');
const output = path.join(root, 'presentation_output/Elite_Fitness_FYP_Defense_18min_Final.pptx');
const py = 'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const { finalizePresentation } = await import(pathToFileURL(path.join(skill, 'container_tools/artifact_tool_utils.mjs')).href);

const W = 1280, H = 720;
const C = { ink:'#17232F', muted:'#526675', green:'#0F936F', light:'#EAF5F1', blue:'#1160A3', pale:'#EAF1F8', line:'#BBCED1', white:'#FFFFFF', red:'#B84B4B', coral:'#F2684E', lime:'#AEE585' };
const pres = Presentation.create({slideSize:{width:W,height:H}});

function box(slide, x,y,w,h, fill='none', stroke='none', radius='rect') {
  return slide.shapes.add({geometry:radius,position:{left:x,top:y,width:w,height:h},fill,
    line:{fill:stroke,width:stroke==='none'?0:1}});
}
function txt(slide, value, x,y,w,h, size=24, color=C.ink, bold=false, align='left') {
  const s=box(slide,x,y,w,h);
  s.text=value;
  s.text.style={typeface:'Arial',fontSize:size,color,bold,alignment:align,verticalAlignment:'middle',autoFit:'shrinkText',wrap:true};
  return s;
}
function base(title, section='') {
  const slide=pres.slides.add();
  const n=pres.slides.items.length;
  const backgrounds=['#E8F5EF','#EAF2F8','#F1F8F4','#E6F1F5','#EAF7F2','#EDF3F8','#FFF2E9','#EAF4F8','#E8F4EF','#EDF7F1','#EAF2F8','#F8F2EB','#E9F6F1'];
  const headers=['#123E3D','#12344E','#175947','#133D50','#0F5B50','#14384B','#7A3B2F','#154C60','#103F3F','#205947','#173B54','#6A453C','#124C44'];
  slide.background.fill=backgrounds[(n-2)%backgrounds.length]??C.light;
  box(slide,0,0,W,132,headers[(n-2)%headers.length]??C.ink);
  box(slide,0,0,16,H,C.coral);
  txt(slide,title,64,35,1138,70,36,C.white,true);
  box(slide,64,128,1153,4,C.coral);
  txt(slide,section.toUpperCase(),64,672,900,24,13,headers[(n-2)%headers.length]??C.ink,true);
  txt(slide,String(n).padStart(2,'0'),1152,669,63,28,15,headers[(n-2)%headers.length]??C.ink,true,'right');
  return slide;
}
const times=['0:30','1:00','0:50','0:55','1:00','0:50','1:00','1:20','0:45','1:10','1:10','0:40','1:25','0:40','0:55','1:20','1:45','0:50','0:35'];
const noteBodies=[];
function notes(slide, text) {
  const n=pres.slides.items.indexOf(slide);
  noteBodies[n]=text;
}
async function img(slide,file,x,y,w,h,alt) {
  const ext=path.extname(file).toLowerCase();
  slide.images.add({blob:new Uint8Array(await fs.readFile(path.join(media,file))),contentType:ext==='.png'?'image/png':'image/jpeg',alt,fit:'contain',position:{left:x,top:y,width:w,height:h}});
}
async function coverPhoto(slide) {
  slide.images.add({blob:new Uint8Array(await fs.readFile(path.join(build,'assets/fitness-cover.png'))),contentType:'image/png',alt:'Athlete lifting a barbell in a gym',fit:'cover',position:{left:0,top:0,width:W,height:H}});
}
function lines(slide, items, x,y,w, font=23, gap=78) {
  items.forEach((v,i)=>{ box(slide,x,y+i*gap+8,7,42,C.green); txt(slide,v,x+24,y+i*gap,w-24,60,font,C.ink); });
}
function step(slide,num,heading,detail,x,y,w) {
  txt(slide,String(num).padStart(2,'0'),x,y,80,50,34,C.green,true);
  txt(slide,heading,x,y+63,w,42,25,C.ink,true);
  txt(slide,detail,x,y+116,w,92,20,C.muted);
}

// 1: Cover
{
  const s=pres.slides.add(); s.background.fill=C.ink;
  await coverPhoto(s);
  box(s,0,0,16,H,C.coral);
  txt(s,'ANTONINE UNIVERSITY  /  COMPUTER SCIENCE',72,54,655,45,18,C.lime,true);
  txt(s,'ELITE\nFITNESS APP',70,190,670,175,61,C.white,true);
  txt(s,'Personalized training, nutrition and exercise feedback',74,382,610,88,27,C.white);
  box(s,75,502,500,5,C.coral);
  txt(s,'Oliver Mattar  ·  Nour Fakih',74,532,610,42,24,C.white,true);
  txt(s,'Supervisor: Dr. Joseph Gmayel',74,581,610,36,20,C.white);
  notes(s,'Introduce the team and the one-sentence idea: a mobile fitness application that combines personalized plans, nutrition, video form feedback and expert review. Source: FYP Report-2026.docx, cover and abstract.');
}

// 2: Problem
{
  const s=base('Why this project matters','Problem');
  txt(s,'Generic fitness apps often treat different users the same.',64,153,1070,60,28,C.ink,true);
  lines(s,[
    'Workout plans may ignore injuries, training location and available equipment.',
    'Meal suggestions may ignore allergies, dislikes and ingredients already at home.',
    'Users need feedback on exercise form, not just a list of exercises.'
  ],75,250,1090,23,102);
  txt(s,'Our goal: one connected, personalized journey from onboarding to progress.',75,591,1090,48,24,C.green,true);
  notes(s,'Explain the problem with one concrete example: two users can share a weight-loss goal but have different injuries, foods and equipment. The report identifies generic recommendations and limited adaptation as the gap. Transition: these gaps became our project objectives. Source: FYP Report-2026.docx, Chapter I.');
}

// 3: Objectives
{
  const s=base('Project objectives','Scope');
  const objectives=[
    ['01','Personalized training','Adapt workouts to goal, location, level and injuries.'],
    ['02','Safer meal planning','Respect calorie targets, allergies, fridge items and expert approval.'],
    ['03','Form feedback','Analyze a recorded exercise video and return reps and technique advice.'],
    ['04','Continued engagement','Track progress and support habits through community and challenges.']
  ];
  objectives.forEach((v,i)=>{
    const y=161+i*117;
    txt(s,v[0],70,y,70,58,31,C.coral,true);
    txt(s,v[1],160,y,360,48,25,C.ink,true);
    txt(s,v[2],518,y,659,58,21,C.muted);
    if(i<3) box(s,70,y+87,1100,2,C.line);
  });
  notes(s,'State the four deliverables, not every app feature. Say that success means a complete user journey: profile input, a useful plan, form feedback and ongoing tracking. Source: FYP Report-2026.docx, Chapter III project objectives and Chapter II functional requirements.');
}

// 4: User flow, editable diagram
{
  const s=base('How the app works for a user','User journey');
  const xs=[68,311,554,797,1040];
  const heads=['Sign up','Set profile','Get plans','Act & track','Adapt'];
  const details=['Secure account','Goal, body data, injuries, allergies','Workouts, meals and swaps','Train, eat, log progress','Updated guidance and feedback'];
  xs.forEach((x,i)=>{
    txt(s,String(i+1),x,208,55,54,33,C.green,true);
    box(s,x,277,184,3,C.green);
    txt(s,heads[i],x,311,190,44,23,C.ink,true);
    txt(s,details[i],x,373,188,130,19,C.muted);
    if(i<4) txt(s,'→',x+193,263,50,40,29,C.green,true);
  });
  txt(s,'The phone sends requests; the backend stores data and calls the right local module.',68,569,1132,64,22,C.ink,true);
  notes(s,'Walk the advisor through the app as if they are the user. Onboarding collects the profile once. The phone communicates with the PHP API; the backend stores data in MySQL and invokes local AI when needed. Source: report Chapters IV-V.');
}

// 5: Comparison table
{
  const s=base('Comparison with existing apps','Comparative study');
  const vals=[
    ['Capability','Nike TC','Fitbod','MyFitnessPal','Strava','Elite Fitness'],
    ['Workout plan','Yes','Yes','Limited','Limited','Yes'],
    ['Nutrition plan','No','No','Limited','No','Yes'],
    ['Fridge meal swaps','No','No','No','No','Yes'],
    ['Expert meal approval','No','No','No','No','Yes'],
    ['Exercise form analysis','Limited','No','No','No','Yes'],
    ['Injury-aware planning','Limited','Limited','No','No','Yes']
  ];
  const t=s.tables.add({rows:vals.length,columns:6,left:62,top:159,width:1155,height:407,values:vals,columnWidths:[285,155,145,195,135,240]});
  t.styleOptions={headerRow:true,bandedRows:false};
  t.borders.assign({style:'solid',fill:C.line,width:1});
  for(let r=0;r<vals.length;r++)for(let c=0;c<6;c++){
    const cell=t.getCell(r,c);
    cell.fill=r===0?C.ink:(c===5?C.light:C.white);
    cell.text.style={typeface:'Arial',fontSize:r===0?17:19,bold:r===0||c===5,color:r===0?C.white:(c===5?C.green:C.ink)};
  }
  txt(s,'Based on the feature-level comparison in the project report; feature scope may change in commercial apps.',63,587,1140,48,16,C.muted);
  notes(s,'This is a comparison of features documented in our report, not a claim that competitors have no other capabilities. Focus on the combination of workout planning, nutrition, fridge swaps, expert approval and form analysis. Source: FYP Report-2026.docx, Table 3, Chapter III.');
}

// 6: Development methodology
{
  const s=base('Development methodology','Method');
  const phases=[
    ['Study','Requirements and competitor comparison'],
    ['Design','Mobile screens, API routes and database schema'],
    ['Build','Core app, local AI modules and expert review'],
    ['Verify','Functional tests, model checks and phone walkthrough']
  ];
  phases.forEach((p,i)=>{
    const y=170+i*107;
    txt(s,String(i+1).padStart(2,'0'),76,y,65,53,31,C.green,true);
    box(s,159,y+6,7,53,C.coral);
    txt(s,p[0],193,y,250,52,26,C.ink,true);
    txt(s,p[1],445,y,710,55,21,C.muted);
  });
  txt(s,'Incremental development over about four months by a two-person team.',77,606,1086,42,21,C.ink,true);
  notes(s,'Explain that this was built incrementally, not all at once: requirements, architecture, implementation, then integration and testing. The project report describes about four months and two team members. Keep this slide short so more time remains for the system and results. Source: report Chapter II.');
}

// 7: Architecture, editable flow
{
  const s=base('System architecture','Technical flow');
  box(s,72,263,254,8,C.green);
  txt(s,'PHONE',72,287,254,34,18,C.green,true);
  txt(s,'React Native + Expo',72,347,254,50,26,C.ink,true);
  txt(s,'Screens and user actions',72,417,254,70,20,C.muted);
  txt(s,'→',341,341,54,62,34,C.green,true);
  box(s,409,263,272,8,C.green);
  txt(s,'API',409,287,272,34,18,C.green,true);
  txt(s,'PHP controllers',409,347,272,50,26,C.ink,true);
  txt(s,'Authentication and routing',409,417,272,70,20,C.muted);
  txt(s,'→',694,258,54,62,30,C.blue,true);
  txt(s,'→',694,426,54,62,30,C.blue,true);
  box(s,765,190,417,6,C.blue);
  txt(s,'DATA',765,212,400,30,17,C.blue,true);
  txt(s,'MySQL',765,251,400,45,25,C.ink,true);
  txt(s,'Profiles, plans and logs',765,300,400,50,19,C.muted);
  box(s,765,370,417,6,C.blue);
  txt(s,'LOCAL AI',765,390,400,30,17,C.blue,true);
  txt(s,'Python + saved models',765,432,400,45,25,C.ink,true);
  txt(s,'TrainCore, NutriCore, PoseForm',765,481,400,50,19,C.muted);
  txt(s,'The mobile app never runs the Python model directly. The backend returns JSON for the screen to display.',73,557,1090,68,22,C.ink,true);
  notes(s,'Technical explanation: the app sends HTTP requests to the PHP API. Controllers authenticate, read or save MySQL data, invoke local Python modules when needed, then send structured JSON back to the phone. Source: report Chapter IV and Chapter V. Note: the phone and local backend still need network connectivity to each other.');
}

// 8: Data and training
{
  const s=base('How the local models were built','AI methodology');
  txt(s,'TrainCore',72,167,500,53,31,C.ink,true);
  box(s,72,225,515,5,C.green);
  txt(s,'220 exercise records',72,250,500,47,24,C.green,true);
  txt(s,'Normalize exercise fields; create suitability labels from expert rules; train a small neural network; save its weights locally.',72,310,500,182,22,C.ink);
  txt(s,'NutriCore',665,167,500,53,31,C.ink,true);
  box(s,665,225,515,5,C.coral);
  txt(s,'72 meals × 4 example profiles',665,250,500,47,24,C.coral,true);
  txt(s,'Create 288 labeled meal-person pairs. Train on 216; validate on 72. Run 180 epochs and save the learned weights locally.',665,310,500,182,22,C.ink);
  box(s,626,169,2,356,C.line);
  txt(s,'PoseForm is different: MediaPipe detects landmarks; our local movement rules analyze them.',73,556,1111,70,22,C.ink,true);
  notes(s,'Explain training in simple words: each example has input features and a target suitability label. The network predicts, compares to the label and updates weights by backpropagation. TrainCore labels are generated by local expert rules, not by a large human-labeled clinical study. NutriCore uses four example profiles against 72 meals: 288 pairs, with a 75/25 sample split and 180 epochs. Its validation pairs share the same small profile/meal pool, so the reported accuracy is internal and may not generalize to new users. PoseForm uses pretrained MediaPipe plus our local rules; we did not train the pose detector. Source: ml/workout_ai/traincore_model.py, ml/workout_ai/datasets/traincore_exercise_dataset.json, ml/nutrition_ai/preprocess_usda_dataset.py, ml/nutrition_ai/train_model.py.');
}

// 9: Onboarding screenshots
{
  const s=base('Onboarding makes plans personal','App walkthrough');
  await img(s,'image6.jpeg',73,148,306,464,'Onboarding gender screen');
  await img(s,'image10.jpeg',413,148,306,464,'Onboarding allergies screen');
  await img(s,'image13.jpeg',753,148,306,464,'Onboarding injury level screen');
  txt(s,'Profile identity',82,607,277,35,19,C.ink,true,'center');
  txt(s,'Food safety',423,607,277,35,19,C.ink,true,'center');
  txt(s,'Training safety',763,607,277,35,19,C.ink,true,'center');
  notes(s,'Show these real screens from the report. The profile stores goals, body data, allergies, preferences and training constraints. This data is reused by the workout and nutrition modules. Source: report Chapter VI, onboarding figures.');
}

// 10: TrainCore
{
  const s=base('TrainCore: personalized workouts','Local AI module');
  await img(s,'image14.jpeg',66,146,267,493,'Workout plan screen');
  await img(s,'image15.jpeg',338,146,267,493,'Daily workout details');
  txt(s,'Profile + exercise dataset',648,173,570,46,26,C.ink,true);
  lines(s,[
    'Local neural network scores candidate exercises.',
    'Safety filters account for injuries and constraints.',
    'Backend saves the resulting workout plan.'
  ],649,258,552,21,104);
  notes(s,'Say: TrainCore takes the user profile, turns it into numeric features, scores exercises from a local dataset, applies safety rules, builds a plan and saves it. The report states 3,960 synthetic profiles/plan combinations, 74,250 ranked exercise slots and MAE 0.0329. This is model fit against generated suitability labels, not clinical accuracy. Source: report Chapter VI; ml/workout_ai.');
}

// 11: NutriCore
{
  const s=base('NutriCore: meals and fridge swaps','Local AI module');
  await img(s,'image19.jpeg',63,146,267,493,'Daily meal plan screen');
  await img(s,'image20.jpeg',340,146,267,493,'Fridge ingredient selection');
  txt(s,'Profile + local meal data',649,173,570,46,26,C.ink,true);
  lines(s,[
    'Model ranks meals against calorie and nutrition needs.',
    'Allergies and disliked foods are filtered out.',
    'Fridge ingredients produce practical alternatives.'
  ],650,258,552,21,104);
  notes(s,'Say: NutriCore does not invent arbitrary meals on the phone. USDA-derived meal data and a locally trained model support suitability ranking. The backend enforces hard safety filters and expert approval before display. The report cites 99% training and 100% validation accuracy on its prepared validation set; this is not a clinical outcome. Source: report Chapter VI and ml/nutrition_ai.');
}

// 12: Expert review
{
  const s=base('Human review before meal display','Safety gate');
  await img(s,'image25.jpeg',77,145,319,505,'Expert-approved meals screen');
  step(s,1,'Model proposes','NutriCore ranks suitable candidate meals.',445,201,726);
  step(s,2,'Expert decides','Reviewer approves or rejects meals.',445,374,726);
  txt(s,'Only approved meals reach the user plan.',445,558,710,55,27,C.green,true);
  notes(s,'Point out the expert review screen. The AI recommends; it does not bypass human approval. The review decision is stored and checked before showing final meals. Source: report Chapter V-VI, expert review figures and Table 13.');
}

// 13: PoseForm
{
  const s=base('PoseForm: video to form feedback','Local AI module');
  await img(s,'image26.jpeg',64,148,318,492,'PoseForm video analysis screen');
  const labels=['Record or upload','Backend stores video briefly','Python reads video frames','MediaPipe detects joints','Rules count reps and check form','JSON feedback returns to phone'];
  labels.forEach((v,i)=>{
    txt(s,String(i+1).padStart(2,'0'),436,159+i*77,63,38,23,C.green,true);
    txt(s,v,512,155+i*77,674,46,22,C.ink,i===5);
    if(i<5) box(s,438,204+i*77,2,29,C.line);
  });
  notes(s,'Speak slowly through the actual flow: the user records or uploads a full exercise video. The mobile app sends multipart data to PHP. The backend saves the video temporarily and starts the Python analyzer. MediaPipe extracts joint landmarks; exercise rules inspect angles and movement phases, estimate reps and form, then return JSON. PoseForm is a local vision-and-rules pipeline, not a newly trained pose detector. Source: report Chapter VI, PoseForm test; backend/controllers/ExerciseAIController.php and ml/exercise_ai/video_pose_analyzer.py.');
}

// 14: Engagement
{
  const s=base('Community, challenges and rewards','Daily use');
  await img(s,'image31.jpeg',70,148,279,480,'Rewards store screen');
  await img(s,'image27.jpeg',359,148,279,480,'Community screen');
  await img(s,'image30.jpeg',648,148,279,480,'Challenges screen');
  txt(s,'Redeem rewards',70,626,279,33,19,C.ink,true,'center');
  txt(s,'Connect',359,626,279,33,19,C.ink,true,'center');
  txt(s,'Stay motivated',648,626,279,33,19,C.ink,true,'center');
  notes(s,'The app is more than recommendation screens. The report documents meal/workout/progress tracking, friends and clubs, challenges, achievements and rewards. These help users return to the app and make the plans actionable. Source: report Chapters V-VI.');
}

// 15: Honest technical boundary
{
  const s=base('What is local AI here?','Technical distinction');
  const rows=[
    ['TrainCore','Locally trained exercise suitability model','Workout ranking'],
    ['NutriCore','Locally trained meal suitability model','Meal ranking + safety filters'],
    ['PoseForm','MediaPipe landmarks + local analysis rules','Reps and form feedback'],
    ['AI Coach chat','Gemini service, separate from local modules','Conversation']
  ];
  const t=s.tables.add({rows:5,columns:3,left:62,top:166,width:1153,height:365,values:[['Module','Method','User output'],...rows],columnWidths:[226,590,337]});
  t.borders.assign({style:'solid',fill:C.line,width:1});
  for(let r=0;r<5;r++)for(let c=0;c<3;c++){
    const cell=t.getCell(r,c);cell.fill=r===0?C.ink:(r===4?C.pale:C.white);
    cell.text.style={typeface:'Arial',fontSize:r===0?20:20,bold:r===0||c===0,color:r===0?C.white:C.ink};
  }
  txt(s,'Local does not mean the phone works offline: it calls a backend on the same/local network.',63,563,1128,65,21,C.muted);
  notes(s,'Be precise with the advisor: TrainCore and NutriCore have saved local model weights; PoseForm combines a pretrained MediaPipe landmark detector with custom local rules. The chat feature uses Gemini and is not part of the claim that the core modules are local. Source: report Chapter V; backend/services/GeminiService.php.');
}

// 16: Validation
{
  const s=base('What we tested','Results');
  const vals=[
    ['Area','Evidence from project tests'],
    ['Authentication','Register, login, token and profile retrieval passed'],
    ['TrainCore','MAE 0.0329; 191 distinct exercises recommended'],
    ['NutriCore','100% validation accuracy on prepared set; 100% allergy filtering'],
    ['PoseForm','17/17 template, 3/3 analyzer and 24/24 smoke checks passed']
  ];
  const t=s.tables.add({rows:5,columns:2,left:62,top:161,width:1153,height:390,values:vals,columnWidths:[265,888]});
  t.borders.assign({style:'solid',fill:C.line,width:1});
  for(let r=0;r<5;r++)for(let c=0;c<2;c++){
    const cell=t.getCell(r,c);cell.fill=r===0?C.ink:C.white;
    cell.text.style={typeface:'Arial',fontSize:r===0?21:20,bold:r===0||c===0,color:r===0?C.white:C.ink};
  }
  txt(s,'These are project validation results, not evidence of clinical effectiveness or performance for every real user.',63,579,1114,55,19,C.muted);
  notes(s,'Read the evidence accurately. TrainCore MAE is suitability prediction error; NutriCore accuracy is on a prepared dataset, so it can overstate generalization. PoseForm counts are software/template checks, not a population-level biomechanics study. Source: report Chapter VI, Tables 11-14.');
}

// 17: Live demo sequence
{
  const s=base('Live demonstration','Prototype');
  const seq=[
    ['1','Profile','Show goals, allergies and injury inputs.'],
    ['2','Training','Open a generated workout and its exercise detail.'],
    ['3','Nutrition','Show approved meals and a fridge-based swap.'],
    ['4','PoseForm','Upload a prepared short clip and show returned feedback.']
  ];
  seq.forEach((p,i)=>{
    const y=167+i*108;
    txt(s,p[0],74,y,75,50,34,C.coral,true);
    txt(s,p[1],168,y,282,50,25,C.ink,true);
    txt(s,p[2],453,y,719,68,21,C.muted);
  });
  txt(s,'One profile connects training, nutrition and exercise feedback.',76,604,1070,39,20,C.ink,true);
  notes(s,'Target demo: about 1 minute 45 seconds. Prepare the logged-in test account and a short supported exercise video before the defense. Do not spend time registering on stage. Show the four actions only; avoid navigating every tab. If Wi-Fi, Expo or the backend fails, immediately use the screenshots already in this deck and explain the flow. Source: project prototype screenshots and Chapter VI.');
}

// 18: Limitations
{
  const s=base('Limitations and next steps','Future work');
  lines(s,[
    'Expand exercise and meal datasets, including Lebanese and regional foods.',
    'Test with more real users and qualified fitness/nutrition reviewers.',
    'Improve PoseForm across camera angles, lighting and exercise types.',
    'Strengthen deployment security before public release.'
  ],72,167,1120,23,112);
  notes(s,'Present limitations confidently. The report notes the prepared data and user tests do not prove broad real-world performance. PoseForm depends on clear visibility and supported exercises. Public deployment requires larger evaluations and stronger security. Source: report Chapter VII.');
}

// 19: Closing
{
  const s=pres.slides.add(); s.background.fill=C.ink;
  await coverPhoto(s);
  box(s,0,0,16,H,C.coral);
  txt(s,'Elite Fitness',78,135,710,90,60,C.white,true);
  txt(s,'Personalized decisions. Visible feedback.',80,252,670,85,29,C.lime);
  box(s,80,375,520,5,C.coral);
  txt(s,'Our contribution',80,418,670,56,28,C.white,true);
  txt(s,'One connected mobile journey, supported by local models and human review.',80,483,650,88,24,C.white);
  txt(s,'Thank you  ·  Questions?',80,595,620,52,29,C.white,true);
  notes(s,'Conclude in one sentence: we implemented and tested a connected fitness app that combines personalized workouts, safer meal recommendations and video form feedback. Thank the committee and invite questions. Do not repeat the full presentation.');
}

const scripts=[
  'Good morning. We are Oliver Mattar and Nour Fakih, and this is our Final Year Project, Elite Fitness App. It is a mobile fitness system that personalizes training and nutrition and gives feedback on recorded exercise videos. We will explain the problem, show how the app works, present the technical architecture and AI modules, then share our testing results and a short demonstration.',
  'Many fitness apps provide useful content, but recommendations can still feel generic. Imagine two people with the same goal of losing weight. One has a knee injury and trains at home; the other has no injury and goes to a gym. A standard workout plan should not be identical for them. Nutrition has a similar issue: allergies, disliked foods and ingredients at home all matter. We wanted one app that connects this information to the plans and to later progress, instead of treating each feature separately.',
  'We set four main objectives. First, generate workouts that match the user\'s goal, level, location and injury information. Second, produce meals and alternatives that consider nutrition targets, allergies and fridge ingredients, with an expert approval step. Third, let the user upload a recorded exercise video and receive repetition and form feedback. Fourth, make the plan usable over time through progress tracking, community and challenges. These objectives became the basis for our architecture and tests.',
  'Here is the user journey. The person creates an account and completes onboarding. The profile includes body information, goals, food restrictions and training constraints. The app then requests workout and nutrition plans from the backend. The user follows the plan, records activity and can upload a video for form analysis. New logs and feedback are stored, so the next experience can use the latest information. The phone is the interface, while the backend coordinates the data and the local AI modules.',
  'We reviewed existing applications including Nike Training Club, Fitbod, MyFitnessPal and Strava. Each has strengths in a particular area. Our comparison is not saying that those apps are bad or never change; it reflects the feature scope documented in our report. The gap we focused on is the combination. In one app, we connect workout planning, nutrition planning, fridge-based meal swaps, expert meal approval, injury awareness and recorded-video form analysis. That combination is the proposed contribution.',
  'Our development was incremental. We began by studying the problem, requirements and existing solutions. Then we designed the main screens, API routes and database tables. During implementation, we built the account and profile flow first, then workout, nutrition and engagement features, and finally integrated the local AI modules and expert review. In the last phase, we tested both individual components and complete phone-to-backend workflows. The report describes about four months of work by our two-person team.',
  'The system has four important parts. The React Native and Expo application shows screens and gathers input. It sends HTTP requests to PHP controllers on the backend. Those controllers authenticate requests, read and write MySQL data, and call a local Python module when a decision is needed. The database stores profiles, generated plans and progress logs. The Python layer contains the local recommendation and video analysis logic. Finally, the backend returns JSON that the app can display. The phone does not execute the Python model itself.',
  'We built two small local neural models for recommendation. TrainCore starts from a structured exercise dataset of 220 records. We normalize fields and generate suitability labels using local expert rules, then train a neural network to estimate an exercise score. NutriCore starts from 72 USDA-based meals and four example user profiles. Comparing each profile with each meal gives 288 labeled pairs; 216 are used for training and 72 for validation. Its network trains for 180 epochs and saves weights locally. PoseForm is different: it uses MediaPipe landmarks and our movement rules, not a pose detector we trained ourselves.',
  'These are real onboarding screens from the prototype. The app asks for information such as identity, allergies and injury or pain areas. Other onboarding steps collect goals, physical measures and training preferences. This is important because personalization only works when the inputs are relevant and stored correctly. Once the profile is saved, the same information can be reused by TrainCore for workout planning and NutriCore for meals. In the demo, we will use an account that already completed onboarding to save time.',
  'TrainCore receives the user\'s profile, including goal, level, location, frequency and physical limitations. It converts those inputs into features and scores candidate exercises from the local dataset. Safety rules remove unsuitable choices, and the backend builds and stores the final plan. On the screen, the user sees a weekly program and a daily workout with exercises, sets and repetitions. This is not a fixed plan copied for every person; the selected exercises depend on the profile. We will return to the test results shortly.',
  'NutriCore works in a similar way for food. The app passes nutrition targets, preferences and restrictions to the backend. A locally trained model ranks meals in the project dataset, while hard filters block allergens and disliked ingredients. The fridge feature lets the user select ingredients they have, so the app can suggest practical alternatives instead of only an ideal meal plan. The screenshots show the daily meals and the fridge-selection interface. A high model score alone is not enough: the expert approval check still applies.',
  'This slide shows the safety gate. NutriCore may propose a meal, but the expert reviewer can approve or reject it. The decision is stored in the database and checked before that meal appears in the user\'s final plan. That separation matters because a machine-learned suitability score does not replace professional judgment. It also lets us inspect why a recommendation should be changed. In the prototype, the review screen shows the meal, its nutrition values and its approval state.',
  'PoseForm begins when the user records or uploads a full exercise video. The phone sends the video and exercise information to the PHP backend. The file is stored temporarily while the local Python analyzer reads it frame by frame. MediaPipe detects landmarks such as hips, knees, shoulders and elbows. Our exercise-specific rules use those points to estimate angles and movement phases, count repetitions and flag possible form mistakes. The analyzer returns a JSON result, which the backend passes to the app. This is recorded-video feedback, not continuous live analysis.',
  'The app also includes features that support repeated use. Users can interact in the community, join challenges and earn points or rewards. These do not replace the AI modules; they help a person stay engaged with a plan after the first day. The screenshots show the rewards store, the community screen and daily missions. Progress logs also feed the user dashboard. For this defense, our main technical focus remains the connected workout, nutrition and PoseForm workflows.',
  'It is important to be precise about the word local. TrainCore and NutriCore use model weights saved with the project and run on the backend computer. PoseForm analyzes video locally with MediaPipe and project-specific rules; we did not train MediaPipe ourselves. The AI Coach chat is a separate feature using a Gemini service, so we do not claim that chat is local. Also, local AI does not mean the phone works without any network: it still needs to reach our backend, usually on the same network during testing.',
  'We tested complete application flows as well as model behavior. Authentication tests covered registration, login, tokens and profile storage. The TrainCore report gives an MAE of 0.0329 for suitability scoring and records 191 distinct recommended exercises. NutriCore reached 100 percent validation accuracy on its prepared set, and allergy filtering excluded the restricted meals in its test. PoseForm passed 17 template checks, three analyzer checks and 24 smoke-test profiles. These results support prototype functionality, but they do not establish clinical effectiveness or guarantee performance for every real user.',
  'Now we will show a short live journey. We will open a prepared profile, then show a generated workout and exercise detail. Next we will show approved meals and a fridge-based alternative. Finally, we will upload a prepared short exercise clip and show the returned PoseForm feedback. We are keeping this to the four key actions rather than touring every tab. If the local network or camera is unavailable, the screenshots we have already shown document the same flow, and we can still explain each backend step.',
  'There are clear limitations. The recommendation models were trained and evaluated on prepared datasets and need broader real-user testing. Meal variety should be expanded to include more regional foods and practical constraints such as cost. PoseForm depends on lighting, camera angle, body visibility and supported exercises. A public release would also require stronger security, privacy review and professional evaluation. Our next step would be to widen the data and test with more users and qualified reviewers.',
  'To conclude, we built a connected mobile prototype rather than three isolated scripts. The user profile drives workout and meal recommendations; expert review adds a human safety layer; and recorded videos produce form feedback through a local analysis pipeline. We verified the main workflows and documented the limits of our tests. Thank you for listening. We are ready for your questions.'
];
if(scripts.length!==pres.slides.items.length || times.length!==scripts.length) throw new Error('Slide timing or speaker script count mismatch');
pres.slides.items.forEach((slide,i)=>slide.speakerNotes.textFrame.setText(`TARGET TIME: ${times[i]}\n\nSPEAKING SCRIPT\n${scripts[i]}\n\nDEFENSE NOTES AND SOURCES\n${noteBodies[i]}`));

await fs.mkdir(build,{recursive:true});
await fs.mkdir(path.dirname(output),{recursive:true});
const draft=path.join(build,'draft.pptx');
await (await PresentationFile.exportPptx(pres)).save(draft);
for(let i=0;i<pres.slides.items.length;i++){
  const slide=pres.slides.items[i];
  const png=await pres.export({slide,format:'png',scale:1});
  await fs.writeFile(path.join(build,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
}
const result=await finalizePresentation({
  workspaceDir:root,
  candidatePath:draft,
  finalPath:output,
  pythonExecutable:py,
  integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit','--require-native-table-slide','5','--require-native-table-slide','15','--require-native-table-slide','16'],
  requiredNativeTableOwnerSlides:[5,15,16],
  fontPolicy:{basis:'design',families:['Arial']},
  verifyArtifactToolImport:true,
  receiptPath:path.join(build,'validation-18min-final.json')
});
console.log(JSON.stringify({output,slides:pres.slides.items.length,result},null,2));
