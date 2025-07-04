// app.js (版本 9.0 - 裁判系统版 / The Umpire System)

import { API_KEY, systemPrompts } from './config.js';

// ... (除了 analyzeImage 之外的其他代码保持不变) ...

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
// ============== 函数已重构为 v9.0 裁判系统 =========================
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

    console.log("调用AI进行特征打分和基础数据估算...");
    const payload = {
        contents: [{
            parts: [
                { text: systemPrompts.standard },
                { inline_data: { mime_type: "image/jpeg", data: base64Data } }
            ]
        }],
        generation_config: {
            temperature: 0.2,
            max_output_tokens: 8192,
            responseMimeType: "application/json"
        },
        safety_settings: safetySettings
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API请求失败，状态码: ${response.status}`);
    }

    const data = await response.json();
    let aiSuggestion;
    try {
        const text = data.candidates[0].content.parts[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        aiSuggestion = JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error("解析AI建议失败:", data);
        throw new Error("无法解析AI返回的数据。");
    }

    console.log("AI建议接收完毕:", aiSuggestion);

    // =============================================================
    //                【【【 裁判逻辑开始 】】】
    // 在这里，我们用可靠的代码逻辑对不可靠的AI建议进行最终裁决
    // =============================================================
    
    let finalResult = { ...aiSuggestion }; // 复制一份AI的建议作为基础
    const { volume_evidence_score, flatness_evidence_score, underbust } = aiSuggestion;

    console.log(`裁判分析：平坦证据分数 [${flatness_evidence_score}] vs 体积证据分数 [${volume_evidence_score}]`);

    // 核心裁决逻辑
    if (flatness_evidence_score > volume_evidence_score) {
        console.log("【裁决】：平坦证据胜出！强制修正为小体积。");

        // 无论AI建议了什么，强制修正为A罩杯
        finalResult.cupSize = 'A'; 
        
        // 基于强制的A罩杯，重新计算上胸围和隆起高度
        // A罩杯约等于10cm的围差
        const overbust_recalculated = underbust + 10.0;
        // 隆起高度约等于围差的1/3到1/2，这里取一个保守值
        const protrusion_recalculated = 10.0 / 2.5; 
        
        finalResult.overbust = parseFloat(overbust_recalculated.toFixed(1));
        finalResult.bustProtrusion = parseFloat(protrusion_recalculated.toFixed(1));
        
        // 在解释的开头加入裁决声明
        finalResult.explanation = `<p class="umpire-ruling"><strong>【裁判系统裁决】：</strong>平坦证据得分 (${flatness_evidence_score}) 高于体积证据得分 (${volume_evidence_score})，AI的初始建议已被系统修正为小体积（A罩杯）。</p><hr>` + finalResult.explanation;

    } else {
        console.log("【裁决】：体积证据胜出或持平。采信AI的建议。");
         // 在解释的开头加入裁决声明
         finalResult.explanation = `<p class="umpire-ruling"><strong>【裁判系统裁决】：</strong>体积证据得分 (${volume_evidence_score}) 高于或等于平坦证据得分 (${flatness_evidence_score})，采信AI的初始建议。</p><hr>` + finalResult.explanation;
    }
    
    console.log("最终裁决结果:", finalResult);
    return finalResult;
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
    // 注意：这里我们使用了 innerHTML，因为我们添加了HTML标签
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
