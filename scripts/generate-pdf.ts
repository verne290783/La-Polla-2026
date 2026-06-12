import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

async function generate() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 }
  });

  const stream = fs.createWriteStream(path.resolve(process.cwd(), 'reglas_puntuacion.pdf'));
  doc.pipe(stream);

  // Función para pintar el fondo de la página actual
  const drawBackground = () => {
    doc.save();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0a0a0a');
    
    // Dibujar decoraciones doradas (línea fina arriba y abajo)
    doc.rect(0, 0, doc.page.width, 4).fill('#f59e0b');
    doc.rect(0, doc.page.height - 4, doc.page.width, 4).fill('#f59e0b');
    doc.restore();
  };

  const drawFooter = (pageNumber: number, totalPages: number) => {
    doc.save();
    doc.fontSize(8).fillColor('#6b7280');
    doc.text(
      'La Polla Sabrosa 2026 — Guía Oficial de Puntuación',
      40,
      doc.page.height - 30,
      { align: 'left' }
    );
    doc.text(
      `Página ${pageNumber} de ${totalPages}`,
      doc.page.width - 120,
      doc.page.height - 30,
      { align: 'right', width: 80 }
    );
    doc.restore();
  };

  // --- PÁGINA 1 ---
  drawBackground();

  // Logo "🏆 LA POLLA sabrosa"
  doc.fontSize(28).text('🏆', 40, 50, { align: 'left' });
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff').text('LA ', 75, 48, { continued: true });
  doc.fillColor('#f59e0b').text('POLLA ', { continued: true });
  doc.fontSize(10).font('Helvetica').fillColor('#9ca3af').text('sabrosa');
  
  // Subtítulo del Logo
  doc.fontSize(8).font('Helvetica').fillColor('#6b7280').text('PORTAL DE PRONÓSTICOS OFICIAL', 75, 70);

  // Línea divisoria
  doc.moveTo(40, 95).lineTo(doc.page.width - 40, 95).strokeColor('#1f1f1f').lineWidth(1).stroke();

  // Título del documento
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#ffffff').text('GUÍA DE PUNTUACIÓN', 40, 115);
  doc.fontSize(10).font('Helvetica').fillColor('#10b981').text('REGLAMENTO OFICIAL DE PUNTOS Y CRITERIOS DE DESEMPATE', 40, 145);

  // Intro
  doc.fontSize(10).font('Helvetica').fillColor('#d1d5db').text(
    'Este documento oficial resume la lógica matemática y las reglas de negocio que rigen la asignación de puntos en el portal de La Polla Sabrosa 2026. Todas las reglas son procesadas de forma automatizada por la base de datos cada vez que finaliza un partido real.',
    40,
    165,
    { width: 515, align: 'justify', lineGap: 3 }
  );

  // SECCIÓN 1: REGLAS DE PARTIDOS (FASE DE GRUPOS)
  let y = 215;
  doc.rect(40, y, doc.page.width - 80, 120).fill('#121212');
  doc.rect(40, y, 4, 120).fill('#f59e0b'); // barra lateral dorada
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff').text('1. REGLAS DE PARTIDOS (FASE DE GRUPOS)', 60, y + 15);
  doc.fontSize(9.5).font('Helvetica').fillColor('#d1d5db').text(
    'En cada partido de la Fase de Grupos, un usuario puede ganar hasta un máximo de 6 puntos, distribuidos de la siguiente forma:',
    60,
    y + 35,
    { width: 475 }
  );

  // Viñetas de puntos
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#f59e0b').text('• Acertar el Resultado General (Ganador / Empate):', 70, y + 60, { continued: true });
  doc.font('Helvetica').fillColor('#f3f4f6').text(' +1 punto.');

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#f59e0b').text('• Acertar Goles del Ganador (o Local en Empates):', 70, y + 78, { continued: true });
  doc.font('Helvetica').fillColor('#f3f4f6').text(' +3 puntos.');

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#f59e0b').text('• Acertar Goles del Perdedor (o Visitante en Empates):', 70, y + 96, { continued: true });
  doc.font('Helvetica').fillColor('#f3f4f6').text(' +2 puntos.');

  // SECCIÓN 2: EL CASO ESPECIAL DE LOS EMPATES
  y = 355;
  doc.rect(40, y, doc.page.width - 80, 190).fill('#121212');
  doc.rect(40, y, 4, 190).fill('#10b981'); // barra lateral verde
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff').text('2. EL CASO ESPECIAL DE LOS EMPATES', 60, y + 15);
  doc.fontSize(9.5).font('Helvetica').fillColor('#d1d5db').text(
    'Los empates en fase de grupos tienen reglas estrictas que protegen el valor del pronóstico:',
    60,
    y + 35,
    { width: 475 }
  );

  doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text(
    '• Regla del Pronóstico Necesario: Para sumar puntos de goles en un partido que finalizó empatado, es obligatorio haber pronosticado un empate (goles local = goles visitante). Si pronosticaste un ganador y el partido real termina en empate, obtendrás 0 puntos en total, aunque hubieras acertado los goles de uno de los equipos.',
    70,
    y + 60,
    { width: 455, lineGap: 2 }
  );

  doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text(
    '• Puntos Totales en un Empate Exacto: Si el partido termina 1-1 y tu pronóstico fue 1-1, sumas 3 puntos en total: +1 por acertar el empate, +1 por goles de local (1) y +1 por goles de visitante (1).',
    70,
    y + 115,
    { width: 455, lineGap: 2 }
  );

  doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text(
    '• Puntos Totales en un Empate Parcial: Si el partido termina 1-1 y tu pronóstico fue 2-2, sumas 1 punto en total por acertar el resultado (empate), pero 0 puntos de goles ya que no acertaste el marcador de ningún equipo.',
    70,
    y + 150,
    { width: 455, lineGap: 2 }
  );

  // Nota de RLS / Triggers al final de la pag 1
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#6b7280').text(
    '*Nota: Si un usuario pronostica un ganador incorrecto en un partido que no fue empate, aún puede sumar puntos de goles (+3 por el ganador real y/o +2 por el perdedor real) siempre que haya acertado sus respectivos goles individuales.',
    40,
    760,
    { width: 515 }
  );

  drawFooter(1, 2);

  // --- PÁGINA 2 ---
  doc.addPage();
  drawBackground();

  // Logo simplificado en Pag 2
  doc.fontSize(16).text('🏆', 40, 50, { align: 'left' });
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#ffffff').text('LA ', 65, 49, { continued: true });
  doc.fillColor('#f59e0b').text('POLLA ', { continued: true });
  doc.fontSize(8).font('Helvetica').fillColor('#9ca3af').text('sabrosa');
  
  doc.moveTo(40, 75).lineTo(doc.page.width - 40, 75).strokeColor('#1f1f1f').lineWidth(1).stroke();

  // SECCIÓN 3: FASES ELIMINATORIAS (KNOCKOUTS)
  y = 95;
  doc.rect(40, y, doc.page.width - 80, 155).fill('#121212');
  doc.rect(40, y, 4, 155).fill('#f59e0b'); // barra lateral dorada
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff').text('3. FASES ELIMINATORIAS (KNOCKOUTS)', 60, y + 15);
  doc.fontSize(9.5).font('Helvetica').fillColor('#d1d5db').text(
    'En los octavos, cuartos, semifinales y final, la lógica se adapta al tiempo reglamentario y la clasificación definitiva:',
    60,
    y + 35,
    { width: 475 }
  );

  doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text(
    '• Clasificación / Ganador Definitivo (+1 punto): Se otorga al acertar el equipo que avanza de ronda, sin importar si lo hace en los 90 minutos, tiempo extra o definición por tiros desde el punto penal.',
    70,
    y + 60,
    { width: 455, lineGap: 2 }
  );

  doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text(
    '• Goles en Tiempo Regular (90 min): Los goles se evalúan de acuerdo al marcador tras los 90 minutos regulares (más tiempo de adición, pero excluyendo prórrogas y penales). Acertar los goles del ganador real da +3 puntos, y del perdedor real da +2 puntos.',
    70,
    y + 105,
    { width: 455, lineGap: 2 }
  );

  // SECCIÓN 4: PARTE 1 (WIZARD) VS PARTE 2 (EN VIVO)
  y = 270;
  doc.rect(40, y, doc.page.width - 80, 140).fill('#121212');
  doc.rect(40, y, 4, 140).fill('#10b981'); // barra lateral verde
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff').text('4. PARTE 1 (WIZARD) VS PARTE 2 (EN VIVO)', 60, y + 15);
  doc.fontSize(9.5).font('Helvetica').fillColor('#d1d5db').text(
    'El portal maneja dos formatos independientes de pronósticos con reglas de emparejamiento distintas:',
    60,
    y + 35,
    { width: 475 }
  );

  doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text(
    '• Coincidencia de Equipos (Parte 1): Para puntuar en cualquier partido de llaves eliminatorias de la Parte 1, los equipos que se enfrentan en la vida real deben coincidir exactamente con los que pronositcaste que jugarían ese partido. Si los equipos no coinciden, se asignan 0 puntos.',
    70,
    y + 60,
    { width: 455, lineGap: 2 }
  );

  doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text(
    '• Predicción Directa (Parte 2): En la Parte 2 (En Vivo), juegas con los equipos que clasificaron realmente, por lo que siempre sumas puntos de forma directa aplicando las reglas básicas.',
    70,
    y + 105,
    { width: 455, lineGap: 2 }
  );

  // SECCIÓN 5: PUNTOS DE BONUS DE CAMPEONES
  y = 430;
  doc.rect(40, y, doc.page.width - 80, 110).fill('#121212');
  doc.rect(40, y, 4, 110).fill('#f59e0b'); // barra lateral dorada
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff').text('5. PUNTOS DE BONUS DE CAMPEONES', 60, y + 15);
  doc.fontSize(9.5).font('Helvetica').fillColor('#d1d5db').text(
    'Al final del mundial (tras concluir la final), se evalúa tu podio pronosticado en la Parte 1:',
    60,
    y + 35,
    { width: 475 }
  );

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#f59e0b').text('• Acertar el Campeón Real:', 70, y + 55, { continued: true });
  doc.font('Helvetica').fillColor('#f3f4f6').text(' +5 puntos de bonus.');

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#f59e0b').text('• Acertar el Subcampeón Real:', 70, y + 70, { continued: true });
  doc.font('Helvetica').fillColor('#f3f4f6').text(' +3 puntos de bonus.');

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#f59e0b').text('• Acertar el Tercer Puesto Real:', 70, y + 85, { continued: true });
  doc.font('Helvetica').fillColor('#f3f4f6').text(' +2 puntos de bonus.');

  // Resumen final
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff').text('RESUMEN DE PUNTUACIONES MÁXIMAS POR PARTIDO', 40, 575);
  
  // Dibujar tabla de resumen
  const tableY = 600;
  doc.rect(40, tableY, 515, 20).fill('#1f1f1f');
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('TIPO DE ACIERTO', 50, tableY + 6);
  doc.text('FASE DE GRUPOS', 220, tableY + 6);
  doc.text('ELIMINATORIAS (90 MIN + CLASIF.)', 350, tableY + 6);

  // Fila 1: Resultado
  doc.rect(40, tableY + 20, 515, 20).fill('#121212');
  doc.fontSize(8.5).font('Helvetica').fillColor('#d1d5db');
  doc.text('Acertar Resultado / Clasificado', 50, tableY + 26);
  doc.text('+1 punto', 220, tableY + 26);
  doc.text('+1 punto (el que avanza)', 350, tableY + 26);

  // Fila 2: Goles Ganador
  doc.rect(40, tableY + 40, 515, 20).fill('#0a0a0a');
  doc.text('Acertar Goles del Ganador (o Local en Empate)', 50, tableY + 46);
  doc.text('+3 puntos', 220, tableY + 46);
  doc.text('+3 puntos', 350, tableY + 46);

  // Fila 3: Goles Perdedor
  doc.rect(40, tableY + 60, 515, 20).fill('#121212');
  doc.text('Acertar Goles del Perdedor (o Visitante en Empate)', 50, tableY + 66);
  doc.text('+2 puntos', 220, tableY + 66);
  doc.text('+2 puntos', 350, tableY + 66);

  // Fila 4: Total Máximo
  doc.rect(40, tableY + 80, 515, 20).fill('#1f2937');
  doc.font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('TOTAL MÁXIMO POR PARTIDO', 50, tableY + 86);
  doc.text('6 Puntos', 220, tableY + 86);
  doc.text('6 Puntos', 350, tableY + 86);

  drawFooter(2, 2);

  doc.end();

  console.log('PDF generado exitosamente.');
}

generate().catch(err => {
  console.error('Error generating PDF:', err);
});
