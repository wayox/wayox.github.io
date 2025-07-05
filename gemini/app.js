// app.js

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
// ============== 核心分析函数已更新优化 =============================
// =================================================================
async function analyzeImage(imageDataUrl) {
    const base64Data = imageDataUrl.split(',')[1];
    const safetySettings = [
        { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
    ];
    
    const payload = {
        contents: [{
            parts: [
                { text: systemPrompts.standard },
                {
                    inline_data: {
                        mime_type: "image/jpeg", // 即使是png等格式，作为jpeg发送通常也能被模型很好地处理
                        data: base64Data
                    }
                }
            ]
        }],
        generation_config: {
            temperature: 0.2, // 稍微降低温度，让模型更遵循我们的严格指令
            // 增加最大输出令牌数，防止返回的JSON和详细解释被截断
            max_output_tokens: 8192,
            responseMimeType: "application/json" 
        },
        safety_settings: safetySettings
    };
    
    // 使用当前最强大、最适合复杂推理的模型之一
    const model = 'gemini-2.5-pro'; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error Response:", errorData);
        // 提供更具体的错误信息
        const message = errorData.error?.message || `API请求失败，状态码: ${response.status}`;
        throw new Error(message);
    }
    
    const data = await response.json();

    // 增加对内容被阻止的判断
    if (!data.candidates || data.candidates.length === 0) {
        const finishReason = data.promptFeedback?.blockReason;
        if (finishReason) {
             throw new Error(`请求被模型阻止，原因: ${finishReason}。请尝试更换图片或调整安全设置。`);
        }
        throw new Error('API未返回任何分析结果，可能是图片无法识别或网络问题。');
    }
    
    let text = data.candidates[0]?.content?.parts[0]?.text;
    
    if (!text) {
        throw new Error('API返回内容中不包含有效的文本数据。');
    }
    
    try {
        // 使JSON解析更健壮。模型有时会返回 ```json ... ``` 这样的markdown块，
        // 用正则表达式提取出其中的 {} 包裹的纯JSON部分，避免解析错误。
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        }
        return JSON.parse(text);
    } catch (parseError) {
        console.error('解析JSON失败的原始文本:', text);
        throw new Error('分析结果格式错误，无法解析返回的JSON。请检查控制台中的原始文本。');
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
    
    const cupSizes = ["AA", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    const cupIndex = resultData.cupSize ? cupSizes.indexOf(resultData.cupSize.toUpperCase()) : -1;
    if (cupIndex >= 0) {
        const cupWidth = Math.min(100, (cupIndex + 1) * (100 / cupSizes.length));
        elements.cupFill.style.width = `${cupWidth}%`;
    } else {
        elements.cupFill.style.width = '0%';
    }
    
    // 使用 innerHTML 来渲染 explanation 中的换行符
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
    elements.cupFill.style.width = '0%';
    
    elements.explanation.innerHTML = `<p class="error-message"><strong>错误:</strong> ${errorMessage.replace(/\n/g, '<br>')}</p>`;
}

function handleTryAgain() {
    // 如果当前有分析结果，则直接重新分析
    if (selectedImageDataUrl && !elements.resultContainer.classList.contains('hidden')) {
       handleStartAnalysis();
    } else { // 否则，返回到上传界面
        resetToUpload();
    }
}

function saveResult() {
    // 实际实现时可以使用 html2canvas 等库来保存结果图片
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
