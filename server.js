import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import imagemagick from './lib/imagemagick.js';
import aiService from './lib/ai-service.js';

// ES Module 中获取 __dirname 的等价方式
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 将前端传入的“平铺小颗粒操作类型”归一化为内部基础类型
 *
 * 设计目标：
 * - 对外：可以直接使用诸如 grayscale、sepia、blur 等细粒度类型（全部平铺）
 * - 对内：仍然复用现有的 filter / effects 处理逻辑，保证兼容性
 *
 * 说明：
 * - 如果传入的是旧版基础类型（resize / crop / filter / effects 等），则保持不变；
 * - 如果传入的是新平铺类型（如 effect_grayscale / grayscale 等），则映射为：
 *   - type: 'effects' 或 'filter'
 *   - params: 自动补齐 effectType / filterType 及默认参数
 */
const FLAT_EFFECT_TYPE_MAP = {
  // 灰度 / 黑白
  grayscale: { baseType: 'effects', effectType: 'grayscale', defaults: { method: 'Rec601Luma', intensity: 100 } },
  effect_grayscale: { baseType: 'effects', effectType: 'grayscale', defaults: { method: 'Rec601Luma', intensity: 100 } },
  // 负片
  negate: { baseType: 'effects', effectType: 'negate', defaults: {} },
  effect_negate: { baseType: 'effects', effectType: 'negate', defaults: {} },
  // 怀旧 / 棕褐色
  sepia: { baseType: 'effects', effectType: 'sepia', defaults: { intensity: 80 } },
  effect_sepia: { baseType: 'effects', effectType: 'sepia', defaults: { intensity: 80 } },
  // 模糊相关
  blur: { baseType: 'effects', effectType: 'blur', defaults: { radius: 5, sigma: 5 } },
  effect_blur: { baseType: 'effects', effectType: 'blur', defaults: { radius: 5, sigma: 5 } },
  gaussian_blur: { baseType: 'effects', effectType: 'gaussian-blur', defaults: { radius: 5 } },
  'gaussian-blur': { baseType: 'effects', effectType: 'gaussian-blur', defaults: { radius: 5 } },
  motion_blur: { baseType: 'effects', effectType: 'motion-blur', defaults: { radius: 10, angle: 0 } },
  'motion-blur': { baseType: 'effects', effectType: 'motion-blur', defaults: { radius: 10, angle: 0 } },
  // 锐化相关
  sharpen: { baseType: 'effects', effectType: 'sharpen', defaults: { radius: 1, amount: 1 } },
  effect_sharpen: { baseType: 'effects', effectType: 'sharpen', defaults: { radius: 1, amount: 1 } },
  unsharp: { baseType: 'effects', effectType: 'unsharp', defaults: { radius: 1, amount: 1, threshold: 0.05 } },
  effect_unsharp: { baseType: 'effects', effectType: 'unsharp', defaults: { radius: 1, amount: 1, threshold: 0.05 } },
  // 艺术效果
  charcoal: { baseType: 'effects', effectType: 'charcoal', defaults: { radius: 1, sigma: 0.5 } },
  effect_charcoal: { baseType: 'effects', effectType: 'charcoal', defaults: { radius: 1, sigma: 0.5 } },
  oil_painting: { baseType: 'effects', effectType: 'oil-painting', defaults: { radius: 3 } },
  'oil-painting': { baseType: 'effects', effectType: 'oil-painting', defaults: { radius: 3 } },
  sketch: { baseType: 'effects', effectType: 'sketch', defaults: { radius: 1, sigma: 0.5 } },
  effect_sketch: { baseType: 'effects', effectType: 'sketch', defaults: { radius: 1, sigma: 0.5 } },
  emboss: { baseType: 'effects', effectType: 'emboss', defaults: { radius: 1, sigma: 0.5 } },
  effect_emboss: { baseType: 'effects', effectType: 'emboss', defaults: { radius: 1, sigma: 0.5 } },
  edge: { baseType: 'effects', effectType: 'edge', defaults: { radius: 1 } },
  effect_edge: { baseType: 'effects', effectType: 'edge', defaults: { radius: 1 } },
  posterize: { baseType: 'effects', effectType: 'posterize', defaults: { levels: 4 } },
  pixelate: { baseType: 'effects', effectType: 'pixelate', defaults: { size: 10 } },
  mosaic: { baseType: 'effects', effectType: 'mosaic', defaults: { size: 10 } },
  // 颜色调整
  brightness: { baseType: 'effects', effectType: 'brightness', defaults: { value: 0 } },
  contrast: { baseType: 'effects', effectType: 'contrast', defaults: { value: 0 } },
  saturation: { baseType: 'effects', effectType: 'saturation', defaults: { value: 0 } },
  hue: { baseType: 'effects', effectType: 'hue', defaults: { value: 0 } },
  colorize: { baseType: 'effects', effectType: 'colorize', defaults: { color: '#FF0000', intensity: 50 } },
  tint: { baseType: 'effects', effectType: 'tint', defaults: { color: '#FFD700', intensity: 50 } },
  // 噪点 / 纹理
  noise: { baseType: 'effects', effectType: 'noise', defaults: { noiseType: 'Uniform' } },
  despeckle: { baseType: 'effects', effectType: 'despeckle', defaults: {} },
  texture: { baseType: 'effects', effectType: 'texture', defaults: { textureType: 'Canvas' } },
  // 特殊效果
  vignette: { baseType: 'effects', effectType: 'vignette', defaults: { radius: 100, sigma: 50 } },
  solarize: { baseType: 'effects', effectType: 'solarize', defaults: { threshold: 50 } },
  swirl: { baseType: 'effects', effectType: 'swirl', defaults: { degrees: 90 } },
  wave: { baseType: 'effects', effectType: 'wave', defaults: { amplitude: 25, wavelength: 150 } },
  implode: { baseType: 'effects', effectType: 'implode', defaults: { amount: 0.5 } },
  explode: { baseType: 'effects', effectType: 'explode', defaults: { amount: 0.5 } },
  spread: { baseType: 'effects', effectType: 'spread', defaults: { radius: 3 } },
  normalize: { baseType: 'effects', effectType: 'normalize', defaults: {} },
  equalize: { baseType: 'effects', effectType: 'equalize', defaults: {} },
  gamma: { baseType: 'effects', effectType: 'gamma', defaults: { value: 1.0 } },
  threshold: { baseType: 'effects', effectType: 'threshold', defaults: { value: 50 } },
  quantize: { baseType: 'effects', effectType: 'quantize', defaults: { colors: 256 } },
  // 自适应效果
  'adaptive-blur': { baseType: 'effects', effectType: 'adaptive-blur', defaults: { radius: 5, sigma: 5 } },
  adaptive_blur: { baseType: 'effects', effectType: 'adaptive-blur', defaults: { radius: 5, sigma: 5 } },
  'adaptive-sharpen': { baseType: 'effects', effectType: 'adaptive-sharpen', defaults: { radius: 1, sigma: 1 } },
  adaptive_sharpen: { baseType: 'effects', effectType: 'adaptive-sharpen', defaults: { radius: 1, sigma: 1 } },
  // 形态学操作
  morphology: { baseType: 'effects', effectType: 'morphology', defaults: { method: 'Erode', kernel: 'Disk', size: 3 } },
  // 颜色空间转换
  colorspace: { baseType: 'effects', effectType: 'colorspace', defaults: { space: 'RGB' } },
  // 自动调整
  'auto-level': { baseType: 'effects', effectType: 'auto-level', defaults: {} },
  auto_level: { baseType: 'effects', effectType: 'auto-level', defaults: {} },
  'auto-gamma': { baseType: 'effects', effectType: 'auto-gamma', defaults: {} },
  auto_gamma: { baseType: 'effects', effectType: 'auto-gamma', defaults: {} },
  'auto-contrast': { baseType: 'effects', effectType: 'auto-contrast', defaults: {} },
  auto_contrast: { baseType: 'effects', effectType: 'auto-contrast', defaults: {} },
  // 颜色矩阵
  'color-matrix': { baseType: 'effects', effectType: 'color-matrix', defaults: {} },
  color_matrix: { baseType: 'effects', effectType: 'color-matrix', defaults: {} },
  // 扭曲变形
  distort: { baseType: 'effects', effectType: 'distort', defaults: {} },
  // 自定义表达式
  fx: { baseType: 'effects', effectType: 'fx', defaults: {} },
};

const FLAT_FILTER_TYPE_MAP = {
  // 直接走 applyFilter 的简单滤镜
  filter_blur: { baseType: 'filter', filterType: 'blur', defaults: { intensity: 1 } },
  filter_sharpen: { baseType: 'filter', filterType: 'sharpen', defaults: { intensity: 1 } },
  filter_emboss: { baseType: 'filter', filterType: 'emboss', defaults: { intensity: 1 } },
  filter_edge: { baseType: 'filter', filterType: 'edge', defaults: { intensity: 1 } },
  filter_charcoal: { baseType: 'filter', filterType: 'charcoal', defaults: { intensity: 1 } },
  filter_oil_painting: { baseType: 'filter', filterType: 'oil-painting', defaults: { intensity: 1 } },
  filter_sepia: { baseType: 'filter', filterType: 'sepia', defaults: { intensity: 1 } },
  filter_grayscale: { baseType: 'filter', filterType: 'grayscale', defaults: { intensity: 1 } },
  filter_negate: { baseType: 'filter', filterType: 'negate', defaults: { intensity: 1 } },
};

function normalizeOperation(type, params = {}) {
  // 已有基础类型（几何/水印/颜色），直接返回
  const basicTypes = new Set([
    'resize',
    'crop',
    'shapeCrop',
    'rotate',
    'convert',
    'watermark',
    'adjust',
    'trim',
    'extent',
    'flip',
    'flop',
    'transpose',
    'transverse',
  ]);
  if (basicTypes.has(type)) {
    return { type, params };
  }

  // 明确禁用旧格式：不再直接接受 type: 'filter' 或 'effects'
  if (type === 'filter' || type === 'effects') {
    throw new Error('INVALID_OPERATION: legacy type "filter"/"effects" is no longer supported, please use "filter-xxx" or "effects-xxx".');
  }

  // 支持完全平铺的连字符风格：
  // - filter-sharpen  => { type: 'filter',  params: { filterType: 'sharpen', ... } }
  // - effects-grayscale / effect-grayscale => { type: 'effects', params: { effectType: 'grayscale', ... } }
  if (typeof type === 'string') {
    if (type.startsWith('filter-')) {
      const sub = type.slice('filter-'.length);
      const mergedParams = {
        ...(params || {}),
        filterType: sub,
        intensity: params.intensity !== undefined ? parseFloat(params.intensity) || 1 : 1,
      };
      return {
        type: 'filter',
        params: mergedParams,
      };
    }

    if (type.startsWith('effects-') || type.startsWith('effect-')) {
      const prefix = type.startsWith('effects-') ? 'effects-' : 'effect-';
      const sub = type.slice(prefix.length);
      const mergedParams = {
        ...(params || {}),
        effectType: sub,
      };
      return {
        type: 'effects',
        params: mergedParams,
      };
    }
  }

  // 尝试按平铺 effects 映射
  if (FLAT_EFFECT_TYPE_MAP[type]) {
    const meta = FLAT_EFFECT_TYPE_MAP[type];
    const mergedParams = {
      ...(meta.defaults || {}),
      ...(params || {}),
      effectType: meta.effectType,
    };
    return {
      type: meta.baseType,
      params: mergedParams,
    };
  }

  // 尝试按平铺 filter 映射
  if (FLAT_FILTER_TYPE_MAP[type]) {
    const meta = FLAT_FILTER_TYPE_MAP[type];
    const mergedParams = {
      ...(meta.defaults || {}),
      ...(params || {}),
      filterType: meta.filterType,
    };
    return {
      type: meta.baseType,
      params: mergedParams,
    };
  }

  // 兼容类似 "effects:grayscale" / "filter:blur" 的写法
  if (type.includes(':')) {
    const [group, sub] = type.split(':');
    if (group === 'effects' && sub) {
      return normalizeOperation(sub, params);
    }
    if (group === 'filter' && sub) {
      const mergedParams = {
        intensity: params.intensity !== undefined ? params.intensity : 1,
        ...params,
        filterType: sub,
      };
      return { type: 'filter', params: mergedParams };
    }
  }

  // 未识别的类型，保持原样（让后面的 switch 抛出“类型不支持”的错误）
  return { type, params };
}

const app = express();
const PORT = process.env.PORT || 1513;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Swagger 文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ImageMagick API 文档'
}));

// 确保必要的目录存在
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
const templateDir = path.join(__dirname, 'template');
[uploadsDir, outputDir, templateDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|webp|svg|tiff|ico/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片格式: jpeg, jpg, png, gif, bmp, webp, svg, tiff, ico'));
    }
  }
});

/**
 * 下载网络资源到指定目录
 * @param {string} url - 网络图片 URL
 * @param {string} targetDir - 目标目录
 * @returns {Promise<{filename: string, path: string, size: number, originalUrl: string}>}
 */
async function downloadFromUrl(url, targetDir = templateDir) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      
      // 只支持 http 和 https
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        reject(new Error(`不支持的协议: ${urlObj.protocol}，仅支持 http:// 和 https://`));
        return;
      }
      
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      protocol.get(url, {
        timeout: 30000, // 30秒超时
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`下载失败: HTTP ${response.statusCode}`));
          return;
        }
        
        // 从 URL 或 Content-Type 获取文件扩展名
        let ext = path.extname(urlObj.pathname);
        const contentType = response.headers['content-type'];
        
        // 如果没有扩展名，尝试从 Content-Type 推断
        if (!ext || ext === '') {
          const mimeToExt = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/bmp': '.bmp',
            'image/webp': '.webp',
            'image/svg+xml': '.svg',
            'image/tiff': '.tiff',
            'image/x-icon': '.ico'
          };
          const mimeType = contentType ? contentType.split(';')[0].trim() : '';
          ext = mimeToExt[mimeType] || '.jpg';
        }
        
        // 确保扩展名以 . 开头
        if (!ext.startsWith('.')) {
          ext = '.' + ext;
        }
        
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `downloaded_${uniqueSuffix}${ext}`;
        const filePath = path.join(targetDir, filename);
        
        const fileStream = fs.createWriteStream(filePath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          // 获取文件大小
          const stats = fs.statSync(filePath);
          resolve({
            filename: filename,
            path: filePath,
            size: stats.size,
            originalUrl: url
          });
        });
        
        fileStream.on('error', (err) => {
          fs.unlink(filePath, () => {}); // 删除不完整的文件
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      }).on('timeout', () => {
        reject(new Error('下载超时'));
      });
    } catch (error) {
      reject(new Error(`无效的 URL: ${error.message}`));
    }
  });
}

/**
 * 检查字符串是否是有效的 HTTP/HTTPS URL
 */
function isValidHttpUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 获取图片路径（处理 URL 或本地文件）
 * @param {string} image - 图片 URL 或本地文件名
 * @param {string} uploadsDir - 上传目录路径
 * @returns {Promise<{actualFilename: string, inputPath: string, downloadedFileInfo: object|null}>}
 */
async function getImagePath(image, uploadsDir) {
  let downloadedFileInfo = null;
  let actualFilename = null;
  let inputPath;

  if (isValidHttpUrl(image)) {
    try {
      console.log(`检测到网络图片 URL，开始下载: ${image}`);
      downloadedFileInfo = await downloadFromUrl(image, uploadsDir);
      actualFilename = downloadedFileInfo.filename;
      inputPath = downloadedFileInfo.path;
      console.log(`网络图片下载成功: ${actualFilename}`);
    } catch (downloadError) {
      throw new Error(`下载网络图片失败: ${downloadError.message}`);
    }
  } else {
    actualFilename = image;
    inputPath = path.join(uploadsDir, image);
    if (!fs.existsSync(inputPath)) {
      throw new Error('文件不存在');
    }
  }

  return { actualFilename, inputPath, downloadedFileInfo };
}

/**
 * 执行单个操作
 * @param {string} type - 操作类型
 * @param {object} params - 操作参数
 * @param {string} currentInputPath - 当前输入文件路径
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<string>} 返回执行的命令
 */
async function executeOperation(type, params, currentInputPath, outputPath) {
  let command;
  let finalOutputPath = outputPath;

  switch (type) {
    case 'resize':
      command = await imagemagick.resize(currentInputPath, outputPath, {
        width: parseInt(params.width),
        height: parseInt(params.height),
        quality: params.quality || 90,
        maintainAspectRatio: params.maintainAspectRatio !== false
      });
      break;
      
    case 'crop':
      command = await imagemagick.crop(currentInputPath, outputPath, {
        x: parseInt(params.x) || 0,
        y: parseInt(params.y) || 0,
        width: parseInt(params.width),
        height: parseInt(params.height)
      });
      break;
      
    case 'shapeCrop':
      const baseName = path.parse(currentInputPath).name;
      const shapeOutputPath = outputPath.replace(/\.[^.]+$/, '.png');
      command = await imagemagick.shapeCrop(currentInputPath, shapeOutputPath, {
        shape: params.shape,
        x: params.x !== undefined ? parseInt(params.x) : null,
        y: params.y !== undefined ? parseInt(params.y) : null,
        width: parseInt(params.width) || 200,
        height: parseInt(params.height) || 200,
        backgroundColor: params.backgroundColor || 'transparent'
      });
      finalOutputPath = shapeOutputPath;
      break;
      
    case 'rotate':
      command = await imagemagick.rotate(currentInputPath, outputPath, {
        degrees: parseFloat(params.degrees) || 0,
        backgroundColor: params.backgroundColor || '#000000'
      });
      break;
      
    case 'convert':
      const convertOutputPath = outputPath.replace(/\.[^.]+$/, `.${params.format || 'jpg'}`);
      command = await imagemagick.convert(currentInputPath, convertOutputPath, {
        format: params.format || 'jpg',
        quality: params.quality || 90
      });
      finalOutputPath = convertOutputPath;
      break;
      
    case 'watermark':
      command = await imagemagick.watermark(currentInputPath, outputPath, {
        type: params.type || 'text',
        text: params.text || '',
        fontSize: parseInt(params.fontSize) || 24,
        fontFamily: params.fontFamily || 'Microsoft YaHei',
        color: params.color || '#FFFFFF',
        strokeColor: params.strokeColor || '',
        strokeWidth: parseInt(params.strokeWidth) || 0,
        watermarkImageFilename: params.watermarkImageFilename,
        watermarkScale: parseFloat(params.watermarkScale) || 1.0,
        position: params.position || 'bottom-right',
        x: params.x !== undefined ? parseInt(params.x) : null,
        y: params.y !== undefined ? parseInt(params.y) : null,
        opacity: parseFloat(params.opacity) || 1.0
      });
      break;
      
    case 'adjust':
      command = await imagemagick.adjust(currentInputPath, outputPath, {
        brightness: parseFloat(params.brightness) || 0,
        contrast: parseFloat(params.contrast) || 0,
        saturation: parseFloat(params.saturation) || 0
      });
      break;
      
    case 'trim':
      command = await imagemagick.trim(currentInputPath, outputPath, {
        fuzz: params.fuzz !== undefined ? parseFloat(params.fuzz) : 0,
        backgroundColor: params.backgroundColor
      });
      break;
      
    case 'extent':
      command = await imagemagick.extent(currentInputPath, outputPath, {
        width: parseInt(params.width),
        height: parseInt(params.height),
        x: parseInt(params.x) || 0,
        y: parseInt(params.y) || 0,
        backgroundColor: params.backgroundColor || 'white',
        gravity: params.gravity
      });
      break;
      
    case 'flip':
      command = await imagemagick.flip(currentInputPath, outputPath);
      break;
      
    case 'flop':
      command = await imagemagick.flop(currentInputPath, outputPath);
      break;
      
    case 'transpose':
      command = await imagemagick.transpose(currentInputPath, outputPath);
      break;
      
    case 'transverse':
      command = await imagemagick.transverse(currentInputPath, outputPath);
      break;
      
    case 'filter': {
      command = await imagemagick.applyFilter(currentInputPath, outputPath, {
        filterType: params.filterType,
        intensity: params.intensity !== undefined ? parseFloat(params.intensity) || 1 : 1,
      });
      break;
    }

    case 'effects': {
      // effects 统一走数组形式，支持单个或多个效果
      let effectsArray = [];

      if (Array.isArray(params.effects) && params.effects.length > 0) {
        // 显式传入 effects 数组
        effectsArray = params.effects.map(e => {
          const { effectType, type: t, ...rest } = e;
          return {
            type: effectType || t,
            ...rest,
          };
        });
      } else {
        // 兼容旧格式：单个 effectType + 其它参数
        const effect = {
          type: params.effectType || params.type,
        };

        Object.keys(params).forEach(k => {
          if (k === 'effectType' || k === 'type') return;
          effect[k] = params[k];
        });

        effectsArray = [effect];
      }

      command = await imagemagick.applyEffects(currentInputPath, outputPath, effectsArray);
      break;
    }
      
    default:
      throw new Error(`不支持的操作类型: ${type}`);
  }

  return { command, outputPath: finalOutputPath };
}

/**
 * 执行操作链（链式处理）
 * @param {string} inputPath - 输入文件路径
 * @param {string} actualFilename - 实际文件名（用于生成输出文件名）
 * @param {Array} operations - 操作数组
 * @param {string} outputDir - 输出目录
 * @param {string} outputPrefix - 输出文件名前缀（如 'processed_' 或 'ai_processed_'）
 * @returns {Promise<{outputPath: string, outputFilename: string, commands: Array<string>}>}
 */
async function executeOperationsChain(inputPath, actualFilename, operations, outputDir, outputPrefix = 'processed_') {
  let currentInputPath = inputPath;
  const commands = [];
  const tempFiles = [];

  try {
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const rawType = operation.type;
      const rawParams = operation.params || {};

      // 统一归一化：支持基础类型 + 平铺小颗粒类型
      const { type, params } = normalizeOperation(rawType, rawParams);
      
      if (!type) {
        throw new Error(`操作 ${i + 1} 缺少 type 字段`);
      }
      
      // 生成临时输出文件路径（最后一个操作使用最终输出路径）
      let outputPath;
      if (i === operations.length - 1) {
        // 最后一个操作，使用最终输出文件名
        const baseName = path.parse(actualFilename).name;
        const ext = params.format ? `.${params.format}` : path.extname(actualFilename);
        const outputFilename = `${outputPrefix}${Date.now()}_${baseName}${ext}`;
        outputPath = path.join(outputDir, outputFilename);
      } else {
        // 中间操作，使用临时文件
        const tempFilename = `temp_${Date.now()}_${i}.${path.extname(currentInputPath).slice(1) || 'jpg'}`;
        outputPath = path.join(outputDir, tempFilename);
        tempFiles.push(outputPath);
      }
      
      // 执行操作
      const { command, outputPath: finalOutputPath } = await executeOperation(type, params, currentInputPath, outputPath);
      commands.push(command);
      
      // 如果当前输入是临时文件，且不是最后一个操作，可以删除
      if (i > 0 && currentInputPath !== inputPath && fs.existsSync(currentInputPath)) {
        try {
          fs.unlinkSync(currentInputPath);
        } catch (e) {
          console.warn(`删除临时文件失败: ${currentInputPath}`, e.message);
        }
      }
      
      // 更新当前输入路径为输出路径
      currentInputPath = finalOutputPath;
    }
    
    // 清理所有临时文件
    tempFiles.forEach(tempFile => {
      if (fs.existsSync(tempFile) && tempFile !== currentInputPath) {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          console.warn(`清理临时文件失败: ${tempFile}`, e.message);
        }
      }
    });
    
    const outputFilename = path.basename(currentInputPath);
    
    return {
      outputPath: currentInputPath,
      outputFilename,
      commands
    };
  } catch (error) {
    // 清理所有临时文件
    tempFiles.forEach(tempFile => {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // 忽略清理错误
        }
      }
    });
    throw error;
  }
}

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: 上传图片文件（支持本地文件和网络 URL）
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 图片文件（支持 JPG, PNG, GIF, BMP, WEBP, SVG, TIFF, ICO）
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: 网络图片 URL（自动下载到 template 目录）
 *                 example: "https://example.com/image.jpg"
 *     responses:
 *       200:
 *         description: 上传成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/UploadResponse'
 *                 - type: object
 *                   properties:
 *                     source:
 *                       type: string
 *                       enum: [local, url]
 *                       description: 文件来源
 *       400:
 *         description: 上传失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 路由：上传图片（支持本地文件和网络 URL）
app.post('/api/upload', async (req, res) => {
  try {
    // 检查是否是 URL 上传
    if (req.body && req.body.url) {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: '无效的 URL' });
      }
      
      try {
        // 直接下载到 uploads 目录
        const downloadResult = await downloadFromUrl(url, uploadsDir);
        
        res.json({
          success: true,
          filename: downloadResult.filename,
          originalName: path.basename(new URL(url).pathname) || 'downloaded_image',
          path: `/uploads/${downloadResult.filename}`,
          size: downloadResult.size,
          source: 'url'
        });
      } catch (error) {
        res.status(500).json({ error: `下载失败: ${error.message}` });
      }
    } else {
      // 处理本地文件上传
      upload.single('image')(req, res, (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: '没有上传文件' });
        }
        
        res.json({
          success: true,
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: `/uploads/${req.file.filename}`,
          size: req.file.size,
          source: 'local'
        });
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/info:
 *   post:
 *     summary: 获取图片信息
 *     tags: [Info]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *             properties:
 *               filename:
 *                 type: string
 *                 description: 已上传的文件名
 *                 example: "1234567890-123456789.jpg"
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 info:
 *                   $ref: '#/components/schemas/ImageInfo'
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 文件不存在
 *       500:
 *         description: 服务器错误
 */
app.post('/api/info', async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: '缺少文件名' });
    }
    
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    const info = await imagemagick.identify(filePath);
    res.json({ success: true, info });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/process:
 *   post:
 *     summary: 链式图片处理（统一接口）
 *     tags: [Process]
 *     description: 支持按顺序执行多个图片处理操作，如调整大小、裁剪、旋转、水印、效果等。支持本地文件和网络图片 URL
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - operations
 *             properties:
 *               filename:
 *                 type: string
 *                 description: 已上传的文件名或网络图片 URL（支持 http:// 和 https://）
 *                 example: "1234567890-123456789.jpg"
 *                 oneOf:
 *                   - type: string
 *                     description: 本地文件名（位于 uploads 目录）
 *                   - type: string
 *                     format: uri
 *                     description: 网络图片 URL（自动下载到临时目录）
 *                     example: "https://example.com/image.jpg"
 *               operations:
 *                 type: array
 *                 description: 操作数组，按顺序执行
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [resize, crop, shapeCrop, rotate, convert, watermark, adjust, filter, effects]
 *                       description: 操作类型
 *                     params:
 *                       type: object
 *                       description: 操作参数（根据操作类型不同而不同）
 *     responses:
 *       200:
 *         description: 处理成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 outputFile:
 *                   type: string
 *                   description: 输出文件名
 *                 path:
 *                   type: string
 *                   description: 输出文件路径
 *                 commands:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: 执行的 ImageMagick 命令列表
 *                 source:
 *                   type: string
 *                   enum: [local, url]
 *                   description: 图片来源（本地文件或网络 URL）
 *                 originalFilename:
 *                   type: string
 *                   description: 原始文件名或 URL
 *       400:
 *         description: 参数错误或下载失败
 *       404:
 *         description: 文件不存在（仅本地文件）
 *       500:
 *         description: 处理失败
 */
app.post('/api/process', async (req, res) => {
  try {
    const { filename, operations } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: '缺少必要参数: filename' });
    }
    
    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ error: 'operations 必须是非空数组' });
    }
    
    // 获取图片路径（处理 URL 或本地文件）
    let imagePathInfo;
    try {
      imagePathInfo = await getImagePath(filename, uploadsDir);
    } catch (error) {
      if (error.message === '文件不存在') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
    
    const { actualFilename, inputPath, downloadedFileInfo } = imagePathInfo;
    
    // 执行操作链
    const result = await executeOperationsChain(inputPath, actualFilename, operations, outputDir, 'processed_');
    
    const outputPath = `/output/${result.outputFilename}`;
    const baseUrl = req.protocol + '://' + req.get('host');
    const outputUrl = `${baseUrl}${outputPath}`;
    
    res.json({
      success: true,
      outputFile: result.outputFilename,
      path: outputPath,
      url: outputUrl,
      commands: result.commands,
      source: downloadedFileInfo ? 'url' : 'local',
      originalFilename: downloadedFileInfo ? downloadedFileInfo.originalUrl : actualFilename
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/process-with-prompt:
 *   post:
 *     summary: 通过AI分析自然语言prompt并处理图片
 *     tags: [AI处理]
 *     description: 接收自然语言描述和图片URL，通过AI分析生成ImageMagick命令并执行
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *               - image
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: 自然语言描述，如"请将这个图片裁剪成方形，然后转变成黑白色"
 *                 example: "请将这个图片裁剪成方形，然后转变成黑白色"
 *               image:
 *                 type: string
 *                 description: 图片URL（支持http://和https://）或本地文件名
 *                 example: "https://example.com/image.jpg"
 *     responses:
 *       200:
 *         description: 处理成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 outputFile:
 *                   type: string
 *                   description: 输出文件名
 *                 path:
 *                   type: string
 *                   description: 输出文件路径
 *                 url:
 *                   type: string
 *                   description: 输出文件URL
 *                 operations:
 *                   type: array
 *                   description: AI分析出的操作数组
 *                 command:
 *                   type: string
 *                   description: AI分析出的ImageMagick命令描述
 *                 executedCommands:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: 实际执行的ImageMagick命令
 *       400:
 *         description: 参数错误或AI服务不可用
 *       500:
 *         description: 处理失败
 */
app.post('/api/process-with-prompt', async (req, res) => {
  try {
    const { prompt, image } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: '缺少必要参数: prompt' });
    }

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: '缺少必要参数: image' });
    }

    // 检查AI服务是否可用
    if (!aiService.isAvailable()) {
      return res.status(400).json({ 
        error: 'AI服务不可用，请检查配置或设置环境变量' 
      });
    }

    // 获取图片路径（处理 URL 或本地文件）
    let imagePathInfo;
    try {
      imagePathInfo = await getImagePath(image, uploadsDir);
    } catch (error) {
      if (error.message === '文件不存在') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
    
    const { actualFilename, inputPath, downloadedFileInfo } = imagePathInfo;

    // 获取图片信息（用于AI分析）
    let imageInfo = null;
    try {
      imageInfo = await imagemagick.identify(inputPath);
    } catch (error) {
      console.warn('获取图片信息失败:', error.message);
    }

    // 通过AI分析prompt，生成操作数组
    console.log(`AI分析prompt: ${prompt}`);
    const aiResult = await aiService.convertPromptToOperations(prompt, imageInfo);
    const operations = aiResult.operations;
    const commandDescription = aiResult.command;

    console.log(`AI分析结果: ${commandDescription}`);
    console.log(`操作数组:`, JSON.stringify(operations, null, 2));

    // 执行操作链
    const result = await executeOperationsChain(inputPath, actualFilename, operations, outputDir, 'ai_processed_');
    
    const outputPath = `/output/${result.outputFilename}`;
    const baseUrl = req.protocol + '://' + req.get('host');
    const outputUrl = `${baseUrl}${outputPath}`;
    
    res.json({
      success: true,
      outputFile: result.outputFilename,
      path: outputPath,
      url: outputUrl,
      operations: operations,
      command: commandDescription,
      executedCommands: result.commands,
      source: downloadedFileInfo ? 'url' : 'local',
      originalFilename: downloadedFileInfo ? downloadedFileInfo.originalUrl : actualFilename
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 健康检查
 *     tags: [Health]
 *     description: 检查服务健康状态和 ImageMagick 安装状态
 *     responses:
 *       200:
 *         description: 服务状态
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       500:
 *         description: 服务异常
 */
app.get('/api/health', async (req, res) => {
  try {
    const imagemagickStatus = await imagemagick.checkInstallation();
    res.json({
      status: 'healthy',
      imagemagick: imagemagickStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/imagemagick-status:
 *   get:
 *     summary: 检测 ImageMagick 安装状态
 *     tags: [Health]
 *     description: 检测 ImageMagick 是否已安装及其版本信息
 *     responses:
 *       200:
 *         description: 检测成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageMagickStatus'
 *       500:
 *         description: 检测失败
 */
app.get('/api/imagemagick-status', async (req, res) => {
  try {
    const status = await imagemagick.checkInstallation();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 路由：提供上传的文件
app.use('/uploads', express.static(uploadsDir));
app.use('/output', express.static(outputDir));

/**
 * @swagger
 * /api/files/list:
 *   get:
 *     summary: 获取文件列表
 *     tags: [文件管理]
 *     parameters:
 *       - in: query
 *         name: directory
 *         schema:
 *           type: string
 *           enum: [uploads, output]
 *         required: true
 *         description: 目录名称 (uploads 或 output)
 *     responses:
 *       200:
 *         description: 文件列表
 *       500:
 *         description: 获取失败
 */
app.get('/api/files/list', async (req, res) => {
  try {
    const { directory } = req.query;
    
    if (!directory || !['uploads', 'output'].includes(directory)) {
      return res.status(400).json({
        success: false,
        error: '目录参数无效，必须是 uploads 或 output'
      });
    }
    
    const dirPath = directory === 'uploads' ? uploadsDir : outputDir;
    
    if (!fs.existsSync(dirPath)) {
      return res.json({
        success: true,
        files: []
      });
    }
    
    const files = fs.readdirSync(dirPath)
      .map(filename => {
        const filePath = path.join(dirPath, filename);
        const stats = fs.statSync(filePath);
        
        return {
          name: filename,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modified: stats.mtime,
          isDirectory: stats.isDirectory(),
          url: `/${directory}/${filename}`
        };
      })
      .filter(file => !file.isDirectory) // 只返回文件，不返回目录
      .sort((a, b) => b.modified - a.modified); // 按修改时间倒序
    
    res.json({
      success: true,
      files,
      directory,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      totalSizeFormatted: formatFileSize(files.reduce((sum, file) => sum + file.size, 0))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/files/delete:
 *   delete:
 *     summary: 删除文件
 *     tags: [文件管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - directory
 *               - filename
 *             properties:
 *               directory:
 *                 type: string
 *                 enum: [uploads, output]
 *               filename:
 *                 type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 删除失败
 */
app.delete('/api/files/delete', async (req, res) => {
  try {
    const { directory, filename } = req.body;
    
    if (!directory || !['uploads', 'output'].includes(directory)) {
      return res.status(400).json({
        success: false,
        error: '目录参数无效，必须是 uploads 或 output'
      });
    }
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: '文件名不能为空'
      });
    }
    
    // 安全检查：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: '文件名包含非法字符'
      });
    }
    
    const dirPath = directory === 'uploads' ? uploadsDir : outputDir;
    const filePath = path.join(dirPath, filename);
    
    // 确保文件在指定目录内
    if (!filePath.startsWith(dirPath)) {
      return res.status(400).json({
        success: false,
        error: '文件路径无效'
      });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }
    
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/files/clear:
 *   delete:
 *     summary: 清空目录
 *     tags: [文件管理]
 *     parameters:
 *       - in: query
 *         name: directory
 *         schema:
 *           type: string
 *           enum: [uploads, output]
 *         required: true
 *         description: 目录名称 (uploads 或 output)
 *     responses:
 *       200:
 *         description: 清空成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 清空失败
 */
app.delete('/api/files/clear', async (req, res) => {
  try {
    const { directory } = req.query;
    
    if (!directory || !['uploads', 'output'].includes(directory)) {
      return res.status(400).json({
        success: false,
        error: '目录参数无效，必须是 uploads 或 output'
      });
    }
    
    const dirPath = directory === 'uploads' ? uploadsDir : outputDir;
    
    if (!fs.existsSync(dirPath)) {
      return res.json({
        success: true,
        message: '目录不存在或已为空'
      });
    }
    
    const files = fs.readdirSync(dirPath);
    let deletedCount = 0;
    let totalSize = 0;
    
    files.forEach(filename => {
      const filePath = path.join(dirPath, filename);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        totalSize += stats.size;
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    res.json({
      success: true,
      message: `成功删除 ${deletedCount} 个文件`,
      deletedCount,
      totalSize,
      totalSizeFormatted: formatFileSize(totalSize)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 健康检查
 *     tags: [Health]
 *     description: 检查服务健康状态和 ImageMagick 安装状态
 *     responses:
 *       200:
 *         description: 服务状态
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       500:
 *         description: 服务异常
 */
app.get('/api/health', async (req, res) => {
  try {
    const imagemagickStatus = await imagemagick.checkInstallation();
    res.json({
      status: 'healthy',
      imagemagick: imagemagickStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/imagemagick-status:
 *   get:
 *     summary: 检测 ImageMagick 安装状态
 *     tags: [Health]
 *     description: 检测 ImageMagick 是否已安装及其版本信息
 *     responses:
 *       200:
 *         description: 检测成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageMagickStatus'
 *       500:
 *         description: 检测失败
 */
app.get('/api/imagemagick-status', async (req, res) => {
  try {
    const status = await imagemagick.checkInstallation();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 路由：提供上传的文件
app.use('/uploads', express.static(uploadsDir));
app.use('/output', express.static(outputDir));

/**
 * @swagger
 * /api/files/list:
 *   get:
 *     summary: 获取文件列表
 *     tags: [文件管理]
 *     parameters:
 *       - in: query
 *         name: directory
 *         schema:
 *           type: string
 *           enum: [uploads, output]
 *         required: true
 *         description: 目录名称 (uploads 或 output)
 *     responses:
 *       200:
 *         description: 文件列表
 *       500:
 *         description: 获取失败
 */
app.get('/api/files/list', async (req, res) => {
  try {
    const { directory } = req.query;
    
    if (!directory || !['uploads', 'output'].includes(directory)) {
      return res.status(400).json({
        success: false,
        error: '目录参数无效，必须是 uploads 或 output'
      });
    }
    
    const dirPath = directory === 'uploads' ? uploadsDir : outputDir;
    
    if (!fs.existsSync(dirPath)) {
      return res.json({
        success: true,
        files: []
      });
    }
    
    const files = fs.readdirSync(dirPath)
      .map(filename => {
        const filePath = path.join(dirPath, filename);
        const stats = fs.statSync(filePath);
        
        return {
          name: filename,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modified: stats.mtime,
          isDirectory: stats.isDirectory(),
          url: `/${directory}/${filename}`
        };
      })
      .filter(file => !file.isDirectory) // 只返回文件，不返回目录
      .sort((a, b) => b.modified - a.modified); // 按修改时间倒序
    
    res.json({
      success: true,
      files,
      directory,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      totalSizeFormatted: formatFileSize(files.reduce((sum, file) => sum + file.size, 0))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/files/delete:
 *   delete:
 *     summary: 删除文件
 *     tags: [文件管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - directory
 *               - filename
 *             properties:
 *               directory:
 *                 type: string
 *                 enum: [uploads, output]
 *               filename:
 *                 type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 删除失败
 */
app.delete('/api/files/delete', async (req, res) => {
  try {
    const { directory, filename } = req.body;
    
    if (!directory || !['uploads', 'output'].includes(directory)) {
      return res.status(400).json({
        success: false,
        error: '目录参数无效，必须是 uploads 或 output'
      });
    }
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: '文件名不能为空'
      });
    }
    
    // 安全检查：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: '文件名包含非法字符'
      });
    }
    
    const dirPath = directory === 'uploads' ? uploadsDir : outputDir;
    const filePath = path.join(dirPath, filename);
    
    // 确保文件在指定目录内
    if (!filePath.startsWith(dirPath)) {
      return res.status(400).json({
        success: false,
        error: '文件路径无效'
      });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }
    
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/files/clear:
 *   delete:
 *     summary: 清空目录
 *     tags: [文件管理]
 *     parameters:
 *       - in: query
 *         name: directory
 *         schema:
 *           type: string
 *           enum: [uploads, output]
 *         required: true
 *         description: 目录名称 (uploads 或 output)
 *     responses:
 *       200:
 *         description: 清空成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 清空失败
 */
app.delete('/api/files/clear', async (req, res) => {
  try {
    const { directory } = req.query;
    
    if (!directory || !['uploads', 'output'].includes(directory)) {
      return res.status(400).json({
        success: false,
        error: '目录参数无效，必须是 uploads 或 output'
      });
    }
    
    const dirPath = directory === 'uploads' ? uploadsDir : outputDir;
    
    if (!fs.existsSync(dirPath)) {
      return res.json({
        success: true,
        message: '目录不存在或已为空'
      });
    }
    
    const files = fs.readdirSync(dirPath);
    let deletedCount = 0;
    let totalSize = 0;
    
    files.forEach(filename => {
      const filePath = path.join(dirPath, filename);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        totalSize += stats.size;
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    res.json({
      success: true,
      message: `成功删除 ${deletedCount} 个文件`,
      deletedCount,
      totalSize,
      totalSizeFormatted: formatFileSize(totalSize)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`Swagger API 文档: http://localhost:${PORT}/api-docs`);
  console.log('请确保已安装 ImageMagick: https://imagemagick.org/script/download.php');
});

