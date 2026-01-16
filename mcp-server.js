import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
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
const OPERATIONS_EXAMPLE = JSON.stringify(COMPLETE_EXAMPLE, null, 2);

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

// 注册工具：处理图片
server.tool(
  "process_image",
  {
    imageUrl: z.string().describe("图片 URL 或本地文件路径（支持 http:// 和 https://）"),
    operations: z.array(
      z.object({
        type: z.string().describe("操作类型，如：resize, crop, rotate, convert, watermark, effects-grayscale, effects-blur 等"),
        params: z.record(z.any()).optional().describe("操作参数对象，根据操作类型不同而不同。如果不提供，将使用默认参数。"),
      })
    ).describe(`图片处理操作数组，按顺序执行。每个操作包含 type（操作类型）和可选的 params（参数对象）。\n\n${OPERATIONS_EXAMPLE}`),
  },
  async ({ imageUrl, operations }) => {
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

      if (!operations || !Array.isArray(operations) || operations.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "错误: operations 必须是非空数组",
            },
          ],
          isError: true,
        };
      }

      // 处理图片
      const result = await processImage(imageUrl, operations);

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
          // 如果有图片 URL，也可以返回图片资源
          ...(result.url
            ? [
                {
                  type: "image",
                  data: result.url,
                  mimeType: "image/jpeg",
                },
              ]
            : []),
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
  
  // 检查服务状态
  const isHealthy = await checkServiceHealth();
  if (!isHealthy) {
    console.error(
      `警告: 图片处理服务不可用 (${DEFAULT_API_URL})\n请确保服务已启动`
    );
  } else {
    console.log(`MCP 服务器已启动，连接到图片处理服务: ${DEFAULT_API_URL}`);
  }
}

main().catch((error) => {
  console.error("启动 MCP 服务器失败:", error);
  process.exit(1);
});
