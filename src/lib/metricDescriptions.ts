// Descriptions for common bloodwork metrics
export const metricDescriptions: Record<string, string> = {
  // Thyroid
  'TSH': 'Thyroid Stimulating Hormone. Controls thyroid gland function. High values may indicate hypothyroidism; low values may indicate hyperthyroidism.',
  'Free T4': 'Free Thyroxine. The active form of T4 available to tissues. Important for metabolism regulation.',
  'Free T3': 'Free Triiodothyronine. The most active thyroid hormone. Regulates metabolism, heart rate, and body temperature.',
  'Total T3': 'Total Triiodothyronine. Includes both bound and free T3 in the blood.',
  'Total T4': 'Total Thyroxine. Includes both bound and free T4 in the blood.',

  // Lipids
  'Total Cholesterol': 'Total amount of cholesterol in blood. Includes HDL, LDL, and VLDL.',
  'LDL-C': 'Low-Density Lipoprotein Cholesterol. Often called "bad" cholesterol. High levels increase cardiovascular risk.',
  'HDL-C': 'High-Density Lipoprotein Cholesterol. Often called "good" cholesterol. Higher levels are protective.',
  'VLDL-C': 'Very Low-Density Lipoprotein Cholesterol. Carries triglycerides. Elevated levels increase heart disease risk.',
  'Triglycerides': 'Type of fat in blood. High levels increase risk of heart disease and pancreatitis.',
  'LDL/HDL Ratio': 'Ratio of LDL to HDL cholesterol. Lower ratios indicate better cardiovascular health.',

  // CBC
  'WBC': 'White Blood Cell count. Immune cells that fight infection. High values may indicate infection or inflammation.',
  'RBC': 'Red Blood Cell count. Cells that carry oxygen. Low values indicate anemia.',
  'Hemoglobin': 'Protein in red blood cells that carries oxygen. Low levels indicate anemia.',
  'Hematocrit': 'Percentage of blood volume made up of red blood cells. Elevated values may indicate dehydration or polycythemia.',
  'MCV': 'Mean Corpuscular Volume. Average size of red blood cells. Helps classify types of anemia.',
  'MCH': 'Mean Corpuscular Hemoglobin. Average amount of hemoglobin per red blood cell.',
  'MCHC': 'Mean Corpuscular Hemoglobin Concentration. Average concentration of hemoglobin in red blood cells.',
  'RDW': 'Red Cell Distribution Width. Variation in red blood cell size. Elevated in some anemias.',
  'Platelets': 'Blood cells that help with clotting. Low values increase bleeding risk; high values increase clotting risk.',
  'Neutrophils %': 'Percentage of white blood cells that are neutrophils. First responders to bacterial infections.',
  'Neutrophils Abs': 'Absolute count of neutrophils. Primary defense against bacterial infections.',
  'Lymphocytes %': 'Percentage of white blood cells that are lymphocytes. Important for immune response.',
  'Lymphocytes Abs': 'Absolute count of lymphocytes. Key cells for adaptive immunity.',
  'Monocytes %': 'Percentage of white blood cells that are monocytes. Help fight infections and remove dead cells.',
  'Monocytes Abs': 'Absolute count of monocytes.',
  'Eosinophils %': 'Percentage of white blood cells that are eosinophils. Elevated in allergies and parasitic infections.',
  'Eosinophils Abs': 'Absolute count of eosinophils.',
  'Basophils %': 'Percentage of white blood cells that are basophils. Involved in allergic reactions.',
  'Basophils Abs': 'Absolute count of basophils.',
  'NLR': 'Neutrophil-to-Lymphocyte Ratio. Marker of inflammation and immune response.',

  // Metabolic Panel
  'Glucose': 'Blood sugar level. Elevated fasting glucose may indicate diabetes or prediabetes.',
  'BUN': 'Blood Urea Nitrogen. Waste product filtered by kidneys. Elevated values may indicate kidney dysfunction.',
  'Creatinine': 'Waste product from muscle metabolism. Used to assess kidney function.',
  'eGFR': 'Estimated Glomerular Filtration Rate. Measures how well kidneys filter waste. Lower values indicate reduced kidney function.',
  'BUN/Creatinine Ratio': 'Ratio used to help identify cause of kidney problems.',
  'Sodium': 'Electrolyte important for fluid balance, nerve, and muscle function.',
  'Potassium': 'Electrolyte critical for heart, nerve, and muscle function.',
  'Chloride': 'Electrolyte that helps maintain fluid balance and acid-base balance.',
  'CO2': 'Carbon Dioxide/Bicarbonate. Helps assess acid-base balance in blood.',
  'Calcium': 'Mineral important for bones, muscles, nerves, and heart function.',
  'Total Protein': 'Total amount of albumin and globulin proteins in blood.',
  'Albumin': 'Protein made by liver. Important for maintaining blood volume and transporting substances.',
  'Globulin': 'Group of proteins including antibodies. Important for immune function.',
  'A/G Ratio': 'Albumin to Globulin ratio. Helps assess liver and immune function.',
  'Total Bilirubin': 'Breakdown product of hemoglobin. Elevated levels may indicate liver problems.',
  'Alkaline Phosphatase': 'Enzyme found in liver, bones, and other tissues. Elevated in liver or bone disease.',
  'AST': 'Aspartate Aminotransferase. Liver enzyme. Elevated in liver damage or muscle injury.',
  'ALT': 'Alanine Aminotransferase. Liver enzyme. More specific to liver damage than AST.',
  'Anion Gap': 'Difference between measured cations and anions. Helps diagnose acid-base disorders.',

  // Hormones
  'Total Testosterone': 'Primary male sex hormone. Important for muscle mass, bone density, and libido.',
  'Free Testosterone': 'Unbound testosterone available for use by tissues.',
  'SHBG': 'Sex Hormone Binding Globulin. Protein that binds testosterone and estradiol.',
  'Estradiol': 'Primary female sex hormone. Present in both sexes. Important for bone health.',
  'FSH': 'Follicle Stimulating Hormone. Regulates reproductive function.',
  'LH': 'Luteinizing Hormone. Triggers testosterone production in men, ovulation in women.',
  'Prolactin': 'Hormone involved in breast milk production. Elevated levels in men may indicate pituitary issues.',
  'DHEA-S': 'Dehydroepiandrosterone Sulfate. Precursor hormone. Decreases with age.',
  'IGF-1': 'Insulin-Like Growth Factor 1. Mediates growth hormone effects. Important for muscle and bone.',
  'Cortisol': 'Stress hormone produced by adrenal glands. Important for metabolism and immune response.',
  'Total PSA': 'Prostate Specific Antigen. Marker for prostate health. Elevated in prostate conditions.',
  'Free PSA': 'Unbound PSA. Percentage of free PSA helps assess prostate cancer risk.',
  'Insulin, Random': 'Hormone that regulates blood sugar. Elevated levels may indicate insulin resistance.',

  // A1c
  'HbA1c': 'Hemoglobin A1c. Average blood sugar over 2-3 months. Key marker for diabetes management.',

  // Other
  'Ferritin': 'Iron storage protein. Low values indicate iron deficiency; high values may indicate iron overload.',
  'Cardiac CRP': 'High-sensitivity C-Reactive Protein. Marker of inflammation and cardiovascular risk.',
  'Magnesium': 'Mineral important for muscle, nerve, and heart function, and bone health.',
  'Phosphorus': 'Mineral important for bones, teeth, and energy metabolism.',
  'Vitamin B12': 'Essential vitamin for nerve function and red blood cell production.',
  'Vitamin D25-OH': '25-Hydroxyvitamin D. Measures vitamin D status. Important for bone health and immune function.',
  'MPV': 'Mean Platelet Volume. Average size of platelets. May indicate platelet production rate.',
}

export function getMetricDescription(metricName: string): string | undefined {
  return metricDescriptions[metricName]
}
