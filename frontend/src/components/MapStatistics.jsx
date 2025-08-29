import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  MapPin, 
  AlertTriangle, 
  Clock, 
  Download,
  Filter,
  Search,
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react'
import { nigerianStates, getLGAsByStateId } from '../data/nigerianStates'

const MapStatistics = ({ 
  statistics, 
  filters, 
  onFilterChange, 
  onExport,
  onSearch,
  isVisible = true,
  onToggleVisibility
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchQuery)
    }
  }

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    if (onFilterChange) {
      onFilterChange(filterType, value)
    }
  }

  // Handle export
  const handleExport = (format) => {
    if (onExport) {
      onExport(format)
    }
  }

  // Get severity color
  const getSeverityColor = (severity) => {
    const colors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#F97316',
      critical: '#EF4444'
    }
    return colors[severity] || '#6B7280'
  }

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      reported: '#3B82F6',
      investigating: '#F59E0B',
      under_review: '#F97316',
      resolved: '#10B981',
      closed: '#6B7280'
    }
    return colors[status] || '#6B7280'
  }

  // Get incident type icon
  const getIncidentTypeIcon = (type) => {
    const icons = {
      harassment: <AlertTriangle className="h-4 w-4" />,
      assault: <AlertTriangle className="h-4 w-4" />,
      extortion: <TrendingUp className="h-4 w-4" />,
      false_accusation: <AlertTriangle className="h-4 w-4" />,
      unlawful_detention: <AlertTriangle className="h-4 w-4" />,
      property_damage: <AlertTriangle className="h-4 w-4" />,
      other: <AlertTriangle className="h-4 w-4" />
    }
    return icons[type] || icons.other
  }

  if (!isVisible) {
    return (
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={onToggleVisibility}
          className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
          title="Show Statistics"
        >
          <Eye className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    )
  }

  return (
    <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg max-w-sm w-96">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Map Statistics</h3>
        </div>
        <button
          onClick={onToggleVisibility}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="Hide Statistics"
        >
          <EyeOff className="h-4 w-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </form>
      </div>

      {/* Filter Toggle */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <Filter className="h-4 w-4" />
          <span>Advanced Filters</span>
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="p-4 border-b border-gray-200 space-y-3">
          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <select
              value={filters.severity || ''}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="investigating">Investigating</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* State Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <select
              value={filters.state || ''}
              onChange={(e) => handleFilterChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All States</option>
              {nigerianStates.map(state => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          {/* LGA Filter */}
          {filters.state && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Local Government Area
              </label>
              <select
                value={filters.lga || ''}
                onChange={(e) => handleFilterChange('lga', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All LGAs</option>
                {getLGAsByStateId(filters.state).map(lga => (
                  <option key={lga} value={lga}>
                    {lga}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={filters.dateRange || '30'}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="365">Last year</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => handleFilterChange('reset')}
            className="w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('severity')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'severity'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Severity
        </button>
        <button
          onClick={() => setActiveTab('location')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'location'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Location
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Total Incidents */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {statistics.total}
              </div>
              <div className="text-sm text-blue-700">Total Incidents</div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {statistics.byStatus?.resolved || 0}
                </div>
                <div className="text-xs text-green-700">Resolved</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">
                  {statistics.byStatus?.investigating || 0}
                </div>
                <div className="text-xs text-yellow-700">Investigating</div>
              </div>
            </div>

            {/* Clusters */}
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {statistics.clusters || 0}
              </div>
              <div className="text-xs text-purple-700">Incident Clusters</div>
            </div>

            {/* Export Options */}
            <div className="space-y-2">
              <button
                onClick={() => handleExport('json')}
                className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export as JSON</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export as CSV</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'severity' && (
          <div className="space-y-4">
            {/* Severity Breakdown */}
            {Object.entries(statistics.bySeverity || {}).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getSeverityColor(severity) }}
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {severity}
                  </span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {count}
                </div>
              </div>
            ))}

            {/* Status Breakdown */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Status Breakdown</h4>
              <div className="space-y-2">
                {Object.entries(statistics.byStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 capitalize">
                      {status.replace('_', ' ')}
                    </span>
                    <span className="font-medium text-gray-900">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'location' && (
          <div className="space-y-4">
            {/* Top States */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Top States</h4>
              <div className="space-y-2">
                {Object.entries(statistics.byState || {})
                  .filter(([_, data]) => data.count > 0)
                  .sort(([_, a], [__, b]) => b.count - a.count)
                  .slice(0, 5)
                  .map(([stateId, data]) => (
                    <div key={stateId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">
                        {data.name}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {data.count}
                        </span>
                        <div className="flex space-x-1">
                          {Object.entries(data.severity).map(([severity, count]) => (
                            count > 0 && (
                              <div
                                key={severity}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getSeverityColor(severity) }}
                                title={`${severity}: ${count}`}
                              />
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Date Range Info */}
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                Showing data for last
              </div>
              <div className="text-lg font-bold text-gray-900">
                {filters.dateRange} days
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MapStatistics
