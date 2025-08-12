/**
 * 飞书Plus - Popup控制器
 * 管理弹窗界面交互
 */

class PopupController {
  constructor() {
    this.isEnabled = true;
    this.preserveFormat = true;
    this.currentTab = null;
  }

  /**
   * 初始化弹窗
   */
  async init() {
    console.log('飞书Plus: 初始化弹窗界面');
    
    // 获取当前标签页信息
    await this.getCurrentTab();
    
    // 加载设置
    await this.loadSettings();
    
    // 绑定事件监听器
    this.bindEvents();
    
    // 更新界面状态
    this.updateUI();
    
    // 检查当前页面状态
    await this.checkPageStatus();
  }

  /**
   * 获取当前标签页
   */
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      console.log('飞书Plus: 当前标签页', tab.url);
    } catch (error) {
      console.error('获取当前标签页失败:', error);
    }
  }

  /**
   * 加载设置
   */
  async loadSettings() {
    try {
      // 从background script获取设置
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SETTINGS'
      });
      
      if (response) {
        this.isEnabled = response.enabled !== false; // 默认启用
        this.preserveFormat = response.preserveFormat !== false; // 默认启用
        console.log('飞书Plus: 设置已加载', response);
      }
    } catch (error) {
      console.warn('飞书Plus: 加载设置失败，使用默认设置', error);
      // 使用默认设置
      this.isEnabled = true;
      this.preserveFormat = true;
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 启用开关
    const enableToggle = document.getElementById('enableToggle');
    enableToggle.addEventListener('change', (e) => {
      this.togglePlugin(e.target.checked);
    });

    // 格式保持开关
    const formatToggle = document.getElementById('formatToggle');
    formatToggle.addEventListener('change', (e) => {
      this.toggleFormatPreserve(e.target.checked);
    });

    // 作者博客按钮
    const authorBtn = document.getElementById('authorBtn');
    authorBtn.addEventListener('click', () => {
      this.openAuthorBlog();
    });
  }

  /**
   * 检查页面状态
   */
  async checkPageStatus() {
    console.log('飞书Plus: 开始检查页面状态');
    
    if (!this.currentTab || !this.currentTab.url) {
      this.updateStatus('未知页面', 'inactive');
      return;
    }

    const isFeishuPage = this.isFeishuPage(this.currentTab.url);
    console.log('飞书Plus: 是否为飞书页面', isFeishuPage);
    
    if (!isFeishuPage) {
      this.updateStatus('非飞书页面', 'inactive');
      return;
    }

    // 检查插件是否启用
    if (!this.isEnabled) {
      this.updateStatus('插件已禁用', 'inactive');
      return;
    }

    // 先通过background script检查状态
    try {
      const bgResponse = await chrome.runtime.sendMessage({
        type: 'GET_TAB_STATUS',
        tabId: this.currentTab.id
      });
      
      if (bgResponse && bgResponse.isActive) {
        this.updateStatus('已激活', 'active');
        return;
      }
    } catch (error) {
      console.log('飞书Plus: background script通信失败', error);
    }

    // 直接检查content script状态
    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'PING'
      });
      
      if (response && response.pong) {
        this.updateStatus('已激活', 'active');
      } else {
        this.updateStatus('等待激活', 'inactive');
      }
    } catch (error) {
      console.log('飞书Plus: content script未响应，可能未注入');
      this.updateStatus('等待激活', 'inactive');
      
      // 尝试注入content script
      this.tryInjectContentScript();
    }
  }

  /**
   * 尝试注入content script
   */
  async tryInjectContentScript() {
    try {
      console.log('飞书Plus: 尝试注入content script');
      
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        files: ['content.js']
      });
      
      console.log('飞书Plus: content script注入成功');
      
      // 等待一下再检查状态
      setTimeout(() => {
        this.checkPageStatus();
      }, 1000);
      
    } catch (error) {
      console.error('飞书Plus: content script注入失败', error);
      this.updateStatus('注入失败', 'inactive');
    }
  }

  /**
   * 检测是否为飞书页面
   */
  isFeishuPage(url) {
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
      const isDocumentPage = pathname.includes('/docs/') || 
                             pathname.includes('/docx/') || 
                             pathname.includes('/sheets/') || 
                             pathname.includes('/base/') ||
                             pathname.includes('/wiki/') ||
                             pathname.includes('/minutes/') ||
                             pathname.includes('/file/') ||
                             pathname.includes('/drive/');
      
      return isDocumentPage;
    } catch (error) {
      console.error('飞书Plus: URL解析失败', error);
      return false;
    }
  }

  /**
   * 更新状态显示
   */
  updateStatus(text, status) {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    
    statusText.textContent = text;
    statusDot.className = `status-dot ${status}`;
  }

  /**
   * 更新界面状态
   */
  updateUI() {
    const enableToggle = document.getElementById('enableToggle');
    const formatToggle = document.getElementById('formatToggle');
    
    enableToggle.checked = this.isEnabled;
    formatToggle.checked = this.preserveFormat;
  }

  /**
   * 切换插件启用状态
   */
  async togglePlugin(enabled) {
    this.isEnabled = enabled;
    console.log('插件状态切换:', enabled ? '启用' : '禁用');
    
    try {
      // 通知background script更新设置
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: {
          enabled: enabled
        }
      });
      
      if (response && response.success) {
        console.log('飞书Plus: 插件状态更新成功');
        // 重新检查页面状态
        await this.checkPageStatus();
      }
    } catch (error) {
      console.error('飞书Plus: 插件状态更新失败', error);
    }
  }

  /**
   * 切换格式保持功能
   */
  async toggleFormatPreserve(enabled) {
    this.preserveFormat = enabled;
    console.log('格式保持:', enabled ? '启用' : '禁用');
    
    try {
      // 通知background script更新设置
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: {
          preserveFormat: enabled
        }
      });
      
      if (response && response.success) {
        console.log('飞书Plus: 格式保持设置更新成功');
      }
    } catch (error) {
      console.error('飞书Plus: 格式保持设置更新失败', error);
    }
  }

  /**
   * 打开作者博客
   */
  openAuthorBlog() {
    console.log('跳转到作者博客');
    chrome.tabs.create({
      url: 'https://www.ngy66.cn'
    });
    
    // 关闭popup
    window.close();
  }
}

// 当弹窗加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
  const popupController = new PopupController();
  popupController.init();
});