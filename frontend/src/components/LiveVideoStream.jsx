import { useState, useRef, useEffect } from 'react'
import { Camera, Video, Square, Play, Pause, RotateCcw, Download, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const LiveVideoStream = ({ onVideoCaptured, isRecording, onRecordingChange }) => {
  const [stream, setStream] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordedChunks, setRecordedChunks] = useState([])
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState(null)
  const [permissionsGranted, setPermissionsGranted] = useState(false)
  
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingIntervalRef = useRef(null)

  // Request camera permissions and start stream
  const startStream = async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        },
        audio: true
      })
      
      setStream(mediaStream)
      setPermissionsGranted(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      
      toast.success('Camera access granted')
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Camera access denied. Please check permissions.')
      toast.error('Failed to access camera')
    }
  }

  // Stop stream and release camera
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setPermissionsGranted(false)
      
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }

  // Start recording
  const startRecording = () => {
    if (!stream) {
      toast.error('Please start camera first')
      return
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      setRecordedChunks([])
      setRecordingTime(0)
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data])
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' })
        setRecordedBlob(blob)
        
        // Create a file object for upload
        const file = new File([blob], `incident_video_${Date.now()}.webm`, {
          type: 'video/webm'
        })
        
        if (onVideoCaptured) {
          onVideoCaptured(file)
        }
      }
      
      mediaRecorder.start(1000) // Collect data every second
      setRecording(true)
      onRecordingChange?.(true)
      
      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      toast.success('Recording started')
    } catch (err) {
      console.error('Error starting recording:', err)
      toast.error('Failed to start recording')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      onRecordingChange?.(false)
      
      // Stop recording timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      
      toast.success('Recording stopped')
    }
  }

  // Pause/Resume recording
  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause()
        toast.info('Recording paused')
      } else if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume()
        toast.info('Recording resumed')
      }
    }
  }

  // Reset recording
  const resetRecording = () => {
    setRecordedBlob(null)
    setRecordedChunks([])
    setRecordingTime(0)
    toast.info('Recording reset')
  }

  // Download recorded video
  const downloadVideo = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `incident_video_${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Video downloaded')
    }
  }

  // Format recording time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream()
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Camera Preview */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        {!permissionsGranted ? (
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center text-white">
              <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Camera Access Required</p>
              <p className="text-sm text-gray-400 mb-4">
                Click "Start Camera" to begin recording
              </p>
              <button
                onClick={startStream}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
              >
                Start Camera
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video"
            />
            
            {/* Recording Overlay */}
            {recording && (
              <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span>REC {formatTime(recordingTime)}</span>
              </div>
            )}
            
            {/* Camera Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-4 py-2">
                {!recording ? (
                  <button
                    onClick={startRecording}
                    className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700"
                    title="Start Recording"
                  >
                    <Video className="h-5 w-5" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={togglePause}
                      className="bg-yellow-600 text-white p-3 rounded-full hover:bg-yellow-700"
                      title="Pause/Resume"
                    >
                      <Pause className="h-5 w-5" />
                    </button>
                    <button
                      onClick={stopRecording}
                      className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700"
                      title="Stop Recording"
                    >
                      <Square className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      {permissionsGranted && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={stopStream}
              className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Stop Camera
            </button>
          </div>
          
          {recording && (
            <div className="text-sm text-gray-600">
              Recording: {formatTime(recordingTime)}
            </div>
          )}
        </div>
      )}

      {/* Recorded Video Preview */}
      {recordedBlob && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Recorded Video</h4>
            <video
              src={URL.createObjectURL(recordedBlob)}
              controls
              className="w-full rounded-lg"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={downloadVideo}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
            
            <button
              onClick={resetRecording}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Recording Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Ensure good lighting for clear video quality</li>
          <li>• Keep the camera steady during recording</li>
          <li>• Speak clearly to capture audio evidence</li>
          <li>• Record for at least 10-15 seconds for context</li>
          <li>• Include relevant details in your description</li>
        </ul>
      </div>
    </div>
  )
}

export default LiveVideoStream
