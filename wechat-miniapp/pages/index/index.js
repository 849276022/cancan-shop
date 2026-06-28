// 走失人员管理系统 v8 - 全部走 wx.cloud.callContainer
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
        if (res.data && res.data.success !== false) resolve(res.data)
        else reject(res.data || { error: '请求失败' })
      },
      fail(err) { console.error('callContainer fail:', err); reject({ error: err.errMsg || '网络错误' }) }
    }
    if (method !== 'GET' && method !== 'DELETE') config.data = data
    wx.cloud.callContainer(config)
  })
}

const STATIONS = ['西津','安吉客运站','苏卢','三十三中','秀厢','南宁剧场','福建园','亭洪路','石柱岭','江南客运站','大沙田','建设路','石子塘','金象','玉洞','东风路','玉岭路','那福路','坛泽']

Page({
  data: {
    persons: [], filteredPersons: [], searchText: '', statusIndex: 0, stationIndex: 0,
    statusOptions: ['全部状态','待核实','已找到家属','处理中','已移交'],
    stationOptions: ['全部站点', ...STATIONS],
    showModal: false, showImportModal: false, isEditing: false, editId: null,
    importText: '', uploading: false,
    form: { name:'',gender:'男',genderIndex:0,age:'',idCard:'',foundTime:'',foundLocation:'',status:'待核实',statusIndex:0,station:STATIONS[0],stationIndex:0,familyName:'',familyPhone:'',familyRelation:'',familyAddress:'',photoUrl:'',remark:'' },
    stats: { total:0, pending:0, found:0 }
  },

  onLoad() {
    // 检查登录状态，未登录则跳转到登录页
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.reLaunch({ url: '/pages/login/welcome' })
      return
    }
    this.loadData()
  },
  onShow() {
    // 每次显示时也检查登录状态（可能从登录页返回）
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.reLaunch({ url: '/pages/login/welcome' })
      return
    }
    this.loadData()
  },
  onPullDownRefresh() { this.loadData(() => { wx.stopPullDownRefresh() }) },

  loadData(cb) {
    wx.showLoading({ title: '加载中' })
    callContainer('/persons', 'GET').then(res => {
      wx.hideLoading()
      if (res && res.success) {
        const persons = res.data.map(p => ({...p, statusClass: this.getStatusClass(p.status)}))
        this.setData({ persons }); this.filterPersons(); this.updateStats()
      } else { wx.showToast({ title:'数据错误', icon:'none', duration:2000 }) }
      cb && cb()
    }).catch(() => { wx.hideLoading(); wx.showToast({ title:'网络错误', icon:'none' }); cb && cb() })
  },

  getStatusClass(s) { return {'待核实':'status-pending','处理中':'status-processing','已找到家属':'status-found','已移交':'status-transferred'}[s] || 'status-pending' },

  filterPersons() {
    const {persons,searchText,statusIndex,stationIndex,statusOptions,stationOptions} = this.data
    const fS = statusIndex > 0 ? statusOptions[statusIndex] : ''
    const fT = stationIndex > 0 ? stationOptions[stationIndex] : ''
    this.setData({ filteredPersons: persons.filter(p => {
      const mt = !searchText || (p.name&&p.name.includes(searchText)) || (p.idCard&&p.idCard.includes(searchText)) || (p.foundLocation&&p.foundLocation.includes(searchText))
      return mt && (!fS||p.status===fS) && (!fT||p.station===fT)
    })})
  },

  updateStats() {
    const {persons} = this.data
    this.setData({ stats: { total:persons.length, pending:persons.filter(p=>p.status==='待核实').length, found:persons.filter(p=>p.status==='已找到家属').length } })
  },

  onSearch(e) { this.setData({searchText:e.detail.value}); this.filterPersons() },
  onStatusChange(e) { this.setData({statusIndex:parseInt(e.detail.value)}); this.filterPersons() },
  onStationChange(e) { this.setData({stationIndex:parseInt(e.detail.value)}); this.filterPersons() },

  showModal() { this.setData({ showModal:true, isEditing:false, editId:null, form:{name:'',gender:'男',genderIndex:0,age:'',idCard:'',foundTime:'',foundLocation:'',status:'待核实',statusIndex:0,station:STATIONS[0],stationIndex:0,familyName:'',familyPhone:'',familyRelation:'',familyAddress:'',photoUrl:'',remark:''} }) },
  editPerson(e) {
    const id = e.currentTarget.dataset.id, p = this.data.persons.find(x=>x.id===id)
    if (!p) return
    this.setData({ showModal:true, isEditing:true, editId:id, form:{ name:p.name||'',gender:p.gender||'男',genderIndex:p.gender==='女'?1:0,age:p.age?String(p.age):'',idCard:p.idCard||'',foundTime:p.foundTime||'',foundLocation:p.foundLocation||'',status:p.status||'待核实',statusIndex:['待核实','处理中','已找到家属','已移交'].indexOf(p.status),station:p.station||'',stationIndex:Math.max(0,STATIONS.indexOf(p.station)),familyName:p.familyName||'',familyPhone:p.familyPhone||'',familyRelation:p.familyRelation||'',familyAddress:p.familyAddress||'',photoUrl:p.photoUrl||'',remark:p.remark||'' } })
  },

  // 选择图片
  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFile = res.tempFiles[0]
        const tempFilePath = tempFile.tempFilePath
        // 大小限制4MB
        if (tempFile.size > 4 * 1024 * 1024) {
          wx.showToast({ title: '图片太大，请选择小于4MB', icon: 'none', duration: 3000 })
          return
        }
        this.compressAndUpload(tempFilePath)
      },
      fail: (err) => {
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          wx.showToast({ title: '选择图片失败', icon: 'none' })
        }
      }
    })
  },

  // 压缩后上传
  compressAndUpload(filePath) {
    this.setData({ uploading: true })
    wx.showLoading({ title: '压缩中...' })
    wx.compressImage({
      src: filePath,
      quality: 60,
      success: (compressRes) => {
        console.log('压缩成功:', compressRes.tempFilePath)
        this.uploadPhoto(compressRes.tempFilePath)
      },
      fail: () => {
        console.log('压缩失败，使用原图')
        this.uploadPhoto(filePath)
      }
    })
  },

  // ========== v7.1.0: wx.cloud.uploadFile 直传云托管对象存储 ==========
  uploadPhoto(filePath) {
    wx.showLoading({ title: '上传中...' })
    // 生成云存储路径：lost-person-photos/时间戳_随机数.jpg
    const ts = Date.now()
    const rand = Math.floor(Math.random() * 10000)
    const cloudPath = `lost-person-photos/${ts}_${rand}.jpg`

    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      config: {
        env: env  // 云托管环境ID
      },
      success: (uploadRes) => {
        console.log('uploadFile成功, fileID:', uploadRes.fileID)
        // 拿到 fileID 后，获取临时访问链接
        wx.cloud.getTempFileURL({
          fileList: [uploadRes.fileID],
          config: { env: env },
          success: (urlRes) => {
            wx.hideLoading()
            if (urlRes.fileList && urlRes.fileList.length > 0 && urlRes.fileList[0].tempFileURL) {
              const photoUrl = urlRes.fileList[0].tempFileURL
              console.log('临时访问链接:', photoUrl)
              this.setData({ 'form.photoUrl': photoUrl, uploading: false })
              wx.showToast({ title: '上传成功', icon: 'success' })
            } else {
              console.error('获取临时链接失败:', JSON.stringify(urlRes))
              // 用 fileID 作为 fallback
              this.setData({ 'form.photoUrl': uploadRes.fileID, uploading: false })
              wx.showToast({ title: '上传成功', icon: 'success' })
            }
          },
          fail: (urlErr) => {
            wx.hideLoading()
            console.error('getTempFileURL失败:', urlErr)
            // fileID 也能在云托管环境内访问，作为 fallback
            this.setData({ 'form.photoUrl': uploadRes.fileID, uploading: false })
            wx.showToast({ title: '上传成功(链接获取失败)', icon: 'none' })
          }
        })
      },
      fail: (err) => {
        wx.hideLoading()
        this.setData({ uploading: false })
        console.error('uploadFile失败:', err)
        wx.showToast({ title: '上传失败: ' + (err.errMsg || '未知错误'), icon: 'none', duration: 3000 })
      }
    })
  },

  removePhoto() { this.setData({ 'form.photoUrl': '' }) },
  previewPhoto(e) { const url = e.currentTarget.dataset.url; if(url) wx.previewImage({current:url,urls:[url]}) },
  previewPersonPhoto(e) { const url = e.currentTarget.dataset.url; if(url) wx.previewImage({current:url,urls:[url]}) },

  deletePerson(e) {
    const id = e.currentTarget.dataset.id, p = this.data.persons.find(x=>x.id===id)
    wx.showModal({ title:'确认删除', content:`确定删除「${p?p.name:''}」的信息吗？`, confirmColor:'#f87171',
      success:(res)=>{ if(res.confirm) { callContainer(`/persons/${id}`,'DELETE').then(r=>{ if(r&&r.success){wx.showToast({title:'已删除',icon:'success'});this.loadData()}else wx.showToast({title:'删除失败',icon:'none'}) }).catch(()=>wx.showToast({title:'网络错误',icon:'none'})) } }
    })
  },
  callPhone(e) { const p=e.currentTarget.dataset.phone; if(p) wx.makePhoneCall({phoneNumber:p}) },
  hideModal() { this.setData({showModal:false}) },
  stopPropagation() {},

  inputName(e) { this.setData({'form.name':e.detail.value}) },
  inputGender(e) { const g=['男','女']; this.setData({'form.gender':g[e.detail.value],'form.genderIndex':e.detail.value}) },
  inputAge(e) { this.setData({'form.age':e.detail.value}) },
  inputIdCard(e) { this.setData({'form.idCard':e.detail.value}) },
  inputFoundTime(e) { this.setData({'form.foundTime':e.detail.value}) },
  inputFoundLocation(e) { this.setData({'form.foundLocation':e.detail.value}) },
  inputStatus(e) { const s=['待核实','处理中','已找到家属','已移交']; this.setData({'form.status':s[e.detail.value],'form.statusIndex':e.detail.value}) },
  inputStation(e) { this.setData({'form.station':STATIONS[e.detail.value],'form.stationIndex':e.detail.value}) },
  inputFamilyName(e) { this.setData({'form.familyName':e.detail.value}) },
  inputFamilyPhone(e) { this.setData({'form.familyPhone':e.detail.value}) },
  inputFamilyRelation(e) { this.setData({'form.familyRelation':e.detail.value}) },
  inputFamilyAddress(e) { this.setData({'form.familyAddress':e.detail.value}) },
  inputRemark(e) { this.setData({'form.remark':e.detail.value}) },

  savePerson() {
    const {form,isEditing,editId} = this.data
    if (!form.name) { wx.showToast({title:'请输入姓名',icon:'none'}); return }
    const data = { name:form.name, gender:form.gender||'男', age:parseInt(form.age)||0,
      idCard:form.idCard, foundTime:form.foundTime, foundLocation:form.foundLocation,
      status:form.status||'待核实', station:form.station||STATIONS[0],
      familyName:form.familyName, familyPhone:form.familyPhone,
      familyRelation:form.familyRelation, familyAddress:form.familyAddress,
      photoUrl:form.photoUrl||'', remark:form.remark }
    const api = isEditing && editId ? `/persons/${editId}` : '/persons'
    const method = isEditing && editId ? 'PUT' : 'POST'
    callContainer(api, method, data).then(res => {
      if (res && res.success) { this.hideModal(); setTimeout(()=>this.loadData(),500); wx.showToast({title:isEditing?'更新成功':'保存成功',icon:'success'}) }
      else wx.showToast({title:(res&&res.error)||'操作失败',icon:'none'})
    }).catch(()=>wx.showToast({title:'网络错误',icon:'none'}))
  },

  showImport() { this.setData({showImportModal:true,importText:''}) },
  hideImport() { this.setData({showImportModal:false}) },
  inputImport(e) { this.setData({importText:e.detail.value}) },

  parseImport() {
    const text = this.data.importText.trim()
    if (!text) { wx.showToast({title:'粘贴内容不能为空',icon:'none'}); return }
    const lines = text.split(/\n|\r\n/).filter(l=>l.trim()), imported = []
    for (const line of lines) {
      const c = line.split(/\t|,/).map(x=>x.trim())
      if (c.length>=2 && c[0]) imported.push({ name:c[0]||'',gender:c[1]||'男',age:parseInt(c[2])||0,
        idCard:c[3]||'',foundTime:c[4]||new Date().toISOString().split('T')[0],
        foundLocation:c[5]||'',status:c[6]||'待核实',station:c[7]||STATIONS[0],
        familyName:c[8]||'',familyPhone:c[9]||'',familyRelation:c[10]||'',familyAddress:c[11]||'',remark:c[12]||'' })
    }
    if (!imported.length) { wx.showToast({title:'未识别到有效数据',icon:'none'}); return }
    callContainer('/persons/batch','POST',{items:imported}).then(res=>{
      if(res&&res.success){this.hideImport();this.loadData();wx.showToast({title:`成功导入${res.count}人`,icon:'success'})}
      else wx.showToast({title:'导入失败',icon:'none'})
    }).catch(()=>wx.showToast({title:'网络错误',icon:'none'}))
  }
})