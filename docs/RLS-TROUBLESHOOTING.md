# Troubleshooting Row Level Security (RLS) Issues

## Common Issues After Enabling RLS

When you first enable Row Level Security (RLS) on your Supabase tables, you might encounter issues with your application not being able to access data. This is a common problem and usually happens because:

1. The policies are too restrictive
2. The authentication flow in your application isn't properly integrated with Supabase's RLS system
3. The JWT token isn't being properly passed to Supabase

## Quick Fix: Apply More Permissive Policies

We've created a SQL script that implements more permissive policies while still maintaining security. To run this script:

1. Log in to your Supabase dashboard
2. Navigate to the "SQL Editor" section
3. Open the file `scripts/fix_rls_policies.sql` from your project
4. Run the script

This script:
- Drops the existing restrictive policies
- Creates separate policies for read and write operations
- Allows all users to read data (which is usually fine for dashboard applications)
- Restricts write operations to authenticated users only

## If You're Still Having Issues

If the more permissive policies don't solve the problem, you have a few options:

### Option 1: Check Your Authentication Flow

Make sure your application is properly authenticating with Supabase:

1. Check that you're using the latest Supabase client
2. Verify that the JWT token is being properly passed in requests
3. Look at the network requests in your browser's developer tools to see if there are any authentication errors

### Option 2: Temporarily Disable RLS

As a last resort, you can temporarily disable RLS to restore functionality while you troubleshoot:

```sql
ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_data_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_connections DISABLE ROW LEVEL SECURITY;
```

These commands are included (commented out) in the `fix_rls_policies.sql` script.

### Option 3: Check for Service Role Usage

If your application is using a service role to access Supabase, you need to make sure it's properly configured:

1. Check that you're using the correct service role key
2. Verify that the service role has the necessary permissions
3. Consider using the `auth.uid()` function in your policies instead of `auth.role()`

## Long-Term Solution: Implement Proper RLS Policies

Once your application is working again, you should implement proper RLS policies that:

1. Are specific to your application's needs
2. Restrict access based on user roles or data ownership
3. Are thoroughly tested before deployment

Example of a more specific policy:

```sql
CREATE POLICY "Users can only access their own brands"
  ON public.brands
  FOR ALL
  USING (auth.uid() = user_id);
```

## Getting Help

If you continue to have issues with RLS, you can:

1. Check the [Supabase documentation on Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
2. Post a question on the [Supabase GitHub Discussions](https://github.com/supabase/supabase/discussions)
3. Join the [Supabase Discord](https://discord.supabase.com/) for community support 