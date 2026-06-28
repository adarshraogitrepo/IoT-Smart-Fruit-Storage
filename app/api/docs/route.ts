import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const doc = searchParams.get("file") || "SETUP_GUIDE"

  try {
    const filePath = join(process.cwd(), "public", `${doc}.md`)
    const content = await readFile(filePath, "utf-8")

    return NextResponse.json({
      ok: true,
      filename: `${doc}.md`,
      content,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: `Could not load documentation: ${doc}`,
      },
      { status: 404 },
    )
  }
}
