const fs=require('fs'),path=require('path'),assert=require('assert');
const modules='C:/Users/Adolfo/Documents/google_functions/nexus-clinq-go-functions/functions/node_modules/';
const puppeteer=require(modules+'puppeteer'),Crypto=require(modules+'crypto-js');
const root='D:/GitHub/nexus-admin-nexo-salud',out=root+'/calendar-onboarding-qa',base=root+'/dist/beast-admin-angular/browser';fs.mkdirSync(out,{recursive:true});
const key=fs.readFileSync(root+'/src/app/config/security.config.ts','utf8').match(/ENCRYPTION_KEY:\s*["']([^"']+)/)[1];
(async()=>{const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});try{
const page=await browser.newPage();await page.evaluateOnNewDocument(()=>{const original=URL.createObjectURL.bind(URL);window.__qaBlobs=[];URL.createObjectURL=value=>{window.__qaBlobs.push(value);return original(value);};});await page.setViewport({width:1440,height:1000});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const logo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=500;c.height=250;const x=c.getContext('2d');x.fillStyle='#075985';x.fillRect(220,20,60,160);x.fillRect(170,70,160,60);x.font='32px Arial';x.textAlign='center';x.fillText('CLÍNICA DE PRUEBA',250,230);return c.toDataURL();});
const signature=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=300;c.height=90;const x=c.getContext('2d');x.font='italic 32px cursive';x.fillText('Dra. Prueba',10,55);return c.toDataURL();});
const session={email:'qa@example.test',fullName:'Dra. María de Prueba',typeUser:1,especialidades:['TRAUM']};const token='a.'+Buffer.from(JSON.stringify({...session,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.s';
const doctor={fullName:'Dra. María de Prueba',profession:'Médica cirujana',specialty:'Medicina general',professionalLicense:'12345678',educationalInstitution:'Universidad de Guadalajara',signatureImage:signature};
const office={idConsultorio:'office-qa',name:'Clínica de Prueba',address:'Av. de prueba 123, Guadalajara, Jalisco',phone:'3312345678',codigoConsultorio:'123456',logoUrl:logo};
const patient={idPaciente:'patient-qa',expedienteId:'record-qa',numeroDeExpediente:'EXP-123456-20261121-001',fichaDeIdentificacion:{nombreCompleto:'Paciente de Prueba',edad:35,fechaNacimiento:'1991-01-20'},clinicalCoreDraft:{familyHistory:'Madre con antecedente de prueba',pathologicalHistory:'Antecedente patológico de prueba',nonPathologicalHistory:'Vacunación registrada',priorTreatments:'Tratamiento previo registrado'},followUps:[]};const saved=[];
await page.evaluateOnNewDocument(({office,session})=>{localStorage.setItem('theme','light');localStorage.setItem('cliniq-go-session',JSON.stringify(session));localStorage.setItem('cliniq-go-sucursal_data',JSON.stringify(office));localStorage.setItem('cliniq-go-all_branches_cache',JSON.stringify([office]));},{office,session});
await page.setRequestInterception(true);page.on('request',async req=>{try{const url=req.url();if(url.startsWith('data:'))return req.continue();
if(url.startsWith('https://clinica-go.com')&&req.method()==='GET'){let file=path.resolve(base,'.'+decodeURIComponent(new URL(url).pathname));if(!file.startsWith(path.resolve(base)+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=base+'/index.html';return req.respond({status:200,contentType:({'.js':'application/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}
if(req.method()==='OPTIONS')return req.respond({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
if(req.method()==='GET')return req.respond({status:200,body:''});let body={};try{body=JSON.parse(Crypto.AES.decrypt(JSON.parse(req.postData()||'{}').encryptedData,key).toString(Crypto.enc.Utf8));}catch{}
const response={success:true,consultorios:[office],patients:[],appointments:[],notifications:[],lastUpdated:new Date().toISOString(),devices:[]};
if(/refresh/i.test(url))response.accessToken=token;
if(/getaccountentitlements/i.test(url))response.entitlements={active:true,expiresAt:new Date(Date.now()+86400000).toISOString(),features:{ai:true,reports:true,charts:true},limits:{patients:null,offices:null,services:null,employees:null},usage:{patients:1,offices:1,services:1,employees:0},aiCredits:200};
if(/getpatientexpedient/i.test(url))response.patient=patient;if(/getappointments/i.test(url))response.data=[];
if(/savepatientfollowup/i.test(url)){saved.push(body);Object.assign(response,{followUpId:body.requestId,numeroDeConsulta:'EXP-C-001'});}
return req.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({encryptedData:Crypto.AES.encrypt(JSON.stringify(response),key).toString()})});}catch(e){console.error(e);try{await req.abort();}catch{}}});


const requests=[];page.on('request',r=>{if(r.method()==='POST')requests.push(r.url());});
await page.setViewport({width:1366,height:768});await page.goto('https://clinica-go.com/calendario',{waitUntil:'networkidle0'});await page.waitForSelector('app-calendar-onboarding .welcome');await page.screenshot({path:out+'/intro-1366.png'});
const results=[];
for(const view of ['Mes','Semana','Día']){
 const before=requests.length;
 const cacheBefore=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.includes('appointments_cache')).map(k=>[k,localStorage.getItem(k)])));
 await page.waitForSelector('app-calendar-onboarding .welcome:not(.completion) .primary',{visible:true});await page.click('app-calendar-onboarding .welcome:not(.completion) .primary');await page.waitForSelector('.replica-calendar');
 await page.evaluate(view=>[...document.querySelectorAll('app-calendar-onboarding .view-switch button')].find(b=>b.textContent.trim()===view).click(),view);
 if(view==='Mes')await page.click('[aria-label="Seleccionar día 17"]');else await page.evaluate(()=>document.querySelector('app-calendar-onboarding .empty-slot:not(:disabled)').click());
 await page.waitForSelector('.booking-card');assert.equal(await page.$eval('.practice-body',e=>e.scrollTop),0);assert(await page.$eval('.booking-card .primary',b=>b.disabled));
 await page.click('.booking-card .search-button');await page.waitForSelector('.picker-card');await page.type('.picker-search input','carlos');await page.waitForFunction(()=>document.querySelectorAll('.picker-results button').length===1&&document.querySelector('.picker-results button').textContent.includes('Carlos'));await page.evaluate(()=>document.querySelector('.picker-results button').click());await page.waitForFunction(()=>!document.querySelector('.picker-card'));
 assert.equal(await page.$eval('.form-column input[placeholder="Escribe un nombre ficticio"]',e=>e.value),'Carlos Paciente Demo');
 await page.evaluate(()=>[...document.querySelectorAll('.booking-card .search-button')].find(b=>b.textContent.includes('catálogo')).click());await page.waitForSelector('.picker-card');await page.type('.picker-search input','seguimiento');await page.waitForFunction(()=>document.querySelectorAll('.picker-results button').length===1&&document.querySelector('.picker-results button').textContent.includes('seguimiento'));await page.evaluate(()=>document.querySelector('.picker-results button').click());await page.waitForFunction(()=>!document.querySelector('.picker-card'));
 await page.evaluate(()=>{const b=[...document.querySelectorAll('.slots button')].find(b=>b.textContent.trim()==='11:00');if(b.getAttribute('aria-pressed')!=='true')b.click();});
 await page.screenshot({path:out+'/'+view+'-booking.png'});await page.click('.booking-card .primary');await page.waitForSelector('.created-appointment');await page.click('.created-appointment');await page.waitForSelector('.detail-card');await page.screenshot({path:out+'/'+view+'-detail.png'});
 await page.click('.detail-card .danger');await page.waitForSelector('.cancel-card');await page.screenshot({path:out+'/'+view+'-cancel.png'});await page.click('.cancel-card .danger');await page.waitForSelector('.completion');
 assert((await page.$eval('.completion',e=>e.textContent)).includes('¡Lo lograste!'));assert.equal(requests.length,before,'Practice must not issue API calls');
 const cacheAfter=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.includes('appointments_cache')).map(k=>[k,localStorage.getItem(k)])));assert.deepEqual(cacheAfter,cacheBefore);results.push({view,extraRequests:requests.length-before,cacheUnchanged:true});await page.screenshot({path:out+'/'+view+'-complete.png'});
 if(view!=='Día')await page.click('.completion-actions .secondary');
}
await page.click('.completion-actions .primary');await page.waitForFunction(()=>!document.querySelector('app-calendar-onboarding'));await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Practicar agenda')));await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Practicar agenda')).click());await page.waitForSelector('app-calendar-onboarding .welcome');
assert.deepEqual(errors,[]);console.log(JSON.stringify({automaticFirstVisit:true,replay:true,results,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
