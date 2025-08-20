import { Image, Upload, X, FileText, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Form, useActionData, useNavigation, useSubmit } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import type { Route } from "./+types/home";

interface ActionData {
  success?: boolean;
  error?: string;
  result?: {
    fileName: string;
    fileSize: number;
    fileId: string;
    receipt?: {
      amount: number;
      date: string;
      vendor: string;
      description: string;
    };
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const file = formData.get("image") as File;
  const fileId = formData.get("fileId") as string;

  if (!file || file.size === 0) {
    return {
      error: "ファイルが選択されていません",
    };
  }

  // ファイルタイプをチェック
  if (!file.type.startsWith("image/")) {
    return {
      error: "画像ファイルを選択してください",
    };
  }

  try {
    console.log("ファイル処理中:", file.name, file.size, "ID:", fileId);

    // TODO: AzureのAPI呼びだす
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // モック的な領収書解析結果
    const mockReceipt = {
      amount: 367500,
      date: "2024-01-15",
      vendor: "株式会社サンプル商事",
      description: "システム開発費用",
    };

    return {
      success: true,
      result: {
        fileName: file.name,
        fileSize: file.size,
        fileId: fileId,
        receipt: mockReceipt,
      },
    };
  } catch (error) {
    console.error("ファイル処理エラー:", error);
    return {
      error: "ファイル処理中にエラーが発生しました",
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
  const [isDragging, setIsDragging] = useState(false);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isUploading = navigation.state === "submitting";

  // 現在選択されているファイルがアップロード完了したファイルと同じかチェック
  const isCurrentFileUploaded =
    actionData?.success && actionData.result?.fileId === currentFileId;

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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">領収書 OCR</h1>
          <p className="text-muted-foreground">
            領収書画像をアップロードして解析します。
          </p>
        </div>

        <Form ref={formRef} method="post" encType="multipart/form-data">
          {/* file input要素を常にフォーム内に配置 */}
          <Input
            ref={fileInputRef}
            type="file"
            name="image"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            id="file-input"
          />
          {/* ファイルIDを送信するための隠しフィールド */}
          <input type="hidden" name="fileId" value={currentFileId || ""} />

          <Card>
            {!selectedFile && (
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  画像選択
                </CardTitle>
                <CardDescription>
                  JPEGまたはPNG形式の画像ファイルを選択してください
                </CardDescription>
              </CardHeader>
            )}
            <CardContent className={selectedFile ? "p-6" : "space-y-4"}>
              {actionData?.error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                  {actionData.error}
                </div>
              )}

              {!selectedFile ? (
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
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    画像をドラッグ＆ドロップ
                  </p>
                  <p className="text-muted-foreground mb-4">
                    または下のボタンから選択
                  </p>
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-xs"
                  >
                    ファイルを選択
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                  {/* 左側：画像とファイル情報 */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Image className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">画像</h3>
                    </div>

                    {/* 画像プレビュー */}
                    <div className="relative">
                      <img
                        src={previewUrl || ""}
                        alt="選択された画像"
                        className="w-full max-h-[400px] object-contain rounded-lg border shadow-sm"
                      />
                    </div>

                    {/* ファイル情報 */}
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="font-medium text-sm truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  {/* 右側：解析結果 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">解析結果</h3>
                      </div>
                      {selectedFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFile}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4 mr-1" />
                          クリア
                        </Button>
                      )}
                    </div>

                    {isCurrentFileUploaded && actionData?.result?.receipt ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">金額</TableCell>
                              <TableCell className="text-right">
                                ¥{actionData.result.receipt.amount.toLocaleString()}
                              </TableCell>
                            </TableRow>

                            <TableRow>
                              <TableCell className="font-medium">日付</TableCell>
                              <TableCell className="text-right">
                                {actionData.result.receipt.date}
                              </TableCell>
                            </TableRow>

                            <TableRow>
                              <TableCell className="font-medium">発行者</TableCell>
                              <TableCell className="text-right">
                                {actionData.result.receipt.vendor}
                              </TableCell>
                            </TableRow>

                            <TableRow>
                              <TableCell className="font-medium">内容</TableCell>
                              <TableCell className="text-right">
                                {actionData.result.receipt.description}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-12">
                        {isUploading ? (
                          <div className="flex items-center gap-2 text-blue-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">解析中...</span>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            解析結果がここに表示されます
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Form>
      </div>
    </div>
  );
}
