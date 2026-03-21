import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

type RenderPurpose = 'ocr' | 'preview';

interface RenderPageOptions {
  modelId?: string;
  purpose?: RenderPurpose;
}

const getRenderConfig = (options?: RenderPageOptions): { scale: number; mimeType: 'image/jpeg' | 'image/png'; quality?: number } => {
  const purpose = options?.purpose || 'ocr';
  const modelId = options?.modelId || '';

  if (purpose === 'preview') {
    return { scale: 2.0, mimeType: 'image/jpeg', quality: 0.85 };
  }

  if (/paddleocr/i.test(modelId)) {
    return { scale: 3.0, mimeType: 'image/png' };
  }

  return { scale: 2.2, mimeType: 'image/jpeg', quality: 0.9 };
};

export const renderPageToImage = async (pdf: any, pageNum: number, options?: RenderPageOptions): Promise<string> => {
  const page = await pdf.getPage(pageNum);
  const config = getRenderConfig(options);
  const viewport = page.getViewport({ scale: config.scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  if (!context) throw new Error('Canvas context missing');

  await page.render({ canvasContext: context, viewport }).promise;

  return config.mimeType === 'image/png'
    ? canvas.toDataURL(config.mimeType)
    : canvas.toDataURL(config.mimeType, config.quality ?? 0.85);
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export { pdfjsLib };
