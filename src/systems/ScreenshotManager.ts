import type { IRenderer } from '../renderer/IRenderer';

export class ScreenshotManager {
  static capture(renderer: IRenderer): void {
    const canvas = renderer.getCanvas();
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `bloom-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
