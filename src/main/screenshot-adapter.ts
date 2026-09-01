import { desktopCapturer, screen, type Rectangle, type NativeImage } from "electron";

export type ScreenshotFrame = {
  bounds: Rectangle;
  scaleFactor: number;
  dataUrl: string;
};

export class ScreenshotAdapter {
  private frame: { image: NativeImage; bounds: Rectangle; scaleFactor: number } | null = null;

  async captureFrame(): Promise<ScreenshotFrame> {
    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    const scaleFactor = display.scaleFactor || 1;
    const thumbnailSize = {
      width: Math.max(1, Math.round(display.bounds.width * scaleFactor)),
      height: Math.max(1, Math.round(display.bounds.height * scaleFactor)),
    };
    const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize });
    const source = sources.find((candidate) => candidate.display_id === String(display.id)) ?? (sources.length === 1 ? sources[0] : undefined);
    if (!source || source.thumbnail.isEmpty()) throw new Error("无法读取当前显示器画面，请检查屏幕录制权限。");
    this.frame = { image: source.thumbnail, bounds: display.bounds, scaleFactor };
    return {
      bounds: display.bounds,
      scaleFactor,
      dataUrl: source.thumbnail.toDataURL(),
    };
  }

  getFrameDataUrl(): string | null {
    return this.frame ? this.frame.image.toDataURL() : null;
  }

  crop(selection: { x: number; y: number; width: number; height: number }): Buffer | null {
    if (!this.frame) return null;
    const { image, bounds, scaleFactor } = this.frame;
    const x = Math.max(0, Math.round(selection.x * scaleFactor));
    const y = Math.max(0, Math.round(selection.y * scaleFactor));
    const width = Math.min(image.getSize().width - x, Math.round(selection.width * scaleFactor));
    const height = Math.min(image.getSize().height - y, Math.round(selection.height * scaleFactor));
    if (width < 2 || height < 2 || x >= image.getSize().width || y >= image.getSize().height) return null;
    const maxWidth = Math.max(1, Math.round(bounds.width * scaleFactor));
    const maxHeight = Math.max(1, Math.round(bounds.height * scaleFactor));
    if (x + width > maxWidth || y + height > maxHeight) return null;
    return image.crop({ x, y, width, height }).toPNG();
  }

  clear(): void { this.frame = null; }
}
