import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Reports.css';
import ReportFilters from '../components/ReportFilters';
import ReportTable from '../components/ReportTable';
import { exportToCSV, exportToPDF, handlePrint } from '../services/exportService';

export const Reports = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // === RAPPORTS STATE ===
  const [reportType, setReportType] = useState('pointages'); // pointages, attendance
  const [reportData, setReportData] = useState([]);
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agents, setAgents] = useState([]);

  // Charger les agents
  const fetchAgents = useCallback(async () => {
    try {
      const response = await api.get('/users/agents');
      const agentsList = response.data?.data || [];
      setAgents(agentsList);
    } catch (err) {
      console.error('Erreur chargement agents:', err);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // === RAPPORTS: Charger pointages filtrés ===
  const fetchPointagesReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        dateStart,
        dateEnd,
      });
      if (selectedAgent) {
        params.append('agentId', selectedAgent);
      }
      const response = await api.get(`/reports/pointages?${params}`);
      setReportData(response.data.data || []);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [dateStart, dateEnd, selectedAgent]);

  // === RAPPORTS: Charger assiduité ===
  const fetchAttendanceReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ dateStart, dateEnd });
      const response = await api.get(`/reports/attendance?${params}`);
      setReportData(response.data.data || []);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [dateStart, dateEnd]);

  // Changer de rapport
  useEffect(() => {
    if (reportType === 'pointages') {
      fetchPointagesReport();
    } else if (reportType === 'attendance') {
      fetchAttendanceReport();
    }
  }, [reportType, fetchPointagesReport, fetchAttendanceReport]);

  // Exporter les données
  const handleExport = (format) => {
    if (format === 'csv') {
      exportToCSV(reportData, `rapport_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (format === 'pdf') {
      exportToPDF(reportData, `rapport_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
    } else if (format === 'print') {
      handlePrint(reportData);
    }
  };

  return (
    <div className="reports-container">
      <header className="reports-header">
        <h1>📋 Rapports</h1>
      </header>

      <div className="reports-tab">
        <div className="report-type-selector">
          <h3>Type de Rapport:</h3>
          <div className="buttons-group">
            <button
              className={`btn-report-type ${reportType === 'pointages' ? 'active' : ''}`}
              onClick={() => setReportType('pointages')}
            >
              Pointages
            </button>
            <button
              className={`btn-report-type ${reportType === 'attendance' ? 'active' : ''}`}
              onClick={() => setReportType('attendance')}
            >
              Assiduité
            </button>
          </div>
        </div>

        {/* Filtres spécifiques au rapport */}
        <ReportFilters
          reportType={reportType}
          dateStart={dateStart}
          setDateStart={setDateStart}
          dateEnd={dateEnd}
          setDateEnd={setDateEnd}
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
          agents={agents}
        />

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Chargement...</div>
        ) : (
          <>
            {reportType === 'pointages' && (
              <>
                <div className="report-actions">
                  <div className="export-buttons">
                    <button className="btn btn-csv" onClick={() => handleExport('csv')}>
                      📥 Exporter CSV
                    </button>
                    <button className="btn btn-pdf" onClick={() => handleExport('pdf')}>
                      📄 Exporter PDF
                    </button>
                    <button className="btn btn-print" onClick={() => handleExport('print')}>
                      🖨️ Imprimer
                    </button>
                  </div>
                  <div className="count">
                    Total: <strong>{reportData.length}</strong> pointage(s)
                  </div>
                </div>
                <ReportTable data={reportData} columns={['agent', 'type', 'datetime', 'method', 'securityOfficer']} />
              </>
            )}

            {reportType === 'attendance' && (
              <>
                <div className="report-actions">
                  <button className="btn btn-csv" onClick={() => handleExport('csv')}>
                    📥 Exporter CSV
                  </button>
                  <div className="count">
                    Total: <strong>{reportData.length}</strong> agent(s)
                  </div>
                </div>
                <ReportTable
                  data={reportData}
                  columns={['agent', 'daysWorked', 'daysAbsent', 'lateArrivals', 'attendanceRate']}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
