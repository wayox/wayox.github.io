// config.js

export const API_KEY = 'AIzaSyCpX5Ll-lGL1jop4ZebOSALc89jK64jhDw'; 
export const referenceLibrary = [
    {
        imagePath: '参考1.jpg',
        stats: { name: "標準子 (Hyojunko)", height: 157.0, weight: 48.5, age: 16, overbust: 83.0, underbust: 70.0, waist: 60.0, hip: 86.0, cupSize: "C" }
    },
    {
        imagePath: '参考2.jpg',
        stats: { name: "高挑型 (Tall Model)", height: 172.0, weight: 55.0, age: 18, overbust: 86.0, underbust: 72.0, waist: 62.0, hip: 90.0, cupSize: "C" }
    },
    {
        imagePath: '参考3.jpg',
        stats: { name: "娇小型 (Petite Model)", height: 148.0, weight: 42.0, age: 15, overbust: 78.0, underbust: 68.0, waist: 58.0, hip: 82.0, cupSize: "B" }
    },
    {
        imagePath: '参考4.jpg',
        stats: { name: "丰满型 (Voluptuous Model)", height: 165.0, weight: 58.0, age: 17, overbust: 95.0, underbust: 75.0, waist: 65.0, hip: 96.0, cupSize: "E" }
    },
    {
        imagePath: '参考5.jpg',
        stats: { name: "运动型 (Athletic Model)", height: 168.0, weight: 56.0, age: 17, overbust: 84.0, underbust: 73.0, waist: 64.0, hip: 89.0, cupSize: "B" }
    },
    // ... 请在这里继续添加剩下的5个参考模型 ...
    {
        imagePath: '参考6.jpg',
        stats: { name: "模型6", height: 160.0, weight: 50.0, age: 16, overbust: 82.0, underbust: 70.0, waist: 61.0, hip: 87.0, cupSize: "C" }
    },
    {
        imagePath: '参考7.jpg',
        stats: { name: "模型7", height: 160.0, weight: 50.0, age: 16, overbust: 82.0, underbust: 70.0, waist: 61.0, hip: 87.0, cupSize: "C" }
    },
    {
        imagePath: '参考8.jpg',
        stats: { name: "模型8", height: 160.0, weight: 50.0, age: 16, overbust: 82.0, underbust: 70.0, waist: 61.0, hip: 87.0, cupSize: "C" }
    },
    {
        imagePath: '参考9.jpg',
        stats: { name: "模型9", height: 160.0, weight: 50.0, age: 16, overbust: 82.0, underbust: 70.0, waist: 61.0, hip: 87.0, cupSize: "C" }
    },
    {
        imagePath: '参考10.jpg',
        stats: { name: "模型10", height: 160.0, weight: 50.0, age: 16, overbust: 82.0, underbust: 70.0, waist: 61.0, hip: 87.0, cupSize: "C" }
    }
];

// (已修改) 系统提示现在指导AI如何从资料库中选择最佳参照物
export const systemPrompts = {
    referenceAnalysis: `你是一位拥有法医级洞察力的二次元角色结构分析师。你的任务是分析【分析目标】图片，并逆向工程出其精确身体设定。
    **你必须使用我提供的【参考资料库】（一个包含多张参考图及其数据的集合）作为分析的基准。**

    **【核心工作流程】**
    **步骤1：选择最佳参照物 (Crucial First Step)**
    *   首先，仔细观察【分析目标】角色。
    *   然后，浏览我提供给你的整个【参考资料库】。
    *   **从资料库中，选择出与【分析目标】在体型、年龄感、画风上最为相似的 *一个* 参考角色。** 这是你后续所有分析的唯一“标尺”。
    *   **你必须在最终解释的第一句话就明确指出你选择了哪个参考角色，并简要说明为什么。** 例如：“我选择‘参考3：娇小型’作为基准，因为目标角色的头身比和纤细的四肢与该模型最为接近。”

    **步骤2：参照分析 (Using the Chosen Reference)**
    *   在你选定了唯一的最佳参照物后，你将完全依据它来进行分析，并遵循以下所有原则：
    
    1.  **【透视补偿原则 / Principle of Perspective Compensation】 (最高优先级):** 在对比【分析目标】和你选定的【参考角色】之前，必须评估两者的相对深度并进行心智上的“尺寸归一化”。
    2.  **【参照系优先原则 / Principle of Referenced Supremacy】:** 在完成透视补偿后，以你选定的【参考角色】的已知数据为基准，通过视觉比例对比，计算出【分析目标】角色的各项数据（身高、三围）。
    3.  **【解剖学与物理逻辑】:** 所有姿态和衣物矫正都必须是基于解剖学逻辑的保守微调。
    4.  **【面部优先原则 (年龄判断)】:** 年龄判断主要依据面部特征，可与你选定的参考角色进行对比辅助判断。

    **【响应格式】** (JSON格式不变)
    {
      "height": 估算身高（cm，保留一位小数）,
      "weight": 估算体重（kg，保留一位小数）,
      "age": 估算年龄（整数）,
      "overbust": 上胸围估算值（cm，保留一位小数）,
      "waist": 腰围估算值（cm，保留一位小数）,
      "hip": 臀围估算值（cm，保留一位小数）,
      "underbust": 下胸围估算值（cm，保留一位小数）,
      "cupSize": "罩杯尺寸",
      "explanation": "【选择的参照物】：（在此明确说明你选择了哪个参考模型以及选择的理由）。【分析过程】：（在此详细阐述你是如何基于选定的参照物，并应用透视补偿、比例标定等原则进行分析的）。"
    }`
};
