const { VertexAI } = require('@google-cloud/vertexai');

// クライアントオプションを設定
const clientOptions = {
    project: 'miyazaki-430102',  // プロジェクトIDを明示的に指定
    location: 'us-central1',
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,  // 環境変数からサービスアカウントキーのパスを取得
};

const vertexAI = new VertexAI(clientOptions);
const model = 'gemini-1.5-pro-001';

const generativeModel = vertexAI.preview.getGenerativeModel({
    model: model,
    generationConfig: {
        maxOutputTokens: 8192,
        temperature: 1,
        topP: 0.95,
    },
    safetySettings: [
        {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
    ],
    systemInstruction: {
        parts: [
            {
                text: `あなたは文章の編集者です。ユーザからMBTIのタイプと今日会った嫌なことの内容をテキストで受け取ります。それをMBTIのタイプに沿って、面白い文章に書き直す役割を担っています。`,
            },
        ],
    },
});

async function testVertexAI() {
    const reqText = "[ENTP] 今日は会議をしんどかったです。";

    const request = {
        contents: [
            { role: 'user', parts: [{ text: reqText }] },
        ],
    };

    try {
        console.log('Sending request to Vertex AI:', JSON.stringify(request, null, 2));
        const streamingResp = await generativeModel.generateContentStream(request);

        let aggregatedResponse = '';
        for await (const item of streamingResp.stream) {
            if (item.candidates) {
                for (const candidate of item.candidates) {
                    if (candidate.content && candidate.content.parts) {
                        aggregatedResponse += candidate.content.parts.map(part => part.text).join('');
                    } else if (candidate.safetyRatings) {
                        console.error('Response blocked due to safety ratings:', JSON.stringify(candidate.safetyRatings, null, 2));
                    } else {
                        console.error('Unexpected response format:', JSON.stringify(candidate, null, 2));
                    }
                }
            } else {
                console.error('Unexpected response format:', JSON.stringify(item, null, 2));
            }
        }

        console.log('Received response from Vertex AI:', aggregatedResponse);
    } catch (error) {
        console.error('Error making prediction:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
}

testVertexAI();
