/**
 * 操作类型配置（平铺结构）
 * 
 * 用于AI prompt生成和操作类型验证
 * 当添加新操作类型时，只需在此数组中添加配置即可，AI prompt会自动同步
 * 
 * category: 'basic' - 基础操作（几何变换、格式转换等）
 * category: 'effect' - 图片效果（使用平铺格式，如 "grayscale", "blur" 等）
 */
export const OPERATIONS_CONFIG = [
  // 基础操作
  {
    type: 'resize',
    category: 'basic',
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
    category: 'basic',
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
    category: 'basic',
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
    category: 'basic',
    description: '旋转',
    params: {
      degrees: { type: 'number', description: '角度（度）', required: true },
      backgroundColor: { type: 'string', description: '背景色', default: '#000000' }
    }
  },
  {
    type: 'convert',
    category: 'basic',
    description: '格式转换',
    params: {
      format: { type: 'string', description: '格式：jpg|png|gif|webp|bmp', required: true },
      quality: { type: 'number', description: '质量（%）', default: 90 }
    }
  },
  {
    type: 'watermark',
    category: 'basic',
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
    category: 'basic',
    description: '调整亮度/对比度/饱和度',
    params: {
      brightness: { type: 'number', description: '亮度（-100到100）', default: 0 },
      contrast: { type: 'number', description: '对比度（-100到100）', default: 0 },
      saturation: { type: 'number', description: '饱和度（-100到100）', default: 0 }
    }
  },
  // 图片效果
  { type: 'grayscale', category: 'effect', description: '黑白化', params: { intensity: { type: 'number', description: '强度（%）', default: 100 }, method: { type: 'string', description: '方法', optional: true } } },
  { type: 'blur', category: 'effect', description: '模糊', params: { radius: { type: 'number', description: '半径', default: 5 }, sigma: { type: 'number', description: 'Sigma', default: 5 } } },
  { type: 'sepia', category: 'effect', description: '怀旧效果', params: { intensity: { type: 'number', description: '强度', default: 80 } } },
  { type: 'negate', category: 'effect', description: '负片', params: {} },
  { type: 'sharpen', category: 'effect', description: '锐化', params: { radius: { type: 'number', description: '半径', default: 1 }, amount: { type: 'number', description: '数量', default: 1 } } },
  { type: 'charcoal', category: 'effect', description: '炭笔画', params: { radius: { type: 'number', description: '半径', default: 1 }, sigma: { type: 'number', description: 'Sigma', default: 0.5 } } },
  { type: 'sketch', category: 'effect', description: '素描', params: { radius: { type: 'number', description: '半径', default: 1 }, sigma: { type: 'number', description: 'Sigma', default: 0.5 } } },
  { type: 'emboss', category: 'effect', description: '浮雕', params: { radius: { type: 'number', description: '半径', default: 1 }, sigma: { type: 'number', description: 'Sigma', default: 0.5 } } },
  { type: 'edge', category: 'effect', description: '边缘检测', params: { radius: { type: 'number', description: '半径', default: 1 } } },
  { type: 'posterize', category: 'effect', description: '海报化', params: { levels: { type: 'number', description: '色阶数', default: 4 } } },
  { type: 'pixelate', category: 'effect', description: '像素化', params: { size: { type: 'number', description: '大小', default: 10 } } },
  { type: 'mosaic', category: 'effect', description: '马赛克', params: { size: { type: 'number', description: '大小', default: 10 } } },
  { type: 'brightness', category: 'effect', description: '亮度调整', params: { value: { type: 'number', description: '数值', default: 0 } } },
  { type: 'contrast', category: 'effect', description: '对比度调整', params: { value: { type: 'number', description: '数值', default: 0 } } },
  { type: 'saturation', category: 'effect', description: '饱和度调整', params: { value: { type: 'number', description: '数值', default: 0 } } },
  { type: 'gaussian-blur', category: 'effect', description: '高斯模糊', params: { radius: { type: 'number', description: '半径', default: 5 } } },
  { type: 'motion-blur', category: 'effect', description: '运动模糊', params: { radius: { type: 'number', description: '半径', default: 10 }, angle: { type: 'number', description: '角度', default: 0 } } },
  { type: 'oil-painting', category: 'effect', description: '油画', params: { radius: { type: 'number', description: '半径', default: 3 } } }
];

/**
 * 生成AI prompt中操作类型的描述文本
 */
export function generateOperationsPrompt() {
  let prompt = '';
  
  // 基础操作
  const basicOps = OPERATIONS_CONFIG.filter(op => op.category === 'basic');
  prompt += '支持的操作类型：\n';
  basicOps.forEach((op, index) => {
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
  const effectOps = OPERATIONS_CONFIG.filter(op => op.category === 'effect');
  prompt += `${basicOps.length + 1}. 图片效果 - ⚠️ 重要：不要使用 "effects" 类型，必须使用以下格式之一：\n\n`;
  prompt += `   方式1：使用平铺格式（推荐，最简单）\n`;
  effectOps.slice(0, 10).forEach((effect) => {
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
  prompt += `   - 其他效果：${effectOps.slice(10).map(e => e.type).join(', ')}\n\n`;
  
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
  const basicOps = OPERATIONS_CONFIG.filter(op => op.category === 'basic');
  const effectOps = OPERATIONS_CONFIG.filter(op => op.category === 'effect');
  
  const basicTypes = basicOps.map(op => op.type);
  const effectTypes = effectOps.map(effect => effect.type);
  const effectTypesWithPrefix = effectOps.map(effect => `effects-${effect.type}`);
  
  return {
    basic: basicTypes,
    effects: effectTypes,
    effectsWithPrefix: effectTypesWithPrefix,
    all: [...basicTypes, ...effectTypes, ...effectTypesWithPrefix]
  };
}

