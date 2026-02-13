// Canonical aliases to unify metric names across different lab reports
// Key: raw test name (lowercase), Value: canonical name

export const metricAliases: Record<string, string> = {
  // Thyroid
  'free t4 (direct)': 'Free T4',
  'free t4': 'Free T4',
  'tsh': 'TSH',
  'thyroid stimulating hormone': 'TSH',
  'triiodothyronine (t3), free': 'Free T3',
  'free t3': 'Free T3',
  't3, free': 'Free T3',
  'total t3': 'Total T3',
  'total t3 (triiodothyronine)': 'Total T3',
  'thyroxine': 'Total T4',
  'total t4 (thyroxine)': 'Total T4',

  // Lipids
  'ldl chol calc (nih)': 'LDL-C',
  'ldl cholesterol (calculated, nih)': 'LDL-C',
  'ldl (calculated)': 'LDL-C',
  'direct ldl': 'LDL-C',
  'hdl cholesterol': 'HDL-C',
  'hdl': 'HDL-C',
  'cholesterol, total': 'Total Cholesterol',
  'total cholesterol': 'Total Cholesterol',
  'cholesterol': 'Total Cholesterol',
  'vldl cholesterol (calculated)': 'VLDL-C',
  'vldl cholesterol (calc)': 'VLDL-C',
  'vldl': 'VLDL-C',

  // CBC
  'hemoglobin': 'Hemoglobin',
  'hgb': 'Hemoglobin',
  'hematocrit': 'Hematocrit',
  'hct': 'Hematocrit',
  'platelets': 'Platelets',
  'plt': 'Platelets',
  'lymphs': 'Lymphocytes %',
  'lymphocytes': 'Lymphocytes %',
  'ly%': 'Lymphocytes %',
  'lymphs (absolute)': 'Lymphocytes Abs',
  'lymphocytes (absolute)': 'Lymphocytes Abs',
  'ly#': 'Lymphocytes Abs',
  'neutrophils': 'Neutrophils %',
  'ne%': 'Neutrophils %',
  'neutrophils %': 'Neutrophils %',
  'neutrophils (absolute)': 'Neutrophils Abs',
  'ne#': 'Neutrophils Abs',
  'monocytes': 'Monocytes %',
  'mo%': 'Monocytes %',
  'monocytes (absolute)': 'Monocytes Abs',
  'mo#': 'Monocytes Abs',
  'eosinophils': 'Eosinophils %',
  'eo%': 'Eosinophils %',
  'eos (absolute)': 'Eosinophils Abs',
  'eosinophils (absolute)': 'Eosinophils Abs',
  'eo#': 'Eosinophils Abs',
  'basophils': 'Basophils %',
  'ba%': 'Basophils %',
  'baso (absolute)': 'Basophils Abs',
  'basophils (absolute)': 'Basophils Abs',
  'ba#': 'Basophils Abs',
  'immature grans (absolute)': 'Immature Granulocytes Abs',
  'immature granulocytes (absolute)': 'Immature Granulocytes Abs',
  'rdw': 'RDW',
  'rdw_cv': 'RDW',
  'neut/lymph ratio': 'NLR',
  'neutrophil/lymphocyte ratio': 'NLR',

  // Metabolic
  'bun': 'BUN',
  'blood urea nitrogen': 'BUN',
  'egfr': 'eGFR',
  'egfr (male)': 'eGFR',
  'carbon dioxide, total': 'CO2',
  'co2': 'CO2',
  'bicarbonate': 'CO2',
  'protein, total': 'Total Protein',
  'total protein': 'Total Protein',
  'bilirubin, total': 'Total Bilirubin',
  'total bilirubin': 'Total Bilirubin',
  'ast (sgot)': 'AST',
  'ast': 'AST',
  'aspartate aminotransferase': 'AST',
  'alt (sgpt)': 'ALT',
  'alt': 'ALT',
  'alanine aminotransferase': 'ALT',
  'globulin, total': 'Globulin',
  'globulin': 'Globulin',
  'chloride': 'Chloride',
  'cl-c': 'Chloride',
  'a/g ratio': 'A/G Ratio',
  'albumin/globulin ratio': 'A/G Ratio',

  // Hormones
  'testosterone': 'Total Testosterone',
  'testosterone total': 'Total Testosterone',
  'total testosterone': 'Total Testosterone',
  'free testosterone (direct)': 'Free Testosterone',
  'free testosterone': 'Free Testosterone',
  'sex hormone binding globulin (shbg), serum': 'SHBG',
  'sex hormone binding globulin': 'SHBG',
  'dhea-sulfate': 'DHEA-S',
  'dhea-s': 'DHEA-S',
  'insulin-like growth factor i (igf-1)': 'IGF-1',
  'prostate specific ag (psa)': 'Total PSA',
  'prostate specific antigen (psa)': 'Total PSA',
  'total psa': 'Total PSA',
  'follicle-stimulating hormone': 'FSH',
  'fsh': 'FSH',
  'luteinizing hormone': 'LH',
  'lh': 'LH',

  // A1c
  'hemoglobin a1c': 'HbA1c',
}

// Get canonical name for a metric
export function getCanonicalName(rawName: string): string {
  const lower = rawName.toLowerCase().trim()
  return metricAliases[lower] || rawName
}

// Generate metric ID from name
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
