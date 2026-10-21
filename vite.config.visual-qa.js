import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
export default defineConfig({
  plugins:[react()],
  resolve:{alias:[
    {find:'@/hooks',replacement:path.resolve('qa/visual/mockHooks.js')},
    {find:'@/store',replacement:path.resolve('qa/visual/mockStore.js')},
    {find:'@/features/reader/useReadingSession',replacement:path.resolve('qa/visual/mockReader.js')},
    {find:'@/features/studyJournal/studyJournal',replacement:path.resolve('qa/visual/mockJournal.js')},
    {find:'@',replacement:path.resolve('src')},
  ]},
  server:{host:'127.0.0.1',port:4174,strictPort:true},
})
