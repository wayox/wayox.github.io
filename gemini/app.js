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
    bustProminence: document.getElementById('bust-prominence'),
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

async function analyzeImage(imageDataUrl) {
    const base64Data = imageDataUrl.split(',')[1];

    const safetySettings = [
        { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
    ];

    const payload = {
        system_instruction: {
            parts: [{ text: systemPrompts.standard }]
        },
        contents: [{
            parts: [{
                inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data
                }
            }]
        }],
        generation_config: {
            temperature: 0.2,
            max_output_tokens: 8192,
            response_mime_type: "application/json" 
        },
        safety_settings: safetySettings
    };
    
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
        let message = `API请求失败，状态码: ${response.status}.`;
        if (errorData.error?.message) {
            message += `\n原因: ${errorData.error.message}`;
            if (errorData.error.message.includes("API key not valid")) {
                message += `\n\n请检查您的API密钥是否正确，并确保已在您的Google Cloud项目中启用了Generative Language API。`;
            }
        }
        throw new Error(message);
    }
    
    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
        const finishReason = data.promptFeedback?.blockReason;
        if (finishReason) {
             throw new Error(`请求被模型阻止，原因: ${finishReason}。请尝试更换图片或调整Prompt。`);
        }
        throw new Error('API未返回任何分析结果，可能是图片无法识别或网络问题。');
    }
    
    const text = data.candidates[0]?.content?.parts[0]?.text;
    
    if (!text) {
        throw new Error('API返回内容中不包含有效的文本数据。');
    }
    
    try {
        return JSON.parse(text);
    } catch (parseError) {
        console.error('解析JSON失败的原始文本:', text);
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                return JSON.parse(jsonMatch[1]);
            } catch (innerError) {
                 throw new Error('分析结果格式错误，无法解析返回的JSON。请检查控制台中的原始文本。');
            }
        }
        throw new Error('分析结果格式严重错误，无法解析返回的JSON。请检查控制台中的原始文本。');
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
    elements.bustProminence.textContent = resultData.bustProminence ? `${resultData.bustProminence}cm` : '--';
    
    const cupSizes = ["AA", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    const cupIndex = resultData.cupSize ? cupSizes.indexOf(resultData.cupSize.toUpperCase()) : -1;
    if (cupIndex >= 0) {
        const cupWidth = Math.min(100, (cupIndex + 1) * (100 / (cupSizes.length - 4)));
        elements.cupFill.style.width = `${cupWidth}%`;
    } else {
        elements.cupFill.style.width = '0%';
    }
    
    // **最终版** explanation 处理器
    let explanationContent = '未提供解释。';

    if (resultData.explanation) {
        // 情况一：返回的是字符串 (理想情况)
        if (typeof resultData.explanation === 'string') {
            explanationContent = resultData.explanation
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/【(.*?)】/g, '<h4>【$1】</h4>')
                .replace(/\* (.*?):/g, '<br><strong>$1:</strong>');
        } 
        // 情况二：返回的是对象 (包括嵌套对象)
        else if (typeof resultData.explanation === 'object' && resultData.explanation !== null) {
            let formattedHtml = '';
            // 外层循环，遍历每个“阶段”
            for (const phaseTitle in resultData.explanation) {
                if (Object.hasOwnProperty.call(resultData.explanation, phaseTitle)) {
                    // 将阶段标题作为H4，并清理可能存在的`符号
                    formattedHtml += `<h4>【${phaseTitle.replace(/`/g, '')}】</h4>`;
                    
                    const phaseDetails = resultData.explanation[phaseTitle];

                    // 检查阶段的详细内容是对象还是普通字符串
                    if (typeof phaseDetails === 'object' && phaseDetails !== null) {
                        // 如果是对象，则进入内层循环，创建无序列表
                        formattedHtml += '<ul>';
                        for (const detailKey in phaseDetails) {
                            if (Object.hasOwnProperty.call(phaseDetails, detailKey)) {
                                const detailValue = String(phaseDetails[detailKey]).replace(/\n/g, '<br>');
                                formattedHtml += `<li><strong>${detailKey}:</strong> ${detailValue}</li>`;
                            }
                        }
                        formattedHtml += '</ul>';
                    } else {
                        // 如果只是字符串，直接作为段落显示
                        formattedHtml += `<p>${String(phaseDetails).replace(/\n/g, '<br>')}</p>`;
                    }
                }
            }
            explanationContent = formattedHtml;
        }
        // 情况三：其他所有意外类型
        else {
            explanationContent = `收到了未知格式的解释内容: ${String(resultData.explanation)}`;
        }
    }
    
    elements.explanation.innerHTML = explanationContent;
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
    elements.bustProminence.textContent = '--';
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
    const node = document.getElementById('result');
    if (window.html2canvas) {
        html2canvas(node, { 
            backgroundColor: null, // 保持背景透明或CSS定义的背景
            useCORS: true // 如果图片跨域需要
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = '角色分析报告.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    } else {
         alert('结果保存功能需要 html2canvas 库。您可以手动截图。');
    }
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
