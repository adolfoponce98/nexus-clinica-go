const fs=require('fs'),path=require('path'),assert=require('assert');
const modules='C:/Users/Adolfo/Documents/google_functions/nexus-clinq-go-functions/functions/node_modules/';
const puppeteer=require(modules+'puppeteer'),Crypto=require(modules+'crypto-js');
const root='D:/GitHub/nexus-admin-nexo-salud',out=root+'/review-guide-options-qa',base=root+'/dist/beast-admin-angular/browser';fs.mkdirSync(out,{recursive:true});
const key=fs.readFileSync(root+'/src/app/config/security.config.ts','utf8').match(/ENCRYPTION_KEY:\s*["']([^"']+)/)[1];
(async()=>{const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});try{
const page=await browser.newPage();await page.evaluateOnNewDocument(()=>{const original=URL.createObjectURL.bind(URL);window.__qaBlobs=[];URL.createObjectURL=value=>{window.__qaBlobs.push(value);return original(value);};});await page.setViewport({width:1440,height:1000});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const logo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=500;c.height=250;const x=c.getContext('2d');x.fillStyle='#075985';x.fillRect(220,20,60,160);x.fillRect(170,70,160,60);x.font='32px Arial';x.textAlign='center';x.fillText('CLÍNICA DE PRUEBA',250,230);return c.toDataURL();});
const signature=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=300;c.height=90;const x=c.getContext('2d');x.font='italic 32px cursive';x.fillText('Dra. Prueba',10,55);return c.toDataURL();});
const session={email:'qa@example.test',fullName:'Dra. María de Prueba',typeUser:1,especialidades:['TRAUM']};const token='a.'+Buffer.from(JSON.stringify({...session,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.s';
const doctor={fullName:'Dra. María de Prueba',profession:'Médica cirujana',specialty:'Medicina general',professionalLicense:'12345678',educationalInstitution:'Universidad de Guadalajara',signatureImage:signature};
const office={idConsultorio:'office-qa',name:'Clínica de Prueba',address:'Av. de prueba 123, Guadalajara, Jalisco',phone:'3312345678',codigoConsultorio:'123456',logoUrl:logo};
const patient={idPaciente:'patient-qa',expedienteId:'record-qa',numeroDeExpediente:'EXP-123456-20261121-001',fichaDeIdentificacion:{nombreCompleto:'Paciente de Prueba',edad:35,fechaNacimiento:'1991-01-20'},clinicalCoreDraft:{familyHistory:'Madre con antecedente de prueba',pathologicalHistory:'Antecedente patológico de prueba',nonPathologicalHistory:'Vacunación registrada',priorTreatments:'Tratamiento previo registrado'},followUps:[]};const saved=[];let reviewSettings={enabled:false,reviewUrl:'https://g.page/r/example/review',delayMinutes:30,templateStatus:'pending',deliveryReady:false};let savedNote=null;const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Mexico_City'});const appointment={date:today,time:'00:00',endTime:'00:30',appointmentId:'appt-qa',status:0,patientName:'Paciente de prueba',reason:'Consulta de prueba'};
await page.evaluateOnNewDocument(({office,session})=>{localStorage.setItem('theme','light');localStorage.setItem('cliniq-go-session',JSON.stringify(session));localStorage.setItem('cliniq-go-sucursal_data',JSON.stringify(office));localStorage.setItem('cliniq-go-all_branches_cache',JSON.stringify([office]));},{office,session});
await page.setRequestInterception(true);page.on('request',async req=>{try{const url=req.url();if(url.startsWith('data:'))return req.continue();
if(url.startsWith('https://clinica-go.com')&&req.method()==='GET'){let file=path.resolve(base,'.'+decodeURIComponent(new URL(url).pathname));if(!file.startsWith(path.resolve(base)+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=base+'/index.html';return req.respond({status:200,contentType:({'.js':'application/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}
if(req.method()==='OPTIONS')return req.respond({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
if(req.method()==='GET')return req.respond({status:200,body:''});let body={};try{body=JSON.parse(Crypto.AES.decrypt(JSON.parse(req.postData()||'{}').encryptedData,key).toString(Crypto.enc.Utf8));}catch{}
const response={success:true,consultorios:[office],patients:[],appointments:[],notifications:[],lastUpdated:new Date().toISOString(),devices:[]};
if(/refresh/i.test(url))response.accessToken=token;
if(/getgooglereviewsettings/i.test(url))response.settings=reviewSettings;
if(/savegooglereviewsettings/i.test(url)){reviewSettings={...reviewSettings,...body};response.settings=reviewSettings;}
if(/getgooglecalendarconnection/i.test(url))Object.assign(response,{connected:true,timeZone:'America/Mexico_City',calendarName:'Clínica Go · Clínica de Prueba'});
if(/getaccountentitlements/i.test(url))response.entitlements={active:true,expiresAt:new Date(Date.now()+86400000).toISOString(),features:{ai:true,reports:true,charts:true},limits:{patients:null,offices:null,services:null,employees:null},usage:{patients:1,offices:1,services:1,employees:0},aiCredits:200};
if(/getpatientexpedient/i.test(url))response.patient=patient;if(/getappointments/i.test(url))response.data=[{date:today,schedules:{'00:00':appointment}}];if(/getpatientfollowup/i.test(url))response.followUp=savedNote;
if(/savepatientfollowup/i.test(url)){saved.push(body);savedNote={...body,state:'DRAFT',revision:1,followUpId:body.requestId,numeroDeConsulta:'EXP-C-001',clinicalCore:{...body.clinicalCore,chiefComplaint:'Dolor de rodilla al caminar',evolution:'Paciente refiere evolución favorable, sin fiebre ni otros síntomas.',vitals:{weight:70,heightCm:170,temperature:36.5,heartRate:75,respiratoryRate:16,systolic:120,diastolic:80,oxygenSaturation:98},diagnoses:[{code:'M25.5',description:'Dolor en articulación',type:'Presuntivo'}],treatment:'Continuar las indicaciones acordadas durante la consulta.',prognosisLife:'Bueno',prognosisFunction:'Reservado'},specialtyData:{...body.specialtyData,painEva:4,rangeOfMotion:'Flexión conservada. Molestia leve con la carga.',muscleStrength:'Fuerza conservada',bodyMarks:[{view:'Anterior',zone:'Rodilla derecha',kind:'Dolor',x:52,y:70,notes:'Hallazgo de prueba'}]},header:{patient:{fullName:'Paciente de prueba',numeroDeExpediente:'EXP-123456-001',sex:'Femenino',age:35,birthDate:'1991-01-20',address:'Domicilio de prueba'},author:doctor,office},createdAt:new Date().toISOString()};Object.assign(response,{followUpId:body.requestId,numeroDeConsulta:'EXP-C-001'});}
return req.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({encryptedData:Crypto.AES.encrypt(JSON.stringify(response),key).toString()})});}catch(e){console.error(e);try{await req.abort();}catch{}}});






await page.setViewport({width:1366,height:768});
await page.goto('https://clinica-go.com/profile',{waitUntil:'networkidle0'});
await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Integraciones'));
await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Integraciones').click());
await page.waitForSelector('.review-guide-trigger');
await page.click('.review-guide-trigger');
await page.waitForSelector('.review-guide[open]');
const guide=await page.$eval('.review-guide',e=>{const r=e.getBoundingClientRect();return {text:e.textContent,top:r.top,left:r.left,bottom:r.bottom,right:r.right};});
assert(guide.text.includes('Clínica de Prueba'));assert(guide.text.includes('Leer opiniones'));assert(guide.text.includes('Consigue más opiniones'));
await page.waitForFunction(()=>[...document.querySelectorAll('.guide-gallery img')].every(e=>e.complete&&e.naturalWidth>0));
assert(guide.left>0&&guide.right<1366&&guide.top>=0&&guide.bottom<=768);
await page.screenshot({path:out+'/guide-examples-laptop.png'});
await page.click('.guide-options button:nth-child(2)');
await page.waitForFunction(()=>document.querySelector('.review-guide-body').textContent.includes('Compartir'));
assert((await page.$eval('.review-guide-body',e=>e.textContent)).includes('Escribir una opinión'));
assert((await page.$eval('.review-guide-body',e=>e.textContent)).includes('no garantiza'));
await page.screenshot({path:out+'/guide-maps-alternative.png'});
await page.click('.review-guide-close');
await page.waitForFunction(()=>!document.querySelector('.review-guide').open);
assert.deepEqual(errors,[]);console.log(JSON.stringify({guideOpens:true,centeredOnLaptop:true,guideCloses:true,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
