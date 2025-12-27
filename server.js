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
        // 注意：在 Docker 中，如果 template 和 uploads 是不同的挂载点，
        // 不能使用 rename，需要使用 copy + unlink
        const finalPath = path.join(uploadsDir, downloadResult.filename);
        try {
          // 尝试使用 rename（同一文件系统内更快）
          fs.renameSync(downloadResult.path, finalPath);
        } catch (renameError) {
          // 如果 rename 失败（跨设备错误），使用 copy + unlink
          if (renameError.code === 'EXDEV' || renameError.message.includes('cross-device')) {
            fs.copyFileSync(downloadResult.path, finalPath);
            fs.unlinkSync(downloadResult.path);
          } else {
            throw renameError;
          }
        }
        
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
 *     description: 支持按顺序执行多个图片处理操作，如调整大小、裁剪、旋转、水印、效果等
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
 *                 description: 已上传的文件名
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
 *                 path:
 *                   type: string
 *                 commands:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: 参数错误
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
    
    const inputPath = path.join(uploadsDir, filename);
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 链式处理：每个操作的输出作为下一个操作的输入
    let currentInputPath = inputPath;
    const commands = [];
    const tempFiles = [];
    
    try {
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        const { type, params = {} } = operation;
        
        if (!type) {
          throw new Error(`操作 ${i + 1} 缺少 type 字段`);
        }
        
        // 生成临时输出文件路径（最后一个操作使用最终输出路径）
        let outputPath;
        if (i === operations.length - 1) {
          // 最后一个操作，使用最终输出文件名
          const baseName = path.parse(filename).name;
          const ext = params.format ? `.${params.format}` : path.extname(filename);
          const outputFilename = `processed_${Date.now()}_${baseName}${ext}`;
          outputPath = path.join(outputDir, outputFilename);
        } else {
          // 中间操作，使用临时文件
          const tempFilename = `temp_${Date.now()}_${i}.${path.extname(currentInputPath).slice(1) || 'jpg'}`;
          outputPath = path.join(outputDir, tempFilename);
          tempFiles.push(outputPath);
        }
        
        let command;
        
        // 根据操作类型调用相应的处理函数
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
            outputPath = shapeOutputPath;
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
            outputPath = convertOutputPath;
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
            
          case 'filter':
            command = await imagemagick.applyFilter(currentInputPath, outputPath, {
              filterType: params.filterType,
              intensity: parseFloat(params.intensity) || 1
            });
            break;
            
          case 'effects':
            // effects 需要传递数组格式，每个效果是一个对象
            const effect = {
              type: params.effectType,
              ...params
            };
            // 删除 effectType，因为已经转换为 type
            delete effect.effectType;
            command = await imagemagick.applyEffects(currentInputPath, outputPath, [effect]);
            break;
            
          default:
            throw new Error(`不支持的操作类型: ${type}`);
        }
        
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
        currentInputPath = outputPath;
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
      
      res.json({
        success: true,
        outputFile: outputFilename,
        path: `/output/${outputFilename}`,
        commands: commands
      });
      
    } catch (error) {
      // 清理临时文件
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`Swagger API 文档: http://localhost:${PORT}/api-docs`);
  console.log('请确保已安装 ImageMagick: https://imagemagick.org/script/download.php');
});

