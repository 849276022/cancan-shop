// 请求封装 - 全部走 wx.cloud.callContainer，自动 token 刷新
const app = getApp()

let isRefreshing = false
let requestQueue = []

function callContainer(path, method, data, header) {
  return new Promise((resolve, reject) => {
    const { env, service } = app.globalData.cloudConfig
    const token = wx.getStorageSync('token')
    const config = {
      config: { env },
      path,
      method: method || 'GET',
      header: {
        'X-WX-SERVICE': service,
        'content-type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...(header || {})
      },
      success(res) {
        if (res.statusCode === 200) {
          if (res.data.success) {
            resolve(res.data.data)
          } else if (res.data.code === 401) {
            handleTokenExpired(path, method, data, resolve, reject)
          } else {
            reject(new Error(res.data.error || '请求失败'))
          }
        } else if (res.statusCode === 401) {
          handleUnauthorized()
          reject(new Error('登录已过期'))
        } else if (res.statusCode === 403) {
          reject(new Error('权限不足'))
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`))
        }
      },
      fail(err) { reject(new Error(err.errMsg || '网络错误')) }
    }
    if (method !== 'GET' && method !== 'DELETE') config.data = data || {}
    wx.cloud.callContainer(config)
  })
}

// 处理 token 过期
function handleTokenExpired(path, method, data, resolve, reject) {
  requestQueue.push({ path, method, data, resolve, reject })

  if (!isRefreshing) {
    isRefreshing = true
    refreshToken().then(() => {
      isRefreshing = false
      retryRequests()
    }).catch(() => {
      isRefreshing = false
      requestQueue = []
      handleUnauthorized()
    })
  }
}

// 刷新 token
function refreshToken() {
  return new Promise((resolve, reject) => {
    const rt = wx.getStorageSync('refreshToken')
    if (!rt) { reject(new Error('无刷新令牌')); return }

    const { env, service } = app.globalData.cloudConfig
    wx.cloud.callContainer({
      config: { env },
      path: '/auth/refresh',
      method: 'POST',
      data: { refreshToken: rt },
      header: { 'X-WX-SERVICE': service, 'content-type': 'application/json' },
      success(res) {
        if (res.data && res.data.success) {
          wx.setStorageSync('token', res.data.data.token)
          resolve()
        } else {
          reject(new Error('刷新失败'))
        }
      },
      fail: reject
    })
  })
}

// 处理未授权
function handleUnauthorized() {
  wx.removeStorageSync('token')
  wx.removeStorageSync('refreshToken')
  wx.showToast({ title: '请重新登录', icon: 'none' })
  setTimeout(() => {
    wx.reLaunch({ url: '/pages/login/welcome' })
  }, 1500)
}

// 重试队列
function retryRequests() {
  const queue = [...requestQueue]
  requestQueue = []
  queue.forEach(item => {
    callContainer(item.path, item.method, item.data).then(item.resolve).catch(item.reject)
  })
}

// HTTP 方法
const http = {
  get(url, params = {}) { return callContainer(url, 'GET', params) },
  post(url, data = {}) { return callContainer(url, 'POST', data) },
  put(url, data = {}) { return callContainer(url, 'PUT', data) },
  delete(url, data = {}) { return callContainer(url, 'DELETE', data) }
}

module.exports = http
