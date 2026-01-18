import OpenAI from 'openai';
import { generateOperationsPrompt } from './operations-config.js';

/**
 * AI服务配置（硬编码在代码中）
 * 如需修改配置，请直接编辑以下常量
 */
const AI_CONFIG = {
  apiKey: 'sk-6b30d334c13b4995a85400958e7f1ea7',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen-vl-max-latest',
  maxTokens: 4096,
  temperature: 0.7,
  enabled: true
};

/**
 * AI服务，用于将自然语言prompt转换为ImageMagick操作
 */
class AIService {
  constructor() {
    // 优先级：环境变量 > 代码中的硬编码配置
    const apiKey = process.env.OPENAI_API_KEY || 
                   process.env.AI_API_KEY || 
                   AI_CONFIG.apiKey;
    
    const baseURL = process.env.AI_BASE_URL || 
                    process.env.OPENAI_BASE_URL || 
                    AI_CONFIG.baseURL;
    
    const model = process.env.AI_MODEL || 
                  process.env.OPENAI_MODEL || 
                  AI_CONFIG.model;
    
    const maxTokens = process.env.AI_MAX_TOKENS ? 
                      parseInt(process.env.AI_MAX_TOKENS) : 
                      AI_CONFIG.maxTokens;
    
    const temperature = process.env.AI_TEMPERATURE ? 
                         parseFloat(process.env.AI_TEMPERATURE) : 
                         AI_CONFIG.temperature;
    
    const enabled = process.env.AI_ENABLED !== undefined ? 
                     process.env.AI_ENABLED === 'true' : 
                     AI_CONFIG.enabled;
    
    if (!enabled) {
      console.log('AI服务已禁用');
      this.client = null;
      this.config = null;
      return;
    }
    
    if (!apiKey) {
      console.warn('警告: 未设置API密钥，AI功能将不可用');
      this.client = null;
      this.config = null;
      return;
    }
    
    const clientConfig = {
      apiKey: apiKey
    };
    
    // 如果提供了baseURL，使用自定义baseURL（支持阿里云DashScope等）
    if (baseURL) {
      clientConfig.baseURL = baseURL;
    }
    
    this.client = new OpenAI(clientConfig);
    
    // 保存配置
    this.config = {
      model: model,
      maxTokens: maxTokens,
      temperature: temperature
    };
    
    console.log('AI服务已初始化:', {
      baseURL: baseURL || '默认OpenAI',
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      configSource: process.env.OPENAI_API_KEY || process.env.AI_API_KEY ? '环境变量' : '代码配置'
    });
  }

  /**
   * 检查AI服务是否可用
   */
  isAvailable() {
    return this.client !== null;
  }

  /**
   * 将自然语言prompt转换为ImageMagick操作数组
   * @param {string} prompt - 自然语言描述，如"请将这个图片裁剪成方形，然后转变成黑白色"
   * @param {object} imageInfo - 图片信息（可选），包含width, height等
   * @returns {Promise<{operations: Array, command: string}>} 返回操作数组和ImageMagick命令
   */
  async convertPromptToOperations(prompt, imageInfo = null) {
    if (!this.client) {
      throw new Error('AI服务不可用，请检查配置或设置环境变量');
    }

    try {
      // 从配置文件动态生成操作类型描述
      const operationsDescription = generateOperationsPrompt();
      
      // 构建系统提示词
      const systemPrompt = `你是一个ImageMagick图像处理专家。你的任务是将用户的自然语言描述转换为ImageMagick操作数组。

${operationsDescription}

重要规则（必须遵守）：
- ⚠️ 严禁使用 type: "filter" 或 type: "effects"（这是旧格式，已被禁用，会导致错误）
- ✅ 推荐使用平铺格式：type: "grayscale", type: "blur", type: "sepia" 等
- ✅ 也可以使用连字符格式：type: "effects-grayscale", type: "effects-blur" 等
- 如果用户说"裁剪成方形"，应该先获取图片尺寸，然后计算最小边作为裁剪尺寸，居中裁剪
- 如果用户说"转变成黑白色"或"黑白化"，使用 type: "grayscale" 或 type: "effects-grayscale"，params: {intensity: 100}
- 操作顺序很重要，按用户描述的顺序执行
- 参数要合理，不要超出图片尺寸范围

${imageInfo ? `当前图片信息：宽度=${imageInfo.width}px, 高度=${imageInfo.height}px` : ''}

请只返回JSON格式的操作数组，不要包含其他文字说明。格式：
{
  "operations": [
    {
      "type": "操作类型",
      "params": {...}
    }
  ]
}`;

      const userPrompt = `请将以下描述转换为ImageMagick操作：${prompt}`;

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      const result = JSON.parse(content);

      if (!result.operations || !Array.isArray(result.operations)) {
        throw new Error('AI返回的格式不正确，缺少operations数组');
      }

      // 生成ImageMagick命令描述（用于展示）
      const commandDescription = this.generateCommandDescription(result.operations);

      return {
        operations: result.operations,
        command: commandDescription
      };
    } catch (error) {
      console.error('AI转换失败:', error);
      throw new Error(`AI转换失败: ${error.message}`);
    }
  }

  /**
   * 生成命令描述（用于展示给用户）
   */
  generateCommandDescription(operations) {
    return operations.map((op, index) => {
      return `${index + 1}. ${op.type}(${JSON.stringify(op.params)})`;
    }).join(' -> ');
  }
}

export default new AIService();

