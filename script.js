let detector;
window.onload = async () => {
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, {
    runtime: 'tfjs',
    modelType: 'lite',
  });
};

document.getElementById('imageUpload').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file || !detector) return;

  const img = new Image();
  img.onload = async () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const poses = await detector.estimatePoses(img);
    const keypoints = poses?.[0]?.keypoints ?? [];

    keypoints.forEach(pt => {
      if (pt.score > 0.5) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff69b4';
        ctx.fill();
      }
    });

    const score = computeKawaiiScore(keypoints);
    const { badge, comment } = generateKawaiiComment(score);
    document.getElementById('scoreResult').textContent = `评分：${score}分\n${badge}\n${comment}`;
  };

  img.src = URL.createObjectURL(file);
});

function computeKawaiiScore(keypoints) {
  let score = 50;

  const eyeL = keypoints.find(k => k.name === 'left_eye');
  const eyeR = keypoints.find(k => k.name === 'right_eye');
  const nose = keypoints.find(k => k.name === 'nose');
  const leftHand = keypoints.find(k => k.name === 'left_wrist');
  const rightHand = keypoints.find(k => k.name === 'right_wrist');

  if (eyeL && eyeR) {
    const dx = Math.abs(eyeL.x - eyeR.x);
    const dy = Math.abs(eyeL.y - eyeR.y);
    if (dx / (dy + 1e-6) > 2) score += 10;
  }

  if (leftHand && rightHand && nose) {
    const avgDist = (Math.abs(leftHand.x - nose.x) + Math.abs(rightHand.x - nose.x)) / 2;
    if (avgDist < 120) score += 15;
  }

  if (eyeL && nose && Math.abs(nose.x - eyeL.x) > 15) score += 5;

  return Math.min(Math.round(score), 100);
}

function generateKawaiiComment(score) {
  if (score >= 95) return { badge: '💮 萌神降临', comment: '这不是凡人，是天界造物。灵魂都被萌化了～' };
  if (score >= 90) return { badge: '✨ 超级可爱', comment: '像穿越而来的异世界偶像，萌点密集爆发！' };
  if (score >= 85) return { badge: '🧁 萌感爆棚', comment: '笑容治愈，动作自然，可爱风格无误！' };
  if (score >= 80) return { badge: '🎀 有点可爱', comment: '有种清新气质，细品之后越看越爱！' };
  return { badge: '🍬 中性萌向', comment: '风格独立，虽然不典型，但有自己的萌系节奏～' };
}
