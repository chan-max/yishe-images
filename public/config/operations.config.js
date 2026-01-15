/**
 * 操作配置统一文件
 * 
 * 所有图片处理操作的配置都定义在此文件中
 * 每个操作配置包含：
 * - meta: 操作元数据（value, baseType, filterType/effectType）
 * - ui: UI 配置（label, icon, description）
 * - params: 参数配置（defaults 默认值, fields 表单字段定义）
 */

(function(global) {
  global.ImageOperationsConfig = {
    // 基础操作配置
    base: [
      {
        meta: {
          value: 'resize',
          baseType: 'resize'
        },
        ui: {
          label: '调整大小',
          icon: 'expand',
          description: '缩放图片到指定尺寸，可以保持原始宽高比或强制拉伸到目标尺寸'
        },
        params: {
          defaults: {
            width: 800,
            height: 600,
            maintainAspectRatio: true,
            quality: 90
          },
          fields: [
            {
              key: 'width',
              label: '宽度',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 10000,
              hint: '目标图片宽度，范围：1-10000，推荐：800-1920'
            },
            {
              key: 'height',
              label: '高度',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 10000,
              hint: '目标图片高度，范围：1-10000，推荐：600-1080'
            },
            {
              key: 'maintainAspectRatio',
              label: '保持宽高比',
              type: 'checkbox',
              hint: '勾选后按比例缩放，不勾选则强制拉伸到目标尺寸（可能变形）'
            },
            {
              key: 'quality',
              label: '质量',
              type: 'number',
              unit: '%',
              min: 1,
              max: 100,
              hint: '图片压缩质量，范围：1-100，推荐：85-95（数值越高质量越好但文件越大）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'crop',
          baseType: 'crop'
        },
        ui: {
          label: '矩形裁剪',
          icon: 'crop',
          description: '从图片中裁剪出一个矩形区域，需要指定起始坐标和裁剪区域的宽高'
        },
        params: {
          defaults: {
            x: 0,
            y: 0,
            width: 500,
            height: 500
          },
          fields: [
            {
              key: 'x',
              label: 'X坐标',
              type: 'number',
              unit: '像素',
              min: 0,
              hint: '裁剪区域左上角的X坐标，范围：0-图片宽度，推荐：从0开始'
            },
            {
              key: 'y',
              label: 'Y坐标',
              type: 'number',
              unit: '像素',
              min: 0,
              hint: '裁剪区域左上角的Y坐标，范围：0-图片高度，推荐：从0开始'
            },
            {
              key: 'width',
              label: '宽度',
              type: 'number',
              unit: '像素',
              min: 1,
              hint: '裁剪区域的宽度，范围：1-图片宽度，需确保 X+宽度 ≤ 图片宽度'
            },
            {
              key: 'height',
              label: '高度',
              type: 'number',
              unit: '像素',
              min: 1,
              hint: '裁剪区域的高度，范围：1-图片高度，需确保 Y+高度 ≤ 图片高度'
            }
          ]
        }
      },
      {
        meta: {
          value: 'shapeCrop',
          baseType: 'shapeCrop'
        },
        ui: {
          label: '形状裁剪',
          icon: 'circle',
          description: '按照指定形状（圆形、椭圆、星形等）裁剪图片，保留形状内的内容'
        },
        params: {
          defaults: {
            shape: 'circle',
            x: null,
            y: null,
            width: 200,
            height: 200,
            backgroundColor: 'transparent'
          },
          fields: [
            {
              key: 'shape',
              label: '形状',
              type: 'select',
              options: [
                { value: 'circle', label: '圆形' },
                { value: 'ellipse', label: '椭圆' },
                { value: 'star', label: '五角星' },
                { value: 'triangle', label: '三角形' },
                { value: 'diamond', label: '菱形' },
                { value: 'heart', label: '心形' },
                { value: 'hexagon', label: '六边形' },
                { value: 'octagon', label: '八边形' }
              ],
              hint: '选择裁剪的形状类型，推荐：圆形、椭圆'
            },
            {
              key: 'width',
              label: '宽度',
              type: 'number',
              unit: '像素',
              min: 1,
              hint: '形状的宽度，范围：1-图片宽度，推荐：200-800'
            },
            {
              key: 'height',
              label: '高度',
              type: 'number',
              unit: '像素',
              min: 1,
              hint: '形状的高度，范围：1-图片高度，推荐：200-800（圆形时建议与宽度相同）'
            },
            {
              key: 'x',
              label: '中心 X 坐标（留空则居中）',
              type: 'number',
              hint: '形状中心的X坐标，留空则自动居中，范围：0-图片宽度'
            },
            {
              key: 'y',
              label: '中心 Y 坐标（留空则居中）',
              type: 'number',
              hint: '形状中心的Y坐标，留空则自动居中，范围：0-图片高度'
            },
            {
              key: 'backgroundColor',
              label: '背景颜色',
              type: 'text',
              hint: '形状外的背景颜色，支持颜色名称（如 transparent、white）或十六进制（如 #FFFFFF），推荐：transparent（透明）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'rotate',
          baseType: 'rotate'
        },
        ui: {
          label: '旋转',
          icon: 'redo',
          description: '按指定角度旋转图片，可以设置旋转后的背景颜色'
        },
        params: {
          defaults: {
            degrees: 90,
            backgroundColor: '#000000'
          },
          fields: [
            {
              key: 'degrees',
              label: '角度',
              type: 'number',
              unit: '度',
              min: -360,
              max: 360,
              hint: '旋转角度，范围：-360 到 360，正数为顺时针，负数为逆时针，推荐：90、180、270'
            },
            {
              key: 'backgroundColor',
              label: '背景色',
              type: 'text',
              hint: '旋转后空白区域的背景颜色，支持颜色名称或十六进制（如 #000000、white），推荐：#000000（黑色）或 transparent（透明）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'convert',
          baseType: 'convert'
        },
        ui: {
          label: '格式转换',
          icon: 'exchange',
          description: '将图片转换为其他格式（JPG、PNG、GIF、WEBP、BMP等），可设置输出质量'
        },
        params: {
          defaults: {
            format: 'jpg',
            quality: 90
          },
          fields: [
            {
              key: 'format',
              label: '格式',
              type: 'select',
              options: [
                { value: 'jpg', label: 'JPG' },
                { value: 'png', label: 'PNG' },
                { value: 'gif', label: 'GIF' },
                { value: 'webp', label: 'WEBP' },
                { value: 'bmp', label: 'BMP' }
              ],
              hint: '目标图片格式，JPG适合照片（有损压缩），PNG适合图标（无损，支持透明），WEBP适合网页（体积小），推荐：JPG（照片）或 PNG（图标）'
            },
            {
              key: 'quality',
              label: '质量',
              type: 'number',
              unit: '%',
              min: 1,
              max: 100,
              hint: '图片压缩质量（仅对JPG/WEBP有效），范围：1-100，推荐：85-95（数值越高质量越好但文件越大）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'watermark',
          baseType: 'watermark'
        },
        ui: {
          label: '水印',
          icon: 'tint',
          description: '在图片上添加文字或图片水印，可设置位置和透明度'
        },
        params: {
          defaults: {
            type: 'text',
            text: '水印',
            fontSize: 24,
            fontFamily: 'Microsoft YaHei',
            color: '#FFFFFF',
            strokeColor: '',
            strokeWidth: 0,
            watermarkImageFilename: null,
            watermarkScale: 1.0,
            position: 'bottom-right',
            x: null,
            y: null,
            opacity: 0.5
          },
          fields: [
            {
              key: 'type',
              label: '类型',
              type: 'select',
              options: [
                { value: 'text', label: '文字' },
                { value: 'image', label: '图片' }
              ],
              hint: '选择水印类型，文字水印适合添加版权信息，图片水印适合添加Logo'
            },
            {
              key: 'text',
              label: '文字',
              type: 'text',
              hint: '要显示的水印文字内容，推荐：版权信息、品牌名称等'
            },
            {
              key: 'position',
              label: '位置',
              type: 'select',
              options: [
                { value: 'top-left', label: '左上' },
                { value: 'top-right', label: '右上' },
                { value: 'bottom-left', label: '左下' },
                { value: 'bottom-right', label: '右下' },
                { value: 'center', label: '居中' }
              ],
              hint: '水印在图片上的位置，推荐：bottom-right（右下角，不遮挡主要内容）'
            },
            {
              key: 'opacity',
              label: '透明度',
              type: 'number',
              min: 0,
              max: 1,
              step: 0.1,
              hint: '水印的透明度，范围：0-1（0完全透明，1完全不透明），推荐：0.3-0.7（半透明效果）'
            }
          ]
        }
      }
    ],

    // 滤镜操作配置
    filters: [
      {
        meta: {
          value: 'filter-blur',
          baseType: 'filter',
          filterType: 'blur'
        },
        ui: {
          label: '模糊',
          icon: 'filter',
          description: '应用模糊滤镜，让图片变得柔和'
        },
        params: {
          defaults: {
            intensity: 1
          },
          fields: [
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              min: 0,
              max: 10,
              step: 0.1,
              hint: '滤镜效果的强度，范围：0-10，推荐：1-3（数值越大效果越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'filter-sharpen',
          baseType: 'filter',
          filterType: 'sharpen'
        },
        ui: {
          label: '锐化',
          icon: 'filter',
          description: '增强图片细节，让边缘更清晰'
        },
        params: {
          defaults: {
            intensity: 1
          },
          fields: [
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              min: 0,
              max: 10,
              step: 0.1,
              hint: '滤镜效果的强度，范围：0-10，推荐：1-3（数值越大效果越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'filter-emboss',
          baseType: 'filter',
          filterType: 'emboss'
        },
        ui: {
          label: '浮雕',
          icon: 'filter',
          description: '让图片产生立体浮雕效果'
        },
        params: {
          defaults: {
            intensity: 1
          },
          fields: [
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              min: 0,
              max: 10,
              step: 0.1,
              hint: '滤镜效果的强度，范围：0-10，推荐：1-3（数值越大效果越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'filter-edge',
          baseType: 'filter',
          filterType: 'edge'
        },
        ui: {
          label: '边缘检测',
          icon: 'filter',
          description: '只保留图片边缘轮廓，形成线条效果'
        },
        params: {
          defaults: {
            intensity: 1
          },
          fields: [
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              min: 0,
              max: 10,
              step: 0.1,
              hint: '滤镜效果的强度，范围：0-10，推荐：1-3（数值越大效果越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'filter-charcoal',
          baseType: 'filter',
          filterType: 'charcoal'
        },
        ui: {
          label: '炭笔画',
          icon: 'filter',
          description: '将图片转为炭笔画风格'
        },
        params: {
          defaults: {
            intensity: 1
          },
          fields: [
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              min: 0,
              max: 10,
              step: 0.1,
              hint: '滤镜效果的强度，范围：0-10，推荐：1-3（数值越大效果越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'filter-oil-painting',
          baseType: 'filter',
          filterType: 'oil-painting'
        },
        ui: {
          label: '油画',
          icon: 'filter',
          description: '模拟油画效果'
        },
        params: {
          defaults: {
            intensity: 1
          },
          fields: [
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              min: 0,
              max: 10,
              step: 0.1,
              hint: '滤镜效果的强度，范围：0-10，推荐：1-3（数值越大效果越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'filter-sepia',
          baseType: 'filter',
          filterType: 'sepia'
        },
        ui: {
          label: '怀旧',
          icon: 'filter',
          description: '快速加上棕褐色怀旧滤镜'
        },
        params: {
          defaults: {
            intensity: 80
          },
          fields: [
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              min: 0,
              max: 100,
              step: 1,
              unit: '%',
              hint: '怀旧棕褐色效果强度，范围：0-100%，推荐：60-90（数值越大效果越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'filter-grayscale',
          baseType: 'filter',
          filterType: 'grayscale'
        },
        ui: {
          label: '灰度',
          icon: 'filter',
          description: '快速转为灰度图片'
        },
        params: {
          defaults: {
            intensity: 1
          },
          fields: [
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              min: 0,
              max: 10,
              step: 0.1,
              hint: '滤镜效果的强度，范围：0-10，推荐：1-3（数值越大效果越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'filter-negate',
          baseType: 'filter',
          filterType: 'negate'
        },
        ui: {
          label: '负片',
          icon: 'filter',
          description: '将颜色反转，生成负片效果'
        },
        params: {
          defaults: {
            intensity: 1
          },
          fields: [
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              min: 0,
              max: 10,
              step: 0.1,
              hint: '滤镜效果的强度，范围：0-10，推荐：1-3（数值越大效果越明显）'
            }
          ]
        }
      }
    ],

    // 效果操作配置
    effects: [
      {
        meta: {
          value: 'effects-grayscale',
          baseType: 'effects',
          effectType: 'grayscale'
        },
        ui: {
          label: '黑白化',
          icon: 'magic',
          description: '将图片转换为黑白风格'
        },
        params: {
          defaults: {
            method: 'Rec601Luma',
            intensity: 100
          },
          fields: [
            {
              key: 'method',
              label: '方法',
              type: 'select',
              options: [
                { value: 'Rec601Luma', label: 'Rec601Luma' },
                { value: 'Rec709Luma', label: 'Rec709Luma' },
                { value: 'average', label: '平均值' },
                { value: 'luminance', label: '亮度' },
                { value: 'desaturate', label: '去饱和' }
              ],
              hint: '黑白化转换方法，推荐：Rec709Luma（现代标准）或 average（简单平均）'
            },
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              unit: '%',
              min: 0,
              max: 100,
              hint: '黑白化强度，范围：0-100，推荐：100（完全黑白化）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-sepia',
          baseType: 'effects',
          effectType: 'sepia'
        },
        ui: {
          label: '怀旧',
          icon: 'magic',
          description: '添加棕褐色调的复古效果'
        },
        params: {
          defaults: {
            intensity: 80
          },
          fields: [
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              unit: '%',
              min: 0,
              max: 100,
              hint: '怀旧效果的强度，范围：0-100，推荐：60-100'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-negate',
          baseType: 'effects',
          effectType: 'negate'
        },
        ui: {
          label: '负片',
          icon: 'magic',
          description: '反转所有颜色，形成底片效果'
        },
        params: {
          defaults: {}
        }
      },
      {
        meta: {
          value: 'effects-blur',
          baseType: 'effects',
          effectType: 'blur'
        },
        ui: {
          label: '模糊',
          icon: 'magic',
          description: '更高级的模糊效果，可配合半径等参数'
        },
        params: {
          defaults: {
            radius: 5,
            sigma: 5
          },
          fields: [
            {
              key: 'radius',
              label: '半径',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 100,
              hint: '效果的影响半径（像素），范围：1-100，推荐：5-20（数值越大影响范围越广）'
            },
            {
              key: 'sigma',
              label: 'Sigma',
              type: 'number',
              unit: '像素',
              min: 0.1,
              max: 10,
              step: 0.1,
              hint: '高斯模糊的标准差，范围：0.1-10，推荐：1-5（数值越大模糊程度越高）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-gaussian-blur',
          baseType: 'effects',
          effectType: 'gaussian-blur'
        },
        ui: {
          label: '高斯模糊',
          icon: 'magic',
          description: '使用高斯算法的平滑模糊'
        },
        params: {
          defaults: {
            radius: 5
          },
          fields: [
            {
              key: 'radius',
              label: '半径',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 100,
              hint: '高斯模糊的半径，产生更自然的模糊效果，范围：1-100，推荐：5-20'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-motion-blur',
          baseType: 'effects',
          effectType: 'motion-blur'
        },
        ui: {
          label: '运动模糊',
          icon: 'magic',
          description: '模拟物体快速运动产生的拖影效果'
        },
        params: {
          defaults: {
            radius: 10,
            angle: 0
          },
          fields: [
            {
              key: 'radius',
              label: '半径',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 100,
              hint: '运动模糊的距离，模拟运动效果，范围：1-100，推荐：5-30'
            },
            {
              key: 'angle',
              label: '角度',
              type: 'number',
              unit: '度',
              min: -180,
              max: 180,
              hint: '运动模糊的角度，范围：-180到180度，推荐：0-180'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-sharpen',
          baseType: 'effects',
          effectType: 'sharpen'
        },
        ui: {
          label: '锐化',
          icon: 'magic',
          description: '增强图片细节的锐化效果'
        },
        params: {
          defaults: {
            radius: 1,
            amount: 1
          },
          fields: [
            {
              key: 'radius',
              label: '半径',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 10,
              hint: '锐化的半径，值越大锐化范围越广，范围：1-10，推荐：1-3'
            },
            {
              key: 'amount',
              label: '数量',
              type: 'number',
              min: 0,
              max: 10,
              step: 0.1,
              hint: '锐化的强度倍数，范围：0-10，推荐：0.5-3（数值越大效果越强）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-unsharp',
          baseType: 'effects',
          effectType: 'unsharp'
        },
        ui: {
          label: '非锐化遮罩',
          icon: 'magic',
          description: '更专业的锐化控制方式'
        },
        params: {
          defaults: {
            radius: 1,
            amount: 1,
            threshold: 0.05
          },
          fields: [
            {
              key: 'radius',
              label: '半径',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 10,
              hint: '非锐化遮罩的半径，范围：1-10，推荐：1-3'
            },
            {
              key: 'amount',
              label: '数量',
              type: 'number',
              min: 0,
              max: 10,
              step: 0.1,
              hint: '非锐化遮罩的强度倍数，范围：0-10，推荐：0.5-3'
            },
            {
              key: 'threshold',
              label: '阈值',
              type: 'number',
              min: 0,
              max: 1,
              step: 0.01,
              hint: '非锐化遮罩的阈值，范围：0-1，推荐：0.05-0.1'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-charcoal',
          baseType: 'effects',
          effectType: 'charcoal'
        },
        ui: {
          label: '炭笔画',
          icon: 'magic',
          description: '生成炭笔素描风格图片'
        },
        params: {
          defaults: {
            radius: 1,
            sigma: 0.5
          },
          fields: [
            {
              key: 'radius',
              label: '半径',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 10,
              hint: '炭笔画效果的半径，范围：1-10，推荐：1-3'
            },
            {
              key: 'sigma',
              label: 'Sigma',
              type: 'number',
              unit: '像素',
              min: 0.1,
              max: 10,
              step: 0.1,
              hint: '炭笔画的标准差，范围：0.1-10，推荐：0.5-2'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-oil-painting',
          baseType: 'effects',
          effectType: 'oil-painting'
        },
        ui: {
          label: '油画',
          icon: 'magic',
          description: '模拟油画笔触效果'
        },
        params: {
          defaults: {
            radius: 3
          },
          fields: [
            {
              key: 'radius',
              label: '半径',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 20,
              hint: '油画效果的笔触半径，值越大笔触越粗，范围：1-20，推荐：3-10'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-sketch',
          baseType: 'effects',
          effectType: 'sketch'
        },
        ui: {
          label: '铅笔素描',
          icon: 'magic',
          description: '转换为铅笔素描风格'
        },
        params: {
          defaults: {
            radius: 1,
            sigma: 0.5
          },
          fields: [
            {
              key: 'radius',
              label: '半径',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 10,
              hint: '素描效果的半径，范围：1-10，推荐：1-3'
            },
            {
              key: 'sigma',
              label: 'Sigma',
              type: 'number',
              unit: '像素',
              min: 0.1,
              max: 10,
              step: 0.1,
              hint: '素描的标准差，范围：0.1-10，推荐：0.5-2'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-emboss',
          baseType: 'effects',
          effectType: 'emboss'
        },
        ui: {
          label: '浮雕',
          icon: 'magic',
          description: '立体浮雕艺术效果'
        },
        params: {
          defaults: {
            radius: 1,
            sigma: 0.5
          },
          fields: [
            {
              key: 'radius',
              label: '半径',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 10,
              hint: '浮雕效果的半径，范围：1-10，推荐：1-3'
            },
            {
              key: 'sigma',
              label: 'Sigma',
              type: 'number',
              unit: '像素',
              min: 0.1,
              max: 10,
              step: 0.1,
              hint: '浮雕的标准差，范围：0.1-10，推荐：0.5-2'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-edge',
          baseType: 'effects',
          effectType: 'edge'
        },
        ui: {
          label: '边缘检测',
          icon: 'magic',
          description: '只保留轮廓边缘线条'
        },
        params: {
          defaults: {
            radius: 1
          },
          fields: [
            {
              key: 'radius',
              label: '半径',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 10,
              hint: '边缘检测的半径，范围：1-10，推荐：1-3'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-posterize',
          baseType: 'effects',
          effectType: 'posterize'
        },
        ui: {
          label: '海报化',
          icon: 'magic',
          description: '减少颜色数量，形成海报风格'
        },
        params: {
          defaults: {
            levels: 4
          },
          fields: [
            {
              key: 'levels',
              label: '色阶数',
              type: 'number',
              min: 2,
              max: 256,
              hint: '颜色量化后的色阶数量，范围：2-256，推荐：4-16（数值越小颜色越少，海报效果越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-pixelate',
          baseType: 'effects',
          effectType: 'pixelate'
        },
        ui: {
          label: '像素化',
          icon: 'magic',
          description: '生成大颗粒像素风格'
        },
        params: {
          defaults: {
            size: 10
          },
          fields: [
            {
              key: 'size',
              label: '大小',
              type: 'number',
              unit: '像素',
              min: 2,
              max: 50,
              hint: '像素块的大小（像素），范围：2-50，推荐：5-20（数值越大块越大）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-mosaic',
          baseType: 'effects',
          effectType: 'mosaic'
        },
        ui: {
          label: '马赛克',
          icon: 'magic',
          description: '用于打码或艺术马赛克效果'
        },
        params: {
          defaults: {
            size: 10
          },
          fields: [
            {
              key: 'size',
              label: '大小',
              type: 'number',
              unit: '像素',
              min: 2,
              max: 50,
              hint: '马赛克的块大小（像素），范围：2-50，推荐：5-20（数值越大块越大）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-brightness',
          baseType: 'effects',
          effectType: 'brightness'
        },
        ui: {
          label: '亮度',
          icon: 'magic',
          description: '单独调整亮度'
        },
        params: {
          defaults: {
            value: 0
          },
          fields: [
            {
              key: 'value',
              label: '亮度',
              type: 'number',
              unit: '%',
              min: -100,
              max: 100,
              hint: '调整图片亮度，-100到+100，0为原始亮度，推荐：-20到20（负数变暗，正数变亮）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-contrast',
          baseType: 'effects',
          effectType: 'contrast'
        },
        ui: {
          label: '对比度',
          icon: 'magic',
          description: '单独调整对比度'
        },
        params: {
          defaults: {
            value: 0
          },
          fields: [
            {
              key: 'value',
              label: '对比度',
              type: 'number',
              unit: '%',
              min: -100,
              max: 100,
              hint: '调整图片对比度，-100到+100，0为原始对比度，推荐：-20到20（负数降低，正数增强）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-saturation',
          baseType: 'effects',
          effectType: 'saturation'
        },
        ui: {
          label: '饱和度',
          icon: 'magic',
          description: '单独调整颜色饱和度'
        },
        params: {
          defaults: {
            value: 0
          },
          fields: [
            {
              key: 'value',
              label: '饱和度',
              type: 'number',
              unit: '%',
              min: -100,
              max: 100,
              hint: '调整图片色彩饱和度，-100到+100，0为原始饱和度，推荐：-50到50（负数变灰，正数更鲜艳）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-hue',
          baseType: 'effects',
          effectType: 'hue'
        },
        ui: {
          label: '色相',
          icon: 'magic',
          description: '改变整体色调'
        },
        params: {
          defaults: {
            value: 0
          },
          fields: [
            {
              key: 'value',
              label: '色相',
              type: 'number',
              unit: '%',
              min: -100,
              max: 100,
              hint: '调整图片色相，-100到+100，0为原始色相'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-colorize',
          baseType: 'effects',
          effectType: 'colorize'
        },
        ui: {
          label: '着色',
          icon: 'magic',
          description: '给图片整体加上一种颜色'
        },
        params: {
          defaults: {
            color: '#FF0000',
            intensity: 50
          },
          fields: [
            {
              key: 'color',
              label: '颜色',
              type: 'color',
              hint: '效果使用的颜色，点击选择或输入十六进制颜色值（如 #FF0000）'
            },
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              unit: '%',
              min: 0,
              max: 100,
              hint: '着色效果的强度，范围：0-100，推荐：30-70'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-tint',
          baseType: 'effects',
          effectType: 'tint'
        },
        ui: {
          label: '色调',
          icon: 'magic',
          description: '轻微地给图片染色'
        },
        params: {
          defaults: {
            color: '#FFD700',
            intensity: 50
          },
          fields: [
            {
              key: 'color',
              label: '颜色',
              type: 'color',
              hint: '效果使用的颜色，点击选择或输入十六进制颜色值（如 #FFD700）'
            },
            {
              key: 'intensity',
              label: '强度',
              type: 'number',
              unit: '%',
              min: 0,
              max: 100,
              hint: '色调效果的强度，范围：0-100，推荐：30-70'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-noise',
          baseType: 'effects',
          effectType: 'noise'
        },
        ui: {
          label: '噪点',
          icon: 'magic',
          description: '添加胶片颗粒感或数字噪点'
        },
        params: {
          defaults: {
            noiseType: 'Uniform'
          },
          fields: [
            {
              key: 'noiseType',
              label: '噪点类型',
              type: 'select',
              options: [
                { value: 'Uniform', label: '均匀' },
                { value: 'Gaussian', label: '高斯' },
                { value: 'Multiplicative', label: '乘法' },
                { value: 'Impulse', label: '脉冲' },
                { value: 'Laplacian', label: '拉普拉斯' },
                { value: 'Poisson', label: '泊松' }
              ],
              hint: '噪点的分布类型，推荐：Gaussian（高斯，自然）或 Uniform（均匀，随机）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-despeckle',
          baseType: 'effects',
          effectType: 'despeckle'
        },
        ui: {
          label: '去噪',
          icon: 'magic',
          description: '移除噪点，让图片更干净'
        },
        params: {
          defaults: {}
        }
      },
      {
        meta: {
          value: 'effects-vignette',
          baseType: 'effects',
          effectType: 'vignette'
        },
        ui: {
          label: '晕影',
          icon: 'magic',
          description: '在边缘添加暗角，让中心更突出'
        },
        params: {
          defaults: {
            radius: 100,
            sigma: 50
          },
          fields: [
            {
              key: 'radius',
              label: '半径',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 500,
              hint: '晕影效果的半径，范围：1-500，推荐：50-200'
            },
            {
              key: 'sigma',
              label: 'Sigma',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 500,
              hint: '晕影的标准差，范围：1-500，推荐：30-100'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-solarize',
          baseType: 'effects',
          effectType: 'solarize'
        },
        ui: {
          label: '曝光',
          icon: 'magic',
          description: '模拟过度曝光的反转效果'
        },
        params: {
          defaults: {
            threshold: 50
          },
          fields: [
            {
              key: 'threshold',
              label: '阈值',
              type: 'number',
              unit: '%',
              min: 0,
              max: 100,
              hint: '曝光效果的阈值，范围：0-100，推荐：30-70'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-swirl',
          baseType: 'effects',
          effectType: 'swirl'
        },
        ui: {
          label: '漩涡',
          icon: 'magic',
          description: '让图片围绕中心扭曲'
        },
        params: {
          defaults: {
            degrees: 90
          },
          fields: [
            {
              key: 'degrees',
              label: '角度',
              type: 'number',
              unit: '度',
              min: -360,
              max: 360,
              hint: '漩涡效果的角度，范围：-360到360度，推荐：45-180（数值越大扭曲越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-wave',
          baseType: 'effects',
          effectType: 'wave'
        },
        ui: {
          label: '波浪',
          icon: 'magic',
          description: '让图片产生波纹扭曲'
        },
        params: {
          defaults: {
            amplitude: 25,
            wavelength: 150
          },
          fields: [
            {
              key: 'amplitude',
              label: '振幅',
              type: 'number',
              unit: '像素',
              min: 1,
              max: 100,
              hint: '波浪的振幅（像素），范围：1-100，推荐：10-50（数值越大波浪起伏越大）'
            },
            {
              key: 'wavelength',
              label: '波长',
              type: 'number',
              unit: '像素',
              min: 10,
              max: 500,
              hint: '波浪的波长（像素），范围：10-500，推荐：50-200（数值越大波浪越宽）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-implode',
          baseType: 'effects',
          effectType: 'implode'
        },
        ui: {
          label: '内爆',
          icon: 'magic',
          description: '向中心收缩的扭曲效果'
        },
        params: {
          defaults: {
            amount: 0.5
          },
          fields: [
            {
              key: 'amount',
              label: '数量',
              type: 'number',
              min: -1,
              max: 1,
              step: 0.01,
              hint: '内爆效果的强度，范围：-1到1，推荐：0.3-0.8（数值越大收缩越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-explode',
          baseType: 'effects',
          effectType: 'explode'
        },
        ui: {
          label: '爆炸',
          icon: 'magic',
          description: '向外膨胀的扭曲效果'
        },
        params: {
          defaults: {
            amount: 0.5
          },
          fields: [
            {
              key: 'amount',
              label: '数量',
              type: 'number',
              min: -1,
              max: 1,
              step: 0.01,
              hint: '爆炸效果的强度，范围：-1到1，推荐：0.3-0.8（数值越大扩张越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-spread',
          baseType: 'effects',
          effectType: 'spread'
        },
        ui: {
          label: '扩散',
          icon: 'magic',
          description: '随机扩散像素，形成特殊模糊'
        },
        params: {
          defaults: {
            radius: 3
          },
          fields: [
            {
              key: 'radius',
              label: '半径',
              type: 'number',
              unit: '像素',
              min: 0,
              max: 50,
              hint: '扩散效果的半径，范围：0-50，推荐：1-10（数值越大扩散越明显）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-normalize',
          baseType: 'effects',
          effectType: 'normalize'
        },
        ui: {
          label: '标准化',
          icon: 'magic',
          description: '自动增强整体对比度'
        },
        params: {
          defaults: {}
        }
      },
      {
        meta: {
          value: 'effects-equalize',
          baseType: 'effects',
          effectType: 'equalize'
        },
        ui: {
          label: '均衡化',
          icon: 'magic',
          description: '通过直方图均衡增强细节'
        },
        params: {
          defaults: {}
        }
      },
      {
        meta: {
          value: 'effects-gamma',
          baseType: 'effects',
          effectType: 'gamma'
        },
        ui: {
          label: '伽马校正',
          icon: 'magic',
          description: '只调整中间调的亮度'
        },
        params: {
          defaults: {
            value: 1.0
          },
          fields: [
            {
              key: 'value',
              label: '伽马值',
              type: 'number',
              min: 0.1,
              max: 5.0,
              step: 0.1,
              hint: '伽马校正值，范围：0.1-5.0，1.0为原始值，推荐：0.8-1.5'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-threshold',
          baseType: 'effects',
          effectType: 'threshold'
        },
        ui: {
          label: '阈值化',
          icon: 'magic',
          description: '转为黑白二值图'
        },
        params: {
          defaults: {
            value: 50
          },
          fields: [
            {
              key: 'value',
              label: '阈值',
              type: 'number',
              unit: '%',
              min: 0,
              max: 100,
              hint: '阈值化处理的阈值，范围：0-100%，推荐：40-60（用于二值化处理，小于阈值为黑，大于为白）'
            }
          ]
        }
      },
      {
        meta: {
          value: 'effects-quantize',
          baseType: 'effects',
          effectType: 'quantize'
        },
        ui: {
          label: '颜色量化',
          icon: 'magic',
          description: '减少颜色数量，形成索引色风格'
        },
        params: {
          defaults: {
            colors: 256
          },
          fields: [
            {
              key: 'colors',
              label: '颜色数',
              type: 'number',
              min: 2,
              max: 256,
              hint: '量化后的颜色数量，范围：2-256，推荐：8-64（数值越小颜色越少，简化效果越明显）'
            }
          ]
        }
      }
    ]
  };
})(typeof window !== 'undefined' ? window : this);
