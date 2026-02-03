async function renderProjects() {
  const container = document.getElementById('projects-container');
  const template = document.getElementById('project-template');

  try {
    const res = await fetch('projects.json');
    const projects = await res.json();

    projects.forEach(p => {
      const clone = template.content.cloneNode(true);
      const item = clone.querySelector('.item');
      const card = clone.querySelector('.card');
      const title = clone.querySelector('.card-title');
      const meta = clone.querySelector('.card-meta');
      const img = clone.querySelector('.card-img');
      const tagsEl = clone.querySelector('.card-tags');
      const btn = clone.querySelector('.btn');

      title.textContent = p.title;
      meta.textContent = p.year || '';

      // Support both `media` (new) and `images` (legacy)
      const firstMedia = (Array.isArray(p.media) && p.media.length) ? p.media[0] : ((Array.isArray(p.images) && p.images.length) ? { type: 'image', src: p.images[0] } : null);

      if (firstMedia) {
        // Use poster for videos when available, else use the image src
        const thumbSrc = (firstMedia.type === 'video' && firstMedia.poster) ? firstMedia.poster : (firstMedia.type === 'video' ? '' : firstMedia.src);
        if (thumbSrc) {
          img.src = thumbSrc;
          img.alt = p.title + ' thumbnail';
        } else {
          img.remove();
        }

        // video overlay
        if (firstMedia.type === 'video') {
          const overlay = document.createElement('span');
          overlay.className = 'media-play-overlay';
          overlay.textContent = '▶';
          overlay.setAttribute('aria-hidden', 'true');

          const wrapper = document.createElement('div');
          wrapper.style.position = 'relative';
          img.parentNode.replaceChild(wrapper, img);
          wrapper.appendChild(img);
          wrapper.appendChild(overlay);
        }

      } else {
        img.remove();
      }

      // Build tag list: role + technologies
      tagsEl.innerHTML = '';
      if (p.details && p.details.Role) {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = p.details.Role;
        tagsEl.appendChild(span);
      }
      if (p.details && p.details.Technologies) {
        p.details.Technologies.split(',').map(t => t.trim()).filter(t => t).forEach(t => {
          const span = document.createElement('span');
          span.className = 'tag';
          span.textContent = t;
          tagsEl.appendChild(span);
        });
      }

      btn.href = `project.html?id=${encodeURIComponent(p.id)}`;
      btn.setAttribute('aria-label', `View details for ${p.title}`);

      // Make the whole card clickable (optional): clicking card goes to details
      card.addEventListener('click', (e) => {
        // prevent double-navigation when clicking the button
        if (e.target === btn || e.target.closest('a')) return;
        window.location.href = btn.href;
      });

      container.appendChild(clone);
    });
  } catch (err) {
    console.error('Failed to load projects.json', err);
    container.innerHTML = '<p style="color:#a00">Unable to load projects.</p>';
  }
}

window.addEventListener('DOMContentLoaded', renderProjects);