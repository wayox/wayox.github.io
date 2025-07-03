import { API_KEY, systemPrompts } from './config.js';

// elements 对象保持不变...
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

// 其余函数 initialize, setupEventListeners, etc. 保持不变...
function initialize() {
    setupEventListeners();
}

function setupEventListeners() {
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.startAnalysisBtn.addEventListener('click', handleStartAnalysis);
    elements.changeImageBtn.addEventListener('click', resetToUpload);
    elements.closeDisclaimerBtn.addEventListener('click', () => {
        elements.disclaimer.style.display = 'none';
    });
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.tryAgainBtn.addEventListener('click', handleTryAgain);
    elements.saveBtn.addEventListener('click', saveResult);
    setupDragAndDrop();
}

function setupDragAndDrop() {
    const dropZones = [document.body, elements.uploadArea];
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (zone === elements.uploadArea) zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (zone === elements.uploadArea) zone.classList.remove('drag-over');
        });
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
// ============== 函数已完全重构以支持动态清单文件 =====================
// =================================================================
async function analyzeImage(targetImageDataUrl) {
    try {
        // 步骤 1: 读取清单文件
        console.log("正在读取参考资料库清单...");
        const response = await fetch('reference_library.json');
        if (!response.ok) {
            throw new Error('无法加载 reference_library.json 清单文件。请确保该文件存在且格式正确。');
        }
        const referenceLibrary = await response.json();
        console.log(`成功加载了 ${referenceLibrary.length} 个参考模型。`);

        // 辅助函数：通过 fetch 将文件路径转换为 Base64
        async function imagePathToBase64(path) {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`无法加载参考图片: ${path}`);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }

        // 步骤 2: 根据清单并行加载所有图片
        console.log("正在加载所有参考图片...");
        const referenceBase64s = await Promise.all(
            referenceLibrary.map(ref => imagePathToBase64(ref.imagePath))
        );
        console.log("所有参考图片加载完成。");

        const targetBase64 = targetImageDataUrl.split(',')[1];
        
        // 步骤 3: 构建API请求
        const parts = [
            { text: systemPrompts.referenceAnalysis },
            { text: "\n\n---\n\n【分析目标】" },
            { inline_data: { mime_type: "image/jpeg", data: targetBase64 } },
            { text: "\n\n---\n\n【参考资料库】\n请综合以下所有模型进行分析：" }
        ];

        referenceLibrary.forEach((ref, index) => {
            parts.push({ text: `\n\n**参考模型 ${index + 1}:**\n` + JSON.stringify(ref.stats, null, 2) });
            parts.push({ inline_data: { mime_type: "image/jpeg", data: referenceBase64s[index] } });
        });

        const payload = {
            contents: [{ parts: parts }],
            generation_config: { temperature: 0.2, max_output_tokens: 8192, responseMimeType: "application/json" },
            safety_settings: [
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
            ]
        };
        
        const model = 'gemini-2.5-pro-latest'; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
        
        console.log("正在发送API请求...");
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            throw new Error(errorData.error?.message || `API请求失败: ${apiResponse.status}`);
        }
        
        const data = await apiResponse.json();
        
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
            throw new Error(`API未返回有效结果。原因: ${data.promptFeedback?.blockReason || '未知'}`);
        }
        
        let text = data.candidates[0].content.parts[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('分析结果格式错误，无法解析返回的JSON。');
        }

    } catch (error) {
        console.error("分析流程中发生严重错误:", error);
        throw error; // 将错误向上抛出，由 handleStartAnalysis 捕获并显示
    }
}

// displayResult, displayError, handleTryAgain, etc. 保持不变...
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
    
    elements.explanation.innerHTML = `<p class="error-message"><strong>错误:</strong> ${errorMessage.toString().replace(/\n/g, '<br>')}</p>`;
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

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    elements.themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

initialize();
