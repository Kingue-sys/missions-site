(function(){
  const S = msg => { const s=document.getElementById('status'); if(s) s.textContent = msg; };
  const QR_BASE_URL = 'https://missions-site.vercel.app/fiche?ref=';

  function ready(cb){ if(document.readyState!=='loading'){cb()} else document.addEventListener('DOMContentLoaded',cb); }
  const el = id => document.getElementById(id);

  function isValidEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s||'').trim()); }
  function now(){ return Date.now(); }

  function generateRef(){
    const d = new Date();
    const y = d.getFullYear();
    const rnd = Math.floor(1000 + Math.random()*9000);
    return `MISSIONS-${y}-${rnd}`;
  }

  function snackbar(text){
    let sb = document.getElementById('snackbar');
    if(!sb){ sb = document.createElement('div'); sb.id='snackbar'; sb.className='snackbar'; document.body.appendChild(sb); }
    sb.textContent = text; sb.classList.add('show');
    setTimeout(()=>sb.classList.remove('show'), 2500);
  }

  function splitList(s){ return (s||'').split(';').map(x=>x.trim()).filter(Boolean); }
  const norm = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const qin = (s,q) => norm(s).includes(norm(q||''));

  function readAndCompressImage(file, maxSize=1024) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const ratio = width > height ? maxSize / width : maxSize / height;
          if (ratio < 1) { width = Math.round(width * ratio); height = Math.round(height * ratio); }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          try { resolve(canvas.toDataURL('image/png')); }
          catch(e) { reject(e); }
        };
        img.onerror = () => reject(new Error('Image illisible'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Lecture fichier échouée'));
      reader.readAsDataURL(file);
    });
  }

  ready(async function(){
    try{
      S('Chargement…');
      const usePapa = !!window.Papa;
      const fetchCSV = async (url) => {
        try{
          if(!usePapa) throw new Error('PapaParse indisponible');
          const res = await fetch(url, {cache:'no-store'});
          if(!res.ok) throw new Error('HTTP '+res.status);
          const txt = await res.text();
          return await new Promise(resolve => Papa.parse(txt, {header:true, skipEmptyLines:true, complete: ({data})=>resolve(data)}));
        }catch(e){ return null; }
      };

      const select = el('character'), portraitBox = el('portrait'), nameSlot = el('nameSlot'), jobSlot = el('jobSlot'), traitSlot = el('traitSlot');
      const skillsDiv = el('skills'), skillCount = el('skillCount'), skillLimit = el('skillLimit'), skillHint = el('skillHint');
      const grid = el('grid'), desc = el('desc'), search = el('search');
      const pitchInput = el('pitchInput'), pitchCount = el('pitchCount'), bgInput = el('bgInput'), bgCount = el('bgCount');
      const summaryText = el('summaryText'), bgContent = el('bgContent');
      const invCount = el('invCount'), invLimit = el('invLimit');
      const createBtn = el('createCharacterBtn'), saveDraftBtn = el('saveDraftBtn'), clearDraftBtn = el('clearDraftBtn'), loadDraftBtn = el('loadDraftBtn');
      const emailInput = el('playerEmail'); const photoInput = el('playerPhoto'); const consentPhoto = el('consentPhoto'); const copyInfo = el('copyInfo');
      const hp = el('website'); const refCode = el('refCode'); const qrCanvas = el('qrCanvas');

      const demoChars = [
        { key:'ALFRED_AUBERTIN', Nom:'ALFRED AUBERTIN', Metier:'Major', Traits:'Discipline; Ordre', PortraitURL:'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=300&q=80', CapSkills:'4', Archetypes:'Militaire' },
        { key:'EMMA_LEMOINE', Nom:'EMMA LEMOINE', Metier:'Médecin', Traits:'Empathique; Rigoureuse', PortraitURL:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80', CapSkills:'4', Archetypes:'Médecin' }
      ];
      const demoSkills = [
        { key:'tir_n1', Nom:'Tir [N1]', Categorie:'Combat', Type:'actif', Effets:'Armes basiques', Duree:'—', Modalites:'—', Prerequis:'', Exclus:'', AllowedFor:'', AllowedGroups:'' },
        { key:'assault_rifle', Nom:'Armes d’assaut', Categorie:'Combat', Type:'actif', Effets:'Fusils d’assaut', Duree:'—', Modalites:'—', Prerequis:'', Exclus:'', AllowedFor:'ALFRED_AUBERTIN', AllowedGroups:'Militaire' },
        { key:'discretion', Nom:'Discrétion', Categorie:'Opération', Type:'passif', Effets:'Silencieux', Duree:'Scène', Modalites:'—', Prerequis:'', Exclus:'', AllowedFor:'', AllowedGroups:'' },
        { key:'premiers_soins', Nom:'Premiers secours', Categorie:'Médical', Type:'actif', Effets:'Soin léger', Duree:'—', Modalites:'Sur cible', Prerequis:'', Exclus:'', AllowedFor:'', AllowedGroups:'' }
      ];

      let CHARACTERS = await fetchCSV('/data/characters.csv'); if(!CHARACTERS) CHARACTERS = demoChars;
      let SKILLS = await fetchCSV('/data/skills.csv'); if(!SKILLS) SKILLS = demoSkills;
      const charByKey = Object.fromEntries(CHARACTERS.map(c => [String(c.key||'').trim(), c]));
      SKILLS.forEach(s => s.key = (s.key||'').trim());

      function populateSelect(){
        select.innerHTML = '';
        CHARACTERS.forEach(c=>{
          const opt = document.createElement('option'); opt.value = c.key; opt.textContent=c.Nom; select.appendChild(opt);
        });
        select.selectedIndex = 0; onCharacterChange();
      }

      function onCharacterChange(){
        const c = charByKey[select.value];
        nameSlot.textContent = c?.Nom || '—';
        jobSlot.textContent = (c?.Metier||'—').toUpperCase();
        traitSlot.textContent = (c?.Traits||'—').replaceAll(';',' • ');
        skillLimit.textContent = c?.CapSkills || '0';
        setPortrait(c?.PortraitURL||'');
        renderSkills(); buildGrid();
      }

      function setPortrait(src){
        if(!src){ portraitBox.style.backgroundImage='none'; portraitBox.innerHTML='<span>Portrait du personnage</span>'; return; }
        const test = new Image();
        test.onload=()=>{ portraitBox.innerHTML=''; portraitBox.style.backgroundImage='url('+src+')'; portraitBox.style.backgroundSize='cover'; portraitBox.style.backgroundPosition='center'; };
        test.onerror=()=>{ portraitBox.style.backgroundImage='none'; portraitBox.innerHTML='<span>Portrait du personnage</span>'; };
        test.crossOrigin='anonymous'; test.src=src;
      }

      function isAllowedForChar(skill, c){
        if(!c) return true;
        const ak = splitList(skill.AllowedFor||''); const ag = splitList(skill.AllowedGroups||'').map(norm);
        if(!ak.length && !ag.length) return true;
        if(ak.includes(c.key)) return true;
        const cg = splitList(c.Archetypes||'').map(norm);
        if(ag.length && cg.length && ag.some(g=>cg.includes(g))) return true;
        return false;
      }

      function renderSkills(){
        const c = charByKey[select.value];
        skillsDiv.innerHTML=''; skillCount.textContent='0';
        const q = (search?.value||'').trim();
        SKILLS.forEach(s=>{
          if(!isAllowedForChar(s,c)) return;
          if(q && !(qin(s.Nom||'',q) || qin(s.Categorie||'',q) || qin(s.Effets||'',q))) return;
          const L = document.createElement('label'); L.className='chip tooltip';
          const cb = document.createElement('input'); cb.type='checkbox'; cb.dataset.key=s.key;
          const name = document.createElement('span'); name.textContent = s.Nom || s.key;
          const type = document.createElement('span'); type.className='type'; type.textContent = (String(s.Type||'').toLowerCase()==='craft' ? '🧪' : (s.Type||''));
          const tip = [s.Effets?('Effets: '+s.Effets):'', s.Duree?('Durée: '+s.Duree):'', s.Modalites?('Modalités: '+s.Modalites):''].filter(Boolean).join('\n');
          if(tip) L.setAttribute('data-tip', tip);
          cb.addEventListener('change', onSkillToggle);
          L.append(cb,name,type); skillsDiv.appendChild(L);
        });
        const cap = Number(skillLimit.textContent||'0')||0; skillHint.textContent = cap?('Maximum '+cap+' compétences.') : '';
        updateSkillDesc();
      }

      function onSkillToggle(e){
        const cap = Number(skillLimit.textContent||'0')||0;
        const n = skillsDiv.querySelectorAll('input[type=checkbox]:checked').length;
        if(n>cap){ e.target.checked=false; return; }
        updateSkillDesc();
      }
      function updateSkillDesc(){
        const sel = Array.from(skillsDiv.querySelectorAll('input[type=checkbox]:checked')).map(cb=>cb.dataset.key);
        skillCount.textContent = sel.length;
        const names = sel.map(k => (SKILLS.find(x=>x.key===k)?.Nom || k));
        desc.textContent = names.length ? ('Compétences sélectionnées : ' + names.join(', ')) : 'Compétences sélectionnées : aucune.';
      }

      function buildGrid(){
        grid.innerHTML='';
        for(let i=0;i<12;i++){
          const c = document.createElement('div'); c.className='slot';
          c.addEventListener('click', ()=>{ c.textContent=''; updateInvCount(); });
          grid.appendChild(c);
        }
        updateInvCount();
      }
      function updateInvCount(){
        const used = Array.from(grid.children).filter(c=>c.textContent.trim()).length;
        invCount.textContent = used; invLimit.textContent = 12;
      }

      const LS_PITCH='MISSIONS_PITCH', LS_BG='MISSIONS_BG';
      function syncPitch(){ pitchCount.textContent=(pitchInput.value||'').length; try{ localStorage.setItem(LS_PITCH,pitchInput.value); }catch{}; summaryText.textContent=pitchInput.value||''; }
      function syncBG(){ bgCount.textContent=(bgInput.value||'').length; try{ localStorage.setItem(LS_BG,bgInput.value); }catch{}; bgContent.textContent=bgInput.value || 'Proposition de Background du personnage écrit par le Joueur'; }
      const sp=localStorage.getItem(LS_PITCH); if(sp!=null) pitchInput.value=sp;
      const sb=localStorage.getItem(LS_BG); if(sb!=null) bgInput.value=sb;
      pitchInput.addEventListener('input', syncPitch); bgInput.addEventListener('input', syncBG);
      syncPitch(); syncBG();

      function updateQR(ref){
        refCode.textContent = ref;
        if(window.QRCode && qrCanvas){
          const text = QR_BASE_URL + encodeURIComponent(ref);
          QRCode.toCanvas(qrCanvas, text, {width:88, margin:0}, (err)=>{ if(err) console.error(err); });
        }
      }

      function canSend(){ const last = Number(localStorage.getItem('missions_last_send')||0); const wait = 10000; const delta = now()-last; return {ok: delta>=wait, left: Math.max(0, wait-delta)}; }
      function markSent(){ try{ localStorage.setItem('missions_last_send', String(now())); }catch{} }

      async function createAndSend(){
        createBtn.disabled = true; createBtn.textContent = 'Envoi…';
        try{
          const gate = canSend();
          if(!gate.ok){ snackbar(`Merci de patienter ${Math.ceil(gate.left/1000)} s…`); return; }
          if(hp && hp.value){ console.warn('HONEYPOT'); return; }

          const playerEmail = (emailInput?.value || '').trim();
          const hasPlayerEmail = !!playerEmail;
          if(hasPlayerEmail && !isValidEmail(playerEmail)){ alert("L’email du joueur n’est pas valide."); return; }

          const photoFile = photoInput?.files?.[0] || null;
          if(!photoFile){ alert("Merci d’ajouter une photo identité (JPG/PNG)."); return; }
          if (!/^image\/(jpeg|png)$/.test(photoFile.type)) { alert("Format photo non supporté (JPG ou PNG uniquement)."); return; }
          if (photoFile.size > 5 * 1024 * 1024) { alert("Photo trop lourde (> 5 Mo)."); return; }
          if (!consentPhoto?.checked) { alert("Coche le consentement pour utiliser la photo."); return; }

          const c = charByKey[select.value];
          const sel = Array.from(skillsDiv.querySelectorAll('input[type=checkbox]:checked')).map(cb=>cb.dataset.key);
          const ref = generateRef(); updateQR(ref);

          const payload = { 
            to: ["orga.paradoxa@proton.me","rcohensolal@georem.net", ...(hasPlayerEmail ? [playerEmail] : [])],
            subject: `[MISSIONS] ${ref} – Création de personnage – ` + (c?.Nom || 'PJ'),
            text: "Bonjour,\n\nVeuillez trouver ci-joint la fiche de personnage créée.\nRéférence: "+ref+"\n\n— Système MISSIONS",
            ref, 
            qr_url: QR_BASE_URL + encodeURIComponent(ref),
            character:{ key:c?.key||'', name:c?.Nom||'', role:c?.Metier||'', traits:c?.Traits||'', skills:sel, skillsCount:sel.length, skillsLimit:Number(skillLimit.textContent||'0')||0, pitch:pitchInput?.value||'', bg:bgInput?.value||'' },
            consent_photo: true
          };

          if(window.html2canvas){
            try{ const canvas = await html2canvas(el('capture'), {backgroundColor:'#ffffff', scale:2, useCORS:true, allowTaint:false}); payload.preview_png = canvas.toDataURL('image/png'); }
            catch{ payload.preview_html = el('capture').outerHTML; }
          }else{ payload.preview_html = el('capture').outerHTML; }

          payload.player_photo_png = await readAndCompressImage(photoFile, 1024);
          payload.character_json = btoa(unescape(encodeURIComponent(JSON.stringify({ref, ...payload.character}, null, 2))));

          const res = await fetch('/api/send-character', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          if(!res.ok){ let t=''; try{t=await res.text();}catch{}; throw new Error('HTTP '+res.status+' – '+t); }

          markSent();
          snackbar('Fiche envoyée ✅');
          copyInfo.textContent = hasPlayerEmail ? `Copie envoyée à ${playerEmail}` : `Copie joueur non envoyée (email non saisi)`;
        }catch(e){
          alert("Échec de l’envoi : " + (e?.message || e));
        }finally{
          createBtn.disabled = false; createBtn.textContent = 'Créer ton personnage';
        }
      }

      function saveDraft(){
        const ckey = select.value;
        const sel = Array.from(skillsDiv.querySelectorAll('input[type=checkbox]:checked')).map(cb=>cb.dataset.key);
        const draft = { ckey, skills: sel, pitch:pitchInput.value||'', bg:bgInput.value||'', email: emailInput.value||'' };
        try{ localStorage.setItem('missions_draft', JSON.stringify(draft)); }catch{}
        snackbar('Brouillon sauvegardé');
      }
      function loadDraft(){
        try{
          const raw = localStorage.getItem('missions_draft'); if(!raw) { snackbar('Aucun brouillon'); return; }
          const d = JSON.parse(raw);
          if(d.ckey && charByKey[d.ckey]) select.value=d.ckey;
          if(Array.isArray(d.skills)){
            renderSkills();
            d.skills.forEach(k => {
              const cb = skillsDiv.querySelector('input[data-key="'+k+'"]');
              if(cb) cb.checked = true;
            });
            updateSkillDesc();
          }else{ renderSkills(); }
          if(typeof d.pitch==='string'){ pitchInput.value=d.pitch; syncPitch(); }
          if(typeof d.bg==='string'){ bgInput.value=d.bg; syncBG(); }
          if(typeof d.email==='string'){ emailInput.value = d.email; }
          snackbar('Brouillon chargé');
        }catch{}
      }
      function clearDraft(){ try{ localStorage.removeItem('missions_draft'); snackbar('Brouillon effacé'); }catch{} }

      function init(){
        populateSelect();
        renderSkills();
        buildGrid();
        S('Prêt ✓ (mode '+(usePapa?'CSV':'démo sans CSV')+')');
      }

      select.addEventListener('change', onCharacterChange);
      search.addEventListener('input', renderSkills);
      createBtn.addEventListener('click', createAndSend);
      saveDraftBtn.addEventListener('click', saveDraft);
      loadDraftBtn.addEventListener('click', loadDraft);
      clearDraftBtn.addEventListener('click', clearDraft);
      init();
    }catch(e){
      S('Erreur JS: '+(e.message||e));
      console.error(e);
    }
  });
})();