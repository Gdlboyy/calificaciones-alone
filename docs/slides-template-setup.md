# Crear la plantilla de reporte en Google Slides

1. Entra a Google Drive con `institutoalonecrm@gmail.com` y crea una presentación nueva: "Plantilla Reporte ALONE".
2. En la única diapositiva, ve a `Diapositiva > Cambiar fondo > Elegir imagen` y sube `assets/base-alone.png`. Confirma que la imagen cubre toda la diapositiva (tamaño de diapositiva recomendado: 13.33 x 10 in / widescreen, igual proporción que la imagen — ajusta el tamaño de la diapositiva en `Archivo > Configurar página` si se ve recortada).
3. Inserta una caja de texto transparente (`Insertar > Cuadro de texto`, sin relleno ni borde) exactamente sobre la línea en blanco después de "ALUMNO" y escribe: `{{NOMBRE}}`.
4. Inserta 5 cajas de texto transparentes sobre la fila "MODULO" de la tabla (una por columna) con: `{{MOD1}}`, `{{MOD2}}`, `{{MOD3}}`, `{{MOD4}}`, `{{MOD5}}`.
5. Inserta 5 cajas de texto transparentes sobre la fila "CALIFICACIÓN" con: `{{CAL1}}`, `{{CAL2}}`, `{{CAL3}}`, `{{CAL4}}`, `{{CAL5}}`.
6. Ajusta la fuente/tamaño de cada caja para que combine visualmente con el resto de la plantilla.
7. Abre la presentación y copia dos IDs de la URL (`https://docs.google.com/presentation/d/PRESENTATION_ID/edit#slide=id.SLIDE_ID`):
   - `PRESENTATION_ID` — el ID de la presentación completa.
   - `SLIDE_ID` — el ID de la diapositiva plantilla (la que tiene los placeholders).
   Anótalos, se necesitan para configurar el flujo de n8n.
8. Prueba manual: en la diapositiva, reemplaza a mano `{{NOMBRE}}` por un nombre de prueba y un par de `{{MODn}}`/`{{CALn}}` por valores, y expórtala (`Archivo > Descargar > Imagen PNG`). Compárala visualmente contra `assets/base-alone.png` — debe verse idéntica salvo por los datos. Deshaz los cambios de prueba (Ctrl+Z) antes de continuar.
