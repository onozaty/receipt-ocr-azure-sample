import { Camera, FileText, Image, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Form, useActionData, useNavigation, useSubmit } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useDeviceDetection } from "~/hooks/useDeviceDetection";
import { extractReceipt } from "~/services/ocr.server";
import type { Route } from "./+types/home";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const file = formData.get("image") as File;
  const fileId = formData.get("fileId") as string;

  if (!file || file.size === 0) {
    return {
      error: "ファイルが選択されていません",
      fileId,
    };
  }

  // ファイルタイプをチェック
  if (!file.type.startsWith("image/")) {
    return {
      error: "画像ファイルを選択してください",
      fileId,
    };
  }

  try {
    const ocrResult = await extractReceipt(file);

    return {
      success: true,
      fileId,
      result: ocrResult,
    };
  } catch (error) {
    console.error("エラーが発生しました。", error);
    return {
      error: `ファイル処理中にエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      fileId,
    };
  }
}

export function meta() {
  return [
    { title: "画像アップロード | Receipt OCR" },
    {
      name: "description",
      content: "領収書画像をアップロードして解析します。",
    },
  ];
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const { isMobile } = useDeviceDetection();
  const isUploading = navigation.state === "submitting";

  // 現在選択されているファイルがアップロード完了したファイルと同じかチェック
  const isCurrentFileUploaded = actionData?.fileId === currentFileId;

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      // 新しいファイルを選択したら、新しいIDを生成
      const newFileId = crypto.randomUUID();
      setCurrentFileId(newFileId);

      // input要素にもファイルを設定する（ドラッグ&ドロップ対応）
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;

        // ファイル設定後に自動的にフォームを送信
        setTimeout(() => {
          if (formRef.current) {
            submit(formRef.current);
          }
        }, 100);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // ファイルIDもクリアして、処理完了表示を消す
    setCurrentFileId(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">領収書 OCR</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            領収書画像をアップロードして解析します。
          </p>
        </div>

        <Form ref={formRef} method="post" encType="multipart/form-data">
          <Input
            ref={fileInputRef}
            type="file"
            name="image"
            accept="image/*"
            capture={isMobile ? "environment" : undefined}
            onChange={handleFileInputChange}
            className="hidden"
          />
          {/* ファイルIDを送信するための隠しフィールド */}
          <input type="hidden" name="fileId" value={currentFileId || ""} />

          {selectedFile && previewUrl ? (
            <FileProcessingCard
              previewUrl={previewUrl}
              isUploading={isUploading}
              error={actionData?.error}
              result={actionData?.result}
              isCurrentFileUploaded={isCurrentFileUploaded}
              onClear={handleRemoveFile}
            />
          ) : (
            <FileUploadCard
              onFileSelect={handleFileSelect}
              onManualSelect={() => fileInputRef.current?.click()}
              isMobile={isMobile}
            />
          )}
        </Form>
      </div>
    </div>
  );
}

interface FileUploadCardProps {
  onFileSelect: (file: File) => void;
  onManualSelect: () => void;
  isMobile: boolean;
}

function FileUploadCard({
  onFileSelect,
  onManualSelect,
  isMobile,
}: FileUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onFileSelect(file);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-muted-foreground" />

          {isMobile ? (
            <>
              <p className="text-lg font-medium mb-2">
                写真を撮影またはアップロード
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                領収書の写真を撮影するか、ギャラリーから選択してください
              </p>

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={onManualSelect}
                  className="w-full min-h-[44px] text-base"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  カメラで撮影
                </Button>

                <p className="text-xs text-muted-foreground">
                  タップするとカメラまたはギャラリーが開きます
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-medium mb-2">
                画像をドラッグ＆ドロップ
              </p>
              <p className="text-muted-foreground mb-4">
                または下のボタンから選択
              </p>
              <Button
                type="button"
                onClick={onManualSelect}
                className="w-full max-w-xs"
              >
                <Upload className="h-4 w-4 mr-2" />
                ファイルを選択
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface FileProcessingCardProps {
  previewUrl: string;
  isUploading: boolean;
  error?: string;
  result?: {
    merchantName?: string;
    total?: number;
    transactionDate?: string;
  };
  isCurrentFileUploaded: boolean;
  onClear: () => void;
}

function FileProcessingCard({
  previewUrl,
  isUploading,
  error,
  result,
  isCurrentFileUploaded,
  onClear,
}: FileProcessingCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* 左側：画像とファイル情報 */}
          <div className="space-y-4 relative">
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">画像</h3>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="absolute top-0 right-0 text-muted-foreground hover:text-foreground"
            >
              <Upload className="h-4 w-4 mr-1" />
              別の画像を選択
            </Button>

            <div className="relative">
              <img
                src={previewUrl}
                alt="選択された画像"
                className="w-full max-h-[400px] object-contain rounded-lg border shadow-sm"
              />
            </div>
          </div>

          {/* 右側：解析結果 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">解析結果</h3>
            </div>

            {isUploading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-base">解析中...</span>
                </div>
              </div>
            ) : error && !isUploading && isCurrentFileUploaded ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-base text-red-600 text-center">{error}</p>
              </div>
            ) : (
              isCurrentFileUploaded &&
              result && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg shadow-sm p-4 space-y-4">
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      日付
                    </div>
                    <div>{result.transactionDate ?? "-"}</div>
                  </div>

                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      金額
                    </div>
                    <div>{result.total?.toLocaleString() ?? "-"}</div>
                  </div>

                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      発行者
                    </div>
                    <div className="break-words">
                      {result.merchantName ?? "-"}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
