const authService = require('../../services/auth.js');

Page({
  data: {
    loading: false,
    agreed: false,
    showAgreementModal: false,
    modalTitle: '',
    modalContent: ''
  },

  onLoad() {
    // 检查是否已登录
    this.checkLoginStatus();
  },

  // 检查登录状态
  async checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (token) {
      try {
        // 验证 token 有效性
        const res = await authService.verifyToken();
        if (res.valid) {
          // 已登录，跳转到首页
          this.redirectByRole(res.role);
        }
      } catch (err) {
        // token 无效，清除存储
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
      }
    }
  },

  // 协议勾选变化
  onAgreementChange(e) {
    const values = e.detail.value;
    this.setData({
      agreed: values.includes('agree')
    });
  },

  // 获取手机号并登录（手机号权限可选，无权限时降级为普通登录）
  async onGetPhoneNumber(e) {
    console.log('getPhoneNumber detail:', e.detail);
    
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先同意用户协议和隐私政策',
        icon: 'none'
      });
      return;
    }

    const { code, errMsg } = e.detail;
    let phoneCode = null;
    
    if (code && !errMsg.includes('fail')) {
      phoneCode = code;
      console.log('手机号授权成功');
    } else {
      console.log('手机号未授权，降级为普通登录:', errMsg);
    }

    this.setData({ loading: true });

    try {
      // 调用后端登录（phoneCode 可选）
      const result = await authService.wxLogin(phoneCode);

      // 3. 保存登录信息
      wx.setStorageSync('token', result.token);
      wx.setStorageSync('userInfo', result.userInfo);

      // 4. 根据用户状态跳转
      if (result.isNewUser) {
        // 新用户，去角色选择页
        wx.navigateTo({
          url: '/pages/login/select-role'
        });
      } else {
        // 已注册用户，按角色跳转
        this.redirectByRole(result.userInfo.role);
      }

    } catch (err) {
      console.error('登录失败:', err);
      wx.showToast({
        title: err.message || err.error || '登录失败',
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 根据角色跳转
  redirectByRole(role) {
    const routes = {
      'admin': '/pages/admin/dashboard',
      'staff': '/pages/staff/dashboard', 
      'family': '/pages/family/dashboard'
    };
    
    const url = routes[role] || '/pages/index/index';
    wx.switchTab({ url });
  },

  // 查看用户协议
  onViewUserAgreement() {
    this.setData({
      showAgreementModal: true,
      modalTitle: '用户协议',
      modalContent: `地铁走失管理系统用户协议

1. 服务说明
本系统为地铁走失人员信息管理平台，提供走失人员信息发布、查询、管理等服务。

2. 账号安全
用户应妥善保管账号信息，对账号下的所有行为负责。

3. 信息真实性
用户发布的信息应真实有效，不得发布虚假信息。

4. 隐私保护
我们承诺严格保护用户个人信息，不会向第三方泄露。

5. 违规处理
如有违规行为，平台有权暂停或终止服务。`
    });
  },

  // 查看隐私政策
  onViewPrivacyPolicy() {
    this.setData({
      showAgreementModal: true,
      modalTitle: '隐私政策',
      modalContent: `地铁走失管理系统隐私政策

1. 信息收集
我们收集的信息包括：微信昵称、头像、手机号、身份信息等。

2. 信息使用
收集的信息仅用于：身份验证、走失人员管理、紧急联系等。

3. 信息保护
我们采用加密技术保护数据安全，防止未经授权的访问。

4. 信息共享
未经用户同意，我们不会将个人信息分享给第三方。

5. 联系
如有疑问，请联系客服。`
    });
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showAgreementModal: false
    });
  },

  // 阻止冒泡
  preventBubble() {
    // 什么都不做，阻止事件冒泡
  }
});
