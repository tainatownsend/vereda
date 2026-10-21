export const useReadingSession=()=>({
  phase:'reading',
  currentSection:{
    section_id:22,sec_position:22,kind:'content',
    part_title:'Segunda Parte — Das manifestações espíritas',
    chapter_label:'CAPÍTULO V',chapter_title:'Das manifestações físicas espontâneas',
    content:'82. São provocados os fenômenos de que acabamos de falar. Sucede, porém, às vezes, produzirem-se espontaneamente, sem intervenção da vontade, até mesmo contra a vontade, pois que frequentemente se tornam muito importunos.\n\nAlém disso, para excluir a suposição de que possam ser efeito de imaginação sobre-excitada pelas ideias espíritas, há a circunstância de que se produzem em pessoas que nunca ouviram falar disso.',
  },
  readerState:{current_section:22},bookIndexSections:[],lastPosition:84,
  canGoPrevious:true,canGoNext:true,saving:false,
  completeCurrentSection:()=>{},goToPrevious:()=>{},jumpToSection:()=>{},
  loadBookIndex:()=>{},reload:()=>{},
})
export const READER_PHASE={
  READING:'reading',LOADING:'loading',ERROR:'error',
  BOOK_COMPLETE:'book_complete',DAILY_GOAL_COMPLETE:'daily_goal_complete',
}
