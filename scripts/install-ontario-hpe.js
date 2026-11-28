/** Register Ontario HPE grades 1–8. Run from project root: node scripts/install-ontario-hpe.js */
'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const manifestPath = path.join(root,'data','curriculum-manifest.json');
const sourcesPath = path.join(root,'data','curriculum-sources.json');
const subject = 'health-physical-education';
const expectedCodes = ['A1','B1','B2','B3','C1','C2','D1','D2','D3'];
const read = file => fs.readFileSync(file,'utf8');
const parse = text => JSON.parse(text.replace(/^\uFEFF/,''));
function insertLastArrayEntry(original, entryStrings) {
  const match = /(\}\s*)(\]\s*\}\s*)$/.exec(original);
  if (!match) throw new Error('Unexpected JSON layout; refusing to rewrite file');
  const index = match.index;
  const newText = original.slice(0,index) + match[1].trimEnd() + ',\n' + entryStrings.join(',\n') + '\n  ' + match[2];
  parse(newText);
  return newText;
}
function requireArray(obj,name) {
  if(!Array.isArray(obj[name])) throw new Error('Expected JSON array: '+name);
}
try {
  const manifestOriginal = read(manifestPath);
  const sourcesOriginal = read(sourcesPath);
  const manifest = parse(manifestOriginal);
  const sources = parse(sourcesOriginal);
  requireArray(manifest,'shards');
  requireArray(sources,'curriculumTracks');
  const newEntries=[];
  for(let g=1;g<=8;g++){
    const id=`ca-on-en-core-health-physical-education-g${g}`;
    const p=`data/curriculum-shards/${id}.json`;
    const shard = parse(read(path.join(root,p)));
    const codes=shard.standards.map(s=>s.standardCode);
    if(shard.metadata.id!==id || codes.join('|')!==expectedCodes.join('|') ||
       shard.standards.some(s=>!s.officialOutcomeText || !s.sourceDocumentId || !s.id || !s.unit)) {
      throw new Error('Invalid shard: '+p);
    }
    if(!manifest.shards.some(e=>e.id===id)){
      const entry={id,label:`Ontario Health and Physical Education Grade ${g} curriculum pieces`,path:p,
        filters:{country:'CA',jurisdictionIds:['ca-on'],programIds:['en-core'],frameworkIds:['ca-on-curriculum'],subjectIds:[subject],gradeLevels:[String(g)]},standardCount:9,aliasCount:0};
      newEntries.push('    '+JSON.stringify(entry,null,2).replace(/\n/g,'\n    '));
    }
  }
  const trackId='ca-on-en-core-health-physical-education';
  const newTrack = !sources.curriculumTracks.some(x=>x.id===trackId)
    ? [{id:trackId,country:'CA',jurisdictionId:'ca-on',frameworkId:'ca-on-curriculum',programId:'en-core',subjectAreaId:subject,subject,
        label:'Ontario Health and Physical Education',sourceUrl:'https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-health-and-physical-education'}]
    : [];
  const newManifest = newEntries.length ? insertLastArrayEntry(manifestOriginal,newEntries) : manifestOriginal;
  const newSources = newTrack.length ? insertLastArrayEntry(sourcesOriginal,newTrack.map(x=>'    '+JSON.stringify(x,null,2).replace(/\n/g,'\n    '))) : sourcesOriginal;
  const finalM=parse(newManifest),finalS=parse(newSources);
  for(let g=1;g<=8;g++){
    const id=`ca-on-en-core-health-physical-education-g${g}`;
    if(finalM.shards.filter(x=>x.id===id).length!==1) throw Error('Duplicate or missing manifest entry: '+id);
  }
  if(finalS.curriculumTracks.filter(x=>x.id===trackId).length!==1) throw Error('Duplicate or missing subject registration');
  if(newManifest!==manifestOriginal){fs.copyFileSync(manifestPath,manifestPath+'.hpe-backup');fs.writeFileSync(manifestPath,newManifest,'utf8');}
  if(newSources!==sourcesOriginal){fs.copyFileSync(sourcesPath,sourcesPath+'.hpe-backup');fs.writeFileSync(sourcesPath,newSources,'utf8');}
  console.log('PASS: Health and Physical Education Grades 1–8');
  console.log('72 overall expectations across 8 files');
  console.log('Added manifest entries:',newEntries.length);
  console.log('Added subject registration:',newTrack.length);
  console.log('Next: node scripts/ontario-curriculum-import.js');
} catch (err) {console.error('FAILED:',err.message);process.exitCode=1;}
