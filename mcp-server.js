import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import http from "http";
import https from "https";

// 默认服务地址
const DEFAULT_API_URL = process.env.IMAGE_API_URL || "http://localhost:1513";
const API_BASE = `${DEFAULT_API_URL}/api`;

// 创建 MCP 服务器
const server = new McpServer({
  name: "yishe-images",
  version: "1.0.0",
});

/**
 * 发送 HTTP 请求
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === "https:" ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      timeout: 60000, // 60秒超时
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = "";
      
      res.on("data", (chunk) => {
        data += chunk;
      });
      
      res.on("end", () => {
        try {
          const contentType = res.headers["content-type"] || "";
          if (contentType.includes("application/json")) {
            resolve(JSON.parse(data));
          } else {
            resolve(data);
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("请求超时"));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

/**
 * 完整的请求参数示例
 * 这个示例展示了完整的请求结构，包含图片地址和所有支持的操作类型
 */
const COMPLETE_EXAMPLE = {
  // 图片 URL 或本地文件路径（支持 http:// 和 https://）
  imageUrl: "https://example.com/image.jpg",  // 或 "http://localhost:1513/uploads/image.jpg" 或本地路径
  
  // 操作数组，按顺序执行
  operations: [
    // 1. resize - 调整大小
    {
      type: "resize",
      params: {
        width: 800,              // number, 宽度（像素），范围：1-10000，推荐：800-1920
        height: 600,             // number, 高度（像素），范围：1-10000，推荐：600-1080
        maintainAspectRatio: true, // boolean, 保持宽高比，默认：true
        quality: 90              // number, 质量（%），范围：1-100，推荐：85-95
      }
    },
  
    // 2. crop - 矩形裁剪
    {
      type: "crop",
      params: {
        x: 0,                    // number, X坐标（像素），范围：0-图片宽度
        y: 0,                    // number, Y坐标（像素），范围：0-图片高度
        width: 500,              // number, 宽度（像素），范围：1-图片宽度
        height: 500              // number, 高度（像素），范围：1-图片高度
      }
    },
    
    // 3. shapeCrop - 形状裁剪
    {
      type: "shapeCrop",
      params: {
        shape: "circle",          // string, 形状类型：'circle'|'ellipse'|'star'|'triangle'|'diamond'|'heart'|'hexagon'|'octagon'
        width: 200,               // number, 宽度（像素），范围：1-图片宽度，推荐：200-800
        height: 200,              // number, 高度（像素），范围：1-图片高度，推荐：200-800
        x: null,                  // number|null, 中心X坐标（留空则居中）
        y: null,                  // number|null, 中心Y坐标（留空则居中）
        backgroundColor: "transparent" // string, 背景颜色，如 'transparent' 或 '#FFFFFF'
      }
    },
    
    // 4. rotate - 旋转
    {
      type: "rotate",
      params: {
        degrees: 90,              // number, 角度，范围：-360到360，推荐：90、180、270
        backgroundColor: "#000000" // string, 背景色，如 '#000000' 或 'transparent'
      }
    },
    
    // 5. convert - 格式转换
    {
      type: "convert",
      params: {
        format: "jpg",            // string, 格式：'jpg'|'png'|'gif'|'webp'|'bmp'
        quality: 90               // number, 质量（%），范围：1-100，推荐：85-95
      }
    },
    
    // 6. watermark - 水印
    {
      type: "watermark",
      params: {
        type: "text",             // string, 类型：'text'|'image'
        text: "水印文字",          // string, 水印文字（type为'text'时）
        position: "bottom-right", // string, 位置：'top-left'|'top-right'|'bottom-left'|'bottom-right'|'center'
        opacity: 0.5,             // number, 透明度，范围：0-1，推荐：0.3-0.7
        fontSize: 24,              // number, 字体大小（type为'text'时）
        color: "#FFFFFF"           // string, 颜色，如 '#FFFFFF'
      }
    },
  
  // 7. filter-blur - 模糊滤镜
  {
    "type": "filter-blur",
    "params": {
      "intensity": 1              // number, 强度，范围：0-10，推荐：1-3
    }
  },
  
  // 8. filter-sharpen - 锐化滤镜
  {
    "type": "filter-sharpen",
    "params": {
      "intensity": 1              // number, 强度，范围：0-10，推荐：1-3
    }
  },
  
  // 9. filter-grayscale - 快速灰度
  {
    "type": "filter-grayscale",
    "params": {}                  // 无需参数
  },
  
  // 10. filter-sepia - 怀旧滤镜
  {
    "type": "filter-sepia",
    "params": {
      "intensity": 80             // number, 强度，范围：0-100，推荐：60-90
    }
  },
  
  // 11. effects-grayscale - 灰度（可调算法）
  {
    "type": "effects-grayscale",
    "params": {
      "method": "Rec709",          // string, 算法：'Rec601'|'Rec709'|'Rec2020'|'Average'|'Lightness'|'Luminance'|'RMS'
      "intensity": 100             // number, 强度（%），范围：0-100，100为完全灰度
    }
  },
  
  // 12. effects-blur - 模糊特效
  {
    "type": "effects-blur",
    "params": {
      "radius": 5,                // number, 半径（像素），范围：1-100，推荐：5-20
      "sigma": 5                   // number, 标准差（像素），范围：0.1-10，推荐：1-5
    }
  },
  
  // 13. effects-gaussian-blur - 高斯模糊
  {
    "type": "effects-gaussian-blur",
    "params": {
      "radius": 5                  // number, 半径（像素），范围：1-100，推荐：5-20
    }
  },
  
  // 14. effects-sharpen - 锐化特效
  {
    "type": "effects-sharpen",
    "params": {
      "radius": 1,                 // number, 半径（像素），范围：1-10，推荐：1-3
      "amount": 1                  // number, 数量，范围：0-10，推荐：0.5-3
    }
  },
  
  // 15. effects-brightness - 亮度
  {
    "type": "effects-brightness",
    "params": {
      "value": 0                   // number, 亮度（%），范围：-100到100，0为原始
    }
  },
  
  // 16. effects-contrast - 对比度
  {
    "type": "effects-contrast",
    "params": {
      "value": 0                   // number, 对比度（%），范围：-100到100，0为原始
    }
  },
  
  // 17. effects-saturation - 饱和度
  {
    "type": "effects-saturation",
    "params": {
      "value": 0                   // number, 饱和度（%），范围：-100到100，0为原始
    }
  },
  
  // 18. effects-sepia - 怀旧特效
  {
    "type": "effects-sepia",
    "params": {
      "intensity": 80              // number, 强度（%），范围：0-100，推荐：60-100
    }
  },
  
  // 19. effects-charcoal - 炭笔画
  {
    "type": "effects-charcoal",
    "params": {
      "radius": 1,                 // number, 半径（像素），范围：1-10，推荐：1-3
      "sigma": 0.5                 // number, 标准差（像素），范围：0.1-10，推荐：0.5-2
    }
  },
  
  // 20. effects-oil-painting - 油画
  {
    "type": "effects-oil-painting",
    "params": {
      "radius": 3                  // number, 半径（像素），范围：1-20，推荐：3-10
    }
  },
  
  // 21. effects-pixelate - 像素化
  {
    "type": "effects-pixelate",
    "params": {
      "size": 10                   // number, 大小（像素），范围：2-50，推荐：5-20
    }
  },
  
  // 22. effects-mosaic - 马赛克
  {
    "type": "effects-mosaic",
    "params": {
      "size": 10                   // number, 大小（像素），范围：2-50，推荐：5-20
    }
  },
  
  // 23. effects-vignette - 晕影
  {
    "type": "effects-vignette",
    "params": {
      "radius": 100,               // number, 半径（像素），范围：1-500，推荐：50-200
      "sigma": 50                  // number, 标准差（像素），范围：1-500，推荐：30-100
    }
  },
  
  // 24. effects-swirl - 漩涡
  {
    "type": "effects-swirl",
    "params": {
      "degrees": 90                // number, 角度，范围：-360到360，推荐：45-180
    }
  },
  
  // 25. effects-wave - 波浪
  {
    "type": "effects-wave",
    "params": {
      "amplitude": 25,             // number, 振幅（像素），范围：1-100，推荐：10-50
      "wavelength": 150            // number, 波长（像素），范围：10-500，推荐：50-200
    }
  },
  
  // 26. effects-negate - 负片（无需参数）
  {
    "type": "effects-negate",
    "params": {}
  },
  
  // 27. effects-posterize - 海报化
  {
    "type": "effects-posterize",
    "params": {
      "levels": 4                  // number, 色阶数，范围：2-256，推荐：4-16
    }
  },
  
  // 28. effects-sketch - 铅笔素描
  {
    "type": "effects-sketch",
    "params": {
      "radius": 1,                 // number, 半径（像素），范围：1-10，推荐：1-3
      "sigma": 0.5                 // number, 标准差（像素），范围：0.1-10，推荐：0.5-2
    }
  },
  
  // 29. effects-emboss - 浮雕
  {
    "type": "effects-emboss",
    "params": {
      "radius": 1,                 // number, 半径（像素），范围：1-10，推荐：1-3
      "sigma": 0.5                 // number, 标准差（像素），范围：0.1-10，推荐：0.5-2
    }
  },
  
  // 30. effects-edge - 边缘检测
  {
    "type": "effects-edge",
    "params": {
      "radius": 1                  // number, 半径（像素），范围：1-10，推荐：1-3
    }
  },
  
  // 31. effects-colorize - 着色
  {
    "type": "effects-colorize",
    "params": {
      "color": "#FF0000",          // string, 颜色，如 '#FF0000'
      "intensity": 50               // number, 强度（%），范围：0-100，推荐：30-70
    }
  },
  
  // 32. effects-tint - 色调
  {
    "type": "effects-tint",
    "params": {
      "color": "#FFD700",          // string, 颜色，如 '#FFD700'
      "intensity": 50               // number, 强度（%），范围：0-100，推荐：30-70
    }
  },
  
  // 33. effects-noise - 噪点
  {
    "type": "effects-noise",
    "params": {
      "noiseType": "Uniform"       // string, 噪点类型：'Uniform'|'Gaussian'|'Multiplicative'|'Impulse'|'Laplacian'|'Poisson'
    }
  },
  
  // 34. effects-despeckle - 去噪（无需参数）
  {
    "type": "effects-despeckle",
    "params": {}
  },
  
  // 35. effects-solarize - 曝光
  {
    "type": "effects-solarize",
    "params": {
      "threshold": 50              // number, 阈值（%），范围：0-100，推荐：30-70
    }
  },
  
  // 36. effects-implode - 内爆
  {
    "type": "effects-implode",
    "params": {
      "amount": 0.5                // number, 数量，范围：-1到1，推荐：0.3-0.8
    }
  },
  
  // 37. effects-explode - 爆炸
  {
    "type": "effects-explode",
    "params": {
      "amount": 0.5                // number, 数量，范围：-1到1，推荐：0.3-0.8
    }
  },
  
  // 38. effects-spread - 扩散
  {
    "type": "effects-spread",
    "params": {
      "radius": 3                  // number, 半径（像素），范围：0-50，推荐：1-10
    }
  },
  
  // 39. effects-normalize - 标准化（无需参数）
  {
    "type": "effects-normalize",
    "params": {}
  },
  
  // 40. effects-equalize - 均衡化（无需参数）
  {
    "type": "effects-equalize",
    "params": {}
  },
  
  // 41. effects-gamma - 伽马校正
  {
    "type": "effects-gamma",
    "params": {
      "value": 1.0                 // number, 伽马值，范围：0.1-5.0，1.0为原始，推荐：0.8-1.5
    }
  },
  
  // 42. effects-threshold - 阈值化
  {
    "type": "effects-threshold",
    "params": {
      "value": 50                  // number, 阈值（%），范围：0-100，推荐：40-60
    }
  },
  
  // 43. effects-quantize - 颜色量化
  {
    "type": "effects-quantize",
    "params": {
      "colors": 256                // number, 颜色数，范围：2-256，推荐：8-64
    }
  }
]
};

// 生成操作示例描述字符串
const OPERATIONS_EXAMPLE_SHORT = `重要：AI 需要根据用户的自然语言描述，自动生成对应的 operations 配置。

示例 1 - 用户描述："把图片调整到 800x600，然后转为灰度图"
AI 应生成：
{
  "imageUrl": "https://example.com/image.jpg",
  "operations": [
    { "type": "resize", "params": { "width": 800, "height": 600, "maintainAspectRatio": true, "quality": 90 } },
    { "type": "effects-grayscale", "params": { "method": "Rec709", "intensity": 100 } }
  ]
}

示例 2 - 用户描述："裁剪图片左上角 500x500 的区域，然后旋转 90 度"
AI 应生成：
{
  "imageUrl": "https://example.com/image.jpg",
  "operations": [
    { "type": "crop", "params": { "x": 0, "y": 0, "width": 500, "height": 500 } },
    { "type": "rotate", "params": { "degrees": 90, "backgroundColor": "transparent" } }
  ]
}

示例 3 - 用户描述："添加模糊效果，强度适中"
AI 应生成：
{
  "imageUrl": "https://example.com/image.jpg",
  "operations": [
    { "type": "effects-blur", "params": { "radius": 5, "sigma": 5 } }
  ]
}`;

/**
 * 根据自然语言描述自动生成操作配置
 */
function parseOperationDescription(description) {
  const operations = [];
  const desc = description.toLowerCase().trim();
  
  // 解析多个操作（用"然后"、"接着"、"再"等连接词分隔）
  const parts = desc.split(/(?:然后|接着|再|之后|，|,)/).map(p => p.trim()).filter(p => p);
  
  for (const part of parts) {
    // 1. 调整大小 resize
    const resizeMatch = part.match(/(?:调整|缩放|改为|改成|设置为|设为|改成|改为)\s*(?:到|为)?\s*(\d+)\s*[x×*]\s*(\d+)/i);
    if (resizeMatch) {
      const width = parseInt(resizeMatch[1]);
      const height = parseInt(resizeMatch[2]);
      const maintainAspectRatio = !part.includes('强制') && !part.includes('拉伸');
      operations.push({
        type: "resize",
        params: {
          width,
          height,
          maintainAspectRatio,
          quality: 90
        }
      });
      continue;
    }
    
    // 2. 灰度/黑白 effects-grayscale
    if (part.match(/(?:灰度|黑白|去色|灰阶|变成黑白|转为黑白|转为灰度|变成灰度|让.*?变成.*?黑白|让.*?变成.*?灰度)/)) {
      operations.push({
        type: "effects-grayscale",
        params: {
          method: "Rec709",
          intensity: 100
        }
      });
      continue;
    }
    
    // 3. 裁剪 crop
    const cropMatch = part.match(/(?:裁剪|截取|切图|剪裁).*?(\d+)\s*[x×*]\s*(\d+)/i);
    if (cropMatch) {
      const width = parseInt(cropMatch[1]);
      const height = parseInt(cropMatch[2]);
      let x = 0, y = 0;
      if (part.includes('左上')) {
        x = 0; y = 0;
      } else if (part.includes('右上')) {
        x = null; y = 0;
      } else if (part.includes('左下')) {
        x = 0; y = null;
      } else if (part.includes('右下')) {
        x = null; y = null;
      } else if (part.includes('居中') || part.includes('中心')) {
        x = null; y = null;
      }
      operations.push({
        type: "crop",
        params: { x, y, width, height }
      });
      continue;
    }
    
    // 4. 旋转 rotate
    const rotateMatch = part.match(/(?:旋转|转动)\s*(?:到|为)?\s*(\d+)\s*度/i);
    if (rotateMatch) {
      const degrees = parseInt(rotateMatch[1]);
      operations.push({
        type: "rotate",
        params: {
          degrees,
          backgroundColor: "transparent"
        }
      });
      continue;
    }
    if (part.match(/(?:顺时针|向右)\s*旋转\s*90\s*度/i) || part.match(/旋转\s*90\s*度/i)) {
      operations.push({
        type: "rotate",
        params: {
          degrees: 90,
          backgroundColor: "transparent"
        }
      });
      continue;
    }
    if (part.match(/(?:逆时针|向左)\s*旋转\s*90\s*度/i)) {
      operations.push({
        type: "rotate",
        params: {
          degrees: -90,
          backgroundColor: "transparent"
        }
      });
      continue;
    }
    
    // 5. 模糊 effects-blur
    if (part.match(/(?:模糊|虚化|柔化)/)) {
      let radius = 5, sigma = 5;
      if (part.match(/(?:轻微|轻度|弱|小)/)) {
        radius = 2; sigma = 2;
      } else if (part.match(/(?:强烈|重度|强|大)/)) {
        radius = 10; sigma = 10;
      }
      operations.push({
        type: "effects-blur",
        params: { radius, sigma }
      });
      continue;
    }
    
    // 6. 锐化 effects-sharpen
    if (part.match(/(?:锐化|清晰|增强清晰度)/)) {
      let radius = 1, amount = 1;
      if (part.match(/(?:轻微|轻度|弱)/)) {
        radius = 1; amount = 0.5;
      } else if (part.match(/(?:强烈|重度|强)/)) {
        radius = 3; amount = 3;
      }
      operations.push({
        type: "effects-sharpen",
        params: { radius, amount }
      });
      continue;
    }
    
    // 7. 亮度 effects-brightness
    const brightnessMatch = part.match(/(?:亮度|变亮|变暗|调亮|调暗)\s*(?:到|为)?\s*([+-]?\d+)/i);
    if (brightnessMatch) {
      const value = parseInt(brightnessMatch[1]);
      operations.push({
        type: "effects-brightness",
        params: { value }
      });
      continue;
    }
    if (part.match(/(?:变亮|调亮)/)) {
      operations.push({
        type: "effects-brightness",
        params: { value: 20 }
      });
      continue;
    }
    if (part.match(/(?:变暗|调暗)/)) {
      operations.push({
        type: "effects-brightness",
        params: { value: -20 }
      });
      continue;
    }
    
    // 8. 对比度 effects-contrast
    const contrastMatch = part.match(/(?:对比度|增强对比|降低对比)\s*(?:到|为)?\s*([+-]?\d+)/i);
    if (contrastMatch) {
      const value = parseInt(contrastMatch[1]);
      operations.push({
        type: "effects-contrast",
        params: { value }
      });
      continue;
    }
    if (part.match(/(?:增强对比)/)) {
      operations.push({
        type: "effects-contrast",
        params: { value: 20 }
      });
      continue;
    }
    if (part.match(/(?:降低对比)/)) {
      operations.push({
        type: "effects-contrast",
        params: { value: -20 }
      });
      continue;
    }
    
    // 9. 饱和度 effects-saturation
    const saturationMatch = part.match(/(?:饱和度|鲜艳|色彩饱和度)\s*(?:到|为)?\s*([+-]?\d+)/i);
    if (saturationMatch) {
      const value = parseInt(saturationMatch[1]);
      operations.push({
        type: "effects-saturation",
        params: { value }
      });
      continue;
    }
    
    // 10. 怀旧 effects-sepia
    if (part.match(/(?:怀旧|复古|褐色|老照片)/)) {
      let intensity = 80;
      if (part.match(/(?:轻微|轻度|弱)/)) {
        intensity = 60;
      } else if (part.match(/(?:强烈|重度|强)/)) {
        intensity = 100;
      }
      operations.push({
        type: "effects-sepia",
        params: { intensity }
      });
      continue;
    }
    
    // 11. 格式转换 convert
    const convertMatch = part.match(/(?:转为|转换为|保存为|改成)\s*(jpg|jpeg|png|gif|webp|bmp)/i);
    if (convertMatch) {
      const format = convertMatch[1].toLowerCase();
      operations.push({
        type: "convert",
        params: {
          format: format === 'jpeg' ? 'jpg' : format,
          quality: 90
        }
      });
      continue;
    }
    
    // 12. 形状裁剪 shapeCrop
    if (part.match(/(?:圆形|圆)/)) {
      const sizeMatch = part.match(/(\d+)/);
      const size = sizeMatch ? parseInt(sizeMatch[1]) : 200;
      operations.push({
        type: "shapeCrop",
        params: {
          shape: "circle",
          width: size,
          height: size,
          x: null,
          y: null,
          backgroundColor: "transparent"
        }
      });
      continue;
    }
    
    // 13. 晕影 effects-vignette
    if (part.match(/(?:晕影|暗角|四角暗化)/)) {
      operations.push({
        type: "effects-vignette",
        params: {
          radius: 100,
          sigma: 50
        }
      });
      continue;
    }
  }
  
  return operations;
}

/**
 * 检查服务是否可用
 */
async function checkServiceHealth() {
  try {
    const response = await makeRequest(`${API_BASE}/health`);
    return response.status === "healthy";
  } catch (error) {
    return false;
  }
}

/**
 * 处理图片
 */
async function processImage(imageUrl, operations) {
  try {
    const response = await makeRequest(`${API_BASE}/process`, {
      method: "POST",
      body: {
        filename: imageUrl,
        operations: operations,
      },
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // 构建完整的图片 URL（与 server.js 保持一致）
    const outputUrl = response.path 
      ? `${DEFAULT_API_URL}${response.path}`
      : null;

    // 返回格式与 /api/process 接口完全一致
    return {
      success: response.success !== undefined ? response.success : true,
      outputFile: response.outputFile,
      path: response.path,
      url: outputUrl,
      commands: response.commands || [],
      source: response.source,
      originalFilename: response.originalFilename,
    };
  } catch (error) {
    throw new Error(`图片处理失败: ${error.message}`);
  }
}

// 生成完整的操作参数结构说明
const COMPLETE_OPERATIONS_DOC = `
完整操作参数结构（参考代码中的 COMPLETE_EXAMPLE 常量）：

所有操作都遵循格式：{ "type": "操作类型", "params": { ...参数对象 } }

核心操作类型示例：

1. resize - 调整大小
   { "type": "resize", "params": { "width": 800, "height": 600, "maintainAspectRatio": true, "quality": 90 } }

2. crop - 矩形裁剪
   { "type": "crop", "params": { "x": 0, "y": 0, "width": 500, "height": 500 } }

3. shapeCrop - 形状裁剪
   { "type": "shapeCrop", "params": { "shape": "circle", "width": 200, "height": 200, "x": null, "y": null, "backgroundColor": "transparent" } }
   shape: 'circle'|'ellipse'|'star'|'triangle'|'diamond'|'heart'|'hexagon'|'octagon'

4. rotate - 旋转
   { "type": "rotate", "params": { "degrees": 90, "backgroundColor": "#000000" } }

5. convert - 格式转换
   { "type": "convert", "params": { "format": "jpg", "quality": 90 } }
   format: 'jpg'|'png'|'gif'|'webp'|'bmp'

6. filter-grayscale - 快速灰度（无需参数）
   { "type": "filter-grayscale", "params": {} }

7. effects-grayscale - 灰度（可调算法）⭐ 推荐用于黑白转换
   { "type": "effects-grayscale", "params": { "method": "Rec709", "intensity": 100 } }
   method: 'Rec601'|'Rec709'|'Rec2020'|'Average'|'Lightness'|'Luminance'|'RMS'
   intensity: 0-100（100为完全灰度）

8. effects-blur - 模糊特效
   { "type": "effects-blur", "params": { "radius": 5, "sigma": 5 } }

9. effects-sharpen - 锐化特效
   { "type": "effects-sharpen", "params": { "radius": 1, "amount": 1 } }

10. effects-brightness - 亮度
    { "type": "effects-brightness", "params": { "value": 0 } }
    value: -100到100（0为原始）

11. effects-contrast - 对比度
    { "type": "effects-contrast", "params": { "value": 0 } }
    value: -100到100（0为原始）

12. effects-saturation - 饱和度
    { "type": "effects-saturation", "params": { "value": 0 } }
    value: -100到100（0为原始）

13. effects-sepia - 怀旧特效
    { "type": "effects-sepia", "params": { "intensity": 80 } }
    intensity: 0-100

14. effects-vignette - 晕影
    { "type": "effects-vignette", "params": { "radius": 100, "sigma": 50 } }

15. watermark - 水印
    { "type": "watermark", "params": { "type": "text", "text": "水印文字", "position": "bottom-right", "opacity": 0.5, "fontSize": 24, "color": "#FFFFFF" } }

更多操作类型（effects-charcoal, effects-oil-painting, effects-pixelate, effects-mosaic, effects-swirl, effects-wave, effects-negate, effects-posterize, effects-sketch, effects-emboss, effects-edge, effects-colorize, effects-tint, effects-noise, effects-despeckle, effects-solarize, effects-implode, effects-explode, effects-spread, effects-normalize, effects-equalize, effects-gamma, effects-threshold, effects-quantize）的完整参数结构请参考代码中的 COMPLETE_EXAMPLE 常量（第79-446行）。
`;

// 注册工具：处理图片
// 注意：工具必须在 connect 之前注册
// 使用对象字面量格式（ZodRawShape）以避免 Zod v4 兼容性问题
server.registerTool(
  "process_image",
  {
    title: "处理图片",
    description: `处理图片的工具。支持两种使用方式：
1. 自然语言描述（推荐）：提供 operationDescription，工具会自动解析
2. 直接指定操作：提供 operations 数组，精确控制每个操作

${COMPLETE_OPERATIONS_DOC}

使用方式：
- imageUrl: 图片地址（URL 或本地路径，支持 http:// 和 https://）
- operationDescription（可选）: 自然语言描述，如："把图片调整到 800x600，然后转为灰度图"
- operations（可选）: 直接指定操作数组，格式见上面的完整参数结构

优先级：如果同时提供 operationDescription 和 operations，优先使用 operations。

支持的操作类型和关键词（用于自然语言解析）：
- resize: 调整大小、缩放、尺寸、宽高、调整到、改为（例如："调整到 800x600"）
- crop: 裁剪、截取、切图、剪裁（例如："裁剪左上角 500x500"）
- shapeCrop: 圆形、椭圆、星形、三角形、心形、菱形（例如："圆形裁剪"）
- rotate: 旋转、转动、顺时针、逆时针（例如："旋转 90 度"）
- convert: 转换格式、转为 jpg/png/webp、保存为（例如："转为 jpg"）
- effects-grayscale: 灰度、黑白、去色、灰阶（例如："转为灰度图"）
- effects-blur: 模糊、虚化、柔化（例如："添加模糊效果"）
- effects-sharpen: 锐化、清晰、增强清晰度（例如："锐化图片"）
- effects-brightness: 亮度、变亮、变暗、调亮、调暗（例如："调亮图片"）
- effects-contrast: 对比度、增强对比、降低对比（例如："增强对比度"）
- effects-saturation: 饱和度、鲜艳、色彩饱和度（例如："增加饱和度"）
- effects-sepia: 怀旧、复古、褐色、老照片（例如："怀旧效果"）
- effects-vignette: 晕影、暗角、四角暗化（例如："添加晕影"）

参数推断规则：
- "调整到 800x600" → resize: { width: 800, height: 600, maintainAspectRatio: true }
- "强度适中/中等" → 使用中等参数值（如 radius: 5, intensity: 50）
- "轻微/轻度/弱" → 使用较小参数值（如 radius: 2, intensity: 30）
- "强烈/重度/强" → 使用较大参数值（如 radius: 10, intensity: 80）
- "保持宽高比" → maintainAspectRatio: true
- "居中" → x: null, y: null（使用默认居中）

示例：
- 自然语言："把图片调整到 800x600，然后转为灰度图"
- 直接指定：operations: [{ "type": "effects-grayscale", "params": { "method": "Rec709", "intensity": 100 } }]`,
    inputSchema: {
      imageUrl: z.string().describe("图片 URL 或本地文件路径（支持 http:// 和 https://）"),
      operationDescription: z.string().optional().describe("自然语言描述，描述想要对图片进行的操作。例如：'把图片调整到 800x600，然后转为灰度图' 或 '裁剪图片左上角 500x500 的区域，然后旋转 90 度'。如果提供了 operations 参数，此参数将被忽略。"),
      operations: z.array(z.object({
        type: z.string(),
        params: z.any()
      })).optional().describe("直接指定操作数组，格式见工具描述中的完整参数结构。如果提供了此参数，将优先使用它，忽略 operationDescription。"),
    },
  },
  async ({ imageUrl, operationDescription, operations }) => {
    try {
      // 验证服务是否可用
      const isHealthy = await checkServiceHealth();
      if (!isHealthy) {
        return {
          content: [
            {
              type: "text",
              text: `错误: 图片处理服务不可用。\n\n请确保图片处理服务已启动：\n1. 检查服务是否在 ${DEFAULT_API_URL} 运行\n2. 运行 "npm start" 或使用 Docker 启动服务\n3. 检查服务地址是否正确（可通过环境变量 IMAGE_API_URL 设置）`,
            },
          ],
          isError: true,
        };
      }

      if (!imageUrl) {
        return {
          content: [
            {
              type: "text",
              text: "错误: 缺少图片 URL 参数",
            },
          ],
          isError: true,
        };
      }

      let finalOperations = [];

      // 优先级：如果提供了 operations，优先使用它
      if (operations && Array.isArray(operations) && operations.length > 0) {
        finalOperations = operations;
      } else if (operationDescription && typeof operationDescription === 'string' && operationDescription.trim().length > 0) {
        // 否则使用 operationDescription 解析
        finalOperations = parseOperationDescription(operationDescription);
        
        if (finalOperations.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `错误: 无法从操作描述中解析出有效的操作。\n\n操作描述: "${operationDescription}"\n\n请使用更明确的描述，例如：\n- "把图片调整到 800x600，然后转为灰度图"\n- "裁剪图片左上角 500x500 的区域，然后旋转 90 度"\n- "添加模糊效果，强度适中"\n\n或者直接提供 operations 参数，格式见工具描述中的完整参数结构。`,
              },
            ],
            isError: true,
          };
        }
      } else {
        return {
          content: [
            {
              type: "text",
              text: "错误: 必须提供 operationDescription 或 operations 参数之一。\n\n- operationDescription: 自然语言描述（如：'转为灰度图'）\n- operations: 直接指定操作数组（格式见工具描述中的完整参数结构）",
            },
          ],
          isError: true,
        };
      }

      // 调用图片处理函数
      const result = await processImage(imageUrl, finalOperations);

      // 构建返回消息
      let message = `图片处理成功！\n\n`;
      message += `原始图片: ${result.originalFilename || imageUrl}\n`;
      message += `输出文件: ${result.outputFile}\n`;
      message += `处理路径: ${result.path}\n`;
      
      if (result.url) {
        message += `完整 URL: ${result.url}\n`;
      }
      
      message += `来源: ${result.source === "url" ? "网络URL" : "本地文件"}\n`;
      message += `执行了 ${result.commands?.length || 0} 个操作\n\n`;
      
      if (result.commands && result.commands.length > 0) {
        message += `执行的操作：\n`;
        result.commands.forEach((cmd, index) => {
          message += `${index + 1}. ${cmd}\n`;
        });
      }
 
      return {
        content: [
          {
            type: "text",
            text: message,
          },
          // 注意：MCP 的 image content 需要 data URI 格式，暂时只返回文本消息
          // 处理后的图片可以通过返回的 URL 访问
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `图片处理失败: ${error.message}\n\n请检查：\n1. 图片 URL 是否有效\n2. 操作配置是否正确\n3. 服务是否正常运行`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // 注意：不要使用 console.log 或 console.error，因为 MCP 协议要求所有通信必须是 JSON
  // 日志输出会干扰 MCP 协议的 JSON 消息解析
  // 如果需要调试，可以使用 process.stderr.write，但最好完全移除日志
}

main().catch((error) => {
  // 错误信息通过 MCP 协议返回，不要输出到 stdout/stderr
  process.exit(1);
});
