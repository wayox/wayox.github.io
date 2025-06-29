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
        const result = await analyzeImage(selectedImageDataUrl);
        displayResult(result);
    } catch (error) {
        console.error('分析失败:', error);
        displayError();
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

// 分析图片 - 使用Gemini模型
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
                        mime_type: "image/jpeg",
                        data: base64Data
                    }
                }
            ]
        }],
        generation_config: {
            temperature: 0.3,
            max_output_tokens: 2048,
            response_mime_type: "application/json"
        },
        safety_settings: safetySettings
    };
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API请求失败');
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        throw new Error('未收到有效的分析结果');
    }
    
    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('解析JSON失败:', text);
        throw new Error('分析结果格式错误，无法解析JSON。');
    }
}

// 显示结果
function displayResult(result) {
    elements.loading.classList.add('hidden');
    elements.result.classList.remove('hidden');
    
    // 更新基础数据：身高、体重、年龄
    elements.height.textContent = result.height ? `${result.height}cm` : '--';
    elements.weight.textContent = result.weight ? `${result.weight}kg` : '--';
    elements.age.textContent = result.age ? `${result.age}岁` : '--';

    // 更新BWH三围数据
    elements.overbust.textContent = result.overbust ? `${result.overbust}cm` : '--';
    elements.waist.textContent = result.waist ? `${result.waist}cm` : '--';
    elements.hip.textContent = result.hip ? `${result.hip}cm` : '--';

    // 更新内衣尺寸相关数据
    elements.underbust.textContent = result.underbust ? `${result.underbust}cm` : '--';
    elements.cupSize.textContent = result.cupSize || '--';
    
    // 更新罩杯图表
    const cupSizes = ["AA", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    const cupIndex = result.cupSize ? cupSizes.indexOf(result.cupSize.toUpperCase()) : -1;
    if (cupIndex >= 0) {
        const cupWidth = Math.min(100, (cupIndex + 1) * (100 / cupSizes.length));
        elements.cupFill.style.width = `${cupWidth}%`;
    } else {
        elements.cupFill.style.width = '0%';
    }
    
    // 更新解释文本
    elements.explanation.innerHTML = result.explanation ? result.explanation.replace(/\n/g, '<br>') : '未提供解释';
}

// 显示错误
function displayError() {
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
    elements.cupFill.style.width = '0';
    
    elements.explanation.innerHTML = '分析失败，请尝试更换图片或稍后再试。<br>可能原因：图片无法识别、网络问题或API限制。';
}

// 重新分析
function handleTryAgain() {
    if (selectedImageDataUrl) {
        handleStartAnalysis();
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
}

// 切换主题
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    elements.themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

// 初始化
initialize();
