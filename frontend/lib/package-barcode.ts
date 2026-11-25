import { scanGrayBuffer, scanImageData, setModuleArgs } from "@undecaf/zbar-wasm";

const wasm = new URL("@undecaf/zbar-wasm/dist/zbar.wasm", import.meta.url);
setModuleArgs({ locateFile: () => wasm.href });

// Average short vertical strips to suppress camera noise, then contrast each
// bar against its horizontal neighbours to compensate for uneven lighting.
function enhanceBars({ data, width, height }: ImageData) {
  const output = new Uint8ClampedArray(width * height);
  const sums = new Float64Array(width + 1);
  for (let top = 0; top < height; top += 8) {
    const bottom = Math.min(top + 8, height);
    for (let x = 0; x < width; x++) {
      let light = 0;
      for (let y = top; y < bottom; y++) {
        const i = 4 * (y * width + x);
        light += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
      sums[x + 1] = sums[x] + light / (bottom - top);
    }
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - 16);
      const right = Math.min(width, x + 17);
      const mean = (sums[right] - sums[left]) / (right - left);
      output[top * width + x] = 192 + 8 * (sums[x + 1] - sums[x] - mean);
    }
    for (let y = top + 1; y < bottom; y++) {
      output.copyWithin(y * width, top * width, (top + 1) * width);
    }
  }
  return output;
}

export async function readPackageBarcode(source: HTMLVideoElement | HTMLImageElement) {
  const width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!width || !height) return;
  const scale = Math.min(1, 576 / width, 800 / height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const [original] = await scanImageData(image);
  if (original) return original.decode();
  const [enhanced] = await scanGrayBuffer(enhanceBars(image).buffer, canvas.width, canvas.height);
  return enhanced?.decode();
}
