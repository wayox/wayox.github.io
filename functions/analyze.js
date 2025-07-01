// functions/analyze.js

// 这是我们的安全后端函数，它会接收前端发来的图片数据，
// 然后在服务器端（安全地）添加 API 密钥，再发请求给 OpenAI。
export async function onRequestPost(context) {
    try {
        // 1. 从前端请求中获取图片数据
        const { imageDataUrl } = await context.request.json();
        
        if (!imageDataUrl) {
            return new Response(JSON.stringify({ error: '未提供图片数据' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 2. 从 Cloudflare 的环境变量中安全地获取 API 密钥
        // 我们稍后会在 Cloudflare 网站上设置这个 'OPENAI_API_KEY'
        const apiKey = context.env.OPENAI_API_KEY;
        if (!apiKey) {
             return new Response(JSON.stringify({ error: '服务器未配置 API 密钥' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 3. 从前端请求中获取系统提示词 (systemPrompts)
        // 注意: 这里我们假设 `systemPrompts.standard` 也在请求体中传递，
        // 或者我们可以直接在函数中定义它以确保安全。为了简单起见，我们从请求中获取。
        const { systemPrompt } = await context.request.json();


        const apiUrl = 'https://api.openai.com/v1/chat/completions';
        const model = 'gpt-4o-mini';

        const payload = {
            model: model,
            messages: [
                {
                    role: "system",
                    content: systemPrompt
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

        // 4. 代表前端去请求 OpenAI API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        // 5. 将 OpenAI 的结果直接返回给前端
        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
