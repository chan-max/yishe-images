const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const imagemagick = require('./lib/imagemagick');

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
 * 下载网络资源到 template 目录
 */
async function downloadFromUrl(url) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      protocol.get(url, (response) => {
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
          ext = mimeToExt[contentType] || '.jpg';
        }
        
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `downloaded_${uniqueSuffix}${ext}`;
        const filePath = path.join(templateDir, filename);
        
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
      });
    } catch (error) {
      reject(new Error(`无效的 URL: ${error.message}`));
    }
  });
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
        // 下载文件到 template 目录
        const downloadResult = await downloadFromUrl(url);
        
        // 将文件从 template 移动到 uploads 目录
        const finalPath = path.join(uploadsDir, downloadResult.filename);
        fs.renameSync(downloadResult.path, finalPath);
        
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
 * /api/resize:
 *   post:
 *     summary: 调整图片大小
 *     tags: [Resize]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - width
 *               - height
 *             properties:
 *               filename:
 *                 type: string
 *                 description: 已上传的文件名
 *               width:
 *                 type: integer
 *                 description: 目标宽度（像素）
 *                 example: 800
 *               height:
 *                 type: integer
 *                 description: 目标高度（像素）
 *                 example: 600
 *               maintainAspectRatio:
 *                 type: boolean
 *                 description: 是否保持宽高比
 *                 default: true
 *               quality:
 *                 type: integer
 *                 description: 图片质量（1-100）
 *                 default: 90
 *                 minimum: 1
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: 处理成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessResponse'
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 处理失败
 */
app.post('/api/resize', async (req, res) => {
  try {
    const { filename, width, height, quality, maintainAspectRatio } = req.body;
    if (!filename || !width || !height) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const inputPath = path.join(uploadsDir, filename);
    const outputFilename = `resized_${Date.now()}_${filename}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    await imagemagick.resize(inputPath, outputPath, {
      width: parseInt(width),
      height: parseInt(height),
      quality: quality || 90,
      maintainAspectRatio: maintainAspectRatio !== false
    });
    
    res.json({
      success: true,
      outputFile: outputFilename,
      path: `/output/${outputFilename}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/crop:
 *   post:
 *     summary: 裁剪图片
 *     tags: [Crop]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - x
 *               - y
 *               - width
 *               - height
 *             properties:
 *               filename:
 *                 type: string
 *                 description: 已上传的文件名
 *               x:
 *                 type: integer
 *                 description: 裁剪起始 X 坐标
 *                 example: 100
 *               y:
 *                 type: integer
 *                 description: 裁剪起始 Y 坐标
 *                 example: 100
 *               width:
 *                 type: integer
 *                 description: 裁剪宽度（像素）
 *                 example: 500
 *               height:
 *                 type: integer
 *                 description: 裁剪高度（像素）
 *                 example: 500
 *     responses:
 *       200:
 *         description: 处理成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessResponse'
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 处理失败
 */
app.post('/api/crop', async (req, res) => {
  try {
    const { filename, x, y, width, height } = req.body;
    if (!filename || x === undefined || y === undefined || !width || !height) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const inputPath = path.join(uploadsDir, filename);
    const outputFilename = `cropped_${Date.now()}_${filename}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    await imagemagick.crop(inputPath, outputPath, {
      x: parseInt(x),
      y: parseInt(y),
      width: parseInt(width),
      height: parseInt(height)
    });
    
    res.json({
      success: true,
      outputFile: outputFilename,
      path: `/output/${outputFilename}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/rotate:
 *   post:
 *     summary: 旋转图片
 *     tags: [Rotate]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - degrees
 *             properties:
 *               filename:
 *                 type: string
 *                 description: 已上传的文件名
 *               degrees:
 *                 type: number
 *                 description: 旋转角度（度，-360 到 360）
 *                 example: 90
 *               backgroundColor:
 *                 type: string
 *                 description: 背景颜色（支持颜色名称或十六进制）
 *                 default: "transparent"
 *                 example: "#000000"
 *     responses:
 *       200:
 *         description: 处理成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessResponse'
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 处理失败
 */
app.post('/api/rotate', async (req, res) => {
  try {
    const { filename, degrees, backgroundColor } = req.body;
    if (!filename || degrees === undefined) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const inputPath = path.join(uploadsDir, filename);
    const outputFilename = `rotated_${Date.now()}_${filename}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    await imagemagick.rotate(inputPath, outputPath, {
      degrees: parseFloat(degrees),
      backgroundColor: backgroundColor || 'transparent'
    });
    
    res.json({
      success: true,
      outputFile: outputFilename,
      path: `/output/${outputFilename}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/convert:
 *   post:
 *     summary: 转换图片格式
 *     tags: [Convert]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - format
 *             properties:
 *               filename:
 *                 type: string
 *                 description: 已上传的文件名
 *               format:
 *                 type: string
 *                 description: 目标格式
 *                 enum: [jpg, png, gif, webp, bmp, tiff]
 *                 example: "png"
 *               quality:
 *                 type: integer
 *                 description: 图片质量（1-100）
 *                 default: 90
 *                 minimum: 1
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: 转换成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessResponse'
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 转换失败
 */
app.post('/api/convert', async (req, res) => {
  try {
    const { filename, format, quality } = req.body;
    if (!filename || !format) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const inputPath = path.join(uploadsDir, filename);
    const baseName = path.parse(filename).name;
    const outputFilename = `${baseName}.${format}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    await imagemagick.convert(inputPath, outputPath, {
      format: format.toLowerCase(),
      quality: quality || 90
    });
    
    res.json({
      success: true,
      outputFile: outputFilename,
      path: `/output/${outputFilename}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/watermark:
 *   post:
 *     summary: 添加文字水印
 *     tags: [Watermark]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - watermarkText
 *             properties:
 *               filename:
 *                 type: string
 *                 description: 已上传的文件名
 *               watermarkText:
 *                 type: string
 *                 description: 水印文字
 *                 example: "水印文字"
 *               position:
 *                 type: string
 *                 description: 水印位置
 *                 enum: [top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center, bottom-right]
 *                 default: "bottom-right"
 *               opacity:
 *                 type: number
 *                 description: 透明度（0-1）
 *                 default: 0.5
 *                 minimum: 0
 *                 maximum: 1
 *               fontSize:
 *                 type: integer
 *                 description: 字体大小
 *                 default: 24
 *               color:
 *                 type: string
 *                 description: 文字颜色
 *                 default: "white"
 *                 example: "#ffffff"
 *     responses:
 *       200:
 *         description: 处理成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessResponse'
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 处理失败
 */
app.post('/api/watermark', async (req, res) => {
  try {
    const {
      filename,
      type = 'text', // 'text' 或 'image'
      // 文字水印
      text,
      fontSize = 24,
      fontFamily = 'Arial',
      color = 'white',
      strokeColor = null,
      strokeWidth = 0,
      // 图片水印
      watermarkImageFilename = null,
      watermarkScale = 1.0,
      // 通用选项
      position = 'bottom-right',
      x = null,
      y = null,
      marginX = 10,
      marginY = 10,
      opacity = 0.5,
      angle = 0,
      repeat = false,
      tileSize = null
    } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: '缺少文件名' });
    }
    
    if (type === 'text' && !text) {
      return res.status(400).json({ error: '文字水印需要提供文字内容' });
    }
    
    if (type === 'image' && !watermarkImageFilename) {
      return res.status(400).json({ error: '图片水印需要提供水印图片文件名' });
    }
    
    const inputPath = path.join(uploadsDir, filename);
    const outputFilename = `watermarked_${Date.now()}_${filename}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    const options = {
      type,
      position,
      opacity: parseFloat(opacity) || 0.5,
      marginX: parseInt(marginX) || 10,
      marginY: parseInt(marginY) || 10,
      angle: parseFloat(angle) || 0,
      repeat: repeat === true || repeat === 'true'
    };
    
    if (x !== null && y !== null) {
      options.x = parseInt(x);
      options.y = parseInt(y);
    }
    
    if (type === 'text') {
      options.text = text;
      options.fontSize = parseInt(fontSize) || 24;
      options.fontFamily = fontFamily || 'Arial';
      options.color = color || 'white';
      if (strokeColor && strokeWidth > 0) {
        options.strokeColor = strokeColor;
        options.strokeWidth = parseInt(strokeWidth) || 0;
      }
      if (tileSize) {
        options.tileSize = tileSize;
      }
    } else if (type === 'image') {
      const watermarkImagePath = path.join(uploadsDir, watermarkImageFilename);
      if (!fs.existsSync(watermarkImagePath)) {
        return res.status(400).json({ error: '水印图片文件不存在' });
      }
      options.watermarkImage = watermarkImagePath;
      options.watermarkScale = parseFloat(watermarkScale) || 1.0;
    }
    
    await imagemagick.watermark(inputPath, outputPath, options);
    
    res.json({
      success: true,
      outputFile: outputFilename,
      path: `/output/${outputFilename}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/adjust:
 *   post:
 *     summary: 调整图片亮度、对比度、饱和度
 *     tags: [Adjust]
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
 *               brightness:
 *                 type: integer
 *                 description: 亮度调整（-100 到 100）
 *                 default: 0
 *                 minimum: -100
 *                 maximum: 100
 *               contrast:
 *                 type: integer
 *                 description: 对比度调整（-100 到 100）
 *                 default: 0
 *                 minimum: -100
 *                 maximum: 100
 *               saturation:
 *                 type: integer
 *                 description: 饱和度调整（-100 到 100）
 *                 default: 0
 *                 minimum: -100
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: 处理成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessResponse'
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 处理失败
 */
app.post('/api/adjust', async (req, res) => {
  try {
    const { filename, brightness, contrast, saturation } = req.body;
    if (!filename) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const inputPath = path.join(uploadsDir, filename);
    const outputFilename = `adjusted_${Date.now()}_${filename}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    await imagemagick.adjust(inputPath, outputPath, {
      brightness: brightness || 0,
      contrast: contrast || 0,
      saturation: saturation || 0
    });
    
    res.json({
      success: true,
      outputFile: outputFilename,
      path: `/output/${outputFilename}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/filter:
 *   post:
 *     summary: 应用滤镜效果
 *     tags: [Filter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - filterType
 *             properties:
 *               filename:
 *                 type: string
 *                 description: 已上传的文件名
 *               filterType:
 *                 type: string
 *                 description: 滤镜类型
 *                 enum: [blur, sharpen, emboss, edge, charcoal, oil-painting, sepia, grayscale, negate]
 *                 example: "blur"
 *               intensity:
 *                 type: number
 *                 description: 滤镜强度（0-10）
 *                 default: 1
 *                 minimum: 0
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: 处理成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessResponse'
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 处理失败
 */
app.post('/api/filter', async (req, res) => {
  try {
    const { filename, filterType, intensity } = req.body;
    if (!filename || !filterType) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const inputPath = path.join(uploadsDir, filename);
    const outputFilename = `filtered_${Date.now()}_${filename}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    await imagemagick.applyFilter(inputPath, outputPath, {
      filterType: filterType,
      intensity: intensity || 1
    });
    
    res.json({
      success: true,
      outputFile: outputFilename,
      path: `/output/${outputFilename}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/batch:
 *   post:
 *     summary: 批量处理图片
 *     tags: [Batch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filenames
 *               - operations
 *             properties:
 *               filenames:
 *                 type: array
 *                 description: 要处理的文件名数组
 *                 items:
 *                   type: string
 *                 example: ["file1.jpg", "file2.png"]
 *               operations:
 *                 type: array
 *                 description: 操作列表
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [resize, crop, rotate, adjust, filter]
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
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       original:
 *                         type: string
 *                       output:
 *                         type: string
 *                       path:
 *                         type: string
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 处理失败
 */
app.post('/api/batch', async (req, res) => {
  try {
    const { filenames, operations } = req.body;
    if (!filenames || !Array.isArray(filenames) || !operations) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const results = [];
    for (const filename of filenames) {
      const inputPath = path.join(uploadsDir, filename);
      const outputFilename = `batch_${Date.now()}_${filename}`;
      const outputPath = path.join(outputDir, outputFilename);
      
      await imagemagick.batchProcess(inputPath, outputPath, operations);
      
      results.push({
        original: filename,
        output: outputFilename,
        path: `/output/${outputFilename}`
      });
    }
    
    res.json({ success: true, results });
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`Swagger API 文档: http://localhost:${PORT}/api-docs`);
  console.log('请确保已安装 ImageMagick: https://imagemagick.org/script/download.php');
});

