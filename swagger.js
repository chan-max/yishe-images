import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Yishe Image 图像处理 API',
      version: '1.0.0',
      description: 'Yishe Image 全面图像处理服务 API 文档',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: '/',
        description: '当前服务器',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: '健康检查和状态检测',
      },
      {
        name: 'Upload',
        description: '图片上传',
      },
      {
        name: 'Info',
        description: '图片信息',
      },
      {
        name: 'Resize',
        description: '调整大小',
      },
      {
        name: 'Crop',
        description: '裁剪',
      },
      {
        name: 'Rotate',
        description: '旋转',
      },
      {
        name: 'Convert',
        description: '格式转换',
      },
      {
        name: 'Watermark',
        description: '水印',
      },
      {
        name: 'Effects',
        description: '图片效果（图片裂变）',
      },
      {
        name: 'Adjust',
        description: '图像调整',
      },
      {
        name: 'Filter',
        description: '滤镜效果',
      },
      {
        name: 'Batch',
        description: '批量处理',
      },
      {
        name: 'AI处理',
        description: 'AI智能处理',
      },
      {
        name: 'Process',
        description: '链式处理',
      },
      {
        name: '文件管理',
        description: '文件管理',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: '错误信息',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '是否成功',
            },
          },
        },
        UploadResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            filename: {
              type: 'string',
              description: '服务器保存的文件名',
            },
            originalName: {
              type: 'string',
              description: '原始文件名',
            },
            path: {
              type: 'string',
              description: '文件访问路径',
            },
            size: {
              type: 'integer',
              description: '文件大小（字节）',
            },
          },
        },
        ImageInfo: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: '图片格式',
            },
            width: {
              type: 'integer',
              description: '宽度（像素）',
            },
            height: {
              type: 'integer',
              description: '高度（像素）',
            },
            size: {
              type: 'integer',
              description: '文件大小（字节）',
            },
            colorspace: {
              type: 'string',
              description: '颜色空间',
            },
            depth: {
              type: 'string',
              description: '位深度',
            },
          },
        },
        ProcessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            outputFile: {
              type: 'string',
              description: '输出文件名',
            },
            path: {
              type: 'string',
              description: '输出文件访问路径',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
            },
            imagemagick: {
              type: 'object',
              properties: {
                installed: {
                  type: 'boolean',
                },
                command: {
                  type: 'string',
                  nullable: true,
                },
                version: {
                  type: 'string',
                  nullable: true,
                },
                message: {
                  type: 'string',
                },
              },
            },
          },
        },
        ImageMagickStatus: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            installed: {
              type: 'boolean',
            },
            command: {
              type: 'string',
              nullable: true,
            },
            version: {
              type: 'string',
              nullable: true,
            },
            message: {
              type: 'string',
            },
          },
        },
      },
    },
  },
  apis: ['./server.js'], // 指向包含 Swagger 注释的文件
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

