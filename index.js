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

      if (Array.isArray(p.images) && p.images.length > 0) {
        img.src = p.images[0];
        img.alt = p.title + ' thumbnail';
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