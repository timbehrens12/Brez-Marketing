// Ultra-simple GDPR webhook that only returns 401
export async function POST() {
  return new Response('Unauthorized', { status: 401 })
}

export async function GET() {
  return new Response('Unauthorized', { status: 401 })
}

export async function PUT() {
  return new Response('Unauthorized', { status: 401 })
}

export async function DELETE() {
  return new Response('Unauthorized', { status: 401 })
}
