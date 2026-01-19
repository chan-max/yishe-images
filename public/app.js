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

  // 使用相对路径，自动使用当前请求的协议和主机
  const BASE_URL = '';

  createApp({
    setup() {
      const watermarkImageInput = ref(null);

      const state = reactive({
        currentView: 'home',
        currentDebugTab: 'all',
        healthOk: null,
        imageProcessorStatus: null,
        imageUrl: '',
        analyzeImageUrl: '',
        chainProcessImageUrl: '',
        watermarkImageUrl: '',
        effectsImageUrl: '',
        variationsImageUrl: '',
        variationsCurrentImage: null,
        variationsCurrentFilename: null,
        variationsImageInfo: null,
        variationsResults: [],
        currentImage: null,
        currentFilename: null,
        imageInfo: null,
        watermarkCurrentImage: null,
        watermarkCurrentFilename: null,
        watermarkImageInfo: null,
        watermarkResultImage: null,
        watermarkResultFilename: null,
        effectsCurrentImage: null,
        effectsCurrentFilename: null,
        effectsImageInfo: null,
        effectsResultImage: null,
        effectsResultFilename: null,
        effectsList: [],
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
          convert: false,
          watermarkUrlUpload: false,
          watermark: false,
          effectsUrlUpload: false,
          effects: false,
          variations: false,
          chainProcess: false,
          aiProcess: false
        },
        // 链式处理相关状态
        chainProcessImage: null,
        chainProcessFilename: null,
        chainProcessImageInfo: null,
        chainProcessResultImage: null,
        chainProcessResultFilename: null,
        operationChain: [], // 操作链数组
        selectedOperationType: '', // 选中的操作类型
        selectedOperationIndex: 0, // 当前选中的操作索引（用于tab切换）
        // 文件管理相关状态
        filesCurrentDirectory: 'uploads', // 当前查看的目录 (uploads 或 output)
        filesList: {
          uploads: [],
          output: []
        },
        filesLoading: {
          uploads: false,
          output: false
        },
        filesStats: {
          uploads: { totalSize: 0, totalSizeFormatted: '0 B', count: 0 },
          output: { totalSize: 0, totalSizeFormatted: '0 B', count: 0 }
        },
        // 文件预览相关状态
        filePreviewVisible: false,
        filePreviewFile: null,
        imageLoadError: false,
        // AI处理相关状态
        aiProcessImageUrl: '',
        aiProcessImage: null,
        aiProcessFilename: null,
        aiProcessImageInfo: null,
        aiProcessPrompt: '',
        aiProcessResultImage: null,
        aiProcessResultFilename: null,
        aiProcessOperations: null,
        aiProcessCommand: null,
        aiProcessExecutedCommands: null
      });

      // 操作类型定义（从配置文件加载）
      // 将配置文件中的配置对象转换为操作类型对象
      function configToOperationType(config) {
        return {
          value: config.meta.value,
          baseType: config.meta.baseType,
          label: config.ui.label,
          icon: config.ui.icon,
          description: config.ui.description,
          // 保留 meta 用于向后兼容
          meta: {
            ...(config.meta.filterType ? { filterType: config.meta.filterType } : {}),
            ...(config.meta.effectType ? { effectType: config.meta.effectType } : {})
          },
          // 保存完整的配置用于后续使用
          _config: config
        };
      }

      let baseOperationTypes, filterOperationTypes, effectOperationTypes, operationTypes;
      
      if (typeof window !== 'undefined' && window.ImageOperationsConfig) {
        // 使用配置文件系统
        const config = window.ImageOperationsConfig;
        
        // 优先使用新的平铺结构 operations
        if (config.operations && Array.isArray(config.operations)) {
          operationTypes = config.operations.map(configToOperationType);
        } else {
          // 向后兼容：如果不存在 operations，尝试使用旧的分类结构
          baseOperationTypes = (config.base || []).map(configToOperationType);
          filterOperationTypes = (config.filters || []).map(configToOperationType);
          effectOperationTypes = (config.effects || []).map(configToOperationType);
          operationTypes = [
            ...baseOperationTypes,
            ...filterOperationTypes,
            ...effectOperationTypes
          ];
        }
      } else {
        // 向后兼容：使用内联配置（临时方案，建议迁移到配置文件）
        baseOperationTypes = [
          { value: 'resize', baseType: 'resize', label: '调整大小', icon: 'expand', description: '缩放图片到指定尺寸，可以保持原始宽高比或强制拉伸到目标尺寸' },
          { value: 'crop', baseType: 'crop', label: '矩形裁剪', icon: 'crop', description: '从图片中裁剪出一个矩形区域，需要指定起始坐标和裁剪区域的宽高' },
          { value: 'shapeCrop', baseType: 'shapeCrop', label: '形状裁剪', icon: 'circle', description: '按照指定形状（圆形、椭圆、星形等）裁剪图片，保留形状内的内容' },
          { value: 'rotate', baseType: 'rotate', label: '旋转', icon: 'redo', description: '按指定角度旋转图片，可以设置旋转后的背景颜色' },
          { value: 'convert', baseType: 'convert', label: '格式转换', icon: 'exchange', description: '将图片转换为其他格式（JPG、PNG、GIF、WEBP、BMP等），可设置输出质量' },
          { value: 'watermark', baseType: 'watermark', label: '水印', icon: 'tint', description: '在图片上添加文字或图片水印，可设置位置和透明度' },
          { value: 'adjust', baseType: 'adjust', label: '颜色调整', icon: 'adjust', description: '调整图片的亮度、对比度和饱和度，用于改善图片的视觉效果' }
        ];

        filterOperationTypes = [
          { value: 'filter-blur', baseType: 'filter', label: '模糊', icon: 'filter', description: '应用模糊滤镜，让图片变得柔和', meta: { filterType: 'blur' } },
          { value: 'filter-sharpen', baseType: 'filter', label: '锐化', icon: 'filter', description: '增强图片细节，让边缘更清晰', meta: { filterType: 'sharpen' } },
          { value: 'filter-emboss', baseType: 'filter', label: '浮雕', icon: 'filter', description: '让图片产生立体浮雕效果', meta: { filterType: 'emboss' } },
          { value: 'filter-edge', baseType: 'filter', label: '边缘检测', icon: 'filter', description: '只保留图片边缘轮廓，形成线条效果', meta: { filterType: 'edge' } },
          { value: 'filter-charcoal', baseType: 'filter', label: '炭笔画', icon: 'filter', description: '将图片转为炭笔画风格', meta: { filterType: 'charcoal' } },
          { value: 'filter-oil-painting', baseType: 'filter', label: '油画', icon: 'filter', description: '模拟油画效果', meta: { filterType: 'oil-painting' } },
          { value: 'filter-sepia', baseType: 'filter', label: '怀旧', icon: 'filter', description: '快速加上棕褐色怀旧滤镜', meta: { filterType: 'sepia' } },
          { value: 'filter-grayscale', baseType: 'filter', label: '灰度', icon: 'filter', description: '快速转为灰度图片', meta: { filterType: 'grayscale' } },
          { value: 'filter-negate', baseType: 'filter', label: '负片', icon: 'filter', description: '将颜色反转，生成负片效果', meta: { filterType: 'negate' } }
        ];

        effectOperationTypes = [
          { value: 'effects-grayscale', baseType: 'effects', label: '黑白化', icon: 'magic', description: '将图片转换为黑白风格', meta: { effectType: 'grayscale' } },
          { value: 'effects-sepia', baseType: 'effects', label: '怀旧', icon: 'magic', description: '添加棕褐色调的复古效果', meta: { effectType: 'sepia' } },
          { value: 'effects-negate', baseType: 'effects', label: '负片', icon: 'magic', description: '反转所有颜色，形成底片效果', meta: { effectType: 'negate' } },
          { value: 'effects-blur', baseType: 'effects', label: '模糊', icon: 'magic', description: '更高级的模糊效果，可配合半径等参数', meta: { effectType: 'blur' } },
          { value: 'effects-gaussian-blur', baseType: 'effects', label: '高斯模糊', icon: 'magic', description: '使用高斯算法的平滑模糊', meta: { effectType: 'gaussian-blur' } },
          { value: 'effects-motion-blur', baseType: 'effects', label: '运动模糊', icon: 'magic', description: '模拟物体快速运动产生的拖影效果', meta: { effectType: 'motion-blur' } },
          { value: 'effects-sharpen', baseType: 'effects', label: '锐化', icon: 'magic', description: '增强图片细节的锐化效果', meta: { effectType: 'sharpen' } },
          { value: 'effects-unsharp', baseType: 'effects', label: '非锐化遮罩', icon: 'magic', description: '更专业的锐化控制方式', meta: { effectType: 'unsharp' } },
          { value: 'effects-charcoal', baseType: 'effects', label: '炭笔画', icon: 'magic', description: '生成炭笔素描风格图片', meta: { effectType: 'charcoal' } },
          { value: 'effects-oil-painting', baseType: 'effects', label: '油画', icon: 'magic', description: '模拟油画笔触效果', meta: { effectType: 'oil-painting' } },
          { value: 'effects-sketch', baseType: 'effects', label: '铅笔素描', icon: 'magic', description: '转换为铅笔素描风格', meta: { effectType: 'sketch' } },
          { value: 'effects-emboss', baseType: 'effects', label: '浮雕', icon: 'magic', description: '立体浮雕艺术效果', meta: { effectType: 'emboss' } },
          { value: 'effects-edge', baseType: 'effects', label: '边缘检测', icon: 'magic', description: '只保留轮廓边缘线条', meta: { effectType: 'edge' } },
          { value: 'effects-posterize', baseType: 'effects', label: '海报化', icon: 'magic', description: '减少颜色数量，形成海报风格', meta: { effectType: 'posterize' } },
          { value: 'effects-pixelate', baseType: 'effects', label: '像素化', icon: 'magic', description: '生成大颗粒像素风格', meta: { effectType: 'pixelate' } },
          { value: 'effects-mosaic', baseType: 'effects', label: '马赛克', icon: 'magic', description: '用于打码或艺术马赛克效果', meta: { effectType: 'mosaic' } },
          { value: 'effects-brightness', baseType: 'effects', label: '亮度', icon: 'magic', description: '单独调整亮度', meta: { effectType: 'brightness' } },
          { value: 'effects-contrast', baseType: 'effects', label: '对比度', icon: 'magic', description: '单独调整对比度', meta: { effectType: 'contrast' } },
          { value: 'effects-saturation', baseType: 'effects', label: '饱和度', icon: 'magic', description: '单独调整颜色饱和度', meta: { effectType: 'saturation' } },
          { value: 'effects-hue', baseType: 'effects', label: '色相', icon: 'magic', description: '改变整体色调', meta: { effectType: 'hue' } },
          { value: 'effects-colorize', baseType: 'effects', label: '着色', icon: 'magic', description: '给图片整体加上一种颜色', meta: { effectType: 'colorize' } },
          { value: 'effects-tint', baseType: 'effects', label: '色调', icon: 'magic', description: '轻微地给图片染色', meta: { effectType: 'tint' } },
          { value: 'effects-noise', baseType: 'effects', label: '噪点', icon: 'magic', description: '添加胶片颗粒感或数字噪点', meta: { effectType: 'noise' } },
          { value: 'effects-despeckle', baseType: 'effects', label: '去噪', icon: 'magic', description: '移除噪点，让图片更干净', meta: { effectType: 'despeckle' } },
          { value: 'effects-vignette', baseType: 'effects', label: '晕影', icon: 'magic', description: '在边缘添加暗角，让中心更突出', meta: { effectType: 'vignette' } },
          { value: 'effects-solarize', baseType: 'effects', label: '曝光', icon: 'magic', description: '模拟过度曝光的反转效果', meta: { effectType: 'solarize' } },
          { value: 'effects-swirl', baseType: 'effects', label: '漩涡', icon: 'magic', description: '让图片围绕中心扭曲', meta: { effectType: 'swirl' } },
          { value: 'effects-wave', baseType: 'effects', label: '波浪', icon: 'magic', description: '让图片产生波纹扭曲', meta: { effectType: 'wave' } },
          { value: 'effects-implode', baseType: 'effects', label: '内爆', icon: 'magic', description: '向中心收缩的扭曲效果', meta: { effectType: 'implode' } },
          { value: 'effects-explode', baseType: 'effects', label: '爆炸', icon: 'magic', description: '向外膨胀的扭曲效果', meta: { effectType: 'explode' } },
          { value: 'effects-spread', baseType: 'effects', label: '扩散', icon: 'magic', description: '随机扩散像素，形成特殊模糊', meta: { effectType: 'spread' } },
          { value: 'effects-normalize', baseType: 'effects', label: '标准化', icon: 'magic', description: '自动增强整体对比度', meta: { effectType: 'normalize' } },
          { value: 'effects-equalize', baseType: 'effects', label: '均衡化', icon: 'magic', description: '通过直方图均衡增强细节', meta: { effectType: 'equalize' } },
          { value: 'effects-gamma', baseType: 'effects', label: '伽马校正', icon: 'magic', description: '只调整中间调的亮度', meta: { effectType: 'gamma' } },
          { value: 'effects-threshold', baseType: 'effects', label: '阈值化', icon: 'magic', description: '转为黑白二值图', meta: { effectType: 'threshold' } },
          { value: 'effects-quantize', baseType: 'effects', label: '颜色量化', icon: 'magic', description: '减少颜色数量，形成索引色风格', meta: { effectType: 'quantize' } }
        ];

        operationTypes = [
          ...baseOperationTypes,
          ...filterOperationTypes,
          ...effectOperationTypes
        ];
      }

      const menuItems = [
        { id: 'home', name: '首页', icon: 'home' },
        { id: 'config', name: '服务配置', icon: 'cog' },
        { id: 'analyze', name: '图片分析', icon: 'search' },
        { id: 'chain-process', name: '链式处理', icon: 'sitemap' },
        { id: 'variations', name: '图片裂变', icon: 'clone' },
        { id: 'ai-process', name: 'AI智能处理', icon: 'magic' },
        { id: 'files', name: '文件管理', icon: 'folder' }
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
        // 如果切换到文件管理视图，自动加载当前目录的文件列表
        if (viewId === 'files') {
          loadFilesList(state.filesCurrentDirectory);
        }
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

      // 检测图像处理引擎
      async function checkImageProcessor() {
        state.loading.checkIm = true;
        addDebugLog('开始检测图像处理引擎...', 'info');
        try {
          const { data } = await axios.get(`${BASE_URL}/api/image-processor-status`);
          state.imageProcessorStatus = data;
          addDebugLog(`图像处理引擎检测: ${data.message}`, data.installed ? 'success' : 'error');
        } catch (e) {
          state.imageProcessorStatus = { installed: false, message: '检测失败' };
          addDebugLog(`图像处理引擎检测失败: ${e.response?.data?.error || e.message}`, 'error');
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
          state.chainProcessFilename = state.analyzeFilename;
          state.chainProcessImage = state.analyzeImage;
          state.chainProcessImageInfo = state.analyzeImageInfo;
          // 切换到链式处理页面
          state.currentView = 'chain-process';
          addDebugLog('已切换到链式处理页面', 'info');
          loadChainProcessImageInfo();
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

// ========== 图片裂变功能 ==========
      
      // 更新图片预览
      async function updateVariationsImagePreview() {
        if (!state.variationsImageUrl || !state.variationsImageUrl.trim()) {
          state.variationsCurrentImage = null;
          state.variationsCurrentFilename = null;
          state.variationsImageInfo = null;
          return;
        }

        const url = state.variationsImageUrl.trim();
        if (isValidHttpUrl(url)) {
          state.variationsCurrentImage = url;
          state.variationsCurrentFilename = url;
        } else {
          state.variationsCurrentImage = `${BASE_URL}/uploads/${url}`;
          state.variationsCurrentFilename = url;
          await loadVariationsImageInfo();
        }
      }

      // 加载图片信息
      async function loadVariationsImageInfo() {
        if (!state.variationsCurrentFilename || isValidHttpUrl(state.variationsCurrentFilename)) return;

        try {
          const { data } = await axios.post(`${BASE_URL}/api/info`, {
            filename: state.variationsCurrentFilename
          });

          if (data.success) {
            state.variationsImageInfo = data.info;
          }
        } catch (e) {
          console.error('加载图片信息失败:', e);
        }
      }

      // 处理图片裂变
      async function handleVariations() {
        if (!state.variationsImageUrl || !state.variationsImageUrl.trim()) {
          addDebugLog('请输入有效的图片 URL 或文件名', 'error');
          return;
        }

        state.loading.variations = true;
        state.variationsResults = [];
        addDebugLog('开始图片裂变处理（逐个配置执行，实时展示）...', 'info');

        try {
          const filename = state.variationsImageUrl.trim();
          const configs = Array.isArray(window.VARIATIONS_CONFIG) ? window.VARIATIONS_CONFIG : null;

          if (!configs || configs.length === 0) {
            addDebugLog('未加载裂变默认配置（window.VARIATIONS_CONFIG），请检查 public/variations-config.js 是否已引入', 'error');
            return;
          }

          let successCount = 0;
          let failCount = 0;

          for (let i = 0; i < configs.length; i++) {
            const cfg = configs[i];
            const name = cfg?.name || `配置${i + 1}`;
            const description = cfg?.description || '';
            const operations = Array.isArray(cfg?.operations) ? cfg.operations : [];

            if (operations.length === 0) {
              failCount++;
              state.variationsResults.push({
                success: false,
                name,
                description,
                error: '该配置缺少 operations'
              });
              continue;
            }

            addDebugLog(`裂变进度 ${i + 1}/${configs.length}：开始执行「${name}」`, 'info');

            try {
              const { data } = await axios.post(`${BASE_URL}/api/process`, {
                filename,
                operations
              });

              if (data && data.success) {
                successCount++;
                state.variationsResults.push({
                  success: true,
                  name,
                  description,
                  outputFile: data.outputFile,
                  path: data.path,
                  url: data.url
                });
              } else {
                failCount++;
                state.variationsResults.push({
                  success: false,
                  name,
                  description,
                  error: data?.error || '处理失败'
                });
              }
            } catch (err) {
              failCount++;
              state.variationsResults.push({
                success: false,
                name,
                description,
                error: err?.response?.data?.error || err?.message || '请求失败'
              });
            }
          }

          addDebugLog(`裂变处理完成: 成功 ${successCount} 个，失败 ${failCount} 个`, (failCount === 0 ? 'success' : 'info'));
        } catch (e) {
          const errorMsg = e.response?.data?.error || e.message;
          addDebugLog(`裂变处理错误: ${errorMsg}`, 'error');
        } finally {
          state.loading.variations = false;
        }
      }

      // 复制图片URL
      function copyImageUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
          addDebugLog('图片链接已复制到剪贴板', 'success');
        }).catch(() => {
          addDebugLog('复制失败，请手动复制', 'error');
        });
      }
      
      // 处理效果 URL 上传
      async function handleEffectsUrlUpload() {
        if (!state.effectsImageUrl || !state.effectsImageUrl.trim()) {
          addDebugLog('请输入有效的图片 URL', 'error');
          return;
        }

        const url = state.effectsImageUrl.trim();
        state.loading.effectsUrlUpload = true;
        addDebugLog(`开始从 URL 下载: ${url}`, 'info');

        try {
          const { data } = await axios.post(`${BASE_URL}/api/upload`, {
            url: url
          }, {
            headers: { 'Content-Type': 'application/json' }
          });

          if (data.success) {
            state.effectsCurrentFilename = data.filename;
            state.effectsCurrentImage = `${BASE_URL}${data.path}`;
            addDebugLog(`下载成功: ${data.originalName}`, 'success');
            
            state.effectsImageUrl = '';
            await loadEffectsImageInfo();
          } else {
            addDebugLog(`下载失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`下载错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.effectsUrlUpload = false;
        }
      }

      async function loadEffectsImageInfo() {
        if (!state.effectsCurrentFilename) return;

        try {
          const { data } = await axios.post(`${BASE_URL}/api/info`, {
            filename: state.effectsCurrentFilename
          });

          if (data.success) {
            state.effectsImageInfo = data.info;
            addDebugLog(`图片信息: ${data.info.width} × ${data.info.height} px`, 'info');
          }
        } catch (e) {
          addDebugLog(`获取图片信息失败: ${e.response?.data?.error || e.message}`, 'error');
        }
      }

      // 添加效果
      function addEffect() {
        state.effectsList.push({
          type: 'grayscale',
          method: null,
          radius: null,
          sigma: null,
          intensity: null,
          value: null,
          color: null,
          size: null,
          angle: null,
          amount: null,
          threshold: null,
          colors: null,
          levels: null,
          noiseType: null,
          amplitude: null,
          wavelength: null
        });
        addDebugLog('已添加新效果', 'info');
      }

      // 删除效果
      function removeEffect(index) {
        state.effectsList.splice(index, 1);
        addDebugLog('已删除效果', 'info');
      }

      // 清空效果列表
      function clearEffects() {
        state.effectsList = [];
        addDebugLog('已清空效果列表', 'info');
      }

      // 获取效果名称
      function getEffectName(type) {
        const names = {
          'grayscale': '灰度（可调算法）',
          'negate': '负片',
          'sepia': '怀旧',
          'blur': '模糊',
          'gaussian-blur': '高斯模糊',
          'motion-blur': '运动模糊',
          'sharpen': '锐化',
          'unsharp': '非锐化遮罩',
          'charcoal': '炭笔画',
          'oil-painting': '油画',
          'sketch': '素描',
          'emboss': '浮雕',
          'edge': '边缘检测',
          'posterize': '海报化',
          'pixelate': '像素化',
          'mosaic': '马赛克',
          'brightness': '亮度',
          'contrast': '对比度',
          'saturation': '饱和度',
          'hue': '色相',
          'colorize': '着色',
          'tint': '色调',
          'noise': '噪点',
          'despeckle': '去噪点',
          'vignette': '晕影',
          'solarize': '曝光',
          'swirl': '漩涡',
          'wave': '波浪',
          'implode': '内爆',
          'explode': '爆炸',
          'spread': '扩散',
          'normalize': '标准化',
          'equalize': '均衡化',
          'gamma': '伽马校正',
          'threshold': '阈值化',
          'quantize': '量化'
        };
        return names[type] || type;
      }

      // 获取效果官方术语
      function getEffectOfficialTerm(type) {
        const terms = {
          'grayscale': 'Grayscale Conversion / 灰度转换（可选多种算法）',
          'negate': 'Color Negation / 颜色反转',
          'sepia': 'Sepia Tone / 棕褐色调',
          'blur': 'Gaussian Blur / 高斯模糊',
          'gaussian-blur': 'Gaussian Blur / 高斯模糊',
          'motion-blur': 'Motion Blur / 运动模糊',
          'sharpen': 'Sharpen / 锐化',
          'unsharp': 'Unsharp Mask / 非锐化遮罩',
          'charcoal': 'Charcoal Drawing / 炭笔画',
          'oil-painting': 'Oil Painting / 油画效果',
          'sketch': 'Pencil Sketch / 铅笔素描',
          'emboss': 'Emboss / 浮雕',
          'edge': 'Edge Detection / 边缘检测',
          'posterize': 'Posterization / 海报化',
          'pixelate': 'Pixelation / 像素化',
          'mosaic': 'Mosaic / 马赛克',
          'brightness': 'Brightness Adjustment / 亮度调整',
          'contrast': 'Contrast Adjustment / 对比度调整',
          'saturation': 'Saturation Adjustment / 饱和度调整',
          'hue': 'Hue Shift / 色相偏移',
          'colorize': 'Colorize / 着色',
          'tint': 'Tint / 色调',
          'noise': 'Noise / 噪点',
          'despeckle': 'Despeckle / 去噪点',
          'vignette': 'Vignette / 晕影',
          'solarize': 'Solarization / 曝光',
          'swirl': 'Swirl / 漩涡',
          'wave': 'Wave / 波浪',
          'implode': 'Implode / 内爆',
          'explode': 'Explode / 爆炸',
          'spread': 'Spread / 扩散',
          'normalize': 'Normalize / 标准化',
          'equalize': 'Histogram Equalization / 直方图均衡化',
          'gamma': 'Gamma Correction / 伽马校正',
          'threshold': 'Threshold / 阈值化',
          'quantize': 'Color Quantization / 颜色量化'
        };
        return terms[type] || type;
      }

      // 获取效果大众描述
      function getEffectDescription(type) {
        const descriptions = {
          'grayscale': '将彩色图片转换为黑白图片，支持选择 Rec601 / Rec709 / Average 等不同灰度算法，适合从简单黑白到风格化的多种场景',
          'negate': '反转图片的所有颜色，就像照片底片一样，白色变黑色，红色变青色',
          'sepia': '给图片添加棕褐色调，营造复古、怀旧的老照片效果',
          'blur': '让图片变得模糊，细节不清晰，常用于突出主体或营造柔和氛围',
          'gaussian-blur': '使用高斯算法实现的模糊效果，过渡更自然平滑',
          'motion-blur': '模拟物体快速运动时的模糊效果，产生动感',
          'sharpen': '增强图片的清晰度和细节，让边缘更锐利，图片更清晰',
          'unsharp': '高级锐化技术，通过非锐化遮罩算法增强图片细节，效果更自然',
          'charcoal': '将图片转换为炭笔画风格，呈现黑白素描的艺术效果',
          'oil-painting': '模拟油画笔触效果，让图片看起来像手绘油画',
          'sketch': '将图片转换为铅笔素描风格，呈现简洁的线条和阴影',
          'emboss': '让图片产生立体浮雕效果，看起来像雕刻在平面上',
          'edge': '只保留图片的边缘轮廓，去除其他细节，呈现线条画效果',
          'posterize': '减少图片的颜色数量，产生类似海报的色块效果',
          'pixelate': '将图片分解成大的像素块，产生像素艺术风格',
          'mosaic': '将图片分割成小方块，产生马赛克遮挡效果',
          'brightness': '调整图片的明暗程度，让图片更亮或更暗',
          'contrast': '调整图片的明暗对比，增强或减弱明暗差异',
          'saturation': '调整图片颜色的鲜艳程度，让颜色更鲜艳或更淡',
          'hue': '改变图片的整体色调，让颜色发生偏移',
          'colorize': '给图片整体添加某种颜色，改变图片的色调',
          'tint': '给图片添加轻微的色调，像给图片"染色"一样',
          'noise': '在图片上添加随机噪点，模拟胶片颗粒或数字噪点',
          'despeckle': '去除图片中的噪点和杂点，让图片更干净',
          'vignette': '在图片四周添加暗角效果，让中心更突出',
          'solarize': '模拟过度曝光的效果，产生高对比度的艺术效果',
          'swirl': '让图片产生旋转扭曲的效果，像漩涡一样',
          'wave': '让图片产生波浪形的扭曲效果，像水波一样',
          'implode': '让图片向中心收缩，产生向内凹陷的效果',
          'explode': '让图片从中心向外扩张，产生向外凸起的效果',
          'spread': '随机移动像素位置，产生扩散、模糊的效果',
          'normalize': '自动调整图片的亮度和对比度，让图片更清晰',
          'equalize': '重新分布图片的亮度，增强对比度，让细节更明显',
          'gamma': '调整图片的中间调亮度，不影响最亮和最暗的部分',
          'threshold': '将图片转换为只有黑白两色的二值图，用于简化图片',
          'quantize': '减少图片使用的颜色数量，产生类似索引色的效果'
        };
        return descriptions[type] || '该效果的描述';
      }

      // 获取效果详细说明
      function getEffectExplanation(type) {
        const explanations = {
          'grayscale': '通过不同的算法将RGB彩色图片转换为灰度图，可以选择不同的转换方法（如亮度加权、平均值等）来控制转换效果。适合制作黑白照片、艺术效果或减少文件大小。',
          'negate': '将每个像素的颜色值反转，产生类似照片底片的效果。常用于艺术创作或特殊视觉效果。',
          'sepia': '通过添加棕褐色调来模拟老照片效果，可以调整强度来控制怀旧感的程度。常用于复古风格的照片处理。',
          'blur': '通过平均周围像素的值来减少图片细节，产生模糊效果。半径越大，模糊程度越高。常用于背景虚化、柔化皮肤等。',
          'gaussian-blur': '使用高斯分布函数实现的模糊算法，过渡更平滑自然。是图像处理中最常用的模糊方法。',
          'motion-blur': '模拟相机或物体运动时产生的模糊效果，可以设置运动方向和距离。常用于表现速度感或动态效果。',
          'sharpen': '通过增强相邻像素之间的对比度来锐化图片，让边缘更清晰。适合处理模糊的照片或增强细节。',
          'unsharp': '使用非锐化遮罩算法进行锐化，可以更精确地控制锐化效果，避免过度锐化产生的噪点。是专业图像处理中常用的锐化方法。',
          'charcoal': '模拟炭笔画效果，通过边缘检测和对比度调整来产生黑白素描风格。适合制作艺术效果。',
          'oil-painting': '模拟油画笔触效果，通过区域平均和边缘增强来产生类似手绘油画的效果。可以调整笔触大小。',
          'sketch': '将图片转换为铅笔素描风格，保留主要轮廓和阴影，去除细节。适合制作简洁的艺术效果。',
          'emboss': '通过计算像素与周围像素的差异来产生立体浮雕效果，让图片看起来像雕刻在平面上。',
          'edge': '只检测和保留图片的边缘轮廓，去除其他信息。常用于图像分析、艺术效果或简化图片。',
          'posterize': '减少图片的颜色数量，将相似的颜色合并，产生类似海报的色块效果。可以设置颜色级别数。',
          'pixelate': '将图片分割成大的像素块，每个块使用单一颜色。可以设置像素块的大小。常用于艺术效果或隐私保护。',
          'mosaic': '将图片分割成规则的小方块，每个方块使用该区域的平均颜色。常用于遮挡敏感信息或艺术效果。',
          'brightness': '调整图片的整体亮度，正值让图片更亮，负值让图片更暗。不影响颜色信息。',
          'contrast': '调整图片的明暗对比度，正值增强对比（亮的更亮，暗的更暗），负值减弱对比。',
          'saturation': '调整颜色的鲜艳程度，正值让颜色更鲜艳，负值让颜色更淡（接近灰色）。0%时完全去色。',
          'hue': '改变图片的整体色调，让所有颜色沿着色相环旋转。可以产生不同的色彩风格。',
          'colorize': '给图片整体添加某种颜色，保持明暗关系不变。可以设置颜色和强度。',
          'tint': '给图片添加轻微的色调，像给图片"染色"一样。可以设置颜色和强度。',
          'noise': '在图片上添加随机噪点，可以模拟胶片颗粒效果或数字噪点。可以选择不同的噪点类型。',
          'despeckle': '去除图片中的小噪点和杂点，让图片更干净。适合处理扫描件或老照片。',
          'vignette': '在图片四周添加逐渐变暗的效果，让中心区域更突出。常用于人像摄影或艺术效果。',
          'solarize': '模拟过度曝光的效果，产生高对比度和反转色调。是摄影中的一种特殊技术。',
          'swirl': '让图片围绕中心点旋转扭曲，产生漩涡效果。可以设置旋转角度。',
          'wave': '让图片产生波浪形的扭曲效果，像水波一样。可以设置振幅和波长。',
          'implode': '让图片向中心收缩，产生向内凹陷的效果。可以设置收缩强度。',
          'explode': '让图片从中心向外扩张，产生向外凸起的效果。可以设置扩张强度。',
          'spread': '随机移动像素位置，产生扩散、模糊的效果。可以设置扩散半径。',
          'normalize': '自动调整图片的亮度和对比度，将最暗和最亮的像素分别映射到纯黑和纯白，增强整体对比度。',
          'equalize': '重新分布图片的亮度直方图，让亮度分布更均匀，增强对比度和细节。常用于处理曝光不均的图片。',
          'gamma': '调整图片的中间调亮度，不影响最亮和最暗的部分。常用于校正显示器的亮度曲线。',
          'threshold': '将图片转换为只有黑白两色的二值图，根据阈值决定每个像素是黑还是白。常用于简化图片或提取轮廓。',
          'quantize': '减少图片使用的颜色数量，将相似的颜色合并。可以设置颜色数量。常用于制作索引色图片或艺术效果。'
        };
        return explanations[type] || '该效果的详细说明';
      }

      // 更新效果参数（当效果类型改变时）
      function updateEffectParams(effect) {
        // 根据效果类型设置默认值
        const defaults = {
          'blur': { radius: 5, sigma: 5 },
          'gaussian-blur': { radius: 5 },
          'motion-blur': { radius: 10, angle: 0 },
          'sharpen': { radius: 1, amount: 1 },
          'unsharp': { radius: 1, amount: 1, threshold: 0.05 },
          'charcoal': { radius: 1, sigma: 0.5 },
          'sketch': { radius: 1, sigma: 0.5 },
          'emboss': { radius: 1, sigma: 0.5 },
          'edge': { radius: 1 },
          'posterize': { levels: 4 },
          'pixelate': { size: 10 },
          'mosaic': { size: 10 },
          'brightness': { value: 0 },
          'contrast': { value: 0 },
          'saturation': { value: 0 },
          'hue': { value: 0 },
          'colorize': { color: '#FF0000', intensity: 50 },
          'tint': { color: '#FFD700', intensity: 50 },
          'noise': { noiseType: 'Uniform' },
          'vignette': { radius: 100, sigma: 50 },
          'solarize': { threshold: 50 },
          'swirl': { degrees: 90 },
          'wave': { amplitude: 25, wavelength: 150 },
          'implode': { amount: 0.5 },
          'explode': { amount: 0.5 },
          'spread': { radius: 3 },
          'gamma': { value: 1.0 },
          'threshold': { value: 50 },
          'quantize': { colors: 256 },
          'sepia': { intensity: 80 },
          'grayscale': { method: 'Rec601Luma', intensity: 100 }
        };

        const defaultParams = defaults[effect.type] || {};
        Object.keys(defaultParams).forEach(key => {
          if (effect[key] === null || effect[key] === undefined) {
            effect[key] = defaultParams[key];
          }
        });
      }

      // 检查效果是否需要某个参数
      function needsRadius(type) {
        return ['blur', 'gaussian-blur', 'motion-blur', 'sharpen', 'unsharp', 'charcoal', 'oil-painting', 'sketch', 'emboss', 'edge', 'spread', 'vignette'].includes(type);
      }

      function needsMethod(type) {
        return ['grayscale'].includes(type);
      }

      function needsGrayscaleIntensity(type) {
        return ['grayscale'].includes(type);
      }

      function needsSigma(type) {
        return ['blur', 'charcoal', 'sketch', 'emboss', 'vignette'].includes(type);
      }

      function needsIntensity(type) {
        return ['sepia', 'colorize', 'tint'].includes(type);
      }

      function needsValue(type) {
        return ['brightness', 'contrast', 'saturation', 'hue', 'gamma', 'threshold'].includes(type);
      }

      function needsColor(type) {
        return ['colorize', 'tint'].includes(type);
      }

      function needsSize(type) {
        return ['pixelate', 'mosaic'].includes(type);
      }

      function needsAngle(type) {
        return ['motion-blur', 'swirl'].includes(type);
      }

      function needsAmount(type) {
        return ['sharpen', 'unsharp', 'implode', 'explode'].includes(type);
      }

      function needsThreshold(type) {
        return ['unsharp', 'threshold', 'solarize'].includes(type);
      }

      function needsColors(type) {
        return ['quantize'].includes(type);
      }

      function needsLevels(type) {
        return ['posterize'].includes(type);
      }

      function needsNoiseType(type) {
        return ['noise'].includes(type);
      }

      function needsAmplitude(type) {
        return ['wave'].includes(type);
      }

      function needsWavelength(type) {
        return ['wave'].includes(type);
      }

      // 获取参数的最小值
      function getMinValue(type, param) {
        const mins = {
          'radius': { 'blur': 0, 'gaussian-blur': 0, 'motion-blur': 0, 'sharpen': 0, 'unsharp': 0, 'charcoal': 0, 'oil-painting': 1, 'sketch': 0, 'emboss': 0, 'edge': 0, 'spread': 0, 'vignette': 0 },
          'sigma': { 'blur': 0, 'charcoal': 0, 'sketch': 0, 'emboss': 0, 'vignette': 0 },
          'intensity': { 'sepia': 0, 'colorize': 0, 'tint': 0 },
          'value': { 'brightness': -100, 'contrast': -100, 'saturation': -100, 'hue': -100, 'gamma': 0.1, 'threshold': 0 },
          'size': { 'pixelate': 1, 'mosaic': 1 },
          'angle': { 'motion-blur': -180, 'swirl': -360 },
          'amount': { 'sharpen': 0, 'unsharp': 0, 'implode': -1, 'explode': -1 },
          'threshold': { 'unsharp': 0, 'threshold': 0, 'solarize': 0 },
          'colors': { 'quantize': 2 },
          'levels': { 'posterize': 2 },
          'amplitude': { 'wave': 1 },
          'wavelength': { 'wave': 1 }
        };
        return mins[param]?.[type] ?? 0;
      }

      // 获取参数的最大值
      function getMaxValue(type, param) {
        const maxs = {
          'radius': { 'blur': 100, 'gaussian-blur': 100, 'motion-blur': 100, 'sharpen': 10, 'unsharp': 10, 'charcoal': 10, 'oil-painting': 20, 'sketch': 10, 'emboss': 10, 'edge': 10, 'spread': 50, 'vignette': 500 },
          'sigma': { 'blur': 100, 'charcoal': 10, 'sketch': 10, 'emboss': 10, 'vignette': 500 },
          'intensity': { 'sepia': 100, 'colorize': 100, 'tint': 100 },
          'value': { 'brightness': 100, 'contrast': 100, 'saturation': 100, 'hue': 100, 'gamma': 5.0, 'threshold': 100 },
          'size': { 'pixelate': 100, 'mosaic': 100 },
          'angle': { 'motion-blur': 180, 'swirl': 360 },
          'amount': { 'sharpen': 10, 'unsharp': 10, 'implode': 1, 'explode': 1 },
          'threshold': { 'unsharp': 1, 'threshold': 100, 'solarize': 100 },
          'colors': { 'quantize': 256 },
          'levels': { 'posterize': 256 },
          'amplitude': { 'wave': 100 },
          'wavelength': { 'wave': 1000 }
        };
        return maxs[param]?.[type] ?? 100;
      }

      // 获取参数的步进值
      function getStepValue(type, param) {
        const steps = {
          'radius': { 'blur': 0.1, 'gaussian-blur': 0.1, 'motion-blur': 0.1, 'sharpen': 0.1, 'unsharp': 0.1, 'charcoal': 0.1, 'oil-painting': 1, 'sketch': 0.1, 'emboss': 0.1, 'edge': 0.1, 'spread': 0.1, 'vignette': 1 },
          'sigma': { 'blur': 0.1, 'charcoal': 0.1, 'sketch': 0.1, 'emboss': 0.1, 'vignette': 1 },
          'intensity': { 'sepia': 1, 'colorize': 1, 'tint': 1 },
          'value': { 'brightness': 1, 'contrast': 1, 'saturation': 1, 'hue': 1, 'gamma': 0.1, 'threshold': 1 },
          'amount': { 'sharpen': 0.1, 'unsharp': 0.01, 'implode': 0.01, 'explode': 0.01 },
          'threshold': { 'unsharp': 0.01, 'threshold': 1, 'solarize': 1 }
        };
        return steps[param]?.[type] ?? 1;
      }

      // 格式化参数值显示
      function formatParamValue(value, step) {
        if (value === null || value === undefined) return '0';
        if (step < 1) {
          return value.toFixed(step < 0.1 ? 2 : 1);
        }
        return Math.round(value).toString();
      }

      // 获取参数单位
      function getParamUnit(type, param) {
        const units = {
          'radius': { 'blur': '像素', 'gaussian-blur': '像素', 'motion-blur': '像素', 'sharpen': '像素', 'unsharp': '像素', 'charcoal': '像素', 'sketch': '像素', 'emboss': '像素', 'edge': '像素', 'spread': '像素', 'vignette': '像素' },
          'sigma': { 'blur': '像素', 'charcoal': '像素', 'sketch': '像素', 'emboss': '像素', 'vignette': '像素' },
          'value': { 'brightness': '%', 'contrast': '%', 'saturation': '%', 'hue': '%', 'gamma': '', 'threshold': '%' },
          'amount': { 'sharpen': '倍', 'unsharp': '倍' },
          'threshold': { 'unsharp': '', 'threshold': '%', 'solarize': '%' }
        };
        return units[param]?.[type] || '';
      }

      // 获取数值参数的标签
      function getValueLabel(type) {
        const labels = {
          'brightness': '亮度',
          'contrast': '对比度',
          'saturation': '饱和度',
          'hue': '色相',
          'gamma': '伽马值',
          'threshold': '阈值'
        };
        return labels[type] || '数值';
      }

      // 获取参数说明
      function getParamDescription(type, param) {
        const descriptions = {
          'radius': {
            'blur': '控制模糊的半径大小，值越大越模糊',
            'gaussian-blur': '高斯模糊的半径，产生更自然的模糊效果',
            'motion-blur': '运动模糊的距离，模拟运动效果',
            'sharpen': '锐化的半径，值越大锐化范围越广',
            'unsharp': '非锐化遮罩的半径',
            'charcoal': '炭笔画效果的半径',
            'oil-painting': '油画效果的笔触半径，值越大笔触越粗',
            'sketch': '素描效果的半径',
            'emboss': '浮雕效果的半径',
            'edge': '边缘检测的半径',
            'spread': '扩散效果的半径',
            'vignette': '晕影效果的半径'
          },
          'sigma': {
            'blur': '模糊的标准差，控制模糊的强度分布',
            'charcoal': '炭笔画的标准差',
            'sketch': '素描的标准差',
            'emboss': '浮雕的标准差',
            'vignette': '晕影的标准差'
          },
          'intensity': {
            'sepia': '怀旧效果的强度，0-100%',
            'colorize': '着色的强度，0-100%',
            'tint': '色调的强度，0-100%'
          },
          'value': {
            'brightness': '调整图片亮度，-100到+100',
            'contrast': '调整图片对比度，-100到+100',
            'saturation': '调整图片饱和度，-100到+100',
            'hue': '调整图片色相，-100到+100',
            'gamma': '伽马校正值，通常0.1-5.0',
            'threshold': '阈值化处理的阈值，0-100%'
          },
          'color': {
            'colorize': '着色效果的颜色',
            'tint': '色调效果的颜色'
          },
          'size': {
            'pixelate': '像素化的块大小',
            'mosaic': '马赛克的块大小'
          },
          'angle': {
            'motion-blur': '运动模糊的角度，-180到180度',
            'swirl': '漩涡效果的角度，-360到360度'
          },
          'amount': {
            'sharpen': '锐化的强度倍数',
            'unsharp': '非锐化遮罩的强度倍数',
            'implode': '内爆效果的强度，0-1，值越大收缩越明显',
            'explode': '爆炸效果的强度，0-1，值越大扩张越明显'
          },
          'threshold': {
            'unsharp': '非锐化遮罩的阈值',
            'threshold': '二值化的阈值',
            'solarize': '曝光效果的阈值'
          },
          'colors': {
            'quantize': '量化后的颜色数量，2-256'
          },
          'levels': {
            'posterize': '海报化的颜色级别数，2-256'
          },
          'noiseType': {
            'noise': '噪点的分布类型'
          },
          'amplitude': {
            'wave': '波浪效果的振幅，控制波浪的高度'
          },
          'wavelength': {
            'wave': '波浪效果的波长，控制波浪的宽度'
          }
        };
        return descriptions[param]?.[type] || '';
      }

      // 应用效果
      async function handleEffects() {
        if (!state.effectsCurrentFilename) {
          addDebugLog('请先上传图片', 'error');
          return;
        }

        if (state.effectsList.length === 0) {
          addDebugLog('请至少添加一个效果', 'error');
          return;
        }

        state.loading.effects = true;
        addDebugLog(`开始应用 ${state.effectsList.length} 个效果`, 'info');

        try {
          // 构建效果数组，只包含有效的参数
          const effects = state.effectsList.map(effect => {
            const cleanEffect = { type: effect.type };
            
            // 只添加非 null 和非 undefined 的参数
            Object.keys(effect).forEach(key => {
              if (key !== 'type' && effect[key] !== null && effect[key] !== undefined) {
                cleanEffect[key] = effect[key];
              }
            });
            
            return cleanEffect;
          });

          const { data } = await axios.post(`${BASE_URL}/api/effects`, {
            filename: state.effectsCurrentFilename,
            effects: effects
          });

          if (data.success) {
            state.effectsResultImage = `${BASE_URL}${data.path}`;
            state.effectsResultFilename = data.outputFile;
            addDebugLog('应用效果成功', 'success');
          } else {
            addDebugLog(`应用效果失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`应用效果错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.effects = false;
        }
      }

      // ========== 链式处理相关函数 ==========
      
      // 检查是否是有效的 HTTP URL
      function isValidHttpUrl(str) {
        try {
          const url = new URL(str);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      }
      
      // 更新图片预览（当 URL 或文件名改变时）
      function updateChainProcessImagePreview() {
        if (!state.chainProcessImageUrl || !state.chainProcessImageUrl.trim()) {
          state.chainProcessImage = null;
          state.chainProcessFilename = null;
          state.chainProcessImageInfo = null;
          return;
        }
        
        const urlOrFilename = state.chainProcessImageUrl.trim();
        
        // 如果是 HTTP URL，直接使用作为预览
        if (isValidHttpUrl(urlOrFilename)) {
          state.chainProcessImage = urlOrFilename;
          state.chainProcessFilename = urlOrFilename; // 用于后续处理
        } else {
          // 本地文件名，从 uploads 目录加载预览
          state.chainProcessImage = `${BASE_URL}/uploads/${urlOrFilename}`;
          state.chainProcessFilename = urlOrFilename;
          // 尝试加载图片信息
          loadChainProcessImageInfo();
        }
      }
      
      // 加载图片信息（仅本地文件）
      async function loadChainProcessImageInfo() {
        if (!state.chainProcessFilename || isValidHttpUrl(state.chainProcessFilename)) return;
        
        try {
          const { data } = await axios.post(`${BASE_URL}/api/info`, {
            filename: state.chainProcessFilename
          });
          if (data.success) {
            state.chainProcessImageInfo = data.info;
          }
        } catch (e) {
          console.error('加载图片信息失败:', e);
        }
      }
      
      // 添加操作
      function addOperation(typeOrMeta) {
        // 兼容：既支持传入字符串（旧逻辑），也支持传入包含 baseType/meta 的对象
        let meta;
        if (typeof typeOrMeta === 'string') {
          meta = operationTypes.find(o => o.value === typeOrMeta) || {
            value: typeOrMeta,
            baseType: typeOrMeta,
            meta: {}
          };
        } else {
          meta = typeOrMeta;
        }

        const baseType = meta.baseType || meta.value || meta.type;
        const defaultParams = getDefaultParams(baseType, meta);

        const operation = {
          id: Date.now(),
          type: baseType,
          // subtypeKey 用于在 UI 中显示更细粒度的名称（如 “效果 / 黑白化”）
          subtypeKey: meta.value || baseType,
          params: defaultParams
        };
        state.operationChain.push(operation);
        addDebugLog(`添加操作: ${getOperationLabel(operation)}`, 'info');
      }
      
      // 添加选中的操作
      function addSelectedOperation() {
        if (!state.selectedOperationType) {
          addDebugLog('请先选择操作类型', 'error');
          return;
        }
        const meta = operationTypes.find(o => o.value === state.selectedOperationType);
        addOperation(meta || state.selectedOperationType);
        state.selectedOperationType = ''; // 添加后清空选择
        // 切换到新添加的操作
        state.selectedOperationIndex = state.operationChain.length - 1;
      }
      
      // 切换操作tab
      function selectOperation(index) {
        if (index >= 0 && index < state.operationChain.length) {
          state.selectedOperationIndex = index;
        }
      }
      
      // 删除操作时调整选中索引
      function removeOperationWithIndex(index) {
        removeOperation(index);
        // 如果删除的是当前选中的，调整索引
        if (index === state.selectedOperationIndex) {
          if (state.operationChain.length > 0) {
            state.selectedOperationIndex = Math.min(index, state.operationChain.length - 1);
          } else {
            state.selectedOperationIndex = 0;
          }
        } else if (index < state.selectedOperationIndex) {
          state.selectedOperationIndex--;
        }
      }
      
      // 删除操作
      function removeOperation(index) {
        const op = state.operationChain[index];
        state.operationChain.splice(index, 1);
        addDebugLog(`删除操作: ${getOperationLabel(op)}`, 'info');
      }
      
      // 上移操作
      function moveOperationUp(index) {
        if (index > 0) {
          const temp = state.operationChain[index];
          state.operationChain[index] = state.operationChain[index - 1];
          state.operationChain[index - 1] = temp;
        }
      }
      
      // 下移操作
      function moveOperationDown(index) {
        if (index < state.operationChain.length - 1) {
          const temp = state.operationChain[index];
          state.operationChain[index] = state.operationChain[index + 1];
          state.operationChain[index + 1] = temp;
        }
      }
      
      // 获取操作标签
      function getOperationLabel(operationOrType) {
        let key = '';
        if (typeof operationOrType === 'string') {
          key = operationOrType;
        } else if (operationOrType && typeof operationOrType === 'object') {
          key = operationOrType.subtypeKey || operationOrType.type;
        }
        const op = operationTypes.find(o => o.value === key) || operationTypes.find(o => o.baseType === key);
        return op ? op.label : key;
      }
      
      function getOperationDescription(operationOrType) {
        let key = '';
        if (typeof operationOrType === 'string') {
          key = operationOrType;
        } else if (operationOrType && typeof operationOrType === 'object') {
          key = operationOrType.subtypeKey || operationOrType.type;
        }
        const op = operationTypes.find(o => o.value === key) || operationTypes.find(o => o.baseType === key);
        return op ? op.description : '';
      }
      
      // 文件管理相关函数
      async function loadFilesList(directory) {
        if (!directory || !['uploads', 'output'].includes(directory)) {
          return;
        }
        
        state.filesLoading[directory] = true;
        addDebugLog(`加载 ${directory} 目录文件列表...`, 'info');
        
        try {
          const { data } = await axios.get(`${BASE_URL}/api/files/list`, {
            params: { directory }
          });
          
          if (data.success) {
            state.filesList[directory] = data.files || [];
            state.filesStats[directory] = {
              totalSize: data.totalSize || 0,
              totalSizeFormatted: data.totalSizeFormatted || '0 B',
              count: data.files ? data.files.length : 0
            };
            addDebugLog(`成功加载 ${directory} 目录，共 ${data.files.length} 个文件`, 'success');
          } else {
            addDebugLog(`加载 ${directory} 目录失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`加载 ${directory} 目录错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.filesLoading[directory] = false;
        }
      }
      
      function switchFilesDirectory(directory) {
        state.filesCurrentDirectory = directory;
        loadFilesList(directory);
      }
      
      async function deleteFile(directory, filename) {
        if (!confirm(`确定要删除文件 "${filename}" 吗？此操作不可恢复！`)) {
          return;
        }
        
        addDebugLog(`删除文件: ${directory}/${filename}`, 'info');
        
        try {
          const { data } = await axios.delete(`${BASE_URL}/api/files/delete`, {
            data: { directory, filename }
          });
          
          if (data.success) {
            addDebugLog(`文件删除成功: ${filename}`, 'success');
            // 重新加载文件列表
            await loadFilesList(directory);
          } else {
            addDebugLog(`文件删除失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`删除文件错误: ${e.response?.data?.error || e.message}`, 'error');
        }
      }
      
      async function clearDirectory(directory) {
        const dirName = directory === 'uploads' ? '上传文件' : '输出文件';
        if (!confirm(`确定要清空 ${dirName} 目录吗？此操作将删除所有文件且不可恢复！`)) {
          return;
        }
        
        addDebugLog(`清空目录: ${directory}`, 'info');
        
        try {
          const { data } = await axios.delete(`${BASE_URL}/api/files/clear`, {
            params: { directory }
          });
          
          if (data.success) {
            addDebugLog(`目录清空成功: 删除了 ${data.deletedCount} 个文件，释放 ${data.totalSizeFormatted}`, 'success');
            // 重新加载文件列表
            await loadFilesList(directory);
          } else {
            addDebugLog(`目录清空失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`清空目录错误: ${e.response?.data?.error || e.message}`, 'error');
        }
      }
      
      // 显示文件预览
      function showFilePreview(file) {
        state.filePreviewFile = file;
        state.filePreviewVisible = true;
        state.imageLoadError = false;
        // 阻止背景滚动
        document.body.style.overflow = 'hidden';
      }
      
      // 关闭文件预览
      function closeFilePreview() {
        state.filePreviewVisible = false;
        state.filePreviewFile = null;
        state.imageLoadError = false;
        // 恢复背景滚动
        document.body.style.overflow = '';
      }
      
      // 处理图片加载错误
      function handleImageError() {
        state.imageLoadError = true;
      }
      
      // 获取默认参数（不在 params 中保存 effectType / filterType，效果类型只由 type 表达）
      function getDefaultParams(type, meta) {
        // 如果使用配置系统，尝试从配置中获取默认参数
        if (meta && meta._config && meta._config.params) {
          const configParams = { ...meta._config.params.defaults };
          if (configParams && Object.keys(configParams).length > 0) {
            return configParams;
          }
        }
        
        // 向后兼容：使用内联默认值
        const baseDefaults = {
          resize: { width: 800, height: 600, maintainAspectRatio: true, quality: 90 },
          crop: { x: 0, y: 0, width: 500, height: 500 },
          shapeCrop: { shape: 'circle', x: null, y: null, width: 200, height: 200, backgroundColor: 'transparent' },
          rotate: { degrees: 90, backgroundColor: '#000000' },
          convert: { format: 'jpg', quality: 90 },
          watermark: { type: 'text', text: '水印', fontSize: 24, color: '#FFFFFF', position: 'bottom-right', opacity: 0.5 },
          adjust: { brightness: 0, contrast: 0, saturation: 0 },
          // filter / effects 只在 params 中保留真正的参数字段，不再包含 filterType / effectType
          filter: { intensity: 1 },
          effects: { method: 'Rec601Luma', intensity: 100 }
        };

        const defaults = { ...(baseDefaults[type] || {}) };

        return defaults;
      }

      // 判断是否为 filter 类型操作
      function isFilterOperation(operation) {
        if (!operation) return false;
        const key = operation.subtypeKey || operation.type || '';
        return typeof key === 'string' && key.startsWith('filter-');
      }
      
      // 判断是否为 effects 类型操作
      function isEffectsOperation(operation) {
        if (!operation) return false;
        const key = operation.subtypeKey || operation.type || '';
        return typeof key === 'string' && (key.startsWith('effects-') || key.startsWith('effect-'));
      }
      
      // 根据操作获取效果 key（例如 'effects-grayscale' -> 'grayscale'）
      function getEffectKeyFromOperation(operation) {
        if (!operation) return '';
        let key = operation.subtypeKey || operation.type || '';
        if (typeof key !== 'string') return '';
        if (key.startsWith('effects-')) {
          return key.slice('effects-'.length);
        }
        if (key.startsWith('effect-')) {
          return key.slice('effect-'.length);
        }
        return key;
      }
      
      // 获取操作参数（用于显示）
      function getOperationParams(operation) {
        return JSON.stringify(operation.params, null, 2);
      }
      
      // 更新操作参数
      function updateOperationParams(index, key, value) {
        if (state.operationChain[index]) {
          if (key.includes('.')) {
            const keys = key.split('.');
            let obj = state.operationChain[index].params;
            for (let i = 0; i < keys.length - 1; i++) {
              if (!obj[keys[i]]) obj[keys[i]] = {};
              obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
          } else {
            state.operationChain[index].params[key] = value;
          }
        }
      }
      
      // 获取请求负载（实时预览）
      function getRequestPayload() {
        if (!state.chainProcessImageUrl || !state.chainProcessImageUrl.trim()) return null;
        const urlOrFilename = state.chainProcessImageUrl.trim();
        return {
          filename: urlOrFilename, // 可以是本地文件名或网络 URL
          operations: state.operationChain.map(op => {
            // 扁平类型优先：filter-sharpen / effects-grayscale 等
            const type = op.subtypeKey || op.type;
            return {
              type,
              params: op.params
            };
          })
        };
      }
      
      // 执行链式处理
      async function handleChainProcess() {
        if (!state.chainProcessImageUrl || !state.chainProcessImageUrl.trim()) {
          addDebugLog('请输入图片地址（文件名或 URL）', 'error');
          return;
        }
        
        if (state.operationChain.length === 0) {
          addDebugLog('请至少添加一个操作', 'error');
          return;
        }
        
        state.loading.chainProcess = true;
        addDebugLog('开始链式处理...', 'info');
        
        try {
          const payload = getRequestPayload();
          addDebugLog(`请求参数: ${JSON.stringify(payload, null, 2)}`, 'info');
          
          const { data } = await axios.post(`${BASE_URL}/api/process`, payload);
          
          if (data.success) {
            state.chainProcessResultImage = `${BASE_URL}${data.path}`;
            state.chainProcessResultFilename = data.outputFile;
            addDebugLog('链式处理成功', 'success');
            if (data.commands) {
              data.commands.forEach((cmd, i) => {
                addDebugLog(`命令 ${i + 1}: ${cmd}`, 'info');
              });
            }
          } else {
            addDebugLog(`处理失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`处理错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.chainProcess = false;
        }
      }
      
      // 使用处理结果作为新源
      function useChainProcessAsSource() {
        if (state.chainProcessResultImage && state.chainProcessResultFilename) {
          // 使用处理后的文件名（本地文件）
          state.chainProcessImageUrl = state.chainProcessResultFilename;
          state.chainProcessImage = state.chainProcessResultImage;
          state.chainProcessFilename = state.chainProcessResultFilename;
          state.chainProcessResultImage = null;
          state.chainProcessResultFilename = null;
          state.operationChain = [];
          addDebugLog('已设置为新的源图片', 'info');
          loadChainProcessImageInfo();
        }
      }
      
      // AI处理相关函数
      async function updateAiProcessImagePreview() {
        if (!state.aiProcessImageUrl || !state.aiProcessImageUrl.trim()) {
          state.aiProcessImage = null;
          state.aiProcessFilename = null;
          state.aiProcessImageInfo = null;
          return;
        }
        
        // 判断是URL还是本地文件名
        if (state.aiProcessImageUrl.startsWith('http://') || state.aiProcessImageUrl.startsWith('https://')) {
          // 网络URL，直接使用
          state.aiProcessImage = state.aiProcessImageUrl;
          state.aiProcessFilename = state.aiProcessImageUrl;
        } else {
          // 本地文件名
          state.aiProcessImage = `${BASE_URL}/uploads/${state.aiProcessImageUrl}`;
          state.aiProcessFilename = state.aiProcessImageUrl;
        }
        
        // 尝试获取图片信息
        try {
          if (!state.aiProcessImageUrl.startsWith('http://') && !state.aiProcessImageUrl.startsWith('https://')) {
            const { data } = await axios.post(`${BASE_URL}/api/info`, {
              filename: state.aiProcessImageUrl
            });
            if (data.success) {
              state.aiProcessImageInfo = data.info;
            }
          }
        } catch (e) {
          console.warn('获取图片信息失败:', e);
        }
      }
      
      async function handleAiProcess() {
        if (!state.aiProcessImageUrl || !state.aiProcessImageUrl.trim()) {
          addDebugLog('请输入图片地址（文件名或 URL）', 'error');
          return;
        }
        
        if (!state.aiProcessPrompt || !state.aiProcessPrompt.trim()) {
          addDebugLog('请输入处理描述（prompt）', 'error');
          return;
        }
        
        state.loading.aiProcess = true;
        addDebugLog('开始AI处理...', 'info');
        addDebugLog(`Prompt: ${state.aiProcessPrompt}`, 'info');
        
        try {
          const payload = {
            prompt: state.aiProcessPrompt,
            image: state.aiProcessImageUrl
          };
          
          addDebugLog(`请求参数: ${JSON.stringify(payload, null, 2)}`, 'info');
          
          const { data } = await axios.post(`${BASE_URL}/api/process-with-prompt`, payload);
          
          if (data.success) {
            state.aiProcessResultImage = `${BASE_URL}${data.path}`;
            state.aiProcessResultFilename = data.outputFile;
            state.aiProcessOperations = data.operations;
            state.aiProcessCommand = data.command;
            state.aiProcessExecutedCommands = data.executedCommands;
            addDebugLog('AI处理成功', 'success');
            addDebugLog(`AI分析的命令: ${data.command}`, 'info');
            if (data.executedCommands) {
              data.executedCommands.forEach((cmd, i) => {
                addDebugLog(`执行命令 ${i + 1}: ${cmd}`, 'info');
              });
            }
          } else {
            addDebugLog(`处理失败: ${data.error}`, 'error');
          }
        } catch (e) {
          addDebugLog(`处理错误: ${e.response?.data?.error || e.message}`, 'error');
        } finally {
          state.loading.aiProcess = false;
        }
      }
      
      function clearAiProcess() {
        state.aiProcessImageUrl = '';
        state.aiProcessImage = null;
        state.aiProcessFilename = null;
        state.aiProcessImageInfo = null;
        state.aiProcessPrompt = '';
        state.aiProcessResultImage = null;
        state.aiProcessResultFilename = null;
        state.aiProcessOperations = null;
        state.aiProcessCommand = null;
        state.aiProcessExecutedCommands = null;
      }
      
      
      // 使用效果结果作为新源图片
      function useEffectsAsSource() {
        if (state.effectsResultImage && state.effectsResultFilename) {
          state.effectsCurrentImage = state.effectsResultImage;
          state.effectsCurrentFilename = state.effectsResultFilename;
          state.effectsResultImage = null;
          state.effectsResultFilename = null;
          addDebugLog('已设置为新的源图片', 'info');
          loadEffectsImageInfo();
        }
      }

      // 页面加载时
      onMounted(() => {
        addDebugLog('系统初始化完成', 'info');
        checkHealth();
        checkImageProcessor();
      });

      return {
        state,
        watermarkImageInput,
        menuItems,
        operationTypes,
        debugTabs,
        filteredDebugLogs,
        switchView,
        checkHealth,
        checkImageProcessor,
        handleUrlUpload,
        handleAnalyzeUrlUpload,
        loadAnalyzeImageInfo,
        copyAnalyzeInfo,
        updateVariationsImagePreview,
        loadVariationsImageInfo,
        handleVariations,
        copyImageUrl,
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
        clearDebugLog,
        handleEffectsUrlUpload,
        loadEffectsImageInfo,
        addEffect,
        removeEffect,
        clearEffects,
        getEffectName,
        getEffectKeyFromOperation,
        isFilterOperation,
        isEffectsOperation,
        updateEffectParams,
        needsRadius,
        needsSigma,
        needsIntensity,
        needsValue,
        needsColor,
        needsSize,
        needsAngle,
        needsAmount,
        needsThreshold,
        needsColors,
        needsLevels,
        needsNoiseType,
        needsAmplitude,
        needsWavelength,
        needsMethod,
        needsGrayscaleIntensity,
        getEffectOfficialTerm,
        getEffectDescription,
        getEffectExplanation,
        getMinValue,
        getMaxValue,
        getStepValue,
        formatParamValue,
        getParamUnit,
        getValueLabel,
        getParamDescription,
        handleEffects,
        useEffectsAsSource,
        // 链式处理相关函数
        updateChainProcessImagePreview,
        loadChainProcessImageInfo,
        addOperation,
        addSelectedOperation,
        selectOperation,
        removeOperation,
        removeOperationWithIndex,
        moveOperationUp,
        moveOperationDown,
        getOperationLabel,
        getOperationDescription,
        getOperationParams,
        updateOperationParams,
        getRequestPayload,
        handleChainProcess,
        useChainProcessAsSource,
        // AI处理相关函数
        updateAiProcessImagePreview,
        handleAiProcess,
        clearAiProcess,
        // 文件管理相关函数
        loadFilesList,
        switchFilesDirectory,
        deleteFile,
        clearDirectory,
        formatFileSize,
        showFilePreview,
        closeFilePreview,
        handleImageError
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
