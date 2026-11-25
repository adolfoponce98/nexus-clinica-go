const fs=require('fs'),path=require('path'),assert=require('assert');
const modules='C:/Users/Adolfo/Documents/google_functions/nexus-clinq-go-functions/functions/node_modules/';
const puppeteer=require(modules+'puppeteer'),Crypto=require(modules+'crypto-js');
const root='D:/GitHub/nexus-admin-nexo-salud',out=root+'/recipe-skeletons-qa',base=root+'/dist/beast-admin-angular/browser';fs.mkdirSync(out,{recursive:true});
const key=fs.readFileSync(root+'/src/app/config/security.config.ts','utf8').match(/ENCRYPTION_KEY:\s*["']([^"']+)/)[1];
(async()=>{const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});try{
const page=await browser.newPage();await page.evaluateOnNewDocument(()=>{const original=URL.createObjectURL.bind(URL);window.__qaBlobs=[];URL.createObjectURL=value=>{window.__qaBlobs.push(value);return original(value);};});await page.setViewport({width:1440,height:1000});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const logo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=500;c.height=250;const x=c.getContext('2d');x.fillStyle='#075985';x.fillRect(220,20,60,160);x.fillRect(170,70,160,60);x.font='32px Arial';x.textAlign='center';x.fillText('CLÍNICA DE PRUEBA',250,230);return c.toDataURL();});
const signature=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=300;c.height=90;const x=c.getContext('2d');x.font='italic 32px cursive';x.fillText('Dra. Prueba',10,55);return c.toDataURL();});
const session={email:'qa@example.test',fullName:'Dra. María de Prueba',typeUser:1,especialidades:['TRAUM']};const token='a.'+Buffer.from(JSON.stringify({...session,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.s';
const doctor={fullName:'Dra. María de Prueba',profession:'Médica cirujana',specialty:'Medicina general',professionalLicense:'12345678',educationalInstitution:'Universidad de Guadalajara',signatureImage:signature};
const office={idConsultorio:'office-qa',name:'Clínica de Prueba',address:'Av. de prueba 123, Guadalajara, Jalisco',phone:'3312345678',codigoConsultorio:'123456',logoUrl:logo};
let target='',pending=null,release=()=>{};
const patient={idPaciente:'patient-qa',expedienteId:'record-qa',numeroDeExpediente:'EXP-123456-20261121-001',fichaDeIdentificacion:{nombreCompleto:'Paciente de Prueba',edad:35,fechaNacimiento:'1991-01-20'},clinicalCoreDraft:{familyHistory:'Madre con antecedente de prueba',pathologicalHistory:'Antecedente patológico de prueba',nonPathologicalHistory:'Vacunación registrada',priorTreatments:'Tratamiento previo registrado'},followUps:[]};const saved=[];
await page.evaluateOnNewDocument(({office,session})=>{localStorage.setItem('theme','light');localStorage.setItem('cliniq-go-session',JSON.stringify(session));localStorage.setItem('cliniq-go-sucursal_data',JSON.stringify(office));localStorage.setItem('cliniq-go-all_branches_cache',JSON.stringify([office]));},{office,session});
await page.setRequestInterception(true);page.on('request',async req=>{try{const url=req.url();if(url.startsWith('data:'))return req.continue();
if(url.startsWith('https://clinica-go.com')&&req.method()==='GET'){let file=path.resolve(base,'.'+decodeURIComponent(new URL(url).pathname));if(!file.startsWith(path.resolve(base)+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=base+'/index.html';return req.respond({status:200,contentType:({'.js':'application/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}
if(req.method()==='OPTIONS')return req.respond({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
if(req.method()==='GET')return req.respond({status:200,body:''});let body={};try{body=JSON.parse(Crypto.AES.decrypt(JSON.parse(req.postData()||'{}').encryptedData,key).toString(Crypto.enc.Utf8));}catch{}
const response={success:true,consultorios:[office],patients:[],appointments:[],notifications:[],lastUpdated:new Date().toISOString(),devices:[]};
if(/refresh/i.test(url))response.accessToken=token;
if(/getaccountentitlements/i.test(url))response.entitlements={active:true,planId:'pro',planName:'Profesional',expiresAt:new Date(Date.now()+86400000).toISOString(),features:{ai:true,reports:true,charts:true},limits:{patients:null,offices:null,services:null,employees:null},usage:{patients:2,offices:1,services:1,employees:0},aiCredits:10};
if(pending&&((target==='signature'&&/getclinicalidentity/i.test(url))||(target==='logo'&&/getprescriptionbranding/i.test(url))||(target==='templates'&&/getprescriptionsettings/i.test(url))))await pending;
if(/getclinicalidentity/i.test(url))response.profile=doctor;if(/getprescriptionbranding/i.test(url))Object.assign(response,{doctorLogoUrl:logo,officeLogoUrl:logo,officeName:office.name,canEditOffice:true});if(/getprescriptionsettings/i.test(url))Object.assign(response,{doctor,office,settings:{templateId:'ocean',orientation:'portrait',revision:1}});
if(/getpatientexpedient/i.test(url))response.patient=patient;if(/getappointments/i.test(url))response.data=[];
if(/savepatientfollowup/i.test(url)){saved.push(body);Object.assign(response,{followUpId:body.requestId,numeroDeConsulta:'EXP-C-001'});}
return req.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({encryptedData:Crypto.AES.encrypt(JSON.stringify(response),key).toString()})});}catch(e){console.error(e);try{await req.abort();}catch{}}});




await page.setViewport({width:1280,height:800});await page.goto('https://clinica-go.com/recetas',{waitUntil:'networkidle0'});const results=[];
for(const [kind,title]of [['signature','Firma Digitalizada'],['logo','Digitalizar Logo'],['templates','Receta Médica']]){
 target=kind;pending=new Promise(resolve=>release=resolve);await page.evaluate(title=>[...document.querySelectorAll('button')].find(b=>b.querySelector('h3')?.textContent.trim()===title).click(),title);await page.waitForSelector('app-clinical-content-skeleton [aria-busy=true]');
 const expected=kind==='templates'?'.template-placeholder':'.asset-preview';assert(await page.$('app-clinical-content-skeleton '+expected));await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.target?.closest?.('mat-dialog-container')&&a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});await page.screenshot({path:out+'/'+kind+'-loading-1280.png'});release();pending=null;
 await page.waitForFunction(()=>!document.querySelector('app-clinical-content-skeleton'));
 if(kind==='templates'){await page.waitForFunction(()=>document.querySelectorAll('.template-option').length===10);assert(await page.$('app-prescription-document'));}else{await page.waitForSelector(kind==='signature'?'.signature-preview img':'.logo-stage img');await page.click('.asset-dialog .close');await page.waitForFunction(()=>!document.querySelector('app-clinical-asset-dialog'));}
 results.push({kind,skeleton:true,replacedAfterLoad:true});
}
assert.deepEqual(errors,[]);console.log(JSON.stringify({results,templates:10,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
