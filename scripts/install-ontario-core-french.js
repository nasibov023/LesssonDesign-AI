'use strict';
// Run from the LessonDesign AI repository root: node scripts/install-ontario-core-french.js
// Makes backup copies before editing registry files. Does not touch Git branches.
const fs = require('fs');
const path = require('path');
const manifestPath = path.resolve('data/curriculum-manifest.json');
const sourcesPath = path.resolve('data/curriculum-sources.json');
const ids = Array.from({length:5},(_,i)=>`ca-on-en-core-french-g${i+4}`);
const files = ids.map(id=>`data/curriculum-shards/${id}.json`);
function assert(value, msg) { if (!value) throw new Error(msg); }
function read(p){return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/,''));}
function adapt(value){
  if (Array.isArray(value)) return value.map(adapt);
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,adapt(v)]));
  if(typeof value!=='string') return value;
  return value
    .replace(/https:\/\/www\.dcp\.edu\.gov\.on\.ca\/en\/curriculum\/elementary-arts[^\s]*/g,'https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-fsl/grades-list?language_program=core_french')
    .replace(/ca-on-en-core-arts/g,'ca-on-en-core-french')
    .replace(/ca-on-arts/g,'ca-on-core-french')
    .replace(/The Arts/g,'Core French')
    .replace(/the arts/g,'Core French')
    .replace(/\barts\b/g,'french-as-a-second-language')
    .replace(/\bArts\b/g,'Core French');
}
try {
  const manifest=read(manifestPath), sources=read(sourcesPath);
  assert(Array.isArray(manifest.shards),'Expected manifest.shards array');
  assert(Array.isArray(sources.curriculumTracks),'Expected sources.curriculumTracks array');
  for(const file of files){
    assert(fs.existsSync(file),`Missing ${file}`);
    const j=read(file);
    assert(j.standards && j.standards.length===12,`Expected 12 overall expectations in ${file}`);
    assert(j.metadata.id===path.basename(file,'.json'),`Mismatched ID in ${file}`);
  }
  const artsTemplate=manifest.shards.find(x=>x.id==='ca-on-en-core-arts-g4');
  assert(artsTemplate,'Missing Grade 4 Arts manifest template');
  const artsTrack=sources.curriculumTracks.find(x=>JSON.stringify(x).includes('ca-on-en-core-arts'));
  assert(artsTrack,'Missing existing Arts subject registration template');
  let added=0;
  for(let g=4;g<=8;g++){
    const id=`ca-on-en-core-french-g${g}`;
    if(manifest.shards.some(x=>x.id===id))continue;
    const entry=adapt(artsTemplate);
    entry.id=id;
    entry.label=`Ontario Core French Grade ${g} curriculum pieces`;
    entry.path=`data/curriculum-shards/${id}.json`;
    entry.filters.gradeLevels=[String(g)];
    entry.standardCount=12;
    entry.aliasCount=0;
    manifest.shards.push(entry); added++;
  }
  const newTrack=adapt(artsTrack);
  // Derive source/track identity without relying on unknown non-template schema fields.
  assert(JSON.stringify(newTrack).includes('ca-on-en-core-french'),'Source template conversion failed');
  // Reject duplicates or likely collisions before making any changes.
  const sameTrack=(t)=>JSON.stringify(t)===JSON.stringify(newTrack);
  let registered=0;
  if(!sources.curriculumTracks.some(sameTrack)){
    const collisions=sources.curriculumTracks.filter(t=>t.id && newTrack.id && t.id===newTrack.id);
    assert(collisions.length===0,'Source registration ID collision; inspect manually');
    sources.curriculumTracks.push(newTrack);registered=1;
  }
  if(!added && !registered){ console.log('Already installed: five grades and a Core French subject registration.');process.exit(0);}
  const tag='.core-french-backup';
  fs.copyFileSync(manifestPath,manifestPath+tag);
  fs.copyFileSync(sourcesPath,sourcesPath+tag);
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n','utf8');
  fs.writeFileSync(sourcesPath,JSON.stringify(sources,null,2)+'\n','utf8');
  console.log('PASS: Core French Grades 4–8');
  console.log('60 overall expectations across 5 files');
  console.log('Added manifest entries:',added);
  console.log('Added subject registration:',registered);
  console.log('Backups:',tag);
  console.log('Next: node scripts/ontario-curriculum-import.js');
} catch(e){ console.error('ERROR:',e.message);process.exitCode=1; }
