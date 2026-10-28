import {classify} from './classifier.mjs';
const $=id=>document.getElementById(id);let model,snapshot,research;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function activate(name){for(const p of document.querySelectorAll('.panel'))p.classList.toggle('active',p.id===name);for(const b of document.querySelectorAll('nav button'))b.classList.toggle('active',b.dataset.tab===name);}
for(const b of document.querySelectorAll('nav button'))b.onclick=()=>{activate(b.dataset.tab);history.replaceState(null,'','#'+b.dataset.tab);};
if(['review','product','evidence','extraction'].includes(location.hash.slice(1)))activate(location.hash.slice(1));
function analyse(){const text=$('reviewText').value;if(!text.trim()){$('prediction').textContent='Enter a review first.';$('probabilities').replaceChildren();return;}
 const r=classify(text,model);$('prediction').textContent=r.label[0].toUpperCase()+r.label.slice(1);
 $('probabilities').innerHTML=model.labels.map((label,i)=>`<div class="barrow"><span>${label}</span><div class="track"><div class="fill" style="width:${100*r.probabilities[i]}%"></div></div><span>${(100*r.probabilities[i]).toFixed(1)}%</span></div>`).join('');
 $('featureCount').textContent=`${r.features} vocabulary features matched · trained Logistic Regression · C=${model.C}`;
}
const examples=['Excellent quality and a lovely scent. I would buy this again.','The bottle broke on the first day. A complete waste of money.','It works, but the packaging is ordinary and the scent could be better.'];let next=0;
$('example').onclick=()=>{$('reviewText').value=examples[next++%examples.length];if(model)analyse();};$('analyse').onclick=analyse;
$('batchAnalyse').onclick=()=>{const texts=$('batchText').value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,100);if(!texts.length){$('batchResults').textContent='Enter at least one review.';return;}
 const rows=texts.map(text=>({text,...classify(text,model)}));
 $('batchResults').innerHTML='<div class="tablewrap"><table><thead><tr><th>Review</th><th>Predicted sentiment</th></tr></thead><tbody>'+rows.map(r=>`<tr><td>${escape(r.text)}</td><td>${r.label}</td></tr>`).join('')+'</tbody></table></div><button class="secondary" id="downloadBatch">Download CSV</button>';
 $('downloadBatch').onclick=()=>{const quote=x=>'"'+String(x).replaceAll('"','""')+'"';const content='text,predicted_sentiment\n'+rows.map(r=>[r.text,r.label].map(quote).join(',')).join('\n');const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='review_predictions.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
};
$('productSelect').onchange=()=>{$('productUrl').value='https://www.amazon.com/dp/'+$('productSelect').value;};
$('lookup').onclick=()=>{if(!snapshot||!model){$('productMessage').textContent='Data are still loading.';return;}
 $('productResults').replaceChildren();let asin;
 try{const u=new URL($('productUrl').value);const allowed=['amazon.com','amazon.ae','amazon.co.uk','amazon.ca','amazon.de','amazon.fr','amazon.in','amazon.sa'];const match=u.pathname.match(/\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:\/|$)/i);if(u.protocol!=='https:'||!allowed.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))||!match)throw Error();asin=match[1].toUpperCase();}
 catch{$('productMessage').textContent='Enter a valid HTTPS Amazon product URL with /dp/ASIN or /gp/product/ASIN.';return;}
 const rows=snapshot.filter(r=>r.product_id.toUpperCase()===asin);$('productMessage').textContent=rows.length?`${rows.length} stored training-sample reviews for ${asin}. No live reviews fetched.`:'No stored reviews for this parent ID. Choose an available product above.';
 $('productResults').innerHTML=rows.map(r=>`<article class="card"><span class="pill">${classify(r.text,model).label}</span><p>${escape(r.text)}</p></article>`).join('');
};
$('audit').onclick=()=>{const t=$('auditText').value,term=$('auditTerm').value,quote=$('auditQuote').value;const ok=Boolean(term&&quote&&t.includes(term)&&t.includes(quote));$('auditResult').className=ok?'success':'error';$('auditResult').textContent=ok?'Both strings occur exactly. Semantic correctness still needs human judgement.':'Check exact spelling and case: a nonempty term and quote must both occur in the source review.';};
async function init(){
 try{[model,snapshot,research]=await Promise.all(['classifier.json','snapshot.json','research.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('Could not load '+url);return r.json();}));
 $('analyse').disabled=false;$('analyse').textContent='Analyse review';$('batchAnalyse').disabled=false;
 const ids=[...new Set(snapshot.map(r=>r.product_id))];$('productSelect').innerHTML=ids.map(id=>`<option>${escape(id)}</option>`).join('');$('productSelect').onchange();
 $('scoreTable').innerHTML=Object.entries(research.sentiment.scores).map(([name,s])=>`<tr class="${name==='DistilBERT'?'best':''}"><td>${escape(name)}</td><td>${(100*s.accuracy).toFixed(2)}%</td><td>${s.macro_f1.toFixed(4)}</td></tr>`).join('');
 $('protocol').textContent=JSON.stringify({dataset:research.manifest.dataset,revision:research.manifest.revision,category:'All_Beauty',splits:research.manifest.splits,transformer:{model:research.training.model,seed:research.training.seed,epochs:2,selected_epoch:1,max_length:192,learning_rate:2e-5,batch_size:16}},null,2);
 }catch(e){$('prediction').textContent='Could not load the classifier.';$('featureCount').textContent=e.message;}
}init();
