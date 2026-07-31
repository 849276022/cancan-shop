// ========== 走失人员管理系统 PWA v8 ==========

// 配置
const API_BASE = '/api';
const STATIONS = ['西津','安吉客运站','苏卢','三十三中','秀厢','南宁剧场','福建园','亭洪路','石柱岭','江南客运站','大沙田','建设路','石子塘','金象','玉洞','东风路','玉岭路','那福路','坛泽'];

// 全局状态
let currentUser = null;
let persons = [];
let filteredPersons = [];
let editingId = null;
let photoUrl = '';
let importType = 'person'; // 'person' or 'abnormal'
let parsedItems = []; // 解析后的数据
let abnormalPassengers = []; // 异常乘客列表
let currentTab = 'person'; // 当前标签页：'person' 或 'abnormal'

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initEventListeners();
  initStations();
  registerServiceWorker();
});

// ========== Service Worker ==========
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.log('SW failed:', err));
  }
}

// ========== 认证 ==========
function checkAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    verifyToken(token);
  } else {
    showLogin();
  }
}

async function verifyToken(token) {
  try {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.valid) {
      currentUser = data.user;
      showMain();
      loadPersons();
    } else {
      localStorage.removeItem('token');
      showLogin();
    }
  } catch (err) {
    console.error('Verify failed:', err);
    showLogin();
  }
}

async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const agreed = document.getElementById('agree-checkbox').checked;

  if (!agreed) {
    showToast('请先同意用户协议和隐私政策');
    return;
  }

  if (!username || !password) {
    showToast('请输入用户名和密码');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    
    if (data.success) {
      localStorage.setItem('token', data.token);
      currentUser = data.user;
      showMain();
      loadPersons();
    } else {
      showToast(data.error || '登录失败');
    }
  } catch (err) {
    showToast('网络错误，请重试');
  }
}

function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  showLogin();
}

// ========== 页面切换 ==========
function showLogin() {
  document.getElementById('login-page').classList.add('active');
  document.getElementById('main-page').classList.remove('active');
}

function showMain() {
  document.getElementById('login-page').classList.remove('active');
  document.getElementById('main-page').classList.add('active');
}

// ========== 事件绑定 ==========
function initEventListeners() {
  // 登录
  document.getElementById('login-btn').addEventListener('click', login);
  
  // 主标签页切换
  document.getElementById('main-tab-person').addEventListener('click', () => {
    document.getElementById('main-tab-person').style.border = '2px solid #3b82f6';
    document.getElementById('main-tab-person').style.background = '#1e3a5f';
    document.getElementById('main-tab-person').style.color = '#fff';
    document.getElementById('main-tab-person').style.fontWeight = 'bold';
    document.getElementById('main-tab-abnormal').style.border = '2px solid #475569';
    document.getElementById('main-tab-abnormal').style.background = '#1e293b';
    document.getElementById('main-tab-abnormal').style.color = '#94a3b8';
    document.getElementById('main-tab-abnormal').style.fontWeight = 'normal';
    document.getElementById('person-content').style.display = 'block';
    document.getElementById('abnormal-content').style.display = 'none';
  });
  
  document.getElementById('main-tab-abnormal').addEventListener('click', () => {
    document.getElementById('main-tab-abnormal').style.border = '2px solid #3b82f6';
    document.getElementById('main-tab-abnormal').style.background = '#1e3a5f';
    document.getElementById('main-tab-abnormal').style.color = '#fff';
    document.getElementById('main-tab-abnormal').style.fontWeight = 'bold';
    document.getElementById('main-tab-person').style.border = '2px solid #475569';
    document.getElementById('main-tab-person').style.background = '#1e293b';
    document.getElementById('main-tab-person').style.color = '#94a3b8';
    document.getElementById('main-tab-person').style.fontWeight = 'normal';
    document.getElementById('person-content').style.display = 'none';
    document.getElementById('abnormal-content').style.display = 'block';
    loadAbnormal();
  });
  
  // 搜索
  document.getElementById('search-input').addEventListener('input', filterPersons);
  document.getElementById('filter-status').addEventListener('change', filterPersons);
  document.getElementById('filter-station').addEventListener('change', filterPersons);
  
  // 新增
  document.getElementById('add-btn').addEventListener('click', () => showModal());
  
  // ========== 导入相关 ==========
  // importType 和 parsedItems 已在全局声明

  // 导入弹窗打开
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'flex';
    resetImportUI();
  });
  document.getElementById('import-close').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'none';
  });
  document.getElementById('import-cancel').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'none';
  });
  document.getElementById('import-confirm').addEventListener('click', doImport);

  // 导入类型切换
  document.getElementById('tab-person').addEventListener('click', () => {
    importType = 'person';
    document.getElementById('tab-person').style.cssText = 'flex:1;padding:10px;border:2px solid #3b82f6;border-radius:8px;background:#1e3a5f;color:#fff;cursor:pointer;font-size:14px;font-weight:bold;';
    document.getElementById('tab-abnormal').style.cssText = 'flex:1;padding:10px;border:2px solid #475569;border-radius:8px;background:#1e293b;color:#94a3b8;cursor:pointer;font-size:14px;';
    document.getElementById('import-tip-text').textContent = '从 Excel 复制粘贴，制表符分隔：姓名 性别 年龄 身份证 发现时间 发现地点 状态 站点 家属姓名 电话 关系 住址 备注';
    resetImportUI();
  });
  document.getElementById('tab-abnormal').addEventListener('click', () => {
    importType = 'abnormal';
    document.getElementById('tab-abnormal').style.cssText = 'flex:1;padding:10px;border:2px solid #3b82f6;border-radius:8px;background:#1e3a5f;color:#fff;cursor:pointer;font-size:14px;font-weight:bold;';
    document.getElementById('tab-person').style.cssText = 'flex:1;padding:10px;border:2px solid #475569;border-radius:8px;background:#1e293b;color:#94a3b8;cursor:pointer;font-size:14px;';
    document.getElementById('import-tip-text').textContent = '从 Excel 复制粘贴，制表符分隔：车站 发生时间 姓名 性别 异常行为 联系电话 市民卡号 常行出入口 是否有家属陪同 帮助特点 异常事件经过';
    resetImportUI();
  });

  // 文件上传
  document.getElementById('import-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('file-name-display').textContent = '已选择: ' + file.name;
    document.getElementById('file-name-display').style.display = 'block';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (rows.length < 2) {
          showToast('文件为空或只有表头');
          return;
        }

        // 解析数据
        parsedItems = parseExcelRows(rows, importType);

        if (parsedItems.length === 0) {
          showToast('未识别到有效数据');
          return;
        }

        // 显示预览
        showPreview(parsedItems, importType);
        showToast(`识别到 ${parsedItems.length} 条数据`);
      } catch (err) {
        showToast('文件解析失败: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  });

  // 拖拽上传
  const uploadZone = document.getElementById('file-upload-zone');
  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.style.borderColor = '#3b82f6'; });
  uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = '#475569'; });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '#475569';
    const file = e.dataTransfer.files[0];
    if (file) {
      document.getElementById('import-file-input').files = e.dataTransfer.files;
      document.getElementById('import-file-input').dispatchEvent(new Event('change'));
    }
  });
  
  // 弹窗
  document.getElementById('modal-close').addEventListener('click', hideModal);
  document.getElementById('btn-cancel').addEventListener('click', hideModal);
  document.getElementById('btn-save').addEventListener('click', savePerson);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') hideModal();
  });
  
  // 照片
  document.getElementById('photo-upload-btn').addEventListener('click', () => {
    document.getElementById('photo-input').click();
  });
  document.getElementById('photo-input').addEventListener('change', handlePhotoSelect);
  document.getElementById('photo-remove').addEventListener('click', removePhoto);
  
  // 协议
  document.getElementById('show-agreement').addEventListener('click', (e) => {
    e.preventDefault();
    showAgreement('用户协议', getUserAgreement());
  });
  document.getElementById('show-privacy').addEventListener('click', (e) => {
    e.preventDefault();
    showAgreement('隐私政策', getPrivacyPolicy());
  });
  document.getElementById('agreement-close').addEventListener('click', () => {
    document.getElementById('agreement-modal').style.display = 'none';
  });
}

// ========== 站点初始化 ==========
function initStations() {
  const filterStation = document.getElementById('filter-station');
  const formStation = document.getElementById('form-station');
  
  STATIONS.forEach(station => {
    filterStation.add(new Option(station, station));
    formStation.add(new Option(station, station));
  });
}

// ========== 数据加载 ==========
async function loadPersons() {
  try {
    const res = await fetch(`${API_BASE}/persons?t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      cache: 'no-store'
    });
    const data = await res.json();
    
    if (data.success) {
      persons = data.data;
      updateStats();
      filterPersons();
      // 列表不携带大图片；仅为确实有图片的记录按需加载。
      loadPersonPhotos();
    } else {
      showToast('加载失败');
    }
  } catch (err) {
    showToast('网络错误');
  }
}

async function loadPersonPhotos() {
  const targets = persons.filter(p => p.hasPhoto && !p.photoUrl);
  // 控制并发，避免同时下载多张大图片导致浏览器或函数过载。
  for (let i = 0; i < targets.length; i += 3) {
    await Promise.all(targets.slice(i, i + 3).map(async person => {
      try {
        const res = await fetch(`${API_BASE}/persons/${encodeURIComponent(person.id)}/photo`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, cache: 'no-store'
        });
        const result = await res.json();
        if (result.success && result.photoUrl) person.photoUrl = result.photoUrl;
        else person.photoLoadError = true;
      } catch (err) { person.photoLoadError = true; console.warn('Photo load failed:', person.id, err); }
    }));
    filterPersons();
  }
}

async function loadAbnormal() {
  try {
    const res = await fetch(`${API_BASE}/abnormal?t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      cache: 'no-store'
    });
    const data = await res.json();
    
    if (data.success) {
      abnormalPassengers = data.data;
      document.getElementById('abnormal-total').textContent = abnormalPassengers.length;
      renderAbnormalList();
    } else {
      showToast('加载异常乘客失败');
    }
  } catch (err) {
    showToast('网络错误');
  }
}

function renderAbnormalList() {
  const list = document.getElementById('abnormal-list');
  const empty = document.getElementById('abnormal-empty');
  
  if (abnormalPassengers.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }
  
  list.style.display = 'block';
  empty.style.display = 'none';
  
  list.innerHTML = abnormalPassengers.map(item => `
    <div class="person-card" style="padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:bold;font-size:16px;color:#e2e8f0;">${item.name || '未知'}</span>
        <span style="font-size:12px;color:#64748b;">${item.occurTime || ''}</span>
      </div>
      <div style="font-size:13px;color:#94a3b8;line-height:1.6;">
        <div>📍 ${item.station || '未知站点'}</div>
        ${item.abnormalBehavior ? `<div>⚠️ ${item.abnormalBehavior}</div>` : ''}
        ${item.gender ? `<div>👤 ${item.gender}</div>` : ''}
        ${item.phone ? `<div>📞 ${item.phone}</div>` : ''}
        ${item.commonExit ? `<div>🚪 常行出入口: ${item.commonExit}</div>` : ''}
        ${item.hasFamily ? `<div>👨‍👩‍👧 家属陪同: ${item.hasFamily}</div>` : ''}
        ${item.incidentDesc ? `<div>📝 ${item.incidentDesc}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function updateStats() {
  document.getElementById('stat-total').textContent = persons.length;
  document.getElementById('stat-pending').textContent = persons.filter(p => p.status === '待核实').length;
  document.getElementById('stat-found').textContent = persons.filter(p => p.status === '已找到家属').length;
}

function filterPersons() {
  const searchText = document.getElementById('search-input').value.trim().toLowerCase();
  const statusFilter = document.getElementById('filter-status').value;
  const stationFilter = document.getElementById('filter-station').value;
  
  filteredPersons = persons.filter(p => {
    // 搜索
    const matchSearch = !searchText || 
      (p.name && p.name.toLowerCase().includes(searchText)) ||
      (p.idCard && p.idCard.includes(searchText)) ||
      (p.foundLocation && p.foundLocation.toLowerCase().includes(searchText));
    
    // 状态筛选
    const matchStatus = statusFilter === '0' || 
      (statusFilter === '1' && p.status === '待核实') ||
      (statusFilter === '2' && p.status === '已找到家属') ||
      (statusFilter === '3' && p.status === '处理中') ||
      (statusFilter === '4' && p.status === '已移交');
    
    // 站点筛选
    const matchStation = stationFilter === '0' || p.station === stationFilter;
    
    return matchSearch && matchStatus && matchStation;
  });
  
  renderPersons();
}

function renderPersons() {
  const list = document.getElementById('person-list');
  const empty = document.getElementById('empty-state');
  
  if (filteredPersons.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  
  empty.style.display = 'none';
  list.innerHTML = filteredPersons.map(p => `
    <div class="person-card">
      <div class="card-header">
        <div class="person-avatar">
          ${p.photoUrl ? `<img src="${p.photoUrl}" class="avatar-img">` : `<span class="avatar-text">${p.name[0] || '?'}</span>`}
        </div>
        <div class="person-info">
          <span class="person-name">${escapeHtml(p.name)}</span>
          <span class="person-meta">${escapeHtml(p.gender || '男')} · ${p.age || '?'}岁 · ${escapeHtml(p.station || '—')}</span>
        </div>
        <span class="status-tag status-${getStatusClass(p.status)}">${escapeHtml(p.status)}</span>
      </div>
      
      ${p.photoUrl ? `<div class="card-photo"><img src="${p.photoUrl}" class="photo-img" alt="${escapeHtml(p.name || '人员')}人脸照片" onclick="previewImage(this.src)"></div>` : (p.hasPhoto && p.photoLoadError ? `<div class="card-photo photo-load-error">人脸照片加载失败，请点击编辑查看</div>` : '')}
      
      <div class="card-body">
        <div class="info-row">
          <span class="info-label">身份证</span>
          <span class="info-value">${escapeHtml(p.idCard || '—')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">发现时间</span>
          <span class="info-value">${escapeHtml(p.foundTime || '—')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">发现地点</span>
          <span class="info-value">${escapeHtml(p.foundLocation || '—')}</span>
        </div>
        
        ${p.familyName || p.familyPhone ? `
          <div class="family-section">
            <div class="family-title">👤 家属信息</div>
            <div class="info-row">
              <span class="info-label">姓名</span>
              <span class="info-value">${escapeHtml(p.familyName || '—')}</span>
            </div>
            ${p.familyPhone ? `
              <div class="info-row">
                <span class="info-label">电话</span>
                <span class="info-value phone" onclick="callPhone('${p.familyPhone}')">${escapeHtml(p.familyPhone)}</span>
              </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">关系</span>
              <span class="info-value">${escapeHtml(p.familyRelation || '—')}</span>
            </div>
            ${p.familyAddress ? `
              <div class="info-row">
                <span class="info-label">住址</span>
                <span class="info-value">${escapeHtml(p.familyAddress)}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        ${p.remark ? `
          <div class="info-row" style="margin-top:8px;">
            <span class="info-label">备注</span>
            <span class="info-value">${escapeHtml(p.remark)}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="card-actions">
        <button class="action-btn edit-btn" onclick="editPerson('${p.id}')">✏️ 编辑</button>
        <button class="action-btn delete-btn" onclick="deletePerson('${p.id}')">🗑️ 删除</button>
      </div>
    </div>
  `).join('');
}

// ========== 弹窗 ==========
function showModal(person = null) {
  editingId = person ? person.id : null;
  photoUrl = person ? person.photoUrl || '' : '';
  
  document.getElementById('modal-title').textContent = person ? '✏️ 编辑人员' : '➕ 新增人员';
  document.getElementById('form-name').value = person ? person.name : '';
  document.getElementById('form-gender').value = person ? person.gender : '男';
  document.getElementById('form-age').value = person ? person.age || '' : '';
  document.getElementById('form-idcard').value = person ? person.idCard || '' : '';
  document.getElementById('form-foundtime').value = person ? person.foundTime || '' : '';
  document.getElementById('form-foundlocation').value = person ? person.foundLocation || '' : '';
  document.getElementById('form-status').value = person ? person.status : '待核实';
  document.getElementById('form-station').value = person ? person.station : STATIONS[0];
  document.getElementById('form-familyname').value = person ? person.familyName || '' : '';
  document.getElementById('form-familyphone').value = person ? person.familyPhone || '' : '';
  document.getElementById('form-familyrelation').value = person ? person.familyRelation || '' : '';
  document.getElementById('form-familyaddress').value = person ? person.familyAddress || '' : '';
  document.getElementById('form-remark').value = person ? person.remark || '' : '';
  
  // 照片
  if (photoUrl) {
    document.getElementById('photo-preview').style.display = 'block';
    document.getElementById('photo-img').src = photoUrl;
    document.getElementById('photo-upload-btn').style.display = 'none';
  } else {
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('photo-upload-btn').style.display = 'flex';
  }
  
  document.getElementById('modal-overlay').style.display = 'flex';
}

function hideModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  editingId = null;
  photoUrl = '';
}

async function editPerson(id) {
  const person = persons.find(p => p.id == id);
  if (!person) return;

  // 图片按需加载，列表接口不携带大 Base64 图片。
  showModal(person);
  try {
    const res = await fetch(`${API_BASE}/persons/${encodeURIComponent(id)}/photo`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      cache: 'no-store'
    });
    const data = await res.json();
    if (data.success && data.photoUrl) {
      photoUrl = data.photoUrl;
      document.getElementById('photo-preview').style.display = 'block';
      document.getElementById('photo-img').src = photoUrl;
      document.getElementById('photo-upload-btn').style.display = 'none';
    }
  } catch (err) {
    console.warn('Photo load failed:', err);
  }
}

async function savePerson() {
  const name = document.getElementById('form-name').value.trim();
  if (!name) {
    showToast('请输入姓名');
    return;
  }
  
  const data = {
    name,
    gender: document.getElementById('form-gender').value,
    age: parseInt(document.getElementById('form-age').value) || 0,
    idCard: document.getElementById('form-idcard').value.trim(),
    foundTime: document.getElementById('form-foundtime').value,
    foundLocation: document.getElementById('form-foundlocation').value.trim(),
    status: document.getElementById('form-status').value,
    station: document.getElementById('form-station').value,
    familyName: document.getElementById('form-familyname').value.trim(),
    familyPhone: document.getElementById('form-familyphone').value.trim(),
    familyRelation: document.getElementById('form-familyrelation').value.trim(),
    familyAddress: document.getElementById('form-familyaddress').value.trim(),
    photoUrl,
    remark: document.getElementById('form-remark').value.trim()
  };
  
  try {
    const url = editingId ? `${API_BASE}/persons/${editingId}` : `${API_BASE}/persons`;
    const method = editingId ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (result.success) {
      const savedId = editingId;
      hideModal();
      // 先把当前保存结果写回前端，图片无需等待列表接口返回正文。
      if (savedId) {
        const current = persons.find(p => String(p.id) === String(savedId));
        if (current) { current.photoUrl = photoUrl || null; current.hasPhoto = Boolean(photoUrl); }
      }
      filterPersons();
      loadPersons();
      showToast(savedId ? '更新成功' : '保存成功');
    } else {
      showToast(result.error || '操作失败');
    }
  } catch (err) {
    showToast('网络错误');
  }
}

async function deletePerson(id) {
  const person = persons.find(p => p.id == id);
  if (!confirm(`确定删除「${person ? person.name : ''}」的信息吗？`)) return;
  
  try {
    const res = await fetch(`${API_BASE}/persons/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    
    if (data.success) {
      loadPersons();
      showToast('已删除');
    } else {
      showToast('删除失败');
    }
  } catch (err) {
    showToast('网络错误');
  }
}

// ========== 导入辅助函数 ==========
function resetImportUI() {
  parsedItems = [];
  document.getElementById('import-textarea').value = '';
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('file-name-display').style.display = 'none';
  document.getElementById('import-file-input').value = '';
}

function parseExcelRows(rows, type) {
  const items = [];
  // 跳过表头（第一行）
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].map(c => String(c || '').trim());
    if (!cols[0] && !cols[2]) continue; // 跳过空行

    if (type === 'person') {
      items.push({
        name: cols[0] || '',
        gender: cols[1] || '男',
        age: parseInt(cols[2]) || 0,
        idCard: cols[3] || '',
        foundTime: cols[4] || new Date().toISOString().split('T')[0],
        foundLocation: cols[5] || '',
        status: cols[6] || '待核实',
        station: cols[7] || STATIONS[0],
        familyName: cols[8] || '',
        familyPhone: cols[9] || '',
        familyRelation: cols[10] || '',
        familyAddress: cols[11] || '',
        remark: cols[12] || ''
      });
    } else if (type === 'abnormal') {
      items.push({
        station: cols[0] || '',
        occurTime: cols[1] || '',
        name: cols[2] || '',
        gender: cols[3] || '',
        abnormalBehavior: cols[4] || '',
        phone: cols[5] || '',
        citizenCard: cols[6] || '',
        commonExit: cols[7] || '',
        hasFamily: cols[8] || '',
        helpType: cols[9] || '',
        photoUrl: cols[10] || '',
        incidentDesc: cols[11] || ''
      });
    }
  }
  return items;
}

function showPreview(items, type) {
  const preview = document.getElementById('import-preview');
  const table = document.getElementById('preview-table');
  
  let headers, keys;
  if (type === 'person') {
    headers = ['姓名', '性别', '年龄', '站点'];
    keys = ['name', 'gender', 'age', 'station'];
  } else {
    headers = ['车站', '姓名', '性别', '异常行为'];
    keys = ['station', 'name', 'gender', 'abnormalBehavior'];
  }

  let html = '<thead><tr>';
  headers.forEach(h => html += `<th style="padding:6px;background:#1e293b;color:#94a3b8;border-bottom:1px solid #334155;">${h}</th>`);
  html += '</tr></thead><tbody>';

  items.slice(0, 10).forEach(item => {
    html += '<tr>';
    keys.forEach(k => html += `<td style="padding:6px;color:#e2e8f0;border-bottom:1px solid #1e293b;">${item[k] || '-'}</td>`);
    html += '</tr>';
  });

  if (items.length > 10) {
    html += `<tr><td colspan="${headers.length}" style="padding:6px;color:#64748b;text-align:center;">...还有 ${items.length - 10} 条</td></tr>`;
  }

  html += '</tbody>';
  table.innerHTML = html;
  preview.style.display = 'block';
}

// ========== 导入 ==========
async function doImport() {
  let items = parsedItems;

  // 如果没有解析文件，尝试从文本框解析
  if (items.length === 0) {
    const text = document.getElementById('import-textarea').value.trim();
    if (!text) {
      showToast('请上传文件或粘贴内容');
      return;
    }

    const lines = text.split(/\n|\r\n/).filter(l => l.trim());
    items = [];

    for (const line of lines) {
      // 智能分隔：优先制表符，其次逗号，最后多空格
      let cols;
      if (line.includes('\t')) {
        cols = line.split('\t').map(c => c.trim());
      } else if (line.includes(',')) {
        cols = line.split(',').map(c => c.trim());
      } else {
        cols = line.split(/\s{2,}/).map(c => c.trim());
      }
      // 不过滤空值，保持列位置对应
      if (cols.length >= 2 && cols[0]) {
        if (importType === 'person') {
          items.push({
            name: cols[0] || '',
            gender: cols[1] || '男',
            age: parseInt(cols[2]) || 0,
            idCard: cols[3] || '',
            foundTime: cols[4] || new Date().toISOString().split('T')[0],
            foundLocation: cols[5] || '',
            status: cols[6] || '待核实',
            station: cols[7] || STATIONS[0],
            familyName: cols[8] || '',
            familyPhone: cols[9] || '',
            familyRelation: cols[10] || '',
            familyAddress: cols[11] || '',
            remark: cols[12] || ''
          });
        } else if (importType === 'abnormal') {
          items.push({
            station: cols[0] || '',
            occurTime: cols[1] || '',
            name: cols[2] || '',
            gender: cols[3] || '',
            abnormalBehavior: cols[4] || '',
            phone: cols[5] || '',
            citizenCard: cols[6] || '',
            commonExit: cols[7] || '',
            hasFamily: cols[8] || '',
            helpType: cols[9] || '',
            photoUrl: cols[10] || '',
            incidentDesc: cols[11] || ''
          });
        }
      }
    }
  }

  if (items.length === 0) {
    showToast('未识别到有效数据');
    return;
  }

  // 确认导入
  if (!confirm(`确认导入 ${items.length} 条${importType === 'person' ? '走失人员' : '异常乘客'}记录？`)) {
    return;
  }

  try {
    const endpoint = importType === 'person' ? '/persons/batch' : '/abnormal/batch';
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ items })
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error('导入失败:', res.status, text);
      if (res.status === 504 || res.status === 502) {
        showToast('服务器超时，请稍后重试或减少导入数量');
        return;
      }
      showToast(`导入失败: ${res.status} ${text}`);
      return;
    }
    
    const data = await res.json();

    if (data.success) {
      document.getElementById('import-modal').style.display = 'none';
      resetImportUI();
      if (importType === 'person') {
        loadPersons();
      }
      showToast(`成功导入 ${data.count} 条记录`);
    } else {
      showToast('导入失败: ' + (data.error || '未知错误'));
    }
  } catch (err) {
    showToast('网络错误: ' + err.message);
  }
}

// ========== 照片 ==========
function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 4 * 1024 * 1024) {
    showToast('图片太大，请选择小于4MB');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      // 不依赖第三方对象存储：压缩后直接保存 Base64，列表接口仍然排除图片。
      const compressed = await compressImage(e.target.result);
      if (compressed.length > 4 * 1024 * 1024) throw new Error('压缩后图片仍过大，请选择更小的图片');
      photoUrl = compressed;
      document.getElementById('photo-preview').style.display = 'block';
      document.getElementById('photo-img').src = photoUrl;
      document.getElementById('photo-upload-btn').style.display = 'none';
      showToast('图片已压缩');
    } catch (err) { showToast(err.message || '图片上传失败'); }
  };
  reader.readAsDataURL(file);
}

async function compressImage(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
  const max = 1280, scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function removePhoto() {
  photoUrl = '';
  document.getElementById('photo-preview').style.display = 'none';
  document.getElementById('photo-upload-btn').style.display = 'flex';
  document.getElementById('photo-input').value = '';
}

// ========== 工具函数 ==========
function getStatusClass(status) {
  const map = {
    '待核实': 'pending',
    '处理中': 'processing',
    '已找到家属': 'found',
    '已移交': 'transferred'
  };
  return map[status] || 'pending';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function previewImage(url) {
  if (url) window.open(url, '_blank');
}

function callPhone(phone) {
  if (phone) window.location.href = `tel:${phone}`;
}

function showAgreement(title, content) {
  document.getElementById('agreement-title').textContent = title;
  document.getElementById('agreement-content').innerHTML = content;
  document.getElementById('agreement-modal').style.display = 'flex';
}

function getUserAgreement() {
  return `<p style="line-height:1.6;color:#94a3b8;">
    <strong>1. 服务说明</strong><br>
    本系统为地铁走失人员信息管理平台，提供走失人员信息发布、查询、管理等服务。<br><br>
    <strong>2. 账号安全</strong><br>
    用户应妥善保管账号信息，对账号下的所有行为负责。<br><br>
    <strong>3. 信息真实性</strong><br>
    用户发布的信息应真实有效，不得发布虚假信息。<br><br>
    <strong>4. 隐私保护</strong><br>
    我们承诺严格保护用户个人信息，不会向第三方泄露。<br><br>
    <strong>5. 违规处理</strong><br>
    如有违规行为，平台有权暂停或终止服务。
  </p>`;
}

function getPrivacyPolicy() {
  return `<p style="line-height:1.6;color:#94a3b8;">
    <strong>1. 信息收集</strong><br>
    我们收集的信息包括：用户名、手机号、走失人员信息等。<br><br>
    <strong>2. 信息使用</strong><br>
    收集的信息仅用于：身份验证、走失人员管理、紧急联系等。<br><br>
    <strong>3. 信息保护</strong><br>
    我们采用加密技术保护数据安全，防止未经授权的访问。<br><br>
    <strong>4. 信息共享</strong><br>
    未经用户同意，我们不会将个人信息分享给第三方。<br><br>
    <strong>5. 联系</strong><br>
    如有疑问，请联系客服。
  </p>`;
}
