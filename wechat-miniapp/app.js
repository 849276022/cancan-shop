// 走失人员管理系统 v8 - 全部走 wx.cloud.callContainer

const CLOUD_CONFIG = {
  env: 'prod-d0gynfk1p9814dcc9',  // 云托管环境ID
  service: 'express-uj20'           // 云托管服务名
}

App({
  globalData: {
    cloudConfig: CLOUD_CONFIG,
    userInfo: null,
    isLoggedIn: false
  },
  
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.23.0 及以上版本基础库')
      return
    }
    wx.cloud.init({ env: CLOUD_CONFIG.env })
    console.log('Cloud init OK, env:', CLOUD_CONFIG.env, 'service:', CLOUD_CONFIG.service)
    
    // 检查登录状态（不强制跳转，让页面自己处理）
    this.checkLoginStatus()
  },
  
  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (token) {
      this.globalData.isLoggedIn = true
      this.globalData.userInfo = userInfo
    }
  },
  
  // 跳转到登录页（供页面调用）
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/welcome' })
  },
  
  // 退出登录
  logout() {
    wx.removeStorageSync('token')
    wx.removeStorageSync('refreshToken')
    wx.removeStorageSync('userInfo')
    this.globalData.isLoggedIn = false
    this.globalData.userInfo = null
    wx.reLaunch({ url: '/pages/index/index' })
  }
})