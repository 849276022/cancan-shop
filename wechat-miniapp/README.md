# 走失人员管理系统 v5

> 微信小程序 · 云托管免域名版

## 🆕 v5 更新

- **移除所有域名依赖**：改用 `wx.cloud.callContainer`，无需配置 request 合法域名
- **3个页面全部改用云托管接口**：index / records / stats 统一走 `callContainer`
- **UI 全面优化**：深色主题升级、更流畅的交互、圆角更大的卡片、渐变按钮
- **更加安全**：内网通信，天然的防 DDoS 能力，只有授权小程序能访问

## 技术架构

```
小程序前端 → wx.cloud.callContainer → 微信云托管服务(express-uj20)
```

### 云托管配置

```javascript
const CLOUD_CONFIG = {
  env: 'prod-5g5g2lq55642a23a',  // 云托管环境ID
  service: 'express-uj20'         // 云托管服务名
}
```

### 前提条件

- 小程序基础库版本 ≥ 2.23.0
- 已开通微信云托管环境
- 云托管服务 `express-uj20` 已部署运行

## 部署步骤

1. 微信开发者工具打开项目
2. 确认 `app.js` 中 `env` 和 `service` 正确
3. 确认云托管后端服务已部署运行
4. 点击「预览」或「上传」即可

**无需配置服务器域名！** `wx.cloud.callContainer` 走微信内网通道。

## 页面说明

| 页面 | 功能 |
|------|------|
| pages/index | 人员列表（增删改查、搜索、导入） |
| pages/records | 处理记录时间线 |
| pages/stats | 统计分析（站点分布、类型饼图、趋势） |