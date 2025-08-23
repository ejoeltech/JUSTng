import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, Trash2, Download, Upload, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import offlineQueueService from '../services/offlineQueue'
import apiService from '../services/api'

const OfflineQueueManager = () => {
  const [queueStats, setQueueStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    retryCount: 0
  })
  const [queueItems, setQueueItems] = useState([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Initialize offline queue monitoring
    offlineQueueService.initializeMonitoring(apiService)

    // Update stats and items
    updateQueueInfo()

    // Listen for queue changes
    const handleItemAdded = () => updateQueueInfo()
    const handleItemRemoved = () => updateQueueInfo()
    const handleItemUpdated = () => updateQueueInfo()

    offlineQueueService.addListener('itemAdded', handleItemAdded)
    offlineQueueService.addListener('itemRemoved', handleItemRemoved)
    offlineQueueService.addListener('itemUpdated', handleItemUpdated)

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Update queue info periodically
    const interval = setInterval(updateQueueInfo, 5000)

    return () => {
      offlineQueueService.removeListener('itemAdded', handleItemAdded)
      offlineQueueService.removeListener('itemRemoved', handleItemRemoved)
      offlineQueueService.removeListener('itemUpdated', handleItemUpdated)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const updateQueueInfo = () => {
    setQueueStats(offlineQueueService.getQueueStats())
    setQueueItems(offlineQueueService.getQueue())
  }

  const handleProcessQueue = async () => {
    setIsProcessing(true)
    try {
      await offlineQueueService.processQueue(apiService)
    } finally {
      setIsProcessing(false)
      updateQueueInfo()
    }
  }

  const handleRetryFailed = () => {
    offlineQueueService.retryFailedItems()
    updateQueueInfo()
  }

  const handleClearFailed = () => {
    offlineQueueService.clearFailedItems()
    updateQueueInfo()
  }

  const handleExportQueue = () => {
    offlineQueueService.exportQueue()
  }

  const handleImportQueue = (event) => {
    const file = event.target.files[0]
    if (file) {
      offlineQueueService.importQueue(file)
        .then(() => updateQueueInfo())
        .catch(error => console.error('Import failed:', error))
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (queueStats.total === 0 && isOnline) {
    return null // Don't show if no offline items and online
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          <h3 className="text-lg font-semibold text-gray-900">
            Offline Queue Manager
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{queueStats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{queueStats.pending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{queueStats.processing}</div>
          <div className="text-sm text-gray-600">Processing</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{queueStats.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{queueStats.retryCount}</div>
          <div className="text-sm text-gray-600">Retries</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={handleProcessQueue}
          disabled={!isOnline || queueStats.pending === 0 || isProcessing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>{isProcessing ? 'Processing...' : 'Process Queue'}</span>
        </button>

        {queueStats.failed > 0 && (
          <>
            <button
              onClick={handleRetryFailed}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry Failed</span>
            </button>

            <button
              onClick={handleClearFailed}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Failed</span>
            </button>
          </>
        )}

        <button
          onClick={handleExportQueue}
          disabled={queueStats.total === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>

        <label className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
          <Upload className="h-4 w-4" />
          <span>Import</span>
          <input
            type="file"
            accept=".json"
            onChange={handleImportQueue}
            className="hidden"
          />
        </label>
      </div>

      {/* Queue Items */}
      {queueItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Queue Items</h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {queueItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(item.status)}`}
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <div className="font-medium">{item.data.title || 'Untitled Report'}</div>
                    <div className="text-sm opacity-75">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                    {item.lastError && (
                      <div className="text-sm text-red-600 mt-1">
                        Error: {item.lastError}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {item.retryCount > 0 && (
                    <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                      {item.retryCount} retries
                    </span>
                  )}
                  <span className="text-xs font-medium capitalize">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offline Notice */}
      {!isOnline && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <div className="font-medium text-yellow-800">You're currently offline</div>
              <div className="text-sm text-yellow-700">
                New reports will be saved locally and synced when you're back online.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Status */}
      {queueStats.pending > 0 && isOnline && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <div>
              <div className="font-medium text-blue-800">Offline reports ready to sync</div>
              <div className="text-sm text-blue-700">
                {queueStats.pending} report(s) will be automatically synced or click "Process Queue" to sync now.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OfflineQueueManager
