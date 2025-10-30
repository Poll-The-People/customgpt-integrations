import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {viteStaticCopy} from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        host: true
    },
    plugins: [
        react(),
        viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx',
                    dest: './'
                },
                {
                    src: 'node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx',
                    dest: './'
                },
                {
                    src: 'node_modules/onnxruntime-web/dist/*.mjs',
                    dest: './assets'
                },
                {
                    src: 'node_modules/onnxruntime-web/dist/*.wasm',
                    dest: './assets'
                },
                {
                    src: 'node_modules/onnxruntime-web/dist/*.wasm',
                    dest: './'
                }
            ]
        })
    ],
})
