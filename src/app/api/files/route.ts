import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

function getUserDataDir(user: string): string {
  return path.join(process.cwd(), 'src', 'data', user)
}

function getUserArchiveDir(user: string): string {
  return path.resolve(process.cwd(), '..', 'BloodworkJSONS.json', user)
}

// GET /api/files?user=grace -- list all JSON files for a user
export async function GET(request: NextRequest) {
  const user = request.nextUrl.searchParams.get('user')

  if (!user) {
    return NextResponse.json({ error: 'No user specified' }, { status: 400 })
  }

  const dataDir = getUserDataDir(user)

  if (!fs.existsSync(dataDir)) {
    return NextResponse.json({ files: [] })
  }

  const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(filename => {
      const filePath = path.join(dataDir, filename)
      const stat = fs.statSync(filePath)
      let collectionDate: string | null = null
      let panelCount = 0
      let testCount = 0

      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        collectionDate = content.collection_date || null
        panelCount = content.panels?.length || 0
        testCount = content.panels?.reduce((sum: number, p: { tests: unknown[] }) => sum + (p.tests?.length || 0), 0) || 0
      } catch {
        // ignore parse errors
      }

      return {
        filename,
        collectionDate,
        panelCount,
        testCount,
        size: stat.size,
        createdAt: stat.birthtime.toISOString(),
      }
    })
    .sort((a, b) => {
      // Sort by collection date
      if (a.collectionDate && b.collectionDate) {
        return a.collectionDate.localeCompare(b.collectionDate)
      }
      return a.filename.localeCompare(b.filename)
    })

  return NextResponse.json({ files })
}

// PATCH /api/files -- rename a file
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { user, oldFilename, newFilename } = body

    if (!user || !oldFilename || !newFilename) {
      return NextResponse.json({ error: 'user, oldFilename, and newFilename are required' }, { status: 400 })
    }

    const safeOld = path.basename(oldFilename)
    let safeNew = path.basename(newFilename)

    // Ensure .json extension
    if (!safeNew.endsWith('.json')) {
      safeNew = safeNew + '.json'
    }

    // Prevent renaming internal files
    if (safeOld.startsWith('_') || safeNew.startsWith('_')) {
      return NextResponse.json({ error: 'Cannot rename internal files' }, { status: 400 })
    }

    const dataDir = getUserDataDir(user)
    const oldPath = path.join(dataDir, safeOld)
    const newPath = path.join(dataDir, safeNew)

    if (!fs.existsSync(oldPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (fs.existsSync(newPath)) {
      return NextResponse.json({ error: 'A file with that name already exists' }, { status: 409 })
    }

    fs.renameSync(oldPath, newPath)

    // Also rename in archive if it exists
    const archiveDir = getUserArchiveDir(user)
    const archiveOldPath = path.join(archiveDir, safeOld)
    const archiveNewPath = path.join(archiveDir, safeNew)
    if (fs.existsSync(archiveOldPath)) {
      fs.renameSync(archiveOldPath, archiveNewPath)
    }

    return NextResponse.json({ success: true, oldFilename: safeOld, newFilename: safeNew })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/files?user=grace&filename=10-22-24.json -- delete a file
export async function DELETE(request: NextRequest) {
  const user = request.nextUrl.searchParams.get('user')
  const filename = request.nextUrl.searchParams.get('filename')

  if (!user || !filename) {
    return NextResponse.json({ error: 'user and filename are required' }, { status: 400 })
  }

  // Sanitize filename to prevent path traversal
  const safeFilename = path.basename(filename)
  if (!safeFilename.endsWith('.json')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const dataPath = path.join(getUserDataDir(user), safeFilename)
  const archivePath = path.join(getUserArchiveDir(user), safeFilename)

  let deleted = false

  if (fs.existsSync(dataPath)) {
    fs.unlinkSync(dataPath)
    deleted = true
  }

  if (fs.existsSync(archivePath)) {
    fs.unlinkSync(archivePath)
  }

  if (!deleted) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, deleted: safeFilename })
}
