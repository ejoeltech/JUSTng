// Draft Service for Auto-saving Incident Reports
class DraftService {
  constructor() {
    this.storageKey = 'just_incident_drafts'
    this.maxDrafts = 10 // Maximum number of drafts to keep
    this.autoSaveInterval = 30000 // Auto-save every 30 seconds
    this.draftId = null
    this.autoSaveTimer = null
  }

  // Generate unique draft ID
  generateDraftId() {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get all drafts from localStorage
  getAllDrafts() {
    try {
      const drafts = localStorage.getItem(this.storageKey)
      return drafts ? JSON.parse(drafts) : []
    } catch (error) {
      console.error('Error reading drafts from localStorage:', error)
      return []
    }
  }

  // Save draft to localStorage
  saveDraft(draftData) {
    try {
      const drafts = this.getAllDrafts()
      const timestamp = new Date().toISOString()
      
      // If this is a new draft, generate ID
      if (!draftData.id) {
        draftData.id = this.generateDraftId()
        draftData.createdAt = timestamp
      }
      
      draftData.updatedAt = timestamp
      draftData.lastSaved = timestamp

      // Check if draft already exists
      const existingIndex = drafts.findIndex(draft => draft.id === draftData.id)
      
      if (existingIndex >= 0) {
        // Update existing draft
        drafts[existingIndex] = { ...drafts[existingIndex], ...draftData }
      } else {
        // Add new draft
        drafts.unshift(draftData)
        
        // Remove oldest drafts if exceeding limit
        if (drafts.length > this.maxDrafts) {
          drafts.splice(this.maxDrafts)
        }
      }

      localStorage.setItem(this.storageKey, JSON.stringify(drafts))
      
      // Store current draft ID for auto-save
      this.draftId = draftData.id
      
      return draftData.id
    } catch (error) {
      console.error('Error saving draft:', error)
      return null
    }
  }

  // Get draft by ID
  getDraft(draftId) {
    try {
      const drafts = this.getAllDrafts()
      return drafts.find(draft => draft.id === draftId) || null
    } catch (error) {
      console.error('Error getting draft:', error)
      return null
    }
  }

  // Get most recent draft
  getLatestDraft() {
    try {
      const drafts = this.getAllDrafts()
      return drafts.length > 0 ? drafts[0] : null
    } catch (error) {
      console.error('Error getting latest draft:', error)
      return null
    }
  }

  // Delete draft by ID
  deleteDraft(draftId) {
    try {
      const drafts = this.getAllDrafts()
      const filteredDrafts = drafts.filter(draft => draft.id !== draftId)
      localStorage.setItem(this.storageKey, JSON.stringify(filteredDrafts))
      
      // Clear current draft ID if it was deleted
      if (this.draftId === draftId) {
        this.draftId = null
      }
      
      return true
    } catch (error) {
      console.error('Error deleting draft:', error)
      return false
    }
  }

  // Delete all drafts
  deleteAllDrafts() {
    try {
      localStorage.removeItem(this.storageKey)
      this.draftId = null
      return true
    } catch (error) {
      console.error('Error deleting all drafts:', error)
      return false
    }
  }

  // Start auto-save for a draft
  startAutoSave(draftData, onSave) {
    // Clear existing timer
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
    }

    // Save initial draft
    this.saveDraft(draftData)

    // Set up auto-save interval
    this.autoSaveTimer = setInterval(() => {
      if (this.draftId && onSave) {
        const updatedData = onSave()
        if (updatedData) {
          this.saveDraft(updatedData)
        }
      }
    }, this.autoSaveInterval)
  }

  // Stop auto-save
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }

  // Get draft statistics
  getDraftStats() {
    try {
      const drafts = this.getAllDrafts()
      const totalSize = JSON.stringify(drafts).length
      
      return {
        count: drafts.length,
        totalSize: this.formatBytes(totalSize),
        oldestDraft: drafts.length > 0 ? drafts[drafts.length - 1].createdAt : null,
        newestDraft: drafts.length > 0 ? drafts[0].createdAt : null
      }
    } catch (error) {
      console.error('Error getting draft stats:', error)
      return { count: 0, totalSize: '0 B', oldestDraft: null, newestDraft: null }
    }
  }

  // Format bytes to human readable format
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Export drafts (for backup)
  exportDrafts() {
    try {
      const drafts = this.getAllDrafts()
      const dataStr = JSON.stringify(drafts, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(dataBlob)
      link.download = `just_drafts_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      
      return true
    } catch (error) {
      console.error('Error exporting drafts:', error)
      return false
    }
  }

  // Import drafts (for recovery)
  importDrafts(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const importedDrafts = JSON.parse(e.target.result)
          
          if (!Array.isArray(importedDrafts)) {
            reject(new Error('Invalid draft file format'))
            return
          }

          // Validate draft structure
          const validDrafts = importedDrafts.filter(draft => 
            draft.id && draft.createdAt && draft.updatedAt
          )

          if (validDrafts.length === 0) {
            reject(new Error('No valid drafts found in file'))
            return
          }

          // Merge with existing drafts
          const existingDrafts = this.getAllDrafts()
          const mergedDrafts = [...existingDrafts, ...validDrafts]
          
          // Remove duplicates and sort by updatedAt
          const uniqueDrafts = mergedDrafts
            .filter((draft, index, self) => 
              index === self.findIndex(d => d.id === draft.id)
            )
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, this.maxDrafts)

          localStorage.setItem(this.storageKey, JSON.stringify(uniqueDrafts))
          
          resolve({
            imported: validDrafts.length,
            total: uniqueDrafts.length
          })
        } catch (error) {
          reject(new Error('Failed to parse draft file'))
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  // Clean up old drafts (older than 30 days)
  cleanupOldDrafts() {
    try {
      const drafts = this.getAllDrafts()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const recentDrafts = drafts.filter(draft => 
        new Date(draft.updatedAt) > thirtyDaysAgo
      )
      
      if (recentDrafts.length < drafts.length) {
        localStorage.setItem(this.storageKey, JSON.stringify(recentDrafts))
        return drafts.length - recentDrafts.length
      }
      
      return 0
    } catch (error) {
      console.error('Error cleaning up old drafts:', error)
      return 0
    }
  }
}

// Create singleton instance
const draftService = new DraftService()

export default draftService
