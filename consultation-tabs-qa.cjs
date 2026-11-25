const fs=require('fs'),path=require('path'),assert=require('assert');
const modules='C:/Users/Adolfo/Documents/google_functions/nexus-clinq-go-functions/functions/node_modules/';
const puppeteer=require(modules+'puppeteer'),Crypto=require(modules+'crypto-js');
const root='D:/GitHub/nexus-admin-nexo-salud',out=root+'/consultation-tabs-qa',base=root+'/dist/beast-admin-angular/browser';fs.mkdirSync(out,{recursive:true});
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
if(/getpatientexpedient/i.test(url))response.patient=patient;
if(/savepatientfollowup/i.test(url)){saved.push(body);Object.assign(response,{followUpId:body.requestId,numeroDeConsulta:'EXP-C-001'});}
return req.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({encryptedData:Crypto.AES.encrypt(JSON.stringify(response),key).toString()})});}catch(e){console.error(e);try{await req.abort();}catch{}}});

await page.goto('https://clinica-go.com/expediente/nuevaRevision/patient-qa',{waitUntil:'networkidle0'});
await page.waitForSelector('.consultation-tabs');
const visible=selector=>page.$eval(selector,e=>!!e.getClientRects().length);
assert(await visible('.summary-section'));assert(await visible('.attachments-section'));assert(await visible('app-anatomical-map'));assert(await visible('.model-card'));
assert.equal(await page.$eval('#followup-specialty',e=>!!e.getClientRects().length),false);
assert.equal(await page.$eval('app-followup-context',e=>e.querySelectorAll('input,textarea,select').length),0);
assert((await page.$eval('app-followup-context',e=>e.textContent)).includes('Madre con antecedente de prueba'));
await page.$eval('.summary-section textarea',e=>{e.value='Resumen conservado entre pestañas';e.dispatchEvent(new Event('input',{bubbles:true}));});
await page.screenshot({path:out+'/consulta-1440.png',fullPage:true});
await page.click('.consultation-tabs button:nth-child(3)');await page.waitForFunction(()=>document.querySelector('#followup-specialty')?.getClientRects().length);assert(await visible('#followup-specialty'));
const specialty=await page.$eval('#followup-specialty',e=>e.textContent);assert(specialty.includes('Exploración musculoesquelética'));assert(specialty.includes('Valoración prequirúrgica y plan'));
const text=await page.$eval('app-followup-workspace',e=>e.textContent);assert(!text.includes('Identificación de la historia inicial'));assert(!text.includes('Interrogatorio por aparatos y sistemas'));
await page.screenshot({path:out+'/especialidad-1440.png',fullPage:true});
await page.click('.consultation-tabs button:nth-child(2)');await page.waitForFunction(()=>document.querySelector('#followup-clinical')?.getClientRects().length);assert(await visible('app-followup-soap'));
await page.click('.consultation-tabs button:nth-child(1)');await page.waitForFunction(()=>document.querySelector('#followup-consultation')?.getClientRects().length);assert.equal(await page.$eval('.summary-section textarea',e=>e.value),'Resumen conservado entre pestañas');
await page.setViewport({width:1280,height:720});await page.screenshot({path:out+'/consulta-1280.png',fullPage:true});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
assert.deepEqual(errors,[]);console.log(JSON.stringify({tabs:3,historyReadOnly:true,summaryRetained:true,specialtySeparated:true,overflow:false,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
