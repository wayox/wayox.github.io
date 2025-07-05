// config.js

export const API_KEY = 'AIzaSyCpX5Ll-lGL1jop4ZebOSALc89jK64jhDw'; 

export const systemPrompts = {
    standard: `分析估算二次元立绘中角色数据

    响应格式（必须严格遵守JSON格式。除“age”为整数外，其他所有数值都应为数字，并精确到小数点后一位）:
    {
      "height": 估算身高（cm，保留一位小数）,
      "weight": 估算体重（kg，保留一位小数）,
      "age": 估算年龄（整数）,
      "overbust": 上胸围估算值（cm，保留一位小数）,
      "waist": 腰围估算值（cm，保留一位小数）,
      "hip": 臀围估算值（cm，保留一位小数）,
      "underbust": 下胸围估算值（cm，保留一位小数）,
      "cupSize": "罩杯尺寸",
      "explanation": "请在这里详细阐述你的分析过程。"
    }`
};
