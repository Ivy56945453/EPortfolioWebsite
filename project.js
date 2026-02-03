function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function renderProject() {
  const id = getQueryParam('id');
  const titleEl = document.getElementById('project-title');
  const descEl = document.getElementById('project-desc');
  const mainMediaEl = document.getElementById('project-main-media');
  const thumbsEl = document.getElementById('project-thumbs');
  const tableEl = document.getElementById('project-table');
  const notFoundEl = document.getElementById('project-notfound');

  // Protect media elements: disable right-click but allow image dragging (set drag data); block video drag
  function protectMediaEl(el) {
    if (!el) return;
    el.addEventListener('contextmenu', e => e.preventDefault());
    if (el.tagName === 'VIDEO') {
      el.draggable = false;
      el.addEventListener('dragstart', e => e.preventDefault());
    } else if (el.tagName === 'IMG') {
      el.draggable = true;
      el.addEventListener('dragstart', e => {
        try {
          e.dataTransfer.setData('text/uri-list', el.src);
          e.dataTransfer.setData('text/plain', el.src);
        } catch (err) {}
      });
    }
  }

  // Global: prevent right-click on images/videos but allow dragging images; block drag for videos
  document.addEventListener('contextmenu', (e) => { if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO')) e.preventDefault(); });
  document.addEventListener('dragstart', (e) => { if (e.target && e.target.tagName === 'VIDEO') e.preventDefault(); });

  // In-page modal (mobile-friendly) preview with canvas watermark and pinch/zoom/pan
  function openImageModal(src, title) {
    const modal = document.getElementById('image-modal');
    const canvas = modal ? modal.querySelector('#modal-canvas') : null;
    const toolbar = modal ? modal.querySelector('.image-modal-toolbar') : null;
    const btnZoomIn = modal ? modal.querySelector('#modal-zoom-in') : null;
    const btnZoomOut = modal ? modal.querySelector('#modal-zoom-out') : null;
    const btnReset = modal ? modal.querySelector('#modal-reset') : null;
    const btnClose = modal ? modal.querySelector('#modal-close') : null;

    if (!modal || !canvas) {
      // fallback
      window.open(src, '_blank');
      return;
    }

    let ctx = canvas.getContext('2d');
    let img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    let scale = 1, minScale = 1, offsetX = 0, offsetY = 0;
    let dragging = false, dragStartX = 0, dragStartY = 0;
    let isPinching = false, initialPinchDistance = 0, initialPinchScale = 1, pinchCenter = null;

    function drawWatermark(text) {
      if (!text) return;
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#fff';
      const fontSize = Math.max(14, Math.round(Math.min(canvas.width, canvas.height) / 28));
      ctx.font = fontSize + 'px system-ui, Arial';
      ctx.textBaseline = 'middle';
      const gapX = fontSize * 12;
      const gapY = fontSize * 8;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 6);
      for (let x = -canvas.width * 1.5; x < canvas.width * 1.5; x += gapX) {
        for (let y = -canvas.height * 1.5; y < canvas.height * 1.5; y += gapY) {
          ctx.fillText(text, x, y);
        }
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.font = Math.max(12, Math.round(fontSize * 0.8)) + 'px system-ui, Arial';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(text, canvas.width - 10, canvas.height - 8);
      ctx.restore();
    }

    function fit() {
      canvas.width = Math.max(320, modal.clientWidth);
      canvas.height = Math.max(240, modal.clientHeight - (toolbar ? toolbar.offsetHeight : 48));
      minScale = Math.min(canvas.width / (img.width || canvas.width), canvas.height / (img.height || canvas.height), 1) || 1;
      if (scale < minScale) scale = minScale;
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!img.complete) return;
      const iw = img.width * scale;
      const ih = img.height * scale;
      const x = (canvas.width - iw) / 2 + offsetX;
      const y = (canvas.height - ih) / 2 + offsetY;
      try {
        ctx.drawImage(img, x, y, iw, ih);
      } catch (err) {
        // draw fallback background if cross-origin issues
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      drawWatermark((title || '').toString());
    }

    img.onload = function () { scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1) || 1; offsetX = 0; offsetY = 0; fit(); };
    img.onerror = function () {
      // retry without crossOrigin (some hosts don't allow anonymous CORS)
      console.warn('Failed to load image with CORS, retrying without crossOrigin');
      img = new Image();
      img.src = src;
      img.onload = function () { scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1) || 1; offsetX = 0; offsetY = 0; fit(); };
    };

    function setScale(newScale, centerX, centerY) {
      const prevScale = scale;
      const cX = centerX === undefined ? canvas.width / 2 : centerX;
      const cY = centerY === undefined ? canvas.height / 2 : centerY;
      const imgCX = (cX - (canvas.width - (img.width * prevScale)) / 2 - offsetX) / prevScale;
      const imgCY = (cY - (canvas.height - (img.height * prevScale)) / 2 - offsetY) / prevScale;
      scale = Math.max(minScale, Math.min(8, newScale));
      offsetX = cX - (canvas.width - img.width * scale) / 2 - imgCX * scale;
      offsetY = cY - (canvas.height - img.height * scale) / 2 - imgCY * scale;
      draw();
    }

    function onPointerDown(e) {
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!dragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      offsetX += dx;
      offsetY += dy;
      draw();
    }

    function onPointerUp(e) {
      dragging = false;
      try { canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    }

    // touch gestures for pinch-to-zoom
    function getTouchDist(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }

    function getTouchCenter(touches) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2 - canvas.getBoundingClientRect().left,
        y: (touches[0].clientY + touches[1].clientY) / 2 - canvas.getBoundingClientRect().top
      };
    }

    function onTouchStart(e) {
      if (e.touches.length === 1) {
        // pan
        dragging = true;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        isPinching = true;
        initialPinchDistance = getTouchDist(e.touches);
        initialPinchScale = scale;
        pinchCenter = getTouchCenter(e.touches);
      }
    }

    function onTouchMove(e) {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault();
        const d = getTouchDist(e.touches);
        const factor = d / initialPinchDistance;
        setScale(initialPinchScale * factor, pinchCenter.x, pinchCenter.y);
      } else if (dragging && e.touches.length === 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - dragStartX;
        const dy = e.touches[0].clientY - dragStartY;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
        offsetX += dx;
        offsetY += dy;
        draw();
      }
    }

    function onTouchEnd(e) {
      if (e.touches.length < 2) {
        isPinching = false;
      }
      if (e.touches.length === 0) {
        dragging = false;
      }
    }

    // toolbar buttons
    btnZoomIn && btnZoomIn.addEventListener('click', () => setScale(scale * 1.2));
    btnZoomOut && btnZoomOut.addEventListener('click', () => setScale(scale / 1.2));
    btnReset && btnReset.addEventListener('click', () => { scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1) || 1; offsetX = 0; offsetY = 0; draw(); });

    // close handler
    function closeModal() {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      // cleanup listeners
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      btnClose && btnClose.removeEventListener('click', closeModal);
      window.removeEventListener('keydown', onKeyDown);
    }

    btnClose && btnClose.addEventListener('click', closeModal);

    function onWheel(e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      setScale(scale * (e.deltaY > 0 ? 0.95 : 1.05), e.clientX - rect.left, e.clientY - rect.top);
    }

    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) e.preventDefault();
      if (e.key === 'Escape') closeModal();
      if (e.key === '+' || e.key === '=') setScale(scale * 1.2);
      if (e.key === '-') setScale(scale / 1.2);
      if (e.key === '0') { scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1) || 1; offsetX = 0; offsetY = 0; draw(); }
    }

    // attach listeners
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    window.addEventListener('keydown', onKeyDown);

    // show modal
    modal.setAttribute('aria-hidden', 'false');
    modal.focus && modal.focus();
    document.body.style.overflow = 'hidden';
    // initial draw attempt
    fit();
  }

  // Open image in a temporary popup window for zooming using a canvas with watermark
  // Fallbacks to an in-page modal on mobile or when popup is blocked
  function openImageWindow(src, title) {
    // prefer modal on narrow screens (mobile) since popups are blocked or poor UX
    if (window.innerWidth <= 700) {
      openImageModal(src, title);
      return;
    }

    try {
      const w = window.open('', '_blank', 'toolbar=0,location=0,status=0,menubar=0,scrollbars=0,resizable=1,width=1000,height=700');
      if (!w) throw new Error('popup-blocked');
      const safeTitle = (title || 'Image Preview').replace(/</g, '&lt;');
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>
        <style>html,body{height:100%;margin:0;background:#111;color:#fff;font-family:system-ui,Arial}
        .toolbar{padding:8px;display:flex;gap:8px;align-items:center;border-bottom:1px solid rgba(255,255,255,0.06)}
        .btn{background:#222;color:#fff;border:1px solid rgba(255,255,255,0.06);padding:6px 8px;border-radius:6px;cursor:pointer}
        .viewport{height:calc(100% - 46px);display:flex;align-items:center;justify-content:center;overflow:hidden}
        canvas{background:#000;display:block;max-width:100%;max-height:100%;}
        </style></head><body>
        <div class="toolbar">
          <button class="btn" id="zoom-in">+</button>
          <button class="btn" id="zoom-out">−</button>
          <button class="btn" id="reset">Reset</button>
          <button class="btn" id="close">Close</button>
        </div>
        <div class="viewport"><canvas id="cv" aria-label="Image Preview with watermark"></canvas></div>
        <script>
          (function(){
            const canvas = document.getElementById('cv');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = '${src}';
            let scale = 1, minScale = 1, offsetX = 0, offsetY = 0;
            let dragging = false, dragStartX = 0, dragStartY = 0;

            function drawWatermark(text){
              if (!text) return;
              ctx.save();
              ctx.globalAlpha = 0.12;
              ctx.fillStyle = '#fff';
              const fontSize = Math.max(16, Math.round(Math.min(canvas.width, canvas.height) / 24));
              ctx.font = fontSize + 'px system-ui, Arial';
              ctx.textBaseline = 'middle';
              const gapX = fontSize * 12;
              const gapY = fontSize * 8;
              // diagonal tiled watermark
              ctx.translate(canvas.width/2, canvas.height/2);
              ctx.rotate(-Math.PI/6);
              for (let x = -canvas.width*1.5; x < canvas.width*1.5; x += gapX){
                for (let y = -canvas.height*1.5; y < canvas.height*1.5; y += gapY){
                  ctx.fillText(text, x, y);
                }
              }
              ctx.restore();
              // corner watermark
              ctx.save();
              ctx.globalAlpha = 0.18;
              ctx.font = Math.max(12, Math.round(fontSize * 0.8)) + 'px system-ui, Arial';
              ctx.fillStyle = '#fff';
              ctx.textAlign = 'right';
              ctx.textBaseline = 'bottom';
              ctx.fillText(text, canvas.width - 10, canvas.height - 8);
              ctx.restore();
            }

            function fit() {
              canvas.width = window.innerWidth;
              canvas.height = window.innerHeight - 46; // toolbar
              minScale = Math.min(canvas.width / img.width, canvas.height / img.height, 1) || 1;
              if (scale < minScale) scale = minScale;
              draw();
            }

            function draw(){
              ctx.clearRect(0,0,canvas.width,canvas.height);
              if (!img.complete) return;
              const iw = img.width * scale;
              const ih = img.height * scale;
              const x = (canvas.width - iw) / 2 + offsetX;
              const y = (canvas.height - ih) / 2 + offsetY;
              ctx.drawImage(img, x, y, iw, ih);
              // watermark after drawing image
              drawWatermark('${safeTitle}');
            }

            img.onload = function(){ scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1) || 1; offsetX = 0; offsetY = 0; fit(); };
            window.addEventListener('resize', fit);

            function setScale(newScale, centerX, centerY){
              const prevScale = scale;
              const cX = centerX === undefined ? canvas.width/2 : centerX;
              const cY = centerY === undefined ? canvas.height/2 : centerY;
              const imgCX = (cX - (canvas.width - img.width*prevScale)/2 - offsetX) / prevScale;
              const imgCY = (cY - (canvas.height - img.height*prevScale)/2 - offsetY) / prevScale;
              scale = Math.max(minScale, Math.min(8, newScale));
              offsetX = cX - (canvas.width - img.width*scale)/2 - imgCX * scale;
              offsetY = cY - (canvas.height - img.height*scale)/2 - imgCY * scale;
              draw();
            }

            document.getElementById('zoom-in').addEventListener('click', ()=> setScale(scale * 1.2));
            document.getElementById('zoom-out').addEventListener('click', ()=> setScale(scale / 1.2));
            document.getElementById('reset').addEventListener('click', ()=> { scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1) || 1; offsetX = 0; offsetY = 0; draw(); });
            document.getElementById('close').addEventListener('click', ()=> window.close());

            // wheel zoom
            canvas.addEventListener('wheel', (e)=>{
              e.preventDefault();
              const rect = canvas.getBoundingClientRect();
              setScale(scale * (e.deltaY > 0 ? 0.95 : 1.05), e.clientX - rect.left, e.clientY - rect.top);
            }, {passive:false});

            // drag to pan
            canvas.addEventListener('pointerdown', (e)=>{ dragging = true; dragStartX = e.clientX; dragStartY = e.clientY; canvas.setPointerCapture(e.pointerId); });
            canvas.addEventListener('pointermove', (e)=>{ if (!dragging) return; const dx = e.clientX - dragStartX; const dy = e.clientY - dragStartY; dragStartX = e.clientX; dragStartY = e.clientY; offsetX += dx; offsetY += dy; draw(); });
            canvas.addEventListener('pointerup', (e)=>{ dragging = false; try{ canvas.releasePointerCapture(e.pointerId); }catch(e){} });
            canvas.addEventListener('pointercancel', ()=>{ dragging = false; });

            // disable context menu and common save shortcuts
            window.addEventListener('contextmenu', (e)=> { e.preventDefault(); });
            window.addEventListener('keydown', (e)=>{ if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); } if (e.key === 'Escape') window.close(); if (e.key === '+' || e.key === '=') setScale(scale*1.2); if (e.key === '-') setScale(scale/1.2); if (e.key === '0') { scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1) || 1; offsetX = 0; offsetY = 0; draw(); } });

            // initial fit; if image already loaded
            if (img.complete) { fit(); }

            // prevent dragstart
            canvas.addEventListener('dragstart', (e)=> e.preventDefault());

          })();
        <\/script></body></html>`;
      w.document.write(html);
      w.document.close();
    } catch (err) {
      // fallback: open image src directly
      openImageModal(src, title);
    }
  }

  if (!id) {
    notFoundEl.style.display = 'block';
    titleEl.textContent = 'No project selected';
    return;
  }

  try {
    const res = await fetch('projects.json');
    const projects = await res.json();
    const project = projects.find(p => p.id === id);

    if (!project) {
      notFoundEl.style.display = 'block';
      titleEl.textContent = 'Project not found';
      return;
    }

    document.title = project.title + ' - Project';
    titleEl.textContent = project.title;
    descEl.textContent = project.description || '';

    // Media (images/videos). Backwards-compatible with `images` array
    thumbsEl.innerHTML = '';
    const mediaList = (Array.isArray(project.media) && project.media.length) ? project.media : (Array.isArray(project.images) ? project.images.map(s => ({ type: 'image', src: s })) : []);

    if (mediaList.length > 0) {
      // render first media
      const first = mediaList[0];

      function renderMain(m) {
        mainMediaEl.innerHTML = '';
        if (!m) return;
        if (m.type === 'image') {
          const img = document.createElement('img');
          img.src = m.src;
          img.alt = m.alt || (project.title + ' image');
          img.loading = 'lazy';
          img.style.width = '100%';
          img.style.height = 'auto';
          img.style.cursor = 'zoom-in';
          img.title = 'Click to open larger preview';
          img.draggable = true;
          img.addEventListener('click', () => openImageWindow(m.src, project.title));
          protectMediaEl(img);
          mainMediaEl.appendChild(img);
        } else if (m.type === 'video') {
          const video = document.createElement('video');
          video.controls = true;
          video.playsInline = true;
          video.controlsList = 'nodownload noremoteplayback';
          if (m.poster) video.poster = m.poster;
          video.style.width = '100%';
          const srcEl = document.createElement('source');
          srcEl.src = m.src;
          if (m.src && m.src.endsWith('.mp4')) srcEl.type = 'video/mp4';
          video.appendChild(srcEl);
          protectMediaEl(video);
          mainMediaEl.appendChild(video);
        }
      }

      renderMain(first);

      mediaList.forEach((m, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'thumb-btn';
        btn.style.border = 'none';
        btn.style.padding = '0';
        btn.style.background = 'transparent';
        btn.title = (m.type === 'video' ? 'Play video ' : 'Show image ') + (idx + 1);

        if (m.type === 'image') {
          const img = document.createElement('img');
          img.src = m.src;
          img.alt = (project.title || '') + ' thumbnail ' + (idx + 1);
          img.loading = 'lazy';
          img.style.width = '80px';
          img.style.height = 'auto';
          img.style.marginRight = '8px';
          img.style.cursor = 'pointer';
          img.draggable = true;
          img.addEventListener('contextmenu', e => e.preventDefault());
          img.addEventListener('dragstart', e => {
            try {
              e.dataTransfer.setData('text/uri-list', m.src);
              e.dataTransfer.setData('text/plain', m.src);
            } catch (err) {}
          });
          btn.appendChild(img);
        } else if (m.type === 'video') {
          if (m.poster) {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            const img = document.createElement('img');
            img.src = m.poster;
            img.alt = (project.title || '') + ' video thumbnail ' + (idx + 1);
            img.loading = 'lazy';
            img.style.width = '80px';
            img.style.height = 'auto';
            img.style.marginRight = '8px';
            img.style.cursor = 'pointer';
            img.draggable = false;
            img.addEventListener('contextmenu', e => e.preventDefault());
            img.addEventListener('dragstart', e => e.preventDefault());

            const overlay = document.createElement('span');
            overlay.className = 'media-play-overlay';
            overlay.textContent = '▶';
            overlay.setAttribute('aria-hidden', 'true');
            overlay.style.position = 'absolute';
            overlay.style.left = '8px';
            overlay.style.top = '6px';
            overlay.style.fontSize = '14px';
            wrapper.appendChild(img);
            wrapper.appendChild(overlay);
            btn.appendChild(wrapper);
          } else {
            const placeholder = document.createElement('div');
            placeholder.textContent = '▶';
            placeholder.style.width = '80px';
            placeholder.style.height = '48px';
            placeholder.style.display = 'flex';
            placeholder.style.alignItems = 'center';
            placeholder.style.justifyContent = 'center';
            placeholder.style.background = 'rgba(0,0,0,0.04)';
            placeholder.style.borderRadius = '6px';
            placeholder.style.marginRight = '8px';
            btn.appendChild(placeholder);
          }
        }

        btn.addEventListener('click', () => {
          renderMain(m);
          const firstChild = mainMediaEl.firstElementChild;
          if (firstChild) protectMediaEl(firstChild);
        });

        thumbsEl.appendChild(btn);
      });

    } else {
      mainMediaEl.innerHTML = '';
    }

    // Details table
    tableEl.innerHTML = '';
    function addRow(k, v) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = k;
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(th);
      tr.appendChild(td);
      tableEl.appendChild(tr);
    }

    if (project.details) {
      // prefer explicit ordering
      if (project.details.Role) addRow('Role', project.details.Role);
      addRow('Year', project.year || '');
      if (project.details.Technologies) addRow('Technologies', project.details.Technologies);
      if (project.details.Workload) addRow('Workload', project.details.Workload);
      // add any other keys
      Object.keys(project.details).forEach(k => {
        if (['Role','Technologies','Workload'].indexOf(k) === -1) {
          addRow(k, project.details[k]);
        }
      });
    } else {
      addRow('Year', project.year || '');
    }

  } catch (err) {
    console.error(err);
    titleEl.textContent = 'Error loading project';
    descEl.textContent = '';
    notFoundEl.style.display = 'block';
  }
}

window.addEventListener('DOMContentLoaded', renderProject);