import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseISO, endOfDay, format, isValid, subDays } from 'date-fns'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const brandId = searchParams.get('brandId')

  console.log('Received sessions request:', { from, to, brandId })

  if (!from || !to || !brandId) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    // Parse and validate date parameters
    let fromDate, toDate, adjustedToDate;
    
    try {
      fromDate = parseISO(from);
      toDate = parseISO(to);
      
      if (!isValid(fromDate) || !isValid(toDate)) {
        throw new Error('Invalid date format');
      }
      
      // Adjust the end date to include the full day (up to 23:59:59)
      adjustedToDate = endOfDay(toDate);
      
      console.log('Date range parsed successfully:');
      console.log(`From: ${format(fromDate, 'yyyy-MM-dd HH:mm:ss')}`);
      console.log(`To (adjusted): ${format(adjustedToDate, 'yyyy-MM-dd HH:mm:ss')}`);
    } catch (error) {
      console.error('Error parsing date parameters:', error);
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    
    // Validate brandId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(brandId)) {
      console.error('Invalid UUID format for brandId:', brandId)
      return NextResponse.json({ 
        error: 'Invalid brand ID format', 
        details: 'Brand ID must be a valid UUID'
      }, { status: 400 })
    }
    
    // Get active platform connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .single()

    if (!connection) {
      console.log('No active connection found')
      return NextResponse.json({
        sessionCount: 0,
        uniqueVisitors: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        sessionGrowth: 0,
        visitorGrowth: 0,
        sessionsByDay: []
      })
    }

    console.log('Found connection:', connection.id)

    // Format dates for database query
    const formattedFromDate = format(fromDate, 'yyyy-MM-dd');
    const formattedToDate = format(adjustedToDate, 'yyyy-MM-dd');
    
    console.log('Querying sessions with date range:');
    console.log(`From: ${formattedFromDate}`);
    console.log(`To: ${formattedToDate}`);

    // Fetch sessions from Supabase for current period
    const { data: sessions, error: sessionsError } = await supabase
      .from('shopify_sessions')
      .select('*')
      .eq('connection_id', connection.id)
      .gte('date', formattedFromDate)
      .lte('date', formattedToDate)
      .order('date', { ascending: true })

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      throw sessionsError;
    }

    console.log(`Found ${sessions?.length || 0} session records for current period`)
    
    // Calculate previous period date range
    const periodLengthInDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const previousFromDate = subDays(fromDate, periodLengthInDays);
    const previousToDate = subDays(toDate, periodLengthInDays);
    const formattedPreviousFromDate = format(previousFromDate, 'yyyy-MM-dd');
    const formattedPreviousToDate = format(endOfDay(previousToDate), 'yyyy-MM-dd');
    
    console.log('Querying sessions for previous period:');
    console.log(`Previous From: ${formattedPreviousFromDate}`);
    console.log(`Previous To: ${formattedPreviousToDate}`);
    
    // Fetch sessions from Supabase for previous period
    const { data: previousSessions, error: previousSessionsError } = await supabase
      .from('shopify_sessions')
      .select('*')
      .eq('connection_id', connection.id)
      .gte('date', formattedPreviousFromDate)
      .lte('date', formattedPreviousToDate)
    
    if (previousSessionsError) {
      console.error('Error fetching previous period sessions:', previousSessionsError);
      // Continue with current period data only
    }
    
    console.log(`Found ${previousSessions?.length || 0} session records for previous period`)

    // Calculate current period metrics
    const currentSessionCount = sessions?.reduce((sum: number, session: any) => sum + (session.session_count || 0), 0) || 0;
    const currentUniqueVisitors = sessions?.reduce((sum: number, session: any) => sum + (session.unique_visitors || 0), 0) || 0;
    const currentBounceRate = sessions?.length ? 
      sessions.reduce((sum: number, session: any) => sum + (session.bounce_rate || 0), 0) / sessions.length : 0;
    const currentAvgSessionDuration = sessions?.length ? 
      sessions.reduce((sum: number, session: any) => sum + (session.avg_session_duration || 0), 0) / sessions.length : 0;
    
    // Calculate previous period metrics
    const previousSessionCount = previousSessions?.reduce((sum: number, session: any) => sum + (session.session_count || 0), 0) || 0;
    const previousUniqueVisitors = previousSessions?.reduce((sum: number, session: any) => sum + (session.unique_visitors || 0), 0) || 0;
    
    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };
    
    const sessionGrowth = calculateGrowth(currentSessionCount, previousSessionCount);
    const visitorGrowth = calculateGrowth(currentUniqueVisitors, previousUniqueVisitors);
    
    console.log('Growth calculations:', {
      sessionGrowth,
      visitorGrowth
    });

    // Format sessions by day for chart
    const sessionsByDay = sessions?.map((session: any) => ({
      date: session.date,
      sessions: session.session_count || 0,
      visitors: session.unique_visitors || 0,
      value: session.session_count || 0 // For compatibility with MetricCard
    })) || [];

    // Return the metrics
    const metrics = {
      sessionCount: currentSessionCount,
      uniqueVisitors: currentUniqueVisitors,
      bounceRate: currentBounceRate,
      avgSessionDuration: currentAvgSessionDuration,
      sessionGrowth,
      visitorGrowth,
      sessionsByDay
    };

    console.log('Calculated session metrics:', {
      sessionCount: metrics.sessionCount,
      uniqueVisitors: metrics.uniqueVisitors,
      sessionGrowth: metrics.sessionGrowth,
      visitorGrowth: metrics.visitorGrowth
    });

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Error fetching session metrics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch session metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 