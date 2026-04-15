// lib/diagnostics.ts - Complete System Diagnostic

export class SystemDiagnostics {
  results: {
    environment: any;
    supabase: any;
    network: any;
    storage: any;
    errors: string[];
  };

  constructor() {
    this.results = {
      environment: {},
      supabase: {},
      network: {},
      storage: {},
      errors: []
    };
  }

  async runAll() {
    console.log('🔍 [DIAGNOSTICS] Starting deep system diagnostics...');
    
    this.checkEnvironment();
    await this.checkSupabase();
    await this.checkNetwork();
    this.checkStorage();
    
    const issues = this.displayResults();
    return { results: this.results, criticalIssues: issues };
  }

  checkEnvironment() {
    console.log('📊 [DIAGNOSTICS] Checking environment...');
    
    this.results.environment = {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
      origin: typeof window !== 'undefined' ? window.location.origin : 'server',
      protocol: typeof window !== 'undefined' ? window.location.protocol : 'server',
      isLocalhost: typeof window !== 'undefined' ? window.location.hostname === 'localhost' || window.location.hostname.includes('v0.') : false,
      isProduction: typeof window !== 'undefined' ? !window.location.hostname.includes('localhost') && !window.location.hostname.includes('v0.') : false,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      cookiesEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : false,
      onLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
      
      envVars: {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NODE_ENV: process.env.NODE_ENV,
        urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      }
    };
    
    console.log('✅ [DIAGNOSTICS] Environment:', this.results.environment);
  }

  async checkSupabase() {
    console.log('🗄️  [DIAGNOSTICS] Checking Supabase connection...');
    
    try {
      const { createBrowserClient } = await import('@supabase/ssr');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      if (!supabaseUrl || !supabaseKey) {
        this.results.supabase = {
          error: 'Missing credentials',
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        };
        this.results.errors.push('Missing Supabase credentials');
        return;
      }

      const supabase = createBrowserClient(supabaseUrl, supabaseKey);
      
      this.results.supabase.clientExists = true;
      
      // Test connection
      const { data, error } = await supabase.auth.getSession();
      
      this.results.supabase = {
        ...this.results.supabase,
        connectionTest: !error,
        hasSession: !!data?.session,
        error: error?.message,
        canQuery: false
      };
      
      // Test database query
      try {
        const { error: queryError } = await supabase
          .from('participants')
          .select('count')
          .limit(1);
        
        this.results.supabase.canQuery = !queryError;
        if (queryError) {
          this.results.supabase.queryError = queryError.message;
        }
      } catch (e: any) {
        this.results.supabase.queryError = e.message;
      }
    } catch (error: any) {
      this.results.supabase.importError = error.message;
      this.results.errors.push(`Supabase import failed: ${error.message}`);
    }
    
    console.log('✅ [DIAGNOSTICS] Supabase:', this.results.supabase);
  }

  async checkNetwork() {
    console.log('🌐 [DIAGNOSTICS] Checking network connectivity...');
    
    const tests = [];
    
    // Test API routes
    tests.push(this.testEndpoint('Health Check', '/api/health'));
    
    const results = await Promise.allSettled(tests);
    
    this.results.network.tests = results.map((r, i) => ({
      name: 'API Health',
      status: r.status,
      result: r.status === 'fulfilled' ? r.value : r.reason
    }));
    
    console.log('✅ [DIAGNOSTICS] Network:', this.results.network);
  }

  async testEndpoint(name: string, url: string, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(5000)
      });
      
      return {
        name,
        success: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error: any) {
      return {
        name,
        success: false,
        error: error.message
      };
    }
  }

  checkStorage() {
    console.log('💾 [DIAGNOSTICS] Checking storage...');
    
    if (typeof window === 'undefined') {
      this.results.storage = { server: true };
      return;
    }

    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, 'test');
      const canRead = localStorage.getItem(testKey) === 'test';
      localStorage.removeItem(testKey);
      
      this.results.storage = {
        localStorage: canRead,
        sessionStorage: !!window.sessionStorage,
        cookies: navigator.cookieEnabled,
        hasAuthToken: !!localStorage.getItem('flowchain-auth-token'),
      };
    } catch (error: any) {
      this.results.storage = {
        error: error.message,
        available: false
      };
      this.results.errors.push(`Storage test failed: ${error.message}`);
    }
    
    console.log('✅ [DIAGNOSTICS] Storage:', this.results.storage);
  }

  displayResults() {
    console.log('\n📋 [DIAGNOSTICS] RESULTS:');
    console.log('='.repeat(50));
    console.table(this.results);
    console.log('='.repeat(50));
    
    const criticalIssues: string[] = [];
    
    if (!this.results.environment.envVars.NEXT_PUBLIC_SUPABASE_URL) {
      criticalIssues.push('❌ CRITICAL: Supabase URL not found in environment');
    }
    
    if (!this.results.supabase.clientExists) {
      criticalIssues.push('❌ CRITICAL: Supabase client not initialized');
    }
    
    if (!this.results.supabase.connectionTest) {
      criticalIssues.push('❌ CRITICAL: Cannot connect to Supabase');
    }
    
    if (!this.results.storage.localStorage && typeof window !== 'undefined') {
      criticalIssues.push('⚠️  WARNING: localStorage not available');
    }
    
    if (criticalIssues.length > 0) {
      console.error('\n🚨 [DIAGNOSTICS] CRITICAL ISSUES FOUND:');
      criticalIssues.forEach(issue => console.error(issue));
    } else {
      console.log('\n✅ [DIAGNOSTICS] All systems operational');
    }
    
    return criticalIssues;
  }
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__runDiagnostics = async () => {
    const diagnostics = new SystemDiagnostics();
    const results = await diagnostics.runAll();
    (window as any).__diagnostics = results;
    return results;
  };
}
