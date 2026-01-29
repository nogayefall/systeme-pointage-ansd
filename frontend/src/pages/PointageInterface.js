import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './PointageInterface.css';

// =============================================
// CONFIGURATION DES LAYOUTS DE CLAVIER
// =============================================
const KEYBOARD_LAYOUTS = {
  azerty: {
    name: "AZERTY (Français)",
    mapping: {
      "Digit1": "&", "Digit2": "é", "Digit3": "\"", "Digit4": "'", "Digit5": "(",
      "Digit6": "-", "Digit7": "è", "Digit8": "_", "Digit9": "ç", "Digit0": "à",
      "Minus": ")", "Equal": "=",
      "KeyQ": "a", "KeyW": "z", "KeyE": "e", "KeyR": "r", "KeyT": "t",
      "KeyY": "y", "KeyU": "u", "KeyI": "i", "KeyO": "o", "KeyP": "p",
      "BracketLeft": "^", "BracketRight": "$",
      "KeyA": "q", "KeyS": "s", "KeyD": "d", "KeyF": "f", "KeyG": "g",
      "KeyH": "h", "KeyJ": "j", "KeyK": "k", "KeyL": "l", "Semicolon": "m",
      "Quote": "ù", "Backslash": "*",
      "KeyZ": "w", "KeyX": "x", "KeyC": "c", "KeyV": "v", "KeyB": "b",
      "KeyN": "n", "KeyM": "m", "Comma": ",", "Period": ".", "Slash": ":",
      "IntlBackslash": "<", "Space": " "
    }
  },
  qwerty: {
    name: "QWERTY (US/International)",
    mapping: {
      "Digit1": "1", "Digit2": "2", "Digit3": "3", "Digit4": "4", "Digit5": "5",
      "Digit6": "6", "Digit7": "7", "Digit8": "8", "Digit9": "9", "Digit0": "0",
      "Minus": "-", "Equal": "=",
      "KeyQ": "q", "KeyW": "w", "KeyE": "e", "KeyR": "r", "KeyT": "t",
      "KeyY": "y", "KeyU": "u", "KeyI": "i", "KeyO": "o", "KeyP": "p",
      "BracketLeft": "[", "BracketRight": "]",
      "KeyA": "a", "KeyS": "s", "KeyD": "d", "KeyF": "f", "KeyG": "g",
      "KeyH": "h", "KeyJ": "j", "KeyK": "k", "KeyL": "l", "Semicolon": ";",
      "Quote": "'", "Backslash": "\\",
      "KeyZ": "z", "KeyX": "x", "KeyC": "c", "KeyV": "v", "KeyB": "b",
      "KeyN": "n", "KeyM": "m", "Comma": ",", "Period": ".", "Slash": "/",
      "IntlBackslash": "\\", "Space": " "
    },
    // Mapping pour Shift+digit (lecteur code-barre)
    shiftMapping: {
      "!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
      "^": "6", "&": "7", "*": "8", "(": "9", ")": "0"
    }
  },
  qwertz: {
    name: "QWERTZ (Allemand)",
    mapping: {
      "Digit1": "1", "Digit2": "2", "Digit3": "3", "Digit4": "4", "Digit5": "5",
      "Digit6": "6", "Digit7": "7", "Digit8": "8", "Digit9": "9", "Digit0": "0",
      "Minus": "ß", "Equal": "´",
      "KeyQ": "q", "KeyW": "w", "KeyE": "e", "KeyR": "r", "KeyT": "t",
      "KeyY": "z", "KeyU": "u", "KeyI": "i", "KeyO": "o", "KeyP": "p",
      "BracketLeft": "ü", "BracketRight": "+",
      "KeyA": "a", "KeyS": "s", "KeyD": "d", "KeyF": "f", "KeyG": "g",
      "KeyH": "h", "KeyJ": "j", "KeyK": "k", "KeyL": "l", "Semicolon": "ö",
      "Quote": "ä", "Backslash": "#",
      "KeyZ": "y", "KeyX": "x", "KeyC": "c", "KeyV": "v", "KeyB": "b",
      "KeyN": "n", "KeyM": "m", "Comma": ",", "Period": ".", "Slash": "-",
      "IntlBackslash": "<", "Space": " "
    }
  }
};

// Fonction pour obtenir le caractère à partir d'un événement clavier
function getCharFromKeyEvent(event, detectedLayout = 'qwerty') {
  // Vérifier d'abord le mapping du layout (plus précis que event.key)
  const layout = KEYBOARD_LAYOUTS[detectedLayout];
  if (layout && layout.mapping[event.code]) {
    return layout.mapping[event.code];
  }
  
  // Vérifier si c'est un caractère Shift (pour lecteur code-barre)
  if (layout && layout.shiftMapping && layout.shiftMapping[event.key]) {
    return layout.shiftMapping[event.key];
  }
  
  // Fallback: utiliser event.key
  return event.key || '';
}

export const PointageInterface = () => {
  const { user, logout } = useAuth();
  const [scanInput, setScanInput] = useState('');
  const [agents, setAgents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('');
  const [debugLog, setDebugLog] = useState([]);
  const [detectedLayout, setDetectedLayout] = useState('qwerty');
  const [pointageType, setPointageType] = useState('ENTRY'); // ENTRY ou EXIT
  const scanInputRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  // Debug helper
  const addDebugLog = (msg) => {
    console.log(msg);
    setDebugLog(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Charger tous les agents avec ROLE_AGENT
  const fetchAgents = async () => {
    try {
      const response = await api.get('/users/agents');
      console.log('Agents response:', response);
      // S'assurer que c'est un array
      let agentsList = [];
      if (Array.isArray(response.data)) {
        agentsList = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        agentsList = response.data.data;
      } else if (response.data) {
        agentsList = response.data;
      }
      setAgents(agentsList);
      addDebugLog(`[INIT] ${agentsList.length} agents chargés`);
    } catch (err) {
      console.error('Erreur lors du chargement des agents:', err);
      addDebugLog(`[ERROR] Erreur chargement agents: ${err.message}`);
      setAgents([]);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    // Focus initial
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
    addDebugLog('[INIT] Interface de Pointage chargée');
  }, []);

  // Gestionnaire pour les événements clavier directs (lecteur code-barre)
  const handleKeyboardEvent = (e) => {
    // Ignorer si Shift/Ctrl/Alt seul
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
      e.preventDefault();
      return;
    }

    // Si Enter, traiter le scan
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan();
      return;
    }

    // Obtenir le caractère selon le layout
    const char = getCharFromKeyEvent(e, detectedLayout);
    addDebugLog(`[KEY] Code: ${e.code} | Key: ${e.key} | Char: "${char}"`);
    
    // Ajouter seulement les caractères numériques valides
    if (char && /[0-9a-zA-Z\-]/.test(char)) {
      e.preventDefault(); // Empêcher React onChange de traiter
      setScanInput(prev => {
        const newInput = prev + char;
        return newInput;
      });
    }
  };

  // Gestionnaire pour l'input HTML direct
  const handleInputChange = (e) => {
    // Nettoyer les caractères spéciaux qui viendraient du lecteur
    const cleaned = e.target.value.replace(/[^0-9a-zA-Z\-]/g, '');
    setScanInput(cleaned);
    if (cleaned !== e.target.value) {
      addDebugLog(`[INPUT] Nettoyé: ${e.target.value} → ${cleaned}`);
    }
  };

  // Gestionnaire Enter sur l'input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addDebugLog('[KEY] ENTER détecté');
      e.preventDefault();
      handleScan();
    }
  };

  // Fonction pour tester différents formats de matricule
  const extractMatricule = (rawInput) => {
    let cleaned = rawInput.trim();
    
    addDebugLog(`[EXTRACT] Raw input: "${cleaned}"`);
    
    // Format 1: Juste des chiffres (ex: 1525)
    if (/^\d+$/.test(cleaned)) {
      addDebugLog(`[EXTRACT] Format numérique pur: ${cleaned}`);
      return cleaned;
    }
    
    // Format 2: Alphanumérique sans caractères spéciaux (ex: AGENT001, ABC123)
    const alphanumeric = cleaned.replace(/[^0-9a-zA-Z\-]/g, '');
    if (alphanumeric && alphanumeric !== cleaned) {
      addDebugLog(`[EXTRACT] Nettoyé des spéciaux: "${cleaned}" → "${alphanumeric}"`);
      return alphanumeric;
    }
    
    if (alphanumeric) {
      addDebugLog(`[EXTRACT] Alphanumérique: ${alphanumeric}`);
      return alphanumeric;
    }
    
    // Format 3: Extraire juste les chiffres s'il y en a
    const numericOnly = cleaned.replace(/[^0-9]/g, '');
    if (numericOnly) {
      addDebugLog(`[EXTRACT] Chiffres uniquement: "${cleaned}" → "${numericOnly}"`);
      return numericOnly;
    }
    
    addDebugLog(`[EXTRACT] Aucun format reconnu: "${cleaned}"`);
    return cleaned;
  };

  const handleScan = async () => {
    const now = Date.now();
    
    // Anti-bounce
    if (now - lastScanTimeRef.current < 300) {
      addDebugLog('[WARN] Scan en doublon, ignoré');
      return;
    }
    lastScanTimeRef.current = now;

    const rawInput = scanInput.trim();
    
    if (!rawInput) {
      addDebugLog('[ERROR] Aucun matricule saisi');
      setMessage('Veuillez scanner un badge');
      setMessageType('info');
      return;
    }

    // Extraire le matricule du format reçu
    const matricule = extractMatricule(rawInput);
    
    // DEBUG: Afficher la longueur et les caractères
    addDebugLog(`[SEARCH] Matricule: "${matricule}" (${matricule.length} chars)`);
    addDebugLog(`[SEARCH] Agents en BD: ${Array.isArray(agents) ? agents.length : 0}`);
    
    // Vérifier localement si l'agent existe
    const foundAgent = Array.isArray(agents) && agents.find(a => {
      const match = a.matricule.toLowerCase() === matricule.toLowerCase();
      if (match) addDebugLog(`[LOCAL] Trouvé localement: ${a.matricule}`);
      return match;
    });

    try {
      setLoading(true);
      
      // Vérifier l'agent via l'API
      const checkResponse = await api.get(`/pointages/check/${matricule}`);
      const agent = checkResponse.data.data;

      addDebugLog(`[OK] Agent trouvé via API: ${agent.nom} ${agent.prenom}`);

      if (!agent.isActive) {
        addDebugLog(`[ERROR] Agent inactif`);
        setMessage(`Agent inactif: ${agent.nom} ${agent.prenom}`);
        setMessageType('error');
        setScanInput('');
        if (scanInputRef.current) scanInputRef.current.focus();
        return;
      }

      // Enregistrer le pointage
      addDebugLog(`[SAVE] Enregistrement du pointage...`);
      const pointageResponse = await api.post('/pointages', {
        agentMatricule: matricule,
        type: pointageType,
        method: 'BARCODE',
      });

      if (pointageResponse.data.success) {
        const time = pointageResponse.data.data.datetime.split(' ')[1];
        addDebugLog(`[OK] Pointage enregistré à ${time}`);
        setMessage(
          `${agent.nom} ${agent.prenom} - Pointage enregistré à ${time}`
        );
        setMessageType('success');
        setScanInput('');
        
        // Rafraîchir la liste des agents et les pointages
        fetchAgents();
        
        // Remettre le focus et vider le message après 3 secondes
        if (scanInputRef.current) scanInputRef.current.focus();
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      addDebugLog(`[ERROR] ${errorMessage}`);
      setMessage(`${errorMessage}`);
      setMessageType('error');
      setScanInput('');
      if (scanInputRef.current) scanInputRef.current.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // Pointage manuel
  const handleManualPointage = async (agent) => {
    try {
      setLoading(true);
      const pointageResponse = await api.post('/pointages', {
        agentMatricule: agent.matricule,
        type: pointageType,
        method: 'MANUAL',
      });

      if (pointageResponse.data.success) {
        const time = pointageResponse.data.data.datetime.split(' ')[1];
        addDebugLog(`[OK] Pointage manuel: ${agent.nom} ${agent.prenom} à ${time}`);
        setMessage(
          `${agent.nom} ${agent.prenom} - Pointage manual enregistré à ${time}`
        );
        setMessageType('success');
        
        // Rafraîchir la liste des agents et les pointages
        fetchAgents();
        
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      addDebugLog(`[ERROR] Pointage manuel: ${errorMessage}`);
      setMessage(`${errorMessage}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les agents par recherche
  const filteredAgents = Array.isArray(agents) ? agents.filter(agent =>
    agent.matricule?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.prenom?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="pointage-interface">
      <header className="pointage-header">
        <div className="header-content">
          <div className="header-brand">
          <img src="/images/ansd-logo.png" alt="ANSD Logo" className="ansd-logo" />
            <div>
              <h1>Interface de Pointage</h1>
              <p className="agent-info">Agent de Sécurité: {user?.nom} {user?.prenom}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-logout">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="pointage-container">
        {/* Scanner section - Centré et agrandi */}
        <div className="scanner-section">
          <div className="scanner-card">
            <div className="scanner-title">📱 Scanner un Badge</div>
            
            {message && (
              <div className={`message message-${messageType}`}>
                {message}
              </div>
            )}

            {/* Boutons ARRIVÉE / DÉPART */}
            <div className="pointage-type-selector">
              <button 
                className={`type-button ${pointageType === 'ENTRY' ? 'active' : ''}`}
                onClick={() => setPointageType('ENTRY')}
                disabled={loading}
              >
                🔵 ARRIVÉE
              </button>
              <button 
                className={`type-button ${pointageType === 'EXIT' ? 'active' : ''}`}
                onClick={() => setPointageType('EXIT')}
                disabled={loading}
              >
                🔴 DÉPART
              </button>
            </div>

            <div className="scanner-input-wrapper">
              <input
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyboardEvent}
                onKeyPress={handleKeyPress}
                placeholder="Scannez un badge..."
                className="scanner-input"
                disabled={loading}
                autoComplete="off"
              />
              <span className="scanner-hint">Appuyez sur Entrée après le scan</span>
            </div>

            {loading && (
              <div className="loading-spinner">
                <div className="spinner"></div>
                Traitement en cours...
              </div>
            )}
          </div>
        </div>

        {/* Agents list section */}
        <div className="agents-section">
          <div className="agents-header">
            <h2>📋 Liste des Agents</h2>
            <input
              type="text"
              placeholder="Rechercher par matricule, nom ou prenom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="agents-list">
            {filteredAgents.length === 0 ? (
              <div className="empty-state">
                <p>Aucun agent trouvé</p>
              </div>
            ) : (
              <table className="agents-table">
                <thead>
                  <tr>
                    <th>MATRICULE</th>
                    <th>NOM</th>
                    <th>PRÉNOM</th>
                    <th>EMAIL</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id}>
                      <td>{agent.matricule}</td>
                      <td>{agent.nom}</td>
                      <td>{agent.prenom}</td>
                      <td>{agent.email}</td>
                      <td>
                        <button
                          className="btn-manual-pointage"
                          onClick={() => handleManualPointage(agent)}
                          disabled={loading}
                          title="Enregistrer un pointage manuel"
                        >
                          📍 Pointer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Debug log */}
      <div className="debug-log">
        {debugLog.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
};

export default PointageInterface;
