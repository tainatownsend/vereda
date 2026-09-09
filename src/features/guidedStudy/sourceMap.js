// Canonical corpus anchors for Guided Study 1.2.
//
// These IDs point to the exact `sections` rows used by the Reader. Guided Study
// never falls back to a nearby section: if an anchor is missing, the encounter
// fails closed until the reference is reviewed.
//
// `sec_position` is deliberately NOT used as a canonical item number. The UI
// builds the human-readable reference from the corpus metadata (part/chapter/
// section title) returned for each pinned row.
export const GUIDED_SOURCE_MAP = {
  'le-01': [4164],
  'le-02': [4170],
  'le-03': [4187],
  'le-04': [4199, 4207],
  'le-05': [4219],
  'le-06': [4327],
  'le-07': [4269],
  'le-08': [4353],

  'lm-01': [4374],
  'lm-02': [4415],
  'lm-03': [4416, 4432],
  'lm-04': [4443],
  'lm-05': [4452],
  'lm-06': [4451],
  'lm-07': [4439, 4449],
  'lm-08': [4467, 4469],

  'ese-01': [4528],
  'ese-02': [4554],
  'ese-03': [4642],
  'ese-04': [4597],
  'ese-05': [4636],
  'ese-06': [4716],
  'ese-07': [4601],
  'ese-08': [4657],

  'ci-01': [4785],
  'ci-02': [4767, 4769, 4775],
  'ci-03': [4764],
  'ci-04': [4785],
  'ci-05': [4801],
  'ci-06': [4803],
  'ci-07': [4837],
  'ci-08': [4886],

  'ag-01': [4908],
  'ag-02': [4910],
  'ag-03': [4959],
  'ag-04': [4965],
  'ag-05': [4980],
  'ag-06': [4988],
  'ag-07': [5029],
  'ag-08': [5048],
}

export function getGuidedSourceIds(sessionId) {
  return GUIDED_SOURCE_MAP[sessionId] || []
}
