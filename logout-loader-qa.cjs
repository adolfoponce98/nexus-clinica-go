const fs=require('fs'),path=require('path'),assert=require('assert');
const modules='C:/Users/Adolfo/Documents/google_functions/nexus-clinq-go-functions/functions/node_modules/';
const puppeteer=require(modules+'puppeteer'),Crypto=require(modules+'crypto-js');
const root='D:/GitHub/nexus-admin-nexo-salud',out=root+'/logout-loader-qa',base=root+'/dist/beast-admin-angular/browser';fs.mkdirSync(out,{recursive:true});
const key=fs.readFileSync(root+'/src/app/config/security.config.ts','utf8').match(/ENCRYPTION_KEY:\s*["']([^"']+)/)[1];
(async()=>{const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});try{
const page=await browser.newPage();await page.evaluateOnNewDocument(()=>{const original=URL.createObjectURL.bind(URL);window.__qaBlobs=[];URL.createObjectURL=value=>{window.__qaBlobs.push(value);return original(value);};});await page.setViewport({width:1440,height:1000});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const logo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=500;c.height=250;const x=c.getContext('2d');x.fillStyle='#075985';x.fillRect(220,20,60,160);x.fillRect(170,70,160,60);x.font='32px Arial';x.textAlign='center';x.fillText('CLÍNICA DE PRUEBA',250,230);return c.toDataURL();});
const signature=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=300;c.height=90;const x=c.getContext('2d');x.font='italic 32px cursive';x.fillText('Dra. Prueba',10,55);return c.toDataURL();});
const session={email:'qa@example.test',fullName:'Dra. María de Prueba',typeUser:1,especialidades:['TRAUM']};const token='a.'+Buffer.from(JSON.stringify({...session,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.s';
const doctor={fullName:'Dra. María de Prueba',profession:'Médica cirujana',specialty:'Medicina general',professionalLicense:'12345678',educationalInstitution:'Universidad de Guadalajara',signatureImage:signature};
const office={idConsultorio:'office-qa',name:'Clínica de Prueba',address:'Av. de prueba 123, Guadalajara, Jalisco',phone:'3312345678',codigoConsultorio:'123456',logoUrl:logo};
let finishLogout;let logoutRequests=0;const logoutPending=new Promise(resolve=>finishLogout=resolve);
const patient={idPaciente:'patient-qa',expedienteId:'record-qa',numeroDeExpediente:'EXP-123456-20261121-001',fichaDeIdentificacion:{nombreCompleto:'Paciente de Prueba',edad:35,fechaNacimiento:'1991-01-20'},clinicalCoreDraft:{familyHistory:'Madre con antecedente de prueba',pathologicalHistory:'Antecedente patológico de prueba',nonPathologicalHistory:'Vacunación registrada',priorTreatments:'Tratamiento previo registrado'},followUps:[]};const saved=[];
await page.evaluateOnNewDocument(({office,session})=>{localStorage.setItem('theme','light');localStorage.setItem('cliniq-go-session',JSON.stringify(session));localStorage.setItem('cliniq-go-sucursal_data',JSON.stringify(office));localStorage.setItem('cliniq-go-all_branches_cache',JSON.stringify([office]));},{office,session});
await page.setRequestInterception(true);page.on('request',async req=>{try{const url=req.url();if(url.startsWith('data:'))return req.continue();
if(url.startsWith('https://clinica-go.com')&&req.method()==='GET'){let file=path.resolve(base,'.'+decodeURIComponent(new URL(url).pathname));if(!file.startsWith(path.resolve(base)+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=base+'/index.html';return req.respond({status:200,contentType:({'.js':'application/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}
if(req.method()==='OPTIONS')return req.respond({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
if(req.method()==='GET')return req.respond({status:200,body:''});let body={};try{body=JSON.parse(Crypto.AES.decrypt(JSON.parse(req.postData()||'{}').encryptedData,key).toString(Crypto.enc.Utf8));}catch{}
if(url.endsWith('/api/auth/logout')){logoutRequests++;await logoutPending;}
const response={success:true,consultorios:[office],patients:[],appointments:[],notifications:[],lastUpdated:new Date().toISOString(),devices:[]};
if(/refresh/i.test(url))response.accessToken=token;
if(/getaccountentitlements/i.test(url))response.entitlements={active:false,planId:'FREE',planName:'FREE',status:'free',expiresAt:null,cancelAtPeriodEnd:false,features:{ai:false,reports:false,charts:false},limits:{patients:5,offices:1,services:3,employees:1},usage:{patients:5,offices:1,services:0,employees:0},aiCredits:0};
if(/getpatientexpedient/i.test(url))response.patient=patient;if(/getappointments/i.test(url))response.data=[];
if(/savepatientfollowup/i.test(url)){saved.push(body);Object.assign(response,{followUpId:body.requestId,numeroDeConsulta:'EXP-C-001'});}
return req.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({encryptedData:Crypto.AES.encrypt(JSON.stringify(response),key).toString()})});}catch(e){console.error(e);try{await req.abort();}catch{}}});




await page.setViewport({width:1280,height:800});await page.goto('https://clinica-go.com/pacientes',{waitUntil:'networkidle0'});await page.click('img[alt="Avatar"]');await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Cerrar Sesión'));await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Cerrar Sesión').click());await page.waitForSelector('[aria-label="Confirmar cierre de sesión"]');await page.evaluate(()=>[...document.querySelectorAll('[aria-label="Confirmar cierre de sesión"] button')].find(b=>b.textContent.includes('Sí, Salir')).click());
await page.waitForFunction(()=>document.querySelector('[aria-label="Confirmar cierre de sesión"]')?.getAttribute('aria-busy')==='true');
const state=await page.$eval('[aria-label="Confirmar cierre de sesión"]',e=>({message:e.textContent,disabled:[...e.querySelectorAll('button')].every(b=>b.disabled),spinner:!!e.querySelector('.animate-spin')}));assert(state.message.includes('Cerrando sesión…'));assert(state.disabled);assert(state.spinner);assert.equal(new URL(page.url()).pathname,'/pacientes');await page.screenshot({path:out+'/logout-pending-1280.png'});
await page.evaluate(()=>document.querySelector('[aria-label="Confirmar cierre de sesión"] button[aria-busy]')?.click());assert.equal(logoutRequests,1);finishLogout();await page.waitForFunction(()=>location.pathname==='/login');assert.equal(await page.evaluate(()=>localStorage.getItem('cliniq-go-session')),null);assert.deepEqual(errors,[]);console.log(JSON.stringify({spinner:true,buttonsDisabled:true,logoutRequests,redirectedToLogin:true,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
