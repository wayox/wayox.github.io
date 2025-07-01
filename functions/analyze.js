// functions/analyze.js (已修正)

export async function onRequestPost(context) {
    try {
        // 1. 一次性从请求体中解析出所有需要的数据
        const { imageDataUrl, systemPrompt } = await context.request.json();
        
        if (!imageDataUrl || !systemPrompt) {
            const missing = !imageDataUrl ? 'imageDataUrl' : 'systemPrompt';
            return new Response(JSON.stringify({ error: `请求体中缺少 '${missing}'` }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 2. 从 Cloudflare 的环境变量中安全地获取 API 密钥
        const apiKey = context.env.OPENAI_API_KEY;
        if (!apiKey) {
             return new Response(JSON.stringify({ error: '服务器未配置 API 密钥。请检查 Cloudflare Pages 的环境变量设置。' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const apiUrl = 'https://api.openai.com/v1/chat/completions';
        const model = 'gpt-4o-mini';

        const payload = {
            model: model,
            messages: [
                {
                    role: "system",
                    content: systemPrompt // 使用从前端传来的提示词
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "请根据这张图片进行分析。" },
                        {
                            type: "image_url",
                            image_url: { "url": imageDataUrl }
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 8192
        };

        // 3. 代表前端去请求 OpenAI API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        // 4. 将 OpenAI 的原始响应直接返回给前端
        // 这样，如果 OpenAI 返回错误，前端也能看到具体的错误信息
        return new Response(response.body, {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Cloudflare Function 内部错误:", error);
        return new Response(JSON.stringify({ error: `函数执行失败: ${error.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
