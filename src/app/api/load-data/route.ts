import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

// GET /api/load-data?user=grace -- load all JSON data files for a user from disk
// This dynamically reads files so uploads/deletes are reflected without a rebuild
export async function GET(request: NextRequest) {
  const user = request.nextUrl.searchParams.get('user')

  if (!user) {
    return NextResponse.json({ error: 'No user specified' }, { status: 400 })
  }

  const dataDir = path.join(process.cwd(), 'src', 'data', user)

  if (!fs.existsSync(dataDir)) {
    return NextResponse.json({ files: [] })
  }

  const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(filename => {
      const filePath = path.join(dataDir, filename)
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        return { data: content, filename }
      } catch {
        return null
      }
    })
    .filter(Boolean)

  return NextResponse.json({ files })
}
