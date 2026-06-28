// 人员管理服务
const http = require('../utils/request.js');

module.exports = {
  // 获取人员列表
  getList(params = {}) {
    return http.get('/persons', params);
  },

  // 获取人员详情
  getById(id) {
    return http.get(`/persons/${id}`);
  },

  // 新增人员
  create(data) {
    return http.post('/persons', data);
  },

  // 更新人员
  update(id, data) {
    return http.put(`/persons/${id}`, data);
  },

  // 删除人员
  delete(id) {
    return http.delete(`/persons/${id}`);
  },

  // 批量导入
  batchImport(items) {
    return http.post('/persons/batch', { items });
  }
};
