import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mail, CheckCircle, AlertCircle, RefreshCw, Key, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import apiService from '../services/api'

const EmailVerification = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendDisabled, setResendDisabled] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [showManualVerification, setShowManualVerification] = useState(false)

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email)
    }
    if (location.state?.verificationToken) {
      setVerificationToken(location.state.verificationToken)
      setShowManualVerification(true)
    }
  }, [location.state])

  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    } else {
      setResendDisabled(false)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleResendVerification = async () => {
    if (resendDisabled) return

    setIsResending(true)
    try {
      const response = await apiService.auth.resendVerification({ email })
      
      if (response.message) {
        toast.success('Verification email resent! Check your inbox.')
        setResendDisabled(true)
        setCountdown(300) // 5 minutes cooldown
        
        // Update verification token if provided
        if (response.verificationToken) {
          setVerificationToken(response.verificationToken)
          setShowManualVerification(true)
        }
      }
    } catch (error) {
      toast.error('Failed to resend verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const handleManualVerification = async () => {
    if (!verificationToken.trim()) {
      toast.error('Please enter the verification token')
      return
    }

    setIsVerifying(true)
    try {
      const response = await apiService.auth.verifyEmail({ 
        email, 
        verificationToken: verificationToken.trim() 
      })
      
      if (response.message) {
        toast.success('Email verified successfully! You can now log in.')
        navigate('/login')
      }
    } catch (error) {
      toast.error(error.message || 'Verification failed. Please check your token.')
    } finally {
      setIsVerifying(false)
    }
  }

  const copyToken = () => {
    navigator.clipboard.writeText(verificationToken)
    toast.success('Token copied to clipboard!')
  }

  const handleGoToLogin = () => {
    navigate('/login')
  }

  const handleGoToRegister = () => {
    navigate('/register')
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <Mail className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent a verification email to
          </p>
          <p className="mt-1 text-center text-sm font-medium text-primary-600">
            {email}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              Check Your Email
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Click the verification link in your email to activate your account
            </p>
          </div>

          {/* Manual Verification Section */}
          {showManualVerification && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start space-x-3">
                <Key className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-800">
                    Manual Verification Available
                  </h4>
                  <p className="mt-1 text-sm text-blue-700">
                    If you didn't receive the email, you can verify manually using this token:
                  </p>
                  <div className="mt-3 flex items-center space-x-2">
                    <input
                      type="text"
                      value={verificationToken}
                      onChange={(e) => setVerificationToken(e.target.value)}
                      className="flex-1 px-3 py-2 border border-blue-300 rounded-md text-sm font-mono bg-white"
                      placeholder="Enter verification token"
                    />
                    <button
                      onClick={copyToken}
                      className="p-2 text-blue-600 hover:text-blue-800"
                      title="Copy token"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleManualVerification}
                    disabled={isVerifying || !verificationToken.trim()}
                    className="mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Email'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-medium">1</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  Check your email inbox for a message from JUST App
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-medium">2</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  Click the "Verify Email" button or link in the email
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-medium">3</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  Or use the manual verification token above
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Didn't receive the email?
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>• Check your spam/junk folder</p>
                  <p>• Make sure the email address is correct</p>
                  <p>• Wait a few minutes for delivery</p>
                  <p>• Use manual verification token above</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleResendVerification}
              disabled={resendDisabled || isResending}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <>
                  <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Resending...
                </>
              ) : resendDisabled ? (
                `Resend available in ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`
              ) : (
                <>
                  <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
                  Resend Verification Email
                </>
              )}
            </button>

            <button
              onClick={handleGoToLogin}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              I've Verified My Email - Sign In
            </button>

            <button
              onClick={handleGoToRegister}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Create Different Account
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact support at{' '}
            <a href="mailto:support@just-app.ng" className="text-primary-600 hover:text-primary-500">
              support@just-app.ng
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default EmailVerification
