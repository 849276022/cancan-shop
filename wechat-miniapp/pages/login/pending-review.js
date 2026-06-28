const authService = require('../../services/auth.js');

Page({
  data: {
    checking: false
  },

  onLoad() {
    // 检查审核状态
    this.checkReviewStatus();
  },

  // 检查审核状态
  async checkReviewStatus() {
    this.setData({ checking: true });

    try {
      const result = await authService.verifyToken();
      
      if (result.status === 'active') {
        // 审核通过
        wx.showToast({
          title: '审核通过！',
          icon: 'success'
        });
        
        setTimeout(() => {
          this.redirectByRole(result.role);
        }, 1500);
      }
    } catch (err) {
      console.log('审核状态检查:', err);
    } finally {
      this.setData({ checking: false });
    }
  },

  // 手动刷新状态
  checkStatus() {
    if (this.data.checking) return;
    this.checkReviewStatus();
  },

  // 先去首页浏览
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 根据角色跳转
  redirectByRole(role) {
    const routes = {
      'admin': '/pages/admin/dashboard',
      'staff': '/pages/staff/dashboard',
      'family': '/pages/family/dashboard'
    };
    
    const url = routes[role] || '/pages/index/index';
    wx.reLaunch({ url });
  }
});
