import { Link } from 'react-router-dom'
import { Shield, Map, Video, Users, AlertTriangle, Smartphone } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const Home = () => {
  const { user } = useAuth()

  const features = [
    {
      icon: AlertTriangle,
      title: 'Real-time Reporting',
      description: 'Report police harassment incidents instantly with GPS location tracking.'
    },
    {
      icon: Video,
      title: 'Live Video Streaming',
      description: 'Stream live video evidence using advanced WebRTC technology.'
    },
    {
      icon: Map,
      title: 'Interactive Map',
      description: 'View all reported incidents on an interactive map with filtering options.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is encrypted and protected with enterprise-grade security.'
    },
    {
      icon: Smartphone,
      title: 'Mobile First',
      description: 'Optimized for mobile devices with offline support and GPS integration.'
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Join thousands of Nigerians working together for justice and accountability.'
    }
  ]

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Justice Under
          <span className="text-primary-600"> Surveillance Tech</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
          Report police harassment incidents in real-time. Capture evidence, track locations, 
          and build a safer Nigeria through technology and community.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          {user ? (
            <Link
              to="/report"
              className="btn-primary text-lg px-8 py-3"
            >
              Report Incident
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="btn-primary text-lg px-8 py-3"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="text-lg font-semibold leading-6 text-gray-900 hover:text-primary-600"
              >
                Sign In <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-primary-600">
            Powerful Features
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to report and track incidents
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <feature.icon className="h-5 w-5 flex-none text-primary-600" aria-hidden="true" />
                  {feature.title}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to make a difference?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-100">
              Join thousands of Nigerians who are already using JUST to report incidents 
              and build a safer community.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {user ? (
                <Link
                  to="/dashboard"
                  className="bg-white text-primary-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="bg-white text-primary-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Sign Up Now
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
