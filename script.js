const imageInput = document.getElementById('imageInput');
const canvas = document.getElementById('outputCanvas');
const scoreDisplay = document.getElementById('scoreDisplay');
const ctx = canvas.getContext('2d');

let poseLandmarker, vision;

async function initModel() {
  vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-assets/pose_landmarker_lite.task',
      delegate: 'GPU'
    },
    runningMode: 'IMAGE',
    numPoses: 1
  });
}

imageInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = async () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const result = await poseLandmarker.detect(img);
    result.landmarks?.[0]?.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x * img.width, pt.y * img.height, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#e086b5';
      ctx.fill();
    });

    // 🌸 简单评分逻辑（建议后续用更复杂模型）
    const score = Math.floor(Math.random() * 21) + 80;
    const phrases = [
      '梦幻系闪光！🌈',
      '偶像气场溢出✨',
      '可爱到模糊！🫶',
      '萌到心脏爆击💥'
    ];
    scoreDisplay.textContent = `可爱评分：${score} 分 - ${phrases[Math.floor(Math.random() * phrases.length)]}`;
  };
  img.src = URL.createObjectURL(file);
});

initModel();
