const authService = require('../../services/auth.js');

Page({
  data: {
    selectedRole: '',
    loading: false
  },

  // 选择角色
  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({
      selectedRole: role
    });
  },

  // 确认角色
  async confirmRole() {
    const { selectedRole } = this.data;
    if (!selectedRole) return;

    this.setData({ loading: true });

    try {
      // 保存角色选择
      await authService.selectRole(selectedRole);

      // 根据角色跳转
      if (selectedRole === 'admin') {
        // 管理员需要二次验证
        wx.navigateTo({
          url: '/pages/login/admin-verify'
        });
      } else {
        // 其他角色去信息补充页
        wx.navigateTo({
          url: `/pages/login/complete-profile?role=${selectedRole}`
        });
      }
    } catch (err) {
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
