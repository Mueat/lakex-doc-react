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
    },
    // 图片选中后上方浮动操作栏（cardToolbar）。点击图片（focus）即出现。
    // 内置处理器（仅写 name 即可）：maximize / widthMode / copy / delete
    // 自定义项需提供 onClick(editor, cardUI, item)，cardUI.cardData 即图片卡片数据
    showMiniToolbarWhen: 'focus',
    miniToolbar: [
        { name: 'maximize', title: '放大' },
        { name: 'widthMode', title: '宽度' },
        '|',
        {
            name: 'imageSize',
            title: '宽高',
            onClick: (editor: any, cardUI: any) => {
                const data = cardUI.cardData;
                const w = window.prompt('图片宽度(px)', String(data.getDisplayWidth()));
                if (w && !Number.isNaN(Number(w)) && Number(w) > 0) {
                    const ratio = data.getDisplayHeight() / data.getDisplayWidth();
                    data.setValue({ width: Number(w), height: Math.round(Number(w) * ratio) });
                    data.sync(false);
                }
            },
        },
        {
            name: 'imageAlt',
            title: '描述',
            onClick: (editor: any, cardUI: any) => {
                const data = cardUI.cardData;
                const alt = window.prompt('图片描述', data.getValue('alt') || '');
                if (alt !== null) {
                    data.setValue({ alt });
                    data.sync(false);
                }
            },
        },
        {
            name: 'imageStyle',
            title: '样式',
            onClick: (editor: any, cardUI: any) => {
                // 扩展点：在此接入图片样式预设（边框 / 圆角 / 对齐等）
                // 例如 data.setValue({ align: 'center' }); data.sync(false);
                window.alert('样式：请在此接入图片样式预设（边框 / 圆角 / 对齐）');
            },
        },
        '|',
        { name: 'copy', title: '复制' },
        { name: 'delete', title: '删除' },
    ],
}

export default DeafultImageConfig