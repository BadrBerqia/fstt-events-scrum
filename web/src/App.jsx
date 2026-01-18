import { useState, useEffect } from 'react'

function App() {
  const [page, setPage] = useState('login')
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [categories, setCategories] = useState([])
  const [registrations, setRegistrations] = useState({})
  const [myRegistrations, setMyRegistrations] = useState([])
  const [myHistory, setMyHistory] = useState([])
  const [eventRegistrations, setEventRegistrations] = useState({})
  const [eventComments, setEventComments] = useState({})
  const [expandedEvent, setExpandedEvent] = useState(null)
  const [expandedComments, setExpandedComments] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [activeTab, setActiveTab] = useState('events')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [editingCategory, setEditingCategory] = useState(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [formData, setFormData] = useState({ name: '', email: '', password: '', is_admin: false })
  const [eventForm, setEventForm] = useState({ 
    title: '', 
    description: '', 
    location: '', 
    date: '', 
    category_id: '' 
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      fetchEvents()
      fetchCategories()
      if (!user.is_admin) {
        fetchMyRegistrations()
        fetchMyHistory()
      }
    }
  }, [user])

  useEffect(() => {
    if (user && events.length > 0 && !user.is_admin) {
      checkAllRegistrations()
    }
  }, [user, events])

  const fetchEvents = async () => {
    try {
      const response = await fetch('http://localhost:8000/events')
      const data = await response.json()
      setEvents(data)
    } catch (err) {
      console.error('Erreur chargement événements:', err)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/categories')
      const data = await response.json()
      setCategories(data)
    } catch (err) {
      console.error('Erreur chargement catégories:', err)
    }
  }

  const fetchMyRegistrations = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${user.id}/registrations`)
      const data = await response.json()
      setMyRegistrations(data)
    } catch (err) {
      console.error('Erreur chargement inscriptions:', err)
    }
  }

  const fetchMyHistory = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${user.id}/history`)
      const data = await response.json()
      setMyHistory(data)
    } catch (err) {
      console.error('Erreur chargement historique:', err)
    }
  }

  const fetchEventRegistrations = async (eventId) => {
    try {
      const response = await fetch(`http://localhost:8000/events/${eventId}/registrations`)
      const data = await response.json()
      setEventRegistrations(prev => ({ ...prev, [eventId]: data }))
    } catch (err) {
      console.error('Erreur chargement inscrits:', err)
    }
  }

  const fetchEventComments = async (eventId) => {
    try {
      const response = await fetch(`http://localhost:8000/events/${eventId}/comments`)
      const data = await response.json()
      setEventComments(prev => ({ ...prev, [eventId]: data }))
    } catch (err) {
      console.error('Erreur chargement commentaires:', err)
    }
  }

  const checkAllRegistrations = async () => {
    const regs = {}
    for (const event of events) {
      try {
        const response = await fetch(`http://localhost:8000/events/${event.id}/registration/${user.id}`)
        const data = await response.json()
        regs[event.id] = data.is_registered
      } catch (err) {
        regs[event.id] = false
      }
    }
    setRegistrations(regs)
  }

  const filteredEvents = selectedCategory 
    ? events.filter(event => event.category?.id === parseInt(selectedCategory))
    : events

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const response = await fetch(`http://localhost:8000/auth/register?is_admin=${formData.is_admin}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      })
      const data = await response.json()
      if (response.ok) {
        setMessage(`Compte ${formData.is_admin ? 'administrateur' : 'utilisateur'} créé! Vous pouvez maintenant vous connecter.`)
        setPage('login')
        setFormData({ name: '', email: '', password: '', is_admin: false })
      } else {
        setError(data.detail || 'Erreur lors de la création')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      })
      const data = await response.json()
      if (response.ok) {
        setUser(data.user)
        setMessage('')
      } else {
        setError(data.detail || 'Erreur de connexion')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const handleLogout = () => {
    setUser(null)
    setEvents([])
    setCategories([])
    setRegistrations({})
    setMyRegistrations([])
    setMyHistory([])
    setEventRegistrations({})
    setEventComments({})
    setFormData({ name: '', email: '', password: '', is_admin: false })
    setMessage('')
    setShowCreateForm(false)
    setEditingEvent(null)
    setEditingCategory(null)
    setNewCategoryName('')
    setActiveTab('events')
    setExpandedEvent(null)
    setExpandedComments(null)
    setSelectedCategory('')
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const response = await fetch('http://localhost:8000/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventForm,
          category_id: eventForm.category_id ? parseInt(eventForm.category_id) : null
        })
      })
      const data = await response.json()
      if (response.ok) {
        setMessage('Événement créé avec succès!')
        setEventForm({ title: '', description: '', location: '', date: '', category_id: '' })
        setShowCreateForm(false)
        fetchEvents()
      } else {
        setError(data.detail || 'Erreur lors de la création')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const handleEditClick = (event) => {
    setEditingEvent(event)
    setEventForm({
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      date: event.date.slice(0, 16),
      category_id: event.category?.id || ''
    })
    setShowCreateForm(false)
  }

  const handleUpdateEvent = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const response = await fetch(`http://localhost:8000/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventForm,
          category_id: eventForm.category_id ? parseInt(eventForm.category_id) : null
        })
      })
      const data = await response.json()
      if (response.ok) {
        setMessage('Événement modifié avec succès!')
        setEventForm({ title: '', description: '', location: '', date: '', category_id: '' })
        setEditingEvent(null)
        fetchEvents()
      } else {
        setError(data.detail || 'Erreur lors de la modification')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement?')) return
    
    setError('')
    setMessage('')
    try {
      const response = await fetch(`http://localhost:8000/events/${eventId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setMessage('Événement supprimé!')
        fetchEvents()
      } else {
        const data = await response.json()
        setError(data.detail || 'Erreur lors de la suppression')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const handleStatusChange = async (eventId, newStatus) => {
    setError('')
    setMessage('')
    try {
      const response = await fetch(`http://localhost:8000/events/${eventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (response.ok) {
        setMessage('Statut mis à jour!')
        fetchEvents()
        if (!user.is_admin) {
          fetchMyHistory()
        }
      } else {
        const data = await response.json()
        setError(data.detail || 'Erreur lors du changement de statut')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const handleRegisterToEvent = async (eventId) => {
    setError('')
    setMessage('')
    try {
      const response = await fetch(`http://localhost:8000/events/${eventId}/register?user_id=${user.id}`, {
        method: 'POST'
      })
      const data = await response.json()
      if (response.ok) {
        setMessage('Inscription réussie!')
        setRegistrations({ ...registrations, [eventId]: true })
        fetchEvents()
        fetchMyRegistrations()
      } else {
        setError(data.detail || 'Erreur lors de l\'inscription')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const handleCancelRegistration = async (registrationId) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette inscription?')) return
    
    setError('')
    setMessage('')
    try {
      const response = await fetch(`http://localhost:8000/registrations/${registrationId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setMessage('Inscription annulée!')
        fetchEvents()
        if (!user.is_admin) {
          fetchMyRegistrations()
          checkAllRegistrations()
        }
        if (expandedEvent) {
          fetchEventRegistrations(expandedEvent)
        }
      } else {
        const data = await response.json()
        setError(data.detail || 'Erreur lors de l\'annulation')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    
    setError('')
    setMessage('')
    try {
      const response = await fetch('http://localhost:8000/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      })
      const data = await response.json()
      if (response.ok) {
        setMessage('Catégorie créée!')
        setNewCategoryName('')
        fetchCategories()
      } else {
        setError(data.detail || 'Erreur lors de la création')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const handleUpdateCategory = async (categoryId) => {
    if (!editingCategory || !editingCategory.name.trim()) return
    
    setError('')
    setMessage('')
    try {
      const response = await fetch(`http://localhost:8000/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCategory.name.trim() })
      })
      const data = await response.json()
      if (response.ok) {
        setMessage('Catégorie modifiée!')
        setEditingCategory(null)
        fetchCategories()
        fetchEvents()
      } else {
        setError(data.detail || 'Erreur lors de la modification')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie?')) return
    
    setError('')
    setMessage('')
    try {
      const response = await fetch(`http://localhost:8000/categories/${categoryId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setMessage('Catégorie supprimée!')
        fetchCategories()
      } else {
        const data = await response.json()
        setError(data.detail || 'Erreur lors de la suppression')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const handleAddComment = async (eventId) => {
    if (!newComment.trim()) return
    
    setError('')
    setMessage('')
    try {
      const response = await fetch(`http://localhost:8000/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim(), user_id: user.id })
      })
      const data = await response.json()
      if (response.ok) {
        setMessage('Commentaire ajouté!')
        setNewComment('')
        fetchEventComments(eventId)
      } else {
        setError(data.detail || 'Erreur lors de l\'ajout')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const handleDeleteComment = async (commentId, eventId) => {
    if (!confirm('Supprimer ce commentaire?')) return
    
    setError('')
    setMessage('')
    try {
      const response = await fetch(`http://localhost:8000/comments/${commentId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setMessage('Commentaire supprimé!')
        fetchEventComments(eventId)
      } else {
        const data = await response.json()
        setError(data.detail || 'Erreur lors de la suppression')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    }
  }

  const toggleEventRegistrations = (eventId) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null)
    } else {
      setExpandedEvent(eventId)
      fetchEventRegistrations(eventId)
    }
  }

  const toggleEventComments = (eventId) => {
    if (expandedComments === eventId) {
      setExpandedComments(null)
    } else {
      setExpandedComments(eventId)
      fetchEventComments(eventId)
    }
  }

  const cancelEdit = () => {
    setEditingEvent(null)
    setEventForm({ title: '', description: '', location: '', date: '', category_id: '' })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatShortDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      'en_cours': '#4caf50',
      'complet': '#ff9800',
      'annule': '#f44336',
      'termine': '#9e9e9e'
    }
    return colors[status] || '#9e9e9e'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'en_cours': 'En cours',
      'complet': 'Complet',
      'annule': 'Annulé',
      'termine': 'Terminé'
    }
    return labels[status] || status
  }

  // Dashboard
  if (user) {
    return (
      <div style={{ maxWidth: '800px', margin: '30px auto', padding: '20px', fontFamily: 'Arial' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>FSTT Events</h1>
          <div>
            <span style={{ marginRight: '15px' }}>
              Bonjour, <strong>{user.name}</strong>
              {user.is_admin && <span style={{ marginLeft: '5px', background: '#9c27b0', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>Admin</span>}
            </span>
            <button onClick={handleLogout} style={{ padding: '8px 15px', cursor: 'pointer' }}>
              Déconnexion
            </button>
          </div>
        </div>

        {message && <p style={{ color: 'green', padding: '10px', background: '#e8f5e9', marginBottom: '15px' }}>{message}</p>}
        {error && <p style={{ color: 'red', padding: '10px', background: '#ffebee', marginBottom: '15px' }}>{error}</p>}

        {/* Onglets */}
        <div style={{ marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
          <button
            onClick={() => setActiveTab('events')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'events' ? '#1976d2' : 'transparent',
              color: activeTab === 'events' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '16px',
              borderRadius: '5px 5px 0 0'
            }}
          >
            📅 Événements
          </button>
          {!user.is_admin && (
            <>
              <button
                onClick={() => setActiveTab('myRegistrations')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: activeTab === 'myRegistrations' ? '#1976d2' : 'transparent',
                  color: activeTab === 'myRegistrations' ? 'white' : '#333',
                  cursor: 'pointer',
                  fontSize: '16px',
                  borderRadius: '5px 5px 0 0'
                }}
              >
                🎫 Mes inscriptions ({myRegistrations.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: activeTab === 'history' ? '#1976d2' : 'transparent',
                  color: activeTab === 'history' ? 'white' : '#333',
                  cursor: 'pointer',
                  fontSize: '16px',
                  borderRadius: '5px 5px 0 0'
                }}
              >
                📜 Historique ({myHistory.length})
              </button>
            </>
          )}
          {user.is_admin && (
            <button
              onClick={() => setActiveTab('categories')}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: activeTab === 'categories' ? '#1976d2' : 'transparent',
                color: activeTab === 'categories' ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '16px',
                borderRadius: '5px 5px 0 0'
              }}
            >
              🏷️ Catégories ({categories.length})
            </button>
          )}
        </div>

        {/* Tab: Événements */}
        {activeTab === 'events' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h2 style={{ margin: 0 }}>📅 Tous les événements</h2>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                >
                  <option value="">Toutes les catégories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              {user.is_admin && !editingEvent && (
                <button 
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  style={{ 
                    padding: '10px 20px', 
                    background: '#4caf50', 
                    color: 'white', 
                    border: 'none', 
                    cursor: 'pointer',
                    borderRadius: '5px'
                  }}
                >
                  {showCreateForm ? '✕ Annuler' : '+ Créer un événement'}
                </button>
              )}
            </div>

            {/* Formulaire création (Admin only) */}
            {showCreateForm && !editingEvent && user.is_admin && (
              <form onSubmit={handleCreateEvent} style={{ 
                background: '#f5f5f5', 
                padding: '20px', 
                borderRadius: '8px', 
                marginBottom: '20px' 
              }}>
                <h3>Nouvel événement</h3>
                <div style={{ marginBottom: '15px' }}>
                  <label>Titre *</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>Description</label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                    style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '80px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>Lieu</label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>Date et heure *</label>
                  <input
                    type="datetime-local"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>Catégorie</label>
                  <select
                    value={eventForm.category_id}
                    onChange={(e) => setEventForm({...eventForm, category_id: e.target.value})}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  >
                    <option value="">-- Sélectionner --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" style={{ padding: '10px 30px', background: '#1976d2', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
                  Créer
                </button>
              </form>
            )}

            {/* Formulaire modification (Admin only) */}
            {editingEvent && user.is_admin && (
              <form onSubmit={handleUpdateEvent} style={{ 
                background: '#fff3e0', 
                padding: '20px', 
                borderRadius: '8px', 
                marginBottom: '20px' 
              }}>
                <h3>✏️ Modifier: {editingEvent.title}</h3>
                <div style={{ marginBottom: '15px' }}>
                  <label>Titre *</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>Description</label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                    style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '80px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>Lieu</label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>Date et heure *</label>
                  <input
                    type="datetime-local"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>Catégorie</label>
                  <select
                    value={eventForm.category_id}
                    onChange={(e) => setEventForm({...eventForm, category_id: e.target.value})}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  >
                    <option value="">-- Sélectionner --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" style={{ padding: '10px 30px', background: '#ff9800', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px', marginRight: '10px' }}>
                  Enregistrer
                </button>
                <button type="button" onClick={cancelEdit} style={{ padding: '10px 30px', background: '#9e9e9e', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
                  Annuler
                </button>
              </form>
            )}
            
            {filteredEvents.length === 0 ? (
              <p>Aucun événement disponible{selectedCategory ? ' dans cette catégorie' : ''}.</p>
            ) : (
              <div>
                {filteredEvents.map(event => (
                  <div key={event.id} style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '8px', 
                    padding: '15px', 
                    marginBottom: '15px',
                    background: '#fafafa'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <h3 style={{ margin: '0 0 10px 0' }}>{event.title}</h3>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {user.is_admin ? (
                          <select
                            value={event.status}
                            onChange={(e) => handleStatusChange(event.id, e.target.value)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '12px',
                              border: 'none',
                              background: getStatusColor(event.status),
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            <option value="en_cours">En cours</option>
                            <option value="complet">Complet</option>
                            <option value="annule">Annulé</option>
                            <option value="termine">Terminé</option>
                          </select>
                        ) : (
                          <span style={{ 
                            background: getStatusColor(event.status), 
                            color: 'white', 
                            padding: '3px 10px', 
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}>
                            {getStatusLabel(event.status)}
                          </span>
                        )}
                        {user.is_admin && (
                          <>
                            <button 
                              onClick={() => handleEditClick(event)}
                              style={{ padding: '5px 10px', cursor: 'pointer', background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px' }}
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleDeleteEvent(event.id)}
                              style={{ padding: '5px 10px', cursor: 'pointer', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <p style={{ margin: '5px 0', color: '#666' }}>{event.description}</p>
                    <p style={{ margin: '5px 0' }}>📍 <strong>{event.location}</strong></p>
                    <p style={{ margin: '5px 0' }}>🕐 {formatDate(event.date)}</p>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
                      {event.category && (
                        <span style={{ 
                          background: '#e3f2fd', 
                          padding: '3px 10px', 
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          {event.category.name}
                        </span>
                      )}
                      
                      {user.is_admin ? (
                        <button 
                          onClick={() => toggleEventRegistrations(event.id)}
                          style={{ 
                            padding: '5px 15px', 
                            background: '#9c27b0', 
                            color: 'white', 
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: '5px',
                            fontSize: '14px'
                          }}
                        >
                          👥 {event.registration_count} inscrit(s) {expandedEvent === event.id ? '▲' : '▼'}
                        </button>
                      ) : (
                        <>
                          <span style={{ fontSize: '14px' }}>👥 <strong>{event.registration_count}</strong> inscrit(s)</span>
                          {registrations[event.id] ? (
                            <span style={{ 
                              background: '#c8e6c9', 
                              color: '#2e7d32',
                              padding: '5px 15px', 
                              borderRadius: '5px',
                              fontSize: '14px'
                            }}>
                              ✓ Inscrit
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleRegisterToEvent(event.id)}
                              disabled={event.status !== 'en_cours'}
                              style={{ 
                                padding: '5px 15px', 
                                background: event.status === 'en_cours' ? '#1976d2' : '#ccc', 
                                color: 'white', 
                                border: 'none', 
                                cursor: event.status === 'en_cours' ? 'pointer' : 'not-allowed',
                                borderRadius: '5px',
                                fontSize: '14px'
                              }}
                            >
                              S'inscrire
                            </button>
                          )}
                        </>
                      )}

                      {/* Bouton commentaires */}
                      <button 
                        onClick={() => toggleEventComments(event.id)}
                        style={{ 
                          padding: '5px 15px', 
                          background: '#607d8b', 
                          color: 'white', 
                          border: 'none', 
                          cursor: 'pointer',
                          borderRadius: '5px',
                          fontSize: '14px'
                        }}
                      >
                        💬 Commentaires {expandedComments === event.id ? '▲' : '▼'}
                      </button>
                    </div>

                    {/* Liste des inscrits (Admin) */}
                    {user.is_admin && expandedEvent === event.id && (
                      <div style={{ marginTop: '15px', padding: '15px', background: '#f3e5f5', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>Liste des inscrits :</h4>
                        {eventRegistrations[event.id]?.length === 0 ? (
                          <p style={{ color: '#666', margin: 0 }}>Aucun inscrit pour cet événement.</p>
                        ) : (
                          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                            {eventRegistrations[event.id]?.map(reg => (
                              <li key={reg.registration_id} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '8px',
                                background: 'white',
                                marginBottom: '5px',
                                borderRadius: '4px'
                              }}>
                                <div>
                                  <strong>{reg.user.name}</strong>
                                  <span style={{ color: '#666', marginLeft: '10px' }}>{reg.user.email}</span>
                                </div>
                                <button
                                  onClick={() => handleCancelRegistration(reg.registration_id)}
                                  style={{ 
                                    padding: '3px 10px', 
                                    background: '#f44336', 
                                    color: 'white', 
                                    border: 'none', 
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}
                                >
                                  Retirer
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Section commentaires */}
                    {expandedComments === event.id && (
                      <div style={{ marginTop: '15px', padding: '15px', background: '#eceff1', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>💬 Commentaires :</h4>
                        
                        {/* Formulaire ajout commentaire */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                          <input
                            type="text"
                            placeholder="Ajouter un commentaire..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                          />
                          <button
                            onClick={() => handleAddComment(event.id)}
                            style={{ padding: '8px 15px', background: '#1976d2', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px' }}
                          >
                            Envoyer
                          </button>
                        </div>

                        {/* Liste des commentaires */}
                        {eventComments[event.id]?.length === 0 ? (
                          <p style={{ color: '#666', margin: 0 }}>Aucun commentaire.</p>
                        ) : (
                          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                            {eventComments[event.id]?.map(comment => (
                              <li key={comment.id} style={{ 
                                padding: '10px',
                                background: 'white',
                                marginBottom: '8px',
                                borderRadius: '4px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                  <div>
                                    <strong>{comment.user.name}</strong>
                                    <span style={{ color: '#999', marginLeft: '10px', fontSize: '12px' }}>
                                      {formatShortDate(comment.created_at)}
                                    </span>
                                    <p style={{ margin: '5px 0 0 0' }}>{comment.content}</p>
                                  </div>
                                  {(user.id === comment.user.id || user.is_admin) && (
                                    <button
                                      onClick={() => handleDeleteComment(comment.id, event.id)}
                                      style={{ 
                                        padding: '2px 8px', 
                                        background: '#f44336', 
                                        color: 'white', 
                                        border: 'none', 
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        fontSize: '11px'
                                      }}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab: Mes inscriptions (User only) */}
        {activeTab === 'myRegistrations' && !user.is_admin && (
          <>
            <h2>🎫 Mes inscriptions</h2>
            {myRegistrations.length === 0 ? (
              <p style={{ color: '#666' }}>Vous n'êtes inscrit à aucun événement.</p>
            ) : (
              <div>
                {myRegistrations.map(reg => (
                  <div key={reg.registration_id} style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '8px', 
                    padding: '15px', 
                    marginBottom: '15px',
                    background: '#fafafa'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <h3 style={{ margin: '0 0 10px 0' }}>{reg.event.title}</h3>
                      <span style={{ 
                        background: getStatusColor(reg.event.status), 
                        color: 'white', 
                        padding: '3px 10px', 
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {getStatusLabel(reg.event.status)}
                      </span>
                    </div>
                    <p style={{ margin: '5px 0', color: '#666' }}>{reg.event.description}</p>
                    <p style={{ margin: '5px 0' }}>📍 <strong>{reg.event.location}</strong></p>
                    <p style={{ margin: '5px 0' }}>🕐 {formatDate(reg.event.date)}</p>
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#999' }}>
                      Inscrit le: {formatDate(reg.registered_at)}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                      {reg.event.category && (
                        <span style={{ 
                          background: '#e3f2fd', 
                          padding: '3px 10px', 
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          {reg.event.category.name}
                        </span>
                      )}
                      <button
                        onClick={() => handleCancelRegistration(reg.registration_id)}
                        style={{ 
                          padding: '5px 15px', 
                          background: '#f44336', 
                          color: 'white', 
                          border: 'none', 
                          cursor: 'pointer',
                          borderRadius: '5px',
                          fontSize: '14px'
                        }}
                      >
                        Annuler inscription
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab: Historique (User only) */}
        {activeTab === 'history' && !user.is_admin && (
          <>
            <h2>📜 Historique des participations</h2>
            <p style={{ color: '#666', marginBottom: '15px' }}>Événements terminés auxquels vous avez participé.</p>
            {myHistory.length === 0 ? (
              <p style={{ color: '#666' }}>Aucun événement terminé dans votre historique.</p>
            ) : (
              <div>
                {myHistory.map(reg => (
                  <div key={reg.registration_id} style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '8px', 
                    padding: '15px', 
                    marginBottom: '15px',
                    background: '#f5f5f5',
                    opacity: 0.9
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <h3 style={{ margin: '0 0 10px 0' }}>{reg.event.title}</h3>
                      <span style={{ 
                        background: '#9e9e9e', 
                        color: 'white', 
                        padding: '3px 10px', 
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        ✓ Terminé
                      </span>
                    </div>
                    <p style={{ margin: '5px 0', color: '#666' }}>{reg.event.description}</p>
                    <p style={{ margin: '5px 0' }}>📍 <strong>{reg.event.location}</strong></p>
                    <p style={{ margin: '5px 0' }}>🕐 {formatDate(reg.event.date)}</p>
                    {reg.event.category && (
                      <span style={{ 
                        background: '#e3f2fd', 
                        padding: '3px 10px', 
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {reg.event.category.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab: Catégories (Admin only) */}
        {activeTab === 'categories' && user.is_admin && (
          <>
            <h2>🏷️ Gestion des catégories</h2>
            
            {/* Formulaire ajout catégorie */}
            <form onSubmit={handleCreateCategory} style={{ 
              display: 'flex', 
              gap: '10px', 
              marginBottom: '20px',
              padding: '15px',
              background: '#f5f5f5',
              borderRadius: '8px'
            }}>
              <input
                type="text"
                placeholder="Nouvelle catégorie..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              />
              <button 
                type="submit"
                style={{ 
                  padding: '10px 20px', 
                  background: '#4caf50', 
                  color: 'white', 
                  border: 'none', 
                  cursor: 'pointer',
                  borderRadius: '5px'
                }}
              >
                + Ajouter
              </button>
            </form>

            {/* Liste des catégories */}
            {categories.length === 0 ? (
              <p style={{ color: '#666' }}>Aucune catégorie.</p>
            ) : (
              <div>
                {categories.map(cat => (
                  <div key={cat.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    background: '#fafafa'
                  }}>
                    {editingCategory?.id === cat.id ? (
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        style={{ flex: 1, padding: '8px', marginRight: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                      />
                    ) : (
                      <span style={{ fontSize: '16px' }}>🏷️ {cat.name}</span>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {editingCategory?.id === cat.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateCategory(cat.id)}
                            style={{ padding: '5px 15px', background: '#4caf50', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            style={{ padding: '5px 15px', background: '#9e9e9e', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingCategory({ id: cat.id, name: cat.name })}
                            style={{ padding: '5px 10px', background: '#ff9800', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            style={{ padding: '5px 10px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Page login/register
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', fontFamily: 'Arial' }}>
      <h1>FSTT Events</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => { setPage('login'); setError(''); setMessage(''); }}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            background: page === 'login' ? '#1976d2' : '#ccc',
            color: page === 'login' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Connexion
        </button>
        <button 
          onClick={() => { setPage('register'); setError(''); setMessage(''); }}
          style={{ 
            padding: '10px 20px',
            background: page === 'register' ? '#1976d2' : '#ccc',
            color: page === 'register' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Inscription
        </button>
      </div>

      {message && <p style={{ color: 'green', padding: '10px', background: '#e8f5e9' }}>{message}</p>}
      {error && <p style={{ color: 'red', padding: '10px', background: '#ffebee' }}>{error}</p>}

      {page === 'login' ? (
        <form onSubmit={handleLogin}>
          <h2>Connexion</h2>
          <div style={{ marginBottom: '15px' }}>
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Mot de passe</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: '10px', background: '#1976d2', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
            Se connecter
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <h2>Créer un compte</h2>
          <div style={{ marginBottom: '15px' }}>
            <label>Nom complet</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Mot de passe</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.is_admin}
                onChange={(e) => setFormData({...formData, is_admin: e.target.checked})}
              />
              Compte Administrateur
            </label>
          </div>
          <button type="submit" style={{ width: '100%', padding: '10px', background: '#1976d2', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
            Créer mon compte
          </button>
        </form>
      )}
    </div>
  )
}

export default App