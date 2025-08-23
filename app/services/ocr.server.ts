import DocumentIntelligence, {
  type AnalyzeResultOutput,
  getLongRunningPoller,
  isUnexpected,
} from "@azure-rest/ai-document-intelligence";
import { AzureKeyCredential } from "@azure/core-auth";

if (!process.env.AZURE_API_KEY || !process.env.AZURE_ENDPOINT) {
  throw new Error("Azure API key and endpoint must be provided");
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

  const initialResponse = await client
    .path("/documentModels/{modelId}:analyze", "prebuilt-receipt")
    .post({
      contentType: "application/json",
      body: {
        base64Source: base64Data,
      },
    });

  if (isUnexpected(initialResponse)) {
    throw initialResponse.body.error;
  }

  const poller = getLongRunningPoller(client, initialResponse);
  const result = await poller.pollUntilDone();

  if (isUnexpected(result)) {
    throw result.body.error;
  }

  const analyzeResult = (result.body as { analyzeResult: AnalyzeResultOutput })
    .analyzeResult;

  const documents = analyzeResult?.documents;
  const document = documents && documents[0];

  if (document?.fields) {
    const merchantName = document.fields.MerchantName?.content;
    const total = document.fields?.Total?.valueCurrency?.amount;
    const transactionDate = document.fields?.TransactionDate?.valueDate;

    return {
      merchantName,
      total,
      transactionDate,
    };
  } else {
    throw new Error("Expected at least one receipt in the result.");
  }
};
