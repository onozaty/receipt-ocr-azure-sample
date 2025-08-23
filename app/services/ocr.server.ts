import DocumentIntelligence, {
  type AnalyzeResultOutput,
  getLongRunningPoller,
  isUnexpected,
} from "@azure-rest/ai-document-intelligence";
import { AzureKeyCredential } from "@azure/core-auth";

if (!process.env.AZURE_API_KEY || !process.env.AZURE_ENDPOINT) {
  throw new Error(
    "環境変数としてAZURE_API_KEYとAZURE_ENDPOINTを設定してください。",
  );
}

const key = process.env.AZURE_API_KEY;
const endpoint = process.env.AZURE_ENDPOINT;

const fileToBase64 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
};

export const extractReceipt = async (file: File) => {
  const client = DocumentIntelligence(endpoint, new AzureKeyCredential(key));

  const base64Data = await fileToBase64(file);

  console.log("Azure Document Intelligence 解析開始を呼び出します。");

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

  console.log("Azure Document Intelligence 解析処理が完了しました。");

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
