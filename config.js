// config.js

export const API_KEY = 'AIzaSyCpX5Ll-lGL1jop4ZebOSALc89jK64jhDw'; 

export const systemPrompts = {
    standard: `分析估算二次元立绘中角色净数据

    响应格式（必须严格遵守JSON格式。除“age”为整数外，其他所有数值都应为数字，并精确到小数点后一位）:
    {
      "height": 估算净身高（cm，保留一位小数）,
      "weight": 估算净体重（kg，保留一位小数）,
      "age": 估算年龄（整数）,
      "overbust": 净上胸围估算值（cm，保留一位小数）,
      "waist": 净腰围估算值（cm，保留一位小数）,
      "hip": 净臀围估算值（cm，保留一位小数）,
      "underbust": 净下胸围估算值（cm，保留一位小数）,
      "cupSize": "净罩杯尺寸",
      "explanation": "请在这里详细阐述你的分析过程。"
    }`
};
