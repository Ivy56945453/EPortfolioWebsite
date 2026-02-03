function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function renderProject() {
  const id = getQueryParam('id');
  const titleEl = document.getElementById('project-title');
  const descEl = document.getElementById('project-desc');
  const mainImg = document.getElementById('project-main-img');
  const thumbsEl = document.getElementById('project-thumbs');
  const tableEl = document.getElementById('project-table');
  const notFoundEl = document.getElementById('project-notfound');

  // Protect images from easy saving: disable dragging and right-click on image elements
  function protectImageEl(img) {
    if (!img) return;
    img.draggable = false;
    img.addEventListener('contextmenu', e => e.preventDefault());
    img.addEventListener('dragstart', e => e.preventDefault());
  }

  // Global fallback handlers in case images are added dynamically elsewhere
  document.addEventListener('contextmenu', (e) => { if (e.target && e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('dragstart', (e) => { if (e.target && e.target.tagName === 'IMG') e.preventDefault(); });

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

    // Images
    thumbsEl.innerHTML = '';
    if (Array.isArray(project.images) && project.images.length > 0) {
      mainImg.src = project.images[0];
      mainImg.alt = project.title + ' image';
      protectImageEl(mainImg);

      project.images.forEach((src, idx) => {
        const thumbWrap = document.createElement('div');
        thumbWrap.style.display = 'flex';
        thumbWrap.style.alignItems = 'center';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'thumb-btn';
        btn.style.border = 'none';
        btn.style.padding = '0';
        btn.style.background = 'transparent';
        btn.title = 'Show image ' + (idx + 1);

        const img = document.createElement('img');
        img.src = src;
        img.alt = project.title + ' thumbnail ' + (idx + 1);
        img.loading = 'lazy';
        img.style.width = '80px';
        img.style.height = 'auto';
        img.style.marginRight = '8px';
        img.style.cursor = 'pointer';
        img.draggable = false;
        img.addEventListener('contextmenu', e => e.preventDefault());
        img.addEventListener('dragstart', e => e.preventDefault());

        btn.appendChild(img);
        btn.addEventListener('click', () => {
          mainImg.src = src;
          protectImageEl(mainImg);
        });

        thumbWrap.appendChild(btn);
        thumbsEl.appendChild(thumbWrap);
      });

    } else {
      mainImg.src = '';
      mainImg.alt = '';
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