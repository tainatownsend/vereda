import { useState } from 'react'
export const useAuthStore=()=>({
  user:{id:'vereda-visual-qa',email:'fixture@example.invalid',user_metadata:{full_name:'Visitante'}},
  profile:{name:'Visitante'},loading:false,authError:null,
  setReflectionFavorite:async()=>{},savePassage:async()=>{},
  removeSavedPassage:async()=>{},signOut:async()=>{},init:()=>{},
})
export const useUIStore=()=>{
  const [fontSize,setFontSize]=useState(new URLSearchParams(location.search).get('font')||'md')
  return {fontSize,setFontSize,darkMode:false,appFontScale:'md'}
}
export const useReadingStore=()=>({booksStatus:'ready'})
