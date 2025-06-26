const imageInput = document.getElementById('imageUpload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const resultText = document.getElementById('resultText');

let detector;

async function loadModel() {
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, {
    runtime: 'tfjs',
    modelType: 'lite',
  });
}

imageInput.addEventListener('change', async () => {
  const file = imageInput.files[0];
  if (!file || !detector) return;

  const img = new Image();
  img.onload = async () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const poses = await detector.estimatePoses(img);
    poses?.[0]?.keypoints?.forEach(pt => {
      if (pt.score > 0.5) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff69b4';
        ctx.fill();
      }
    });

    const score = Math.floor(Math.random() * 16) + 85;
    const comments = ['萌力爆表 ✨', '天使在人间 😇', '可爱得毫无道理！', '心动警告 ⚠️'];
    resultText.textContent = `评分：${score}分 - ${comments[Math.floor(Math.random() * comments.length)]}`;
  };

  img.src = URL.createObjectURL(file);
});

loadModel();
