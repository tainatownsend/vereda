// Deterministic public fixture data. Never connect visual QA to hosted Supabase.
export const books = [
  { id:1, title:'O Livro dos Espíritos', author:'Allan Kardec', total_sections:170 },
  { id:2, title:'O Livro dos Médiuns', author:'Allan Kardec', total_sections:84 },
  { id:3, title:'O Evangelho Segundo o Espiritismo', author:'Allan Kardec', total_sections:70 },
  { id:4, title:'O Céu e o Inferno', author:'Allan Kardec', total_sections:70 },
  { id:5, title:'A Gênese', author:'Allan Kardec', total_sections:74 },
]
export const progress = {
  1:{ current_section:3, last_read_at:'2026-10-17' },
  2:{ current_section:22, last_read_at:'2026-10-20' },
  3:{ current_section:14, last_read_at:'2026-10-14' },
  4:{ current_section:1, last_read_at:'2026-10-13' },
  5:{ current_section:9, last_read_at:'2026-10-12' },
}
export const useBooks=()=>books
export const useUserData=()=>({progress, dataLoading:false})
