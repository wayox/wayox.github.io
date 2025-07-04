import { API_KEY, systemPrompts } from './config.js';

const elements = {
    // ... (这里的所有元素定义保持不变)
    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    previewContainer: document.getElementById('preview-container'),
    previewImage: document.getElementById('preview-image'),
    startAnalysisBtn: document.getElementById('start-analysis-btn'),
    changeImageBtn: document.getElementById('change-image-btn'),
    disclaimer: document.getElementById('disclaimer'),
    closeDisclaimerBtn: document.getElementById('close-disclaimer'),
    resultContainer: document.getElementById('result-container'),
    imagePreview: document.getElementById('image-preview'),
    loading: document.getElementById('loading'),
    result: document.getElementById('result'),
    verdict: document.getElementById('verdict'),
    verdictIcon: document.getElementById('verdict-icon'),
    height: document.getElementById('height'),
    weight: document.getElementById('weight'),
    age: document.getElementById('age'),
    overbust: document.getElementById('overbust'),
    waist: document.getElementById('waist'),
    hip: document.getElementById('hip'),
    underbust: document.getElementById('underbust'),
    cupSize: document.getElementById('cup-size'),
    bustProtrusion: document.getElementById('bust-protrusion'),
    cupFill: document.getElementById('cup-fill'),
    volumeScore: document.getElementById('volume-score'),
    flatnessScore: document.getElementById('flatness-score'),
    explanation: document.getElementById('explanation'),
    tryAgainBtn: document.getElementById('try-again'),
    saveBtn: document.getElementById('save-btn')
};

let selectedImageDataUrl = null;

// ... (从 initialize() 到 showLoading() 的所有函数保持不变)
function initialize() {
    setupEventListeners();
}

function setupEventListeners() {
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.startAnalysisBtn.addEventListener('click', handleStartAnalysis);
    elements.changeImageBtn.addEventListener('click', () => {
        resetToUpload();
        elements.fileInput.click();
    });
    elements.closeDisclaimerBtn.addEventListener('click', () => {
        elements.disclaimer.style.display = 'none';
    });
    elements.tryAgainBtn.addEventListener('click', handleTryAgain);
    elements.saveBtn.addEventListener('click', saveResult);
    setupDragAndDrop();
}

function setupDragAndDrop() {
    const dropZones = [document.body, elements.uploadArea];
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => { e.preventDefault(); if (zone === elements.uploadArea) zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', (e) => { e.preventDefault(); if (zone === elements.uploadArea) zone.classList.remove('drag-over'); });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (zone === elements.uploadArea) zone.classList.remove('drag-over');
            if (e.dataTransfer.files.length) {
                elements.fileInput.files = e.dataTransfer.files;
                handleFileSelect();
            }
        });
    });
}

function handleFileSelect() {
    if (!elements.fileInput.files.length) return;
    const file = elements.fileInput.files[0];
    if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    const reader = new FileReader();
    reader.onload = (e) => { selectedImageDataUrl = e.target.result; showPreview(selectedImageDataUrl); };
    reader.readAsDataURL(file);
}

function showPreview(imageDataUrl) {
    elements.previewImage.src = imageDataUrl;
    elements.uploadArea.classList.add('hidden');
    elements.previewContainer.classList.remove('hidden');
    elements.resultContainer.classList.add('hidden');
}

async function handleStartAnalysis() {
    if (!selectedImageDataUrl) return;
    showLoading(selectedImageDataUrl);
    try {
        const resultData = await analyzeImage(selectedImageDataUrl);
        displayResult(resultData);
    } catch (error) {
        console.error('分析失败:', error);
        displayError(error.message);
    }
}

function showLoading(imageDataUrl) {
    elements.imagePreview.src = imageDataUrl;
    elements.uploadArea.classList.add('hidden');
    elements.previewContainer.classList.add('hidden');
    elements.resultContainer.classList.remove('hidden');
    elements.loading.classList.remove('hidden');
    elements.result.classList.add('hidden');
}

// ===================================================================
//  核心分析函数 (V12.2 - 增强错误处理版)
// ===================================================================
async function analyzeImage(imageDataUrl) {
    const base64Data = imageDataUrl.split(',')[1];
    const model = 'gemini-2.5-pro';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    const safetySettings = [
        { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
    ];

    // ===================================================================
    //  【【【 核心改动区域 】】】
    //  通用的API调用函数 (增强版)
    // ===================================================================
    const callApi = async (prompt, temperature = 0.0) => {
        const payload = {
            contents: [{ parts: [
                { inline_data: { mime_type: "image/jpeg", data: base64Data } },
                { text: prompt }
            ] }],
            generation_config: { temperature, max_output_tokens: 8192, responseMimeType: "application/json" },
            safety_settings: safetySettings
        };

        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errorData = await response.json();
            console.error("API 错误响应:", errorData);
            throw new Error(errorData.error?.message || `API请求失败，状态码: ${response.status}`);
        }

        const data = await response.json();
        
        // --- 新增：健壮性检查 ---
        if (!data.candidates || data.candidates.length === 0) {
            // 情况1: 响应中完全没有候选内容
            console.error("API响应中无候选内容:", data);
            // 检查是否有 promptFeedback，这通常意味着输入被拒绝
            if (data.promptFeedback && data.promptFeedback.blockReason) {
                 throw new Error(`输入被拒绝，原因: ${data.promptFeedback.blockReason}。请检查您的图片或提示词。`);
            }
            throw new Error("API返回了空的候选列表，原因未知。");
        }

        const candidate = data.candidates[0];
        console.log("完整API候选对象:", candidate); // 增强日志，便于调试

        // 情况2: 候选内容存在，但被安全系统阻止 (最常见的情况)
        if (candidate.finishReason && candidate.finishReason === "SAFETY") {
            console.error("API响应被安全过滤器阻止:", candidate);
            throw new Error("分析请求因内容安全原因被模型拒绝。请尝试使用一张更常规或清晰度更高的图片。");
        }
        
        // 情况3: 候选内容存在，但结构不正确（之前导致错误的地方）
        const text = candidate?.content?.parts?.[0]?.text;
        if (!text) {
             console.error("API响应结构无效, 缺少文本内容:", candidate);
             throw new Error(`API响应格式不正确，模型完成原因为'${candidate.finishReason || '未知'}'，但未提供文本内容。`);
        }
        // --- 检查结束 ---

        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error("在API响应中未找到JSON对象:", text);
                throw new Error("模型未返回有效的JSON格式数据。");
            }
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("API响应解析失败:", data);
            console.error("解析时发生错误:", e);
            throw new Error("无法解析API响应。请检查模型的输出是否为有效的JSON。");
        }
    };

    // 法庭质证流程 (这部分逻辑不变)
    console.log("阶段一：进行衣物类型质证...");
    const clothingResult = await callApi(systemPrompts.stage1_clothing_classifier, 0.0);
    console.log(" -> 阶段一结果:", clothingResult);
    const clothingTypeFact = clothingResult.clothing_type === 'TIGHT_FIT' ? '衣物紧身' : '衣物宽松';
    console.log(` -> 事实一（衣物）确定: ${clothingTypeFact}`);

    console.log("阶段二：进行身体轮廓质证...");
    const silhouetteResult = await callApi(systemPrompts.stage2_silhouette_classifier, 0.0);
    console.log(" -> 阶段二结果:", silhouetteResult);
    const silhouetteShapeFact = silhouetteResult.silhouette_shape === 'CURVED' ? '身体轮廓有弧度' : '身体轮廓平直';
    console.log(` -> 事实二（轮廓）确定: ${silhouetteShapeFact}`);

    console.log("阶段三：综合事实，生成最终报告...");
    let synthesisPrompt = systemPrompts.stage3_synthesis_scorer
        .replace('{{CLOTHING_TYPE_FACT}}', clothingTypeFact)
        .replace('{{SILHOUETTE_SHAPE_FACT}}', silhouetteShapeFact);
    const finalReport = await callApi(synthesisPrompt, 0.4);
    console.log(" -> 阶段三最终分析报告:", finalReport);

    const umpireRuling = `
        <p class="umpire-ruling">
            <strong>【系统质证过程】：</strong><br>
            - 事实一（衣物质证）: <strong>${clothingTypeFact}</strong><br>
            - 事实二（轮廓质证）: <strong>${silhouetteShapeFact}</strong>
        </p><hr>
    `;
    finalReport.explanation = umpireRuling + (finalReport.explanation || "模型未提供解释。");

    return finalReport;
}

// ... (从 displayResult() 到 initialize() 的所有函数保持不变)
function displayResult(resultData) {
    elements.loading.classList.add('hidden');
    elements.result.classList.remove('hidden');

    if (elements.volumeScore) {
        elements.volumeScore.textContent = resultData.volume_evidence_score !== undefined ? `${resultData.volume_evidence_score} / 10` : '--';
    }
    if (elements.flatnessScore) {
        elements.flatnessScore.textContent = resultData.flatness_evidence_score !== undefined ? `${resultData.flatness_evidence_score} / 10` : '--';
    }

    // 增加对数值的检查，防止.toFixed()在null/undefined上报错
    elements.height.textContent = resultData.height ? `${Number(resultData.height).toFixed(1)}cm` : '--';
    elements.weight.textContent = resultData.weight ? `${Number(resultData.weight).toFixed(1)}kg` : '--';
    elements.age.textContent = resultData.age ? `${resultData.age}岁` : '--';
    elements.overbust.textContent = resultData.overbust ? `${Number(resultData.overbust).toFixed(1)}cm` : '--';
    elements.waist.textContent = resultData.waist ? `${Number(resultData.waist).toFixed(1)}cm` : '--';
    elements.hip.textContent = resultData.hip ? `${Number(resultData.hip).toFixed(1)}cm` : '--';
    elements.underbust.textContent = resultData.underbust ? `${Number(resultData.underbust).toFixed(1)}cm` : '--';
    elements.cupSize.textContent = resultData.cupSize || '--';
    elements.bustProtrusion.textContent = resultData.bustProtrusion ? `${Number(resultData.bustProtrusion).toFixed(1)}cm` : '--';

    const cupSizes = ["AA", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    const cupIndex = resultData.cupSize ? cupSizes.indexOf(resultData.cupSize.toUpperCase()) : -1;
    elements.cupFill.style.width = cupIndex >= 0 ? `${Math.min(100, (cupIndex + 1) * (100 / cupSizes.length))}%` : '0%';

    elements.explanation.innerHTML = resultData.explanation ? resultData.explanation.replace(/\n/g, '<br>') : '未提供解释';
}

function displayError(errorMessage = '分析失败，请尝试更换图片或稍后再试。') {
    elements.loading.classList.add('hidden');
    elements.result.classList.remove('hidden');

    const dataFields = ['height', 'weight', 'age', 'overbust', 'waist', 'hip', 'underbust', 'cupSize', 'bustProtrusion'];
    dataFields.forEach(field => { elements[field].textContent = '--'; });
    if(elements.volumeScore) elements.volumeScore.textContent = 'N/A';
    if(elements.flatnessScore) elements.flatnessScore.textContent = 'N/A';
    elements.cupFill.style.width = '0%';

    elements.explanation.innerHTML = `<p class="error-message"><strong>错误:</strong> ${errorMessage.replace(/\n/g, '<br>')}</p>`;
}

function handleTryAgain() {
    if (selectedImageDataUrl && !elements.resultContainer.classList.contains('hidden')) {
        handleStartAnalysis();
    } else {
        resetToUpload();
    }
}

function saveResult() {
    alert('结果保存功能尚未实现');
}

function resetToUpload() {
    elements.previewContainer.classList.add('hidden');
    elements.resultContainer.classList.add('hidden');
    elements.uploadArea.classList.remove('hidden');
    elements.fileInput.value = '';
    selectedImageDataUrl = null;
}

initialize();
