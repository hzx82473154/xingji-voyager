(function () {
  'use strict';
  const envelope = JSON.parse(document.getElementById('gate-data').textContent);
  const phone = navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  const platform = phone ? 'mobile' : 'desktop';
  const meta = envelope.platforms?.[platform] || envelope;
  // Hold only encoded resource nodes. Decode each resource on first use after unlock.
  const localResources = new Map([...document.querySelectorAll('script[data-vault]')].map(node=>[node.id,node]));
  const form = document.getElementById('unlock-form'), input = document.getElementById('password');
  const submit = document.getElementById('unlock'), message = document.getElementById('message');
  const progress = document.getElementById('progress'), reveal = document.getElementById('reveal');
  const encoder = new TextEncoder(), aad = encoder.encode('Voyager access v1');
  let busy = false;
  const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  function resourceError(code,cause) {
    return Object.assign(new Error(code==='RESOURCE_AUTHENTICATION_FAILED'?'素材校验失败，请重新加载页面。':'素材下载未完成，请检查网络后重新加载。'),
      {name:'VoyagerResourceError',code,cause});
  }
  function setMessage(text, error=false) { message.textContent=text; message.classList.toggle('error',error); }
  reveal.addEventListener('click', () => {
    const visible = input.type === 'password';
    input.type=visible?'text':'password'; reveal.textContent=visible?'隐藏':'显示';
    reveal.setAttribute('aria-pressed',String(visible)); input.focus();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (!input.value) { setMessage('请输入访问密码。',true); input.focus(); return; }
    if (!globalThis.crypto?.subtle || typeof DecompressionStream === 'undefined') {
      setMessage('当前浏览器不支持解锁，请使用新版 Chrome、Edge、Firefox 或 Safari。',true); return;
    }
    busy=true; submit.disabled=true; input.disabled=true; reveal.disabled=true;
    form.setAttribute('aria-busy','true'); setMessage('正在验证密码…');
    let password=input.value, key, verified=false;
    try {
      const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
      password='';
      key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:decode(meta.salt),iterations:meta.iterations,hash:'SHA-256'},
        material,{name:'AES-GCM',length:256},false,['decrypt']);
      const decrypt=(data,iv)=>crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv),additionalData:aad,tagLength:128},key,data);
      const verification=await decrypt(decode(meta.verifier),meta.verifierIv);
      if (new TextDecoder().decode(verification)!=='Voyager password accepted') throw new Error('Verification failed');
      verified=true; input.value=''; progress.hidden=false; progress.value=0;
      setMessage('正在准备你的宇宙…');
      const payload=new Uint8Array(meta.size);
      let offset=0;
      for (let i=0; i<meta.chunks.length; i++) {
        const chunk=meta.chunks[i];
        if (meta.mode==='offline') {
          const data=decode(document.getElementById(chunk.embedId||('payload-'+i)).textContent.trim());
          if (data.length!==chunk.size) throw new Error('Truncated payload');
          payload.set(data,offset); offset+=data.length;
        } else {
          const response=await fetch(chunk.file,{credentials:'same-origin',cache:'no-store'});
          if (!response.ok) throw new Error('Download failed');
          if (response.body?.getReader) {
            const reader=response.body.getReader(); let received=0;
            for (;;) {
              const {done,value}=await reader.read(); if(done) break;
              if (received+value.length>chunk.size) throw new Error('Invalid payload length');
              payload.set(value,offset); offset+=value.length; received+=value.length;
              progress.value=offset/meta.size*85;
            }
            if(received!==chunk.size) throw new Error('Truncated payload');
          } else {
            const data=new Uint8Array(await response.arrayBuffer());
            if(data.length!==chunk.size) throw new Error('Truncated payload');
            payload.set(data,offset); offset+=data.length;
          }
        }
        progress.value=offset/meta.size*85;
      }
      if(offset!==meta.size) throw new Error('Invalid payload length');
      const compressed=await decrypt(payload,meta.iv);
      if(meta.version>=2){
        const resourceKey=key;
        window.VOYAGER_VAULT=async descriptor=>{
          const load=async bypassCache=>{
            try{
              const payload=new Uint8Array(descriptor.size);let offset=0;
              for(const chunk of descriptor.chunks||[{file:descriptor.file,size:descriptor.size}]){
                let bytes;
                if(meta.mode==='offline'){
                  const node=localResources.get(chunk.embedId);
                  if(!node)throw new Error('Offline resource missing');
                  bytes=decode(node.textContent.trim());
                }else{
                  const response=await fetch(chunk.file,{credentials:'same-origin',cache:bypassCache?'no-store':'force-cache'});
                  if(!response.ok)throw new Error('Resource download failed');
                  bytes=new Uint8Array(await response.arrayBuffer());
                }
                if(bytes.byteLength!==chunk.size)throw new Error('Resource length mismatch');
                payload.set(bytes,offset);offset+=bytes.length;
              }
              if(offset!==descriptor.size)throw new Error('Resource length mismatch');
              return payload;
            }catch(error){throw resourceError('RESOURCE_DOWNLOAD_FAILED',error);}
          };
          const open=payload=>crypto.subtle.decrypt({name:'AES-GCM',iv:decode(descriptor.iv),additionalData:aad,tagLength:128},resourceKey,payload);
          const payload=await load(false);
          try{return await open(payload);}catch(error){
            // One bounded fresh fetch repairs a stale/intermediary cached blob.
            // Authentication remains mandatory; corrupted bytes are never used.
            if(meta.mode==='offline')throw resourceError('RESOURCE_AUTHENTICATION_FAILED',error);
            const fresh=await load(true);
            try{return await open(fresh);}catch(cause){throw resourceError('RESOURCE_AUTHENTICATION_FAILED',cause);}
          }
        };
      }
      key=null;
      progress.value=92;
      const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
      const html=await new Response(stream).text();
      if(!html.startsWith('<!doctype html>')) throw new Error('Invalid document');
      progress.value=100;
      document.open(); document.write(html); document.close();
    } catch (error) {
      key=null; input.value=''; progress.hidden=true;
      setMessage(verified?'加载未完成，请检查网络或文件是否完整，再输入密码重试。':'密码不正确，请重新输入。',true);
      input.focus();
    } finally {
      password=''; busy=false; submit.disabled=false; input.disabled=false; reveal.disabled=false;
      form.setAttribute('aria-busy','false');
      if(document.getElementById('password')===input) input.focus();
    }
  });
})();
