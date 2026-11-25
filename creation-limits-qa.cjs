const fs=require('fs'),path=require('path'),assert=require('assert');
const modules='C:/Users/Adolfo/Documents/google_functions/nexus-clinq-go-functions/functions/node_modules/';
const puppeteer=require(modules+'puppeteer'),Crypto=require(modules+'crypto-js');
const root='D:/GitHub/nexus-admin-nexo-salud',out=root+'/creation-limits-qa',base=root+'/dist/beast-admin-angular/browser';fs.mkdirSync(out,{recursive:true});
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
if(/getaccountentitlements/i.test(url))response.entitlements={active:false,planId:'FREE',planName:'FREE',status:'free',expiresAt:null,cancelAtPeriodEnd:false,features:{ai:false,reports:false,charts:false},limits:{patients:5,offices:1,services:3,employees:1},usage:{patients:5,offices:1,services:0,employees:0},aiCredits:0};
if(/getpatientexpedient/i.test(url))response.patient=patient;if(/getappointments/i.test(url))response.data=[];
if(/savepatientfollowup/i.test(url)){saved.push(body);Object.assign(response,{followUpId:body.requestId,numeroDeConsulta:'EXP-C-001'});}
return req.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({encryptedData:Crypto.AES.encrypt(JSON.stringify(response),key).toString()})});}catch(e){console.error(e);try{await req.abort();}catch{}}});



const writes=[];page.on('request',r=>{if(/registernewpatient|saveorupdateconsultorio/i.test(r.url()))writes.push(r.url());});await page.setViewport({width:1280,height:800});
const results=[];
for(const [route,label,module]of [['pacientes','Nuevo Paciente','patients'],['consultorios','Nuevo consultorio','offices']]){
 await page.goto('https://clinica-go.com/'+route,{waitUntil:'networkidle0'});await page.waitForFunction(()=>document.querySelector('app-plan-usage')?.textContent.includes('usados en toda la cuenta'));
 const enabled=await page.evaluate(label=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===label);return b&&!b.disabled;},label);assert(enabled,'Creation action must remain clickable at the cap');
 await page.evaluate(label=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===label).click(),label);await page.waitForSelector('app-plan-limit-dialog');
 await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
 const data=await page.$eval('app-plan-limit-dialog',e=>{const r=e.getBoundingClientRect();return {text:e.textContent,width:r.width,left:r.left,top:r.top,bottom:r.bottom};});assert(data.text.includes('límite de tu capa gratuita'));assert(data.text.includes(module==='patients'?'nuevos pacientes':'nuevo consultorio'));assert(data.left>100&&data.top>0&&data.bottom<=800);
 await page.screenshot({path:out+'/'+module+'-limit-1280.png'});await page.click('app-plan-limit-dialog .primary');await page.waitForFunction(()=>location.pathname==='/planes'&&!document.querySelector('app-plan-limit-dialog'));results.push({module,buttonEnabled:true,limitDialog:true,plansNavigation:true});
}
assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({results,creationRequests:0,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
