import { ImageConfig } from "../components/lakex/types";

function getBase64FileSize(base64String: string): number {
  const byteCharacters = atob(base64String.replace(/^data:image\/\w+;base64,/, ''));
  return byteCharacters.length; // 直接得到字节数
}

const DeafultImageConfig: ImageConfig = {
    isCaptureImageURL: (_url: string, _patterns: RegExp[], _excludePatterns: RegExp[]) => {
        return false;
    },
    createUploadPromise: (
        request: { type: "url" | "file" | "base64"; data: File | string }
    ) => {
        if (request.type === 'url') {
            return Promise.resolve({
                url: request.data as string,
                size: 0, // 文件大小
                filename: 'image.png'
            });
        } else if (request.type === 'file') {
            const f = request.data as File
            const url = URL.createObjectURL(f)
             return Promise.resolve({
                url: url,
                size: f.size, // 文件大小
                filename: f.name,
            });
        } else if (request.type === 'base64') {
             return Promise.resolve({
                url: request.data as string,
                size: getBase64FileSize(request.data as string), // 文件大小
                filename: 'image.png'
            });
        }
    }
}

export default DeafultImageConfig