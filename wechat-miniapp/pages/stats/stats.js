// 走失人员统计 v8 - 云托管版
const app = getApp()

function callContainer(path, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    const { env, service } = app.globalData.cloudConfig
    const token = wx.getStorageSync('token')
    const config = {
      config: { env },
      path,
      method,
      timeout: 15000,
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
    wx.cloud.callContainer(config)
  })
}

Page({
  data: {
    stationStats: [],
    typeStats: [],
    statusStats: [],
    trendStats: [],
    summary: { totalPersons: 0, pending: 0, found: 0, totalRecords: 0 }
  },

  onLoad() { this.loadStats() },
  onShow() { this.loadStats() },

  loadStats() {
    wx.showLoading({ title: '加载中' })
    callContainer('/stats', 'GET').then(res => {
      wx.hideLoading()
      if (res && res.success) {
        const d = res.data
        const maxStation = Math.max(...d.stationStats.map(s => s.value), 1)
        const maxStatus = Math.max(...d.statusStats.map(s => s.value), 1)
        const maxTrend = Math.max(...d.trendStats.map(s => s.value), 1)
        const colors = ['blue', 'green', 'orange', 'cyan']
        this.setData({
          summary: d.summary,
          stationStats: d.stationStats.map((s, i) => ({...s, percent: (s.value / maxStation) * 100, color: colors[i % colors.length]})),
          typeStats: d.typeStats.map((s, i) => ({...s, color: ['#60a5fa', '#34d399', '#fbbf24', '#22d3ee', '#a78bfa'][i % 5]})),
          statusStats: d.statusStats.map((s, i) => ({...s, percent: (s.value / maxStatus) * 100, color: colors[i % colors.length]})),
          trendStats: d.trendStats.map(s => ({...s, percent: (s.value / maxTrend) * 100}))
        })
        this.drawPie(d.typeStats)
      }
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  drawPie(data) {
    const query = wx.createSelectorQuery()
    query.select('#typePie').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = wx.getSystemInfoSync().pixelRatio
      canvas.width = res[0].width * dpr
      canvas.height = res[0].height * dpr
      ctx.scale(dpr, dpr)

      const total = data.reduce((sum, item) => sum + item.value, 0)
      if (total === 0) return
      
      const centerX = res[0].width / 2
      const centerY = res[0].height / 2
      const radius = Math.min(centerX, centerY) - 10
      const colors = ['#60a5fa', '#34d399', '#fbbf24', '#22d3ee', '#a78bfa']

      let startAngle = -Math.PI / 2
      data.forEach((item, i) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle)
        ctx.closePath()
        ctx.fillStyle = colors[i % colors.length]
        ctx.fill()
        startAngle += sliceAngle
      })
    })
  }
})