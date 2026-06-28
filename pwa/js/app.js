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
  
  // 搜索
  document.getElementById('search-input').addEventListener('input', filterPersons);
  document.getElementById('filter-status').addEventListener('change', filterPersons);
  document.getElementById('filter-station').addEventListener('change', filterPersons);
  
  // 新增
  document.getElementById('add-btn').addEventListener('click', () => showModal());
  
  // 导入
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'flex';
  });
  document.getElementById('import-close').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'none';
  });
  document.getElementById('import-cancel').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'none';
  });
  document.getElementById('import-confirm').addEventListener('click', doImport);
  
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
    const res = await fetch(`${API_BASE}/persons`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    
    if (data.success) {
      persons = data.data;
      updateStats();
      filterPersons();
    } else {
      showToast('加载失败');
    }
  } catch (err) {
    showToast('网络错误');
  }
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
      
      ${p.photoUrl ? `<div class="card-photo"><img src="${p.photoUrl}" class="photo-img" onclick="previewImage('${p.photoUrl}')"></div>` : ''}
      
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

function editPerson(id) {
  const person = persons.find(p => p.id === id);
  if (person) showModal(person);
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
      hideModal();
      loadPersons();
      showToast(editingId ? '更新成功' : '保存成功');
    } else {
      showToast(result.error || '操作失败');
    }
  } catch (err) {
    showToast('网络错误');
  }
}

async function deletePerson(id) {
  const person = persons.find(p => p.id === id);
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

// ========== 导入 ==========
async function doImport() {
  const text = document.getElementById('import-textarea').value.trim();
  if (!text) {
    showToast('请粘贴内容');
    return;
  }
  
  const lines = text.split(/\n|\r\n/).filter(l => l.trim());
  const items = [];
  
  for (const line of lines) {
    const cols = line.split(/\t|,/).map(c => c.trim());
    if (cols.length >= 2 && cols[0]) {
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
    }
  }
  
  if (items.length === 0) {
    showToast('未识别到有效数据');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/persons/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ items })
    });
    const data = await res.json();
    
    if (data.success) {
      document.getElementById('import-modal').style.display = 'none';
      document.getElementById('import-textarea').value = '';
      loadPersons();
      showToast(`成功导入 ${data.count} 人`);
    } else {
      showToast('导入失败');
    }
  } catch (err) {
    showToast('网络错误');
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
  reader.onload = (e) => {
    photoUrl = e.target.result;
    document.getElementById('photo-preview').style.display = 'block';
    document.getElementById('photo-img').src = photoUrl;
    document.getElementById('photo-upload-btn').style.display = 'none';
  };
  reader.readAsDataURL(file);
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
