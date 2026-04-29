// ═══ Resume AI Engine — Client-side Resume Optimization ═══
var resumeText='',resumeJSON=null,startTime=0;
if(typeof pdfjsLib!=='undefined')pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Tab switching
function showTab(n,el){
  ['preview','json','metrics'].forEach(function(t){var e=document.getElementById('tab-'+t);if(e)e.style.display=t===n?'block':'none'});
  el.closest('.output-tabs').querySelectorAll('.out-tab').forEach(function(t){t.classList.remove('active')});
  el.classList.add('active');
}
function selectRadio(el){el.parentElement.querySelectorAll('.radio-opt').forEach(function(o){o.classList.remove('sel')});el.classList.add('sel')}
function setStep(n){
  for(var i=1;i<=4;i++){var s=document.getElementById('step-'+i);if(!s)continue;s.className='step';s.querySelector('.step-num').textContent=i;
    if(i<n){s.className='step done';s.querySelector('.step-num').textContent='✓'}else if(i===n){s.className='step active'}}
}
function updateJDTokens(){var v=document.getElementById('jd-input').value.trim();document.getElementById('jd-word-count').textContent=v?v.split(/\s+/).length:0;checkReady()}
function checkReady(){
  var ok=resumeText.length>20;var btn=document.getElementById('optimize-btn');
  btn.disabled=!ok;btn.style.opacity=ok?'1':'0.5';
  document.getElementById('btn-text').textContent=ok?'Optimize resume →':'Upload a resume to begin →';
  if(resumeText.length>20)setStep(2);
}
function toggleExtractedText(){var w=document.getElementById('extracted-text-wrap'),b=document.getElementById('toggle-extract-btn');
  if(w.style.display==='none'){w.style.display='block';b.textContent='hide'}else{w.style.display='none';b.textContent='show'}}
function clearResume(){
  resumeText='';resumeJSON=null;
  document.getElementById('upload-placeholder').style.display='block';document.getElementById('upload-success').style.display='none';
  document.getElementById('clear-resume-btn').style.display='none';document.getElementById('extracted-text-panel').style.display='none';
  document.getElementById('resume-word-count').textContent='0';document.getElementById('resume-char-count').textContent='0';
  setStep(1);checkReady();
}
function onTextExtracted(text){
  resumeText=text.replace(/\r\n/g,'\n').replace(/[ \t]+/g,' ').trim();
  document.getElementById('upload-progress').style.width='100%';
  document.getElementById('uploaded-file-meta').textContent=document.getElementById('uploaded-file-meta').textContent.replace('extracting text...','text extracted ✓');
  document.getElementById('extracted-text').value=resumeText;
  document.getElementById('extracted-text-panel').style.display='block';
  var wc=resumeText.split(/\s+/).length;
  document.getElementById('resume-word-count').textContent=wc.toLocaleString();
  document.getElementById('resume-char-count').textContent=resumeText.length.toLocaleString();
  checkReady();
}
// File handlers
document.addEventListener('DOMContentLoaded',function(){
  var fi=document.getElementById('resume-file-input');if(fi)fi.addEventListener('change',function(e){if(e.target.files[0])handleFile(e.target.files[0])});
  var dz=document.getElementById('drop-zone');if(dz){
    dz.addEventListener('dragover',function(e){e.preventDefault();dz.style.borderColor='var(--accent)'});
    dz.addEventListener('dragleave',function(){dz.style.borderColor=''});
    dz.addEventListener('drop',function(e){e.preventDefault();dz.style.borderColor='';if(e.dataTransfer.files.length)handleFile(e.dataTransfer.files[0])});
  }
});
function handleFile(file){
  if(!file)return;var ext=file.name.split('.').pop().toLowerCase(),sz=(file.size/1024).toFixed(1)+'KB';
  document.getElementById('uploaded-file-name').textContent=file.name;
  document.getElementById('uploaded-file-meta').textContent=sz+' · '+ext.toUpperCase()+' · extracting text...';
  document.getElementById('upload-placeholder').style.display='none';
  document.getElementById('upload-success').style.display='block';
  document.getElementById('upload-progress').style.width='30%';
  document.getElementById('clear-resume-btn').style.display='inline-block';
  if(ext==='pdf')extractPDF(file);else if(ext==='docx'||ext==='doc')extractDOCX(file);else if(ext==='txt')extractTXT(file);
  else{document.getElementById('uploaded-file-meta').textContent='Unsupported format'}
}
function extractPDF(file){
  var reader=new FileReader();reader.onload=function(){
    var arr=new Uint8Array(reader.result);document.getElementById('upload-progress').style.width='50%';
    pdfjsLib.getDocument({data:arr}).promise.then(function(pdf){
      var pages=[],done=0;
      for(var i=1;i<=pdf.numPages;i++)(function(pi){
        pdf.getPage(pi).then(function(pg){return pg.getTextContent()}).then(function(tc){
          pages[pi-1]=tc.items.map(function(it){return it.str}).join(' ');done++;
          document.getElementById('upload-progress').style.width=(50+50*done/pdf.numPages)+'%';
          if(done===pdf.numPages)onTextExtracted(pages.join('\n'));
        });
      })(i);
    }).catch(function(){document.getElementById('uploaded-file-meta').textContent='PDF extraction failed'});
  };reader.readAsArrayBuffer(file);
}
function extractDOCX(file){
  var reader=new FileReader();reader.onload=function(){
    document.getElementById('upload-progress').style.width='60%';
    mammoth.extractRawText({arrayBuffer:reader.result}).then(function(r){onTextExtracted(r.value)})
    .catch(function(){document.getElementById('uploaded-file-meta').textContent='DOCX extraction failed'});
  };reader.readAsArrayBuffer(file);
}
function extractTXT(file){var reader=new FileReader();reader.onload=function(){onTextExtracted(reader.result)};reader.readAsText(file)}

// ═══ Resume Parser ═══
function parseResume(text,jd){
  var lines=text.split('\n').map(function(l){return l.trim()}).filter(function(l){return l.length>0});
  var res={personal_information:{name:'',email:'',phone:'',location:'',socials:[]},summary:'',experiences:[],education:[],skills:[],projects:[],certifications:[],awards:[],extracurricular_achievements:[],languages:[]};
  // Extract email
  var em=text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);if(em)res.personal_information.email=em[0];
  // Extract phone
  var ph=text.match(/[\+]?[\d\s\-\(\)]{10,}/);if(ph)res.personal_information.phone=ph[0].trim();
  // Name extraction — multi-strategy
  var nameFound=false;
  // Strategy 1: Look for ALL-CAPS name in first 8 lines (common in resumes)
  for(var i=0;i<Math.min(8,lines.length)&&!nameFound;i++){
    var capMatch=lines[i].match(/^([A-Z][A-Z\s.'-]{2,50})$/);
    if(capMatch&&!lines[i].match(/@/)&&!lines[i].match(/^http/)&&!lines[i].match(/resume|curriculum|vitae|summary|objective|experience|education|skills|phone|email|address/i)){
      res.personal_information.name=capMatch[1].trim();nameFound=true}
  }
  // Strategy 2: Look for "Name: ..." or first line with 2-4 capitalized words
  for(var i=0;i<Math.min(8,lines.length)&&!nameFound;i++){
    var nmLabel=lines[i].match(/^name[:\s]+(.+)/i);
    if(nmLabel){res.personal_information.name=nmLabel[1].trim();nameFound=true;break}
    // 2-5 capitalized words, no special chars except dots/hyphens
    var wordMatch=lines[i].match(/^([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,4})$/);
    if(wordMatch&&!lines[i].match(/@/)&&!lines[i].match(/^http/)&&!lines[i].match(/resume|curriculum|summary|objective|experience|education|skills|phone|address/i)&&lines[i].length<50){
      res.personal_information.name=wordMatch[1].trim();nameFound=true}
  }
  // Strategy 3: Fallback — first short line that isn't contact info or section header
  for(var i=0;i<Math.min(6,lines.length)&&!nameFound;i++){
    var ln=lines[i];
    if(ln.length>2&&ln.length<60&&!ln.match(/@/)&&!ln.match(/^[\+\(]?\d/)&&!ln.match(/^http/)&&!ln.match(/resume|curriculum|vitae|summary|objective|experience|education|skills|phone|email|address|linkedin|github/i)){
      res.personal_information.name=ln;nameFound=true}
  }
  // Strategy 4: If email found, try to derive name from email prefix
  if(!nameFound&&res.personal_information.email){
    var prefix=res.personal_information.email.split('@')[0].replace(/[\d._-]+/g,' ').trim();
    if(prefix.length>2)res.personal_information.name=prefix.split(' ').map(function(w){return w.charAt(0).toUpperCase()+w.slice(1)}).join(' ');
  }
  // Extract links
  var urls=text.match(/https?:\/\/[^\s,]+/g)||[];
  urls.forEach(function(u){if(u.includes('linkedin'))res.personal_information.socials.push({name:'LinkedIn',link:u});
    else if(u.includes('github'))res.personal_information.socials.push({name:'GitHub',link:u})});
  // Section detection
  var secMap={},curSec='header',secStart={};
  var secPatterns=[
    {key:'summary',re:/^(summary|profile|objective|about)/i},
    {key:'experience',re:/^(experience|work|employment|professional)/i},
    {key:'education',re:/^(education|academic|qualification)/i},
    {key:'skills',re:/^(skills|technical|technologies|competenc)/i},
    {key:'projects',re:/^(project|portfolio)/i},
    {key:'certifications',re:/^(certif|license|credential)/i},
    {key:'awards',re:/^(award|honor|achievement|recognition)/i},
    {key:'languages',re:/^(language)/i}
  ];
  var sections=[];
  lines.forEach(function(line,idx){
    for(var p=0;p<secPatterns.length;p++){
      if(secPatterns[p].re.test(line)&&line.length<50){sections.push({key:secPatterns[p].key,start:idx});break}
    }
  });
  // Group lines by section
  var grouped={};
  sections.forEach(function(s,si){
    var end=si<sections.length-1?sections[si+1].start:lines.length;
    grouped[s.key]=lines.slice(s.start+1,end);
  });
  // Summary
  if(grouped.summary)res.summary=grouped.summary.join(' ');
  else{var sumLines=[];for(var i=1;i<Math.min(6,lines.length);i++){if(lines[i].length>60){sumLines.push(lines[i]);if(sumLines.length>=3)break}}
    res.summary=sumLines.join(' ')}
  // JD keyword boost for summary
  if(jd&&res.summary){var jdWords=extractKeywords(jd);var sumWords=res.summary.toLowerCase();
    var missing=jdWords.filter(function(w){return sumWords.indexOf(w.toLowerCase())===-1}).slice(0,3);
    if(missing.length>0)res.summary+=' Experienced in '+missing.join(', ')+'.'}
  // Skills
  if(grouped.skills){var allSkills=grouped.skills.join(', ').split(/[,·•|;]/);
    var cleaned=allSkills.map(function(s){return s.trim()}).filter(function(s){return s.length>1&&s.length<40});
    var cats=groupSkills(cleaned,jd);res.skills=cats}
  else{var found=findSkillsInText(text,jd);res.skills=found}
  // Experience
  if(grouped.experience){res.experiences=parseExperience(grouped.experience,jd)}
  // Education
  if(grouped.education){res.education=parseEducation(grouped.education)}
  // Projects
  if(grouped.projects){res.projects=parseProjects(grouped.projects)}
  // Languages
  if(grouped.languages){res.languages=grouped.languages.join(', ').split(/[,;]/).map(function(l){return l.trim()}).filter(function(l){return l.length>1})}
  // Location from text
  var loc=text.match(/([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)?(?:,\s*[A-Z]{2,})?)/);
  if(loc&&!res.personal_information.location)res.personal_information.location=loc[0];
  return res;
}
function extractKeywords(jd){
  var stops='the,a,an,and,or,but,in,on,at,to,for,of,with,is,are,was,were,be,been,being,have,has,had,do,does,did,will,would,could,should,may,might,shall,can,need,must,we,you,our,your,this,that,it,its,from,by,as,not,no,also,about,into'.split(',');
  return jd.split(/[\s,;.()\[\]]+/).filter(function(w){return w.length>2&&stops.indexOf(w.toLowerCase())===-1}).map(function(w){return w.replace(/[^a-zA-Z0-9+#.]/g,'')}).filter(function(w){return w.length>2});
}
var KNOWN_SKILLS=['JavaScript','TypeScript','Python','Java','C++','C#','Go','Rust','Ruby','PHP','Swift','Kotlin','R','SQL','HTML','CSS','React','Angular','Vue','Node.js','Express','Django','Flask','FastAPI','Spring Boot','Docker','Kubernetes','AWS','GCP','Azure','Git','MongoDB','PostgreSQL','MySQL','Redis','GraphQL','REST','TensorFlow','PyTorch','Pandas','NumPy','Scikit-learn','Machine Learning','Deep Learning','NLP','LLM','RAG','Computer Vision','Data Analysis','CI/CD','Jenkins','Terraform','Linux','Agile','Scrum','Figma','Tableau','Power BI','Excel','Spark','Hadoop','Kafka','RabbitMQ','Elasticsearch'];
function findSkillsInText(text,jd){
  var found=[];var tl=text.toLowerCase();
  KNOWN_SKILLS.forEach(function(s){if(tl.indexOf(s.toLowerCase())!==-1)found.push(s)});
  if(jd){var jdl=jd.toLowerCase();KNOWN_SKILLS.forEach(function(s){if(jdl.indexOf(s.toLowerCase())!==-1&&found.indexOf(s)===-1)found.push(s)})}
  return groupSkills(found,jd);
}
function groupSkills(skills,jd){
  var cats={Languages:[],Frameworks:[],Cloud:[],Data:[],Tools:[],Other:[]};
  var map={JavaScript:'Languages',TypeScript:'Languages',Python:'Languages',Java:'Languages','C++':'Languages','C#':'Languages',Go:'Languages',Rust:'Languages',Ruby:'Languages',PHP:'Languages',Swift:'Languages',Kotlin:'Languages',R:'Languages',SQL:'Languages',
    React:'Frameworks',Angular:'Frameworks',Vue:'Frameworks','Node.js':'Frameworks',Express:'Frameworks',Django:'Frameworks',Flask:'Frameworks',FastAPI:'Frameworks','Spring Boot':'Frameworks',
    Docker:'Cloud',Kubernetes:'Cloud',AWS:'Cloud',GCP:'Cloud',Azure:'Cloud',Terraform:'Cloud',
    MongoDB:'Data',PostgreSQL:'Data',MySQL:'Data',Redis:'Data',TensorFlow:'Data',PyTorch:'Data',Pandas:'Data',NumPy:'Data','Scikit-learn':'Data','Machine Learning':'Data','Deep Learning':'Data',NLP:'Data',LLM:'Data',RAG:'Data',Spark:'Data',Hadoop:'Data',
    Git:'Tools',Jenkins:'Tools','CI/CD':'Tools',Linux:'Tools',Agile:'Tools',Figma:'Tools',Tableau:'Tools'};
  skills.forEach(function(s){var c=map[s]||'Other';if(cats[c])cats[c].push(s);else cats.Other.push(s)});
  var result=[];Object.keys(cats).forEach(function(k){if(cats[k].length>0)result.push({name:k,data:cats[k]})});
  return result.length>0?result:[{name:'Skills',data:skills}];
}
function parseExperience(lines,jd){
  var exps=[],cur=null;var dateRe=/(\w+\s+\d{4})\s*[-–—to]+\s*(\w+\s*\d{0,4}|present|current)/i;
  var titleRe=/^(.+?)\s*[·|@–-]\s*(.+)$/;
  lines.forEach(function(l){
    var dm=l.match(dateRe);var tm=l.match(titleRe);
    if(tm&&l.length<80){if(cur)exps.push(cur);cur={designation:tm[1].trim(),companyName:tm[2].trim(),location:'',start_date:'',end_date:'',points:[]};
      if(dm){cur.start_date=dm[1];cur.end_date=dm[2]}}
    else if(dm&&!cur){if(cur)exps.push(cur);cur={designation:'',companyName:'',location:'',start_date:dm[1],end_date:dm[2],points:[]}}
    else if(dm&&cur&&!cur.start_date){cur.start_date=dm[1];cur.end_date=dm[2]}
    else if(cur&&(l.startsWith('•')||l.startsWith('-')||l.startsWith('·')||l.startsWith('*')||l.match(/^\d+\./))){
      var bullet=l.replace(/^[•\-·*]\s*/,'').replace(/^\d+\.\s*/,'');if(bullet.length>10)cur.points.push(bullet)}
    else if(cur&&l.length>30&&cur.points.length<8){cur.points.push(l)}
  });
  if(cur)exps.push(cur);
  if(exps.length===0)exps.push({designation:'Professional',companyName:'See resume',start_date:'',end_date:'Present',location:'',points:['See full resume for details']});
  return exps;
}
function parseEducation(lines){
  var edus=[],cur=null;var degRe=/(bachelor|master|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|ph\.?d|associate|diploma|b\.?tech|m\.?tech|mba)/i;
  var dateRe=/(\d{4})\s*[-–—to]+\s*(\d{4}|present|current|expected)/i;
  lines.forEach(function(l){
    if(degRe.test(l)||l.match(/university|college|institute|school/i)){
      if(cur)edus.push(cur);cur={institution:'',degree:'',location:'',start_date:'',end_date:'',gpa:''};
      if(degRe.test(l))cur.degree=l;else cur.institution=l}
    else if(cur){var dm=l.match(dateRe);if(dm){cur.start_date=dm[1];cur.end_date=dm[2]}
      var gm=l.match(/gpa[:\s]*(\d+\.?\d*)/i);if(gm)cur.gpa=gm[1];
      if(!cur.institution&&l.match(/university|college|institute/i))cur.institution=l;
      if(!cur.degree&&degRe.test(l))cur.degree=l}
  });
  if(cur)edus.push(cur);return edus;
}
function parseProjects(lines){
  var projs=[],cur=null;
  lines.forEach(function(l){
    if(l.length<60&&!l.startsWith('•')&&!l.startsWith('-')){
      if(cur)projs.push(cur);cur={projectName:l,caption:'',start_date:'',end_date:'',projectDetails:[],technologiesUsed:[],externalSources:[]}}
    else if(cur){var bl=l.replace(/^[•\-·*]\s*/,'');if(bl.length>5)cur.projectDetails.push(bl)}
  });
  if(cur)projs.push(cur);return projs;
}

// ═══ Optimization & Output ═══
function optimizeResume(){
  startTime=performance.now();var btn=document.getElementById('btn-text');btn.textContent='⏳ Analyzing resume...';
  document.getElementById('optimize-btn').disabled=true;document.getElementById('optimize-status').textContent='Parsing document structure...';
  setStep(3);
  setTimeout(function(){
    var jd=document.getElementById('jd-input').value.trim();
    document.getElementById('optimize-status').textContent='Extracting sections & skills...';
    setTimeout(function(){
      resumeJSON=parseResume(resumeText,jd);
      document.getElementById('optimize-status').textContent='Generating optimized output...';
      setTimeout(function(){renderResults(resumeJSON,jd);},400);
    },500);
  },400);
}
function renderResults(data,jd){
  var elapsed=((performance.now()-startTime)/1000).toFixed(1)+'s';
  // Preview
  var h='<h4>'+esc(data.personal_information.name||'Candidate')+'</h4>';
  h+='<div class="rp-meta">'+esc([data.personal_information.email,data.personal_information.phone,data.personal_information.location].filter(Boolean).join(' · '))+'</div>';
  if(data.summary)h+='<div class="rp-section"><div class="rp-sec-title">Summary</div><p style="font-size:12px;margin:0;color:var(--text-muted)">'+esc(data.summary)+'</p></div>';
  if(data.experiences.length){h+='<div class="rp-section"><div class="rp-sec-title">Experience</div>';
    data.experiences.forEach(function(e){h+='<div class="rp-role">'+esc(e.designation+(e.companyName?' · '+e.companyName:''))+'</div>';
      h+='<div class="rp-company">'+esc([e.start_date,e.end_date].filter(Boolean).join(' – ')+' · '+e.location)+'</div>';
      if(e.points.length){h+='<ul class="rp-bullets" style="margin-top:5px">';e.points.forEach(function(p){h+='<li>'+esc(p)+'</li>'});h+='</ul>'}});h+='</div>'}
  if(data.education.length){h+='<div class="rp-section"><div class="rp-sec-title">Education</div>';
    data.education.forEach(function(e){h+='<div class="rp-role">'+esc(e.degree||e.institution)+'</div>';
      h+='<div class="rp-company">'+esc([e.institution,e.start_date&&e.end_date?e.start_date+' – '+e.end_date:'',e.gpa?'GPA: '+e.gpa:''].filter(Boolean).join(' · '))+'</div>'});h+='</div>'}
  if(data.skills.length){h+='<div class="rp-section"><div class="rp-sec-title">Skills</div><div class="skill-pills">';
    data.skills.forEach(function(cat){cat.data.forEach(function(s){h+='<span class="skill-pill">'+esc(s)+'</span>'})});h+='</div></div>'}
  document.getElementById('preview-content').innerHTML=h;document.getElementById('preview-content').style.display='block';document.getElementById('preview-placeholder').style.display='none';
  // JSON
  var jsonStr=JSON.stringify(data,null,2);document.getElementById('json-output').textContent=jsonStr;
  document.getElementById('json-content').style.display='block';document.getElementById('json-placeholder').style.display='none';
  var valid=data.personal_information&&data.summary&&data.experiences.length&&data.education.length&&data.skills.length;
  document.getElementById('json-validation').innerHTML=valid?'<span class="tag green">Schema valid</span><span style="color:var(--text-dim)">All required fields present</span>':'<span class="tag amber">Partial</span><span style="color:var(--text-dim)">Some fields may need review</span>';
  // Metrics
  var totalSkills=0;data.skills.forEach(function(c){totalSkills+=c.data.length});
  var secs=['summary','experiences','education','skills','projects','certifications'].filter(function(k){var v=data[k];return v&&(typeof v==='string'?v.length>0:v.length>0)}).length;
  var jdMatch=0;if(jd){var jdKw=extractKeywords(jd);var resumeL=JSON.stringify(data).toLowerCase();var matched=jdKw.filter(function(w){return resumeL.indexOf(w.toLowerCase())!==-1});jdMatch=jdKw.length?Math.round(matched.length/jdKw.length*100):0}
  document.getElementById('m-schema').textContent=valid?'100%':'Partial';document.getElementById('m-schema').style.color=valid?'#34d399':'#f59e0b';
  document.getElementById('m-similarity').textContent=jdMatch+'%';document.getElementById('m-similarity').style.color=jdMatch>50?'#34d399':'#f59e0b';
  document.getElementById('m-skills').textContent=totalSkills;document.getElementById('m-sections').textContent=secs;
  document.getElementById('m-latency').textContent=elapsed;document.getElementById('m-words').textContent=resumeText.split(/\s+/).length.toLocaleString();
  document.getElementById('metrics-content').style.display='block';document.getElementById('metrics-placeholder').style.display='none';
  document.getElementById('download-panel').style.display='block';
  // Update UI
  setStep(4);document.getElementById('btn-text').textContent='✅ Optimization complete!';
  document.getElementById('optimize-btn').style.background='var(--accent3)';document.getElementById('optimize-status').textContent='';
  setTimeout(function(){document.getElementById('btn-text').textContent='Re-optimize resume →';document.getElementById('optimize-btn').disabled=false;document.getElementById('optimize-btn').style.background='var(--accent)'},2500);
}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

// ═══ PDF & JSON Download ═══
function downloadPDF(){
  if(!resumeJSON)return;var d=resumeJSON;var pdf=new jspdf.jsPDF();var y=20,lm=20,pw=170;
  pdf.setFont('helvetica','bold');pdf.setFontSize(18);pdf.text(d.personal_information.name||'Resume',lm,y);y+=8;
  pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(100);
  pdf.text([d.personal_information.email,d.personal_information.phone,d.personal_information.location].filter(Boolean).join(' | '),lm,y);y+=10;
  pdf.setDrawColor(79,124,255);pdf.line(lm,y,lm+pw,y);y+=8;pdf.setTextColor(0);
  function addSec(title){pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.setTextColor(50,80,200);pdf.text(title.toUpperCase(),lm,y);y+=6;pdf.setTextColor(0);pdf.setFont('helvetica','normal');pdf.setFontSize(10)}
  function checkPage(){if(y>270){pdf.addPage();y=20}}
  if(d.summary){addSec('Summary');var sl=pdf.splitTextToSize(d.summary,pw);pdf.text(sl,lm,y);y+=sl.length*5+6;checkPage()}
  if(d.experiences.length){addSec('Experience');d.experiences.forEach(function(e){checkPage();
    pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.text((e.designation||'')+(e.companyName?' — '+e.companyName:''),lm,y);y+=5;
    pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(100);pdf.text([e.start_date,e.end_date].filter(Boolean).join(' – '),lm,y);y+=5;pdf.setTextColor(0);pdf.setFontSize(10);
    e.points.forEach(function(p){checkPage();var bl=pdf.splitTextToSize('• '+p,pw-5);pdf.text(bl,lm+3,y);y+=bl.length*5+1});y+=4})}
  if(d.education.length){addSec('Education');d.education.forEach(function(e){checkPage();
    pdf.setFont('helvetica','bold');pdf.text(e.degree||e.institution||'',lm,y);y+=5;
    pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text([e.institution,e.start_date&&e.end_date?e.start_date+' – '+e.end_date:'',e.gpa?'GPA: '+e.gpa:''].filter(Boolean).join(' | '),lm,y);y+=7;pdf.setFontSize(10)})}
  if(d.skills.length){checkPage();addSec('Skills');d.skills.forEach(function(c){var line=c.name+': '+c.data.join(', ');var sl=pdf.splitTextToSize(line,pw);pdf.text(sl,lm,y);y+=sl.length*5+2;checkPage()})}
  pdf.save((d.personal_information.name||'resume').replace(/\s+/g,'_')+'_optimized.pdf');
}
function downloadJSON(){if(!resumeJSON)return;var b=new Blob([JSON.stringify(resumeJSON,null,2)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='optimized_resume.json';a.click()}
function copyJSON(){if(!resumeJSON)return;navigator.clipboard.writeText(JSON.stringify(resumeJSON,null,2)).then(function(){var b=document.getElementById('copy-json-btn');b.textContent='✓ Copied!';setTimeout(function(){b.textContent='⎘ Copy JSON'},2000)})}
