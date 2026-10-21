// React visual fixture: real Vereda screens, deterministic mock hooks and store.
import React from 'react'
import {createRoot} from 'react-dom/client'
import {MemoryRouter,Routes,Route} from 'react-router-dom'
import Home from '@/pages/HomePage.jsx'
import Library from '@/pages/LibraryPage.jsx'
import Reflection from '@/pages/ReflectionPage.jsx'
import Reader from '@/pages/ReaderPage.jsx'
import BottomNav from '@/components/ui/BottomNav.jsx'
import '@/index.css'
const screen=new URLSearchParams(location.search).get('screen')||'home'
const initialPath={home:'/home',studies:'/biblioteca',reflections:'/reflexoes',reader:'/ler/2'}[screen]||'/home'
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={[initialPath]}>
    <Routes>
      <Route path="/home" element={<><Home/><BottomNav/></>}/>
      <Route path="/biblioteca" element={<><Library/><BottomNav/></>}/>
      <Route path="/reflexoes" element={<><Reflection/><BottomNav/></>}/>
      <Route path="/ler/:id" element={<Reader/>}/>
    </Routes>
  </MemoryRouter>
)
