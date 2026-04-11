// ===== STATE =====
let katalog       = null;
let docData       = null;
let activeTag     = null;
let activeBabId   = null;
let searchQuery   = '';

// ===== INIT =====
async function init() {
  try {
    const res  = await fetch('data/katalog.json');
    katalog    = await res.json();
    buildFilters();
  } catch (e) { console.error('Gagal memuat katalog:', e); }
}

// ===== BUILD FILTER KATEGORI & SUBKATEGORI =====
function buildFilters() {
  const selKat  = document.getElementById('filterKategori');
  const selSub  = document.getElementById('filterSubkategori');
  const selThn  = document.getElementById('filterTahun');

  // Kategori
  katalog.kategori.forEach(k => {
    const o = document.createElement('option');
    o.value = k.id; o.textContent = k.label;
    selKat.appendChild(o);
  });

  // Tahun
  const { dari, sampai } = katalog.tahun_range;
  for (let y = sampai; y >= dari; y--) {
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    selThn.appendChild(o);
  }

  // Subkategori — update saat kategori berubah
  selKat.addEventListener('change', () => {
    const kat = katalog.kategori.find(k => k.id === selKat.value);
    selSub.innerHTML = '<option value="">-- Pilih Peraturan --</option>';
    selSub.disabled  = true;
    docData = null; activeTag = null; activeBabId = null;
    renderSidebar(); renderContent();
    hideTags();

    if (kat && kat.subkategori.length) {
      kat.subkategori.forEach(s => {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.label;
        selSub.appendChild(o);
      });
      selSub.disabled = false;
    }
  });

  // Load dokumen saat subkategori dipilih
  selSub.addEventListener('change', async () => {
    const kat  = katalog.kategori.find(k => k.id === selKat.value);
    const sub  = kat?.subkategori.find(s => s.id === selSub.value);
    if (!sub) return;
    await loadDoc(sub.file, sub.label);
  });
}

// ===== LOAD DOKUMEN =====
async function loadDoc(file, label) {
  try {
    docData = null; activeTag = null; activeBabId = null;
    searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    const res = await fetch(file);
    docData   = await res.json();
    renderTags();
    renderSidebar();
    renderContent();
    document.getElementById('resultInfo').textContent = '';
  } catch (e) {
    console.error('Gagal memuat dokumen:', e);
  }
}

// ===== QUICK TAGS =====
function renderTags() {
  if (!docData?.tags?.length) { hideTags(); return; }
  const section = document.getElementById('tagsSection');
  const list    = document.getElementById('tagsList');
  list.innerHTML = '';
  docData.tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn' + (activeTag === tag ? ' active' : '');
    btn.textContent = tag;
    btn.onclick = () => toggleTag(tag);
    list.appendChild(btn);
  });
  section.style.display = 'block';
}

function hideTags() {
  document.getElementById('tagsSection').style.display = 'none';
}

function toggleTag(tag) {
  activeTag = (activeTag === tag) ? null : tag;
  activeBabId = null;
  renderTags();
  renderSidebar();
  renderContent();
}

// ===== SIDEBAR BAB =====
function renderSidebar() {
  const sb = document.getElementById('sidebarContent');
  if (!docData) {
    sb.innerHTML = '<div class="sidebar-empty">Pilih kategori dan peraturan untuk melihat daftar bab.</div>';
    document.getElementById('sidebarDoc').textContent = '';
    return;
  }
  document.getElementById('sidebarDoc').textContent = docData.singkatan || docData.nomor;

  const pasalTampil = getFilteredPasal();
  const babIds = new Set(pasalTampil.map(p => p._babId));

  sb.innerHTML = docData.bab.map(bab => {
    const count  = bab.pasal.filter(p => babIds.has(bab.id) || !activeTag && !searchQuery).length;
    const shown  = babIds.has(bab.id);
    if (!shown && (activeTag || searchQuery)) return '';
    return `
      <div class="bab-item">
        <button class="bab-btn ${activeBabId === bab.id ? 'active' : ''}" onclick="selectBab('${bab.id}')">
          <span class="bab-roman">${bab.nomor}</span>
          <span class="bab-name">${bab.judul}</span>
          <span class="bab-count">${bab.pasal.length}</span>
        </button>
      </div>`;
  }).join('');
}

function selectBab(babId) {
  activeBabId = (activeBabId === babId) ? null : babId;
  activeTag   = null;
  renderTags();
  renderSidebar();
  renderContent();
  document.getElementById('contentArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== AMBIL PASAL TERFILTER =====
function getFilteredPasal() {
  if (!docData) return [];
  const q   = searchQuery;
  const thn = document.getElementById('filterTahun').value;
  let result = [];

  docData.bab.forEach(bab => {
    bab.pasal.forEach(p => {
      // Tag filter
      if (activeTag && !p.tags?.includes(activeTag)) return;
      // Bab filter
      if (activeBabId && bab.id !== activeBabId) return;
      // Search filter
      if (q) {
        const hay = [p.nomor, p.judul, p.bunyi, p.penjelasan, ...(p.tags||[])].join(' ').toLowerCase();
        if (!hay.includes(q)) return;
      }
      // Tahun filter (pada level dokumen)
      if (thn && String(docData.tahun) !== thn) return;
      result.push({ ...p, _babId: bab.id, _babNomor: bab.nomor, _babJudul: bab.judul });
    });
  });
  return result;
}

// ===== RENDER KONTEN PASAL =====
function renderContent() {
  const area = document.getElementById('contentArea');

  if (!docData) {
    area.innerHTML = `
      <div class="landing-state">
        <div class="landing-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M8 4h12l6 6v18a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#1D5CA6" stroke-width="1.5" fill="none"/>
            <path d="M20 4v6h6" stroke="#1D5CA6" stroke-width="1.5" fill="none"/>
            <rect x="10" y="16" width="12" height="1.5" rx=".75" fill="#1D5CA6"/>
            <rect x="10" y="20" width="8" height="1.5" rx=".75" fill="#1D5CA6"/>
          </svg>
        </div>
        <div class="landing-title">Mulai Cari Pasal</div>
        <div class="landing-steps">
          <div class="landing-step"><span class="step-num">1</span><span class="step-text">Pilih <strong>Kategori</strong> (Undang-Undang atau SEMA)</span></div>
          <div class="landing-step"><span class="step-num">2</span><span class="step-text">Pilih <strong>Peraturan</strong> spesifik yang ingin dicari</span></div>
          <div class="landing-step"><span class="step-num">3</span><span class="step-text">Gunakan <strong>Quick Tags</strong> atau <strong>pencarian</strong> untuk filter pasal</span></div>
        </div>
      </div>`;
    return;
  }

  const pasal = getFilteredPasal();
  updateResultInfo(pasal.length);

  if (!pasal.length) {
    area.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="21" cy="21" r="13" stroke="currentColor" stroke-width="2"/>
          <path d="M30 30L42 42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div class="empty-title">Tidak ada pasal ditemukan</div>
        <div class="empty-sub">Coba kata kunci berbeda, atau reset filter dan tag</div>
      </div>`;
    return;
  }

  // Kelompokkan per bab
  const perBab = {};
  pasal.forEach(p => {
    if (!perBab[p._babId]) perBab[p._babId] = { nomor: p._babNomor, judul: p._babJudul, pasal: [] };
    perBab[p._babId].pasal.push(p);
  });

  const tagColors = ['pt-0','pt-1','pt-2','pt-3','pt-4','pt-5'];
  const tagColorMap = {};
  let colorIdx = 0;

  area.innerHTML = Object.entries(perBab).map(([babId, bab]) => `
    <div class="bab-separator">
      <span class="bab-sep-roman">BAB ${bab.nomor}</span>
      <span class="bab-sep-title">${bab.judul}</span>
      <span class="bab-sep-count">${bab.pasal.length} pasal</span>
    </div>
    ${bab.pasal.map(p => {
      const tagsHtml = (p.tags||[]).map(t => {
        if (!tagColorMap[t]) { tagColorMap[t] = tagColors[colorIdx++ % tagColors.length]; }
        return `<span class="pasal-tag ${tagColorMap[t]}">${t}</span>`;
      }).join('');
      return `
        <div class="pasal-card" id="card-${p.id}">
          <div class="pasal-header" onclick="togglePasal('${p.id}')">
            <div class="pasal-header-left">
              <div class="pasal-nomor-row">
                <span class="pasal-nomor-badge">Pasal ${p.nomor}</span>
                <span class="pasal-judul-tag">${docData.singkatan || docData.nomor}</span>
              </div>
              <div class="pasal-judul">${p.judul}</div>
              ${tagsHtml ? `<div class="pasal-tags">${tagsHtml}</div>` : ''}
            </div>
            <button class="pasal-toggle" id="toggle-${p.id}">▼</button>
          </div>
          <div class="pasal-body" id="body-${p.id}">
            <div class="bunyi-section">
              <div class="section-label">Bunyi Pasal</div>
              <div class="bunyi-text">${escHtml(p.bunyi)}</div>
            </div>
            <div class="penjelasan-section">
              <div class="section-label">Penjelasan Resmi</div>
              <div class="penjelasan-text">${escHtml(p.penjelasan)}</div>
            </div>
          </div>
        </div>`;
    }).join('')}
  `).join('');
}

function togglePasal(id) {
  const body   = document.getElementById('body-' + id);
  const toggle = document.getElementById('toggle-' + id);
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  toggle.classList.toggle('open', !isOpen);
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function updateResultInfo(count) {
  const el = document.getElementById('resultInfo');
  if (!docData) { el.textContent = ''; return; }
  const parts = [];
  if (activeTag)   parts.push(`tag: ${activeTag}`);
  if (activeBabId) { const b = docData.bab.find(b => b.id === activeBabId); if (b) parts.push(`Bab ${b.nomor}`); }
  if (searchQuery) parts.push(`"${searchQuery}"`);
  el.textContent = parts.length ? `${count} pasal · ${parts.join(', ')}` : `${count} pasal`;
}

// ===== SEARCH =====
document.addEventListener('DOMContentLoaded', () => {
  init();

  const inp   = document.getElementById('searchInput');
  const clear = document.getElementById('searchClear');

  inp.addEventListener('input', () => {
    searchQuery = inp.value.toLowerCase().trim();
    clear.style.display = searchQuery ? 'flex' : 'none';
    activeTag   = null;
    activeBabId = null;
    if (docData) { renderTags(); renderSidebar(); renderContent(); }
  });

  clear.addEventListener('click', () => {
    inp.value = ''; searchQuery = '';
    clear.style.display = 'none';
    if (docData) { renderTags(); renderSidebar(); renderContent(); }
  });

  document.getElementById('filterReset').addEventListener('click', () => {
    document.getElementById('filterKategori').value  = '';
    document.getElementById('filterSubkategori').innerHTML = '<option value="">-- Pilih Peraturan --</option>';
    document.getElementById('filterSubkategori').disabled  = true;
    document.getElementById('filterTahun').value     = '';
    inp.value = ''; searchQuery = '';
    clear.style.display = 'none';
    docData = null; activeTag = null; activeBabId = null;
    hideTags(); renderSidebar(); renderContent();
  });

  document.getElementById('filterTahun').addEventListener('change', () => {
    if (docData) renderContent();
  });
});
