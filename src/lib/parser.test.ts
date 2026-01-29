import { parseBloodworkFile, parseAllBloodworkFiles } from './parser'

describe('parseBloodworkFile', () => {
  it('should parse a valid bloodwork file', () => {
    const testData = {
      collection_date: '2024-01-03',
      panels: [
        {
          panel_name: 'TSH and Free T4',
          tests: [
            {
              name: 'TSH',
              result: 1.72,
              unit: 'uIU/mL',
              reference_range: '0.450-4.500',
              flag: null,
            },
            {
              name: 'Free T4 (Direct)',
              result: 1.14,
              unit: 'ng/dL',
              reference_range: '0.82-1.77',
              flag: null,
            },
          ],
        },
      ],
    }

    const { readings, errors } = parseBloodworkFile(testData, 'test.json')

    expect(errors).toHaveLength(0)
    expect(readings).toHaveLength(2)

    // Check TSH parsing
    const tshReading = readings.find(r => r.metricName === 'TSH')
    expect(tshReading).toBeDefined()
    expect(tshReading!.value).toBe(1.72)
    expect(tshReading!.unit).toBe('uIU/mL')
    expect(tshReading!.refLow).toBe(0.45)
    expect(tshReading!.refHigh).toBe(4.5)
    expect(tshReading!.flag).toBe('Normal')
    expect(tshReading!.date).toBe('2024-01-03')

    // Check Free T4 parsing with alias
    const freeT4Reading = readings.find(r => r.metricName === 'Free T4')
    expect(freeT4Reading).toBeDefined()
    expect(freeT4Reading!.value).toBe(1.14)
  })

  it('should parse comparator results like "<5.0"', () => {
    const testData = {
      collection_date: '2024-09-24',
      panels: [
        {
          panel_name: 'Hormones / Other',
          tests: [
            {
              name: 'Estradiol',
              result: '<5.0',
              unit: 'pg/mL',
              reference_range: '7.6-42.6',
              flag: 'Low',
            },
          ],
        },
      ],
    }

    const { readings, errors } = parseBloodworkFile(testData, 'test.json')

    expect(errors).toHaveLength(0)
    expect(readings).toHaveLength(1)

    const reading = readings[0]
    expect(reading.value).toBe(5.0)
    expect(reading.comparator).toBe('<')
    expect(reading.valueText).toBe('<5.0')
    expect(reading.flag).toBe('Low')
  })

  it('should parse reference ranges with different formats', () => {
    const testData = {
      collection_date: '2024-09-24',
      panels: [
        {
          panel_name: 'Test Panel',
          tests: [
            {
              name: 'Test A',
              result: 100,
              unit: 'mg/dL',
              reference_range: '>59',
              flag: null,
            },
            {
              name: 'Test B',
              result: 50,
              unit: 'mg/dL',
              reference_range: '<100',
              flag: null,
            },
            {
              name: 'Test C',
              result: 75,
              unit: 'mg/dL',
              reference_range: '50-100',
              flag: null,
            },
          ],
        },
      ],
    }

    const { readings, errors } = parseBloodworkFile(testData, 'test.json')

    expect(errors).toHaveLength(0)

    const testA = readings.find(r => r.metricName === 'Test A')
    expect(testA!.refLow).toBe(59)
    expect(testA!.refHigh).toBeUndefined()

    const testB = readings.find(r => r.metricName === 'Test B')
    expect(testB!.refLow).toBeUndefined()
    expect(testB!.refHigh).toBe(100)

    const testC = readings.find(r => r.metricName === 'Test C')
    expect(testC!.refLow).toBe(50)
    expect(testC!.refHigh).toBe(100)
    expect(testC!.flag).toBe('Normal')
  })

  it('should flag values outside reference range', () => {
    const testData = {
      collection_date: '2024-01-03',
      panels: [
        {
          panel_name: 'Test Panel',
          tests: [
            {
              name: 'High Test',
              result: 150,
              unit: 'mg/dL',
              reference_range: '50-100',
              flag: null,
            },
            {
              name: 'Low Test',
              result: 30,
              unit: 'mg/dL',
              reference_range: '50-100',
              flag: null,
            },
            {
              name: 'Normal Test',
              result: 75,
              unit: 'mg/dL',
              reference_range: '50-100',
              flag: null,
            },
          ],
        },
      ],
    }

    const { readings, errors } = parseBloodworkFile(testData, 'test.json')

    expect(errors).toHaveLength(0)

    expect(readings.find(r => r.metricName === 'High Test')!.flag).toBe('High')
    expect(readings.find(r => r.metricName === 'Low Test')!.flag).toBe('Low')
    expect(readings.find(r => r.metricName === 'Normal Test')!.flag).toBe('Normal')
  })

  it('should use JSON flag when provided', () => {
    const testData = {
      collection_date: '2024-01-03',
      panels: [
        {
          panel_name: 'Test Panel',
          tests: [
            {
              name: 'Test A',
              result: 51.9,
              unit: '%',
              reference_range: '37.5-51.0',
              flag: 'High',
            },
            {
              name: 'Test B',
              result: 50.3,
              unit: '%',
              reference_range: '38.3-49.3',
              flag: 'H',
            },
          ],
        },
      ],
    }

    const { readings } = parseBloodworkFile(testData, 'test.json')

    expect(readings.find(r => r.metricName === 'Test A')!.flag).toBe('High')
    expect(readings.find(r => r.metricName === 'Test B')!.flag).toBe('High')
  })

  it('should handle invalid data with Zod validation', () => {
    const invalidData = {
      collection_date: '2024-01-03',
      // Missing panels array
    }

    const { readings, errors } = parseBloodworkFile(invalidData, 'invalid.json')

    expect(errors.length).toBeGreaterThan(0)
    expect(readings).toHaveLength(0)
  })

  it('should normalize category names', () => {
    const testData = {
      collection_date: '2024-01-03',
      panels: [
        {
          panel_name: 'Hormones / Other',
          tests: [
            { name: 'Testosterone', result: 450, unit: 'ng/dL', reference_range: '264-916', flag: null },
          ],
        },
        {
          panel_name: 'TSH and Free T4',
          tests: [
            { name: 'TSH', result: 1.72, unit: 'uIU/mL', reference_range: '0.450-4.500', flag: null },
          ],
        },
      ],
    }

    const { readings } = parseBloodworkFile(testData, 'test.json')

    expect(readings.find(r => r.metricName === 'Total Testosterone')!.category).toBe('Hormones')
    expect(readings.find(r => r.metricName === 'TSH')!.category).toBe('Thyroid')
  })
})

describe('parseAllBloodworkFiles', () => {
  it('should parse multiple files and sort by date', () => {
    const files = [
      {
        data: {
          collection_date: '2024-09-24',
          panels: [
            {
              panel_name: 'Test',
              tests: [{ name: 'TSH', result: 1.95, unit: 'uIU/mL', reference_range: '0.450-4.500', flag: null }],
            },
          ],
        },
        filename: 'second.json',
      },
      {
        data: {
          collection_date: '2024-01-03',
          panels: [
            {
              panel_name: 'Test',
              tests: [{ name: 'TSH', result: 1.72, unit: 'uIU/mL', reference_range: '0.450-4.500', flag: null }],
            },
          ],
        },
        filename: 'first.json',
      },
    ]

    const { readings, errors } = parseAllBloodworkFiles(files)

    expect(errors).toHaveLength(0)
    expect(readings).toHaveLength(2)
    expect(readings[0].date).toBe('2024-01-03')
    expect(readings[1].date).toBe('2024-09-24')
  })
})
