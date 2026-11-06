import React, { useCallback, useEffect, useRef, useState } from 'react';
import useFetch from '../../hooks/useFetch';
import useInterval from '../../hooks/useInterval';
import { errorMessage, pointagesApi, usersApi } from '../../services/api';
import {
  Async, Badge, Button, Card, EmptyState, Field, Icon, PageHeader, PersonCell, Segmented,
} from '../../components/ui';
import { BUILDING_LABEL, TYPE_LABEL, formatTime, fullName, isLate } from '../../utils/formatters';
import './security.css';

const BUILDING_KEY = 'ansd.building';
const readBuilding = () => {
  try { return localStorage.getItem(BUILDING_KEY) === 'ANNEXE' ? 'ANNEXE' : 'SIEGE'; } catch { return 'SIEGE'; }
};

const MODES = [
  { value: 'auto', label: 'Automatique' },
  { value: 'ENTRY', label: 'Arrivée' },
  { value: 'EXIT', label: 'Départ' },
];

/** Convertit un évènement clavier du lecteur en caractère, quelle que soit la disposition (AZERTY/QWERTY). */
function scanChar(e) {
  const m = /^(?:Digit|Numpad)(\d)$/.exec(e.code || '');
  if (m) return m[1];
  if (e.key && e.key.length === 1 && /[a-zA-Z-]/.test(e.key)) return e.key;
  return null;
}

function normalizeSearch(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
}

export default function ScanPage() {
  const [mode, setMode] = useState('auto');
  const [building, setBuilding] = useState(readBuilding);
  const [result, setResult] = useState(null); // { ok, agent, type, time, message }
  const [busy, setBusy] = useState(false);
  const [manualAgent, setManualAgent] = useState('');
  const [manualQuery, setManualQuery] = useState('');
  const [manualSearchOpen, setManualSearchOpen] = useState(false);
  const [activeAgentIndex, setActiveAgentIndex] = useState(-1);
  const buffer = useRef('');
  const lastKey = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const buildingRef = useRef(building);
  buildingRef.current = building;
  const changeBuilding = (b) => {
    setBuilding(b);
    try { localStorage.setItem(BUILDING_KEY, b); } catch { /* préférence non mémorisée */ }
  };
  const busyRef = useRef(false);

  const today = useFetch(() => pointagesApi.today(), []);
  const agents = useFetch(() => usersApi.agents(), []);
  useInterval(() => today.reload({ silent: true }), 20000);

  const record = useCallback(async (matricule, method) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const { data: agent } = await pointagesApi.check(matricule);
      if (!agent.isActive) {
        setResult({ ok: false, agent, message: 'Ce compte est désactivé.' });
        return;
      }
      const type = modeRef.current === 'auto' ? agent.suggestedType : modeRef.current;
      await pointagesApi.create({ agentMatricule: matricule, type, method, building: buildingRef.current });
      setResult({ ok: true, agent, type, time: new Date(), onLeave: agent.onLeaveToday });
      today.reload({ silent: true });
    } catch (e) {
      setResult({ ok: false, message: errorMessage(e, 'Pointage impossible.'), code: matricule });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le lecteur de code-barres se comporte comme un clavier : on capte la saisie rapide terminée par Entrée.
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'select', 'textarea'].includes(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
      const now = Date.now();
      if (now - lastKey.current > 300) buffer.current = ''; // pause trop longue : ce n'est pas le lecteur
      lastKey.current = now;
      if (e.key === 'Enter') {
        const code = buffer.current;
        buffer.current = '';
        if (code.length >= 3) record(code, 'BARCODE');
        return;
      }
      const ch = scanChar(e);
      if (ch) buffer.current += ch;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [record]);

  const agentList = agents.data?.data || [];
  const selected = agentList.find((a) => String(a.id) === manualAgent);
  const query = normalizeSearch(manualQuery.trim());
  const matchingAgents = query
    ? agentList.filter((agent) => {
      const nameParts = normalizeSearch(fullName(agent)).split(/\s+/);
      const matricule = normalizeSearch(agent.matricule || '');
      return nameParts.some((part) => part.startsWith(query)) || matricule.startsWith(query);
    }).slice(0, 8)
    : [];
  const selectManualAgent = (agent) => {
    setManualAgent(String(agent.id));
    setManualQuery(`${fullName(agent)} (${agent.matricule})`);
    setManualSearchOpen(false);
  };
  const onManualSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown' && matchingAgents.length) {
      e.preventDefault();
      setManualSearchOpen(true);
      setActiveAgentIndex((index) => (index + 1) % matchingAgents.length);
    } else if (e.key === 'ArrowUp' && matchingAgents.length) {
      e.preventDefault();
      setManualSearchOpen(true);
      setActiveAgentIndex((index) => (index <= 0 ? matchingAgents.length - 1 : index - 1));
    } else if (e.key === 'Enter' && manualSearchOpen && matchingAgents.length) {
      e.preventDefault();
      selectManualAgent(matchingAgents[activeAgentIndex] || matchingAgents[0]);
    } else if (e.key === 'Escape') {
      setManualSearchOpen(false);
    }
  };

  return (
    <>
      <PageHeader title="Pointage" subtitle="Scannez un badge ou saisissez un pointage manuel" />
      <div className="scan-grid">
        <div className="stack">
          <Card>
            <div className={`scanner ${busy ? 'is-busy' : ''}`} aria-live="polite">
              <span className="scanner-icon"><Icon name="scan" size={34} /></span>
              <strong>{busy ? 'Enregistrement…' : 'Prêt à scanner'}</strong>
              <p className="muted">Présentez le badge devant le lecteur. Aucun clic nécessaire.</p>
            </div>
            <div className="scan-mode">
              <span className="muted">Bâtiment</span>
              <Segmented label="Bâtiment" options={[{ value: 'SIEGE', label: 'Siège' }, { value: 'ANNEXE', label: 'Annexe' }]} value={building} onChange={changeBuilding} />
            </div>
            <div className="scan-mode">
              <span className="muted">Type de pointage</span>
              <Segmented label="Type de pointage" options={MODES} value={mode} onChange={setMode} />
            </div>
            {mode === 'auto' && <p className="field-msg" style={{ marginTop: 8 }}>Arrivée au premier passage de la journée, puis alternance départ / arrivée.</p>}
          </Card>

          {result && (
            <div className={`scan-result ${result.ok ? 'is-ok' : 'is-error'}`} role="status">
              <Icon name={result.ok ? 'check' : 'alert'} size={26} />
              <div>
                {result.ok ? (
                  <>
                    <strong>{fullName(result.agent)}</strong>
                    <div>{TYPE_LABEL[result.type]} enregistrée à {formatTime(result.time)} · {BUILDING_LABEL[building]}</div>
                    {result.onLeave && <div className="scan-warn">Attention : cet agent a un congé approuvé aujourd'hui.</div>}
                  </>
                ) : (
                  <>
                    <strong>{result.agent ? fullName(result.agent) : 'Pointage refusé'}</strong>
                    <div>{result.message}</div>
                  </>
                )}
              </div>
            </div>
          )}

          <Card title="Pointage manuel" subtitle="En cas de badge oublié ou illisible">
            <div className="manual">
              <Field label="Agent">
                <div className="manual-agent">
                  <div className="manual-agent-input">
                    <Icon name="search" size={18} />
                    <input
                      className="control"
                      type="search"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={manualSearchOpen && matchingAgents.length > 0}
                      aria-controls="manual-agent-options"
                      aria-activedescendant={manualSearchOpen && matchingAgents[activeAgentIndex]
                        ? `manual-agent-option-${matchingAgents[activeAgentIndex].id}` : undefined}
                      placeholder="Rechercher par nom ou matricule…"
                      value={manualQuery}
                      onChange={(e) => {
                        setManualQuery(e.target.value);
                        setManualAgent('');
                        setActiveAgentIndex(-1);
                        setManualSearchOpen(true);
                      }}
                      onFocus={() => {
                        if (manualQuery && !selected) setManualSearchOpen(true);
                      }}
                      onBlur={() => setManualSearchOpen(false)}
                      onKeyDown={onManualSearchKeyDown}
                      autoComplete="off"
                    />
                  </div>
                  {manualSearchOpen && query && (
                    <div className="manual-agent-results" id="manual-agent-options" role="listbox" aria-label="Agents correspondants">
                      {agents.loading && <div className="manual-agent-message">Chargement des agents…</div>}
                      {!agents.loading && agents.error && (
                        <div className="manual-agent-message" role="status">{agents.error}</div>
                      )}
                      {!agents.loading && !agents.error && matchingAgents.length === 0 && (
                        <div className="manual-agent-message">Aucun agent trouvé.</div>
                      )}
                      {!agents.loading && matchingAgents.map((agent, index) => (
                        <div
                          key={agent.id}
                          id={`manual-agent-option-${agent.id}`}
                          className={`manual-agent-option${activeAgentIndex === index ? ' is-active' : ''}`}
                          role="option"
                          aria-selected={String(agent.id) === manualAgent}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setActiveAgentIndex(index)}
                          onClick={() => selectManualAgent(agent)}
                        >
                          <span>{fullName(agent)}</span>
                          <small>{agent.matricule}</small>
                        </div>
                      ))}
                    </div>
                  )}
                  {selected && <span className="manual-agent-selected">Agent sélectionné : {fullName(selected)}</span>}
                </div>
              </Field>
              <Button variant="primary" icon="check" disabled={!selected || busy} loading={busy}
                onClick={() => record(selected.matricule, 'MANUAL')}>Pointer</Button>
            </div>
          </Card>
        </div>

        <Card title="Pointages du jour" subtitle="Les plus récents en premier" padded={false}>
          <Async state={today}>
            {(res) => (res.data.length === 0 ? <EmptyState icon="clock" title="Aucun pointage aujourd'hui" /> : (
              <ul className="feed scroll">
                {res.data.map((p) => (
                  <li key={p.id}>
                    <div className="feed-main"><PersonCell user={p.agent} /></div>
                    <Badge tone={p.type === 'ENTRY' ? (isLate(p.datetime) ? 'warning' : 'success') : 'info'}>{TYPE_LABEL[p.type]}</Badge>
                    <span className="muted">{BUILDING_LABEL[p.building]}</span>
                    <span className="feed-time num">{formatTime(p.datetime)}</span>
                  </li>
                ))}
              </ul>
            ))}
          </Async>
        </Card>
      </div>
    </>
  );
}
