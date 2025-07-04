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
// ============== 函数已重构为 v10.1 法庭质证系统（类型安全版）==========
// =================================================================
async function analyzeImage(imageDataUrl) {
    const base64Data = imageDataUrl.split(',')[1];
    const model = 'gemini-1.5-pro';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    const safetySettings = [
        { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
    ];

    // 封装一个API调用函数，使代码更整洁
    const callApi = async (prompt, generationConfig = { temperature: 0.0, responseMimeType: "application/json" }) => {
        const payload = {
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }] }],
            generation_config: generationConfig,
            safety_settings: safetySettings
        };
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API请求失败，状态码: ${response.status}`);
        const data = await response.json();
        try {
            const text = data.candidates[0].content.parts[0].text;
            return JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
        } catch (e) {
            console.error("API响应解析失败:", data);
            throw new Error("无法解析API响应。");
        }
    };

    // =============================================================
    //           【【【 法庭质证流程开始 】】】
    // =============================================================
    
    // 阶段一：衣物类型质证
    console.log("阶段一：衣物类型质证...");
    const clothingResult = await callApi(systemPrompts.stage1_clothing_classifier);
    const clothingFact = clothingResult.clothing_type === 'LOOSE_FIT' ? '衣物是宽松的' : '衣物是紧身的';
    console.log(` -> 事实一确定：${clothingFact}`);

    // 阶段二：几何形态质证
    console.log("阶段二：几何形态质证...");
    const silhouetteResult = await callApi(systemPrompts.stage2_silhouette_classifier);
    const silhouetteFact = silhouetteResult.silhouette_shape === 'CURVED' ? '身体轮廓是有弧度的' : '身体轮廓是平直的';
    console.log(` -> 事实二确定：${silhouetteFact}`);

    // 阶段三：矛盾对质与最终报告
    console.log("阶段三：矛盾对质与最终报告...");
    let scorerPrompt = systemPrompts.stage3_synthesis_scorer
        .replace('{{CLOTHING_TYPE_FACT}}', clothingFact)
        .replace('{{SILHOUETTE_SHAPE_FACT}}', silhouetteFact);
    
    const scorerGenerationConfig = { temperature: 0.3, max_output_tokens: 8192, responseMimeType: "application/json" };
    const aiSuggestion = await callApi(scorerPrompt, scorerGenerationConfig);
    console.log(" -> AI建议接收完毕:", aiSuggestion);

    // 阶段四：分级裁判逻辑
    console.log("阶段四：最终裁决...");
    let finalResult = { ...aiSuggestion }; 
    
    // =============================================================
    //           【【【 v10.1 关键修正开始 】】】
    //      在进行计算前，将所有需要的变量显式转换为数字类型
    // =============================================================
    const volumeScore = parseFloat(aiSuggestion.volume_evidence_score);
    const flatnessScore = parseFloat(aiSuggestion.flatness_evidence_score);
    const numericUnderbust = parseFloat(aiSuggestion.underbust);

    // 增加一个检查，确保underbust是有效数字
    if (isNaN(numericUnderbust)) {
        throw new Error("AI未能返回有效的下胸围(underbust)数据，无法进行裁决。");
    }

    console.log(`裁判分析：平坦证据分数 [${flatnessScore}] vs 体积证据分数 [${volumeScore}]`);

    if (flatnessScore > volumeScore) {
        console.log("【第一层裁决】：平坦证据胜出！启动小体积修正程序。");
        const EXTREME_FLATNESS_THRESHOLD = 7;
        let finalCupSize;
        let rulingMessage;

        if (flatnessScore > EXTREME_FLATNESS_THRESHOLD) {
            finalCupSize = 'AA';
            rulingMessage = `平坦证据得分(${flatnessScore})远超体积证据(${volumeScore})，系统强制修正为【AA罩杯】。`;
        } else {
            finalCupSize = 'A';
            rulingMessage = `平坦证据得分(${flatnessScore})高于体积证据(${volumeScore})，系统修正为【A罩杯】。`;
        }

        finalResult.cupSize = finalCupSize;
        let diff = (finalCupSize === 'A') ? 10.0 : 7.5;
        
        // 现在所有变量都是数字，可以安全地进行数学计算
        const overbust_recalculated = numericUnderbust + diff;
        const protrusion_recalculated = diff / 2.5; 
        
        finalResult.overbust = parseFloat(overbust_recalculated.toFixed(1));
        finalResult.bustProtrusion = parseFloat(protrusion_recalculated.toFixed(1));
        
        finalResult.explanation = `<p class="umpire-ruling"><strong>【裁判系统裁决】：</strong>${rulingMessage}</p><hr>` + finalResult.explanation;
        console.log(`【第二层裁决】：裁定为${finalCupSize}。修正后数据:`, {overbust: finalResult.overbust, protrusion: finalResult.bustProtrusion});

    } else {
        console.log("【裁决】：体积证据胜出或持平。采信AI的建议。");
        finalResult.explanation = `<p class="umpire-ruling"><strong>【裁判系统裁决】：</strong>体积证据得分(${volumeScore})不低于平坦证据(${flatnessScore})，采信AI初始建议。</p><hr>` + finalResult.explanation;
    }
    // ====================== 【关键修正结束】 ======================
    
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
