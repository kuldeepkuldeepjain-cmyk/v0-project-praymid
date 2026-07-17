import { ArrowRight, TrendingUp, BarChart3, Shield, Zap, Target, DollarSign } from 'lucide-react'

export default function BinaryTradingLandingDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">FlowTrade</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-slate-400 hover:text-white transition">Markets</a>
            <a href="#" className="text-slate-400 hover:text-white transition">Features</a>
            <a href="#" className="text-slate-400 hover:text-white transition">Learn</a>
            <a href="#" className="text-slate-400 hover:text-white transition">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 text-slate-400 hover:text-white transition">Sign In</button>
            <button className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition">
              Start Trading
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="inline-block px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-6">
                <span className="text-cyan-400 text-sm font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                  Binary Trading Platform
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                Trade <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Smarter.</span> Profit <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Faster.</span>
              </h1>
              <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                Experience lightning-fast binary trading with real-time market data, advanced charting tools, and intelligent risk management. Turn market movements into profitable opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-bold text-lg hover:shadow-lg hover:shadow-cyan-500/50 transition transform hover:scale-105 flex items-center justify-center gap-2">
                  Open Free Account
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button className="px-8 py-4 border-2 border-slate-700 text-white rounded-lg font-bold text-lg hover:border-slate-500 transition">
                  Try Demo Account
                </button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-slate-800">
                <div>
                  <div className="text-3xl font-bold text-cyan-400">$2.5B</div>
                  <div className="text-sm text-slate-500 mt-1">Daily Volume</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-cyan-400">50K+</div>
                  <div className="text-sm text-slate-500 mt-1">Active Traders</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-cyan-400">95%</div>
                  <div className="text-sm text-slate-500 mt-1">Uptime</div>
                </div>
              </div>
            </div>

            {/* Hero Visual - Trading Interface Preview */}
            <div className="hidden md:block">
              <div className="relative">
                {/* Animated gradient orbs */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                
                {/* Mock Trading Chart */}
                <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-slate-400">BTC/USD</div>
                      <div className="text-2xl font-bold text-white">$42,350.50</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 text-sm font-semibold">+2.45%</div>
                      <div className="text-xs text-slate-500">24H Change</div>
                    </div>
                  </div>
                  
                  {/* Mini Chart */}
                  <div className="h-48 bg-gradient-to-t from-cyan-500/10 to-transparent rounded-lg p-4 mb-4 relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                      <polyline
                        points="0,70 25,65 50,55 75,60 100,50 125,45 150,55 175,40 200,35"
                        fill="none"
                        stroke="rgb(34, 197, 94)"
                        strokeWidth="2"
                      />
                      <polyline
                        points="0,70 25,65 50,55 75,60 100,50 125,45 150,55 175,40 200,35"
                        fill="url(#gradientFill)"
                        opacity="0.2"
                      />
                      <defs>
                        <linearGradient id="gradientFill" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgb(34, 197, 94)" />
                          <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  {/* Trading Options */}
                  <div className="grid grid-cols-2 gap-3">
                    <button className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-lg py-3 font-bold transition">
                      ↑ CALL
                    </button>
                    <button className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg py-3 font-bold transition">
                      ↓ PUT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Why Traders Choose FlowTrade</h2>
            <p className="text-xl text-slate-400">Everything you need to trade binary options like a pro</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 hover:border-cyan-500/50 transition">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Lightning-Fast Execution</h3>
              <p className="text-slate-400">Execute trades in milliseconds. Our ultra-low latency infrastructure ensures you never miss a market opportunity.</p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 hover:border-cyan-500/50 transition">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Advanced Charting</h3>
              <p className="text-slate-400">Professional-grade technical analysis tools with 50+ indicators. Analyze trends and make data-driven decisions.</p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 hover:border-cyan-500/50 transition">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Bank-Level Security</h3>
              <p className="text-slate-400">Military-grade encryption and 2FA protection. Your funds and data are always safe and secure.</p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 hover:border-cyan-500/50 transition">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Smart Risk Management</h3>
              <p className="text-slate-400">Set stop-loss and take-profit automatically. Protect your capital while maximizing profit potential.</p>
            </div>

            {/* Feature 5 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 hover:border-cyan-500/50 transition">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Competitive Payouts</h3>
              <p className="text-slate-400">Up to 95% payout rates. Earn more on every winning trade with our industry-leading returns.</p>
            </div>

            {/* Feature 6 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 hover:border-cyan-500/50 transition">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Real-Time Signals</h3>
              <p className="text-slate-400">AI-powered trading signals and market alerts. Stay ahead with predictive analytics and insights.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trading Markets Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Trade Across Multiple Markets</h2>
            <p className="text-xl text-slate-400">100+ assets. 24/7 trading. One platform.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { name: 'Cryptocurrencies', assets: '20+ Assets', color: 'from-orange-500 to-red-600' },
              { name: 'Forex Pairs', assets: '50+ Pairs', color: 'from-blue-500 to-cyan-600' },
              { name: 'Commodities', assets: '15+ Assets', color: 'from-yellow-500 to-orange-600' },
              { name: 'Indices', assets: '10+ Indices', color: 'from-purple-500 to-pink-600' },
            ].map((market, i) => (
              <div key={i} className="group p-8 rounded-xl bg-gradient-to-br border border-slate-700 hover:border-slate-600 transition cursor-pointer" style={{
                backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9)), linear-gradient(135deg, var(--tw-gradient-stops))`
              }}>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${market.color} mb-4 group-hover:shadow-lg transition`}></div>
                <h3 className="text-lg font-bold text-white mb-2">{market.name}</h3>
                <p className="text-slate-400 text-sm">{market.assets}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/50 rounded-2xl p-12 text-center overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-4">Ready to Start Trading?</h2>
              <p className="text-xl text-slate-300 mb-8">Join thousands of successful traders on FlowTrade. Open your account in minutes.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-bold text-lg hover:shadow-lg hover:shadow-cyan-500/50 transition transform hover:scale-105">
                  Create Account Now
                </button>
                <button className="px-8 py-4 border-2 border-cyan-500 text-cyan-400 rounded-lg font-bold text-lg hover:bg-cyan-500/10 transition">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">FlowTrade</span>
              </div>
              <p className="text-slate-400">The future of binary trading.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Markets</a></li>
                <li><a href="#" className="hover:text-white transition">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
                <li><a href="#" className="hover:text-white transition">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Disclaimer</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-500">
            <p>© 2025 FlowTrade. All rights reserved. | Disclaimer: Binary trading involves risk. Trade responsibly.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
