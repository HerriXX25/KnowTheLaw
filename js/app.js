// ===== STATE =====
let katalog    = null;
let docData    = null;
let activeTag  = null;
let activeBabId= null;
let activeBagId= null;
let activeParId= null;
let searchQuery= '';

// ===== INIT =====
async function init() {
  try {
    const res = await fetch('data/katalog.json');
    katalog = await res.json();
    buildFilters();
    renderContent();
  } catch(e) { console.error('Gagal memuat katalog:', e); }
}

// ===== FILTERS =====
function buildFilters() {
  const selKat = document.getElementById('filterKategori');
  const selSub = document.getElementById('filterSubkategori');
  const selThn = document.getElementById('filterTahun');

  katalog.kategori.forEach(k => {
    const o = document.createElement('option');
    o.value = k.id; o.textContent = k.label;
    selKat.appendChild(o);
  });

  const { dari, sampai } = katalog.tahun_range;
  for (let y = sampai; y >= dari; y--) {
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    selThn.appendChild(o);
  }

  selKat.addEventListener('change', () => {
    const kat = katalog.kategori.find(k => k.id === selKat.value);
    selSub.innerHTML = '<option value="">-- Pilih Peraturan --</option>';
    selSub.disabled = true;
    resetDoc();
    if (kat && kat.subkategori.length) {
      kat.subkategori.forEach(s => {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.label;
        selSub.appendChild(o);
      });
      selSub.disabled = false;
    }
  });

  selSub.addEventListener('change', async () => {
    const kat = katalog.kategori.find(k => k.id === selKat.value);
    const sub = kat && kat.subkategori.find(s => s.id === selSub.value);
    if (sub) await loadDoc(sub.file);
  });
}

function resetDoc() {
  docData = null; activeTag = null;
  activeBabId = activeBagId = activeParId = null;
  hideTags(); renderSidebar(); renderContent();
  document.getElementById('resultInfo').textContent = '';
}

// ===== LOAD DOKUMEN =====
async function loadDoc(file) {
  try {
    resetDoc();
    const res = await fetch(file);
    docData = await res.json();
    // Support struktur lama {bab:[]} dan baru {buku:[{bab:[]}]}
    if (!docData.bab && docData.buku) {
      docData._allBab = docData.buku.flatMap(function(b){ return b.bab; });
    } else {
      docData._allBab = docData.bab || [];
    }
    renderTags(); renderSidebar(); renderContent();
  } catch(e) { console.error('Gagal memuat dokumen:', e); }
}

// ===== TAGS =====
function renderTags() {
  if (!docData || !docData.tags || !docData.tags.length) { hideTags(); return; }
  const sec  = document.getElementById('tagsSection');
  const list = document.getElementById('tagsList');
  list.innerHTML = '';
  docData.tags.forEach(function(tag) {
    const btn = document.createElement('button');
    btn.className = 'tag-btn' + (activeTag === tag ? ' active' : '');
    btn.textContent = tag;
    btn.onclick = function(){ toggleTag(tag); };
    list.appendChild(btn);
  });
  sec.style.display = 'block';
}

function hideTags() { document.getElementById('tagsSection').style.display = 'none'; }

function toggleTag(tag) {
  activeTag = (activeTag === tag) ? null : tag;
  activeBabId = activeBagId = activeParId = null;
  renderTags(); renderSidebar(); renderContent();
}

// ===== SIDEBAR =====
function renderSidebar() {
  const sb = document.getElementById('sidebarContent');
  const docLabel = document.getElementById('sidebarDoc');

  if (!docData) {
    sb.innerHTML = '<div class="sidebar-empty">Pilih kategori dan peraturan untuk melihat daftar bab.</div>';
    docLabel.textContent = '';
    return;
  }
  docLabel.textContent = docData.singkatan || docData.nomor;

  var allBab = docData._allBab || [];
  var html = '';

  allBab.forEach(function(bab) {
    var isActiveBab = activeBabId === bab.id;
    var babCount = countPasalInBab(bab);
    html += '<div class="bab-item">';
    html += '<button class="bab-btn' + (isActiveBab ? ' active' : '') + '" onclick="selectBab(\'' + bab.id + '\')">';
    html += '<span class="bab-roman">' + bab.nomor + '</span>';
    html += '<span class="bab-name">' + esc(bab.judul) + '</span>';
    html += '<span class="bab-count">' + babCount + '</span>';
    html += '</button>';

    if (isActiveBab && bab.bagian && bab.bagian.length) {
      bab.bagian.forEach(function(bag) {
        var isActiveBag = activeBagId === bag.id;
        var bagCount = countPasalInBagian(bag);
        html += '<div class="sub-item">';
        html += '<button class="sub-btn' + (isActiveBag ? ' active' : '') + '" onclick="selectBagian(\'' + bab.id + '\',\'' + bag.id + '\')">';
        html += '<span class="sub-label">' + esc(bag.label) + '</span>';
        html += '<span class="sub-name">' + esc(bag.judul) + '</span>';
        html += '<span class="bab-count">' + bagCount + '</span>';
        html += '</button>';

        if (isActiveBag && bag.paragraf && bag.paragraf.length) {
          bag.paragraf.forEach(function(par) {
            var isActivePar = activeParId === par.id;
            html += '<div class="par-item">';
            html += '<button class="par-btn' + (isActivePar ? ' active' : '') + '" onclick="selectParagraf(\'' + bab.id + '\',\'' + bag.id + '\',\'' + par.id + '\')">';
            html += '<span class="par-label">' + esc(par.label) + '</span>';
            html += '<span class="par-name">' + esc(par.judul) + '</span>';
            html += '<span class="bab-count">' + par.pasal.length + '</span>';
            html += '</button>';
            html += '</div>';
          });
        }
        html += '</div>';
      });
    }
    html += '</div>';
  });

  sb.innerHTML = html;
}

function selectBab(babId) {
  if (activeBabId === babId) {
    activeBabId = null; activeBagId = null; activeParId = null;
  } else {
    activeBabId = babId; activeBagId = null; activeParId = null;
  }
  activeTag = null;
  renderTags(); renderSidebar(); renderContent();
  document.getElementById('contentArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectBagian(babId, bagId) {
  activeBabId = babId;
  if (activeBagId === bagId) {
    activeBagId = null; activeParId = null;
  } else {
    activeBagId = bagId; activeParId = null;
  }
  activeTag = null;
  renderTags(); renderSidebar(); renderContent();
}

function selectParagraf(babId, bagId, parId) {
  activeBabId = babId; activeBagId = bagId;
  activeParId = (activeParId === parId) ? null : parId;
  activeTag = null;
  renderTags(); renderSidebar(); renderContent();
}

// ===== HITUNG PASAL =====
function countPasalInBab(bab) {
  var n = (bab.pasal || []).length;
  (bab.bagian || []).forEach(function(bag){ n += countPasalInBagian(bag); });
  return n;
}

function countPasalInBagian(bag) {
  var n = (bag.pasal || []).length;
  (bag.paragraf || []).forEach(function(par){ n += (par.pasal || []).length; });
  return n;
}

// ===== FILTER PASAL =====
function getFilteredPasal() {
  if (!docData) return [];
  var q   = searchQuery;
  var thn = document.getElementById('filterTahun').value;
  if (thn && String(docData.tahun) !== thn) return [];

  var result = [];

  function tryAdd(p, babId, babNomor, babJudul, bagId, bagLabel, bagJudul, parId, parLabel, parJudul) {
    if (activeTag && (p.tags || []).indexOf(activeTag) === -1) return;
    if (activeBabId && babId !== activeBabId) return;
    if (activeBagId && bagId !== activeBagId) return;
    if (activeParId && parId !== activeParId) return;
    if (q) {
      var hay = [p.nomor, p.bunyi, p.penjelasan].concat(p.tags || []).join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return;
    }
    result.push(Object.assign({}, p, {
      _babId:babId, _babNomor:babNomor, _babJudul:babJudul,
      _bagId:bagId, _bagLabel:bagLabel||'', _bagJudul:bagJudul||'',
      _parId:parId, _parLabel:parLabel||'', _parJudul:parJudul||''
    }));
  }

  (docData._allBab || []).forEach(function(bab) {
    (bab.pasal || []).forEach(function(p) {
      if (activeBagId || activeParId) return;
      tryAdd(p, bab.id, bab.nomor, bab.judul, null,'','',null,'','');
    });
    (bab.bagian || []).forEach(function(bag) {
      (bag.pasal || []).forEach(function(p) {
        if (activeParId) return;
        tryAdd(p, bab.id, bab.nomor, bab.judul, bag.id, bag.label, bag.judul, null,'','');
      });
      (bag.paragraf || []).forEach(function(par) {
        (par.pasal || []).forEach(function(p) {
          tryAdd(p, bab.id, bab.nomor, bab.judul, bag.id, bag.label, bag.judul, par.id, par.label, par.judul);
        });
      });
    });
  });

  return result;
}

// ===== RENDER KONTEN =====
var TAG_COLORS = ['pt-0','pt-1','pt-2','pt-3','pt-4','pt-5'];
var tagColorMap = {};
var colorIdx = 0;

function getTagColor(tag) {
  if (!tagColorMap[tag]) tagColorMap[tag] = TAG_COLORS[colorIdx++ % TAG_COLORS.length];
  return tagColorMap[tag];
}

function renderContent() {
  var area = document.getElementById('contentArea');

  if (!docData) {
    area.innerHTML = '<div class="landing-state">' +
      '<div class="landing-icon"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 4h12l6 6v18a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#1D5CA6" stroke-width="1.5" fill="none"/><path d="M20 4v6h6" stroke="#1D5CA6" stroke-width="1.5" fill="none"/><rect x="10" y="16" width="12" height="1.5" rx=".75" fill="#1D5CA6"/><rect x="10" y="20" width="8" height="1.5" rx=".75" fill="#1D5CA6"/></svg></div>' +
      '<div class="landing-title">Mulai Cari Pasal</div>' +
      '<div class="landing-steps">' +
      '<div class="landing-step"><span class="step-num">1</span><span class="step-text">Pilih <strong>Kategori</strong> (Undang-Undang atau SEMA)</span></div>' +
      '<div class="landing-step"><span class="step-num">2</span><span class="step-text">Pilih <strong>Peraturan</strong> spesifik yang ingin dicari</span></div>' +
      '<div class="landing-step"><span class="step-num">3</span><span class="step-text">Navigasi lewat <strong>Bab &#8250; Bagian &#8250; Paragraf</strong> di sidebar kiri</span></div>' +
      '</div></div>';
    return;
  }

  var pasal = getFilteredPasal();
  updateResultInfo(pasal.length);

  if (!pasal.length) {
    area.innerHTML = '<div class="empty-state"><svg class="empty-icon" width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="21" cy="21" r="13" stroke="currentColor" stroke-width="2"/><path d="M30 30L42 42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><div class="empty-title">Tidak ada pasal ditemukan</div><div class="empty-sub">Coba kata kunci berbeda, atau reset filter</div></div>';
    return;
  }

  // Kelompokkan per bab+bagian
  var grouped = {};
  var groupOrder = [];
  pasal.forEach(function(p) {
    var gkey = p._babId + '||' + (p._bagId || '__');
    if (!grouped[gkey]) {
      grouped[gkey] = { babNomor:p._babNomor, babJudul:p._babJudul,
                        bagLabel:p._bagLabel, bagJudul:p._bagJudul, pasal:[] };
      groupOrder.push(gkey);
    }
    grouped[gkey].pasal.push(p);
  });

  var html = '';
  groupOrder.forEach(function(gkey) {
    var g = grouped[gkey];
    html += '<div class="bab-separator">';
    html += '<span class="bab-sep-roman">BAB ' + g.babNomor + '</span>';
    html += '<span class="bab-sep-title">' + esc(g.babJudul) + '</span>';
    if (g.bagLabel) html += '<span class="bab-sep-bag">' + esc(g.bagLabel) + (g.bagJudul ? ' \u2014 ' + esc(g.bagJudul) : '') + '</span>';
    html += '<span class="bab-sep-count">' + g.pasal.length + ' pasal</span>';
    html += '</div>';

    g.pasal.forEach(function(p) {
      var tagsHtml = (p.tags || []).map(function(t){
        return '<span class="pasal-tag ' + getTagColor(t) + '">' + esc(t) + '</span>';
      }).join('');

      var breadcrumb = [p._bagLabel, p._parLabel].filter(Boolean).join(' \u203a ');

      html += '<div class="pasal-card" id="card-' + p.id + '">';
      html += '<div class="pasal-header" onclick="togglePasal(\'' + p.id + '\')">';
      html += '<div class="pasal-header-left">';
      html += '<div class="pasal-nomor-row">';
      html += '<span class="pasal-nomor-badge">Pasal ' + p.nomor + '</span>';
      html += '<span class="pasal-judul-tag">' + esc(docData.singkatan || docData.nomor) + '</span>';
      if (breadcrumb) html += '<span class="pasal-breadcrumb">' + esc(breadcrumb) + '</span>';
      html += '</div>';
      if (tagsHtml) html += '<div class="pasal-tags">' + tagsHtml + '</div>';
      html += '</div>';
      html += '<button class="pasal-toggle" id="toggle-' + p.id + '">\u25bc</button>';
      html += '</div>';
      html += '<div class="pasal-body" id="body-' + p.id + '">';
      html += '<div class="bunyi-section"><div class="section-label">Bunyi Pasal</div>';
      html += '<div class="bunyi-text">' + esc(p.bunyi) + '</div></div>';
      if (p.penjelasan) {
        html += '<div class="penjelasan-section"><div class="section-label">Penjelasan Resmi</div>';
        html += '<div class="penjelasan-text">' + esc(p.penjelasan) + '</div></div>';
      }
      html += '</div></div>';
    });
  });

  area.innerHTML = html;
}

function togglePasal(id) {
  var body   = document.getElementById('body-'   + id);
  var toggle = document.getElementById('toggle-' + id);
  var open   = body.classList.contains('open');
  body.classList.toggle('open',   !open);
  toggle.classList.toggle('open', !open);
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function updateResultInfo(count) {
  var el = document.getElementById('resultInfo');
  if (!docData) { el.textContent = ''; return; }
  var parts = [];
  if (activeTag) parts.push('tag: ' + activeTag);
  if (activeBabId) {
    var bab = (docData._allBab || []).find(function(b){ return b.id === activeBabId; });
    if (bab) parts.push('BAB ' + bab.nomor);
  }
  if (activeBagId) parts.push(activeBagId.replace('bagian-', 'Bagian '));
  if (activeParId) parts.push(activeParId.replace('paragraf-', 'Paragraf '));
  if (searchQuery) parts.push('"' + searchQuery + '"');
  el.textContent = count + ' pasal' + (parts.length ? ' \u00b7 ' + parts.join(', ') : '');
}

// ===== EVENTS =====
document.addEventListener('DOMContentLoaded', function() {
  init();

  var inp   = document.getElementById('searchInput');
  var clear = document.getElementById('searchClear');

  inp.addEventListener('input', function() {
    searchQuery = inp.value.toLowerCase().trim();
    clear.style.display = searchQuery ? 'flex' : 'none';
    activeTag = null; activeBabId = null; activeBagId = null; activeParId = null;
    if (docData) { renderTags(); renderSidebar(); renderContent(); }
  });

  clear.addEventListener('click', function() {
    inp.value = ''; searchQuery = '';
    clear.style.display = 'none';
    if (docData) { renderTags(); renderSidebar(); renderContent(); }
  });

  document.getElementById('filterReset').addEventListener('click', function() {
    document.getElementById('filterKategori').value = '';
    document.getElementById('filterSubkategori').innerHTML = '<option value="">-- Pilih Peraturan --</option>';
    document.getElementById('filterSubkategori').disabled = true;
    document.getElementById('filterTahun').value = '';
    inp.value = ''; searchQuery = '';
    clear.style.display = 'none';
    resetDoc();
  });

  document.getElementById('filterTahun').addEventListener('change', function() {
    if (docData) renderContent();
  });
});
