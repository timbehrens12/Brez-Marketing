import { createClient } from '@supabase/supabase-js';

// Get the Supabase URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Add more specific headers to fix Supabase API errors
const customFetch = (url: RequestInfo | URL, options: RequestInit = {}) => {
  // Ensure options.headers exists and convert to a proper Headers object
  options.headers = options.headers || {};
  
  // Create a Headers object if needed
  const headers = options.headers instanceof Headers
    ? options.headers
    : new Headers(options.headers as HeadersInit);
  
  // Add proper Accept header to fix 406 errors
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  
  // Add Content-Profile header if missing (helps with some Supabase operations)
  if (!headers.has('Content-Profile')) {
    headers.set('Content-Profile', 'public');
  }
  
  // Add Prefer header for returning minimal representation (helps with 406 errors)
  if (!headers.has('Prefer')) {
    headers.set('Prefer', 'return=minimal');
  }
  
  // Add apikey header explicitly to fix authentication issues
  const anonKey = supabaseAnonKey;
  if (anonKey && !headers.has('apikey')) {
    headers.set('apikey', anonKey);
  }
  
  // Add Authorization header if missing
  if (anonKey && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${anonKey}`);
  }
  
  // Set Content-Type for POST/PUT requests to help with 400 errors
  if ((options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') 
      && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Replace the headers in options
  options.headers = headers;
  
  // Log the request for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`Supabase request: ${url.toString()}`);
  }
  
  // Use the standard fetch with our enhanced options
  return fetch(url, options);
};

// Create the Supabase client with our custom fetch
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true
  },
  global: {
    fetch: customFetch
  }
});

export default supabase; 