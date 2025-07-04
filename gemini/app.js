// app.js (版本 8.1 - 健壮解析版)

import { API_KEY, systemPrompts } from './config.js';

const elements = {
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
    explanation: document.getElementById('explanation'),
    tryAgainBtn: document.getElementById('try-again'),
    saveBtn: document.getElementById('save-btn')
};

let selectedImageDataUrl = null;

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
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (zone === elements.uploadArea) {
                zone.classList.add('drag-over');
            }
        });
        zone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (zone === elements.uploadArea) {
                zone.classList.remove('drag-over');
            }
        });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (zone === elements.uploadArea) {
                zone.classList.remove('drag-over');
            }
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
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        selectedImageDataUrl = e.target.result;
        showPreview(selectedImageDataUrl);
    };
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

// =================================================================
// ============== 函数已重构为两阶段专家分析系统 =======================
// =================================================================
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

    // -----------------------------------------------------------------
    // 第一阶段：调用分类器，判断衣物类型
    // -----------------------------------------------------------------
    console.log("阶段一：开始分类衣物类型...");
    const classifierPayload = {
        contents: [{
            parts: [
                { text: systemPrompts.classifier },
                { inline_data: { mime_type: "image/jpeg", data: base64Data } }
            ]
        }],
        generation_config: {
            temperature: 0.0,
            responseMimeType: "application/json"
        },
        safety_settings: safetySettings
    };

    const classifierResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classifierPayload)
    });

    if (!classifierResponse.ok) {
        throw new Error(`分类器API请求失败，状态码: ${classifierResponse.status}`);
    }

    const classifierData = await classifierResponse.json();
    let analysisType;

    // ====================== 【关键修改开始】 ======================
    //         用更健壮的解析逻辑替换原来的脆弱逻辑
    // =============================================================
    try {
        const part = classifierData.candidates?.[0]?.content?.parts?.[0];

        if (!part) {
            throw new Error("API响应中缺少有效部分。");
        }

        let classifierResult;

        // 尝试从 .text 字段解析JSON，这是最常见的情况
        if (part.text) {
            console.log("解析方法1：从text字段解析JSON。");
            // 使用正则表达式提取可能被包裹的JSON，增加健壮性
            const jsonMatch = part.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                classifierResult = JSON.parse(jsonMatch[0]);
            } else {
                 throw new Error("在text字段中未找到有效的JSON格式。");
            }
        }
        // 如果没有 .text 字段，检查其他可能的结构（虽然在此应用中不常见，但作为备用）
        // 例如，如果模型直接返回对象而不是文本，或者使用functionCall
        else if (typeof part === 'object' && part.analysis_type) {
             console.log("解析方法2：直接从part对象获取。");
             classifierResult = part;
        }

        if (classifierResult?.analysis_type) {
            analysisType = classifierResult.analysis_type;
        } else {
            // 如果所有方法都失败了，抛出错误
            console.error("无法解析的分类器响应结构:", part);
            throw new Error("无法从API响应中提取有效的分类结果。");
        }
        
        console.log(`阶段一完成：分类结果为 [${analysisType}]`);

    } catch (e) {
        console.error("分类器响应解析失败:", e, classifierData);
        throw new Error(`无法确定衣物类型，分析中止。(${e.message})`);
    }
    // ====================== 【关键修改结束】 ======================

    // -----------------------------------------------------------------
    // 第二阶段：根据分类结果，选择并调用相应的专家分析器
    // -----------------------------------------------------------------
    console.log(`阶段二：使用 [${analysisType}] 专家分析器进行分析...`);
    let specialistPrompt;
    if (analysisType === 'TIGHT_FIT') {
        specialistPrompt = systemPrompts.tight_fit;
    } else if (analysisType === 'LOOSE_FIT') {
        specialistPrompt = systemPrompts.loose_fit;
    } else {
        throw new Error(`未知的分析类型: ${analysisType}`);
    }

    const specialistPayload = {
        contents: [{
            parts: [
                { text: specialistPrompt },
                { inline_data: { mime_type: "image/jpeg", data: base64Data } }
            ]
        }],
        generation_config: {
            temperature: 0.3,
            max_output_tokens: 8192,
            responseMimeType: "application/json"
        },
        safety_settings: safetySettings
    };

    const specialistResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specialistPayload)
    });

    if (!specialistResponse.ok) {
        const errorData = await specialistResponse.json();
        console.error("专家分析器API错误响应:", errorData);
        throw new Error(errorData.error?.message || `专家分析器API请求失败，状态码: ${specialistResponse.status}`);
    }

    const data = await specialistResponse.json();
    if (!data.candidates || data.candidates.length === 0) {
        const finishReason = data.promptFeedback?.blockReason;
        if (finishReason) {
            throw new Error(`请求被模型阻止，原因: ${finishReason}。`);
        }
        throw new Error('API未返回任何分析结果。');
    }

    let text = data.candidates[0]?.content?.parts[0]?.text;
    if (!text) {
        throw new Error('API返回内容中不包含有效的文本数据。');
    }

    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        }
        console.log("阶段二完成：收到最终分析结果。");
        return JSON.parse(text);
    } catch (parseError) {
        console.error('解析最终JSON失败的原始文本:', text);
        throw new Error('分析结果格式错误，无法解析返回的JSON。');
    }
}

function displayResult(resultData) {
    elements.loading.classList.add('hidden');
    elements.result.classList.remove('hidden');
    elements.height.textContent = resultData.height ? `${resultData.height}cm` : '--';
    elements.weight.textContent = resultData.weight ? `${resultData.weight}kg` : '--';
    elements.age.textContent = resultData.age ? `${resultData.age}岁` : '--';
    elements.overbust.textContent = resultData.overbust ? `${resultData.overbust}cm` : '--';
    elements.waist.textContent = resultData.waist ? `${resultData.waist}cm` : '--';
    elements.hip.textContent = resultData.hip ? `${resultData.hip}cm` : '--';
    elements.underbust.textContent = resultData.underbust ? `${resultData.underbust}cm` : '--';
    elements.cupSize.textContent = resultData.cupSize || '--';
    elements.bustProtrusion.textContent = resultData.bustProtrusion ? `${resultData.bustProtrusion}cm` : '--';

    const cupSizes = ["AA", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    const cupIndex = resultData.cupSize ? cupSizes.indexOf(resultData.cupSize.toUpperCase()) : -1;
    if (cupIndex >= 0) {
        const cupWidth = Math.min(100, (cupIndex + 1) * (100 / cupSizes.length));
        elements.cupFill.style.width = `${cupWidth}%`;
    } else {
        elements.cupFill.style.width = '0%';
    }
    elements.explanation.innerHTML = resultData.explanation ? resultData.explanation.replace(/\n/g, '<br>') : '未提供解释';
}

function displayError(errorMessage = '分析失败，请尝试更换图片或稍后再试。') {
    elements.loading.classList.add('hidden');
    elements.result.classList.remove('hidden');
    elements.height.textContent = '--';
    elements.weight.textContent = '--';
    elements.age.textContent = '--';
    elements.overbust.textContent = '--';
    elements.waist.textContent = '--';
    elements.hip.textContent = '--';
    elements.underbust.textContent = '--';
    elements.cupSize.textContent = '--';
    elements.bustProtrusion.textContent = '--';
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

// 初始化
initialize();
