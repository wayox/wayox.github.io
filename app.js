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
    underbust: document.getElementById('underbust'),
    overbust: document.getElementById('overbust'),
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
    // 上传区域点击
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    
    // 文件选择
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // 开始分析
    elements.startAnalysisBtn.addEventListener('click', handleStartAnalysis);
    
    // 更换图片
    elements.changeImageBtn.addEventListener('click', () => elements.fileInput.click());
    
    // 关闭免责声明
    elements.closeDisclaimerBtn.addEventListener('click', () => {
        elements.disclaimer.style.display = 'none';
    });
    
    // 切换主题
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // 重新分析
    elements.tryAgainBtn.addEventListener('click', handleTryAgain);
    
    // 保存结果
    elements.saveBtn.addEventListener('click', saveResult);
    
    // 拖拽功能
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

// 分析图片
async function analyzeImage(imageDataUrl) {
    const base64Data = imageDataUrl.split(',')[1];
    
    const payload = {
        contents: [{
            role: "user",
            parts: [
                {
                    text: systemPrompts.standard
                },
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
        }
    };
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
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
    
    // 尝试解析JSON
    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('解析JSON失败:', error);
        throw new Error('分析结果格式错误');
    }
}

// 显示结果
function displayResult(result) {
    elements.loading.classList.add('hidden');
    elements.result.classList.remove('hidden');
    
    // 更新尺寸数据
    elements.underbust.textContent = result.underbust !== undefined ? `${result.underbust}cm` : '--';
    elements.overbust.textContent = result.overbust !== undefined ? `${result.overbust}cm` : '--';
    elements.cupSize.textContent = result.cupSize || '--';
    
    // 更新罩杯图表
    const cupSizes = ["AA", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    const cupIndex = result.cupSize ? cupSizes.indexOf(result.cupSize) : -1;
    if (cupIndex >= 0) {
        const cupWidth = Math.min(100, (cupIndex + 1) * (100 / cupSizes.length));
        elements.cupFill.style.width = `${cupWidth}%`;
    }
    
    // 更新解释文本
    elements.explanation.innerHTML = result.explanation ? result.explanation.replace(/\n/g, '<br>') : '未提供解释';
}

// 显示错误
function displayError() {
    elements.loading.classList.add('hidden');
    elements.result.classList.remove('hidden');
    
    elements.underbust.textContent = '--';
    elements.overbust.textContent = '--';
    elements.cupSize.textContent = '--';
    elements.cupFill.style.width = '0';
    
    elements.explanation.innerHTML = '分析失败，请尝试更换图片或稍后再试。';
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
