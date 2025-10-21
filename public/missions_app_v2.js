(function(){
  const S = msg => { const s=document.getElementById('status'); if(s) s.textContent = msg; };
  const el = id => document.getElementById(id);
  const QR_BASE_URL = 'https://missions-site.vercel.app/fiche?ref=';

  function ready(cb){ if(document.readyState!=='loading'){cb()} else document.addEventListener('DOMContentLoaded',cb); }
  const norm = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const qin = (s,q) => norm(s).includes(norm(q||''));
  const isValidEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s||'').trim());
  const now = () => Date.now();

  function generateRef(){
    const d = new Date();
    const y = d.getFullYear();
    const rnd = Math.floor(1000 + Math.random()*9000);
    return `MISSIONS-${y}-${rnd}`;
  }

  function snackbar(txt){
    let sb = el('snackbar');
    if(!sb){ sb = document.createElement('div'); sb.id='snackbar'; sb.className='snackbar'; document.body.appendChild(sb); }
    sb.textContent = txt; sb.classList.add('show');
    setTimeout(()=>sb.classList.remove('show'), 2500);
  }

  function readAndCompressImage(file, maxSize=1024){
    return new Promise((resolve,reject)=>{
      if(!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = ()=>{
        const img = new Image();
        img.onload = ()=>{
          let {width,height} = img;
          const ratio = width>height ? maxSize/width : maxSize/height;
          if(ratio<1){ width=Math.round(width*ratio); height=Math.round(height*ratio); }
          const canvas = document.createElement('canvas');
          canvas.width=width; canvas.height=height;
          canvas.getContext('2d').drawImage(img,0,0,width,height);
          try{ resolve(canvas.toDataURL('image/png')); } catch(e){ reject(e); }
        };
        img.onerror=()=>reject(new Error('Image illisible'));
        img.crossOrigin='anonymous';
        img.src = reader.result;
      };
      reader.onerror = ()=>reject(new Error('Lecture fichier échouée'));
      reader.readAsDataURL(file);
    });
  }

  ready(async function(){
    try{
      S('Chargement…');

      // CSV helper
      const usePapa = !!window.Papa;
      const fetchCSV = async (url) => {
        try{
          if(!usePapa) throw new Error('PapaParse indisponible');
          const res = await fetch(url,{cache:'no-store'});
          if(!res.ok) throw new Error('HTTP '+res.status);
          const txt = await res.text();
          return await new Promise(resolve => Papa.parse(txt, {header:true, skipEmptyLines:true, complete: ({data})=>resolve(data)}));
        }catch(e){ return null; }
      };

      // DOM refs
      const select = el('character'), portrait = el('portrait'), nameSlot = el('nameSlot'), jobSlot = el('jobSlot'), traitSlot = el('traitSlot');
      const search = el('search'), skillsDiv = el('skills'), skillCount = el('skillCount'), skillLimit = el('skillLimit'), skillHint = el('skillHint'), desc = el('desc');
      const grid = el('grid');
      const pitchInput = el('pitchInput'), pitchCount = el('pitchCount'), bgInput = el('bgInput'), bgCount = el('bgCount');
      const summaryText = el('summaryText'), bgContent = el('bgContent');
      const createBtn = el('createCharacterBtn'), saveDraftBtn = el('saveDraftBtn'), loadDraftBtn = el('loadDraftBtn'), clearDraftBtn = el('clearDraftBtn');
      const emailInput = el('playerEmail'), photoInput = el('playerPhoto'), consentPhoto = el('consentPhoto'), copyInfo = el('copyInfo');
      const lastName = el('lastName'), firstName = el('firstName'), birthdate = el('birthdate'), phone = el('phone'), address = el('address'), discord = el('discord'), facebook = el('facebook');
      const itemsList = el('itemsList'), refBadge = el('refCode'), qrCanvas = el('qrCanvas'), playerRecap = el('playerRecapText');
      const honeypot = el('website');

      // demo fallback CSVs
      let CHARACTERS = await fetchCSV('/data/characters.csv');
      if(!CHARACTERS) CHARACTERS = [
        { key:'ALFRED_AUBERTIN', Nom:'ALFRED AUBERTIN', Metier:'Major', Traits:'Discipline; Ordre', PortraitURL:'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=300&q=80', CapSkills:'4', Archetypes:'Militaire' },
        { key:'EMMA_LEMOINE', Nom:'EMMA LEMOINE', Metier:'Médecin', Traits:'Empathique; Rigoureuse', PortraitURL:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80', CapSkills:'4', Archetypes:'Médecin' }
      ];
      let SKILLS = await fetchCSV('/data/skills.csv');
      if(!SKILLS) SKILLS = [
        { key:'tir_n1', Nom:'Tir [N1]', Categorie:'Combat', Type:'actif', Effets:'Armes basiques', Duree:'–', Modalites:'–', AllowedFor:'', AllowedGroups:'' },
        { key:'assault_rifle', Nom:'Armes d’assaut', Categorie:'Combat', Type:'actif', Effets:'Fusils d’assaut', Duree:'–', Modalites:'–', AllowedFor:'ALFRED_AUBERTIN', AllowedGroups:'Militaire' },
        { key:'discretion', Nom:'Discrétion', Categorie:'Opération', Type:'passif', Effets:'Silencieux', Duree:'Scène', Modalites:'–', AllowedFor:'', AllowedGroups:'' },
        { key:'premiers_soins', Nom:'Premiers secours', Categorie:'Médical', Type:'actif', Effets:'Soin léger', Duree:'–', Modalites:'Sur cible', AllowedFor:'', AllowedGroups:'' }
      ];
      let ITEMS = await fetchCSV('/data/items.csv');
      if(!ITEMS) ITEMS = [
        { key:'briquet', Nom:'Briquet', Categorie:'Utilitaire', ImageURL:'https://images.unsplash.com/photo-1581700261293-40203d9a6d7d?w=256&q=60', Description:'Petite flamme' },
        { key:'radio', Nom:'Radio', Categorie:'Communication', ImageURL:'https://images.unsplash.com/photo-1518449037197-3cd274bb5131?w=256&q=60', Description:'Contacter l’équipe' },
        { key:'medkit', Nom:'Trousse de secours', Categorie:'Médical', ImageURL:'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=256&q=60', Description:'Soins d’urgence' },
        { key:'munitions', Nom:'Munitions', Categorie:'Combat', ImageURL:'https://images.unsplash.com/photo-1583358023768-4f6d29579f2f?w=256&q=60', Description:'Rechargement' }
      ];

      const charByKey = Object.fromEntries(CHARACTERS.map(c => [String(c.key||'').trim(), c]));
      SKILLS.forEach(s => s.key = (s.key||'').trim());
      ITEMS.forEach(i => i.key = (i.key||'').trim());

      function populateSelect(){
        if(!select) return;
        select.innerHTML='';
        CHARACTERS.forEach(c=>{
          const o=document.createElement('option');
          o.value=c.key; o.textContent=c.Nom; select.appendChild(o);
        });
        select.selectedIndex=0; onCharacterChange();
      }

      function setPortrait(src){
        if(!portrait) return;
        if(!src){ portrait.style.backgroundImage='none'; portrait.innerHTML='<span>Portrait du personnage</span>'; return; }
        const test=new Image();
        test.onload=()=>{ portrait.innerHTML=''; portrait.style.backgroundImage='url('+src+')'; portrait.style.backgroundSize='cover'; portrait.style.backgroundPosition='center'; };
        test.onerror=()=>{ portrait.style.backgroundImage='none'; portrait.innerHTML='<span>Portrait du personnage</span>'; };
        test.crossOrigin='anonymous'; test.src=src;
      }

      function onCharacterChange(){
        const c = charByKey[select?.value];
        if(nameSlot) nameSlot.textContent = c?.Nom || '–';
        if(jobSlot) jobSlot.textContent = (c?.Metier||'–').toUpperCase();
        if(traitSlot) traitSlot.textContent = (c?.Traits||'–').replaceAll(';',' • ');
        if(skillLimit) skillLimit.textContent = c?.CapSkills || '0';
        setPortrait(c?.PortraitURL||'');
        renderSkills(); buildGrid();
      }

      function isAllowedForChar(skill, c){
        if(!c) return true;
        const ak = (skill.AllowedFor||'').split(';').map(s=>s.trim()).filter(Boolean);
        const ag = (skill.AllowedGroups||'').split(';').map(s=>norm(s)).filter(Boolean);
        if(!ak.length && !ag.length) return true;
        if(ak.includes(c.key)) return true;
        const cg = (c.Archetypes||'').split(';').map(s=>norm(s));
        if(ag.length && cg.length && ag.some(g=>cg.includes(g))) return true;
        return false;
      }

      function renderSkills(){
        const c = charByKey[select?.value];
        if(!skillsDiv) return;
        skillsDiv.innerHTML='';
        if(skillCount) skillCount.textContent='0';
        const q = (search?.value||'').trim();
        SKILLS.forEach(s=>{
          if(!isAllowedForChar(s,c)) return;
          if(q && !(qin(s.Nom||'',q) || qin(s.Categorie||'',q) || qin(s.Effets||'',q))) return;
          const L = document.createElement('label'); L.className='chip tooltip';
          const cb = document.createElement('input'); cb.type='checkbox'; cb.dataset.key=s.key;
          const name = document.createElement('span'); name.textContent = s.Nom || s.key;
          const type = document.createElement('span'); type.className='type'; type.textContent = (s.Type||'');
          const tip = [s.Effets?('Effets: '+s.Effets):'', s.Duree?('Durée: '+s.Duree):'', s.Modalites?('Modalités: '+s.Modalites):''].filter(Boolean).join('\\n');
          if(tip) L.setAttribute('data-tip', tip);
          cb.addEventListener('change', onSkillToggle);
          L.append(cb,name,type); skillsDiv.appendChild(L);
        });
        const cap = Number(skillLimit?.textContent||'0')||0;
        if(skillHint) skillHint.textContent = cap?('Maximum '+cap+' compétences.') : '';
        updateSkillDesc();
      }

      function onSkillToggle(e){
        const cap = Number(skillLimit?.textContent||'0')||0;
        const n = skillsDiv.querySelectorAll('input[type=checkbox]:checked').length;
        if(n>cap){ e.target.checked=false; return; }
        updateSkillDesc();
      }
      function updateSkillDesc(){
        const sel = Array.from(skillsDiv.querySelectorAll('input[type=checkbox]:checked')).map(cb=>cb.dataset.key);
        if(skillCount) skillCount.textContent = sel.length;
        const names = sel.map(k => (SKILLS.find(x=>x.key===k)?.Nom || k));
        if(desc) desc.textContent = names.length ? ('Compétences sélectionnées : ' + names.join(', ')) : 'Compétences sélectionnées : aucune.';
      }

      // INVENTAIRE
      function buildGrid(){
        if(!grid) return;
        grid.innerHTML='';
        for(let i=0;i<12;i++){
          const c = document.createElement('div'); c.className='slot';
          const img = document.createElement('div'); img.className='slotImg';
          const lbl = document.createElement('div'); lbl.className='slotLbl'; lbl.textContent='';
          c.append(img,lbl);
          c.addEventListener('click', ()=>{ img.style.backgroundImage='none'; lbl.textContent=''; });
          grid.appendChild(c);
        }
        renderItemsList();
      }
      function firstEmptySlot(){
        if(!grid) return null;
        return Array.from(grid.children).find(c=>{
          const lbl = c.querySelector('.slotLbl'); return !lbl || !lbl.textContent || !lbl.textContent.trim();
        }) || null;
      }
      function addItemToInventory(item){
        const slot = firstEmptySlot();
        if(!slot){ snackbar('Inventaire plein (12/12)'); return; }
        const img = slot.querySelector('.slotImg'); const lbl = slot.querySelector('.slotLbl');
        if(img) img.style.backgroundImage = item.ImageURL ? `url(${item.ImageURL})` : 'none';
        if(lbl) lbl.textContent = item.Nom || item.key;
      }
      function renderItemsList(){
        if(!itemsList) return;
        itemsList.innerHTML='';
        ITEMS.forEach(it=>{
          const card=document.createElement('div'); card.className='itemList tooltip';
          card.setAttribute('data-tip', (it.Description||'') + (it.Categorie?('\\nCatégorie: '+it.Categorie):''));
          const th=document.createElement('div'); th.className='itemThumb'; if(it.ImageURL) th.style.backgroundImage=`url(${it.ImageURL})`;
          const nm=document.createElement('div'); nm.className='itemName'; nm.textContent=it.Nom||it.key;
          card.append(th,nm);
          card.addEventListener('click', ()=> addItemToInventory(it));
          itemsList.appendChild(card);
        });
      }

      // PITCH / BG autosave + aperçu
      const LS = { PITCH:'MISSIONS_PITCH', BG:'MISSIONS_BG', PLAYER:'MISSIONS_PLAYER' };
      function syncPitch(){ if(!pitchInput) return; if(pitchCount) pitchCount.textContent=(pitchInput.value||'').length; try{localStorage.setItem(LS.PITCH,pitchInput.value);}catch{}; if(summaryText) summaryText.textContent=pitchInput.value||''; }
      function syncBG(){ if(!bgInput) return; if(bgCount) bgCount.textContent=(bgInput.value||'').length; try{localStorage.setItem(LS.BG,bgInput.value);}catch{}; if(bgContent) bgContent.textContent=bgInput.value||'Proposition de Background du personnage écrit par le Joueur'; }

      function savePlayer(){
        const v = {
          lastName:lastName?.value||'', firstName:firstName?.value||'', birthdate:birthdate?.value||'',
          phone:phone?.value||'', address:address?.value||'', discord:discord?.value||'',
          facebook:facebook?.value||'', email:emailInput?.value||''
        };
        try{ localStorage.setItem(LS.PLAYER, JSON.stringify(v)); }catch{}
        renderPlayerRecap(v);
      }
      function loadPlayer(){
        try{
          const raw = localStorage.getItem(LS.PLAYER); if(!raw) return;
          const v = JSON.parse(raw);
          if(lastName) lastName.value=v.lastName||''; if(firstName) firstName.value=v.firstName||'';
          if(birthdate) birthdate.value=v.birthdate||''; if(phone) phone.value=v.phone||'';
          if(address) address.value=v.address||''; if(discord) discord.value=v.discord||'';
          if(facebook) facebook.value=v.facebook||''; if(emailInput) emailInput.value=v.email||'';
          renderPlayerRecap(v);
        }catch{}
      }
      function renderPlayerRecap(v){
        const tgt = playerRecap; if(!tgt) return;
        const P = v || {
          lastName:lastName?.value||'', firstName:firstName?.value||'', birthdate:birthdate?.value||'',
          phone:phone?.value||'', address:address?.value||'', discord:discord?.value||'',
          facebook:facebook?.value||'', email:emailInput?.value||''
        };
        const lines = [];
        const full = [P.firstName, P.lastName].filter(Boolean).join(' ');
        if(full) lines.push(`Nom: ${full}`);
        if(P.birthdate) lines.push(`Naissance: ${P.birthdate}`);
        if(P.phone) lines.push(`Tel: ${P.phone}`);
        if(P.email) lines.push(`Email: ${P.email}`);
        if(P.discord) lines.push(`Discord: ${P.discord}`);
        if(P.facebook) lines.push(`Facebook: ${P.facebook}`);
        if(P.address) lines.push(`Adresse: ${P.address}`);
        tgt.textContent = lines.length ? lines.join('  •  ') : '—';
      }

      // init autosave
      const sp=localStorage.getItem(LS.PITCH); if(sp!=null && pitchInput){ pitchInput.value=sp; }
      const sb=localStorage.getItem(LS.BG); if(sb!=null && bgInput){ bgInput.value=sb; }
      loadPlayer();
      if(pitchInput) pitchInput.addEventListener('input', syncPitch);
      if(bgInput) bgInput.addEventListener('input', syncBG);
      [lastName, firstName, birthdate, phone, address, discord, facebook, emailInput].forEach(inp=> inp && inp.addEventListener('input', savePlayer));
      syncPitch(); syncBG(); renderPlayerRecap();

      // QR + ref
      function updateQR(ref){
        if(refBadge) refBadge.textContent = ref;
        if(window.QRCode && qrCanvas){
          const text = QR_BASE_URL + encodeURIComponent(ref);
          QRCode.toCanvas(qrCanvas, text, {width:88, margin:0}, (err)=>{ if(err) console.error(err); });
        }
      }

      // anti spam
      const canSend = ()=>{ const last=Number(localStorage.getItem('missions_last_send')||0); const wait=10000; const delta=now()-last; return {ok:delta>=wait,left:Math.max(0,wait-delta)}; };
      const markSent = ()=>{ try{ localStorage.setItem('missions_last_send', String(now())); }catch{} };

      async function createAndSend(){
        if(!createBtn) return;
        createBtn.disabled=true; createBtn.textContent='Envoi…';
        try{
          const gate = canSend(); if(!gate.ok){ snackbar(`Merci de patienter ${Math.ceil(gate.left/1000)} s…`); return; }
          if(honeypot && honeypot.value){ console.warn('HONEYPOT'); return; }

          const playerEmail = (emailInput?.value||'').trim();
          const hasPlayerEmail = !!playerEmail;
          if(hasPlayerEmail && !isValidEmail(playerEmail)){ alert("L’email du joueur n’est pas valide."); return; }

          const photoFile = photoInput?.files?.[0] || null;
          if(!photoFile){ alert("Merci d’ajouter une photo identité (JPG/PNG)."); return; }
          if (!/^image\/(jpeg|png)$/.test(photoFile.type)) { alert("Format photo non supporté (JPG ou PNG uniquement)."); return; }
          if (photoFile.size > 5 * 1024 * 1024) { alert("Photo trop lourde (> 5 Mo)."); return; }
          if (!consentPhoto?.checked) { alert("Coche le consentement pour utiliser la photo."); return; }

          const c = CHARACTERS.find(x=>x.key===select?.value);
          const selected = Array.from(skillsDiv.querySelectorAll('input[type=checkbox]:checked')).map(cb=>cb.dataset.key);
          const ref = generateRef(); updateQR(ref);

          const inv = Array.from(grid.children).map(c=>{
            const lbl = c.querySelector('.slotLbl'); const img = c.querySelector('.slotImg');
            return { name:(lbl?lbl.textContent.trim():''), image:(img?img.style.backgroundImage.replace(/^url\(["']?(.+?)["']?\)$/,'$1'):'') };
          }).filter(x=>x.name);

          const player = {
            lastName:lastName?.value||'', firstName:firstName?.value||'',
            birthdate:birthdate?.value||'', phone:phone?.value||'',
            address:address?.value||'', discord:discord?.value||'',
            facebook:facebook?.value||'', email:playerEmail
          };

          const payload = {
            to: ["orga.paradoxa@proton.me","rcohensolal@georem.net", ...(hasPlayerEmail ? [playerEmail] : []) ],
            subject: `[MISSIONS] ${ref} – Création de personnage – `+(c?.Nom||'PJ'),
            text: "Bonjour,\n\nVeuillez trouver ci-joint la fiche de personnage créée.\nRéférence: "+ref+"\n\n— Système MISSIONS",
            ref, qr_url: QR_BASE_URL+encodeURIComponent(ref),
            character:{ key:c?.key||'', name:c?.Nom||'', role:c?.Metier||'', traits:c?.Traits||'', skills:selected, skillsCount:selected.length, skillsLimit:Number(skillLimit?.textContent||'0')||0, pitch:pitchInput?.value||'', bg:bgInput?.value||'', inventory: inv, player },
            consent_photo: true
          };

          if(window.html2canvas){
            try{ const canvas = await html2canvas(el('capture'), {backgroundColor:'#ffffff', scale:2, useCORS:true, allowTaint:false}); payload.preview_png = canvas.toDataURL('image/png'); }
            catch{ payload.preview_html = el('capture').outerHTML; }
          }else{ payload.preview_html = el('capture').outerHTML; }

          payload.player_photo_png = await readAndCompressImage(photoFile, 1024);
          payload.character_json = btoa(unescape(encodeURIComponent(JSON.stringify({ref, ...payload.character}, null, 2))));

          const res = await fetch('/api/send-character', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          const data = await res.json().catch(()=> ({}));
          if(!res.ok || !data.ok){ throw new Error('HTTP '+res.status+' – ' + (data.error || 'échec inconnu')); }

          markSent();
          snackbar('Fiche envoyée ✅');
          if(copyInfo) copyInfo.textContent = hasPlayerEmail ? `Copie envoyée à ${playerEmail}` : `Copie joueur non envoyée (email non saisi)`;
        }catch(e){
          alert("Échec de l’envoi : " + (e?.message||e));
        }finally{
          createBtn.disabled=false; createBtn.textContent='Créer ton personnage';
        }
      }

      function saveDraft(){
        const ckey = select?.value;
        const selected = Array.from(skillsDiv.querySelectorAll('input[type=checkbox]:checked')).map(cb=>cb.dataset.key);
        const inv = Array.from(grid.children).map(c=>{
          const lbl = c.querySelector('.slotLbl'); const img = c.querySelector('.slotImg');
          return { name:(lbl?lbl.textContent.trim():''), image:(img?img.style.backgroundImage.replace(/^url\(["']?(.+?)["']?\)$/,'$1'):'') };
        }).filter(x=>x.name);
        const draft = { ckey, skills:selected, pitch:pitchInput?.value||'', bg:bgInput?.value||'', player:{
          lastName:lastName?.value||'', firstName:firstName?.value||'', birthdate:birthdate?.value||'',
          phone:phone?.value||'', address:address?.value||'', discord:discord?.value||'',
          facebook:facebook?.value||'', email:emailInput?.value||''
        }, inventory: inv };
        try{ localStorage.setItem('missions_draft', JSON.stringify(draft)); }catch{}
        snackbar('Brouillon sauvegardé');
      }
      function loadDraft(){
        try{
          const raw=localStorage.getItem('missions_draft'); if(!raw){ snackbar('Aucun brouillon'); return; }
          const d=JSON.parse(raw);
          if(d.ckey && select){ select.value=d.ckey; }
          renderSkills();
          if(Array.isArray(d.skills)){
            d.skills.forEach(k=>{ const cb=skillsDiv.querySelector('input[data-key="'+k+'"]'); if(cb) cb.checked=true; });
            updateSkillDesc();
          }
          if(typeof d.pitch==='string' && pitchInput){ pitchInput.value=d.pitch; syncPitch(); }
          if(typeof d.bg==='string' && bgInput){ bgInput.value=d.bg; syncBG(); }
          if(d.player){
            if(lastName) lastName.value=d.player.lastName||''; if(firstName) firstName.value=d.player.firstName||'';
            if(birthdate) birthdate.value=d.player.birthdate||''; if(phone) phone.value=d.player.phone||'';
            if(address) address.value=d.player.address||''; if(discord) discord.value=d.player.discord||'';
            if(facebook) facebook.value=d.player.facebook||''; if(emailInput) emailInput.value=d.player.email||'';
            renderPlayerRecap(d.player);
          }
          buildGrid();
          if(Array.isArray(d.inventory)){
            d.inventory.forEach(it=>{
              const slot = firstEmptySlot(); if(!slot) return;
              const img = slot.querySelector('.slotImg'); const lbl = slot.querySelector('.slotLbl');
              if(img) img.style.backgroundImage = it.image ? `url(${it.image})` : 'none';
              if(lbl) lbl.textContent = it.name || '';
            });
          }
          snackbar('Brouillon chargé');
        }catch{}
      }
      function clearDraft(){ try{ localStorage.removeItem('missions_draft'); snackbar('Brouillon effacé'); }catch{} }

      function init(){
        populateSelect(); renderSkills(); buildGrid();
        S('Prêt ✓');
      }

      if(select) select.addEventListener('change', onCharacterChange);
      if(search) search.addEventListener('input', renderSkills);
      if(createBtn) createBtn.addEventListener('click', createAndSend);
      if(saveDraftBtn) saveDraftBtn.addEventListener('click', saveDraft);
      if(loadDraftBtn) loadDraftBtn.addEventListener('click', loadDraft);
      if(clearDraftBtn) clearDraftBtn.addEventListener('click', clearDraft);

      init();
    }catch(e){
      S('Erreur JS: '+(e.message||e)); console.error(e);
    }
  });
})();