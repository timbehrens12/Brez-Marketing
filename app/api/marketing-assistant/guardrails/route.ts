import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Guardrails {
  minROAS: number
  maxCAC: number
  maxCPA: number
  budgetLimits: {
    dailyMax: number
    monthlyMax: number
  }
  riskTolerance: 'low' | 'medium' | 'high'
  autoApprovalThreshold: number // USD value
  requireApprovalAbove: number // USD value
}

const DEFAULT_GUARDRAILS: Guardrails = {
  minROAS: 2.0,
  maxCAC: 50,
  maxCPA: 30,
  budgetLimits: {
    dailyMax: 500,
    monthlyMax: 15000
  },
  riskTolerance: 'medium',
  autoApprovalThreshold: 100,
  requireApprovalAbove: 1000
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Get guardrails from database or return defaults
    const { data: guardrails } = await supabase
      .from('brand_guardrails')
      .select('*')
      .eq('brand_id', brandId)
      .single()

    const activeGuardrails = guardrails?.settings || DEFAULT_GUARDRAILS

    return NextResponse.json({ guardrails: activeGuardrails })

  } catch (error) {
    console.error('Error fetching guardrails:', error)
    return NextResponse.json({ guardrails: DEFAULT_GUARDRAILS })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, guardrails } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Validate guardrails
    const validatedGuardrails = validateGuardrails(guardrails)

    // Upsert guardrails
    const { data, error } = await supabase
      .from('brand_guardrails')
      .upsert({
        brand_id: brandId,
        user_id: userId,
        settings: validatedGuardrails,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving guardrails:', error)
      return NextResponse.json({ error: 'Failed to save guardrails' }, { status: 500 })
    }

    return NextResponse.json({ success: true, guardrails: validatedGuardrails })

  } catch (error) {
    console.error('Error updating guardrails:', error)
    return NextResponse.json({ error: 'Failed to update guardrails' }, { status: 500 })
  }
}

function validateGuardrails(guardrails: Partial<Guardrails>): Guardrails {
  return {
    minROAS: Math.max(0.1, Math.min(20, guardrails.minROAS || DEFAULT_GUARDRAILS.minROAS)),
    maxCAC: Math.max(1, Math.min(1000, guardrails.maxCAC || DEFAULT_GUARDRAILS.maxCAC)),
    maxCPA: Math.max(1, Math.min(1000, guardrails.maxCPA || DEFAULT_GUARDRAILS.maxCPA)),
    budgetLimits: {
      dailyMax: Math.max(10, Math.min(10000, guardrails.budgetLimits?.dailyMax || DEFAULT_GUARDRAILS.budgetLimits.dailyMax)),
      monthlyMax: Math.max(100, Math.min(100000, guardrails.budgetLimits?.monthlyMax || DEFAULT_GUARDRAILS.budgetLimits.monthlyMax))
    },
    riskTolerance: ['low', 'medium', 'high'].includes(guardrails.riskTolerance || '') 
      ? guardrails.riskTolerance as 'low' | 'medium' | 'high' 
      : DEFAULT_GUARDRAILS.riskTolerance,
    autoApprovalThreshold: Math.max(1, Math.min(5000, guardrails.autoApprovalThreshold || DEFAULT_GUARDRAILS.autoApprovalThreshold)),
    requireApprovalAbove: Math.max(100, Math.min(50000, guardrails.requireApprovalAbove || DEFAULT_GUARDRAILS.requireApprovalAbove))
  }
}

// Check if an action violates guardrails
export async function checkActionAgainstGuardrails(
  brandId: string, 
  actionType: string, 
  actionDetails: any,
  currentMetrics: any
): Promise<{ allowed: boolean; violations: string[]; riskLevel: 'low' | 'medium' | 'high' }> {
  
  const { data: guardrailsData } = await supabase
    .from('brand_guardrails')
    .select('*')
    .eq('brand_id', brandId)
    .single()

  const guardrails = guardrailsData?.settings || DEFAULT_GUARDRAILS
  const violations: string[] = []
  let riskLevel: 'low' | 'medium' | 'high' = 'low'

  // Check budget limits
  if (actionType === 'budget_increase') {
    const newDailyBudget = actionDetails.newBudget || 0
    if (newDailyBudget > guardrails.budgetLimits.dailyMax) {
      violations.push(`Daily budget increase to $${newDailyBudget} exceeds limit of $${guardrails.budgetLimits.dailyMax}`)
      riskLevel = 'high'
    }
  }

  // Check ROAS requirements
  if (actionDetails.projectedROAS && actionDetails.projectedROAS < guardrails.minROAS) {
    violations.push(`Projected ROAS of ${actionDetails.projectedROAS.toFixed(2)}x is below minimum of ${guardrails.minROAS}x`)
    riskLevel = 'medium'
  }

  // Check CPA limits
  if (actionDetails.projectedCPA && actionDetails.projectedCPA > guardrails.maxCPA) {
    violations.push(`Projected CPA of $${actionDetails.projectedCPA} exceeds maximum of $${guardrails.maxCPA}`)
    riskLevel = 'medium'
  }

  // Check risk tolerance
  if (guardrails.riskTolerance === 'low' && actionType === 'audience_expansion') {
    violations.push('Audience expansion not allowed with low risk tolerance setting')
    riskLevel = 'medium'
  }

  // Determine if action requires approval
  const actionValue = actionDetails.budgetIncrease || actionDetails.estimatedImpact || 0
  if (actionValue > guardrails.requireApprovalAbove) {
    violations.push(`Action value of $${actionValue} requires manual approval (threshold: $${guardrails.requireApprovalAbove})`)
    riskLevel = 'high'
  }

  return {
    allowed: violations.length === 0,
    violations,
    riskLevel
  }
}
