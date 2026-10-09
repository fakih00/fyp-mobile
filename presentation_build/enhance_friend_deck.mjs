import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';
import { pathToFileURL } from 'node:url';

const root='C:/Users/user/Desktop/FYP/fyp-mobile';
const skill='C:/Users/user/.codex/plugins/cache/openai-primary-runtime/presentations/26.923.10815/skills/presentations';
const source=path.join(root,'presentation_output/Elite_Fitness_App_Final_Presentationnnnnn.pptx');
const output=path.join(root,'presentation_output/Elite_Fitness_Friend_Enhanced_Copy_v2.pptx');
const work=path.join(root,'presentation_build/friend_enhanced_v2');
const media=path.join(root,'presentation_build/report/word/media');
const python='C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const { finalizePresentation }=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const ppt=await PresentationFile.importPptx(await FileBlob.load(source));
const W=1280,H=720;
const C={bg:'#F7FAFC',navy:'#111B2D',green:'#04BA87',muted:'#587087',light:'#D7E5ED',white:'#FFFFFF',pale:'#E6FAF2',blue:'#1286E8'};

function shape(slide,x,y,w,h,fill='none',stroke='none',geometry='rect'){
  return slide.shapes.add({geometry,position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:stroke==='none'?0:1}});
}
function text(slide,value,x,y,w,h,size=23,color=C.navy,bold=false,align='left',display=false){
  const s=shape(slide,x,y,w,h);
  s.text=value;
  s.text.style={typeface:display?'Aptos Display':'Aptos',fontSize:size,color,bold,alignment:align,verticalAlignment:'middle',autoFit:'shrinkText',wrap:true};
  return s;
}
async function shot(slide,file,x,y,w,h,alt){
  slide.images.add({blob:new Uint8Array(await fs.readFile(path.join(media,file))),contentType:'image/jpeg',alt,fit:'contain',position:{left:x,top:y,width:w,height:h}});
}
function fresh(number,kicker,title){
  const s=ppt.slides.items[number-1];
  for(const im of [...s.images.items])s.images.deleteById(im.id);
  s.shapes.deleteAll();
  s.background.fill=C.bg;
  shape(s,0,0,W,8,C.green);
  text(s,kicker.toUpperCase(),60,35,1110,31,13,C.green,true);
  text(s,title,60,76,1155,55,32,C.navy,true,'left',true);
  return s;
}
function notes(slide,t){slide.speakerNotes.textFrame.setText(t);}

// Replace conceptual collage with the actual application.
{
  const s=fresh(3,'Product vision','The product: four connected experiences');
  const items=[
    ['image14.jpeg','TRAIN','Personalized workout'],
    ['image19.jpeg','EAT','Daily nutrition plan'],
    ['image26.jpeg','ANALYZE','Recorded-video form'],
    ['image27.jpeg','CONNECT','Community']
  ];
  for(let i=0;i<items.length;i++){
    const x=60+i*298;
    await shot(s,items[i][0],x,149,244,440,items[i][2]+' app screenshot');
    text(s,items[i][1],x,596,244,28,15,C.green,true,'center');
    text(s,items[i][2],x,625,244,34,18,C.navy,true,'center');
  }
  notes(s,'About 45 seconds. These are genuine prototype screenshots from Chapter VI of our report. One profile connects workout planning, nutrition planning, video analysis and community features. Do not present the cover illustration as a live app screen. Source: FYP Report-2026.docx, Chapter VI figures.');
}

// Replace duplicate TrainCore integration proof and mock phones.
{
  const s=fresh(9,'Workout experience','TrainCore in the actual mobile app');
  await shot(s,'image14.jpeg',70,151,272,476,'Workout plan overview screen');
  await shot(s,'image15.jpeg',366,151,272,476,'Daily workout exercise screen');
  text(s,'From profile to plan',686,169,512,45,27,C.navy,true,'left',true);
  const bullets=[
    'Goal, level, location and injuries are read from the saved profile.',
    'TrainCore scores candidate exercises; safety rules exclude conflicts.',
    'The PHP backend stores the plan and returns it to the phone.'
  ];
  bullets.forEach((v,i)=>{
    shape(s,689,254+i*108,7,58,C.green);
    text(s,v,715,246+i*108,484,73,21,C.navy);
  });
  notes(s,'About 55 seconds. Show the real workout plan and daily workout. TrainCore runs on the local backend, ranks exercises from the exercise dataset, applies injury-aware rules, stores the generated plan, then returns it to the mobile interface. The screens come from the report, not a mockup. Source: report Chapter VI; ml/workout_ai/traincore_model.py.');
}

// Replace the first of two NutriCore results slides with what the user sees.
{
  const s=fresh(11,'Nutrition experience','NutriCore: plans, fridge and approved meals');
  await shot(s,'image19.jpeg',64,149,271,473,'Daily nutrition plan screenshot');
  await shot(s,'image20.jpeg',352,149,271,473,'Fridge ingredients screenshot');
  text(s,'Every suggestion passes two gates',677,160,520,63,27,C.navy,true,'left',true);
  text(s,'1',677,267,55,44,27,C.green,true);
  text(s,'Allergy and dislike filters',729,261,470,60,22,C.navy,true);
  text(s,'2',677,363,55,44,27,C.green,true);
  text(s,'Expert approval before display',729,357,470,60,22,C.navy,true);
  shape(s,677,467,514,4,C.green);
  text(s,'The fridge feature proposes swaps using ingredients the user already has.',677,493,518,89,21,C.muted);
  notes(s,'About 60 seconds. The first screenshot shows a daily plan; the second shows the ingredients available at home. The local model ranks candidate meals, but hard filters and expert review control what reaches the final plan. The report uses 72 USDA-based meals and four example profiles for training. Source: report Chapter VI; ml/nutrition_ai/train_model.py.');
}

// Replace repeated PoseForm test counts with a real upload screen.
{
  const s=fresh(13,'PoseForm experience','From uploaded video to form feedback');
  await shot(s,'image26.jpeg',75,148,309,490,'PoseForm record and upload screen');
  const steps=[
    ['1','Record or upload','The phone sends a complete exercise clip.'],
    ['2','Detect landmarks','MediaPipe finds body joints frame by frame.'],
    ['3','Apply local rules','Angles and movement phases estimate reps and form.'],
    ['4','Return JSON','The phone displays score, mistakes and feedback.']
  ];
  steps.forEach((v,i)=>{
    const y=151+i*112;
    text(s,v[0],444,y,60,50,30,C.green,true);
    text(s,v[1],508,y,660,39,22,C.navy,true);
    text(s,v[2],508,y+42,660,57,18,C.muted);
  });
  notes(s,'About 70 seconds. This is the real PoseForm upload/record screen. The PHP backend stores the uploaded file temporarily and invokes the local Python analyzer. MediaPipe is a pretrained landmark detector; our own local movement rules calculate angles, repetition phases, form scores and feedback. We did not train MediaPipe from scratch. Validation counts are summarized on the later results slide. Source: report Chapter VI; backend/controllers/ExerciseAIController.php; ml/exercise_ai/video_pose_analyzer.py.');
}

// Replace the illustrative chart with visible engagement features.
{
  const s=fresh(14,'Daily engagement','Community, challenges and rewards');
  const items=[
    ['image27.jpeg','COMMUNITY','Friends, clubs and posts'],
    ['image30.jpeg','CHALLENGES','Daily missions and points'],
    ['image31.jpeg','REWARDS','Redeem earned points']
  ];
  for(let i=0;i<items.length;i++){
    const x=86+i*390;
    await shot(s,items[i][0],x,153,281,468,items[i][2]+' screenshot');
    text(s,items[i][1],x,621,281,28,15,C.green,true,'center');
    text(s,items[i][2],x,649,281,26,17,C.navy,true,'center');
  }
  notes(s,'About 45 seconds. The app also gives users reasons to return: friends and clubs, challenges, missions and points that can be redeemed for rewards. These screenshots are from the prototype. We removed an illustrative prediction chart from this position because it was not an actual measured outcome. PredictionAI remains listed as a separate module in the technical overview. Source: report Chapters V-VI.');
}

// Replace redundant request sequence with actual safety-related screens.
{
  const s=fresh(16,'Safety by design','Onboarding and expert review in the app');
  const items=[
    ['image10.jpeg','Allergies','Profile input'],
    ['image13.jpeg','Injuries','Training constraints'],
    ['image25.jpeg','Expert review','Meal approval']
  ];
  for(let i=0;i<items.length;i++){
    const x=76+i*395;
    await shot(s,items[i][0],x,150,290,470,items[i][0]+' screenshot');
    text(s,items[i][1],x,621,290,27,18,C.green,true,'center');
    text(s,items[i][2],x,649,290,26,17,C.navy,true,'center');
  }
  notes(s,'About 55 seconds. Safety appears at two points of the journey. Onboarding captures restrictions and injury information before a recommendation is generated. The reviewer later checks meal candidates before they can be shown as approved. These are real app screens and database-backed states, not just diagram boxes. Source: report Chapter VI.');
}

// Correct result framing without changing the strong visual layout.
{
  const train=ppt.slides.items[7];
  for(const sh of train.shapes.items){
    const value=String(sh.text??'');
    if(value.includes('validation MAE'))sh.text.replace('validation MAE','model-fit MAE');
    if(value.includes('Validation MAE'))sh.text.replace('Validation MAE','Model-Fit MAE');
  }
  const s=ppt.slides.items[17];
  for(const sh of s.shapes.items){
    const value=String(sh.text??'');
    if(value.includes('TrainCore Validation MAE')) sh.text.replace('TrainCore Validation MAE','TrainCore Model-Fit MAE');
    if(value.includes('NutriCore Validation Accuracy')) sh.text.replace('NutriCore Validation Accuracy','NutriCore Prepared-Set Accuracy');
    if(value.includes('high validation performance'))sh.text.replace('high validation performance','strong prepared-set results');
  }
  text(s,'Internal project tests; these metrics do not establish clinical performance for new users.',73,591,1128,49,18,C.muted);
  notes(s,'About 55 seconds. TrainCore MAE is based on generated expert-rule suitability labels, not a held-out clinical test. NutriCore accuracy is on prepared meal/profile pairs, so it can overstate generalization to new users. PoseForm 17/17 is a template check count. The metrics are useful prototype evidence, but not clinical validation. Source: report Chapter VI and local training scripts.');
}

// Keep the original deck's remaining slides and visual identity. Add pacing notes
// only where the original slide has no substantive notes.
const timing=['0:35','0:55','0:45','0:45','0:55','1:00','0:45','1:10','0:55','1:10','1:00','1:10','1:10','0:45','0:50','0:55','1:05','0:55','0:50','0:40','0:20'];
for(let i=0;i<ppt.slides.items.length;i++){
  const slide=ppt.slides.items[i];
  const existing=slide.speakerNotes.textFrame.text??'';
  if(!existing.startsWith('TARGET TIME:'))slide.speakerNotes.textFrame.setText(`TARGET TIME: ${timing[i]}\n\n${existing}`);
}

await fs.mkdir(work,{recursive:true});
const candidate=path.join(work,'candidate.pptx');
await (await PresentationFile.exportPptx(ppt)).save(candidate);
for(const number of [3,5,8,9,10,11,12,13,14,15,16,17,18,20,21]){
  const rendered=await ppt.export({slide:ppt.slides.items[number-1],format:'png',scale:1});
  await fs.writeFile(path.join(work,`slide-${number}.png`),new Uint8Array(await rendered.arrayBuffer()));
}
const sha=crypto.createHash('sha256').update(await fs.readFile(source)).digest('hex');
const result=await finalizePresentation({
  workspaceDir:root,candidatePath:candidate,finalPath:output,
  pythonExecutable:python,
  integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],
  fontPolicy:{basis:'reference',families:['Aptos','Aptos Display'],referencePath:source,referenceSha256:sha},
  verifyArtifactToolImport:true,
  receiptPath:path.join(work,'validation.json')
});
console.log(JSON.stringify({output,slides:ppt.slides.items.length,result},null,2));
