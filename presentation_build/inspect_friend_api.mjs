import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const p=await PresentationFile.importPptx(await FileBlob.load('C:/Users/user/Desktop/FYP/fyp-mobile/presentation_output/Elite_Fitness_App_Final_Presentationnnnnn.pptx'));
const slide=p.slides.items[8];
const proto=(x)=>Object.getOwnPropertyNames(Object.getPrototypeOf(x)).filter(k=>!k.startsWith('_'));
console.log('presentation.slides',proto(p.slides));
console.log('slide',proto(slide));
console.log('slide.shapes',proto(slide.shapes));
console.log('shape',proto(slide.shapes.items[0]));
console.log('counts',p.slides.items.length,slide.shapes.items.length,slide.images.items.length,slide.tables.items.length);
console.log('selected collections', [3,9,11,13,14,16,18].map(n=>[n,p.slides.items[n-1].shapes.items.length,p.slides.items[n-1].images.items.length,p.slides.items[n-1].tables.items.length]));
console.log('images methods',proto(slide.images));
console.log('slide names',p.slides.items.map((s,i)=>[i+1,s.shapes.items.filter(x=>x.text?.toString?.()).slice(0,3).map(x=>String(x.text)).join('|').slice(0,80)]));
