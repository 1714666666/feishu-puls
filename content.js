/**
 * 飞书Plus - Content Script
 * 负责在飞书页面中执行复制解锁功能
 */

class FeishuCopyUnlocker {
  constructor() {
    this.isActive = false;
    this.observer = null;
    this.originalFunctions = new Map();
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000;
  }

  /**
   * 初始化插件
   */
  init() {
    console.log('飞书Plus: 初始化插件');
    
    // 检查是否为飞书页面
    if (!this.isFeishuPage()) {
      console.log('飞书Plus: 非飞书页面，插件未激活');
      return;
    }

    console.log('飞书Plus: 检测到飞书页面，准备激活插件');
    this.isActive = true;
    
    // 等待页面加载完成后执行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.activate();
      });
    } else {
      this.activate();
    }
  }

  /**
   * 检查是否为飞书页面
   */
  isFeishuPage() {
    const hostname = window.location.hostname;
    const isFeishu = hostname.includes('feishu.cn') || hostname.includes('larksuite.com');
    
    // 额外检查URL路径，确保是文档页面
    if (isFeishu) {
      const pathname = window.location.pathname;
      const isDocPage = pathname.includes('/docs/') || 
                       pathname.includes('/docx/') || 
                       pathname.includes('/sheets/') || 
                       pathname.includes('/base/') ||
                       pathname.includes('/wiki/');
      
      console.log('飞书Plus: 页面检测结果', {
        hostname,
        pathname,
        isFeishu,
        isDocPage
      });
      
      return isDocPage;
    }
    
    return false;
  }

  /**
   * 激活插件功能
   */
  activate() {
    console.log('飞书Plus: 激活复制解锁功能');
    
    try {
      // 移除复制限制
      this.removeCopyRestrictions();
      
      // 启用文本选择
      this.enableTextSelection();
      
      // 监听页面变化
      this.observePageChanges();
      
      // 通知background script插件已激活
      this.notifyActivation();
      
      console.log('飞书Plus: 插件激活完成');
    } catch (error) {
      console.error('飞书Plus: 插件激活失败', error);
      this.handleError(error, () => this.retryActivation());
    }
  }

  /**
   * 重试激活
   */
  retryActivation() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`飞书Plus: 重试激活 (${this.retryCount}/${this.maxRetries})`);
      
      setTimeout(() => {
        this.activate();
      }, this.retryDelay * this.retryCount);
    } else {
      console.error('飞书Plus: 激活失败，已达到最大重试次数');
    }
  }

  /**
   * 通知background script
   */
  notifyActivation() {
    try {
      chrome.runtime.sendMessage({
        type: 'CONTENT_SCRIPT_ACTIVATED',
        url: window.location.href,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('飞书Plus: 无法与background script通信', error);
    }
  }

  /**
   * DOM操作工具函数
   */
  
  /**
   * 安全地查询DOM元素
   */
  safeQuerySelector(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (error) {
      console.warn('飞书Plus: DOM查询失败', selector, error);
      return null;
    }
  }

  /**
   * 安全地查询多个DOM元素
   */
  safeQuerySelectorAll(selector, context = document) {
    try {
      return context.querySelectorAll(selector);
    } catch (error) {
      console.warn('飞书Plus: DOM查询失败', selector, error);
      return [];
    }
  }

  /**
   * 移除元素的事件监听器
   */
  removeEventListeners(element, events) {
    if (!element) return;
    
    events.forEach(eventType => {
      try {
        // 克隆元素来移除所有事件监听器
        const newElement = element.cloneNode(true);
        element.parentNode.replaceChild(newElement, element);
      } catch (error) {
        console.warn(`飞书Plus: 移除事件监听器失败 ${eventType}`, error);
      }
    });
  }

  /**
   * 添加或修改CSS样式
   */
  addStyles(styles) {
    try {
      const styleId = 'feishu-plus-styles';
      let styleElement = document.getElementById(styleId);
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = styles;
      console.log('飞书Plus: 样式已应用');
    } catch (error) {
      console.error('飞书Plus: 样式应用失败', error);
    }
  }

  /**
   * 错误处理
   */
  handleError(error, fallbackAction = null) {
    console.error('飞书Plus: 发生错误', error);
    
    // 记录错误信息
    try {
      chrome.runtime.sendMessage({
        type: 'ERROR_REPORT',
        error: {
          message: error.message,
          stack: error.stack,
          url: window.location.href,
          timestamp: Date.now()
        }
      });
    } catch (e) {
      console.warn('飞书Plus: 无法发送错误报告', e);
    }
    
    // 执行降级方案
    if (fallbackAction && typeof fallbackAction === 'function') {
      try {
        fallbackAction();
      } catch (fallbackError) {
        console.error('飞书Plus: 降级方案执行失败', fallbackError);
      }
    }
  }

  /**
   * 移除复制限制
   */
  removeCopyRestrictions() {
    console.log('飞书Plus: 开始移除复制限制');
    
    try {
      // 1. 移除事件监听器
      this.removeRestrictiveEventListeners();
      
      // 2. 覆盖CSS样式限制
      this.overrideCSSRestrictions();
      
      // 3. 拦截和替换JavaScript函数
      this.interceptRestrictiveFunctions();
      
      // 4. 清理DOM属性
      this.cleanupDOMAttributes();
      
      console.log('飞书Plus: 复制限制移除完成');
    } catch (error) {
      this.handleError(error, () => {
        console.log('飞书Plus: 使用基础复制解锁方案');
        this.basicCopyUnlock();
      });
    }
  }

  /**
   * 移除限制性事件监听器
   */
  removeRestrictiveEventListeners() {
    console.log('飞书Plus: 移除限制性事件监听器');
    
    const restrictiveEvents = [
      'copy', 'cut', 'paste',
      'selectstart', 'select',
      'contextmenu', 'mousedown', 'mouseup',
      'keydown', 'keyup', 'keypress'
    ];
    
    // 移除document级别的事件监听器
    restrictiveEvents.forEach(eventType => {
      try {
        // 阻止事件冒泡和默认行为
        document.addEventListener(eventType, (e) => {
          if (this.isRestrictiveEvent(e)) {
            e.stopPropagation();
            e.stopImmediatePropagation();
          }
        }, true);
      } catch (error) {
        console.warn(`飞书Plus: 处理事件 ${eventType} 失败`, error);
      }
    });
    
    // 查找并处理可能的限制性元素
    const restrictiveSelectors = [
      '[oncontextmenu]',
      '[onselectstart]',
      '[oncopy]',
      '[oncut]',
      '[onpaste]',
      '.no-select',
      '.disable-copy',
      '[unselectable]'
    ];
    
    restrictiveSelectors.forEach(selector => {
      const elements = this.safeQuerySelectorAll(selector);
      elements.forEach(element => {
        this.cleanupElementRestrictions(element);
      });
    });
  }

  /**
   * 判断是否为限制性事件
   */
  isRestrictiveEvent(event) {
    // 检查事件是否来自飞书的限制性代码
    const target = event.target;
    const eventType = event.type;
    
    // 如果是复制相关事件且被阻止，则认为是限制性的
    if (['copy', 'cut', 'selectstart'].includes(eventType)) {
      return event.defaultPrevented || 
             target.style.userSelect === 'none' ||
             target.getAttribute('unselectable') === 'on';
    }
    
    // 如果是右键菜单被阻止
    if (eventType === 'contextmenu') {
      return event.defaultPrevented;
    }
    
    return false;
  }

  /**
   * 清理元素的限制性属性和事件
   */
  cleanupElementRestrictions(element) {
    try {
      // 移除限制性属性
      const restrictiveAttrs = [
        'oncontextmenu', 'onselectstart', 'oncopy', 'oncut', 'onpaste',
        'unselectable', 'contenteditable'
      ];
      
      restrictiveAttrs.forEach(attr => {
        if (element.hasAttribute(attr)) {
          element.removeAttribute(attr);
        }
      });
      
      // 移除限制性CSS类
      const restrictiveClasses = ['no-select', 'disable-copy', 'unselectable'];
      restrictiveClasses.forEach(className => {
        element.classList.remove(className);
      });
      
    } catch (error) {
      console.warn('飞书Plus: 清理元素限制失败', error);
    }
  }

  /**
   * 覆盖CSS样式限制
   */
  overrideCSSRestrictions() {
    console.log('飞书Plus: 覆盖CSS样式限制');
    
    const overrideStyles = `
      /* 飞书Plus - 覆盖复制限制样式 */
      * {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        -webkit-touch-callout: default !important;
        -webkit-tap-highlight-color: rgba(0,0,0,0.1) !important;
      }
      
      /* 特殊元素保持原有选择行为 */
      input, textarea, select, button {
        -webkit-user-select: auto !important;
        -moz-user-select: auto !important;
        -ms-user-select: auto !important;
        user-select: auto !important;
      }
      
      /* 确保文本内容可选择 */
      [contenteditable="false"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      
      /* 移除可能的鼠标事件限制 */
      * {
        pointer-events: auto !important;
      }
      
      /* 覆盖飞书可能的限制性样式 */
      .lark-doc-content,
      .lark-doc-editor,
      .doc-content,
      .editor-content {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `;
    
    this.addStyles(overrideStyles);
  }

  /**
   * 拦截和替换限制性JavaScript函数
   */
  interceptRestrictiveFunctions() {
    console.log('飞书Plus: 拦截限制性JavaScript函数');
    
    try {
      // 保存原始函数
      const originalPreventDefault = Event.prototype.preventDefault;
      const originalStopPropagation = Event.prototype.stopPropagation;
      const originalStopImmediatePropagation = Event.prototype.stopImmediatePropagation;
      
      // 拦截preventDefault
      Event.prototype.preventDefault = function() {
        if (this.type === 'copy' || this.type === 'selectstart' || this.type === 'contextmenu') {
          console.log('飞书Plus: 阻止preventDefault调用', this.type);
          return; // 不执行preventDefault
        }
        return originalPreventDefault.call(this);
      };
      
      // 拦截stopPropagation
      Event.prototype.stopPropagation = function() {
        if (this.type === 'copy' || this.type === 'selectstart') {
          console.log('飞书Plus: 阻止stopPropagation调用', this.type);
          return; // 不执行stopPropagation
        }
        return originalStopPropagation.call(this);
      };
      
      // 保存原始函数引用以便后续恢复
      this.originalFunctions.set('preventDefault', originalPreventDefault);
      this.originalFunctions.set('stopPropagation', originalStopPropagation);
      this.originalFunctions.set('stopImmediatePropagation', originalStopImmediatePropagation);
      
      // 拦截可能的复制检查函数
      this.interceptCopyCheckFunctions();
      
    } catch (error) {
      console.error('飞书Plus: 函数拦截失败', error);
    }
  }

  /**
   * 拦截复制检查函数
   */
  interceptCopyCheckFunctions() {
    // 常见的复制检查函数名
    const copyCheckFunctions = [
      'checkCopyPermission',
      'canCopy',
      'isCopyAllowed',
      'validateCopy',
      'copyPermissionCheck'
    ];
    
    copyCheckFunctions.forEach(funcName => {
      if (window[funcName] && typeof window[funcName] === 'function') {
        const originalFunc = window[funcName];
        window[funcName] = function(...args) {
          console.log(`飞书Plus: 拦截复制检查函数 ${funcName}`);
          return true; // 总是返回允许复制
        };
        this.originalFunctions.set(funcName, originalFunc);
      }
    });
  }

  /**
   * 清理DOM属性
   */
  cleanupDOMAttributes() {
    console.log('飞书Plus: 清理DOM限制性属性');
    
    try {
      // 查找所有可能有限制性属性的元素
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(element => {
        // 移除unselectable属性
        if (element.hasAttribute('unselectable')) {
          element.removeAttribute('unselectable');
        }
        
        // 重置contenteditable
        if (element.getAttribute('contenteditable') === 'false') {
          // 不直接修改contenteditable，因为可能影响编辑功能
          // 只确保可以选择文本
          element.style.userSelect = 'text';
        }
        
        // 移除可能的限制性data属性
        const restrictiveDataAttrs = [
          'data-no-copy',
          'data-disable-select',
          'data-copy-disabled'
        ];
        
        restrictiveDataAttrs.forEach(attr => {
          if (element.hasAttribute(attr)) {
            element.removeAttribute(attr);
          }
        });
      });
      
    } catch (error) {
      console.error('飞书Plus: DOM属性清理失败', error);
    }
  }

  /**
   * 基础复制解锁方案（降级方案）
   */
  basicCopyUnlock() {
    console.log('飞书Plus: 执行基础复制解锁方案');
    
    // 简单的样式覆盖
    const basicStyles = `
      * { 
        user-select: text !important; 
        -webkit-user-select: text !important; 
      }
    `;
    this.addStyles(basicStyles);
    
    // 基础事件处理
    document.addEventListener('selectstart', (e) => {
      e.stopPropagation();
    }, true);
    
    // 注意：不要在这里阻止copy事件，让主处理函数处理
  }

  /**
   * 启用文本选择
   */
  enableTextSelection() {
    console.log('飞书Plus: 启用文本选择功能');
    
    try {
      // 1. 启用文本选择
      this.enableSelection();
      
      // 2. 设置复制事件处理器
      this.setupCopyHandler();
      
      // 3. 启用键盘快捷键
      this.enableKeyboardShortcuts();
      
      // 4. 设置右键菜单
      this.enableContextMenu();
      
      console.log('飞书Plus: 文本选择功能启用完成');
    } catch (error) {
      this.handleError(error, () => {
        console.log('飞书Plus: 使用基础文本选择方案');
        this.basicTextSelection();
      });
    }
  }

  /**
   * 启用文本选择
   */
  enableSelection() {
    console.log('飞书Plus: 启用文本选择');
    
    // 确保所有文本内容都可以选择
    const selectableStyles = `
      /* 飞书Plus - 启用文本选择 */
      .lark-doc-content *,
      .lark-doc-editor *,
      .doc-content *,
      .editor-content *,
      [data-testid*="doc"] *,
      [class*="doc"] *,
      [class*="editor"] * {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        cursor: text !important;
      }
      
      /* 保持按钮和控件的正常行为 */
      button, input, select, textarea,
      [role="button"], [role="menuitem"],
      .btn, .button, [class*="btn"] {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        cursor: pointer !important;
      }
      
      /* 选择高亮样式 */
      ::selection {
        background-color: #b3d4fc !important;
        color: #000 !important;
      }
      
      ::-moz-selection {
        background-color: #b3d4fc !important;
        color: #000 !important;
      }
    `;
    
    this.addStyles(selectableStyles);
    
    // 移除可能阻止选择的属性
    this.removeSelectionBlocks();
  }

  /**
   * 移除选择阻止
   */
  removeSelectionBlocks() {
    // 查找并处理可能阻止选择的元素
    const blockingSelectors = [
      '[onselectstart="return false"]',
      '[style*="user-select: none"]',
      '[style*="-webkit-user-select: none"]',
      '.no-select',
      '.unselectable'
    ];
    
    blockingSelectors.forEach(selector => {
      const elements = this.safeQuerySelectorAll(selector);
      elements.forEach(element => {
        // 移除内联样式中的user-select限制
        if (element.style.userSelect) {
          element.style.userSelect = 'text';
        }
        if (element.style.webkitUserSelect) {
          element.style.webkitUserSelect = 'text';
        }
        
        // 移除onselectstart属性
        if (element.hasAttribute('onselectstart')) {
          element.removeAttribute('onselectstart');
        }
        
        // 移除限制性类名
        element.classList.remove('no-select', 'unselectable');
      });
    });
  }

  /**
   * 设置复制事件处理器
   */
  setupCopyHandler() {
    console.log('飞书Plus: 设置复制事件处理器');
    
    // 监听复制事件
    document.addEventListener('copy', (event) => {
      this.handleCopyEvent(event);
    }, true);
    
    // 监听剪切事件
    document.addEventListener('cut', (event) => {
      this.handleCopyEvent(event);
    }, true);
  }

  /**
   * 处理复制事件
   */
  handleCopyEvent(event) {
    console.log('飞书Plus: 处理复制事件', event.type);
    
    try {
      // 获取当前选中的内容
      const selection = window.getSelection();
      
      if (!selection || selection.rangeCount === 0) {
        console.log('飞书Plus: 没有选中内容');
        return;
      }
      
      // 检查是否包含图片
      const hasImage = this.selectionContainsImage(selection);
      
      if (hasImage) {
        console.log('飞书Plus: 检测到图片复制');
        event.preventDefault();
        event.stopPropagation();
        this.handleImageCopy(event, selection);
        return;
      }
      
      const selectedText = selection.toString();
      if (!selectedText) {
        console.log('飞书Plus: 选中内容为空');
        return;
      }
      
      console.log('飞书Plus: 复制文本内容长度:', selectedText.length);
      
      // 让飞书的默认复制行为工作，但是清理HTML
      if (event && event.clipboardData) {
        // 获取HTML内容
        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);
        
        const plainText = selectedText;
        const htmlContent = tempDiv.innerHTML;
        
        console.log('飞书Plus: 原始HTML长度:', htmlContent.length);
        
        // 简单清理HTML - 只移除飞书专有属性
        const cleanHTML = this.simpleCleanHTML(htmlContent);
        
        console.log('飞书Plus: 清理后HTML长度:', cleanHTML.length);
        
        // 写入剪贴板
        event.clipboardData.setData('text/plain', plainText);
        event.clipboardData.setData('text/html', cleanHTML);
        
        event.preventDefault();
        console.log('飞书Plus: 剪贴板写入成功');
      }
      
      // 显示复制成功提示
      this.showCopySuccess(selectedText.length);
      
    } catch (error) {
      console.error('飞书Plus: 复制事件处理失败', error);
      this.handleError(error);
    }
  }

  /**
   * 写入剪贴板 - 简化版本
   */
  async writeToClipboard(selection, event) {
    // 这个函数现在在handleCopyEvent中直接处理了
    // 保留这个函数以防其他地方调用
    console.log('飞书Plus: writeToClipboard被调用，但处理已在handleCopyEvent中完成');
  }

  /**
   * 提取选中内容的完整数据
   */
  extractContentData(selection) {
    try {
      const range = selection.getRangeAt(0);
      const fragment = range.cloneContents();
      
      // 创建临时容器
      const tempContainer = document.createElement('div');
      tempContainer.appendChild(fragment.cloneNode(true));
      
      // 提取纯文本
      const plainText = selection.toString();
      
      // 提取HTML内容
      const rawHTML = tempContainer.innerHTML;
      
      // 分析内容结构
      const elementTypes = this.analyzeContentStructure(tempContainer);
      const hasFormatting = this.hasSignificantFormatting(tempContainer);
      
      // 处理飞书特有元素
      this.processFeishuElements(tempContainer);
      
      // 生成清理后的HTML
      const cleanHTML = this.cleanupHTMLForYuque(tempContainer.innerHTML);
      
      return {
        plainText: plainText,
        htmlContent: cleanHTML,
        rawHTML: rawHTML,
        hasFormatting: hasFormatting,
        elementTypes: elementTypes,
        container: tempContainer
      };
      
    } catch (error) {
      console.error('飞书Plus: 内容提取失败', error);
      return {
        plainText: selection.toString(),
        htmlContent: '',
        rawHTML: '',
        hasFormatting: false,
        elementTypes: [],
        container: null
      };
    }
  }

  /**
   * 分析内容结构
   */
  analyzeContentStructure(container) {
    const elementTypes = [];
    
    // 检查各种元素类型
    const elementChecks = {
      'lists': 'ul, ol, li',
      'headings': 'h1, h2, h3, h4, h5, h6',
      'formatting': 'strong, b, em, i, u, del, s',
      'code': 'code, pre',
      'links': 'a',
      'tables': 'table, tr, td, th',
      'images': 'img',
      'divs': 'div',
      'spans': 'span'
    };
    
    Object.entries(elementChecks).forEach(([type, selector]) => {
      const elements = container.querySelectorAll(selector);
      if (elements.length > 0) {
        elementTypes.push({
          type: type,
          count: elements.length
        });
      }
    });
    
    return elementTypes;
  }

  /**
   * 检查是否有重要格式
   */
  hasSignificantFormatting(container) {
    // 检查是否包含重要的格式元素
    const significantSelectors = [
      'ul', 'ol', 'li',           // 列表
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',  // 标题
      'strong', 'b', 'em', 'i',   // 基本格式
      'code', 'pre',              // 代码
      'table', 'tr', 'td',        // 表格
      'a[href]',                  // 链接
      '[style*="color"]',         // 颜色
      '[style*="background"]'     // 背景
    ];
    
    return significantSelectors.some(selector => 
      container.querySelectorAll(selector).length > 0
    );
  }

  /**
   * 使用现代剪贴板API写入富文本
   */
  async writeRichTextToClipboard(contentData) {
    try {
      const clipboardData = {};
      
      // 添加纯文本格式
      if (contentData.plainText) {
        clipboardData['text/plain'] = new Blob([contentData.plainText], { type: 'text/plain' });
      }
      
      // 添加HTML格式
      let htmlToWrite = contentData.htmlContent;
      
      // 如果没有HTML内容但有格式，创建基础HTML
      if (!htmlToWrite && contentData.hasFormatting) {
        htmlToWrite = this.createBasicHTML(contentData.plainText);
      }
      
      // 如果仍然没有HTML，创建简单的HTML包装
      if (!htmlToWrite) {
        htmlToWrite = `<div>${contentData.plainText}</div>`;
      }
      
      // 创建语雀友好的HTML
      const yuqueHTML = this.createYuqueFriendlyHTML(contentData);
      
      // 添加多种HTML格式以提高兼容性
      clipboardData['text/html'] = new Blob([yuqueHTML], { type: 'text/html' });
      
      // 添加语雀可能需要的其他格式
      try {
        // 尝试添加RTF格式（某些编辑器需要）
        const rtfContent = this.convertToRTF(contentData.plainText, contentData.formatInfo);
        if (rtfContent) {
          clipboardData['text/rtf'] = new Blob([rtfContent], { type: 'text/rtf' });
        }
      } catch (rtfError) {
        console.warn('飞书Plus: RTF格式生成失败', rtfError);
      }
      
      console.log('飞书Plus: 准备写入剪贴板（语雀优化）', {
        plainTextLength: contentData.plainText.length,
        originalHtmlLength: htmlToWrite.length,
        yuqueHtmlLength: yuqueHTML.length,
        hasFormatting: contentData.hasFormatting,
        clipboardFormats: Object.keys(clipboardData)
      });
      
      // 创建剪贴板项目
      const clipboardItem = new ClipboardItem(clipboardData);
      
      // 写入剪贴板
      await navigator.clipboard.write([clipboardItem]);
      console.log('飞书Plus: 富文本写入剪贴板成功（语雀兼容）');
      
      // 验证格式保持质量
      setTimeout(async () => {
        const isValid = await this.validateCopiedFormat(contentData);
        if (!isValid && contentData.hasFormatting) {
          console.warn('飞书Plus: 格式可能未完全保持');
        }
      }, 100);
      
    } catch (error) {
      console.error('飞书Plus: 富文本剪贴板写入失败', error);
      // 降级到纯文本
      try {
        await navigator.clipboard.writeText(contentData.plainText);
        console.log('飞书Plus: 降级到纯文本写入成功');
      } catch (fallbackError) {
        console.error('飞书Plus: 纯文本写入也失败', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * 转换为RTF格式（简单实现）
   */
  convertToRTF(plainText, formatInfo) {
    if (!formatInfo || !formatInfo.hasFormatting) {
      return null;
    }
    
    try {
      // 简单的RTF格式
      let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}';
      
      // 处理基本格式
      let formattedText = plainText;
      
      if (formatInfo.preservedStyles.includes('bold')) {
        formattedText = `\\b ${formattedText}\\b0`;
      }
      
      if (formatInfo.preservedStyles.includes('italic')) {
        formattedText = `\\i ${formattedText}\\i0`;
      }
      
      if (formatInfo.preservedStyles.includes('underline')) {
        formattedText = `\\ul ${formattedText}\\ul0`;
      }
      
      rtf += `\\f0\\fs24 ${formattedText}}`;
      
      return rtf;
    } catch (error) {
      console.warn('飞书Plus: RTF转换失败', error);
      return null;
    }
  }

  /**
   * 创建语雀专用HTML格式
   */
  createYuqueSpecificHTML(html, contentData) {
    console.log('飞书Plus: 创建语雀专用格式');
    
    // 语雀实际上更喜欢简单、干净的HTML
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    
    // 简化处理，只保留基本结构
    this.simplifyForYuque(wrapper);
    
    const yuqueHTML = wrapper.innerHTML;
    
    console.log('飞书Plus: 语雀HTML生成完成', yuqueHTML.substring(0, 200) + '...');
    
    return yuqueHTML;
  }

  /**
   * 为语雀简化HTML结构
   */
  simplifyForYuque(container) {
    console.log('飞书Plus: 简化HTML结构');
    
    // 1. 清理所有元素的属性，只保留最基本的
    const allElements = container.querySelectorAll('*');
    allElements.forEach(element => {
      // 保留的属性列表
      const keepAttributes = ['href']; // 只保留链接的href
      
      // 移除其他所有属性
      const attributesToRemove = [];
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        if (!keepAttributes.includes(attr.name)) {
          attributesToRemove.push(attr.name);
        }
      }
      
      attributesToRemove.forEach(attrName => {
        element.removeAttribute(attrName);
      });
    });
    
    // 2. 确保列表结构简洁
    this.simplifyLists(container);
    
    // 3. 确保段落结构简洁
    this.simplifyParagraphs(container);
  }

  /**
   * 简化列表结构
   */
  simplifyLists(container) {
    const lists = container.querySelectorAll('ul, ol');
    lists.forEach(list => {
      const items = list.querySelectorAll('li');
      items.forEach(item => {
        // 确保列表项只包含纯文本或基本格式
        const text = item.textContent.trim();
        if (text) {
          // 保持基本格式，但简化结构
          const innerHTML = item.innerHTML;
          // 只保留基本格式标签
          const cleanHTML = innerHTML
            .replace(/<(?!\/?(strong|b|em|i|u|del|s|a)\b)[^>]*>/gi, '') // 只保留基本格式标签
            .replace(/\s+/g, ' ')
            .trim();
          
          item.innerHTML = cleanHTML || text;
        }
      });
    });
  }

  /**
   * 简化段落结构
   */
  simplifyParagraphs(container) {
    const paragraphs = container.querySelectorAll('p, div');
    paragraphs.forEach(para => {
      // 如果段落为空，移除
      if (!para.textContent.trim()) {
        para.remove();
        return;
      }
      
      // 简化段落内容
      const innerHTML = para.innerHTML;
      const cleanHTML = innerHTML
        .replace(/<(?!\/?(strong|b|em|i|u|del|s|a)\b)[^>]*>/gi, '') // 只保留基本格式标签
        .replace(/\s+/g, ' ')
        .trim();
      
      para.innerHTML = cleanHTML;
    });
  }

  /**
   * 创建语雀可识别的格式
   */
  createYuqueRecognizableFormat(container, contentData) {
    console.log('飞书Plus: 创建语雀识别格式');
    
    // 语雀实际上更喜欢简单的HTML格式
    // 不需要复杂的data属性，使用标准HTML即可
    
    const processedContent = this.processContentForYuqueSimple(container);
    
    // 使用最简单的HTML格式
    return processedContent;
  }

  /**
   * 简化的语雀内容处理
   */
  processContentForYuqueSimple(container) {
    console.log('飞书Plus: 简化语雀内容处理');
    
    // 直接使用标准HTML，但确保结构清晰
    let html = container.innerHTML;
    
    // 清理和优化HTML
    html = this.cleanupHTMLForYuque(html);
    
    return html;
  }

  /**
   * 简单清理HTML - 只移除飞书专有属性
   */
  simpleCleanHTML(html) {
    console.log('🔍 === 飞书HTML完整分析 ===');
    console.log('📏 原始HTML长度:', html.length);
    console.log('📝 完整HTML结构:');
    console.log(html);
    console.log('🎯 前500字符预览:');
    console.log(html.substring(0, 500));
    console.log('🎯 后500字符预览:');
    console.log(html.substring(html.length - 500));
    console.log('===============================');
    
    // 只做最基本的清理，保持原有结构
    let cleanHTML = html;
    
    console.log('🧹 开始逐步清理...');
    
    // 记录每一步的效果
    const originalLength = cleanHTML.length;
    
    // 移除飞书专有的data属性
    cleanHTML = cleanHTML.replace(/\s*data-[^=]*="[^"]*"/g, '');
    console.log('📊 移除data-*属性后长度:', cleanHTML.length, '减少:', originalLength - cleanHTML.length);
    
    const afterData = cleanHTML.length;
    // 移除一些可能干扰的属性，但保持基本结构
    cleanHTML = cleanHTML.replace(/\s*contenteditable="[^"]*"/g, '');
    console.log('📊 移除contenteditable后长度:', cleanHTML.length, '减少:', afterData - cleanHTML.length);
    
    const afterContenteditable = cleanHTML.length;
    cleanHTML = cleanHTML.replace(/\s*spellcheck="[^"]*"/g, '');
    console.log('📊 移除spellcheck后长度:', cleanHTML.length, '减少:', afterContenteditable - cleanHTML.length);
    
    const afterSpellcheck = cleanHTML.length;
    // 清理一些明显的飞书特有class，但不是全部
    cleanHTML = cleanHTML.replace(/\s*class="[^"]*lark[^"]*"/g, '');
    console.log('📊 移除lark相关class后长度:', cleanHTML.length, '减少:', afterSpellcheck - cleanHTML.length);
    
    const afterLark = cleanHTML.length;
    cleanHTML = cleanHTML.replace(/\s*class="[^"]*doc[^"]*"/g, '');
    console.log('📊 移除doc相关class后长度:', cleanHTML.length, '减少:', afterLark - cleanHTML.length);
    
    console.log('✅ 清理完成！最终HTML长度:', cleanHTML.length);
    console.log('🎯 清理后前300字符:');
    console.log(cleanHTML.substring(0, 300));
    console.log('===============================');
    
    return cleanHTML;
  }

  /**
   * 转换飞书结构为标准HTML
   */
  convertFeishuStructureToStandard(html) {
    // 暂时直接返回清理后的HTML，避免复杂转换导致错误
    return html;
  }

  /**
          const code = document.createElement('code');
          code.textContent = line.content;
          li.appendChild(code);
        } else {
          li.textContent = line.content;
        }
        
        currentList.appendChild(li);
        
      } else if (line.type === 'paragraph') {
        // 处理段落
        currentList = null;
        currentListType = null;
        listStack = [];
        
        const p = document.createElement('p');
        
        // 检查是否是代码
        if (this.looksLikeCode(line.content)) {
          const code = document.createElement('code');
          code.textContent = line.content;
          p.appendChild(code);
        } else {
          p.textContent = line.content;
        }
        
        container.appendChild(p);
      }
    });
    
    console.log('飞书Plus: HTML构建完成，最终结构:', container.innerHTML.substring(0, 200) + '...');
  }

  /**
   * 判断内容是否看起来像代码
   */
  looksLikeCode(content) {
    // SQL关键词
    const sqlKeywords = ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'];
    
    // 编程语言特征
    const codePatterns = [
      /^[A-Z_]+\s*\*/, // SQL: SELECT *
      /=\s*['"][^'"]*['"]/, // 赋值语句
      /\w+\s*\([^)]*\)/, // 函数调用
      /^[a-zA-Z_]\w*\s*=/, // 变量赋值
      /[{}();]/, // 编程符号
      /^\s*\/\//, // 注释
      /^\s*#/, // 注释
      /\w+\.\w+/, // 对象属性
    ];
    
    // 检查SQL关键词
    const upperContent = content.toUpperCase();
    if (sqlKeywords.some(keyword => upperContent.includes(keyword))) {
      return true;
    }
    
    // 检查代码模式
    if (codePatterns.some(pattern => pattern.test(content))) {
      return true;
    }
    
    // 检查是否包含多个编程符号
    const programmingChars = content.match(/[=<>!&|+\-*/%(){}[\];,]/g);
    if (programmingChars && programmingChars.length >= 3) {
      return true;
    }
    
    return false;
  }

  /**
   * 转换飞书代码块
   */
  convertFeishuCodeBlocks(container) {
    // 查找可能的代码内容
    const allElements = container.querySelectorAll('*');
    
    allElements.forEach(element => {
      const text = element.textContent;
      
      // 检查是否包含代码特征
      if (text && (
        text.includes('SELECT') || 
        text.includes('FROM') || 
        text.includes('WHERE') ||
        text.includes('=') ||
        text.includes("'") ||
        /^[A-Z_]+\s*\*/.test(text) // SQL语句特征
      )) {
        // 如果文本看起来像代码，转换为code标签
        if (element.children.length === 0) { // 只处理叶子节点
          const code = document.createElement('code');
          code.textContent = text;
          element.innerHTML = '';
          element.appendChild(code);
        }
      }
    });
  }

  /**
   * 清理属性
   */
  cleanupAttributes(container) {
    const allElements = container.querySelectorAll('*');
    
    allElements.forEach(element => {
      // 移除所有属性除了基本的HTML属性
      const attributesToKeep = ['href', 'src', 'alt'];
      const attributesToRemove = [];
      
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        if (!attributesToKeep.includes(attr.name)) {
          attributesToRemove.push(attr.name);
        }
      }
      
      attributesToRemove.forEach(attrName => {
        element.removeAttribute(attrName);
      });
    });
  }

  /**
   * 后处理HTML
   */
  postProcessHTML(html) {
    // 移除空的div和span
    html = html.replace(/<div><\/div>/g, '');
    html = html.replace(/<span><\/span>/g, '');
    html = html.replace(/<div>\s*<\/div>/g, '');
    html = html.replace(/<span>\s*<\/span>/g, '');
    
    // 移除过度嵌套的div
    html = html.replace(/<div><div>/g, '<div>');
    html = html.replace(/<\/div><\/div>/g, '</div>');
    
    // 清理空白
    html = html.replace(/\s+/g, ' ');
    html = html.replace(/>\s+</g, '><');
    
    return html.trim();
  }

  /**
   * 为语雀处理内容
   */
  processContentForYuque(container) {
    let result = '';
    
    // 遍历所有子节点
    const children = Array.from(container.childNodes);
    
    children.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        // 文本节点
        const text = child.textContent.trim();
        if (text) {
          result += `<span>${text}</span>`;
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        // 元素节点
        result += this.convertElementForYuque(child);
      }
    });
    
    return result || container.innerHTML;
  }

  /**
   * 为语雀转换元素
   */
  convertElementForYuque(element) {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'p':
        return `<p data-lake-id="${this.generateLakeId()}">${element.innerHTML}</p>`;
        
      case 'ul':
        return this.convertListForYuque(element, 'unordered');
        
      case 'ol':
        return this.convertListForYuque(element, 'ordered');
        
      case 'strong':
      case 'b':
        return `<strong data-card-element="true">${element.innerHTML}</strong>`;
        
      case 'em':
      case 'i':
        return `<em data-card-element="true">${element.innerHTML}</em>`;
        
      case 'u':
        return `<u data-card-element="true">${element.innerHTML}</u>`;
        
      case 'del':
      case 's':
        return `<del data-card-element="true">${element.innerHTML}</del>`;
        
      case 'a':
        const href = element.href || element.getAttribute('href') || '#';
        return `<a href="${href}" data-card-element="true">${element.innerHTML}</a>`;
        
      case 'code':
        if (element.parentNode.tagName === 'PRE') {
          return `<pre data-lake-card="codeblock"><code>${element.innerHTML}</code></pre>`;
        } else {
          return `<code data-card-element="true">${element.innerHTML}</code>`;
        }
        
      default:
        return `<span>${element.innerHTML}</span>`;
    }
  }

  /**
   * 为语雀转换列表
   */
  convertListForYuque(listElement, type) {
    const lakeId = this.generateLakeId();
    const items = Array.from(listElement.querySelectorAll('li'));
    
    let listHTML = `<${listElement.tagName.toLowerCase()} data-lake-card="list" data-lake-id="${lakeId}" data-list-type="${type}">`;
    
    items.forEach((item, index) => {
      const itemId = this.generateLakeId();
      const itemContent = item.innerHTML || item.textContent;
      
      listHTML += `<li data-lake-id="${itemId}" data-list-item="true">`;
      listHTML += `<span data-card-element="true">${itemContent}</span>`;
      listHTML += `</li>`;
    });
    
    listHTML += `</${listElement.tagName.toLowerCase()}>`;
    
    return listHTML;
  }

  /**
   * 生成语雀Lake ID
   */
  generateLakeId() {
    return 'lake-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 最终语雀优化
   */
  finalYuqueOptimization(container) {
    // 1. 确保列表格式正确
    this.fixListsForYuque(container);
    
    // 2. 优化段落结构
    this.optimizeParagraphsForYuque(container);
    
    // 3. 简化嵌套结构
    this.simplifyNestingForYuque(container);
    
    // 4. 添加必要的换行
    this.addLineBreaksForYuque(container);
  }

  /**
   * 修复列表格式（语雀专用）
   */
  fixListsForYuque(container) {
    const lists = container.querySelectorAll('ul, ol');
    lists.forEach(list => {
      // 确保列表有正确的结构
      const items = list.querySelectorAll('li');
      items.forEach((item, index) => {
        // 清理列表项内容
        const text = item.textContent.trim();
        if (text) {
          // 重新构建列表项
          item.innerHTML = text;
          
          // 为语雀添加特殊标记
          if (list.tagName === 'OL') {
            // 有序列表：确保有数字
            const number = index + 1;
            item.setAttribute('data-list-type', 'ordered');
            item.setAttribute('data-list-number', number.toString());
          } else {
            // 无序列表
            item.setAttribute('data-list-type', 'unordered');
          }
        }
      });
      
      // 为列表添加语雀识别标记
      list.setAttribute('data-yuque-list', 'true');
    });
  }

  /**
   * 优化段落结构（语雀）
   */
  optimizeParagraphsForYuque(container) {
    // 将div转换为p标签（语雀更好识别）
    const divs = container.querySelectorAll('div');
    divs.forEach(div => {
      if (this.shouldConvertToP(div)) {
        this.replaceTagName(div, 'p');
      }
    });
    
    // 确保段落有内容
    const paragraphs = container.querySelectorAll('p');
    paragraphs.forEach(p => {
      if (!p.textContent.trim()) {
        p.innerHTML = '<br>';
      }
    });
  }

  /**
   * 判断div是否应该转换为p
   */
  shouldConvertToP(div) {
    // 如果div只包含文本内容，转换为p
    const hasBlockChildren = Array.from(div.children).some(child => {
      const tagName = child.tagName.toLowerCase();
      return ['div', 'p', 'ul', 'ol', 'table', 'blockquote', 'pre'].includes(tagName);
    });
    
    return !hasBlockChildren && div.textContent.trim();
  }

  /**
   * 简化嵌套结构（语雀）
   */
  simplifyNestingForYuque(container) {
    // 移除不必要的嵌套div
    const nestedDivs = container.querySelectorAll('div > div');
    nestedDivs.forEach(innerDiv => {
      const outerDiv = innerDiv.parentNode;
      if (outerDiv.children.length === 1 && !outerDiv.textContent.trim().replace(innerDiv.textContent, '').trim()) {
        // 如果外层div只包含这一个内层div，合并它们
        outerDiv.innerHTML = innerDiv.innerHTML;
        // 复制内层div的属性
        Array.from(innerDiv.attributes).forEach(attr => {
          outerDiv.setAttribute(attr.name, attr.value);
        });
      }
    });
  }

  /**
   * 添加必要的换行（语雀）
   */
  addLineBreaksForYuque(container) {
    // 在块级元素之间添加换行，帮助语雀识别结构
    const blockElements = container.querySelectorAll('p, ul, ol, blockquote, pre, table');
    blockElements.forEach((element, index) => {
      if (index > 0) {
        // 在元素前添加换行符（通过文本节点）
        const prevElement = blockElements[index - 1];
        if (prevElement.nextSibling === element) {
          const textNode = document.createTextNode('\n');
          element.parentNode.insertBefore(textNode, element);
        }
      }
    });
  }

  /**
   * 创建基础HTML
   */
  createBasicHTML(plainText) {
    // 将纯文本转换为基础HTML，保持换行
    const lines = plainText.split('\n');
    if (lines.length > 1) {
      return lines.map(line => `<p>${line || '<br>'}</p>`).join('');
    } else {
      return `<span>${plainText}</span>`;
    }
  }

  /**
   * 写入到传统剪贴板数据
   */
  writeToClipboardData(clipboardData, contentData) {
    try {
      // 写入纯文本
      clipboardData.setData('text/plain', contentData.plainText);
      
      // 创建语雀友好的HTML
      const yuqueHTML = this.createYuqueFriendlyHTML(contentData);
      
      // 写入HTML格式
      clipboardData.setData('text/html', yuqueHTML);
      
      console.log('飞书Plus: HTML格式已写入剪贴板（语雀友好）', {
        plainTextLength: contentData.plainText.length,
        htmlLength: yuqueHTML.length,
        hasFormatting: contentData.hasFormatting
      });
      
    } catch (error) {
      console.error('飞书Plus: 传统剪贴板写入失败', error);
      // 至少确保纯文本能写入
      try {
        clipboardData.setData('text/plain', contentData.plainText);
      } catch (fallbackError) {
        console.error('飞书Plus: 纯文本写入也失败', fallbackError);
      }
    }
  }

  /**
   * 创建语雀友好的HTML
   */
  createYuqueFriendlyHTML(contentData) {
    console.log('飞书Plus: 创建语雀友好HTML');
    
    try {
      // 如果有容器，直接处理DOM结构
      if (contentData.container) {
        return this.processContainerForYuque(contentData.container);
      }
      
      // 如果有HTML内容，解析并处理
      if (contentData.htmlContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentData.htmlContent;
        return this.processContainerForYuque(tempDiv);
      }
      
      // 最后降级到纯文本处理
      return this.createHTMLFromPlainText(contentData.plainText);
      
    } catch (error) {
      console.error('飞书Plus: 创建语雀HTML失败', error);
      return `<p>${contentData.plainText}</p>`;
    }
  }

  /**
   * 处理容器内容为语雀格式
   */
  processContainerForYuque(container) {
    console.log('飞书Plus: 处理容器内容');
    
    // 克隆容器避免修改原始内容
    const clonedContainer = container.cloneNode(true);
    
    // 1. 清理飞书专有属性和样式
    this.cleanupFeishuAttributes(clonedContainer);
    
    // 2. 标准化列表结构
    this.standardizeLists(clonedContainer);
    
    // 3. 标准化代码块
    this.standardizeCodeBlocks(clonedContainer);
    
    // 4. 标准化格式元素
    this.standardizeFormatting(clonedContainer);
    
    // 5. 清理空元素和多余嵌套
    this.cleanupEmptyElements(clonedContainer);
    
    // 6. 生成最终HTML
    let finalHTML = clonedContainer.innerHTML;
    
    // 7. 后处理清理
    finalHTML = this.postProcessHTML(finalHTML);
    
    console.log('飞书Plus: 语雀HTML生成完成', finalHTML.substring(0, 200) + '...');
    
    return finalHTML;
  }

  /**
   * 清理飞书专有属性
   */
  cleanupFeishuAttributes(container) {
    const allElements = container.querySelectorAll('*');
    
    allElements.forEach(element => {
      // 移除飞书专有属性
      const attributesToRemove = [];
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        if (attr.name.startsWith('data-') || 
            attr.name === 'contenteditable' ||
            attr.name === 'spellcheck' ||
            attr.name.startsWith('aria-') ||
            attr.name === 'role') {
          attributesToRemove.push(attr.name);
        }
      }
      
      attributesToRemove.forEach(attrName => {
        element.removeAttribute(attrName);
      });
      
      // 清理class属性，只保留基本的
      if (element.className) {
        element.className = '';
      }
      
      // 清理style属性中的飞书特有样式
      if (element.style) {
        this.cleanupElementStyles(element);
      }
    });
  }

  /**
   * 清理元素样式
   */
  cleanupElementStyles(element) {
    // 保留的样式属性
    const keepStyles = ['color', 'background-color', 'font-weight', 'font-style', 'text-decoration'];
    const stylesToKeep = {};
    
    keepStyles.forEach(prop => {
      const value = element.style.getPropertyValue(prop);
      if (value) {
        stylesToKeep[prop] = value;
      }
    });
    
    // 清空所有样式
    element.removeAttribute('style');
    
    // 重新应用保留的样式
    Object.entries(stylesToKeep).forEach(([prop, value]) => {
      element.style.setProperty(prop, value);
    });
  }

  /**
   * 标准化列表结构
   */
  standardizeLists(container) {
    console.log('飞书Plus: 标准化列表结构');
    
    // 查找所有可能的列表容器
    const listContainers = container.querySelectorAll('div, ul, ol');
    
    listContainers.forEach(listContainer => {
      // 检查是否包含列表项
      const listItems = this.findListItems(listContainer);
      
      if (listItems.length > 0) {
        // 判断列表类型
        const isOrdered = this.isOrderedList(listItems);
        const newList = document.createElement(isOrdered ? 'ol' : 'ul');
        
        // 转换列表项
        listItems.forEach(item => {
          const li = document.createElement('li');
          li.innerHTML = this.extractListItemContent(item);
          newList.appendChild(li);
        });
        
        // 替换原始容器
        listContainer.parentNode.replaceChild(newList, listContainer);
      }
    });
  }

  /**
   * 查找列表项
   */
  findListItems(container) {
    const items = [];
    
    // 查找直接的li元素
    const directLis = container.querySelectorAll('li');
    if (directLis.length > 0) {
      return Array.from(directLis);
    }
    
    // 查找可能的列表项div
    const divs = container.querySelectorAll('div');
    divs.forEach(div => {
      const text = div.textContent.trim();
      // 检查是否像列表项
      if (/^\d+\.\s/.test(text) || /^[•·▪▫‣⁃-]\s/.test(text)) {
        items.push(div);
      }
    });
    
    return items;
  }

  /**
   * 判断是否为有序列表
   */
  isOrderedList(items) {
    if (items.length === 0) return false;
    
    // 检查第一个项目
    const firstText = items[0].textContent.trim();
    return /^\d+\.\s/.test(firstText);
  }

  /**
   * 提取列表项内容
   */
  extractListItemContent(item) {
    let content = item.innerHTML;
    
    // 如果是文本节点，处理列表标记
    if (item.tagName === 'DIV') {
      const text = item.textContent.trim();
      if (/^\d+\.\s/.test(text)) {
        content = text.replace(/^\d+\.\s/, '');
      } else if (/^[•·▪▫‣⁃-]\s/.test(text)) {
        content = text.replace(/^[•·▪▫‣⁃-]\s/, '');
      }
    }
    
    return content;
  }

  /**
   * 标准化代码块
   */
  standardizeCodeBlocks(container) {
    console.log('飞书Plus: 标准化代码块');
    
    // 查找代码相关元素
    const codeElements = container.querySelectorAll('code, pre, [class*="code"], [class*="highlight"]');
    
    codeElements.forEach(element => {
      // 如果是内联代码
      if (element.tagName === 'CODE' && element.parentNode.tagName !== 'PRE') {
        // 保持内联代码格式
        element.className = '';
        return;
      }
      
      // 如果是代码块
      if (element.tagName === 'PRE' || element.textContent.includes('\n')) {
        const codeContent = element.textContent;
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = codeContent;
        pre.appendChild(code);
        
        element.parentNode.replaceChild(pre, element);
      }
    });
  }

  /**
   * 标准化格式元素
   */
  standardizeFormatting(container) {
    // 标准化粗体
    const boldElements = container.querySelectorAll('b, [style*="font-weight: bold"], [style*="font-weight:bold"]');
    boldElements.forEach(element => {
      if (element.tagName !== 'STRONG') {
        const strong = document.createElement('strong');
        strong.innerHTML = element.innerHTML;
        element.parentNode.replaceChild(strong, element);
      }
    });
    
    // 标准化斜体
    const italicElements = container.querySelectorAll('i, [style*="font-style: italic"], [style*="font-style:italic"]');
    italicElements.forEach(element => {
      if (element.tagName !== 'EM') {
        const em = document.createElement('em');
        em.innerHTML = element.innerHTML;
        element.parentNode.replaceChild(em, element);
      }
    });
  }

  /**
   * 清理空元素
   */
  cleanupEmptyElements(container) {
    const emptyElements = container.querySelectorAll('div:empty, span:empty, p:empty');
    emptyElements.forEach(element => {
      element.remove();
    });
  }

  /**
   * 后处理HTML
   */
  postProcessHTML(html) {
    // 清理多余的空白
    html = html.replace(/\s+/g, ' ');
    html = html.replace(/>\s+</g, '><');
    
    // 确保列表项之间有适当的结构
    html = html.replace(/<\/li><li>/g, '</li>\n<li>');
    html = html.replace(/<\/ul><ul>/g, '</ul>\n<ul>');
    html = html.replace(/<\/ol><ol>/g, '</ol>\n<ol>');
    
    return html.trim();
  }

  /**
   * 从纯文本创建HTML
   */
  createHTMLFromPlainText(plainText) {
    const lines = plainText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return `<p>${plainText}</p>`;
    }
    
    let html = '';
    let inList = false;
    let listType = '';
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 检测有序列表
      if (/^\d+\.\s/.test(trimmedLine)) {
        if (!inList || listType !== 'ol') {
          if (inList) html += `</${listType}>`;
          html += '<ol>';
          inList = true;
          listType = 'ol';
        }
        const content = trimmedLine.replace(/^\d+\.\s/, '');
        html += `<li>${content}</li>`;
      }
      // 检测无序列表
      else if (/^[•·▪▫‣⁃-]\s/.test(trimmedLine)) {
        if (!inList || listType !== 'ul') {
          if (inList) html += `</${listType}>`;
          html += '<ul>';
          inList = true;
          listType = 'ul';
        }
        const content = trimmedLine.replace(/^[•·▪▫‣⁃-]\s/, '');
        html += `<li>${content}</li>`;
      }
      // 普通段落
      else {
        if (inList) {
          html += `</${listType}>`;
          inList = false;
          listType = '';
        }
        html += `<p>${trimmedLine}</p>`;
      }
    });
    
    // 关闭未关闭的列表
    if (inList) {
      html += `</${listType}>`;
    }
    
    return html || `<p>${plainText}</p>`;
  }

  /**
   * 带格式的降级复制方法
   */
  fallbackCopyMethodWithFormat(contentData) {
    try {
      // 如果有HTML格式，尝试创建富文本容器
      if (contentData.hasFormatting && contentData.htmlContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentData.htmlContent;
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-999999px';
        tempDiv.style.top = '-999999px';
        tempDiv.contentEditable = true;
        document.body.appendChild(tempDiv);
        
        // 选择内容
        const range = document.createRange();
        range.selectNodeContents(tempDiv);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // 尝试复制
        const successful = document.execCommand('copy');
        
        // 清理
        selection.removeAllRanges();
        document.body.removeChild(tempDiv);
        
        if (successful) {
          console.log('飞书Plus: 带格式的降级复制成功');
          return;
        }
      }
      
      // 降级到纯文本复制
      this.fallbackCopyMethod(contentData.plainText);
      
    } catch (error) {
      console.error('飞书Plus: 带格式的降级复制失败', error);
      this.fallbackCopyMethod(contentData.plainText);
    }
  }

  /**
   * 降级复制方法（纯文本）
   */
  fallbackCopyMethod(text) {
    try {
      // 创建临时文本区域
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      // 选择并复制
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        console.log('飞书Plus: 降级复制方法成功');
      } else {
        console.error('飞书Plus: 降级复制方法失败');
      }
      
    } catch (error) {
      console.error('飞书Plus: 降级复制方法异常', error);
    }
  }

  /**
   * 启用键盘快捷键
   */
  enableKeyboardShortcuts() {
    console.log('飞书Plus: 启用键盘快捷键');
    
    document.addEventListener('keydown', (event) => {
      // Ctrl+C 或 Cmd+C
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        console.log('飞书Plus: 检测到复制快捷键');
        
        // 确保事件不被阻止
        event.stopPropagation();
        
        // 触发复制
        setTimeout(() => {
          document.execCommand('copy');
        }, 0);
      }
      
      // Ctrl+A 或 Cmd+A (全选)
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        console.log('飞书Plus: 检测到全选快捷键');
        event.stopPropagation();
      }
      
    }, true);
  }

  /**
   * 启用右键菜单
   */
  enableContextMenu() {
    console.log('飞书Plus: 启用右键菜单');
    
    document.addEventListener('contextmenu', (event) => {
      // 确保右键菜单不被阻止
      event.stopPropagation();
      console.log('飞书Plus: 右键菜单已启用');
    }, true);
  }

  /**
   * 显示复制成功提示
   */
  showCopySuccess(textLength) {
    try {
      // 创建提示元素
      const notification = document.createElement('div');
      notification.textContent = `已复制 ${textLength} 个字符`;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        transition: opacity 0.3s;
      `;
      
      document.body.appendChild(notification);
      
      // 3秒后移除提示
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.opacity = '0';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, 3000);
      
    } catch (error) {
      console.warn('飞书Plus: 显示复制提示失败', error);
    }
  }

  /**
   * 显示调试信息
   */
  async showDebugInfo() {
    try {
      console.log('=== 飞书Plus 调试信息 ===');
      
      // 检查剪贴板内容
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        console.log('剪贴板格式类型:', items[0].types);
        
        for (const type of items[0].types) {
          const blob = await items[0].getType(type);
          const content = await blob.text();
          console.log(`${type} 内容:`, content.substring(0, 500) + (content.length > 500 ? '...' : ''));
        }
      }
      
      // 显示页面信息
      console.log('当前页面:', window.location.href);
      console.log('用户代理:', navigator.userAgent);
      
      alert('调试信息已输出到控制台，请按F12查看Console标签页');
      
    } catch (error) {
      console.error('飞书Plus: 调试信息获取失败', error);
      alert('调试信息获取失败，请查看控制台错误信息');
    }
  }

  /**
   * 验证复制成功
   */
  async verifyCopySuccess() {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipboardText = await navigator.clipboard.readText();
        console.log('飞书Plus: 剪贴板内容验证成功，长度:', clipboardText.length);
        return true;
      }
    } catch (error) {
      console.warn('飞书Plus: 无法验证剪贴板内容', error);
    }
    return false;
  }

  /**
   * 基础文本选择方案（降级方案）
   */
  basicTextSelection() {
    console.log('飞书Plus: 执行基础文本选择方案');
    
    // 基础样式
    const basicStyles = `
      * { 
        user-select: text !important; 
        -webkit-user-select: text !important; 
        cursor: text !important;
      }
      button, input, select { 
        user-select: none !important; 
        cursor: pointer !important; 
      }
    `;
    this.addStyles(basicStyles);
    
    // 基础复制处理
    document.addEventListener('copy', (e) => {
      e.stopPropagation();
      console.log('飞书Plus: 基础复制处理');
    }, true);
  }

  /**
   * 验证复制成功
   */
  async verifyCopySuccess() {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipboardText = await navigator.clipboard.readText();
        console.log('飞书Plus: 剪贴板内容验证成功，长度:', clipboardText.length);
        return true;
      }
    } catch (error) {
      console.warn('飞书Plus: 无法验证剪贴板内容', error);
    }
    return false;
  }

  /**
   * 基础文本选择方案（降级方案）
   */
  basicTextSelection() {
    console.log('飞书Plus: 执行基础文本选择方案');
    
    // 基础样式
    const basicStyles = `
      * { 
        user-select: text !important; 
        -webkit-user-select: text !important; 
        cursor: text !important;
      }
      button, input, select { 
        user-select: none !important; 
        cursor: pointer !important; 
      }
    `;
    this.addStyles(basicStyles);
    
    // 基础复制处理
    document.addEventListener('copy', (e) => {
      e.stopPropagation();
      console.log('飞书Plus: 基础复制处理');
    }, true);
  }

  /**
   * 查找原始元素
   */
  findOriginalElement(clonedElement) {
    // 尝试通过文本内容和标签名找到原始元素
    const text = clonedElement.textContent;
    const tagName = clonedElement.tagName;
    
    if (!text) return null;
    
    // 在文档中查找相同文本内容的元素
    const candidates = document.querySelectorAll(tagName);
    for (const candidate of candidates) {
      if (candidate.textContent === text) {
        return candidate;
      }
    }
    
    return null;
  }

  /**
   * 应用计算样式
   */
  applyComputedStyles(element, computedStyle) {
    const importantStyles = [
      'font-weight', 'font-style', 'text-decoration',
      'color', 'background-color', 'font-size', 'font-family'
    ];
    
    importantStyles.forEach(property => {
      const value = computedStyle.getPropertyValue(property);
      if (value && value !== 'initial' && value !== 'inherit') {
        // 检查是否是有意义的样式值
        if (this.isSignificantStyle(property, value)) {
          element.style.setProperty(property, value);
        }
      }
    });
  }

  /**
   * 判断是否是有意义的样式
   */
  isSignificantStyle(property, value) {
    switch (property) {
      case 'font-weight':
        return ['bold', '700', '800', '900'].some(v => value.includes(v));
      case 'font-style':
        return value.includes('italic');
      case 'text-decoration':
        return value.includes('underline') || value.includes('line-through');
      case 'color':
        return value !== 'rgb(0, 0, 0)' && value !== 'rgba(0, 0, 0, 1)';
      case 'background-color':
        return value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent';
      default:
        return true;
    }
  }

  /**
   * 提取HTML内容
   */
  extractHTMLContent(container) {
    console.log('飞书Plus: 提取HTML结构');
    
    try {
      // 克隆容器以避免修改原始内容
      const clonedContainer = container.cloneNode(true);
      
      // 处理飞书特有的元素和属性
      this.processFeishuElements(clonedContainer);
      
      // 提取内联样式
      this.extractInlineStyles(clonedContainer);
      
      // 转换为标准HTML格式
      const standardHTML = this.convertToStandardHTML(clonedContainer);
      
      return standardHTML;
      
    } catch (error) {
      console.error('飞书Plus: HTML提取失败', error);
      return container.innerHTML;
    }
  }

  /**
   * 处理飞书特有的元素
   */
  processFeishuElements(container) {
    console.log('飞书Plus: 处理飞书特有元素');
    
    // 处理飞书的文本格式元素
    const feishuElements = {
      // 飞书的粗体元素
      '[data-type="bold"]': 'strong',
      '.lark-text-bold': 'strong',
      
      // 飞书的斜体元素
      '[data-type="italic"]': 'em',
      '.lark-text-italic': 'em',
      
      // 飞书的下划线元素
      '[data-type="underline"]': 'u',
      '.lark-text-underline': 'u',
      
      // 飞书的删除线元素
      '[data-type="strikethrough"]': 'del',
      '.lark-text-strikethrough': 'del',
      
      // 飞书的代码元素
      '[data-type="code"]': 'code',
      '.lark-text-code': 'code',
      
      // 飞书的链接元素
      '[data-type="link"]': 'a',
      '.lark-link': 'a'
    };
    
    Object.entries(feishuElements).forEach(([selector, tagName]) => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(element => {
        this.convertElementTag(element, tagName);
      });
    });
    
    // 特别处理飞书的列表结构
    this.processFeishuListsAdvanced(container);
    
    // 处理飞书的表格元素
    this.processFeishuTables(container);
    
    // 处理飞书的标题元素
    this.processFeishuHeadings(container);
  }

  /**
   * 高级飞书列表处理
   */
  processFeishuListsAdvanced(container) {
    console.log('飞书Plus: 高级列表处理');
    
    // 查找飞书列表的多种可能结构
    const listSelectors = [
      '.lark-list',
      '[data-type="list"]',
      '.doc-list',
      '[role="list"]',
      '.lark-doc-list',
      '[data-list-type]'
    ];
    
    listSelectors.forEach(selector => {
      const lists = container.querySelectorAll(selector);
      lists.forEach(list => {
        this.convertFeishuListAdvanced(list);
      });
    });
    
    // 处理可能的嵌套列表项
    this.processNestedListItems(container);
  }

  /**
   * 高级飞书列表转换
   */
  convertFeishuListAdvanced(listElement) {
    try {
      console.log('飞书Plus: 转换列表元素', listElement);
      
      // 判断列表类型
      const isOrdered = listElement.classList.contains('ordered') || 
                       listElement.getAttribute('data-list-type') === 'ordered' ||
                       listElement.querySelector('[data-list-type="ordered"]');
      
      const newList = document.createElement(isOrdered ? 'ol' : 'ul');
      
      // 查找列表项的多种可能选择器
      const itemSelectors = [
        '.lark-list-item',
        '[data-type="list-item"]',
        '.doc-list-item',
        '[role="listitem"]',
        '.lark-doc-list-item',
        'li'
      ];
      
      let items = [];
      
      // 尝试不同的选择器找到列表项
      for (const selector of itemSelectors) {
        const foundItems = listElement.querySelectorAll(selector);
        if (foundItems.length > 0) {
          items = Array.from(foundItems);
          break;
        }
      }
      
      // 如果没找到标准列表项，尝试查找包含文本的子元素
      if (items.length === 0) {
        const children = Array.from(listElement.children);
        items = children.filter(child => child.textContent.trim());
      }
      
      console.log('飞书Plus: 找到列表项', items.length);
      
      // 转换列表项
      items.forEach((item, index) => {
        const li = document.createElement('li');
        
        // 提取文本内容，保持格式
        if (item.tagName === 'LI') {
          li.innerHTML = item.innerHTML;
        } else {
          li.innerHTML = item.innerHTML || item.textContent;
        }
        
        // 清理列表项内容
        this.cleanupListItem(li);
        
        newList.appendChild(li);
      });
      
      // 替换原列表
      if (items.length > 0) {
        listElement.parentNode.replaceChild(newList, listElement);
        console.log('飞书Plus: 列表转换完成');
      }
      
    } catch (error) {
      console.warn('飞书Plus: 高级列表转换失败', error);
    }
  }

  /**
   * 清理列表项内容
   */
  cleanupListItem(li) {
    // 移除可能的编号前缀（如"1. "、"• "等）
    let text = li.textContent;
    
    // 移除常见的列表前缀
    text = text.replace(/^\d+\.\s*/, ''); // 移除 "1. "
    text = text.replace(/^[•·▪▫‣⁃]\s*/, ''); // 移除项目符号
    text = text.replace(/^[-*+]\s*/, ''); // 移除 "- " 或 "* "
    
    if (text !== li.textContent) {
      li.textContent = text;
    }
  }

  /**
   * 处理嵌套列表项
   */
  processNestedListItems(container) {
    // 查找可能的嵌套结构
    const nestedItems = container.querySelectorAll('li li, .list-item .list-item');
    nestedItems.forEach(nestedItem => {
      // 确保嵌套列表有正确的结构
      const parentLi = nestedItem.closest('li');
      if (parentLi && parentLi !== nestedItem) {
        // 创建嵌套列表
        let nestedList = parentLi.querySelector('ul, ol');
        if (!nestedList) {
          nestedList = document.createElement('ul');
          parentLi.appendChild(nestedList);
        }
        nestedList.appendChild(nestedItem);
      }
    });
  }

  /**
   * 处理飞书标题
   */
  processFeishuHeadings(container) {
    const headingSelectors = [
      '[data-type="heading"]',
      '.lark-heading',
      '.doc-heading'
    ];
    
    headingSelectors.forEach(selector => {
      const headings = container.querySelectorAll(selector);
      headings.forEach(heading => {
        // 根据级别转换为对应的h标签
        const level = heading.getAttribute('data-level') || 
                     heading.getAttribute('data-heading-level') || '1';
        const hTag = `h${Math.min(parseInt(level), 6)}`;
        this.convertElementTag(heading, hTag);
      });
    });
  }

  /**
   * 转换元素标签
   */
  convertElementTag(element, newTagName) {
    try {
      const newElement = document.createElement(newTagName);
      
      // 复制内容
      newElement.innerHTML = element.innerHTML;
      
      // 复制重要属性
      if (newTagName === 'a' && element.href) {
        newElement.href = element.href;
      }
      
      // 复制样式
      const computedStyle = window.getComputedStyle(element);
      this.copyImportantStyles(computedStyle, newElement);
      
      // 替换元素
      element.parentNode.replaceChild(newElement, element);
      
    } catch (error) {
      console.warn('飞书Plus: 元素标签转换失败', error);
    }
  }

  /**
   * 处理飞书列表
   */
  processFeishuLists(container) {
    // 查找飞书的列表容器
    const listSelectors = [
      '.lark-list',
      '[data-type="list"]',
      '.doc-list',
      '[role="list"]'
    ];
    
    listSelectors.forEach(selector => {
      const lists = container.querySelectorAll(selector);
      lists.forEach(list => {
        this.convertFeishuList(list);
      });
    });
  }

  /**
   * 转换飞书列表为标准HTML列表
   */
  convertFeishuList(listElement) {
    try {
      // 判断列表类型
      const isOrdered = listElement.classList.contains('ordered') || 
                       listElement.getAttribute('data-list-type') === 'ordered';
      
      const newList = document.createElement(isOrdered ? 'ol' : 'ul');
      
      // 查找列表项
      const itemSelectors = [
        '.lark-list-item',
        '[data-type="list-item"]',
        '.doc-list-item',
        '[role="listitem"]'
      ];
      
      let items = [];
      itemSelectors.forEach(selector => {
        const foundItems = listElement.querySelectorAll(selector);
        if (foundItems.length > 0) {
          items = Array.from(foundItems);
        }
      });
      
      // 转换列表项
      items.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = item.innerHTML;
        newList.appendChild(li);
      });
      
      // 替换原列表
      if (items.length > 0) {
        listElement.parentNode.replaceChild(newList, listElement);
      }
      
    } catch (error) {
      console.warn('飞书Plus: 列表转换失败', error);
    }
  }

  /**
   * 处理飞书表格
   */
  processFeishuTables(container) {
    const tableSelectors = [
      '.lark-table',
      '[data-type="table"]',
      '.doc-table',
      'table'
    ];
    
    tableSelectors.forEach(selector => {
      const tables = container.querySelectorAll(selector);
      tables.forEach(table => {
        this.processFeishuTable(table);
      });
    });
  }

  /**
   * 处理单个飞书表格
   */
  processFeishuTable(tableElement) {
    try {
      // 如果已经是标准table元素，只需要清理
      if (tableElement.tagName.toLowerCase() === 'table') {
        this.cleanupTableStyles(tableElement);
        return;
      }
      
      // 转换为标准table结构
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      
      // 查找行元素
      const rowSelectors = [
        '.lark-table-row',
        '[data-type="table-row"]',
        '.table-row'
      ];
      
      let rows = [];
      rowSelectors.forEach(selector => {
        const foundRows = tableElement.querySelectorAll(selector);
        if (foundRows.length > 0) {
          rows = Array.from(foundRows);
        }
      });
      
      // 转换行
      rows.forEach(row => {
        const tr = document.createElement('tr');
        
        // 查找单元格
        const cellSelectors = [
          '.lark-table-cell',
          '[data-type="table-cell"]',
          '.table-cell'
        ];
        
        let cells = [];
        cellSelectors.forEach(selector => {
          const foundCells = row.querySelectorAll(selector);
          if (foundCells.length > 0) {
            cells = Array.from(foundCells);
          }
        });
        
        // 转换单元格
        cells.forEach(cell => {
          const td = document.createElement('td');
          td.innerHTML = cell.innerHTML;
          tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
      });
      
      table.appendChild(tbody);
      
      // 替换原表格
      if (rows.length > 0) {
        tableElement.parentNode.replaceChild(table, tableElement);
      }
      
    } catch (error) {
      console.warn('飞书Plus: 表格转换失败', error);
    }
  }

  /**
   * 清理表格样式
   */
  cleanupTableStyles(table) {
    // 添加基本的表格样式
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    
    // 处理单元格
    const cells = table.querySelectorAll('td, th');
    cells.forEach(cell => {
      cell.style.border = '1px solid #ddd';
      cell.style.padding = '8px';
    });
  }

  /**
   * 提取内联样式
   */
  extractInlineStyles(container) {
    const elements = container.querySelectorAll('*');
    
    elements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      this.preserveImportantStyles(element, computedStyle);
    });
  }

  /**
   * 保持重要样式
   */
  preserveImportantStyles(element, computedStyle) {
    const importantStyles = {
      'font-weight': ['bold', '700', '800', '900'],
      'font-style': ['italic'],
      'text-decoration': ['underline', 'line-through'],
      'color': null, // 保持所有颜色
      'background-color': null, // 保持所有背景色
      'font-size': null, // 保持字体大小
      'font-family': null // 保持字体族
    };
    
    Object.entries(importantStyles).forEach(([property, values]) => {
      const styleValue = computedStyle.getPropertyValue(property);
      
      if (styleValue && styleValue !== 'initial' && styleValue !== 'inherit') {
        if (values === null || values.some(val => styleValue.includes(val))) {
          element.style.setProperty(property, styleValue);
        }
      }
    });
  }

  /**
   * 复制重要样式
   */
  copyImportantStyles(computedStyle, targetElement) {
    const stylesToCopy = [
      'font-weight', 'font-style', 'text-decoration',
      'color', 'background-color', 'font-size', 'font-family'
    ];
    
    stylesToCopy.forEach(property => {
      const value = computedStyle.getPropertyValue(property);
      if (value && value !== 'initial' && value !== 'inherit') {
        targetElement.style.setProperty(property, value);
      }
    });
  }

  /**
   * 转换为标准HTML格式
   */
  convertToStandardHTML(container) {
    // 移除飞书特有的属性和类名
    const elementsToClean = container.querySelectorAll('*');
    
    elementsToClean.forEach(element => {
      // 移除飞书特有的属性
      const feishuAttrs = [
        'data-type', 'data-id', 'data-token',
        'data-lark-id', 'data-doc-id'
      ];
      
      feishuAttrs.forEach(attr => {
        element.removeAttribute(attr);
      });
      
      // 移除飞书特有的类名
      const classList = Array.from(element.classList);
      classList.forEach(className => {
        if (className.startsWith('lark-') || 
            className.startsWith('doc-') ||
            className.includes('feishu')) {
          element.classList.remove(className);
        }
      });
      
      // 如果没有类名了，移除class属性
      if (element.classList.length === 0) {
        element.removeAttribute('class');
      }
    });
    
    return container.innerHTML;
  }

  /**
   * 清理HTML内容
   */
  cleanupHTML(html) {
    if (!html) return '';
    
    // 移除空的样式属性
    html = html.replace(/\s*style\s*=\s*["'][^"']*["']/g, (match) => {
      const styleContent = match.match(/["']([^"']*)["']/);
      if (styleContent && styleContent[1].trim()) {
        return match;
      }
      return '';
    });
    
    // 移除空的元素（但保留有意义的空元素如br）
    html = html.replace(/<(\w+)[^>]*>\s*<\/\1>/g, (match, tag) => {
      const meaningfulEmptyTags = ['br', 'hr', 'img', 'input'];
      return meaningfulEmptyTags.includes(tag.toLowerCase()) ? match : '';
    });
    
    // 清理多余的空白
    html = html.replace(/\s+/g, ' ').trim();
    
    return html;
  }

  /**
   * 分析格式信息
   */
  analyzeFormatInfo(container) {
    const formatInfo = {
      hasFormatting: false,
      preservedStyles: [],
      elements: {
        bold: 0,
        italic: 0,
        underline: 0,
        strikethrough: 0,
        links: 0,
        lists: 0,
        tables: 0
      }
    };
    
    // 检查格式元素
    const formatElements = {
      'strong, b, [style*="font-weight"]': 'bold',
      'em, i, [style*="font-style: italic"]': 'italic',
      'u, [style*="text-decoration: underline"]': 'underline',
      's, strike, [style*="text-decoration: line-through"]': 'strikethrough',
      'a[href]': 'links',
      'ul, ol': 'lists',
      'table': 'tables'
    };
    
    Object.entries(formatElements).forEach(([selector, type]) => {
      const elements = container.querySelectorAll(selector);
      if (elements.length > 0) {
        formatInfo.hasFormatting = true;
        formatInfo.elements[type] = elements.length;
        formatInfo.preservedStyles.push(type);
      }
    });
    
    // 检查颜色和背景
    const styledElements = container.querySelectorAll('[style]');
    styledElements.forEach(element => {
      const style = element.getAttribute('style');
      if (style.includes('color:') || style.includes('background')) {
        formatInfo.hasFormatting = true;
        if (!formatInfo.preservedStyles.includes('color')) {
          formatInfo.preservedStyles.push('color');
        }
      }
    });
    
    console.log('飞书Plus: 格式分析结果', formatInfo);
    return formatInfo;
  }

  /**
   * 格式保持增强功能
   */
  
  /**
   * 优化HTML格式以提高兼容性（专门针对语雀）
   */
  optimizeHTMLForCompatibility(html) {
    if (!html) return '';
    
    try {
      // 创建临时容器
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // 转换为语雀兼容的格式
      this.convertToYuqueFormat(tempDiv);
      
      // 转换为更兼容的格式
      this.convertToCompatibleFormat(tempDiv);
      
      // 添加必要的样式
      this.addCompatibilityStyles(tempDiv);
      
      // 清理无效标签
      this.cleanupInvalidTags(tempDiv);
      
      return tempDiv.innerHTML;
      
    } catch (error) {
      console.error('飞书Plus: HTML优化失败', error);
      return html;
    }
  }

  /**
   * 转换为语雀兼容格式
   */
  convertToYuqueFormat(container) {
    console.log('飞书Plus: 转换为语雀兼容格式');
    
    // 语雀支持的标签和格式
    const yuqueCompatibleTags = {
      // 基础格式
      'strong': 'strong',
      'b': 'strong',
      'em': 'em', 
      'i': 'em',
      'u': 'u',
      's': 'del',
      'strike': 'del',
      'del': 'del',
      
      // 标题
      'h1': 'h1',
      'h2': 'h2', 
      'h3': 'h3',
      'h4': 'h4',
      'h5': 'h5',
      'h6': 'h6',
      
      // 列表
      'ul': 'ul',
      'ol': 'ol',
      'li': 'li',
      
      // 其他
      'p': 'p',
      'br': 'br',
      'a': 'a',
      'code': 'code',
      'pre': 'pre',
      'blockquote': 'blockquote'
    };
    
    // 转换不兼容的标签
    const allElements = container.querySelectorAll('*');
    allElements.forEach(element => {
      const tagName = element.tagName.toLowerCase();
      
      if (yuqueCompatibleTags[tagName]) {
        // 如果需要转换标签名
        if (yuqueCompatibleTags[tagName] !== tagName) {
          this.replaceTagName(element, yuqueCompatibleTags[tagName]);
        }
      } else {
        // 不支持的标签转换为span或div
        const isBlock = this.isBlockElement(tagName);
        this.replaceTagName(element, isBlock ? 'div' : 'span');
      }
    });
    
    // 处理语雀特殊格式要求
    this.handleYuqueSpecialFormats(container);
  }

  /**
   * 替换标签名
   */
  replaceTagName(element, newTagName) {
    try {
      const newElement = document.createElement(newTagName);
      
      // 复制内容
      newElement.innerHTML = element.innerHTML;
      
      // 复制属性
      Array.from(element.attributes).forEach(attr => {
        if (attr.name !== 'class' || this.isValidClass(attr.value)) {
          newElement.setAttribute(attr.name, attr.value);
        }
      });
      
      // 复制样式
      if (element.style.cssText) {
        newElement.style.cssText = element.style.cssText;
      }
      
      // 替换元素
      element.parentNode.replaceChild(newElement, element);
      
    } catch (error) {
      console.warn('飞书Plus: 标签替换失败', error);
    }
  }

  /**
   * 判断是否为块级元素
   */
  isBlockElement(tagName) {
    const blockElements = [
      'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'table', 'tr', 'td', 'th'
    ];
    return blockElements.includes(tagName);
  }

  /**
   * 判断是否为有效的CSS类名
   */
  isValidClass(className) {
    // 移除飞书特有的类名
    const invalidClasses = [
      'lark-', 'doc-', 'feishu-', 'suite-'
    ];
    
    return !invalidClasses.some(prefix => className.includes(prefix));
  }

  /**
   * 处理语雀特殊格式要求
   */
  handleYuqueSpecialFormats(container) {
    // 1. 处理列表格式
    this.optimizeListsForYuque(container);
    
    // 2. 处理链接格式
    this.optimizeLinksForYuque(container);
    
    // 3. 处理代码块格式
    this.optimizeCodeForYuque(container);
    
    // 4. 处理表格格式
    this.optimizeTablesForYuque(container);
  }

  /**
   * 优化列表格式（语雀）
   */
  optimizeListsForYuque(container) {
    const lists = container.querySelectorAll('ul, ol');
    lists.forEach(list => {
      // 确保列表项格式正确
      const items = list.querySelectorAll('li');
      items.forEach(item => {
        // 移除可能影响语雀识别的属性
        item.removeAttribute('data-list-type');
        item.removeAttribute('data-indent');
        
        // 确保列表项内容格式简洁
        if (item.children.length === 1 && item.children[0].tagName === 'P') {
          // 将p标签内容提取到li中
          const p = item.children[0];
          item.innerHTML = p.innerHTML;
        }
      });
    });
  }

  /**
   * 优化链接格式（语雀）
   */
  optimizeLinksForYuque(container) {
    const links = container.querySelectorAll('a');
    links.forEach(link => {
      // 确保链接有href属性
      if (!link.href && link.getAttribute('href')) {
        link.href = link.getAttribute('href');
      }
      
      // 移除可能影响的属性
      link.removeAttribute('target');
      link.removeAttribute('rel');
    });
  }

  /**
   * 优化代码格式（语雀）
   */
  optimizeCodeForYuque(container) {
    // 内联代码
    const inlineCodes = container.querySelectorAll('code');
    inlineCodes.forEach(code => {
      if (code.parentNode.tagName !== 'PRE') {
        // 确保内联代码格式简洁
        code.removeAttribute('class');
        code.removeAttribute('style');
      }
    });
    
    // 代码块
    const preBlocks = container.querySelectorAll('pre');
    preBlocks.forEach(pre => {
      // 语雀代码块格式
      pre.removeAttribute('class');
      const code = pre.querySelector('code');
      if (code) {
        code.removeAttribute('class');
      }
    });
  }

  /**
   * 优化表格格式（语雀）
   */
  optimizeTablesForYuque(container) {
    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
      // 简化表格结构
      table.removeAttribute('class');
      table.removeAttribute('style');
      
      // 确保有tbody
      if (!table.querySelector('tbody')) {
        const tbody = document.createElement('tbody');
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          tbody.appendChild(row);
        });
        table.appendChild(tbody);
      }
      
      // 清理单元格
      const cells = table.querySelectorAll('td, th');
      cells.forEach(cell => {
        cell.removeAttribute('class');
        // 保留基本样式
        const style = cell.getAttribute('style');
        if (style) {
          const cleanStyle = this.cleanStyleForYuque(style);
          if (cleanStyle) {
            cell.setAttribute('style', cleanStyle);
          } else {
            cell.removeAttribute('style');
          }
        }
      });
    });
  }

  /**
   * 清理样式（语雀兼容）
   */
  cleanStyleForYuque(styleText) {
    const allowedStyles = [
      'color', 'background-color', 'font-weight', 'font-style', 
      'text-decoration', 'font-size', 'text-align'
    ];
    
    const styles = styleText.split(';').filter(style => {
      const property = style.split(':')[0]?.trim();
      return allowedStyles.includes(property);
    });
    
    return styles.join('; ');
  }

  /**
   * 转换为兼容格式
   */
  convertToCompatibleFormat(container) {
    // 转换新HTML5标签为传统标签
    const tagConversions = {
      'mark': 'span',
      'time': 'span',
      'article': 'div',
      'section': 'div',
      'aside': 'div',
      'header': 'div',
      'footer': 'div',
      'nav': 'div'
    };
    
    Object.entries(tagConversions).forEach(([oldTag, newTag]) => {
      const elements = container.querySelectorAll(oldTag);
      elements.forEach(element => {
        const newElement = document.createElement(newTag);
        newElement.innerHTML = element.innerHTML;
        
        // 复制属性
        Array.from(element.attributes).forEach(attr => {
          newElement.setAttribute(attr.name, attr.value);
        });
        
        element.parentNode.replaceChild(newElement, element);
      });
    });
  }

  /**
   * 添加兼容性样式
   */
  addCompatibilityStyles(container) {
    // 为特殊元素添加必要的样式
    const specialElements = container.querySelectorAll('code, pre, blockquote');
    
    specialElements.forEach(element => {
      const tagName = element.tagName.toLowerCase();
      
      switch (tagName) {
        case 'code':
          element.style.fontFamily = 'monospace';
          element.style.backgroundColor = '#f5f5f5';
          element.style.padding = '2px 4px';
          element.style.borderRadius = '3px';
          break;
          
        case 'pre':
          element.style.fontFamily = 'monospace';
          element.style.backgroundColor = '#f5f5f5';
          element.style.padding = '10px';
          element.style.borderRadius = '5px';
          element.style.whiteSpace = 'pre-wrap';
          break;
          
        case 'blockquote':
          element.style.borderLeft = '4px solid #ddd';
          element.style.paddingLeft = '16px';
          element.style.margin = '16px 0';
          element.style.fontStyle = 'italic';
          break;
      }
    });
  }

  /**
   * 清理无效标签
   */
  cleanupInvalidTags(container) {
    // 移除可能导致问题的标签
    const problematicTags = ['script', 'style', 'link', 'meta', 'title'];
    
    problematicTags.forEach(tag => {
      const elements = container.querySelectorAll(tag);
      elements.forEach(element => {
        element.remove();
      });
    });
    
    // 清理空的格式标签
    const formatTags = ['strong', 'em', 'u', 's', 'b', 'i'];
    formatTags.forEach(tag => {
      const elements = container.querySelectorAll(tag);
      elements.forEach(element => {
        if (!element.textContent.trim()) {
          element.remove();
        }
      });
    });
  }

  /**
   * 验证复制的格式是否正确保持
   */
  async validateCopiedFormat(originalContentData) {
    try {
      // 尝试读取剪贴板内容进行验证
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        
        for (const item of clipboardItems) {
          // 检查是否包含HTML格式
          if (item.types.includes('text/html')) {
            const htmlBlob = await item.getType('text/html');
            const htmlText = await htmlBlob.text();
            
            console.log('飞书Plus: 剪贴板HTML内容验证', {
              originalHasFormat: originalContentData.hasFormatting,
              clipboardHasHTML: htmlText.length > 0,
              htmlLength: htmlText.length
            });
            
            return htmlText.length > 0;
          }
        }
      }
    } catch (error) {
      console.warn('飞书Plus: 无法验证剪贴板格式', error);
    }
    
    return false;
  }

  /**
   * 格式保持质量评估
   */
  assessFormatQuality(originalFormatInfo, copiedHTML) {
    const quality = {
      score: 0,
      issues: [],
      preserved: [],
      lost: []
    };
    
    if (!originalFormatInfo.hasFormatting) {
      quality.score = 100;
      return quality;
    }
    
    // 检查各种格式是否保持
    const formatChecks = {
      bold: /<(strong|b)[^>]*>/i,
      italic: /<(em|i)[^>]*>/i,
      underline: /<u[^>]*>/i,
      strikethrough: /<(s|strike)[^>]*>/i,
      links: /<a[^>]*href/i,
      lists: /<(ul|ol)[^>]*>/i,
      tables: /<table[^>]*>/i
    };
    
    let preservedCount = 0;
    const totalFormats = originalFormatInfo.preservedStyles.length;
    
    originalFormatInfo.preservedStyles.forEach(format => {
      if (formatChecks[format] && formatChecks[format].test(copiedHTML)) {
        quality.preserved.push(format);
        preservedCount++;
      } else {
        quality.lost.push(format);
        quality.issues.push(`${format}格式可能丢失`);
      }
    });
    
    quality.score = totalFormats > 0 ? Math.round((preservedCount / totalFormats) * 100) : 100;
    
    console.log('飞书Plus: 格式保持质量评估', quality);
    return quality;
  }

  /**
   * 监听页面变化 - 待实现
   */
  observePageChanges() {
    // 将在后续任务中实现
    console.log('飞书Plus: observePageChanges - 待实现');
  }

  /**
   * 图片复制处理功能
   */
  
  /**
   * 检查选中内容是否包含图片
   */
  selectionContainsImage(selection) {
    try {
      if (!selection.rangeCount) return false;
      
      const range = selection.getRangeAt(0);
      const fragment = range.cloneContents();
      
      // 检查是否包含img元素
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment);
      
      const images = tempDiv.querySelectorAll('img');
      return images.length > 0;
      
    } catch (error) {
      console.warn('飞书Plus: 图片检测失败', error);
      return false;
    }
  }

  /**
   * 处理图片复制
   */
  async handleImageCopy(event, selection) {
    console.log('飞书Plus: 开始处理图片复制');
    
    try {
      // 阻止默认复制行为
      event.preventDefault();
      event.stopPropagation();
      
      // 获取选中的图片元素
      const images = this.getSelectedImages(selection);
      
      if (images.length === 0) {
        console.log('飞书Plus: 未找到图片元素');
        return;
      }
      
      // 使用现代剪贴板API处理图片
      await this.copyImagesToClipboard(images);
      
      // 显示复制成功提示
      this.showImageCopySuccess(images.length);
      
    } catch (error) {
      console.error('飞书Plus: 图片复制失败', error);
      // 降级到传统方法
      try {
        await this.fallbackImageCopy(event, images);
        this.showImageCopySuccess(images.length);
      } catch (fallbackError) {
        console.error('飞书Plus: 降级图片复制也失败', fallbackError);
        this.handleError(fallbackError);
      }
    }
  }

  /**
   * 获取选中的图片元素
   */
  getSelectedImages(selection) {
    try {
      const range = selection.getRangeAt(0);
      const fragment = range.cloneContents();
      
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment);
      
      return Array.from(tempDiv.querySelectorAll('img'));
      
    } catch (error) {
      console.error('飞书Plus: 获取图片元素失败', error);
      return [];
    }
  }

  /**
   * 使用现代剪贴板API复制图片
   */
  async copyImagesToClipboard(images) {
    console.log('飞书Plus: 使用现代剪贴板API复制图片', images.length);
    
    try {
      // 检查是否支持现代剪贴板API
      if (!navigator.clipboard || !navigator.clipboard.write) {
        throw new Error('不支持现代剪贴板API');
      }
      
      // 创建剪贴板数据
      const clipboardItems = [];
      
      if (images.length === 1) {
        // 单个图片处理
        const clipboardItem = await this.createClipboardItemForImage(images[0]);
        if (clipboardItem) {
          clipboardItems.push(clipboardItem);
        }
      } else {
        // 多个图片处理 - 创建HTML格式
        const htmlContent = this.createMultiImageHTML(images);
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({
          'text/html': htmlBlob
        });
        clipboardItems.push(clipboardItem);
      }
      
      if (clipboardItems.length > 0) {
        await navigator.clipboard.write(clipboardItems);
        console.log('飞书Plus: 现代剪贴板API写入成功');
      }
      
    } catch (error) {
      console.error('飞书Plus: 现代剪贴板API失败', error);
      throw error;
    }
  }

  /**
   * 为单个图片创建剪贴板项
   */
  async createClipboardItemForImage(img) {
    try {
      const cleanHTML = this.createStandardImageHTML(img);
      const htmlBlob = new Blob([cleanHTML], { type: 'text/html' });
      
      const clipboardData = {
        'text/html': htmlBlob
      };
      
      // 尝试获取图片的二进制数据
      try {
        const imageBlob = await this.getImageAsBlob(img);
        if (imageBlob) {
          clipboardData[imageBlob.type] = imageBlob;
        }
      } catch (binaryError) {
        console.warn('飞书Plus: 获取图片二进制数据失败，仅使用HTML格式', binaryError);
      }
      
      return new ClipboardItem(clipboardData);
      
    } catch (error) {
      console.error('飞书Plus: 创建剪贴板项失败', error);
      return null;
    }
  }

  /**
   * 获取图片作为Blob
   */
  async getImageAsBlob(img) {
    return new Promise((resolve, reject) => {
      try {
        // 如果是data URL，直接转换
        if (img.src.startsWith('data:image/')) {
          const [header, data] = img.src.split(',');
          const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
          
          const byteCharacters = atob(data);
          const byteNumbers = new Array(byteCharacters.length);
          
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });
          resolve(blob);
          return;
        }
        
        // 对于网络图片，使用canvas转换
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 创建新的图片对象以避免跨域问题
        const newImg = new Image();
        newImg.crossOrigin = 'anonymous';
        
        newImg.onload = () => {
          try {
            canvas.width = newImg.naturalWidth || newImg.width || 300;
            canvas.height = newImg.naturalHeight || newImg.height || 200;
            
            ctx.drawImage(newImg, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas转换失败'));
              }
            }, 'image/png', 0.9);
          } catch (canvasError) {
            reject(canvasError);
          }
        };
        
        newImg.onerror = () => {
          reject(new Error('图片加载失败'));
        };
        
        newImg.src = img.src;
        
        // 设置超时
        setTimeout(() => {
          reject(new Error('图片加载超时'));
        }, 5000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 创建多图片HTML
   */
  createMultiImageHTML(images) {
    let htmlContent = '';
    images.forEach(img => {
      htmlContent += this.createStandardImageHTML(img) + '\n';
    });
    return htmlContent;
  }

  /**
   * 降级图片复制方法
   */
  async fallbackImageCopy(event, images) {
    console.log('飞书Plus: 使用降级图片复制方法');
    
    try {
      if (event.clipboardData) {
        // 使用传统的clipboardData API
        if (images.length === 1) {
          const cleanHTML = this.createStandardImageHTML(images[0]);
          event.clipboardData.setData('text/html', cleanHTML);
        } else {
          const htmlContent = this.createMultiImageHTML(images);
          event.clipboardData.setData('text/html', htmlContent);
        }
        console.log('飞书Plus: 降级方法写入成功');
      } else {
        throw new Error('无可用的剪贴板API');
      }
    } catch (error) {
      console.error('飞书Plus: 降级方法也失败', error);
      throw error;
    }
  }



  /**
   * 创建标准化的图片HTML
   */
  createStandardImageHTML(img) {
    // 移除飞书专有属性，只保留标准属性
    const src = img.src || img.getAttribute('src') || '';
    const alt = img.alt || img.getAttribute('alt') || '';
    const width = img.width || img.getAttribute('width') || '';
    const height = img.height || img.getAttribute('height') || '';
    
    let htmlImg = `<img src="${src}"`;
    
    if (alt) htmlImg += ` alt="${alt}"`;
    if (width) htmlImg += ` width="${width}"`;
    if (height) htmlImg += ` height="${height}"`;
    
    htmlImg += ' />';
    
    console.log('飞书Plus: 生成标准图片HTML', htmlImg);
    return htmlImg;
  }



  /**
   * 显示图片复制成功提示
   */
  showImageCopySuccess(imageCount) {
    try {
      // 创建提示元素
      const notification = document.createElement('div');
      notification.textContent = `已复制 ${imageCount} 张图片（语雀兼容格式）`;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #007bff;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        transition: opacity 0.3s;
      `;
      
      document.body.appendChild(notification);
      
      // 3秒后移除提示
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.opacity = '0';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, 3000);
      
    } catch (error) {
      console.warn('飞书Plus: 显示图片复制提示失败', error);
    }
  }
}

// 创建插件实例并初始化
const feishuUnlocker = new FeishuCopyUnlocker();
feishuUnlocker.init();

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('飞书Plus: 收到消息', message);
  
  switch (message.type) {
    case 'PING':
      // 响应popup的ping请求
      sendResponse({ pong: true, active: feishuUnlocker.isActive });
      break;
      
    case 'GET_TAB_STATUS':
      // 返回当前标签页状态
      sendResponse({
        isActive: feishuUnlocker.isActive,
        url: window.location.href,
        timestamp: Date.now()
      });
      break;
      
    case 'SETTINGS_UPDATED':
      // 处理设置更新
      console.log('飞书Plus: 设置已更新', message.settings);
      // 可以根据新设置调整行为
      break;
      
    default:
      console.warn('飞书Plus: 未知消息类型', message.type);
  }
  
  return true; // 保持消息通道开放
});