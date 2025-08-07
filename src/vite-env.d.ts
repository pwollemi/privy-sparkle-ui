/// <reference types="vite/client" />

declare global {
  interface Window {
    Buffer: typeof import('buffer').Buffer;
    process: typeof import('process');
  }
  var Buffer: typeof import('buffer').Buffer;
  var process: typeof import('process');
}
