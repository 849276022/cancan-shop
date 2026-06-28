// 认证服务 - 全部走 wx.cloud.callContainer
const app = getApp()

function callContainer(path, method, data) {
  return new Promise((resolve, reject) => {
    const { env, service } = app.globalData.cloudConfig
    const config = {
      config: { env },
      path,
      method: method || 'GET',
      header: { 'X-WX-SERVICE': service, 'content-type': 'application/json' },
      success(res) {
        if (res.data && res.data.success !== false) resolve(res.data)
        else reject(res.data || { error: '请求失败' })
      },
      fail(err) { reject({ error: err.errMsg || '网络错误' }) }
    }
    if (method !== 'GET' && method !== 'DELETE') config.data = data || {}
    console.log('callContainer:', path, method, config)
    wx.cloud.callContainer(config)
  })
}

// 微信登录（phoneCode 可选，来自 getPhoneNumber）
function wxLogin(phoneCode) {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (loginRes) => {
        console.log('wx.login code:', loginRes.code)
        callContainer('/auth/wx-login', 'POST', { wxCode: loginRes.code, phoneCode: phoneCode || '' })
          .then(res => {
            console.log('wx-login response:', res)
            if (res.success) {
              wx.setStorageSync('token', res.data.token)
              wx.setStorageSync('refreshToken', res.data.refreshToken)
              wx.setStorageSync('userInfo', res.data.userInfo)
              resolve(res.data)
            } else {
              reject(new Error(res.error || '登录失败'))
            }
          })
          .catch(err => {
            console.error('wx-login error:', err)
            reject(new Error(err.error || err.message || '网络请求失败'))
          })
      },
      fail: (err) => {
        console.error('wx.login fail:', err)
        reject(new Error('微信登录失败'))
      }
    })
  })
}

// 选择角色
function selectRole(role) {
  return callContainer('/auth/select-role', 'POST', { role })
}

// 完善资料
function completeProfile(data) {
  return callContainer('/auth/complete-profile', 'POST', data)
}

// 管理员验证
function adminVerify(data) {
  return callContainer('/auth/admin-verify', 'POST', data)
}

// 验证 token（带 5 秒超时）
function verifyToken() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('验证超时')), 5000)
    callContainer('/auth/verify', 'GET')
      .then(res => {
        clearTimeout(timer)
        if (res.success) resolve(res.data)
        else reject(new Error(res.error))
      })
      .catch(err => {
        clearTimeout(timer)
        reject(new Error(err.error || '网络请求失败'))
      })
  })
}

// 退出登录
function logout() {
  return callContainer('/auth/logout', 'POST')
}

module.exports = {
  wxLogin,
  selectRole,
  completeProfile,
  adminVerify,
  verifyToken,
  logout
}
