/**
 * 操作类型配置
 * 
 * 用于AI prompt生成和操作类型验证
 * 当添加新操作类型时，只需在此文件中添加配置即可，AI prompt会自动同步
 */

export const OPERATIONS_CONFIG = {
  // 基础操作（几何变换、格式转换等）
  basic: [
    {
      type: 'resize',
      description: '调整大小',
      params: {
        width: { type: 'number', description: '宽度（像素）', required: true },
        height: { type: 'number', description: '高度（像素）', required: true },
        maintainAspectRatio: { type: 'boolean', description: '保持宽高比', default: true },
        quality: { type: 'number', description: '质量（%）', default: 90 }
      }
    },
    {
      type: 'crop',
      description: '矩形裁剪',
      params: {
        x: { type: 'number', description: 'X坐标（像素）', default: 0 },
        y: { type: 'number', description: 'Y坐标（像素）', default: 0 },
        width: { type: 'number', description: '宽度（像素）', required: true },
        height: { type: 'number', description: '高度（像素）', required: true }
      }
    },
    {
      type: 'shapeCrop',
      description: '形状裁剪（圆形、椭圆等）',
      params: {
        shape: { type: 'string', description: '形状：circle|ellipse|star|triangle|diamond|heart|hexagon|octagon', required: true },
        width: { type: 'number', description: '宽度（像素）', default: 200 },
        height: { type: 'number', description: '高度（像素）', default: 200 },
        x: { type: 'number', description: '中心X坐标（可选，留空则居中）', optional: true },
        y: { type: 'number', description: '中心Y坐标（可选，留空则居中）', optional: true },
        backgroundColor: { type: 'string', description: '背景颜色', default: 'transparent' }
      }
    },
    {
      type: 'rotate',
      description: '旋转',
      params: {
        degrees: { type: 'number', description: '角度（度）', required: true },
        backgroundColor: { type: 'string', description: '背景色', default: '#000000' }
      }
    },
    {
      type: 'convert',
      description: '格式转换',
      params: {
        format: { type: 'string', description: '格式：jpg|png|gif|webp|bmp', required: true },
        quality: { type: 'number', description: '质量（%）', default: 90 }
      }
    },
    {
      type: 'watermark',
      description: '水印',
      params: {
        type: { type: 'string', description: '类型：text|image', default: 'text' },
        text: { type: 'string', description: '水印文字', optional: true },
        position: { type: 'string', description: '位置：top-left|top-right|bottom-left|bottom-right|center', default: 'bottom-right' },
        opacity: { type: 'number', description: '透明度（0-1）', default: 0.5 }
      }
    },
    {
      type: 'adjust',
      description: '调整亮度/对比度/饱和度',
      params: {
        brightness: { type: 'number', description: '亮度（-100到100）', default: 0 },
        contrast: { type: 'number', description: '对比度（-100到100）', default: 0 },
        saturation: { type: 'number', description: '饱和度（-100到100）', default: 0 }
      }
    }
  ],
  
  // 图片效果（使用平铺格式，如 "grayscale", "blur" 等）
  effects: [
    { type: 'grayscale', description: '黑白化', params: { intensity: { type: 'number', description: '强度（%）', default: 100 }, method: { type: 'string', description: '方法', optional: true } } },
    { type: 'blur', description: '模糊', params: { radius: { type: 'number', description: '半径', default: 5 }, sigma: { type: 'number', description: 'Sigma', default: 5 } } },
    { type: 'sepia', description: '怀旧效果', params: { intensity: { type: 'number', description: '强度', default: 80 } } },
    { type: 'negate', description: '负片', params: {} },
    { type: 'sharpen', description: '锐化', params: { radius: { type: 'number', description: '半径', default: 1 }, amount: { type: 'number', description: '数量', default: 1 } } },
    { type: 'charcoal', description: '炭笔画', params: { radius: { type: 'number', description: '半径', default: 1 }, sigma: { type: 'number', description: 'Sigma', default: 0.5 } } },
    { type: 'sketch', description: '素描', params: { radius: { type: 'number', description: '半径', default: 1 }, sigma: { type: 'number', description: 'Sigma', default: 0.5 } } },
    { type: 'emboss', description: '浮雕', params: { radius: { type: 'number', description: '半径', default: 1 }, sigma: { type: 'number', description: 'Sigma', default: 0.5 } } },
    { type: 'edge', description: '边缘检测', params: { radius: { type: 'number', description: '半径', default: 1 } } },
    { type: 'posterize', description: '海报化', params: { levels: { type: 'number', description: '色阶数', default: 4 } } },
    { type: 'pixelate', description: '像素化', params: { size: { type: 'number', description: '大小', default: 10 } } },
    { type: 'mosaic', description: '马赛克', params: { size: { type: 'number', description: '大小', default: 10 } } },
    { type: 'brightness', description: '亮度调整', params: { value: { type: 'number', description: '数值', default: 0 } } },
    { type: 'contrast', description: '对比度调整', params: { value: { type: 'number', description: '数值', default: 0 } } },
    { type: 'saturation', description: '饱和度调整', params: { value: { type: 'number', description: '数值', default: 0 } } },
    { type: 'gaussian-blur', description: '高斯模糊', params: { radius: { type: 'number', description: '半径', default: 5 } } },
    { type: 'motion-blur', description: '运动模糊', params: { radius: { type: 'number', description: '半径', default: 10 }, angle: { type: 'number', description: '角度', default: 0 } } },
    { type: 'oil-painting', description: '油画', params: { radius: { type: 'number', description: '半径', default: 3 } } }
  ]
};

/**
 * 生成AI prompt中操作类型的描述文本
 */
export function generateOperationsPrompt() {
  let prompt = '';
  
  // 基础操作
  prompt += '支持的操作类型：\n';
  OPERATIONS_CONFIG.basic.forEach((op, index) => {
    prompt += `${index + 1}. ${op.type} - ${op.description}\n`;
    prompt += `   - type: "${op.type}"\n`;
    const paramList = Object.entries(op.params)
      .map(([key, paramDesc]) => {
        const required = paramDesc.required ? '（必填）' : paramDesc.optional ? '（可选）' : '';
        const defaultVal = paramDesc.default !== undefined ? `，默认: ${JSON.stringify(paramDesc.default)}` : '';
        return `${key}: ${paramDesc.type}${required}${defaultVal}`;
      })
      .join(', ');
    prompt += `   - params: {${paramList}}\n\n`;
  });
  
  // 图片效果
  prompt += `8. 图片效果 - ⚠️ 重要：不要使用 "effects" 类型，必须使用以下格式之一：\n\n`;
  prompt += `   方式1：使用平铺格式（推荐，最简单）\n`;
  OPERATIONS_CONFIG.effects.slice(0, 10).forEach((effect) => {
    const paramList = Object.keys(effect.params).length > 0 
      ? Object.entries(effect.params)
          .map(([key, paramDesc]) => {
            const defaultVal = paramDesc.default !== undefined ? `，默认: ${JSON.stringify(paramDesc.default)}` : '';
            return `${key}${defaultVal}`;
          })
          .join(', ')
      : '无参数';
    prompt += `   - type: "${effect.type}" - ${effect.description}，params: {${paramList}}\n`;
  });
  prompt += `   - 其他效果：${OPERATIONS_CONFIG.effects.slice(10).map(e => e.type).join(', ')}\n\n`;
  
  prompt += `   方式2：使用 "effects-xxx" 格式（也可以）\n`;
  prompt += `   - type: "effects-grayscale", type: "effects-blur", type: "effects-sepia" 等\n\n`;
  
  prompt += `   ⚠️ 禁止格式（会导致错误）：\n`;
  prompt += `   - ❌ type: "effects" （旧格式，已被禁用）\n`;
  prompt += `   - ❌ type: "filter" （旧格式，已被禁用）\n`;
  
  return prompt;
}

/**
 * 获取所有支持的操作类型列表
 */
export function getAllOperationTypes() {
  const basicTypes = OPERATIONS_CONFIG.basic.map(op => op.type);
  const effectTypes = OPERATIONS_CONFIG.effects.map(effect => effect.type);
  const effectTypesWithPrefix = OPERATIONS_CONFIG.effects.map(effect => `effects-${effect.type}`);
  
  return {
    basic: basicTypes,
    effects: effectTypes,
    effectsWithPrefix: effectTypesWithPrefix,
    all: [...basicTypes, ...effectTypes, ...effectTypesWithPrefix]
  };
}

