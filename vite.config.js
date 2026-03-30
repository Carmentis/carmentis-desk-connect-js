import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({ insertTypesEntry: true })
  ],
  build: {
    lib: {
      entry: './src/main.ts',
      name: 'CarmentisConnect',
      fileName: 'index'
    },
    rollupOptions: {
      external: ['@cmts-dev/carmentis-relay-client', '@cmts-dev/carmentis-sdk-json-rpc'],
      output: {
        globals: {
          '@cmts-dev/carmentis-relay-client': 'CarmentisRelayClient',
          '@cmts-dev/carmentis-sdk-json-rpc': 'CarmentisSDKJsonRpc'
        }
      }
    }
  }
});
