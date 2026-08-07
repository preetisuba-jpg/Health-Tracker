(function(){

if(window.__LIX_RUNNING__){
  alert('Extractor is already running. Use the Stop button on the page.');
  return;
}

var STATE = window.__LIX_STATE__ || {all:[], pg:0, stopped:false};
window.__LIX_STATE__ = STATE;
window.__LIX_RUNNING__ = true;
STATE.stopped = false;

var MAX = 300;

function makeUI(){
  var old = document.getElementById('__lix_wrap__');
  if(old) old.remove();
  var wrap = document.createElement('div');
  wrap.id = '__lix_wrap__';
  wrap.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;align-items:stretch;min-width:250px;';

  var box = document.createElement('div');
  box.id = '__lix_status__';
  box.style.cssText = 'background:#0a66c2;color:#fff;padding:12px 16px;border-radius:10px;font:600 13px/1.6 -apple-system,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.3);';
  box.innerHTML = 'Starting...';

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:6px;';

  var stopBtn = document.createElement('button');
  stopBtn.id = '__lix_stop__';
  stopBtn.textContent = 'Stop';
  stopBtn.style.cssText = 'flex:1;background:#dc2626;color:#fff;border:none;padding:9px;border-radius:7px;font:600 12px -apple-system,sans-serif;cursor:pointer;';
  stopBtn.onclick = function(){
    STATE.stopped = true;
    stopBtn.disabled = true;
    stopBtn.textContent = 'Stopping...';
    setStatus('Stopping after this page...');
  };

  var restartBtn = document.createElement('button');
  restartBtn.textContent = 'Restart';
  restartBtn.style.cssText = 'flex:1;background:#6b7280;color:#fff;border:none;padding:9px;border-radius:7px;font:600 12px -apple-system,sans-serif;cursor:pointer;';
  restartBtn.onclick = function(){
    if(!confirm('Restart from page 1? Current progress will be cleared.')) return;
    window.__LIX_STATE__ = {all:[], pg:0, stopped:false};
    STATE = window.__LIX_STATE__;
    window.__LIX_RUNNING__ = true;
    STATE.stopped = false;
    makeUI();
    run();
  };

  btnRow.appendChild(stopBtn);
  btnRow.appendChild(restartBtn);
  wrap.appendChild(box);
  wrap.appendChild(btnRow);
  document.body.appendChild(wrap);
}

function setStatus(msg){
  var el = document.getElementById('__lix_status__');
  if(el) el.innerHTML = msg;
}

function showDone(){
  var wrap = document.getElementById('__lix_wrap__');
  if(!wrap) return;
  wrap.innerHTML = '';

  var box = document.createElement('div');
  box.style.cssText = 'background:#065f46;color:#fff;padding:12px 16px;border-radius:10px;font:600 13px/1.6 -apple-system,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.3);';
  box.innerHTML = '&#9989; Done! <strong>' + STATE.all.length + ' leads</strong> from ' + STATE.pg + ' pages.<br><span style="font-weight:400;font-size:12px;">Download the file, then drag it into the extractor app.</span>';

  var dlBtn = document.createElement('button');
  dlBtn.textContent = '&#8595; Download leads JSON';
  dlBtn.style.cssText = 'width:100%;background:#0a66c2;color:#fff;border:none;padding:10px;border-radius:7px;font:700 13px -apple-system,sans-serif;cursor:pointer;margin-top:8px;';
  dlBtn.onclick = function(){ doDownload(); };

  var resumeBtn = document.createElement('button');
  resumeBtn.textContent = 'Resume from page ' + (STATE.pg + 1);
  resumeBtn.style.cssText = 'width:100%;background:#d97706;color:#fff;border:none;padding:9px;border-radius:7px;font:600 12px -apple-system,sans-serif;cursor:pointer;margin-top:6px;';
  resumeBtn.onclick = function(){
    STATE.stopped = false;
    window.__LIX_RUNNING__ = true;
    makeUI();
    run();
  };

  var closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = 'width:100%;background:none;color:#fff;border:1px solid rgba(255,255,255,0.4);padding:7px;border-radius:7px;font:500 12px -apple-system,sans-serif;cursor:pointer;margin-top:4px;';
  closeBtn.onclick = function(){ wrap.remove(); window.__LIX_RUNNING__ = false; };

  wrap.appendChild(box);
  wrap.appendChild(dlBtn);
  wrap.appendChild(resumeBtn);
  wrap.appendChild(closeBtn);
}

function doDownload(){
  var json = JSON.stringify(STATE.all);
  var blob = new Blob([json], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'linkedin_leads_p1_to_p' + STATE.pg + '_' + Date.now() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function forceRender(callback){
  var cards = Array.from(document.querySelectorAll('li.artdeco-list__item'));
  if(!cards.length){ callback(); return; }
  var idx = 0;
  function next(){
    if(idx >= cards.length){ setTimeout(callback, 800); return; }
    cards[idx].scrollIntoView({behavior:'instant', block:'center'});
    idx += 2;
    setTimeout(next, 80);
  }
  next();
}

function extract(){
  var cards = document.querySelectorAll('li.artdeco-list__item');
  var out = [];
  cards.forEach(function(c){
    var name = ((c.querySelector('[data-anonymize="person-name"]')||{}).innerText||'').replace(/\s+/g,' ').trim();
    if(!name) return;
    var title = ((c.querySelector('[data-anonymize="title"]')||{}).innerText||'').replace(/\s+/g,' ').trim();
    var company = ((c.querySelector('[data-anonymize="company-name"]')||{}).innerText||'').replace(/\s+/g,' ').trim();
    var location = ((c.querySelector('[data-anonymize="location"]')||{}).innerText||'').replace(/\s+/g,' ').trim();
    var dEl = c.querySelector('.artdeco-entity-lockup__degree');
    var degree = dEl ? dEl.innerText.replace(/[·\u00b7\xa0\s]/g,'').trim() : '';
    var lEl = c.querySelector('a.link--mercado[href*="/sales/lead/"]');
    var url = '';
    if(lEl){
      var m = (lEl.getAttribute('href')||'').match(/\/sales\/lead\/([^,?]+)/);
      if(m && m[1]) url = 'https://www.linkedin.com/in/' + m[1];
    }
    out.push({name:name, title:title, company:company, location:location, degree:degree, url:url, email:'', phone:''});
  });
  return out;
}

function getNext(){
  var b = document.querySelector('button[aria-label="Next"]');
  if(b && !b.disabled && !b.hasAttribute('disabled') && b.offsetParent !== null) return b;
  return null;
}

function run(){
  if(STATE.stopped){ done(); return; }
  STATE.pg++;
  if(STATE.pg > MAX){ done(); return; }
  setStatus('Page ' + STATE.pg + ' — loading cards...<br><span style="font-weight:400;font-size:11px;">Total so far: ' + STATE.all.length + '</span>');
  forceRender(function(){
    if(STATE.stopped){ done(); return; }
    var page = extract();
    if(!page.length && STATE.pg === 1){
      var w = document.getElementById('__lix_wrap__');
      if(w) w.remove();
      window.__LIX_RUNNING__ = false;
      alert('No leads found. Make sure you are on a Sales Navigator search results page with leads loaded.');
      return;
    }
    STATE.all = STATE.all.concat(page);
    setStatus('Page ' + STATE.pg + ' &#10004; got ' + page.length + ' leads<br><strong>Total: ' + STATE.all.length + '</strong>');
    var nb = getNext();
    if(!nb){ done(); return; }
    window.scrollTo(0, 0);
    setTimeout(function(){
      var firstCard = document.querySelectorAll('li.artdeco-list__item')[0];
      nb.click();
      var waited = 0;
      var iv = setInterval(function(){
        if(STATE.stopped){ clearInterval(iv); done(); return; }
        waited += 500;
        var cur = document.querySelectorAll('li.artdeco-list__item')[0];
        if(cur && cur !== firstCard && cur.querySelector('[data-anonymize="person-name"]')){
          clearInterval(iv);
          setTimeout(run, 1200);
        }
        if(waited > 25000){ clearInterval(iv); done(); }
      }, 500);
    }, 600);
  });
}

function done(){
  window.__LIX_RUNNING__ = false;
  showDone();
}

makeUI();
run();

})();
