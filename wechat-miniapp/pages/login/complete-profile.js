const authService = require('../../services/auth.js');

Page({
  data: {
    step: 2,
    role: '',
    roleTitle: '',
    loading: false,
    form: {
      name: '',
      relation: '',
      idCard: '',
      address: '',
      employeeId: '',
      line: '',
      station: '',
      inviteCode: '',
      password: '',
      confirmPassword: ''
    },
    relationIndex: -1,
    relations: ['父母', '配偶', '子女', '兄弟姐妹', '其他亲属', '朋友', '其他'],
    lineIndex: -1,
    lines: ['1号线', '2号线', '3号线', '4号线', '5号线', '6号线', '7号线', '8号线', '9号线', '10号线'],
    stationIndex: -1,
    stations: [],
    isValid: false
  },

  onLoad(options) {
    const role = options.role || 'family';
    const titles = {
      'family': '完善家属信息',
      'staff': '完善工作信息',
      'admin': '管理员验证'
    };
    
    this.setData({
      role: role,
      roleTitle: titles[role] || '完善信息'
    });

    // 根据线路生成站点（示例数据）
    this.generateStations();
  },

  // 生成站点数据
  generateStations() {
    // 实际项目中应该从后端获取
    const stations = [
      '南宁东站', '佛子岭站', '百花岭站', '埌东客运站', 
      '凤岭站', '东盟商务区站', '万象城站', '会展中心站',
      '金湖广场站', '南湖站', '麻村站', '民族广场站',
      '朝阳广场站', '火车站', '白苍岭站', '广西大学站',
      '鲁班路站', '动物园站', '清川站', '民族大学站'
    ];
    this.setData({ stations });
  },

  // 输入处理
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`form.${field}`]: value
    }, () => {
      this.validateForm();
    });
  },

  // 关系选择
  onRelationChange(e) {
    const index = e.detail.value;
    this.setData({
      relationIndex: index,
      'form.relation': this.data.relations[index]
    }, () => {
      this.validateForm();
    });
  },

  // 线路选择
  onLineChange(e) {
    const index = e.detail.value;
    this.setData({
      lineIndex: index,
      'form.line': this.data.lines[index]
    }, () => {
      this.validateForm();
    });
  },

  // 站点选择
  onStationChange(e) {
    const index = e.detail.value;
    this.setData({
      stationIndex: index,
      'form.station': this.data.stations[index]
    }, () => {
      this.validateForm();
    });
  },

  // 表单验证
  validateForm() {
    const { role, form } = this.data;
    let isValid = false;

    switch(role) {
      case 'family':
        isValid = form.name && form.relation && form.idCard && form.idCard.length === 18;
        break;
      case 'staff':
        isValid = form.name && form.employeeId && form.line && form.station;
        break;
      case 'admin':
        isValid = form.inviteCode && form.password && form.password.length >= 6 && 
                  form.password === form.confirmPassword;
        break;
    }

    this.setData({ isValid });
  },

  // 提交表单
  async submit() {
    if (!this.data.isValid) return;

    this.setData({ loading: true });

    try {
      const { role, form } = this.data;
      let submitData = {};

      // 根据角色构造提交数据
      switch(role) {
        case 'family':
          submitData = {
            name: form.name,
            relation: form.relation,
            idCard: form.idCard,
            address: form.address
          };
          break;
        case 'staff':
          submitData = {
            name: form.name,
            employeeId: form.employeeId,
            line: form.line,
            station: form.station
          };
          break;
        case 'admin':
          submitData = {
            inviteCode: form.inviteCode,
            password: form.password
          };
          break;
      }

      const result = await authService.completeProfile(submitData);

      if (role === 'admin') {
        // 管理员直接通过
        wx.reLaunch({
          url: '/pages/admin/dashboard'
        });
      } else {
        // 其他角色需要审核
        wx.redirectTo({
          url: '/pages/login/pending-review'
        });
      }

    } catch (err) {
      wx.showToast({
        title: err.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
