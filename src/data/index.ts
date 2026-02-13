// Data registry: maps each user to their bloodwork JSON imports

import boden_0103 from './boden/01-03-24.json'
import boden_0928 from './boden/09-28-24.json'
import boden_1008 from './boden/10-08-25.json'
import boden_0127 from './boden/01-27-26.json'

import grace_1023 from './grace/10-23-24.json'

export type BloodworkFile = { data: unknown; filename: string }

export const userData: Record<string, BloodworkFile[]> = {
  boden: [
    { data: boden_0103, filename: '01-03-24.json' },
    { data: boden_0928, filename: '09-28-24.json' },
    { data: boden_1008, filename: '10-08-25.json' },
    { data: boden_0127, filename: '01-27-26.json' },
  ],
  grace: [
    { data: grace_1023, filename: '10-23-24.json' },
  ],
}

export const userNames: Record<string, string> = {
  boden: 'Boden',
  grace: 'Grace',
}

export const userIds = Object.keys(userData)
