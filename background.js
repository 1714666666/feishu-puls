/**
 * 飞书Plus - Background Service Worker
 * 管理插件生命周期和状态
 */

class BackgroundManager {
  constructor() {
    this.activeTabIds = new Set();
    this.pluginSettings = {
      enabled: true,
      preserveFormat: true,
      autoActivate: true,
      debugMode: false
    };
    this.statistics = {
      installTime: null,
      totalCopies: 0,
      totalActivations: 0,
      lastActiveTime: null
    };
  }

  /**
   * 初始化Background Worker
   */
  async init() {
    console.log('飞书Plus: Background Worker 初始化');
    
    // 加载设置和统计数据
    await this.loadSettings();
    await this.loadStatistics();
    
    // 监听插件安装事件
    chrome.runtime.onInstalled.addListener((details) => {
      this.onInstalled(details);
    });

    // 监听标签页更新事件
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.onTabUpdated(tabId, changeInfo, tab);
    });

    // 监听标签页激活事件
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.onTabActivated(activeInfo);
    });

    // 监听标签页关闭事件
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.onTabRemoved(tabId);
    });

    // 监听来自content script的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放以支持异步响应
    });

    // 监听浏览器启动事件
    chrome.runtime.onStartup.addListener(() => {
      this.onStartup();
    });

    // 设置定期清理任务
    this.setupPeriodicTasks();
    
    console.log('飞书Plus: Background Worker 初始化完成');
  }

  /**
   * 处理标签页关闭
   */
  onTabRemoved(tabId) {
    this.activeTabIds.delete(tabId);
    console.log(`飞书Plus: 标签页 ${tabId} 已关闭`);
  }

  /**
   * 处理浏览器启动
   */
  onStartup() {
    console.log('飞书Plus: 浏览器启动，重新初始化');
    this.loadSettings();
    this.loadStatistics();
  }

  /**
   * 设置定期任务
   */
  setupPeriodicTasks() {
    // 每小时保存一次统计数据
    setInterval(() => {
      this.saveStatistics();
    }, 60 * 60 * 1000);

    // 每天清理一次过期数据
    setInterval(() => {
      this.cleanupExpiredData();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * 清理过期数据
   */
  cleanupExpiredData() {
    console.log('飞书Plus: 清理过期数据');
    
    // 清理超过30天的错误记录
    if (this.statistics.errors) {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      this.statistics.errors = this.statistics.errors.filter(
        error => error.timestamp > thirtyDaysAgo
      );
    }
    
    this.saveStatistics();
  }

  /**
   * 插件安装时的处理
   */
  onInstalled(details) {
    console.log('飞书Plus: 插件已安装', details);
    
    if (details.reason === 'install') {
      this.handleFirstInstall();
    } else if (details.reason === 'update') {
      this.handleUpdate(details.previousVersion);
    } else if (details.reason === 'chrome_update') {
      this.handleChromeUpdate();
    }
  }

  /**
   * 处理首次安装
   */
  handleFirstInstall() {
    console.log('飞书Plus: 首次安装处理');
    
    // 初始化统计数据
    this.statistics.installTime = Date.now();
    this.saveStatistics();
    
    // 初始化设置
    this.saveSettings();
    
    // 设置默认图标
    this.setDefaultIcon();
    
    // 显示欢迎通知
    this.showWelcomeNotification();
    
    console.log('飞书Plus: 首次安装完成');
  }

  /**
   * 处理插件更新
   */
  handleUpdate(previousVersion) {
    console.log(`飞书Plus: 插件从 ${previousVersion} 更新到当前版本`);
    
    // 加载现有设置
    this.loadSettings();
    
    // 执行版本迁移（如果需要）
    this.performVersionMigration(previousVersion);
    
    // 显示更新通知
    this.showUpdateNotification(previousVersion);
    
    console.log('飞书Plus: 插件更新完成');
  }

  /**
   * 处理Chrome更新
   */
  handleChromeUpdate() {
    console.log('飞书Plus: Chrome浏览器更新，重新初始化插件');
    
    // 重新加载设置
    this.loadSettings();
    
    // 重新设置图标
    this.setDefaultIcon();
  }

  /**
   * 版本迁移
   */
  performVersionMigration(previousVersion) {
    // 这里可以添加版本间的数据迁移逻辑
    console.log(`飞书Plus: 执行版本迁移 ${previousVersion} -> 当前版本`);
    
    // 示例：如果从1.0.0以下版本升级，重置某些设置
    if (this.compareVersions(previousVersion, '1.0.0') < 0) {
      console.log('飞书Plus: 从旧版本升级，重置部分设置');
      this.pluginSettings.preserveFormat = true;
    }
  }

  /**
   * 比较版本号
   */
  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part < v2part) return -1;
      if (v1part > v2part) return 1;
    }
    
    return 0;
  }

  /**
   * 设置默认图标
   */
  setDefaultIcon() {
    try {
      chrome.action.setIcon({
        path: {
          "16": "icons/icon-16.png",
          "32": "icons/icon-32.png",
          "48": "icons/icon-48.png",
          "128": "icons/icon-128.png"
        }
      });
      
      chrome.action.setTitle({
        title: '飞书Plus - 解除复制限制'
      });
      
    } catch (error) {
      console.error('飞书Plus: 设置默认图标失败', error);
    }
  }

  /**
   * 显示欢迎通知
   */
  showWelcomeNotification() {
    try {
      chrome.notifications.create('welcome', {
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: '飞书Plus 安装成功！',
        message: '现在可以在飞书文档中自由复制内容了。点击工具栏图标查看更多设置。'
      });
      
      // 5秒后清除通知
      setTimeout(() => {
        chrome.notifications.clear('welcome');
      }, 5000);
      
    } catch (error) {
      console.warn('飞书Plus: 无法显示欢迎通知', error);
    }
  }

  /**
   * 显示更新通知
   */
  showUpdateNotification(previousVersion) {
    try {
      chrome.notifications.create('update', {
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: '飞书Plus 已更新！',
        message: `从 ${previousVersion} 更新到最新版本，享受更好的复制体验。`
      });
      
      // 5秒后清除通知
      setTimeout(() => {
        chrome.notifications.clear('update');
      }, 5000);
      
    } catch (error) {
      console.warn('飞书Plus: 无法显示更新通知', error);
    }
  }

  /**
   * 标签页更新处理
   */
  onTabUpdated(tabId, changeInfo, tab) {
    // 只处理完全加载的页面
    if (changeInfo.status !== 'complete' || !tab.url) {
      return;
    }
    
    // 分析页面信息
    const pageInfo = this.analyzePageInfo(tab);
    
    if (pageInfo.isFeishuPage) {
      this.handleFeishuPageLoaded(tabId, pageInfo);
    } else {
      this.handleNonFeishuPage(tabId, pageInfo);
    }
  }

  /**
   * 处理飞书页面加载
   */
  handleFeishuPageLoaded(tabId, pageInfo) {
    console.log(`飞书Plus: 飞书页面加载完成 - 标签页 ${tabId}`, pageInfo);
    
    // 检查插件是否启用
    if (!this.pluginSettings.enabled) {
      this.updateIcon(tabId, false);
      return;
    }
    
    // 标记为潜在激活状态（等待content script确认）
    this.updateIcon(tabId, false); // 先设为未激活，等content script激活后再更新
    
    // 如果启用了自动激活，尝试注入content script
    if (this.pluginSettings.autoActivate) {
      this.injectContentScript(tabId, pageInfo);
    }
  }

  /**
   * 处理非飞书页面
   */
  handleNonFeishuPage(tabId, pageInfo) {
    // 从活跃列表中移除
    this.activeTabIds.delete(tabId);
    
    // 重置图标为默认状态
    this.resetTabIcon(tabId);
  }

  /**
   * 注入Content Script
   */
  async injectContentScript(tabId, pageInfo) {
    try {
      // 检查content script是否已经注入
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'PING'
      });
      
      if (response && response.pong) {
        console.log(`飞书Plus: Content Script已存在于标签页 ${tabId}`);
        return;
      }
    } catch (error) {
      // Content script不存在，需要注入
      console.log(`飞书Plus: 准备注入Content Script到标签页 ${tabId}`);
    }
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      console.log(`飞书Plus: Content Script注入成功 - 标签页 ${tabId}`);
    } catch (error) {
      console.error(`飞书Plus: Content Script注入失败 - 标签页 ${tabId}`, error);
    }
  }

  /**
   * 标签页激活处理
   */
  onTabActivated(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      if (tab.url) {
        const isFeishuPage = this.isFeishuPage(tab.url);
        this.updateIcon(activeInfo.tabId, isFeishuPage);
      }
    });
  }

  /**
   * 页面检测和分析
   */
  
  /**
   * 检测是否为飞书页面
   */
  isFeishuPage(url) {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;
      
      // 检查域名
      const isFeishuDomain = hostname.includes('feishu.cn') || 
                            hostname.includes('larksuite.com') ||
                            hostname.includes('feishu.com');
      
      if (!isFeishuDomain) return false;
      
      // 检查是否为文档页面
      const isDocumentPage = this.isDocumentPage(pathname);
      
      return isDocumentPage;
    } catch (error) {
      console.warn('飞书Plus: URL解析失败', url, error);
      return false;
    }
  }

  /**
   * 检测是否为文档页面
   */
  isDocumentPage(pathname) {
    const documentPatterns = [
      '/docs/',     // 飞书文档
      '/docx/',     // 新版文档
      '/sheets/',   // 飞书表格
      '/base/',     // 飞书多维表格
      '/wiki/',     // 飞书知识库
      '/minutes/',  // 飞书妙记
      '/file/',     // 文件预览
      '/drive/'     // 云文档
    ];
    
    return documentPatterns.some(pattern => pathname.includes(pattern));
  }

  /**
   * 获取页面类型
   */
  getPageType(url) {
    if (!this.isFeishuPage(url)) return 'unknown';
    
    try {
      const pathname = new URL(url).pathname;
      
      if (pathname.includes('/docs/') || pathname.includes('/docx/')) {
        return 'document';
      } else if (pathname.includes('/sheets/')) {
        return 'spreadsheet';
      } else if (pathname.includes('/base/')) {
        return 'database';
      } else if (pathname.includes('/wiki/')) {
        return 'wiki';
      } else if (pathname.includes('/minutes/')) {
        return 'minutes';
      } else if (pathname.includes('/file/') || pathname.includes('/drive/')) {
        return 'file';
      }
      
      return 'feishu';
    } catch (error) {
      return 'feishu';
    }
  }

  /**
   * 分析页面信息
   */
  analyzePageInfo(tab) {
    const pageInfo = {
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
      isFeishuPage: this.isFeishuPage(tab.url),
      pageType: this.getPageType(tab.url),
      timestamp: Date.now()
    };
    
    console.log('飞书Plus: 页面分析结果', pageInfo);
    return pageInfo;
  }

  /**
   * 处理来自content script的消息
   */
  handleMessage(message, sender, sendResponse) {
    console.log('飞书Plus: 收到消息', message);
    
    switch (message.type) {
      case 'CONTENT_SCRIPT_ACTIVATED':
        this.handleContentScriptActivated(sender.tab.id, message);
        break;
        
      case 'ERROR_REPORT':
        this.handleErrorReport(message.error);
        break;
        
      case 'COPY_SUCCESS':
        this.handleCopySuccess(message.data);
        break;
        
      case 'GET_TAB_STATUS':
        sendResponse({
          isActive: this.activeTabIds.has(sender.tab.id),
          tabId: sender.tab.id,
          settings: this.pluginSettings
        });
        break;
        
      case 'GET_SETTINGS':
        sendResponse(this.pluginSettings);
        break;
        
      case 'UPDATE_SETTINGS':
        this.updateSettings(message.settings);
        sendResponse({ success: true });
        break;
        
      case 'GET_STATISTICS':
        sendResponse(this.getUsageStatistics());
        break;
        
      case 'TOGGLE_PLUGIN':
        if (message.enabled) {
          this.enablePlugin();
        } else {
          this.disablePlugin();
        }
        sendResponse({ success: true, enabled: this.pluginSettings.enabled });
        break;
        
      default:
        console.warn('飞书Plus: 未知消息类型', message.type);
    }
  }

  /**
   * 处理content script激活消息
   */
  handleContentScriptActivated(tabId, message) {
    console.log(`飞书Plus: Content Script在标签页 ${tabId} 激活`);
    this.activeTabIds.add(tabId);
    this.updateIcon(tabId, true);
    
    // 更新统计
    this.updateStatistics('activation');
  }

  /**
   * 处理复制成功消息
   */
  handleCopySuccess(data) {
    console.log('飞书Plus: 收到复制成功报告', data);
    
    // 更新统计
    this.updateStatistics('copy', data);
  }

  /**
   * 处理错误报告
   */
  handleErrorReport(error) {
    console.error('飞书Plus: 收到错误报告', error);
    
    // 记录错误统计
    if (!this.statistics.errors) {
      this.statistics.errors = [];
    }
    
    this.statistics.errors.push({
      message: error.message,
      url: error.url,
      timestamp: error.timestamp,
      stack: error.stack ? error.stack.substring(0, 500) : null // 限制堆栈长度
    });
    
    // 只保留最近的50个错误
    if (this.statistics.errors.length > 50) {
      this.statistics.errors = this.statistics.errors.slice(-50);
    }
    
    this.saveStatistics();
  }

  /**
   * 更新设置
   */
  async updateSettings(newSettings) {
    console.log('飞书Plus: 更新设置', newSettings);
    
    this.pluginSettings = { ...this.pluginSettings, ...newSettings };
    await this.saveSettings();
    
    // 如果启用状态改变，更新所有图标
    if ('enabled' in newSettings) {
      this.updateAllTabIcons();
    }
    
    // 通知所有活跃的content script设置已更新
    this.broadcastSettingsUpdate();
  }

  /**
   * 跨标签页通信
   */
  
  /**
   * 广播设置更新
   */
  async broadcastSettingsUpdate() {
    try {
      const feishuTabs = await this.getAllFeishuTabs();
      
      const promises = feishuTabs.map(async (tab) => {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_UPDATED',
            settings: this.pluginSettings,
            timestamp: Date.now()
          });
          console.log(`飞书Plus: 设置更新已发送到标签页 ${tab.id}`);
        } catch (error) {
          console.debug(`飞书Plus: 无法向标签页 ${tab.id} 发送设置更新`, error);
        }
      });
      
      await Promise.all(promises);
      console.log(`飞书Plus: 设置更新已广播到 ${feishuTabs.length} 个飞书标签页`);
      
    } catch (error) {
      console.error('飞书Plus: 广播设置更新失败', error);
    }
  }

  /**
   * 广播消息到所有飞书标签页
   */
  async broadcastToFeishuTabs(message) {
    try {
      const feishuTabs = await this.getAllFeishuTabs();
      
      const results = await Promise.allSettled(
        feishuTabs.map(tab => 
          chrome.tabs.sendMessage(tab.id, {
            ...message,
            timestamp: Date.now()
          })
        )
      );
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      console.log(`飞书Plus: 消息已广播，成功: ${successful}/${feishuTabs.length}`);
      
      return { total: feishuTabs.length, successful };
    } catch (error) {
      console.error('飞书Plus: 广播消息失败', error);
      return { total: 0, successful: 0 };
    }
  }

  /**
   * 检查标签页状态
   */
  async checkTabStatus(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'STATUS_CHECK'
      });
      
      return {
        tabId,
        isResponding: true,
        status: response.status,
        lastActive: response.lastActive
      };
    } catch (error) {
      return {
        tabId,
        isResponding: false,
        error: error.message
      };
    }
  }

  /**
   * 检查所有飞书标签页状态
   */
  async checkAllFeishuTabsStatus() {
    try {
      const feishuTabs = await this.getAllFeishuTabs();
      
      const statusPromises = feishuTabs.map(tab => this.checkTabStatus(tab.id));
      const statuses = await Promise.all(statusPromises);
      
      const responding = statuses.filter(status => status.isResponding).length;
      console.log(`飞书Plus: 标签页状态检查完成，响应: ${responding}/${feishuTabs.length}`);
      
      return statuses;
    } catch (error) {
      console.error('飞书Plus: 检查标签页状态失败', error);
      return [];
    }
  }

  /**
   * 设置和统计管理
   */
  
  /**
   * 保存设置
   */
  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        pluginSettings: this.pluginSettings
      });
      console.log('飞书Plus: 设置已保存', this.pluginSettings);
    } catch (error) {
      console.error('飞书Plus: 设置保存失败', error);
    }
  }

  /**
   * 加载设置
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['pluginSettings']);
      if (result.pluginSettings) {
        this.pluginSettings = { ...this.pluginSettings, ...result.pluginSettings };
        console.log('飞书Plus: 设置已加载', this.pluginSettings);
      }
    } catch (error) {
      console.error('飞书Plus: 设置加载失败', error);
    }
  }

  /**
   * 保存统计数据
   */
  async saveStatistics() {
    try {
      await chrome.storage.local.set({
        statistics: this.statistics
      });
      console.log('飞书Plus: 统计数据已保存');
    } catch (error) {
      console.error('飞书Plus: 统计数据保存失败', error);
    }
  }

  /**
   * 加载统计数据
   */
  async loadStatistics() {
    try {
      const result = await chrome.storage.local.get(['statistics']);
      if (result.statistics) {
        this.statistics = { ...this.statistics, ...result.statistics };
        console.log('飞书Plus: 统计数据已加载', this.statistics);
      }
    } catch (error) {
      console.error('飞书Plus: 统计数据加载失败', error);
    }
  }

  /**
   * 更新统计数据
   */
  updateStatistics(type, data = {}) {
    switch (type) {
      case 'copy':
        this.statistics.totalCopies++;
        break;
      case 'activation':
        this.statistics.totalActivations++;
        this.statistics.lastActiveTime = Date.now();
        break;
    }
    
    // 异步保存统计数据
    this.saveStatistics();
  }

  /**
   * 获取插件使用统计
   */
  getUsageStatistics() {
    const now = Date.now();
    const installDays = this.statistics.installTime ? 
      Math.floor((now - this.statistics.installTime) / (1000 * 60 * 60 * 24)) : 0;
    
    return {
      ...this.statistics,
      installDays,
      averageCopiesPerDay: installDays > 0 ? Math.round(this.statistics.totalCopies / installDays) : 0
    };
  }

  /**
   * 图标和状态管理
   */
  
  /**
   * 更新插件图标状态
   */
  updateIcon(tabId, isActive) {
    const iconState = this.getIconState(isActive);
    
    try {
      // 设置图标
      chrome.action.setIcon({
        tabId: tabId,
        path: iconState.iconPath
      });

      // 设置标题
      chrome.action.setTitle({
        tabId: tabId,
        title: iconState.title
      });
      
      // 设置徽章
      chrome.action.setBadgeText({
        tabId: tabId,
        text: iconState.badgeText
      });
      
      chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: iconState.badgeColor
      });
      
      console.log(`飞书Plus: 图标已更新 - 标签页 ${tabId}, 状态: ${iconState.status}`);
      
    } catch (error) {
      console.error('飞书Plus: 更新图标失败', error);
    }
  }

  /**
   * 获取图标状态配置
   */
  getIconState(isActive) {
    const baseIconPath = {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    };

    if (!this.pluginSettings.enabled) {
      return {
        status: 'disabled',
        iconPath: baseIconPath,
        title: '飞书Plus - 已禁用',
        badgeText: '×',
        badgeColor: '#dc3545'
      };
    } else if (isActive) {
      return {
        status: 'active',
        iconPath: baseIconPath,
        title: '飞书Plus - 已激活，复制功能可用',
        badgeText: '✓',
        badgeColor: '#28a745'
      };
    } else {
      return {
        status: 'inactive',
        iconPath: baseIconPath,
        title: '飞书Plus - 未激活',
        badgeText: '',
        badgeColor: '#6c757d'
      };
    }
  }

  /**
   * 重置标签页图标为默认状态
   */
  resetTabIcon(tabId) {
    try {
      chrome.action.setIcon({
        tabId: tabId,
        path: {
          "16": "icons/icon-16.png",
          "32": "icons/icon-32.png",
          "48": "icons/icon-48.png",
          "128": "icons/icon-128.png"
        }
      });

      chrome.action.setTitle({
        tabId: tabId,
        title: '飞书Plus'
      });
      
      chrome.action.setBadgeText({
        tabId: tabId,
        text: ''
      });
      
    } catch (error) {
      console.error('飞书Plus: 重置图标失败', error);
    }
  }

  /**
   * 批量更新图标状态
   */
  async batchUpdateIcons(tabIds, isActive) {
    const promises = tabIds.map(tabId => {
      return new Promise(resolve => {
        this.updateIcon(tabId, isActive);
        resolve();
      });
    });
    
    await Promise.all(promises);
    console.log(`飞书Plus: 批量更新了 ${tabIds.length} 个标签页的图标`);
  }

  /**
   * 获取所有飞书标签页
   */
  async getAllFeishuTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      return tabs.filter(tab => this.isFeishuPage(tab.url));
    } catch (error) {
      console.error('飞书Plus: 获取飞书标签页失败', error);
      return [];
    }
  }

  /**
   * 更新所有标签页图标
   */
  async updateAllTabIcons() {
    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        const isFeishuPage = this.isFeishuPage(tab.url);
        const isActive = isFeishuPage && this.activeTabIds.has(tab.id);
        
        if (isFeishuPage) {
          this.updateIcon(tab.id, isActive);
        } else {
          this.resetTabIcon(tab.id);
        }
      }
      
      console.log(`飞书Plus: 已更新所有标签页图标`);
    } catch (error) {
      console.error('飞书Plus: 更新所有标签页图标失败', error);
    }
  }

  /**
   * 插件状态管理
   */
  
  /**
   * 启用插件
   */
  async enablePlugin() {
    this.pluginSettings.enabled = true;
    await this.saveSettings();
    
    // 更新所有标签页的图标
    this.updateAllTabIcons();
    
    console.log('飞书Plus: 插件已启用');
  }

  /**
   * 禁用插件
   */
  async disablePlugin() {
    this.pluginSettings.enabled = false;
    await this.saveSettings();
    
    // 更新所有标签页的图标
    this.updateAllTabIcons();
    
    console.log('飞书Plus: 插件已禁用');
  }

  /**
   * 更新所有标签页图标
   */
  async updateAllTabIcons() {
    try {
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        const isFeishuPage = this.isFeishuPage(tab.url);
        const isActive = isFeishuPage && this.activeTabIds.has(tab.id);
        this.updateIcon(tab.id, isActive);
      });
    } catch (error) {
      console.error('飞书Plus: 更新所有标签页图标失败', error);
    }
  }
}

// 创建并初始化Background Manager
const backgroundManager = new BackgroundManager();
backgroundManager.init();