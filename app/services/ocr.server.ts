import DocumentIntelligence, {
  type AnalyzeResultOutput,
  getLongRunningPoller,
  isUnexpected,
} from "@azure-rest/ai-document-intelligence";
import { AzureKeyCredential } from "@azure/core-auth";
import { AzureOpenAI } from "openai";

type OcrResult = {
  merchantName: string | undefined;
  total: number | undefined;
  transactionDate: string | undefined;
};

const fileToBase64 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
};

export const extractReceiptUseDocumentIntelligence = async (
  file: File,
): Promise<OcrResult> => {
  if (!process.env.AZURE_API_KEY || !process.env.AZURE_AI_SERVICE_ENDPOINT) {
    throw new Error(
      "環境変数としてAZURE_API_KEYとAZURE_AI_SERVICE_ENDPOINTを設定してください。",
    );
  }

  const key = process.env.AZURE_API_KEY;
  const endpoint = process.env.AZURE_AI_SERVICE_ENDPOINT;

  const client = DocumentIntelligence(endpoint, new AzureKeyCredential(key));

  const base64Data = await fileToBase64(file);

  console.log("Azure Document Intelligence 解析開始を呼び出します。");
  const startTime = Date.now();

  const initialResponse = await client
    .path("/documentModels/{modelId}:analyze", "prebuilt-receipt")
    .post({
      contentType: "application/json",
      body: {
        base64Source: base64Data,
      },
    });

  console.log("Azure Document Intelligence 解析開始の呼び出しが完了しました。");

  if (isUnexpected(initialResponse)) {
    throw initialResponse.body.error;
  }

  const poller = getLongRunningPoller(client, initialResponse);
  const result = await poller.pollUntilDone();

  const endTime = Date.now();
  const processingTime = endTime - startTime;
  console.log(
    `Azure Document Intelligence 解析処理が完了しました。処理時間: ${processingTime}ms`,
    JSON.stringify(result),
  );

  if (isUnexpected(result)) {
    throw result.body.error;
  }

  const analyzeResult = (result.body as { analyzeResult: AnalyzeResultOutput })
    .analyzeResult;

  // 1ドキュメント目の解析結果から各種情報を取得
  const fields = analyzeResult?.documents?.[0]?.fields;

  const merchantName = fields?.MerchantName?.content;
  const total = fields?.Total?.valueCurrency?.amount;
  const transactionDate = fields?.TransactionDate?.valueDate;

  return {
    merchantName,
    total,
    transactionDate,
  };
};

export const extractReceiptUseOpenAI = async (file: File) => {
  if (!process.env.AZURE_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
    throw new Error(
      "環境変数としてAZURE_API_KEYとAZURE_OPENAI_ENDPOINTを設定してください。",
    );
  }

  const apiKey = process.env.AZURE_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = "2025-01-01-preview";
  const deployment = "gpt-5-mini";

  const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

  const base64Data = await fileToBase64(file);

  console.log("OpenAPI 解析開始を呼び出します。");
  const startTime = Date.now();

  const result = await client.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content:
          "領収書画像から、発行日付、金額、発行者を抽出します。\n発行日付は西暦で、YYYY-MM-DD形式にします。\n金額は数値にしてください。\nこれをJSON形式にします。JSONのキーは発行日付がtransactionDate、金額がtotal、発行者がmerchantNameにしてください。",
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: "data:image/png;base64," + base64Data,
            },
          },
        ],
      },
    ],
    max_completion_tokens: 6553,
  });

  const endTime = Date.now();
  const processingTime = endTime - startTime;
  console.log(
    `OpenAPI 解析処理が完了しました。処理時間: ${processingTime}ms`,
    JSON.stringify(result),
  );

  const content = result.choices[0].message.content;
  if (content === null) {
    throw new Error("OpenAI からの応答が無効です。");
  }

  const json = JSON.parse(content);

  const merchantName = json.merchantName;
  const total = json.total;
  const transactionDate = json.transactionDate;

  return {
    merchantName,
    total,
    transactionDate,
  };
};
