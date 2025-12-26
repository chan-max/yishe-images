// 等待 Vue 加载完成的函数
function waitForVue(callback) {
  if (typeof Vue !== 'undefined') {
    callback();
  } else {
    setTimeout(function() {
      waitForVue(callback);
    }, 50);
  }
}

// 等待 DOM 和 Vue 都加载完成
function initApp() {
  if (typeof Vue === 'undefined') {
    console.error('Vue 未加载，请检查网络连接或 CDN 链接');
    document.body.innerHTML = '<div style="padding: 2rem; text-align: center;"><h2>加载错误</h2><p>Vue.js 未能加载，请检查网络连接或刷新页面重试。</p></div>';
    return;
  }
  
  const { createApp, reactive, watch, onMounted, computed, ref } = Vue;

  const BASE_URL = 'http://localhost:1513';

  createApp({
    setup() {
      const watermarkImageInput = ref(null);

      const state = reactive({
        currentView: 'home',
        currentDebugTab: 'all',
        healthOk: null,
        imagemagickStatus: null,
        imageUrl: '',
        analyzeImageUrl: '',
        watermarkImageUrl: '',
        currentImage: null,
        currentFilename: null,
        imageInfo: null,
        watermarkCurrentImage: null,
        watermarkCurrentFilename: null,
        watermarkImageInfo: null,
        watermarkResultImage: null,
        watermarkResultFilename: null,
        analyzeImage: null,
        analyzeFilename: null,
        analyzeImageInfo: null,
        analyzeJsonCollapsed: true,
        resultImage: null,
        resultFilename: null,
        resizeCollapsed: false,
        cropCollapsed: true,
        rotateCollapsed: true,
        convertCollapsed: true,
        operations: {
          resize: {
            width: null,
            height: null,
            maintainAspectRatio: true,
            quality: 90
          },
          crop: {
            x: 0,
            y: 0,
            width: null,
            height: null
          },
          rotate: {
            degrees: 0,
            backgroundColor: '#000000'
          },
          convert: {
            format: 'jpg',
            quality: 90
          },
          watermark: {
            type: 'text', // 'text' 或 'image'
            text: '',
            fontSize: 24,
            fontFamily: 'Microsoft YaHei', // 默认使用微软雅黑，支持中文
            color: '#FFFFFF',
            strokeColor: '',
            strokeWidth: 0,
            watermarkImageFilename: null,
            watermarkScale: 1.0,
            position: 'bottom-right',
            x: null,
            y: null,
            marginX: 10,
            marginY: 10,
            opacity: 0.5,
            angle: 0,
            repeat: false,
            tileSize: null
          }
        },
        debugLogs: [],
        loading: {
          health: false,
          checkIm: false,
          urlUpload: false,
          analyzeUrlUpload: false,
          analyzeInfo: false,
          resize: false,
          crop: false,
          rotate: false,
          convert: false
        }
      });

      // 菜单项配置
      const menuItems = [
        { id: 'home', name: '首页', icon: 'home' },
        { id: 'config', name: '服务配置', icon: 'cog' },
        { id: 'analyze', name: '图片分析', icon: 'search' },
        { id: 'process', name: '图像处理', icon: 'wrench' },
        { id: 'watermark', name: '水印', icon: 'tint' }
      ];

      // 调试标签配置
      const debugTabs = reactive([
        { id: 'all', name: '全部', count: 0 },
        { id: 'success', name: '成功', count: 0 },
        { id: 'error', name: '错误', count: 0 },
        { id: 'info', name: '信息', count: 0 }
      ]);

      // 切换视图
      function switchView(viewId) {
        state.currentView = viewId;
      }

      // 添加调试日志
      function addDebugLog(content, type = 'info') {
        const now = new Date();
        const time = now.toLocaleTimeString('zh-CN', { hour12: false });
        state.debugLogs.unshift({
          time,
          content,
          type
        });
        if (state.debugLogs.length > 200) {
          state.debugLogs = state.debugLogs.slice(0, 200);
        }
      }

      // 清空调试日志
      function clearDebugLog() {
        state.debugLogs = [];
        addDebugLog('调试日志已清空', 'info');
      }

      // 过滤调试日志
      const filteredDebugLogs = computed(() => {
        if (state.currentDebugTab === 'all') {
          return state.debugLogs;
        }
        return state.debugLogs.filter(log => log.type === state.currentDebugTab);
      });

      // 计算各类型日志数量
      watch(() => state.debugLogs, () => {
        debugTabs.forEach(tab => {
          if (tab.id === 'all') {
            tab.count = state.debugLogs.length;
          } else {
            tab.count = state.debugLogs.filter(log => log.type === tab.id).length;
          }
        });
      }, { immediate: true, deep: true });

      // 健康检查
      async function checkHealth() {
        state.loading.health = true;
        addDebugLog('开始健康检查...', 'info');
        try {
          const { data } = await axios.get(`${BASE_URL}/api/health`);
          state.healthOk = data?.status === 'healthy';
          addDebugLog(`健康检查: ${JSON.stringify(data, null, 2)}`, state.healthOk ? 'success' : 'error');
        } catch (e) {
          state.healthOk = false;
          addDebugLog(`健康检查失败: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.health = false;
        }
      }

      // 检测 ImageMagick
      async function checkImageMagick() {
        state.loading.checkIm = true;
        addDebugLog('开始检测 ImageMagick...', 'info');
        try {
          const { data } = await axios.get(`${BASE_URL}/api/imagemagick-status`);
          state.imagemagickStatus = data;
          addDebugLog(`ImageMagick 检测: ${data.message}`, data.installed ? 'success' : 'error');
        } catch (e) {
          state.imagemagickStatus = { installed: false, message: '检测失败' };
          addDebugLog(`ImageMagick 检测失败: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.checkIm = false;
        }
      }

      // 处理 URL 上传
      async function handleUrlUpload() {
        if (!state.imageUrl || !state.imageUrl.trim()) {
          addDebugLog('请输入有效的图片 URL', 'error');
          return;
        }

        const url = state.imageUrl.trim();
        state.loading.urlUpload = true;
        addDebugLog(`开始从 URL 下载: ${url}`, 'info');

        try {
          const { data } = await axios.post(`${BASE_URL}/api/upload`, {
            url: url
          }, {
            headers: { 'Content-Type': 'application/json' }
          });

          if (data.success) {
            state.currentFilename = data.filename;
            state.currentImage = `${BASE_URL}${data.path}`;
            addDebugLog(`下载成功: ${data.originalName} (来源: ${data.source})`, 'success');
            
            // 清空 URL 输入框
            state.imageUrl = '';
            
            // 获取图片信息
            await loadImageInfo();
          } else {
            addDebugLog(`下载失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`下载错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.urlUpload = false;
        }
      }

      // 加载图片信息
      async function loadImageInfo() {
        if (!state.currentFilename) return;

        try {
          const { data } = await axios.post(`${BASE_URL}/api/info`, {
            filename: state.currentFilename
          });

          if (data.success) {
            state.imageInfo = data.info;
            addDebugLog(`图片信息: ${data.info.width} × ${data.info.height} px`, 'info');
          }
        } catch (e) {
          addDebugLog(`获取图片信息失败: ${e.response?.data?.error || e.message}`, 'error');
        }
      }

      // 格式化文件大小
      function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
      }

      // 处理分析 URL 上传
      async function handleAnalyzeUrlUpload() {
        if (!state.analyzeImageUrl || !state.analyzeImageUrl.trim()) {
          addDebugLog('请输入有效的图片 URL', 'error');
          return;
        }

        const url = state.analyzeImageUrl.trim();
        state.loading.analyzeUrlUpload = true;
        addDebugLog(`开始从 URL 下载并分析: ${url}`, 'info');

        try {
          const { data } = await axios.post(`${BASE_URL}/api/upload`, {
            url: url
          }, {
            headers: { 'Content-Type': 'application/json' }
          });

          if (data.success) {
            state.analyzeFilename = data.filename;
            state.analyzeImage = `${BASE_URL}${data.path}`;
            addDebugLog(`下载成功: ${data.originalName}`, 'success');
            
            // 清空 URL 输入框
            state.analyzeImageUrl = '';
            
            // 获取图片信息
            await loadAnalyzeImageInfo();
          } else {
            addDebugLog(`下载失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`下载错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.analyzeUrlUpload = false;
        }
      }


      // 加载分析图片信息
      async function loadAnalyzeImageInfo() {
        if (!state.analyzeFilename) return;

        state.loading.analyzeInfo = true;
        addDebugLog('开始获取图片详细信息...', 'info');

        try {
          const { data } = await axios.post(`${BASE_URL}/api/info`, {
            filename: state.analyzeFilename
          });

          if (data.success) {
            state.analyzeImageInfo = data.info;
            addDebugLog(`图片信息获取成功: ${data.info.width} × ${data.info.height} px`, 'success');
          }
        } catch (e) {
          addDebugLog(`获取图片信息失败: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.analyzeInfo = false;
        }
      }

      // 复制分析信息
      async function copyAnalyzeInfo() {
        if (!state.analyzeImageInfo) return;
        
        try {
          const text = JSON.stringify(state.analyzeImageInfo, null, 2);
          if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            addDebugLog('图片信息已复制到剪贴板', 'success');
          } else {
            // 兼容旧浏览器
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            addDebugLog('图片信息已复制到剪贴板', 'success');
          }
        } catch (e) {
          addDebugLog(`复制失败: ${e.message}`, 'error');
        }
      }

      // 使用分析图片进行处理
      function useAnalyzeImageForProcess() {
        if (state.analyzeFilename && state.analyzeImage) {
          state.currentFilename = state.analyzeFilename;
          state.currentImage = state.analyzeImage;
          state.imageInfo = state.analyzeImageInfo;
          // 切换到处理页面
          state.currentView = 'process';
          addDebugLog('已切换到图像处理页面', 'info');
        }
      }

      // 清除分析图片
      function clearAnalyzeImage() {
        state.analyzeImage = null;
        state.analyzeFilename = null;
        state.analyzeImageInfo = null;
        state.analyzeImageUrl = '';
        addDebugLog('已清除分析图片', 'info');
      }

      // 处理调整大小
      async function handleResize() {
        if (!state.currentFilename) {
          addDebugLog('请先上传图片', 'error');
          return;
        }

        const { width, height, maintainAspectRatio, quality } = state.operations.resize;
        if (!width || !height) {
          addDebugLog('请输入宽度和高度', 'error');
          return;
        }

        state.loading.resize = true;
        addDebugLog(`开始调整大小: ${width} × ${height}`, 'info');

        try {
          const { data } = await axios.post(`${BASE_URL}/api/resize`, {
            filename: state.currentFilename,
            width,
            height,
            maintainAspectRatio,
            quality
          });

          if (data.success) {
            state.resultImage = `${BASE_URL}${data.path}`;
            state.resultFilename = data.outputFile;
            addDebugLog('调整大小成功', 'success');
          } else {
            addDebugLog(`调整大小失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`调整大小错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.resize = false;
        }
      }

      // 处理裁剪
      async function handleCrop() {
        if (!state.currentFilename) {
          addDebugLog('请先上传图片', 'error');
          return;
        }

        const { x, y, width, height } = state.operations.crop;
        if (!width || !height) {
          addDebugLog('请输入宽度和高度', 'error');
          return;
        }

        state.loading.crop = true;
        addDebugLog(`开始裁剪: ${width} × ${height} @ (${x}, ${y})`, 'info');

        try {
          const { data } = await axios.post(`${BASE_URL}/api/crop`, {
            filename: state.currentFilename,
            x,
            y,
            width,
            height
          });

          if (data.success) {
            state.resultImage = `${BASE_URL}${data.path}`;
            state.resultFilename = data.outputFile;
            addDebugLog('裁剪成功', 'success');
          } else {
            addDebugLog(`裁剪失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`裁剪错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.crop = false;
        }
      }

      // 处理旋转
      async function handleRotate() {
        if (!state.currentFilename) {
          addDebugLog('请先上传图片', 'error');
          return;
        }

        const { degrees, backgroundColor } = state.operations.rotate;
        state.loading.rotate = true;
        addDebugLog(`开始旋转: ${degrees}°`, 'info');

        try {
          const { data } = await axios.post(`${BASE_URL}/api/rotate`, {
            filename: state.currentFilename,
            degrees,
            backgroundColor
          });

          if (data.success) {
            state.resultImage = `${BASE_URL}${data.path}`;
            state.resultFilename = data.outputFile;
            addDebugLog('旋转成功', 'success');
          } else {
            addDebugLog(`旋转失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`旋转错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.rotate = false;
        }
      }

      // 处理格式转换
      async function handleConvert() {
        if (!state.currentFilename) {
          addDebugLog('请先上传图片', 'error');
          return;
        }

        const { format, quality } = state.operations.convert;
        state.loading.convert = true;
        addDebugLog(`开始转换格式: ${format}`, 'info');

        try {
          const { data } = await axios.post(`${BASE_URL}/api/convert`, {
            filename: state.currentFilename,
            format,
            quality
          });

          if (data.success) {
            state.resultImage = `${BASE_URL}${data.path}`;
            state.resultFilename = data.outputFile;
            addDebugLog('格式转换成功', 'success');
          } else {
            addDebugLog(`格式转换失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`格式转换错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.convert = false;
        }
      }

      // 处理水印 URL 上传
      async function handleWatermarkUrlUpload() {
        if (!state.watermarkImageUrl || !state.watermarkImageUrl.trim()) {
          addDebugLog('请输入有效的图片 URL', 'error');
          return;
        }

        const url = state.watermarkImageUrl.trim();
        state.loading.watermarkUrlUpload = true;
        addDebugLog(`开始从 URL 下载: ${url}`, 'info');

        try {
          const { data } = await axios.post(`${BASE_URL}/api/upload`, {
            url: url
          }, {
            headers: { 'Content-Type': 'application/json' }
          });

          if (data.success) {
            state.watermarkCurrentFilename = data.filename;
            state.watermarkCurrentImage = `${BASE_URL}${data.path}`;
            addDebugLog(`下载成功: ${data.originalName}`, 'success');
            
            state.watermarkImageUrl = '';
            await loadWatermarkImageInfo();
          } else {
            addDebugLog(`下载失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`下载错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.watermarkUrlUpload = false;
        }
      }

      async function loadWatermarkImageInfo() {
        if (!state.watermarkCurrentFilename) return;

        try {
          const { data } = await axios.post(`${BASE_URL}/api/info`, {
            filename: state.watermarkCurrentFilename
          });

          if (data.success) {
            state.watermarkImageInfo = data.info;
            addDebugLog(`图片信息: ${data.info.width} × ${data.info.height} px`, 'info');
          }
        } catch (e) {
          addDebugLog(`获取图片信息失败: ${e.response?.data?.error || e.message}`, 'error');
        }
      }

      // 处理水印
      async function handleWatermark() {
        if (!state.watermarkCurrentFilename) {
          addDebugLog('请先上传图片', 'error');
          return;
        }

        const watermark = state.operations.watermark;
        
        if (watermark.type === 'text' && !watermark.text) {
          addDebugLog('请输入水印文字', 'error');
          return;
        }
        
        if (watermark.type === 'image' && !watermark.watermarkImageFilename) {
          addDebugLog('请先上传水印图片', 'error');
          return;
        }

        state.loading.watermark = true;
        addDebugLog(`开始添加${watermark.type === 'text' ? '文字' : '图片'}水印`, 'info');

        try {
          const payload = {
            filename: state.watermarkCurrentFilename,
            type: watermark.type,
            position: watermark.position,
            marginX: watermark.marginX,
            marginY: watermark.marginY,
            opacity: watermark.opacity,
            angle: watermark.angle,
            repeat: watermark.repeat
          };

          if (watermark.x !== null && watermark.y !== null) {
            payload.x = watermark.x;
            payload.y = watermark.y;
          }

          if (watermark.type === 'text') {
            payload.text = watermark.text;
            payload.fontSize = watermark.fontSize;
            payload.fontFamily = watermark.fontFamily;
            payload.color = watermark.color;
            if (watermark.strokeColor && watermark.strokeWidth > 0) {
              payload.strokeColor = watermark.strokeColor;
              payload.strokeWidth = watermark.strokeWidth;
            }
            if (watermark.tileSize) {
              payload.tileSize = watermark.tileSize;
            }
          } else if (watermark.type === 'image') {
            payload.watermarkImageFilename = watermark.watermarkImageFilename;
            payload.watermarkScale = watermark.watermarkScale;
          }

          const { data } = await axios.post(`${BASE_URL}/api/watermark`, payload);

          if (data.success) {
            state.watermarkResultImage = `${BASE_URL}${data.path}`;
            state.watermarkResultFilename = data.outputFile;
            addDebugLog('添加水印成功', 'success');
          } else {
            addDebugLog(`添加水印失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`添加水印错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.watermark = false;
        }
      }

      function useWatermarkAsSource() {
        if (state.watermarkResultImage && state.watermarkResultFilename) {
          state.watermarkCurrentImage = state.watermarkResultImage;
          state.watermarkCurrentFilename = state.watermarkResultFilename;
          state.watermarkResultImage = null;
          state.watermarkResultFilename = null;
          addDebugLog('已设置为新的源图片', 'info');
          loadWatermarkImageInfo();
        }
      }

      // 上传水印图片
      async function handleWatermarkImageUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        addDebugLog(`开始上传水印图片: ${file.name}`, 'info');

        try {
          const { data } = await axios.post(`${BASE_URL}/api/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          if (data.success) {
            state.operations.watermark.watermarkImageFilename = data.filename;
            addDebugLog(`水印图片上传成功: ${data.originalName}`, 'success');
          } else {
            addDebugLog(`水印图片上传失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`水印图片上传错误: ${e.response?.data?.error || e.message}`, 'error');
        }
      }

      // 使用结果作为新源图片
      function useAsSource() {
        if (state.resultImage && state.resultFilename) {
          state.currentImage = state.resultImage;
          state.currentFilename = state.resultFilename;
          state.resultImage = null;
          state.resultFilename = null;
          addDebugLog('已设置为新的源图片', 'info');
          loadImageInfo();
        }
      }

      // 页面加载时
      onMounted(() => {
        addDebugLog('系统初始化完成', 'info');
        checkHealth();
        checkImageMagick();
      });

      return {
        state,
        watermarkImageInput,
        menuItems,
        debugTabs,
        filteredDebugLogs,
        switchView,
        checkHealth,
        checkImageMagick,
        handleUrlUpload,
        handleAnalyzeUrlUpload,
        loadAnalyzeImageInfo,
        copyAnalyzeInfo,
        useAnalyzeImageForProcess,
        clearAnalyzeImage,
        formatFileSize,
        handleResize,
        handleCrop,
        handleRotate,
        handleConvert,
        handleWatermarkUrlUpload,
        loadWatermarkImageInfo,
        handleWatermark,
        handleWatermarkImageUpload,
        useWatermarkAsSource,
        useAsSource,
        clearDebugLog
      };
    }
  }).mount('#app');
}

// 等待 Vue 加载完成后初始化应用
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    waitForVue(initApp);
  });
} else {
  waitForVue(initApp);
}
