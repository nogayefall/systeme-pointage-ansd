/**
 * Service pour exporter les données en CSV, PDF et impression
 */

// Traductions
const columnTranslations = {
  id: 'ID',
  agent: 'Agent',
  type: 'Type',
  datetime: 'Date/Heure',
  method: 'Méthode',
  securityOfficer: 'Agent Sécurité',
  daysWorked: 'Jours Travaillés',
  daysAbsent: 'Jours Absents',
  lateArrivals: 'Retards',
  attendanceRate: 'Assiduité',
  matricule: 'Matricule',
  nom: 'Nom',
  prenom: 'Prénom',
};

const valueTranslations = {
  ENTRY: 'ARRIVÉE',
  EXIT: 'DÉPART',
  BARCODE: 'CODE-BARRE',
  MANUAL: 'MANUEL',
};

// Formater les données pour l'export
const formatDataForExport = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((row) => {
    const formatted = {};
    Object.keys(row).forEach((key) => {
      // Ignorer les IDs
      if (key === 'id' || key === 'daysInPeriod') {
        return;
      }

      let value = row[key];

      // Formater les objets imbriqués
      if (typeof value === 'object' && value !== null) {
        if (value.matricule && value.nom && value.prenom) {
          // Format agent: matricule - nom prenom
          formatted['Agent'] = `${value.matricule} - ${value.nom} ${value.prenom}`;
        } else if (value.nom && value.prenom && !value.matricule) {
          // Format security officer
          formatted[columnTranslations[key] || key] = `${value.nom} ${value.prenom}`;
        } else {
          formatted[columnTranslations[key] || key] = JSON.stringify(value);
        }
      } else {
        // Traduire les valeurs anglaises en français
        const translatedValue = valueTranslations[value] || value;
        
        // Ajouter le % aux taux d'assiduité
        let finalValue = translatedValue;
        if (key === 'attendanceRate' && typeof translatedValue === 'number') {
          finalValue = `${translatedValue}%`;
        }
        
        formatted[columnTranslations[key] || key] = finalValue;
      }
    });

    return formatted;
  });
};

// Export CSV
export const exportToCSV = (data, filename) => {
  const formattedData = formatDataForExport(data);
  
  if (formattedData.length === 0) {
    alert('Aucune donnée à exporter');
    return;
  }

  // Extraire les en-têtes
  const headers = Object.keys(formattedData[0]);
  const csvContent = [
    headers.join(','),
    ...formattedData.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');

  // Créer et télécharger le fichier
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export PDF (simple, peut être amélioré avec jsPDF)
export const exportToPDF = (data, filename) => {
  const formattedData = formatDataForExport(data);
  
  if (formattedData.length === 0) {
    alert('Aucune donnée à exporter');
    return;
  }

  handlePrint(formattedData, true);
};

// Impression
export const handlePrint = (data, isPDF = false) => {
  const formattedData = Array.isArray(data) ? formatDataForExport(data) : formatDataForExport([data]);
  
  if (formattedData.length === 0) {
    alert('Aucune donnée à imprimer');
    return;
  }

  // Créer une fenêtre de nouvelle impression
  const printWindow = window.open('', '', 'height=600,width=1200');

  // Déterminer les colonnes
  const columns = Object.keys(formattedData[0]);

  // Créer le contenu HTML
  let htmlContent = `
    <html>
      <head>
        <title>Rapport</title>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 20px; 
            color: #333;
          }
          h1 { 
            color: #0066cc; 
            text-align: center;
            margin-bottom: 10px;
          }
          .generated-date {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-bottom: 20px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left;
            word-break: break-word;
          }
          th { 
            background-color: #0066cc; 
            color: white; 
            font-weight: bold;
            font-size: 13px;
          }
          td {
            font-size: 12px;
          }
          tr:nth-child(even) { background-color: #f9f9f9; }
          tr:hover { background-color: #f0f0f0; }
          .footer { 
            margin-top: 30px; 
            text-align: center; 
            font-size: 11px; 
            color: #999;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          @media print {
            body { margin: 0; }
            table { box-shadow: none; }
            .footer { page-break-before: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>📊 Rapport</h1>
        <div class="generated-date">Généré le: ${new Date().toLocaleString('fr-FR')}</div>
        <table>
          <thead>
            <tr>
              ${columns.map((col) => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${formattedData
              .map(
                (row) => `
              <tr>
                ${columns.map((col) => `<td>${row[col] || '-'}</td>`).join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Fin du rapport - Nombre de lignes: ${formattedData.length}</p>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Attendre que le document soit prêt, puis imprimer
  setTimeout(() => {
    printWindow.print();
  }, 250);
};
