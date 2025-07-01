// =================================================================
// ============== app.js (已适配 OpenAI GPT-4o-mini) ============
// =================================================================
import { systemPrompts } from './config.js'; 

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
// ============== 函数已替换为调用 Cloudflare Function 版本 ==========
// =================================================================
async function analyzeImage(imageDataUrl) {
    // 1. 定义我们的后端函数 API 端点
    const functionUrl = '/analyze'; // Cloudflare Pages 会自动将 /analyze 路由到 functions/analyze.js

    // 2. 构造发送给我们自己后端函数的数据
    const payload = {
        imageDataUrl: imageDataUrl,
        systemPrompt: systemPrompts.standard // 将提示词也一并发送
    };

    // 3. 发送请求到我们的 Cloudflare Function
    const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    // 4. 处理我们后端函数可能返回的错误，或者 OpenAI 通过它返回的错误
    if (!response.ok) {
        console.error("API 函数错误响应:", data);
        throw new Error(data.error?.message || `请求失败，状态码: ${response.status}`);
    }

    if (!data.choices || data.choices.length === 0) {
        throw new Error('API未返回任何分析结果，可能是图片无法识别或服务暂时不可用。');
    }

    // 5. 解析并返回结果
    let text = data.choices[0].message.content;

    try {
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

// 初始化
initialize();
