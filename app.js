// app.js (完整修正版)

import { API_KEY, systemPrompts } from './config.js';

// DOM元素
const elements = {
    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    previewContainer: document.getElementById('preview-container'),
    previewImage: document.getElementById('preview-image'),
    startAnalysisBtn: document.getElementById('start-analysis-btn'),
    changeImageBtn: document.getElementById('change-image-btn'),
    disclaimer: document.getElementById('disclaimer'),
    closeDisclaimerBtn: document.getElementById('close-disclaimer'),
    themeToggle: document.getElementById('theme-toggle'),
    resultContainer: document.getElementById('result-container'),
    imagePreview: document.getElementById('image-preview'),
    loading: document.getElementById('loading'),
    result: document.getElementById('result'),
    verdict: document.getElementById('verdict'),
    verdictIcon: document.getElementById('verdict-icon'),
    // 基础数据
    height: document.getElementById('height'),
    weight: document.getElementById('weight'),
    age: document.getElementById('age'),
    // BWH + 内衣尺寸
    overbust: document.getElementById('overbust'),
    waist: document.getElementById('waist'),
    hip: document.getElementById('hip'),
    underbust: document.getElementById('underbust'),
    cupSize: document.getElementById('cup-size'),
    cupFill: document.getElementById('cup-fill'),
    explanation: document.getElementById('explanation'),
    tryAgainBtn: document.getElementById('try-again'),
    saveBtn: document.getElementById('save-btn')
};

let selectedImageDataUrl = null;

// 初始化
function initialize() {
    setupEventListeners();
}

// 设置事件监听
function setupEventListeners() {
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.startAnalysisBtn.addEventListener('click', handleStartAnalysis);
    elements.changeImageBtn.addEventListener('click', () => elements.fileInput.click());
    elements.closeDisclaimerBtn.addEventListener('click', () => {
        elements.disclaimer.style.display = 'none';
    });
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.tryAgainBtn.addEventListener('click', handleTryAgain);
    elements.saveBtn.addEventListener('click', saveResult);
    setupDragAndDrop();
}

// 设置拖拽功能
function setupDragAndDrop() {
    const dropZones = [elements.uploadArea];
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            if (e.dataTransfer.files.length) {
                elements.fileInput.files = e.dataTransfer.files;
                handleFileSelect();
            }
        });
    });
}

// 处理文件选择
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

// 显示预览
function showPreview(imageDataUrl) {
    elements.previewImage.src = imageDataUrl;
    elements.uploadArea.classList.add('hidden');
    elements.previewContainer.classList.remove('hidden');
    elements.resultContainer.classList.add('hidden');
}

// 开始分析
async function handleStartAnalysis() {
    if (!selectedImageDataUrl) return;
    showLoading(selectedImageDataUrl);
    try {
        const resultData = await analyzeImage(selectedImageDataUrl);
        displayResult(resultData);
    } catch (error) {
        console.error('分析失败:', error);
        displayError(error.message); // 将错误信息传递给显示函数
    }
}

// 显示加载状态
function showLoading(imageDataUrl) {
    elements.imagePreview.src = imageDataUrl;
    elements.uploadArea.classList.add('hidden');
    elements.previewContainer.classList.add('hidden');
    elements.resultContainer.classList.remove('hidden');
    elements.loading.classList.remove('hidden');
    elements.result.classList.add('hidden');
}

// ====================================================================
//  分析图片 - 使用Gemini模型 (已修正)
// ====================================================================
async function analyzeImage(imageDataUrl) {
    const base64Data = imageDataUrl.split(',')[1];
    const safetySettings = [
        { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
    ];
    
    // --- 修正部分开始 ---
    // `response_mime_type` 已被移出 `generation_config` 并放到顶层。
    const payload = {
        contents: [{
            parts: [
                { text: systemPrompts.standard },
                {
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: base64Data
                    }
                }
            ]
        }],
        generation_config: {
            temperature: 0.3,
            max_output_tokens: 2048
        },
        response_mime_type: "application/json", // 正确位置：与 `generation_config` 同级
        safety_settings: safetySettings
    };
    
    const model = 'gemini-2.5-pro';
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${API_KEY}`;
    // --- 修正部分结束 ---

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error Response:", errorData);
        throw new Error(errorData.error?.message || `API请求失败，状态码: ${response.status}`);
    }
    
    const data = await response.json();

    // 增加对API返回内容是否为空的检查
    if (!data.candidates || data.candidates.length === 0) {
        const finishReason = data.promptFeedback?.blockReason;
        if (finishReason) {
             throw new Error(`请求被模型阻止，原因: ${finishReason}。请尝试更换图片或调整安全设置。`);
        }
        throw new Error('API未返回任何分析结果，可能是图片无法识别。');
    }
    
    const text = data.candidates[0]?.content?.parts[0]?.text;
    
    if (!text) {
        throw new Error('API返回内容中不包含有效的文本数据。');
    }
    
    try {
        return JSON.parse(text);
    } catch (parseError) {
        console.error('解析JSON失败:', text);
        throw new Error('分析结果格式错误，无法解析返回的JSON。');
    }
}

// 显示结果
function displayResult(resultData) {
    elements.loading.classList.add('hidden');
    elements.result.classList.remove('hidden');
    
    // 更新基础数据：身高、体重、年龄
    elements.height.textContent = resultData.height ? `${resultData.height}cm` : '--';
    elements.weight.textContent = resultData.weight ? `${resultData.weight}kg` : '--';
    elements.age.textContent = resultData.age ? `${resultData.age}岁` : '--';

    // 更新BWH三围数据
    elements.overbust.textContent = resultData.overbust ? `${resultData.overbust}cm` : '--';
    elements.waist.textContent = resultData.waist ? `${resultData.waist}cm` : '--';
    elements.hip.textContent = resultData.hip ? `${resultData.hip}cm` : '--';

    // 更新内衣尺寸相关数据
    elements.underbust.textContent = resultData.underbust ? `${resultData.underbust}cm` : '--';
    elements.cupSize.textContent = resultData.cupSize || '--';
    
    // 更新罩杯图表
    const cupSizes = ["AA", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    const cupIndex = resultData.cupSize ? cupSizes.indexOf(resultData.cupSize.toUpperCase()) : -1;
    if (cupIndex >= 0) {
        const cupWidth = Math.min(100, (cupIndex + 1) * (100 / cupSizes.length));
        elements.cupFill.style.width = `${cupWidth}%`;
    } else {
        elements.cupFill.style.width = '0%';
    }
    
    // 更新解释文本
    elements.explanation.innerHTML = resultData.explanation ? resultData.explanation.replace(/\n/g, '<br>') : '未提供解释';
}

// 显示错误
function displayError(errorMessage = '分析失败，请尝试更换图片或稍后再试。') {
    elements.loading.classList.add('hidden');
    elements.result.classList.remove('hidden');
    
    // 重置所有数据
    elements.height.textContent = '--';
    elements.weight.textContent = '--';
    elements.age.textContent = '--';
    elements.overbust.textContent = '--';
    elements.waist.textContent = '--';
    elements.hip.textContent = '--';
    elements.underbust.textContent = '--';
    elements.cupSize.textContent = '--';
    elements.cupFill.style.width = '0%';
    
    elements.explanation.innerHTML = `${errorMessage.replace(/\n/g, '<br>')}`;
}

// 重新分析
function handleTryAgain() {
    // 无论如何，都先隐藏结果，显示加载动画
    elements.result.classList.add('hidden');
    elements.loading.classList.remove('hidden');

    if (selectedImageDataUrl) {
        // 延迟一小段时间再开始，给用户视觉反馈
        setTimeout(handleStartAnalysis, 200);
    } else {
        resetToUpload();
    }
}

// 保存结果
function saveResult() {
    alert('结果保存功能尚未实现');
}

// 重置到上传状态
function resetToUpload() {
    elements.previewContainer.classList.add('hidden');
    elements.resultContainer.classList.add('hidden');
    elements.uploadArea.classList.remove('hidden');
    elements.fileInput.value = '';
    selectedImageDataUrl = null;
}

// 切换主题
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    elements.themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

// 初始化
initialize();
