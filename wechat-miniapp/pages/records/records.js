// 走失人员处理记录 v8 - 云托管版
const app = getApp()

function callContainer(path, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    const { env, service } = app.globalData.cloudConfig
    const token = wx.getStorageSync('token')
    const config = {
      config: { env },
      path,
      method,
      header: {
        'X-WX-SERVICE': service,
        'content-type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success(res) {
        if (res.data && res.data.success !== false) {
          resolve(res.data)
        } else {
          reject(res.data || { error: '请求失败' })
        }
      },
      fail(err) {
        console.error('callContainer fail:', err)
        reject({ error: err.errMsg || '网络错误' })
      }
    }
    if (method === 'DELETE' && data && Object.keys(data).length > 0) {
      config.data = data
    } else if (method !== 'GET' && method !== 'DELETE') {
      config.data = data
    }
    wx.cloud.callContainer(config)
  })
}

const STATIONS = [
  '西津','安吉客运站','苏卢','三十三中','秀厢',
  '南宁剧场','福建园','亭洪路','石柱岭','江南客运站',
  '大沙田','建设路','石子塘','金象','玉洞',
  '东风路','玉岭路','那福路','坛泽'
]

Page({
  data: {
    records: [],
    filteredRecords: [],
    searchText: '',
    typeIndex: 0,
    typeOptions: ['全部操作', '发现', '登记', '联系家属', '移交派出所', '核实身份'],
    showModal: false,
    form: { date: '', time: '', personName: '', type: '', typeIndex: 0, station: '', stationIndex: 0, handler: '', result: '', remark: '' }
  },

  onLoad() { this.loadData() },
  onShow() { this.loadData() },

  loadData() {
    wx.showLoading({ title: '加载中' })
    callContainer('/records', 'GET').then(res => {
      wx.hideLoading()
      if (res && res.success) {
        const records = res.data.map(r => ({...r, typeClass: this.getTypeClass(r.type)}))
        this.setData({ records })
        this.filterRecords()
      } else {
        wx.showToast({ title: '数据错误', icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: '网络错误', icon: 'none', duration: 2000 })
    })
  },

  getTypeClass(type) {
    const map = { '发现': 'found', '移交派出所': 'transferred', '登记': 'processing', '联系家属': 'processing', '核实身份': 'processing' }
    return map[type] || 'processing'
  },

  filterRecords() {
    const { records, searchText, typeIndex, typeOptions } = this.data
    const filterType = typeIndex > 0 ? typeOptions[typeIndex] : ''
    const filtered = records.filter(r => {
      const matchText = !searchText || (r.personName && r.personName.includes(searchText)) || (r.type && r.type.includes(searchText)) || (r.station && r.station.includes(searchText))
      const matchType = !filterType || r.type === filterType
      return matchText && matchType
    })
    this.setData({ filteredRecords: filtered })
  },

  onSearch(e) { this.setData({ searchText: e.detail.value }); this.filterRecords() },
  onTypeChange(e) { this.setData({ typeIndex: parseInt(e.detail.value) }); this.filterRecords() },

  showModal() {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    const timeStr = `${String(today.getHours()).padStart(2,'0')}:${String(today.getMinutes()).padStart(2,'0')}`
    this.setData({
      showModal: true,
      form: { date: dateStr, time: timeStr, personName: '', type: '', typeIndex: 0, station: '', stationIndex: 0, handler: '', result: '', remark: '' }
    })
  },
  hideModal() { this.setData({ showModal: false }) },
  stopPrototypeOf() {},

  inputDate(e) { this.setData({ 'form.date': e.detail.value }) },
  inputTime(e) { this.setData({ 'form.time': e.detail.value }) },
  inputPersonName(e) { this.setData({ 'form.personName': e.detail.value }) },
  inputType(e) { const types = ['发现', '登记', '联系家属', '移交派出所', '核实身份']; this.setData({ 'form.type': types[e.detail.value], 'form.typeIndex': e.detail.value }) },
  inputStation(e) { this.setData({ 'form.station': STATIONS[e.detail.value], 'form.stationIndex': e.detail.value }) },
  inputHandler(e) { this.setData({ 'form.handler': e.detail.value }) },
  inputResult(e) { this.setData({ 'form.result': e.detail.value }) },
  inputRemark(e) { this.setData({ 'form.remark': e.detail.value }) },

  saveRecord() {
    const { form } = this.data
    if (!form.personName) { wx.showToast({ title: '请输入人员姓名', icon: 'none' }); return }
    
    callContainer('/records', 'POST', {
      date: form.date, time: form.time, personName: form.personName,
      type: form.type || '发现', station: form.station || STATIONS[0],
      handler: form.handler || '当前用户', result: form.result, remark: form.remark
    }).then(res => {
      if (res && res.success) {
        this.hideModal()
        this.loadData()
        wx.showToast({ title: '保存成功', icon: 'success' })
      } else {
        wx.showToast({ title: (res && res.error) || '保存失败', icon: 'none' })
      }
    }).catch(() => { wx.showToast({ title: '网络错误', icon: 'none' }) })
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条记录吗？',
      confirmColor: '#f87171',
      success: (res) => {
        if (res.confirm) {
          callContainer(`/records/${id}`, 'DELETE').then(res => {
            if (res && res.success) {
              wx.showToast({ title: '已删除', icon: 'success' })
              this.loadData()
            } else {
              wx.showToast({ title: '删除失败', icon: 'none' })
            }
          }).catch(() => { wx.showToast({ title: '网络错误', icon: 'none' }) })
        }
      }
    })
  }
})